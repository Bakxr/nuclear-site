import { terminalPanelStyle } from "./styles.js";

// Shared panel chrome: one compact header row (mono title, optional count,
// actions) over a scrolling body. `subtitle` is kept for callers but shown as
// a hover tooltip — explanatory copy doesn't belong in a dense workspace.
export default function TerminalPanel({
  panelId,
  className = "",
  style,
  headerStyle,
  bodyStyle,
  emphasis = "default",
  title,
  subtitle,
  count,
  actions,
  children,
}) {
  return (
    <section
      id={panelId}
      className={`np-terminal-panel ${className}`.trim()}
      style={{ ...terminalPanelStyle({ emphasis }), ...style }}
      aria-label={typeof title === "string" ? title : undefined}
    >
      {(title || actions) ? (
        <div className="np-terminal-panel-header" style={headerStyle}>
          <div className="npt-panel-title" title={subtitle || undefined}>
            {title ? <span>{title}</span> : null}
            {count != null ? <span className="npt-panel-count">{count}</span> : null}
          </div>
          {actions ? <div className="npt-panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="np-terminal-panel-body" style={bodyStyle}>{children}</div>
    </section>
  );
}
