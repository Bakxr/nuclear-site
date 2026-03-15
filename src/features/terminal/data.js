import { NUCLEAR_PLANTS } from "../../data/plants.js";
import { STOCKS_BASE, NUCLEAR_SHARE } from "../../data/constants.js";
import { SMR_PROJECTS } from "../../data/smrProjects.js";
import { URANIUM_SUPPLY_SITES } from "../../data/supplySites.js";
import { TERMINAL_COMPANY_INTELLIGENCE } from "../../data/companyIntelligence.js";
import { TERMINAL_SOURCE_CATALOG } from "../../data/sourceCatalog.js";
import { normalizeCountryName } from "../../utils/countries.js";
import { inferNewsLocation } from "../../utils/news.js";
import { normalizeReactorType } from "../../services/plantAPI.js";

function slugify(value = "") {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function parseCapacityToMw(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const match = String(value).match(/([\d.]+)/);
  const numeric = match ? Number(match[1]) : 0;
  return /gw/i.test(String(value)) ? numeric * 1000 : numeric;
}

function toIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function getDefaultConfidence(category) {
  if (category === "markets") return 0.78;
  if (category === "news") return 0.76;
  if (category === "pipeline") return 0.8;
  if (category === "filings") return 0.9;
  if (category === "operations") return 0.92;
  return 0.86;
}

function buildSourceMeta(source, updatedAt, access = "public", publicSafe = true, confidence = 0.86) {
  return {
    source,
    updatedAt,
    confidence,
    publicSafe,
    access,
  };
}

function inferStockTheme(stock = {}) {
  const text = `${stock.sector || ""} ${stock.desc || ""}`.toLowerCase();
  if (/uranium|mine|mining/.test(text)) return "Uranium";
  if (/fuel|enrichment|haleu|conversion/.test(text)) return "Fuel Cycle";
  if (/utility/.test(text)) return "Utilities";
  if (/smr|reactor|micro/.test(text)) return "Advanced Reactors";
  return "Nuclear";
}

function buildCompanyId(name) {
  return `company:${slugify(name)}`;
}

function classifyNewsSource(sourceName = "") {
  const source = String(sourceName || "").toLowerCase();
  if (/nrc|iaea|department of energy|doe|eia|cnsc/.test(source)) {
    return { isOfficial: true, tier: "Official" };
  }
  if (/world nuclear news|nucnet|ans|nuclear engineering international/.test(source)) {
    return { isOfficial: false, tier: "Industry" };
  }
  return { isOfficial: false, tier: "Media" };
}

function buildCountryIndex() {
  return new Map(
    NUCLEAR_SHARE.map((country) => [normalizeCountryName(country.country), country]),
  );
}

function buildPlantEntities(plants, updatedAt) {
  return plants.map((plant) => {
    const normalizedCountry = normalizeCountryName(plant.country);
    return {
      id: `plant:${slugify(plant.name)}`,
      entityType: "plant",
      name: plant.name,
      country: normalizedCountry,
      countryId: `country:${slugify(normalizedCountry)}`,
      lat: plant.lat,
      lng: plant.lng,
      capacity: plant.capacity,
      capacityMw: plant.capacity,
      reactors: plant.reactors,
      status: plant.status,
      type: plant.type,
      normalizedType: normalizeReactorType(plant.type),
      ...buildSourceMeta("IAEA PRIS / World Nuclear Association", updatedAt, "public", true),
    };
  });
}

function buildReactorUnits(plants, updatedAt) {
  return plants.flatMap((plant) => {
    const count = Math.max(1, plant.reactors || 1);
    const perUnitCapacity = Math.round((plant.capacity || 0) / count);
    return Array.from({ length: count }, (_, index) => ({
      id: `unit:${slugify(plant.name)}-${index + 1}`,
      entityType: "reactorUnit",
      name: `${plant.name} Unit ${index + 1}`,
      plantId: `plant:${slugify(plant.name)}`,
      country: normalizeCountryName(plant.country),
      status: plant.status,
      capacityMw: perUnitCapacity,
      reactorType: normalizeReactorType(plant.type),
      ...buildSourceMeta("Derived from plant master data", updatedAt, "terminal", true, 0.74),
    }));
  });
}

function buildSupplySites(sites, updatedAt) {
  return sites.map((site) => {
    const normalizedCountry = normalizeCountryName(site.country);
    return {
      id: `site:${site.id || slugify(site.name)}`,
      entityType: "supplySite",
      name: site.name,
      country: normalizedCountry,
      countryId: `country:${slugify(normalizedCountry)}`,
      stage: site.stage,
      status: site.status,
      operator: site.operator,
      region: site.region,
      lat: site.lat,
      lng: site.lng,
      detail: site.detail,
      ...buildSourceMeta(site.source || "Public uranium reference data", updatedAt, "public", true),
    };
  });
}

function buildCompanies(stocks, updatedAt) {
  return stocks.map((stock) => {
    const intelligence = TERMINAL_COMPANY_INTELLIGENCE[stock.ticker] || {};
    const companyId = intelligence.companyId || buildCompanyId(stock.name);
    const countries = (intelligence.countries || []).map((country) => normalizeCountryName(country));
    return {
      id: companyId,
      entityType: "company",
      ticker: stock.ticker,
      name: stock.name,
      sector: stock.sector,
      desc: stock.desc,
      theme: intelligence.focus || inferStockTheme(stock),
      countries,
      siteIds: intelligence.siteIds || [],
      relatedPlantNames: intelligence.relatedPlantNames || [],
      relatedProjectNames: intelligence.relatedProjectNames || [],
      ...buildSourceMeta("Public markets / company descriptions", updatedAt, intelligence.access || "terminal", true, 0.72),
    };
  });
}

function buildMarketInstruments(stocks, updatedAt) {
  return stocks.map((stock) => {
    const intelligence = TERMINAL_COMPANY_INTELLIGENCE[stock.ticker] || {};
    const countries = (intelligence.countries || []).map((country) => normalizeCountryName(country));
    return {
      id: `market:${stock.ticker.toLowerCase()}`,
      entityType: "marketInstrument",
      ticker: stock.ticker,
      name: stock.name,
      sector: stock.sector,
      theme: intelligence.focus || inferStockTheme(stock),
      price: stock.price || 0,
      change: stock.change || 0,
      pct: stock.pct || 0,
      history: Array.isArray(stock.history) ? stock.history : [],
      companyId: intelligence.companyId || buildCompanyId(stock.name),
      countries,
      ...buildSourceMeta("Finnhub via Nuclear Pulse market service", updatedAt, "public", true, getDefaultConfidence("markets")),
    };
  });
}

function buildNewsArticles(news, updatedAt) {
  if (news.some((item) => item?.entityType === "story")) return news;
  return news.map((item, index) => {
    const country = inferNewsLocation(item);
    const sourceClass = classifyNewsSource(item.source);
    return {
      id: `story:${slugify(item.title || item.url || String(index))}-${index}`,
      entityType: "story",
      title: item.title,
      url: item.url,
      tag: item.tag || "Industry",
      dateLabel: item.date,
      sourceName: item.source,
      curiosityHook: item.curiosityHook || "",
      whyItMatters: item.whyItMatters || "",
      engagementScore: item.engagementScore || 0,
      isOfficial: item.isOfficial ?? sourceClass.isOfficial,
      sourceTier: item.sourceTier || sourceClass.tier,
      pubDate: toIso(item.pubDate) || updatedAt,
      country,
      countryId: country ? `country:${slugify(normalizeCountryName(country))}` : null,
      ...buildSourceMeta(item.source || "Nuclear news feeds", updatedAt, "public", true, getDefaultConfidence("news")),
    };
  });
}

function buildCompanyFilings(filings, companies, updatedAt) {
  if (filings.some((item) => item?.entityType === "filing")) return filings;

  const companyIndex = new Map(companies.map((company) => [company.ticker, company]));

  return filings.map((filing, index) => {
    const company = companyIndex.get(filing.ticker);
    const country = company?.countries?.[0] || null;
    const filedAt = toIso(filing.filingDate) || updatedAt;
    return {
      id: `filing:${slugify(`${filing.ticker}-${filing.form}-${filing.filingDate || index}`)}`,
      entityType: "filing",
      ticker: filing.ticker,
      companyId: company?.id || null,
      companyName: company?.name || filing.companyName || filing.ticker,
      companyCountries: company?.countries || [],
      country,
      countryId: country ? `country:${slugify(normalizeCountryName(country))}` : null,
      form: filing.form,
      filingDate: filedAt,
      filedLabel: new Date(filedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      accessionNumber: filing.accessionNumber || "",
      url: filing.url,
      summary: filing.summary || "SEC filing",
      priority: filing.priority || 1,
      theme: company?.theme || "Markets",
      ...buildSourceMeta("SEC EDGAR", toIso(filing.filingDate) || updatedAt, "terminal", true, getDefaultConfidence("filings")),
    };
  });
}

function buildOperationsSignals(signals, plants, updatedAt) {
  if (signals.some((item) => item?.entityType === "operationsSignal")) return signals;

  const plantIndex = plants
    .filter((plant) => plant.country === "United States" || plant.country === "USA")
    .map((plant) => ({
      plant,
      alias: plant.name
        .toLowerCase()
        .replace(/\b(one|two|three|four|five|1|2|3|4|5)\b/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim(),
    }));

  return signals.map((signal, index) => {
    const matched = plantIndex.find((entry) => entry.alias.includes(signal.plantAlias) || signal.plantAlias.includes(entry.alias));
    const plant = matched?.plant || null;
    const country = plant?.country || "USA";
    return {
      id: `ops:${slugify(`${signal.plantLabel}-${index}`)}`,
      entityType: "operationsSignal",
      title: signal.title,
      name: signal.plantLabel,
      plantName: plant?.name || signal.plantLabel,
      plantId: plant?.id || null,
      unitLabel: signal.unitLabel,
      powerPct: signal.powerPct,
      status: signal.status,
      url: signal.url,
      country,
      countryId: `country:${slugify(normalizeCountryName(country))}`,
      summary: `${signal.plantLabel} is reporting ${signal.powerPct}% power on the NRC status feed.`,
      ...buildSourceMeta("US NRC Plant Status Feed", updatedAt, "terminal", true, getDefaultConfidence("operations")),
    };
  });
}

function buildSourceCatalog(sourceCatalog, snapshotMeta, updatedAt) {
  if (sourceCatalog.some((item) => item?.entityType === "sourceBrief")) return sourceCatalog;

  return sourceCatalog.map((source) => {
    const liveCount = snapshotMeta[source.id]?.count ?? null;
    const updatedSourceAt = snapshotMeta[source.id]?.updatedAt || updatedAt;
    const status = snapshotMeta[source.id]?.status || source.defaultStatus;
    return {
      id: `source:${source.id}`,
      entityType: "sourceBrief",
      name: source.name,
      shortLabel: source.shortLabel,
      category: source.category,
      coverage: source.coverage,
      url: source.url,
      status,
      count: liveCount,
      access: source.access,
      publicSafe: source.publicSafe,
      ...buildSourceMeta(source.name, updatedSourceAt, source.access, source.publicSafe, 0.88),
    };
  });
}

function buildProjectPipeline(plants, projects, updatedAt) {
  const utilityProjects = plants
    .filter((plant) => plant.status === "Construction")
    .map((plant) => ({
      id: `project:${slugify(plant.name)}`,
      entityType: "project",
      name: plant.name,
      company: plant.country,
      country: normalizeCountryName(plant.country),
      countryId: `country:${slugify(normalizeCountryName(plant.country))}`,
      capacityMw: plant.capacity,
      type: normalizeReactorType(plant.type),
      status: "Construction",
      targetYear: null,
      lane: "Large-scale buildout",
      summary: `${plant.reactors} reactor(s) under construction at ${plant.name}.`,
      source: "IAEA PRIS / World Nuclear Association",
      updatedAt,
      confidence: getDefaultConfidence("pipeline"),
      publicSafe: true,
      access: "public",
    }));

  const advancedProjects = projects.map((project) => ({
    id: `project:${slugify(project.name)}`,
    entityType: "project",
    name: project.name,
    company: project.company,
    country: normalizeCountryName(project.country),
    countryId: `country:${slugify(normalizeCountryName(project.country))}`,
    capacityMw: project.capacity,
    type: project.type,
    status: project.status,
    targetYear: project.year,
    lane: "Advanced reactor pipeline",
    summary: project.desc,
    source: "Curated buildout tracker",
    updatedAt,
    confidence: getDefaultConfidence("pipeline"),
    publicSafe: true,
    access: "terminal",
  }));

  return [...utilityProjects, ...advancedProjects].sort((left, right) => {
    const leftYear = left.targetYear || 9999;
    const rightYear = right.targetYear || 9999;
    if (leftYear !== rightYear) return leftYear - rightYear;
    return left.name.localeCompare(right.name);
  });
}

function buildCountries(plants, supplySites, pipeline, updatedAt) {
  const shareIndex = buildCountryIndex();
  const countryMap = new Map();

  const ensureCountry = (countryName) => {
    const normalized = normalizeCountryName(countryName);
    if (!countryMap.has(normalized)) {
      const share = shareIndex.get(normalized);
      countryMap.set(normalized, {
        id: `country:${slugify(normalized)}`,
        entityType: "country",
        country: normalized,
        name: normalized,
        flag: share?.flag || "",
        nuclearShare: share?.nuclear ?? null,
        reactors: share?.reactors ?? 0,
        capacityGw: parseCapacityToMw(share?.capacity || 0) / 1000,
        trackedCapacityGw: 0,
        plantCount: 0,
        operatingCount: 0,
        constructionCount: 0,
        supplyCount: 0,
        activeProjects: 0,
        topReactorType: null,
        ...buildSourceMeta("IAEA PRIS / Nuclear Pulse terminal model", updatedAt, "public", true),
      });
    }
    return countryMap.get(normalized);
  };

  plants.forEach((plant) => {
    const entry = ensureCountry(plant.country);
    entry.plantCount += 1;
    entry.trackedCapacityGw += (plant.capacityMw || 0) / 1000;
    if (plant.status === "Operating") entry.operatingCount += 1;
    if (plant.status === "Construction") entry.constructionCount += 1;
    if (!entry.topReactorType) entry.topReactorType = plant.normalizedType;
  });

  supplySites.forEach((site) => {
    const entry = ensureCountry(site.country);
    entry.supplyCount += 1;
  });

  pipeline.forEach((project) => {
    const entry = ensureCountry(project.country);
    entry.activeProjects += 1;
  });

  return [...countryMap.values()]
    .map((country) => ({
      ...country,
      capacityGw: country.capacityGw || country.trackedCapacityGw,
    }))
    .sort((left, right) => left.country.localeCompare(right.country));
}

function buildCountryMetrics(countries, updatedAt) {
  return countries.map((country) => ({
    id: `country-metric:${slugify(country.country)}`,
    entityType: "countryMetric",
    countryId: country.id,
    country: country.country,
    reactors: country.reactors,
    nuclearShare: country.nuclearShare,
    capacityGw: country.capacityGw,
    operatingCount: country.operatingCount,
    constructionCount: country.constructionCount,
    supplyCount: country.supplyCount,
    activeProjects: country.activeProjects,
    ...buildSourceMeta("Derived terminal metrics", updatedAt, "public", true, 0.82),
  }));
}

function buildRegulatoryEvents(newsArticles, projectPipeline, updatedAt) {
  const fromNews = newsArticles
    .filter((item) => ["Policy", "Safety", "Expansion", "Innovation", "Research"].includes(item.tag))
    .slice(0, 8)
    .map((item) => ({
      id: `regulatory:${slugify(item.title)}`,
      entityType: "regulatoryEvent",
      title: item.title,
      country: item.country,
      countryId: item.countryId,
      dateLabel: item.dateLabel,
      lane: item.tag,
      status: item.tag,
      summary: item.whyItMatters || item.curiosityHook,
      linkedStoryId: item.id,
      ...buildSourceMeta(item.sourceName || "Nuclear catalyst feeds", item.updatedAt || updatedAt, "terminal", true, 0.7),
    }));

  const fallbacks = projectPipeline.slice(0, 6).map((project) => ({
    id: `regulatory:${slugify(project.name)}-milestone`,
    entityType: "regulatoryEvent",
    title: `${project.name} milestone watch`,
    country: project.country,
    countryId: project.countryId,
    dateLabel: project.targetYear ? String(project.targetYear) : "TBD",
    lane: project.status,
    status: project.status,
    summary: project.summary,
    linkedProjectId: project.id,
    ...buildSourceMeta(project.source, project.updatedAt || updatedAt, "terminal", true, 0.64),
  }));

  return [...fromNews, ...fallbacks].slice(0, 12);
}

function getFreshnessMap({
  generatedAt,
  newsLastUpdated,
  filingsLastUpdated,
  operationsLastUpdated,
  hasMarkets,
  hasNews,
  hasFilings,
  hasOperations,
}) {
  return {
    markets: {
      label: "Markets",
      updatedAt: hasMarkets ? generatedAt : null,
      stale: !hasMarkets,
      ...buildSourceMeta("Finnhub via Nuclear Pulse market service", generatedAt, "public", true, getDefaultConfidence("markets")),
    },
    news: {
      label: "Catalysts",
      updatedAt: newsLastUpdated || generatedAt,
      stale: !hasNews,
      ...buildSourceMeta("Nuclear Pulse news aggregation", newsLastUpdated || generatedAt, "public", true, getDefaultConfidence("news")),
    },
    reactorMaster: {
      label: "Fleet",
      updatedAt: generatedAt,
      stale: false,
      ...buildSourceMeta("IAEA PRIS / public fleet references", generatedAt, "public", true),
    },
    pipeline: {
      label: "Pipeline",
      updatedAt: generatedAt,
      stale: false,
      ...buildSourceMeta("Curated terminal pipeline", generatedAt, "terminal", true, getDefaultConfidence("pipeline")),
    },
    filings: {
      label: "Filings",
      updatedAt: filingsLastUpdated || generatedAt,
      stale: !hasFilings,
      ...buildSourceMeta("SEC EDGAR", filingsLastUpdated || generatedAt, "terminal", true, getDefaultConfidence("filings")),
    },
    operations: {
      label: "Ops",
      updatedAt: operationsLastUpdated || generatedAt,
      stale: !hasOperations,
      ...buildSourceMeta("US NRC Plant Status Feed", operationsLastUpdated || generatedAt, "terminal", true, getDefaultConfidence("operations")),
    },
  };
}

export function buildTerminalSnapshot({
  plants = NUCLEAR_PLANTS,
  supplySites = URANIUM_SUPPLY_SITES,
  stocks = STOCKS_BASE,
  news = [],
  companyFilings = [],
  operationsSignals = [],
  sourceCatalog = TERMINAL_SOURCE_CATALOG,
  newsLastUpdated = null,
  filingsLastUpdated = null,
  operationsLastUpdated = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const updatedAt = toIso(generatedAt) || new Date().toISOString();
  const normalizedStocks = stocks.map((stock) => ({ ...stock, price: stock.price || 0, change: stock.change || 0, pct: stock.pct || 0, history: stock.history || [] }));
  const plantEntities = buildPlantEntities(plants, updatedAt);
  const reactorUnits = buildReactorUnits(plants, updatedAt);
  const supplyEntities = buildSupplySites(supplySites, updatedAt);
  const companies = buildCompanies(normalizedStocks, updatedAt);
  const marketInstruments = buildMarketInstruments(normalizedStocks, updatedAt);
  const newsArticles = buildNewsArticles(news, newsLastUpdated || updatedAt);
  const filingEntities = buildCompanyFilings(companyFilings, companies, filingsLastUpdated || updatedAt);
  const operationEntities = buildOperationsSignals(operationsSignals, plantEntities, operationsLastUpdated || updatedAt);
  const projectPipeline = buildProjectPipeline(plantEntities, SMR_PROJECTS, updatedAt);
  const countries = buildCountries(plantEntities, supplyEntities, projectPipeline, updatedAt);
  const countryMetrics = buildCountryMetrics(countries, updatedAt);
  const regulatoryEvents = buildRegulatoryEvents(newsArticles, projectPipeline, updatedAt);
  const sourceEntities = buildSourceCatalog(sourceCatalog, {
    pris: { count: plantEntities.length, status: "Snapshot", updatedAt },
    cnpp: { status: "Ready", updatedAt },
    aris: { status: "Ready", updatedAt },
    "nrc-ops": { count: operationEntities.length, status: operationEntities.length ? "Live" : "Ready", updatedAt: operationsLastUpdated || updatedAt },
    "nrc-news": { count: newsArticles.filter((item) => item.sourceName === "US Nuclear Regulatory Commission").length, status: "Live", updatedAt: newsLastUpdated || updatedAt },
    sec: { count: filingEntities.length, status: filingEntities.length ? "Live" : "Ready", updatedAt: filingsLastUpdated || updatedAt },
    doe: { count: newsArticles.filter((item) => /department of energy/i.test(item.sourceName || "")).length, status: "Live", updatedAt: newsLastUpdated || updatedAt },
    eia: {
      count: newsArticles.filter((item) => /eia/i.test(item.sourceName || "")).length,
      status: newsArticles.some((item) => /eia/i.test(item.sourceName || "")) ? "Live" : "Ready",
      updatedAt: newsLastUpdated || updatedAt,
    },
    cnsc: { status: "Ready", updatedAt },
    entsoe: { status: "Ready", updatedAt },
  }, updatedAt);
  const freshness = getFreshnessMap({
    generatedAt: updatedAt,
    newsLastUpdated: toIso(newsLastUpdated),
    filingsLastUpdated: toIso(filingsLastUpdated),
    operationsLastUpdated: toIso(operationsLastUpdated),
    hasMarkets: marketInstruments.some((item) => item.price > 0),
    hasNews: newsArticles.length > 0,
    hasFilings: filingEntities.length > 0,
    hasOperations: operationEntities.length > 0,
  });

  return {
    generatedAt: updatedAt,
    freshness,
    entities: {
      countries,
      plants: plantEntities,
      reactorUnits,
      supplySites: supplyEntities,
      companies,
      marketInstruments,
      newsArticles,
      companyFilings: filingEntities,
      operationsSignals: operationEntities,
      regulatoryEvents,
      projectPipeline,
      countryMetrics,
      sourceCatalog: sourceEntities,
    },
  };
}
