import { ensureAllowedOrigin } from "../_lib/http.js";
import { requireTerminalAccess } from "../_lib/auth.js";
import { getTerminalSnapshot } from "../_lib/terminalSnapshot.js";
import { searchTerminalSnapshot } from "../../src/features/terminal/selectors.js";

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "OPTIONS"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!await requireTerminalAccess(req, res)) return;

  const query = String(req.query?.q || "").trim();
  if (!query) return res.status(200).json({ results: [], query });

  try {
    const snapshot = await getTerminalSnapshot();
    const results = searchTerminalSnapshot(snapshot, query);
    return res.status(200).json({
      query,
      results,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("[terminal/search]", error?.message || error);
    return res.status(500).json({ error: "Failed to search terminal snapshot." });
  }
}
