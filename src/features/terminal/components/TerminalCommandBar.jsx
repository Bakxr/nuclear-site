import { useEffect, useState } from "react";
import { useTerminal } from "../context.jsx";
import {
  terminalButtonStyle,
  terminalInputShellStyle,
  terminalInputStyle,
  terminalLabelStyle,
  terminalMutedStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";

function formatFreshness(value) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatClock(now, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  }).format(now);
}

function StatusTile({ label, value, detail, tone = "cyan" }) {
  return (
    <div className="np-terminal-command-tile">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <span style={terminalLabelStyle(tone)}>{label}</span>
        <span style={{ fontSize: 9.5, ...terminalMutedStyle() }}>{detail}</span>
      </div>
      <div style={{ ...terminalValueStyle({ tone, size: 15 }), marginTop: 7 }}>{value}</div>
    </div>
  );
}

function FreshnessBadge({ item }) {
  const tone = item.stale ? "warning" : "success";
  return (
    <div className="np-terminal-command-badge">
      <span style={terminalLabelStyle(tone)}>{item.label}</span>
      <span style={{ ...terminalValueStyle({ tone, size: 12 }), marginLeft: "auto" }}>{formatFreshness(item.updatedAt)}</span>
    </div>
  );
}

export default function TerminalCommandBar({
  isMobileViewport,
  onExitTerminal,
  onRefreshData,
  activeDeskLabel = "Overview",
}) {
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
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeChips = [
    activeDeskLabel,
    state.layer === "uranium" ? "Fuel Cycle" : "Reactor Fleet",
    state.countryFilter ? `Country ${state.countryFilter}` : null,
    state.reactorTypeFilter ? `Type ${state.reactorTypeFilter}` : null,
    state.statusFilter ? `Status ${state.statusFilter}` : null,
    compareEntities.length ? `Compare ${compareEntities.length}` : null,
    watchedSet.size ? `Watch ${watchedSet.size}` : null,
  ].filter(Boolean);
  const clocks = [
    { label: "New York", detail: "Desk", timeZone: "America/New_York", tone: "amber" },
    { label: "UTC", detail: "Base", timeZone: "UTC", tone: "cyan" },
    { label: "Tokyo", detail: "Asia", timeZone: "Asia/Tokyo", tone: "success" },
  ];
  const freshnessItems = Object.values(snapshot.freshness || {}).slice(0, 4);

  return (
    <div className="np-terminal-commandbar">
      <div className="np-terminal-content" style={{ maxWidth: 1840, margin: "0 auto", padding: isMobileViewport ? "8px 10px 10px" : "8px 12px 10px", display: "grid", gap: 8 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(260px,300px) minmax(0,1fr) minmax(260px,320px)",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          <div className="np-terminal-command-card">
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", minWidth: 0 }}>
              <div
                style={{
                  minWidth: 42,
                  height: 42,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid rgba(255,156,26,0.36)",
                  background: "rgba(32,20,8,0.96)",
                  color: "var(--np-terminal-amber)",
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                }}
              >
                NP
              </div>
              <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                <div style={terminalLabelStyle()}>Nuclear Pulse terminal</div>
                <div style={{ fontSize: 16, lineHeight: 1.1, color: "var(--np-terminal-text)", fontWeight: 700 }}>
                  Global nuclear workstation
                </div>
                <div style={{ fontSize: 10.5, lineHeight: 1.5, ...terminalMutedStyle() }}>
                  Desk {activeDeskLabel} | Snapshot {formatFreshness(snapshot.generatedAt)}
                </div>
              </div>
            </div>
          </div>

          <div className="np-terminal-command-card">
            <div style={{ display: "grid", gap: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={terminalLabelStyle("cyan")}>Feed health</span>
                <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{freshnessItems.length} rails</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))", gap: 6 }}>
                {freshnessItems.map((item) => <FreshnessBadge key={item.label} item={item} />)}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobileViewport ? "repeat(3, minmax(0,1fr))" : "1fr",
              gap: 8,
            }}
          >
            {clocks.map((clock) => (
              <StatusTile
                key={clock.label}
                label={clock.label}
                detail={clock.detail}
                tone={clock.tone}
                value={formatClock(now, clock.timeZone)}
              />
            ))}
          </div>
        </div>

        <div
          className="np-terminal-command-card"
          style={{
            display: "grid",
            gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1fr) auto",
            gap: 8,
            alignItems: "start",
          }}
        >
          <div style={{ position: "relative", minWidth: 0 }}>
            <div style={terminalInputShellStyle()}>
              <span style={terminalLabelStyle("cyan")}>Cmd</span>
              <span style={{ ...terminalValueStyle({ tone: "amber", size: 13 }) }}>{">"}</span>
              <input
                id="np-terminal-command-input"
                type="text"
                value={state.query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search plant, country, ticker, filing, project, story"
                style={terminalInputStyle()}
              />
              <span style={terminalTagStyle({ tone: "amber", compact: true })}>/ focus</span>
            </div>

            {state.query.trim() && searchResults.length > 0 ? (
              <div
                style={{
                  position: "absolute",
                  inset: "calc(100% + 4px) 0 auto 0",
                  border: "1px solid rgba(66,72,82,0.98)",
                  background: "rgba(8,10,14,0.995)",
                  boxShadow: "0 18px 38px rgba(0,0,0,0.4)",
                  padding: "0 10px",
                  zIndex: 30,
                  display: "grid",
                  gap: 0,
                }}
              >
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => selectEntity(result)}
                    className="np-terminal-row np-terminal-row--interactive np-terminal-button"
                    style={{
                      borderTop: "1px solid rgba(55,59,68,0.9)",
                      textAlign: "left",
                      background: "transparent",
                      color: "var(--np-terminal-text)",
                      cursor: "pointer",
                      padding: "8px 0",
                      borderLeft: "none",
                      borderRight: "none",
                      borderBottom: "none",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 11.5, color: "var(--np-terminal-text)" }}>
                          {result.name || result.title}
                        </div>
                        <div style={{ fontSize: 10, marginTop: 3, ...terminalMutedStyle() }}>
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

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: isMobileViewport ? "flex-start" : "flex-end" }}>
            <button type="button" onClick={onRefreshData} className="np-terminal-button" style={terminalButtonStyle(false, { tone: "cyan" })}>
              Refresh
            </button>
            <button type="button" onClick={resetWorkspace} className="np-terminal-button" style={terminalButtonStyle(false)}>
              Reset
            </button>
            <button type="button" onClick={onExitTerminal} className="np-terminal-button" style={terminalButtonStyle(false, { tone: "amber" })}>
              Editorial
            </button>
          </div>
        </div>

        <div className="np-terminal-command-card" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={terminalLabelStyle("cyan")}>Desk state</span>
          {activeChips.map((chip, index) => (
            <span key={`${chip}-${index}`} style={terminalTagStyle({ tone: index === 0 ? "amber" : "default", compact: true })}>
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
