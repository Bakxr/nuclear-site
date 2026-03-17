import { Line, LineChart, ResponsiveContainer } from "recharts";
import TerminalPanel from "./TerminalPanel.jsx";
import { useTerminal } from "../context.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLabelStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTagStyle,
  terminalTableHeaderStyle,
  terminalValueStyle,
} from "./styles.js";

function MarketsView({ onOpenStock, isMobileViewport }) {
  const { marketRows, state, setMarketSort, selectEntity, toggleWatch, watchedSet } = useTerminal();
  const actions = [
    { key: "pct", label: "% move" },
    { key: "price", label: "Price" },
    { key: "theme", label: "Theme" },
    { key: "name", label: "Name" },
  ];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={terminalLabelStyle("cyan")}>Market monitor</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 5, ...terminalMutedStyle() }}>
            Delayed nuclear watchlist tied to fleets, fuel-cycle exposures, and live catalyst context.
          </div>
        </div>
        <div className="np-terminal-tab-row">
          {actions.map((sort) => (
            <button key={sort.key} type="button" onClick={() => setMarketSort(sort.key)} className="np-terminal-button" style={terminalButtonStyle(state.marketSort === sort.key, { compact: true })}>
              {sort.label}
            </button>
          ))}
        </div>
      </div>

      {!isMobileViewport ? (
        <div style={{ display: "grid", gridTemplateColumns: "70px minmax(0,1fr) 72px 88px auto", gap: 12, padding: "0 16px 8px", borderBottom: "1px solid rgba(125,139,156,0.1)" }}>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Ticker</div>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Name</div>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Trend</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Px / %</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Watch</div>
        </div>
      ) : null}

      <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(360), padding: "0 16px" }}>
        {marketRows.slice(0, 12).map((stock) => {
          const mini = stock.history?.slice(-16) || [];
          const targetId = stock.company?.id || stock.id;
          const moveTone = stock.change >= 0 ? "success" : "danger";

          return (
            <div
              key={stock.id}
              className="np-terminal-row np-terminal-row--interactive"
              style={{
                ...terminalDataRowStyle(),
                display: "grid",
                gridTemplateColumns: isMobileViewport ? "72px minmax(0,1fr) auto" : "70px minmax(0,1fr) 72px 88px auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <button type="button" onClick={() => { selectEntity(stock.company || stock); onOpenStock?.(stock); }} className="np-terminal-button" style={{ background: "transparent", border: "none", color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}>
                <div style={{ ...terminalValueStyle({ tone: "amber", size: 13 }), fontWeight: 700 }}>{stock.ticker}</div>
                <div style={{ fontSize: 10, marginTop: 4, ...terminalMutedStyle() }}>{stock.theme}</div>
              </button>

              <button type="button" onClick={() => { selectEntity(stock.company || stock); onOpenStock?.(stock); }} className="np-terminal-button" style={{ background: "transparent", border: "none", color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stock.name}</div>
                <div style={{ fontSize: 10.5, marginTop: 4, ...terminalMutedStyle() }}>{stock.sector}</div>
              </button>

              {!isMobileViewport ? (
                <div style={{ height: 26, width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mini}>
                      <Line type="monotone" dataKey="price" stroke={stock.change >= 0 ? "var(--np-terminal-green)" : "var(--np-terminal-red)"} strokeWidth={1.75} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : null}

              <div style={{ display: "grid", justifyItems: isMobileViewport ? "start" : "end", gap: 4 }}>
                <div style={{ ...terminalValueStyle({ size: 12 }), fontWeight: 700 }}>${(stock.price || 0).toFixed(2)}</div>
                <div style={{ fontSize: 10.5, color: stock.change >= 0 ? "var(--np-terminal-green)" : "var(--np-terminal-red)" }}>
                  {stock.change >= 0 ? "+" : ""}{(stock.pct || 0).toFixed(2)}%
                </div>
              </div>

              <button type="button" onClick={() => toggleWatch(targetId)} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true, tone: moveTone === "success" ? "cyan" : "default" })}>
                {watchedSet.has(targetId) ? "Starred" : "Star"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineView({ isMobileViewport }) {
  const { pipelineRows, snapshot, selectEntity, toggleWatch, watchedSet } = useTerminal();

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={terminalLabelStyle("amber")}>Project pipeline</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 5, ...terminalMutedStyle() }}>
            Construction, advanced deployment, and regulatory milestones kept in one quieter tertiary surface.
          </div>
        </div>
        <span style={terminalTagStyle({ tone: "amber", compact: true })}>{pipelineRows.length} tracked</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1fr) minmax(0,0.92fr)", gap: 14 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={terminalLabelStyle("cyan")}>Deployment queue</div>
          <div style={{ border: "1px solid rgba(125,139,156,0.12)", borderRadius: 18, background: "rgba(255,255,255,0.03)", padding: "0 16px" }}>
            <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(320), padding: 0 }}>
              {pipelineRows.slice(0, 10).map((project) => (
                <div key={project.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "start" }}>
                  <button type="button" onClick={() => selectEntity(project)} className="np-terminal-button" style={{ background: "transparent", border: "none", color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{project.name}</div>
                      <span style={terminalTagStyle({ tone: "amber", compact: true })}>{project.status}</span>
                    </div>
                    <div style={{ fontSize: 10.5, marginTop: 4, ...terminalMutedStyle() }}>
                      {project.country} | {project.type} | {project.capacityMw} MW{project.targetYear ? ` | ${project.targetYear}` : ""}
                    </div>
                    <div style={{ fontSize: 10.5, lineHeight: 1.5, marginTop: 5, ...terminalMutedStyle() }}>{project.summary}</div>
                  </button>
                  <button type="button" onClick={() => toggleWatch(project.id)} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true, tone: "cyan" })}>
                    {watchedSet.has(project.id) ? "Starred" : "Star"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={terminalLabelStyle("amber")}>Regulatory tape</div>
          <div style={{ border: "1px solid rgba(125,139,156,0.12)", borderRadius: 18, background: "rgba(255,255,255,0.03)", padding: "0 16px" }}>
            <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(320), padding: 0 }}>
              {snapshot.entities.regulatoryEvents.slice(0, 10).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => selectEntity(snapshot.entities.newsArticles.find((item) => item.id === event.linkedStoryId) || snapshot.entities.projectPipeline.find((item) => item.id === event.linkedProjectId) || event)}
                  className="np-terminal-row np-terminal-row--interactive np-terminal-button"
                  style={{ ...terminalDataRowStyle(), textAlign: "left", color: "var(--np-terminal-text)", cursor: "pointer", background: "transparent", borderLeft: "none", borderRight: "none", borderBottom: "none", paddingInline: 0 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={terminalTagStyle({ tone: "amber", compact: true })}>{event.lane}</span>
                    <span style={{ fontSize: 10.5, ...terminalMutedStyle() }}>{event.dateLabel}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.4, marginTop: 6 }}>{event.title}</div>
                  <div style={{ fontSize: 10.5, lineHeight: 1.5, marginTop: 5, ...terminalMutedStyle() }}>{event.summary}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntelligenceDeckPanel({ activeTab = "markets", onTabChange, onOpenStock, isMobileViewport = false }) {
  const subtitle = activeTab === "markets"
    ? "Markets stay present, but they now support the fleet story instead of competing with it."
    : "The build and licensing queue remains available as a tertiary drill-down instead of a co-equal hero surface.";

  return (
    <TerminalPanel
      panelId="terminal-panel-intelligence"
      title="Markets and pipeline"
      subtitle={subtitle}
      actions={[
        <button key="markets" type="button" onClick={() => onTabChange("markets")} className="np-terminal-button" style={terminalButtonStyle(activeTab === "markets", { compact: true })}>
          Markets
        </button>,
        <button key="pipeline" type="button" onClick={() => onTabChange("pipeline")} className="np-terminal-button" style={terminalButtonStyle(activeTab === "pipeline", { compact: true, tone: "cyan" })}>
          Pipeline
        </button>,
      ]}
    >
      {activeTab === "markets" ? <MarketsView onOpenStock={onOpenStock} isMobileViewport={isMobileViewport} /> : null}
      {activeTab === "pipeline" ? <PipelineView isMobileViewport={isMobileViewport} /> : null}
    </TerminalPanel>
  );
}
