import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLinkStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTagStyle,
} from "./styles.js";

const NEWS_TAGS = ["All", "Policy", "Expansion", "Markets", "Innovation", "Safety", "Research"];

export default function CatalystWirePanel({ onRefreshData }) {
  const { newsRows, officialRows, state, setNewsTag, selectEntity } = useTerminal();

  return (
    <TerminalPanel
      title="Catalyst wire"
      subtitle={`Curated stories linked into the map and project pipeline // ${officialRows.length} official-source items in view.`}
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
      <div className="np-terminal-scroll" style={terminalScrollAreaStyle(420)}>
        {newsRows.slice(0, 10).map((item) => (
          <div key={item.id} className="np-terminal-row np-terminal-row--interactive" style={terminalDataRowStyle()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={terminalTagStyle({ tone: item.isOfficial ? "success" : "amber", compact: true })}>
                {item.tag} {item.isOfficial ? "official" : "wire"}
              </span>
              <span style={{ fontSize: 10.5, ...terminalMutedStyle() }}>{item.dateLabel}</span>
            </div>
            <button type="button" onClick={() => selectEntity(item)} className="np-terminal-button" style={{ background: "transparent", border: "none", padding: 0, color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", width: "100%" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.45, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 11.5, lineHeight: 1.6, ...terminalMutedStyle() }}>{item.whyItMatters || item.curiosityHook}</div>
            </button>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 10.5, ...terminalMutedStyle() }}>
                {item.sourceName}{item.country ? ` // ${item.country}` : ""}
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="np-terminal-link" style={terminalLinkStyle()}>
                Source
              </a>
            </div>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}
