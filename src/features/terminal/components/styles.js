const TERMINAL_TEXT = "var(--np-terminal-text)";
const TERMINAL_MUTED = "var(--np-terminal-muted)";

function resolveTone(tone = "default") {
  if (tone === "amber") {
    return {
      border: "rgba(255,159,28,0.38)",
      background: "rgba(255,159,28,0.12)",
      color: "var(--np-terminal-amber)",
    };
  }
  if (tone === "cyan") {
    return {
      border: "rgba(97,230,255,0.3)",
      background: "rgba(97,230,255,0.1)",
      color: "var(--np-terminal-cyan)",
    };
  }
  if (tone === "success") {
    return {
      border: "rgba(125,255,155,0.28)",
      background: "rgba(125,255,155,0.1)",
      color: "var(--np-terminal-green)",
    };
  }
  if (tone === "danger") {
    return {
      border: "rgba(255,107,107,0.28)",
      background: "rgba(255,107,107,0.1)",
      color: "var(--np-terminal-red)",
    };
  }
  return {
    border: "rgba(143,157,177,0.24)",
    background: "rgba(17,23,35,0.9)",
    color: TERMINAL_TEXT,
  };
}

export function terminalPanelStyle({ alt = false } = {}) {
  return {
    position: "relative",
    minWidth: 0,
    border: "1px solid var(--np-terminal-border)",
    borderRadius: 10,
    overflow: "hidden",
    background: alt
      ? "linear-gradient(180deg, rgba(17,23,35,0.98) 0%, rgba(11,15,20,0.95) 100%)"
      : "linear-gradient(180deg, rgba(11,15,20,0.98) 0%, rgba(8,12,18,0.96) 100%)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  };
}

export function terminalButtonStyle(active = false, { compact = false, tone = "default" } = {}) {
  const palette = resolveTone(tone);

  return {
    appearance: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${active ? "rgba(255,159,28,0.82)" : palette.border}`,
    background: active
      ? "linear-gradient(180deg, rgba(255,191,97,0.98) 0%, rgba(255,159,28,0.94) 100%)"
      : palette.background,
    color: active ? "#0a0e13" : palette.color,
    borderRadius: 6,
    padding: compact ? "6px 10px" : "8px 12px",
    fontSize: compact ? 11 : 11.5,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
    lineHeight: 1.1,
    boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.28)" : "none",
  };
}

export function terminalTagStyle({ tone = "default", compact = false } = {}) {
  const palette = resolveTone(tone);

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    borderRadius: 6,
    border: `1px solid ${palette.border}`,
    background: palette.background,
    padding: compact ? "5px 8px" : "7px 10px",
    fontSize: compact ? 10.5 : 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: palette.color,
    fontFamily: "'DM Sans',sans-serif",
    lineHeight: 1.1,
  };
}

export function terminalPillStyle(color = TERMINAL_TEXT) {
  const tone = color === "var(--np-terminal-cyan)"
    ? "cyan"
    : color === "var(--np-terminal-green)"
      ? "success"
      : color === "var(--np-terminal-red)"
        ? "danger"
        : color === "var(--np-terminal-amber)"
          ? "amber"
          : "default";

  return terminalTagStyle({ tone });
}

export function terminalMetricTileStyle({ accent = "var(--np-terminal-amber)" } = {}) {
  return {
    minWidth: 0,
    borderRadius: 8,
    border: "1px solid rgba(143,157,177,0.15)",
    background: "linear-gradient(180deg, rgba(17,23,35,0.95) 0%, rgba(10,14,20,0.96) 100%)",
    padding: "12px 12px 11px",
    boxShadow: `inset 3px 0 0 ${accent}, inset 0 1px 0 rgba(255,255,255,0.02)`,
  };
}

export function terminalDataRowStyle() {
  return {
    minWidth: 0,
    borderTop: "1px solid rgba(143,157,177,0.16)",
    padding: "12px 0",
  };
}

export function terminalScrollAreaStyle(maxHeight = 420) {
  return {
    display: "grid",
    gap: 0,
    maxHeight,
    overflowY: "auto",
    paddingRight: 4,
    minWidth: 0,
  };
}

export function terminalSelectStyle(disabled = false) {
  return {
    appearance: "none",
    width: "100%",
    minWidth: 0,
    borderRadius: 8,
    border: "1px solid var(--np-terminal-border)",
    background: disabled ? "rgba(17,23,35,0.58)" : "rgba(17,23,35,0.94)",
    color: disabled ? "rgba(143,157,177,0.56)" : TERMINAL_TEXT,
    padding: "10px 12px",
    fontFamily: "'DM Sans',sans-serif",
    fontSize: 12.5,
    fontWeight: 600,
    colorScheme: "dark",
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
  };
}

export function terminalInputShellStyle() {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    borderRadius: 8,
    border: "1px solid var(--np-terminal-border)",
    background: "linear-gradient(180deg, rgba(17,23,35,0.98) 0%, rgba(9,14,20,0.96) 100%)",
    padding: "10px 12px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  };
}

export function terminalInputStyle() {
  return {
    width: "100%",
    minWidth: 0,
    background: "none",
    border: "none",
    outline: "none",
    color: TERMINAL_TEXT,
    fontSize: 13,
    fontFamily: "'DM Sans',sans-serif",
  };
}

export function terminalLabelStyle(tone = "amber") {
  const palette = tone === "cyan"
    ? "var(--np-terminal-cyan)"
    : tone === "success"
      ? "var(--np-terminal-green)"
      : tone === "danger"
        ? "var(--np-terminal-red)"
        : "var(--np-terminal-amber)";

  return {
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: palette,
    fontWeight: 700,
    fontFamily: "'DM Mono',monospace",
  };
}

export function terminalMutedStyle() {
  return {
    color: TERMINAL_MUTED,
  };
}

export function terminalValueStyle({ tone = "default", size = 20 } = {}) {
  const color = tone === "cyan"
    ? "var(--np-terminal-cyan)"
    : tone === "success"
      ? "var(--np-terminal-green)"
      : tone === "danger"
        ? "var(--np-terminal-red)"
        : tone === "amber"
          ? "var(--np-terminal-amber)"
          : TERMINAL_TEXT;

  return {
    fontFamily: "'DM Mono',monospace",
    fontSize: size,
    color,
    lineHeight: 1,
  };
}

export function terminalLinkStyle(tone = "amber") {
  return {
    color: tone === "cyan" ? "var(--np-terminal-cyan)" : "var(--np-terminal-amber)",
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    textDecoration: "none",
    fontFamily: "'DM Sans',sans-serif",
  };
}
