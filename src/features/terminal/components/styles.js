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
    border: "rgba(125,139,156,0.16)",
    borderSoft: "rgba(125,139,156,0.09)",
    background: "rgba(255,255,255,0.02)",
    color: "rgba(237,241,245,0.78)",
  };
}

export function terminalPanelStyle({ alt = false, emphasis = "default" } = {}) {
  return {
    position: "relative",
    minWidth: 0,
    border: `1px solid ${emphasis === "hero" ? "rgba(125,139,156,0.16)" : alt ? "rgba(138,150,168,0.15)" : "rgba(125,139,156,0.12)"}`,
    borderRadius: 18,
    overflow: "hidden",
    background: emphasis === "hero"
      ? "rgba(16,21,28,0.9)"
      : alt
        ? "rgba(15,20,27,0.8)"
        : "rgba(13,18,24,0.76)",
    boxShadow: emphasis === "hero"
      ? "0 24px 54px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.03)"
      : "0 14px 30px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.02)",
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
    background: active ? "rgba(216,160,74,0.92)" : "rgba(255,255,255,0.025)",
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
    boxShadow: active ? "0 8px 18px rgba(216,160,74,0.16)" : "none",
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

export function terminalMetricTileStyle({ accent = "var(--np-terminal-amber)", emphasis = "default" } = {}) {
  const border = emphasis === "primary"
    ? "rgba(125,139,156,0.16)"
    : emphasis === "secondary"
      ? "rgba(125,139,156,0.13)"
      : "rgba(125,139,156,0.1)";
  const background = emphasis === "primary"
    ? "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.024) 100%)"
    : emphasis === "secondary"
      ? "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.016) 100%)";

  return {
    minWidth: 0,
    borderRadius: 16,
    border: `1px solid ${border}`,
    background,
    padding: emphasis === "primary" ? "15px 16px" : "14px 15px",
    boxShadow: emphasis === "primary"
      ? `inset 0 1px 0 rgba(255,255,255,0.04), inset 0 2px 0 ${accent}, 0 10px 22px rgba(0,0,0,0.12)`
      : `inset 0 1px 0 rgba(255,255,255,0.03), inset 0 2px 0 ${accent}`,
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

export function terminalSelectStyle(disabledOrOptions = false) {
  const options = typeof disabledOrOptions === "boolean"
    ? { disabled: disabledOrOptions }
    : (disabledOrOptions || {});
  const { disabled = false, active = false } = options;

  return {
    appearance: "none",
    width: "100%",
    minWidth: 0,
    borderRadius: 12,
    border: `1px solid ${active ? "rgba(125,139,156,0.16)" : "rgba(125,139,156,0.08)"}`,
    background: disabled ? "rgba(255,255,255,0.012)" : active ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.014)",
    color: disabled ? "rgba(148,160,176,0.42)" : active ? "rgba(237,241,245,0.9)" : "rgba(237,241,245,0.62)",
    padding: "10px 12px",
    fontFamily: "'DM Sans',sans-serif",
    fontSize: 12,
    fontWeight: active ? 600 : 500,
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
    border: "1px solid rgba(125,139,156,0.18)",
    background: "linear-gradient(180deg, rgba(8,12,17,0.84) 0%, rgba(12,17,24,0.72) 100%)",
    padding: "11px 12px",
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
            : "rgba(148,160,173,0.72)";

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
