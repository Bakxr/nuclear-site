export function terminalPanelStyle() {
  return {
    background: "rgba(11,15,22,0.92)",
    border: "1px solid rgba(212,165,74,0.16)",
    borderRadius: 18,
    boxShadow: "0 30px 80px rgba(0,0,0,0.28)",
  };
}

export function terminalButtonStyle(active = false) {
  return {
    background: active ? "#f5f0e8" : "rgba(255,255,255,0.04)",
    color: active ? "#14120e" : "rgba(245,240,232,0.68)",
    border: `1px solid ${active ? "rgba(212,165,74,0.42)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 999,
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
  };
}

export function terminalPillStyle(color = "rgba(212,165,74,0.72)") {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    padding: "7px 10px",
    fontSize: 11,
    color,
  };
}

export function terminalMetricTileStyle() {
  return {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)",
    padding: "14px 15px",
  };
}

export function terminalDataRowStyle() {
  return {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.03)",
    padding: "10px 12px",
  };
}

export function terminalScrollAreaStyle(maxHeight = 420) {
  return {
    display: "grid",
    gap: 8,
    maxHeight,
    overflowY: "auto",
    paddingRight: 2,
  };
}
