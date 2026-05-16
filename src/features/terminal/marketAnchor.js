// Geo-anchoring for prediction markets.
// Takes a normalized prediction-market row (with `question`) and the terminal
// entity collections, returns `{ lat, lng, anchorType, anchorEntity, anchorLabel }`
// or `null` if nothing in the corpus matches.

const COUNTRY_CENTROIDS = {
  USA: { lat: 39.8, lng: -98.6 },
  Iran: { lat: 32.4, lng: 53.7 },
  China: { lat: 35.9, lng: 104.2 },
  Russia: { lat: 61.5, lng: 105.3 },
  France: { lat: 46.6, lng: 1.9 },
  UK: { lat: 55.4, lng: -3.4 },
  Japan: { lat: 36.2, lng: 138.3 },
  "South Korea": { lat: 35.9, lng: 127.8 },
  Canada: { lat: 56.1, lng: -106.3 },
  "North Korea": { lat: 40.3, lng: 127.5 },
  Finland: { lat: 64.9, lng: 26.0 },
  Germany: { lat: 51.2, lng: 10.4 },
  Ukraine: { lat: 48.4, lng: 31.2 },
  Sweden: { lat: 60.1, lng: 18.6 },
  Spain: { lat: 40.5, lng: -3.7 },
  India: { lat: 20.6, lng: 78.96 },
};

// Country alias map -> canonical key in COUNTRY_CENTROIDS.
const COUNTRY_ALIASES = {
  iran: "Iran",
  iranian: "Iran",
  us: "USA",
  usa: "USA",
  "united states": "USA",
  american: "USA",
  uk: "UK",
  britain: "UK",
  british: "UK",
  "united kingdom": "UK",
  england: "UK",
  china: "China",
  chinese: "China",
  japan: "Japan",
  japanese: "Japan",
  "s korea": "South Korea",
  "south korea": "South Korea",
  korea: "South Korea",
  korean: "South Korea",
  "north korea": "North Korea",
  dprk: "North Korea",
  russia: "Russia",
  russian: "Russia",
  france: "France",
  french: "France",
  canada: "Canada",
  canadian: "Canada",
  finland: "Finland",
  finnish: "Finland",
  germany: "Germany",
  german: "Germany",
  ukraine: "Ukraine",
  ukrainian: "Ukraine",
  sweden: "Sweden",
  spain: "Spain",
  india: "India",
};

// Special-case plant/project keywords with explicit anchor coordinates.
// Some have their own coords (precise plant), others fall back to a country centroid.
const PLANT_KEYWORDS = [
  { keys: ["vogtle"], label: "Vogtle • USA", lat: 33.14, lng: -81.76, country: "USA" },
  { keys: ["indian point"], label: "Indian Point • USA", lat: 41.27, lng: -73.95, country: "USA" },
  { keys: ["diablo canyon"], label: "Diablo Canyon • USA", lat: 35.21, lng: -120.85, country: "USA" },
  { keys: ["three mile island", "crane clean energy"], label: "Three Mile Island • USA", lat: 40.15, lng: -76.72, country: "USA" },
  { keys: ["calvert cliffs"], label: "Calvert Cliffs • USA", lat: 38.43, lng: -76.44, country: "USA" },
  { keys: ["comanche peak"], label: "Comanche Peak • USA", lat: 32.30, lng: -97.79, country: "USA" },
  { keys: ["palo verde"], label: "Palo Verde • USA", lat: 33.39, lng: -112.86, country: "USA" },
  { keys: ["hinkley point"], label: "Hinkley Point • UK", lat: 51.21, lng: -3.13, country: "UK" },
  { keys: ["sizewell"], label: "Sizewell • UK", lat: 52.21, lng: 1.62, country: "UK" },
  { keys: ["flamanville"], label: "Flamanville • France", lat: 49.54, lng: -1.88, country: "France" },
  { keys: ["olkiluoto"], label: "Olkiluoto • Finland", lat: 61.24, lng: 21.44, country: "Finland" },
  { keys: ["bushehr"], label: "Bushehr • Iran", lat: 28.83, lng: 50.89, country: "Iran" },
  { keys: ["yongbyon"], label: "Yongbyon • North Korea", lat: 39.79, lng: 125.75, country: "North Korea" },
  // OKLO project → Idaho National Lab area when no specific plant call out.
  { keys: ["idaho national lab", "idaho nat"], label: "Idaho National Lab • USA", lat: 43.52, lng: -112.05, country: "USA" },
];

// Tickers we monitor with their primary country.
const TICKER_COUNTRY = {
  CCJ: "Canada",
  NXE: "Canada",
  DNN: "Canada",
  UEC: "USA",
  OKLO: "USA",
  LEU: "USA",
  SMR: "USA",
  CEG: "USA",
  VST: "USA",
  UUUU: "USA",
  NNE: "USA",
  GEV: "USA",
};

// OKLO short-name → Idaho National Lab (the company doesn't yet have a plant).
const TICKER_PLANT_OVERRIDE = {
  OKLO: { label: "Oklo (INL) • USA", lat: 43.52, lng: -112.05, country: "USA" },
};

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsWord(haystack, needle) {
  if (!needle) return false;
  const re = new RegExp(`(?:^|\\s)${needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`);
  return re.test(haystack);
}

export function inferMarketAnchor(market, { plants = [], countries = [], companies = [] } = {}) {
  if (!market?.question) return null;
  const raw = String(market.question);
  const text = ` ${tokenize(raw)} `;
  const upper = raw.toUpperCase();

  // 1. Plant keyword match (highest specificity).
  for (const entry of PLANT_KEYWORDS) {
    for (const key of entry.keys) {
      if (text.includes(` ${key} `)) {
        return {
          lat: entry.lat,
          lng: entry.lng,
          anchorType: "plant",
          anchorEntity: { name: entry.keys[0], country: entry.country },
          anchorLabel: entry.label,
        };
      }
    }
  }

  // 2. Match against actual plant names from the corpus.
  for (const plant of plants) {
    const name = plant?.name;
    if (!name || name.length < 5) continue;
    const tokenName = tokenize(name);
    if (tokenName && text.includes(` ${tokenName} `)) {
      return {
        lat: plant.lat,
        lng: plant.lng,
        anchorType: "plant",
        anchorEntity: plant,
        anchorLabel: `${plant.name} • ${plant.country}`,
      };
    }
  }

  // 3. Ticker match (word-boundary on uppercase).
  for (const ticker of Object.keys(TICKER_COUNTRY)) {
    const re = new RegExp(`(?:^|[^A-Z])${ticker}(?:[^A-Z]|$)`);
    if (re.test(` ${upper} `)) {
      const override = TICKER_PLANT_OVERRIDE[ticker];
      if (override) {
        return {
          lat: override.lat,
          lng: override.lng,
          anchorType: "plant",
          anchorEntity: { name: ticker, country: override.country },
          anchorLabel: override.label,
        };
      }
      const country = TICKER_COUNTRY[ticker];
      const centroid = COUNTRY_CENTROIDS[country];
      if (centroid) {
        const company = companies.find((c) => c?.ticker === ticker);
        return {
          lat: centroid.lat,
          lng: centroid.lng,
          anchorType: "company",
          anchorEntity: company || { ticker, country },
          anchorLabel: `${ticker} • ${country}`,
        };
      }
    }
  }

  // 4. Company short-name match.
  for (const company of companies) {
    const name = company?.name;
    if (!name) continue;
    const head = String(name).split(/[\s,]/)[0]?.toLowerCase();
    if (head && head.length >= 4 && containsWord(text, head)) {
      const country = company.countries?.[0] || company.country;
      const centroid = country ? COUNTRY_CENTROIDS[country] : null;
      if (centroid) {
        return {
          lat: centroid.lat,
          lng: centroid.lng,
          anchorType: "company",
          anchorEntity: company,
          anchorLabel: `${name} • ${country}`,
        };
      }
    }
  }

  // 5. Country alias match.
  for (const [alias, canonical] of Object.entries(COUNTRY_ALIASES)) {
    if (text.includes(` ${alias} `)) {
      const centroid = COUNTRY_CENTROIDS[canonical];
      if (centroid) {
        const countryEntity = countries.find((c) => c?.country === canonical);
        return {
          lat: centroid.lat,
          lng: centroid.lng,
          anchorType: "country",
          anchorEntity: countryEntity || { country: canonical },
          anchorLabel: canonical,
        };
      }
    }
  }

  // 6. Country corpus by name.
  for (const country of countries) {
    const name = country?.country;
    if (!name) continue;
    if (text.includes(` ${name.toLowerCase()} `)) {
      const centroid = COUNTRY_CENTROIDS[name];
      if (centroid) {
        return {
          lat: centroid.lat,
          lng: centroid.lng,
          anchorType: "country",
          anchorEntity: country,
          anchorLabel: name,
        };
      }
    }
  }

  return null;
}

export { COUNTRY_CENTROIDS };
