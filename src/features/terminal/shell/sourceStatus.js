// Feed health derived from what each source actually delivered in the
// snapshot — a feed that returned nothing is "empty", not "live", whatever
// its timestamp says.

const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

const COUNTERS = {
  markets: (e) => (e.marketInstruments || []).filter((m) => m.price > 0).length,
  news: (e) => (e.newsArticles || []).length,
  reactorMaster: (e) => (e.plants || []).length,
  pipeline: (e) => (e.projectPipeline || []).length,
  filings: (e) => (e.companyFilings || []).length,
  operations: (e) => (e.operationsSignals || []).length,
  uranium: (e) => (e.uranium?.pricePerLb ? 1 : 0),
  iaea: (e) => (e.iaeaReactors ? 1 : 0),
  insider: (e) => (e.insiderTrades || []).length,
  govContracts: (e) => (e.govContracts || []).length,
  lobbying: (e) => (e.lobbying || []).length,
  earningsCalendar: (e) => (e.earningsCalendar || []).filter((r) => r.estimatedNext).length,
  materialEvents: (e) => (e.materialEvents || []).length,
  nrcDockets: (e) => (e.nrcDockets || []).length,
  predictionMarkets: (e) => (e.predictionMarkets || []).length,
};

// Feeds that are reference baselines rather than streams.
const BASELINE = new Set(["reactorMaster", "pipeline", "iaea"]);

export function getSourceStatus(snapshot, now = Date.now()) {
  const entities = snapshot?.entities || {};
  const rows = Object.entries(snapshot?.freshness || {}).map(([key, feed]) => {
    const count = COUNTERS[key] ? COUNTERS[key](entities) : null;
    const age = feed?.updatedAt ? now - new Date(feed.updatedAt).getTime() : Infinity;
    let state = "live";
    if (count === 0) state = "empty";
    else if (feed?.stale || age > STALE_AFTER_MS) state = "stale";
    return {
      key,
      label: feed?.label || key,
      source: feed?.sourceName || feed?.source || "",
      url: feed?.sourceUrl || null,
      updatedAt: feed?.updatedAt || null,
      count,
      state,
      baseline: BASELINE.has(key),
    };
  });

  // Daily price history has no freshness entry of its own.
  const withHistory = (entities.marketInstruments || []).filter((m) => (m.history || []).length > 1).length;
  rows.splice(1, 0, {
    key: "priceHistory",
    label: "Price history",
    source: "Yahoo Finance daily bars",
    url: "https://finance.yahoo.com/",
    updatedAt: snapshot?.generatedAt || null,
    count: withHistory,
    state: withHistory ? "live" : "empty",
    baseline: false,
  });

  return rows;
}
