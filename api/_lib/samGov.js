import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const CACHE_KEY = "sam_gov_opportunities_v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

const SAM_URL = "https://api.sam.gov/opportunities/v2/search";
const NAICS = ["221113", "541330", "334516", "541713", "541714", "541715"];
const KEYWORDS = ["nuclear", "uranium", "reactor", "SMR", "radioisotope", "HALEU", "enrichment"];
const MAX_ITEMS = 25;

function getApiKey() {
  return process.env.SAM_API_KEY?.trim() || "";
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "NuclearPulseBot/1.0",
      },
    });
    if (!res.ok) throw new Error(`sam:${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

function formatMmDdYyyy(date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${m}/${d}/${date.getFullYear()}`;
}

function normalize(record) {
  return {
    id: `gov:${record.noticeId || record.solicitationNumber || record.title}`,
    entityType: "govContract",
    title: record.title || "Untitled opportunity",
    agency: record.fullParentPathName || record.department || record.organizationType || "",
    postedDate: record.postedDate || null,
    responseDeadline: record.responseDeadLine || null,
    type: record.type || "",
    awardAmount: record.award?.amount ? Number(record.award.amount) : null,
    url: record.uiLink || record.url || (record.noticeId ? `https://sam.gov/opp/${record.noticeId}/view` : ""),
    naics: record.naicsCode || (Array.isArray(record.naicsCodes) ? record.naicsCodes[0] : "") || "",
  };
}

/**
 * Fetch nuclear-related federal contract opportunities from SAM.gov.
 * Requires SAM_API_KEY env var. Returns [] (with warning) if unset.
 */
export async function fetchGovContracts({ force = false } = {}) {
  const cached = await readTerminalCache(CACHE_KEY);
  if (!force && cached?.payload && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
    return cached.payload;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[sam.gov] SAM_API_KEY not set — returning empty list. Get a free key at https://sam.gov/data-services/Contract%20Opportunities/datagov");
    return cached?.payload || [];
  }

  const now = new Date();
  const ninetyAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const postedFrom = formatMmDdYyyy(ninetyAgo);
  const postedTo = formatMmDdYyyy(now);

  const all = new Map();
  const query = encodeURIComponent(KEYWORDS.join(" "));
  const naicsParam = NAICS.join(",");
  const url = `${SAM_URL}?api_key=${apiKey}&postedFrom=${postedFrom}&postedTo=${postedTo}&limit=50&q=${query}&ncode=${naicsParam}`;

  try {
    const payload = await fetchWithTimeout(url);
    const records = Array.isArray(payload?.opportunitiesData) ? payload.opportunitiesData : [];
    for (const r of records) {
      const item = normalize(r);
      if (!all.has(item.id)) all.set(item.id, item);
    }
  } catch (error) {
    console.warn("[sam.gov] fetch failed:", error?.message || error);
    return cached?.payload || [];
  }

  const items = [...all.values()]
    .sort((a, b) => new Date(b.postedDate || 0).getTime() - new Date(a.postedDate || 0).getTime())
    .slice(0, MAX_ITEMS);

  await writeTerminalCache(CACHE_KEY, items);
  return items;
}
