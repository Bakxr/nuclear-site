export default function TerminalEditorialStrip({ signals, onOpenTerminal }) {
  if (!signals) return null;

  return (
    <section style={{ padding: "12px var(--np-section-x) 28px", background: "linear-gradient(180deg, rgba(212,165,74,0.08) 0%, rgba(212,165,74,0.03) 38%, transparent 100%)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "#d4a54a", fontWeight: 700, marginBottom: 8 }}>Terminal snapshot</div>
            <h3 style={{ margin: 0, fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,4vw,38px)", lineHeight: 1.05 }}>
              Live signals from the <em style={{ color: "#d4a54a" }}>Nuclear Terminal</em>
            </h3>
          </div>
          <button type="button" onClick={onOpenTerminal} className="np-data-chip" style={{ background: "#14120e", color: "#f5f0e8", border: "1px solid rgba(212,165,74,0.35)" }}>
            Open terminal
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
          {signals.cards.map((card) => (
            <div key={card.id} style={{ borderRadius: 16, border: "1px solid rgba(212,165,74,0.16)", background: "rgba(20,18,14,0.88)", color: "#f5f0e8", padding: "16px 18px" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(212,165,74,0.78)", fontWeight: 700, marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 26, marginBottom: 8 }}>{card.value}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "rgba(245,240,232,0.62)" }}>{card.detail}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
          <div style={{ borderRadius: 18, border: "1px solid var(--np-border)", background: "var(--np-surface)", padding: 18 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4a54a", fontWeight: 700, marginBottom: 8 }}>Top catalysts</div>
            <div style={{ display: "grid", gap: 12 }}>
              {signals.topCatalysts.map((item) => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", borderRadius: 14, border: "1px solid var(--np-border)", padding: "12px 14px", display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#d4a54a", fontWeight: 700 }}>{item.tag}</span>
                    <span style={{ fontSize: 10.5, color: "var(--np-text-faint)" }}>{item.dateLabel}</span>
                  </div>
                  <div style={{ fontWeight: 700, lineHeight: 1.45 }}>{item.title}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--np-text-muted)" }}>{item.whyItMatters || item.curiosityHook}</div>
                </a>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 18, border: "1px solid var(--np-border)", background: "var(--np-surface)", padding: 18 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4a54a", fontWeight: 700, marginBottom: 8 }}>Buildout leaders</div>
            <div style={{ display: "grid", gap: 12 }}>
              {signals.buildoutLeaders.map((project) => (
                <div key={project.id} style={{ borderRadius: 14, border: "1px solid var(--np-border)", padding: "12px 14px", display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 700 }}>{project.name}</div>
                    <span style={{ fontSize: 10.5, color: "#d4a54a", textTransform: "uppercase", letterSpacing: "0.08em" }}>{project.status}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--np-text-muted)" }}>{project.country} | {project.type} | {project.capacityMw} MW{project.targetYear ? ` | ${project.targetYear}` : ""}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--np-text-muted)" }}>{project.summary}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 18, border: "1px solid var(--np-border)", background: "var(--np-surface)", padding: 18 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4a54a", fontWeight: 700, marginBottom: 8 }}>Filing radar</div>
            <div style={{ display: "grid", gap: 12 }}>
              {signals.filingRadar.map((filing) => (
                <a key={filing.id} href={filing.url || "#"} target={filing.url ? "_blank" : undefined} rel={filing.url ? "noopener noreferrer" : undefined} style={{ textDecoration: "none", color: "inherit", borderRadius: 14, border: "1px solid var(--np-border)", padding: "12px 14px", display: "grid", gap: 6, pointerEvents: filing.url ? "auto" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 10.5, color: "#7dd3fc", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{filing.ticker}</span>
                    <span style={{ fontSize: 10.5, color: "var(--np-text-faint)" }}>{filing.filedLabel}</span>
                  </div>
                  <div style={{ fontWeight: 700, lineHeight: 1.45 }}>{filing.form}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--np-text-muted)" }}>{filing.companyName} | {filing.summary}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
