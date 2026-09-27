import { useMemo, useState } from "react";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "../components/TerminalPanel.jsx";
import { MARKET_CATEGORY_OPTIONS } from "../marketCategory.js";
import { fmtCompact, formatProbability, isNum } from "./format.js";

function daysLeft(endDate) {
  if (!endDate) return null;
  const t = new Date(endDate).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.ceil((t - Date.now()) / 86_400_000));
}

function fmtPp(delta) {
  if (!isNum(delta)) return null;
  const pp = Math.round(delta * 100);
  if (!pp) return null;
  return `${pp > 0 ? "+" : "−"}${Math.abs(pp)}pp`;
}

export default function OddsBoard({ compact = false }) {
  const { predictionMarketRows, openMarket, selectedMarket } = useTerminal();
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const present = new Set(predictionMarketRows.map((row) => row.category?.id).filter(Boolean));
    return MARKET_CATEGORY_OPTIONS.filter((option) => option.id === "all" || present.has(option.id)).slice(0, 4);
  }, [predictionMarketRows]);

  const rows = category === "all"
    ? predictionMarketRows
    : predictionMarketRows.filter((row) => row.category?.id === category);

  return (
    <TerminalPanel
      panelId="terminal-panel-odds"
      title="Event odds"
      count={rows.length}
      subtitle="Live nuclear-relevant markets on Polymarket and Kalshi. Deadline variants are grouped; expired markets are excluded."
      actions={!compact && categories.length > 1 ? (
        <div className="npt-seg" role="group" aria-label="Category">
          {categories.map((option) => (
            <button key={option.id} type="button" aria-pressed={category === option.id} onClick={() => setCategory(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      bodyStyle={{ padding: 0 }}
    >
      {rows.length === 0 ? (
        <div className="npt-empty">
          <strong>No live markets</strong>
          Nothing nuclear-relevant is trading right now.
        </div>
      ) : (
        <div className="npt-list">
          {rows.map((row) => {
            const days = daysLeft(row.endDate);
            const pp = fmtPp(row.delta24h);
            const venue = row.source === "polymarket" ? "Polymarket" : row.source === "kalshi" ? "Kalshi" : row.source;
            return (
              <button
                key={row.id}
                type="button"
                className="npt-row"
                aria-selected={selectedMarket?.id === row.id || undefined}
                onClick={() => openMarket(row)}
                style={{ gridTemplateColumns: "minmax(0,1fr) auto", columnGap: 14, alignItems: "center" }}
              >
                <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
                  <span className="npt-row-title" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {row.question.trim()}
                  </span>
                  <span className="npt-row-meta">
                    {row.seriesCount > 1 ? <span className="npt-chip" data-tone="gold" title="Same question listed with several deadlines">{row.seriesCount} dates</span> : null}
                    <span>{venue}</span>
                    <span>· {fmtCompact(row.volume, { prefix: "$" })}</span>
                    {days != null ? <span>· {days}d</span> : null}
                    {row.anchor?.anchorLabel ? <span className="npt-fill">· {row.anchor.anchorLabel}</span> : null}
                  </span>
                </div>
                <div style={{ display: "grid", justifyItems: "end", gap: 5, minWidth: 64 }}>
                  <span className="npt-num" style={{ fontSize: 17, fontWeight: 500, color: row.yesPrice >= 0.5 ? "var(--np-terminal-green)" : "var(--np-terminal-text)" }}>
                    {formatProbability(row.yesPrice)}
                  </span>
                  <span className="npt-meter" style={{ width: 56 }} aria-hidden="true">
                    <i style={{ width: `${Math.max(2, Math.round((row.yesPrice || 0) * 100))}%` }} />
                  </span>
                  {pp ? (
                    <span className={`npt-num ${pp.startsWith("+") ? "npt-up" : "npt-down"}`} style={{ fontSize: 10.5 }}>{pp} 24h</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </TerminalPanel>
  );
}
