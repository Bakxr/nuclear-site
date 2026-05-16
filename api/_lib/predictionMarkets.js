import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const CACHE_KEY = "prediction_markets_v1";
const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

const POLYMARKET_URL = "https://gamma-api.polymarket.com/markets";
const KALSHI_URL = "https://trading-api.kalshi.com/trade-api/v2/markets";
const KEYWORDS = ["nuclear", "uranium", "reactor", "smr", "fusion"];
const MAX_TOTAL = 20;

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
    if (!res.ok) throw new Error(`pm:${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

function matchesKeywords(text = "") {
  const lower = String(text).toLowerCase();
  return KEYWORDS.some((kw) => lower.includes(kw));
}

function normalizePolymarket(record) {
  const question = record.question || record.title || record.slug || "";
  const yesPrice = Number(record.lastTradePrice ?? record.bestBid ?? record.outcomePrices?.[0]) || null;
  const noPrice = yesPrice != null ? Math.round((1 - yesPrice) * 1000) / 1000 : null;
  return {
    id: `pm:poly:${record.id || record.conditionId || record.slug}`,
    entityType: "predictionMarket",
    source: "polymarket",
    question,
    currentPrice: yesPrice,
    yesPrice,
    noPrice,
    volume: record.volume ? Number(record.volume) : null,
    endDate: record.endDate || record.end_date_iso || null,
    url: record.slug ? `https://polymarket.com/event/${record.slug}` : record.url || "",
  };
}

function normalizeKalshi(record) {
  const yesPrice = record.yes_bid != null ? Number(record.yes_bid) / 100 : null;
  const noPrice = record.no_bid != null ? Number(record.no_bid) / 100 : null;
  return {
    id: `pm:kalshi:${record.ticker || record.event_ticker}`,
    entityType: "predictionMarket",
    source: "kalshi",
    question: record.title || record.subtitle || record.ticker,
    currentPrice: yesPrice,
    yesPrice,
    noPrice,
    volume: record.volume ? Number(record.volume) : null,
    endDate: record.close_time || record.expiration_time || null,
    url: record.ticker ? `https://kalshi.com/markets/${String(record.ticker).toLowerCase()}` : "",
  };
}

async function fetchPolymarket() {
  const url = `${POLYMARKET_URL}?active=true&closed=false&limit=200`;
  const payload = await fetchJson(url);
  const arr = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  return arr
    .filter((m) => matchesKeywords(`${m.question || ""} ${m.description || ""} ${m.slug || ""}`))
    .map(normalizePolymarket);
}

async function fetchKalshi() {
  const url = `${KALSHI_URL}?status=open&limit=200`;
  const payload = await fetchJson(url);
  const arr = Array.isArray(payload?.markets) ? payload.markets : [];
  return arr
    .filter((m) => matchesKeywords(`${m.title || ""} ${m.subtitle || ""} ${m.ticker || ""}`))
    .map(normalizeKalshi);
}

/**
 * Fetch nuclear-relevant prediction markets from Polymarket + Kalshi.
 */
export async function fetchPredictionMarkets({ force = false } = {}) {
  const cached = await readTerminalCache(CACHE_KEY);
  if (!force && cached?.payload && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
    return cached.payload;
  }

  const [poly, kalshi] = await Promise.allSettled([fetchPolymarket(), fetchKalshi()]);
  const all = [];
  if (poly.status === "fulfilled") all.push(...poly.value);
  else console.warn("[prediction] polymarket failed:", poly.reason?.message || poly.reason);
  if (kalshi.status === "fulfilled") all.push(...kalshi.value);
  else console.warn("[prediction] kalshi failed:", kalshi.reason?.message || kalshi.reason);

  if (!all.length && cached?.payload) return cached.payload;

  const sorted = all
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, MAX_TOTAL);

  await writeTerminalCache(CACHE_KEY, sorted);
  return sorted;
}
