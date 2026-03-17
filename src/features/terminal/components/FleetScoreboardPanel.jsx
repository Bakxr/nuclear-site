import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLabelStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
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
        <button key={metric.key} type="button" onClick={() => setRankingMetric(metric.key)} className="np-terminal-button" style={terminalButtonStyle(state.rankingMetric === metric.key)}>
          {metric.label}
        </button>
      ))}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto auto", gap: 12, paddingBottom: 8, borderBottom: "1px solid rgba(97,230,255,0.12)" }}>
          <div style={terminalLabelStyle("cyan")}>#</div>
          <div style={terminalLabelStyle("cyan")}>Country / fleet</div>
          <div style={terminalLabelStyle("cyan")}>Metric</div>
          <div style={{ textAlign: "right", ...terminalLabelStyle("cyan") }}>Watch</div>
        </div>
        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(isMobileViewport ? 420 : 360), gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(2, minmax(0, 1fr))", columnGap: 18 }}>
          {rankingRows.slice(0, 12).map((country, index) => (
            <div key={country.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto auto", gap: 12, alignItems: "center" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "var(--np-terminal-muted)" }}>{String(index + 1).padStart(2, "0")}</div>
              <button type="button" onClick={() => selectEntity(country)} className="np-terminal-button" style={{ background: "transparent", border: "none", color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{country.country}</div>
                <div style={{ fontSize: 11, marginTop: 4, ...terminalMutedStyle() }}>{country.reactors} reactors // {country.capacityGw.toFixed(1)} GW</div>
              </button>
              <div style={{ ...terminalValueStyle({ tone: "amber", size: 13 }), fontWeight: 700 }}>
                {state.rankingMetric === "capacity" ? `${country.capacityGw.toFixed(1)} GW` : state.rankingMetric === "reactors" ? `${country.reactors}` : state.rankingMetric === "nuclear" ? `${country.nuclearShare ?? 0}%` : state.rankingMetric === "projects" ? `${country.activeProjects}` : `${country.supplyCount}`}
              </div>
              <button type="button" onClick={() => toggleWatch(country.id)} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true, tone: "cyan" })}>
                {watchedSet.has(country.id) ? "Starred" : "Star"}
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 11.5, ...terminalMutedStyle() }}>
            Ranking metric: {state.rankingMetric}. Countries remain linked to compare, watchlist, and focus selection.
          </div>
          <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{rankingRows.length} ranked</span>
        </div>
      </div>
    </TerminalPanel>
  );
}
