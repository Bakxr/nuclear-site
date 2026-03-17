import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLabelStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTagStyle,
} from "./styles.js";

export default function PipelinePanel({ isMobileViewport = false }) {
  const { pipelineRows, snapshot, selectEntity, toggleWatch, watchedSet } = useTerminal();

  return (
    <TerminalPanel
      panelId="terminal-panel-pipeline"
      title="Project and licensing pipeline"
      subtitle="Construction, advanced reactor deployment, and milestone watch items."
      actions={[
        <span key="count" style={terminalTagStyle({ tone: "amber", compact: true })}>
          {pipelineRows.length} tracked
        </span>,
      ]}
    >
      <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1fr) minmax(0,0.92fr)", gap: 10 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={terminalLabelStyle("cyan")}>Deployment queue</div>
          <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(300), padding: "0 10px", border: "1px solid rgba(51,66,86,0.92)", background: "rgba(7,10,15,0.92)" }}>
            {pipelineRows.slice(0, 10).map((project) => (
              <div key={project.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "start" }}>
                <button type="button" onClick={() => selectEntity(project)} className="np-terminal-button" style={{ background: "transparent", border: "none", color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, fontSize: 11.5 }}>{project.name}</div>
                    <span style={terminalTagStyle({ tone: "amber", compact: true })}>{project.status}</span>
                  </div>
                  <div style={{ fontSize: 10, marginTop: 4, ...terminalMutedStyle() }}>
                    {project.country} | {project.type} | {project.capacityMw} MW{project.targetYear ? ` | ${project.targetYear}` : ""}
                  </div>
                  <div style={{ fontSize: 10.5, lineHeight: 1.45, marginTop: 5, ...terminalMutedStyle() }}>{project.summary}</div>
                </button>
                <button type="button" onClick={() => toggleWatch(project.id)} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true, tone: "cyan" })}>
                  {watchedSet.has(project.id) ? "Starred" : "Star"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={terminalLabelStyle()}>Regulatory tape</div>
          <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(300), padding: "0 10px", border: "1px solid rgba(51,66,86,0.92)", background: "rgba(7,10,15,0.92)" }}>
            {snapshot.entities.regulatoryEvents.slice(0, 10).map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => selectEntity(snapshot.entities.newsArticles.find((item) => item.id === event.linkedStoryId) || snapshot.entities.projectPipeline.find((item) => item.id === event.linkedProjectId) || event)}
                className="np-terminal-row np-terminal-row--interactive np-terminal-button"
                style={{ ...terminalDataRowStyle(), textAlign: "left", color: "var(--np-terminal-text)", cursor: "pointer", background: "transparent", borderLeft: "none", borderRight: "none", borderBottom: "none" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={terminalTagStyle({ tone: "amber", compact: true })}>{event.lane}</span>
                  <span style={{ fontSize: 10, ...terminalMutedStyle() }}>{event.dateLabel}</span>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.4, marginTop: 6 }}>{event.title}</div>
                <div style={{ fontSize: 10.5, lineHeight: 1.45, marginTop: 5, ...terminalMutedStyle() }}>{event.summary}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </TerminalPanel>
  );
}
