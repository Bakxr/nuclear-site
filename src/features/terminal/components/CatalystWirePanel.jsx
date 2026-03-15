import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import { terminalButtonStyle, terminalDataRowStyle, terminalScrollAreaStyle } from "./styles.js";

const NEWS_TAGS = ["All", "Policy", "Expansion", "Markets", "Innovation", "Safety", "Research"];

export default function CatalystWirePanel({ onRefreshData }) {
  const { newsRows, officialRows, state, setNewsTag, selectEntity } = useTerminal();

  return (
    <TerminalPanel
      title="Catalyst wire"
      subtitle={`Curated stories linked into the map and project pipeline | ${officialRows.length} official-source items in view.`}
      actions={[
        ...NEWS_TAGS.map((tag) => (
          <button key={tag} type="button" onClick={() => setNewsTag(tag)} style={terminalButtonStyle(state.newsTag === tag)}>
            {tag}
          </button>
        )),
        <button key="refresh" type="button" onClick={onRefreshData} style={terminalButtonStyle(false)}>
          Refresh
        </button>,
      ]}
    >
      <div style={terminalScrollAreaStyle(420)}>
        {newsRows.slice(0, 10).map((item) => (
          <div key={item.id} style={terminalDataRowStyle()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: item.isOfficial ? "#4ade80" : "#d4a54a", fontWeight: 700 }}>
                {item.tag} {item.isOfficial ? "| official" : ""}
              </span>
              <span style={{ fontSize: 10.5, color: "rgba(245,240,232,0.38)" }}>{item.dateLabel}</span>
            </div>
            <button type="button" onClick={() => selectEntity(item)} style={{ background: "none", border: "none", padding: 0, color: "#f5f0e8", textAlign: "left", cursor: "pointer", width: "100%" }}>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 11.5, lineHeight: 1.55, color: "rgba(245,240,232,0.6)" }}>{item.whyItMatters || item.curiosityHook}</div>
            </button>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 10.5, color: "rgba(245,240,232,0.38)" }}>
                {item.sourceName}{item.country ? ` | ${item.country}` : ""}
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "#d4a54a", fontSize: 11, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Source
              </a>
            </div>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}
