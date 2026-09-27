import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "../components/TerminalPanel.jsx";
import AlertsPanel from "../components/AlertsPanel.jsx";
import { fmtAgo, fmtCompact, fmtPrice, fmtShortDate, fmtSignedNum, fmtSignedPct, historyChange, isNum, toneOf } from "./format.js";

const TYPE_LABEL = {
  company: "Equity",
  plant: "Power plant",
  country: "Country",
  project: "Project",
  story: "News",
  filing: "SEC filing",
  operationsSignal: "NRC unit status",
  supplySite: "Fuel-cycle site",
  marketInstrument: "Equity",
  reactorUnit: "Reactor unit",
};

const CHART_RANGES = [
  { id: "1M", bars: 21 },
  { id: "3M", bars: 63 },
  { id: "6M", bars: null },
];

function Fact({ label, value, tone }) {
  return (
    <div className="npt-fact">
      <span>{label}</span>
      <b className={tone ? `npt-${tone}` : undefined} title={typeof value === "string" ? value : undefined}>{value ?? "—"}</b>
    </div>
  );
}

function Section({ label, count, children }) {
  return (
    <>
      <div className="npt-section-label">
        <span>{label}</span>
        {count != null ? <span>{count}</span> : null}
      </div>
      {children}
    </>
  );
}

function PriceChart({ history }) {
  const [range, setRange] = useState("3M");
  const bars = CHART_RANGES.find((r) => r.id === range)?.bars;
  const data = (history || []).slice(bars ? -(bars + 1) : 0);
  if (data.length < 2) {
    return <div className="npt-empty" style={{ minHeight: 90 }}><strong>No price history</strong></div>;
  }
  const up = data.at(-1).price >= data[0].price;
  const stroke = up ? "#3ecf8e" : "#f0616d";
  const change = historyChange(data);

  return (
    <div>
      <div className="npt-chart-ranges" style={{ justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
        <div className="npt-seg" role="group" aria-label="Chart range">
          {CHART_RANGES.map((option) => (
            <button key={option.id} type="button" aria-pressed={range === option.id} onClick={() => setRange(option.id)}>{option.id}</button>
          ))}
        </div>
        <span className={`npt-num npt-${toneOf(change)}`} style={{ fontSize: 12 }}>{fmtSignedPct(change)} · {range}</span>
      </div>
      <div className="npt-chart" style={{ height: 150 }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 150 }}>
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="npt-insp-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis domain={["auto", "auto"]} hide />
            <Tooltip
              cursor={{ stroke: "rgba(148,163,184,0.35)", strokeWidth: 1 }}
              contentStyle={{ background: "#111720", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 6, fontFamily: "DM Mono, monospace", fontSize: 11, padding: "6px 8px" }}
              labelStyle={{ color: "#8d99a8" }}
              itemStyle={{ color: "#e6ebf1", padding: 0 }}
              formatter={(value) => [fmtPrice(value), "Close"]}
            />
            <Area type="monotone" dataKey="price" stroke={stroke} strokeWidth={1.5} fill="url(#npt-insp-grad)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MiniRows({ rows, onSelect, empty }) {
  if (!rows.length) return <div className="npt-subtle" style={{ padding: "2px 12px 10px", fontSize: 11.5 }}>{empty}</div>;
  return (
    <div className="npt-list">
      {rows.map((row) => {
        const content = (
          <>
            <span className="npt-row-meta"><span>{row.meta}</span>{row.url && !onSelect ? <span style={{ marginLeft: "auto" }}>↗</span> : null}</span>
            <span className="npt-row-title" style={{ fontSize: 12 }}>{row.title}</span>
          </>
        );
        return onSelect ? (
          <button key={row.id} type="button" className="npt-row" style={{ padding: "7px 12px" }} onClick={() => onSelect(row.entity || row)}>{content}</button>
        ) : (
          <a key={row.id} className="npt-row" style={{ padding: "7px 12px", textDecoration: "none" }} href={row.url} target="_blank" rel="noopener noreferrer">{content}</a>
        );
      })}
    </div>
  );
}

function CompanyView({ entity }) {
  const { snapshot, focus } = useTerminal();
  const filingRows = focus?.filings || [];
  const materialEventRows = focus?.materialEvents || [];
  const newsRows = focus?.news || [];
  const instrument = (snapshot.entities.marketInstruments || []).find((m) => m.ticker === entity.ticker) || {};
  const month = historyChange(instrument.history, 21);
  const events = materialEventRows.filter((e) => e.ticker === entity.ticker).slice(0, 4);
  const filings = filingRows.filter((f) => f.ticker === entity.ticker && f.form !== "8-K").slice(0, 3);
  const news = newsRows.slice(0, 4);

  return (
    <>
      <div className="npt-insp-price" style={{ padding: "12px 12px 0" }}>
        <b>{fmtPrice(instrument.price)}</b>
        <span className={`npt-${toneOf(instrument.pct)}`} style={{ fontSize: 13 }}>
          {fmtSignedNum(instrument.change)} ({fmtSignedPct(instrument.pct)})
        </span>
      </div>
      <PriceChart history={instrument.history} />
      <div className="npt-facts" style={{ borderTop: "1px solid var(--np-terminal-border)", marginTop: 8 }}>
        <Fact label="Day range" value={isNum(instrument.low) && instrument.low ? `${fmtPrice(instrument.low)} – ${fmtPrice(instrument.high)}` : "—"} />
        <Fact label="52W range" value={isNum(instrument.low52) ? `${fmtPrice(instrument.low52)} – ${fmtPrice(instrument.high52)}` : "—"} />
        <Fact label="Volume" value={fmtCompact(instrument.volume)} />
        <Fact label="1M" value={fmtSignedPct(month, 1)} tone={toneOf(month)} />
        <Fact label="Sector" value={entity.sector} />
        <Fact label="Exposure" value={(entity.countries || []).join(", ") || "—"} />
      </div>
      {entity.desc ? <p style={{ margin: 0, padding: "10px 12px 2px", fontSize: 12, lineHeight: 1.55, color: "var(--np-terminal-muted)" }}>{entity.desc}</p> : null}
      <Section label="Material events · 8-K" count={events.length || null}>
        <MiniRows
          rows={events.map((e) => ({ id: e.id, url: e.url, title: e.summary, meta: `${fmtShortDate(e.filedAt)} · Item ${e.item}` }))}
          empty="No recent 8-K events."
        />
      </Section>
      {filings.length ? (
        <Section label="Filings" count={filings.length}>
          <MiniRows rows={filings.map((f) => ({ id: f.id, url: f.url, title: `${f.form} — ${f.companyName}`, meta: fmtShortDate(f.filingDate) }))} />
        </Section>
      ) : null}
      <Section label="In the news" count={news.length || null}>
        <MiniRows
          rows={news.map((n) => ({ id: n.id, url: n.url, title: n.title, meta: `${n.dateLabel || fmtAgo(n.pubDate)} · ${n.sourceName}` }))}
          empty="No linked coverage in the current window."
        />
      </Section>
    </>
  );
}

function PlantView({ entity, onOpenPlant }) {
  const { focus, snapshot } = useTerminal();
  const operationsRows = focus?.operations || [];
  const units = (snapshot.entities.reactorUnits || []).filter((u) => u.plantId === entity.id);
  const ops = operationsRows.slice(0, 8);
  return (
    <>
      <div className="npt-facts">
        <Fact label="Capacity" value={isNum(entity.capacityMw) ? `${entity.capacityMw.toLocaleString("en-US")} MW` : "—"} />
        <Fact label="Units" value={entity.reactors ?? units.length} />
        <Fact label="Design" value={entity.type || entity.normalizedType} />
        <Fact label="Status" value={entity.status} tone={entity.status === "Operating" ? "up" : entity.status === "Shutdown" ? "down" : undefined} />
      </div>
      <div className="npt-insp-actions" style={{ padding: "10px 12px 0" }}>
        {onOpenPlant ? <button type="button" className="npt-btn" data-variant="gold" onClick={() => onOpenPlant(entity)}>Full plant profile</button> : null}
      </div>
      <Section label="NRC unit power" count={ops.length || null}>
        {ops.length ? (
          <div className="npt-list">
            {ops.map((signal) => (
              <a key={signal.id} className="npt-row" href={signal.url} target="_blank" rel="noopener noreferrer" style={{ gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", padding: "7px 12px", textDecoration: "none" }}>
                <span className="npt-row-title" style={{ fontSize: 12 }}>{signal.name}<span className="npt-subline">{signal.status}</span></span>
                <span className={`npt-num ${signal.powerPct >= 95 ? "npt-up" : signal.powerPct > 0 ? "npt-gold" : "npt-down"}`} style={{ fontSize: 15 }}>{signal.powerPct}%</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="npt-subtle" style={{ padding: "2px 12px 10px", fontSize: 11.5 }}>
            {entity.country === "USA" ? "No NRC status rows for this plant in the current snapshot." : "Unit power data is published for US plants only (NRC)."}
          </div>
        )}
      </Section>
    </>
  );
}

function CountryView({ entity }) {
  const { snapshot, selectEntity } = useTerminal();
  const plants = (snapshot.entities.plants || [])
    .filter((p) => p.country === entity.country)
    .sort((a, b) => (b.capacityMw || 0) - (a.capacityMw || 0))
    .slice(0, 8);
  return (
    <>
      <div className="npt-facts">
        <Fact label="Reactors" value={entity.reactors} />
        <Fact label="Capacity" value={isNum(entity.capacityGw) ? `${entity.capacityGw.toFixed(1)} GW` : "—"} />
        <Fact label="Nuclear share" value={isNum(entity.nuclearShare) ? `${entity.nuclearShare}%` : "—"} />
        <Fact label="In construction" value={entity.constructionCount} />
        <Fact label="Projects" value={entity.activeProjects} />
        <Fact label="Lead design" value={entity.topReactorType} />
      </div>
      <Section label="Largest plants" count={plants.length}>
        <MiniRows
          rows={plants.map((p) => ({ id: p.id, entity: p, title: p.name, meta: `${(p.capacityMw || 0).toLocaleString("en-US")} MW · ${p.status}` }))}
          onSelect={selectEntity}
        />
      </Section>
    </>
  );
}

function GenericView({ entity }) {
  const facts = [];
  if (entity.entityType === "project") {
    facts.push(["Status", entity.status], ["Capacity", isNum(entity.capacityMw) ? `${entity.capacityMw} MW` : "—"], ["Target", entity.targetYear], ["Developer", entity.company]);
  } else if (entity.entityType === "filing") {
    facts.push(["Form", entity.form], ["Filed", fmtShortDate(entity.filingDate)], ["Company", entity.companyName], ["Ticker", entity.ticker]);
  } else if (entity.entityType === "operationsSignal") {
    facts.push(["Power", `${entity.powerPct}%`], ["Status", entity.status], ["Unit", entity.unitLabel], ["Plant", entity.plantName]);
  } else if (entity.entityType === "supplySite") {
    facts.push(["Stage", entity.stage], ["Operator", entity.operator || entity.company], ["Country", entity.country], ["Status", entity.status]);
  }
  const body = entity.curiosityHook || entity.summary || entity.desc;
  return (
    <>
      {facts.length ? (
        <div className="npt-facts">
          {facts.map(([label, value]) => <Fact key={label} label={label} value={value ?? "—"} />)}
        </div>
      ) : null}
      {body ? <p style={{ margin: 0, padding: "12px", fontSize: 12.5, lineHeight: 1.6, color: "var(--np-terminal-muted)" }}>{body}</p> : null}
      {entity.url ? (
        <div className="npt-insp-actions" style={{ padding: "0 12px 12px" }}>
          <a className="npt-btn" data-variant="gold" href={entity.url} target="_blank" rel="noopener noreferrer">Open source ↗</a>
        </div>
      ) : null}
    </>
  );
}

function EntityInspector({ entity, onOpenPlant }) {
  const { watchedSet, toggleWatch, clearSelection } = useTerminal();
  const watched = watchedSet.has(entity.id);
  const isCompany = entity.entityType === "company";
  const title = isCompany ? entity.name : entity.name || entity.title || entity.question || entity.country;
  const subtitle = [
    TYPE_LABEL[entity.entityType] || entity.entityType,
    isCompany ? entity.ticker : null,
    entity.entityType === "story" ? entity.sourceName : null,
    entity.country && entity.entityType !== "country" ? entity.country : null,
  ].filter(Boolean).join(" · ");


  return (
    <TerminalPanel
      panelId="terminal-panel-inspector"
      title="Inspector"
      actions={(
        <>
          <button type="button" className="npt-btn" aria-pressed={watched} onClick={() => toggleWatch(entity.id)} style={{ height: 24, padding: "0 8px" }}>
            {watched ? "★ Watching" : "☆ Watch"}
          </button>
          <button type="button" className="npt-btn" onClick={clearSelection} aria-label="Close inspector (Esc)" title="Close (Esc)" style={{ height: 24, padding: "0 8px" }}>
            ✕
          </button>
        </>
      )}
      bodyStyle={{ padding: 0 }}
    >
      <div className="npt-insp-head">
        <span className="npt-row-meta"><span className="npt-chip" data-tone="gold">{subtitle}</span></span>
        <span className="npt-insp-name">{title}</span>
      </div>
      {isCompany ? <CompanyView entity={entity} /> : null}
      {entity.entityType === "plant" ? <PlantView entity={entity} onOpenPlant={onOpenPlant} /> : null}
      {entity.entityType === "country" ? <CountryView entity={entity} /> : null}
      {!["company", "plant", "country"].includes(entity.entityType) ? <GenericView entity={entity} /> : null}
    </TerminalPanel>
  );
}

function WatchlistView() {
  const { watchlistEntries = [], watchedSet, getEntityById, selectEntity, snapshot } = useTerminal();

  const rows = useMemo(() => {
    const byTicker = new Map((snapshot.entities.marketInstruments || []).map((m) => [m.ticker, m]));
    const labels = new Map(watchlistEntries.map((row) => [row.entity_id, row.entity_label]));
    return [...watchedSet].map((id) => {
      const entity = getEntityById(id);
      const quote = entity?.ticker ? byTicker.get(entity.ticker) : null;
      return {
        id,
        entity,
        label: entity?.ticker || entity?.name || entity?.title || entity?.country || labels.get(id) || id,
        detail: entity?.ticker ? entity.name : TYPE_LABEL[entity?.entityType] || "",
        quote,
      };
    });
  }, [watchedSet, watchlistEntries, getEntityById, snapshot]);

  return (
    <TerminalPanel panelId="terminal-panel-watchlist" title="Watchlist" count={rows.length} subtitle="Starred entities, synced across devices when signed in." bodyStyle={{ padding: 0 }}>
      {rows.length === 0 ? (
        <div className="npt-empty">
          <strong>Nothing pinned</strong>
          Star (☆) any equity, plant or story to track it here.
        </div>
      ) : (
        <div className="npt-list">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className="npt-row"
              onClick={() => row.entity && selectEntity(row.entity)}
              style={{ gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", padding: "8px 12px" }}
            >
              <span style={{ minWidth: 0 }}>
                <span className={row.quote ? "npt-sym" : "npt-row-title"} style={{ fontSize: 12.5 }}>{row.label}</span>
                <span className="npt-subline" style={{ maxWidth: 200 }}>{row.detail}</span>
              </span>
              {row.quote ? (
                <span style={{ display: "grid", justifyItems: "end", gap: 3 }}>
                  <span className="npt-num" style={{ fontSize: 12.5 }}>{fmtPrice(row.quote.price)}</span>
                  <span className={`npt-num npt-${toneOf(row.quote.pct)}`} style={{ fontSize: 11 }}>{fmtSignedPct(row.quote.pct)}</span>
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </TerminalPanel>
  );
}

export default function Inspector({ onOpenPlant }) {
  const { selectedEntity } = useTerminal();
  if (selectedEntity) {
    return (
      <aside className="npt-inspector" aria-label="Inspector">
        <div className="npt-cell"><EntityInspector entity={selectedEntity} onOpenPlant={onOpenPlant} /></div>
      </aside>
    );
  }
  return (
    <aside className="npt-inspector" data-empty="true" aria-label="Watchlist and alerts" style={{ gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)", gap: "var(--npt-gap)" }}>
      <div className="npt-cell"><WatchlistView /></div>
      <div className="npt-cell"><AlertsPanel /></div>
    </aside>
  );
}
