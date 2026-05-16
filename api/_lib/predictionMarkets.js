import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const CACHE_KEY = "prediction_markets_v1";
const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

// Polymarket exposes events tagged by topic; /markets without a tag returns
// the most active markets (politics/sports/crypto), so we hit /events with
// the nuclear-relevant tag slugs instead.
const POLYMARKET_EVENTS_URL = "https://gamma-api.polymarket.com/events";
const POLYMARKET_TAG_SLUGS = ["nuclear", "uranium", "energy"];

// trading-api.kalshi.com now requires auth. The public elections host
// returns the same shape unauthenticated.
const KALSHI_URL = "https://api.elections.kalshi.com/trade-api/v2/markets";

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

function normalizePolymarketMarket(market, event) {
  const question = market.question || event.title || market.slug || "";
  const yesPrice = Number(market.lastTradePrice ?? market.bestBid ?? market.outcomePrices?.[0]) || null;
  const noPrice = yesPrice != null ? Math.round((1 - yesPrice) * 1000) / 1000 : null;
  return {
    id: `pm:poly:${market.id || market.conditionId || market.slug || event.slug}`,
    entityType: "predictionMarket",
    source: "polymarket",
    question,
    currentPrice: yesPrice,
    yesPrice,
    noPrice,
    volume: market.volume ? Number(market.volume) : (event.volume ? Number(event.volume) : null),
    endDate: market.endDate || event.endDate || null,
    url: event.slug ? `https://polymarket.com/event/${event.slug}` : "",
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

async function fetchPolymarketTag(tagSlug) {
  const url = `${POLYMARKET_EVENTS_URL}?active=true&closed=false&limit=50&tag_slug=${encodeURIComponent(tagSlug)}`;
  const payload = await fetchJson(url);
  const events = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  const rows = [];
  for (const event of events) {
    const markets = Array.isArray(event.markets) ? event.markets : [];
    // For energy/uranium tags, also keyword-filter to keep results nuclear-relevant.
    const haystack = `${event.title || ""} ${event.description || ""} ${event.slug || ""}`;
    if (tagSlug !== "nuclear" && !matchesKeywords(haystack)) continue;
    for (const market of markets) {
      rows.push(normalizePolymarketMarket(market, event));
    }
  }
  return rows;
}

async function fetchPolymarket() {
  const batches = await Promise.allSettled(POLYMARKET_TAG_SLUGS.map(fetchPolymarketTag));
  const rows = [];
  const seen = new Set();
  for (const batch of batches) {
    if (batch.status !== "fulfilled") continue;
    for (const row of batch.value) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
  }
  return rows;
}

async function fetchKalshi() {
  const url = `${KALSHI_URL}?status=open&limit=200`;
  const payload = await fetchJson(url);
  const arr = Array.isArray(payload?.markets) ? payload.markets : [];
  return arr
    .filter((m) => matchesKeywords(`${m.title || ""} ${m.subtitle || ""} ${m.ticker || ""} ${m.event_ticker || ""}`))
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
