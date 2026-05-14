import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTagStyle,
} from "./styles.js";

const ENTITY_TYPE_TONE = {
  company: "amber",
  plant: "cyan",
  country: "cyan",
  project: "success",
  story: "warning",
  filing: "amber",
  supplySite: "success",
  operationsSignal: "warning",
  sourceBrief: "default",
};

function toneForType(type) {
  return ENTITY_TYPE_TONE[type] || "default";
}

function compareCreatedDesc(a, b) {
  const aT = a?.created_at ? new Date(a.created_at).getTime() : 0;
  const bT = b?.created_at ? new Date(b.created_at).getTime() : 0;
  return bT - aT;
}

export default function WatchlistPanel() {
  const { watchlistEntries = [], watchedSet, toggleWatch, selectEntity, getEntityById: lookupEntity } = useTerminal();

  // Some IDs may exist in `watchedSet` without metadata (e.g. starred before
  // hydration). Fold those in as best-effort rows using the entity index.
  const knownIds = new Set(watchlistEntries.map((row) => row.entity_id));
  const supplemental = [];
  watchedSet.forEach((id) => {
    if (knownIds.has(id)) return;
    const entity = typeof lookupEntity === "function" ? lookupEntity(id) : null;
    supplemental.push({
      entity_id: id,
      entity_type: entity?.entityType || "unknown",
      entity_label: entity?.name || entity?.title || entity?.ticker || entity?.country || id,
      created_at: null,
    });
  });

  const rows = [...watchlistEntries, ...supplemental].sort(compareCreatedDesc);

  return (
    <TerminalPanel
      panelId="terminal-panel-watchlist"
      title="Watchlist"
      subtitle="Pinned entities synced across devices."
      actions={[
        <span key="count" style={terminalTagStyle({ tone: "amber", compact: true })}>
          {rows.length} pinned
        </span>,
      ]}
    >
      <div style={{ display: "grid", gap: 6 }}>
        {rows.length === 0 ? (
          <div style={{ padding: "16px 12px", fontSize: 11.5, lineHeight: 1.55, ...terminalMutedStyle() }}>
            Star any plant, ticker, or project — it'll appear here across devices.
          </div>
        ) : (
          <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(280), padding: "0 10px" }}>
            {rows.map((row) => (
              <div
                key={row.entity_id}
                className="np-terminal-row np-terminal-row--interactive"
                style={{
                  display: "grid",
                  gridTemplateColumns: "84px minmax(0,1fr) 22px",
                  gap: 10,
                  alignItems: "center",
                  borderTop: "1px solid var(--np-terminal-border)",
                  padding: "6px 0",
                }}
              >
                <span style={terminalTagStyle({ tone: toneForType(row.entity_type), compact: true })}>
                  {row.entity_type}
                </span>
                <button
                  type="button"
                  onClick={() => selectEntity(row.entity_id)}
                  className="np-terminal-button"
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: "var(--np-terminal-text)",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    minWidth: 0,
                  }}
                  title={row.entity_label}
                >
                  {row.entity_label}
                </button>
                <button
                  type="button"
                  onClick={() => toggleWatch(row.entity_id)}
                  className="np-terminal-button"
                  style={{
                    appearance: "none",
                    background: "transparent",
                    border: "none",
                    color: "var(--np-terminal-muted)",
                    cursor: "pointer",
                    fontSize: 14,
                    lineHeight: 1,
                    padding: 0,
                    width: 18,
                    height: 18,
                  }}
                  aria-label={`Remove ${row.entity_label} from watchlist`}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </TerminalPanel>
  );
}
