import crypto from "node:crypto";

const DEFAULT_MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;

function getSecret() {
  return process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_KEY || "";
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createUnsubscribeToken(email, timestamp = Date.now()) {
  const normalisedEmail = email.toLowerCase().trim();
  const payload = `${normalisedEmail}:${timestamp}`;
  const encoded = base64UrlEncode(payload);
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

export function verifyUnsubscribeToken(token, maxAgeMs = DEFAULT_MAX_AGE_MS) {
  const secret = getSecret();
  if (!secret || !token || typeof token !== "string" || !token.includes(".")) {
    return { valid: false };
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return { valid: false };
  }

  const expected = signPayload(encoded);
  const actual = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) {
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
