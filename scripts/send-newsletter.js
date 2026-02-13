/**
 * Nuclear Pulse — Weekly Newsletter Sender
 *
 * Runs every Sunday via GitHub Actions (or manually).
 * 1. Fetches top 5 nuclear news articles from RSS feeds
 * 2. Fetches weekly stock performance for all tracked tickers
 * 3. Loads active subscribers from Supabase
 * 4. Builds an HTML email
 * 5. Sends via Resend
 *
 * Required env vars:
 *   RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY,
 *   FINNHUB_API_KEY, NEWSLETTER_FROM, SITE_URL
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// ─── Config ────────────────────────────────────────────────────────────────
const RESEND_API_KEY    = process.env.RESEND_API_KEY;
const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_KEY;
const FINNHUB_KEY       = process.env.FINNHUB_API_KEY || process.env.VITE_FINNHUB_API_KEY;
const FROM              = process.env.NEWSLETTER_FROM || 'Nuclear Pulse <onboarding@resend.dev>';
const SITE_URL          = process.env.SITE_URL || 'https://nuclear-pulse.vercel.app';

const resend  = new Resend(RESEND_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Stock tickers to track ─────────────────────────────────────────────────
const TICKERS = ['CCJ','UEC','NXE','LEU','DNN','SMR','OKLO','CEG','VST','UUUU','NNE','GEV'];

// ─── RSS feeds (same sources as newsAPI.js) ─────────────────────────────────
const FEEDS = [
  { name: 'World Nuclear News', url: 'https://www.world-nuclear-news.org/rss' },
  { name: 'NucNet',             url: 'https://www.nucnet.org/feed' },
  { name: 'ANS Nuclear Newswire', url: 'https://www.ans.org/news/rss/' },
  { name: 'IAEA',               url: 'https://www.iaea.org/feeds/topnews' },
  { name: 'US Dept of Energy',  url: 'https://www.energy.gov/ne/rss.xml' },
];

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for weekly digest

// ─── Helpers ────────────────────────────────────────────────────────────────

function stripHtml(html = '') {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

const TAG_RULES = [
  { tag: 'Policy',     re: /policy|regulat|legislation|government|NRC|IAEA|permit|licens/i },
  { tag: 'Expansion',  re: /construction|build|new reactor|SMR|modular|deploy|commission/i },
  { tag: 'Markets',    re: /uranium.*price|price.*uranium|stock|market|invest|billion|deal/i },
  { tag: 'Research',   re: /fusion|research|study|scientist|breakthrough|ITER|plasma/i },
  { tag: 'Safety',     re: /safety|incident|shutdown|leak|radiation|emergency/i },
  { tag: 'Innovation', re: /advanced|microreactor|molten salt|thorium|fast reactor|gen[- ]?4/i },
];
function inferTag(title = '') {
  for (const { tag, re } of TAG_RULES) if (re.test(title)) return tag;
  return 'Industry';
}

// ─── Fetch news ──────────────────────────────────────────────────────────────

async function fetchFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(CORS_PROXY + encodeURIComponent(feed.url), { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    // Parse with regex (no DOM in Node) — extract <item> or <entry> blocks
    const isAtom = text.includes('<feed');
    const itemRe = isAtom ? /<entry>([\s\S]*?)<\/entry>/g : /<item>([\s\S]*?)<\/item>/g;
    const items = [];
    let m;
    while ((m = itemRe.exec(text)) !== null) {
      const block = m[1];
      const title = stripHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(block)?.[1] || '');
      const link  = (isAtom
        ? /href="([^"]+)"/i.exec(/<link[^>]*>/i.exec(block)?.[0] || '')?.[1]
        : /<link>([\s\S]*?)<\/link>/i.exec(block)?.[1]
            || /<guid[^>]*isPermaLink="true"[^>]*>([\s\S]*?)<\/guid>/i.exec(block)?.[1]
      ) || '';
      const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block)?.[1]
                   || /<published>([\s\S]*?)<\/published>/i.exec(block)?.[1] || '';
      if (!title || !link.startsWith('http')) continue;
      const date = pubDate ? new Date(pubDate) : null;
      if (date && Date.now() - date.getTime() > MAX_AGE_MS) continue;
      items.push({ title, url: link, source: feed.name, date, tag: inferTag(title) });
    }
    return items.slice(0, 6);
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[news] Failed to fetch ${feed.name}:`, err.message);
    return [];
  }
}

async function fetchTopNews(limit = 5) {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  // Deduplicate by URL
  const seen = new Set();
  const unique = all.filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; });
  // Sort newest first
  unique.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  return unique.slice(0, limit);
}

// ─── Fetch stocks ────────────────────────────────────────────────────────────

async function fetchQuote(ticker) {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (!d.c) return null;
    return { ticker, price: d.c, change: d.d || 0, pct: d.dp || 0 };
  } catch (err) {
    console.warn(`[stocks] Failed to fetch ${ticker}:`, err.message);
    return null;
  }
}

async function fetchTopMovers(count = 3) {
  const quotes = [];
  for (const ticker of TICKERS) {
    const q = await fetchQuote(ticker);
    if (q) quotes.push(q);
    await new Promise(r => setTimeout(r, 300)); // rate limit: ~3 req/s
  }
  quotes.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  return quotes.slice(0, count);
}

// ─── Get subscribers ─────────────────────────────────────────────────────────

async function getSubscribers() {
  const { data, error } = await supabase
    .from('subscribers')
    .select('email')
    .eq('active', true);
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data.map(r => r.email);
}

// ─── Build email HTML ────────────────────────────────────────────────────────

const TAG_COLORS = {
  Policy: '#5ab8d4', Expansion: '#4ade80', Markets: '#fbbf24',
  Research: '#a78bfa', Safety: '#f87171', Innovation: '#fb923c', Industry: '#94a3b8',
};

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function buildEmail(articles, movers, unsubEmail) {
  const date = formatDate(new Date());
  const unsubUrl = `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(unsubEmail)}`;

  const newsRows = articles.map(a => {
    const tagColor = TAG_COLORS[a.tag] || '#94a3b8';
    const dateStr = a.date ? a.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    return `
    <tr>
      <td style="padding:0 0 20px 0;">
        <a href="${a.url}" style="text-decoration:none;color:inherit;display:block;
           background:#1e1912;border:1px solid rgba(245,240,232,0.08);border-radius:10px;
           padding:18px 20px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <span style="background:${tagColor}22;color:${tagColor};font-size:10px;
              font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
              padding:3px 9px;border-radius:20px;">${a.tag}</span>
            ${dateStr ? `<span style="font-size:11px;color:rgba(245,240,232,0.35);">${dateStr}</span>` : ''}
          </div>
          <div style="font-family:Georgia,serif;font-size:17px;font-weight:400;
            line-height:1.45;color:#f5f0e8;margin-bottom:8px;">${a.title}</div>
          <div style="font-size:12px;color:rgba(245,240,232,0.4);">${a.source} →</div>
        </a>
      </td>
    </tr>`;
  }).join('');

  const moverRows = movers.map(m => {
    const up = m.pct >= 0;
    const color = up ? '#4ade80' : '#f87171';
    const arrow = up ? '▲' : '▼';
    return `
    <td style="width:33%;padding:0 6px 0 0;box-sizing:border-box;">
      <div style="background:#1e1912;border:1px solid rgba(245,240,232,0.08);
        border-radius:10px;padding:14px 16px;text-align:center;">
        <div style="font-family:'Courier New',monospace;font-size:16px;font-weight:700;
          color:#d4a54a;margin-bottom:4px;">${m.ticker}</div>
        <div style="font-size:13px;color:#f5f0e8;margin-bottom:2px;">$${m.price.toFixed(2)}</div>
        <div style="font-size:12px;font-weight:700;color:${color};">${arrow} ${Math.abs(m.pct).toFixed(2)}%</div>
      </div>
    </td>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nuclear Pulse — Weekly Briefing</title>
</head>
<body style="margin:0;padding:0;background:#0f0e0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0e0b;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding:0 0 32px 0;text-align:center;border-bottom:1px solid rgba(212,165,74,0.2);">
            <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;
              color:#d4a54a;font-weight:600;margin-bottom:10px;">Weekly Briefing</div>
            <div style="font-family:Georgia,serif;font-size:32px;font-weight:400;
              color:#f5f0e8;letter-spacing:-0.5px;">Nuclear Pulse</div>
            <div style="font-size:13px;color:rgba(245,240,232,0.35);margin-top:6px;">${date}</div>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:28px 0 24px 0;">
            <p style="font-size:15px;color:rgba(245,240,232,0.6);line-height:1.65;margin:0;">
              Your weekly digest of the most important stories in nuclear energy — covering policy,
              new construction, markets, and research from the world's leading nuclear sources.
            </p>
          </td>
        </tr>

        <!-- Top Stories -->
        <tr>
          <td style="padding:0 0 8px 0;">
            <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;
              color:rgba(212,165,74,0.7);font-weight:700;margin-bottom:16px;">Top Stories</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${newsRows}
            </table>
          </td>
        </tr>

        <!-- Market Pulse -->
        ${movers.length > 0 ? `
        <tr>
          <td style="padding:8px 0 32px 0;border-top:1px solid rgba(245,240,232,0.06);">
            <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;
              color:rgba(212,165,74,0.7);font-weight:700;margin:20px 0 14px;">Market Pulse</div>
            <p style="font-size:13px;color:rgba(245,240,232,0.4);margin:0 0 16px;">
              Biggest movers in nuclear stocks this week
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>${moverRows}</tr>
            </table>
            <p style="font-size:10px;color:rgba(245,240,232,0.2);margin:14px 0 0;">
              Data sourced from Finnhub. Not financial advice.
            </p>
          </td>
        </tr>` : ''}

        <!-- Footer -->
        <tr>
          <td style="padding:24px 0 0 0;border-top:1px solid rgba(245,240,232,0.06);text-align:center;">
            <p style="font-size:13px;color:rgba(245,240,232,0.4);margin:0 0 12px;">
              You're receiving this because you subscribed at
              <a href="${SITE_URL}" style="color:#d4a54a;text-decoration:none;">Nuclear Pulse</a>.
            </p>
            <a href="${unsubUrl}" style="font-size:12px;color:rgba(245,240,232,0.25);text-decoration:underline;">
              Unsubscribe
            </a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[newsletter] Starting…');

  // Validate env
  for (const key of ['RESEND_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY']) {
    if (!process.env[key]) {
      console.error(`[newsletter] Missing required env var: ${key}`);
      process.exit(1);
    }
  }

  console.log('[newsletter] Fetching news…');
  const articles = await fetchTopNews(5);
  console.log(`[newsletter] Got ${articles.length} articles`);

  console.log('[newsletter] Fetching stock movers…');
  const movers = await fetchTopMovers(3);
  console.log(`[newsletter] Got ${movers.length} movers`);

  console.log('[newsletter] Loading subscribers…');
  const subscribers = await getSubscribers();
  console.log(`[newsletter] ${subscribers.length} active subscribers`);

  if (subscribers.length === 0) {
    console.log('[newsletter] No subscribers — nothing to send.');
    return;
  }

  const subject = `Nuclear Pulse Weekly — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;

  // Send individually so each email has a personalised unsubscribe link
  let sent = 0, failed = 0;
  for (const email of subscribers) {
    const html = buildEmail(articles, movers, email);
    const { error } = await resend.emails.send({ from: FROM, to: email, subject, html });
    if (error) {
      console.error(`[newsletter] Failed to send to ${email}:`, error.message);
      failed++;
    } else {
      sent++;
    }
    // Small delay to stay within Resend rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`[newsletter] Done. Sent: ${sent}, Failed: ${failed}`);
}

main().catch(err => {
  console.error('[newsletter] Fatal error:', err);
  process.exit(1);
});
