import { getSubmissions, getTickerMap, mapWithConcurrency, normalizeTicker, secFilers } from "./secClient.js";

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
  const tickerMap = await getTickerMap();
  const perCompany = await mapWithConcurrency(secFilers(stocks), 4, async (stock) => {
    const ticker = normalizeTicker(stock.ticker);
    const company = tickerMap.get(ticker);
    if (!company?.cik) return [];
    try {
      return collectRecentFilings(await getSubmissions(company.cik), ticker, stock.name);
    } catch {
      // Ignore individual company failures so the rest of the filings panel still renders.
      return [];
    }
  });
  const filings = perCompany.flat();

  return filings
    .sort((left, right) => {
      const leftDate = new Date(left.filingDate || 0).getTime();
      const rightDate = new Date(right.filingDate || 0).getTime();
      if (leftDate !== rightDate) return rightDate - leftDate;
      return right.priority - left.priority;
    })
    .slice(0, 30);
}
