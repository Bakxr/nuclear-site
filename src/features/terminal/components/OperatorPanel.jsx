import TerminalPanel from "./TerminalPanel.jsx";
import { useTerminal } from "../context.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLabelStyle,
  terminalLinkStyle,
  terminalMetricDotStyle,
  terminalMetricEyebrowStyle,
  terminalMetricTileStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTableHeaderStyle,
  terminalTagStyle,
  terminalToneColor,
  terminalValueStyle,
} from "./styles.js";

function renderEntityBody(entity, snapshot) {
  if (!entity) {
    return `Track ${snapshot.entities.plants.length} plants, ${snapshot.entities.supplySites.length} supply sites, ${snapshot.entities.marketInstruments.length} equities, and ${snapshot.entities.companyFilings.length} filings from one workspace.`;
  }
  if (entity.entityType === "country") return `${entity.reactors} reactors | ${entity.capacityGw.toFixed(1)} GW | ${entity.nuclearShare ?? 0}% nuclear share | ${entity.activeProjects} active projects`;
  if (entity.entityType === "plant") return `${entity.capacityMw.toLocaleString("en-US")} MW | ${entity.normalizedType} | ${entity.status}`;
  if (entity.entityType === "company") return `${entity.theme} exposure across ${entity.countries.length || 1} tracked geographies`;
  if (entity.entityType === "story") return entity.whyItMatters || entity.curiosityHook;
  if (entity.entityType === "project") return `${entity.status}${entity.targetYear ? ` | target ${entity.targetYear}` : ""} | ${entity.capacityMw} MW | ${entity.country}`;
  if (entity.entityType === "filing") return `${entity.form} filed for ${entity.companyName} on ${entity.filedLabel}`;
  if (entity.entityType === "operationsSignal") return `${entity.plantName} is reporting ${entity.powerPct}% power on the NRC feed`;
  if (entity.entityType === "sourceBrief") return `${entity.category} coverage | ${entity.coverage}`;
  return entity.summary || entity.desc || "";
}

function buildFocusFacts(entity, snapshot) {
  if (!entity) {
    return [
      { label: "Plants", value: snapshot.entities.plants.length, tone: "amber" },
      { label: "Supply", value: snapshot.entities.supplySites.length, tone: "cyan" },
      { label: "Equities", value: snapshot.entities.marketInstruments.length, tone: "success" },
      { label: "Filings", value: snapshot.entities.companyFilings.length, tone: "warning" },
    ];
  }

  if (entity.entityType === "country") {
    return [
      { label: "Reactors", value: entity.reactors, tone: "amber" },
      { label: "Capacity", value: `${entity.capacityGw.toFixed(1)} GW`, tone: "cyan" },
      { label: "Share", value: `${entity.nuclearShare ?? 0}%`, tone: "success" },
      { label: "Projects", value: entity.activeProjects, tone: "warning" },
    ];
  }
  if (entity.entityType === "plant") {
    return [
      { label: "Capacity", value: `${entity.capacityMw.toLocaleString("en-US")} MW`, tone: "amber" },
      { label: "Type", value: entity.normalizedType, tone: "cyan" },
      { label: "Status", value: entity.status, tone: entity.status === "Operating" ? "success" : "warning" },
      { label: "Country", value: entity.country, tone: "warning" },
    ];
  }
  if (entity.entityType === "company") {
    return [
      { label: "Theme", value: entity.theme, tone: "amber" },
      { label: "Markets", value: entity.countries?.length || 1, tone: "cyan" },
      { label: "Tickers", value: entity.tickers?.length || 1, tone: "success" },
      { label: "Type", value: "Company", tone: "warning" },
    ];
  }
  if (entity.entityType === "story") {
    return [
      { label: "Tag", value: entity.tag || "Story", tone: "amber" },
      { label: "Country", value: entity.country || "Global", tone: "cyan" },
      { label: "Source", value: entity.sourceName || entity.source || "Wire", tone: "success" },
      { label: "Date", value: entity.dateLabel || "Recent", tone: "warning" },
    ];
  }
  if (entity.entityType === "project") {
    return [
      { label: "Status", value: entity.status, tone: "warning" },
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
      { label: "Entity", value: entity.companyName, tone: "warning" },
    ];
  }
  if (entity.entityType === "operationsSignal") {
    return [
      { label: "Power", value: `${entity.powerPct}%`, tone: entity.powerPct >= 95 ? "success" : entity.powerPct >= 60 ? "warning" : "danger" },
      { label: "Status", value: entity.status, tone: "warning" },
      { label: "Unit", value: entity.unitLabel || "Fleet", tone: "cyan" },
      { label: "Country", value: entity.country, tone: "amber" },
    ];
  }
  if (entity.entityType === "sourceBrief") {
    return [
      { label: "Category", value: entity.category, tone: "cyan" },
      { label: "Status", value: entity.status, tone: "success" },
      { label: "Access", value: entity.access, tone: "amber" },
      { label: "Items", value: entity.count || "--", tone: "warning" },
    ];
  }

  return [
    { label: "Type", value: entity.entityType, tone: "amber" },
    { label: "Source", value: entity.source || "Terminal", tone: "cyan" },
  ];
}

function buildMetaRows(entity) {
  if (!entity) {
    return [
      ["Mode", "Global workspace"],
      ["Layer", "Reactor, fuel-cycle, filing, and market surfaces"],
      ["Scope", "No active entity focus"],
    ];
  }

  const metaRows = [
    ["Entity", entity.entityType],
    ["Country", entity.country || entity.hqCountry || entity.region || "--"],
    ["Source", entity.sourceName || entity.source || "--"],
    ["Access", entity.access || "--"],
    ["Status", entity.status || entity.stage || entity.form || entity.tag || "--"],
  ];

  if (entity.dateLabel || entity.filedLabel || entity.filingDate || entity.targetYear) {
    metaRows.push(["Date", entity.dateLabel || entity.filedLabel || entity.filingDate || entity.targetYear]);
  }

  return metaRows;
}

function powerColor(powerPct) {
  if (powerPct >= 95) return "var(--np-terminal-green)";
  if (powerPct >= 60) return "var(--np-terminal-yellow)";
  return "var(--np-terminal-red)";
}

function formatFiledLabel(value) {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function sourceStatusTone(status) {
  if (status === "Live") return "success";
  if (status === "Snapshot") return "amber";
  return "cyan";
}

function ContextCell({ label, value, tone }) {
  const accent = terminalToneColor(tone === "default" ? "amber" : tone);
  const valueText = String(value);
  const isMetricValue = /^[$~]?\d/.test(valueText);

  return (
    <div style={terminalMetricTileStyle({ accent, compact: true })}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span aria-hidden="true" style={terminalMetricDotStyle(accent)} />
        <div style={terminalMetricEyebrowStyle()}>{label}</div>
      </div>
      <div style={{ ...terminalValueStyle({ tone, size: isMetricValue ? 24 : 16 }), marginTop: 10, letterSpacing: isMetricValue ? "-0.02em" : "0" }}>
        {value}
      </div>
    </div>
  );
}

function CompareQueue({ compareEntities, toggleCompare }) {
  if (!compareEntities.length) return null;

  return (
    <div style={{ display: "grid", gap: 0, padding: "0 16px", border: "1px solid rgba(125,139,156,0.12)", borderRadius: 18, background: "rgba(255,255,255,0.03)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "14px 0 10px", borderBottom: "1px solid rgba(125,139,156,0.1)" }}>
        <div style={terminalLabelStyle("cyan")}>Compare queue</div>
        <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{compareEntities.length} armed</span>
      </div>
      {compareEntities.map((entity) => (
        <div
          key={entity.id}
          className="np-terminal-row"
          style={{
            ...terminalDataRowStyle(),
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) auto",
            gap: 8,
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "var(--np-terminal-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {entity.name || entity.country || entity.title}
            </div>
            <div style={{ fontSize: 10.5, marginTop: 4, ...terminalMutedStyle() }}>{entity.entityType}</div>
          </div>
          <button type="button" onClick={() => toggleCompare(entity.id)} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true })}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function FocusTab({ isMobileViewport }) {
  const {
    snapshot,
    selectedEntity,
    marketRows,
    newsRows,
    pipelineRows,
    filingRows,
    operationsRows,
    compareEntities,
    toggleCompare,
    toggleWatch,
    watchedSet,
  } = useTerminal();

  const title = selectedEntity ? (selectedEntity.name || selectedEntity.title || selectedEntity.country) : "Workspace summary";
  const eyebrow = selectedEntity ? "Current focus" : "Workspace";
  const body = renderEntityBody(selectedEntity, snapshot);
  const canCompare = selectedEntity && ["country", "plant", "company", "project"].includes(selectedEntity.entityType);
  const facts = buildFocusFacts(selectedEntity, snapshot);
  const metaRows = buildMetaRows(selectedEntity);
  const connectedStats = [
    { label: "Markets", value: marketRows.slice(0, 6).length, tone: "cyan" },
    { label: "Catalysts", value: newsRows.slice(0, 6).length, tone: "success" },
    { label: "Pipeline", value: pipelineRows.slice(0, 6).length, tone: "amber" },
    { label: "Filings", value: filingRows.slice(0, 6).length, tone: "warning" },
    { label: "Ops", value: operationsRows.slice(0, 6).length, tone: "success" },
  ];

  return (
    <div className="np-terminal-operator-section">
      <div style={{ display: "grid", gap: 4 }}>
        <div style={terminalLabelStyle("cyan")}>{eyebrow}</div>
        <div style={{ ...terminalValueStyle({ size: isMobileViewport ? 22 : 24 }), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </div>
        <div style={{ fontSize: 11.5, lineHeight: 1.65, ...terminalMutedStyle() }}>{body}</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))",
          gap: 10,
        }}
      >
        {facts.map((fact) => (
          <ContextCell key={`${fact.label}-${fact.value}`} label={fact.label} value={fact.value} tone={fact.tone} />
        ))}
      </div>

      <div style={{ display: "grid", gap: 0, padding: "0 16px", border: "1px solid rgba(125,139,156,0.12)", borderRadius: 18, background: "rgba(255,255,255,0.03)" }}>
        {metaRows.map(([label, value], index) => (
          <div
            key={`${label}-${value}`}
            className="np-terminal-row"
            style={{
              ...terminalDataRowStyle(),
              borderTop: index === 0 ? "none" : terminalDataRowStyle().borderTop,
              display: "grid",
              gridTemplateColumns: "78px minmax(0,1fr)",
              gap: 10,
              alignItems: "baseline",
            }}
          >
            <div style={terminalLabelStyle("cyan")}>{label}</div>
            <div style={{ fontSize: 11.5, color: "var(--np-terminal-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {String(value)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {canCompare ? <button type="button" onClick={() => toggleCompare(selectedEntity.id)} className="np-terminal-button" style={terminalButtonStyle(false)}>Add compare</button> : null}
        {selectedEntity ? (
          <button type="button" onClick={() => toggleWatch(selectedEntity.id)} className="np-terminal-button" style={terminalButtonStyle(false, { tone: "cyan" })}>
            {watchedSet.has(selectedEntity.id) ? "Starred" : "Star"}
          </button>
        ) : null}
        {selectedEntity?.url ? (
          <a
            href={selectedEntity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="np-terminal-button np-terminal-link"
            style={{ ...terminalButtonStyle(false, { tone: "amber" }), textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Source
          </a>
        ) : null}
      </div>

      <CompareQueue compareEntities={compareEntities} toggleCompare={toggleCompare} />

      <div style={{ display: "grid", gap: 8 }}>
        <div style={terminalLabelStyle("amber")}>Connected data</div>
        <div style={{ display: "grid", gap: 0, padding: "0 16px", border: "1px solid rgba(125,139,156,0.12)", borderRadius: 18, background: "rgba(255,255,255,0.03)" }}>
          {connectedStats.map((item, index) => (
            <div
              key={item.label}
              className="np-terminal-row"
              style={{
                ...terminalDataRowStyle(),
                borderTop: index === 0 ? "none" : terminalDataRowStyle().borderTop,
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) auto",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 11.5, color: "var(--np-terminal-text)", fontWeight: 600 }}>{item.label}</div>
              <span style={terminalTagStyle({ tone: item.tone, compact: true })}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OpsTab() {
  const { operationsRows, selectEntity } = useTerminal();

  return (
    <div className="np-terminal-operator-section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={terminalLabelStyle("success")}>Operations</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 5, ...terminalMutedStyle() }}>
            U.S. unit power levels sit here so the current focus can be checked against live performance without leaving the workspace.
          </div>
        </div>
        <span style={terminalTagStyle({ tone: "success", compact: true })}>{operationsRows.length} units</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 12, padding: "0 16px 8px", borderBottom: "1px solid rgba(125,139,156,0.1)" }}>
        <div style={terminalTableHeaderStyle("left", "cyan")}>Unit</div>
        <div style={terminalTableHeaderStyle("right", "cyan")}>Power</div>
        <div style={terminalTableHeaderStyle("right", "cyan")}>NRC</div>
      </div>
      <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(460), padding: "0 16px" }}>
        {operationsRows.slice(0, 14).map((signal) => (
          <div key={signal.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => selectEntity(signal)}
              className="np-terminal-button"
              style={{ background: "transparent", border: "none", textAlign: "left", color: "var(--np-terminal-text)", padding: 0, cursor: "pointer", minWidth: 0 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{signal.plantName}</div>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: powerColor(signal.powerPct), fontWeight: 700 }}>
                  {signal.status}
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--np-terminal-muted)" }}>
                {signal.unitLabel ? `Unit ${signal.unitLabel} | ` : ""}{signal.country}
              </div>
            </button>
            <div style={{ ...terminalValueStyle({ tone: signal.powerPct >= 95 ? "success" : signal.powerPct >= 60 ? "warning" : "danger", size: 16 }) }}>
              {signal.powerPct}%
            </div>
            <a href={signal.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle()}>
              NRC
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilingsTab() {
  const { filingRows, selectEntity } = useTerminal();

  return (
    <div className="np-terminal-operator-section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={terminalLabelStyle("amber")}>Filings</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 5, ...terminalMutedStyle() }}>
            Disclosure flow stays close so a market or project question can be checked against the latest SEC paper trail.
          </div>
        </div>
        <span style={terminalTagStyle({ tone: "amber", compact: true })}>{filingRows.length} filings</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "56px minmax(0,1fr) auto", gap: 12, padding: "0 16px 8px", borderBottom: "1px solid rgba(125,139,156,0.1)" }}>
        <div style={terminalTableHeaderStyle("left", "cyan")}>Ticker</div>
        <div style={terminalTableHeaderStyle("left", "cyan")}>Form / entity</div>
        <div style={terminalTableHeaderStyle("right", "cyan")}>SEC</div>
      </div>
      <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(460), padding: "0 16px" }}>
        {filingRows.slice(0, 14).map((filing) => (
          <div key={filing.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "56px minmax(0,1fr) auto", gap: 12, alignItems: "start" }}>
            <button
              type="button"
              onClick={() => selectEntity(filing)}
              className="np-terminal-button"
              style={{ background: "transparent", border: "none", color: "var(--np-terminal-amber)", fontFamily: "'DM Mono',monospace", fontWeight: 700, textAlign: "left", cursor: "pointer", padding: 0 }}
            >
              {filing.ticker}
            </button>
            <button
              type="button"
              onClick={() => selectEntity(filing)}
              className="np-terminal-button"
              style={{ background: "transparent", border: "none", color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ ...terminalValueStyle({ tone: "cyan", size: 12 }), fontWeight: 700 }}>{filing.form}</div>
                <span style={{ fontSize: 10.5, ...terminalMutedStyle() }}>{formatFiledLabel(filing.filingDate)}</span>
              </div>
              <div style={{ fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 4, ...terminalMutedStyle() }}>
                {filing.companyName}
              </div>
              <div style={{ fontSize: 10.5, marginTop: 4, ...terminalMutedStyle() }}>{filing.summary}</div>
            </button>
            {filing.url ? (
              <a href={filing.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle("cyan")}>
                SEC
              </a>
            ) : (
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--np-terminal-muted)" }}>
                SEC
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SourcesTab() {
  const { sourceRows, selectEntity } = useTerminal();
  const liveCount = sourceRows.filter((item) => item.status === "Live").length;

  return (
    <div className="np-terminal-operator-section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={terminalLabelStyle("cyan")}>Sources</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 5, ...terminalMutedStyle() }}>
            This is the quietest view in the workspace: source status, access level, and live vs. snapshot posture at a glance.
          </div>
        </div>
        <span style={terminalTagStyle({ tone: "success", compact: true })}>{liveCount} live</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 12, padding: "0 16px 8px", borderBottom: "1px solid rgba(125,139,156,0.1)" }}>
        <div style={terminalTableHeaderStyle("left", "cyan")}>Source</div>
        <div style={terminalTableHeaderStyle("right", "cyan")}>Status</div>
        <div style={terminalTableHeaderStyle("right", "cyan")}>Link</div>
      </div>
      <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(460), padding: "0 16px" }}>
        {sourceRows.map((source) => (
          <div key={source.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => selectEntity(source)}
              className="np-terminal-button"
              style={{ background: "transparent", border: "none", textAlign: "left", color: "var(--np-terminal-text)", padding: 0, cursor: "pointer", minWidth: 0 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{source.name}</div>
                <span style={{ fontSize: 10.5, ...terminalMutedStyle() }}>{source.category}</span>
              </div>
              <div style={{ fontSize: 10.5, lineHeight: 1.45, marginTop: 5, ...terminalMutedStyle() }}>{source.coverage}</div>
            </button>
            <div style={{ display: "grid", justifyItems: "end", gap: 4 }}>
              <span style={terminalTagStyle({ tone: sourceStatusTone(source.status), compact: true })}>{source.status}</span>
              <div style={{ fontSize: 10.5, ...terminalMutedStyle() }}>
                {source.count ? `${source.count}` : source.access}
              </div>
            </div>
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle()}>
              Source
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OperatorPanel({ activeTab = "focus", onTabChange, isMobileViewport }) {
  const { selectedEntity } = useTerminal();
  const tabs = [
    { id: "focus", label: "Focus" },
    { id: "ops", label: "Ops" },
    { id: "filings", label: "Filings" },
    { id: "sources", label: "Sources" },
  ];

  return (
    <TerminalPanel
      panelId="terminal-panel-operator"
      title="Workspace"
      subtitle="Selection details, live unit status, filings, and source status stay consolidated here instead of competing as separate side modules."
      actions={[
        <span key="focus" style={terminalTagStyle({ tone: selectedEntity ? "warning" : "cyan", compact: true })}>
          {selectedEntity ? "Focused" : "Global"}
        </span>,
      ]}
    >
      <div className="np-terminal-operator-section">
        <div className="np-terminal-operator-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="np-terminal-button"
              style={terminalButtonStyle(activeTab === tab.id, { compact: true, tone: tab.id === "focus" ? "amber" : "cyan" })}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "focus" ? <FocusTab isMobileViewport={isMobileViewport} /> : null}
        {activeTab === "ops" ? <OpsTab /> : null}
        {activeTab === "filings" ? <FilingsTab /> : null}
        {activeTab === "sources" ? <SourcesTab /> : null}
      </div>
    </TerminalPanel>
  );
}
