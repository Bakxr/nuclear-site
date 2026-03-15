import CompareTray from "./CompareTray.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import { terminalButtonStyle } from "./styles.js";
import { useTerminal } from "../context.jsx";

function renderEntityBody(entity) {
  if (!entity) return "";
  if (entity.entityType === "country") return `${entity.reactors} reactors · ${entity.capacityGw.toFixed(1)} GW · ${entity.nuclearShare ?? 0}% nuclear share · ${entity.activeProjects} active projects.`;
  if (entity.entityType === "plant") return `${entity.capacityMw.toLocaleString("en-US")} MW · ${entity.normalizedType} · ${entity.status}.`;
  if (entity.entityType === "company") return `${entity.theme} exposure across ${entity.countries.length || 1} tracked geographies.`;
  if (entity.entityType === "story") return entity.whyItMatters || entity.curiosityHook;
  if (entity.entityType === "project") return `${entity.status}${entity.targetYear ? ` · target ${entity.targetYear}` : ""} · ${entity.capacityMw} MW · ${entity.country}.`;
  return entity.summary || entity.desc || "";
}

export default function EntityFocusDrawer({ isMobileViewport }) {
  const { snapshot, selectedEntity, marketRows, newsRows, pipelineRows, toggleCompare, toggleWatch, watchedSet } = useTerminal();
  const title = selectedEntity ? (selectedEntity.name || selectedEntity.title || selectedEntity.country) : "Global workspace";
  const eyebrow = selectedEntity ? `${selectedEntity.entityType} focus` : "Live context";
  const body = selectedEntity
    ? renderEntityBody(selectedEntity)
    : `Track ${snapshot.entities.plants.length} plant records, ${snapshot.entities.supplySites.length} fuel-cycle sites, ${snapshot.entities.marketInstruments.length} market instruments, and ${snapshot.entities.newsArticles.length} catalyst stories in one view.`;
  const canCompare = selectedEntity && ["country", "plant", "company", "project"].includes(selectedEntity.entityType);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <TerminalPanel>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(212,165,74,0.78)", fontWeight: 700, marginBottom: 6 }}>{eyebrow}</div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: isMobileViewport ? 24 : 28, lineHeight: 1.08, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(245,240,232,0.66)", marginBottom: 14 }}>{body}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canCompare ? <button type="button" onClick={() => toggleCompare(selectedEntity.id)} style={terminalButtonStyle(false)}>Compare</button> : null}
          {selectedEntity ? (
            <button type="button" onClick={() => toggleWatch(selectedEntity.id)} style={terminalButtonStyle(false)}>
              {watchedSet.has(selectedEntity.id) ? "Starred" : "Star"}
            </button>
          ) : null}
        </div>
      </TerminalPanel>

      <CompareTray />

      <TerminalPanel title="Linked context" subtitle="What else lights up from the current focus.">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10 }}>
            <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: "12px 13px" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(245,240,232,0.4)", letterSpacing: "0.08em" }}>Markets</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, marginTop: 4 }}>{marketRows.slice(0, 6).length}</div>
            </div>
            <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: "12px 13px" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(245,240,232,0.4)", letterSpacing: "0.08em" }}>Catalysts</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, marginTop: 4 }}>{newsRows.slice(0, 6).length}</div>
            </div>
            <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: "12px 13px" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(245,240,232,0.4)", letterSpacing: "0.08em" }}>Pipeline</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, marginTop: 4 }}>{pipelineRows.slice(0, 6).length}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "rgba(245,240,232,0.52)", lineHeight: 1.65 }}>
            Source trust labels travel with every entity. Public-safe aggregates can surface on the editorial page; denser drilldowns stay terminal-native and premium-ready.
          </div>
        </div>
      </TerminalPanel>
    </div>
  );
}
