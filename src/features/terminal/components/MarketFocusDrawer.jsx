import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTerminal } from "../context.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLabelStyle,
  terminalMutedStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";

function fmtPct(n) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function fmtVolume(n) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function daysUntil(date) {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((t - Date.now()) / (24 * 60 * 60 * 1000)));
}

const TABS = [
  { id: "news", label: "News" },
  { id: "filings", label: "Filings" },
  { id: "lobbying", label: "Lobbying" },
  { id: "contracts", label: "Contracts" },
  { id: "insider", label: "Insider" },
];

function matchesAnchor(row, market, fields) {
  const text = fields.map((f) => row[f]).filter(Boolean).join(" ").toLowerCase();
  if (!text) return false;
  const anchor = market.anchor;
  if (anchor?.anchorEntity?.country && text.includes(anchor.anchorEntity.country.toLowerCase())) return true;
  if (anchor?.anchorEntity?.name && text.includes(String(anchor.anchorEntity.name).toLowerCase())) return true;
  if (anchor?.anchorEntity?.ticker && text.toUpperCase().includes(anchor.anchorEntity.ticker)) return true;
  // Fall back to question keyword match (first non-trivial word).
  const q = String(market.question || "").toLowerCase();
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 4);
  return tokens.slice(0, 3).some((t) => text.includes(t));
}

export default function MarketFocusDrawer() {
  const {
    selectedMarket,
    closeMarket,
    snapshot,
    watchedSet,
    toggleWatch,
    createAlert,
  } = useTerminal();
  const [tab, setTab] = useState("news");
  const [expanded, setExpanded] = useState(false);
  const [alertSaving, setAlertSaving] = useState(false);

  useEffect(() => {
    if (!selectedMarket) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeMarket();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedMarket, closeMarket]);

  const chartData = useMemo(() => {
    if (!selectedMarket?.history?.length) return [];
    return selectedMarket.history.map((row) => ({
      t: row.t,
      tLabel: new Date(row.t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      p: row.p,
    }));
  }, [selectedMarket]);

  const linked = useMemo(() => {
    if (!selectedMarket) return { news: [], filings: [], lobbying: [], contracts: [], insider: [] };
    const e = snapshot?.entities || {};
    return {
      news: (e.newsArticles || []).filter((row) => matchesAnchor(row, selectedMarket, ["title", "curiosityHook", "country", "sourceName"])).slice(0, 6),
      filings: (e.companyFilings || []).filter((row) => matchesAnchor(row, selectedMarket, ["companyName", "ticker", "country", "form"])).slice(0, 6),
      lobbying: (e.lobbying || []).filter((row) => matchesAnchor(row, selectedMarket, ["registrant", "client", "issue", "description"])).slice(0, 6),
      contracts: (e.govContracts || []).filter((row) => matchesAnchor(row, selectedMarket, ["title", "agency", "description"])).slice(0, 6),
      insider: (e.insiderTrades || []).filter((row) => matchesAnchor(row, selectedMarket, ["ticker", "issuer", "insiderName"])).slice(0, 6),
    };
  }, [selectedMarket, snapshot]);

  if (!selectedMarket) return null;

  const market = selectedMarket;
  const days = daysUntil(market.endDate);
  const isWatched = watchedSet?.has(market.id);
  const sourceTone = market.source === "polymarket" ? "cyan" : "amber";
  const sourceBadge = market.source === "polymarket" ? "PM" : market.source === "kalshi" ? "KX" : market.source;

  const onAlert = async () => {
    if (alertSaving) return;
    setAlertSaving(true);
    try {
      await createAlert?.({
        entity_id: market.id,
        entity_type: "predictionMarket",
        entity_label: String(market.question || "").slice(0, 200),
        trigger_type: "market",
      });
    } catch {
      // surfaced via context; swallow here so the drawer stays usable.
    } finally {
      setAlertSaving(false);
    }
  };

  const description = market.description || "";
  const descTrim = expanded ? description : description.slice(0, 260);

  return (
    <div
      role="dialog"
      aria-label="Market focus"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(480px, 96vw)",
        zIndex: 80,
        background: "rgba(8,12,17,0.97)",
        borderLeft: "1px solid rgba(125,139,156,0.18)",
        boxShadow: "-10px 0 30px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        backdropFilter: "blur(10px)",
        color: "var(--np-terminal-text)",
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid rgba(125,139,156,0.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={terminalTagStyle({ tone: sourceTone, compact: true })}>{sourceBadge}</span>
            {market.anchor ? <span style={terminalTagStyle({ tone: "amber", compact: true })}>{market.anchor.anchorLabel}</span> : <span style={terminalTagStyle({ tone: "default", compact: true })}>Global signal</span>}
            {days != null ? <span style={terminalTagStyle({ tone: days < 14 ? "warning" : "default", compact: true })}>{days}d to resolve</span> : null}
          </div>
          <button
            type="button"
            onClick={closeMarket}
            aria-label="Close drawer"
            className="np-terminal-button"
            style={{ ...terminalButtonStyle(false, { compact: true }), minWidth: 28, padding: "4px 8px" }}
          >
            ×
          </button>
        </div>
        <div title={market.question} style={{ marginTop: 10, fontSize: 15, fontWeight: 700, lineHeight: 1.35, color: "var(--np-terminal-text)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {market.question}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(125,139,156,0.08)" }}>
          <div style={terminalLabelStyle("amber")}>Yes price history</div>
          <div style={{ height: 180, marginTop: 10 }}>
            {chartData.length === 0 ? (
              <div style={{ height: "100%", display: "grid", placeItems: "center", fontSize: 11.5, ...terminalMutedStyle() }}>
                Chart unavailable — open on Polymarket
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 32, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mfd-gold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d8a04a" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#d8a04a" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="tLabel" tick={{ fontSize: 10, fill: "rgba(237,241,245,0.55)" }} axisLine={false} tickLine={false} minTickGap={28} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "rgba(237,241,245,0.55)" }} axisLine={false} tickLine={false} width={28} tickFormatter={(v) => `${Math.round(v * 100)}`} />
                  <Tooltip
                    contentStyle={{ background: "rgba(10,14,19,0.95)", border: "1px solid rgba(125,139,156,0.18)", borderRadius: 2, fontSize: 11 }}
                    formatter={(v) => [`${Math.round(v * 100)}%`, "Yes"]}
                  />
                  <Area type="monotone" dataKey="p" stroke="#d8a04a" strokeWidth={1.6} fill="url(#mfd-gold)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", borderBottom: "1px solid rgba(125,139,156,0.08)" }}>
          {[
            { label: "Volume", value: fmtVolume(market.volume) },
            { label: "Yes", value: fmtPct(market.yesPrice), tone: "positive" },
            { label: "No", value: fmtPct(market.noPrice), tone: "danger" },
            { label: "Days", value: days != null ? `${days}d` : "—" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "12px 14px", borderRight: "1px solid rgba(125,139,156,0.08)" }}>
              <div style={terminalLabelStyle()}>{s.label}</div>
              <div style={{ ...terminalValueStyle({ tone: s.tone || "default", size: 14 }), marginTop: 4, fontFamily: "'DM Mono',monospace" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {description ? (
          <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(125,139,156,0.08)" }}>
            <div style={terminalLabelStyle("cyan")}>Resolution criteria</div>
            <div style={{ fontSize: 12, lineHeight: 1.55, marginTop: 6, color: "rgba(237,241,245,0.85)" }}>
              {descTrim}{!expanded && description.length > 260 ? "…" : ""}
            </div>
            {description.length > 260 ? (
              <button type="button" onClick={() => setExpanded((v) => !v)} className="np-terminal-button" style={{ ...terminalButtonStyle(false, { compact: true }), marginTop: 8 }}>
                {expanded ? "Show less" : "Read more"}
              </button>
            ) : null}
          </div>
        ) : null}

        <div style={{ padding: "14px 18px" }}>
          <div className="np-terminal-tab-row" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="np-terminal-button"
                style={terminalButtonStyle(tab === t.id, { compact: true })}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 10, display: "grid" }}>
            {linked[tab].length === 0 ? (
              <div style={{ padding: "12px 0", fontSize: 11.5, ...terminalMutedStyle() }}>No linked {tab} found.</div>
            ) : linked[tab].map((row, i) => (
              <div key={row.id || i} className="np-terminal-row" style={{ ...terminalDataRowStyle(), padding: "8px 0" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--np-terminal-text)" }}>
                  {row.title || row.companyName || row.registrant || row.issuer || row.ticker || row.agency || "—"}
                </div>
                <div style={{ fontSize: 10.5, marginTop: 2, ...terminalMutedStyle() }}>
                  {row.sourceName || row.form || row.client || row.country || row.insiderName || ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid rgba(125,139,156,0.12)" }}>
        <button
          type="button"
          onClick={() => toggleWatch(market.id)}
          className="np-terminal-button"
          aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
          style={terminalButtonStyle(Boolean(isWatched), { compact: true })}
        >
          {isWatched ? "★ Watching" : "☆ Watch"}
        </button>
        <button
          type="button"
          onClick={onAlert}
          disabled={alertSaving}
          className="np-terminal-button"
          style={terminalButtonStyle(false, { compact: true })}
        >
          {alertSaving ? "Saving…" : "Set alert"}
        </button>
        {market.url ? (
          <a
            href={market.url}
            target="_blank"
            rel="noopener noreferrer"
            className="np-terminal-button"
            style={{ ...terminalButtonStyle(true, { compact: true, tone: market.source === "polymarket" ? "cyan" : "amber" }), marginLeft: "auto", textDecoration: "none" }}
          >
            Trade →
          </a>
        ) : null}
      </div>
    </div>
  );
}
