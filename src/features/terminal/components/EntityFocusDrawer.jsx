import CompareTray from "./CompareTray.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalButtonStyle,
  terminalLabelStyle,
  terminalMetricTileStyle,
  terminalMutedStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";
import { useTerminal } from "../context.jsx";

function renderEntityBody(entity) {
  if (!entity) return "";
  if (entity.entityType === "country") return `${entity.reactors} reactors | ${entity.capacityGw.toFixed(1)} GW | ${entity.nuclearShare ?? 0}% nuclear share | ${entity.activeProjects} active projects.`;
  if (entity.entityType === "plant") return `${entity.capacityMw.toLocaleString("en-US")} MW | ${entity.normalizedType} | ${entity.status}.`;
  if (entity.entityType === "company") return `${entity.theme} exposure across ${entity.countries.length || 1} tracked geographies.`;
  if (entity.entityType === "story") return entity.whyItMatters || entity.curiosityHook;
  if (entity.entityType === "project") return `${entity.status}${entity.targetYear ? ` | target ${entity.targetYear}` : ""} | ${entity.capacityMw} MW | ${entity.country}.`;
  if (entity.entityType === "filing") return `${entity.form} filed for ${entity.companyName} on ${entity.filedLabel}.`;
  if (entity.entityType === "operationsSignal") return `${entity.plantName} is reporting ${entity.powerPct}% power on the NRC operations feed.`;
  if (entity.entityType === "sourceBrief") return `${entity.category} coverage. ${entity.coverage}`;
  return entity.summary || entity.desc || "";
}

function buildFocusFacts(entity, snapshot) {
  if (!entity) {
    return [
      { label: "Plants", value: snapshot.entities.plants.length, tone: "amber" },
      { label: "Supply", value: snapshot.entities.supplySites.length, tone: "cyan" },
      { label: "Equities", value: snapshot.entities.marketInstruments.length, tone: "success" },
      { label: "Filings", value: snapshot.entities.companyFilings.length, tone: "amber" },
    ];
  }

  if (entity.entityType === "country") {
    return [
      { label: "Reactors", value: entity.reactors, tone: "amber" },
      { label: "Capacity", value: `${entity.capacityGw.toFixed(1)} GW`, tone: "cyan" },
      { label: "Share", value: `${entity.nuclearShare ?? 0}%`, tone: "success" },
      { label: "Projects", value: entity.activeProjects, tone: "amber" },
    ];
  }
  if (entity.entityType === "plant") {
    return [
      { label: "Capacity", value: `${entity.capacityMw.toLocaleString("en-US")} MW`, tone: "amber" },
      { label: "Type", value: entity.normalizedType, tone: "cyan" },
      { label: "Status", value: entity.status, tone: "success" },
      { label: "Country", value: entity.country, tone: "amber" },
    ];
  }
  if (entity.entityType === "company") {
    return [
      { label: "Theme", value: entity.theme, tone: "amber" },
      { label: "Markets", value: entity.countries?.length || 1, tone: "cyan" },
      { label: "Tickers", value: entity.tickers?.length || 1, tone: "success" },
      { label: "Type", value: "Company", tone: "amber" },
    ];
  }
  if (entity.entityType === "story") {
    return [
      { label: "Tag", value: entity.tag || "Story", tone: "amber" },
      { label: "Country", value: entity.country || "Global", tone: "cyan" },
      { label: "Source", value: entity.sourceName || entity.source || "Wire", tone: "success" },
      { label: "Date", value: entity.dateLabel || "Recent", tone: "amber" },
    ];
  }
  if (entity.entityType === "project") {
    return [
      { label: "Status", value: entity.status, tone: "amber" },
      { label: "Country", value: entity.country, tone: "cyan" },
      { label: "Type", value: entity.type, tone: "success" },
      { label: "Capacity", value: `${entity.capacityMw} MW`, tone: "amber" },
    ];
  }
  if (entity.entityType === "filing") {
    return [
      { label: "Ticker", value: entity.ticker, tone: "amber" },
      { label: "Form", value: entity.form, tone: "cyan" },
      { label: "Filed", value: entity.filedLabel || entity.filingDate || "Recent", tone: "success" },
      { label: "Entity", value: entity.companyName, tone: "amber" },
    ];
  }
  if (entity.entityType === "operationsSignal") {
    return [
      { label: "Power", value: `${entity.powerPct}%`, tone: "success" },
      { label: "Status", value: entity.status, tone: "amber" },
      { label: "Unit", value: entity.unitLabel || "Fleet", tone: "cyan" },
      { label: "Country", value: entity.country, tone: "amber" },
    ];
  }
  if (entity.entityType === "sourceBrief") {
    return [
      { label: "Category", value: entity.category, tone: "cyan" },
      { label: "Status", value: entity.status, tone: "success" },
      { label: "Access", value: entity.access, tone: "amber" },
      { label: "Items", value: entity.count || "--", tone: "amber" },
    ];
  }

  return [
    { label: "Type", value: entity.entityType, tone: "amber" },
    { label: "Source", value: entity.source || "Terminal", tone: "cyan" },
  ];
}

export default function EntityFocusDrawer({ isMobileViewport }) {
  const {
    snapshot,
    selectedEntity,
    marketRows,
    newsRows,
    pipelineRows,
    filingRows,
    operationsRows,
    toggleCompare,
    toggleWatch,
    watchedSet,
  } = useTerminal();

  const title = selectedEntity ? (selectedEntity.name || selectedEntity.title || selectedEntity.country) : "Global workspace";
  const eyebrow = selectedEntity ? `${selectedEntity.entityType} focus` : "Live context";
  const body = selectedEntity
    ? renderEntityBody(selectedEntity)
    : `Track ${snapshot.entities.plants.length} plant records, ${snapshot.entities.supplySites.length} fuel-cycle sites, ${snapshot.entities.marketInstruments.length} market instruments, ${snapshot.entities.companyFilings.length} SEC filings, and ${snapshot.entities.newsArticles.length} catalyst stories in one workspace.`;
  const canCompare = selectedEntity && ["country", "plant", "company", "project"].includes(selectedEntity.entityType);
  const facts = buildFocusFacts(selectedEntity, snapshot);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <TerminalPanel>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={terminalLabelStyle("cyan")}>{eyebrow}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: isMobileViewport ? 22 : 26, lineHeight: 1.08, color: "var(--np-terminal-text)" }}>
              {title}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 720, ...terminalMutedStyle() }}>{body}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0,1fr))" : `repeat(${Math.min(facts.length, 4)}, minmax(0,1fr))`, gap: 10 }}>
            {facts.map((fact) => (
              <div key={`${fact.label}-${fact.value}`} style={terminalMetricTileStyle({ accent: fact.tone === "cyan" ? "var(--np-terminal-cyan)" : fact.tone === "success" ? "var(--np-terminal-green)" : "var(--np-terminal-amber)" })}>
                <div style={terminalLabelStyle(fact.tone === "cyan" ? "cyan" : fact.tone === "success" ? "success" : "amber")}>{fact.label}</div>
                <div style={{ ...terminalValueStyle({ tone: fact.tone, size: 18 }), marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {fact.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {selectedEntity?.source ? <span style={terminalTagStyle({ compact: true })}>{selectedEntity.source}</span> : null}
            {selectedEntity?.access ? <span style={terminalTagStyle({ tone: selectedEntity.access === "terminal" ? "cyan" : "amber", compact: true })}>{selectedEntity.access}</span> : null}
            {selectedEntity?.confidence ? <span style={terminalTagStyle({ tone: "success", compact: true })}>{Math.round(selectedEntity.confidence * 100)}% confidence</span> : null}
            {!selectedEntity ? <span style={terminalTagStyle({ tone: "cyan", compact: true })}>Global scope</span> : null}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canCompare ? <button type="button" onClick={() => toggleCompare(selectedEntity.id)} className="np-terminal-button" style={terminalButtonStyle(false)}>Add to compare</button> : null}
            {selectedEntity ? (
              <button type="button" onClick={() => toggleWatch(selectedEntity.id)} className="np-terminal-button" style={terminalButtonStyle(false, { tone: "cyan" })}>
                {watchedSet.has(selectedEntity.id) ? "Starred" : "Star"}
              </button>
            ) : null}
            {selectedEntity?.url ? (
              <a href={selectedEntity.url} target="_blank" rel="noopener noreferrer" className="np-terminal-button np-terminal-link" style={{ ...terminalButtonStyle(false, { tone: "amber" }), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Source
              </a>
            ) : null}
          </div>
        </div>
      </TerminalPanel>

      <CompareTray />

      <TerminalPanel title="Linked context" subtitle="Downstream surfaces currently illuminated by the active focus.">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0,1fr))" : "repeat(5, minmax(0,1fr))", gap: 10 }}>
            <div style={terminalMetricTileStyle({ accent: "var(--np-terminal-cyan)" })}>
              <div style={terminalLabelStyle("cyan")}>Markets</div>
              <div style={{ ...terminalValueStyle({ tone: "cyan", size: 20 }), marginTop: 8 }}>{marketRows.slice(0, 6).length}</div>
            </div>
            <div style={terminalMetricTileStyle({ accent: "var(--np-terminal-green)" })}>
              <div style={terminalLabelStyle("success")}>Catalysts</div>
              <div style={{ ...terminalValueStyle({ tone: "success", size: 20 }), marginTop: 8 }}>{newsRows.slice(0, 6).length}</div>
            </div>
            <div style={terminalMetricTileStyle({ accent: "var(--np-terminal-amber)" })}>
              <div style={terminalLabelStyle()}>Pipeline</div>
              <div style={{ ...terminalValueStyle({ tone: "amber", size: 20 }), marginTop: 8 }}>{pipelineRows.slice(0, 6).length}</div>
            </div>
            <div style={terminalMetricTileStyle({ accent: "var(--np-terminal-cyan)" })}>
              <div style={terminalLabelStyle("cyan")}>Filings</div>
              <div style={{ ...terminalValueStyle({ tone: "cyan", size: 20 }), marginTop: 8 }}>{filingRows.slice(0, 6).length}</div>
            </div>
            <div style={terminalMetricTileStyle({ accent: "var(--np-terminal-green)" })}>
              <div style={terminalLabelStyle("success")}>Ops</div>
              <div style={{ ...terminalValueStyle({ tone: "success", size: 20 }), marginTop: 8 }}>{operationsRows.slice(0, 6).length}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.65, ...terminalMutedStyle() }}>
            Source trust labels and access states stay attached to every entity so public-safe signals can coexist with terminal-only drilldowns.
          </div>
        </div>
      </TerminalPanel>
    </div>
  );
}
