import { useTerminal } from "../context.jsx";
import {
  terminalLabelStyle,
  terminalMutedStyle,
  terminalValueStyle,
} from "./styles.js";
import { color } from "./tokens.js";

// Tight instrument strip: hairline-separated cells, mono numerics, no card chrome.
function BlotterCell({ label, value, detail, tone = "default" }) {
  return (
    <div
      className="np-terminal-status-cell"
      style={{
        padding: "6px 10px",
        borderRight: `1px solid ${color.border}`,
        minWidth: 0,
      }}
    >
      <div style={terminalLabelStyle(tone)}>{label}</div>
      <div style={{ ...terminalValueStyle({ tone, size: 14 }), marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 10, lineHeight: 1.3, marginTop: 2, ...terminalMutedStyle() }}>{detail}</div>
    </div>
  );
}

export default function TerminalBlotter({ isMobileViewport }) {
  const { snapshot, state, compareEntities, watchedSet, filingRows, operationsRows } = useTerminal();
  const operatingPlants = snapshot.entities.plants.filter((plant) => plant.status === "Operating").length;
  const liveSources = snapshot.entities.sourceCatalog.filter((item) => item.status === "Live").length;
  const officialStories = snapshot.entities.newsArticles.filter((item) => item.isOfficial).length;

  return (
    <section
      className="np-terminal-status-board"
      style={{
        display: "grid",
        gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0,1fr))" : "repeat(6, minmax(0,1fr))",
        borderTop: `1px solid ${color.border}`,
        borderBottom: `1px solid ${color.border}`,
        background: color.bg,
      }}
    >
      <BlotterCell
        label="Fleet"
        value={operatingPlants}
        detail={`${snapshot.entities.countries.length} countries / ${snapshot.entities.reactorUnits.length} units`}
        tone="accent"
      />
      <BlotterCell
        label="Catalysts"
        value={snapshot.entities.newsArticles.length}
        detail={`${officialStories} official-source items`}
        tone="info"
      />
      <BlotterCell
        label="Filings"
        value={filingRows.length}
        detail={filingRows[0] ? `${filingRows[0].ticker} ${filingRows[0].form}` : "No new disclosures"}
        tone="accent"
      />
      <BlotterCell
        label="Ops"
        value={operationsRows.length}
        detail={operationsRows[0] ? `${operationsRows[0].plantName} ${operationsRows[0].powerPct}%` : "No focus"}
        tone="positive"
      />
      <BlotterCell
        label="Sources"
        value={liveSources}
        detail={`${snapshot.entities.sourceCatalog.length} rails tracked`}
        tone="info"
      />
      <BlotterCell
        label="Workspace"
        value={`${compareEntities.length}/${watchedSet.size}`}
        detail={`Compare / watch · ${state.layer === "uranium" ? "fuel" : "fleet"}`}
        tone="warning"
      />
    </section>
  );
}
