import { useEffect, useMemo, useState } from "react";
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

function FreshnessBadge({ item }) {
  const tone = item.stale ? "warning" : "success";
  return (
    <div className="np-terminal-command-badge np-terminal-command-badge--dense">
      <span style={terminalLabelStyle(tone)}>{item.label}</span>
      <span style={{ ...terminalValueStyle({ tone, size: 10.5 }), marginLeft: "auto" }}>{formatFreshness(item.updatedAt)}</span>
    </div>
  );
}

function ClockBadge({ label, time, tone = "cyan" }) {
  return (
    <div className="np-terminal-command-badge np-terminal-command-badge--dense" style={{ minWidth: 96 }}>
      <span style={terminalLabelStyle(tone)}>{label}</span>
      <span style={{ ...terminalValueStyle({ tone, size: 10.5 }), marginLeft: "auto" }}>{time}</span>
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
    selectedEntity,
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

  const focusLabel = selectedEntity
    ? (selectedEntity.name || selectedEntity.title || selectedEntity.country)
    : "Global scope";
  const freshnessItems = useMemo(() => Object.values(snapshot.freshness || {}).slice(0, 3), [snapshot.freshness]);
  const deskStateChips = [
    { value: activeDeskLabel, tone: "default" },
    { value: state.layer === "uranium" ? "Fuel cycle" : "Fleet layer", tone: state.layer === "uranium" ? "cyan" : "default" },
    selectedEntity ? { value: selectedEntity.entityType, tone: "warning" } : null,
    compareEntities.length ? { value: `Compare ${compareEntities.length}`, tone: "cyan" } : null,
    watchedSet.size ? { value: `Watch ${watchedSet.size}`, tone: "success" } : null,
  ].filter(Boolean);

  return (
    <div className="np-terminal-commandbar">
      <div
        className="np-terminal-content"
        style={{
          maxWidth: 1840,
          margin: "0 auto",
          padding: isMobileViewport ? "8px 10px 10px" : "8px 12px 10px",
          display: "grid",
          gap: 8,
        }}
      >
        <div className="np-terminal-command-deck">
          <div className="np-terminal-command-zone np-terminal-command-zone--identity" style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", minWidth: 0 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 11,
                  border: "1px solid rgba(125,139,156,0.08)",
                  background: "rgba(255,255,255,0.014)",
                  color: "rgba(216,160,74,0.82)",
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  flexShrink: 0,
                }}
              >
                NP
              </div>
              <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                <div style={terminalLabelStyle("cyan")}>Command</div>
                <div style={{ fontSize: 16, lineHeight: 1.02, fontWeight: 650, color: "rgba(237,241,245,0.9)" }}>
                  Operator intelligence
                </div>
                <div style={{ fontSize: 10, lineHeight: 1.45, maxWidth: 186, ...terminalMutedStyle() }}>
                  Follow fleet status, source health, filings, and market context from one synchronized workspace.
                </div>
              </div>
            </div>

            <div className="np-terminal-command-footer-group" style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", opacity: 0.92 }}>
              <span style={terminalTagStyle({ tone: "default", compact: true })}>{activeDeskLabel}</span>
              <span style={terminalTagStyle({ tone: "default", compact: true })}>Snapshot {formatFreshness(snapshot.generatedAt)}</span>
              <span style={terminalTagStyle({ tone: selectedEntity ? "warning" : "default", compact: true })}>{focusLabel}</span>
            </div>
          </div>

          <div className="np-terminal-command-zone np-terminal-command-zone--search" style={{ position: "relative", minWidth: 0, display: "grid", gap: 8 }}>
            <div style={{ ...terminalInputShellStyle(), width: "100%", maxWidth: isMobileViewport ? "100%" : 980, padding: "8px 10px", borderRadius: 12, gap: 8 }}>
              <span style={terminalLabelStyle("cyan")}>Command</span>
              <span style={{ ...terminalValueStyle({ tone: "amber", size: 12 }) }}>{">"}</span>
              <input
                id="np-terminal-command-input"
                type="text"
                value={state.query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search plant, country, ticker, filing, project, story"
                style={{ ...terminalInputStyle(), fontSize: 12.5 }}
              />
              <span style={terminalTagStyle({ tone: "amber", compact: true })}>/ focus</span>
            </div>

            <div
              className="np-terminal-command-secondary-row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div className="np-terminal-command-pill-group" style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                {freshnessItems.map((item) => <FreshnessBadge key={item.label} item={item} />)}
              </div>

              <div className="np-terminal-command-pill-group np-terminal-command-pill-group--right" style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: isMobileViewport ? "flex-start" : "flex-end" }}>
                {deskStateChips.map((chip) => (
                  <span key={`${chip.value}-${chip.tone}`} style={terminalTagStyle({ tone: chip.tone, compact: true })}>
                    {chip.value}
                  </span>
                ))}
              </div>
            </div>

            {state.query.trim() && searchResults.length > 0 ? (
              <div
                style={{
                  position: "absolute",
                  inset: "calc(100% + 6px) 0 auto 0",
                  border: "1px solid rgba(125,139,156,0.18)",
                  borderRadius: 18,
                  background: "rgba(15,20,27,0.98)",
                  boxShadow: "0 22px 46px rgba(0,0,0,0.38)",
                  padding: "0 14px",
                  zIndex: 30,
                  display: "grid",
                  gap: 0,
                  overflow: "hidden",
                }}
              >
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => selectEntity(result)}
                    className="np-terminal-row np-terminal-row--interactive np-terminal-button"
                    style={{
                      borderTop: "1px solid rgba(125,139,156,0.11)",
                      textAlign: "left",
                      background: "transparent",
                      color: "var(--np-terminal-text)",
                      cursor: "pointer",
                      padding: "11px 0",
                      borderLeft: "none",
                      borderRight: "none",
                      borderBottom: "none",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--np-terminal-text)" }}>
                          {result.name || result.title}
                        </div>
                        <div style={{ fontSize: 10.5, marginTop: 4, ...terminalMutedStyle() }}>
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

          <div className="np-terminal-command-zone np-terminal-command-zone--actions" style={{ display: "grid", gap: 8, alignContent: "space-between" }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: isMobileViewport ? "flex-start" : "flex-end" }}>
              <button type="button" onClick={onRefreshData} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true, tone: "cyan" })}>
                Refresh
              </button>
              <button type="button" onClick={resetWorkspace} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true })}>
                Reset
              </button>
              <button type="button" onClick={onExitTerminal} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true, tone: "amber" })}>
                Editorial
              </button>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: isMobileViewport ? "flex-start" : "flex-end" }}>
                <ClockBadge label="New York" tone="amber" time={formatClock(now, "America/New_York")} />
                <ClockBadge label="UTC" tone="cyan" time={formatClock(now, "UTC")} />
              </div>
              <div style={{ fontSize: 9.75, lineHeight: 1.4, textAlign: isMobileViewport ? "left" : "right", maxWidth: isMobileViewport ? "none" : 186, justifySelf: isMobileViewport ? "start" : "end", ...terminalMutedStyle() }}>
                Search, hotkeys, and focus stay synchronized across the workspace.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
