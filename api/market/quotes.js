import { ensureAllowedOrigin, getClientAddress, setRetryAfter } from "../_lib/http.js";
import { checkRateLimit } from "../_lib/rateLimit.js";
import { fetchBatchQuotes } from "../_lib/market.js";
import { fetchPredictionMarkets } from "../_lib/predictionMarkets.js";
import { fetchPriceHistories, toChartHistory } from "../_lib/priceHistory.js";
import { FEATURED_STOCKS, STOCKS_BASE } from "../../src/data/constants.js";
import { marketTopicKey } from "../../src/features/terminal/marketTopic.js";

const MAX_SYMBOLS = 20;
const ALLOWED_TICKERS = new Set(STOCKS_BASE.map((stock) => stock.ticker.toUpperCase()));
const PREDICTION_TEASER_LIMIT = 6;

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "OPTIONS"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const rateLimitKey = `market-quotes:${getClientAddress(req)}`;
  if (!(await checkRateLimit(rateLimitKey, { limit: 60, windowMs: 60 * 1000 }))) {
    setRetryAfter(res, 60);
    return res.status(429).json({ error: "Too many requests." });
  }

  // Public prediction-market teaser: top markets by volume, trimmed fields only.
  // The full board (history, anchors, categories) stays behind terminal access.
  if (String(req.query?.type || "") === "predictions") {
    try {
      const markets = await fetchPredictionMarkets();
      const seenTopics = new Set();
      const teaser = markets
        .filter((market) => Number.isFinite(market.yesPrice))
        .filter((market) => {
          const key = marketTopicKey(market.question) || market.id;
          if (seenTopics.has(key)) return false;
          seenTopics.add(key);
          return true;
        })
        .slice(0, PREDICTION_TEASER_LIMIT)
        .map((market) => ({
          id: market.id,
          source: market.source,
          question: market.question,
          yesPrice: market.yesPrice,
          volume: market.volume,
          endDate: market.endDate,
        }));
      return res.status(200).json({ markets: teaser, fetchedAt: new Date().toISOString() });
    } catch {
      return res.status(200).json({ markets: [], fetchedAt: new Date().toISOString() });
    }
  }

  // Public daily closes for the tracked equities (editorial charts). Cached
  // server-side, so this never fans out to the upstream per request.
  if (String(req.query?.type || "") === "history") {
    try {
      // Editorial charts only need the featured set; the terminal gets the
      // full universe through the authenticated snapshot.
      const tickers = FEATURED_STOCKS.map((stock) => stock.ticker);
      const histories = await fetchPriceHistories(tickers);
      const payload = Object.fromEntries(
        Object.entries(histories).map(([ticker, history]) => [ticker, toChartHistory(history)]),
      );
      res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
      return res.status(200).json({ histories: payload, fetchedAt: new Date().toISOString() });
    } catch {
      return res.status(200).json({ histories: {}, fetchedAt: new Date().toISOString() });
    }
  }

  const raw = String(req.query?.symbols || req.query?.tickers || "");
  const requested = raw.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean);

  if (!requested.length) {
    return res.status(400).json({ error: "Provide symbols or tickers as a comma-separated query string." });
  }

  if (requested.length > MAX_SYMBOLS) {
    return res.status(400).json({ error: `At most ${MAX_SYMBOLS} symbols per request.` });
  }

  const symbols = [...new Set(requested.filter((ticker) => ALLOWED_TICKERS.has(ticker)))];

  if (!symbols.length) {
    return res.status(400).json({ error: "No supported symbols in request." });
  }

  const quotes = await fetchBatchQuotes(symbols);
  return res.status(200).json({
    quotes,
    fetchedAt: new Date().toISOString(),
  });
}
