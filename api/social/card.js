// Chart card PNG for a daily X draft. The card data rides in the signed URL
// (see api/_lib/cardLinks.js), so a given URL always renders the same image
// and can be cached for good. With ?view=post (the /api/social/post rewrite)
// it serves the draft's posting page instead: the Hobby plan caps a
// deployment at 12 functions.

import { readSignedParams } from "../_lib/cardLinks.js";
import { renderCardPng } from "../_lib/socialCards.js";
import { sendSharePage } from "../_lib/sharePage.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let card;
  try {
    card = readSignedParams(req.query?.d, req.query?.s);
  } catch (err) {
    console.error("[social/card]", err?.message || err);
    return res.status(500).json({ error: "Cards are not configured." });
  }
  if (req.query?.view === "post") return sendSharePage(res, card);
  if (!card) return res.status(403).json({ error: "Invalid card link." });

  try {
    const png = await renderCardPng(card);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Disposition", `inline; filename="nuclear-pulse-${card.type}.png"`);
    return res.status(200).send(Buffer.from(png));
  } catch (err) {
    console.error("[social/card] render failed", err?.message || err);
    return res.status(400).json({ error: "Could not render this card." });
  }
}
