import { useTerminal } from "../context.jsx";
import {
  terminalLabelStyle,
  terminalMutedStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";

function BlotterCell({ label, value, detail, tone = "amber", tag }) {
  return (
    <div className="np-terminal-status-cell">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <span style={terminalLabelStyle(tone)}>{label}</span>
        {tag ? <span style={terminalTagStyle({ tone, compact: true })}>{tag}</span> : null}
      </div>
      <div style={{ ...terminalValueStyle({ tone, size: 20 }), marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 10.5, lineHeight: 1.45, marginTop: 6, ...terminalMutedStyle() }}>{detail}</div>
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
      }}
    >
      <BlotterCell
        label="Fleet"
        value={operatingPlants}
        detail={`${snapshot.entities.countries.length} countries | ${snapshot.entities.reactorUnits.length} units`}
        tone="amber"
        tag="live"
      />
      <BlotterCell
        label="Catalysts"
        value={snapshot.entities.newsArticles.length}
        detail={`${officialStories} official-source stories in wire`}
        tone="cyan"
        tag="wire"
      />
      <BlotterCell
        label="Filings"
        value={filingRows.length}
        detail={filingRows[0] ? `${filingRows[0].ticker} ${filingRows[0].form} latest` : "Waiting for next disclosure"}
        tone="amber"
        tag="sec"
      />
      <BlotterCell
        label="Ops"
        value={operationsRows.length}
        detail={operationsRows[0] ? `${operationsRows[0].plantName} ${operationsRows[0].powerPct}%` : "No plant in focus"}
        tone="success"
        tag="nrc"
      />
      <BlotterCell
        label="Sources"
        value={liveSources}
        detail={`${snapshot.entities.sourceCatalog.length} rails tracked`}
        tone="cyan"
        tag="data"
      />
      <BlotterCell
        label="Workspace"
        value={`${compareEntities.length}/${watchedSet.size}`}
        detail={`Compare / watch | ${state.layer === "uranium" ? "fuel" : "fleet"} mode`}
        tone="danger"
        tag="state"
      />
    </section>
  );
}
