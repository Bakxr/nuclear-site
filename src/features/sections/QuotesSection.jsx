// ─── ROTATING QUOTES ──────────────────────────────────────────────────
const QUOTES = [
  {
    text: "Nuclear energy produces zero carbon during operation, achieves a 92.5% capacity factor, and runs 24/7 — making it humanity's most reliable clean baseload power.",
    attr: "World Nuclear Association",
  },
  {
    text: "Nuclear power is the only large-scale, reliable, weather-independent electricity source that produces minimal carbon emissions. We need it.",
    attr: "James Hansen, NASA Climate Scientist",
  },
  {
    text: "To address climate change we will need safe and reliable low-carbon energy sources. Nuclear power, it turns out, is far safer than most forms of energy.",
    attr: "Steven Pinker, Harvard University",
  },
];

export default function QuotesSection({ quoteIndex, quoteFading, setQuoteIndex, setQuoteFading }) {
  return (
    <section style={{ padding: "var(--np-section-y-tight) var(--np-section-x)", textAlign: "center", background: "var(--np-bg)" }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <div style={{ width: 44, height: 1, background: "rgba(212,165,74,0.55)", margin: "0 auto 44px" }} />
        <div style={{ minHeight: 190, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <p style={{
            fontFamily: "var(--np-font-display)",
            fontSize: "clamp(22px, 2.6vw, 40px)",
            fontWeight: 380,
            fontStyle: "italic",
            lineHeight: 1.42,
            letterSpacing: "-0.015em",
            color: "var(--np-text)",
            opacity: quoteFading ? 0 : 1,
            transition: "opacity 0.4s ease",
            margin: 0,
            textWrap: "balance",
          }}>
            “{QUOTES[quoteIndex].text}”
          </p>
          <p style={{
            marginTop: 28, fontSize: 11.5, fontFamily: "var(--np-font-mono)", letterSpacing: "0.1em",
            color: "var(--np-accent-ink)", fontWeight: 500, textTransform: "uppercase",
            opacity: quoteFading ? 0 : 1, transition: "opacity 0.4s ease",
          }}>
            — {QUOTES[quoteIndex].attr}
          </p>
        </div>

        {/* Numbered indicators */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 36 }}>
          {QUOTES.map((q, i) => (
            <button
              key={i}
              aria-label={`Show quote ${i + 1} of ${QUOTES.length}`}
              onClick={() => { setQuoteFading(true); setTimeout(() => { setQuoteIndex(i); setQuoteFading(false); }, 400); }}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "4px 0",
                fontFamily: "var(--np-font-mono)", fontSize: 11, letterSpacing: "0.08em",
                color: i === quoteIndex ? "var(--np-text)" : "var(--np-text-faint)",
                borderBottom: i === quoteIndex ? "1px solid var(--np-accent)" : "1px solid transparent",
                transition: "color 0.25s ease, border-color 0.25s ease",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
        <div style={{ width: 44, height: 1, background: "rgba(212,165,74,0.55)", margin: "44px auto 0" }} />
      </div>
    </section>
  );
}

export { QUOTES };
