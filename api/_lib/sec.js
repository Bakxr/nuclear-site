const COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SUBMISSIONS_URL = "https://data.sec.gov/submissions";
const COMPANY_MAP_CACHE_MS = 24 * 60 * 60 * 1000;
const FILINGS_CACHE_MS = 15 * 60 * 1000;

const secCache = globalThis.__npSecCache ?? {
  companyMap: null,
  companyMapAt: 0,
  filings: new Map(),
};
globalThis.__npSecCache = secCache;

const IMPORTANT_FORMS = [
  "8-K",
  "10-K",
  "10-Q",
  "20-F",
  "6-K",
  "S-1",
  "F-1",
  "424B3",
  "SC 13D",
  "SC 13G",
  "DEF 14A",
];

function getUserAgent() {
  return process.env.SEC_USER_AGENT || "NuclearPulseBot admin@atomic-energy.vercel.app";
}

function normalizeTicker(value = "") {
  return String(value || "").trim().toUpperCase();
}

function padCik(value) {
  return String(value || "").replace(/\D/g, "").padStart(10, "0");
}

function buildDocumentUrl(cik, accessionNumber, primaryDocument) {
  if (!cik || !accessionNumber || !primaryDocument) return "";
  const accessionPath = accessionNumber.replace(/-/g, "");
  const numericCik = String(Number(cik));
  return `https://www.sec.gov/Archives/edgar/data/${numericCik}/${accessionPath}/${primaryDocument}`;
}

function summarizeForm(form = "") {
  if (form === "8-K") return "Current report";
  if (form === "10-K" || form === "20-F") return "Annual filing";
  if (form === "10-Q" || form === "6-K") return "Quarterly or foreign interim filing";
  if (form === "DEF 14A") return "Proxy filing";
  if (form === "SC 13D" || form === "SC 13G") return "Ownership disclosure";
  if (form === "S-1" || form === "F-1" || form === "424B3") return "Capital markets filing";
  return "SEC filing";
}

function inferPriority(form = "") {
  if (form === "8-K") return 5;
  if (form === "10-K" || form === "20-F") return 4;
  if (form === "10-Q" || form === "6-K") return 3;
  if (form === "S-1" || form === "F-1" || form === "424B3") return 3;
  if (form === "SC 13D" || form === "SC 13G") return 2;
  return 1;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "accept-encoding": "gzip, deflate",
      "user-agent": getUserAgent(),
    },
  });

  if (!response.ok) {
    throw new Error(`SEC request failed with ${response.status}`);
  }

  return response.json();
}

async function getCompanyTickerMap() {
  if (secCache.companyMap && Date.now() - secCache.companyMapAt < COMPANY_MAP_CACHE_MS) {
    return secCache.companyMap;
  }

  const payload = await fetchJson(COMPANY_TICKERS_URL);
  const map = new Map(
    Object.values(payload || {}).map((entry) => [
      normalizeTicker(entry.ticker),
      {
        ticker: normalizeTicker(entry.ticker),
        cik: padCik(entry.cik_str),
        name: entry.title,
      },
    ]),
  );

  secCache.companyMap = map;
  secCache.companyMapAt = Date.now();
  return map;
}

async function getCompanySubmissions(cik) {
  const cacheKey = `submissions:${cik}`;
  const cached = secCache.filings.get(cacheKey);
  if (cached && Date.now() - cached.at < FILINGS_CACHE_MS) {
    return cached.payload;
  }

  const payload = await fetchJson(`${SUBMISSIONS_URL}/CIK${cik}.json`);
  secCache.filings.set(cacheKey, { payload, at: Date.now() });
  return payload;
}

function collectRecentFilings(submissions, ticker, fallbackName) {
  const recent = submissions?.filings?.recent;
  if (!recent?.form || !Array.isArray(recent.form)) return [];

  const forms = recent.form;
  const filingDates = recent.filingDate || [];
  const accessionNumbers = recent.accessionNumber || [];
  const primaryDocuments = recent.primaryDocument || [];

  return forms
    .map((form, index) => ({
      ticker,
      companyName: submissions?.name || fallbackName,
      form,
      filingDate: filingDates[index] || null,
      accessionNumber: accessionNumbers[index] || null,
      primaryDocument: primaryDocuments[index] || null,
      url: buildDocumentUrl(submissions?.cik, accessionNumbers[index], primaryDocuments[index]),
      summary: summarizeForm(form),
      priority: inferPriority(form),
    }))
    .filter((item) => IMPORTANT_FORMS.includes(item.form))
    .filter((item) => item.filingDate)
    .slice(0, 8);
}

export async function fetchLatestCompanyFilings(stocks = []) {
  const tickerMap = await getCompanyTickerMap();
  const filings = [];

  for (const stock of stocks) {
    const ticker = normalizeTicker(stock.ticker);
    const company = tickerMap.get(ticker);
    if (!company?.cik) continue;

    try {
      const submissions = await getCompanySubmissions(company.cik);
      filings.push(...collectRecentFilings(submissions, ticker, stock.name));
    } catch {
      // Ignore individual company failures so the rest of the filings panel still renders.
    }

    await new Promise((resolve) => setTimeout(resolve, 140));
  }

  return filings
    .sort((left, right) => {
      const leftDate = new Date(left.filingDate || 0).getTime();
      const rightDate = new Date(right.filingDate || 0).getTime();
      if (leftDate !== rightDate) return rightDate - leftDate;
      return right.priority - left.priority;
    })
    .slice(0, 18);
}
