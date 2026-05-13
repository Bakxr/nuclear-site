import crypto from "node:crypto";
import { ensureAllowedOrigin, setNoStore, setRetryAfter } from "../_lib/http.js";
import { checkRateLimit } from "../_lib/rateLimit.js";
import { getClientAddress } from "../_lib/http.js";
import { getTerminalSnapshot } from "../_lib/terminalSnapshot.js";

function timingSafeEqualStr(a, b) {
  const aBuf = Buffer.from(String(a), "utf8");
  const bBuf = Buffer.from(String(b), "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "OPTIONS"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  setNoStore(res);

  const secret = process.env.TERMINAL_REVALIDATE_TOKEN;
  if (!secret) {
    console.error("[terminal/revalidate] TERMINAL_REVALIDATE_TOKEN is not configured");
    return res.status(503).json({ error: "Revalidation is not configured." });
  }
  const provided = typeof req.query?.token === "string" ? req.query.token : "";
  if (!timingSafeEqualStr(provided, secret)) {
    return res.status(401).json({ error: "Invalid token." });
  }

  const rateLimitKey = `terminal-revalidate:${getClientAddress(req)}`;
  if (!(await checkRateLimit(rateLimitKey, { limit: 10, windowMs: 15 * 60 * 1000 }))) {
    setRetryAfter(res, 15 * 60);
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
