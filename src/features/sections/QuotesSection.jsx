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
    <section style={{ padding: "var(--np-section-y) var(--np-section-x)", textAlign: "center", background: "var(--np-bg)" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ width: 40, height: 1, background: "rgba(212,165,74,0.5)", margin: "0 auto 48px" }} />
        <div style={{ minHeight: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <p style={{
            fontFamily: "'Playfair Display',serif", fontSize: "clamp(20px,3vw,36px)", fontWeight: 400,
            lineHeight: 1.45, letterSpacing: "-0.015em", color: "var(--np-text)",
            opacity: quoteFading ? 0 : 1, transition: "opacity 0.4s ease",
            margin: 0,
          }}>
            "{QUOTES[quoteIndex].text}"
          </p>
          <p style={{
            marginTop: 28, fontSize: 12, fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em",
            color: "#d4a54a", fontWeight: 600, textTransform: "uppercase",
            opacity: quoteFading ? 0 : 1, transition: "opacity 0.4s ease",
          }}>
            — {QUOTES[quoteIndex].attr}
          </p>
        </div>
        {/* Dot indicators */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 40 }}>
          {QUOTES.map((_, i) => (
            <button key={i} onClick={() => { setQuoteFading(true); setTimeout(() => { setQuoteIndex(i); setQuoteFading(false); }, 400); }} style={{
              width: i === quoteIndex ? 24 : 8, height: 8,
              borderRadius: 4, border: "none", cursor: "pointer", padding: 0,
              background: i === quoteIndex ? "#d4a54a" : "var(--np-border-strong)",
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>
        <div style={{ width: 40, height: 1, background: "rgba(212,165,74,0.5)", margin: "48px auto 0" }} />
      </div>
    </section>
  );
}

export { QUOTES };
