import { STOCKS_BASE } from "../../src/data/constants.js";
import { buildTerminalSnapshot } from "../../src/features/terminal/data.js";
import { fetchBatchQuotes } from "./market.js";
import { getLiveNewsPayload } from "./newsFeed.js";
import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const SNAPSHOT_KEY = "terminal_snapshot_v1";
const SNAPSHOT_TTL_MS = 10 * 60 * 1000;

export async function getTerminalSnapshot({ force = false } = {}) {
  const cached = await readTerminalCache(SNAPSHOT_KEY);
  if (!force && cached?.payload && Date.now() - new Date(cached.updatedAt).getTime() < SNAPSHOT_TTL_MS) {
    return cached.payload;
  }

  const quotes = await fetchBatchQuotes(STOCKS_BASE.map((stock) => stock.ticker));
  let newsPayload;

  try {
    newsPayload = await getLiveNewsPayload({ force });
  } catch (error) {
    if (cached?.payload) {
      return {
        ...cached.payload,
        freshness: {
          ...cached.payload.freshness,
          news: {
            ...cached.payload.freshness.news,
            stale: true,
          },
        },
      };
    }
    throw error;
  }

  const stocks = STOCKS_BASE.map((stock) => ({
    ...stock,
    ...(quotes[stock.ticker] || {}),
    history: [],
  }));

  const snapshot = buildTerminalSnapshot({
    stocks,
    news: newsPayload.articles,
    newsLastUpdated: newsPayload.fetchedAt,
    generatedAt: new Date().toISOString(),
  });

  snapshot.freshness.news.stale = Boolean(newsPayload.stale);
  await writeTerminalCache(SNAPSHOT_KEY, snapshot);
  return snapshot;
}
