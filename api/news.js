import { ensureAllowedOrigin } from "./_lib/http.js";
import { getLiveNewsPayload } from "./_lib/newsFeed.js";

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "OPTIONS"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const payload = await getLiveNewsPayload();
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(502).json({ error: error?.message || "No live articles available." });
  }
}
