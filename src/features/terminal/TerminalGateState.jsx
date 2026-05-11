export default function TerminalGateState({ title, message, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #080b11 0%, #0a1018 100%)", color: "#f5f0e8", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "min(92vw, 560px)", borderRadius: 24, border: "1px solid rgba(212,165,74,0.16)", background: "rgba(10,12,17,0.94)", padding: "30px 24px", boxShadow: "0 28px 90px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#d4a54a", fontWeight: 700, marginBottom: 10 }}>
          Nuclear Terminal
        </div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 34, lineHeight: 1.05, marginBottom: 12 }}>
          {title}
        </div>
        <div style={{ fontSize: 14.5, lineHeight: 1.7, color: "rgba(245,240,232,0.66)" }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
          {actionLabel ? (
            <button
              type="button"
              onClick={onAction}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(212,165,74,0.35)",
                background: "#f5f0e8",
                color: "#14120e",
                padding: "12px 18px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {actionLabel}
            </button>
          ) : null}
          {secondaryLabel ? (
            <button
              type="button"
              onClick={onSecondary}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(245,240,232,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "#f5f0e8",
                padding: "12px 18px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
