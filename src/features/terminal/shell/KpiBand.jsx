import { useMemo } from "react";
import { useTerminal } from "../context.jsx";
import { fmtShortDate, fmtSignedPct, formatProbability, historyChange, isNum, toneOf } from "./format.js";

function Kpi({ label, value, delta, deltaTone, foot, onClick, title, children }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className="npt-kpi" onClick={onClick} type={onClick ? "button" : undefined} title={title}>
      <span className="npt-kpi-label">{label}</span>
      <span className="npt-kpi-row">
        <span className="npt-kpi-value npt-num">{value}</span>
        {delta ? <span className={`npt-kpi-delta npt-${deltaTone || "flat"}`}>{delta}</span> : null}
      </span>
      {children}
      {foot ? <span className="npt-kpi-foot">{foot}</span> : null}
    </Tag>
  );
}

function mean(values) {
  const nums = values.filter(isNum);
  return nums.length ? nums.reduce((sum, v) => sum + v, 0) / nums.length : null;
}

export default function KpiBand({ onDeskChange }) {
  const { snapshot, predictionMarketRows, openMarket } = useTerminal();

  const stats = useMemo(() => {
    const entities = snapshot?.entities || {};
    // Operating companies only — ETFs and physical trusts hold the same names
    // and would double-count in the basket and breadth.
    const instruments = (entities.marketInstruments || []).filter((m) => m.price > 0 && m.group !== "Funds");
    const basketDay = mean(instruments.map((m) => m.pct));
    const basketMonth = mean(instruments.map((m) => historyChange(m.history, 21)));
    const advancers = instruments.filter((m) => m.pct > 0).length;
    const decliners = instruments.filter((m) => m.pct < 0).length;
    const leader = [...instruments].sort((a, b) => (b.pct || 0) - (a.pct || 0))[0];
    const laggard = [...instruments].sort((a, b) => (a.pct || 0) - (b.pct || 0))[0];

    const units = entities.reactorUnits || [];
    const operating = units.filter((u) => u.status === "Operating");
    const operatingGw = operating.reduce((sum, u) => sum + (u.capacityMw || 0), 0) / 1000;
    const building = units.filter((u) => u.status === "Construction");
    const buildingGw = building.reduce((sum, u) => sum + (u.capacityMw || 0), 0) / 1000;

    const ops = entities.operationsSignals || [];
    const avgPower = mean(ops.map((o) => o.powerPct));
    const offline = ops.filter((o) => o.powerPct === 0).length;

    return {
      uranium: entities.uranium,
      basketDay,
      basketMonth,
      advancers,
      decliners,
      leader,
      laggard,
      operatingCount: operating.length,
      operatingGw,
      buildingCount: building.length,
      buildingGw,
      avgPower,
      opsCount: ops.length,
      offline,
    };
  }, [snapshot]);

  const topMarket = predictionMarketRows[0];
  const total = stats.advancers + stats.decliners;
  const uranium = stats.uranium;

  return (
    <section className="npt-kpis" aria-label="Key indicators">
      <Kpi
        label="U3O8 spot · $/lb"
        value={uranium?.pricePerLb ? `$${uranium.pricePerLb.toFixed(2)}` : "—"}
        delta={isNum(uranium?.changePct) ? fmtSignedPct(uranium.changePct) : null}
        deltaTone={toneOf(uranium?.changePct)}
        foot={uranium ? `SPUT NAV proxy · ${fmtShortDate(uranium.asOf)}` : "Feed unavailable"}
        title={uranium?.source}
      />
      <Kpi
        label="Nuclear basket · EW"
        value={fmtSignedPct(stats.basketDay)}
        foot={isNum(stats.basketMonth) ? `1M ${fmtSignedPct(stats.basketMonth, 1)} · ${total} equities` : `${total} equities`}
        onClick={() => onDeskChange("markets")}
        title="Equal-weight average daily change of the tracked nuclear equities"
      />
      <Kpi
        label="Breadth"
        value={`${stats.advancers}▲ ${stats.decliners}▼`}
        foot={stats.leader ? `Lead ${stats.leader.ticker} ${fmtSignedPct(stats.leader.pct, 1)} · Lag ${stats.laggard.ticker} ${fmtSignedPct(stats.laggard.pct, 1)}` : null}
        onClick={() => onDeskChange("markets")}
      >
        {total ? (
          <span className="npt-breadth" aria-hidden="true">
            <span style={{ width: `${(stats.advancers / total) * 100}%` }} />
            <span style={{ width: `${(stats.decliners / total) * 100}%` }} />
          </span>
        ) : null}
      </Kpi>
      <Kpi
        label="Global fleet"
        value={`${stats.operatingGw.toFixed(0)} GW`}
        foot={`${stats.operatingCount} units · ${stats.buildingCount} building (${stats.buildingGw.toFixed(0)} GW)`}
        onClick={() => onDeskChange("fleet")}
      />
      <Kpi
        label="US fleet output · NRC"
        value={isNum(stats.avgPower) ? `${stats.avgPower.toFixed(1)}%` : "—"}
        foot={stats.opsCount ? `${stats.opsCount} units reporting · ${stats.offline} offline` : "Feed unavailable"}
        onClick={() => onDeskChange("fleet")}
      />
      <Kpi
        label="Top event odds"
        value={topMarket ? formatProbability(topMarket.yesPrice) : "—"}
        foot={topMarket ? topMarket.question : "No live markets"}
        onClick={topMarket ? () => openMarket(topMarket) : undefined}
        title={topMarket?.question}
      />
    </section>
  );
}
