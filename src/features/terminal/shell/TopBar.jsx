import { useEffect, useState } from "react";
import { DESKS } from "./desks.js";
import { fmtAgo, fmtClock, usMarketSession } from "./format.js";


// Snapshot older than this is flagged as delayed in the status indicator.
const STALE_AFTER_MS = 30 * 60 * 1000;

function AtomMark() {
  return (
    <svg className="npt-brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="2.2" fill="#d4a54a" />
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#d4a54a" strokeWidth="1.2" opacity="0.9" />
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#d4a54a" strokeWidth="1.2" opacity="0.55" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#d4a54a" strokeWidth="1.2" opacity="0.35" transform="rotate(-60 12 12)" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export default function TopBar({ desk, onDeskChange, onOpenSearch, onRefresh, refreshing, onExit, generatedAt }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const session = usMarketSession(now);
  const ageMs = generatedAt ? now.getTime() - new Date(generatedAt).getTime() : Infinity;
  const feedState = ageMs < STALE_AFTER_MS ? "live" : "stale";
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");

  return (
    <header className="npt-topbar">
      <button type="button" className="npt-brand" onClick={() => onDeskChange("overview")} aria-label="Nuclear Pulse Terminal — overview">
        <AtomMark />
        <span className="npt-brand-word">Nuclear <em>Pulse</em></span>
        <span className="npt-pro">PRO</span>
      </button>

      <nav className="npt-tabs" role="tablist" aria-label="Desks">
        {DESKS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={desk === item.id}
            className="npt-tab"
            onClick={() => onDeskChange(item.id)}
          >
            {item.label}
            <span className="npt-tab-key">{item.key}</span>
          </button>
        ))}
      </nav>

      <div className="npt-topbar-right">
        <button type="button" className="npt-search" onClick={onOpenSearch} aria-label="Search the terminal">
          <SearchIcon />
          <span>Search</span>
          <kbd className="npt-kbd">{isMac ? "⌘K" : "Ctrl K"}</kbd>
        </button>

        <span className="npt-status npt-status--session" title={session.label}>
          <i className="npt-dot" data-state={session.id} />
          {session.label.toUpperCase()}
        </span>

        <span className="npt-status npt-status--clock" title="New York · London · UTC">
          NY {fmtClock(now, "America/New_York")} · LDN {fmtClock(now, "Europe/London")}
        </span>

        <span className="npt-status" title={generatedAt ? `Snapshot ${new Date(generatedAt).toLocaleString()}` : "No snapshot"}>
          <i className="npt-dot" data-state={feedState} />
          {feedState === "live" ? "LIVE" : "DELAYED"} · {fmtAgo(generatedAt, now.getTime())}
        </span>

        <button type="button" className="npt-icon-btn" onClick={onRefresh} data-busy={refreshing ? "true" : "false"} aria-label="Refresh data" title="Refresh data (R)">
          <RefreshIcon />
        </button>
        <button type="button" className="npt-icon-btn" onClick={onExit} aria-label="Back to editorial site" title="Back to editorial site">
          <ExitIcon />
        </button>
      </div>
    </header>
  );
}
