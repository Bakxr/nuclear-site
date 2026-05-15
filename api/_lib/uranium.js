import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const CACHE_KEY = "uranium_spot_v1";
const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

// Sprott "BullionCalculatorData" endpoint. Verified 2026-05.
// Array of fund rows (SPUT is index 4) followed by market-price rows.
const SPROTT_URL = "https://sprott.com/api/FinancialData/v1/BullionCalculatorData";
const SPUT_FUND_INDEX = 4;

const USER_AGENT = "NuclearPulseBot/1.0 (+https://atomic-energy.vercel.app)";

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSprottSput() {
  const res = await fetchWithTimeout(SPROTT_URL, {
    headers: {
      accept: "application/json, text/plain, */*",
      "user-agent": USER_AGENT,
    },
  });
  if (!res.ok) throw new Error(`sprott:${res.status}`);
  const raw = await res.text();
  // The endpoint occasionally returns a JSON string-wrapped payload; handle both shapes.
  let data;
  try {
    data = JSON.parse(raw);
    if (typeof data === "string") data = JSON.parse(data);
  } catch (error) {
    throw new Error(`sprott:parse:${error?.message || "invalid json"}`);
  }
  if (!Array.isArray(data) || !data[SPUT_FUND_INDEX]) {
    throw new Error("sprott:shape");
  }
  const fund = data[SPUT_FUND_INDEX];
  const totalMarketValue = Number(fund.totalMarketValue);
  const totalOunces = Number(fund.totalOunces1); // SPUT reports U3O8 lbs in totalOunces1
  if (!Number.isFinite(totalMarketValue) || !Number.isFinite(totalOunces) || totalOunces <= 0) {
    throw new Error("sprott:values");
  }
  const pricePerLb = totalMarketValue / totalOunces;
  return {
    pricePerLb: Math.round(pricePerLb * 100) / 100,
    source: "Sprott Physical Uranium Trust NAV",
    sourceUrl:
      "https://sprott.com/investment-strategies/exchange-listed-products/physical-commodity-funds/uranium/",
    asOf: fund.dateTimeStamp || new Date().toISOString(),
    change: null,
    changePct: null,
  };
}

const PROVIDERS = [
  { id: "sprott", fn: fetchSprottSput },
];

/**
 * Fetch the latest uranium spot-price proxy. Tries SPUT NAV per pound first.
 * Returns { pricePerLb, source, sourceUrl, asOf, change, changePct, fetchedAt }
 * or null if every provider failed and no cache exists.
 */
export async function fetchUraniumPrice({ force = false } = {}) {
  const cached = await readTerminalCache(CACHE_KEY);
  if (!force && cached?.payload && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
    return { ...cached.payload, stale: false };
  }

  const errors = [];
  for (const provider of PROVIDERS) {
    try {
      const result = await provider.fn();
      const payload = {
        ...result,
        fetchedAt: new Date().toISOString(),
      };
      await writeTerminalCache(CACHE_KEY, payload);
      return { ...payload, stale: false };
    } catch (error) {
      errors.push(`${provider.id}:${error?.message || error}`);
    }
  }

  console.warn("[uranium] all providers failed:", errors.join(" | "));

  if (cached?.payload) {
    return { ...cached.payload, stale: true };
  }

  return null;
}
