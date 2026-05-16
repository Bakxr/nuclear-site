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

export default function GovContractsPanel() {
  const { contractRows } = useTerminal();
  return (
    <TerminalPanel
      panelId="terminal-panel-contracts"
      title="Federal contract opportunities"
      subtitle="Nuclear-related SAM.gov solicitations posted in the last 90 days."
      actions={[
        <span key="count" style={terminalTagStyle({ tone: "amber", compact: true })}>
          {contractRows.length} opps
        </span>,
      ]}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 80px 70px 50px", gap: 8, padding: "0 10px 6px", borderBottom: "1px solid rgba(51,66,86,0.92)" }}>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Title / Agency</div>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Type</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Posted</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>SAM</div>
        </div>
        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(320), padding: "0 10px" }}>
          {contractRows.length === 0 ? (
            <div style={{ padding: "16px 0", fontSize: 11.5, ...terminalMutedStyle() }}>
              No SAM.gov data. Set SAM_API_KEY env var (free key at sam.gov/data-services).
            </div>
          ) : null}
          {contractRows.map((row) => (
            <div key={row.id} className="np-terminal-row" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "minmax(0,1fr) 80px 70px 50px", gap: 8, alignItems: "start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--np-terminal-text)", lineHeight: 1.35 }}>{row.title}</div>
                <div style={{ fontSize: 10, marginTop: 4, ...terminalMutedStyle() }}>{row.agency || "—"}{row.naics ? ` · NAICS ${row.naics}` : ""}</div>
              </div>
              <span style={{ ...terminalTagStyle({ tone: "cyan", compact: true }), alignSelf: "start" }}>{row.type || "—"}</span>
              <div style={{ fontSize: 10.5, textAlign: "right", ...terminalMutedStyle() }}>{fmtDate(row.postedDate)}</div>
              {row.url ? (
                <a href={row.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle("cyan")}>Open</a>
              ) : <span />}
            </div>
          ))}
        </div>
      </div>
    </TerminalPanel>
  );
}
