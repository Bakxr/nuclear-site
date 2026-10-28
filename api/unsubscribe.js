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
    <p>${message}${success ? ' You will no longer receive our email briefings.' : ''}</p>
    ${action}
    <a href="/">← Back to Nuclear Pulse</a>
  </div>
</body>
</html>`;
}
