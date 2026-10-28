import { useEffect, useState } from "react";
import { fetchPredictionTeaser } from "../services/predictionsAPI.js";

function formatVolume(volume) {
  if (!Number.isFinite(volume) || volume <= 0) return null;
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}m`;
  if (volume >= 1_000) return `$${Math.round(volume / 1_000)}k`;
  return `$${Math.round(volume)}`;
}

function formatEndDate(endDate) {
  if (!endDate) return null;
  const date = new Date(endDate);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// A sample of the terminal inside the homepage PRO block (ProSection): the
// event-odds board, which the free pages don't carry. Set as a ruled table
// like the markets table; renders nothing until there are odds to show.
export default function TerminalEditorialStrip({ onOpenTerminal }) {
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchPredictionTeaser().then((list) => {
      if (!cancelled) setMarkets(list.filter((m) => Number.isFinite(m.yesPrice)).slice(0, 5));
    });
    return () => { cancelled = true; };
  }, []);

  if (!markets.length) return null;

  return (
    <div className="np-odds">
      <div className="np-odds-head">
        <div>
          <div className="np-kicker">From the terminal</div>
          <h3>What prediction markets are pricing</h3>
        </div>
        <button type="button" className="np-text-link" onClick={onOpenTerminal}>Full odds board →</button>
      </div>
      <div className="np-table-scroll">
        <table className="np-table np-odds-table">
          <caption className="sr-only">Prediction-market odds on nuclear events: question, market, volume, end date and the chance of yes</caption>
          <thead>
            <tr>
              <th scope="col" className="np-col-name">Question</th>
              <th scope="col" className="np-odds-meta">Market</th>
              <th scope="col" className="np-odds-meta">Volume</th>
              <th scope="col" className="np-odds-meta">Ends</th>
              <th scope="col">Yes</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market) => (
              <tr key={market.id} onClick={onOpenTerminal}>
                <th scope="row" className="np-col-name">{market.question.trim()}</th>
                <td className="np-odds-meta">{market.source === "kalshi" ? "Kalshi" : "Polymarket"}</td>
                <td className="np-odds-meta np-num">{formatVolume(market.volume) || "—"}</td>
                <td className="np-odds-meta">{formatEndDate(market.endDate) || "—"}</td>
                <td className="np-num np-odds-yes">{Math.round(market.yesPrice * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="np-table-note">Odds from Polymarket and Kalshi, refreshed every 30 minutes. Not investment advice.</p>
    </div>
  );
}
