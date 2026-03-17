import { useCallback, useEffect, useMemo, useState } from "react";
import { TerminalProvider, useTerminal } from "../features/terminal/context.jsx";
import TerminalCommandBar from "../features/terminal/components/TerminalCommandBar.jsx";
import MapNexusPanel from "../features/terminal/components/MapNexusPanel.jsx";
import FleetScoreboardPanel from "../features/terminal/components/FleetScoreboardPanel.jsx";
import CatalystWirePanel from "../features/terminal/components/CatalystWirePanel.jsx";
import OperatorPanel from "../features/terminal/components/OperatorPanel.jsx";
import IntelligenceDeckPanel from "../features/terminal/components/IntelligenceDeckPanel.jsx";
import {
  terminalDataRowStyle,
  terminalLabelStyle,
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

function LeftRail({ activeDesk, onActivateDesk }) {
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
  const operatingPlants = snapshot.entities.plants.filter((plant) => plant.status === "Operating").length;
  const desks = [
    { id: "overview", key: "1", label: "Overview" },
    { id: "map", key: "2", label: "Global map" },
    { id: "fuel", key: "3", label: "Fuel cycle" },
    { id: "markets", key: "4", label: "Markets" },
    { id: "pipeline", key: "5", label: "Pipeline" },
    { id: "filings", key: "6", label: "Filings" },
  ];

  return (
    <aside className="np-terminal-rail np-terminal-rail-left">
      <div style={{ display: "grid", gap: 16, padding: "6px 4px" }}>
        <div style={{ display: "grid", gap: 10, paddingBottom: 14, borderBottom: "1px solid rgba(125,139,156,0.1)" }}>
          <div style={terminalLabelStyle("cyan")}>Navigation</div>
          <div style={{ fontSize: 20, lineHeight: 1.05, fontWeight: 700, color: "var(--np-terminal-text)" }}>
            Operator desk
          </div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, ...terminalMutedStyle() }}>
            {selectedEntity
              ? `Current focus: ${selectedEntity.name || selectedEntity.title || selectedEntity.country}`
              : "Start globally, then use the globe and operator panel to narrow the question."}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={terminalTagStyle({ tone: "amber", compact: true })}>{operatingPlants} operating</span>
            <span style={terminalTagStyle({ tone: "success", compact: true })}>{liveSources} live rails</span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={terminalLabelStyle("amber")}>Sections</div>
            <span style={terminalTagStyle({ tone: "cyan", compact: true })}>
              hotkeys
            </span>
          </div>
          <nav className="np-terminal-spine-nav">
            {desks.map((desk) => {
              const active = activeDesk === desk.id;
              return (
                <button
                  key={desk.id}
                  type="button"
                  onClick={() => onActivateDesk(desk.id)}
                  className="np-terminal-button np-terminal-spine-item"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) auto",
                    gap: 10,
                    alignItems: "center",
                    width: "100%",
                    border: `1px solid ${active ? "rgba(216,160,74,0.28)" : "transparent"}`,
                    borderRadius: 14,
                    background: active ? "rgba(216,160,74,0.08)" : "transparent",
                    color: "var(--np-terminal-text)",
                    padding: "8px 10px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 12.5, fontWeight: active ? 700 : 600, color: active ? "var(--np-terminal-text)" : "rgba(237,241,245,0.8)" }}>{desk.label}</span>
                    <span style={{ fontSize: 10.5, ...terminalMutedStyle() }}>
                      {desk.id === "map" ? "Map" : desk.id === "fuel" ? "Layer" : desk.id === "filings" ? "Right panel" : "Workspace"}
                    </span>
                  </span>
                  <span style={{ fontSize: 10.5, fontFamily: "'DM Mono',monospace", color: active ? "var(--np-terminal-amber)" : "var(--np-terminal-subtle)" }}>
                    {desk.key}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {watchEntities.length ? (
          <div style={{ display: "grid", gap: 8, paddingTop: 14, borderTop: "1px solid rgba(125,139,156,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={terminalLabelStyle("amber")}>Pinned list</div>
              <span style={terminalTagStyle({ tone: "amber", compact: true })}>{watchEntities.length}</span>
            </div>
            <div style={{ display: "grid", gap: 0 }}>
              {watchEntities.map((entity, index) => (
                <div
                  key={entity.id}
                  style={{
                    ...terminalDataRowStyle(),
                    borderTop: index === 0 ? "none" : terminalDataRowStyle().borderTop,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--np-terminal-text)" }}>{entity.name || entity.title || entity.country}</div>
                  <div style={{ fontSize: 10.5, marginTop: 4, ...terminalMutedStyle() }}>
                    {entity.entityType}{entity.country ? ` | ${entity.country}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
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
      <div className="np-terminal-content" style={{ maxWidth: 1840, margin: "0 auto", padding: "0 14px 14px" }}>
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
  const [operatorTab, setOperatorTab] = useState("focus");
  const [intelligenceTab, setIntelligenceTab] = useState("markets");

  const activeDeskLabel = useMemo(() => {
    const labels = {
      overview: "Overview",
      map: "Global map",
      fuel: "Fuel cycle",
      markets: "Markets",
      pipeline: "Pipeline",
      filings: "Filings",
    };
    return labels[activeDesk] || "Overview";
  }, [activeDesk]);

  const handleOperatorTabChange = useCallback((tab) => {
    setOperatorTab(tab);
    if (tab === "filings") setActiveDesk("filings");
    if (tab === "focus") setActiveDesk("overview");
  }, []);

  const handleIntelligenceTabChange = useCallback((tab) => {
    setIntelligenceTab(tab);
    setActiveDesk(tab === "pipeline" ? "pipeline" : "markets");
  }, []);

  const activateDesk = useCallback((deskId) => {
    setActiveDesk(deskId);

    if (deskId === "overview") {
      resetWorkspace();
      setLayer("reactors");
      setOperatorTab("focus");
      setIntelligenceTab("markets");
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
      setIntelligenceTab("markets");
      scrollToPanel("terminal-panel-intelligence");
      return;
    }
    if (deskId === "pipeline") {
      setIntelligenceTab("pipeline");
      scrollToPanel("terminal-panel-intelligence");
      return;
    }
    if (deskId === "filings") {
      setOperatorTab("filings");
      scrollToPanel("terminal-panel-operator");
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
            <MapNexusPanel
              GlobeComponent={GlobeComponent}
              isMobileViewport={isMobileViewport}
              onOpenPlant={onOpenPlant}
            />
            <div className="np-terminal-pair-grid">
              <CatalystWirePanel onRefreshData={onRefreshData} isMobileViewport={isMobileViewport} />
              <FleetScoreboardPanel isMobileViewport={isMobileViewport} />
            </div>
            <IntelligenceDeckPanel
              activeTab={intelligenceTab}
              onTabChange={handleIntelligenceTabChange}
              onOpenStock={onOpenStock}
              isMobileViewport={isMobileViewport}
            />
          </div>
        </main>

        <aside className="np-terminal-rail np-terminal-rail-right">
          <OperatorPanel
            activeTab={operatorTab}
            onTabChange={handleOperatorTabChange}
            isMobileViewport={isMobileViewport}
          />
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
