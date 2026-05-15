import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const CACHE_KEY = "sec_insider_form4_v1";
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

const COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SUBMISSIONS_URL = "https://data.sec.gov/submissions";
const MAX_PER_TICKER = 5;
const MAX_TOTAL = 30;

const inMemory = globalThis.__npSecInsiderCache ?? { tickerMap: null, tickerMapAt: 0 };
globalThis.__npSecInsiderCache = inMemory;
const TICKER_MAP_TTL = 24 * 60 * 60 * 1000;

function getUserAgent() {
  return process.env.SEC_USER_AGENT || "NuclearPulseBot admin@atomic-energy.vercel.app";
}

function padCik(value) {
  return String(value || "").replace(/\D/g, "").padStart(10, "0");
}

function normalizeTicker(value = "") {
  return String(value || "").trim().toUpperCase();
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "accept-encoding": "gzip, deflate",
        "user-agent": getUserAgent(),
      },
    });
    if (!res.ok) throw new Error(`sec:${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getTickerMap() {
  if (inMemory.tickerMap && Date.now() - inMemory.tickerMapAt < TICKER_MAP_TTL) {
    return inMemory.tickerMap;
  }
  const payload = await fetchWithTimeout(COMPANY_TICKERS_URL);
  const map = new Map(
    Object.values(payload || {}).map((entry) => [
      normalizeTicker(entry.ticker),
      { cik: padCik(entry.cik_str), name: entry.title },
    ]),
  );
  inMemory.tickerMap = map;
  inMemory.tickerMapAt = Date.now();
  return map;
}

function buildDocUrl(cik, accession, primaryDoc) {
  if (!cik || !accession || !primaryDoc) return "";
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replace(/-/g, "")}/${primaryDoc}`;
}

function collectForm4(submissions, ticker, companyName) {
  const recent = submissions?.filings?.recent;
  if (!recent?.form || !Array.isArray(recent.form)) return [];

  const forms = recent.form;
  const out = [];
  for (let i = 0; i < forms.length && out.length < MAX_PER_TICKER; i += 1) {
    if (forms[i] !== "4" && forms[i] !== "4/A") continue;
    const accession = recent.accessionNumber?.[i] || null;
    const date = recent.filingDate?.[i] || null;
    const primaryDoc = recent.primaryDocument?.[i] || null;
    const filer = recent.reportingOwner?.[i] || null;
    out.push({
      ticker,
      companyName,
      form: forms[i],
      filer,
      transactionType: null,
      shares: null,
      value: null,
      date,
      accessionNumber: accession,
      url: buildDocUrl(submissions?.cik, accession, primaryDoc),
    });
  }
  return out;
}

/**
 * Fetch recent Form 4 insider transactions for tracked tickers.
 * Returns an array of { ticker, companyName, filer, transactionType, shares, value, date, url }.
 */
export async function fetchInsiderForm4(stocks = []) {
  const cached = await readTerminalCache(CACHE_KEY);
  if (cached?.payload && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
    return cached.payload;
  }

  let tickerMap;
  try {
    tickerMap = await getTickerMap();
  } catch (error) {
    console.warn("[sec/insider] ticker map fetch failed:", error?.message || error);
    return cached?.payload || [];
  }

  const all = [];
  for (const stock of stocks) {
    const ticker = normalizeTicker(stock.ticker);
    const company = tickerMap.get(ticker);
    if (!company?.cik) continue;
    try {
      const submissions = await fetchWithTimeout(`${SUBMISSIONS_URL}/CIK${company.cik}.json`);
      all.push(...collectForm4(submissions, ticker, stock.name || company.name));
    } catch (error) {
      console.warn(`[sec/insider] ${ticker} failed:`, error?.message || error);
    }
    await new Promise((resolve) => setTimeout(resolve, 140));
  }

  const sorted = all
    .filter((row) => row.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_TOTAL);

  await writeTerminalCache(CACHE_KEY, sorted);
  return sorted;
}
