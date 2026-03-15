import { normalizeCountryName } from "../../utils/countries.js";

function normalize(value = "") {
  return String(value || "").toLowerCase();
}

function sortByMetric(rows, metric) {
  const sorted = [...rows];
  if (metric === "reactors") return sorted.sort((a, b) => (b.reactors || 0) - (a.reactors || 0));
  if (metric === "nuclear") return sorted.sort((a, b) => (b.nuclearShare || 0) - (a.nuclearShare || 0));
  if (metric === "supply") return sorted.sort((a, b) => (b.supplyCount || 0) - (a.supplyCount || 0));
  if (metric === "projects") return sorted.sort((a, b) => (b.activeProjects || 0) - (a.activeProjects || 0));
  return sorted.sort((a, b) => (b.capacityGw || 0) - (a.capacityGw || 0));
}

function buildCompanyByTicker(companies) {
  return new Map(companies.map((company) => [company.ticker, company]));
}

export function buildEntityIndex(snapshot) {
  const map = new Map();
  if (!snapshot?.entities) return map;

  Object.values(snapshot.entities).forEach((collection) => {
    collection.forEach((item) => {
      map.set(item.id, item);
    });
  });

  return map;
}

export function getEntityById(snapshot, entityId) {
  return buildEntityIndex(snapshot).get(entityId) || null;
}

export function filterMapItems(snapshot, filters) {
  const { entities } = snapshot;
  const query = normalize(filters.query);
  const countryFilter = normalizeCountryName(filters.countryFilter || "");

  if (filters.layer === "uranium") {
    return entities.supplySites.filter((site) => {
      const matchesQuery = !query || `${site.name} ${site.country} ${site.stage} ${site.operator}`.toLowerCase().includes(query);
      const matchesCountry = !countryFilter || normalizeCountryName(site.country) === countryFilter;
      return matchesQuery && matchesCountry;
    });
  }

  return entities.plants.filter((plant) => {
    const matchesQuery = !query || `${plant.name} ${plant.country} ${plant.type} ${plant.status}`.toLowerCase().includes(query);
    const matchesCountry = !countryFilter || normalizeCountryName(plant.country) === countryFilter;
    const matchesType = !filters.reactorTypeFilter || plant.normalizedType === filters.reactorTypeFilter;
    const matchesStatus = !filters.statusFilter || plant.status === filters.statusFilter;
    return matchesQuery && matchesCountry && matchesType && matchesStatus;
  });
}

export function selectCountryRanking(snapshot, metric = "capacity") {
  return sortByMetric(snapshot.entities.countries, metric);
}

export function selectMarketRows(snapshot, { selectedEntity, marketSort = "pct" } = {}) {
  const companyByTicker = buildCompanyByTicker(snapshot.entities.companies);
  let rows = snapshot.entities.marketInstruments.map((instrument) => ({
    ...instrument,
    company: companyByTicker.get(instrument.ticker),
  }));

  if (selectedEntity?.entityType === "country") {
    rows = rows.filter((row) => row.countries.includes(selectedEntity.country));
  }
  if (selectedEntity?.entityType === "plant") {
    rows = rows.filter((row) => row.company?.relatedPlantNames?.includes(selectedEntity.name) || row.countries.includes(selectedEntity.country));
  }
  if (selectedEntity?.entityType === "project") {
    rows = rows.filter((row) => row.company?.relatedProjectNames?.includes(selectedEntity.name) || row.countries.includes(selectedEntity.country));
  }
  if (selectedEntity?.entityType === "story") {
    const storyText = normalize(`${selectedEntity.title} ${selectedEntity.curiosityHook} ${selectedEntity.whyItMatters}`);
    rows = rows.filter((row) => storyText.includes(row.ticker.toLowerCase()) || storyText.includes(row.theme.toLowerCase()) || row.countries.includes(selectedEntity.country));
  }

  const sorted = [...rows];
  if (marketSort === "price") sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
  else if (marketSort === "theme") sorted.sort((a, b) => (a.theme || "").localeCompare(b.theme || ""));
  else if (marketSort === "name") sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  else sorted.sort((a, b) => (b.pct || 0) - (a.pct || 0));

  return sorted;
}

export function selectNewsRows(snapshot, { selectedEntity, newsTag = "All" } = {}) {
  let rows = newsTag === "All"
    ? [...snapshot.entities.newsArticles]
    : snapshot.entities.newsArticles.filter((item) => item.tag === newsTag);

  if (selectedEntity?.entityType === "country") {
    rows = rows.filter((row) => row.country === selectedEntity.country);
  }
  if (selectedEntity?.entityType === "plant") {
    rows = rows.filter((row) => normalize(`${row.title} ${row.curiosityHook}`).includes(normalize(selectedEntity.name)) || row.country === selectedEntity.country);
  }
  if (selectedEntity?.entityType === "project") {
    rows = rows.filter((row) => normalize(`${row.title} ${row.curiosityHook}`).includes(normalize(selectedEntity.name)) || row.country === selectedEntity.country);
  }
  if (selectedEntity?.entityType === "company") {
    rows = rows.filter((row) => normalize(`${row.title} ${row.curiosityHook}`).includes(normalize(selectedEntity.name)) || selectedEntity.countries.includes(row.country));
  }

  return rows.sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0));
}

export function selectPipelineRows(snapshot, { selectedEntity } = {}) {
  let rows = [...snapshot.entities.projectPipeline];

  if (selectedEntity?.entityType === "country") rows = rows.filter((row) => row.country === selectedEntity.country);
  if (selectedEntity?.entityType === "company") rows = rows.filter((row) => row.company === selectedEntity.name || row.country && selectedEntity.countries.includes(row.country));
  if (selectedEntity?.entityType === "story") rows = rows.filter((row) => row.country === selectedEntity.country);

  return rows;
}

export function searchTerminalSnapshot(snapshot, query = "") {
  const q = normalize(query).trim();
  if (!q) return [];

  const combined = [
    ...snapshot.entities.plants,
    ...snapshot.entities.countries,
    ...snapshot.entities.companies,
    ...snapshot.entities.newsArticles,
    ...snapshot.entities.projectPipeline,
    ...snapshot.entities.supplySites,
  ];

  return combined
    .filter((item) => normalize([
      item.name,
      item.title,
      item.country,
      item.ticker,
      item.tag,
      item.theme,
      item.stage,
      item.summary,
      item.desc,
    ].filter(Boolean).join(" ")).includes(q))
    .slice(0, 12);
}

export function getEditorialSignals(snapshot) {
  const ranking = selectCountryRanking(snapshot, "capacity");
  const markets = selectMarketRows(snapshot);
  const catalysts = selectNewsRows(snapshot);
  const pipeline = selectPipelineRows(snapshot, {});
  const topMover = markets[0] || null;
  const leadingCountry = ranking[0] || null;

  return {
    cards: [
      {
        id: "fleet",
        label: "Operating fleet",
        value: `${snapshot.entities.plants.filter((plant) => plant.status === "Operating").length}`,
        detail: `${snapshot.entities.countries.length} countries in the terminal model`,
      },
      {
        id: "pipeline",
        label: "Buildout pipeline",
        value: `${pipeline.length}`,
        detail: `${pipeline.filter((item) => item.status === "Construction").length} construction-led projects tracked`,
      },
      {
        id: "markets",
        label: "Market pulse",
        value: topMover ? `${topMover.ticker} ${topMover.pct >= 0 ? "+" : ""}${topMover.pct.toFixed(2)}%` : "Waiting for quotes",
        detail: topMover ? topMover.name : "No live market move available",
      },
      {
        id: "leader",
        label: "Capacity leader",
        value: leadingCountry ? leadingCountry.country : "N/A",
        detail: leadingCountry ? `${leadingCountry.capacityGw.toFixed(1)} GW tracked` : "No country data",
      },
    ],
    topCatalysts: catalysts.slice(0, 3),
    buildoutLeaders: pipeline.slice(0, 6),
  };
}
