import { ensureAllowedOrigin, getClientAddress, setNoStore, setRetryAfter } from "../_lib/http.js";
import { checkRateLimit } from "../_lib/rateLimit.js";
import { fetchUraniumPrice } from "../_lib/uranium.js";

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "OPTIONS"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  setNoStore(res);

  const key = `market-uranium:${getClientAddress(req)}`;
  if (!(await checkRateLimit(key, { limit: 60, windowMs: 60 * 1000 }))) {
    setRetryAfter(res, 60);
    return res.status(429).json({ error: "Too many requests." });
  }

  try {
    const payload = await fetchUraniumPrice();
    if (!payload) {
      return res.status(502).json({ error: "Uranium price unavailable." });
    }
    return res.status(200).json(payload);
  } catch (error) {
    console.error("[market/uranium]", error?.message || error);
    return res.status(502).json({ error: "Uranium price unavailable." });
  }
}
