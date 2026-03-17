const TERMINAL_TEXT = "var(--np-terminal-text)";
const TERMINAL_MUTED = "var(--np-terminal-muted)";

function resolveTone(tone = "default") {
  if (tone === "amber") {
    return {
      border: "rgba(255,156,26,0.56)",
      borderSoft: "rgba(255,156,26,0.18)",
      background: "rgba(37,24,9,0.96)",
      color: "var(--np-terminal-amber)",
    };
  }
  if (tone === "cyan") {
    return {
      border: "rgba(78,184,214,0.52)",
      borderSoft: "rgba(78,184,214,0.16)",
      background: "rgba(10,27,34,0.96)",
      color: "var(--np-terminal-cyan)",
    };
  }
  if (tone === "success") {
    return {
      border: "rgba(73,184,122,0.5)",
      borderSoft: "rgba(73,184,122,0.16)",
      background: "rgba(12,31,21,0.96)",
      color: "var(--np-terminal-green)",
    };
  }
  if (tone === "danger") {
    return {
      border: "rgba(213,92,92,0.52)",
      borderSoft: "rgba(213,92,92,0.16)",
      background: "rgba(37,15,18,0.96)",
      color: "var(--np-terminal-red)",
    };
  }
  if (tone === "warning") {
    return {
      border: "rgba(240,199,92,0.54)",
      borderSoft: "rgba(240,199,92,0.18)",
      background: "rgba(42,34,14,0.96)",
      color: "var(--np-terminal-yellow)",
    };
  }
  return {
    border: "rgba(88,95,108,0.88)",
    borderSoft: "rgba(88,95,108,0.18)",
    background: "rgba(17,20,25,0.96)",
    color: TERMINAL_TEXT,
  };
}

export function terminalPanelStyle({ alt = false } = {}) {
  return {
    position: "relative",
    minWidth: 0,
    border: `1px solid ${alt ? "rgba(96,106,120,0.92)" : "var(--np-terminal-border)"}`,
    borderRadius: 2,
    overflow: "hidden",
    background: alt ? "rgba(18,22,28,0.98)" : "rgba(10,12,16,0.985)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
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
    border: `1px solid ${active ? "rgba(255,156,26,0.92)" : palette.borderSoft}`,
    background: active ? "rgba(255,156,26,0.94)" : "rgba(18,21,27,0.98)",
    color: active ? "#090b0f" : palette.color,
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
    boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.22)" : "inset 0 1px 0 rgba(255,255,255,0.04)",
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
    border: "1px solid rgba(69,74,84,0.92)",
    background: "rgba(15,18,23,0.98)",
    padding: "9px 10px 8px",
    boxShadow: `inset 2px 0 0 ${accent}`,
  };
}

export function terminalDataRowStyle() {
  return {
    minWidth: 0,
    borderTop: "1px solid rgba(55,59,68,0.9)",
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
    border: "1px solid rgba(62,67,77,0.94)",
    background: disabled ? "rgba(14,16,20,0.9)" : "rgba(18,21,27,0.98)",
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
    gap: 9,
    minWidth: 0,
    borderRadius: 2,
    border: "1px solid rgba(66,72,82,0.94)",
    background: "rgba(12,14,18,0.98)",
    padding: "9px 10px",
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
