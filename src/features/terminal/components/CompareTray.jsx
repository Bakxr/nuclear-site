import { useTerminal } from "../context.jsx";
import { terminalButtonStyle } from "./styles.js";

export default function CompareTray() {
  const { compareEntities, toggleCompare } = useTerminal();
  if (!compareEntities.length) return null;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(212,165,74,0.78)", fontWeight: 700 }}>
        Compare set
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {compareEntities.map((entity) => (
          <div key={entity.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: "12px 13px" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{entity.name || entity.country || entity.title}</div>
              <div style={{ fontSize: 11, color: "rgba(245,240,232,0.46)" }}>{entity.entityType}</div>
            </div>
            <button type="button" onClick={() => toggleCompare(entity.id)} style={terminalButtonStyle(false)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
