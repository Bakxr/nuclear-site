import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import { terminalButtonStyle, terminalDataRowStyle, terminalScrollAreaStyle } from "./styles.js";

function statusColor(status) {
  if (status === "Live") return "#4ade80";
  if (status === "Snapshot") return "#fbbf24";
  return "#94a3b8";
}

export default function SourceRadarPanel() {
  const { sourceRows, selectEntity } = useTerminal();
  const liveCount = sourceRows.filter((item) => item.status === "Live").length;

  return (
    <TerminalPanel
      title="Source radar"
      subtitle="What is live now, what is snapshot-backed, and what is premium-ready next."
      actions={[
        <span key="live" style={{ ...terminalButtonStyle(false), cursor: "default" }}>
          {liveCount} live
        </span>,
      ]}
    >
      <div style={terminalScrollAreaStyle(360)}>
        {sourceRows.map((source) => (
          <div key={source.id} style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => selectEntity(source)}
              style={{ background: "none", border: "none", textAlign: "left", color: "#f5f0e8", padding: 0, cursor: "pointer", minWidth: 0 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{source.name}</div>
                <span style={{ fontSize: 10.5, color: "rgba(245,240,232,0.44)" }}>{source.category}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(245,240,232,0.58)", lineHeight: 1.55 }}>{source.coverage}</div>
            </button>
            <div style={{ textAlign: "right", display: "grid", gap: 6 }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: statusColor(source.status) }}>
                {source.status}
              </div>
              <div style={{ fontSize: 11, color: "rgba(245,240,232,0.44)" }}>
                {source.count ? `${source.count}` : source.access}
              </div>
              <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: "#d4a54a", fontSize: 10.5, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Source
              </a>
            </div>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}
