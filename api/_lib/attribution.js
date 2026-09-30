// First-touch sign-up attribution sent by the browser. Everything here is
// user-controlled, so each field is trimmed to a short plain-text value.

const MAX = { source: 60, campaign: 80, referrer: 120, landing: 160, surface: 40 };

function clean(value, max) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\p{Cc}<>]/gu, "").trim().slice(0, max);
  return text || null;
}

export function sanitizeAttribution(input) {
  const src = input && typeof input === "object" ? input : {};
  const out = {};
  for (const [key, max] of Object.entries(MAX)) out[key] = clean(src[key], max);
  if (out.source) out.source = out.source.toLowerCase();
  return out;
}
