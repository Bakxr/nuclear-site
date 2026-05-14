// Shared terminal-scoped style helpers.
//
// These intentionally keep their old function signatures so panels do not need
// to be rewritten one-by-one. The visual output, however, has been reset to
// the "instrument" baseline: hairline borders, 0-4px corner radius, no drop
// shadows, mono numerics, cool slate palette, and color-coded deltas.
//
// See `./tokens.js` for the source-of-truth design tokens.

import {
  borderHairline,
  cellPad,
  color,
  fontMono,
  fontSans,
  radius,
  rowPad,
  styles as base,
  toneColor,
} from "./tokens.js";

const TERMINAL_TEXT = color.text;
const TERMINAL_MUTED = color.textMuted;

function resolveTone(tone = "default") {
  // Legacy palette object — kept so callers that destructure it keep working.
  if (tone === "amber" || tone === "accent") {
    return {
      border: color.accent,
      borderSoft: "rgba(216,160,74,0.32)",
      background: "rgba(216,160,74,0.08)",
      color: color.accent,
    };
  }
  if (tone === "cyan" || tone === "info") {
    return {
      border: color.info,
      borderSoft: "rgba(126,168,192,0.32)",
      background: "rgba(126,168,192,0.06)",
      color: color.info,
    };
  }
  if (tone === "success" || tone === "positive") {
    return {
      border: color.positive,
      borderSoft: "rgba(124,185,138,0.32)",
      background: "rgba(124,185,138,0.06)",
      color: color.positive,
    };
  }
  if (tone === "danger" || tone === "negative") {
    return {
      border: color.negative,
      borderSoft: "rgba(215,132,119,0.32)",
      background: "rgba(215,132,119,0.06)",
      color: color.negative,
    };
  }
  if (tone === "warning") {
    return {
      border: color.warning,
      borderSoft: "rgba(215,181,103,0.32)",
      background: "rgba(215,181,103,0.06)",
      color: color.warning,
    };
  }
  return {
    border: color.border,
    borderSoft: color.border,
    background: "transparent",
    color: color.textMuted,
  };
}

export function terminalPanelStyle({ emphasis = "default" } = {}) {
  return emphasis === "hero" ? { ...base.panelHero } : { ...base.panel };
}

// Compact instrument-style action button. No pill radius, no shadow.
export function terminalButtonStyle(active = false, { compact = false, tone = "default" } = {}) {
  const palette = resolveTone(tone);
  return {
    appearance: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: compact ? 22 : 26,
    border: `1px solid ${active ? color.accent : color.border}`,
    background: active ? "rgba(216,160,74,0.14)" : "transparent",
    color: active ? color.accent : palette.color,
    borderRadius: radius.md,
    padding: compact ? "3px 7px" : "4px 9px",
    fontSize: compact ? 10 : 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: fontMono,
    lineHeight: 1.05,
    whiteSpace: "nowrap",
    boxShadow: "none",
  };
}

// Tag / status pill. No rounded pill, no fill — hairline chip.
export function terminalTagStyle({ tone = "default", compact = false } = {}) {
  const palette = resolveTone(tone);
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
    borderRadius: radius.sm,
    border: `1px solid ${palette.borderSoft}`,
    background: "transparent",
    padding: compact ? "1px 5px" : "2px 6px",
    fontSize: compact ? 9.5 : 10,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: palette.color,
    fontFamily: fontMono,
    lineHeight: 1.1,
  };
}

export function terminalPillStyle(c = TERMINAL_TEXT) {
  const tone = c === color.info
    ? "cyan"
    : c === color.positive
      ? "success"
      : c === color.negative
        ? "danger"
        : c === color.accent
          ? "amber"
          : c === color.warning
            ? "warning"
            : "default";
  return terminalTagStyle({ tone });
}

export function terminalToneColor(tone = "default") {
  return toneColor(tone);
}

export function terminalMetricEyebrowStyle() {
  return {
    ...terminalLabelStyle("default"),
    color: color.textMuted,
    letterSpacing: "0.1em",
  };
}

export function terminalMetricDotStyle(accent = color.accent) {
  return {
    width: 6,
    height: 6,
    borderRadius: 0,
    background: accent,
    flexShrink: 0,
  };
}

// Compressed metric tile — no rounded card, no gradient, no shadow.
// Just a hairline cell with a label above a mono value.
export function terminalMetricTileStyle({ compact = false } = {}) {
  return {
    minWidth: 0,
    position: "relative",
    overflow: "hidden",
    borderRadius: 0,
    border: "none",
    borderRight: borderHairline,
    background: "transparent",
    padding: compact ? "4px 10px 6px" : "6px 12px 8px",
    boxShadow: "none",
  };
}

export function terminalDataRowStyle() {
  return {
    minWidth: 0,
    borderTop: borderHairline,
    padding: `${rowPad}px 0`,
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

export function terminalSelectStyle(disabledOrOptions = false) {
  const options = typeof disabledOrOptions === "boolean"
    ? { disabled: disabledOrOptions }
    : (disabledOrOptions || {});
  const { disabled = false, active = false } = options;

  return {
    appearance: "none",
    width: "100%",
    minWidth: 0,
    borderRadius: radius.md,
    border: `1px solid ${active ? color.borderStrong : color.border}`,
    background: "transparent",
    color: disabled ? color.textFaint : active ? color.text : color.textMuted,
    padding: "4px 8px",
    fontFamily: fontMono,
    fontSize: 11,
    fontWeight: 500,
    colorScheme: "dark",
    outline: "none",
  };
}

export function terminalInputShellStyle() {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    borderRadius: radius.md,
    border: borderHairline,
    background: "rgba(0,0,0,0.25)",
    padding: "4px 8px",
    boxShadow: "none",
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
    fontFamily: fontMono,
  };
}

export function terminalLabelStyle(tone = "default") {
  return {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: toneColor(tone === "default" ? "muted" : tone),
    fontWeight: 600,
    fontFamily: fontMono,
    lineHeight: 1.2,
  };
}

export function terminalTableHeaderStyle(align = "left", tone = "default") {
  return {
    ...terminalLabelStyle(tone),
    textAlign: align,
    padding: cellPad,
  };
}

export function terminalMutedStyle() {
  return {
    color: TERMINAL_MUTED,
    fontFamily: fontSans,
  };
}

// Numeric value — always mono, tabular nums, color-coded by tone.
export function terminalValueStyle({ tone = "default", size = 13 } = {}) {
  return {
    fontFamily: fontMono,
    fontVariantNumeric: "tabular-nums",
    fontSize: size,
    color: toneColor(tone),
    lineHeight: 1.1,
    fontWeight: 600,
  };
}

export function terminalLinkStyle(tone = "info") {
  return {
    color: toneColor(tone === "amber" ? "accent" : tone),
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    textDecoration: "none",
    fontFamily: fontMono,
  };
}
