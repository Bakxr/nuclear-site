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

function ClockTile({ label, time, detail, tone = "cyan" }) {
  return (
    <div className="np-terminal-band-cell">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <span style={terminalLabelStyle(tone)}>{label}</span>
        <span style={{ fontSize: 9.5, ...terminalMutedStyle() }}>{detail}</span>
      </div>
      <div style={{ ...terminalValueStyle({ tone, size: 18 }), marginTop: 8 }}>{time}</div>
    </div>
  );
}

function FreshnessTile({ item }) {
  const tone = item.stale ? "amber" : "success";
  return (
    <div className="np-terminal-band-cell">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <span style={terminalLabelStyle(tone)}>{item.label}</span>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: item.stale ? "var(--np-terminal-amber)" : "var(--np-terminal-green)",
            boxShadow: `0 0 12px ${item.stale ? "rgba(255,159,28,0.5)" : "rgba(125,255,155,0.45)"}`,
            flexShrink: 0,
          }}
        />
      </div>
      <div style={{ ...terminalValueStyle({ tone, size: 16 }), marginTop: 8 }}>{formatFreshness(item.updatedAt)}</div>
    </div>
  );
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
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeChips = [
    state.layer === "uranium" ? "fuel cycle" : "reactor fleet",
    state.countryFilter ? `ctry ${state.countryFilter}` : null,
    state.reactorTypeFilter ? `type ${state.reactorTypeFilter}` : null,
    state.statusFilter ? `status ${state.statusFilter}` : null,
    compareEntities.length ? `compare ${compareEntities.length}` : null,
    watchedSet.size ? `watch ${watchedSet.size}` : null,
  ].filter(Boolean);
  const clocks = [
    { label: "New York", detail: "EDT", timeZone: "America/New_York", tone: "amber" },
    { label: "UTC", detail: "Coordinated", timeZone: "UTC", tone: "cyan" },
    { label: "London", detail: "GMT/BST", timeZone: "Europe/London", tone: "cyan" },
    { label: "Tokyo", detail: "JST", timeZone: "Asia/Tokyo", tone: "success" },
  ];
  const freshnessItems = Object.values(snapshot.freshness || {});

  return (
    <div className="np-terminal-commandbar">
      <div
        className="np-terminal-content"
        style={{
          maxWidth: 1800,
          margin: "0 auto",
          padding: isMobileViewport ? "8px 10px 10px" : "8px 12px 10px",
          display: "grid",
          gap: 8,
        }}
      >
        <div
          className="np-terminal-band"
          style={{
            display: "grid",
            gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(220px,260px) minmax(0,1fr) minmax(280px,360px)",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          <div className="np-terminal-band-cell" style={{ display: "grid", gap: 6 }}>
            <div style={terminalLabelStyle()}>Nuclear terminal</div>
            <div style={{ ...terminalValueStyle({ tone: "amber", size: isMobileViewport ? 18 : 20 }) }}>
              Fleet / fuel / filings / tape
            </div>
            <div style={{ fontSize: 10.5, lineHeight: 1.5, ...terminalMutedStyle() }}>
              Compact operating picture for reactors, uranium assets, filings, and catalyst-linked market context.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))",
              gap: 8,
            }}
          >
            {clocks.map((clock) => (
              <ClockTile
                key={clock.label}
                label={clock.label}
                detail={clock.detail}
                tone={clock.tone}
                time={formatClock(now, clock.timeZone)}
              />
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: freshnessItems.length > 2 && !isMobileViewport ? "repeat(2, minmax(0,1fr))" : "1fr",
              gap: 8,
            }}
          >
            {freshnessItems.map((item) => <FreshnessTile key={item.label} item={item} />)}
          </div>
        </div>

        <div
          className="np-terminal-band"
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
              <span style={{ ...terminalValueStyle({ tone: "amber", size: 14 }) }}>{">"}</span>
              <input
                type="text"
                value={state.query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search plant, country, ticker, filing, project, story"
                style={terminalInputStyle()}
              />
              <span style={terminalTagStyle({ tone: "cyan", compact: true })}>live query</span>
            </div>

            {state.query.trim() && searchResults.length > 0 ? (
              <div
                style={{
                  position: "absolute",
                  inset: "calc(100% + 4px) 0 auto 0",
                  border: "1px solid rgba(55,68,88,0.96)",
                  background: "rgba(7,10,15,0.99)",
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
                      borderTop: "1px solid rgba(51,66,86,0.78)",
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
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1fr) auto",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
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

        <div className="np-terminal-band" style={{ display: "grid", gap: 6 }}>
          <div style={terminalLabelStyle("cyan")}>Workspace state</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {activeChips.length ? activeChips.map((chip) => (
              <span key={chip} style={terminalTagStyle({ compact: true })}>
                {chip}
              </span>
            )) : (
              <span style={terminalTagStyle({ tone: "cyan", compact: true })}>global scope</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
