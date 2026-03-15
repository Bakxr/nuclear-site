import { terminalPanelStyle } from "./styles.js";

export default function TerminalPanel({ title, subtitle, actions, children }) {
  return (
    <section style={{ ...terminalPanelStyle(), padding: 18 }}>
      {(title || subtitle || actions) ? (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            {title ? <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(212,165,74,0.78)", fontWeight: 700, marginBottom: 4 }}>{title}</div> : null}
            {subtitle ? <div style={{ fontSize: 13, color: "rgba(245,240,232,0.62)" }}>{subtitle}</div> : null}
          </div>
          {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
