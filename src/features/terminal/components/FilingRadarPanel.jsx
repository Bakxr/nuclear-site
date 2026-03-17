import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalDataRowStyle,
  terminalLinkStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTableHeaderStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";

function formatFiledLabel(value) {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FilingRadarPanel() {
  const { filingRows, selectEntity } = useTerminal();

  return (
    <TerminalPanel
      panelId="terminal-panel-filings"
      title="Filing radar"
      subtitle="Latest SEC disclosures across the tracked nuclear equity set."
      actions={[
        <span key="count" style={terminalTagStyle({ tone: "amber", compact: true })}>
          {filingRows.length} filings
        </span>,
      ]}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "56px minmax(0,1fr) auto", gap: 10, padding: "0 10px 6px", borderBottom: "1px solid rgba(51,66,86,0.92)" }}>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Ticker</div>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Form / entity</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>SEC</div>
        </div>

        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(300), padding: "0 10px" }}>
          {filingRows.slice(0, 12).map((filing) => (
            <div key={filing.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "56px minmax(0,1fr) auto", gap: 10, alignItems: "start" }}>
              <button
                type="button"
                onClick={() => selectEntity(filing)}
                className="np-terminal-button"
                style={{ background: "transparent", border: "none", color: "var(--np-terminal-amber)", fontFamily: "'DM Mono',monospace", fontWeight: 700, textAlign: "left", cursor: "pointer", padding: 0 }}
              >
                {filing.ticker}
              </button>
              <button
                type="button"
                onClick={() => selectEntity(filing)}
                className="np-terminal-button"
                style={{ background: "transparent", border: "none", color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ ...terminalValueStyle({ tone: "cyan", size: 12 }), fontWeight: 700 }}>{filing.form}</div>
                  <span style={{ fontSize: 10, ...terminalMutedStyle() }}>{formatFiledLabel(filing.filingDate)}</span>
                </div>
                <div style={{ fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 4, ...terminalMutedStyle() }}>
                  {filing.companyName}
                </div>
                <div style={{ fontSize: 10, marginTop: 4, ...terminalMutedStyle() }}>{filing.summary}</div>
              </button>
              {filing.url ? (
                <a href={filing.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle("cyan")}>
                  SEC
                </a>
              ) : (
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--np-terminal-muted)" }}>
                  SEC
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </TerminalPanel>
  );
}
