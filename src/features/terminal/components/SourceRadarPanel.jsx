import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalDataRowStyle,
  terminalLinkStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTableHeaderStyle,
  terminalTagStyle,
} from "./styles.js";

function statusTone(status) {
  if (status === "Live") return "success";
  if (status === "Snapshot") return "amber";
  return "cyan";
}

export default function SourceRadarPanel() {
  const { sourceRows, selectEntity } = useTerminal();
  const liveCount = sourceRows.filter((item) => item.status === "Live").length;

  return (
    <TerminalPanel
      title="Source radar"
      subtitle="What is live now, what is snapshot-backed, and what is premium-ready next."
      actions={[
        <span key="live" style={terminalTagStyle({ tone: "success", compact: true })}>
          {liveCount} live
        </span>,
      ]}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 10, padding: "0 10px 6px", borderBottom: "1px solid rgba(51,66,86,0.92)" }}>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Source</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Status</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Link</div>
        </div>

        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(300), padding: "0 10px" }}>
          {sourceRows.map((source) => (
            <div key={source.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => selectEntity(source)}
                className="np-terminal-button"
                style={{ background: "transparent", border: "none", textAlign: "left", color: "var(--np-terminal-text)", padding: 0, cursor: "pointer", minWidth: 0 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700, fontSize: 11.5 }}>{source.name}</div>
                  <span style={{ fontSize: 10, ...terminalMutedStyle() }}>{source.category}</span>
                </div>
                <div style={{ fontSize: 10.5, lineHeight: 1.45, marginTop: 5, ...terminalMutedStyle() }}>{source.coverage}</div>
              </button>
              <div style={{ display: "grid", justifyItems: "end", gap: 4 }}>
                <span style={terminalTagStyle({ tone: statusTone(source.status), compact: true })}>{source.status}</span>
                <div style={{ fontSize: 10, ...terminalMutedStyle() }}>
                  {source.count ? `${source.count}` : source.access}
                </div>
              </div>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle()}>
                Source
              </a>
            </div>
          ))}
        </div>
      </div>
    </TerminalPanel>
  );
}
