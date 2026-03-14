import { createClient } from '@supabase/supabase-js';
import { ensureAllowedOrigin, getClientAddress } from "./_lib/http.js";
import { checkRateLimit } from "./_lib/rateLimit.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["POST", "OPTIONS"])) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server configuration is incomplete.' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  const { email, website } = req.body || {};

  if (website) {
    return res.status(400).json({ error: 'Request rejected.' });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const normalised = email.toLowerCase().trim();
  const rateLimitKey = `subscribe:${getClientAddress(req)}:${normalised}`;
  if (!checkRateLimit(rateLimitKey, { limit: 4, windowMs: 10 * 60 * 1000 })) {
    return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
  }

  // Upsert: if email already exists, re-activate it (handles re-subscribe after unsubscribe)
  const { error } = await supabase
    .from('subscribers')
    .upsert({ email: normalised, active: true }, { onConflict: 'email' });

  if (error) {
    console.error('[subscribe]', error.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }

  return res.status(200).json({ success: true });
}
