import { createClient } from '@supabase/supabase-js';
import { ensureAllowedOrigin, getClientAddress, setNoStore } from "./_lib/http.js";
import { checkRateLimit } from "./_lib/rateLimit.js";
import { sendEmail } from "./_lib/dispatch.js";
import { buildConfirmEmail, buildWelcomeEmail } from "./_lib/emailTemplates.js";
import { sanitizeAttribution } from "./_lib/attribution.js";
import { verifyConfirmToken } from "./_lib/unsubscribe.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Double opt-in. POST { email } records the sign-up and emails a confirmation
// link; nothing else is sent until that link is used. The link lands here as
// ?confirm=<token>: GET renders a confirm button (mail scanners prefetch links,
// so GET must not mutate), POST marks the row confirmed and sends the welcome.
// Lives in this function rather than its own: the Hobby plan caps a
// deployment at 12 functions.
export default async function handler(req, res) {
  if (typeof req.query?.confirm === 'string') return handleConfirm(req, res);

  if (!ensureAllowedOrigin(req, res, ["POST", "OPTIONS"])) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Writes use the service key server-side (never exposed to the client).
  // The subscribers table is RLS-hardened to service-key-only access;
  // abuse is contained here via validation, honeypot, and rate limiting.
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server configuration is incomplete.' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { email, website, attribution } = req.body || {};

  if (website) {
    return res.status(400).json({ error: 'Request rejected.' });
  }

  const normalised = typeof email === 'string' ? email.toLowerCase().trim() : '';
  if (!normalised || normalised.length > 254 || !EMAIL_RE.test(normalised)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const clientAddress = getClientAddress(req);
  const allowed = await checkRateLimit(`subscribe-ip:${clientAddress}`, { limit: 20, windowMs: 60 * 60 * 1000 })
    && await checkRateLimit(`subscribe:${clientAddress}:${normalised}`, { limit: 4, windowMs: 10 * 60 * 1000 })
    // Per address across all IPs: caps how often anyone can make us email a stranger.
    && await checkRateLimit(`subscribe-email:${normalised}`, { limit: 3, windowMs: 24 * 60 * 60 * 1000 });
  if (!allowed) {
    return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
  }

  const { data: existing } = await supabase
    .from('subscribers')
    .select('active, confirmed_at')
    .eq('email', normalised)
    .maybeSingle();

  // Already subscribed: same response as a new sign-up, so the form can't be
  // used to test whether an address is on the list.
  if (existing?.active && existing.confirmed_at) {
    return res.status(200).json({ success: true, confirm: true });
  }

  // Brand-new rows start active but unconfirmed (senders skip them). An
  // existing opted-out row is left alone until the link is confirmed, so a
  // stranger can't resubscribe someone who opted out. Attribution is first-touch.
  if (!existing) {
    const { error } = await supabase
      .from('subscribers')
      .upsert({ email: normalised, active: true, confirmed_at: null, ...sanitizeAttribution(attribution) }, { onConflict: 'email' });
    if (error) {
      console.error('[subscribe]', error.message);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }

  if (!process.env.RESEND_API_KEY?.trim() || !process.env.UNSUBSCRIBE_SECRET?.trim()) {
    console.error('[subscribe] confirmation email not configured');
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
  const result = await sendEmail({ to: normalised, ...buildConfirmEmail({ email: normalised }) });
  if (!result.ok) {
    console.error('[subscribe] confirmation email failed:', result.error);
    return res.status(502).json({ error: "We couldn't send the confirmation email. Please try again." });
  }

  return res.status(200).json({ success: true, confirm: true });
}

async function handleConfirm(req, res) {
  setNoStore(res);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).send(page('Method not allowed.'));
  }

  const token = req.query.confirm;
  const verification = verifyConfirmToken(token);
  if (!verification.valid) {
    return res.status(400).send(page('This confirmation link is invalid or has expired. Sign up again on the site to get a fresh one.'));
  }

  if (req.method === 'GET') {
    return res.status(200).send(page('One click to confirm your Nuclear Pulse subscription.', { confirmToken: token }));
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).send(page('Server configuration is incomplete.'));
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: existing } = await supabase
    .from('subscribers')
    .select('active, confirmed_at')
    .eq('email', verification.email)
    .maybeSingle();
  const alreadyConfirmed = Boolean(existing?.active && existing.confirmed_at);

  if (!alreadyConfirmed) {
    const { error } = await supabase
      .from('subscribers')
      .upsert({ email: verification.email, active: true, confirmed_at: new Date().toISOString() }, { onConflict: 'email' });
    if (error) {
      console.error('[subscribe/confirm]', error.message);
      return res.status(500).send(page('Something went wrong. Please try again.'));
    }

    if (process.env.RESEND_API_KEY?.trim()) {
      // A failed welcome email must never fail the confirmation itself.
      const result = await sendEmail({ to: verification.email, ...buildWelcomeEmail({ email: verification.email }) });
      if (!result.ok) console.error('[subscribe] welcome email failed:', result.error);
    }
  }

  return res.status(200).send(page("You're subscribed. The briefing arrives every Sunday.", { done: true }));
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function page(message, { confirmToken = '', done = false } = {}) {
  const action = confirmToken
    ? `<form method="POST" action="/api/subscribe?confirm=${escapeAttr(encodeURIComponent(confirmToken))}">
      <button type="submit">Confirm subscription</button>
    </form>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title>Nuclear Pulse — Confirm subscription</title>
  <style>
    body { margin: 0; background: #f5f2ea; color: #16140f; font-family: 'Public Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 0 16px; }
    .card { text-align: center; max-width: 440px; padding: 36px 32px 32px; border-top: 3px double #16140f; }
    h1 { font-family: Newsreader, Georgia, serif; font-size: 34px; font-weight: 500; margin: 0 0 12px; color: #16140f; }
    p  { font-size: 16px; color: #4a453b; line-height: 1.6; margin: 0 0 24px; }
    a  { color: #1c44c9; font-size: 14px; }
    form { margin: 0 0 22px; }
    button { background: #16140f; color: #f5f2ea; border: 0; border-radius: 2px; padding: 12px 24px; min-height: 44px;
             font: 600 15px system-ui, sans-serif; cursor: pointer; }
    button:hover { background: #1c44c9; color: #ffffff; }
    @media (prefers-color-scheme: dark) {
      body { background: #121110; color: #ede8dc; }
      .card { border-top-color: #ede8dc; }
      h1 { color: #ede8dc; }
      p { color: #b9b2a3; }
      a { color: #8fa8ff; }
      button { background: #ede8dc; color: #121110; }
      button:hover { background: #8fa8ff; color: #0b1430; }
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Nuclear Pulse</h1>
    <p>${escapeAttr(message)}</p>
    ${action}
    <a href="${done ? '/terminal' : '/'}">${done ? 'While you wait: try the terminal free for 7 days →' : '← Back to Nuclear Pulse'}</a>
  </div>
</body>
</html>`;
}
