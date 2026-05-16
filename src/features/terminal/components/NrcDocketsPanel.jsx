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

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NrcDocketsPanel() {
  const { nrcDocketRows } = useTerminal();
  return (
    <TerminalPanel
      panelId="terminal-panel-nrc-dockets"
      title="NRC notices"
      subtitle="Latest licensing, inspection, and enforcement notices from the NRC news feed."
      actions={[
        <span key="count" style={terminalTagStyle({ tone: "amber", compact: true })}>
          {nrcDocketRows.length} notices
        </span>,
      ]}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "90px minmax(0,1fr) 70px 50px", gap: 8, padding: "0 10px 6px", borderBottom: "1px solid rgba(51,66,86,0.92)" }}>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Action</div>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Title / Plant</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Filed</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>NRC</div>
        </div>
        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(320), padding: "0 10px" }}>
          {nrcDocketRows.length === 0 ? (
            <div style={{ padding: "16px 0", fontSize: 11.5, ...terminalMutedStyle() }}>No NRC notices in feed.</div>
          ) : null}
          {nrcDocketRows.map((row) => (
            <div key={row.id} className="np-terminal-row" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "90px minmax(0,1fr) 70px 50px", gap: 8, alignItems: "start" }}>
              <span style={{ ...terminalTagStyle({ tone: row.action === "Enforcement" ? "danger" : row.action === "Licensing" ? "cyan" : "default", compact: true }), alignSelf: "start" }}>
                {row.action}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--np-terminal-text)", lineHeight: 1.35 }}>{row.title}</div>
                {row.plant ? <div style={{ fontSize: 10, marginTop: 3, ...terminalMutedStyle() }}>{row.plant}</div> : null}
              </div>
              <div style={{ fontSize: 10.5, textAlign: "right", ...terminalMutedStyle() }}>{fmtDate(row.filedAt)}</div>
              {row.url ? (
                <a href={row.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle("cyan")}>NRC</a>
              ) : <span />}
            </div>
          ))}
        </div>
      </div>
    </TerminalPanel>
  );
}
