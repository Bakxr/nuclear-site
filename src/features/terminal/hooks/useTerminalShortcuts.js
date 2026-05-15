import { useEffect } from "react";
import { useTerminal } from "../context.jsx";

// Global keyboard shortcuts for the /terminal route.
//
// NOTE: desk hotkeys (1-6) and `go <desk>` palette intents dispatch a
// CustomEvent "np-terminal-desk" on window. NuclearTerminal.jsx is expected
// to attach a listener that maps `detail.deskId` to its existing
// `activateDesk` callback. TODO: wire that listener in NuclearTerminal.jsx
// in the follow-up commit.
function isTypingSurface(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function isCommandKey(event) {
  // ⌘ on mac, Ctrl elsewhere.
  return event.key === "k" || event.key === "K"
    ? (event.metaKey || event.ctrlKey)
    : false;
}

export function dispatchDeskChange(deskId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("np-terminal-desk", { detail: { deskId } }));
}

const DESK_BY_DIGIT = {
  1: "overview",
  2: "map",
  3: "fuel",
  4: "markets",
  5: "pipeline",
  6: "filings",
};

export default function useTerminalShortcuts() {
  const {
    state,
    openPalette,
    closePalette,
    closeHelp,
    toggleHelp,
  } = useTerminal();
  const paletteOpen = state?.paletteOpen;
  const helpOpen = state?.helpOpen;

  useEffect(() => {
    function onKeyDown(event) {
      // ⌘K / Ctrl+K is global — works even inside inputs.
      if (isCommandKey(event)) {
        event.preventDefault();
        if (paletteOpen) closePalette();
        else openPalette();
        return;
      }

      if (event.key === "Escape") {
        if (paletteOpen) {
          event.preventDefault();
          closePalette();
          return;
        }
        if (helpOpen) {
          event.preventDefault();
          closeHelp();
          return;
        }
        return;
      }

      // The rest of the shortcuts are blocked when typing in a field.
      if (isTypingSurface(event.target)) return;

      if (event.key === "/") {
        event.preventDefault();
        openPalette();
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        toggleHelp();
        return;
      }

      if (!paletteOpen && !helpOpen) {
        const deskId = DESK_BY_DIGIT[event.key];
        if (deskId) {
          event.preventDefault();
          dispatchDeskChange(deskId);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen, helpOpen, openPalette, closePalette, closeHelp, toggleHelp]);
}
