import { useMemo } from "react";
import { useTerminal } from "../context.jsx";
import {
  selectHeroHeadlines,
  selectHeroMovers,
  selectHeroPredictionMarkets,
} from "../selectors.js";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalDataRowStyle,
  terminalLabelStyle,
  terminalMutedStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";

function truncate(text, max) {
  if (!text) return "";
  const str = String(text);
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function fmtPctSigned(n) {
  if (!Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function fmtYesPrice(n) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function fmtFreshness(value) {
  if (!value) return "--:--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function ColumnHeading({ label }) {
  return (
    <div style={{ padding: "0 12px 6px", borderBottom: "1px solid rgba(125,139,156,0.1)" }}>
      <div style={terminalLabelStyle("cyan")}>{label}</div>
    </div>
  );
}

function HeroRow({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="np-terminal-row np-terminal-row--interactive np-terminal-button"
      style={{
        ...terminalDataRowStyle(),
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) auto",
        gap: 10,
        alignItems: "center",
        textAlign: "left",
        background: "transparent",
        color: "var(--np-terminal-text)",
        cursor: "pointer",
        width: "100%",
        paddingInline: 12,
        borderLeft: "none",
        borderRight: "none",
        borderBottom: "none",
      }}
    >
      {children}
    </button>
  );
}

export default function HeroSignalStrip() {
  const { snapshot, selectEntity, openMarket } = useTerminal();

  const movers = useMemo(() => selectHeroMovers(snapshot), [snapshot]);
  const markets = useMemo(() => selectHeroPredictionMarkets(snapshot), [snapshot]);
  const headlines = useMemo(() => selectHeroHeadlines(snapshot), [snapshot]);

  const freshness = fmtFreshness(snapshot?.generatedAt);

  return (
    <TerminalPanel
      panelId="terminal-panel-hero-strip"
      title="Signal strip"
      subtitle="Top movers, prediction markets and headlines — the daily-check view."
      actions={[
        <span key="eyebrow" style={terminalTagStyle({ tone: "cyan", compact: true })}>
          SIGNAL STRIP
        </span>,
        <span key="snap" style={terminalTagStyle({ tone: "default", compact: true })}>
          Snapshot {freshness}
        </span>,
      ]}
      bodyStyle={{ padding: 0 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0,1fr))",
          minHeight: 140,
        }}
      >
        {/* Column 1 — Top Movers */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: "auto 1fr",
            borderRight: "1px solid rgba(125,139,156,0.1)",
            padding: "10px 0",
          }}
        >
          <ColumnHeading label="Top movers" />
          <div style={{ display: "grid" }}>
            {movers.length === 0 ? (
              <div style={{ padding: "12px", fontSize: 11.5, ...terminalMutedStyle() }}>
                No market moves available.
              </div>
            ) : null}
            {movers.map((stock) => {
              const positive = (stock.pct || 0) >= 0;
              return (
                <HeroRow key={stock.id || stock.ticker} onClick={() => selectEntity(stock.company || stock)}>
                  <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "var(--np-terminal-amber)" }}>
                      {stock.ticker}
                    </div>
                    <div style={{ fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...terminalMutedStyle() }}>
                      {truncate(stock.name, 42)}
                    </div>
                  </div>
                  <div style={{ ...terminalValueStyle({ tone: positive ? "positive" : "danger", size: 13 }), textAlign: "right", fontFamily: "'DM Mono',monospace" }}>
                    {positive ? "▲" : "▼"} {fmtPctSigned(stock.pct)}
                  </div>
                </HeroRow>
              );
            })}
          </div>
        </div>

        {/* Column 2 — Top Prediction Markets */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: "auto 1fr",
            borderRight: "1px solid rgba(125,139,156,0.1)",
            padding: "10px 0",
          }}
        >
          <ColumnHeading label="Markets pricing in" />
          <div style={{ display: "grid" }}>
            {markets.length === 0 ? (
              <div style={{ padding: "12px", fontSize: 11.5, ...terminalMutedStyle() }}>
                No active prediction markets.
              </div>
            ) : null}
            {markets.map((market) => {
              const sourceBadge = market.source === "polymarket" ? "pm" : market.source === "kalshi" ? "kx" : (market.source || "—");
              const tone = market.source === "polymarket" ? "cyan" : "amber";
              const handleClick = () => openMarket(market);
              return (
                <HeroRow key={market.id} onClick={handleClick}>
                  <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.35, color: "var(--np-terminal-text)" }}>
                      {truncate(market.question, 60)}
                    </div>
                    <span style={terminalTagStyle({ tone, compact: true })}>{sourceBadge}</span>
                  </div>
                  <div style={{ ...terminalValueStyle({ tone: (market.yesPrice ?? 0) >= 0.5 ? "positive" : "default", size: 15 }), textAlign: "right", fontFamily: "'DM Mono',monospace" }}>
                    {fmtYesPrice(market.yesPrice)}
                  </div>
                </HeroRow>
              );
            })}
          </div>
        </div>

        {/* Column 3 — Top Headlines */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: "auto 1fr",
            padding: "10px 0",
          }}
        >
          <ColumnHeading label="Top headlines" />
          <div style={{ display: "grid" }}>
            {headlines.length === 0 ? (
              <div style={{ padding: "12px", fontSize: 11.5, ...terminalMutedStyle() }}>
                No headlines available.
              </div>
            ) : null}
            {headlines.map((article) => (
              <HeroRow key={article.id} onClick={() => selectEntity(article)}>
                <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                  <span style={terminalTagStyle({ tone: article.isOfficial ? "success" : "amber", compact: true })}>
                    {article.tag}
                  </span>
                  <div style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.35, color: "var(--np-terminal-text)" }}>
                    {truncate(article.title, 70)}
                  </div>
                </div>
                <div style={{ fontSize: 10.5, textAlign: "right", fontFamily: "'DM Mono',monospace", ...terminalMutedStyle() }}>
                  {article.dateLabel || ""}
                </div>
              </HeroRow>
            ))}
          </div>
        </div>
      </div>
    </TerminalPanel>
  );
}
