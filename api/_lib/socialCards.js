// Chart cards (1200×675 PNG) to attach to the daily X drafts, rendered by
// api/social/card.js from the signed data in the URL (see cardLinks.js).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 675;

const SITE = "thenuclearpulse.com";
const C = {
  bg: "#100d09",
  surface: "#1a1712",
  text: "#f5f0e8",
  body: "#d9cfbe",
  muted: "#b3a489",
  faint: "#8b7d65",
  line: "rgba(245,240,232,0.12)",
  gold: "#d4a54a",
  up: "#4ade80",
  down: "#f87171",
};

let fonts = null;
function loadFonts() {
  if (!fonts) {
    // Resolved from the project root: vercel.json ships api/_lib/fonts with the function.
    const file = (name) => readFileSync(join(process.cwd(), "api", "_lib", "fonts", name));
    fonts = [
      { name: "DM Sans", data: file("dm-sans-400.woff"), weight: 400, style: "normal" },
      { name: "DM Sans", data: file("dm-sans-700.woff"), weight: 700, style: "normal" },
      { name: "DM Mono", data: file("dm-mono-500.woff"), weight: 500, style: "normal" },
      { name: "Fraunces", data: file("fraunces-500.woff"), weight: 500, style: "normal" },
    ];
  }
  return fonts;
}

// ── layout helpers ─────────────────────────────────────────────────────────

function h(type, style, ...children) {
  const flat = children.flat().filter((c) => c !== null && c !== undefined && c !== false);
  return { type, props: { style: { display: "flex", ...style }, children: flat.length === 1 ? flat[0] : flat } };
}

const fmtPct = (v) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;

function frame({ eyebrow, date }, ...content) {
  return h("div", {
    width: CARD_WIDTH, height: CARD_HEIGHT, flexDirection: "column", background: C.bg,
    color: C.text, fontFamily: "DM Sans", padding: "56px 64px 44px",
  },
  h("div", { justifyContent: "space-between", alignItems: "center", marginBottom: 34 },
    h("div", { fontSize: 22, fontWeight: 700, letterSpacing: 4, color: C.gold, textTransform: "uppercase" }, eyebrow),
    date ? h("div", { fontSize: 22, color: C.faint, fontFamily: "DM Mono" }, date) : null,
  ),
  h("div", { flex: 1, flexDirection: "column" }, ...content),
  h("div", { justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.line}`, paddingTop: 22, marginTop: 20 },
    h("div", { fontFamily: "Fraunces", fontSize: 30, color: C.text }, "Nuclear", h("span", { color: C.gold, marginLeft: 9 }, "Pulse")),
    h("div", { fontSize: 22, color: C.muted }, SITE),
  ));
}

function headline(text, size = 54) {
  return h("div", { fontFamily: "Fraunces", fontSize: size, lineHeight: 1.12, color: C.text, marginBottom: 30 }, text);
}

// ── cards ──────────────────────────────────────────────────────────────────

function moversCard({ rows = [], uranium, up, total, date }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.pct)), 1);
  const bars = rows.slice(0, 8).map((r) =>
    h("div", { alignItems: "center", height: 44, marginBottom: 8 },
      h("div", { width: 130, fontFamily: "DM Mono", fontSize: 28, color: C.body }, `$${r.ticker}`),
      h("div", { flex: 1, height: 30, background: C.surface, borderRadius: 4 },
        h("div", { width: `${Math.max(2, (Math.abs(r.pct) / max) * 100)}%`, height: 30, borderRadius: 4, background: r.pct >= 0 ? C.up : C.down, opacity: 0.85 })),
      h("div", { width: 140, justifyContent: "flex-end", fontFamily: "DM Mono", fontSize: 28, color: r.pct >= 0 ? C.up : C.down }, fmtPct(r.pct)),
    ));
  const side = h("div", { width: 300, flexDirection: "column", marginLeft: 48, justifyContent: "center" },
    Number.isFinite(uranium) ? stat(`$${uranium.toFixed(2)}`, "Uranium spot / lb") : null,
    Number.isFinite(up) && Number.isFinite(total) ? stat(`${up} of ${total}`, "Nuclear names closed higher") : null,
  );
  return frame({ eyebrow: "Nuclear stocks · biggest moves", date },
    h("div", { flex: 1 }, h("div", { flex: 1, flexDirection: "column", justifyContent: "center" }, bars), side));
}

function stat(value, label) {
  return h("div", { flexDirection: "column", marginBottom: 36 },
    h("div", { fontFamily: "Fraunces", fontSize: 58, color: C.text }, value),
    h("div", { fontSize: 22, color: C.muted, marginTop: 4 }, label));
}

function fleetCard({ full, total, offline = [], offlineCount = 0, reducedCount = 0, date }) {
  const pct = total ? full / total : 0;
  return frame({ eyebrow: "US nuclear fleet · NRC daily report", date },
    h("div", { flex: 1 },
      h("div", { flexDirection: "column", width: 520, justifyContent: "center" },
        h("div", { fontFamily: "Fraunces", fontSize: 150, lineHeight: 1, color: C.text }, `${full}`, h("span", { fontSize: 64, color: C.muted, marginLeft: 16, marginTop: 70 }, `/ ${total}`)),
        h("div", { fontSize: 28, color: C.body, marginTop: 14 }, "reactors at full power"),
        h("div", { height: 18, background: C.surface, borderRadius: 9, marginTop: 34, width: 460 },
          h("div", { width: `${pct * 100}%`, height: 18, borderRadius: 9, background: C.up })),
        h("div", { fontSize: 22, color: C.muted, marginTop: 16 }, `${offlineCount} offline · ${reducedCount} at reduced power`),
      ),
      h("div", { flexDirection: "column", flex: 1, marginLeft: 40, justifyContent: "center" },
        h("div", { fontSize: 20, fontWeight: 700, letterSpacing: 3, color: C.down, textTransform: "uppercase", marginBottom: 14 }, "Offline"),
        ...offline.slice(0, 8).map((name) => h("div", { fontSize: 28, color: C.body, marginBottom: 8 }, name)),
        offlineCount > Math.min(offline.length, 8) ? h("div", { fontSize: 24, color: C.faint }, `+${offlineCount - Math.min(offline.length, 8)} more`) : null,
      )));
}

function insiderCard({ ticker, filer, title, shares, price, value, date }) {
  return frame({ eyebrow: "Insider buying · SEC Form 4", date },
    h("div", { flex: 1, flexDirection: "column", justifyContent: "center" },
      h("div", { fontFamily: "DM Mono", fontSize: 120, color: C.gold, lineHeight: 1 }, `$${ticker}`),
      h("div", { fontSize: 34, color: C.text, marginTop: 28 }, [filer, title].filter(Boolean).join(" · ")),
      h("div", { marginTop: 36 },
        stat(Number(shares).toLocaleString("en-US"), "shares bought on the open market"),
        h("div", { width: 60 }),
        price ? stat(`$${Number(price).toFixed(2)}`, "per share") : null,
        h("div", { width: 60 }),
        value ? stat(value, "total") : null,
      )));
}

function oddsCard({ question, pct, source }) {
  return frame({ eyebrow: `Prediction markets · ${source}` },
    h("div", { flex: 1, alignItems: "center" },
      h("div", { flexDirection: "column", flex: 1, marginRight: 48 }, headline(question, question.length > 80 ? 44 : 52)),
      h("div", { flexDirection: "column", alignItems: "center", width: 300 },
        h("div", { fontFamily: "Fraunces", fontSize: 150, color: C.gold, lineHeight: 1 }, `${pct}%`),
        h("div", { fontSize: 24, color: C.muted, marginTop: 12 }, "chance, per traders"))));
}

function milestoneCard({ label, unit, station, date }) {
  return frame({ eyebrow: `Reactor milestone · ${label}`, date },
    h("div", { flex: 1, flexDirection: "column", justifyContent: "center" },
      h("div", { fontFamily: "Fraunces", fontSize: 96, lineHeight: 1.05, color: C.text }, unit),
      h("div", { fontSize: 36, color: C.body, marginTop: 20 }, station),
      h("div", { fontSize: 24, color: C.faint, marginTop: 36 }, "Source: IAEA Power Reactor Information System")));
}

const CARDS = { movers: moversCard, fleet: fleetCard, insider: insiderCard, odds: oddsCard, milestone: milestoneCard };

export async function renderCardPng(card) {
  const build = CARDS[card?.type];
  if (!build) throw new Error(`Unknown card type: ${card?.type}`);
  const svg = await satori(build(card), { width: CARD_WIDTH, height: CARD_HEIGHT, fonts: loadFonts() });
  return new Resvg(svg, { fitTo: { mode: "width", value: CARD_WIDTH } }).render().asPng();
}
