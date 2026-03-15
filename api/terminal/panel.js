import { ensureAllowedOrigin } from "../_lib/http.js";
import { getTerminalSnapshot } from "../_lib/terminalSnapshot.js";
import { selectCountryRanking, selectFilingRows, selectMarketRows, selectNewsRows, selectOperationsRows, selectPipelineRows, selectSourceRows } from "../../src/features/terminal/selectors.js";

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "OPTIONS"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const key = String(req.query?.key || "").trim();
  if (!key) return res.status(400).json({ error: "Panel key is required." });

  try {
    const snapshot = await getTerminalSnapshot();
    let payload = null;

    if (key === "map") payload = { layerCounts: {
      reactors: snapshot.entities.plants.length,
      uranium: snapshot.entities.supplySites.length,
    } };
    if (key === "markets") payload = selectMarketRows(snapshot).slice(0, 12);
    if (key === "catalysts") payload = selectNewsRows(snapshot).slice(0, 10);
    if (key === "rankings") payload = selectCountryRanking(snapshot, "capacity").slice(0, 12);
    if (key === "pipeline") payload = selectPipelineRows(snapshot).slice(0, 12);
    if (key === "filings") payload = selectFilingRows(snapshot).slice(0, 12);
    if (key === "ops") payload = selectOperationsRows(snapshot).slice(0, 12);
    if (key === "sources") payload = selectSourceRows(snapshot).slice(0, 12);

    if (!payload) return res.status(404).json({ error: "Unknown panel key." });

    return res.status(200).json({
      key,
      payload,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("[terminal/panel]", error?.message || error);
    return res.status(500).json({ error: "Failed to load terminal panel." });
  }
}
