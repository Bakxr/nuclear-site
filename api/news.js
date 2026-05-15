import { ensureAllowedOrigin } from "./_lib/http.js";
import { getLiveNewsPayload } from "./_lib/newsFeed.js";
import { fetchUraniumPrice } from "./_lib/uranium.js";

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "OPTIONS"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // News is the primary payload. Uranium is bundled in as a side payload so
  // the public homepage can show a live spot price without consuming an
  // additional serverless function slot (Vercel Hobby plan cap = 12).
  const [newsResult, uraniumResult] = await Promise.allSettled([
    getLiveNewsPayload(),
    fetchUraniumPrice(),
  ]);

  if (newsResult.status === "rejected") {
    console.error("[news]", newsResult.reason?.message || newsResult.reason);
    return res.status(502).json({ error: "No live articles available." });
  }

  const payload = { ...newsResult.value };
  if (uraniumResult.status === "fulfilled" && uraniumResult.value) {
    payload.uranium = uraniumResult.value;
  }

  return res.status(200).json(payload);
}
