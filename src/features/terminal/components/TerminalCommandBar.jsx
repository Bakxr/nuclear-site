import { useTerminal } from "../context.jsx";
import {
  terminalButtonStyle,
  terminalInputShellStyle,
  terminalInputStyle,
  terminalLabelStyle,
  terminalMutedStyle,
  terminalTagStyle,
} from "./styles.js";

function formatFreshness(value) {
  if (!value) return "waiting";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "waiting";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

export default function TerminalCommandBar({ isMobileViewport, onExitTerminal, onRefreshData }) {
  const {
    snapshot,
    searchResults,
    state,
    compareEntities,
    watchedSet,
    setQuery,
    selectEntity,
    resetWorkspace,
  } = useTerminal();

  const activeChips = [
    state.layer === "uranium" ? "Fuel-cycle layer armed" : "Fleet layer armed",
    state.countryFilter ? `Country ${state.countryFilter}` : null,
    state.reactorTypeFilter ? `Type ${state.reactorTypeFilter}` : null,
    state.statusFilter ? `Status ${state.statusFilter}` : null,
    compareEntities.length ? `Compare queue ${compareEntities.length}` : null,
    watchedSet.size ? `Watchlist ${watchedSet.size}` : null,
  ].filter(Boolean);

  return (
    <div className="np-terminal-commandbar">
      <div className="np-terminal-content" style={{ maxWidth: 1540, margin: "0 auto", padding: isMobileViewport ? "12px 14px 14px" : "12px 20px 14px", display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1fr) auto", gap: 12, alignItems: "start" }}>
          <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
            <div style={terminalLabelStyle()}>Nuclear Terminal // operations console</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: isMobileViewport ? 20 : 24, lineHeight: 1.08, letterSpacing: "0.02em", color: "var(--np-terminal-text)" }}>
              FLEET / FUEL / FILINGS / MARKET TAPE
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.6, maxWidth: 780, ...terminalMutedStyle() }}>
              Dense workspace for reactors, fuel-cycle assets, operations, market instruments, and linked catalyst coverage.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: isMobileViewport ? "flex-start" : "flex-end" }}>
            {Object.values(snapshot.freshness).map((item) => (
              <span key={item.label} style={terminalTagStyle({ tone: item.stale ? "amber" : "success", compact: true })}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: item.stale ? "var(--np-terminal-amber)" : "var(--np-terminal-green)", display: "inline-block", flexShrink: 0 }} />
                {item.label} {formatFreshness(item.updatedAt)}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1fr) auto", gap: 12, alignItems: "start" }}>
          <div style={{ position: "relative", minWidth: 0 }}>
            <div style={terminalInputShellStyle()}>
              <span style={terminalLabelStyle("cyan")}>Cmd</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "var(--np-terminal-amber)" }}>{">"}</span>
              <input
                type="text"
                value={state.query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search plants, countries, companies, filings, stories, projects"
                style={terminalInputStyle()}
              />
            </div>

            {state.query.trim() && searchResults.length > 0 ? (
              <div style={{ position: "absolute", inset: "calc(100% + 8px) 0 auto 0", borderRadius: 8, border: "1px solid var(--np-terminal-border)", background: "rgba(8,12,18,0.98)", boxShadow: "0 24px 60px rgba(0,0,0,0.42)", padding: "4px 12px 8px", zIndex: 30, display: "grid", gap: 0 }}>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => selectEntity(result)}
                    className="np-terminal-row np-terminal-row--interactive np-terminal-button"
                    style={{ borderTop: "1px solid rgba(143,157,177,0.16)", textAlign: "left", background: "transparent", color: "var(--np-terminal-text)", cursor: "pointer", padding: "10px 0", borderLeft: "none", borderRight: "none", borderBottom: "none" }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--np-terminal-text)" }}>{result.name || result.title}</div>
                        <div style={{ fontSize: 11, marginTop: 4, ...terminalMutedStyle() }}>
                          {result.entityType}{result.country ? ` | ${result.country}` : ""}
                        </div>
                      </div>
                      <span style={terminalTagStyle({ tone: "cyan", compact: true })}>
                        {result.form || result.tag || result.theme || result.status || result.stage || result.entityType}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: isMobileViewport ? "flex-start" : "flex-end" }}>
            <button type="button" onClick={onRefreshData} className="np-terminal-button" style={terminalButtonStyle(false, { tone: "cyan" })}>
              Refresh feeds
            </button>
            <button type="button" onClick={resetWorkspace} className="np-terminal-button" style={terminalButtonStyle(false)}>
              Reset filters
            </button>
            <button type="button" onClick={onExitTerminal} className="np-terminal-button" style={terminalButtonStyle(false, { tone: "amber" })}>
              Editorial view
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "auto minmax(0,1fr)", gap: 10, alignItems: "start" }}>
          <div style={terminalLabelStyle("cyan")}>Workspace state</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {activeChips.length ? activeChips.map((chip) => (
              <span key={chip} style={terminalTagStyle({ compact: true })}>
                {chip}
              </span>
            )) : (
              <span style={terminalTagStyle({ tone: "cyan", compact: true })}>Global scope // no filters armed</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
