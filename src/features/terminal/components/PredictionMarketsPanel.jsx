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

function fmtPct(n) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function fmtVolume(n) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PredictionMarketsPanel() {
  const { predictionMarketRows, openMarket } = useTerminal();
  return (
    <TerminalPanel
      panelId="terminal-panel-prediction"
      title="Prediction markets"
      subtitle="Live nuclear-related markets from Polymarket and Kalshi."
      actions={[
        <span key="count" style={terminalTagStyle({ tone: "amber", compact: true })}>
          {predictionMarketRows.length} markets
        </span>,
      ]}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "70px minmax(0,1fr) 60px 70px 70px 50px", gap: 8, padding: "0 10px 6px", borderBottom: "1px solid rgba(51,66,86,0.92)" }}>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Source</div>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Question</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Yes</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Vol</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Close</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Open</div>
        </div>
        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(320), padding: "0 10px" }}>
          {predictionMarketRows.length === 0 ? (
            <div style={{ padding: "16px 0", fontSize: 11.5, ...terminalMutedStyle() }}>No active markets matching nuclear keywords.</div>
          ) : null}
          {predictionMarketRows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => openMarket(row)}
              className="np-terminal-row np-terminal-row--interactive np-terminal-button"
              style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "70px minmax(0,1fr) 60px 70px 70px 50px", gap: 8, alignItems: "center", textAlign: "left", background: "transparent", cursor: "pointer", color: "var(--np-terminal-text)" }}
            >
              <span style={{ ...terminalTagStyle({ tone: row.source === "polymarket" ? "cyan" : "amber", compact: true }) }}>{row.source}</span>
              <div style={{ fontSize: 12, color: "var(--np-terminal-text)", lineHeight: 1.35 }}>
                {row.question}
                {row.anchor ? <span style={{ fontSize: 10, marginLeft: 6, color: "var(--np-terminal-amber)", fontFamily: "'DM Mono',monospace" }}>· {row.anchor.anchorLabel}</span> : null}
              </div>
              <div style={{ ...terminalValueStyle({ tone: (row.yesPrice ?? 0) >= 0.5 ? "positive" : "default", size: 12 }), textAlign: "right" }}>{fmtPct(row.yesPrice)}</div>
              <div style={{ fontSize: 10.5, textAlign: "right", fontFamily: "'DM Mono',monospace", ...terminalMutedStyle() }}>{fmtVolume(row.volume)}</div>
              <div style={{ fontSize: 10.5, textAlign: "right", ...terminalMutedStyle() }}>{fmtDate(row.endDate)}</div>
              {row.url ? (
                <a href={row.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="np-terminal-link" style={terminalLinkStyle("cyan")}>Open</a>
              ) : <span />}
            </button>
          ))}
        </div>
      </div>
    </TerminalPanel>
  );
}
