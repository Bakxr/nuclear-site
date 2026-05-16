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
  UAE: { lat: 23.42, lng: 53.85 },
  Turkey: { lat: 38.96, lng: 35.24 },
  Belarus: { lat: 53.71, lng: 27.95 },
  Bangladesh: { lat: 23.68, lng: 90.36 },
  Poland: { lat: 51.92, lng: 19.13 },
  "Czech Rep.": { lat: 49.82, lng: 15.47 },
  Belgium: { lat: 50.50, lng: 4.47 },
  Hungary: { lat: 47.16, lng: 19.50 },
  Romania: { lat: 45.94, lng: 24.97 },
  Bulgaria: { lat: 42.73, lng: 25.49 },
  Slovakia: { lat: 48.67, lng: 19.70 },
  Switzerland: { lat: 46.82, lng: 8.23 },
  Brazil: { lat: -14.24, lng: -51.92 },
  Argentina: { lat: -38.42, lng: -63.62 },
  "Saudi Arabia": { lat: 23.89, lng: 45.08 },
  Egypt: { lat: 26.82, lng: 30.80 },
  Israel: { lat: 31.05, lng: 34.85 },
  Pakistan: { lat: 30.38, lng: 69.35 },
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
  indian: "India",
  uae: "UAE",
  emirates: "UAE",
  emirati: "UAE",
  "united arab emirates": "UAE",
  turkey: "Turkey",
  turkish: "Turkey",
  belarus: "Belarus",
  belarusian: "Belarus",
  bangladesh: "Bangladesh",
  poland: "Poland",
  polish: "Poland",
  czech: "Czech Rep.",
  czechia: "Czech Rep.",
  "czech republic": "Czech Rep.",
  belgium: "Belgium",
  belgian: "Belgium",
  hungary: "Hungary",
  hungarian: "Hungary",
  romania: "Romania",
  romanian: "Romania",
  bulgaria: "Bulgaria",
  bulgarian: "Bulgaria",
  slovakia: "Slovakia",
  slovak: "Slovakia",
  switzerland: "Switzerland",
  swiss: "Switzerland",
  brazil: "Brazil",
  brazilian: "Brazil",
  argentina: "Argentina",
  argentine: "Argentina",
  "saudi arabia": "Saudi Arabia",
  saudi: "Saudi Arabia",
  egypt: "Egypt",
  egyptian: "Egypt",
  israel: "Israel",
  israeli: "Israel",
  pakistan: "Pakistan",
  pakistani: "Pakistan",
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
  // Highest-traffic geopolitics / accident markets.
  { keys: ["zaporizhzhia", "zaporizhzhya", "zaporozhye", "znpp"], label: "Zaporizhzhia • Ukraine", lat: 47.51, lng: 34.59, country: "Ukraine" },
  { keys: ["chernobyl", "chornobyl"], label: "Chernobyl • Ukraine", lat: 51.39, lng: 30.10, country: "Ukraine" },
  { keys: ["fukushima", "fukushima daiichi"], label: "Fukushima Daiichi • Japan", lat: 37.42, lng: 141.03, country: "Japan" },
  { keys: ["kashiwazaki", "kashiwazaki-kariwa", "kariwa"], label: "Kashiwazaki-Kariwa • Japan", lat: 37.43, lng: 138.60, country: "Japan" },
  { keys: ["barakah"], label: "Barakah • UAE", lat: 23.96, lng: 52.20, country: "UAE" },
  { keys: ["akkuyu"], label: "Akkuyu • Turkey", lat: 36.14, lng: 33.54, country: "Turkey" },
  { keys: ["rooppur"], label: "Rooppur • Bangladesh", lat: 24.06, lng: 89.04, country: "Bangladesh" },
  { keys: ["el dabaa", "el-dabaa", "dabaa"], label: "El Dabaa • Egypt", lat: 31.03, lng: 28.45, country: "Egypt" },
  { keys: ["dukovany"], label: "Dukovany • Czech Rep.", lat: 49.09, lng: 16.13, country: "Czech Rep." },
  { keys: ["temelin", "temelín"], label: "Temelin • Czech Rep.", lat: 49.18, lng: 14.38, country: "Czech Rep." },
  { keys: ["paks"], label: "Paks • Hungary", lat: 46.57, lng: 18.85, country: "Hungary" },
  { keys: ["mochovce"], label: "Mochovce • Slovakia", lat: 48.26, lng: 18.46, country: "Slovakia" },
  { keys: ["cernavoda", "cernavodă"], label: "Cernavoda • Romania", lat: 44.32, lng: 28.06, country: "Romania" },
  { keys: ["kozloduy"], label: "Kozloduy • Bulgaria", lat: 43.74, lng: 23.77, country: "Bulgaria" },
  { keys: ["doel"], label: "Doel • Belgium", lat: 51.32, lng: 4.26, country: "Belgium" },
  { keys: ["tihange"], label: "Tihange • Belgium", lat: 50.53, lng: 5.27, country: "Belgium" },
  { keys: ["ringhals"], label: "Ringhals • Sweden", lat: 57.26, lng: 12.11, country: "Sweden" },
  { keys: ["forsmark"], label: "Forsmark • Sweden", lat: 60.40, lng: 18.17, country: "Sweden" },
  { keys: ["natanz"], label: "Natanz • Iran", lat: 33.72, lng: 51.73, country: "Iran" },
  { keys: ["fordow", "fordo"], label: "Fordow • Iran", lat: 34.88, lng: 50.99, country: "Iran" },
  { keys: ["arak"], label: "Arak • Iran", lat: 34.09, lng: 49.69, country: "Iran" },
  { keys: ["punggye-ri", "punggye ri", "punggyeri"], label: "Punggye-ri • North Korea", lat: 41.28, lng: 129.08, country: "North Korea" },
  { keys: ["palisades"], label: "Palisades • USA", lat: 42.32, lng: -86.31, country: "USA" },
  { keys: ["duane arnold"], label: "Duane Arnold • USA", lat: 42.10, lng: -91.78, country: "USA" },
  { keys: ["watts bar"], label: "Watts Bar • USA", lat: 35.60, lng: -84.79, country: "USA" },
  { keys: ["seabrook"], label: "Seabrook • USA", lat: 42.90, lng: -70.85, country: "USA" },
  { keys: ["kursk"], label: "Kursk NPP • Russia", lat: 51.67, lng: 35.60, country: "Russia" },
  { keys: ["leningrad npp", "sosnovy bor"], label: "Leningrad NPP • Russia", lat: 59.85, lng: 29.07, country: "Russia" },
  { keys: ["kudankulam"], label: "Kudankulam • India", lat: 8.17, lng: 77.71, country: "India" },
  { keys: ["chashma"], label: "Chashma • Pakistan", lat: 32.39, lng: 71.45, country: "Pakistan" },
  { keys: ["dimona"], label: "Dimona • Israel", lat: 31.00, lng: 35.14, country: "Israel" },
  { keys: ["shin kori", "shin-kori"], label: "Shin Kori • South Korea", lat: 35.32, lng: 129.30, country: "South Korea" },
  { keys: ["hanul", "hanbit"], label: "Hanul/Hanbit • South Korea", lat: 36.42, lng: 129.39, country: "South Korea" },
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
