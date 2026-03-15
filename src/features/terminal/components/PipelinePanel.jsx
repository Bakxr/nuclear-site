import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import { terminalButtonStyle, terminalDataRowStyle, terminalScrollAreaStyle } from "./styles.js";

export default function PipelinePanel({ isMobileViewport = false }) {
  const { pipelineRows, snapshot, selectEntity, toggleWatch, watchedSet } = useTerminal();

  return (
    <TerminalPanel
      title="Project and licensing pipeline"
      subtitle="Construction, advanced reactor deployment, and milestone watch items."
      actions={[
        <span key="count" style={{ ...terminalButtonStyle(false), cursor: "default" }}>
          {pipelineRows.length} tracked
        </span>,
      ]}
    >
      <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1.2fr) minmax(300px,0.8fr)", gap: 16 }}>
        <div style={terminalScrollAreaStyle(360)}>
          {pipelineRows.slice(0, 10).map((project) => (
            <div key={project.id} style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
              <button type="button" onClick={() => selectEntity(project)} style={{ background: "none", border: "none", color: "#f5f0e8", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{project.name}</div>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#d4a54a" }}>{project.status}</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(245,240,232,0.46)", marginBottom: 6 }}>
                  {project.country} | {project.type} | {project.capacityMw} MW{project.targetYear ? ` | ${project.targetYear}` : ""}
                </div>
                <div style={{ fontSize: 11.5, lineHeight: 1.55, color: "rgba(245,240,232,0.6)" }}>{project.summary}</div>
              </button>
              <button type="button" onClick={() => toggleWatch(project.id)} style={{ ...terminalButtonStyle(false), padding: "7px 10px" }}>
                {watchedSet.has(project.id) ? "Starred" : "Star"}
              </button>
            </div>
          ))}
        </div>

        <div style={terminalScrollAreaStyle(360)}>
          {snapshot.entities.regulatoryEvents.slice(0, 10).map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => selectEntity(snapshot.entities.newsArticles.find((item) => item.id === event.linkedStoryId) || snapshot.entities.projectPipeline.find((item) => item.id === event.linkedProjectId) || event)}
              style={{ ...terminalDataRowStyle(), textAlign: "left", color: "#f5f0e8", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#d4a54a", fontWeight: 700 }}>{event.lane}</span>
                <span style={{ fontSize: 10.5, color: "rgba(245,240,232,0.38)" }}>{event.dateLabel}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, marginBottom: 6 }}>{event.title}</div>
              <div style={{ fontSize: 11.5, lineHeight: 1.55, color: "rgba(245,240,232,0.6)" }}>{event.summary}</div>
            </button>
          ))}
        </div>
      </div>
    </TerminalPanel>
  );
}
