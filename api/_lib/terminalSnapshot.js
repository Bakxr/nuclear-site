import { STOCKS_BASE } from "../../src/data/constants.js";
import { buildTerminalSnapshot } from "../../src/features/terminal/data.js";
import { fetchBatchQuotes } from "./market.js";
import { getLiveNewsPayload } from "./newsFeed.js";
import { fetchNrcPlantStatus } from "./nrc.js";
import { fetchLatestCompanyFilings } from "./sec.js";
import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const SNAPSHOT_KEY = "terminal_snapshot_v1";
const SNAPSHOT_TTL_MS = 10 * 60 * 1000;

export async function getTerminalSnapshot({ force = false } = {}) {
  const cached = await readTerminalCache(SNAPSHOT_KEY);
  if (!force && cached?.payload && Date.now() - new Date(cached.updatedAt).getTime() < SNAPSHOT_TTL_MS) {
    return cached.payload;
  }

  const [quotesResult, newsResult, filingsResult, operationsResult] = await Promise.allSettled([
    fetchBatchQuotes(STOCKS_BASE.map((stock) => stock.ticker)),
    getLiveNewsPayload({ force }),
    fetchLatestCompanyFilings(STOCKS_BASE),
    fetchNrcPlantStatus(),
  ]);

  const quotes = quotesResult.status === "fulfilled" ? quotesResult.value : {};
  const now = new Date().toISOString();
  const newsPayload = newsResult.status === "fulfilled"
    ? newsResult.value
    : {
        articles: cached?.payload?.entities?.newsArticles || [],
        fetchedAt: cached?.payload?.freshness?.news?.updatedAt || new Date().toISOString(),
        stale: true,
      };
  const companyFilings = filingsResult.status === "fulfilled"
    ? filingsResult.value
    : (cached?.payload?.entities?.companyFilings || []);
  const operationsSignals = operationsResult.status === "fulfilled"
    ? operationsResult.value
    : (cached?.payload?.entities?.operationsSignals || []);
  const filingsUpdatedAt = filingsResult.status === "fulfilled"
    ? now
    : (cached?.payload?.freshness?.filings?.updatedAt || now);
  const operationsUpdatedAt = operationsResult.status === "fulfilled"
    ? now
    : (cached?.payload?.freshness?.operations?.updatedAt || now);

  if (newsResult.status === "rejected" && !cached?.payload && !newsPayload.articles.length) {
    throw newsResult.reason;
  }

  const stocks = STOCKS_BASE.map((stock) => ({
    ...stock,
    ...(quotes[stock.ticker] || {}),
    history: [],
  }));

  const snapshot = buildTerminalSnapshot({
    stocks,
    news: newsPayload.articles,
    companyFilings,
    operationsSignals,
    newsLastUpdated: newsPayload.fetchedAt,
    filingsLastUpdated: filingsUpdatedAt,
    operationsLastUpdated: operationsUpdatedAt,
    generatedAt: now,
  });

  snapshot.freshness.news.stale = Boolean(newsPayload.stale);
  snapshot.freshness.filings.stale = filingsResult.status !== "fulfilled" && !companyFilings.length;
  snapshot.freshness.operations.stale = operationsResult.status !== "fulfilled" && !operationsSignals.length;
  await writeTerminalCache(SNAPSHOT_KEY, snapshot);
  return snapshot;
}
