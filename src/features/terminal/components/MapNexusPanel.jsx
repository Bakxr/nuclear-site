import { Suspense } from "react";
import { STATUS_COLORS } from "../../../data/constants.js";
import { SUPPLY_STAGE_COLORS } from "../../../data/supplySites.js";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLabelStyle,
  terminalMutedStyle,
  terminalSelectStyle,
  terminalTagStyle,
} from "./styles.js";

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
  const assetTone = state.layer === "reactors" ? "amber" : "cyan";
  const actions = (
    <>
      <button type="button" onClick={() => setLayer("reactors")} className="np-terminal-button" style={terminalButtonStyle(state.layer === "reactors")}>Reactors</button>
      <button type="button" onClick={() => setLayer("uranium")} className="np-terminal-button" style={terminalButtonStyle(state.layer === "uranium", { tone: "cyan" })}>Uranium</button>
      {isMobileViewport ? (
        <button type="button" onClick={() => setMapCollapsed(!state.mapCollapsed)} className="np-terminal-button" style={terminalButtonStyle(false)}>
          {state.mapCollapsed ? "Open map" : "Collapse"}
        </button>
      ) : null}
    </>
  );

  return (
    <TerminalPanel title="Map nexus" subtitle={`${mapItems.length} linked ${state.layer === "reactors" ? "reactor" : "fuel-cycle"} assets in view`} actions={actions}>
      <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 14 }}>
        <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <span style={terminalLabelStyle("cyan")}>Country</span>
          <select value={state.countryFilter} onChange={(event) => setCountryFilter(event.target.value)} style={terminalSelectStyle(false)}>
            <option value="">All countries</option>
            {availableCountries.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <span style={terminalLabelStyle("cyan")}>Reactor type</span>
          <select value={state.reactorTypeFilter} onChange={(event) => setReactorTypeFilter(event.target.value)} disabled={state.layer !== "reactors"} style={terminalSelectStyle(state.layer !== "reactors")}>
            <option value="">All reactor types</option>
            {availableReactorTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <span style={terminalLabelStyle("cyan")}>Status</span>
          <select value={state.statusFilter} onChange={(event) => setStatusFilter(event.target.value)} disabled={state.layer !== "reactors"} style={terminalSelectStyle(state.layer !== "reactors")}>
            <option value="">All statuses</option>
            {availableStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <span style={terminalLabelStyle("cyan")}>Focus</span>
          <div style={{ minWidth: 0, borderRadius: 8, border: "1px solid var(--np-terminal-border)", background: "rgba(17,23,35,0.92)", padding: "10px 12px" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "var(--np-terminal-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {selectedEntity ? (selectedEntity.name || selectedEntity.title || selectedEntity.country) : "Global"}
            </div>
            <div style={{ fontSize: 11, marginTop: 4, ...terminalMutedStyle() }}>
              {selectedEntity ? `${selectedEntity.entityType} linked into the current layer` : "Worldwide operating picture"}
            </div>
          </div>
        </div>
      </div>

      {!state.mapCollapsed ? (
        <div style={{ position: "relative", height: isMobileViewport ? 320 : 560, borderRadius: 10, overflow: "hidden", border: "1px solid var(--np-terminal-border)", background: "radial-gradient(circle at 50% 42%, rgba(26,48,76,0.55) 0%, rgba(10,18,28,0.96) 44%, rgba(5,8,12,1) 100%)" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(97,230,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(97,230,255,0.05) 1px, transparent 1px)", backgroundSize: "36px 36px", opacity: 0.35 }} />
          <div style={{ position: "absolute", inset: 10, border: "1px solid rgba(97,230,255,0.1)", borderRadius: 8, pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 10, left: 10, zIndex: 3, display: "flex", gap: 8, flexWrap: "wrap", pointerEvents: "none" }}>
            <span style={terminalTagStyle({ tone: assetTone, compact: true })}>
              {state.layer === "reactors" ? "Reactor layer" : "Fuel-cycle layer"}
            </span>
            <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{mapItems.length} assets in view</span>
          </div>
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
      ) : null}

      <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={terminalLabelStyle(assetTone)}>Asset queue</div>
          <div style={{ fontSize: 11.5, ...terminalMutedStyle() }}>
            Priority assets nearest the current map filter stack.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 0 }}>
          {mapItems.slice(0, isMobileViewport ? 6 : 8).map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                selectEntity(item);
                if (item.entityType === "plant") onOpenPlant?.(item);
              }}
              className="np-terminal-row np-terminal-row--interactive np-terminal-button"
              style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "32px minmax(0,1fr) auto", gap: 10, alignItems: "start", textAlign: "left", color: "var(--np-terminal-text)", background: "transparent", borderLeft: "none", borderRight: "none", borderBottom: "none", cursor: "pointer" }}
            >
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "var(--np-terminal-muted)", paddingTop: 1 }}>{String(index + 1).padStart(2, "0")}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                <div style={{ fontSize: 11, marginTop: 4, ...terminalMutedStyle() }}>
                  {item.country} // {state.layer === "reactors" ? item.type : item.stage}
                </div>
              </div>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: state.layer === "reactors" ? (STATUS_COLORS[item.status] || "var(--np-terminal-amber)") : (SUPPLY_STAGE_COLORS[item.stage] || "var(--np-terminal-cyan)") }}>
                {state.layer === "reactors" ? item.status : item.stage}
              </div>
            </button>
          ))}
        </div>
      </div>
    </TerminalPanel>
  );
}
