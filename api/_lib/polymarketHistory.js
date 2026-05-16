import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const HISTORY_URL = "https://clob.polymarket.com/prices-history";

function cacheKey(tokenId) {
  return `polymarket_history_${tokenId}`;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "NuclearPulseBot/1.0",
      },
    });
    if (!res.ok) throw new Error(`pm-history:${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch Polymarket price history for a CLOB token id.
 * Returns `{ history: [{ t, p }], fetchedAt, stale }` or `null` on failure.
 */
export async function fetchMarketHistory(marketTokenId, { force = false } = {}) {
  if (!marketTokenId) return null;
  const key = cacheKey(marketTokenId);
  const cached = await readTerminalCache(key);
  if (!force && cached?.payload && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
    return cached.payload;
  }

  try {
    const url = `${HISTORY_URL}?market=${encodeURIComponent(marketTokenId)}&interval=1d&fidelity=60`;
    const payload = await fetchJson(url);
    const rows = Array.isArray(payload?.history) ? payload.history : Array.isArray(payload) ? payload : [];
    const history = rows
      .map((row) => {
        const t = Number(row?.t ?? row?.timestamp);
        const p = Number(row?.p ?? row?.price);
        if (!Number.isFinite(t) || !Number.isFinite(p)) return null;
        return { t, p };
      })
      .filter(Boolean);
    const result = { history, fetchedAt: new Date().toISOString(), stale: false };
    await writeTerminalCache(key, result);
    return result;
  } catch (err) {
    console.warn("[polymarket-history] fetch failed", err?.message || err);
    if (cached?.payload) return { ...cached.payload, stale: true };
    return null;
  }
}
