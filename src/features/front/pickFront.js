// Chooses the front page from the news list: one lead and a handful of
// secondary stories. The lead is the story the most outlets carried in the
// last 36 hours (server-side clustering puts the extra outlets in `related`),
// with engagement score breaking ties; secondaries avoid repeating the lead's
// tag where they can, so the front page covers more ground.

const LEAD_WINDOW_MS = 36 * 60 * 60 * 1000;

function ageMs(article, now) {
  const time = article.pubDate instanceof Date ? article.pubDate.getTime() : Date.parse(article.pubDate);
  return Number.isFinite(time) ? now - time : Infinity;
}

function score(article) {
  return (article.related?.length || 0) * 40 + (article.engagementScore || 0) + (article.isOfficial ? 5 : 0);
}

export function pickFront(news, { secondaryCount = 4, now = Date.now() } = {}) {
  const live = (news || []).filter((article) => !article._isFallback && article.title && article.url);
  if (!live.length) return { lead: null, secondary: [], frontUrls: new Set() };

  const recent = live.filter((article) => ageMs(article, now) <= LEAD_WINDOW_MS);
  const pool = recent.length ? recent : live;
  const lead = [...pool].sort((a, b) => score(b) - score(a) || ageMs(a, now) - ageMs(b, now))[0];

  const rest = live
    .filter((article) => article !== lead)
    .sort((a, b) => score(b) - score(a) || ageMs(a, now) - ageMs(b, now));
  const secondary = [];
  const usedTags = new Set([lead.tag]);
  for (const article of rest) {
    if (secondary.length >= secondaryCount) break;
    if (!usedTags.has(article.tag)) {
      secondary.push(article);
      usedTags.add(article.tag);
    }
  }
  for (const article of rest) {
    if (secondary.length >= secondaryCount) break;
    if (!secondary.includes(article)) secondary.push(article);
  }

  return { lead, secondary, frontUrls: new Set([lead, ...secondary].map((article) => article.url)) };
}

// "Power Magazine", "A and B", "A, B and C".
export function joinSources(names) {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length <= 1) return unique[0] || "";
  return `${unique.slice(0, -1).join(", ")} and ${unique.at(-1)}`;
}
