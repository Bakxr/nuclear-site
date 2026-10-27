import crypto from "node:crypto";

// Unsubscribe links must keep working long after the email was sent.
const DEFAULT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const CONFIRM_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret() {
  return process.env.UNSUBSCRIBE_SECRET?.trim() || "";
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

// `purpose` separates token kinds: a confirmation token must never verify as
// an unsubscribe token and vice versa. Unsubscribe keeps the original
// (unprefixed) scheme so links already in inboxes stay valid.
function signPayload(payload, purpose = "") {
  return crypto.createHmac("sha256", getSecret()).update(purpose ? `${purpose}:${payload}` : payload).digest("hex");
}

function createToken(email, timestamp, purpose) {
  const normalisedEmail = email.toLowerCase().trim();
  const payload = `${normalisedEmail}:${timestamp}`;
  const encoded = base64UrlEncode(payload);
  const signature = signPayload(encoded, purpose);
  return `${encoded}.${signature}`;
}

export function createUnsubscribeToken(email, timestamp = Date.now()) {
  return createToken(email, timestamp, "");
}

export function createConfirmToken(email, timestamp = Date.now()) {
  return createToken(email, timestamp, "confirm");
}

// RFC 2369 / RFC 8058 headers so Gmail/Yahoo show a native one-click unsubscribe.
// The POST handler in api/unsubscribe.js accepts the one-click request.
export function buildUnsubscribeHeaders(unsubscribeUrl) {
  if (!unsubscribeUrl) return {};
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export function verifyUnsubscribeToken(token, maxAgeMs = DEFAULT_MAX_AGE_MS) {
  return verifyToken(token, maxAgeMs, "");
}

export function verifyConfirmToken(token, maxAgeMs = CONFIRM_MAX_AGE_MS) {
  return verifyToken(token, maxAgeMs, "confirm");
}

function verifyToken(token, maxAgeMs, purpose) {
  const secret = getSecret();
  if (!secret || !token || typeof token !== "string" || !token.includes(".")) {
    return { valid: false };
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return { valid: false };
  }

  const expected = signPayload(encoded, purpose);
  let actual;
  let expectedBuffer;
  try {
    actual = Buffer.from(signature, "hex");
    expectedBuffer = Buffer.from(expected, "hex");
  } catch {
    return { valid: false };
  }

  if (!actual.length || actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) {
    return { valid: false };
  }

  try {
    const [email, rawTimestamp] = base64UrlDecode(encoded).split(":");
    const timestamp = Number(rawTimestamp);

    if (!email || !Number.isFinite(timestamp) || Date.now() - timestamp > maxAgeMs) {
      return { valid: false };
    }

    return {
      valid: true,
      email: email.toLowerCase().trim(),
      timestamp,
    };
  } catch {
    return { valid: false };
  }
}
