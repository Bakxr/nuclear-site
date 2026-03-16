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

export default function TerminalEditorialStrip({ signals, onOpenTerminal }) {
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
        width: "min(100%, 1240px)",
        margin: 0,
        borderRadius: 28,
        border: "1px solid rgba(212,165,74,0.14)",
        background: "#14110d",
        color: "#f5f0e8",
        padding: "24px clamp(18px, 2.4vw, 30px)",
        display: "grid",
        gap: 18,
        boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 18, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "#d4a54a", fontWeight: 700, marginBottom: 8 }}>
              From The Terminal
            </div>
            <h3 style={{ margin: 0, fontFamily: "'Playfair Display',serif", fontSize: "clamp(24px,3.4vw,34px)", lineHeight: 1.06 }}>
              A tighter read on the <em style={{ color: "#d4a54a" }}>nuclear tape.</em>
            </h3>
            <p style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.7, color: "rgba(245,240,232,0.64)" }}>
              Live catalysts, project movement, filings, and fleet signals. The full terminal is where the dense view lives.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenTerminal}
            className="np-data-chip"
            style={{ background: "#f5f0e8", color: "#14120e", border: "1px solid rgba(212,165,74,0.35)", whiteSpace: "nowrap" }}
          >
            Open terminal
          </button>
        </div>

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
