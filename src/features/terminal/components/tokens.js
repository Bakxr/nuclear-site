// Terminal-scoped design tokens. The base palette already lives as CSS custom
// properties on `.np-terminal-shell` in `src/index.css` (do NOT duplicate the
// hex values here — read them through `var(...)`). These tokens express the
// "instrument" aesthetic: hairline borders, cool slate base, gold accent,
// green/red/amber deltas, mono numerics, tight rows.

// Color tokens -- pull from the CSS variables defined on .np-terminal-shell.
export const color = {
  bg: "var(--np-terminal-bg)",
  bgRaised: "var(--np-terminal-panel-alt)",
  panel: "var(--np-terminal-panel)",
  border: "var(--np-terminal-border)",
  borderStrong: "rgba(125,139,156,0.28)",
  text: "var(--np-terminal-text)",
  textMuted: "var(--np-terminal-muted)",
  textFaint: "var(--np-terminal-subtle)",
  accent: "var(--np-terminal-amber)",       // gold ~ #d8a04a — single primary accent
  positive: "var(--np-terminal-green)",     // up move
  negative: "var(--np-terminal-red)",       // down move
  warning: "var(--np-terminal-yellow)",     // amber alert
  info: "var(--np-terminal-cyan)",          // neutral info / label tone
  dim: "var(--np-terminal-subtle)",
};

// Map a semantic tone keyword to a foreground color.
export function toneColor(tone = "default") {
  if (tone === "amber" || tone === "accent") return color.accent;
  if (tone === "success" || tone === "positive") return color.positive;
  if (tone === "danger" || tone === "negative") return color.negative;
  if (tone === "warning") return color.warning;
  if (tone === "cyan" || tone === "info") return color.info;
  if (tone === "muted") return color.textMuted;
  return color.text;
}

// Sizing primitives.
export const hairline = "1px";
export const borderHairline = `1px solid ${color.border}`;
export const radius = {
  none: 0,
  sm: 2,
  md: 4,         // default panel/element corner radius — instrument-feeling
  pill: 4,       // we deliberately do NOT use 999 pills in the terminal
};
export const rowPad = 6;
export const cellPad = "4px 8px";

// Typography.
export const fontMono = "'DM Mono','SFMono-Regular',Menlo,Consolas,monospace";
export const fontSans = "'DM Sans','Inter',system-ui,sans-serif";

// Text style helper. Sizes are deliberately small/dense.
// usage: ...text(11, { mono: true, tone: 'positive' })
export function text(size = 12, { mono = false, weight, tone = "default", uppercase = false } = {}) {
  const family = mono ? fontMono : fontSans;
  const fallbackWeight = mono ? 500 : 500;
  return {
    fontFamily: family,
    fontSize: size,
    fontWeight: weight ?? fallbackWeight,
    color: toneColor(tone),
    lineHeight: 1.3,
    letterSpacing: uppercase ? "0.08em" : "0",
    textTransform: uppercase ? "uppercase" : "none",
  };
}

// Pre-baked role styles (read these instead of constructing inline each time).
export const styles = {
  // Hairline-only panel — no shadow, no rounded card chrome.
  panel: {
    position: "relative",
    minWidth: 0,
    border: borderHairline,
    borderRadius: radius.md,
    background: color.panel,
    overflow: "hidden",
    boxShadow: "none",
  },
  // Slightly raised variant for the hero (still hairline, no drop shadow).
  panelHero: {
    position: "relative",
    minWidth: 0,
    border: `1px solid ${color.borderStrong}`,
    borderRadius: radius.md,
    background: color.panel,
    overflow: "hidden",
    boxShadow: "none",
  },
  // Tight table cell base.
  cell: {
    padding: cellPad,
    fontFamily: fontMono,
    fontSize: 12,
    color: color.text,
    lineHeight: 1.3,
  },
  // Tight data row separator.
  row: {
    minWidth: 0,
    borderTop: borderHairline,
    padding: `${rowPad}px 0`,
  },
  // Uppercase mono label.
  label: {
    fontFamily: fontMono,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: color.textMuted,
    lineHeight: 1.2,
  },
  // Numeric / ticker / timestamp baseline.
  numeric: {
    fontFamily: fontMono,
    fontVariantNumeric: "tabular-nums",
    fontSize: 12,
    fontWeight: 600,
    color: color.text,
    lineHeight: 1.15,
  },
};

// Kbd-style hint badge (e.g. `⌘K`, `/`, `?`).
export function kbdStyle() {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 18,
    height: 18,
    padding: "0 4px",
    borderRadius: 2,
    border: borderHairline,
    background: "rgba(255,255,255,0.03)",
    fontFamily: fontMono,
    fontSize: 10,
    fontWeight: 600,
    color: color.textMuted,
    letterSpacing: 0,
    lineHeight: 1,
  };
}

// Inline star toggle (replaces STAR/Starred pill buttons).
// Caller passes whether the item is starred; we return styles for a small
// icon-only button with a ~16px hit target.
export function starButtonStyle(starred = false) {
  return {
    appearance: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    padding: 0,
    border: "none",
    background: "transparent",
    color: starred ? color.accent : color.textFaint,
    fontSize: 13,
    lineHeight: 1,
    cursor: "pointer",
    fontFamily: fontMono,
  };
}

export const starGlyph = (starred) => (starred ? "★" : "☆"); // ★ / ☆
