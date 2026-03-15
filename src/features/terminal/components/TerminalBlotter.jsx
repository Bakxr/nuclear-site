import { useTerminal } from "../context.jsx";
import { terminalMetricTileStyle } from "./styles.js";

function BlotterTile({ label, value, detail, accent = "#d4a54a" }) {
  return (
    <div style={terminalMetricTileStyle()}>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(245,240,232,0.42)", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 24, color: accent, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 12, lineHeight: 1.55, color: "rgba(245,240,232,0.58)" }}>{detail}</div>
    </div>
  );
}

export default function TerminalBlotter({ isMobileViewport }) {
  const { snapshot, state, compareEntities, watchedSet, filingRows, operationsRows } = useTerminal();
  const operatingPlants = snapshot.entities.plants.filter((plant) => plant.status === "Operating").length;
  const liveSources = snapshot.entities.sourceCatalog.filter((item) => item.status === "Live").length;
  const officialStories = snapshot.entities.newsArticles.filter((item) => item.isOfficial).length;

  return (
    <section style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0,1fr))" : "repeat(6, minmax(0,1fr))", gap: 12 }}>
      <BlotterTile label="Fleet" value={operatingPlants} detail={`${snapshot.entities.countries.length} countries and ${snapshot.entities.reactorUnits.length} unit records`} />
      <BlotterTile label="Catalysts" value={snapshot.entities.newsArticles.length} detail={`${officialStories} official-source stories in the current wire`} accent="#f5f0e8" />
      <BlotterTile label="Filings" value={filingRows.length} detail={filingRows[0] ? `${filingRows[0].ticker} ${filingRows[0].form} is the latest filing` : "SEC radar waiting for the next disclosure"} accent="#7dd3fc" />
      <BlotterTile label="Ops Pulse" value={operationsRows.length} detail={operationsRows[0] ? `${operationsRows[0].plantName} at ${operationsRows[0].powerPct}% power` : "NRC status feed not in focus"} accent="#4ade80" />
      <BlotterTile label="Sources" value={liveSources} detail={`${snapshot.entities.sourceCatalog.length} tracked data rails across public and premium-ready tiers`} accent="#f59e0b" />
      <BlotterTile label="Workspace" value={`${compareEntities.length}/${watchedSet.size}`} detail={`Compare set / watchlist | ${state.layer === "uranium" ? "Fuel-cycle" : "Fleet"} mode`} accent="#c084fc" />
    </section>
  );
}
