import { useEffect, useState } from "react";
import { fetchPredictionTeaser } from "../services/predictionsAPI.js";

function TerminalMetric({ card }) {
  return (
    <div style={{
      borderRadius: 14,
      border: "1px solid rgba(212,165,74,0.14)",
      background: "rgba(20,18,14,0.58)",
      padding: "14px 16px",
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(212,165,74,0.76)", fontWeight: 700, marginBottom: 6 }}>
        {card.label}
      </div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, color: "#f5f0e8", marginBottom: 6 }}>
        {card.value}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.55, color: "rgba(245,240,232,0.6)" }}>
        {card.detail}
      </div>
    </div>
  );
}

function TerminalMiniList({ title, accent = "#d4a54a", items, renderMeta }) {
  return (
    <div style={{
      borderRadius: 16,
      border: "1px solid rgba(212,165,74,0.12)",
      background: "rgba(255,255,255,0.02)",
      padding: 16,
    }}>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.12em", color: accent, fontWeight: 700, marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => (
          <a
            key={item.id}
            href={item.url || "#"}
            target={item.url ? "_blank" : undefined}
            rel={item.url ? "noopener noreferrer" : undefined}
            style={{
              textDecoration: "none",
              color: "inherit",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.03)",
              padding: "12px 13px",
              display: "grid",
              gap: 5,
              pointerEvents: item.url ? "auto" : "none",
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.45, color: "#f5f0e8" }}>
              {item.title || item.name || item.form}
            </div>
            <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "rgba(245,240,232,0.56)" }}>
              {renderMeta(item)}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function formatOdds(yesPrice) {
  return `${Math.round(yesPrice * 100)}%`;
}

function formatVolume(volume) {
  if (!Number.isFinite(volume) || volume <= 0) return null;
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}m`;
  if (volume >= 1_000) return `$${Math.round(volume / 1_000)}k`;
  return `$${Math.round(volume)}`;
}

function formatEndDate(endDate) {
  if (!endDate) return null;
  const date = new Date(endDate);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function PredictionOddsBoard({ markets, onOpenTerminal }) {
  if (!markets.length) return null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.16em", color: "#d4a54a", fontWeight: 700 }}>
            Market odds
          </span>
          <span style={{ fontFamily: "var(--np-font-mono)", fontSize: 10, color: "rgba(245,240,232,0.4)", letterSpacing: "0.05em" }}>
            Polymarket · Kalshi
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenTerminal}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontFamily: "var(--np-font-mono)", fontSize: 11, letterSpacing: "0.05em",
            color: "rgba(212,165,74,0.85)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#d4a54a"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(212,165,74,0.85)"; }}
        >
          Full board in the terminal →
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
        {markets.map((market) => {
          const meta = [
            market.source === "kalshi" ? "Kalshi" : "Polymarket",
            formatVolume(market.volume),
            formatEndDate(market.endDate) ? `ends ${formatEndDate(market.endDate)}` : null,
          ].filter(Boolean).join(" · ");
          return (
            <div
              key={market.id}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(212,165,74,0.16)",
                background: "rgba(20,18,14,0.58)",
                padding: "14px 16px",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 12,
                alignItems: "center",
                minWidth: 0,
              }}
            >
              <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, color: "#f5f0e8",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {market.question}
                </div>
                <div style={{ fontFamily: "var(--np-font-mono)", fontSize: 10, color: "rgba(245,240,232,0.42)", letterSpacing: "0.04em" }}>
                  {meta}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--np-font-display)", fontSize: 28, fontWeight: 450, lineHeight: 1, color: "#d4a54a" }}>
                  {formatOdds(market.yesPrice)}
                </div>
                <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(245,240,232,0.4)", marginTop: 4 }}>
                  Yes
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TerminalEditorialStrip({ signals, onOpenTerminal }) {
  const [predictionMarkets, setPredictionMarkets] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchPredictionTeaser().then((markets) => {
      if (!cancelled) setPredictionMarkets(markets.slice(0, 4));
    });
    return () => { cancelled = true; };
  }, []);

  if (!signals) return null;

  const summaryCards = signals.cards.slice(0, 4);
  const catalysts = signals.topCatalysts.slice(0, 2);
  const buildout = signals.buildoutLeaders.slice(0, 2);
  const filings = signals.filingRadar.slice(0, 2);
  const radarTitle = signals.radarTitle || "Filing radar";

  return (
    <section style={{
      background: "var(--np-dark-bg)",
      padding: "40px var(--np-section-x) 56px",
      display: "flex",
      justifyContent: "center",
    }}>
      <div style={{
        width: "min(100%, var(--np-content-max))",
        margin: 0,
        borderRadius: 18,
        border: "1px solid rgba(212,165,74,0.18)",
        background: "#13100c",
        color: "#f5f0e8",
        padding: "clamp(24px, 3vw, 36px) clamp(18px, 2.6vw, 36px)",
        display: "grid",
        gap: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 18, flexWrap: "wrap", paddingBottom: 18, borderBottom: "1px solid rgba(245,240,232,0.1)" }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--np-font-mono)", fontSize: 11, color: "rgba(212,165,74,0.9)", letterSpacing: "0.06em" }}>PRO</span>
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(245,240,232,0.55)", fontWeight: 700 }}>
                From the Terminal
              </span>
            </div>
            <h3 style={{ margin: 0, fontFamily: "var(--np-font-display)", fontWeight: 400, letterSpacing: "-0.02em", fontSize: "clamp(26px,3.6vw,40px)", lineHeight: 1.04 }}>
              A tighter read on the <em style={{ fontStyle: "italic", fontWeight: 350, color: "#d4a54a" }}>nuclear tape.</em>
            </h3>
            <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.7, color: "rgba(245,240,232,0.6)", maxWidth: "58ch" }}>
              Live catalysts, project movement, filings, and fleet signals. The full terminal is where the dense view lives.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenTerminal}
            className="np-btn np-btn--light"
          >
            Open terminal <span className="np-btn-arrow" aria-hidden="true">→</span>
          </button>
        </div>

        <PredictionOddsBoard markets={predictionMarkets} onOpenTerminal={onOpenTerminal} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          {summaryCards.map((card) => (
            <TerminalMetric key={card.id} card={card} />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          <TerminalMiniList
            title="Catalyst wire"
            items={catalysts}
            renderMeta={(item) => `${item.tag} | ${item.dateLabel}`}
          />
          <TerminalMiniList
            title="Buildout watch"
            items={buildout}
            renderMeta={(item) => `${item.country} | ${item.status}${item.targetYear ? ` | ${item.targetYear}` : ""}`}
          />
          <TerminalMiniList
            title={radarTitle}
            accent="#7dd3fc"
            items={filings}
            renderMeta={(item) => item.metaLine || `${item.ticker || item.sourceName || "Signal"} | ${item.filedLabel || item.dateLabel || ""}`}
          />
        </div>
      </div>
    </section>
  );
}
