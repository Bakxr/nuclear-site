// Alert evaluation logic. Pure functions over a snapshot + alert rows.
//
// We build an observed-value index from the terminal snapshot (per ticker
// price + percent change today, plus a tiny event index for plant/entity
// alerts), then test each alert against the index.

function buildPriceIndex(snapshot) {
  const map = new Map();
  const stocks = snapshot?.entities?.stocks || [];
  for (const stock of stocks) {
    if (!stock?.ticker) continue;
    map.set(stock.ticker, {
      price: Number(stock.price) || null,
      pct: Number(stock.changePct ?? stock.pct ?? stock.changePercent) || 0,
    });
  }
  // Uranium can also be a target.
  const uranium = snapshot?.entities?.uranium;
  if (uranium) {
    map.set("URANIUM", {
      price: Number(uranium.price ?? uranium.value ?? uranium.spotPrice) || null,
      pct: Number(uranium.pct ?? uranium.changePct) || 0,
    });
  }
  return map;
}

function buildEventIndex(snapshot) {
  // For entity_event alerts we look at recent operations signals + filings
  // whose target matches. The dispatch only needs to know "did something
  // new happen?" — we treat anything updated in the last 28 hours as fresh
  // so once-a-day evaluation always catches yesterday's events.
  const map = new Map();
  const cutoff = Date.now() - 28 * 60 * 60 * 1000;

  function push(targetId, event) {
    if (!targetId) return;
    const list = map.get(targetId) || [];
    list.push(event);
    map.set(targetId, list);
  }

  for (const op of snapshot?.entities?.operationsSignals || []) {
    const ts = op.updatedAt ? new Date(op.updatedAt).getTime() : 0;
    if (ts && ts < cutoff) continue;
    push(op.plantId || op.id, { kind: "operations", title: op.headline || op.title, when: op.updatedAt });
  }
  for (const filing of snapshot?.entities?.companyFilings || []) {
    const ts = filing.filedAt ? new Date(filing.filedAt).getTime() : 0;
    if (ts && ts < cutoff) continue;
    const targetId = filing.ticker || filing.company;
    push(targetId, { kind: "filing", title: `${filing.form || "Filing"}: ${filing.title || filing.company}`, when: filing.filedAt });
  }
  return map;
}

export function buildSnapshotIndex(snapshot) {
  return {
    prices: buildPriceIndex(snapshot),
    events: buildEventIndex(snapshot),
  };
}

export function evaluateAlert(alert, index) {
  const observed = index.prices.get(alert.target_id);

  switch (alert.alert_type) {
    case "price_drop": {
      if (!observed || observed.price == null) return null;
      if (alert.threshold != null && observed.price <= Number(alert.threshold)) {
        return { fired: true, observed: { price: observed.price, formatted: `$${observed.price.toFixed(2)}` } };
      }
      return null;
    }
    case "price_rise": {
      if (!observed || observed.price == null) return null;
      if (alert.threshold != null && observed.price >= Number(alert.threshold)) {
        return { fired: true, observed: { price: observed.price, formatted: `$${observed.price.toFixed(2)}` } };
      }
      return null;
    }
    case "percent_drop": {
      if (!observed) return null;
      if (alert.threshold != null && observed.pct <= -Math.abs(Number(alert.threshold))) {
        return { fired: true, observed: { pct: observed.pct, formatted: `${observed.pct.toFixed(2)}%` } };
      }
      return null;
    }
    case "percent_rise": {
      if (!observed) return null;
      if (alert.threshold != null && observed.pct >= Math.abs(Number(alert.threshold))) {
        return { fired: true, observed: { pct: observed.pct, formatted: `${observed.pct.toFixed(2)}%` } };
      }
      return null;
    }
    case "entity_event": {
      const events = index.events.get(alert.target_id);
      if (events && events.length > 0) {
        return { fired: true, observed: { formatted: events[0].title } };
      }
      return null;
    }
    default:
      return null;
  }
}
