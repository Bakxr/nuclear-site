const DEFAULT_ALLOWED_METHODS = ["GET", "POST", "OPTIONS"];

function splitOrigins(raw = "") {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getAllowedOrigins() {
  const siteUrl = process.env.SITE_URL?.trim();
  const configured = splitOrigins(process.env.ALLOWED_ORIGINS || "");
  const defaults = [
    siteUrl,
    "https://atomic-energy.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ].filter(Boolean);

  return [...new Set([...configured, ...defaults])];
}

export function applyCors(req, res, methods = DEFAULT_ALLOWED_METHODS) {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "";

  if (allowOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", methods.join(", "));
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function ensureAllowedOrigin(req, res, methods = DEFAULT_ALLOWED_METHODS) {
  applyCors(req, res, methods);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return false;
  }

  const origin = req.headers.origin;
  if (origin && !getAllowedOrigins().includes(origin)) {
    res.status(403).json({ error: "Origin not allowed." });
    return false;
  }

  return true;
}

export function getClientAddress(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

export async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
