import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  // CORS headers so the browser can POST from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const normalised = email.toLowerCase().trim();

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
