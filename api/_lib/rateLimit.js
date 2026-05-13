import { getSupabaseServiceClient, hasSupabaseServiceConfig } from "./supabase.js";

const memBuckets = new Map();
let warnedMissingConfig = false;
let warnedRpcMissing = false;

function checkInMemory(key, { limit, windowMs }) {
  const now = Date.now();
  const entry = memBuckets.get(key);

  if (!entry || now > entry.resetAt) {
    memBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Atomic, cross-instance rate limit check backed by the `check_rate_limit`
 * Postgres function. Falls back to a per-instance in-memory limiter if the
 * service client or the RPC is unavailable (e.g. local dev without Supabase,
 * or before migrations are applied).
 *
 * @param {string} key
 * @param {{ limit?: number, windowMs?: number }} options
 * @returns {Promise<boolean>} true if request is allowed
 */
export async function checkRateLimit(key, { limit = 8, windowMs = 15 * 60 * 1000 } = {}) {
  if (!hasSupabaseServiceConfig()) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn(
        "[rateLimit] SUPABASE_SERVICE_KEY not configured; using in-memory limiter (single-instance only).",
      );
    }
    return checkInMemory(key, { limit, windowMs });
  }

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: Math.max(1, Math.floor(limit)),
      p_window_ms: Math.max(1, Math.floor(windowMs)),
    });

    if (error) {
      if (!warnedRpcMissing) {
        warnedRpcMissing = true;
        console.error(
          "[rateLimit] check_rate_limit RPC failed; falling back to in-memory.",
          error.message || error,
        );
      }
      return checkInMemory(key, { limit, windowMs });
    }

    return data !== false;
  } catch (err) {
    console.error("[rateLimit] unexpected error; falling back to in-memory.", err?.message || err);
    return checkInMemory(key, { limit, windowMs });
  }
}
