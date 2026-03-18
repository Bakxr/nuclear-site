import CompareTray from "./CompareTray.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLabelStyle,
  terminalMetricDotStyle,
  terminalMetricEyebrowStyle,
  terminalMetricTileStyle,
  terminalMutedStyle,
  terminalTagStyle,
  terminalToneColor,
  terminalValueStyle,
} from "./styles.js";
import { useTerminal } from "../context.jsx";

function renderEntityBody(entity) {
  if (!entity) return "";
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

function buildMetaRows(entity) {
  if (!entity) {
    return [
      ["Mode", "Global workspace"],
      ["Layer", "Linked reactor, uranium, filing, and market surfaces"],
      ["Scope", "No active focus entity"],
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

function ContextCell({ label, value, tone }) {
  const accent = terminalToneColor(tone === "default" ? "amber" : tone);

  return (
    <div style={terminalMetricTileStyle({ accent, compact: true })}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span aria-hidden="true" style={terminalMetricDotStyle(accent)} />
        <div style={terminalMetricEyebrowStyle()}>{label}</div>
      </div>
      <div style={{ ...terminalValueStyle({ tone, size: 18 }), marginTop: 9 }}>{value}</div>
    </div>
  );
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
    : `Track ${snapshot.entities.plants.length} plants, ${snapshot.entities.supplySites.length} supply sites, ${snapshot.entities.marketInstruments.length} equities, ${snapshot.entities.companyFilings.length} filings, and ${snapshot.entities.newsArticles.length} catalyst stories from one console.`;
  const canCompare = selectedEntity && ["country", "plant", "company", "project"].includes(selectedEntity.entityType);
  const facts = buildFocusFacts(selectedEntity, snapshot);
  const metaRows = buildMetaRows(selectedEntity);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <TerminalPanel panelId="terminal-panel-focus" title="Focus drawer" subtitle="Active entity context, metadata, compare, and linked surface counts.">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={terminalLabelStyle("cyan")}>{eyebrow}</div>
            <div style={{ ...terminalValueStyle({ size: isMobileViewport ? 19 : 21 }), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {title}
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.55, ...terminalMutedStyle() }}>{body}</div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 8,
            }}
          >
            {facts.map((fact) => (
              <ContextCell key={`${fact.label}-${fact.value}`} label={fact.label} value={fact.value} tone={fact.tone} />
            ))}
          </div>

          <div style={{ display: "grid", gap: 0, padding: "0 10px", border: "1px solid rgba(51,66,86,0.92)", background: "rgba(7,10,15,0.94)" }}>
            {metaRows.map(([label, value], index) => (
              <div
                key={`${label}-${value}`}
                className="np-terminal-row"
                style={{
                  ...terminalDataRowStyle(),
                  borderTop: index === 0 ? "none" : terminalDataRowStyle().borderTop,
                  display: "grid",
                  gridTemplateColumns: "76px minmax(0,1fr)",
                  gap: 8,
                  alignItems: "baseline",
                }}
              >
                <div style={terminalLabelStyle("cyan")}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--np-terminal-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {String(value)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {selectedEntity?.source ? <span style={terminalTagStyle({ compact: true })}>{selectedEntity.source}</span> : null}
            {selectedEntity?.access ? <span style={terminalTagStyle({ tone: selectedEntity.access === "terminal" ? "cyan" : "amber", compact: true })}>{selectedEntity.access}</span> : null}
            {selectedEntity?.confidence ? <span style={terminalTagStyle({ tone: "success", compact: true })}>{Math.round(selectedEntity.confidence * 100)}% confidence</span> : null}
            {!selectedEntity ? <span style={terminalTagStyle({ tone: "cyan", compact: true })}>global scope</span> : null}
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
        </div>
      </TerminalPanel>

      <CompareTray />

      <TerminalPanel title="Linked context" subtitle="Counts for the surfaces currently illuminated by the active selection.">
        <div style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0,1fr))" : "repeat(5, minmax(0,1fr))",
              gap: 8,
            }}
          >
            <ContextCell label="Markets" value={marketRows.slice(0, 6).length} tone="cyan" />
            <ContextCell label="Catalysts" value={newsRows.slice(0, 6).length} tone="success" />
            <ContextCell label="Pipeline" value={pipelineRows.slice(0, 6).length} tone="amber" />
            <ContextCell label="Filings" value={filingRows.slice(0, 6).length} tone="cyan" />
            <ContextCell label="Ops" value={operationsRows.slice(0, 6).length} tone="success" />
          </div>
          <div style={{ fontSize: 10.5, lineHeight: 1.5, ...terminalMutedStyle() }}>
            Source labels and access states stay attached to each entity so public-safe signals can coexist with terminal-only drilldowns.
          </div>
        </div>
      </TerminalPanel>
    </div>
  );
}
