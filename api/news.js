import { ensureAllowedOrigin } from "./_lib/http.js";
import { getLiveNewsPayload } from "./_lib/newsFeed.js";
import { fetchUraniumPrice } from "./_lib/uranium.js";
import { fetchNrcFleetStatus } from "./_lib/nrcFleet.js";

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "OPTIONS"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // News is the primary payload. Uranium spot and the NRC fleet snapshot are
  // bundled in as side payloads so the public homepage can show live data
  // without consuming additional serverless function slots (Hobby cap = 12).
  const [newsResult, uraniumResult, fleetResult] = await Promise.allSettled([
    getLiveNewsPayload(),
    fetchUraniumPrice(),
    fetchNrcFleetStatus(),
  ]);

  if (newsResult.status === "rejected") {
    console.error("[news]", newsResult.reason?.message || newsResult.reason);
    return res.status(502).json({ error: "No live articles available." });
  }

  const payload = { ...newsResult.value };
  if (uraniumResult.status === "fulfilled" && uraniumResult.value) {
    payload.uranium = uraniumResult.value;
  }
  if (fleetResult.status === "fulfilled" && fleetResult.value) {
    payload.fleet = fleetResult.value;
  }

  return res.status(200).json(payload);
}
