import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const CACHE_KEY = "nrc_fleet_pulse_v1";
// NRC publishes once a day (early morning ET); cache for 6 hours.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

function statusUrl(year) {
  return `https://www.nrc.gov/reading-rm/doc-collections/event-status/reactor-status/${year}/${year}PowerStatus.txt`;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "NuclearPulseBot/1.0" },
    });
    if (!res.ok) throw new Error(`nrc:${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse the NRC Power Reactor Status file: pipe-delimited
 * "ReportDt|Unit|Power" rows, newest report date first. Returns the most
 * recent day's snapshot, or null when the file has no usable rows.
 */
export function parseFleetStatus(text) {
  const lines = String(text).split(/\r?\n/);
  let reportDate = null;
  const units = [];

  for (const line of lines) {
    const parts = line.split("|");
    if (parts.length !== 3) continue;
    const [rawDate, rawUnit, rawPower] = parts;
    if (rawDate.trim() === "ReportDt") continue;

    const dateKey = rawDate.trim().split(" ")[0];
    if (!reportDate) reportDate = dateKey;
    // The file is newest-first; stop once rows roll over to an older day.
    if (dateKey !== reportDate) break;

    const unit = rawUnit.trim();
    const power = Number(rawPower);
    if (!unit || !Number.isFinite(power)) continue;
    units.push({ unit, power });
  }

  if (!reportDate || !units.length) return null;

  const total = units.length;
  const online = units.filter((u) => u.power > 0).length;
  const atFullPower = units.filter((u) => u.power >= 100).length;
  const avgPower = Math.round((units.reduce((sum, u) => sum + u.power, 0) / total) * 10) / 10;

  return { reportDate, total, online, atFullPower, avgPower, units };
}

/**
 * Fetch the latest US fleet status from the NRC daily report, cached in the
 * shared Supabase-backed terminal cache. Returns null on total failure.
 */
export async function fetchNrcFleetStatus({ force = false } = {}) {
  const cached = await readTerminalCache(CACHE_KEY);
  if (!force && cached?.payload && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
    return cached.payload;
  }

  try {
    const year = new Date().getUTCFullYear();
    let parsed = parseFleetStatus(await fetchText(statusUrl(year)));
    if (!parsed) {
      // Early January: the new year's file can be empty — fall back one year.
      parsed = parseFleetStatus(await fetchText(statusUrl(year - 1)));
    }
    if (!parsed) return cached?.payload || null;

    await writeTerminalCache(CACHE_KEY, parsed);
    return parsed;
  } catch (err) {
    console.warn("[nrc-fleet] fetch failed:", err?.message || err);
    return cached?.payload || null;
  }
}
