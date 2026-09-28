// Generates static, crawlable landing pages into public/ before `vite build`.
// Content comes from the same data files the app uses, so the pages never
// drift from the site. Live figures are filled in by public/seo/live.js.
//
//   /uranium-stocks   /smr-tracker   /reactor-outages
//
// Output folders are git-ignored; this runs on every build.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STOCKS_BASE, STOCK_GROUPS } from "../src/data/constants.js";
import { SMR_PROJECTS } from "../src/data/smrProjects.js";

const SITE = "https://thenuclearpulse.com";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const BUILT = new Date().toISOString().slice(0, 10);

export const PAGES = ["uranium-stocks", "smr-tracker", "reactor-outages"];

const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const NAV = [
  ["uranium-stocks", "Uranium stocks"],
  ["smr-tracker", "SMR tracker"],
  ["reactor-outages", "Reactor outages"],
];

function layout({ slug, title, description, h1, body, faq }) {
  const url = `${SITE}/${slug}`;
  const faqLd = faq.length
    ? `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    })}</script>`
    : "";
  const crumbLd = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Nuclear Pulse", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: title.split(" | ")[0], item: url },
    ],
  })}</script>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Nuclear Pulse" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE}/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${SITE}/og.png" />
<meta name="theme-color" content="#100d09" />
<link rel="icon" type="image/png" href="/pwa-192.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600;700&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&display=swap" />
<link rel="stylesheet" href="/seo/seo.css" />
${crumbLd}
${faqLd}
</head>
<body>
<div class="shell">
  <header class="top">
    <a class="brand" href="/">Nuclear <em>Pulse</em></a>
    <nav aria-label="Guides">
      ${NAV.map(([s, label]) => `<a href="/${s}"${s === slug ? ' aria-current="page"' : ""}>${label}</a>`).join("\n      ")}
      <a href="/terminal">Terminal</a>
    </nav>
  </header>
  <main>
    <div class="intro">
      <div class="crumbs"><a href="/">Nuclear Pulse</a> / ${esc(title.split(" | ")[0])}</div>
      <h1>${h1}</h1>
      ${body.intro}
    </div>
    ${body.main}
    <section class="cta" aria-label="Nuclear Pulse Pro">
      <h2>Follow it every day</h2>
      <p>The Nuclear Pulse terminal adds insider buying from SEC Form 4 filings, daily NRC status for every US reactor, and prediction-market odds on enrichment and policy. Try it free for 7 days, or get the free weekly briefing.</p>
      <div class="cta-row">
        <a class="btn primary" href="/terminal">Start 7-day free trial</a>
        <a class="btn ghost" href="/">Get the free weekly briefing</a>
      </div>
    </section>
    ${faq.length ? `<section class="group" aria-labelledby="faq"><h2 id="faq">Questions</h2><div class="faq">${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div></section>` : ""}
  </main>
  <footer>
    <span>© ${new Date().getFullYear()} Nuclear Pulse · For informational purposes only, not investment advice</span>
    <a href="/legal/terms.html">Terms</a><a href="/legal/privacy.html">Privacy</a>
    <a href="mailto:support@thenuclearpulse.com">support@thenuclearpulse.com</a>
  </footer>
</div>
<script src="/seo/live.js" defer></script>
</body>
</html>
`;
}

// ── /uranium-stocks ──────────────────────────────────────────────────────
function uraniumStocksPage() {
  const groups = STOCK_GROUPS.map((group) => ({ group, stocks: STOCKS_BASE.filter((s) => s.group === group) })).filter((g) => g.stocks.length);
  const main = groups.map(({ group, stocks }) => `
    <section class="group" aria-labelledby="g-${esc(group).replace(/\W+/g, "-").toLowerCase()}">
      <h2 id="g-${esc(group).replace(/\W+/g, "-").toLowerCase()}">${esc(group)}</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Ticker</th><th>Company</th><th class="num">Price</th><th class="num">Today</th></tr></thead>
        <tbody>
          ${stocks.map((s) => `<tr><td class="tick">${esc(s.ticker)}</td><td>${esc(s.name)}<span class="desc">${esc(s.desc)}</span></td><td class="num" data-price="${esc(s.ticker)}">—</td><td class="num" data-pct>—</td></tr>`).join("\n          ")}
        </tbody>
      </table></div>
    </section>`).join("\n");

  return layout({
    slug: "uranium-stocks",
    title: "Uranium and Nuclear Stocks List (Live Prices) | Nuclear Pulse",
    description: `All ${STOCKS_BASE.length} uranium and nuclear energy stocks we track, grouped by miners, fuel cycle, reactor and SMR developers, utilities, services and ETFs, with live prices.`,
    h1: `Uranium and nuclear <em>stocks</em>`,
    body: {
      intro: `<p>Every listed company we follow across the nuclear supply chain, from uranium miners in the Athabasca Basin and Kazakhstan to enrichment, reactor builders, SMR developers and the utilities that run the fleet. ${STOCKS_BASE.length} names in ${groups.length} groups, with live prices during market hours.</p>
      <p class="meta" data-updated>Live prices load below · list updated ${BUILT}</p>`,
      main,
    },
    faq: [
      ["What are the biggest uranium stocks?", "Cameco (CCJ) is the largest listed uranium producer, with mines in Saskatchewan and a stake in Kazakh production. Other widely followed names include NexGen Energy (NXE), Denison Mines (DNN), Uranium Energy Corp (UEC), Energy Fuels (UUUU) and Kazatomprom (NATKY), the world's largest producer."],
      ["Are there uranium ETFs?", "Yes. The Global X Uranium ETF (URA), Sprott Uranium Miners ETF (URNM) and VanEck Uranium and Nuclear ETF (NLR) hold baskets of miners and nuclear companies. NUKZ tracks nuclear energy more broadly."],
      ["Which stocks give exposure to small modular reactors?", "Listed SMR and advanced reactor developers include NuScale Power (SMR), Oklo (OKLO) and NANO Nuclear Energy (NNE). Large industrials such as GE Vernova (GEV) are also involved through the GE Hitachi BWRX-300."],
      ["Is this investment advice?", "No. Nuclear Pulse publishes market data and news for information only. Always do your own research."],
    ],
  });
}

// ── /smr-tracker ─────────────────────────────────────────────────────────
const SMR_ORDER = ["Operational", "Construction", "Licensed", "Licensing", "Design"];
const SMR_COLOR = { Operational: "#4ade80", Construction: "#fbbf24", Licensed: "#60a5fa", Licensing: "#a78bfa", Design: "#b3a489" };

function smrTrackerPage() {
  const projects = [...SMR_PROJECTS].sort((a, b) => SMR_ORDER.indexOf(a.status) - SMR_ORDER.indexOf(b.status) || a.year - b.year);
  const count = (status) => projects.filter((p) => p.status === status).length;
  const main = `
    <div class="stats">
      ${SMR_ORDER.map((s) => `<div class="stat"><b>${count(s)}</b><span>${s}</span></div>`).join("")}
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Design</th><th>Developer</th><th>Country</th><th>Type</th><th class="num">Capacity</th><th class="num">Target</th><th>Status</th></tr></thead>
      <tbody>
        ${projects.map((p) => `<tr><td><strong>${esc(p.name)}</strong><span class="desc">${esc(p.desc)}</span></td><td>${esc(p.company)}</td><td>${esc(p.country)}</td><td>${esc(p.type)}</td><td class="num">${esc(p.capacity)} MW</td><td class="num">${esc(p.year)}</td><td><span class="pill" style="color:${SMR_COLOR[p.status] || "#b3a489"}">${esc(p.status)}</span></td></tr>`).join("\n        ")}
      </tbody>
    </table></div>`;

  return layout({
    slug: "smr-tracker",
    title: "Small Modular Reactor (SMR) Tracker | Nuclear Pulse",
    description: `Status of ${projects.length} small modular reactor projects worldwide, from operating units in China and Russia to designs in licensing: developer, capacity, reactor type and target year.`,
    h1: `Small modular reactor <em>tracker</em>`,
    body: {
      intro: `<p>Where every major small modular reactor actually stands: which are producing power, which are being built, which have regulatory approval, and which are still designs. ${projects.length} projects, sorted from furthest along to earliest stage.</p>
      <p class="meta">Updated ${BUILT}</p>`,
      main,
    },
    faq: [
      ["What is a small modular reactor?", "An SMR is a nuclear reactor of roughly 300 MW or less, designed to be built largely in factories and shipped to site. The goal is lower upfront cost and faster, more repeatable construction than large reactors."],
      ["Are any SMRs operating today?", `Yes. ${projects.filter((p) => p.status === "Operational").map((p) => `${p.name} (${p.country})`).join(" and ")} are operating. Most Western designs are still in licensing or construction.`],
      ["Which SMR is closest to operation in North America?", "Ontario Power Generation's BWRX-300 at the Darlington site in Canada is the most advanced grid-scale SMR project in North America. In the US, TerraPower's Natrium in Wyoming is under construction."],
    ],
  });
}

// ── /reactor-outages ─────────────────────────────────────────────────────
function reactorOutagesPage() {
  const main = `
    <div class="stats">
      <div class="stat"><b data-stat="total">—</b><span>US power reactors</span></div>
      <div class="stat"><b data-stat="full">—</b><span>At full power</span></div>
      <div class="stat"><b data-stat="reduced">—</b><span>Reduced power</span></div>
      <div class="stat"><b data-stat="offline">—</b><span>Offline</span></div>
    </div>
    <section class="group" aria-labelledby="units">
      <h2 id="units">Today's unit status</h2>
      <p class="meta" data-report-date>Loading today's NRC report…</p>
      <div class="table-wrap"><table data-fleet>
        <thead><tr><th>Unit</th><th class="num">Power</th><th>Status</th></tr></thead>
        <tbody><tr><td colspan="3">Loading today's NRC power reactor status report…</td></tr></tbody>
      </table></div>
      <noscript><p>Today's figures need JavaScript. The source is the NRC's daily Power Reactor Status Report.</p></noscript>
    </section>`;

  return layout({
    slug: "reactor-outages",
    title: "US Nuclear Reactor Outages Today | Nuclear Pulse",
    description: "Which US nuclear reactors are offline or running at reduced power today, from the NRC's daily Power Reactor Status Report. Updated every day.",
    h1: `US reactor <em>outages</em> today`,
    body: {
      intro: `<p>Every US commercial power reactor and its output today, as reported by the Nuclear Regulatory Commission. Units that are offline or running below full power are listed first. Most outages are planned refueling, which happens every 18 to 24 months per unit and clusters in spring and autumn.</p>`,
      main,
    },
    faq: [
      ["Where does this data come from?", "The US Nuclear Regulatory Commission publishes a Power Reactor Status Report every day, listing each commercial unit's output as a percentage of full power. This page reads the latest report."],
      ["Why would a reactor be at reduced power?", "Common reasons are refueling outages, planned maintenance, equipment issues, grid conditions, and in summer, cooling-water temperature limits. A unit at 0% is offline."],
      ["How many nuclear reactors are there in the US?", "The United States has about 94 operating commercial power reactors, the largest nuclear fleet in the world, supplying roughly 19% of the country's electricity."],
    ],
  });
}

function write(slug, html) {
  const dir = join(ROOT, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
}

write("uranium-stocks", uraniumStocksPage());
write("smr-tracker", smrTrackerPage());
write("reactor-outages", reactorOutagesPage());
console.log(`[seo] wrote ${PAGES.map((p) => `/${p}`).join(", ")}`);
