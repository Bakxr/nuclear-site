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
  terminalScrollAreaStyle,
  terminalSelectStyle,
  terminalTableHeaderStyle,
  terminalTagStyle,
  terminalValueStyle,
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
      <button type="button" onClick={() => setLayer("reactors")} className="np-terminal-button" style={terminalButtonStyle(state.layer === "reactors", { compact: true })}>Reactors</button>
      <button type="button" onClick={() => setLayer("uranium")} className="np-terminal-button" style={terminalButtonStyle(state.layer === "uranium", { compact: true, tone: "cyan" })}>Uranium</button>
      {isMobileViewport ? (
        <button type="button" onClick={() => setMapCollapsed(!state.mapCollapsed)} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true })}>
          {state.mapCollapsed ? "Open map" : "Collapse"}
        </button>
      ) : null}
    </>
  );

  return (
    <TerminalPanel title="Map nexus" subtitle={`${mapItems.length} linked ${state.layer === "reactors" ? "reactor" : "fuel-cycle"} assets in view`} actions={actions}>
      <div style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr)) minmax(180px,0.9fr)",
            gap: 8,
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
            <div
              style={{
                minWidth: 0,
                border: "1px solid rgba(51,66,86,0.92)",
                background: "rgba(8,12,18,0.95)",
                padding: "8px 10px",
              }}
            >
              <div style={{ ...terminalValueStyle({ tone: assetTone, size: 14 }), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {state.layer === "reactors" ? "reactor fleet" : "fuel cycle"}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
            <span style={terminalLabelStyle("cyan")}>Focus</span>
            <div
              style={{
                minWidth: 0,
                border: "1px solid rgba(51,66,86,0.92)",
                background: "rgba(8,12,18,0.95)",
                padding: "8px 10px",
              }}
            >
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "var(--np-terminal-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedEntity ? (selectedEntity.name || selectedEntity.title || selectedEntity.country) : "global"}
              </div>
              <div style={{ fontSize: 10, marginTop: 4, ...terminalMutedStyle() }}>
                {selectedEntity ? `${selectedEntity.entityType} linked` : "worldwide operating picture"}
              </div>
            </div>
          </div>
        </div>

        {!state.mapCollapsed ? (
          <div
            style={{
              position: "relative",
              height: isMobileViewport ? 300 : 520,
              overflow: "hidden",
              border: "1px solid rgba(51,66,86,0.96)",
              background: "radial-gradient(circle at 50% 42%, rgba(20,40,62,0.65) 0%, rgba(7,12,20,0.98) 44%, rgba(4,7,11,1) 100%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                backgroundImage: "linear-gradient(rgba(97,230,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(97,230,255,0.05) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
                opacity: 0.42,
              }}
            />
            <div style={{ position: "absolute", inset: 8, border: "1px solid rgba(97,230,255,0.14)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 24, border: "1px solid rgba(255,159,28,0.08)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: 8, left: 8, zIndex: 3, display: "flex", gap: 6, flexWrap: "wrap", pointerEvents: "none" }}>
              <span style={terminalTagStyle({ tone: assetTone, compact: true })}>
                {state.layer === "reactors" ? "reactor layer" : "fuel layer"}
              </span>
              <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{mapItems.length} assets</span>
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

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1.2fr) minmax(80px,0.7fr) auto", gap: 10, padding: "0 10px 6px", borderBottom: "1px solid rgba(51,66,86,0.92)" }}>
            <div style={terminalTableHeaderStyle("left", "cyan")}>#</div>
            <div style={terminalTableHeaderStyle("left", "cyan")}>Asset</div>
            <div style={terminalTableHeaderStyle("left", "cyan")}>Country</div>
            <div style={terminalTableHeaderStyle("right", "cyan")}>State</div>
          </div>
          <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(isMobileViewport ? 260 : 220), padding: "0 10px" }}>
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
                  gridTemplateColumns: "34px minmax(0,1.2fr) minmax(80px,0.7fr) auto",
                  gap: 10,
                  alignItems: "center",
                  textAlign: "left",
                  color: "var(--np-terminal-text)",
                  background: "transparent",
                  borderLeft: "none",
                  borderRight: "none",
                  borderBottom: "none",
                  cursor: "pointer",
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
      </div>
    </TerminalPanel>
  );
}
