import { useTerminal } from "../context.jsx";
import { terminalButtonStyle, terminalDataRowStyle, terminalLabelStyle, terminalMutedStyle, terminalTagStyle } from "./styles.js";

export default function CompareTray() {
  const { compareEntities, toggleCompare } = useTerminal();
  if (!compareEntities.length) return null;

  return (
    <div style={{ display: "grid", gap: 8, border: "1px solid rgba(97,230,255,0.14)", borderRadius: 8, background: "rgba(8,12,18,0.68)", padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={terminalLabelStyle("cyan")}>Compare queue</div>
        <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{compareEntities.length} armed</span>
      </div>
      <div style={{ display: "grid", gap: 0 }}>
        {compareEntities.map((entity) => (
          <div key={entity.id} className="np-terminal-row" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--np-terminal-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {entity.name || entity.country || entity.title}
              </div>
              <div style={{ fontSize: 11, marginTop: 4, ...terminalMutedStyle() }}>{entity.entityType}</div>
            </div>
            <button type="button" onClick={() => toggleCompare(entity.id)} className="np-terminal-button" style={terminalButtonStyle(false)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
