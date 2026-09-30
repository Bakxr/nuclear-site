// Daily X (Twitter) post drafts built from the terminal snapshot and the NRC
// fleet report. Emailed to the owner each morning to post by hand (free);
// the same drafts can feed the paid X API later.

import { snapshotStocks } from "./dispatch.js";

const X_LIMIT = 280;
const SITE = "https://thenuclearpulse.com";
// X shortens every link to a 23-character t.co URL, whatever its real length.
const X_LINK_LENGTH = 23;
const URL_RE = /https?:\/\/\S+/g;

const fmtPct = (value) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;
const fmtUsd = (value) => {
  if (!Number.isFinite(value)) return "";
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${Math.round(value / 1e3)}K`;
  return `$${Math.round(value)}`;
};

// Post length as X counts it (links count as 23 characters).
export function xLength(text) {
  return text.replace(URL_RE, "x".repeat(X_LINK_LENGTH)).length;
}

// Site link tagged so sign-ups from each kind of post show up in the
// subscribers table (source "x", campaign = the post kind).
export function trackedLink(path, campaign) {
  const url = new URL(path, SITE);
  url.searchParams.set("utm_source", "x");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

// Adds the link only when it still fits in one post.
function withLink(text, path, campaign) {
  const linked = `${text}

${trackedLink(path, campaign)}`;
  return xLength(linked) <= X_LIMIT ? linked : text;
}

function clip(text) {
  return text.length <= X_LIMIT ? text : `${text.slice(0, X_LIMIT - 1).trimEnd()}…`;
}

export function moversDraft(snapshot) {
  const stocks = snapshotStocks(snapshot).map((s) => ({ ticker: s.ticker, pct: s.changePct ?? s.pct }));
  if (stocks.length < 3) return null;

  const byMove = [...stocks].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 4);
  const up = stocks.filter((s) => s.pct > 0).length;
  const lines = byMove.map((s) => `$${s.ticker} ${fmtPct(s.pct)}`).join("\n");
  const uranium = snapshot?.entities?.uranium;
  const uPrice = uranium?.price ?? uranium?.value ?? uranium?.pricePerLb;
  const uraniumLine = Number.isFinite(uPrice) ? `\n\nUranium spot: $${Number(uPrice).toFixed(2)}/lb` : "";

  return {
    kind: "Market movers",
    text: withLink(clip(`Nuclear stocks, last session. Biggest moves:\n\n${lines}${uraniumLine}\n\n${up} of ${stocks.length} names we track closed higher.`), "/uranium-stocks", "market-movers"),
  };
}

export function fleetDraft(fleet) {
  const units = Array.isArray(fleet?.units) ? fleet.units : [];
  if (!units.length) return null;

  const offline = units.filter((u) => u.power === 0).map((u) => u.unit);
  const reduced = units.filter((u) => u.power > 0 && u.power < 100).sort((a, b) => a.power - b.power);
  const full = units.length - offline.length - reduced.length;

  let text = `US nuclear fleet today (NRC): ${full} of ${units.length} reactors at full power.`;
  if (offline.length) text += `\n\nOffline: ${offline.slice(0, 5).join(", ")}${offline.length > 5 ? ` +${offline.length - 5} more` : ""}`;
  if (reduced.length) text += `\n\nReduced: ${reduced.slice(0, 3).map((u) => `${u.unit} (${u.power}%)`).join(", ")}${reduced.length > 3 ? ` +${reduced.length - 3} more` : ""}`;

  return { kind: "Reactor status", text: withLink(clip(text), "/reactor-outages", "reactor-status") };
}

export function insiderDraft(snapshot, { now = Date.now(), days = 10 } = {}) {
  const cutoff = now - days * 86400000;
  const buys = (snapshot?.entities?.insiderTrades || [])
    .filter((t) => t.transactionCode === "P" && Date.parse(t.date) >= cutoff)
    .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0));
  const top = buys[0];
  if (!top) return null;

  const who = [top.filer, top.title].filter(Boolean).join(", ");
  const price = top.pricePerShare ? ` at $${Number(top.pricePerShare).toFixed(2)}` : "";
  const value = top.totalValue ? ` (${fmtUsd(top.totalValue)})` : "";
  const text = `Insider buying in nuclear: ${who} bought ${Number(top.shares).toLocaleString("en-US")} shares of $${top.ticker}${price}${value}, per an SEC Form 4 dated ${top.date}.\n\nOpen-market purchase, not an option grant.`;
  return { kind: "Insider buy", text: withLink(clip(text), "/terminal", "insider-buy") };
}

export function oddsDraft(snapshot) {
  const markets = (snapshot?.entities?.predictionMarkets || [])
    .filter((m) => m.question && Number.isFinite(m.yesPrice) && m.yesPrice > 0.02 && m.yesPrice < 0.98)
    .sort((a, b) => (b.volume || 0) - (a.volume || 0));
  const top = markets[0];
  if (!top) return null;

  const source = top.source === "kalshi" ? "Kalshi" : "Polymarket";
  const pct = Math.round(top.yesPrice * 100);
  const text = `Prediction markets on nuclear: "${top.question}"\n\n${source} traders put it at ${pct}%.`;
  return { kind: "Market odds", text: withLink(clip(text), "/terminal", "market-odds") };
}

const MILESTONE_LINES = {
  "construction-start": (c) => `Construction has started on ${c.unit}, at ${c.station}.`,
  operating: (c) => `${c.unit} at ${c.station} is now in operation.`,
  "new-station": (c) => `A new nuclear station has entered the IAEA's reactor database: ${c.station}.`,
};

// Reactor milestones from the day's IAEA PRIS diff (plantRegistry.diffStations).
// Removals are left out: they are more often data clean-ups than news.
export function milestoneDrafts(changes = [], { max = 2 } = {}) {
  return changes
    .filter((c) => MILESTONE_LINES[c.kind])
    .slice(0, max)
    .map((c) => ({
      kind: "Reactor milestone",
      text: withLink(clip(`${MILESTONE_LINES[c.kind](c)}\n\nSource: IAEA PRIS, updated today.`), c.name ? `/?plant=${encodeURIComponent(c.name)}` : "/", "reactor-milestone"),
    }));
}

// Once a week, a plain plug for the free Sunday briefing.
export function newsletterDraft({ now = Date.now() } = {}) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/Toronto", weekday: "long" }).format(new Date(now));
  if (weekday !== "Thursday") return null;
  const text = "Every Sunday we send a free five-minute briefing on nuclear: the uranium price, reactor milestones, the week's biggest stock moves and insider buys.\n\nNo spam, one click to unsubscribe.";
  return { kind: "Newsletter plug", text: withLink(clip(text), "/", "newsletter-plug") };
}

// Suggested posting windows (Eastern time), keyed by draft kind.
export const POST_TIMES = {
  "Market movers": "8:00–8:30am ET · pre-market, weekdays only",
  "Reactor status": "9:00–10:00am ET · weekends 10–11am",
  "Insider buy": "12:00–1:00pm ET",
  "Market odds": "6:00–8:00pm ET",
  "Reactor milestone": "as soon as you can · news travels fast",
  "Newsletter plug": "5:00–6:00pm ET",
};

export function buildXDrafts({ snapshot, fleet, plantChanges = [], now } = {}) {
  return [
    ...milestoneDrafts(plantChanges),
    moversDraft(snapshot),
    fleetDraft(fleet),
    insiderDraft(snapshot, { now }),
    oddsDraft(snapshot),
    newsletterDraft({ now }),
  ]
    .filter(Boolean)
    .map((draft) => ({ ...draft, postAt: POST_TIMES[draft.kind] || "" }));
}

export function xIntentUrl(text) {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}
