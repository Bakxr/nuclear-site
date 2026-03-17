import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLinkStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTableHeaderStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";

const NEWS_TAGS = ["All", "Policy", "Expansion", "Markets", "Innovation", "Safety", "Research"];

export default function CatalystWirePanel({ onRefreshData, isMobileViewport = false }) {
  const { newsRows, officialRows, state, setNewsTag, selectEntity } = useTerminal();

  return (
    <TerminalPanel
      title="Catalyst wire"
      subtitle={`${officialRows.length} official-source items linked to the current map and project stack.`}
      actions={[
        ...NEWS_TAGS.map((tag) => (
          <button key={tag} type="button" onClick={() => setNewsTag(tag)} className="np-terminal-button" style={terminalButtonStyle(state.newsTag === tag, { compact: true })}>
            {tag}
          </button>
        )),
        <button key="refresh" type="button" onClick={onRefreshData} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true, tone: "cyan" })}>
          Refresh
        </button>,
      ]}
    >
      <div style={{ display: "grid", gap: 6 }}>
        {!isMobileViewport ? (
          <div style={{ display: "grid", gridTemplateColumns: "64px minmax(0,1fr) 110px", gap: 10, padding: "0 10px 6px", borderBottom: "1px solid rgba(51,66,86,0.92)" }}>
            <div style={terminalTableHeaderStyle("left", "cyan")}>Time</div>
            <div style={terminalTableHeaderStyle("left", "cyan")}>Story</div>
            <div style={terminalTableHeaderStyle("right", "cyan")}>Source</div>
          </div>
        ) : null}

        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(350), padding: "0 10px" }}>
          {newsRows.slice(0, 10).map((item) => (
            <div
              key={item.id}
              className="np-terminal-row np-terminal-row--interactive"
              style={{
                ...terminalDataRowStyle(),
                display: "grid",
                gridTemplateColumns: isMobileViewport ? "1fr" : "64px minmax(0,1fr) 110px",
                gap: 10,
                alignItems: "start",
              }}
            >
              {!isMobileViewport ? (
                <div style={{ ...terminalValueStyle({ tone: item.isOfficial ? "success" : "amber", size: 13 }), paddingTop: 2 }}>
                  {item.dateLabel}
                </div>
              ) : null}

              <button type="button" onClick={() => selectEntity(item)} className="np-terminal-button" style={{ background: "transparent", border: "none", padding: 0, color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", width: "100%", minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={terminalTagStyle({ tone: item.isOfficial ? "success" : "amber", compact: true })}>
                    {item.tag} {item.isOfficial ? "official" : "wire"}
                  </span>
                  {isMobileViewport ? <span style={{ fontSize: 10, ...terminalMutedStyle() }}>{item.dateLabel}</span> : null}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.4, marginTop: 6 }}>{item.title}</div>
                <div style={{ fontSize: 10.5, lineHeight: 1.45, marginTop: 5, ...terminalMutedStyle() }}>{item.whyItMatters || item.curiosityHook}</div>
              </button>

              <div style={{ display: "grid", justifyItems: isMobileViewport ? "start" : "end", gap: 4 }}>
                <div style={{ fontSize: 10, textAlign: isMobileViewport ? "left" : "right", ...terminalMutedStyle() }}>
                  {item.sourceName}{item.country ? ` | ${item.country}` : ""}
                </div>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle()}>
                  Source
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TerminalPanel>
  );
}
