import { useState } from "react";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "../components/TerminalPanel.jsx";
import { fmtShortDate } from "./format.js";
import ExtArrow from "../../../components/ExtArrow.jsx";

const ACTION_TONE = { Licensing: "gold", "Public Meeting": "cyan", Enforcement: "down" };

function dateOnly(value) {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value;
}

export function NrcNotices() {
  const { nrcDocketRows } = useTerminal();
  const [action, setAction] = useState("all");
  const actions = ["all", ...new Set(nrcDocketRows.map((row) => row.action).filter(Boolean))].slice(0, 4);
  const rows = action === "all" ? nrcDocketRows : nrcDocketRows.filter((row) => row.action === action);

  return (
    <TerminalPanel
      panelId="terminal-panel-nrc"
      title="NRC notices"
      count={rows.length}
      subtitle="Licensing actions, public meetings and notices from the US Nuclear Regulatory Commission news feed."
      actions={actions.length > 2 ? (
        <div className="npt-seg" role="group" aria-label="Notice type">
          {actions.map((id) => (
            <button key={id} type="button" aria-pressed={action === id} onClick={() => setAction(id)}>{id === "all" ? "All" : id}</button>
          ))}
        </div>
      ) : null}
      bodyStyle={{ padding: 0 }}
    >
      {rows.length === 0 ? (
        <div className="npt-empty"><strong>NRC feed unavailable</strong>Notices will appear on the next refresh.</div>
      ) : (
        <div className="npt-list">
          {rows.map((row) => (
            <a key={row.id} className="npt-row" href={row.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <span className="npt-row-meta">
                <span className="npt-num" style={{ minWidth: 48 }}>{fmtShortDate(dateOnly(row.filedAt))}</span>
                <span className="npt-chip" data-tone={ACTION_TONE[row.action]}>{row.action || "Notice"}</span>
                {row.plant ? <span className="npt-fill">{row.plant}</span> : null}
                <span style={{ marginLeft: "auto" }}><ExtArrow /></span>
              </span>
              <span className="npt-row-title">{row.title}</span>
            </a>
          ))}
        </div>
      )}
    </TerminalPanel>
  );
}

const FORM_LABEL = {
  "8-K": "Current report",
  "6-K": "Foreign issuer report",
  "10-Q": "Quarterly report",
  "10-K": "Annual report",
  "40-F": "Annual report (Canada)",
  "S-1": "Registration",
  "S-3": "Shelf registration",
};

export function SecFilings() {
  const { filingRows, materialEventRows, snapshot, selectEntity } = useTerminal();
  const companyByTicker = new Map((snapshot?.entities?.companies || []).map((c) => [c.ticker, c]));
  // Enrich 8-K rows with their item descriptions where EDGAR gave us one.
  const itemsByUrl = new Map();
  for (const event of materialEventRows) {
    const list = itemsByUrl.get(event.url) || [];
    list.push(event.summary);
    itemsByUrl.set(event.url, list);
  }

  return (
    <TerminalPanel
      panelId="terminal-panel-sec"
      title="SEC filings"
      count={filingRows.length}
      subtitle="Latest EDGAR filings for the tracked equities. 8-K rows show the reported items."
      bodyStyle={{ padding: "6px 0 0" }}
    >
      {filingRows.length === 0 ? (
        <div className="npt-empty"><strong>No recent filings</strong></div>
      ) : (
        <table className="npt-table">
          <thead>
            <tr>
              <th>Filed</th>
              <th>Symbol</th>
              <th>Form</th>
              <th>Detail</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filingRows.map((filing) => {
              const company = companyByTicker.get(filing.ticker);
              const items = itemsByUrl.get(filing.url);
              return (
                <tr key={filing.id} onClick={() => selectEntity(company || filing)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") selectEntity(company || filing); }}>
                  <td className="npt-num npt-muted">{fmtShortDate(filing.filingDate)}</td>
                  <td><span className="npt-sym">{filing.ticker}</span></td>
                  <td><span className="npt-chip" data-tone={filing.form === "8-K" ? "gold" : "cyan"}>{filing.form}</span></td>
                  <td style={{ whiteSpace: "normal", fontSize: 12, color: "var(--np-terminal-muted)" }}>
                    {items?.length ? items.join(" · ") : FORM_LABEL[filing.form] || filing.summary || "—"}
                  </td>
                  <td className="r">
                    {filing.url ? (
                      <a href={filing.url} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} style={{ color: "var(--np-terminal-subtle)", textDecoration: "none" }} aria-label="Open on EDGAR"><ExtArrow /></a>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </TerminalPanel>
  );
}
