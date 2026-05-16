import { useMemo, useState } from "react";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import MarketSparkline from "./MarketSparkline.jsx";
import { MARKET_CATEGORY_OPTIONS } from "../marketCategory.js";
import {
  terminalButtonStyle,
  terminalLinkStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTagStyle,
} from "./styles.js";

function fmtPct(n) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function fmtDelta(n) {
  if (!Number.isFinite(n) || n === 0) return null;
  const pp = Math.round(n * 100);
  if (pp === 0) return null;
  return `${pp > 0 ? "+" : ""}${pp}pp`;
}

function deltaColor(n) {
  if (!Number.isFinite(n) || n === 0) return "var(--np-terminal-subtle)";
  return n > 0 ? "var(--np-terminal-success, #4caf72)" : "var(--np-terminal-danger, #e25960)";
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
  return Math.max(0, Math.round((t - Date.now()) / 86_400_000));
}

export default function PredictionMarketsPanel() {
  const { predictionMarketRows, openMarket } = useTerminal();
  const [activeCategory, setActiveCategory] = useState("all");

  const visibleCategories = useMemo(() => {
    const present = new Set(predictionMarketRows.map((r) => r.category?.id).filter(Boolean));
    return MARKET_CATEGORY_OPTIONS.filter((opt) => opt.id === "all" || present.has(opt.id));
  }, [predictionMarketRows]);

  const filteredRows = useMemo(() => {
    if (activeCategory === "all") return predictionMarketRows;
    return predictionMarketRows.filter((row) => row.category?.id === activeCategory);
  }, [predictionMarketRows, activeCategory]);

  return (
    <TerminalPanel
      panelId="terminal-panel-prediction"
      title="Prediction markets"
      subtitle="Polymarket + Kalshi. Click a row for the full chart and linked intel."
      actions={[
        <span key="count" style={terminalTagStyle({ tone: "amber", compact: true })}>
          {filteredRows.length} / {predictionMarketRows.length}
        </span>,
      ]}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", padding: "0 10px" }}>
          {visibleCategories.map((opt) => {
            const active = activeCategory === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setActiveCategory(opt.id)}
                className="np-terminal-button"
                style={terminalButtonStyle(active, { compact: true, tone: opt.tone || "default" })}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(460), padding: "0 10px", display: "grid", gap: 6 }}>
          {filteredRows.length === 0 ? (
            <div style={{ padding: "16px 0", fontSize: 11.5, ...terminalMutedStyle() }}>
              {predictionMarketRows.length === 0
                ? "No active markets matching nuclear keywords."
                : "No markets in this category — pick another."}
            </div>
          ) : null}
          {filteredRows.map((row) => {
            const cat = row.category;
            const delta = row.delta24h;
            const deltaLabel = fmtDelta(delta);
            const yes = Number.isFinite(row.yesPrice) ? row.yesPrice : null;
            const days = daysUntil(row.endDate);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => openMarket(row)}
                className="np-terminal-button"
                style={{
                  display: "grid",
                  gap: 8,
                  textAlign: "left",
                  background: "rgba(255,255,255,0.015)",
                  border: "1px solid rgba(125,139,156,0.10)",
                  borderRadius: 6,
                  padding: "10px 12px",
                  cursor: "pointer",
                  color: "var(--np-terminal-text)",
                }}
              >
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={terminalTagStyle({ tone: row.source === "polymarket" ? "cyan" : "amber", compact: true })}>
                    {row.source === "polymarket" ? "PM" : row.source === "kalshi" ? "KX" : row.source}
                  </span>
                  {cat ? <span style={terminalTagStyle({ tone: cat.tone || "default", compact: true })}>{cat.label}</span> : null}
                  {row.anchor ? (
                    <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--np-terminal-amber)" }}>
                      ◉ {row.anchor.anchorLabel}
                    </span>
                  ) : null}
                  {row.url ? (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="np-terminal-link"
                      style={{ ...terminalLinkStyle("cyan"), marginLeft: "auto", fontSize: 10 }}
                    >
                      ↗
                    </a>
                  ) : null}
                </div>

                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: "var(--np-terminal-text)" }}>
                  {row.question}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
                  <MarketSparkline history={row.history} width={120} height={26} fill />
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", fontFamily: "'DM Mono',monospace" }}>
                    {deltaLabel ? (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: deltaColor(delta) }}>{deltaLabel}</span>
                    ) : null}
                    <span style={{ fontSize: 15, fontWeight: 700, color: yes != null && yes >= 0.5 ? "var(--np-terminal-success, #4caf72)" : "var(--np-terminal-text)" }}>
                      {fmtPct(yes)}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10, fontFamily: "'DM Mono',monospace", ...terminalMutedStyle() }}>
                  <span>VOL {fmtVolume(row.volume)}</span>
                  <span>{days != null ? `${days}d to resolve` : "—"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </TerminalPanel>
  );
}
