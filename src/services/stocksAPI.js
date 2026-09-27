// Cache recent market responses client-side to reduce panel churn.
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
    const response = await fetch(`/api/market/quotes?symbols=${encodeURIComponent(ticker)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const result = data?.quotes?.[ticker] || {
      price: 0,
      change: 0,
      pct: 0,
      high: 0,
      low: 0,
      open: 0,
      previousClose: 0,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`Error fetching quote for ${ticker}:`, error);
    return null;
  }
}

let _historyRequest = null;

async function loadAllHistories() {
  if (!_historyRequest) {
    _historyRequest = fetch('/api/market/quotes?type=history', { headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : { histories: {} }))
      .then((data) => data?.histories || {})
      .catch(() => ({}))
      .finally(() => {
        // Allow a refetch after the cache window.
        setTimeout(() => { _historyRequest = null; }, CACHE_DURATION);
      });
  }
  return _historyRequest;
}

/**
 * Daily closing prices (~6 months) for a tracked ticker.
 * Returns [] when history is unavailable — never synthesised data, since the
 * charts are presented as real market history.
 */
export async function fetchStockHistory(ticker) {
  const histories = await loadAllHistories();
  const history = histories?.[ticker];
  return Array.isArray(history) ? history : [];
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
    const cacheableResults = {};
    const missing = [];

    tickers.forEach((ticker) => {
      const cacheKey = `quote_${ticker}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        cacheableResults[ticker] = cached.data;
      } else {
        missing.push(ticker);
      }
    });

    if (missing.length === 0) return cacheableResults;

    const response = await fetch(`/api/market/quotes?symbols=${encodeURIComponent(missing.join(","))}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const results = { ...cacheableResults, ...(data?.quotes || {}) };

    Object.entries(data?.quotes || {}).forEach(([ticker, quote]) => {
      cache.set(`quote_${ticker}`, { data: quote, timestamp: Date.now() });
    });

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
