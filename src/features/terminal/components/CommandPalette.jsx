import { useEffect, useMemo, useRef, useState } from "react";
// useRef is used for inputRef and listRef below.
import { useTerminal } from "../context.jsx";
import { dispatchDeskChange } from "../hooks/useTerminalShortcuts.js";
import {
  borderHairline,
  color,
  fontMono,
  fontSans,
  kbdStyle,
  radius,
} from "./tokens.js";

const RECENTS_KEY = "np-terminal-recents";
const MAX_RECENTS = 5;

const DESKS = [
  { id: "overview", label: "Overview", hotkey: "1" },
  { id: "map", label: "Map", hotkey: "2" },
  { id: "fuel", label: "Fuel cycle", hotkey: "3" },
  { id: "markets", label: "Markets", hotkey: "4" },
  { id: "pipeline", label: "Pipeline", hotkey: "5" },
  { id: "filings", label: "Filings", hotkey: "6" },
];

const ENTITY_GROUP_ORDER = [
  ["plant", "Plants"],
  ["country", "Countries"],
  ["company", "Companies"],
  ["story", "Stories"],
  ["project", "Projects"],
  ["filing", "Filings"],
  ["operationsSignal", "Operations"],
  ["sourceBrief", "Sources"],
  ["supplySite", "Supply sites"],
];
const GROUP_LABEL = new Map(ENTITY_GROUP_ORDER);

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  zIndex: 1000,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
};

const panelStyle = {
  marginTop: "18vh",
  width: "min(640px, calc(100vw - 32px))",
  maxHeight: "64vh",
  display: "flex",
  flexDirection: "column",
  border: borderHairline,
  borderRadius: radius.md,
  background: color.panel,
  boxShadow: "none",
  overflow: "hidden",
  fontFamily: fontSans,
};

const inputShellStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  borderBottom: borderHairline,
  background: "rgba(0,0,0,0.18)",
};

const inputStyle = {
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  color: color.text,
  fontFamily: fontMono,
  fontSize: 13,
};

const listStyle = {
  overflowY: "auto",
  flex: 1,
};

const sectionHeaderStyle = {
  fontFamily: fontMono,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: color.textMuted,
  padding: "12px 14px 4px",
};

const rowBaseStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 12,
  alignItems: "center",
  padding: "8px 14px",
  borderTop: borderHairline,
  cursor: "pointer",
  background: "transparent",
  border: "none",
  width: "100%",
  textAlign: "left",
};

const rowActiveStyle = {
  background: "rgba(216,160,74,0.08)",
};

const primaryStyle = {
  fontFamily: fontSans,
  fontSize: 13,
  fontWeight: 600,
  color: color.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const secondaryStyle = {
  fontFamily: fontMono,
  fontSize: 10.5,
  color: color.textMuted,
  marginTop: 3,
};

const chipStyle = {
  fontFamily: fontMono,
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: color.textMuted,
  border: borderHairline,
  borderRadius: radius.sm,
  padding: "1px 6px",
};

const footerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "8px 14px",
  borderTop: borderHairline,
  fontFamily: fontMono,
  fontSize: 10,
  color: color.textMuted,
};

function readRecents() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecents(ids) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(ids.slice(0, MAX_RECENTS)));
  } catch {
    /* ignore */
  }
}

function detectDeskIntent(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const match = /^(?:go|goto)\s+(.+)$/.exec(q);
  if (!match) return null;
  const target = match[1].trim();
  return DESKS.find((desk) => desk.label.toLowerCase().startsWith(target) || desk.id.startsWith(target)) || null;
}

export default function CommandPalette({ open, onClose }) {
  const { searchResults, selectEntity, state, setQuery, getEntityById } = useTerminal();
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState(() => readRecents());
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Lock body scroll + focus the input + clear stale query when the modal
  // opens. Component unmounts when `open` flips to false (see early return),
  // so this effect only runs on the open-transition.
  useEffect(() => {
    if (!open) return undefined;
    setQuery("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
    // setQuery is stable from useReducer; intentionally not in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Build flat list of selectable items with their group/section. Each item is
  // { kind: "desk"|"entity"|"action", id, label, secondary, group, payload }.
  const { sections, flatItems } = useMemo(() => {
    const built = [];
    const flat = [];

    const pushSection = (title, items) => {
      if (!items.length) return;
      built.push({ title, items });
      items.forEach((item) => flat.push(item));
    };

    const trimmed = state.query.trim();
    const deskIntent = detectDeskIntent(state.query);

    if (deskIntent) {
      pushSection("Jump to desk", [{
        kind: "desk",
        id: `desk-${deskIntent.id}`,
        label: `Open ${deskIntent.label}`,
        secondary: `desk · ${deskIntent.id}`,
        chip: deskIntent.hotkey,
        payload: deskIntent,
      }]);
    }

    if (!trimmed) {
      // Empty query: show Recents + Quick actions.
      const recents = recentIds
        .map((id) => getEntityById(id))
        .filter(Boolean);
      if (recents.length) {
        pushSection("Recent", recents.map((entity) => ({
          kind: "entity",
          id: `recent-${entity.id}`,
          label: entity.name || entity.title || entity.country || "—",
          secondary: `${entity.entityType}${entity.country ? ` · ${entity.country}` : ""}`,
          chip: entity.entityType,
          payload: entity,
        })));
      }

      pushSection("Quick actions", [
        ...DESKS.map((desk) => ({
          kind: "desk",
          id: `desk-${desk.id}`,
          label: `Open ${desk.label}`,
          secondary: `desk · ${desk.id}`,
          chip: desk.hotkey,
          payload: desk,
        })),
        {
          kind: "action",
          id: "action-toggle-theme",
          label: "Toggle theme",
          secondary: "ui · theme",
          chip: "todo",
          // TODO: wire this once theme toggle exists.
          payload: { type: "toggle-theme" },
        },
        {
          kind: "action",
          id: "action-open-help",
          label: "Open shortcuts help",
          secondary: "help · ?",
          chip: "?",
          payload: { type: "open-help" },
        },
      ]);
    } else {
      // Group search results by entityType.
      const groups = new Map();
      for (const result of searchResults) {
        const type = result.entityType || "other";
        if (!groups.has(type)) groups.set(type, []);
        groups.get(type).push(result);
      }

      for (const [type, label] of ENTITY_GROUP_ORDER) {
        const rows = groups.get(type);
        if (!rows || !rows.length) continue;
        pushSection(label, rows.map((entity) => ({
          kind: "entity",
          id: `result-${entity.id}`,
          label: entity.name || entity.title || entity.country || "—",
          secondary: `${entity.entityType}${entity.country ? ` · ${entity.country}` : ""}`,
          chip: entity.form || entity.tag || entity.theme || entity.status || entity.stage || entity.entityType,
          payload: entity,
        })));
        groups.delete(type);
      }
      // Any remaining ungrouped types.
      for (const [type, rows] of groups.entries()) {
        pushSection(GROUP_LABEL.get(type) || type, rows.map((entity) => ({
          kind: "entity",
          id: `result-${entity.id}`,
          label: entity.name || entity.title || entity.country || "—",
          secondary: entity.entityType,
          chip: entity.entityType,
          payload: entity,
        })));
      }
    }

    return { sections: built, flatItems: flat };
  }, [state.query, searchResults, recentIds, getEntityById]);

  // Clamp active index (derived during render — no effect needed).
  const safeActiveIndex = flatItems.length === 0
    ? 0
    : activeIndex >= flatItems.length ? 0 : activeIndex;

  function commitRecent(entityId) {
    setRecentIds((prev) => {
      const next = [entityId, ...prev.filter((id) => id !== entityId)].slice(0, MAX_RECENTS);
      writeRecents(next);
      return next;
    });
  }

  function runItem(item) {
    if (!item) return;
    if (item.kind === "desk") {
      dispatchDeskChange(item.payload.id);
      onClose();
      return;
    }
    if (item.kind === "entity") {
      selectEntity(item.payload);
      commitRecent(item.payload.id);
      onClose();
      return;
    }
    if (item.kind === "action") {
      if (item.payload.type === "open-help") {
        onClose();
        // Defer so the palette close fires first; dispatch a custom event so
        // the shell can open help. Simpler: rely on the `?` key — here we
        // just close and the user can press `?`. We expose a dedicated event.
        window.dispatchEvent(new CustomEvent("np-terminal-open-help"));
        return;
      }
      // toggle-theme is a no-op for now.
      onClose();
    }
  }

  function onKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((idx) => (flatItems.length ? (idx + 1) % flatItems.length : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((idx) => (flatItems.length ? (idx - 1 + flatItems.length) % flatItems.length : 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      runItem(flatItems[safeActiveIndex]);
    }
  }

  // Keep active row visible.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-cp-index="${safeActiveIndex}"]`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [safeActiveIndex]);

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div
      style={backdropStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div style={panelStyle} onMouseDown={(event) => event.stopPropagation()}>
        <div style={inputShellStyle}>
          <span style={{ color: color.textFaint, fontFamily: fontMono, fontSize: 13 }}>{">"}</span>
          <input
            ref={inputRef}
            type="text"
            value={state.query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search plants, companies, filings — or type 'go markets'"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            style={inputStyle}
            aria-label="Command palette search"
          />
          <kbd style={kbdStyle()}>esc</kbd>
        </div>

        <div ref={listRef} style={listStyle}>
          {sections.length === 0 ? (
            <div style={{ padding: "20px 14px", fontSize: 12, color: color.textMuted, fontFamily: fontSans }}>
              No matches.
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.title}>
                <div style={sectionHeaderStyle}>{section.title}</div>
                {section.items.map((item) => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  const isActive = idx === safeActiveIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-cp-index={idx}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => runItem(item)}
                      style={{ ...rowBaseStyle, ...(isActive ? rowActiveStyle : null) }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={primaryStyle}>{item.label}</div>
                        <div style={secondaryStyle}>{item.secondary}</div>
                      </div>
                      {item.chip ? <span style={chipStyle}>{item.chip}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div style={footerStyle}>
          <span>
            <kbd style={kbdStyle()}>↑</kbd> <kbd style={kbdStyle()}>↓</kbd> navigate
            {"  ·  "}
            <kbd style={kbdStyle()}>↵</kbd> select
            {"  ·  "}
            <kbd style={kbdStyle()}>esc</kbd> close
          </span>
          <span><kbd style={kbdStyle()}>/</kbd> search</span>
        </div>
      </div>
    </div>
  );
}
