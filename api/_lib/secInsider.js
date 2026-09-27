import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";
import { getSubmissions, getTickerMap, mapWithConcurrency, normalizeTicker, secFetch, secFilers } from "./secClient.js";

const CACHE_KEY = "sec_insider_form4_v4";
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const FILING_CACHE_KEY = "sec_insider_form4_doc_v1";
const FILING_TTL_MS = 4 * 60 * 60 * 1000;

const MAX_PER_TICKER = 10;
const MAX_TOTAL = 60;

const inMemory = globalThis.__npSecInsiderCache ?? { docs: new Map() };
globalThis.__npSecInsiderCache = inMemory;






function buildDocUrl(cik, accession, primaryDoc) {
  if (!cik || !accession || !primaryDoc) return "";
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replace(/-/g, "")}/${primaryDoc}`;
}

// SEC Form 4 transaction codes → what the row actually represents. Only P
// and S are open-market trades; A/M/F/G etc. are grants, exercises and
// withholding, which must not be presented as buying or selling.
const TRANSACTION_CODES = {
  P: { type: "buy", label: "Open-market buy" },
  S: { type: "sell", label: "Open-market sale" },
  A: { type: "grant", label: "Grant / award" },
  M: { type: "exercise", label: "Option exercise" },
  X: { type: "exercise", label: "Option exercise" },
  C: { type: "exercise", label: "Conversion" },
  F: { type: "tax", label: "Tax withholding" },
  G: { type: "gift", label: "Gift" },
  D: { type: "sell", label: "Disposition to issuer" },
};

function decodeXml(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function pickText(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? decodeXml(m[1].replace(/<[^>]+>/g, "").trim()) : "";
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
    const direction = pickValue(block, "transactionAcquiredDisposedCode").toUpperCase();
    const code = pickText(block, "transactionCode").toUpperCase();
    if (!date || !shares) continue;
    const kind = TRANSACTION_CODES[code] || { type: "other", label: direction === "A" ? "Acquired" : direction === "D" ? "Disposed" : "Other" };
    out.push({
      ticker,
      filer,
      title,
      transactionCode: code || null,
      transactionType: kind.type,
      transactionLabel: kind.label,
      direction: direction || null,
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
    // primaryDocument points at SEC's XSL-rendered HTML ("xslF345X06/…xml").
    // The machine-readable ownershipDocument lives at the same name one level
    // up; keep the rendered page as the human-facing link.
    const rawDoc = primaryDoc.replace(/^xsl[^/]+\//i, "");
    out.push({
      ticker,
      accession,
      filingDate: date,
      url: buildDocUrl(submissions?.cik, accession, primaryDoc),
      xmlUrl: buildDocUrl(submissions?.cik, accession, rawDoc),
    });
  }
  return out;
}

async function fetchAndParseDoc(filing) {
  // per-doc cache (memory only — docs are immutable)
  const docUrl = filing.xmlUrl || filing.url;
  const cached = inMemory.docs.get(docUrl);
  if (cached && Date.now() - cached.at < FILING_TTL_MS) return cached.rows;
  try {
    const xml = await secFetch(docUrl, { accept: "application/xml,text/xml,*/*" });
    const rows = parseForm4Xml(xml, { ticker: filing.ticker, url: filing.url });
    inMemory.docs.set(docUrl, { rows, at: Date.now() });
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

  // First pass: collect filing pointers across all SEC filers (shared,
  // memoised submissions fetch — see secClient.js).
  const perCompany = await mapWithConcurrency(secFilers(stocks), 4, async (stock) => {
    const ticker = normalizeTicker(stock.ticker);
    const company = tickerMap.get(ticker);
    if (!company?.cik) return [];
    try {
      return collectForm4Filings(await getSubmissions(company.cik), ticker);
    } catch (error) {
      console.warn(`[sec/insider] submissions ${ticker}:`, error?.message || error);
      return [];
    }
  });
  const filings = perCompany.flat();

  filings.sort((a, b) => new Date(b.filingDate || 0).getTime() - new Date(a.filingDate || 0).getTime());

  // Second pass: fetch XML & parse the newest filings until MAX_TOTAL rows.
  const all = [];
  for (const filing of filings) {
    if (all.length >= MAX_TOTAL) break;
    all.push(...(await fetchAndParseDoc(filing)));
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
