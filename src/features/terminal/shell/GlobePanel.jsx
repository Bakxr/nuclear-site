import { Suspense, useState } from "react";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "../components/TerminalPanel.jsx";
import { STATUS_COLORS } from "../../../data/constants.js";
import { SUPPLY_STAGE_COLORS } from "../../../data/supplySites.js";

const LAYERS = [
  { id: "reactors", label: "Reactors" },
  { id: "uranium", label: "Fuel cycle" },
  { id: "markets", label: "Events" },
];

export default function GlobePanel({ GlobeComponent }) {
  const {
    state,
    mapItems,
    selectedEntity,
    availableCountries,
    availableReactorTypes,
    availableStatuses,
    predictionMarketRows,
    setLayer,
    setCountryFilter,
    setReactorTypeFilter,
    setStatusFilter,
    selectEntity,
    openMarket,
  } = useTerminal();
  const [marketsLayer, setMarketsLayer] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  const activeLayer = marketsLayer ? "markets" : state.layer;
  const anchoredMarkets = predictionMarketRows
    .filter((market) => market?.anchor)
    .map((market) => ({ ...market, lat: market.anchor.lat, lng: market.anchor.lng }));
  const reactorsLayer = activeLayer === "reactors";

  const legend = activeLayer === "markets"
    ? [{ label: "Polymarket", color: "#d4a54a" }, { label: "Kalshi", color: "#8fb8ad" }]
    : reactorsLayer
      ? Object.entries(STATUS_COLORS).map(([label, color]) => ({ label, color }))
      : [...new Set(mapItems.map((item) => item.stage))].slice(0, 5).map((stage) => ({ label: stage, color: SUPPLY_STAGE_COLORS[stage] || "#8fb8ad" }));

  const count = activeLayer === "markets" ? anchoredMarkets.length : mapItems.length;
  const countries = new Set((activeLayer === "markets" ? anchoredMarkets.map((m) => m.anchor?.anchorEntity?.country) : mapItems.map((m) => m.country)).filter(Boolean)).size;

  const chooseLayer = (id) => {
    if (id === "markets") {
      setMarketsLayer(true);
      return;
    }
    setMarketsLayer(false);
    setLayer(id);
  };

  const Globe = GlobeComponent;

  return (
    <TerminalPanel
      panelId="terminal-panel-map"
      title={activeLayer === "markets" ? "Event map" : reactorsLayer ? "Global fleet" : "Fuel cycle"}
      count={count}
      subtitle="Drag to rotate, scroll to zoom. Selecting a marker focuses the whole workspace on it."
      actions={(
        <div className="npt-seg" role="group" aria-label="Map layer">
          {LAYERS.map((layer) => (
            <button key={layer.id} type="button" aria-pressed={activeLayer === layer.id} onClick={() => chooseLayer(layer.id)}>
              {layer.label}
            </button>
          ))}
        </div>
      )}
      bodyStyle={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <div className="npt-globe">
        {activeLayer !== "markets" ? (
          <div className="npt-globe-overlay npt-globe-overlay--tl">
            <select className="npt-select" value={state.countryFilter} onChange={(event) => setCountryFilter(event.target.value)} aria-label="Country">
              <option value="">All countries</option>
              {availableCountries.map((country) => <option key={country} value={country}>{country}</option>)}
            </select>
            {reactorsLayer ? (
              <>
                <select className="npt-select" value={state.reactorTypeFilter} onChange={(event) => setReactorTypeFilter(event.target.value)} aria-label="Reactor type">
                  <option value="">All types</option>
                  {availableReactorTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <select className="npt-select" value={state.statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Status">
                  <option value="">All statuses</option>
                  {availableStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </>
            ) : null}
          </div>
        ) : null}

        <div style={{ position: "absolute", inset: 0 }}>
          <Suspense fallback={<div className="npt-empty"><strong>Loading globe</strong></div>}>
            <Globe
              onSelectPlant={(item) => { if (item) selectEntity(item); }}
              onHoverPlant={(item) => setHoveredId(item?.id ?? null)}
              onSelectMarket={(market) => { if (market) openMarket(market); }}
              onHoverMarket={(market) => setHoveredId(market?.id ?? null)}
              plants={activeLayer === "markets" ? [] : mapItems}
              markets={activeLayer === "markets" ? anchoredMarkets : []}
              mode={activeLayer}
              selectedEntity={selectedEntity}
              highlightedEntityId={hoveredId}
            />
          </Suspense>
        </div>

      </div>
      <div className="npt-globe-foot" aria-label="Legend">
        {legend.map((item) => (
          <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>
        ))}
        <span style={{ marginLeft: "auto", color: "var(--np-terminal-subtle)" }}>{countries} countries</span>
      </div>
    </TerminalPanel>
  );
}
