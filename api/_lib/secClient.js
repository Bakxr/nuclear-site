// Shared SEC EDGAR access for the filings, earnings and insider modules.
//
// Those three modules all need each company's submissions JSON. Fetching it
// once per company (memoised, with in-flight dedupe) and pacing every request
// through one limiter keeps a snapshot build to ~1 request per company and
// under SEC's fair-access ceiling of 10 requests/second.

const COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SUBMISSIONS_URL = "https://data.sec.gov/submissions";
const TICKER_MAP_TTL_MS = 24 * 60 * 60 * 1000;
const SUBMISSIONS_TTL_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
const MIN_INTERVAL_MS = 125; // ≤ 8 requests/second across the whole process

const state = globalThis.__npSecClient ?? {
  tickerMap: null,
  tickerMapAt: 0,
  tickerMapPromise: null,
  submissions: new Map(), // cik -> { at, promise }
  nextSlot: 0,
};
globalThis.__npSecClient = state;

export function getSecUserAgent() {
  return process.env.SEC_USER_AGENT || "NuclearPulseBot admin@atomic-energy.vercel.app";
}

export function padCik(value) {
  return String(value || "").replace(/\D/g, "").padStart(10, "0");
}

export function normalizeTicker(value = "") {
  return String(value || "").trim().toUpperCase();
}

// Reserve the next request slot. Callers await their turn, so concurrent
// callers are spaced MIN_INTERVAL_MS apart instead of bursting.
async function waitForSlot() {
  const now = Date.now();
  const slot = Math.max(now, state.nextSlot);
  state.nextSlot = slot + MIN_INTERVAL_MS;
  if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
}

export async function secFetch(url, { accept = "application/json" } = {}) {
  await waitForSlot();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept,
        "accept-encoding": "gzip, deflate",
        "user-agent": getSecUserAgent(),
      },
    });
    if (!res.ok) throw new Error(`sec:${res.status}`);
    return accept.includes("json") ? res.json() : res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Map of ticker → { cik, name } from SEC's company_tickers.json (cached 24h). */
export async function getTickerMap() {
  if (state.tickerMap && Date.now() - state.tickerMapAt < TICKER_MAP_TTL_MS) return state.tickerMap;
  if (!state.tickerMapPromise) {
    state.tickerMapPromise = secFetch(COMPANY_TICKERS_URL)
      .then((payload) => {
        state.tickerMap = new Map(
          Object.values(payload || {}).map((entry) => [
            normalizeTicker(entry.ticker),
            { cik: padCik(entry.cik_str), name: entry.title },
          ]),
        );
        state.tickerMapAt = Date.now();
        return state.tickerMap;
      })
      .finally(() => {
        state.tickerMapPromise = null;
      });
  }
  return state.tickerMapPromise;
}

/** A company's EDGAR submissions JSON, shared across callers (cached 15m). */
export function getSubmissions(cik) {
  const key = padCik(cik);
  const cached = state.submissions.get(key);
  if (cached && Date.now() - cached.at < SUBMISSIONS_TTL_MS) return cached.promise;
  const promise = secFetch(`${SUBMISSIONS_URL}/CIK${key}.json`);
  state.submissions.set(key, { at: Date.now(), promise });
  // Don't cache failures.
  promise.catch(() => state.submissions.delete(key));
  return promise;
}

/** Run `fn` over items with bounded concurrency (the limiter still paces requests). */
export async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await fn(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Tracked stocks that actually file with the SEC (skips ETFs and foreign OTC lines). */
export function secFilers(stocks = []) {
  return stocks.filter((stock) => stock.sec !== false);
}
