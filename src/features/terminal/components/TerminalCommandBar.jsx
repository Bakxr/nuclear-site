import { useTerminal } from "../context.jsx";
import { terminalButtonStyle, terminalPillStyle } from "./styles.js";

export default function TerminalCommandBar({ isMobileViewport, onExitTerminal, onRefreshData }) {
  const { snapshot, searchResults, state, setQuery, selectEntity, resetWorkspace } = useTerminal();

  return (
    <div style={{ borderBottom: "1px solid rgba(212,165,74,0.12)", position: "sticky", top: 0, zIndex: 110, backdropFilter: "blur(20px)", background: "rgba(8,11,17,0.88)" }}>
      <div style={{ maxWidth: 1520, margin: "0 auto", padding: isMobileViewport ? "14px 18px" : "16px 24px", display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button type="button" onClick={onExitTerminal} style={{ ...terminalButtonStyle(false), color: "#f5f0e8" }}>
            Editorial view
          </button>
          <div style={{ minWidth: 0, flex: "1 1 320px" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(212,165,74,0.78)", fontWeight: 700, marginBottom: 4 }}>Nuclear Terminal</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: isMobileViewport ? 24 : 30, lineHeight: 1.05 }}>
              The advanced nuclear intelligence workspace.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
            {Object.values(snapshot.freshness).map((item) => (
              <span key={item.label} style={terminalPillStyle(item.stale ? "#fbbf24" : "rgba(245,240,232,0.7)")}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: item.stale ? "#fbbf24" : "#4ade80", display: "inline-block" }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1fr) auto", gap: 12, alignItems: "start" }}>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: "10px 14px" }}>
              <span style={{ fontSize: 13, opacity: 0.42 }}>Cmd</span>
              <input
                type="text"
                value={state.query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search plants, countries, companies, stories, projects"
                style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#f5f0e8", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
              />
            </div>
            {state.query.trim() && searchResults.length > 0 ? (
              <div style={{ position: "absolute", inset: "calc(100% + 8px) 0 auto 0", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(7,10,15,0.98)", boxShadow: "0 24px 60px rgba(0,0,0,0.38)", padding: 10, zIndex: 20, display: "grid", gap: 6 }}>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => selectEntity(result)}
                    style={{ textAlign: "left", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: "10px 12px", color: "#f5f0e8", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{result.name || result.title}</div>
                        <div style={{ fontSize: 11, color: "rgba(245,240,232,0.44)" }}>{result.entityType} {result.country ? `· ${result.country}` : ""}</div>
                      </div>
                      <span style={{ fontSize: 10, textTransform: "uppercase", color: "#d4a54a", letterSpacing: "0.08em" }}>
                        {result.tag || result.theme || result.status || result.stage || result.entityType}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={onRefreshData} style={terminalButtonStyle(false)}>
              Refresh
            </button>
            <button type="button" onClick={resetWorkspace} style={terminalButtonStyle(false)}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
