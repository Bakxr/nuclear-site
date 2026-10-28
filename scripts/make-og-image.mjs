// Renders public/og.png, the link-preview image for the site (1200×630),
// in the broadsheet style with the same fonts as the X cards. Static on
// purpose: no live numbers that would go stale in shared links.
// Run: node scripts/make-og-image.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const font = (name) => readFileSync(join(process.cwd(), "api", "_lib", "fonts", name));
const C = { bg: "#f5f2ea", ink: "#16140f", muted: "#4a453b", accent: "#1c44c9" };

function h(type, style, ...children) {
  const flat = children.flat().filter((c) => c !== null && c !== undefined && c !== false);
  return { type, props: { style: { display: "flex", ...style }, children: flat.length === 1 ? flat[0] : flat } };
}

const rule = (height) => h("div", { height, background: C.ink, width: "100%" });

const tree = h("div", {
  width: 1200, height: 630, flexDirection: "column", alignItems: "center", justifyContent: "center",
  background: C.bg, color: C.ink, fontFamily: "Public Sans", padding: "0 80px",
},
  h("div", { fontSize: 22, fontWeight: 700, letterSpacing: 5, color: C.accent, textTransform: "uppercase" }, "The daily nuclear briefing"),
  h("div", { fontFamily: "Newsreader", fontSize: 150, letterSpacing: -4, lineHeight: 1, marginTop: 26 }, "Nuclear Pulse"),
  h("div", { flexDirection: "column", width: "100%", marginTop: 34, gap: 4 }, rule(2), rule(1)),
  h("div", { fontSize: 30, letterSpacing: 6, textTransform: "uppercase", color: C.muted, marginTop: 26 }, "Reactors · Uranium · Markets · Policy"),
  h("div", { fontSize: 28, color: C.ink, marginTop: 30 }, "From IAEA, NRC and SEC primary sources, every day. thenuclearpulse.com"),
);

const svg = await satori(tree, {
  width: 1200,
  height: 630,
  fonts: [
    { name: "Public Sans", data: font("public-sans-400.woff"), weight: 400, style: "normal" },
    { name: "Public Sans", data: font("public-sans-700.woff"), weight: 700, style: "normal" },
    { name: "Newsreader", data: font("newsreader-500.woff"), weight: 500, style: "normal" },
  ],
});
writeFileSync(join(process.cwd(), "public", "og.png"), new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng());
console.log("[og] wrote public/og.png");
