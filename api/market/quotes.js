import { ensureAllowedOrigin, getClientAddress, setRetryAfter } from "../_lib/http.js";
import { checkRateLimit } from "../_lib/rateLimit.js";
import { fetchBatchQuotes } from "../_lib/market.js";
import { STOCKS_BASE } from "../../src/data/constants.js";

const MAX_SYMBOLS = 20;
const ALLOWED_TICKERS = new Set(STOCKS_BASE.map((stock) => stock.ticker.toUpperCase()));

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "OPTIONS"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const rateLimitKey = `market-quotes:${getClientAddress(req)}`;
  if (!(await checkRateLimit(rateLimitKey, { limit: 60, windowMs: 60 * 1000 }))) {
    setRetryAfter(res, 60);
    return res.status(429).json({ error: "Too many requests." });
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
