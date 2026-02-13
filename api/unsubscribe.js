import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key needed to update any row
);

export default async function handler(req, res) {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send(page('Invalid unsubscribe link.', false));
  }

  const { error } = await supabase
    .from('subscribers')
    .update({ active: false })
    .eq('email', decodeURIComponent(email).toLowerCase().trim());

  if (error) {
    console.error('[unsubscribe]', error.message);
    return res.status(500).send(page('Something went wrong. Please try again.', false));
  }

  return res.status(200).send(page("You've been unsubscribed.", true));
}

function page(message, success) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nuclear Pulse — Unsubscribe</title>
  <style>
    body { margin: 0; background: #14120e; color: #f5f0e8; font-family: 'DM Sans', sans-serif;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { text-align: center; max-width: 420px; padding: 48px 40px;
            border: 1px solid rgba(212,165,74,0.2); border-radius: 16px; }
    h1 { font-family: Georgia, serif; font-size: 28px; font-weight: 400; margin: 0 0 12px; color: #d4a54a; }
    p  { font-size: 15px; color: rgba(245,240,232,0.55); line-height: 1.6; margin: 0 0 28px; }
    a  { color: #d4a54a; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Nuclear Pulse</h1>
    <p>${message}${success ? ' You will no longer receive our weekly briefings.' : ''}</p>
    <a href="/">← Back to Nuclear Pulse</a>
  </div>
</body>
</html>`;
}
