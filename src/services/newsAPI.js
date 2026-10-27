/**
 * Client for the nuclear news feed.
 *
 * RSS aggregation, validation and scoring happen server-side in
 * api/_lib/newsFeed.js (served at /api/news). If that endpoint is unavailable
 * the UI keeps the curated set below — there is intentionally no in-browser
 * RSS path: the public CORS proxies it relied on (allorigins.win, corsproxy.io)
 * now time out or require API keys, and they routed readers through third parties.
 */

const CACHE_TTL = 15 * 60 * 1000; // 15-min cache

const cache = new Map();

// ---------------------------------------------------------------------------
// Curated Fallback  (shown instantly, and kept if /api/news is unavailable)
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
    whyItMatters:    '',
    newsletterCTA:   'Get weekly updates on the nuclear renaissance',
    _feedId:         'curated',
    _isFallback:     true,
  }));
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

// One request serves both the news list and the hero's side payloads
// (uranium, NRC fleet): concurrent callers share the in-flight promise.
let payloadRequest = null;

/**
 * Raw /api/news payload ({ articles, uranium, fleet, fetchedAt }), or null if
 * the endpoint is unavailable. Cached for CACHE_TTL.
 */
export function fetchNewsPayload() {
  const cached = cache.get('payload');
  if (cached && Date.now() - cached.ts < CACHE_TTL) return Promise.resolve(cached.data);
  if (payloadRequest) return payloadRequest;

  payloadRequest = fetch('/api/news', { headers: { Accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : null))
    .then((payload) => {
      if (payload) cache.set('payload', { data: payload, ts: Date.now() });
      return payload;
    })
    .catch((error) => {
      if (import.meta.env.DEV) console.warn('[newsAPI] /api/news unavailable:', error?.message || error);
      return null;
    })
    .finally(() => { payloadRequest = null; });
  return payloadRequest;
}

// "5h ago" from the article's own timestamp, so a cached payload never shows
// a stale age.
export function relativeDate(date) {
  const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  const days = Math.floor(hours / 24);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: days > 365 ? 'numeric' : undefined });
}

/**
 * Fetch scored nuclear news from /api/news. Falls back to curated articles
 * if the endpoint fails or returns nothing; the fallback isn't cached so the
 * next call retries the API.
 *
 * @returns {Promise<Article[]>}
 */
export async function fetchNuclearNews() {
  const payload = await fetchNewsPayload();
  if (Array.isArray(payload?.articles) && payload.articles.length > 0) {
    return payload.articles.map((article) => {
      const pubDate = article.pubDate ? new Date(article.pubDate) : null;
      return {
        ...article,
        pubDate,
        date: pubDate && !Number.isNaN(pubDate.getTime()) ? relativeDate(pubDate) : article.date,
      };
    });
  }
  return buildFallback();
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
  cache.delete('payload');
}
