import { motion, AnimatePresence } from "framer-motion";
import { ENERGY_COMPARISON, ENERGY_SOURCE_COLORS, STATUS_COLORS } from "../../data/constants.js";
import { normalizeCountryName } from "../../utils/countries.js";
import { fadeUp, staggerContainer } from "./animations.js";
import { SectionLabel } from "./shared.jsx";

export default function DataSection({
  sectionRef,
  isDark,
  dataView,
  setDataView,
  dataSort,
  setDataSort,
  expandedCountry,
  setExpandedCountry,
  hoveredCountry,
  setHoveredCountry,
  hoveredSource,
  setHoveredSource,
  compareMetric,
  setCompareMetric,
  activeComparisonMetric,
  totalCountries,
  sortedNuclearShare,
  halfCount,
  dataShowAll,
  setDataShowAll,
  getBarWidth,
  plantsByCountry,
  comparisonRows,
  formatComparisonValue,
  setSelectedPlant,
  setSelectedCountry,
  setSearchQuery,
  scrollTo,
}) {
  return (
    <section ref={sectionRef} className="np-data-section" style={{ padding: "var(--np-section-y) var(--np-section-x)", background: "var(--np-surface-dim)", scrollMarginTop: 80 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer}>
          <SectionLabel>Global Data</SectionLabel>
          <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 8 }}>
            Global nuclear <em style={{ color: "var(--np-text-muted)" }}>proof.</em>
          </motion.h2>
          <motion.p variants={fadeUp} style={{ color: "var(--np-text-muted)", fontSize: 15, marginBottom: 24, lineHeight: 1.6, maxWidth: 740 }}>
            See which countries are betting biggest on nuclear, and why the numbers keep making the case for it. This is the signal behind the weekly briefing.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="np-data-shell"
            style={{
              border: `1px solid ${isDark ? "rgba(245,240,232,0.08)" : "var(--np-border)"}`,
              borderRadius: 24,
              background: isDark
                ? "linear-gradient(180deg, rgba(245,240,232,0.045) 0%, rgba(245,240,232,0.02) 100%)"
                : "linear-gradient(180deg, var(--np-surface) 0%, rgba(255,255,255,0.72) 100%)",
              overflow: "hidden",
              boxShadow: isDark ? "0 20px 50px rgba(0,0,0,0.24)" : "0 20px 50px rgba(30,25,18,0.06)",
            }}
          >
            <div
              className="np-data-toolbar"
              style={{
                padding: "20px 24px 18px",
                borderBottom: `1px solid ${isDark ? "rgba(245,240,232,0.08)" : "var(--np-border)"}`,
                display: "grid",
                gap: 12,
                background: isDark
                  ? "linear-gradient(180deg, rgba(212,165,74,0.12) 0%, rgba(245,240,232,0.025) 100%)"
                  : "linear-gradient(180deg, rgba(212,165,74,0.06) 0%, rgba(212,165,74,0.015) 100%)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { key: "countries", label: "Countries" },
                      { key: "proof", label: "Energy Proof" },
                    ].map((view) => (
                      <button
                        key={view.key}
                        className="np-data-pill"
                        onClick={() => {
                          setDataView(view.key);
                          if (view.key !== "countries") setExpandedCountry(null);
                        }}
                        style={{
                          background: dataView === view.key ? "var(--np-text)" : isDark ? "rgba(245,240,232,0.04)" : "var(--np-surface)",
                          color: dataView === view.key ? "var(--np-bg)" : "var(--np-text-muted)",
                          border: `1px solid ${dataView === view.key ? "var(--np-text)" : isDark ? "rgba(245,240,232,0.08)" : "var(--np-border)"}`,
                        }}
                      >
                        {view.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--np-text-faint)", fontWeight: 700, marginTop: 2 }}>
                    {dataView === "countries" ? "Rank countries by buildout signal" : "Compare major power sources by one shared metric"}
                  </div>
                </div>

                <div className="np-data-summary" style={{ display: "grid", gap: 6, minWidth: 230 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4a54a" }}>
                    {dataView === "countries" ? "Country lens" : "Proof lens"}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, lineHeight: 1.05, letterSpacing: "-0.03em", color: "var(--np-text)" }}>
                    {dataView === "countries" ? "Where nuclear is already real." : activeComparisonMetric.label}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--np-text-muted)" }}>
                    {dataView === "countries"
                      ? `${totalCountries} countries ranked by ${dataSort === "capacity" ? "installed capacity" : dataSort === "reactors" ? "reactor count" : "share of electricity from nuclear"}.`
                      : activeComparisonMetric.description}
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {dataView === "countries" ? (
                  <motion.div
                    key="country-controls"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}
                  >
                    {[
                      { key: "capacity", label: "Capacity" },
                      { key: "reactors", label: "Reactors" },
                      { key: "share", label: "Nuclear Share" },
                    ].map((sort) => (
                      <button
                        key={sort.key}
                        className="np-data-chip"
                        onClick={() => setDataSort(sort.key)}
                        style={{
                          background: dataSort === sort.key ? "rgba(212,165,74,0.12)" : "transparent",
                          color: dataSort === sort.key ? "#d4a54a" : "var(--np-text-muted)",
                          border: `1px solid ${dataSort === sort.key ? "rgba(212,165,74,0.35)" : "var(--np-border)"}`,
                        }}
                      >
                        {sort.label}
                      </button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="proof-controls"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    style={{ display: "grid", gap: 14 }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {ENERGY_COMPARISON.map((metric) => (
                        <button
                          key={metric.key}
                          className="np-data-chip"
                          onClick={() => setCompareMetric(metric.key)}
                          style={{
                            background: compareMetric === metric.key ? "rgba(212,165,74,0.12)" : "transparent",
                            color: compareMetric === metric.key ? "#d4a54a" : "var(--np-text-muted)",
                            border: `1px solid ${compareMetric === metric.key ? "rgba(212,165,74,0.35)" : "var(--np-border)"}`,
                          }}
                        >
                          {metric.label}
                        </button>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 14,
                        padding: "16px 18px",
                        borderRadius: 16,
                        background: isDark ? "rgba(212,165,74,0.1)" : "rgba(212,165,74,0.06)",
                        border: `1px solid ${isDark ? "rgba(212,165,74,0.22)" : "rgba(212,165,74,0.16)"}`,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#d4a54a" }}>
                          Source
                        </div>
                        <a href={activeComparisonMetric.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--np-text)", textDecoration: "none", fontWeight: 600 }}>
                          {activeComparisonMetric.source}
                        </a>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--np-text-faint)" }}>
                          Unit
                        </div>
                        <div style={{ fontSize: 13, color: "var(--np-text-muted)", fontWeight: 600 }}>
                          {activeComparisonMetric.unit}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div style={{ padding: "18px 24px 24px" }}>
              <AnimatePresence mode="wait" initial={false}>
                {dataView === "countries" ? (
                  <motion.div
                    key="countries-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                  >
                    <div style={{ display: "grid", gap: 6 }}>
                      {(dataShowAll ? sortedNuclearShare : sortedNuclearShare.slice(0, halfCount)).map((c, i) => (
                        <div key={c.country} style={{ borderBottom: "1px solid var(--np-border)" }}>
                          <div
                            onClick={() => setExpandedCountry(expandedCountry === c.country ? null : c.country)}
                            onMouseEnter={() => setHoveredCountry(c.country)}
                            onMouseLeave={() => setHoveredCountry(null)}
                            className="np-data-row"
                            style={{
                              display: "grid",
                              gridTemplateColumns: "36px 110px 1fr 84px 132px 24px",
                              alignItems: "center",
                              gap: 12,
                              padding: "14px 8px",
                              cursor: "pointer",
                              borderRadius: 12,
                              transition: "background 0.2s ease",
                              background: hoveredCountry === c.country ? "rgba(212,165,74,0.04)" : expandedCountry === c.country ? "rgba(212,165,74,0.06)" : "transparent",
                            }}
                          >
                            <span style={{ fontSize: 20 }}>{c.flag}</span>
                            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--np-text)" }}>{c.country}</span>
                            <div className="np-data-bar" style={{ position: "relative", height: 20, borderRadius: 999, background: "var(--np-surface-dim)", overflow: "hidden" }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(getBarWidth(c), 1.5)}%` }}
                                transition={{ duration: 0.75, ease: "easeOut", delay: i * 0.03 }}
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  width: `${Math.max(getBarWidth(c), 1.5)}%`,
                                  borderRadius: 999,
                                  background: "linear-gradient(90deg, #d4a54a 0%, rgba(212,165,74,0.55) 100%)",
                                }}
                              />
                            </div>
                            <span className="np-data-value" style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, textAlign: "right", whiteSpace: "nowrap", color: "var(--np-text)" }}>
                              {dataSort === "capacity" ? c.capacity : dataSort === "reactors" ? c.reactors : `${c.nuclear}%`}
                            </span>
                            <span className="np-data-sub" style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--np-text-faint)", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              {dataSort === "capacity"
                                ? `${c.nuclear}% share | ${c.reactors} reactors`
                                : dataSort === "reactors"
                                  ? `${c.nuclear}% share | ${c.capacity}`
                                  : `${c.reactors} reactors | ${c.capacity}`}
                            </span>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: expandedCountry === c.country ? "#d4a54a" : "var(--np-text-faint)", textAlign: "center" }}>
                              {expandedCountry === c.country ? "-" : "+"}
                            </span>
                          </div>

                          <AnimatePresence initial={false}>
                            {expandedCountry === c.country && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.24, ease: "easeInOut" }}
                                style={{ overflow: "hidden" }}
                              >
                                <div style={{ padding: "0 8px 18px 56px", display: "grid", gap: 14 }}>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {(plantsByCountry[normalizeCountryName(c.country)] || []).map((p) => (
                                      <button
                                        key={p.name}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPlant(p);
                                        }}
                                        style={{
                                          background: "var(--np-surface-dim)",
                                          border: "1px solid var(--np-border)",
                                          borderRadius: 999,
                                          padding: "8px 12px",
                                          fontSize: 12,
                                          cursor: "pointer",
                                          transition: "all 0.2s ease",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 8,
                                          color: "var(--np-text)",
                                          fontFamily: "'DM Sans',sans-serif",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = "rgba(212,165,74,0.08)";
                                          e.currentTarget.style.borderColor = "rgba(212,165,74,0.3)";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = "var(--np-surface-dim)";
                                          e.currentTarget.style.borderColor = "var(--np-border)";
                                        }}
                                      >
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLORS[p.status] ?? STATUS_COLORS.Idle, display: "inline-block" }} />
                                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                                        <span style={{ color: "var(--np-text-muted)", fontSize: 11 }}>{p.capacity.toLocaleString("en-US")} MW</span>
                                      </button>
                                    ))}
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchQuery(c.country);
                                        scrollTo("globe");
                                      }}
                                      className="np-data-chip"
                                      style={{
                                        background: "transparent",
                                        color: "#d4a54a",
                                        border: "1px solid rgba(212,165,74,0.3)",
                                      }}
                                    >
                                      View on globe
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCountry(c.country);
                                      }}
                                      className="np-data-chip"
                                      style={{
                                        background: "transparent",
                                        color: "#d4a54a",
                                        border: "1px solid rgba(212,165,74,0.3)",
                                      }}
                                    >
                                      Country profile
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>

                    <div style={{ textAlign: "center", marginTop: 22 }}>
                      <button
                        className="np-data-chip"
                        onClick={() => setDataShowAll((value) => !value)}
                        style={{
                          background: "transparent",
                          color: "var(--np-text-muted)",
                          border: "1px solid var(--np-border)",
                          padding: "10px 22px",
                        }}
                      >
                        {dataShowAll ? "Show less" : `Show all ${totalCountries} countries`}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="proof-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                    style={{ display: "grid", gap: 20 }}
                  >
                    <div style={{ display: "grid", gap: 6 }}>
                      {comparisonRows.map((row, i) => {
                        const color = ENERGY_SOURCE_COLORS[row.name] || "#8b7355";
                        const isNuclear = row.name === "Nuclear";
                        return (
                          <div
                            key={row.name}
                            className="np-data-row np-proof-row"
                            onMouseEnter={() => setHoveredSource(row.name)}
                            onMouseLeave={() => setHoveredSource(null)}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "20px 96px 1fr 92px 150px",
                              alignItems: "center",
                              gap: 12,
                              padding: "14px 8px",
                              borderBottom: "1px solid var(--np-border)",
                              borderRadius: 12,
                              background: hoveredSource === row.name ? "rgba(212,165,74,0.04)" : "transparent",
                              transition: "background 0.2s ease",
                            }}
                          >
                            <span style={{ width: 10, height: 10, borderRadius: "50%", background: isNuclear ? "#d4a54a" : color, display: "inline-block" }} />
                            <span style={{ fontWeight: isNuclear ? 700 : 600, fontSize: 14, color: isNuclear ? "var(--np-text)" : "var(--np-text-muted)" }}>
                              {row.name}
                            </span>
                            <div className="np-data-bar" style={{ position: "relative", height: 20, borderRadius: 999, background: "var(--np-surface-dim)", overflow: "hidden" }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(row.width, 1.5)}%` }}
                                transition={{ duration: 0.65, ease: "easeOut", delay: i * 0.03 }}
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  width: `${Math.max(row.width, 1.5)}%`,
                                  borderRadius: 999,
                                  background: isNuclear ? "linear-gradient(90deg, #d4a54a 0%, rgba(212,165,74,0.6) 100%)" : color,
                                  opacity: isNuclear ? 1 : hoveredSource === row.name ? 0.82 : 0.64,
                                }}
                              />
                            </div>
                            <span className="np-data-value" style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, textAlign: "right", whiteSpace: "nowrap", color: "var(--np-text)" }}>
                              {`${formatComparisonValue(row.value)}${activeComparisonMetric.unit === "%" ? "%" : ""}`}
                            </span>
                            <span className="np-data-sub" style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: row.isBest ? (isNuclear ? "#d4a54a" : "#4ade80") : "var(--np-text-faint)", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              {row.isBest ? "Best result" : activeComparisonMetric.lowerIsBetter ? "Lower is better" : "Higher is better"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 18,
                        padding: "18px 20px",
                        borderRadius: 18,
                        background: isDark ? "rgba(212,165,74,0.1)" : "rgba(212,165,74,0.06)",
                        border: `1px solid ${isDark ? "rgba(212,165,74,0.22)" : "rgba(212,165,74,0.14)"}`,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#d4a54a" }}>
                          Why this matters
                        </div>
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--np-text)", fontWeight: 600 }}>
                          {activeComparisonMetric.insight}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--np-text-faint)" }}>
                          Direction
                        </div>
                        <div style={{ fontSize: 13, color: "var(--np-text-muted)", fontWeight: 600 }}>
                          {activeComparisonMetric.lowerIsBetter ? "Lower wins" : "Higher wins"}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
