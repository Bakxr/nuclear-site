// Finnhub Stock API Integration
const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

// Cache to avoid hitting rate limits (60 calls/min on free tier)
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch current stock quote (price, change, etc.)
 */
export async function fetchStockQuote(ticker) {
  const cacheKey = `quote_${ticker}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `${BASE_URL}/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Finnhub returns: { c: current, d: change, dp: percent change, h: high, l: low, o: open, pc: previous close }
    const result = {
      price: data.c || 0,
      change: data.d || 0,
      pct: data.dp || 0,
      high: data.h || 0,
      low: data.l || 0,
      open: data.o || 0,
      previousClose: data.pc || 0,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`Error fetching quote for ${ticker}:`, error);
    return null;
  }
}

/**
 * Deterministic seeded PRNG — same ticker always produces the same chart shape
 */
function hashTicker(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h, 31) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

function makeSeededRand(seed) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

/**
 * Generate deterministic historical data based on ticker + current price.
 * The same ticker always produces the same chart shape, anchored to the real price.
 */
function generateFallbackHistory(ticker, currentPrice, days = 90) {
  const rand = makeSeededRand(hashTicker(ticker));
  const data = [];
  const volatility = currentPrice * 0.018;
  // Each ticker gets its own trend direction (-0.0015 to +0.0025)
  const trend = (rand() - 0.4) * 0.002;

  // Back-calculate a starting price so the walk ends near currentPrice
  let price = currentPrice * (1 - trend * days * 0.6) * (0.9 + rand() * 0.08);

  for (let i = 0; i < days; i++) {
    price += (rand() - 0.47 + trend) * volatility;
    price = Math.max(currentPrice * 0.25, price);

    const date = new Date();
    date.setDate(date.getDate() - (days - i));

    const hi = price * (1 + rand() * 0.012);
    const lo = price * (1 - rand() * 0.012);

    data.push({
      day: i,
      price: +(price.toFixed(2)),
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      high: +hi.toFixed(2),
      low: +lo.toFixed(2),
      open: +(price * (1 + (rand() - 0.5) * 0.008)).toFixed(2),
      volume: Math.floor(rand() * 900000 + 100000),
    });
  }

  // Pin the final bar to the actual live price
  data[data.length - 1].price = +currentPrice.toFixed(2);
  return data;
}

/**
 * Fetch historical stock data for charts
 * @param {string} ticker - Stock ticker symbol
 * @param {string} resolution - Time resolution ('D' for daily, 'W' for weekly, '1' for 1min, etc.)
 * @param {number} days - Number of days of history to fetch
 * @param {number} currentPrice - Current price for fallback generation
 */
export async function fetchStockHistory(ticker, resolution = 'D', days = 90, currentPrice = null) {
  const cacheKey = `history_${ticker}_${resolution}_${days}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Candle endpoint requires a paid Finnhub plan — use deterministic fallback directly.
  // Same ticker always produces the same chart shape, anchored to the live price.
  if (currentPrice) {
    const history = generateFallbackHistory(ticker, currentPrice, days);
    cache.set(cacheKey, { data: history, timestamp: Date.now() });
    return history;
  }

  return [];
}

/**
 * Batch fetch quotes for multiple stocks.
 * Fetches sequentially with a small delay to stay within Finnhub's
 * free-tier rate limit (60 calls/min) and avoid 429 errors.
 *
 * In-flight lock: React StrictMode double-invokes effects in dev, which would
 * fire two concurrent batch fetches before the cache is populated. The lock
 * ensures only one batch runs at a time; the second call waits for the first.
 */
let _inflightQuotes = null;

export async function fetchMultipleQuotes(tickers) {
  if (_inflightQuotes) return _inflightQuotes;

  _inflightQuotes = (async () => {
    const results = {};
    for (const ticker of tickers) {
      const quote = await fetchStockQuote(ticker);
      if (quote) results[ticker] = quote;
      // ~300ms between calls = safe rate for free tier (≤5 req/s)
      await new Promise(r => setTimeout(r, 300));
    }
    return results;
  })();

  try {
    return await _inflightQuotes;
  } finally {
    _inflightQuotes = null;
  }
}

/**
 * Clear cache (useful for forcing refresh)
 */
export function clearCache() {
  cache.clear();
}
