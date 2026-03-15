import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import { terminalButtonStyle, terminalDataRowStyle, terminalScrollAreaStyle } from "./styles.js";

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
        <button key={metric.key} type="button" onClick={() => setRankingMetric(metric.key)} style={terminalButtonStyle(state.rankingMetric === metric.key)}>
          {metric.label}
        </button>
      ))}
    >
      <div style={{ ...terminalScrollAreaStyle(isMobileViewport ? 420 : 360), gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
        {rankingRows.slice(0, 12).map((country, index) => (
          <div key={country.id} style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto auto", gap: 12, alignItems: "center" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "rgba(212,165,74,0.8)" }}>{String(index + 1).padStart(2, "0")}</div>
            <button type="button" onClick={() => selectEntity(country)} style={{ background: "none", border: "none", color: "#f5f0e8", textAlign: "left", cursor: "pointer", padding: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{country.country}</div>
              <div style={{ fontSize: 11, color: "rgba(245,240,232,0.46)" }}>{country.reactors} reactors | {country.capacityGw.toFixed(1)} GW</div>
            </button>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#d4a54a" }}>
              {state.rankingMetric === "capacity" ? `${country.capacityGw.toFixed(1)} GW` : state.rankingMetric === "reactors" ? `${country.reactors}` : state.rankingMetric === "nuclear" ? `${country.nuclearShare ?? 0}%` : state.rankingMetric === "projects" ? `${country.activeProjects}` : `${country.supplyCount}`}
            </div>
            <button type="button" onClick={() => toggleWatch(country.id)} style={{ ...terminalButtonStyle(false), padding: "7px 10px" }}>
              {watchedSet.has(country.id) ? "Starred" : "Star"}
            </button>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}
