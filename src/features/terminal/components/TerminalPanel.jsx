import { terminalLabelStyle, terminalMutedStyle, terminalPanelStyle } from "./styles.js";

export default function TerminalPanel({
  panelId,
  className = "",
  style,
  headerStyle,
  bodyStyle,
  title,
  subtitle,
  actions,
  children,
}) {
  return (
    <section id={panelId} className={`np-terminal-panel ${className}`.trim()} style={{ ...terminalPanelStyle(), ...style }}>
      {(title || subtitle || actions) ? (
        <div className="np-terminal-panel-header" style={headerStyle}>
          <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
            {title ? <div style={terminalLabelStyle()}>{title}</div> : null}
            {subtitle ? (
              <div style={{ fontSize: 11, lineHeight: 1.45, ...terminalMutedStyle() }}>
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
