import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalDataRowStyle,
  terminalLinkStyle,
  terminalScrollAreaStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";

function powerColor(powerPct) {
  if (powerPct >= 95) return "var(--np-terminal-green)";
  if (powerPct >= 60) return "var(--np-terminal-amber)";
  if (powerPct > 0) return "var(--np-terminal-red)";
  return "var(--np-terminal-red)";
}

export default function OperationsPulsePanel() {
  const { operationsRows, selectEntity } = useTerminal();

  return (
    <TerminalPanel
      title="Operations pulse"
      subtitle="U.S. reactor unit power levels from the NRC plant status feed."
      actions={[
        <span key="count" style={terminalTagStyle({ tone: "success", compact: true })}>
          {operationsRows.length} units
        </span>,
      ]}
    >
      <div className="np-terminal-scroll" style={terminalScrollAreaStyle(360)}>
        {operationsRows.slice(0, 12).map((signal) => (
          <div key={signal.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => selectEntity(signal)}
              className="np-terminal-button"
              style={{ background: "transparent", border: "none", textAlign: "left", color: "var(--np-terminal-text)", padding: 0, cursor: "pointer", minWidth: 0 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5 }}>{signal.plantName}</div>
                <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: powerColor(signal.powerPct), fontWeight: 700 }}>
                  {signal.status}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--np-terminal-muted)" }}>
                {signal.unitLabel ? `Unit ${signal.unitLabel} // ` : ""}{signal.country}
              </div>
            </button>
            <div style={{ textAlign: "right", display: "grid", gap: 6 }}>
              <div style={{ ...terminalValueStyle({ tone: signal.powerPct >= 95 ? "success" : signal.powerPct >= 60 ? "amber" : "danger", size: 18 }) }}>
                {signal.powerPct}%
              </div>
              <a href={signal.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle()}>
                NRC
              </a>
            </div>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}
