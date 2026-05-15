import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const CACHE_KEY = "iaea_pris_summary_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

const OPERATING_URL =
  "https://pris.iaea.org/PRIS/WorldStatistics/OperationalReactorsByCountry.aspx";
const UNDER_CONSTRUCTION_URL =
  "https://pris.iaea.org/PRIS/WorldStatistics/UnderConstructionReactorsByCountry.aspx";

const USER_AGENT = "NuclearPulseBot/1.0 (+https://atomic-energy.vercel.app)";

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": USER_AGENT,
      },
    });
    if (!res.ok) throw new Error(`pris:${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseInteger(value) {
  const cleaned = String(value || "").replace(/[^0-9-]/g, "");
  if (!cleaned) return null;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse the country rows from a PRIS by-country table. Each <tr> has the country
 * link, a capacity cell, then a reactor-count cell.
 */
function parseCountryRows(html) {
  const rowRe = /<a id="MainContent_MainContent_ucReport_rptReport_hypCountry_\d+"[^>]*>([^<]+)<\/a>([\s\S]*?)<\/tr>/g;
  const countries = [];
  let match;
  while ((match = rowRe.exec(html)) !== null) {
    const country = match[1].trim();
    const tail = match[2];
    const nums = [...tail.matchAll(/<td[^>]*>\s*([0-9,]+)\s*<\/td>/g)].map((m) => parseInteger(m[1]));
    if (!country || nums.length < 2) continue;
    countries.push({
      country,
      capacityMw: nums[0],
      reactors: nums[1],
    });
  }
  return countries;
}

function parseTotalReactors(html) {
  const match = html.match(/lblTotalReactor[^>]*>\s*([0-9,]+)\s*<\/span>/);
  return match ? parseInteger(match[1]) : null;
}

function parseLastUpdate(html) {
  const match = html.match(/Last update on\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  return match ? match[1] : null;
}

function parseSuspendedTotal(html) {
  // Second occurrence of the total span (under the "Suspended Operation" table).
  const matches = [...html.matchAll(/lblTotalReactor[^>]*>\s*([0-9,]+)\s*<\/span>/g)];
  if (matches.length < 2) return null;
  return parseInteger(matches[1][1]);
}

async function buildSummary() {
  const [opHtml, ucHtml] = await Promise.all([
    fetchWithTimeout(OPERATING_URL),
    fetchWithTimeout(UNDER_CONSTRUCTION_URL),
  ]);

  const operatingTotal = parseTotalReactors(opHtml);
  const longTermShutdown = parseSuspendedTotal(opHtml);
  const underConstruction = parseTotalReactors(ucHtml);

  const opCountries = parseCountryRows(opHtml);
  const ucCountries = parseCountryRows(ucHtml);
  const ucByCountry = new Map(ucCountries.map((row) => [row.country, row.reactors]));

  const countries = opCountries
    .map((row) => ({
      country: row.country,
      operating: row.reactors,
      capacityMw: row.capacityMw,
      underConstruction: ucByCountry.get(row.country) || 0,
    }))
    .sort((a, b) => (b.operating || 0) - (a.operating || 0));

  if (!operatingTotal || !underConstruction) {
    throw new Error("pris:parse:totals-missing");
  }

  return {
    operatingTotal,
    underConstruction,
    longTermShutdown: longTermShutdown || 0,
    countriesOperating: countries.filter((c) => (c.operating || 0) > 0).length,
    countriesBuilding: ucCountries.length,
    countries,
    asOf: parseLastUpdate(opHtml) || new Date().toISOString().slice(0, 10),
    source: "IAEA PRIS",
    sourceUrl: OPERATING_URL,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchIaeaReactorSummary({ force = false } = {}) {
  const cached = await readTerminalCache(CACHE_KEY);
  if (!force && cached?.payload && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
    return { ...cached.payload, stale: false };
  }

  try {
    const summary = await buildSummary();
    await writeTerminalCache(CACHE_KEY, summary);
    return { ...summary, stale: false };
  } catch (error) {
    console.warn("[iaea] fetch failed:", error?.message || error);
    if (cached?.payload) return { ...cached.payload, stale: true };
    return null;
  }
}
