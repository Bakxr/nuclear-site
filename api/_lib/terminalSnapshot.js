import { STOCKS_BASE } from "../../src/data/constants.js";
import { buildTerminalSnapshot } from "../../src/features/terminal/data.js";
import { fetchEarningsAndEvents } from "./earnings.js";
import { fetchIaeaReactorSummary } from "./iaea.js";
import { fetchLobbyingFilings } from "./lobbying.js";
import { fetchBatchQuotes } from "./market.js";
import { getLiveNewsPayload } from "./newsFeed.js";
import { fetchNrcPlantStatus } from "./nrc.js";
import { fetchNrcDockets } from "./nrcDockets.js";
import { fetchPredictionMarkets } from "./predictionMarkets.js";
import { fetchGovContracts } from "./samGov.js";
import { fetchLatestCompanyFilings } from "./sec.js";
import { fetchInsiderForm4 } from "./secInsider.js";
import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";
import { fetchUraniumPrice } from "./uranium.js";

const SNAPSHOT_KEY = "terminal_snapshot_v1";
const SNAPSHOT_TTL_MS = 10 * 60 * 1000;

let inFlight = null;

export async function getTerminalSnapshot({ force = false } = {}) {
  const cached = await readTerminalCache(SNAPSHOT_KEY);
  if (!force && cached?.payload && Date.now() - new Date(cached.updatedAt).getTime() < SNAPSHOT_TTL_MS) {
    return cached.payload;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      return await buildSnapshot(cached, force);
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function settled(result, fallback) {
  return result.status === "fulfilled" ? result.value : fallback;
}

async function buildSnapshot(cached, force) {
  const [
    quotesResult,
    newsResult,
    filingsResult,
    operationsResult,
    uraniumResult,
    iaeaResult,
    insiderResult,
    govContractsResult,
    lobbyingResult,
    earningsResult,
    nrcDocketsResult,
    predictionResult,
  ] = await Promise.allSettled([
    fetchBatchQuotes(STOCKS_BASE.map((stock) => stock.ticker)),
    getLiveNewsPayload({ force }),
    fetchLatestCompanyFilings(STOCKS_BASE),
    fetchNrcPlantStatus(),
    fetchUraniumPrice({ force }),
    fetchIaeaReactorSummary({ force }),
    fetchInsiderForm4(STOCKS_BASE),
    fetchGovContracts({ force }),
    fetchLobbyingFilings({ force }),
    fetchEarningsAndEvents(STOCKS_BASE),
    fetchNrcDockets({ force }),
    fetchPredictionMarkets({ force }),
  ]);

  const quotes = settled(quotesResult, {});
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

  // Uranium spot proxy (Sprott SPUT NAV) — falls back to previous cached value if every provider fails.
  const uranium = uraniumResult.status === "fulfilled" && uraniumResult.value
    ? uraniumResult.value
    : (cached?.payload?.entities?.uranium || null);
  const uraniumStale = !uranium || uranium.stale === true || uraniumResult.status !== "fulfilled";
  snapshot.entities.uranium = uranium;
  snapshot.freshness.uranium = {
    label: "Uranium",
    updatedAt: uranium?.fetchedAt || uranium?.asOf || now,
    stale: uraniumStale,
    sourceName: uranium?.source || "Sprott Physical Uranium Trust NAV",
    sourceUrl: uranium?.sourceUrl || "https://sprott.com/investment-strategies/exchange-listed-products/physical-commodity-funds/uranium/",
    public: true,
  };

  // IAEA PRIS reactor counts — falls back to cached payload, then null.
  const iaea = iaeaResult.status === "fulfilled" && iaeaResult.value
    ? iaeaResult.value
    : (cached?.payload?.entities?.iaeaReactors || null);
  snapshot.entities.iaeaReactors = iaea;
  snapshot.freshness.iaea = {
    label: "Reactor Fleet",
    updatedAt: iaea?.fetchedAt || (iaea?.asOf ? `${iaea.asOf}T00:00:00.000Z` : now),
    stale: !iaea || iaea.stale === true || iaeaResult.status !== "fulfilled",
    sourceName: iaea?.source || "IAEA PRIS",
    sourceUrl: iaea?.sourceUrl || "https://pris.iaea.org/PRIS/",
    public: true,
  };

  // SEC Form 4 insider trades (now with parsed transaction-level detail).
  const insiderTrades = insiderResult.status === "fulfilled" && Array.isArray(insiderResult.value)
    ? insiderResult.value
    : (cached?.payload?.entities?.insiderTrades || []);
  snapshot.entities.insiderTrades = insiderTrades;
  snapshot.freshness.insider = {
    label: "Insider",
    updatedAt: now,
    stale: insiderResult.status !== "fulfilled" && !insiderTrades.length,
    sourceName: "SEC EDGAR Form 4",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=4",
    public: true,
  };

  // Government contracts (SAM.gov).
  const govContracts = settled(govContractsResult, cached?.payload?.entities?.govContracts || []);
  snapshot.entities.govContracts = govContracts;
  snapshot.freshness.govContracts = {
    label: "Gov Contracts",
    updatedAt: now,
    stale: govContractsResult.status !== "fulfilled" && !govContracts.length,
    sourceName: "SAM.gov Opportunities",
    sourceUrl: "https://sam.gov/data-services/Contract%20Opportunities/datagov",
    public: true,
  };

  // Lobbying filings (Senate LDA).
  const lobbying = settled(lobbyingResult, cached?.payload?.entities?.lobbying || []);
  snapshot.entities.lobbying = lobbying;
  snapshot.freshness.lobbying = {
    label: "Lobbying",
    updatedAt: now,
    stale: lobbyingResult.status !== "fulfilled" && !lobbying.length,
    sourceName: "Senate LDA",
    sourceUrl: "https://lda.senate.gov/api/",
    public: true,
  };

  // Earnings calendar + 8-K material events.
  const earnings = settled(earningsResult, cached?.payload?.entities ? {
    calendar: cached.payload.entities.earningsCalendar || [],
    events: cached.payload.entities.materialEvents || [],
  } : { calendar: [], events: [] });
  snapshot.entities.earningsCalendar = Array.isArray(earnings?.calendar) ? earnings.calendar : [];
  snapshot.entities.materialEvents = Array.isArray(earnings?.events) ? earnings.events : [];
  const earningsStale = earningsResult.status !== "fulfilled" && !snapshot.entities.earningsCalendar.length;
  snapshot.freshness.earningsCalendar = {
    label: "Earnings",
    updatedAt: now,
    stale: earningsStale,
    sourceName: "SEC EDGAR submissions",
    sourceUrl: "https://www.sec.gov/edgar.shtml",
    public: true,
  };
  snapshot.freshness.materialEvents = {
    label: "8-K Events",
    updatedAt: now,
    stale: earningsStale,
    sourceName: "SEC EDGAR 8-K",
    sourceUrl: "https://www.sec.gov/edgar.shtml",
    public: true,
  };

  // NRC dockets (licensing/enforcement notices via NRC news RSS).
  const nrcDockets = settled(nrcDocketsResult, cached?.payload?.entities?.nrcDockets || []);
  snapshot.entities.nrcDockets = nrcDockets;
  snapshot.freshness.nrcDockets = {
    label: "NRC Dockets",
    updatedAt: now,
    stale: nrcDocketsResult.status !== "fulfilled" && !nrcDockets.length,
    sourceName: "NRC News RSS",
    sourceUrl: "https://www.nrc.gov/public-involve/news.xml",
    public: true,
  };

  // Prediction markets (Polymarket + Kalshi).
  const predictionMarkets = settled(predictionResult, cached?.payload?.entities?.predictionMarkets || []);
  snapshot.entities.predictionMarkets = predictionMarkets;
  snapshot.freshness.predictionMarkets = {
    label: "Prediction Markets",
    updatedAt: now,
    stale: predictionResult.status !== "fulfilled" && !predictionMarkets.length,
    sourceName: "Polymarket + Kalshi",
    sourceUrl: "https://polymarket.com/",
    public: true,
  };

  await writeTerminalCache(SNAPSHOT_KEY, snapshot);
  return snapshot;
}
