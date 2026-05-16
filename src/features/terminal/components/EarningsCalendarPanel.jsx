import { useState } from "react";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalButtonStyle,
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

export default function EarningsCalendarPanel() {
  const { earningsRows, materialEventRows } = useTerminal();
  const [tab, setTab] = useState("calendar");
  const rows = tab === "calendar" ? earningsRows : materialEventRows;

  return (
    <TerminalPanel
      panelId="terminal-panel-earnings"
      title="Earnings + 8-K events"
      subtitle="Next reporting windows estimated from EDGAR 10-Q cadence, plus tracked 8-K item codes."
      actions={[
        <button key="cal" type="button" onClick={() => setTab("calendar")} className="np-terminal-button" style={terminalButtonStyle(tab === "calendar", { compact: true })}>
          Calendar
        </button>,
        <button key="ev" type="button" onClick={() => setTab("events")} className="np-terminal-button" style={terminalButtonStyle(tab === "events", { compact: true })}>
          Material events
        </button>,
        <span key="count" style={terminalTagStyle({ tone: "amber", compact: true })}>
          {rows.length}
        </span>,
      ]}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "55px minmax(0,1fr) 80px 80px auto", gap: 8, padding: "0 10px 6px", borderBottom: "1px solid rgba(51,66,86,0.92)" }}>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Ticker</div>
          <div style={terminalTableHeaderStyle("left", "cyan")}>{tab === "calendar" ? "Company" : "Event"}</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>{tab === "calendar" ? "Last" : "Item"}</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>{tab === "calendar" ? "Next" : "Filed"}</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>SEC</div>
        </div>
        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(320), padding: "0 10px" }}>
          {rows.length === 0 ? (
            <div style={{ padding: "16px 0", fontSize: 11.5, ...terminalMutedStyle() }}>No records.</div>
          ) : null}
          {tab === "calendar"
            ? earningsRows.map((row) => (
                <div key={row.id} className="np-terminal-row" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "55px minmax(0,1fr) 80px 80px auto", gap: 8, alignItems: "center" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--np-terminal-amber)" }}>{row.ticker}</div>
                  <div style={{ fontSize: 12, color: "var(--np-terminal-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.companyName}</div>
                  <div style={{ fontSize: 10.5, textAlign: "right", ...terminalMutedStyle() }}>{fmtDate(row.lastReported)}</div>
                  <div style={{ fontSize: 11, textAlign: "right", color: "var(--np-terminal-text)", fontFamily: "'DM Mono',monospace" }}>{fmtDate(row.estimatedNext)}</div>
                  {row.lastFilingUrl ? (
                    <a href={row.lastFilingUrl} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle("cyan")}>Last</a>
                  ) : <span />}
                </div>
              ))
            : materialEventRows.map((row) => (
                <div key={row.id} className="np-terminal-row" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "55px minmax(0,1fr) 80px 80px auto", gap: 8, alignItems: "center" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--np-terminal-amber)" }}>{row.ticker}</div>
                  <div style={{ fontSize: 11.5, color: "var(--np-terminal-text)" }}>{row.summary}</div>
                  <div style={{ textAlign: "right" }}>
                    <span style={terminalTagStyle({ tone: row.item === "2.02" ? "success" : "cyan", compact: true })}>{row.item}</span>
                  </div>
                  <div style={{ fontSize: 10.5, textAlign: "right", ...terminalMutedStyle() }}>{fmtDate(row.filedAt)}</div>
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
