import { color, fontMono, fontSans, radius } from "./components/tokens.js";

export default function TerminalGateState({ title, message, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: color.bg,
        color: color.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: fontSans,
      }}
    >
      <div
        style={{
          width: "min(92vw, 520px)",
          borderRadius: radius.md,
          border: `1px solid ${color.border}`,
          background: color.panel,
          padding: "22px 22px 20px",
          boxShadow: "none",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: color.accent,
            fontWeight: 600,
            marginBottom: 12,
            fontFamily: fontMono,
          }}
        >
          Nuclear Terminal
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 22, lineHeight: 1.2, marginBottom: 10, fontWeight: 600 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: color.textMuted }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
          {actionLabel ? (
            <button
              type="button"
              onClick={onAction}
              style={{
                borderRadius: radius.md,
                border: `1px solid ${color.accent}`,
                background: "rgba(216,160,74,0.14)",
                color: color.accent,
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: fontMono,
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
                borderRadius: radius.md,
                border: `1px solid ${color.border}`,
                background: "transparent",
                color: color.text,
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: fontMono,
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
