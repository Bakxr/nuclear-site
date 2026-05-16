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

function fmtShares(n) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtUsd(n) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function InsiderTradesPanel() {
  const { insiderRows, selectEntity } = useTerminal();
  return (
    <TerminalPanel
      panelId="terminal-panel-insider"
      title="Insider transactions"
      subtitle="SEC Form 4 buys and sells, parsed from the underlying XML filings."
      actions={[
        <span key="count" style={terminalTagStyle({ tone: "amber", compact: true })}>
          {insiderRows.length} trades
        </span>,
      ]}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "50px minmax(0,1fr) 70px 90px 60px auto", gap: 8, padding: "0 10px 6px", borderBottom: "1px solid rgba(51,66,86,0.92)" }}>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Ticker</div>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Insider</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Side</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Value</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Date</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>SEC</div>
        </div>
        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(320), padding: "0 10px" }}>
          {insiderRows.length === 0 ? (
            <div style={{ padding: "16px 0", fontSize: 11.5, ...terminalMutedStyle() }}>No insider transactions on file.</div>
          ) : null}
          {insiderRows.slice(0, 25).map((row) => (
            <div key={row.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "50px minmax(0,1fr) 70px 90px 60px auto", gap: 8, alignItems: "center" }}>
              <button type="button" onClick={() => selectEntity(row)} className="np-terminal-button" style={{ background: "transparent", border: "none", color: "var(--np-terminal-amber)", fontFamily: "'DM Mono',monospace", fontWeight: 700, textAlign: "left", cursor: "pointer", padding: 0 }}>
                {row.ticker}
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--np-terminal-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.filer || "—"}</div>
                <div style={{ fontSize: 10, ...terminalMutedStyle() }}>{row.title || "Insider"} · {fmtShares(row.shares)} sh</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={terminalTagStyle({ tone: row.transactionType === "buy" ? "success" : row.transactionType === "sell" ? "danger" : "default", compact: true })}>
                  {row.transactionType || "—"}
                </span>
              </div>
              <div style={{ ...terminalValueStyle({ tone: row.transactionType === "buy" ? "positive" : row.transactionType === "sell" ? "negative" : "default", size: 12 }), textAlign: "right" }}>
                {fmtUsd(row.totalValue)}
              </div>
              <div style={{ fontSize: 10.5, textAlign: "right", ...terminalMutedStyle() }}>{fmtDate(row.date)}</div>
              {row.url ? (
                <a href={row.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle("cyan")}>SEC</a>
              ) : <span />}
            </div>
          ))}
        </div>
      </div>
    </TerminalPanel>
  );
}
