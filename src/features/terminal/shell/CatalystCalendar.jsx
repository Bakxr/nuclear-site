import { useState } from "react";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "../components/TerminalPanel.jsx";
import { fmtShortDate } from "./format.js";

const DAY_MS = 86_400_000;

function daysFromToday(value) {
  if (!value) return null;
  const t = new Date(`${String(value).slice(0, 10)}T12:00:00Z`).getTime();
  if (!Number.isFinite(t)) return null;
  const today = new Date();
  const todayNoon = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12);
  return Math.round((t - todayNoon) / DAY_MS);
}

function whenLabel(days) {
  if (days == null) return "—";
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}

export default function CatalystCalendar() {
  const { earningsRows, materialEventRows, snapshot, selectEntity } = useTerminal();
  const [view, setView] = useState("earnings");
  const companyByTicker = new Map((snapshot?.entities?.companies || []).map((c) => [c.ticker, c]));
  const select = (ticker) => {
    const company = companyByTicker.get(ticker);
    if (company) selectEntity(company);
  };

  const scheduled = earningsRows.filter((row) => row.estimatedNext);
  const unscheduled = earningsRows.filter((row) => !row.estimatedNext);

  return (
    <TerminalPanel
      panelId="terminal-panel-calendar"
      title="Catalysts"
      count={view === "earnings" ? scheduled.length : materialEventRows.length}
      subtitle="Next earnings are estimated from each company's 10-Q cadence (not confirmed dates). 8-K material events come from SEC EDGAR."
      actions={(
        <div className="npt-seg" role="group" aria-label="Catalyst view">
          <button type="button" aria-pressed={view === "earnings"} onClick={() => setView("earnings")}>Earnings</button>
          <button type="button" aria-pressed={view === "8k"} onClick={() => setView("8k")}>8-K</button>
        </div>
      )}
      bodyStyle={{ padding: "6px 0 0" }}
    >
      {view === "earnings" ? (
        <table className="npt-table">
          <thead>
            <tr>
              <th>Est. date</th>
              <th>Symbol</th>
              <th className="r">When</th>
              <th className="r">Last</th>
            </tr>
          </thead>
          <tbody>
            {scheduled.map((row) => {
              const days = daysFromToday(row.estimatedNext);
              const soon = days != null && days >= 0 && days <= 14;
              return (
                <tr key={row.id} onClick={() => select(row.ticker)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") select(row.ticker); }}>
                  <td className="npt-num">{fmtShortDate(`${row.estimatedNext}T12:00:00Z`)}</td>
                  <td>
                    <span className="npt-sym">{row.ticker}</span>
                    <span className="npt-subline">{row.companyName}</span>
                  </td>
                  <td className={`r npt-num ${days != null && days < 0 ? "npt-down" : soon ? "npt-gold" : "npt-muted"}`}>{whenLabel(days)}</td>
                  <td className="r npt-num npt-subtle">
                    {row.lastFilingUrl ? (
                      <a href={row.lastFilingUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} style={{ color: "inherit", textDecoration: "none" }}>
                        {row.lastForm || "filing"} ↗
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
            {unscheduled.length ? (
              <tr style={{ cursor: "default" }}>
                <td colSpan={4} className="npt-subtle" style={{ whiteSpace: "normal", fontSize: 11 }}>
                  No estimate for {unscheduled.map((row) => row.ticker).join(", ")} — foreign filers (6-K / 40-F) don't report on the 10-Q cycle.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      ) : (
        <div className="npt-list">
          {materialEventRows.slice(0, 25).map((event) => (
            <a
              key={event.id}
              className="npt-row"
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", padding: "8px 12px" }}
            >
              <span className="npt-row-meta">
                <span className="npt-num">{fmtShortDate(`${event.filedAt}T12:00:00Z`)}</span>
                <span className="npt-sym" style={{ fontSize: 11 }}>{event.ticker}</span>
                <span>Item {event.item}</span>
                <span style={{ marginLeft: "auto" }}>↗</span>
              </span>
              <span className="npt-row-title" style={{ fontSize: 12 }}>{event.summary}</span>
            </a>
          ))}
        </div>
      )}
    </TerminalPanel>
  );
}
