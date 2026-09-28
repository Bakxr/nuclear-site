// Plant registry: IAEA PRIS is the source of truth for every reactor's status,
// unit count and capacity; the curated list (src/data/plantsCurated.js) adds
// what PRIS lacks: map coordinates, display names and hand-picked entries PRIS
// doesn't track (e.g. first-of-a-kind US projects).
//
// Used at build time (scripts/sync-plants.mjs) and by the daily cron to
// detect changes.

const PRIS = "https://pris-stats.iaea.org";
const UA = { "user-agent": "NuclearPulseBot/1.0 (+https://thenuclearpulse.com; support@thenuclearpulse.com)" };

// PRIS country names -> the names the site uses.
const COUNTRY_NAMES = {
  "Czech Republic": "Czech Rep.",
  "Iran, Islamic Republic of": "Iran",
  "Korea, Republic of": "South Korea",
  "Netherlands, Kingdom of the": "Netherlands",
  "Russian Federation": "Russia",
  "Türkiye": "Turkey",
  "United Arab Emirates": "UAE",
  "United Kingdom": "UK",
  "United States of America": "USA",
};

// Curated names that differ from the PRIS station name. An array means the
// curated entry covers several PRIS stations (e.g. Qinshan phases I-III).
const ALIASES = {
  "Qinshan": ["QINSHAN", "QINSHAN 2", "QINSHAN 3"],
  "Shearon Harris": "HARRIS",
  "Chinon": "CHINON B",
  "Chooz": "CHOOZ B",
  "Higashidori": "HIGASHIDORI 1 (TOHOKU)",
  "Bruce A & B": "BRUCE",
  "D.C. Cook": "COOK",
  "Arkansas Nuclear One": "ANO",
  "Saint-Laurent": "ST. LAURENT B",
  "Saint-Alban": "ST. ALBAN",
  "Leningrad II": "LENINGRAD 2",
  "Novovoronezh II": "NOVOVORONEZH 2",
  "Kursk II": "KURSK 2",
  "Gösgen": "GOESGEN",
  "Karachi (KANUPP)": "KANUPP",
  "Xudabao": "XUDAPU",
  "Darlington SMR": "DARLINGTON SMR",
  "Paks II": "PAKS",
  "San'ao": "SANAO",
};

export const norm = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]/g, "");

// "SAEUL-1 " -> "SAEUL", "LENINGRAD 2-3" -> "LENINGRAD 2", "DARLINGTON SMR1" -> "DARLINGTON SMR"
export function stationBase(unitName) {
  return String(unitName || "").trim().replace(/[- ]?\d+[A-Z]?$/i, "").trim();
}

// Curated "Changjiang 3-4" / "Taipingling 1-2" describe the same station.
const curatedBase = (name) => name.replace(/\s+\d+(-\d+)?$/, "");

const curatedKeys = (plant) => [].concat(ALIASES[plant.name] || curatedBase(plant.name)).map(norm);

// Treats several PRIS stations as one (their units combined).
function combine(stations) {
  if (stations.length === 1) return stations[0];
  const merged = { ...stations[0], key: stations.map((s) => s.key).join("+"), operating: [], construction: [], suspended: [], shutdown: [] };
  for (const s of stations) {
    for (const field of ["operating", "construction", "suspended", "shutdown"]) merged[field].push(...s[field]);
  }
  return merged;
}

export async function fetchPrisReactors({ fetchImpl = fetch, concurrency = 6 } = {}) {
  const res = await fetchImpl(`${PRIS}/country/countries/`, { headers: UA });
  if (!res.ok) throw new Error(`PRIS countries HTTP ${res.status}`);
  const countries = (await res.json()).items || [];
  if (!countries.length) throw new Error("PRIS returned no countries");

  const reactors = [];
  const queue = [...countries];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const country = queue.shift();
      const r = await fetchImpl(`${PRIS}/reactor/reactors-by-code/${country.countryCode}`, { headers: UA });
      if (!r.ok) throw new Error(`PRIS ${country.countryCode} HTTP ${r.status}`);
      reactors.push(...((await r.json()).items || []));
    }
  }));
  if (reactors.length < 400) throw new Error(`PRIS returned only ${reactors.length} reactors`);
  return reactors;
}

// IAEA's headline figures: { inOperation, underConstruction, suspended },
// each { reactors, countries, capacityMw }.
export async function fetchPrisWorldStats({ fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`${PRIS}/worldstatistics/world-statistics/`, { headers: UA });
  if (!res.ok) throw new Error(`PRIS world statistics HTTP ${res.status}`);
  const keys = { InOperation: "inOperation", UnderConstruction: "underConstruction", InSuspendedOperation: "suspended" };
  const out = {};
  for (const item of (await res.json()).items || []) {
    const key = keys[item.statisticType];
    if (!key) continue;
    const count = (text) => Number(String(text || "").replace(/[^0-9]/g, "")) || null;
    out[key] = { reactors: count(item.section1), countries: count(item.section2), capacityMw: Math.round(Number(item.netCapacity) || 0) };
  }
  if (!out.inOperation?.reactors) throw new Error("PRIS world statistics missing in-operation count");
  return out;
}

// Groups PRIS units into stations with per-status counts and capacity.
export function groupStations(reactors) {
  const stations = new Map();
  for (const r of reactors) {
    const base = stationBase(r.unitName);
    const country = COUNTRY_NAMES[r.countryName] || r.countryName;
    const key = `${norm(country)}:${norm(base)}`;
    if (!stations.has(key)) {
      stations.set(key, { key, base, country, site: r.siteName, operating: [], construction: [], suspended: [], shutdown: [] });
    }
    const s = stations.get(key);
    const unit = {
      name: r.unitName.trim(),
      net: Number(r.netElectricalCapacity) || Number(r.designNetElectricalCapacity) || 0,
      model: r.model || r.typeCode || "",
      typeCode: r.typeCode || "",
      constructionDate: r.constructionDate || null,
      gridDate: r.gridDate || null,
    };
    if (r.statusName === "Operational") s.operating.push(unit);
    else if (r.statusName === "Under Construction") s.construction.push(unit);
    else if (r.statusName === "Suspended Operation") s.suspended.push(unit);
    else s.shutdown.push(unit);
  }
  return stations;
}

const sum = (units) => units.reduce((total, u) => total + u.net, 0);

function statusOf(station) {
  if (station.operating.length) return "Operating";
  if (station.suspended.length) return "Idle";
  if (station.construction.length) return "Construction";
  return "Shutdown";
}

// The figures the site shows for a station, derived from PRIS.
export function stationFigures(station) {
  const status = statusOf(station);
  const live = status === "Operating" ? station.operating
    : status === "Idle" ? station.suspended
      : status === "Construction" ? station.construction
        : station.shutdown;
  const figures = {
    status,
    reactors: live.length,
    capacity: Math.round(sum(live)),
  };
  if (status !== "Construction" && station.construction.length) {
    figures.underConstruction = { reactors: station.construction.length, capacity: Math.round(sum(station.construction)) };
  }
  return figures;
}

function titleCase(value) {
  return value.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}

/**
 * Merges curated plants with PRIS stations.
 * - Curated plants matched to a PRIS station take PRIS status/units/capacity.
 * - Curated duplicates of one station (e.g. "Changjiang" + "Changjiang 3-4")
 *   collapse into the first entry; PRIS construction units ride along as
 *   `underConstruction`.
 * - PRIS stations with live units that the curated list lacks are added,
 *   using `coords` (name, lat, lng keyed by station key) for placement.
 * - Curated plants PRIS doesn't know keep their curated values.
 */
export function mergePlants(curated, stations, coords = {}) {
  const byCuratedKey = new Map();
  for (const s of stations.values()) {
    const k = norm(s.base);
    if (!byCuratedKey.has(k)) byCuratedKey.set(k, []);
    byCuratedKey.get(k).push(s);
  }

  const used = new Set();
  const plants = [];
  const unmatchedCurated = [];

  for (const plant of curated) {
    const matches = [];
    for (const key of curatedKeys(plant)) {
      const candidates = byCuratedKey.get(key) || [];
      const station = candidates.find((s) => norm(s.country) === norm(plant.country)) || candidates[0];
      if (station && !used.has(station.key)) matches.push(station);
    }
    if (!matches.length) {
      // Either PRIS doesn't track it, or it duplicates an entry already merged.
      const claimed = curatedKeys(plant).some((key) => (byCuratedKey.get(key) || []).some((s) => used.has(s.key)));
      if (claimed) continue;
      unmatchedCurated.push(plant.name);
      plants.push({ ...plant, source: "curated" });
      continue;
    }
    matches.forEach((s) => used.add(s.key));
    const station = combine(matches);
    const { underConstruction, ...figures } = stationFigures(station);
    plants.push({
      ...plant,
      ...figures,
      ...(underConstruction ? { underConstruction } : {}),
      type: plant.type || station.operating[0]?.model || station.construction[0]?.model,
      source: "iaea",
      prisKey: station.key,
    });
  }

  // New PRIS stations; ones sharing a Wikipedia article (e.g. Heysham A and B)
  // become a single marker.
  const missingCoords = [];
  const groups = new Map();
  for (const station of stations.values()) {
    if (used.has(station.key)) continue;
    if (!station.operating.length && !station.construction.length && !station.suspended.length) continue;
    const c = coords[station.key];
    if (!c) {
      missingCoords.push(station.key);
      continue;
    }
    const groupKey = c.wiki || station.key;
    if (!groups.has(groupKey)) groups.set(groupKey, { coords: c, stations: [] });
    groups.get(groupKey).stations.push(station);
  }
  for (const { coords: c, stations: members } of groups.values()) {
    const station = combine(members);
    const { underConstruction, ...figures } = stationFigures(station);
    const first = station.operating[0] || station.construction[0] || station.suspended[0];
    plants.push({
      name: c.name || titleCase(station.base),
      country: station.country,
      lat: c.lat,
      lng: c.lng,
      ...figures,
      ...(underConstruction ? { underConstruction } : {}),
      type: first?.model || first?.typeCode || "",
      source: "iaea",
      prisKey: station.key,
    });
    members.forEach((s) => used.add(s.key));
  }

  return { plants, unmatchedCurated, missingCoords };
}

// Compact per-station summary used to detect day-to-day changes.
export function summarizeStations(stations) {
  const out = {};
  for (const s of stations.values()) {
    if (!s.operating.length && !s.construction.length && !s.suspended.length) continue;
    out[s.key] = {
      name: titleCase(s.base),
      country: s.country,
      operating: s.operating.map((u) => u.name).sort(),
      construction: s.construction.map((u) => u.name).sort(),
      suspended: s.suspended.map((u) => u.name).sort(),
    };
  }
  return out;
}

// Human-readable changes between two summaries (older -> newer).
export function diffStations(before = {}, after = {}) {
  const changes = [];
  const unitsIn = (summary, key, field) => new Set(summary[key]?.[field] || []);
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const now = after[key];
    const was = before[key];
    const label = `${(now || was).name} (${(now || was).country})`;
    if (!was) {
      changes.push({ kind: "new-station", station: label, text: `New station listed: ${label}, ${now.construction.length} unit(s) under construction, ${now.operating.length} operating.` });
      continue;
    }
    for (const unit of unitsIn(after, key, "construction")) {
      if (!unitsIn(before, key, "construction").has(unit)) changes.push({ kind: "construction-start", station: label, unit, text: `Construction start: ${unit} (${label}).` });
    }
    for (const unit of unitsIn(after, key, "operating")) {
      if (!unitsIn(before, key, "operating").has(unit)) changes.push({ kind: "operating", station: label, unit, text: `Now operating: ${unit} (${label}).` });
    }
    for (const unit of [...unitsIn(before, key, "operating"), ...unitsIn(before, key, "construction")]) {
      const stillThere = unitsIn(after, key, "operating").has(unit) || unitsIn(after, key, "construction").has(unit);
      if (!stillThere) changes.push({ kind: "removed", station: label, unit, text: `No longer operating or under construction: ${unit} (${label}).` });
    }
  }
  return changes;
}
