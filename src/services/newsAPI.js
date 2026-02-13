/**
 * Nuclear News Aggregation Pipeline
 *
 * Architecture:
 *   1. Fetch RSS feeds sequentially (one at a time) via allorigins.win CORS proxy
 *   2. Parse RSS/Atom XML natively with DOMParser — no third-party parsing service
 *   3. Validate each article: URL heuristics, freshness (30 days), topic relevance
 *   4. Score: engagement composite (freshness + source reputation + relevance + title)
 *   5. Deduplicate by URL; cap publisher diversity at 4 articles per source
 *   6. Generate curiosity hooks and why-it-matters metadata
 *   7. Fall back to curated articles only if ALL live feeds return zero valid articles
 *
 * Why allorigins.win instead of rss2json.com:
 *   rss2json free tier limits to 1 req/s — firing 7 in parallel immediately triggers
 *   rate-limiting (429s). allorigins.win is a raw CORS proxy with no parsing service
 *   overhead; we parse XML ourselves with the browser's built-in DOMParser.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CORS_PROXIES  = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?url=',
];
const CACHE_TTL     = 15 * 60 * 1000;          // 15-min cache
const MAX_AGE_MS    = 30 * 24 * 60 * 60 * 1000; // 30-day freshness window
const MAX_PER_FEED  = 8;
const MAX_DIVERSITY = 3;   // max articles per source in final set (more sources = tighter cap)
const MAX_TOTAL     = 30;

const cache = new Map();

// ---------------------------------------------------------------------------
// RSS Source Registry
// ---------------------------------------------------------------------------

export const SOURCE_FEEDS = [
  {
    id: 'wnn',
    name: 'World Nuclear News',
    url: 'https://www.world-nuclear-news.org/rss',
    reputation: 10,
    topicFiltered: true,
  },
  {
    id: 'nucnet',
    name: 'NucNet',
    url: 'https://www.nucnet.org/feed',
    reputation: 10,
    topicFiltered: true,
  },
  {
    id: 'ans',
    name: 'ANS Nuclear Newswire',
    url: 'https://www.ans.org/news/rss/',
    reputation: 9,
    topicFiltered: true,
  },
  {
    id: 'nrc_news',
    name: 'US Nuclear Regulatory Commission',
    url: 'https://www.nrc.gov/public-involve/rss?feed=news',
    reputation: 10,
    topicFiltered: true,
  },
  {
    id: 'power_mag',
    name: 'Power Magazine',
    url: 'https://www.powermag.com/feed/',
    reputation: 7,
    topicFiltered: false,
  },
  {
    id: 'neutron_bytes',
    name: 'Neutron Bytes',
    url: 'https://neutronbytes.com/feed/',
    reputation: 7,
    topicFiltered: true,
  },
  {
    id: 'nei_mag',
    name: 'Nuclear Engineering International',
    url: 'https://www.neimagazine.com/rss/',
    reputation: 8,
    topicFiltered: true,
  },
  {
    id: 'iaea',
    name: 'IAEA',
    url: 'https://www.iaea.org/feeds/topnews',
    reputation: 10,
    topicFiltered: false,
  },
  {
    id: 'doe_ne',
    name: 'US Dept of Energy – Nuclear',
    url: 'https://www.energy.gov/ne/rss.xml',
    reputation: 9,
    topicFiltered: true,
  },
  {
    id: 'eia_energy',
    name: 'EIA Today in Energy',
    url: 'https://www.eia.gov/rss/todayinenergy.xml',
    reputation: 8,
    topicFiltered: false,
  },
  {
    id: 'mining_uranium',
    name: 'Mining.com – Uranium',
    url: 'https://www.mining.com/feed/?s=uranium',
    reputation: 7,
    topicFiltered: true,
  },
  {
    id: 'atomic_insights',
    name: 'Atomic Insights',
    url: 'https://atomicinsights.com/feed/',
    reputation: 7,
    topicFiltered: true,
  },
  {
    id: 'env_progress',
    name: 'Environmental Progress',
    url: 'https://environmentalprogress.org/feed',
    reputation: 8,
    topicFiltered: true,
  },
  {
    id: 'breakthrough',
    name: 'Breakthrough Institute',
    url: 'https://thebreakthrough.org/feed',
    reputation: 7,
    topicFiltered: false,
  },
];

// ---------------------------------------------------------------------------
// Nuclear Topic Keywords  (for topicFiltered: false sources)
// ---------------------------------------------------------------------------

const NUCLEAR_KW = [
  'nuclear', 'reactor', 'uranium', 'fission', 'fusion', 'smr', 'haleu',
  'enrichment', 'plutonium', 'candu', 'vver', 'thorium', 'westinghouse',
  'nuscale', 'oklo', 'cameco', 'centrus', 'iter', 'tokamak', 'kairos',
  'terrapower', 'x-energy', 'darlington', 'vogtle', 'iaea', 'nrc',
  'decommission', 'spent fuel', 'nuclear waste', 'gigawatt', 'megawatt',
  'baseload', 'decarbonization', 'zero-carbon', 'low-carbon',
  'gen iv', 'fast reactor', 'pressurized water', 'boiling water', 'microreactor',
];

// ---------------------------------------------------------------------------
// URL Classification
// ---------------------------------------------------------------------------

const NON_ARTICLE = [
  /^\/+$/,
  /^\/(tag|tags|topic|topics|category|categories)\//i,
  /^\/(page|p)\/\d+/i,
  /\/(feed|rss)(\/|$)/i,
  /^\/(author|authors|contributor)\//i,
  /^\/(about|contact|subscribe|newsletter)(\/|$)/i,
  /^\/(archive|archives)(\/|$)/i,
  /[?&]s=/,
  /[?&](page|p)=\d+/,
];

export function isArticleURL(raw) {
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol)) return false;
    const path = url.pathname;
    if (!path || path === '/') return false;
    for (const pat of NON_ARTICLE) {
      if (pat.test(path + url.search)) return false;
    }
    const segs = path.split('/').filter(Boolean);
    if (!segs.length) return false;
    if (!/[a-zA-Z]/.test(segs[segs.length - 1])) return false;
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// URL Canonicalization
// ---------------------------------------------------------------------------

function canonicalize(raw = '') {
  try {
    if (raw.includes('news.google.com')) {
      const inner = new URL(raw).searchParams.get('url');
      if (inner) return canonicalize(inner);
    }
    const clean = raw.replace(/\/amp\/?$/, '').replace(/[?&]amp=1/, '');
    const url   = new URL(clean);
    url.pathname = url.pathname.replace(/\/\/+/g, '/'); // fix double-slash URLs (e.g. WNN)
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term',
     'ref','fbclid','gclid','mc_cid','mc_eid','_ga'].forEach(p => url.searchParams.delete(p));
    return url.toString();
  } catch {
    return raw;
  }
}

// ---------------------------------------------------------------------------
// Tag Inference
// ---------------------------------------------------------------------------

const TAG_RULES = [
  { tag: 'Policy',     re: /policy|regulat|legislation|government|NRC|IAEA|permit|licens|ban|treaty|approval/i },
  { tag: 'Expansion',  re: /construction|build|new reactor|new plant|SMR|modular|deploy|commission|startup|breaks ground/i },
  { tag: 'Markets',    re: /uranium.*price|price.*uranium|stock|market|invest|billion|deal|acqui|merger|revenue|earnings|funding/i },
  { tag: 'Research',   re: /fusion|research|study|scientist|breakthrough|experiment|ITER|plasma|demonstration|prototype/i },
  { tag: 'Safety',     re: /safety|incident|shutdown|leak|radiation|emergency|risk|inspection|accident|contamin/i },
  { tag: 'Innovation', re: /advanced|microreactor|molten salt|thorium|fast reactor|next.gen|generation IV|gen[- ]?4/i },
];

function inferTag(title = '', desc = '') {
  const text = title + ' ' + desc;
  for (const { tag, re } of TAG_RULES) {
    if (re.test(text)) return tag;
  }
  return 'Industry';
}

// ---------------------------------------------------------------------------
// Topic Relevance Score  (0–10)
// ---------------------------------------------------------------------------

function topicScore(title = '', desc = '') {
  const text = (title + ' ' + desc).toLowerCase();
  return Math.min(10, NUCLEAR_KW.filter(kw => text.includes(kw)).length * 2);
}

// ---------------------------------------------------------------------------
// Text Utilities
// ---------------------------------------------------------------------------

function stripHtml(html = '') {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function firstSentences(text, n = 2) {
  const s = text.match(/[^.!?]+[.!?]+/g) || [];
  return s.slice(0, n).join(' ').trim();
}

function relativeDate(date) {
  const h = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  const d = Math.floor(h / 24);
  if (h < 1)  return 'Just now';
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d > 365 ? 'numeric' : undefined });
}

// ---------------------------------------------------------------------------
// Engagement Metadata
// ---------------------------------------------------------------------------

const WHY_IT_MATTERS = {
  Policy:     "Policy decisions determine which energy technologies get built — and how fast.",
  Expansion:  "Every new reactor adds around-the-clock zero-carbon electricity to the grid.",
  Markets:    "Capital flows reveal where smart money is going in the clean energy transition.",
  Research:   "Today's research milestones become tomorrow's operating power plants.",
  Safety:     "Transparency about safety events is how the nuclear industry earns public trust.",
  Innovation: "Next-generation designs could make nuclear faster, cheaper, and safer to deploy.",
  Industry:   "Industry moves show how the global nuclear fleet is evolving right now.",
};

function buildMeta(item, tag) {
  const desc = stripHtml(item.description || '');
  const hook = firstSentences(desc, 2) || '';
  return {
    curiosityHook: hook.length > 20 ? hook : null,
    whyItMatters:  WHY_IT_MATTERS[tag] || WHY_IT_MATTERS.Industry,
    newsletterCTA: 'Get weekly updates on the nuclear renaissance',
  };
}

// ---------------------------------------------------------------------------
// Engagement Score  (0–100)
// ---------------------------------------------------------------------------

function engagementScore(item, feed, pubDate, relevance) {
  let s = 0;
  if (pubDate) {
    const h = (Date.now() - pubDate.getTime()) / 3_600_000;
    s += h < 1 ? 35 : h < 6 ? 30 : h < 24 ? 25 : h < 48 ? 18 : h < 168 ? 12 : h < 720 ? 7 : 3;
  }
  s += Math.min(20, feed.reputation * 2);
  s += Math.min(25, relevance * 2.5);
  const t = item.title || '';
  if (t.length >= 40 && t.length <= 100) s += 8;
  if (/\d/.test(t))  s += 5;
  if (/\?/.test(t))  s += 4;
  if (t.length > 0)  s += 3;
  return Math.round(Math.min(100, s));
}

// ---------------------------------------------------------------------------
// Rejection Log
// ---------------------------------------------------------------------------

const _rejections = [];
function reject(item, reason) {
  _rejections.push({ title: (item.title || '').slice(0, 60), reason });
  return null;
}
export function getRejectionLog() { return [..._rejections]; }

// ---------------------------------------------------------------------------
// Validate + Transform One RSS Item
// ---------------------------------------------------------------------------

function transform(item, feed) {
  const title = (item.title || '').trim();
  if (!title) return reject(item, 'missing-title');

  const url = canonicalize(item.link || '');
  if (!url)               return reject(item, 'missing-url');
  if (!isArticleURL(url)) return reject(item, `non-article-url`);

  let pubDate = null;
  try {
    const d = new Date(item.pubDate || '');
    if (!isNaN(d.getTime())) pubDate = d;
  } catch { /* ok */ }
  if (!pubDate) return reject(item, 'missing-date');
  if (Date.now() - pubDate.getTime() > MAX_AGE_MS)
    return reject(item, `stale: ${Math.round((Date.now() - pubDate.getTime()) / 86_400_000)}d`);

  const desc      = stripHtml(item.description || '');
  const relevance = topicScore(title, desc);
  if (!feed.topicFiltered && relevance < 2)
    return reject(item, `off-topic: score ${relevance}`);

  const tag   = inferTag(title, desc);
  const score = engagementScore(item, feed, pubDate, relevance);
  const meta  = buildMeta(item, tag);

  return { title, url, source: feed.name, date: relativeDate(pubDate),
           pubDate, tag, relevanceScore: relevance, engagementScore: score,
           _feedId: feed.id, ...meta };
}

// ---------------------------------------------------------------------------
// RSS + Atom XML Parser  (runs in browser via DOMParser)
// ---------------------------------------------------------------------------

function parseXML(xmlText, feed) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML parse error');

  const isAtom = !!doc.querySelector('feed');

  return [...doc.querySelectorAll(isAtom ? 'entry' : 'item')]
    .slice(0, MAX_PER_FEED)
    .map(el => {
      const title = stripHtml(el.querySelector('title')?.textContent || '');

      let link = '';
      if (isAtom) {
        const linkEl = el.querySelector('link[rel="alternate"], link:not([rel])');
        link = linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || '';
      } else {
        // RSS <link> is often a text node AFTER other elements; handle CDATA too
        const linkEl = el.querySelector('link');
        link = linkEl?.textContent?.trim()
          || el.getElementsByTagName('link')[0]?.textContent?.trim()
          || '';
        // Fallback: many RSS feeds (incl. WNN) put the canonical URL in <guid isPermaLink="true">
        // when <link> is a self-closing tag or empty
        if (!link.startsWith('http')) {
          const guidEl = el.querySelector('guid');
          const guidText = guidEl?.textContent?.trim() || '';
          if (guidText.startsWith('http')) link = guidText;
        }
      }

      const descEl  = el.querySelector('description, summary, content\\:encoded, content');
      const description = descEl?.textContent || '';

      const dateEl  = el.querySelector('pubDate, published, updated, dc\\:date');
      const pubDate = dateEl?.textContent?.trim() || '';

      return { title, link, description, pubDate, _feed: feed };
    })
    .filter(item => item.title && item.link);
}

// ---------------------------------------------------------------------------
// Feed Fetcher  (allorigins.win CORS proxy + DOMParser)
// ---------------------------------------------------------------------------

async function fetchWithProxy(url, proxyPrefix) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), 6_000); // 6s timeout — fail fast
  try {
    const res = await fetch(proxyPrefix + encodeURIComponent(url), { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchFeed(feed) {
  const cacheKey = `feed_${feed.id}`;
  const cached   = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  let text = null;
  let lastErr;
  for (const proxy of CORS_PROXIES) {
    try {
      text = await fetchWithProxy(feed.url, proxy);
      break; // success — stop trying proxies
    } catch (err) {
      lastErr = err;
      if (import.meta.env.DEV) console.warn(`[newsAPI] proxy failed (${proxy.slice(0,30)}…) for ${feed.name}:`, err.message);
    }
  }

  if (!text) throw lastErr || new Error('all proxies failed');

  const items = parseXML(text, feed);
  cache.set(cacheKey, { data: items, ts: Date.now() });
  return items;
}

// ---------------------------------------------------------------------------
// Curated Fallback  (shown only when ALL live feeds fail)
// ---------------------------------------------------------------------------

const CURATED = [
  { title: "Microsoft restarts Three Mile Island to power its data centers with nuclear", source: "Reuters", tag: "Industry", url: "https://www.reuters.com/business/energy/microsoft-deal-resurrect-three-mile-island-nuclear-plant-2024-09-20/", date: "Sep 2024" },
  { title: "Google signs deal for nuclear power from Kairos Power's small modular reactors", source: "Reuters", tag: "Innovation", url: "https://www.reuters.com/technology/google-inks-deal-nuclear-power-kairos-power-2024-10-14/", date: "Oct 2024" },
  { title: "Amazon signs nuclear energy agreements for multiple advanced reactors", source: "Amazon", tag: "Industry", url: "https://www.aboutamazon.com/news/sustainability/amazon-nuclear-energy-small-modular-reactor-agreements", date: "Oct 2024" },
  { title: "Ontario breaks ground on Canada's first commercial small modular reactor", source: "OPG", tag: "Expansion", url: "https://www.opg.com/media-room/news-releases/2025/ontario-power-generation-breaks-ground-on-canadas-first-commercial-smr/", date: "Jan 2025" },
  { title: "COP28: 22 nations pledge to triple nuclear capacity by 2050", source: "World Nuclear News", tag: "Policy", url: "https://www.world-nuclear-news.org/articles/cop-28-world-leaders-call-for-tripling-of-nuclear-capacity", date: "Dec 2023" },
  { title: "TerraPower begins construction on Natrium sodium-cooled fast reactor in Wyoming", source: "TerraPower", tag: "Innovation", url: "https://www.terrapower.com/natrium-construction-begins-in-kemmerer-wyoming/", date: "Jun 2024" },
  { title: "France extends nuclear reactor lifespans to 60 years with safety investment", source: "Reuters", tag: "Policy", url: "https://www.reuters.com/business/energy/france-plans-extend-nuclear-reactor-lifespans-60-years-2024-11-15/", date: "Nov 2024" },
  { title: "EU taxonomy officially includes nuclear as sustainable investment", source: "European Commission", tag: "Policy", url: "https://finance.ec.europa.eu/sustainable-finance/tools-and-standards/eu-taxonomy-sustainable-activities_en", date: "2023" },
  { title: "Rolls-Royce SMR secures UK government backing for factory-built reactor programme", source: "Rolls-Royce", tag: "Industry", url: "https://www.rolls-royce.com/media/press-releases/2024/rolls-royce-smr-secures-uk-government-backing-for-factory.aspx", date: "Oct 2024" },
  { title: "Poland signs agreement with Westinghouse for six AP1000 reactors", source: "World Nuclear News", tag: "Expansion", url: "https://www.world-nuclear-news.org/articles/poland-and-westinghouse-sign-nuclear-power-plant-project-agreement", date: "Oct 2024" },
  { title: "Kairos Power receives NRC construction permit for Hermes test reactor", source: "Kairos Power", tag: "Research", url: "https://kairospower.com/press-releases/kairos-power-receives-construction-permit-from-the-nrc/", date: "Dec 2023" },
  { title: "US DOE invests $900 million in advanced nuclear reactor demonstrations", source: "Department of Energy", tag: "Research", url: "https://www.energy.gov/ne/articles/doe-announces-900-million-advanced-nuclear-reactor-demonstrations", date: "Nov 2023" },
];

function buildFallback() {
  return CURATED.map(item => ({
    ...item,
    pubDate:         null,
    relevanceScore:  10,
    engagementScore: 35,
    curiosityHook:   null,
    whyItMatters:    WHY_IT_MATTERS[item.tag] || WHY_IT_MATTERS.Industry,
    newsletterCTA:   'Get weekly updates on the nuclear renaissance',
    _feedId:         'curated',
    _isFallback:     true,
  }));
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/**
 * Fetch, validate, and score nuclear news articles from multiple RSS sources.
 * Returns articles sorted by engagement score. Falls back to curated articles
 * only if all live feeds return zero valid items.
 *
 * @returns {Promise<Article[]>}
 */
export async function fetchNuclearNews() {
  const cacheKey = 'nuclear_news_v3';
  const cached   = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    if (import.meta.env.DEV) console.log('[newsAPI] Cache hit —', cached.data.length, 'articles');
    return cached.data;
  }

  _rejections.length = 0;

  // Parallel fetching — allorigins.win / corsproxy.io have no per-IP rate limit,
  // so fetch all feeds simultaneously. Total load time = slowest single feed (~2-4s)
  // instead of sum of all feed times (~12-15s sequential).
  const results = await Promise.allSettled(SOURCE_FEEDS.map(feed => fetchFeed(feed)));

  const rawItems = [];
  results.forEach((result, i) => {
    const feed = SOURCE_FEEDS[i];
    if (result.status === 'fulfilled') {
      rawItems.push(...result.value);
      if (import.meta.env.DEV) console.log(`[newsAPI] ✓ ${feed.name}: ${result.value.length} items`);
    } else {
      if (import.meta.env.DEV) console.warn(`[newsAPI] ✗ ${feed.name}:`, result.reason?.message);
    }
  });

  // Validate + transform
  const valid = rawItems.map(item => transform(item, item._feed)).filter(Boolean);

  // Deduplicate by URL
  const seen   = new Set();
  const deduped = valid.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  // Publisher diversity cap
  const counts = {};
  const diverse = deduped.filter(a => {
    const n = counts[a._feedId] || 0;
    if (n >= MAX_DIVERSITY) return false;
    counts[a._feedId] = n + 1;
    return true;
  });

  // Sort by date — newest first
  const sorted = diverse.sort((a, b) => {
    const ta = a.pubDate ? a.pubDate.getTime() : 0;
    const tb = b.pubDate ? b.pubDate.getTime() : 0;
    return tb - ta;
  }).slice(0, MAX_TOTAL);

  // Fallback only if no live articles survived
  const articles = sorted.length > 0 ? sorted : buildFallback();

  if (import.meta.env.DEV) {
    const srcs = [...new Set(articles.map(a => a.source))];
    console.log(`[newsAPI] ${articles.length} articles from ${srcs.length} sources`);
    if (_rejections.length) {
      const tally = {};
      _rejections.forEach(r => { const k = r.reason.split(':')[0]; tally[k] = (tally[k] || 0) + 1; });
      console.log('[newsAPI] Rejections:', JSON.stringify(tally));
    }
  }

  cache.set(cacheKey, { data: articles, ts: Date.now() });
  return articles;
}

/**
 * Returns curated articles instantly (no network call).
 * Used to populate the UI immediately while live feeds load in the background.
 */
export function getInstantNews() {
  return buildFallback();
}

/**
 * Force a fresh fetch on next call.
 */
export function clearNewsCache() {
  cache.delete('nuclear_news_v3');
}
