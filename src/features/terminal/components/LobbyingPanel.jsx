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

function fmtUsd(n) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function LobbyingPanel() {
  const { lobbyingRows } = useTerminal();
  return (
    <TerminalPanel
      panelId="terminal-panel-lobbying"
      title="Lobbying disclosures"
      subtitle="Senate LDA filings touching nuclear policy this filing year."
      actions={[
        <span key="count" style={terminalTagStyle({ tone: "amber", compact: true })}>
          {lobbyingRows.length} filings
        </span>,
      ]}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 90px 80px 50px", gap: 8, padding: "0 10px 6px", borderBottom: "1px solid rgba(51,66,86,0.92)" }}>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Client / Registrant</div>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Period</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Spend</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Doc</div>
        </div>
        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(320), padding: "0 10px" }}>
          {lobbyingRows.length === 0 ? (
            <div style={{ padding: "16px 0", fontSize: 11.5, ...terminalMutedStyle() }}>No lobbying filings on record.</div>
          ) : null}
          {lobbyingRows.map((row) => (
            <div key={row.id} className="np-terminal-row" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "minmax(0,1fr) 90px 80px 50px", gap: 8, alignItems: "start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--np-terminal-text)" }}>{row.client || "—"}</div>
                <div style={{ fontSize: 10, marginTop: 3, ...terminalMutedStyle() }}>{row.registrant || row.filer}</div>
                {row.issues?.length ? (
                  <div style={{ fontSize: 10, marginTop: 4, ...terminalMutedStyle() }}>{row.issues.join(" · ")}</div>
                ) : null}
              </div>
              <div style={{ fontSize: 10.5, ...terminalMutedStyle() }}>{row.period}</div>
              <div style={{ ...terminalValueStyle({ tone: "amber", size: 12 }), textAlign: "right" }}>{fmtUsd(row.amount)}</div>
              {row.url ? (
                <a href={row.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle("cyan")}>LDA</a>
              ) : <span />}
            </div>
          ))}
        </div>
      </div>
    </TerminalPanel>
  );
}
