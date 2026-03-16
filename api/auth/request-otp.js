import { ensureAllowedOrigin, getClientAddress } from "../_lib/http.js";
import { checkRateLimit } from "../_lib/rateLimit.js";
import { getSupabaseServiceClient, hasSupabaseServiceConfig } from "../_lib/supabase.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REQUEST_LIMIT = { limit: 4, windowMs: 10 * 60 * 1000 };

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 200;

  while (page <= 50) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message || "Could not inspect Supabase users.");
    }

    const match = (data?.users || []).find((user) => normalizeEmail(user.email) === email);
    if (match) return match;
    if (!data?.nextPage || !data?.users?.length) break;
    page = data.nextPage;
  }

  return null;
}

async function ensureOtpUser(supabase, email) {
  const existingUser = await findUserByEmail(supabase, email);
  if (existingUser) {
    if (!existingUser.email_confirmed_at) {
      const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
        email_confirm: true,
      });
      if (error) {
        throw new Error(error.message || "Could not normalize the Supabase user.");
      }
    }

    return existingUser;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (error || !data?.user) {
    throw new Error(error?.message || "Could not provision the Supabase user.");
  }

  return data.user;
}

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["POST", "OPTIONS"])) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!hasSupabaseServiceConfig()) {
    return res.status(500).json({ error: "Server configuration is incomplete." });
  }

  const normalizedEmail = normalizeEmail(req.body?.email);
  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const rateLimitKey = `auth-request-otp:${getClientAddress(req)}:${normalizedEmail}`;
  if (!checkRateLimit(rateLimitKey, OTP_REQUEST_LIMIT)) {
    return res.status(429).json({ error: "Too many attempts. Please try again later." });
  }

  try {
    const supabase = getSupabaseServiceClient();
    await ensureOtpUser(supabase, normalizedEmail);
    return res.status(200).json({ success: true, email: normalizedEmail });
  } catch (error) {
    console.error("[auth/request-otp]", error?.message || error);
    return res.status(500).json({ error: "Could not prepare sign-in for that email." });
  }
}
