import { Suspense } from "react";
import { STATUS_COLORS } from "../../../data/constants.js";
import { SUPPLY_STAGE_COLORS } from "../../../data/supplySites.js";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import { terminalButtonStyle, terminalDataRowStyle, terminalSelectStyle } from "./styles.js";

export default function MapNexusPanel({ GlobeComponent, isMobileViewport, onOpenPlant }) {
  const {
    state,
    mapItems,
    selectedEntity,
    availableCountries,
    availableReactorTypes,
    availableStatuses,
    setLayer,
    setCountryFilter,
    setReactorTypeFilter,
    setStatusFilter,
    setMapCollapsed,
    selectEntity,
  } = useTerminal();

  const GlobeView = GlobeComponent;
  const actions = (
    <>
      <button type="button" onClick={() => setLayer("reactors")} style={terminalButtonStyle(state.layer === "reactors")}>Reactors</button>
      <button type="button" onClick={() => setLayer("uranium")} style={terminalButtonStyle(state.layer === "uranium")}>Uranium</button>
      {isMobileViewport ? (
        <button type="button" onClick={() => setMapCollapsed(!state.mapCollapsed)} style={terminalButtonStyle(false)}>
          {state.mapCollapsed ? "Open map" : "Collapse"}
        </button>
      ) : null}
    </>
  );

  return (
    <TerminalPanel title="Map nexus" subtitle={`${mapItems.length} linked ${state.layer === "reactors" ? "reactor" : "fuel-cycle"} assets in view`} actions={actions}>
      <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 14 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(245,240,232,0.44)" }}>Country</span>
          <select value={state.countryFilter} onChange={(event) => setCountryFilter(event.target.value)} style={terminalSelectStyle(false)}>
            <option value="">All countries</option>
            {availableCountries.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(245,240,232,0.44)" }}>Reactor type</span>
          <select value={state.reactorTypeFilter} onChange={(event) => setReactorTypeFilter(event.target.value)} disabled={state.layer !== "reactors"} style={terminalSelectStyle(state.layer !== "reactors")}>
            <option value="">All reactor types</option>
            {availableReactorTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(245,240,232,0.44)" }}>Status</span>
          <select value={state.statusFilter} onChange={(event) => setStatusFilter(event.target.value)} disabled={state.layer !== "reactors"} style={terminalSelectStyle(state.layer !== "reactors")}>
            <option value="">All statuses</option>
            {availableStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(245,240,232,0.44)" }}>Focus</span>
          <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: "10px 12px", fontSize: 13, color: "rgba(245,240,232,0.72)" }}>
            {selectedEntity ? (selectedEntity.name || selectedEntity.title || selectedEntity.country) : "Global"}
          </div>
        </div>
      </div>

      {!state.mapCollapsed ? (
        <div style={{ height: isMobileViewport ? 320 : 560, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", background: "radial-gradient(ellipse at 50% 40%, #0d1b2a 0%, #09131d 65%, #060d15 100%)" }}>
          <Suspense fallback={<div style={{ height: "100%", display: "grid", placeItems: "center", color: "rgba(245,240,232,0.38)" }}>Loading globe...</div>}>
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
      ) : null}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        {mapItems.slice(0, isMobileViewport ? 6 : 8).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              selectEntity(item);
              if (item.entityType === "plant") onOpenPlant?.(item);
            }}
            style={{ ...terminalDataRowStyle(), textAlign: "left", cursor: "pointer", color: "#f5f0e8" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "rgba(245,240,232,0.5)" }}>
                  {item.country} | {state.layer === "reactors" ? item.type : item.stage}
                </div>
              </div>
              <div style={{ fontSize: 10, color: state.layer === "reactors" ? (STATUS_COLORS[item.status] || "#d4a54a") : (SUPPLY_STAGE_COLORS[item.stage] || "#d4a54a"), textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                {item.status}
              </div>
            </div>
          </button>
        ))}
      </div>
    </TerminalPanel>
  );
}
