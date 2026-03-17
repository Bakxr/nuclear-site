import { useTerminal } from "../context.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLabelStyle,
  terminalMutedStyle,
  terminalTagStyle,
} from "./styles.js";

export default function CompareTray() {
  const { compareEntities, toggleCompare } = useTerminal();
  if (!compareEntities.length) return null;

  return (
    <div
      style={{
        display: "grid",
        gap: 0,
        border: "1px solid rgba(51,66,86,0.92)",
        background: "rgba(7,11,16,0.95)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          padding: "8px 10px",
          borderBottom: "1px solid rgba(51,66,86,0.92)",
        }}
      >
        <div style={terminalLabelStyle("cyan")}>Compare queue</div>
        <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{compareEntities.length} armed</span>
      </div>
      <div style={{ display: "grid", gap: 0, padding: "0 10px" }}>
        {compareEntities.map((entity) => (
          <div
            key={entity.id}
            className="np-terminal-row"
            style={{
              ...terminalDataRowStyle(),
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 11.5,
                  color: "var(--np-terminal-text)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {entity.name || entity.country || entity.title}
              </div>
              <div style={{ fontSize: 10, marginTop: 3, ...terminalMutedStyle() }}>{entity.entityType}</div>
            </div>
            <button type="button" onClick={() => toggleCompare(entity.id)} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true })}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
