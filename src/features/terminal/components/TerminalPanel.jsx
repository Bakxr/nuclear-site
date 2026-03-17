import { terminalLabelStyle, terminalMutedStyle, terminalPanelStyle } from "./styles.js";

export default function TerminalPanel({ title, subtitle, actions, children }) {
  return (
    <section className="np-terminal-panel" style={terminalPanelStyle()}>
      {(title || subtitle || actions) ? (
        <div className="np-terminal-panel-header">
          <div style={{ minWidth: 0 }}>
            {title ? <div style={terminalLabelStyle()}>{title}</div> : null}
            {subtitle ? (
              <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.5, ...terminalMutedStyle() }}>
                {subtitle}
              </div>
            ) : null}
          </div>
          {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>{actions}</div> : null}
        </div>
      ) : null}
      <div className="np-terminal-panel-body">{children}</div>
    </section>
  );
}
