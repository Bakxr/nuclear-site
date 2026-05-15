// Dispatch composition + Resend send. Keeps the cron handler thin.

import { Resend } from "resend";

const RESEND_TIMEOUT_MS = 30 * 1000;

let resendClient = null;
function getResend() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY?.trim();
    if (!key) throw new Error("RESEND_API_KEY missing");
    resendClient = new Resend(key);
  }
  return resendClient;
}

function getFrom() {
  return process.env.NEWSLETTER_FROM?.trim() || "Nuclear Pulse <onboarding@resend.dev>";
}

export function hasDispatchConfig() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.NEWSLETTER_FROM?.trim() && process.env.CRON_SECRET?.trim());
}

export async function sendEmail({ to, subject, html, text }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);
  try {
    const resend = getResend();
    // The Resend SDK doesn't accept a signal directly, but we wrap with
    // Promise.race so we still time out cleanly.
    const op = resend.emails.send({ from: getFrom(), to, subject, html, text });
    const timeout = new Promise((_resolve, reject) => {
      controller.signal.addEventListener("abort", () => reject(new Error("Resend send timed out")));
    });
    const { data, error } = await Promise.race([op, timeout]);
    if (error) return { ok: false, error: error.message || String(error) };
    return { ok: true, id: data?.id || null };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  } finally {
    clearTimeout(timer);
  }
}

// Idempotent log insert. Returns true if newly recorded, false if the
// (user_id, dispatch_key) row already existed.
export async function recordDispatch(supabase, row) {
  const { error } = await supabase
    .from("terminal_dispatch_log")
    .insert(row);
  if (!error) return { fresh: true };
  if (error.code === "23505") return { fresh: false };
  // For free-tier weekly sends user_id is null, so the unique constraint
  // doesn't apply and we have to dedupe by (email, dispatch_key) manually.
  if (row.user_id == null && row.email) {
    const { data } = await supabase
      .from("terminal_dispatch_log")
      .select("id")
      .eq("email", row.email)
      .eq("dispatch_key", row.dispatch_key)
      .limit(1);
    if (data && data.length > 1) return { fresh: false };
  }
  return { fresh: false, error: error.message };
}

export async function alreadyDispatched(supabase, { user_id, email, dispatch_key }) {
  let query = supabase.from("terminal_dispatch_log").select("id").eq("dispatch_key", dispatch_key).limit(1);
  if (user_id) query = query.eq("user_id", user_id);
  else if (email) query = query.eq("email", email);
  const { data } = await query;
  return Array.isArray(data) && data.length > 0;
}

// Build the per-user daily personalization view from the shared snapshot.
export function personalizeDaily(snapshot, watchlistRows) {
  const watchedIds = new Set((watchlistRows || []).map((r) => r.entity_id));
  const watchedLabels = (watchlistRows || []).map((r) => r.entity_label).filter(Boolean);

  const stocks = snapshot?.entities?.stocks || [];
  const allMovers = stocks
    .filter((s) => Number.isFinite(s.changePct ?? s.pct))
    .map((s) => ({ ticker: s.ticker, name: s.name, price: s.price, pct: s.changePct ?? s.pct }))
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  // Prefer movers from the watchlist if user has any.
  const watchedMovers = allMovers.filter((m) => watchedIds.has(m.ticker));
  const movers = (watchedMovers.length >= 3 ? watchedMovers : [...watchedMovers, ...allMovers.filter((m) => !watchedIds.has(m.ticker))]).slice(0, 5);

  const filings = (snapshot?.entities?.companyFilings || []).filter((f) => {
    if (watchedIds.size === 0) return true;
    return watchedIds.has(f.ticker) || watchedIds.has(f.company);
  });

  const operations = (snapshot?.entities?.operationsSignals || []).filter((o) => {
    if (watchedIds.size === 0) return true;
    return watchedIds.has(o.plantId) || watchedIds.has(o.id);
  });

  const headlines = (snapshot?.entities?.newsArticles || []).slice(0, 6);
  const uranium = snapshot?.entities?.uranium || null;

  return { movers, filings, operations, headlines, uranium, watchlistLabels: watchedLabels };
}

export function personalizeWeekly(snapshot) {
  const stocks = snapshot?.entities?.stocks || [];
  const movers = stocks
    .filter((s) => Number.isFinite(s.changePct ?? s.pct))
    .map((s) => ({ ticker: s.ticker, name: s.name, price: s.price, pct: s.changePct ?? s.pct }))
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 3);
  const headlines = (snapshot?.entities?.newsArticles || []).slice(0, 5);
  const uranium = snapshot?.entities?.uranium || null;
  return { movers, headlines, uranium };
}
