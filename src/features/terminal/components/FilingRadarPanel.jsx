import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import { terminalButtonStyle, terminalDataRowStyle, terminalScrollAreaStyle } from "./styles.js";

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
        <span key="count" style={{ ...terminalButtonStyle(false), cursor: "default" }}>
          {filingRows.length} filings
        </span>,
      ]}
    >
      <div style={terminalScrollAreaStyle(360)}>
        {filingRows.slice(0, 12).map((filing) => (
          <div key={filing.id} style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "70px minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => selectEntity(filing)}
              style={{ background: "none", border: "none", color: "#d4a54a", fontFamily: "'DM Mono',monospace", fontWeight: 700, textAlign: "left", cursor: "pointer", padding: 0 }}
            >
              {filing.ticker}
            </button>
            <button
              type="button"
              onClick={() => selectEntity(filing)}
              style={{ background: "none", border: "none", color: "#f5f0e8", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{filing.form}</div>
                <span style={{ fontSize: 10.5, color: "rgba(245,240,232,0.44)" }}>{formatFiledLabel(filing.filingDate)}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(245,240,232,0.58)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {filing.companyName}
              </div>
              <div style={{ fontSize: 11, color: "rgba(245,240,232,0.44)" }}>{filing.summary}</div>
            </button>
            {filing.url ? (
              <a href={filing.url} target="_blank" rel="noopener noreferrer" style={{ color: "#7dd3fc", fontSize: 11, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                SEC
              </a>
            ) : (
              <span style={{ color: "rgba(245,240,232,0.34)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                SEC
              </span>
            )}
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}
