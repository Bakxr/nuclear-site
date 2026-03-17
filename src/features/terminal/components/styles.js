const TERMINAL_TEXT = "var(--np-terminal-text)";
const TERMINAL_MUTED = "var(--np-terminal-muted)";

function resolveTone(tone = "default") {
  if (tone === "amber") {
    return {
      border: "rgba(216,160,74,0.28)",
      borderSoft: "rgba(216,160,74,0.14)",
      background: "rgba(216,160,74,0.08)",
      color: "var(--np-terminal-amber)",
    };
  }
  if (tone === "cyan") {
    return {
      border: "rgba(126,168,192,0.26)",
      borderSoft: "rgba(126,168,192,0.13)",
      background: "rgba(126,168,192,0.08)",
      color: "var(--np-terminal-cyan)",
    };
  }
  if (tone === "success") {
    return {
      border: "rgba(124,185,138,0.26)",
      borderSoft: "rgba(124,185,138,0.13)",
      background: "rgba(124,185,138,0.08)",
      color: "var(--np-terminal-green)",
    };
  }
  if (tone === "danger") {
    return {
      border: "rgba(215,132,119,0.28)",
      borderSoft: "rgba(215,132,119,0.14)",
      background: "rgba(215,132,119,0.08)",
      color: "var(--np-terminal-red)",
    };
  }
  if (tone === "warning") {
    return {
      border: "rgba(215,181,103,0.28)",
      borderSoft: "rgba(215,181,103,0.14)",
      background: "rgba(215,181,103,0.08)",
      color: "var(--np-terminal-yellow)",
    };
  }
  return {
    border: "rgba(125,139,156,0.2)",
    borderSoft: "rgba(125,139,156,0.12)",
    background: "rgba(255,255,255,0.03)",
    color: TERMINAL_TEXT,
  };
}

export function terminalPanelStyle({ alt = false, emphasis = "default" } = {}) {
  return {
    position: "relative",
    minWidth: 0,
    border: `1px solid ${alt ? "rgba(138,150,168,0.18)" : "var(--np-terminal-border)"}`,
    borderRadius: 18,
    overflow: "hidden",
    background: alt ? "rgba(18,24,32,0.9)" : "rgba(16,21,28,0.92)",
    boxShadow: emphasis === "hero"
      ? "0 24px 54px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.03)"
      : "0 18px 42px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.03)",
    backdropFilter: "blur(18px)",
  };
}

export function terminalButtonStyle(active = false, { compact = false, tone = "default" } = {}) {
  const palette = resolveTone(tone);

  return {
    appearance: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: compact ? 30 : 36,
    border: `1px solid ${active ? "rgba(216,160,74,0.32)" : palette.borderSoft}`,
    background: active ? "rgba(216,160,74,0.92)" : "rgba(255,255,255,0.03)",
    color: active ? "#11161d" : palette.color,
    borderRadius: 999,
    padding: compact ? "5px 10px" : "8px 12px",
    fontSize: compact ? 10.5 : 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'DM Mono',monospace",
    lineHeight: 1.05,
    whiteSpace: "nowrap",
    boxShadow: active ? "0 10px 24px rgba(216,160,74,0.18)" : "none",
  };
}

export function terminalTagStyle({ tone = "default", compact = false } = {}) {
  const palette = resolveTone(tone);

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    borderRadius: 999,
    border: `1px solid ${palette.borderSoft}`,
    background: palette.background,
    padding: compact ? "4px 8px" : "6px 10px",
    fontSize: compact ? 9.5 : 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: palette.color,
    fontFamily: "'DM Mono',monospace",
    lineHeight: 1.05,
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
          : color === "var(--np-terminal-yellow)"
            ? "warning"
            : "default";

  return terminalTagStyle({ tone });
}

export function terminalMetricTileStyle({ accent = "var(--np-terminal-amber)" } = {}) {
  return {
    minWidth: 0,
    borderRadius: 16,
    border: "1px solid rgba(125,139,156,0.14)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
    padding: "14px 15px",
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), inset 0 2px 0 ${accent}`,
  };
}

export function terminalDataRowStyle() {
  return {
    minWidth: 0,
    borderTop: "1px solid rgba(125,139,156,0.11)",
    padding: "11px 0",
  };
}

export function terminalScrollAreaStyle(maxHeight = 360) {
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
    borderRadius: 12,
    border: "1px solid rgba(125,139,156,0.16)",
    background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
    color: disabled ? "rgba(148,160,176,0.44)" : TERMINAL_TEXT,
    padding: "10px 12px",
    fontFamily: "'DM Sans',sans-serif",
    fontSize: 12,
    fontWeight: 600,
    colorScheme: "dark",
    outline: "none",
  };
}

export function terminalInputShellStyle() {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    borderRadius: 14,
    border: "1px solid rgba(125,139,156,0.16)",
    background: "rgba(255,255,255,0.04)",
    padding: "11px 12px",
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
  const color = tone === "cyan"
    ? "var(--np-terminal-cyan)"
    : tone === "success"
      ? "var(--np-terminal-green)"
      : tone === "danger"
        ? "var(--np-terminal-red)"
        : tone === "warning"
          ? "var(--np-terminal-yellow)"
          : tone === "amber"
            ? "var(--np-terminal-amber)"
            : "var(--np-terminal-subtle)";

  return {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color,
    fontWeight: 700,
    fontFamily: "'DM Mono',monospace",
    lineHeight: 1.2,
  };
}

export function terminalTableHeaderStyle(align = "left", tone = "cyan") {
  return {
    ...terminalLabelStyle(tone),
    textAlign: align,
  };
}

export function terminalMutedStyle() {
  return {
    color: TERMINAL_MUTED,
  };
}

export function terminalValueStyle({ tone = "default", size = 16 } = {}) {
  const color = tone === "cyan"
    ? "var(--np-terminal-cyan)"
    : tone === "success"
      ? "var(--np-terminal-green)"
      : tone === "danger"
        ? "var(--np-terminal-red)"
        : tone === "warning"
          ? "var(--np-terminal-yellow)"
          : tone === "amber"
            ? "var(--np-terminal-amber)"
            : TERMINAL_TEXT;

  return {
    fontFamily: "'DM Mono',monospace",
    fontSize: size,
    color,
    lineHeight: 1.08,
    fontWeight: 700,
  };
}

export function terminalLinkStyle(tone = "amber") {
  return {
    color: tone === "cyan" ? "var(--np-terminal-cyan)" : "var(--np-terminal-amber)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    textDecoration: "none",
    fontFamily: "'DM Mono',monospace",
  };
}
