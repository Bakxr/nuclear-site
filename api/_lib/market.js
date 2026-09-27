const BASE_URL = "https://finnhub.io/api/v1";
const CACHE_TTL = 5 * 60 * 1000;
const quoteCache = globalThis.__npMarketQuoteCache ?? new Map();
globalThis.__npMarketQuoteCache = quoteCache;

function getApiKey() {
  return process.env.FINNHUB_API_KEY || process.env.VITE_FINNHUB_API_KEY || "";
}

export async function fetchQuote(ticker) {
  const cacheKey = `quote:${ticker}`;
  const cached = quoteCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.payload;

  const apiKey = getApiKey();
  if (!apiKey) {
    return { price: 0, change: 0, pct: 0, high: 0, low: 0, open: 0, previousClose: 0 };
  }

  const response = await fetch(`${BASE_URL}/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`, {
    headers: { accept: "application/json", "user-agent": "NuclearPulseBot/1.0 (+https://atomic-energy.vercel.app)" },
  });

  if (!response.ok) {
    throw new Error(`Finnhub ${ticker} failed with ${response.status}`);
  }

  const data = await response.json();
  const payload = {
    price: data.c || 0,
    change: data.d || 0,
    pct: data.dp || 0,
    high: data.h || 0,
    low: data.l || 0,
    open: data.o || 0,
    previousClose: data.pc || 0,
  };

  quoteCache.set(cacheKey, { ts: Date.now(), payload });
  return payload;
}

const EMPTY_QUOTE = { price: 0, change: 0, pct: 0, high: 0, low: 0, open: 0, previousClose: 0 };
const QUOTE_CONCURRENCY = 5;

// Finnhub free tier allows 60 calls/min (30/s burst); quotes are cached 5 min,
// so a full ~40-ticker refresh fits comfortably with modest concurrency.
export async function fetchBatchQuotes(tickers = []) {
  const results = {};
  const queue = [...tickers];
  async function worker() {
    while (queue.length) {
      const ticker = queue.shift();
      try {
        results[ticker] = await fetchQuote(ticker);
      } catch {
        results[ticker] = { ...EMPTY_QUOTE };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(QUOTE_CONCURRENCY, tickers.length) }, worker));
  return results;
}
