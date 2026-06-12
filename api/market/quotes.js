import { ensureAllowedOrigin, getClientAddress, setRetryAfter } from "../_lib/http.js";
import { checkRateLimit } from "../_lib/rateLimit.js";
import { fetchBatchQuotes } from "../_lib/market.js";
import { fetchPredictionMarkets } from "../_lib/predictionMarkets.js";
import { STOCKS_BASE } from "../../src/data/constants.js";

const MAX_SYMBOLS = 20;
const ALLOWED_TICKERS = new Set(STOCKS_BASE.map((stock) => stock.ticker.toUpperCase()));
const PREDICTION_TEASER_LIMIT = 6;

const MONTH_PATTERN = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const DATE_FRAGMENT = new RegExp(
  `\\b(?:by|before|until|on|in)\\s+(?:${MONTH_PATTERN})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s*\\d{4})?\\b`,
  "g",
);

// Markets often repeat the same question with different deadlines
// ("...by May 31, 2026?", "...by June 30, 2026?"). Collapse those so the
// public teaser shows distinct topics; input is volume-sorted so the
// highest-volume variant survives.
function teaserTopicKey(question = "") {
  return String(question)
    .toLowerCase()
    .replace(DATE_FRAGMENT, " ")
    .replace(/\b(?:by|before|until|in)\s+(?:q[1-4]\s*)?\d{4}\b/g, " ")
    .replace(/\b\d{4}\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

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
          const key = teaserTopicKey(market.question) || market.id;
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
