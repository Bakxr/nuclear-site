// Signed links to chart cards. The card's numbers travel in the URL, so the
// image always matches the post text it was drafted with, however late the
// owner opens the email; the signature stops anyone else minting branded
// cards. Kept apart from socialCards.js so the cron job never loads the renderer.

import crypto from "node:crypto";

function cardSecret() {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) throw new Error("CRON_SECRET missing");
  return secret;
}

function sign(payload) {
  return crypto.createHmac("sha256", cardSecret()).update(payload).digest("base64url").slice(0, 22);
}

export function cardUrl(siteUrl, card) {
  const d = Buffer.from(JSON.stringify(card), "utf8").toString("base64url");
  return `${siteUrl.replace(/\/$/, "")}/api/social/card?d=${d}&s=${sign(d)}`;
}

// Returns the card object, or null if the signature doesn't match.
export function readCardParams(d, s) {
  if (typeof d !== "string" || typeof s !== "string" || d.length > 6000) return null;
  const expected = Buffer.from(sign(d));
  const given = Buffer.from(s);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(d, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
