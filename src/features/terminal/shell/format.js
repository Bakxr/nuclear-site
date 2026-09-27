// Number/time formatting for the terminal shell. Every figure on screen goes
// through here so precision and sign conventions stay consistent.

export { formatProbability } from "../marketTopic.js";

const EM_DASH = "—";

export function isNum(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function fmtPrice(value) {
  if (!isNum(value) || value <= 0) return EM_DASH;
  if (value >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return value.toFixed(2);
}

export function fmtSignedPct(value, digits = 2) {
  if (!isNum(value)) return EM_DASH;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

export function fmtSignedNum(value, digits = 2) {
  if (!isNum(value)) return EM_DASH;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}`;
}

export function fmtCompact(value, { prefix = "" } = {}) {
  if (!isNum(value)) return EM_DASH;
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${prefix}${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${prefix}${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${prefix}${(value / 1e3).toFixed(0)}K`;
  return `${prefix}${value.toFixed(0)}`;
}

export function toneOf(value) {
  if (!isNum(value) || value === 0) return "flat";
  return value > 0 ? "up" : "down";
}

export function fmtClock(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(date);
}

export function fmtAgo(value, now = Date.now()) {
  if (!value) return EM_DASH;
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return EM_DASH;
  const mins = Math.max(0, Math.round((now - t) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function fmtShortDate(value) {
  if (!value) return EM_DASH;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EM_DASH;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// % change across the last `bars` points of a {price} history series.
export function historyChange(history, bars) {
  if (!Array.isArray(history) || history.length < 2) return null;
  const series = bars ? history.slice(-(bars + 1)) : history;
  const first = series[0]?.price;
  const last = series[series.length - 1]?.price;
  if (!isNum(first) || !isNum(last) || first === 0) return null;
  return ((last - first) / first) * 100;
}

// US equity session state in New York time (ignores exchange holidays).
export function usMarketSession(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekday = get("weekday");
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  if (weekday === "Sat" || weekday === "Sun") return { id: "closed", label: "Market closed" };
  if (minutes >= 570 && minutes < 960) return { id: "open", label: "Market open" };
  if (minutes >= 240 && minutes < 570) return { id: "pre", label: "Pre-market" };
  if (minutes >= 960 && minutes < 1200) return { id: "post", label: "After hours" };
  return { id: "closed", label: "Market closed" };
}
