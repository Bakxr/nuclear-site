import { createClient } from '@supabase/supabase-js';
import { verifyUnsubscribeToken } from "./_lib/unsubscribe.js";
import { setNoStore } from "./_lib/http.js";

// GET renders a confirmation page only — mail scanners (Outlook Safe Links,
// corporate gateways) prefetch every link, so a mutating GET would silently
// unsubscribe people. The actual opt-out happens on POST, which covers both
// the confirm button and RFC 8058 one-click (List-Unsubscribe-Post).
export default async function handler(req, res) {
  setNoStore(res);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).send(page('Method not allowed.'));
  }

  const token = typeof req.query?.token === 'string' ? req.query.token : '';
  const verification = verifyUnsubscribeToken(token);

  if (!verification.valid) {
    return res.status(400).send(page('Invalid or expired unsubscribe link.'));
  }

  if (req.method === 'GET') {
    return res.status(200).send(page('Unsubscribe from Nuclear Pulse emails?', { confirmToken: token }));
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).send(page('Server configuration is incomplete.'));
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Upsert rather than update: terminal members get the daily brief without
  // ever having a `subscribers` row, and the cron reads opt-outs from here.
  const { error } = await supabase
    .from('subscribers')
    .upsert({ email: verification.email, active: false }, { onConflict: 'email' });

  if (error) {
    console.error('[unsubscribe]', error.message);
    return res.status(500).send(page('Something went wrong. Please try again.'));
  }

  return res.status(200).send(page("You've been unsubscribed.", { success: true }));
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function page(message, { success = false, confirmToken = '' } = {}) {
  const action = confirmToken
    ? `<form method="POST" action="/api/unsubscribe?token=${escapeAttr(encodeURIComponent(confirmToken))}">
      <button type="submit">Unsubscribe</button>
    </form>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title>Nuclear Pulse — Unsubscribe</title>
  <style>
    body { margin: 0; background: #14120e; color: #f5f0e8; font-family: 'DM Sans', sans-serif;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 0 16px; }
    .card { text-align: center; max-width: 420px; padding: 48px 40px;
            border: 1px solid rgba(212,165,74,0.2); border-radius: 16px; }
    h1 { font-family: Georgia, serif; font-size: 28px; font-weight: 400; margin: 0 0 12px; color: #d4a54a; }
    p  { font-size: 15px; color: rgba(245,240,232,0.55); line-height: 1.6; margin: 0 0 28px; }
    a  { color: #d4a54a; font-size: 13px; }
    form { margin: 0 0 24px; }
    button { background: #d4a54a; color: #14120e; border: 0; border-radius: 999px; padding: 10px 24px;
             font: 600 14px 'DM Sans', sans-serif; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Nuclear Pulse</h1>
    <p>${message}${success ? ' You will no longer receive our email briefings.' : ''}</p>
    ${action}
    <a href="/">← Back to Nuclear Pulse</a>
  </div>
</body>
</html>`;
}
