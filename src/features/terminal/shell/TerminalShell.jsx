import { useCallback, useEffect, useState } from "react";
import { useTerminal } from "../context.jsx";
import useTerminalShortcuts from "../hooks/useTerminalShortcuts.js";
import CommandPalette from "../components/CommandPalette.jsx";
import ShortcutsHelp from "../components/ShortcutsHelp.jsx";
import MarketFocusDrawer from "../components/MarketFocusDrawer.jsx";
import GovContractsPanel from "../components/GovContractsPanel.jsx";
import LobbyingPanel from "../components/LobbyingPanel.jsx";
import TopBar from "./TopBar.jsx";
import { DESKS } from "./desks.js";
import TickerTape from "./TickerTape.jsx";
import KpiBand from "./KpiBand.jsx";
import MarketBoard from "./MarketBoard.jsx";
import OddsBoard from "./OddsBoard.jsx";
import NewsWire from "./NewsWire.jsx";
import GlobePanel from "./GlobePanel.jsx";
import Inspector from "./Inspector.jsx";
import CatalystCalendar from "./CatalystCalendar.jsx";
import UnitStatus from "./UnitStatus.jsx";
import InsiderBoard from "./InsiderBoard.jsx";
import { NrcNotices, SecFilings } from "./RegulatoryFeeds.jsx";
import { CountryTable, ProjectTable } from "./FleetTables.jsx";
import DataSources from "./DataSources.jsx";
import { getSourceStatus } from "./sourceStatus.js";
import { fmtAgo } from "./format.js";
import "./terminal.css";

const DESK_STORAGE_KEY = "np-terminal-desk";

function readStoredDesk() {
  try {
    const stored = window.localStorage.getItem(DESK_STORAGE_KEY);
    return DESKS.some((desk) => desk.id === stored) ? stored : "overview";
  } catch {
    return "overview";
  }
}

function Cell({ area, children }) {
  return <div className="npt-cell" style={{ gridArea: area }}>{children}</div>;
}

function RegulatoryDesk() {
  const { contractRows, lobbyingRows } = useTerminal();
  // SAM.gov needs SAM_API_KEY and Senate LDA may refuse the server — show
  // those panels only when they actually have data, and say so when not.
  const offline = [
    !contractRows.length && "federal contracts (SAM.gov)",
    !lobbyingRows.length && "lobbying disclosures (Senate LDA)",
  ].filter(Boolean);
  const hasSecondRow = contractRows.length || lobbyingRows.length;

  return (
    <div className="npt-desk npt-desk--regulatory" data-rows={hasSecondRow ? "2" : "1"}>
      <Cell area="dockets"><NrcNotices /></Cell>
      <Cell area="filings"><SecFilings /></Cell>
      {contractRows.length ? <Cell area="contracts"><GovContractsPanel /></Cell> : null}
      {lobbyingRows.length ? <Cell area="lobbying"><LobbyingPanel /></Cell> : null}
      {offline.length ? (
        <p className="npt-desk-note">Offline in this snapshot: {offline.join(" and ")}.</p>
      ) : null}
    </div>
  );
}

function DeskContent({ desk, GlobeComponent }) {
  if (desk === "markets") {
    return (
      <div className="npt-desk npt-desk--markets">
        <Cell area="board"><MarketBoard /></Cell>
        <Cell area="odds"><OddsBoard /></Cell>
        <Cell area="insider"><InsiderBoard /></Cell>
        <Cell area="cal"><CatalystCalendar /></Cell>
      </div>
    );
  }
  if (desk === "fleet") {
    return (
      <div className="npt-desk npt-desk--fleet">
        <Cell area="globe"><GlobePanel GlobeComponent={GlobeComponent} /></Cell>
        <Cell area="fleet"><CountryTable /></Cell>
        <Cell area="ops"><UnitStatus /></Cell>
        <Cell area="pipeline"><ProjectTable /></Cell>
      </div>
    );
  }
  if (desk === "regulatory") return <RegulatoryDesk />;
  if (desk === "wire") {
    return (
      <div className="npt-desk npt-desk--wire">
        <Cell area="wire"><NewsWire full /></Cell>
        <Cell area="sources"><DataSources /></Cell>
      </div>
    );
  }
  return (
    <div className="npt-desk npt-desk--overview">
      <Cell area="board"><MarketBoard compact /></Cell>
      <Cell area="globe"><GlobePanel GlobeComponent={GlobeComponent} /></Cell>
      <Cell area="wire"><NewsWire /></Cell>
      <Cell area="odds"><OddsBoard compact /></Cell>
      <Cell area="cal"><CatalystCalendar /></Cell>
      <Cell area="ops"><UnitStatus /></Cell>
    </div>
  );
}

function StatusBar({ onShowSources }) {
  const { snapshot } = useTerminal();
  const feeds = getSourceStatus(snapshot).filter((feed) => !feed.baseline);
  const live = feeds.filter((feed) => feed.state === "live").length;
  const problems = feeds.filter((feed) => feed.state !== "live");
  return (
    <footer className="npt-statusbar">
      <button type="button" className="npt-statusbar-item" onClick={onShowSources} style={{ border: 0, background: "none", color: "inherit", font: "inherit", cursor: "pointer", padding: 0 }}>
        <i className="npt-dot" data-state={problems.length ? "stale" : "live"} style={{ animation: "none", width: 6, height: 6 }} />
        {live}/{feeds.length} feeds live
      </button>
      {problems.map((feed) => (
        <span key={feed.key} className="npt-statusbar-item" title={feed.source}>
          {feed.label}: {feed.state === "empty" ? "no data" : `delayed ${fmtAgo(feed.updatedAt)}`}
        </span>
      ))}
      <span className="npt-statusbar-item">Snapshot {fmtAgo(snapshot?.generatedAt)}</span>
      <span className="npt-statusbar-spacer" />
      <span className="npt-statusbar-item">Not investment advice</span>
      <a className="npt-statusbar-item" href="/legal/terms.html" style={{ color: "inherit" }}>Terms</a>
      <a className="npt-statusbar-item" href="/legal/privacy.html" style={{ color: "inherit" }}>Privacy</a>
      <span className="npt-statusbar-item"><kbd className="npt-kbd">/</kbd> search</span>
      <span className="npt-statusbar-item"><kbd className="npt-kbd">1–5</kbd> desks</span>
      <span className="npt-statusbar-item"><kbd className="npt-kbd">Esc</kbd> clear</span>
      <span className="npt-statusbar-item"><kbd className="npt-kbd">?</kbd> shortcuts</span>
    </footer>
  );
}

export default function TerminalShell({ GlobeComponent, onOpenPlant, onExitTerminal, onRefreshData }) {
  const { snapshot, state, openPalette, closePalette, closeHelp, clearSelection, selectedEntity, selectedMarket, closeMarket, setQuery } = useTerminal();
  const [desk, setDesk] = useState(readStoredDesk);
  const [refreshing, setRefreshing] = useState(false);

  const changeDesk = useCallback((next) => {
    setDesk(next);
    try { window.localStorage.setItem(DESK_STORAGE_KEY, next); } catch { /* storage unavailable */ }
  }, []);

  const refresh = useCallback(async () => {
    if (refreshing || !onRefreshData) return;
    setRefreshing(true);
    try {
      await onRefreshData();
    } catch {
      // Surface handled by the route view; keep the current snapshot on screen.
    } finally {
      setRefreshing(false);
    }
  }, [onRefreshData, refreshing]);

  // Clear the palette's text on close so the next open starts fresh.
  const closeSearch = useCallback(() => {
    closePalette();
    setQuery("");
  }, [closePalette, setQuery]);

  // ⌘K / "/" palette, "?" help, 1–5 desks (dispatched as np-terminal-desk).
  useTerminalShortcuts();

  useEffect(() => {
    const onDeskEvent = (event) => {
      const next = event.detail?.deskId;
      if (DESKS.some((item) => item.id === next)) changeDesk(next);
    };
    window.addEventListener("np-terminal-desk", onDeskEvent);
    return () => window.removeEventListener("np-terminal-desk", onDeskEvent);
  }, [changeDesk]);

  // Esc peels back one layer: modal → market drawer → entity focus.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || state.paletteOpen || state.helpOpen) return;
      if (selectedMarket) {
        closeMarket();
        return;
      }
      if (selectedEntity) clearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.paletteOpen, state.helpOpen, selectedMarket, selectedEntity, closeMarket, clearSelection]);

  return (
    <div className="np-terminal-shell npt">
      <div className="npt-app">
        <TopBar
          desk={desk}
          onDeskChange={changeDesk}
          onOpenSearch={openPalette}
          onRefresh={refresh}
          refreshing={refreshing}
          onExit={onExitTerminal}
          generatedAt={snapshot?.generatedAt}
        />
        <TickerTape />
        <KpiBand onDeskChange={changeDesk} />
        <main className="npt-main">
          <DeskContent desk={desk} GlobeComponent={GlobeComponent} />
          <Inspector onOpenPlant={onOpenPlant} />
        </main>
        <StatusBar onShowSources={() => changeDesk("wire")} />
      </div>

      <CommandPalette open={Boolean(state.paletteOpen)} onClose={closeSearch} />
      <ShortcutsHelp open={Boolean(state.helpOpen)} onClose={closeHelp} />
      <MarketFocusDrawer />
    </div>
  );
}
