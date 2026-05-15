// REST endpoint for terminal alerts. GET/POST/DELETE/PATCH gated by an
// active terminal subscription. We use the user's bearer token to build a
// Supabase client so RLS enforces the row-level ownership rules.

import { createClient } from "@supabase/supabase-js";
import { ensureAllowedOrigin, setNoStore, getClientAddress } from "./_lib/http.js";
import { requireTerminalAccess } from "./_lib/auth.js";
import { checkRateLimit } from "./_lib/rateLimit.js";

const ALLOWED_TYPES = new Set(["price_drop", "price_rise", "percent_drop", "percent_rise", "entity_event"]);
const MAX_ALERTS_PER_USER = 50;

function userScopedClient(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function listAlerts(req, res, { user, accessToken }) {
  const supabase = userScopedClient(accessToken);
  const { data, error } = await supabase
    .from("terminal_alerts")
    .select("id, alert_type, target_id, target_label, threshold, active, created_at, last_fired_at, fire_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[alerts/list]", error.message);
    return res.status(500).json({ error: "Failed to load alerts." });
  }
  return res.status(200).json({ alerts: data || [] });
}

async function createAlert(req, res, { user, accessToken }) {
  const limited = await checkRateLimit(`alerts:create:${user.id}:${getClientAddress(req)}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited) return res.status(429).json({ error: "Too many alerts created. Try again later." });

  const body = req.body || {};
  const alert_type = String(body.alert_type || "").trim();
  const target_id = String(body.target_id || "").trim();
  const target_label = String(body.target_label || "").trim().slice(0, 200);
  const threshold = body.threshold == null || body.threshold === "" ? null : Number(body.threshold);

  if (!ALLOWED_TYPES.has(alert_type)) return res.status(400).json({ error: "Invalid alert type." });
  if (!target_id || !target_label) return res.status(400).json({ error: "target_id and target_label are required." });
  if (alert_type !== "entity_event" && (!Number.isFinite(threshold))) {
    return res.status(400).json({ error: "Numeric threshold is required for price/percent alerts." });
  }

  const supabase = userScopedClient(accessToken);

  // Soft cap so a single user can't fill the table.
  const { count } = await supabase
    .from("terminal_alerts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count || 0) >= MAX_ALERTS_PER_USER) {
    return res.status(409).json({ error: `Limit of ${MAX_ALERTS_PER_USER} alerts reached.` });
  }

  const { data, error } = await supabase
    .from("terminal_alerts")
    .insert({
      user_id: user.id,
      alert_type,
      target_id,
      target_label,
      threshold: alert_type === "entity_event" ? null : threshold,
    })
    .select("id, alert_type, target_id, target_label, threshold, active, created_at, last_fired_at, fire_count")
    .single();

  if (error) {
    console.error("[alerts/create]", error.message);
    return res.status(500).json({ error: "Failed to create alert." });
  }
  return res.status(201).json({ alert: data });
}

async function deleteAlert(req, res, { accessToken }) {
  const id = String(req.query?.id || "").trim();
  if (!id) return res.status(400).json({ error: "id is required." });
  const supabase = userScopedClient(accessToken);
  const { error } = await supabase.from("terminal_alerts").delete().eq("id", id);
  if (error) {
    console.error("[alerts/delete]", error.message);
    return res.status(500).json({ error: "Failed to delete alert." });
  }
  return res.status(200).json({ success: true });
}

async function patchAlert(req, res, { accessToken }) {
  const id = String(req.query?.id || "").trim();
  if (!id) return res.status(400).json({ error: "id is required." });
  const body = req.body || {};
  const patch = {};
  if (typeof body.active === "boolean") patch.active = body.active;
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Nothing to update." });

  const supabase = userScopedClient(accessToken);
  const { data, error } = await supabase
    .from("terminal_alerts")
    .update(patch)
    .eq("id", id)
    .select("id, alert_type, target_id, target_label, threshold, active, created_at, last_fired_at, fire_count")
    .single();
  if (error) {
    console.error("[alerts/patch]", error.message);
    return res.status(500).json({ error: "Failed to update alert." });
  }
  return res.status(200).json({ alert: data });
}

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "POST", "DELETE", "PATCH", "OPTIONS"])) return;
  setNoStore(res);

  const auth = await requireTerminalAccess(req, res);
  if (!auth) return;

  try {
    if (req.method === "GET") return listAlerts(req, res, auth);
    if (req.method === "POST") return createAlert(req, res, auth);
    if (req.method === "DELETE") return deleteAlert(req, res, auth);
    if (req.method === "PATCH") return patchAlert(req, res, auth);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[alerts]", err?.message || err);
    return res.status(500).json({ error: "Alert request failed." });
  }
}
