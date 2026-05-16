// Lightweight keyword tagger for nuclear prediction markets.
// Returns a stable category descriptor so the terminal can group, filter,
// and color-code markets without hand-curation.

const RULES = [
  {
    id: "accident",
    label: "Accident",
    tone: "danger",
    keys: ["meltdown", "accident", "leak", "radioactive leak", "explosion at", "incident at", "evacuat", "fukushima", "chernobyl"],
  },
  {
    id: "geopolitics",
    label: "Geopolitics",
    tone: "warning",
    keys: ["strike", "attack", "bomb", "weapon", "warhead", "iran", "north korea", "dprk", "test", "enrich", "sanction", "treaty", "proliferat", "icbm"],
  },
  {
    id: "restart",
    label: "Restart",
    tone: "cyan",
    keys: ["restart", "reopen", "return to service", "recommission", "uprate", "license extension", "subsequent license", "three mile island", "palisades", "duane arnold", "kashiwazaki"],
  },
  {
    id: "newbuild",
    label: "New build",
    tone: "amber",
    keys: ["new reactor", "new build", "groundbreak", "first concrete", "commission", "go critical", "criticality", "grid connection", "smr", "small modular", "ap1000", "ap300", "bwrx", "natrium", "xe-100", "ng-300"],
  },
  {
    id: "fusion",
    label: "Fusion",
    tone: "positive",
    keys: ["fusion", "iter", "tokamak", "stellarator", "net energy gain", "commonwealth fusion", "helion", "tae"],
  },
  {
    id: "fuel",
    label: "Fuel cycle",
    tone: "cyan",
    keys: ["uranium price", "u3o8", "spot uranium", "haleu", "enrichment", "conversion", "centrus", "leu corp", "yellowcake", "cameco", "kazatomprom"],
  },
  {
    id: "policy",
    label: "Policy",
    tone: "default",
    keys: ["executive order", "legislation", "ferc", "doe loan", "loan guarantee", "epa", "tax credit", "ira ", "inflation reduction"],
  },
  {
    id: "equity",
    label: "Equity",
    tone: "amber",
    keys: ["oklo", "smr ", "ccj", "nxe", "leu", "ceg", "vst", "nne", "uec", "uuuu", "stock", "share price", "market cap"],
  },
];

const DEFAULT = { id: "signal", label: "Signal", tone: "default" };

export function categorizeMarket(market) {
  const text = `${market?.question || ""} ${market?.description || ""}`.toLowerCase();
  if (!text.trim()) return DEFAULT;
  for (const rule of RULES) {
    if (rule.keys.some((k) => text.includes(k))) {
      return { id: rule.id, label: rule.label, tone: rule.tone };
    }
  }
  return DEFAULT;
}

export const MARKET_CATEGORY_OPTIONS = [
  { id: "all", label: "All" },
  ...RULES.map((r) => ({ id: r.id, label: r.label, tone: r.tone })),
  DEFAULT,
];

// Compute a delta (%) between the first and last entry of a price-history series.
export function computeMarketDelta(history, { window: w } = {}) {
  if (!Array.isArray(history) || history.length < 2) return null;
  const last = history[history.length - 1];
  if (!last || !Number.isFinite(last.p)) return null;
  let start = history[0];
  if (Number.isFinite(w) && Number.isFinite(last.t)) {
    const cutoff = last.t - w;
    const idx = history.findIndex((row) => Number.isFinite(row?.t) && row.t >= cutoff);
    if (idx >= 0) start = history[idx];
  }
  if (!start || !Number.isFinite(start.p) || start.p === 0) return null;
  return last.p - start.p;
}

export const DELTA_WINDOW_24H = 24 * 60 * 60;
export const DELTA_WINDOW_7D = 7 * 24 * 60 * 60;
