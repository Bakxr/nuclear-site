// Daily X (Twitter) post drafts built from the terminal snapshot and the NRC
// fleet report. Emailed to the owner each morning to post by hand (free);
// the same drafts can feed the paid X API later.

const X_LIMIT = 280;
const SITE = "thenuclearpulse.com";

const fmtPct = (value) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;
const fmtUsd = (value) => {
  if (!Number.isFinite(value)) return "";
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${Math.round(value / 1e3)}K`;
  return `$${Math.round(value)}`;
};

// Adds the site link only when it still fits in one post.
function withLink(text) {
  const linked = `${text}\n\n${SITE}`;
  return linked.length <= X_LIMIT ? linked : text;
}

function clip(text) {
  return text.length <= X_LIMIT ? text : `${text.slice(0, X_LIMIT - 1).trimEnd()}…`;
}

export function moversDraft(snapshot) {
  const stocks = (snapshot?.entities?.stocks || [])
    .map((s) => ({ ticker: s.ticker, pct: s.changePct ?? s.pct }))
    .filter((s) => s.ticker && Number.isFinite(s.pct));
  if (stocks.length < 3) return null;

  const byMove = [...stocks].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 4);
  const up = stocks.filter((s) => s.pct > 0).length;
  const lines = byMove.map((s) => `$${s.ticker} ${fmtPct(s.pct)}`).join("\n");
  const uranium = snapshot?.entities?.uranium;
  const uPrice = uranium?.price ?? uranium?.value ?? uranium?.pricePerLb;
  const uraniumLine = Number.isFinite(uPrice) ? `\n\nUranium spot: $${Number(uPrice).toFixed(2)}/lb` : "";

  return {
    kind: "Market movers",
    text: clip(withLink(`Nuclear stocks, last session. Biggest moves:\n\n${lines}${uraniumLine}\n\n${up} of ${stocks.length} names we track closed higher.`)),
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

  return { kind: "Reactor status", text: clip(withLink(text)) };
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
  return { kind: "Insider buy", text: clip(withLink(text)) };
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
  return { kind: "Market odds", text: clip(withLink(text)) };
}

export function buildXDrafts({ snapshot, fleet, now } = {}) {
  return [moversDraft(snapshot), fleetDraft(fleet), insiderDraft(snapshot, { now }), oddsDraft(snapshot)].filter(Boolean);
}

export function xIntentUrl(text) {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}
