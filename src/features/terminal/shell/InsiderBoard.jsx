import { useState } from "react";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "../components/TerminalPanel.jsx";
import { fmtCompact, fmtShortDate } from "./format.js";
import ExtArrow from "../../../components/ExtArrow.jsx";

const TONE = { buy: "up", sell: "down" };

export default function InsiderBoard() {
  const { insiderRows, snapshot, selectEntity } = useTerminal();
  const [view, setView] = useState("market");
  const companyByTicker = new Map((snapshot?.entities?.companies || []).map((c) => [c.ticker, c]));

  // Open-market trades (codes P/S) are the signal; grants, exercises and tax
  // withholding are compensation mechanics and live under "All".
  const marketRows = insiderRows.filter((row) => row.transactionCode === "P" || row.transactionCode === "S");
  const rows = view === "market" ? marketRows : insiderRows;
  const buys = marketRows.filter((row) => row.transactionCode === "P");
  const buyValue = buys.reduce((sum, row) => sum + (row.totalValue || 0), 0);

  return (
    <TerminalPanel
      panelId="terminal-panel-insider"
      title="Insider activity"
      count={buys.length ? `${buys.length} buys · ${fmtCompact(buyValue, { prefix: "$" })}` : rows.length}
      subtitle="SEC Form 4 transactions parsed from the filing XML. Open-market = transaction codes P (purchase) and S (sale)."
      actions={(
        <div className="npt-seg" role="group" aria-label="Insider filter">
          <button type="button" aria-pressed={view === "market"} onClick={() => setView("market")}>Open market</button>
          <button type="button" aria-pressed={view === "all"} onClick={() => setView("all")}>All</button>
        </div>
      )}
      bodyStyle={{ padding: "6px 0 0" }}
    >
      {rows.length === 0 ? (
        <div className="npt-empty">
          <strong>{insiderRows.length ? "No open-market trades" : "No Form 4 filings"}</strong>
          {insiderRows.length ? "Recent filings are grants, exercises or withholding — see All." : "Nothing filed in the current window."}
        </div>
      ) : (
        <table className="npt-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Insider</th>
              <th>Type</th>
              <th className="r">Shares</th>
              <th className="r">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const tone = TONE[row.transactionType];
              const company = companyByTicker.get(row.ticker);
              return (
                <tr key={row.id} onClick={() => company && selectEntity(company)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" && company) selectEntity(company); }}>
                  <td className="npt-num npt-muted">{fmtShortDate(`${row.date}T12:00:00Z`)}</td>
                  <td><span className="npt-sym">{row.ticker}</span></td>
                  <td style={{ maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ fontSize: 12 }}>{row.filer}</span>
                    <span className="npt-subline" style={{ maxWidth: 190 }}>{row.title}</span>
                  </td>
                  <td><span className="npt-chip" data-tone={tone}>{row.transactionLabel || row.transactionType}</span></td>
                  <td className="r npt-num">{fmtCompact(row.shares)}</td>
                  <td className={`r npt-num ${tone ? `npt-${tone}` : "npt-muted"}`}>
                    {row.url ? (
                      <a href={row.url} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} style={{ color: "inherit", textDecoration: "none" }}>
                        {row.totalValue ? fmtCompact(row.totalValue, { prefix: "$" }) : "—"} <ExtArrow />
                      </a>
                    ) : row.totalValue ? fmtCompact(row.totalValue, { prefix: "$" }) : "—"}
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
