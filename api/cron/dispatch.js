// Unified cron endpoint: routes by `?job=daily|weekly|alerts`.
//
// Hobby plan caps us at 2 cron schedules, so daily + alerts share the
// daily run (alerts are evaluated inline at the end of the daily pass).
// The weekly schedule fires its own dispatch on Sundays.
//
// Auth: Vercel passes `Authorization: Bearer <CRON_SECRET>`. If the env
// var is unset we refuse to run.

import crypto from "node:crypto";
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
  sendEmailBatch,
  dispatchedKeys,
  chunk,
} from "../_lib/dispatch.js";

// Stop starting new batches after this long; vercel.json caps the function at 60s.
const SEND_BUDGET_MS = 45 * 1000;
import { buildDailyEmail, buildWeeklyEmail, buildAlertEmail } from "../_lib/emailTemplates.js";
import { buildSnapshotIndex, evaluateAlert } from "../_lib/alerts.js";

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = String(req.headers.authorization || req.headers.Authorization || "");
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const provided = Buffer.from(header, "utf8");
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
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

  // Members who clicked unsubscribe are recorded as inactive in `subscribers`
  // (api/unsubscribe.js) — honour that for the daily brief too.
  const memberEmails = rows.map((m) => m.email?.toLowerCase().trim()).filter(Boolean);
  let optedOut = new Set();
  if (memberEmails.length) {
    const optOuts = await supabase
      .from("subscribers")
      .select("email")
      .eq("active", false)
      .in("email", memberEmails);
    if (optOuts.error) {
      // Fail closed: better to skip a day than email people who opted out.
      return { error: optOuts.error.message, sent: 0, skipped: 0, failed: 0 };
    }
    optedOut = new Set((optOuts.data || []).map((row) => row.email));
  }

  const day = todayKey();
  let skipped = 0;
  const pending = [];
  for (const m of rows) {
    if (!m.email || optedOut.has(m.email.toLowerCase().trim())) {
      skipped += 1;
      continue;
    }
    pending.push({ ...m, dispatchKey: `${day}-daily-${m.user_id}` });
  }

  const done = await dispatchedKeys(supabase, pending.map((p) => p.dispatchKey));
  const todo = pending.filter((p) => !done.has(p.dispatchKey));
  skipped += pending.length - todo.length;

  if (dryRun) {
    console.log(`[cron/daily] would send ${todo.length} emails in ${chunk(todo).length} batch(es)`);
    return { sent: todo.length, skipped, failed: 0, total: rows.length };
  }

  // All watchlists in one query, grouped per member.
  const watchByUser = new Map();
  if (todo.length) {
    const { data: watchRows, error } = await supabase
      .from("terminal_watchlist")
      .select("user_id, entity_id, entity_label")
      .in("user_id", todo.map((p) => p.user_id));
    if (error) return { error: error.message, sent: 0, skipped, failed: 0 };
    for (const row of watchRows || []) {
      if (!watchByUser.has(row.user_id)) watchByUser.set(row.user_id, []);
      watchByUser.get(row.user_id).push(row);
    }
  }

  const result = await sendInBatches({
    supabase,
    items: todo,
    label: "daily",
    batchKey: (index) => `${day}-daily-batch-${index}-${todo.length}`,
    build: (p) => ({
      to: p.email,
      ...buildDailyEmail({
        user: { id: p.user_id },
        email: p.email,
        ...personalizeDaily(snapshot, watchByUser.get(p.user_id) || []),
      }),
    }),
    logRow: (p) => ({ user_id: p.user_id, email: p.email, dispatch_type: "daily", dispatch_key: p.dispatchKey }),
  });

  return { ...result, skipped, total: rows.length };
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

  let skipped = 0;
  const pending = [];
  for (const s of rows) {
    const email = s.email?.toLowerCase().trim();
    if (!email) {
      skipped += 1;
      continue;
    }
    pending.push({ email, dispatchKey: `${week}-weekly-${email}` });
  }

  // One lookup for the whole list instead of one query per subscriber.
  const done = await dispatchedKeys(supabase, pending.map((p) => p.dispatchKey));
  const todo = pending.filter((p) => !done.has(p.dispatchKey));
  skipped += pending.length - todo.length;

  if (dryRun) {
    console.log(`[cron/weekly] would send ${todo.length} emails in ${chunk(todo).length} batch(es)`);
    return { sent: todo.length, skipped, failed: 0, total: rows.length };
  }

  const result = await sendInBatches({
    supabase,
    items: todo,
    label: "weekly",
    batchKey: (index) => `${week}-weekly-batch-${index}-${todo.length}`,
    build: (p) => ({ to: p.email, ...buildWeeklyEmail({ email: p.email, ...personalized }) }),
    logRow: (p) => ({ user_id: null, email: p.email, dispatch_type: "weekly", dispatch_key: p.dispatchKey }),
  });

  return { ...result, skipped, total: rows.length };
}

// Sends `items` in batches of up to 100 and logs each delivered email.
// Stops early rather than letting the function hit its time limit; the
// next run picks up whoever is left because they have no log row yet.
async function sendInBatches({ supabase, items, label, batchKey, build, logRow }) {
  const started = Date.now();
  let sent = 0;
  let failed = 0;
  let deferred = 0;

  const batches = chunk(items);
  for (let i = 0; i < batches.length; i += 1) {
    if (Date.now() - started > SEND_BUDGET_MS) {
      deferred = batches.slice(i).reduce((sum, part) => sum + part.length, 0);
      console.warn(`[cron/${label}] time budget reached; ${deferred} left for the next run`);
      break;
    }
    const part = batches[i];
    const result = await sendEmailBatch(part.map(build), { idempotencyKey: batchKey(i) });
    if (!result.ok) {
      failed += part.length;
      console.error(`[cron/${label}] batch ${i + 1}/${batches.length} failed: ${result.error}`);
      continue;
    }
    const { error } = await supabase.from("terminal_dispatch_log").insert(part.map(logRow));
    if (error) console.error(`[cron/${label}] dispatch log insert failed: ${error.message}`);
    sent += part.length;
  }

  return { sent, failed, deferred };
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
