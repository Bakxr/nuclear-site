const TERMINAL_TEXT = "var(--np-terminal-text)";
const TERMINAL_MUTED = "var(--np-terminal-muted)";

function resolveTone(tone = "default") {
  if (tone === "amber") {
    return {
      border: "rgba(212,165,74,0.46)",
      borderSoft: "rgba(212,165,74,0.16)",
      background: "rgba(47,34,19,0.94)",
      color: "var(--np-terminal-amber)",
    };
  }
  if (tone === "cyan") {
    return {
      border: "rgba(127,154,167,0.4)",
      borderSoft: "rgba(127,154,167,0.14)",
      background: "rgba(27,32,35,0.94)",
      color: "var(--np-terminal-cyan)",
    };
  }
  if (tone === "success") {
    return {
      border: "rgba(126,160,125,0.42)",
      borderSoft: "rgba(126,160,125,0.14)",
      background: "rgba(27,33,25,0.94)",
      color: "var(--np-terminal-green)",
    };
  }
  if (tone === "danger") {
    return {
      border: "rgba(184,116,104,0.42)",
      borderSoft: "rgba(184,116,104,0.14)",
      background: "rgba(39,24,22,0.94)",
      color: "var(--np-terminal-red)",
    };
  }
  if (tone === "warning") {
    return {
      border: "rgba(215,191,120,0.44)",
      borderSoft: "rgba(215,191,120,0.16)",
      background: "rgba(43,34,20,0.94)",
      color: "var(--np-terminal-yellow)",
    };
  }
  return {
    border: "rgba(122,103,76,0.56)",
    borderSoft: "rgba(122,103,76,0.16)",
    background: "rgba(27,22,18,0.94)",
    color: TERMINAL_TEXT,
  };
}

export function terminalPanelStyle({ alt = false } = {}) {
  return {
    position: "relative",
    minWidth: 0,
    border: `1px solid ${alt ? "rgba(135,119,96,0.58)" : "var(--np-terminal-border)"}`,
    borderRadius: 2,
    overflow: "hidden",
    background: alt ? "rgba(29,24,19,0.98)" : "rgba(22,18,14,0.985)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.015)",
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
    minHeight: compact ? 28 : 32,
    border: `1px solid ${active ? "rgba(212,165,74,0.62)" : palette.borderSoft}`,
    background: active ? "rgba(212,165,74,0.9)" : "rgba(31,25,20,0.98)",
    color: active ? "#1a1510" : palette.color,
    borderRadius: 2,
    padding: compact ? "5px 8px" : "7px 10px",
    fontSize: compact ? 10 : 10.5,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'DM Mono',monospace",
    lineHeight: 1.05,
    whiteSpace: "nowrap",
    boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.16)" : "inset 0 1px 0 rgba(255,255,255,0.025)",
  };
}

export function terminalTagStyle({ tone = "default", compact = false } = {}) {
  const palette = resolveTone(tone);

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    borderRadius: 2,
    border: `1px solid ${palette.borderSoft}`,
    background: palette.background,
    padding: compact ? "4px 7px" : "5px 8px",
    fontSize: compact ? 9 : 9.5,
    fontWeight: 700,
    letterSpacing: "0.1em",
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
    borderRadius: 2,
    border: "1px solid rgba(122,103,76,0.44)",
    background: "rgba(30,24,19,0.98)",
    padding: "9px 10px 8px",
    boxShadow: `inset 2px 0 0 ${accent}`,
  };
}

export function terminalDataRowStyle() {
  return {
    minWidth: 0,
    borderTop: "1px solid rgba(122,103,76,0.24)",
    padding: "8px 0",
  };
}

export function terminalScrollAreaStyle(maxHeight = 360) {
  return {
    display: "grid",
    gap: 0,
    maxHeight,
    overflowY: "auto",
    paddingRight: 2,
    minWidth: 0,
  };
}

export function terminalSelectStyle(disabled = false) {
  return {
    appearance: "none",
    width: "100%",
    minWidth: 0,
    borderRadius: 2,
    border: "1px solid rgba(122,103,76,0.38)",
    background: disabled ? "rgba(24,19,15,0.9)" : "rgba(31,25,20,0.98)",
    color: disabled ? "rgba(176,161,138,0.42)" : TERMINAL_TEXT,
    padding: "8px 10px",
    fontFamily: "'DM Sans',sans-serif",
    fontSize: 11.5,
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
    gap: 9,
    minWidth: 0,
    borderRadius: 2,
    border: "1px solid rgba(122,103,76,0.42)",
    background: "rgba(24,19,15,0.98)",
    padding: "9px 10px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
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
    fontSize: 12,
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
          : "var(--np-terminal-amber)";

  return {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    color,
    fontWeight: 700,
    fontFamily: "'DM Mono',monospace",
    lineHeight: 1.1,
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
    lineHeight: 1,
  };
}

export function terminalLinkStyle(tone = "amber") {
  return {
    color: tone === "cyan" ? "var(--np-terminal-cyan)" : "var(--np-terminal-amber)",
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    textDecoration: "none",
    fontFamily: "'DM Mono',monospace",
  };
}
