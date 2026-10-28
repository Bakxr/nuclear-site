import ErrorBoundary from "../../components/ErrorBoundary.jsx";
import { SectionHeader } from "../sections/shared.jsx";
import { SESSIONS, recentCloses, sparkPoints } from "./marketsData.js";

function monthChange(closes) {
  if (closes.length < 2) return null;
  return ((closes.at(-1) - closes[0]) / closes[0]) * 100;
}

function Change({ value }) {
  if (!Number.isFinite(value)) return <span className="np-num" style={{ color: "var(--np-text-faint)" }}>—</span>;
  return (
    <span className={`np-num ${value >= 0 ? "np-up" : "np-down"}`}>
      {value >= 0 ? "▲" : "▼"} {Math.abs(value).toFixed(value >= 10 || value <= -10 ? 1 : 2)}%
    </span>
  );
}

function marketsMeta(loading, lastUpdated, stocks) {
  const priced = stocks.filter((s) => s.price > 0);
  const up = priced.filter((s) => s.pct >= 0).length;
  const breadth = priced.length ? `${up} of ${priced.length} up today` : "";
  if (loading) return "Updating…";
  const time = lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "";
  return [breadth, time, "Finnhub"].filter(Boolean).join(" · ");
}

export default function MarketsTable({ sectionRef, stocks, stocksLoading, stocksLastUpdated, stocksError, onRetry, onOpenStock }) {
  return (
    <ErrorBoundary section="Markets">
      <section ref={sectionRef} className="np-markets np-wrap" style={{ scrollMarginTop: 60 }}>
        <SectionHeader label="Markets" meta={marketsMeta(stocksLoading, stocksLastUpdated, stocks)} title="Nuclear stocks" />
        {stocksError ? (
          <div style={{ padding: "32px 0", borderTop: "1px solid var(--np-hairline)" }}>
            <p style={{ margin: "0 0 12px", color: "var(--np-text-muted)" }}>Market data couldn't load.</p>
            <button type="button" className="np-btn np-btn--ghost" onClick={onRetry}>Retry</button>
          </div>
        ) : (
          <div className="np-table-scroll">
            <table className="np-table">
              <caption className="sr-only">Nuclear stocks: last price, change today, change over one month and a one-month chart</caption>
              <thead>
                <tr>
                  <th scope="col" className="np-col-name">Company</th>
                  <th scope="col">Price</th>
                  <th scope="col">Today</th>
                  <th scope="col">1 month</th>
                  <th scope="col" className="np-col-spark">Last {SESSIONS} sessions</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock) => {
                  const closes = recentCloses(stock);
                  const points = sparkPoints(closes);
                  const month = monthChange(closes);
                  return (
                    <tr key={stock.ticker} onClick={() => onOpenStock(stock)}>
                      <th scope="row" className="np-col-name">
                        <button type="button" onClick={(e) => { e.stopPropagation(); onOpenStock(stock); }}>
                          <b>{stock.ticker}</b> <span className="np-co-name" style={{ color: "var(--np-text-faint)", fontWeight: 400 }}>{stock.name}</span>
                        </button>
                      </th>
                      <td className="np-num">{stocksLoading && !stock.price ? "…" : stock.price > 0 ? `$${stock.price.toFixed(2)}` : "—"}</td>
                      <td><Change value={stock.price > 0 ? stock.pct : NaN} /></td>
                      <td><Change value={month} /></td>
                      <td className="np-col-spark">
                        {points ? (
                          <svg viewBox="0 0 100 28" width="160" height="28" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block" }}>
                            <polyline points={points} fill="none" stroke="var(--np-text)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                          </svg>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="np-table-note">Daily closes, not investment advice. Select a company for its chart and filings.</p>
      </section>
    </ErrorBoundary>
  );
}
