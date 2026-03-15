import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import { terminalButtonStyle, terminalDataRowStyle, terminalScrollAreaStyle } from "./styles.js";

function powerColor(powerPct) {
  if (powerPct >= 95) return "#4ade80";
  if (powerPct >= 60) return "#fbbf24";
  if (powerPct > 0) return "#f97316";
  return "#f87171";
}

export default function OperationsPulsePanel() {
  const { operationsRows, selectEntity } = useTerminal();

  return (
    <TerminalPanel
      title="Operations pulse"
      subtitle="U.S. reactor unit power levels from the NRC plant status feed."
      actions={[
        <span key="count" style={{ ...terminalButtonStyle(false), cursor: "default" }}>
          {operationsRows.length} units
        </span>,
      ]}
    >
      <div style={terminalScrollAreaStyle(360)}>
        {operationsRows.slice(0, 12).map((signal) => (
          <div key={signal.id} style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => selectEntity(signal)}
              style={{ background: "none", border: "none", textAlign: "left", color: "#f5f0e8", padding: 0, cursor: "pointer", minWidth: 0 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{signal.plantName}</div>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: powerColor(signal.powerPct) }}>
                  {signal.status}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(245,240,232,0.5)" }}>
                {signal.unitLabel ? `Unit ${signal.unitLabel} | ` : ""}{signal.country}
              </div>
            </button>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: powerColor(signal.powerPct) }}>{signal.powerPct}%</div>
              <a href={signal.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: "#d4a54a", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                NRC
              </a>
            </div>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}
