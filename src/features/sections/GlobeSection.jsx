import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { STATUS_COLORS } from "../../data/constants.js";
import { SUPPLY_STAGE_COLORS } from "../../data/supplySites.js";
import ErrorBoundary from "../../components/ErrorBoundary.jsx";
import LazySectionFallback from "../../components/LazySectionFallback.jsx";
import { fadeUp, staggerContainer } from "./animations.js";
import { SectionLabel } from "./shared.jsx";

const Globe = lazy(() => import("../../components/Globe.jsx"));

export default function GlobeSection({
  sectionRef,
  globeLayer,
  setGlobeLayer,
  plantFilter,
  setPlantFilter,
  filteredPlants,
  filteredSupplySites,
  activeGlobeItems,
  visibleGlobeItems,
  setSelectedPlant,
  globePanelRef,
  globePanelListRef,
  globeFiltersRef,
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
  globeFiltersOpen,
  setGlobeFiltersOpen,
  searchQuery,
}) {
  return (
    <ErrorBoundary section="Globe">
      <section ref={sectionRef} style={{ padding: "var(--np-section-y) var(--np-section-x) 48px", scrollMarginTop: 80, background: "var(--np-bg)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="np-globe-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 20 }}>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={staggerContainer}>
              <SectionLabel>Interactive Map</SectionLabel>
              <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", margin: 0 }}>
                Every reactor on{" "}
                <em style={{ color: "var(--np-accent)", fontStyle: "italic", textShadow: "0 0 18px rgba(212,165,74,0.08)" }}>
                  Earth.
                </em>
              </motion.h2>
              <motion.p variants={fadeUp} style={{ color: "var(--np-text-muted)", fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                {globeLayer === "reactors"
                  ? `Drag to rotate, click markers for details, and track ${filteredPlants.length} live plant profiles.`
                  : `Trace ${filteredSupplySites.length} uranium mines and fuel-cycle sites behind the reactor buildout story.`}
              </motion.p>
            </motion.div>
            <div style={{ display: "flex", gap: 14, fontSize: 11, alignItems: "center", flexWrap: "wrap" }}>
              {Object.entries(globeLayer === "reactors" ? STATUS_COLORS : SUPPLY_STAGE_COLORS).map(([label, color]) => (
                <span
                  key={label}
                  onClick={() => {
                    if (globeLayer !== "reactors") return;
                    setPlantFilter(plantFilter === label ? "All" : label);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    cursor: globeLayer === "reactors" ? "pointer" : "default",
                    opacity: globeLayer === "reactors" && plantFilter !== "All" && plantFilter !== label ? 0.35 : 1,
                    transition: "opacity 0.2s ease",
                    color: "var(--np-text-muted)",
                  }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block" }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="np-globe-layout" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, minHeight: 520 }}>
            <div
              className="np-globe-stage"
              style={{
                background: "radial-gradient(ellipse at 50% 40%, #0d1b2a 0%, #0a1520 60%, #060e15 100%)",
                borderRadius: 16,
                border: "1px solid var(--np-border)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Suspense fallback={<LazySectionFallback height={520} />}>
                <Globe onSelectPlant={setSelectedPlant} plants={activeGlobeItems} mode={globeLayer} />
              </Suspense>
            </div>

            <div
              ref={globePanelRef}
              className={`np-globe-panel${shouldUseCompactGlobePanel ? " np-globe-panel-mobile" : ""}${mobileGlobePanelExpanded ? " is-expanded" : " is-collapsed"}`}
              style={{
                background: "var(--np-surface-dim)",
                borderRadius: 16,
                border: "1px solid var(--np-border)",
                padding: "16px 18px 28px",
                overflowY: shouldUseCompactGlobePanel ? "visible" : "auto",
                maxHeight: shouldUseCompactGlobePanel ? "none" : 520,
              }}
            >
              <div className="np-globe-panel-header" style={{ position: shouldUseCompactGlobePanel ? "relative" : "sticky", top: 0, background: "linear-gradient(180deg, rgba(30,25,18,0.96) 0%, rgba(30,25,18,0.9) 72%, rgba(30,25,18,0) 100%)", padding: "6px 0 14px", backdropFilter: "blur(8px)", zIndex: 2, borderRadius: 14 }}>
                <div className="np-globe-panel-top-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <div className="np-globe-toggle-row" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[{ key: "reactors", label: "Plants" }, { key: "uranium", label: "Mines" }].map((view) => {
                    const active = globeLayer === view.key;
                    return (
                      <button
                        key={view.key}
                        type="button"
                        onClick={() => {
                          setGlobeLayer(view.key);
                          if (view.key === "reactors") setPlantFilter("All");
                        }}
                        style={{
                          borderRadius: 999,
                          border: `1px solid ${active ? "rgba(212,165,74,0.45)" : "var(--np-border)"}`,
                          background: active ? "#f5f0e8" : "rgba(255,255,255,0.02)",
                          color: active ? "var(--np-bg)" : "var(--np-text-muted)",
                          padding: "8px 14px",
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        {view.label}
                      </button>
                    );
                  })}
                </div>
                  <div ref={globeFiltersRef} className="np-globe-filters-menu" style={{ position: "relative", marginLeft: "auto" }}>
                    <button
                      type="button"
                      className={`np-globe-filters-trigger${hasActiveGlobeFilters ? " is-active" : ""}`}
                      onClick={() => setGlobeFiltersOpen((open) => !open)}
                      aria-expanded={globeFiltersOpen}
                      aria-haspopup="true"
                      style={{
                        borderRadius: 999,
                        border: `1px solid ${hasActiveGlobeFilters ? "rgba(212,165,74,0.42)" : "var(--np-border)"}`,
                        background: hasActiveGlobeFilters ? "rgba(212,165,74,0.12)" : "rgba(255,255,255,0.02)",
                        color: hasActiveGlobeFilters ? "var(--np-accent)" : "var(--np-text-muted)",
                        padding: "8px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        fontFamily: "'DM Sans',sans-serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Filters{hasActiveGlobeFilters ? ` (${Number(Boolean(globeCountryFilter)) + Number(Boolean(globeReactorTypeFilter))})` : ""}
                    </button>
                    {globeFiltersOpen && (
                      <div
                        className="np-globe-filters-dropdown"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 10px)",
                          right: 0,
                          width: shouldUseCompactGlobePanel ? "min(100vw - 64px, 280px)" : 280,
                          padding: 14,
                          borderRadius: 14,
                          border: "1px solid var(--np-border-strong)",
                          background: "var(--np-surface)",
                          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.16)",
                          zIndex: 4,
                        }}
                      >
                        <div className="np-globe-dropdown-fields" style={{ display: "grid", gap: 12 }}>
                          <label className="np-globe-filter-field">
                            <span>Country</span>
                            <select
                              className="np-globe-filter-select"
                              value={globeCountryFilter}
                              onChange={(e) => setGlobeCountryFilter(e.target.value)}
                            >
                              <option value="">All countries</option>
                              {globeCountryOptions.map((country) => (
                                <option key={country} value={country}>
                                  {country}
                                </option>
                              ))}
                            </select>
                          </label>
                          {globeLayer === "reactors" && (
                            <label className="np-globe-filter-field">
                              <span>Reactor type</span>
                              <select
                                className="np-globe-filter-select"
                                value={globeReactorTypeFilter}
                                onChange={(e) => setGlobeReactorTypeFilter(e.target.value)}
                              >
                                <option value="">All types</option>
                                {globeReactorTypeOptions.map((reactorType) => (
                                  <option key={reactorType} value={reactorType}>
                                    {reactorType}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          {hasActiveGlobeFilters && (
                            <button
                              type="button"
                              className="np-globe-filter-clear"
                              onClick={() => {
                                setGlobeCountryFilter("");
                                setGlobeReactorTypeFilter("");
                              }}
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="np-globe-panel-meta" style={{ fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--np-text-muted)" }}>
                  {activeGlobeItems.length} {globeLayer === "reactors" ? "Plants" : "Mines"} {searchQuery && `· "${searchQuery}"`}
                </div>
                <div className="np-globe-filter-bar">
                  <label className="np-globe-filter-field">
                    <span>Country</span>
                    <select
                      className="np-globe-filter-select"
                      value={globeCountryFilter}
                      onChange={(e) => setGlobeCountryFilter(e.target.value)}
                    >
                      <option value="">All countries</option>
                      {globeCountryOptions.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </label>
                  {globeLayer === "reactors" && (
                    <label className="np-globe-filter-field">
                      <span>Reactor type</span>
                      <select
                        className="np-globe-filter-select"
                        value={globeReactorTypeFilter}
                        onChange={(e) => setGlobeReactorTypeFilter(e.target.value)}
                      >
                        <option value="">All types</option>
                        {globeReactorTypeOptions.map((reactorType) => (
                          <option key={reactorType} value={reactorType}>
                            {reactorType}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {hasActiveGlobeFilters && (
                    <button
                      type="button"
                      className="np-globe-filter-clear"
                      onClick={() => {
                        setGlobeCountryFilter("");
                        setGlobeReactorTypeFilter("");
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: "none", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--np-text-muted)", marginBottom: 12 }}>
                {filteredPlants.length} Plants {searchQuery && `· "${searchQuery}"`}
              </div>
              <div className="np-globe-filter-bar">
                <label className="np-globe-filter-field">
                  <span>Country</span>
                  <select
                    className="np-globe-filter-select"
                    value={globeCountryFilter}
                    onChange={(e) => setGlobeCountryFilter(e.target.value)}
                  >
                    <option value="">All countries</option>
                    {globeCountryOptions.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </label>
                {globeLayer === "reactors" && (
                  <label className="np-globe-filter-field">
                    <span>Reactor type</span>
                    <select
                      className="np-globe-filter-select"
                      value={globeReactorTypeFilter}
                      onChange={(e) => setGlobeReactorTypeFilter(e.target.value)}
                    >
                      <option value="">All types</option>
                      {globeReactorTypeOptions.map((reactorType) => (
                        <option key={reactorType} value={reactorType}>
                          {reactorType}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {hasActiveGlobeFilters && (
                  <button
                    type="button"
                    className="np-globe-filter-clear"
                    onClick={() => {
                      setGlobeCountryFilter("");
                      setGlobeReactorTypeFilter("");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <div
                ref={globePanelListRef}
                className={`np-globe-panel-list${shouldUseCompactGlobePanel ? " np-globe-panel-list-mobile" : ""}`}
                style={{
                  paddingBottom: 10,
                  overflowY: shouldUseCompactGlobePanel && mobileGlobePanelExpanded ? "auto" : "visible",
                  maxHeight: shouldUseCompactGlobePanel && mobileGlobePanelExpanded ? 320 : "none",
                }}
              >
              {globeLayer === "reactors" ? visibleGlobeItems.map((plant) => (
                <div
                  className="np-globe-list-item"
                  key={plant.name}
                  onClick={() => setSelectedPlant(plant)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--np-border)",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,165,74,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--np-text)" }}>{plant.name}</div>
                    <div style={{ fontSize: 11, color: "var(--np-text-muted)" }}>{plant.country} · {plant.type}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12.5, fontWeight: 600, color: "var(--np-text)" }}>
                      {plant.capacity.toLocaleString("en-US")} MW
                    </div>
                    <div style={{ fontSize: 10, color: STATUS_COLORS[plant.status] ?? STATUS_COLORS.Idle }}>
                      ● {plant.status}
                    </div>
                  </div>
                </div>
              )) : visibleGlobeItems.map((site) => (
                <div
                  className="np-globe-list-item"
                  key={site.id}
                  style={{
                    padding: "12px 12px",
                    borderRadius: 8,
                    borderBottom: "1px solid var(--np-border)",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--np-text)" }}>{site.name}</div>
                      <div style={{ fontSize: 11, color: "var(--np-text-muted)" }}>{site.country} · {site.region}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11.5, fontWeight: 700, color: SUPPLY_STAGE_COLORS[site.stage] || "var(--np-accent)" }}>
                        {site.stage}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--np-text-faint)" }}>{site.status}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--np-text-muted)", lineHeight: 1.55 }}>{site.detail}</div>
                  <div style={{ fontSize: 10.5, color: "var(--np-text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {site.operator}
                  </div>
                </div>
              ))}
              </div>
              {shouldUseCompactGlobePanel && activeGlobeItems.length > globePanelPreviewCount && (
                <button
                  type="button"
                  className="np-globe-show-more"
                  onClick={() => {
                    if (mobileGlobePanelExpanded) {
                      setMobileGlobePanelExpanded(false);
                      globePanelListRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
                    } else {
                      setMobileGlobePanelExpanded(true);
                    }
                  }}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    borderRadius: 999,
                    border: "1px solid rgba(212,165,74,0.28)",
                    background: "transparent",
                    color: "#d4a54a",
                    padding: "10px 16px",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                >
                  {mobileGlobePanelExpanded
                    ? "Show less"
                    : `Show ${activeGlobeItems.length - globePanelPreviewCount} more`}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </ErrorBoundary>
  );
}
