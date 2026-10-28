import { useState } from "react";
import { STATUS_TEXT_COLORS } from "../../data/constants.js";
import { SUPPLY_STAGE_COLORS } from "../../data/supplySites.js";
import { NUCLEAR_PLANTS } from "../../data/plants.js";
import { URANIUM_SUPPLY_SITES } from "../../data/supplySites.js";
import ErrorBoundary from "../../components/ErrorBoundary.jsx";
import PrintGlobe from "../front/PrintGlobe.jsx";
import PrintMap from "../front/PrintMap.jsx";
import { SectionHeader } from "./shared.jsx";

const LAYERS = [
  { key: "reactors", label: "Power plants" },
  { key: "uranium", label: "Uranium sites" },
];

const VIEWS = [
  { key: "globe", label: "Globe" },
  { key: "flat", label: "Flat" },
];

// "By the numbers" for whatever the map is showing.
function figures(items, reactors) {
  const countries = new Set(items.map((item) => item.country)).size;
  if (!reactors) {
    return [
      { value: items.length, label: "sites" },
      { value: countries, label: countries === 1 ? "country" : "countries" },
      { value: items.filter((item) => /mine/i.test(item.stage || "")).length, label: "mines" },
    ];
  }
  const operating = items.filter((item) => item.status === "Operating");
  const gigawatts = operating.reduce((sum, item) => sum + (Number(item.capacity) || 0), 0) / 1000;
  return [
    { value: gigawatts >= 10 ? Math.round(gigawatts) : gigawatts.toFixed(1), unit: "GW", label: "operating" },
    { value: operating.length, label: operating.length === 1 ? "plant running" : "plants running" },
    { value: items.filter((item) => item.status === "Construction").length, label: "under construction", pulse: true },
    { value: countries, label: countries === 1 ? "country" : "countries" },
  ];
}

// The reactor map: an engraved globe (PrintGlobe) or a flat printed map
// (PrintMap) beside a ruled list. App's filter state drives both.
export default function GlobeSection({
  sectionRef,
  globeLayer,
  setGlobeLayer,
  plantFilter,
  setPlantFilter,
  activeGlobeItems,
  visibleGlobeItems,
  setSelectedPlant,
  globePanelListRef,
  shouldUseCompactGlobePanel,
  mobileGlobePanelExpanded,
  setMobileGlobePanelExpanded,
  globePanelPreviewCount,
  globeCountryFilter,
  setGlobeCountryFilter,
  globeReactorTypeFilter,
  setGlobeReactorTypeFilter,
  globeCountryOptions,
  globeReactorTypeOptions,
  hasActiveGlobeFilters,
  searchQuery,
}) {
  const reactors = globeLayer === "reactors";
  const legend = reactors ? STATUS_TEXT_COLORS : SUPPLY_STAGE_COLORS;
  const totalCount = reactors ? NUCLEAR_PLANTS.length : URANIUM_SUPPLY_SITES.length;
  const noun = reactors ? "plants" : "sites";
  const narrowed = activeGlobeItems.length < totalCount;
  const [view, setView] = useState("globe");

  return (
    <ErrorBoundary section="Map">
      <section ref={sectionRef} className="np-wrap" style={{ paddingTop: "var(--np-section-y)", scrollMarginTop: 60 }}>
        <SectionHeader
          label="Reactor map"
          meta={reactors ? "IAEA PRIS · plant profiles" : "Uranium mines and fuel-cycle sites"}
          title={reactors ? "Every reactor on Earth" : "Where the uranium comes from"}
        />

        <dl className="np-figures">
          {figures(activeGlobeItems, reactors).map((figure) => (
            <div key={figure.label}>
              <dt>{figure.pulse ? <span className="np-figures-pulse" aria-hidden="true" /> : null}{figure.label}</dt>
              <dd className="np-num">{figure.value}{figure.unit ? <small> {figure.unit}</small> : null}</dd>
            </div>
          ))}
        </dl>

        <div className="np-map-toolbar">
          <div role="group" aria-label="Map view" className="np-segmented">
            {VIEWS.map((option) => (
              <button key={option.key} type="button" aria-pressed={view === option.key} onClick={() => setView(option.key)}>
                {option.label}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Map layer" className="np-segmented">
            {LAYERS.map((layer) => (
              <button
                key={layer.key}
                type="button"
                aria-pressed={globeLayer === layer.key}
                onClick={() => {
                  setGlobeLayer(layer.key);
                  if (layer.key === "reactors") setPlantFilter("All");
                }}
              >{layer.label}</button>
            ))}
          </div>
          <label className="np-field">
            <span>Country</span>
            <select value={globeCountryFilter} onChange={(e) => setGlobeCountryFilter(e.target.value)}>
              <option value="">All countries</option>
              {globeCountryOptions.map((country) => <option key={country} value={country}>{country}</option>)}
            </select>
          </label>
          {reactors ? (
            <label className="np-field">
              <span>Reactor type</span>
              <select value={globeReactorTypeFilter} onChange={(e) => setGlobeReactorTypeFilter(e.target.value)}>
                <option value="">All types</option>
                {globeReactorTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
          ) : null}
          {hasActiveGlobeFilters ? (
            <button type="button" className="np-text-link" onClick={() => { setGlobeCountryFilter(""); setGlobeReactorTypeFilter(""); }}>
              Clear filters
            </button>
          ) : null}
        </div>

        <div role="group" aria-label={reactors ? "Filter by status" : "Legend"} className="np-legend">
          {Object.entries(legend).map(([label, color]) => {
            const pressed = reactors && plantFilter === label;
            const dimmed = reactors && plantFilter !== "All" && !pressed;
            const swatch = <span className="np-legend-dot" style={{ background: color }} aria-hidden="true" />;
            return reactors ? (
              <button
                key={label}
                type="button"
                aria-pressed={pressed}
                className={dimmed ? "is-dimmed" : undefined}
                onClick={() => setPlantFilter(pressed ? "All" : label)}
              >{swatch}{label}</button>
            ) : (
              <span key={label}>{swatch}{label}</span>
            );
          })}
          <span className="np-legend-count">
            {activeGlobeItems.length} {noun}{narrowed ? ` of ${totalCount}` : ""}{searchQuery ? ` · “${searchQuery}”` : ""}
          </span>
        </div>

        <div className="np-map-layout">
          {view === "globe" ? (
            <PrintGlobe items={activeGlobeItems} mode={globeLayer} totalCount={totalCount} onSelectPlant={setSelectedPlant} />
          ) : (
            <PrintMap items={activeGlobeItems} mode={globeLayer} totalCount={totalCount} onSelectPlant={setSelectedPlant} />
          )}

          <div className="np-map-list">
            <ul ref={globePanelListRef}>
              {visibleGlobeItems.map((item) => (
                <li key={item.id || item.name}>
                  {reactors ? (
                    <button type="button" onClick={() => setSelectedPlant(item)}>
                      <span className="np-map-list-name">{item.name}</span>
                      <span className="np-map-list-meta">{item.country} · {item.type}</span>
                      <span className="np-map-list-figure np-num">{Number(item.capacity || 0).toLocaleString("en-US")} MW</span>
                      <span className="np-map-list-status" style={{ color: STATUS_TEXT_COLORS[item.status] ?? STATUS_TEXT_COLORS.Idle }}>{item.status}</span>
                    </button>
                  ) : (
                    <div className="np-map-list-site">
                      <span className="np-map-list-name">{item.name}</span>
                      <span className="np-map-list-meta">{item.country} · {item.region} · {item.operator}</span>
                      <span className="np-map-list-figure">{item.stage}</span>
                      <span className="np-map-list-status">{item.status}</span>
                      {item.detail ? <p>{item.detail}</p> : null}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {shouldUseCompactGlobePanel && activeGlobeItems.length > globePanelPreviewCount ? (
              <button
                type="button"
                className="np-btn np-btn--ghost"
                style={{ width: "100%", marginTop: 12 }}
                onClick={() => setMobileGlobePanelExpanded(!mobileGlobePanelExpanded)}
              >
                {mobileGlobePanelExpanded ? "Show fewer" : `Show all ${activeGlobeItems.length} ${noun}`}
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </ErrorBoundary>
  );
}
