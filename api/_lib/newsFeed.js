const FEEDS = [
  { id: "wnn", name: "World Nuclear News", url: "https://www.world-nuclear-news.org/rss", reputation: 10, topicFiltered: true },
  { id: "iaea", name: "IAEA", url: "https://www.iaea.org/feeds/topnews", reputation: 10, topicFiltered: false },
  { id: "nrc_news", name: "US Nuclear Regulatory Commission", url: "https://www.nrc.gov/public-involve/rss?feed=news", reputation: 10, topicFiltered: true },
  { id: "doe_ne", name: "US Department of Energy", url: "https://www.energy.gov/ne/rss.xml", reputation: 9, topicFiltered: true },
  { id: "eia", name: "EIA Today in Energy", url: "https://www.eia.gov/rss/todayinenergy.xml", reputation: 8, topicFiltered: false },
  { id: "ans", name: "ANS Nuclear Newswire", url: "https://www.ans.org/news/rss/", reputation: 9, topicFiltered: true },
  { id: "nucnet", name: "NucNet", url: "https://www.nucnet.org/feed", reputation: 9, topicFiltered: true },
  { id: "nei_mag", name: "Nuclear Engineering International", url: "https://www.neimagazine.com/rss/", reputation: 8, topicFiltered: true },
  { id: "power_mag", name: "Power Magazine", url: "https://www.powermag.com/feed/", reputation: 7, topicFiltered: false },
  { id: "atomic_insights", name: "Atomic Insights", url: "https://atomicinsights.com/feed/", reputation: 7, topicFiltered: true },
  { id: "neutron_bytes", name: "Neutron Bytes", url: "https://neutronbytes.com/feed/", reputation: 7, topicFiltered: true },
];

const CACHE_TTL = 10 * 60 * 1000;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PER_FEED = 8;
const MAX_DIVERSITY = 3;
const MAX_TOTAL = 30;
const CACHE_KEY = "news";
const cache = globalThis.__nuclearNewsCache ?? new Map();
globalThis.__nuclearNewsCache = cache;

const NUCLEAR_KW = [
  "nuclear", "reactor", "uranium", "fission", "fusion", "smr", "haleu",
  "enrichment", "thorium", "westinghouse", "nuscale", "oklo", "cameco",
  "centrus", "iter", "tokamak", "kairos", "terrapower", "x-energy",
  "darlington", "vogtle", "iaea", "nrc", "decommission", "spent fuel",
  "fast reactor", "microreactor", "baseload",
];

const TAG_RULES = [
  { tag: "Policy", re: /policy|regulat|legislation|government|nrc|iaea|permit|licens|approval/i },
  { tag: "Expansion", re: /construction|build|new reactor|new plant|smr|deploy|commission|startup|ground/i },
  { tag: "Markets", re: /uranium.*price|price.*uranium|stock|market|invest|deal|revenue|earnings|funding/i },
  { tag: "Research", re: /fusion|research|study|scientist|breakthrough|experiment|iter|plasma|prototype/i },
  { tag: "Safety", re: /safety|incident|shutdown|leak|radiation|risk|inspection|accident/i },
  { tag: "Innovation", re: /advanced|microreactor|molten salt|thorium|fast reactor|generation iv|gen[- ]?4/i },
];

const WHY_IT_MATTERS = {
  Policy: "Policy decisions determine which energy technologies get built and how fast.",
  Expansion: "Every new reactor adds around-the-clock zero-carbon electricity to the grid.",
  Markets: "Capital flows reveal where industry conviction is building across nuclear.",
  Research: "Research milestones become tomorrow's operating power plants.",
  Safety: "Safety transparency is how the industry keeps public trust.",
  Innovation: "Next-generation designs could make nuclear faster, cheaper, and easier to deploy.",
  Industry: "Industry moves show where the global nuclear buildout is heading.",
};

function decodeEntities(text = "") {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchTag(block, pattern) {
  const names = pattern.split("|");
  for (const name of names) {
    const escaped = name.replace(":", "\\:");
    const regex = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i");
    const match = block.match(regex);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return "";
}

function matchAtomLink(block) {
  return block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
}

function matchRssLink(block) {
  return decodeEntities(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || "");
}

function canonicalize(raw = "") {
  try {
    const url = new URL(raw.replace(/\/amp\/?$/, ""));
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "fbclid", "gclid"].forEach((param) => {
      url.searchParams.delete(param);
    });
    return url.toString();
  } catch {
    return raw;
  }
}

function isArticleURL(raw = "") {
  try {
    const url = new URL(raw);
    const path = url.pathname.toLowerCase();
    if (!path || path === "/") return false;
    if (/\/(feed|rss)(\/|$)/i.test(path)) return false;
    if (/\/(tag|tags|topic|topics|category|categories|author|authors|about|contact|subscribe|newsletter|archive|archives)(\/|$)/i.test(path)) return false;
    return /[a-z]/i.test(path.split("/").filter(Boolean).at(-1) || "");
  } catch {
    return false;
  }
}

function inferTag(title = "", desc = "") {
  const text = `${title} ${desc}`;
  for (const { tag, re } of TAG_RULES) {
    if (re.test(text)) return tag;
  }
  return "Industry";
}

function topicScore(title = "", desc = "") {
  const text = `${title} ${desc}`.toLowerCase();
  return Math.min(10, NUCLEAR_KW.filter((kw) => text.includes(kw)).length * 2);
}

function engagementScore(feed, pubDate, relevance, title) {
  let score = Math.min(20, feed.reputation * 2) + Math.min(25, relevance * 2.5);
  if (pubDate) {
    const hours = (Date.now() - pubDate.getTime()) / 3_600_000;
    score += hours < 6 ? 30 : hours < 24 ? 24 : hours < 72 ? 16 : 8;
  }
  if (title.length >= 40 && title.length <= 110) score += 6;
  return Math.round(Math.min(100, score));
}

function relativeDate(date) {
  const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  const days = Math.floor(hours / 24);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: days > 365 ? "numeric" : undefined });
}

function parseFeed(xml, feed) {
  const isAtom = /<feed[\s>]/i.test(xml);
  const blocks = [...xml.matchAll(new RegExp(isAtom ? "<entry[\\s\\S]*?<\\/entry>" : "<item[\\s\\S]*?<\\/item>", "gi"))]
    .map((match) => match[0])
    .slice(0, MAX_PER_FEED);

  return blocks.map((block) => {
    const title = matchTag(block, "title");
    const description = matchTag(block, "description|summary|content:encoded|content");
    const rawLink = isAtom ? matchAtomLink(block) : matchRssLink(block) || matchTag(block, "guid");
    const link = canonicalize(rawLink);
    const dateText = matchTag(block, "pubDate|published|updated|dc:date");
    const pubDate = new Date(dateText);

    if (!title || !link || !isArticleURL(link) || Number.isNaN(pubDate.getTime())) return null;
    if (Date.now() - pubDate.getTime() > MAX_AGE_MS) return null;

    const relevance = topicScore(title, description);
    if (!feed.topicFiltered && relevance < 2) return null;

    const tag = inferTag(title, description);

    return {
      title,
      url: link,
      source: feed.name,
      sourceTier: /IAEA|Nuclear Regulatory Commission|Department of Energy|EIA/.test(feed.name) ? "Official" : "Industry",
      isOfficial: /IAEA|Nuclear Regulatory Commission|Department of Energy|EIA/.test(feed.name),
      date: relativeDate(pubDate),
      pubDate,
      tag,
      relevanceScore: relevance,
      engagementScore: engagementScore(feed, pubDate, relevance, title),
      curiosityHook: description.slice(0, 220) || null,
      whyItMatters: WHY_IT_MATTERS[tag] || WHY_IT_MATTERS.Industry,
      newsletterCTA: "Get weekly updates on the nuclear renaissance",
      _feedId: feed.id,
    };
  }).filter(Boolean);
}

async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    headers: {
      "user-agent": "NuclearPulseBot/1.0 (+https://atomic-energy.vercel.app)",
      accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    },
  });

  if (!res.ok) throw new Error(`${feed.id}:${res.status}`);
  return parseFeed(await res.text(), feed);
}

export async function getLiveNewsPayload({ force = false } = {}) {
  const cached = cache.get(CACHE_KEY);
  if (!force && cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.payload;
  }

  const results = await Promise.allSettled(FEEDS.map((feed) => fetchFeed(feed)));
  const articles = [];

  results.forEach((result) => {
    if (result.status === "fulfilled") articles.push(...result.value);
  });

  const seen = new Set();
  const counts = {};
  const deduped = articles
    .filter((article) => {
      if (seen.has(article.url)) return false;
      seen.add(article.url);
      return true;
    })
    .filter((article) => {
      const count = counts[article._feedId] || 0;
      if (count >= MAX_DIVERSITY) return false;
      counts[article._feedId] = count + 1;
      return true;
    })
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, MAX_TOTAL);

  if (!deduped.length && cached?.payload) {
    return {
      ...cached.payload,
      stale: true,
    };
  }

  if (!deduped.length) {
    throw new Error("No live articles available.");
  }

  const payload = {
    articles: deduped,
    fetchedAt: new Date().toISOString(),
  };

  cache.set(CACHE_KEY, { ts: Date.now(), payload });
  return payload;
}
