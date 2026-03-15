import { ensureAllowedOrigin } from "../_lib/http.js";
import { getTerminalSnapshot } from "../_lib/terminalSnapshot.js";
import { getEntityById, selectFilingRows, selectMarketRows, selectNewsRows, selectOperationsRows, selectPipelineRows } from "../../src/features/terminal/selectors.js";

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "OPTIONS"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const entityId = String(req.query?.id || "").trim();
  if (!entityId) return res.status(400).json({ error: "Entity id is required." });

  try {
    const snapshot = await getTerminalSnapshot();
    const entity = getEntityById(snapshot, entityId);

    if (!entity) return res.status(404).json({ error: "Entity not found." });

    return res.status(200).json({
      entity,
      related: {
        markets: selectMarketRows(snapshot, { selectedEntity: entity }).slice(0, 6),
        catalysts: selectNewsRows(snapshot, { selectedEntity: entity }).slice(0, 6),
        pipeline: selectPipelineRows(snapshot, { selectedEntity: entity }).slice(0, 6),
        filings: selectFilingRows(snapshot, { selectedEntity: entity }).slice(0, 6),
        operations: selectOperationsRows(snapshot, { selectedEntity: entity }).slice(0, 6),
      },
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("[terminal/entity]", error?.message || error);
    return res.status(500).json({ error: "Failed to resolve terminal entity." });
  }
}
