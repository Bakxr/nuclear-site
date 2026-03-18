import { Suspense, useMemo, useState } from "react";
import { STATUS_COLORS } from "../../../data/constants.js";
import { SUPPLY_STAGE_COLORS } from "../../../data/supplySites.js";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLabelStyle,
  terminalMetricDotStyle,
  terminalMetricEyebrowStyle,
  terminalMetricTileStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalSelectStyle,
  terminalTagStyle,
  terminalToneColor,
  terminalValueStyle,
} from "./styles.js";

function formatCompactCapacity(value) {
  if (!value) return "0 GW";
  if (value >= 1000) return `${(value / 1000).toFixed(1)} GW`;
  return `${Math.round(value).toLocaleString("en-US")} MW`;
}

function getSelectionSummary(entity) {
  if (!entity) {
    return {
      eyebrow: "Context",
      title: "No active selection",
      detail: "Choose a country, plant, project, or supply node from the globe or list to route the rest of the workspace.",
      tone: "default",
      chips: ["Global scope"],
    };
  }

  if (entity.entityType === "country") {
    return {
      eyebrow: "Context",
      title: entity.country,
      detail: `${entity.reactors} reactors | ${entity.capacityGw.toFixed(1)} GW | ${entity.activeProjects} active projects`,
      tone: "amber",
      chips: ["Country", entity.nuclearShare ? `${entity.nuclearShare}% share` : "In scope"],
    };
  }
  if (entity.entityType === "plant") {
    return {
      eyebrow: "Context",
      title: entity.name,
      detail: `${entity.country} | ${entity.normalizedType} | ${entity.capacityMw.toLocaleString("en-US")} MW`,
      tone: entity.status === "Operating" ? "success" : "warning",
      chips: [entity.status, "Plant"],
    };
  }
  return {
    eyebrow: "Context",
    title: entity.name || entity.title || entity.country,
    detail: entity.summary || entity.desc || `${entity.entityType}${entity.country ? ` | ${entity.country}` : ""}`,
    tone: "warning",
    chips: [entity.entityType, entity.status || entity.stage || entity.tag || "In focus"],
  };
}

export default function MapNexusPanel({ GlobeComponent, isMobileViewport, onOpenPlant }) {
  const {
    snapshot,
    state,
    mapItems,
    selectedEntity,
    availableCountries,
    availableReactorTypes,
    availableStatuses,
    rankingRows,
    setLayer,
    setCountryFilter,
    setReactorTypeFilter,
    setStatusFilter,
    setMapCollapsed,
    selectEntity,
  } = useTerminal();
  const [companionView, setCompanionView] = useState("assets");
  const [hoveredMapItemId, setHoveredMapItemId] = useState(null);
  const [hoveredGlobeItemId, setHoveredGlobeItemId] = useState(null);

  const GlobeView = GlobeComponent;
  const assetTone = state.layer === "reactors" ? "amber" : "cyan";
  const visibleCountries = new Set(mapItems.map((item) => item.country)).size;
  const companionCountries = rankingRows
    .filter((country) => mapItems.some((item) => item.country === country.country))
    .slice(0, 6);
  const fleetScopePlants = useMemo(() => snapshot.entities.plants.filter((plant) => {
    if (state.countryFilter && plant.country !== state.countryFilter) return false;
    if (state.layer === "reactors" && state.reactorTypeFilter && plant.normalizedType !== state.reactorTypeFilter) return false;
    if (state.layer === "reactors" && state.statusFilter && plant.status !== state.statusFilter) return false;
    return true;
  }), [snapshot.entities.plants, state.countryFilter, state.layer, state.reactorTypeFilter, state.statusFilter]);

  const headlineMetrics = [
    {
      label: "Operating reactors",
      value: fleetScopePlants.filter((plant) => plant.status === "Operating").length,
      detail: `${snapshot.entities.reactorUnits.length} tracked units`,
      tone: "amber",
      emphasis: "primary",
      valueSize: 27,
    },
    {
      label: "Visible capacity",
      value: formatCompactCapacity(fleetScopePlants.reduce((total, plant) => total + (plant.capacityMw || 0), 0)),
      detail: state.countryFilter ? `${state.countryFilter} scope` : "Global reactor scope",
      tone: "cyan",
      emphasis: "secondary",
      valueSize: 24,
    },
    {
      label: "Countries in scope",
      value: visibleCountries,
      detail: state.layer === "uranium" ? "Fuel-cycle footprint" : "Reactor footprint",
      tone: "success",
      emphasis: "default",
      valueSize: 20,
    },
    {
      label: "Construction watch",
      value: fleetScopePlants.filter((plant) => plant.status === "Construction").length,
      detail: "Buildout projects requiring follow-up",
      tone: "warning",
      emphasis: "default",
      valueSize: 20,
    },
  ];
  const activeMapFocusId = hoveredMapItemId || hoveredGlobeItemId;

  const legendItems = state.layer === "reactors"
    ? [...new Set(mapItems.map((item) => item.status))].slice(0, 4).map((status) => ({
        label: status,
        color: STATUS_COLORS[status] || "var(--np-terminal-amber)",
      }))
    : [...new Set(mapItems.map((item) => item.stage))].slice(0, 4).map((stage) => ({
        label: stage,
        color: SUPPLY_STAGE_COLORS[stage] || "var(--np-terminal-cyan)",
      }));
  const selectionSummary = getSelectionSummary(selectedEntity);

  const actions = (
    <>
      <button type="button" onClick={() => setLayer("reactors")} className="np-terminal-button" style={terminalButtonStyle(state.layer === "reactors", { compact: true })}>
        Reactors
      </button>
      <button type="button" onClick={() => setLayer("uranium")} className="np-terminal-button" style={terminalButtonStyle(state.layer === "uranium", { compact: true, tone: "cyan" })}>
        Fuel cycle
      </button>
      {isMobileViewport ? (
        <button type="button" onClick={() => setMapCollapsed(!state.mapCollapsed)} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true })}>
          {state.mapCollapsed ? "Open map" : "Collapse"}
        </button>
      ) : null}
    </>
  );

  return (
    <TerminalPanel
      panelId="terminal-panel-map"
      emphasis="hero"
      title="Global reactor map"
      subtitle="Start with the map, then move into the country, asset, or signal that matters next."
      actions={actions}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ display: "grid", gap: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr)) minmax(220px,0.95fr)",
            gap: 10,
            padding: "0 18px 14px",
            borderBottom: state.mapCollapsed ? "none" : "1px solid rgba(125,139,156,0.08)",
          }}
        >
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={terminalLabelStyle()}>Country</span>
            <select value={state.countryFilter} onChange={(event) => setCountryFilter(event.target.value)} style={terminalSelectStyle({ active: Boolean(state.countryFilter) })}>
              <option value="">All countries</option>
              {availableCountries.map((country) => <option key={country} value={country}>{country}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={terminalLabelStyle()}>Reactor type</span>
            <select
              value={state.reactorTypeFilter}
              onChange={(event) => setReactorTypeFilter(event.target.value)}
              disabled={state.layer !== "reactors"}
              style={terminalSelectStyle({ disabled: state.layer !== "reactors", active: Boolean(state.reactorTypeFilter) })}
            >
              <option value="">All reactor types</option>
              {availableReactorTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={terminalLabelStyle()}>Status</span>
            <select
              value={state.statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              disabled={state.layer !== "reactors"}
              style={terminalSelectStyle({ disabled: state.layer !== "reactors", active: Boolean(state.statusFilter) })}
            >
              <option value="">All statuses</option>
              {availableStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={terminalLabelStyle()}>Layer</span>
            <div style={{ border: "1px solid rgba(125,139,156,0.11)", borderRadius: 14, padding: "10px 12px", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ ...terminalValueStyle({ tone: assetTone, size: 13 }), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {state.layer === "reactors" ? "Reactor layer" : "Fuel-cycle layer"}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={terminalLabelStyle()}>Scope</span>
            <div style={{ border: "1px solid rgba(125,139,156,0.11)", borderRadius: 14, padding: "10px 12px", background: "rgba(255,255,255,0.02)", minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--np-terminal-text)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedEntity ? (selectedEntity.name || selectedEntity.title || selectedEntity.country) : "Global"}
              </div>
              <div style={{ fontSize: 10.5, marginTop: 4, ...terminalMutedStyle() }}>
                {selectedEntity ? "Selection is mirrored across the workspace" : "Use the map to route the rest of the workspace"}
              </div>
            </div>
          </div>
        </div>

        <div className="np-terminal-selection-strip">
          <div className="np-terminal-selection-card np-terminal-selection-card--compact">
            <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                  <div style={terminalLabelStyle(selectionSummary.tone)}>{selectionSummary.eyebrow}</div>
                  <div style={{ ...terminalValueStyle({ tone: selectionSummary.tone, size: selectedEntity ? 18 : 14 }), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {selectionSummary.title}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {selectionSummary.chips.map((chip, index) => (
                    <span key={`${chip}-${index}`} style={terminalTagStyle({ tone: selectedEntity && index === 0 ? selectionSummary.tone : "default", compact: true })}>
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 10.8, lineHeight: 1.55, ...terminalMutedStyle() }}>{selectionSummary.detail}</div>
            </div>
          </div>
        </div>

        {!state.mapCollapsed ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1.78fr) minmax(290px,0.76fr)",
              gap: 14,
              padding: "14px 18px 18px",
            }}
          >
            <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))",
                  gap: 8,
                }}
              >
                {headlineMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    style={terminalMetricTileStyle({
                      accent: terminalToneColor(metric.tone),
                      emphasis: metric.emphasis,
                    })}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                      <span aria-hidden="true" style={terminalMetricDotStyle(terminalToneColor(metric.tone))} />
                      <div style={terminalMetricEyebrowStyle()}>{metric.label}</div>
                    </div>
                    <div style={{ ...terminalValueStyle({ tone: metric.tone, size: metric.valueSize }), marginTop: metric.emphasis === "primary" ? 10 : 8, letterSpacing: metric.emphasis === "primary" ? "-0.02em" : "0" }}>
                      {metric.value}
                    </div>
                    <div style={{ fontSize: 10.5, lineHeight: 1.5, marginTop: metric.emphasis === "primary" ? 8 : 6, color: metric.emphasis === "primary" ? "rgba(171,181,191,0.84)" : undefined, ...terminalMutedStyle() }}>
                      {metric.detail}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="np-terminal-hero-map"
                style={{
                  minHeight: isMobileViewport ? 380 : 640,
                  border: "1px solid rgba(125,139,156,0.1)",
                  background: "radial-gradient(circle at 50% 36%, rgba(60,75,90,0.22) 0%, rgba(15,20,27,0.88) 42%, rgba(8,12,17,1) 100%)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    backgroundImage: "linear-gradient(rgba(125,139,156,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(125,139,156,0.06) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                    opacity: 0.12,
                  }}
                />
                <div style={{ position: "absolute", top: 16, left: 16, zIndex: 4, display: "flex", gap: 6, flexWrap: "wrap", pointerEvents: "none" }}>
                  <span style={terminalTagStyle({ tone: assetTone, compact: true })}>
                    {state.layer === "reactors" ? `${mapItems.length} assets visible` : `${mapItems.length} supply nodes visible`}
                  </span>
                  <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{visibleCountries} countries</span>
                  {selectedEntity ? <span style={terminalTagStyle({ tone: "warning", compact: true })}>Focus locked</span> : null}
                </div>
                <div style={{ position: "absolute", inset: 0 }}>
                  <Suspense fallback={<div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--np-terminal-muted)", fontFamily: "'DM Mono',monospace" }}>Loading globe...</div>}>
                    <GlobeView
                      onSelectPlant={(item) => {
                        selectEntity(item);
                        if (item?.entityType === "plant") onOpenPlant?.(item);
                      }}
                      onHoverPlant={(item) => setHoveredGlobeItemId(item?.id ?? null)}
                      plants={mapItems}
                      mode={state.layer}
                      selectedEntity={selectedEntity}
                      highlightedEntityId={activeMapFocusId}
                    />
                  </Suspense>
                </div>
                <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, zIndex: 4, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-end", pointerEvents: "none" }}>
                  <div style={{ fontSize: 11, ...terminalMutedStyle() }}>
                    Rotate the globe to inspect clusters and route the rest of the workspace toward the selected region.
                  </div>
                  <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {legendItems.map((item) => (
                        <span
                          key={item.label}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 9px",
                            borderRadius: 999,
                            border: "1px solid rgba(125,139,156,0.08)",
                            background: "rgba(9,13,18,0.34)",
                            fontSize: 9.5,
                            color: "rgba(237,241,245,0.82)",
                            fontFamily: "'DM Mono',monospace",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: item.color }} />
                          {item.label}
                        </span>
                      ))}
                    </div>
                    <div style={{ ...terminalValueStyle({ tone: assetTone, size: 12 }) }}>
                      {state.layer === "reactors" ? "Reactor layer active" : "Fuel-cycle layer active"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, alignContent: "start", minWidth: 0 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={terminalLabelStyle()}>List view</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--np-terminal-text)", marginTop: 4 }}>
                      {companionView === "assets" ? "Assets in view" : "Countries in scope"}
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.55, marginTop: 5, ...terminalMutedStyle() }}>
                      {companionView === "assets"
                        ? "Use the companion list to pivot from the globe into the exact plant or supply node you need."
                        : "Read the leading countries in the current scope before moving into a specific asset."}
                    </div>
                  </div>
                  <div className="np-terminal-tab-row">
                    <button type="button" onClick={() => setCompanionView("assets")} className="np-terminal-button" style={terminalButtonStyle(companionView === "assets", { compact: true })}>
                      Assets
                    </button>
                    <button type="button" onClick={() => setCompanionView("countries")} className="np-terminal-button" style={terminalButtonStyle(companionView === "countries", { compact: true, tone: "cyan" })}>
                      Countries
                    </button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(125,139,156,0.1)",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.03)",
                  padding: "0 16px",
                }}
              >
                <div className="np-terminal-scroll np-terminal-companion-list" style={{ ...terminalScrollAreaStyle(isMobileViewport ? 260 : 474), padding: 0 }}>
                  {companionView === "assets" ? mapItems.slice(0, isMobileViewport ? 9 : 12).map((item, index) => {
                    const isActive = selectedEntity?.id === item.id;
                    const isLinked = !isActive && activeMapFocusId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          selectEntity(item);
                          if (item.entityType === "plant") onOpenPlant?.(item);
                        }}
                        onMouseEnter={() => setHoveredMapItemId(item.id)}
                        onMouseLeave={() => setHoveredMapItemId(null)}
                        className="np-terminal-row np-terminal-row--interactive np-terminal-button"
                        style={{
                          ...terminalDataRowStyle(),
                          borderTop: index === 0 ? "none" : terminalDataRowStyle().borderTop,
                          display: "grid",
                          gridTemplateColumns: "34px minmax(0,1fr) auto",
                          gap: 12,
                          alignItems: "center",
                          textAlign: "left",
                          color: "var(--np-terminal-text)",
                          background: isActive ? "rgba(216,160,74,0.08)" : isLinked ? "rgba(126,168,192,0.06)" : "transparent",
                          borderLeft: "none",
                          borderRight: "none",
                          borderBottom: "none",
                          cursor: "pointer",
                          paddingInline: 0,
                          boxShadow: isActive ? "inset 3px 0 0 var(--np-terminal-amber)" : isLinked ? "inset 2px 0 0 var(--np-terminal-cyan)" : "none",
                        }}
                      >
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: "var(--np-terminal-subtle)" }}>{String(index + 1).padStart(2, "0")}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                          <div style={{ fontSize: 10.5, marginTop: 4, ...terminalMutedStyle() }}>
                            {item.country} | {state.layer === "reactors" ? item.type : item.stage}
                          </div>
                        </div>
                        <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: state.layer === "reactors" ? (STATUS_COLORS[item.status] || "var(--np-terminal-amber)") : (SUPPLY_STAGE_COLORS[item.stage] || "var(--np-terminal-cyan)") }}>
                          {state.layer === "reactors" ? item.status : item.stage}
                        </div>
                      </button>
                    );
                  }) : companionCountries.map((country, index) => {
                    const isActive = selectedEntity?.id === country.id || selectedEntity?.country === country.country;
                    return (
                      <button
                        key={country.id}
                        type="button"
                        onClick={() => selectEntity(country)}
                        className="np-terminal-row np-terminal-row--interactive np-terminal-button"
                        style={{
                          ...terminalDataRowStyle(),
                          borderTop: index === 0 ? "none" : terminalDataRowStyle().borderTop,
                          display: "grid",
                          gridTemplateColumns: "34px minmax(0,1fr) auto",
                          gap: 12,
                          alignItems: "center",
                          textAlign: "left",
                          background: isActive ? "rgba(216,160,74,0.08)" : "transparent",
                          borderLeft: "none",
                          borderRight: "none",
                          borderBottom: "none",
                          cursor: "pointer",
                          color: "var(--np-terminal-text)",
                          paddingInline: 0,
                          boxShadow: isActive ? "inset 3px 0 0 var(--np-terminal-amber)" : "none",
                        }}
                      >
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: "var(--np-terminal-subtle)" }}>{String(index + 1).padStart(2, "0")}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{country.country}</div>
                          <div style={{ fontSize: 10.5, marginTop: 4, ...terminalMutedStyle() }}>
                            {country.reactors} reactors | {country.activeProjects} projects
                          </div>
                        </div>
                        <div style={{ ...terminalValueStyle({ tone: "amber", size: 12 }), textAlign: "right" }}>
                          {country.capacityGw.toFixed(1)} GW
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(125,139,156,0.1)",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.02)",
                  padding: "14px 16px",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={terminalLabelStyle()}>Workspace note</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.65, color: "var(--np-terminal-text)" }}>
                  {selectedEntity
                    ? `The workspace is centered on ${selectedEntity.name || selectedEntity.title || selectedEntity.country}. Use the right-side workspace for filings, operations, and source follow-up.`
                    : "Stay global until the map or list reveals a cluster worth drilling into, then hand off the detail work to the right-side workspace."}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: "0 18px 18px" }}>
            <div style={{ border: "1px solid rgba(125,139,156,0.12)", borderRadius: 18, background: "rgba(255,255,255,0.03)", padding: "16px 18px" }}>
              <div style={terminalLabelStyle("cyan")}>Map collapsed</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--np-terminal-text)", marginTop: 4 }}>Re-open the hero to inspect the live reactor footprint.</div>
            </div>
          </div>
        )}
      </div>
    </TerminalPanel>
  );
}
