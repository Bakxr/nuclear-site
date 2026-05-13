import { ensureAllowedOrigin, getClientAddress, setNoStore, setRetryAfter } from "../_lib/http.js";
import { checkRateLimit } from "../_lib/rateLimit.js";
import { getSupabaseServiceClient, hasSupabaseServiceConfig } from "../_lib/supabase.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REQUEST_LIMIT = { limit: 4, windowMs: 10 * 60 * 1000 };

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function isAlreadyRegisteredError(error) {
  if (!error) return false;
  if (error.status === 422) return true;
  const message = String(error.message || error.msg || "").toLowerCase();
  return (
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("duplicate")
  );
}

async function ensureOtpUser(supabase, email) {
  const { error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (!error) return;
  if (isAlreadyRegisteredError(error)) return;

  throw new Error(error.message || "Could not provision the Supabase user.");
}

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["POST", "OPTIONS"])) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  setNoStore(res);

  if (!hasSupabaseServiceConfig()) {
    return res.status(500).json({ error: "Server configuration is incomplete." });
  }

  const normalizedEmail = normalizeEmail(req.body?.email);
  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const rateLimitKey = `auth-request-otp:${getClientAddress(req)}:${normalizedEmail}`;
  if (!(await checkRateLimit(rateLimitKey, OTP_REQUEST_LIMIT))) {
    setRetryAfter(res, OTP_REQUEST_LIMIT.windowMs / 1000);
    return res.status(429).json({ error: "Too many attempts. Please try again later." });
  }

  try {
    const supabase = getSupabaseServiceClient();
    await ensureOtpUser(supabase, normalizedEmail);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[auth/request-otp]", error?.message || error);
    return res.status(500).json({ error: "Could not prepare sign-in for that email." });
  }
}
