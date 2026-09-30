// Daily X (Twitter) post drafts built from the terminal snapshot and the NRC
// fleet report. Emailed to the owner each morning to post by hand (free);
// the same drafts can feed the paid X API later.
//
// Each draft is three parts:
//   text   the post itself, written to draw replies, with no link
//   reply  a follow-up reply that carries the tracked site link
//   card   data for a chart image (api/_lib/socialCards.js) to attach
// Replies and quotes weigh far more than link clicks in X's ranking
// (xai-org/x-algorithm, home-mixer/params/param.rs), so the link goes in the
// reply and the post is left to start a conversation.

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

function clip(text) {
  return xLength(text) <= X_LIMIT ? text : `${text.slice(0, X_LIMIT - 1).trimEnd()}…`;
}

function linkReply(lead, path, campaign) {
  return `${lead}\n\n${trackedLink(path, campaign)}`;
}

// "Sep 30" in Eastern time, for the card header.
function shortDate(now) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Toronto", month: "short", day: "numeric" }).format(new Date(now));
}

export function moversDraft(snapshot, { now = Date.now() } = {}) {
  const stocks = snapshotStocks(snapshot).map((s) => ({ ticker: s.ticker, pct: s.changePct ?? s.pct }));
  if (stocks.length < 3) return null;

  const byMove = [...stocks].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  const up = stocks.filter((s) => s.pct > 0).length;
  const lines = byMove.slice(0, 4).map((s) => `$${s.ticker} ${fmtPct(s.pct)}`).join("\n");
  const uranium = snapshot?.entities?.uranium;
  const uPrice = Number(uranium?.price ?? uranium?.value ?? uranium?.pricePerLb);
  const uraniumLine = Number.isFinite(uPrice) && uPrice > 0 ? `\nUranium spot: $${uPrice.toFixed(2)}/lb` : "";

  const share = up / stocks.length;
  const mood = share >= 0.65 ? "Broad rally across nuclear." : share <= 0.35 ? "Rough day for nuclear." : "Mixed day for nuclear.";
  const question = share >= 0.65 ? "Chasing this, or waiting for a pullback?" : share <= 0.35 ? "Buying the dip, or staying out?" : "What are you watching this week?";

  return {
    kind: "Market movers",
    text: clip(`${mood} ${up} of ${stocks.length} names closed higher.\n\n${lines}${uraniumLine}\n\n${question}`),
    reply: linkReply(`Live prices for all ${stocks.length} nuclear and uranium names we track:`, "/uranium-stocks", "market-movers"),
    card: {
      type: "movers",
      date: shortDate(now),
      rows: byMove.slice(0, 8).map((s) => ({ ticker: s.ticker, pct: Math.round(s.pct * 10) / 10 })),
      uranium: Number.isFinite(uPrice) && uPrice > 0 ? uPrice : null,
      up,
      total: stocks.length,
    },
  };
}

export function fleetDraft(fleet, { now = Date.now() } = {}) {
  const units = Array.isArray(fleet?.units) ? fleet.units : [];
  if (!units.length) return null;

  const offline = units.filter((u) => u.power === 0).map((u) => u.unit);
  const reduced = units.filter((u) => u.power > 0 && u.power < 100).sort((a, b) => a.power - b.power);
  const full = units.length - offline.length - reduced.length;

  let text = `${full} of ${units.length} US reactors are at full power today, per the NRC.`;
  if (offline.length) text += `\n\n${offline.length} offline, including ${offline.slice(0, 3).join(", ")}.`;
  if (reduced.length) text += ` ${reduced.length} running at reduced power.`;
  text += offline.length ? "\n\nMost of these are planned refueling outages. Any you're keeping an eye on?" : "\n\nA clean sheet. How long before the next refueling season?";

  return {
    kind: "Reactor status",
    text: clip(text),
    reply: linkReply("Every US reactor's status, updated daily from the NRC:", "/reactor-outages", "reactor-status"),
    card: {
      type: "fleet",
      date: shortDate(now),
      full,
      total: units.length,
      offline: offline.slice(0, 8),
      offlineCount: offline.length,
      reducedCount: reduced.length,
    },
  };
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
  const text = `An insider is buying $${top.ticker} with their own money.\n\n${who} bought ${Number(top.shares).toLocaleString("en-US")} shares${price}${value} on the open market, per an SEC Form 4 dated ${top.date}.\n\nSignal, or noise?`;
  return {
    kind: "Insider buy",
    text: clip(text),
    reply: linkReply("We track every Form 4 filed by nuclear and uranium insiders in the terminal (7-day free trial):", "/terminal", "insider-buy"),
    card: {
      type: "insider",
      date: new Date(`${top.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      ticker: top.ticker,
      filer: top.filer || "",
      title: top.title || "",
      shares: Number(top.shares) || 0,
      price: top.pricePerShare ? Number(top.pricePerShare) : null,
      value: top.totalValue ? fmtUsd(top.totalValue) : null,
    },
  };
}

export function oddsDraft(snapshot) {
  const markets = (snapshot?.entities?.predictionMarkets || [])
    .filter((m) => m.question && Number.isFinite(m.yesPrice) && m.yesPrice > 0.02 && m.yesPrice < 0.98)
    .sort((a, b) => (b.volume || 0) - (a.volume || 0));
  const top = markets[0];
  if (!top) return null;

  const source = top.source === "kalshi" ? "Kalshi" : "Polymarket";
  const pct = Math.round(top.yesPrice * 100);
  const text = `${source} traders put this at ${pct}%:\n\n"${top.question}"\n\nToo high, too low, or about right?`;
  return {
    kind: "Market odds",
    text: clip(text),
    reply: linkReply("Nuclear and uranium prediction markets, tracked daily:", "/terminal", "market-odds"),
    card: { type: "odds", source, question: top.question, pct },
  };
}

const MILESTONES = {
  "construction-start": { label: "construction start", line: (c) => `Construction has started on ${c.unit}, at ${c.station}.` },
  operating: { label: "now operating", line: (c) => `${c.unit} at ${c.station} is now in operation.` },
  "new-station": { label: "new station", line: (c) => `A new nuclear station has entered the IAEA's reactor database: ${c.station}.` },
};

// Reactor milestones from the day's IAEA PRIS diff (plantRegistry.diffStations).
// Removals are left out: they are more often data clean-ups than news.
export function milestoneDrafts(changes = [], { max = 2, now = Date.now() } = {}) {
  return changes
    .filter((c) => MILESTONES[c.kind])
    .slice(0, max)
    .map((c) => ({
      kind: "Reactor milestone",
      text: clip(`${MILESTONES[c.kind].line(c)}\n\nSource: IAEA PRIS, updated today.`),
      reply: linkReply("Every reactor in the world, operating and under construction, on one globe:", c.name ? `/?plant=${encodeURIComponent(c.name)}` : "/", "reactor-milestone"),
      card: {
        type: "milestone",
        date: shortDate(now),
        label: MILESTONES[c.kind].label,
        unit: c.unit || c.name || c.station,
        station: c.station.replace(/ \(([^)]+)\)$/, ", $1"),
      },
    }));
}

// Once a week, a plain plug for the free Sunday briefing. Its whole point is
// the sign-up, so it keeps the link in the post.
export function newsletterDraft({ now = Date.now() } = {}) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/Toronto", weekday: "long" }).format(new Date(now));
  if (weekday !== "Thursday") return null;
  const text = `Every Sunday we send a free five-minute briefing on nuclear: the uranium price, reactor milestones, the week's biggest stock moves and insider buys.\n\nNo spam, one click to unsubscribe.\n\n${trackedLink("/", "newsletter-plug")}`;
  return { kind: "Newsletter plug", text, reply: null, card: null };
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

export function buildXDrafts({ snapshot, fleet, plantChanges = [], now = Date.now() } = {}) {
  return [
    ...milestoneDrafts(plantChanges, { now }),
    moversDraft(snapshot, { now }),
    fleetDraft(fleet, { now }),
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
