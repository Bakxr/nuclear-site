import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const CACHE_KEY = "nrc_dockets_v1";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

// NRC RSS for press releases / significant licensing actions. The HTML index
// pages are layout-heavy; the news RSS is the cleanest public surface and is
// the documented feed for "what NRC just did".
const NRC_NEWS_RSS = "https://www.nrc.gov/public-involve/news.xml";

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/rss+xml,text/xml,application/xml",
        "user-agent": "NuclearPulseBot/1.0 (+https://atomic-energy.vercel.app)",
      },
    });
    if (!res.ok) throw new Error(`nrc-dockets:${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

function decode(s = "") {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function getTag(item, tag) {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? decode(m[1]) : "";
}

const PLANT_PATTERNS = [
  "Vogtle", "Diablo Canyon", "Palo Verde", "Comanche Peak", "Browns Ferry",
  "Indian Point", "Three Mile Island", "Watts Bar", "Sequoyah", "Calvert Cliffs",
  "Limerick", "Peach Bottom", "Salem", "Hope Creek", "Susquehanna", "Beaver Valley",
  "Byron", "Braidwood", "Clinton", "Dresden", "LaSalle", "Quad Cities",
  "Catawba", "McGuire", "Oconee", "Robinson", "Brunswick", "Harris", "Summer",
  "Farley", "Hatch", "St. Lucie", "Turkey Point", "Crystal River",
  "Cooper", "Fort Calhoun", "Monticello", "Prairie Island", "Point Beach",
  "South Texas", "River Bend", "Waterford", "Grand Gulf", "Arkansas Nuclear",
  "Palisades", "Davis-Besse", "Perry", "Fermi", "Donald Cook",
];

function detectPlant(title, description) {
  const text = `${title} ${description}`;
  for (const name of PLANT_PATTERNS) {
    const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (re.test(text)) return name;
  }
  return null;
}

function classifyAction(title) {
  const t = title.toLowerCase();
  if (/license|amend|renew/.test(t)) return "Licensing";
  if (/inspect|finding|violation/.test(t)) return "Inspection";
  if (/notif|enforcement|order/.test(t)) return "Enforcement";
  if (/meet|hearing/.test(t)) return "Public Meeting";
  if (/restart|shutdown|outage|scram/.test(t)) return "Operational";
  return "Notice";
}

function parseRss(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  let i = 0;
  while ((m = re.exec(xml)) !== null && items.length < 30) {
    const block = m[1];
    const title = getTag(block, "title");
    const link = getTag(block, "link");
    const desc = getTag(block, "description");
    const pubDate = getTag(block, "pubDate");
    if (!title) continue;
    const plant = detectPlant(title, desc);
    // Only keep items that look plant- or licensing-relevant.
    const t = `${title} ${desc}`.toLowerCase();
    if (!plant && !/license|reactor|plant|nuclear|amend|inspect|enforce|order/.test(t)) continue;
    items.push({
      id: `nrc:${link || title}-${i}`,
      entityType: "nrcDocket",
      plant,
      action: classifyAction(title),
      title,
      status: "Posted",
      filedAt: pubDate ? new Date(pubDate).toISOString() : null,
      url: link,
    });
    i += 1;
  }
  return items;
}

/**
 * Fetch recent NRC licensing/enforcement/operational notices from the
 * public NRC news RSS feed. Lightweight surface — not full ADAMS access.
 */
export async function fetchNrcDockets({ force = false } = {}) {
  const cached = await readTerminalCache(CACHE_KEY);
  if (!force && cached?.payload && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
    return cached.payload;
  }

  try {
    const xml = await fetchWithTimeout(NRC_NEWS_RSS);
    const items = parseRss(xml)
      .filter((row) => row.filedAt)
      .sort((a, b) => new Date(b.filedAt).getTime() - new Date(a.filedAt).getTime())
      .slice(0, 25);
    await writeTerminalCache(CACHE_KEY, items);
    return items;
  } catch (error) {
    console.warn("[nrc-dockets] fetch failed:", error?.message || error);
    return cached?.payload || [];
  }
}

export { parseRss as __parseRssForTest };
