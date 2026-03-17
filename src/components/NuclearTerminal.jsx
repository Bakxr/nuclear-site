import { useCallback, useEffect, useMemo, useState } from "react";
import { TerminalProvider, useTerminal } from "../features/terminal/context.jsx";
import TerminalCommandBar from "../features/terminal/components/TerminalCommandBar.jsx";
import TerminalBlotter from "../features/terminal/components/TerminalBlotter.jsx";
import MapNexusPanel from "../features/terminal/components/MapNexusPanel.jsx";
import FleetScoreboardPanel from "../features/terminal/components/FleetScoreboardPanel.jsx";
import MarketMonitorPanel from "../features/terminal/components/MarketMonitorPanel.jsx";
import CatalystWirePanel from "../features/terminal/components/CatalystWirePanel.jsx";
import PipelinePanel from "../features/terminal/components/PipelinePanel.jsx";
import EntityFocusDrawer from "../features/terminal/components/EntityFocusDrawer.jsx";
import OperationsPulsePanel from "../features/terminal/components/OperationsPulsePanel.jsx";
import FilingRadarPanel from "../features/terminal/components/FilingRadarPanel.jsx";
import SourceRadarPanel from "../features/terminal/components/SourceRadarPanel.jsx";
import {
  terminalLabelStyle,
  terminalMetricTileStyle,
  terminalMutedStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "../features/terminal/components/styles.js";

function scrollToPanel(panelId) {
  if (typeof document === "undefined") return;
  if (panelId === "terminal-workspace-top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  document.getElementById(panelId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function RailCard({ children, style }) {
  return (
    <section
      className="np-terminal-rail-card"
      style={{
        border: "1px solid var(--np-terminal-border)",
        background: "rgba(10,12,16,0.985)",
        padding: "10px",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function RailMetric({ label, value, tone = "amber" }) {
  const accent = tone === "cyan"
    ? "var(--np-terminal-cyan)"
    : tone === "success"
      ? "var(--np-terminal-green)"
      : tone === "warning"
        ? "var(--np-terminal-yellow)"
        : "var(--np-terminal-amber)";

  return (
    <div style={terminalMetricTileStyle({ accent })}>
      <div style={terminalLabelStyle(tone)}>{label}</div>
      <div style={{ ...terminalValueStyle({ tone, size: 15 }), marginTop: 7 }}>{value}</div>
    </div>
  );
}

function LeftRail({
  activeDesk,
  onActivateDesk,
}) {
  const {
    snapshot,
    selectedEntity,
    watchedSet,
    getEntityById,
    sourceRows,
  } = useTerminal();

  const watchEntities = useMemo(
    () => Array.from(watchedSet).map((id) => getEntityById(id)).filter(Boolean).slice(0, 5),
    [getEntityById, watchedSet],
  );
  const liveSources = sourceRows.filter((item) => item.status === "Live").length;
  const leadCountry = snapshot.entities.countries
    .slice()
    .sort((left, right) => (right.capacityGw || 0) - (left.capacityGw || 0))[0];
  const desks = [
    { id: "overview", key: "1", label: "Overview" },
    { id: "map", key: "2", label: "Global map" },
    { id: "fuel", key: "3", label: "Fuel cycle" },
    { id: "markets", key: "4", label: "Markets" },
    { id: "pipeline", key: "5", label: "Pipeline" },
    { id: "filings", key: "6", label: "Filings" },
  ];

  return (
    <div className="np-terminal-rail np-terminal-rail-left">
      <RailCard style={{ padding: "8px 9px" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <div>
              <div style={terminalLabelStyle("amber")}>Desk snapshot</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--np-terminal-text)", marginTop: 4 }}>
                {selectedEntity ? (selectedEntity.name || selectedEntity.title || selectedEntity.country) : "Global scope"}
              </div>
            </div>
            <span style={terminalTagStyle({ tone: selectedEntity ? "warning" : "cyan", compact: true })}>
              {selectedEntity ? "focus" : "global"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 6 }}>
            <RailMetric label="Countries" value={snapshot.entities.countries.length} tone="amber" />
            <RailMetric label="Live" value={liveSources} tone="cyan" />
            <RailMetric label="Stories" value={snapshot.entities.newsArticles.length} tone="success" />
          </div>

          {leadCountry ? (
            <div style={{ fontSize: 10, lineHeight: 1.45, ...terminalMutedStyle() }}>
              Lead market: <span style={{ color: "var(--np-terminal-text)" }}>{leadCountry.country}</span> {leadCountry.capacityGw.toFixed(1)} GW
            </div>
          ) : null}
        </div>
      </RailCard>

      <RailCard>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <div style={terminalLabelStyle("cyan")}>Function rail</div>
          <span style={terminalTagStyle({ tone: "cyan", compact: true })}>1-6 hotkeys</span>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {desks.map((desk) => {
            const active = activeDesk === desk.id;
            return (
              <button
                key={desk.id}
                type="button"
                onClick={() => onActivateDesk(desk.id)}
                className={`np-terminal-rail-button${active ? " is-active" : ""}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px minmax(0,1fr)",
                  gap: 10,
                  alignItems: "center",
                  width: "100%",
                  border: `1px solid ${active ? "rgba(255,156,26,0.52)" : "rgba(61,66,76,0.9)"}`,
                  background: active ? "rgba(34,22,8,0.98)" : "rgba(15,18,23,0.98)",
                  color: "var(--np-terminal-text)",
                  padding: "8px 9px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    minHeight: 20,
                    border: `1px solid ${active ? "rgba(255,156,26,0.46)" : "rgba(61,66,76,0.82)"}`,
                    background: active ? "rgba(255,156,26,0.12)" : "rgba(10,12,16,0.96)",
                    color: active ? "var(--np-terminal-amber)" : "var(--np-terminal-muted)",
                    fontSize: 10,
                    fontFamily: "'DM Mono',monospace",
                    fontWeight: 700,
                  }}
                >
                  {desk.key}
                </span>
                <span style={{ display: "block", minWidth: 0, fontSize: 11.5, fontWeight: 700 }}>{desk.label}</span>
              </button>
            );
          })}
        </div>
      </RailCard>

      {watchEntities.length ? (
        <RailCard>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <div style={terminalLabelStyle("amber")}>Watched entities</div>
            <span style={terminalTagStyle({ tone: "amber", compact: true })}>{watchEntities.length} pinned</span>
          </div>
          <div style={{ display: "grid", gap: 0 }}>
            {watchEntities.map((entity, index) => (
              <div
                key={entity.id}
                style={{
                  borderTop: index === 0 ? "none" : "1px solid rgba(55,59,68,0.9)",
                  padding: "8px 0",
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--np-terminal-text)" }}>{entity.name || entity.title || entity.country}</div>
                <div style={{ fontSize: 10, marginTop: 4, ...terminalMutedStyle() }}>{entity.entityType}{entity.country ? ` | ${entity.country}` : ""}</div>
              </div>
            ))}
          </div>
        </RailCard>
      ) : null}
    </div>
  );
}

function FooterStrip({ onOpenStock }) {
  const { marketRows, newsRows, operationsRows, filingRows, selectEntity } = useTerminal();
  const tapeItems = [
    ...marketRows.slice(0, 4).map((stock) => ({
      id: `market-${stock.id}`,
      label: stock.ticker,
      value: `${stock.pct >= 0 ? "+" : ""}${(stock.pct || 0).toFixed(2)}%`,
      detail: stock.name,
      tone: stock.pct >= 0 ? "success" : "danger",
      onClick: () => {
        selectEntity(stock.company || stock);
        onOpenStock?.(stock);
      },
    })),
    ...newsRows.slice(0, 3).map((item) => ({
      id: `story-${item.id}`,
      label: item.tag,
      value: item.title,
      detail: item.sourceName,
      tone: item.isOfficial ? "success" : "amber",
      onClick: () => selectEntity(item),
    })),
    ...operationsRows.slice(0, 2).map((signal) => ({
      id: `ops-${signal.id}`,
      label: "Ops",
      value: `${signal.plantName} ${signal.powerPct}%`,
      detail: signal.status,
      tone: signal.powerPct >= 95 ? "success" : signal.powerPct >= 60 ? "warning" : "danger",
      onClick: () => selectEntity(signal),
    })),
    ...filingRows.slice(0, 2).map((filing) => ({
      id: `filing-${filing.id}`,
      label: filing.ticker,
      value: filing.form,
      detail: filing.companyName,
      tone: "cyan",
      onClick: () => selectEntity(filing),
    })),
  ];

  return (
    <footer className="np-terminal-footer-strip">
      <div className="np-terminal-content" style={{ maxWidth: 1840, margin: "0 auto", padding: "0 12px 12px" }}>
        <div className="np-terminal-footer-track">
          <div className="np-terminal-footer-title">
            <span style={terminalLabelStyle("amber")}>Live tape</span>
          </div>
          {tapeItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="np-terminal-footer-item"
            >
              <span style={terminalTagStyle({ tone: item.tone, compact: true })}>{item.label}</span>
              <span style={{ ...terminalValueStyle({ tone: item.tone, size: 12 }), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.value}</span>
              <span className="np-terminal-footer-detail">{item.detail}</span>
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}

function TerminalWorkspaceShell({
  GlobeComponent,
  isMobileViewport,
  onOpenPlant,
  onOpenStock,
  onExitTerminal,
  onRefreshData,
}) {
  const { setLayer, resetWorkspace } = useTerminal();
  const [activeDesk, setActiveDesk] = useState("overview");

  const activeDeskLabel = useMemo(() => {
    const labels = {
      overview: "Overview",
      map: "Global Map",
      fuel: "Fuel Cycle",
      markets: "Markets",
      pipeline: "Pipeline",
      filings: "Filings",
    };
    return labels[activeDesk] || "Overview";
  }, [activeDesk]);

  const activateDesk = useCallback((deskId) => {
    setActiveDesk(deskId);

    if (deskId === "overview") {
      resetWorkspace();
      scrollToPanel("terminal-workspace-top");
      return;
    }
    if (deskId === "map") {
      setLayer("reactors");
      scrollToPanel("terminal-panel-map");
      return;
    }
    if (deskId === "fuel") {
      setLayer("uranium");
      scrollToPanel("terminal-panel-map");
      return;
    }
    if (deskId === "markets") {
      scrollToPanel("terminal-panel-market");
      return;
    }
    if (deskId === "pipeline") {
      scrollToPanel("terminal-panel-pipeline");
      return;
    }
    if (deskId === "filings") {
      scrollToPanel("terminal-panel-filings");
    }
  }, [resetWorkspace, setLayer]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const tagName = target?.tagName;
      const isTypingSurface = tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || target?.isContentEditable;
      if (isTypingSurface) return;

      if (event.key === "/") {
        event.preventDefault();
        document.getElementById("np-terminal-command-input")?.focus();
        return;
      }

      const hotkeyMap = {
        "1": "overview",
        "2": "map",
        "3": "fuel",
        "4": "markets",
        "5": "pipeline",
        "6": "filings",
      };
      const nextDesk = hotkeyMap[event.key];
      if (nextDesk) {
        event.preventDefault();
        activateDesk(nextDesk);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activateDesk]);

  return (
    <div className="np-terminal-shell">
      <TerminalCommandBar
        isMobileViewport={isMobileViewport}
        onExitTerminal={onExitTerminal}
        onRefreshData={onRefreshData}
        activeDeskLabel={activeDeskLabel}
      />

      <div id="terminal-workspace-top" className="np-terminal-mainframe">
        <LeftRail
          activeDesk={activeDesk}
          onActivateDesk={activateDesk}
        />

        <main className="np-terminal-workspace">
          <div className="np-terminal-workspace-stack">
            <TerminalBlotter isMobileViewport={isMobileViewport} />
            <MapNexusPanel
              GlobeComponent={GlobeComponent}
              isMobileViewport={isMobileViewport}
              onOpenPlant={onOpenPlant}
            />
            <div className="np-terminal-pair-grid">
              <MarketMonitorPanel onOpenStock={onOpenStock} isMobileViewport={isMobileViewport} />
              <CatalystWirePanel onRefreshData={onRefreshData} isMobileViewport={isMobileViewport} />
            </div>
            <div className="np-terminal-pair-grid">
              <FleetScoreboardPanel isMobileViewport={isMobileViewport} />
              <PipelinePanel isMobileViewport={isMobileViewport} />
            </div>
          </div>
        </main>

        <aside className="np-terminal-rail np-terminal-rail-right">
          <EntityFocusDrawer isMobileViewport={isMobileViewport} />
          <OperationsPulsePanel />
          <FilingRadarPanel />
          <SourceRadarPanel />
        </aside>
      </div>

      <FooterStrip onOpenStock={onOpenStock} />
    </div>
  );
}

export default function NuclearTerminal({
  GlobeComponent,
  isMobileViewport,
  snapshot,
  onOpenPlant,
  onOpenStock,
  onExitTerminal,
  onRefreshData,
}) {
  return (
    <TerminalProvider snapshot={snapshot} isMobileViewport={isMobileViewport}>
      <TerminalWorkspaceShell
        GlobeComponent={GlobeComponent}
        isMobileViewport={isMobileViewport}
        onOpenPlant={onOpenPlant}
        onOpenStock={onOpenStock}
        onExitTerminal={onExitTerminal}
        onRefreshData={onRefreshData}
      />
    </TerminalProvider>
  );
}
