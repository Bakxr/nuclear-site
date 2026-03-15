import { ensureAllowedOrigin } from "../_lib/http.js";
import { fetchBatchQuotes } from "../_lib/market.js";

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "OPTIONS"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const raw = String(req.query?.symbols || req.query?.tickers || "");
  const symbols = raw.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean);

  if (!symbols.length) {
    return res.status(400).json({ error: "Provide symbols or tickers as a comma-separated query string." });
  }

  const quotes = await fetchBatchQuotes(symbols);
  return res.status(200).json({
    quotes,
    fetchedAt: new Date().toISOString(),
  });
}
