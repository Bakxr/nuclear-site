import { useTerminal } from "../context.jsx";
import {
  terminalLabelStyle,
  terminalMetricTileStyle,
  terminalMutedStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";

function BlotterTile({ label, value, detail, accent = "var(--np-terminal-amber)", tag }) {
  const tone = accent === "var(--np-terminal-cyan)"
    ? "cyan"
    : accent === "var(--np-terminal-green)"
      ? "success"
      : accent === "var(--np-terminal-red)"
        ? "danger"
        : "amber";

  return (
    <div style={terminalMetricTileStyle({ accent })}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div style={terminalLabelStyle(tone)}>{label}</div>
        {tag ? <span style={terminalTagStyle({ tone, compact: true })}>{tag}</span> : null}
      </div>
      <div style={{ ...terminalValueStyle({ tone, size: 24 }), marginBottom: 8 }}>{value}</div>
      <div style={{ fontSize: 11.5, lineHeight: 1.6, ...terminalMutedStyle() }}>{detail}</div>
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
      <BlotterTile
        label="Fleet"
        value={operatingPlants}
        detail={`${snapshot.entities.countries.length} countries // ${snapshot.entities.reactorUnits.length} unit records`}
        tag="Live"
      />
      <BlotterTile
        label="Catalysts"
        value={snapshot.entities.newsArticles.length}
        detail={`${officialStories} official-source stories in the current wire`}
        accent="var(--np-terminal-cyan)"
        tag="Wire"
      />
      <BlotterTile
        label="Filings"
        value={filingRows.length}
        detail={filingRows[0] ? `${filingRows[0].ticker} ${filingRows[0].form} is the latest disclosure` : "SEC radar waiting for the next disclosure"}
        accent="var(--np-terminal-amber)"
        tag="SEC"
      />
      <BlotterTile
        label="Ops pulse"
        value={operationsRows.length}
        detail={operationsRows[0] ? `${operationsRows[0].plantName} at ${operationsRows[0].powerPct}% power` : "NRC status feed not in focus"}
        accent="var(--np-terminal-green)"
        tag="NRC"
      />
      <BlotterTile
        label="Sources"
        value={liveSources}
        detail={`${snapshot.entities.sourceCatalog.length} tracked data rails across public and premium-ready tiers`}
        accent="var(--np-terminal-cyan)"
        tag="Live"
      />
      <BlotterTile
        label="Workspace"
        value={`${compareEntities.length}/${watchedSet.size}`}
        detail={`Compare queue / watchlist // ${state.layer === "uranium" ? "Fuel-cycle" : "Fleet"} mode`}
        accent="var(--np-terminal-red)"
        tag="State"
      />
    </section>
  );
}
