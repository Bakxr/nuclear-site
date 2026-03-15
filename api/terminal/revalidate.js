import { ensureAllowedOrigin } from "../_lib/http.js";
import { checkRateLimit } from "../_lib/rateLimit.js";
import { getClientAddress } from "../_lib/http.js";
import { getTerminalSnapshot } from "../_lib/terminalSnapshot.js";

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "OPTIONS"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const secret = process.env.TERMINAL_REVALIDATE_TOKEN;
  if (secret && req.query?.token !== secret) {
    return res.status(401).json({ error: "Invalid token." });
  }

  const rateLimitKey = `terminal-revalidate:${getClientAddress(req)}`;
  if (!checkRateLimit(rateLimitKey, { limit: 10, windowMs: 15 * 60 * 1000 })) {
    return res.status(429).json({ error: "Too many revalidation attempts." });
  }

  try {
    const snapshot = await getTerminalSnapshot({ force: true });
    return res.status(200).json({
      ok: true,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("[terminal/revalidate]", error?.message || error);
    return res.status(500).json({ error: "Terminal revalidation failed." });
  }
}
