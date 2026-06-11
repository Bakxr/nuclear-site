export default function FooterSection() {
  const year = new Date().getFullYear();
  return (
    <footer style={{
      background: "var(--np-dark-bg)",
      color: "rgba(245,240,232,0.55)",
      padding: "clamp(64px, 9vw, 120px) var(--np-section-x) 36px",
      borderTop: "1px solid rgba(212,165,74,0.12)",
      overflow: "hidden",
    }}>
      <div style={{ maxWidth: "var(--np-content-max)", margin: "0 auto" }}>
        {/* Oversized wordmark */}
        <button
          type="button"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "block", textAlign: "left" }}
        >
          <h2 className="np-footer-wordmark">
            Nuclear<em>Pulse</em>
          </h2>
        </button>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "28px 48px",
          flexWrap: "wrap",
          marginTop: "clamp(36px, 5vw, 64px)",
          paddingTop: 28,
          borderTop: "1px solid rgba(245,240,232,0.12)",
        }}>
          <div style={{ maxWidth: 360, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,165,74,0.8)" }}>
              The Buildout Briefing
            </div>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7 }}>
              Live nuclear intelligence for the next industrial century — reactors, uranium,
              markets, and the politics of firm power.
            </p>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,240,232,0.35)" }}>
              Sources
            </div>
            <a className="np-footer-link" href="https://pris.iaea.org/" target="_blank" rel="noopener noreferrer">IAEA PRIS</a>
            <a className="np-footer-link" href="https://world-nuclear.org/" target="_blank" rel="noopener noreferrer">World Nuclear Association</a>
            <a className="np-footer-link" href="https://www.eia.gov/" target="_blank" rel="noopener noreferrer">US EIA</a>
          </div>

          <div style={{ display: "grid", gap: 8, textAlign: "left" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,240,232,0.35)" }}>
              Colophon
            </div>
            <span style={{ fontSize: 13 }}>Set in Fraunces &amp; DM Sans</span>
            <span style={{ fontSize: 13 }}>Data refreshed continuously</span>
          </div>
        </div>

        <div className="np-footer-inner" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginTop: 40,
          paddingTop: 20,
          borderTop: "1px solid rgba(245,240,232,0.08)",
          fontSize: 11.5,
          color: "rgba(245,240,232,0.35)",
        }}>
          <div>© {year} NuclearPulse · For informational purposes only.</div>
          <div style={{ fontFamily: "var(--np-font-mono)", letterSpacing: "0.06em" }}>
            Data sourced from IAEA PRIS, WNA, and public markets.
          </div>
        </div>
      </div>
    </footer>
  );
}
