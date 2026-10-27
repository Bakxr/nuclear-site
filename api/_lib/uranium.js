import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const CACHE_KEY = "uranium_spot_v1";
const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

// Sprott "BullionCalculatorData" endpoint (undocumented). Verified 2026-10.
// An unlabelled array of fund rows followed by market-price rows; SPUT has
// been index 4. Rows carry no fund name, so a row is only accepted if its
// implied price is plausible for uranium AND close to the last price we saw,
// which catches Sprott reordering the array (silver, at index 1, also prices
// in the $30-$100 range).
const SPROTT_URL = "https://sprott.com/api/FinancialData/v1/BullionCalculatorData";
const SPUT_FUND_INDEX = 4;
const PLAUSIBLE_RANGE = [20, 400];
const MAX_JUMP = 0.25; // vs the previous reading; uranium doesn't move 25% overnight
const HISTORY_KEY = "uranium_spot_history_v1";

function impliedPrice(row) {
  const value = Number(row?.totalMarketValue);
  const pounds = Number(row?.totalOunces1); // SPUT reports U3O8 lbs in totalOunces1
  if (!Number.isFinite(value) || !Number.isFinite(pounds) || pounds <= 0) return null;
  return value / pounds;
}

export function pickSputRow(rows, previousPrice) {
  const plausible = (price) => price != null && price >= PLAUSIBLE_RANGE[0] && price <= PLAUSIBLE_RANGE[1];
  const near = (price) => !previousPrice || Math.abs(price - previousPrice) / previousPrice <= MAX_JUMP;
  const expected = rows[SPUT_FUND_INDEX];
  const expectedPrice = impliedPrice(expected);
  if (plausible(expectedPrice) && near(expectedPrice)) return expected;
  // Index moved: only trust another row if it's close to the last price.
  if (previousPrice) {
    const match = rows.find((row) => {
      const price = impliedPrice(row);
      return plausible(price) && Math.abs(price - previousPrice) / previousPrice <= 0.1;
    });
    if (match) return match;
  }
  return null;
}

const USER_AGENT = "NuclearPulseBot/1.0 (+https://thenuclearpulse.com)";

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSprottSput({ previousPrice = null } = {}) {
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
  if (!Array.isArray(data)) throw new Error("sprott:shape");
  const fund = pickSputRow(data, previousPrice);
  if (!fund) throw new Error("sprott:no-plausible-row");
  const pricePerLb = impliedPrice(fund);
  return {
    pricePerLb: Math.round(pricePerLb * 100) / 100,
    source: "Sprott Physical Uranium Trust NAV",
    sourceUrl:
      "https://sprott.com/investment-strategies/exchange-listed-products/physical-commodity-funds/uranium/",
    asOf: fund.dateTimeStamp || new Date().toISOString(),
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

  // Daily closes by asOf date, so the change is vs the previous trading day.
  const history = (await readTerminalCache(HISTORY_KEY).catch(() => null))?.payload || {};
  const days = Object.keys(history).sort();
  const previousPrice = cached?.payload?.pricePerLb || (days.length ? history[days.at(-1)] : null);

  const errors = [];
  for (const provider of PROVIDERS) {
    try {
      const result = await provider.fn({ previousPrice });
      const day = String(result.asOf).slice(0, 10);
      const priorDay = days.filter((d) => d < day).at(-1);
      const prior = priorDay ? history[priorDay] : null;
      const change = prior ? Math.round((result.pricePerLb - prior) * 100) / 100 : null;
      const payload = {
        ...result,
        change,
        changePct: prior ? Math.round(((result.pricePerLb - prior) / prior) * 10000) / 100 : null,
        fetchedAt: new Date().toISOString(),
      };
      if (history[day] !== result.pricePerLb) {
        const next = Object.fromEntries(Object.entries({ ...history, [day]: result.pricePerLb }).sort().slice(-30));
        await writeTerminalCache(HISTORY_KEY, next);
      }
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
