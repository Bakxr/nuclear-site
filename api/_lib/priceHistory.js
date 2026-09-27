// Real daily price history for the tracked equities.
//
// Finnhub's candle endpoint needs a paid plan, so daily closes come from
// Yahoo Finance's public chart endpoint (no key). It is unofficial, so every
// failure degrades to "no history" — callers must render an empty chart, never
// a synthetic one.

import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const CACHE_KEY = "price_history_v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // daily bars — hourly refresh is plenty
const TIMEOUT_MS = 8000;
const CONCURRENCY = 4;

function toFinite(value) {
  // Number(null) is 0 — a halted-day null close must not become a $0 bar.
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (compatible; NuclearPulseBot/1.0)" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// Exported for tests.
export function parseChartPayload(payload) {
  const result = payload?.chart?.result?.[0];
  if (!result) return null;
  const meta = result.meta || {};
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const closes = result.indicators?.quote?.[0]?.close || [];

  const points = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const close = toFinite(closes[i]);
    if (close == null) continue; // halted / partial bars come back null
    points.push({ date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10), close: +close.toFixed(4) });
  }
  if (!points.length) return null;

  return {
    points,
    high52: toFinite(meta.fiftyTwoWeekHigh),
    low52: toFinite(meta.fiftyTwoWeekLow),
    dayHigh: toFinite(meta.regularMarketDayHigh),
    dayLow: toFinite(meta.regularMarketDayLow),
    volume: toFinite(meta.regularMarketVolume),
    currency: meta.currency || "USD",
  };
}

async function fetchTickerHistory(ticker) {
  const url = `${CHART_URL}/${encodeURIComponent(ticker)}?range=6mo&interval=1d&includePrePost=false`;
  return parseChartPayload(await fetchJsonWithTimeout(url));
}

/**
 * @param {string[]} tickers
 * @returns {Promise<Record<string, ReturnType<typeof parseChartPayload>>>}
 *   Map of ticker → history. Tickers that failed are omitted.
 */
export async function fetchPriceHistories(tickers = [], { force = false } = {}) {
  const cached = await readTerminalCache(CACHE_KEY);
  const cachedPayload = cached?.payload || {};
  const fresh = cached?.updatedAt && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS;
  if (!force && fresh && tickers.every((ticker) => cachedPayload[ticker])) {
    return Object.fromEntries(tickers.map((ticker) => [ticker, cachedPayload[ticker]]));
  }

  const results = {};
  const queue = [...tickers];
  async function worker() {
    while (queue.length) {
      const ticker = queue.shift();
      try {
        const history = await fetchTickerHistory(ticker);
        if (history) results[ticker] = history;
      } catch (error) {
        console.warn(`[priceHistory] ${ticker} failed:`, error?.message || error);
      }
      // Keep yesterday's bars rather than dropping the chart on a transient failure.
      if (!results[ticker] && cachedPayload[ticker]) results[ticker] = cachedPayload[ticker];
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tickers.length) }, worker));

  if (Object.keys(results).length) {
    await writeTerminalCache(CACHE_KEY, { ...cachedPayload, ...results });
  }
  return results;
}

// Shape consumed by the existing chart components (StockModal, sparklines).
export function toChartHistory(history) {
  if (!history?.points?.length) return [];
  return history.points.map((point, index) => ({
    day: index,
    date: new Date(`${point.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    isoDate: point.date,
    price: point.close,
  }));
}
