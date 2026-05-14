import { useEffect } from "react";
import { borderHairline, color, fontMono, fontSans, kbdStyle, radius } from "./tokens.js";

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  zIndex: 1000,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
};

const panelStyle = {
  marginTop: "18vh",
  width: "min(560px, calc(100vw - 32px))",
  border: borderHairline,
  borderRadius: radius.md,
  background: color.panel,
  boxShadow: "none",
  overflow: "hidden",
  fontFamily: fontSans,
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 14px",
  borderBottom: borderHairline,
};

const titleStyle = {
  fontFamily: fontMono,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: color.textMuted,
};

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "150px 1fr",
  gap: 12,
  alignItems: "center",
  padding: "8px 14px",
  borderTop: borderHairline,
};

const descStyle = {
  fontFamily: fontSans,
  fontSize: 12,
  color: color.text,
};

const footerStyle = {
  padding: "10px 14px",
  borderTop: borderHairline,
  fontFamily: fontMono,
  fontSize: 10,
  color: color.textMuted,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
};

const SHORTCUTS = [
  { keys: ["⌘K", "Ctrl+K"], desc: "Open command palette" },
  { keys: ["/"], desc: "Open command palette (when not typing)" },
  { keys: ["Esc"], desc: "Close" },
  { keys: ["↑", "↓"], desc: "Navigate results" },
  { keys: ["↵"], desc: "Select" },
  { keys: ["1", "–", "6"], desc: "Jump to desk" },
  { keys: ["?"], desc: "Toggle this help" },
];

export default function ShortcutsHelp({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={backdropStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div style={panelStyle} onMouseDown={(event) => event.stopPropagation()}>
        <div style={headerStyle}>
          <span style={titleStyle}>Keyboard shortcuts</span>
          <span style={{ ...titleStyle, color: color.textFaint }}>esc to close</span>
        </div>
        <div>
          {SHORTCUTS.map((row, index) => (
            <div
              key={index}
              style={{
                ...rowStyle,
                borderTop: index === 0 ? "none" : rowStyle.borderTop,
              }}
            >
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {row.keys.map((k) => (
                  <kbd key={k} style={kbdStyle()}>{k}</kbd>
                ))}
              </div>
              <div style={descStyle}>{row.desc}</div>
            </div>
          ))}
        </div>
        <div style={footerStyle}>
          <span>Press <kbd style={kbdStyle()}>?</kbd> anytime to toggle</span>
          <span style={{ color: color.textFaint }}>View desk hotkeys: 1–6</span>
        </div>
      </div>
    </div>
  );
}
