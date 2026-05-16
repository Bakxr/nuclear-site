import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const CACHE_KEY = "sec_insider_form4_v2";
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const FILING_CACHE_KEY = "sec_insider_form4_doc_v1";
const FILING_TTL_MS = 4 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

const COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SUBMISSIONS_URL = "https://data.sec.gov/submissions";
const MAX_PER_TICKER = 10;
const MAX_TOTAL = 50;

const inMemory = globalThis.__npSecInsiderCache ?? { tickerMap: null, tickerMapAt: 0, docs: new Map() };
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

async function fetchWithTimeout(url, { accept = "application/json" } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept,
        "accept-encoding": "gzip, deflate",
        "user-agent": getUserAgent(),
      },
    });
    if (!res.ok) throw new Error(`sec:${res.status}`);
    return accept.includes("json") ? res.json() : res.text();
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

function pickText(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

function pickValue(xml, tag) {
  // Many Form 4 fields wrap the value in <value>...</value>
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return "";
  const inner = m[1];
  const v = inner.match(/<value[^>]*>([\s\S]*?)<\/value>/i);
  return (v ? v[1] : inner).replace(/<[^>]+>/g, "").trim();
}

/**
 * Parse a Form 4 XML document for non-derivative transactions.
 * Exported for testing.
 */
export function parseForm4Xml(xml, { ticker, url } = {}) {
  if (typeof xml !== "string" || !xml.length) return [];
  const filer = pickText(xml, "rptOwnerName");
  const isDirector = /<isDirector>\s*(?:<value>)?\s*(?:1|true)\s*(?:<\/value>)?/i.test(xml);
  const isOfficer = /<isOfficer>\s*(?:<value>)?\s*(?:1|true)\s*(?:<\/value>)?/i.test(xml);
  const isTenPct = /<isTenPercentOwner>\s*(?:<value>)?\s*(?:1|true)\s*(?:<\/value>)?/i.test(xml);
  const officerTitle = pickText(xml, "officerTitle");
  const title = officerTitle || (isDirector ? "Director" : isOfficer ? "Officer" : isTenPct ? "10% Owner" : "Insider");

  const txBlockRe = /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/gi;
  const out = [];
  let m;
  while ((m = txBlockRe.exec(xml)) !== null) {
    const block = m[1];
    const date = pickValue(block, "transactionDate");
    const shares = Number(pickValue(block, "transactionShares")) || 0;
    const price = Number(pickValue(block, "transactionPricePerShare")) || 0;
    const code = pickValue(block, "transactionAcquiredDisposedCode").toUpperCase();
    if (!date || !shares) continue;
    out.push({
      ticker,
      filer,
      title,
      transactionType: code === "A" ? "buy" : code === "D" ? "sell" : "other",
      shares,
      pricePerShare: price || null,
      totalValue: price ? Math.round(shares * price * 100) / 100 : null,
      date,
      url,
    });
  }
  return out;
}

function collectForm4Filings(submissions, ticker) {
  const recent = submissions?.filings?.recent;
  if (!recent?.form || !Array.isArray(recent.form)) return [];
  const out = [];
  for (let i = 0; i < recent.form.length && out.length < MAX_PER_TICKER; i += 1) {
    if (recent.form[i] !== "4" && recent.form[i] !== "4/A") continue;
    const accession = recent.accessionNumber?.[i] || null;
    const primaryDoc = recent.primaryDocument?.[i] || null;
    const date = recent.filingDate?.[i] || null;
    if (!accession || !primaryDoc) continue;
    out.push({
      ticker,
      accession,
      filingDate: date,
      url: buildDocUrl(submissions?.cik, accession, primaryDoc),
    });
  }
  return out;
}

async function fetchAndParseDoc(filing) {
  // per-doc cache (memory only — docs are immutable)
  const cached = inMemory.docs.get(filing.url);
  if (cached && Date.now() - cached.at < FILING_TTL_MS) return cached.rows;
  try {
    const xml = await fetchWithTimeout(filing.url, { accept: "application/xml,text/xml,*/*" });
    const rows = parseForm4Xml(xml, { ticker: filing.ticker, url: filing.url });
    inMemory.docs.set(filing.url, { rows, at: Date.now() });
    return rows;
  } catch (error) {
    console.warn(`[sec/insider] doc fetch failed for ${filing.url}:`, error?.message || error);
    return [];
  }
}

/**
 * Fetch recent Form 4 insider transactions across tracked tickers, parsing XML
 * for transaction-level detail. Returns an array (newest first), capped at MAX_TOTAL.
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

  // First pass: collect filing pointers across all tickers (cheap).
  const filings = [];
  for (const stock of stocks) {
    const ticker = normalizeTicker(stock.ticker);
    const company = tickerMap.get(ticker);
    if (!company?.cik) continue;
    try {
      const submissions = await fetchWithTimeout(`${SUBMISSIONS_URL}/CIK${company.cik}.json`);
      filings.push(...collectForm4Filings(submissions, ticker));
    } catch (error) {
      console.warn(`[sec/insider] submissions ${ticker}:`, error?.message || error);
    }
    await new Promise((r) => setTimeout(r, 140));
  }

  filings.sort((a, b) => new Date(b.filingDate || 0).getTime() - new Date(a.filingDate || 0).getTime());

  // Second pass: fetch XML & parse, stopping once we hit MAX_TOTAL transactions.
  const all = [];
  for (const filing of filings) {
    if (all.length >= MAX_TOTAL) break;
    const rows = await fetchAndParseDoc(filing);
    all.push(...rows);
    await new Promise((r) => setTimeout(r, 90));
  }

  const sorted = all
    .filter((row) => row.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_TOTAL)
    .map((row, index) => ({
      id: `insider:${row.ticker}-${row.date}-${index}`,
      entityType: "insiderTrade",
      ...row,
    }));

  // Tag cache key (keyed v2 so stale shape gets replaced)
  void FILING_CACHE_KEY;
  await writeTerminalCache(CACHE_KEY, sorted);
  return sorted;
}
