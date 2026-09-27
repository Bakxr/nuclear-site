// Shared prediction-market hygiene, used by the serverless API (teaser +
// snapshot) and the terminal selectors. Keep this module free of browser-only
// APIs and `import.meta.env` — api/ imports it directly.

const MONTH_PATTERN = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const DATE_FRAGMENT = new RegExp(
  `\\b(?:by|before|until|on|in)\\s+(?:${MONTH_PATTERN})\\.?(?:\\s+\\d{1,2}(?:st|nd|rd|th)?)?(?:,?\\s*\\d{4})?\\b`,
  "g",
);

// Markets often repeat the same question with different deadlines
// ("...by May 31, 2026?", "...by June 30, 2026?"). This key strips the
// deadline so those variants compare equal.
export function marketTopicKey(question = "") {
  return String(question)
    .toLowerCase()
    .replace(DATE_FRAGMENT, " ")
    .replace(/\b(?:by|before|until|in)\s+(?:q[1-4]\s*)?\d{4}\b/g, " ")
    .replace(/\b\d{4}\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Venues keep markets "open" until formal resolution, so a question whose
// deadline passed months ago can still be listed at 0.1%. Treat anything past
// its end date as expired.
export function isExpiredMarket(market, now = Date.now()) {
  if (!market?.endDate) return false;
  const end = new Date(market.endDate).getTime();
  return Number.isFinite(end) && end < now;
}

// Collapse deadline variants to one row per topic. Input order decides which
// variant survives (callers pass volume-sorted rows), and the survivor carries
// `seriesCount` plus the sibling deadlines for term-structure display.
export function collapseMarketSeries(markets = []) {
  const byTopic = new Map();
  const order = [];
  for (const market of markets) {
    const key = marketTopicKey(market?.question) || market?.id;
    const group = byTopic.get(key);
    if (group) {
      group.push(market);
    } else {
      byTopic.set(key, [market]);
      order.push(key);
    }
  }
  return order.map((key) => {
    const [lead, ...rest] = byTopic.get(key);
    if (!rest.length) return lead;
    const series = [lead, ...rest]
      .map((m) => ({ id: m.id, endDate: m.endDate || null, yesPrice: m.yesPrice, volume: m.volume || 0 }))
      .sort((a, b) => new Date(a.endDate || 0).getTime() - new Date(b.endDate || 0).getTime());
    return {
      ...lead,
      seriesCount: series.length,
      series,
      volume: series.reduce((sum, m) => sum + (m.volume || 0), 0),
    };
  });
}

// Display a 0-1 probability. Sub-1% odds read as "<1%" rather than a
// misleading "0%".
export function formatProbability(p) {
  if (!Number.isFinite(p)) return "—";
  if (p > 0 && p < 0.01) return "<1%";
  if (p < 1 && p > 0.99) return ">99%";
  return `${Math.round(p * 100)}%`;
}
