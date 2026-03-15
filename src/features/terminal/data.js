import { NUCLEAR_PLANTS } from "../../data/plants.js";
import { STOCKS_BASE, NUCLEAR_SHARE } from "../../data/constants.js";
import { SMR_PROJECTS } from "../../data/smrProjects.js";
import { URANIUM_SUPPLY_SITES } from "../../data/supplySites.js";
import { TERMINAL_COMPANY_INTELLIGENCE } from "../../data/companyIntelligence.js";
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
    return {
      id: companyId,
      entityType: "company",
      ticker: stock.ticker,
      name: stock.name,
      sector: stock.sector,
      desc: stock.desc,
      theme: intelligence.focus || inferStockTheme(stock),
      countries: intelligence.countries || [],
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
      countries: intelligence.countries || [],
      ...buildSourceMeta("Finnhub via Nuclear Pulse market service", updatedAt, "public", true, getDefaultConfidence("markets")),
    };
  });
}

function buildNewsArticles(news, updatedAt) {
  return news.map((item, index) => {
    const country = inferNewsLocation(item);
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
      pubDate: toIso(item.pubDate) || updatedAt,
      country,
      countryId: country ? `country:${slugify(normalizeCountryName(country))}` : null,
      ...buildSourceMeta(item.source || "Nuclear news feeds", updatedAt, "public", true, getDefaultConfidence("news")),
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

function getFreshnessMap({ generatedAt, newsLastUpdated, hasMarkets, hasNews }) {
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
  };
}

export function buildTerminalSnapshot({
  plants = NUCLEAR_PLANTS,
  supplySites = URANIUM_SUPPLY_SITES,
  stocks = STOCKS_BASE,
  news = [],
  newsLastUpdated = null,
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
  const projectPipeline = buildProjectPipeline(plantEntities, SMR_PROJECTS, updatedAt);
  const countries = buildCountries(plantEntities, supplyEntities, projectPipeline, updatedAt);
  const countryMetrics = buildCountryMetrics(countries, updatedAt);
  const regulatoryEvents = buildRegulatoryEvents(newsArticles, projectPipeline, updatedAt);
  const freshness = getFreshnessMap({
    generatedAt: updatedAt,
    newsLastUpdated: toIso(newsLastUpdated),
    hasMarkets: marketInstruments.some((item) => item.price > 0),
    hasNews: newsArticles.length > 0,
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
      regulatoryEvents,
      projectPipeline,
      countryMetrics,
    },
  };
}
