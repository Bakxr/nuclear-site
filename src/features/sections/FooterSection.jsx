export default function FooterSection() {
  return (
    <footer style={{ background: "var(--np-dark-bg)", color: "var(--np-dark-text-muted)", padding: "var(--np-section-y-footer) var(--np-section-x)", fontSize: 12, borderTop: "1px solid rgba(212,165,74,0.1)" }}>
      <div className="np-footer-inner" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#f5f0e8", fontWeight: 700 }}>⚛ Nuclear<em style={{ fontWeight: 400, color: "#d4a54a" }}> Pulse</em></span>
          <div style={{ marginTop: 8, lineHeight: 1.5 }}>Live nuclear intelligence for the next industrial century.</div>
        </div>
        <div style={{ textAlign: "right", lineHeight: 1.6 }}>
          <div>Data sourced from IAEA PRIS, World Nuclear Association, and public markets.</div>
          <div style={{ marginTop: 4 }}>© 2026 NuclearPulse · For informational purposes only.</div>
        </div>
      </div>
    </footer>
  );
}
