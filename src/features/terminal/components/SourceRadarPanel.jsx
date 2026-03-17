import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalDataRowStyle,
  terminalLinkStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
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
      <div className="np-terminal-scroll" style={terminalScrollAreaStyle(360)}>
        {sourceRows.map((source) => (
          <div key={source.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => selectEntity(source)}
              className="np-terminal-button"
              style={{ background: "transparent", border: "none", textAlign: "left", color: "var(--np-terminal-text)", padding: 0, cursor: "pointer", minWidth: 0 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5 }}>{source.name}</div>
                <span style={{ fontSize: 10.5, ...terminalMutedStyle() }}>{source.category}</span>
              </div>
              <div style={{ fontSize: 11.5, lineHeight: 1.6, ...terminalMutedStyle() }}>{source.coverage}</div>
            </button>
            <div style={{ textAlign: "right", display: "grid", gap: 6, justifyItems: "end" }}>
              <span style={terminalTagStyle({ tone: statusTone(source.status), compact: true })}>{source.status}</span>
              <div style={{ fontSize: 11, ...terminalMutedStyle() }}>
                {source.count ? `${source.count}` : source.access}
              </div>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle()}>
                Source
              </a>
            </div>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}
