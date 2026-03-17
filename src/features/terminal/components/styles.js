const TERMINAL_TEXT = "var(--np-terminal-text)";
const TERMINAL_MUTED = "var(--np-terminal-muted)";

function resolveTone(tone = "default") {
  if (tone === "amber") {
    return {
      border: "rgba(255,159,28,0.42)",
      borderSoft: "rgba(255,159,28,0.16)",
      background: "rgba(34,20,6,0.9)",
      color: "var(--np-terminal-amber)",
    };
  }
  if (tone === "cyan") {
    return {
      border: "rgba(97,230,255,0.34)",
      borderSoft: "rgba(97,230,255,0.16)",
      background: "rgba(8,25,30,0.88)",
      color: "var(--np-terminal-cyan)",
    };
  }
  if (tone === "success") {
    return {
      border: "rgba(125,255,155,0.34)",
      borderSoft: "rgba(125,255,155,0.14)",
      background: "rgba(8,24,14,0.88)",
      color: "var(--np-terminal-green)",
    };
  }
  if (tone === "danger") {
    return {
      border: "rgba(255,107,107,0.34)",
      borderSoft: "rgba(255,107,107,0.16)",
      background: "rgba(36,12,16,0.9)",
      color: "var(--np-terminal-red)",
    };
  }
  return {
    border: "rgba(74,91,114,0.72)",
    borderSoft: "rgba(74,91,114,0.22)",
    background: "rgba(12,18,26,0.92)",
    color: TERMINAL_TEXT,
  };
}

export function terminalPanelStyle({ alt = false } = {}) {
  return {
    position: "relative",
    minWidth: 0,
    border: `1px solid ${alt ? "rgba(97,230,255,0.18)" : "var(--np-terminal-border)"}`,
    borderRadius: 3,
    overflow: "hidden",
    background: alt ? "rgba(8,13,19,0.98)" : "rgba(6,10,15,0.98)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
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
    border: `1px solid ${active ? "rgba(255,159,28,0.92)" : palette.borderSoft}`,
    background: active
      ? "linear-gradient(180deg, rgba(255,191,97,0.98) 0%, rgba(255,159,28,0.92) 100%)"
      : "linear-gradient(180deg, rgba(17,24,35,0.98) 0%, rgba(9,14,20,0.96) 100%)",
    color: active ? "#090d12" : palette.color,
    borderRadius: 2,
    padding: compact ? "5px 8px" : "7px 10px",
    fontSize: compact ? 10 : 10.5,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
    lineHeight: 1.05,
    whiteSpace: "nowrap",
    boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.3)" : "none",
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
    padding: compact ? "4px 7px" : "6px 9px",
    fontSize: compact ? 9.5 : 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: palette.color,
    fontFamily: "'DM Sans',sans-serif",
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
          : "default";

  return terminalTagStyle({ tone });
}

export function terminalMetricTileStyle({ accent = "var(--np-terminal-amber)" } = {}) {
  return {
    minWidth: 0,
    borderRadius: 2,
    border: "1px solid rgba(55,68,88,0.78)",
    background: "linear-gradient(180deg, rgba(13,18,26,0.98) 0%, rgba(8,11,17,0.98) 100%)",
    padding: "9px 10px 8px",
    boxShadow: `inset 3px 0 0 ${accent}`,
  };
}

export function terminalDataRowStyle() {
  return {
    minWidth: 0,
    borderTop: "1px solid rgba(51,66,86,0.78)",
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
    border: "1px solid rgba(51,66,86,0.9)",
    background: disabled ? "rgba(12,16,24,0.78)" : "rgba(10,14,21,0.96)",
    color: disabled ? "rgba(143,157,177,0.52)" : TERMINAL_TEXT,
    padding: "8px 10px",
    fontFamily: "'DM Sans',sans-serif",
    fontSize: 11.5,
    fontWeight: 600,
    colorScheme: "dark",
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  };
}

export function terminalInputShellStyle() {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    borderRadius: 2,
    border: "1px solid rgba(55,68,88,0.92)",
    background: "linear-gradient(180deg, rgba(9,14,20,0.98) 0%, rgba(6,10,15,0.98) 100%)",
    padding: "8px 10px",
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
    fontSize: 12,
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
    fontSize: 9.5,
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    color: palette,
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
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    textDecoration: "none",
    fontFamily: "'DM Sans',sans-serif",
  };
}
