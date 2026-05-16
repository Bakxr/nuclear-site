import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const CACHE_KEY = "earnings_8k_v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

const COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SUBMISSIONS_URL = "https://data.sec.gov/submissions";

const inMemory = globalThis.__npEarningsCache ?? { tickerMap: null, tickerMapAt: 0 };
globalThis.__npEarningsCache = inMemory;
const TICKER_MAP_TTL = 24 * 60 * 60 * 1000;

const TRACKED_8K_ITEMS = new Set(["1.01", "2.02", "5.02", "7.01", "8.01"]);

function getUserAgent() {
  return process.env.SEC_USER_AGENT || "NuclearPulseBot admin@atomic-energy.vercel.app";
}

function padCik(value) {
  return String(value || "").replace(/\D/g, "").padStart(10, "0");
}

function normalizeTicker(value = "") {
  return String(value || "").trim().toUpperCase();
}

async function fetchJson(url) {
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
  const payload = await fetchJson(COMPANY_TICKERS_URL);
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

function describeItem(item) {
  if (item === "1.01") return "Material Definitive Agreement";
  if (item === "2.02") return "Results of Operations (earnings)";
  if (item === "5.02") return "Officer/Director Departure";
  if (item === "7.01") return "Regulation FD Disclosure";
  if (item === "8.01") return "Other Events";
  return "Material Event";
}

/**
 * Parse the recent submissions for 10-Q dates and 8-K item codes.
 * Exported for testing.
 */
export function buildEntriesFromSubmissions(submissions, ticker, companyName) {
  const recent = submissions?.filings?.recent;
  const out = { tenQDates: [], events: [] };
  if (!recent?.form || !Array.isArray(recent.form)) return out;

  const forms = recent.form;
  const dates = recent.filingDate || [];
  const accessions = recent.accessionNumber || [];
  const primaryDocs = recent.primaryDocument || [];
  const items = recent.items || [];
  const cik = submissions?.cik;

  for (let i = 0; i < forms.length; i += 1) {
    const form = forms[i];
    if (form === "10-Q" || form === "10-K") {
      if (dates[i]) out.tenQDates.push({ form, date: dates[i] });
    }
    if (form !== "8-K") continue;
    const itemsRaw = items[i] || "";
    const codes = String(itemsRaw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const code of codes) {
      if (!TRACKED_8K_ITEMS.has(code)) continue;
      out.events.push({
        id: `event:${ticker}-${accessions[i]}-${code}`,
        entityType: "materialEvent",
        ticker,
        companyName,
        item: code,
        summary: describeItem(code),
        filedAt: dates[i] || null,
        url: buildDocUrl(cik, accessions[i], primaryDocs[i]),
      });
    }
  }
  return out;
}

function estimateNext(tenQDates) {
  if (!tenQDates.length) return null;
  const sorted = [...tenQDates].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const last = sorted[0];
  if (sorted.length < 2) {
    // assume quarterly
    const next = new Date(last.date);
    next.setDate(next.getDate() + 91);
    return { lastReported: last.date, lastForm: last.form, estimatedNext: next.toISOString().slice(0, 10) };
  }
  const gaps = [];
  for (let i = 0; i < sorted.length - 1 && i < 4; i += 1) {
    gaps.push(
      (new Date(sorted[i].date).getTime() - new Date(sorted[i + 1].date).getTime()) /
        (24 * 60 * 60 * 1000),
    );
  }
  const avg = gaps.reduce((acc, g) => acc + g, 0) / gaps.length;
  const next = new Date(last.date);
  next.setDate(next.getDate() + Math.round(avg));
  return { lastReported: last.date, lastForm: last.form, estimatedNext: next.toISOString().slice(0, 10) };
}

/**
 * Build the earnings calendar (next quarterly estimate per ticker) + 8-K material
 * events list. Returns { calendar, events }.
 */
export async function fetchEarningsAndEvents(stocks = []) {
  const cached = await readTerminalCache(CACHE_KEY);
  if (cached?.payload && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
    return cached.payload;
  }

  let tickerMap;
  try {
    tickerMap = await getTickerMap();
  } catch (error) {
    console.warn("[earnings] ticker map failed:", error?.message || error);
    return cached?.payload || { calendar: [], events: [] };
  }

  const calendar = [];
  const events = [];

  for (const stock of stocks) {
    const ticker = normalizeTicker(stock.ticker);
    const company = tickerMap.get(ticker);
    if (!company?.cik) continue;
    try {
      const submissions = await fetchJson(`${SUBMISSIONS_URL}/CIK${company.cik}.json`);
      const { tenQDates, events: rows } = buildEntriesFromSubmissions(submissions, ticker, stock.name || company.name);
      const est = estimateNext(tenQDates);
      const recent = submissions?.filings?.recent;
      const lastFilingUrl = recent?.accessionNumber?.[0]
        ? buildDocUrl(submissions?.cik, recent.accessionNumber[0], recent.primaryDocument?.[0])
        : "";
      calendar.push({
        id: `earn:${ticker}`,
        entityType: "earningsCalendar",
        ticker,
        companyName: stock.name || company.name,
        lastReported: est?.lastReported || null,
        lastForm: est?.lastForm || null,
        estimatedNext: est?.estimatedNext || null,
        lastFilingUrl,
      });
      events.push(...rows);
    } catch (error) {
      console.warn(`[earnings] ${ticker}:`, error?.message || error);
    }
    await new Promise((r) => setTimeout(r, 140));
  }

  const sortedEvents = events
    .filter((e) => e.filedAt)
    .sort((a, b) => new Date(b.filedAt).getTime() - new Date(a.filedAt).getTime())
    .slice(0, 40);

  const payload = { calendar, events: sortedEvents };
  await writeTerminalCache(CACHE_KEY, payload);
  return payload;
}
