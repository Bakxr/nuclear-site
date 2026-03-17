import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalDataRowStyle,
  terminalLinkStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
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
      title="Filing radar"
      subtitle="Latest SEC disclosures across the tracked nuclear equity set."
      actions={[
        <span key="count" style={terminalTagStyle({ tone: "amber", compact: true })}>
          {filingRows.length} filings
        </span>,
      ]}
    >
      <div className="np-terminal-scroll" style={terminalScrollAreaStyle(360)}>
        {filingRows.slice(0, 12).map((filing) => (
          <div key={filing.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "66px minmax(0,1fr) auto", gap: 12, alignItems: "start" }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <div style={{ ...terminalValueStyle({ tone: "cyan", size: 13 }), fontWeight: 700 }}>{filing.form}</div>
                <span style={{ fontSize: 10.5, ...terminalMutedStyle() }}>{formatFiledLabel(filing.filingDate)}</span>
              </div>
              <div style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...terminalMutedStyle() }}>
                {filing.companyName}
              </div>
              <div style={{ fontSize: 11, marginTop: 4, ...terminalMutedStyle() }}>{filing.summary}</div>
            </button>
            {filing.url ? (
              <a href={filing.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle("cyan")}>
                SEC
              </a>
            ) : (
              <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--np-terminal-muted)" }}>
                SEC
              </span>
            )}
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}
