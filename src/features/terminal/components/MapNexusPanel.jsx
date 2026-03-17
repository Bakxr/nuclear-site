import { Suspense } from "react";
import { STATUS_COLORS } from "../../../data/constants.js";
import { SUPPLY_STAGE_COLORS } from "../../../data/supplySites.js";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLabelStyle,
  terminalMetricTileStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalSelectStyle,
  terminalTableHeaderStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";

function formatCompactCapacity(value) {
  if (!value) return "0 MW";
  if (value >= 1000) return `${(value / 1000).toFixed(1)} GW`;
  return `${Math.round(value).toLocaleString("en-US")} MW`;
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

  const GlobeView = GlobeComponent;
  const assetTone = state.layer === "reactors" ? "amber" : "cyan";
  const visibleCountries = new Set(mapItems.map((item) => item.country)).size;
  const visibleCapacity = mapItems.reduce((total, item) => total + (item.capacityMw || item.capacity || 0), 0);
  const operatingCount = mapItems.filter((item) => item.status === "Operating").length;
  const constructionCount = mapItems.filter((item) => item.status === "Construction").length;
  const supplyCount = mapItems.filter((item) => item.stage).length;
  const highlightedCountries = rankingRows
    .filter((country) => mapItems.some((item) => item.country === country.country))
    .slice(0, 5);
  const legendItems = state.layer === "reactors"
    ? [...new Set(mapItems.map((item) => item.status))].slice(0, 4).map((status) => ({
        label: status,
        color: STATUS_COLORS[status] || "var(--np-terminal-amber)",
      }))
    : [...new Set(mapItems.map((item) => item.stage))].slice(0, 4).map((stage) => ({
        label: stage,
        color: SUPPLY_STAGE_COLORS[stage] || "var(--np-terminal-cyan)",
      }));
  const summaryTiles = state.layer === "reactors"
    ? [
        { label: "Assets", value: mapItems.length, tone: "amber" },
        { label: "Countries", value: visibleCountries, tone: "cyan" },
        { label: "Capacity", value: formatCompactCapacity(visibleCapacity), tone: "success" },
        { label: "Build", value: constructionCount, tone: "warning" },
      ]
    : [
        { label: "Sites", value: mapItems.length, tone: "cyan" },
        { label: "Countries", value: visibleCountries, tone: "amber" },
        { label: "Active", value: supplyCount, tone: "success" },
        { label: "Focus", value: state.countryFilter || "Global", tone: "warning" },
      ];
  const actions = (
    <>
      <button type="button" onClick={() => setLayer("reactors")} className="np-terminal-button" style={terminalButtonStyle(state.layer === "reactors", { compact: true })}>Reactors</button>
      <button type="button" onClick={() => setLayer("uranium")} className="np-terminal-button" style={terminalButtonStyle(state.layer === "uranium", { compact: true, tone: "cyan" })}>Fuel cycle</button>
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
      title="Global nexus"
      subtitle={`${mapItems.length} linked ${state.layer === "reactors" ? "reactor" : "fuel-cycle"} assets in view. The globe remains the primary navigation and world monitor surface.`}
      actions={actions}
      bodyStyle={{ padding: 0 }}
    >
      <div className="np-terminal-map-shell">
        <div
          className="np-terminal-map-toolbar"
          style={{
            display: "grid",
            gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr)) minmax(220px,0.9fr)",
            gap: 8,
            padding: "10px",
            borderBottom: "1px solid rgba(55,59,68,0.92)",
            background: "rgba(13,16,21,0.98)",
          }}
        >
          <label style={{ display: "grid", gap: 5, minWidth: 0 }}>
            <span style={terminalLabelStyle("cyan")}>Country</span>
            <select value={state.countryFilter} onChange={(event) => setCountryFilter(event.target.value)} style={terminalSelectStyle(false)}>
              <option value="">All countries</option>
              {availableCountries.map((country) => <option key={country} value={country}>{country}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 5, minWidth: 0 }}>
            <span style={terminalLabelStyle("cyan")}>Reactor type</span>
            <select value={state.reactorTypeFilter} onChange={(event) => setReactorTypeFilter(event.target.value)} disabled={state.layer !== "reactors"} style={terminalSelectStyle(state.layer !== "reactors")}>
              <option value="">All reactor types</option>
              {availableReactorTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 5, minWidth: 0 }}>
            <span style={terminalLabelStyle("cyan")}>Status</span>
            <select value={state.statusFilter} onChange={(event) => setStatusFilter(event.target.value)} disabled={state.layer !== "reactors"} style={terminalSelectStyle(state.layer !== "reactors")}>
              <option value="">All statuses</option>
              {availableStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
            <span style={terminalLabelStyle("cyan")}>Layer</span>
            <div style={{ minWidth: 0, border: "1px solid rgba(62,67,77,0.92)", background: "rgba(18,21,27,0.96)", padding: "8px 10px" }}>
              <div style={{ ...terminalValueStyle({ tone: assetTone, size: 13 }), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {state.layer === "reactors" ? "reactor fleet overlay" : "fuel-cycle overlay"}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
            <span style={terminalLabelStyle("cyan")}>Focus</span>
            <div style={{ minWidth: 0, border: "1px solid rgba(62,67,77,0.92)", background: "rgba(18,21,27,0.96)", padding: "8px 10px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "var(--np-terminal-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedEntity ? (selectedEntity.name || selectedEntity.title || selectedEntity.country) : "global scope"}
              </div>
              <div style={{ fontSize: 10, marginTop: 4, ...terminalMutedStyle() }}>
                {selectedEntity ? `${selectedEntity.entityType} linked` : "worldwide monitoring context"}
              </div>
            </div>
          </div>
        </div>

        {!state.mapCollapsed ? (
          <div
            className="np-terminal-map-layout"
            style={{
              display: "grid",
              gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1.45fr) minmax(300px,0.86fr)",
              gap: 10,
              padding: "10px",
            }}
          >
            <div
              className="np-terminal-map-stage-shell"
              style={{
                position: "relative",
                minHeight: isMobileViewport ? 340 : 520,
                border: "1px solid rgba(66,72,82,0.96)",
                background: "radial-gradient(circle at 50% 34%, rgba(28,49,67,0.5) 0%, rgba(9,12,18,0.98) 44%, rgba(5,7,10,1) 100%)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  backgroundImage: "linear-gradient(rgba(95,104,118,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(95,104,118,0.12) 1px, transparent 1px)",
                  backgroundSize: "36px 36px",
                  opacity: 0.18,
                }}
              />
              <div style={{ position: "absolute", inset: 10, border: "1px solid rgba(255,156,26,0.08)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 4, display: "grid", gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))", gap: 8, pointerEvents: "none" }}>
                {summaryTiles.map((tile) => (
                  <div
                    key={tile.label}
                    style={{
                      ...terminalMetricTileStyle({
                        accent: tile.tone === "cyan"
                          ? "var(--np-terminal-cyan)"
                          : tile.tone === "success"
                            ? "var(--np-terminal-green)"
                            : tile.tone === "warning"
                              ? "var(--np-terminal-yellow)"
                              : "var(--np-terminal-amber)",
                      }),
                      background: "rgba(10,13,18,0.82)",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    <div style={terminalLabelStyle(tile.tone)}>{tile.label}</div>
                    <div style={{ ...terminalValueStyle({ tone: tile.tone, size: 15 }), marginTop: 7 }}>{tile.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ position: "absolute", top: isMobileViewport ? 98 : 88, left: 12, zIndex: 4, display: "flex", gap: 6, flexWrap: "wrap", pointerEvents: "none" }}>
                <span style={terminalTagStyle({ tone: assetTone, compact: true })}>
                  {state.layer === "reactors" ? `${operatingCount} operating assets` : `${mapItems.length} fuel nodes`}
                </span>
                <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{visibleCountries} countries</span>
                {selectedEntity ? <span style={terminalTagStyle({ tone: "warning", compact: true })}>focus locked</span> : null}
              </div>
              <div style={{ position: "absolute", inset: 0 }}>
                <Suspense fallback={<div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--np-terminal-muted)", fontFamily: "'DM Mono',monospace" }}>Loading globe...</div>}>
                  <GlobeView
                    onSelectPlant={(item) => {
                      selectEntity(item);
                      if (item?.entityType === "plant") onOpenPlant?.(item);
                    }}
                    plants={mapItems}
                    mode={state.layer}
                  />
                </Suspense>
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: 12,
                  zIndex: 4,
                  display: "grid",
                  gap: 8,
                  pointerEvents: "none",
                }}
              >
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {legendItems.map((item) => (
                    <span
                      key={item.label}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 8px",
                        border: "1px solid rgba(66,72,82,0.8)",
                        background: "rgba(10,13,18,0.82)",
                        color: "var(--np-terminal-text)",
                        fontSize: 10,
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
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "7px 9px", border: "1px solid rgba(66,72,82,0.8)", background: "rgba(10,13,18,0.82)", color: "var(--np-terminal-muted)", fontSize: 10.5 }}>
                  <span>Rotate globe to interrogate clusters. Click markers to route the rest of the desk.</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", color: "var(--np-terminal-amber)" }}>{state.layer === "reactors" ? "reactor command surface" : "fuel cycle command surface"}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ border: "1px solid rgba(66,72,82,0.92)", background: "rgba(12,15,19,0.98)", padding: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={terminalLabelStyle("amber")}>World monitor</div>
                    <div style={{ fontSize: 11, lineHeight: 1.55, marginTop: 5, ...terminalMutedStyle() }}>
                      Top countries in the current scope ranked by fleet capacity and buildout relevance.
                    </div>
                  </div>
                  <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{highlightedCountries.length} in scope</span>
                </div>
                <div style={{ display: "grid", gap: 0, marginTop: 10 }}>
                  {highlightedCountries.map((country, index) => (
                    <button
                      key={country.id}
                      type="button"
                      onClick={() => selectEntity(country)}
                      className="np-terminal-row np-terminal-row--interactive np-terminal-button"
                      style={{
                        ...terminalDataRowStyle(),
                        borderTop: index === 0 ? "none" : terminalDataRowStyle().borderTop,
                        display: "grid",
                        gridTemplateColumns: "28px minmax(0,1fr) auto",
                        gap: 10,
                        alignItems: "center",
                        background: "transparent",
                        borderLeft: "none",
                        borderRight: "none",
                        borderBottom: "none",
                        color: "var(--np-terminal-text)",
                        cursor: "pointer",
                        textAlign: "left",
                        paddingInline: 0,
                      }}
                    >
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: "var(--np-terminal-muted)" }}>{String(index + 1).padStart(2, "0")}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{country.country}</div>
                        <div style={{ fontSize: 10, marginTop: 3, ...terminalMutedStyle() }}>
                          {country.reactors} reactors | {country.activeProjects} projects
                        </div>
                      </div>
                      <div style={{ ...terminalValueStyle({ tone: "amber", size: 12 }), fontWeight: 700 }}>
                        {country.capacityGw.toFixed(1)} GW
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ border: "1px solid rgba(66,72,82,0.92)", background: "rgba(12,15,19,0.98)", padding: "0 10px 10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1.2fr) minmax(84px,0.7fr) auto", gap: 10, padding: "10px 0 8px", borderBottom: "1px solid rgba(55,59,68,0.92)" }}>
                  <div style={terminalTableHeaderStyle("left", "cyan")}>#</div>
                  <div style={terminalTableHeaderStyle("left", "cyan")}>Asset</div>
                  <div style={terminalTableHeaderStyle("left", "cyan")}>Country</div>
                  <div style={terminalTableHeaderStyle("right", "cyan")}>State</div>
                </div>
                <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(isMobileViewport ? 220 : 332), padding: 0 }}>
                  {mapItems.slice(0, isMobileViewport ? 8 : 10).map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        selectEntity(item);
                        if (item.entityType === "plant") onOpenPlant?.(item);
                      }}
                      className="np-terminal-row np-terminal-row--interactive np-terminal-button"
                      style={{
                        ...terminalDataRowStyle(),
                        display: "grid",
                        gridTemplateColumns: "34px minmax(0,1.2fr) minmax(84px,0.7fr) auto",
                        gap: 10,
                        alignItems: "center",
                        textAlign: "left",
                        color: "var(--np-terminal-text)",
                        background: "transparent",
                        borderLeft: "none",
                        borderRight: "none",
                        borderBottom: "none",
                        cursor: "pointer",
                        paddingInline: 0,
                      }}
                    >
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--np-terminal-muted)" }}>{String(index + 1).padStart(2, "0")}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                        <div style={{ fontSize: 10, marginTop: 3, ...terminalMutedStyle() }}>
                          {state.layer === "reactors" ? item.type : item.stage}
                        </div>
                      </div>
                      <div style={{ fontSize: 10.5, ...terminalMutedStyle(), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.country}</div>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: state.layer === "reactors" ? (STATUS_COLORS[item.status] || "var(--np-terminal-amber)") : (SUPPLY_STAGE_COLORS[item.stage] || "var(--np-terminal-cyan)") }}>
                        {state.layer === "reactors" ? item.status : item.stage}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
                <div style={terminalMetricTileStyle({ accent: "var(--np-terminal-amber)" })}>
                  <div style={terminalLabelStyle("amber")}>Fleet</div>
                  <div style={{ ...terminalValueStyle({ tone: "amber", size: 15 }), marginTop: 7 }}>{snapshot.entities.plants.length}</div>
                </div>
                <div style={terminalMetricTileStyle({ accent: "var(--np-terminal-cyan)" })}>
                  <div style={terminalLabelStyle("cyan")}>Supply</div>
                  <div style={{ ...terminalValueStyle({ tone: "cyan", size: 15 }), marginTop: 7 }}>{snapshot.entities.supplySites.length}</div>
                </div>
                <div style={terminalMetricTileStyle({ accent: "var(--np-terminal-green)" })}>
                  <div style={terminalLabelStyle("success")}>Signals</div>
                  <div style={{ ...terminalValueStyle({ tone: "success", size: 15 }), marginTop: 7 }}>{snapshot.entities.newsArticles.length}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </TerminalPanel>
  );
}
