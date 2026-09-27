import { useMemo } from "react";
import { useTerminal } from "../context.jsx";
import { fmtPrice, fmtSignedPct, toneOf } from "./format.js";

function TapeItem({ item, onSelect, hidden }) {
  return (
    <button
      type="button"
      className="npt-tape-item"
      onClick={() => onSelect(item)}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden || undefined}
    >
      <span className="npt-tape-sym">{item.symbol}</span>
      <span className="npt-num">{item.price}</span>
      <span className={`npt-num npt-${toneOf(item.pct)}`}>{fmtSignedPct(item.pct)}</span>
    </button>
  );
}

export default function TickerTape() {
  const { snapshot, selectEntity, getEntityById } = useTerminal();

  const items = useMemo(() => {
    const rows = [];
    const uranium = snapshot?.entities?.uranium;
    if (uranium?.pricePerLb) {
      rows.push({
        id: "u3o8",
        symbol: "U3O8",
        price: `$${uranium.pricePerLb.toFixed(2)}`,
        pct: uranium.changePct ?? null,
      });
    }
    for (const instrument of snapshot?.entities?.marketInstruments || []) {
      if (!instrument.price) continue;
      rows.push({
        id: instrument.id,
        entityId: instrument.companyId,
        symbol: instrument.ticker,
        price: fmtPrice(instrument.price),
        pct: instrument.pct,
      });
    }
    return rows;
  }, [snapshot]);

  if (!items.length) return null;

  const handleSelect = (item) => {
    const entity = item.entityId ? getEntityById(item.entityId) : null;
    if (entity) selectEntity(entity);
  };

  // Rendered twice back-to-back; the track scrolls by exactly one copy (-50%)
  // for a seamless loop. Speed scales with length so it reads the same.
  const duration = `${Math.max(30, items.length * 5)}s`;

  return (
    <div className="npt-tape" role="region" aria-label="Live prices">
      <div className="npt-tape-track" style={{ "--npt-tape-duration": duration }}>
        {items.map((item) => <TapeItem key={item.id} item={item} onSelect={handleSelect} />)}
        {items.map((item) => <TapeItem key={`${item.id}-dup`} item={item} onSelect={handleSelect} hidden />)}
      </div>
    </div>
  );
}
