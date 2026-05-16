import { useMemo, useState } from "react";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import MarketSparkline from "./MarketSparkline.jsx";
import { MARKET_CATEGORY_OPTIONS } from "../marketCategory.js";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLinkStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTableHeaderStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";

function fmtPct(n) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function fmtDelta(n) {
  if (!Number.isFinite(n)) return "—";
  const pp = Math.round(n * 100);
  if (pp === 0) return "0";
  return `${pp > 0 ? "+" : ""}${pp}`;
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

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const GRID = "60px minmax(0,1fr) 80px 80px 56px 64px 60px 44px";

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
      subtitle="Polymarket + Kalshi, categorized and price-tracked. Click a row to open the full chart and linked intel."
      actions={[
        <span key="count" style={terminalTagStyle({ tone: "amber", compact: true })}>
          {filteredRows.length} / {predictionMarketRows.length}
        </span>,
      ]}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 10px 4px" }}>
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

        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "0 10px 6px", borderBottom: "1px solid rgba(51,66,86,0.92)" }}>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Source</div>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Question</div>
          <div style={terminalTableHeaderStyle("left", "cyan")}>Category</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>7d</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Δ24h</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Yes</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Vol</div>
          <div style={terminalTableHeaderStyle("right", "cyan")}>Open</div>
        </div>
        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(420), padding: "0 10px" }}>
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
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => openMarket(row)}
                className="np-terminal-row np-terminal-row--interactive np-terminal-button"
                style={{
                  ...terminalDataRowStyle(),
                  display: "grid",
                  gridTemplateColumns: GRID,
                  gap: 8,
                  alignItems: "center",
                  textAlign: "left",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--np-terminal-text)",
                }}
              >
                <span style={terminalTagStyle({ tone: row.source === "polymarket" ? "cyan" : "amber", compact: true })}>{row.source}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--np-terminal-text)", lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {row.question}
                  </div>
                  {row.anchor ? (
                    <div style={{ fontSize: 10, marginTop: 2, color: "var(--np-terminal-amber)", fontFamily: "'DM Mono',monospace" }}>
                      ◉ {row.anchor.anchorLabel}
                    </div>
                  ) : null}
                </div>
                <div>
                  {cat ? <span style={terminalTagStyle({ tone: cat.tone || "default", compact: true })}>{cat.label}</span> : null}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <MarketSparkline history={row.history} width={72} height={22} fill />
                </div>
                <div style={{ textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: deltaColor(delta) }}>
                  {fmtDelta(delta)}
                </div>
                <div style={{ ...terminalValueStyle({ tone: (row.yesPrice ?? 0) >= 0.5 ? "positive" : "default", size: 12 }), textAlign: "right" }}>{fmtPct(row.yesPrice)}</div>
                <div style={{ fontSize: 10.5, textAlign: "right", fontFamily: "'DM Mono',monospace", ...terminalMutedStyle() }}>{fmtVolume(row.volume)}</div>
                {row.url ? (
                  <a href={row.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="np-terminal-link" style={{ ...terminalLinkStyle("cyan"), textAlign: "right" }}>↗</a>
                ) : <span />}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "6px 10px 0", fontSize: 10.5, ...terminalMutedStyle(), display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span>Δ24h = price change in pp (Polymarket history). Sparkline shows the full series.</span>
          <span>Close dates in the focus drawer.</span>
        </div>
      </div>
    </TerminalPanel>
  );
}
