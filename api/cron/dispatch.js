// Unified cron endpoint: routes by `?job=daily|weekly|alerts`.
//
// Hobby plan caps us at 2 cron schedules, so daily + alerts share the
// daily run (alerts are evaluated inline at the end of the daily pass).
// The weekly schedule fires its own dispatch on Sundays.
//
// Auth: Vercel passes `Authorization: Bearer <CRON_SECRET>`. If the env
// var is unset we refuse to run.

import { getSupabaseServiceClient } from "../_lib/supabase.js";
import { getTerminalSnapshot } from "../_lib/terminalSnapshot.js";
import { setNoStore } from "../_lib/http.js";
import {
  hasDispatchConfig,
  personalizeDaily,
  personalizeWeekly,
  recordDispatch,
  alreadyDispatched,
  sendEmail,
} from "../_lib/dispatch.js";
import { buildDailyEmail, buildWeeklyEmail, buildAlertEmail } from "../_lib/emailTemplates.js";
import { buildSnapshotIndex, evaluateAlert } from "../_lib/alerts.js";

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.authorization || req.headers.Authorization || "";
  return header === `Bearer ${secret}`;
}

function todayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function isoWeekKey() {
  // YYYY-WW based on UTC ISO week — good enough for idempotency.
  const d = new Date();
  const onejan = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan) / 86400000 + new Date(onejan).getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function hourBucket() {
  // Used to keep alert idempotency at most once per hour.
  const d = new Date();
  return `${todayKey()}T${String(d.getUTCHours()).padStart(2, "0")}`;
}

async function runDaily({ supabase, snapshot, dryRun }) {
  const memberships = await supabase
    .from("billing_memberships")
    .select("user_id, email")
    .eq("terminal_access", true);

  if (memberships.error) {
    return { error: memberships.error.message, sent: 0, skipped: 0, failed: 0 };
  }
  const rows = memberships.data || [];

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const day = todayKey();

  for (const m of rows) {
    if (!m.email) {
      skipped += 1;
      continue;
    }
    try {
      const dispatchKey = `${day}-daily-${m.user_id}`;
      if (await alreadyDispatched(supabase, { user_id: m.user_id, dispatch_key: dispatchKey })) {
        skipped += 1;
        continue;
      }

      const watchlist = await supabase
        .from("terminal_watchlist")
        .select("entity_id, entity_label")
        .eq("user_id", m.user_id);

      const personalized = personalizeDaily(snapshot, watchlist.data || []);
      const email = buildDailyEmail({
        user: { id: m.user_id },
        email: m.email,
        ...personalized,
      });

      if (dryRun) {
        console.log(`[cron/daily] would send to ${m.email}: ${email.subject}`);
        sent += 1;
        continue;
      }

      const result = await sendEmail({ to: m.email, ...email });
      if (!result.ok) {
        failed += 1;
        console.error(`[cron/daily] send failed for ${m.email}: ${result.error}`);
        continue;
      }

      await recordDispatch(supabase, {
        user_id: m.user_id,
        email: m.email,
        dispatch_type: "daily",
        dispatch_key: dispatchKey,
      });
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`[cron/daily] error for ${m.user_id}:`, err?.message || err);
    }
  }

  return { sent, skipped, failed, total: rows.length };
}

async function runWeekly({ supabase, snapshot, dryRun }) {
  const subs = await supabase
    .from("subscribers")
    .select("email")
    .eq("active", true);

  if (subs.error) {
    return { error: subs.error.message, sent: 0, skipped: 0, failed: 0 };
  }

  const rows = subs.data || [];
  const week = isoWeekKey();
  const personalized = personalizeWeekly(snapshot);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const s of rows) {
    if (!s.email) {
      skipped += 1;
      continue;
    }
    try {
      const dispatchKey = `${week}-weekly-${s.email}`;
      if (await alreadyDispatched(supabase, { email: s.email, dispatch_key: dispatchKey })) {
        skipped += 1;
        continue;
      }

      const email = buildWeeklyEmail({ email: s.email, ...personalized });

      if (dryRun) {
        console.log(`[cron/weekly] would send to ${s.email}: ${email.subject}`);
        sent += 1;
        continue;
      }

      const result = await sendEmail({ to: s.email, ...email });
      if (!result.ok) {
        failed += 1;
        console.error(`[cron/weekly] send failed for ${s.email}: ${result.error}`);
        continue;
      }

      await recordDispatch(supabase, {
        user_id: null,
        email: s.email,
        dispatch_type: "weekly",
        dispatch_key: dispatchKey,
      });
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`[cron/weekly] error for ${s.email}:`, err?.message || err);
    }
  }

  return { sent, skipped, failed, total: rows.length };
}

async function runAlerts({ supabase, snapshot, dryRun }) {
  const alerts = await supabase
    .from("terminal_alerts")
    .select("id, user_id, alert_type, target_id, target_label, threshold")
    .eq("active", true);

  if (alerts.error) return { error: alerts.error.message, fired: 0, skipped: 0, failed: 0 };
  const rows = alerts.data || [];
  if (rows.length === 0) return { fired: 0, skipped: 0, failed: 0, total: 0 };

  const index = buildSnapshotIndex(snapshot);

  // Bulk-load membership emails for all alert owners in one round-trip.
  const userIds = [...new Set(rows.map((a) => a.user_id))];
  const { data: memberships } = await supabase
    .from("billing_memberships")
    .select("user_id, email")
    .in("user_id", userIds);
  const emailByUser = new Map((memberships || []).map((m) => [m.user_id, m.email]));

  const hour = hourBucket();
  let fired = 0;
  let skipped = 0;
  let failed = 0;

  for (const alert of rows) {
    try {
      const result = evaluateAlert(alert, index);
      if (!result?.fired) {
        skipped += 1;
        continue;
      }

      const email = emailByUser.get(alert.user_id);
      if (!email) {
        skipped += 1;
        continue;
      }

      const dispatchKey = `alert-${alert.id}-${hour}`;
      if (await alreadyDispatched(supabase, { user_id: alert.user_id, dispatch_key: dispatchKey })) {
        skipped += 1;
        continue;
      }

      const message = buildAlertEmail({
        alert,
        observed: result.observed,
        email,
        user: { id: alert.user_id },
      });

      if (dryRun) {
        console.log(`[cron/alerts] would fire ${alert.id} -> ${email}: ${message.subject}`);
        fired += 1;
        continue;
      }

      const send = await sendEmail({ to: email, ...message });
      if (!send.ok) {
        failed += 1;
        console.error(`[cron/alerts] send failed for ${email}: ${send.error}`);
        continue;
      }

      await recordDispatch(supabase, {
        user_id: alert.user_id,
        email,
        dispatch_type: "alert",
        dispatch_key: dispatchKey,
        alert_id: alert.id,
      });
      await supabase
        .from("terminal_alerts")
        .update({
          last_fired_at: new Date().toISOString(),
          fire_count: (alert.fire_count || 0) + 1,
        })
        .eq("id", alert.id);
      fired += 1;
    } catch (err) {
      failed += 1;
      console.error(`[cron/alerts] error for ${alert.id}:`, err?.message || err);
    }
  }

  return { fired, skipped, failed, total: rows.length };
}

export default async function handler(req, res) {
  setNoStore(res);

  if (!hasDispatchConfig()) {
    return res.status(503).json({ error: "Dispatch is not configured." });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const job = String(req.query?.job || "").toLowerCase();
  const dryRun = String(req.query?.dryRun || "") === "true";

  if (!["daily", "weekly", "alerts"].includes(job)) {
    return res.status(400).json({ error: "Unknown job." });
  }

  let supabase;
  try {
    supabase = getSupabaseServiceClient();
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Supabase not configured." });
  }

  let snapshot = null;
  try {
    snapshot = await getTerminalSnapshot();
  } catch (err) {
    console.error("[cron/dispatch] snapshot failed", err?.message || err);
    return res.status(500).json({ error: "Failed to load terminal snapshot." });
  }

  try {
    if (job === "weekly") {
      const result = await runWeekly({ supabase, snapshot, dryRun });
      return res.status(200).json({ job, dryRun, ...result });
    }
    if (job === "alerts") {
      const result = await runAlerts({ supabase, snapshot, dryRun });
      return res.status(200).json({ job, dryRun, ...result });
    }
    // daily: run daily then chain alerts (Hobby cron cap workaround)
    const daily = await runDaily({ supabase, snapshot, dryRun });
    const alerts = await runAlerts({ supabase, snapshot, dryRun });
    return res.status(200).json({ job: "daily", dryRun, daily, alerts });
  } catch (err) {
    console.error("[cron/dispatch] handler failed", err?.message || err);
    return res.status(500).json({ error: "Dispatch failed." });
  }
}
