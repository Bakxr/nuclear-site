// Signed links for the X drafts: chart card images (/api/social/card) and
// the posting page (/api/social/post). The data travels in the URL, so the
// image and page always match the post they were drafted with, however late
// the owner opens the email; the signature stops anyone else minting branded
// pages. Kept apart from socialCards.js so the cron job never loads the renderer.

import crypto from "node:crypto";

function cardSecret() {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) throw new Error("CRON_SECRET missing");
  return secret;
}

function sign(payload) {
  return crypto.createHmac("sha256", cardSecret()).update(payload).digest("base64url").slice(0, 22);
}

function signedUrl(siteUrl, path, data) {
  const d = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  return `${siteUrl.replace(/\/$/, "")}${path}?d=${d}&s=${sign(d)}`;
}

export function cardUrl(siteUrl, card) {
  return signedUrl(siteUrl, "/api/social/card", card);
}

// Posting page for one draft: text, reply and card.
export function shareUrl(siteUrl, draft) {
  return signedUrl(siteUrl, "/api/social/post", { kind: draft.kind, text: draft.text, reply: draft.reply || null, card: draft.card || null });
}

// Returns the signed object, or null if the signature doesn't match.
export function readSignedParams(d, s) {
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

