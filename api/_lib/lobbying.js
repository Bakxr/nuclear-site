import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const CACHE_KEY = "senate_lda_lobbying_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

const LDA_URL = "https://lda.senate.gov/api/v1/filings/";
const MAX_ITEMS = 50;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "NuclearPulseBot/1.0 (+https://atomic-energy.vercel.app)",
      },
    });
    if (!res.ok) throw new Error(`lda:${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

function currentYear() {
  return new Date().getFullYear();
}

function normalize(record) {
  const issues = Array.isArray(record.lobbying_activities)
    ? record.lobbying_activities.map((a) => a.general_issue_code_display || a.description || "").filter(Boolean).slice(0, 4)
    : [];
  const amount = record.income ? Number(record.income) : record.expenses ? Number(record.expenses) : null;
  const id = record.filing_uuid || record.url || `${record.registrant?.id}-${record.filing_year}-${record.filing_period}`;
  return {
    id: `lobby:${id}`,
    entityType: "lobbying",
    filer: record.registrant?.name || "",
    client: record.client?.name || "",
    registrant: record.registrant?.name || "",
    period: `${record.filing_year || ""} ${record.filing_period_display || record.filing_period || ""}`.trim(),
    amount,
    issues,
    filingType: record.filing_type_display || record.filing_type || "",
    postedDate: record.dt_posted || null,
    url: record.url || (record.filing_document_url || ""),
  };
}

/**
 * Fetch recent nuclear-related lobbying filings from the Senate LDA API.
 */
export async function fetchLobbyingFilings({ force = false } = {}) {
  const cached = await readTerminalCache(CACHE_KEY);
  if (!force && cached?.payload && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
    return cached.payload;
  }

  const year = currentYear();
  const url = `${LDA_URL}?filing_specific_lobbying_issues=nuclear&filing_year=${year}&ordering=-dt_posted&page_size=80`;

  let records = [];
  try {
    const payload = await fetchWithTimeout(url);
    records = Array.isArray(payload?.results) ? payload.results : [];
  } catch (error) {
    console.warn("[lobbying] fetch failed:", error?.message || error);
    return cached?.payload || [];
  }

  const items = records
    .map(normalize)
    .sort((a, b) => new Date(b.postedDate || 0).getTime() - new Date(a.postedDate || 0).getTime())
    .slice(0, MAX_ITEMS);

  await writeTerminalCache(CACHE_KEY, items);
  return items;
}
