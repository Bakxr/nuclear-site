import { terminalMutedStyle, terminalPanelStyle } from "./styles.js";

export default function TerminalPanel({
  panelId,
  className = "",
  style,
  headerStyle,
  bodyStyle,
  emphasis = "default",
  title,
  subtitle,
  actions,
  children,
}) {
  return (
    <section
      id={panelId}
      className={`np-terminal-panel ${className}`.trim()}
      style={{ ...terminalPanelStyle({ emphasis }), ...style }}
    >
      {(title || subtitle || actions) ? (
        <div className="np-terminal-panel-header" style={headerStyle}>
          <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
            {title ? (
              <div style={{ fontSize: 16, lineHeight: 1.15, color: "var(--np-terminal-text)", fontWeight: 700, letterSpacing: "-0.01em" }}>
                {title}
              </div>
            ) : null}
            {subtitle ? (
              <div style={{ fontSize: 12, lineHeight: 1.55, maxWidth: 760, ...terminalMutedStyle() }}>
                {subtitle}
              </div>
            ) : null}
          </div>
          {actions ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="np-terminal-panel-body" style={bodyStyle}>{children}</div>
    </section>
  );
}
