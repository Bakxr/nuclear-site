import { ensureAllowedOrigin } from "../_lib/http.js";
import { requireTerminalAccess } from "../_lib/auth.js";
import { getTerminalSnapshot } from "../_lib/terminalSnapshot.js";

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["GET", "OPTIONS"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!await requireTerminalAccess(req, res)) return;

  try {
    const snapshot = await getTerminalSnapshot();
    return res.status(200).json(snapshot);
  } catch (error) {
    console.error("[terminal/snapshot]", error?.message || error);
    return res.status(500).json({ error: "Failed to build terminal snapshot." });
  }
}
