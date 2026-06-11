import { lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { REACTOR_TYPES, LEARN_COLORS } from "../../data/constants.js";
import ReactorDiagram from "../../components/reactorDiagrams/index.jsx";
import LazySectionFallback from "../../components/LazySectionFallback.jsx";
import { fadeUp, staggerContainer } from "./animations.js";
import { SectionHeader, SectionLabel } from "./shared.jsx";

const Reactor3D = lazy(() => import("../../components/reactorDiagrams/Reactor3D.jsx"));

export default function LearnSection({
  sectionRef,
  isMobileViewport,
  expandedReactor,
  setExpandedReactor,
  reactorViewMode,
  setReactorViewMode,
  learnFilter,
  setLearnFilter,
  flippedCards,
  setFlippedCards,
  filteredFacts,
  highlightedFact,
  setHighlightedFact,
}) {
  return (
    <section ref={sectionRef} style={{ padding: "var(--np-section-y) var(--np-section-x)", scrollMarginTop: 80 }}>
      <div style={{ maxWidth: "var(--np-content-max)", margin: "0 auto" }}>

        {/* Reactor Types */}
        <SectionHeader
          index="06"
          label="Briefing"
          meta="Six designs power the world"
          title={<>Know your <em>reactors.</em></>}
          lede="The six major reactor designs powering the world — click any card to explore advantages, deployments, and a working 3-D model."
        />
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer} style={{ marginBottom: 72 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 18 }}>
            {REACTOR_TYPES.map((r, i) => (
              <motion.div key={r.type} variants={fadeUp} layout
                onClick={() => setExpandedReactor(expandedReactor === r.type ? null : r.type)}
                style={{
                  background: "var(--np-card-bg)", borderRadius: 14, padding: "28px",
                  border: "1px solid var(--np-card-border)", position: "relative", overflow: "hidden",
                  borderTop: `2px solid ${r.color}`, cursor: "pointer", transition: "transform 0.25s, box-shadow 0.25s",
                  ...(expandedReactor === r.type ? { gridColumn: "1 / -1" } : {}),
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${r.color}20`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ position: "absolute", top: 16, right: 16, fontFamily: "var(--np-font-display)", fontSize: 44, fontWeight: 700, color: "var(--np-surface-dim)", lineHeight: 1 }}>{r.share}%</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 700, color: r.color }}>{r.type}</div>
                  {r.reactorCount && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--np-text-muted)", background: "var(--np-surface-dim)", borderRadius: 6, padding: "3px 8px" }}>{r.reactorCount} operating</span>}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--np-text-muted)", marginTop: 4 }}>{r.full}</div>
                <div style={{ fontSize: 13, color: "var(--np-text-muted)", marginTop: 12, lineHeight: 1.55, opacity: 0.75 }}>{r.desc}</div>
                <div style={{ marginTop: 16, height: 3, borderRadius: 2, background: "var(--np-surface-dim)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${r.share}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: i * 0.1 }}
                    style={{ height: "100%", borderRadius: 2, background: r.color }}
                  />
                </div>
                <AnimatePresence>
                  {expandedReactor === r.type && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--np-border-strong)" }}>
                        {/* Info grid */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(3, minmax(0, 1fr))",
                            gap: isMobileViewport ? 16 : 20,
                            marginBottom: 24,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: r.color, fontWeight: 700, marginBottom: 10 }}>Advantages</div>
                            {r.advantages?.map((a, ai) => (
                              <div key={ai} style={{ fontSize: 13, color: "var(--np-text)", lineHeight: 1.6, marginBottom: 4, paddingLeft: 12, position: "relative" }}>
                                <span style={{ position: "absolute", left: 0, color: r.color }}>+</span>{a}
                              </div>
                            ))}
                          </div>
                          <div>
                            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: r.color, fontWeight: 700, marginBottom: 10 }}>Deployed In</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {r.countries?.map((country, ci) => (
                                <span key={ci} style={{ background: "var(--np-surface-dim)", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 500 }}>{country}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: r.color, fontWeight: 700, marginBottom: 10 }}>Example Plants</div>
                            {r.examples?.map((ex, ei) => (
                              <div key={ei} style={{ fontSize: 13, color: "var(--np-text)", lineHeight: 1.6, marginBottom: 4 }}>{ex}</div>
                            ))}
                          </div>
                        </div>

                        {/* Reactor viewer */}
                        <div style={{ background: "var(--np-surface-dim)", borderRadius: 12, overflow: "hidden", border: "1px solid var(--np-border)" }}
                          onClick={e => e.stopPropagation()}
                        >
                          {/* Tab switcher header */}
                          <div className="np-reactor-header" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--np-border)" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--np-text-muted)" }}>
                              {r.type} Reactor Viewer
                            </span>
                            <div style={{ display: "flex", gap: 6 }}>
                              {[{ key: "3d", label: "3D Model" }, { key: "schematic", label: "Schematic" }].map(tab => (
                                <button key={tab.key} onClick={() => setReactorViewMode(tab.key)} style={{
                                  background: reactorViewMode === tab.key ? "var(--np-text)" : "transparent",
                                  color: reactorViewMode === tab.key ? "var(--np-bg)" : "var(--np-text-muted)",
                                  border: "1px solid " + (reactorViewMode === tab.key ? "var(--np-text)" : "var(--np-border)"),
                                  borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 600,
                                  cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
                                }}>{tab.label}</button>
                              ))}
                            </div>
                          </div>
                          {/* View */}
                          {reactorViewMode === "3d"
                            ? (
                              <Suspense fallback={<LazySectionFallback height={320} />}>
                                <Reactor3D key={r.type} type={r.type} />
                              </Suspense>
                            )
                            : <div style={{ padding: isMobileViewport ? "14px 12px" : "16px 20px" }}><ReactorDiagram type={r.type} width={isMobileViewport ? 520 : 900} /></div>
                          }
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div style={{ width: 40, height: 1, background: "var(--np-border-strong)", marginBottom: 64 }} />

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer}>
          <SectionLabel>Field Notes</SectionLabel>
          <motion.h2 variants={fadeUp} style={{ fontFamily: "var(--np-font-display)", fontSize: "clamp(28px,3.2vw,44px)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 12 }}>
            Did you <em style={{ fontStyle: "italic", fontWeight: 350, color: "var(--np-accent-ink)" }}>know?</em>
          </motion.h2>
          <motion.p variants={fadeUp} style={{ color: "var(--np-text-muted)", fontSize: 15, marginBottom: 24, maxWidth: 540, lineHeight: 1.7 }}>Key facts that explain why nuclear power matters for our energy future.</motion.p>

          {/* Filter tabs + Surprise Me */}
          <motion.div variants={fadeUp} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
            {["All", "Environment", "Technology", "History", "Economics"].map(cat => (
              <button key={cat} onClick={() => { setLearnFilter(cat); setFlippedCards({}); }} style={{
                background: learnFilter === cat ? (cat === "All" ? "var(--np-text)" : LEARN_COLORS[cat] + "18") : "var(--np-surface-dim)",
                color: learnFilter === cat ? (cat === "All" ? "var(--np-bg)" : LEARN_COLORS[cat]) : "var(--np-text-muted)",
                border: `1px solid ${learnFilter === cat ? (cat === "All" ? "var(--np-text)" : LEARN_COLORS[cat] + "40") : "var(--np-border)"}`,
                borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
              }}>{cat}</button>
            ))}
            <button onClick={() => {
              const randomIndex = Math.floor(Math.random() * filteredFacts.length);
              setFlippedCards(prev => ({ ...prev, [randomIndex]: true }));
              setHighlightedFact(randomIndex);
              setTimeout(() => setHighlightedFact(null), 2000);
            }} style={{
              marginLeft: "auto", background: "none", border: "1px solid rgba(212,165,74,0.3)",
              borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600,
              cursor: "pointer", color: "#d4a54a", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,165,74,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
            >
              Surprise me
            </button>
          </motion.div>
        </motion.div>

        {/* Fact cards grid */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}
          variants={staggerContainer}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}
        >
          <AnimatePresence mode="popLayout">
            {filteredFacts.map((item, i) => {
              const isFlipped = flippedCards[i];
              const catColor = LEARN_COLORS[item.category] || "#d4a54a";
              const isHighlighted = highlightedFact === i;
              return (
                <motion.div
                  key={item.headline}
                  variants={fadeUp}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setFlippedCards(prev => ({ ...prev, [i]: !prev[i] }))}
                  style={{
                    perspective: 1000, cursor: "pointer", minHeight: 220,
                  }}
                >
                  <div style={{
                    position: "relative", width: "100%", height: "100%", minHeight: 220,
                    transformStyle: "preserve-3d", transition: "transform 0.6s ease",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0)",
                  }}>
                    {/* FRONT */}
                    <div style={{
                      position: "absolute", inset: 0, backfaceVisibility: "hidden",
                      padding: "28px", borderRadius: 14, border: "1px solid var(--np-card-border)",
                      background: "var(--np-card-bg)", borderTop: `2px solid ${catColor}`,
                      display: "flex", flexDirection: "column", justifyContent: "space-between",
                      transition: "box-shadow 0.3s, transform 0.3s",
                      boxShadow: isHighlighted ? `0 0 24px ${catColor}40` : "none",
                    }}>
                      <div>
                        <span style={{
                          display: "inline-block", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                          letterSpacing: "0.08em", color: catColor, background: catColor + "12",
                          borderRadius: 6, padding: "4px 10px", marginBottom: 14,
                        }}>{item.category}</span>
                        <h4 style={{
                          fontFamily: "var(--np-font-display)", fontSize: 18, fontWeight: 500,
                          lineHeight: 1.3, color: "var(--np-text)", margin: 0,
                        }}>{item.headline}</h4>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--np-text-faint)", margin: 0, marginTop: 16 }}>Click to learn more →</p>
                    </div>

                    {/* BACK */}
                    <div style={{
                      position: "absolute", inset: 0, backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)", padding: "24px", borderRadius: 14,
                      border: "1px solid var(--np-card-border)", background: "var(--np-card-bg)",
                      borderTop: `2px solid ${catColor}`, display: "flex", flexDirection: "column",
                      overflow: "auto",
                    }}>
                      <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--np-text)", margin: 0, flex: 1 }}>{item.fact}</p>

                      {/* Comparison visualization */}
                      {item.comparison && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--np-border)" }}>
                          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--np-text-muted)", marginBottom: 8 }}>{item.comparison.label}</div>
                          {item.comparison.items.map((bar, bi) => {
                            const maxVal = Math.max(...item.comparison.items.map(b => b.value));
                            return (
                              <div key={bi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                <span style={{ fontSize: 11, width: 52, textAlign: "right", color: "var(--np-text-muted)", flexShrink: 0 }}>{bar.name}</span>
                                <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--np-surface-dim)" }}>
                                  <div style={{
                                    height: "100%", borderRadius: 3, background: catColor,
                                    width: `${(bar.value / maxVal) * 100}%`, transition: "width 0.8s ease",
                                  }} />
                                </div>
                                <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--np-text)", fontWeight: 600, width: 40, flexShrink: 0 }}>{bar.value}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--np-border)" }}>
                        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          style={{ fontSize: 11, color: catColor, textDecoration: "none", fontWeight: 600, transition: "opacity 0.2s" }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                        >
                          Source: {item.source} ↗
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
