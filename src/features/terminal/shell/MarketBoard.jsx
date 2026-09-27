import { useMemo, useState } from "react";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "../components/TerminalPanel.jsx";
import Sparkline from "./Sparkline.jsx";
import { fmtCompact, fmtPrice, fmtSignedPct, historyChange, isNum, toneOf } from "./format.js";
import { STOCK_GROUPS } from "../../../data/constants.js";

const SORTS = [
  { id: "pct", label: "1D" },
  { id: "month", label: "1M" },
  { id: "ticker", label: "A–Z" },
];

function RangeBar({ low, high, price }) {
  if (!isNum(low) || !isNum(high) || !isNum(price) || high <= low) {
    return <span className="npt-subtle">—</span>;
  }
  const pos = Math.min(1, Math.max(0, (price - low) / (high - low)));
  return (
    <span className="npt-range" title={`52w ${fmtPrice(low)} – ${fmtPrice(high)} · ${Math.round(pos * 100)}th pct of range`}>
      <i style={{ left: `${pos * 100}%` }} />
    </span>
  );
}

export default function MarketBoard({ compact = false }) {
  const { snapshot, selectedEntity, selectEntity, getEntityById, watchedSet, toggleWatch } = useTerminal();
  const [sort, setSort] = useState("pct");
  const [group, setGroup] = useState("all");

  const rows = useMemo(() => {
    const list = (snapshot?.entities?.marketInstruments || [])
      .filter((instrument) => group === "all" || instrument.group === group)
      .map((instrument) => ({
        ...instrument,
        month: historyChange(instrument.history, 21),
      }));
    if (sort === "ticker") return list.sort((a, b) => a.ticker.localeCompare(b.ticker));
    const key = sort === "month" ? "month" : "pct";
    return list.sort((a, b) => (isNum(b[key]) ? b[key] : -Infinity) - (isNum(a[key]) ? a[key] : -Infinity));
  }, [snapshot, sort, group]);

  const selectRow = (row) => {
    const company = row.companyId ? getEntityById(row.companyId) : null;
    selectEntity(company || row);
  };

  return (
    <TerminalPanel
      panelId="terminal-panel-board"
      title="Equities"
      count={rows.length}
      subtitle="Tracked nuclear equities. Quotes via Finnhub; daily history via Yahoo Finance."
      actions={(
        <>
        <select className="npt-select" value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Group" style={{ height: 24, fontSize: 10.5 }}>
          <option value="all">All groups</option>
          {STOCK_GROUPS.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <div className="npt-seg" role="group" aria-label="Sort">
          {SORTS.map((option) => (
            <button key={option.id} type="button" aria-pressed={sort === option.id} onClick={() => setSort(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
        </>
      )}
      bodyStyle={{ padding: "6px 0 0" }}
    >
      <table className="npt-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th className="r">Last</th>
            <th className="r">1D</th>
            {!compact ? <th className="r">1M</th> : null}
            <th>3M</th>
            {!compact ? <th>52W</th> : null}
            {!compact ? <th className="r">Vol</th> : null}
            <th aria-label="Watch" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = selectedEntity && (selectedEntity.id === row.companyId || selectedEntity.id === row.id);
            const watchId = row.companyId || row.id;
            const watched = watchedSet.has(watchId);
            return (
              <tr
                key={row.id}
                aria-selected={selected || undefined}
                onClick={() => selectRow(row)}
                onKeyDown={(event) => { if (event.key === "Enter") selectRow(row); }}
                tabIndex={0}
              >
                <td>
                  <span className="npt-sym">{row.ticker}</span>
                  <span className="npt-subline">{row.name}</span>
                </td>
                <td className="r npt-num">{fmtPrice(row.price)}</td>
                <td className={`r npt-num npt-${toneOf(row.pct)}`}>{fmtSignedPct(row.pct)}</td>
                {!compact ? <td className={`r npt-num npt-${toneOf(row.month)}`}>{fmtSignedPct(row.month, 1)}</td> : null}
                <td><Sparkline history={row.history} bars={63} width={compact ? 72 : 88} /></td>
                {!compact ? <td><RangeBar low={row.low52} high={row.high52} price={row.price} /></td> : null}
                {!compact ? <td className="r npt-num npt-muted">{fmtCompact(row.volume)}</td> : null}
                <td className="r">
                  <button
                    type="button"
                    className="npt-star"
                    aria-label={watched ? `Unwatch ${row.ticker}` : `Watch ${row.ticker}`}
                    aria-pressed={watched}
                    onClick={(event) => { event.stopPropagation(); toggleWatch(watchId); }}
                    style={{
                      border: 0,
                      background: "none",
                      padding: 2,
                      cursor: "pointer",
                      fontSize: 13,
                      color: watched ? "var(--np-terminal-amber)" : "var(--np-terminal-subtle)",
                    }}
                  >
                    {watched ? "★" : "☆"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TerminalPanel>
  );
}
