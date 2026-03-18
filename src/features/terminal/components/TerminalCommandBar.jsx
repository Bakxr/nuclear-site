import { useEffect, useMemo, useState } from "react";
import { useTerminal } from "../context.jsx";
import {
  terminalInputStyle,
  terminalMutedStyle,
  terminalTagStyle,
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
    hour12: false,
    timeZone,
  }).format(now);
}

function CommandMeta({ label, value, tone = "default", emphasis = "default" }) {
  return (
    <span className="np-terminal-command-meta" data-tone={tone} data-emphasis={emphasis}>
      <span className="np-terminal-command-meta-dot" aria-hidden="true" />
      <span className="np-terminal-command-meta-key">{label}</span>
      <span className="np-terminal-command-meta-value">{value}</span>
    </span>
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
    setQuery,
    selectEntity,
    resetWorkspace,
  } = useTerminal();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const focusLabel = selectedEntity
    ? (selectedEntity.name || selectedEntity.title || selectedEntity.country)
    : "Global scope";
  const freshnessItems = useMemo(() => Object.values(snapshot.freshness || {}).slice(0, 3), [snapshot.freshness]);
  const contextItems = [
    { id: "desk", label: "Desk", value: activeDeskLabel, tone: "default" },
    { id: "layer", label: "Layer", value: state.layer === "uranium" ? "Fuel cycle" : "Fleet layer", tone: state.layer === "uranium" ? "cyan" : "default" },
    { id: "focus", label: "Focus", value: focusLabel, tone: selectedEntity ? "warning" : "default", emphasis: selectedEntity ? "focus" : "default" },
  ];
  const utilityButtons = [
    { id: "refresh", label: "Refresh", onClick: onRefreshData, tone: "cyan" },
    { id: "reset", label: "Reset", onClick: resetWorkspace, tone: "default" },
    { id: "editorial", label: "Editorial", onClick: onExitTerminal, tone: "amber", accent: true },
  ];

  return (
    <div className="np-terminal-commandbar">
      <div
        className="np-terminal-content"
        style={{
          maxWidth: 1840,
          margin: "0 auto",
          padding: isMobileViewport ? "6px 10px 8px" : "6px 12px 8px",
          display: "grid",
          gap: 6,
        }}
      >
        <div className="np-terminal-command-strip">
          <div className="np-terminal-command-primary">
            <div className="np-terminal-command-brand">
              <div className="np-terminal-command-brand-mark">NP</div>
              <div className="np-terminal-command-brand-copy">
                <div className="np-terminal-command-brand-title">Operator intelligence</div>
                <div className="np-terminal-command-brand-subtitle" style={terminalMutedStyle()}>
                  Snapshot {formatFreshness(snapshot.generatedAt)}
                </div>
              </div>
            </div>

            <div className="np-terminal-command-input-region">
              <div className="np-terminal-command-input-shell">
                <span className="np-terminal-command-input-glyph">{">"}</span>
                <input
                  id="np-terminal-command-input"
                  type="text"
                  value={state.query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search plant, country, ticker, filing, project, story"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-label="Terminal command search"
                  style={{ ...terminalInputStyle(), fontSize: 13.5, fontWeight: 500 }}
                />
                <span className="np-terminal-command-input-shortcut">/ focus</span>
              </div>

              {state.query.trim() && searchResults.length > 0 ? (
                <div className="np-terminal-command-results">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => selectEntity(result)}
                      className="np-terminal-command-result np-terminal-row np-terminal-row--interactive np-terminal-button"
                      style={{
                        textAlign: "left",
                        background: "transparent",
                        color: "var(--np-terminal-text)",
                        cursor: "pointer",
                        padding: "11px 0",
                        border: "none",
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

            <div className="np-terminal-command-utilities">
              <div className="np-terminal-command-clockgroup" aria-label="Timezones">
                <span className="np-terminal-command-clock" data-tone="amber">
                  <span className="np-terminal-command-clock-label">New York</span>
                  <span className="np-terminal-command-clock-value">{formatClock(now, "America/New_York")}</span>
                </span>
                <span className="np-terminal-command-clock" data-tone="cyan">
                  <span className="np-terminal-command-clock-label">UTC</span>
                  <span className="np-terminal-command-clock-value">{formatClock(now, "UTC")}</span>
                </span>
              </div>

              <div className="np-terminal-command-actions">
                {utilityButtons.map((button) => (
                  <button
                    key={button.id}
                    type="button"
                    onClick={button.onClick}
                    className="np-terminal-command-action"
                    data-tone={button.tone}
                    data-accent={button.accent ? "true" : "false"}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="np-terminal-command-secondary">
            <div className="np-terminal-command-meta-group np-terminal-command-meta-group--context">
              {contextItems.map((item) => (
                <CommandMeta
                  key={item.id}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                  emphasis={item.emphasis}
                />
              ))}
            </div>

            <div className="np-terminal-command-meta-group np-terminal-command-meta-group--freshness">
              {freshnessItems.map((item) => (
                <CommandMeta
                  key={item.label}
                  label={item.label}
                  value={formatFreshness(item.updatedAt)}
                  tone={item.stale ? "warning" : "success"}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
