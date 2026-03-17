import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTableHeaderStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";

export default function FleetScoreboardPanel({ isMobileViewport = false }) {
  const { rankingRows, state, setRankingMetric, selectEntity, toggleWatch, watchedSet } = useTerminal();
  const metrics = [
    { key: "capacity", label: "Capacity" },
    { key: "reactors", label: "Reactors" },
    { key: "nuclear", label: "Share" },
    { key: "supply", label: "Supply" },
    { key: "projects", label: "Projects" },
  ];

  return (
    <TerminalPanel
      title="Fleet scoreboard"
      subtitle="Rank countries by fleet size, nuclear share, supply relevance, and tracked buildout."
      actions={metrics.map((metric) => (
        <button key={metric.key} type="button" onClick={() => setRankingMetric(metric.key)} className="np-terminal-button" style={terminalButtonStyle(state.rankingMetric === metric.key, { compact: true })}>
          {metric.label}
        </button>
      ))}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "30px minmax(0,1fr) auto auto", gap: 10, padding: "0 10px 6px", borderBottom: "1px solid rgba(51,66,86,0.92)" }}>
          <div style={terminalTableHeaderStyle("left", "cyan")}>#</div>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Country</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Metric</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Watch</div>
        </div>

        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(isMobileViewport ? 360 : 300), padding: "0 10px" }}>
          {rankingRows.slice(0, 12).map((country, index) => (
            <div key={country.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "30px minmax(0,1fr) auto auto", gap: 10, alignItems: "center" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: "var(--np-terminal-muted)" }}>{String(index + 1).padStart(2, "0")}</div>
              <button type="button" onClick={() => selectEntity(country)} className="np-terminal-button" style={{ background: "transparent", border: "none", color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{country.country}</div>
                <div style={{ fontSize: 10, marginTop: 3, ...terminalMutedStyle() }}>{country.reactors} reactors | {country.capacityGw.toFixed(1)} GW</div>
              </button>
              <div style={{ ...terminalValueStyle({ tone: "amber", size: 12 }), fontWeight: 700, textAlign: "right" }}>
                {state.rankingMetric === "capacity" ? `${country.capacityGw.toFixed(1)} GW` : state.rankingMetric === "reactors" ? `${country.reactors}` : state.rankingMetric === "nuclear" ? `${country.nuclearShare ?? 0}%` : state.rankingMetric === "projects" ? `${country.activeProjects}` : `${country.supplyCount}`}
              </div>
              <button type="button" onClick={() => toggleWatch(country.id)} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true, tone: "cyan" })}>
                {watchedSet.has(country.id) ? "Starred" : "Star"}
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 10.5, ...terminalMutedStyle() }}>
            Ranking metric: {state.rankingMetric}. Countries stay linked to compare, watchlist, and focus selection.
          </div>
          <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{rankingRows.length} ranked</span>
        </div>
      </div>
    </TerminalPanel>
  );
}
