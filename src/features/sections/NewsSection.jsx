import { motion, AnimatePresence } from "framer-motion";
import ErrorBoundary from "../../components/ErrorBoundary.jsx";
import { inferNewsLocation } from "../../utils/news.js";
import { fadeUp, staggerContainer } from "./animations.js";
import { SectionLabel } from "./shared.jsx";

export default function NewsSection({
  sectionRef,
  news,
  newsLoading,
  newsError,
  newsFilter,
  newsSort,
  newsLimit,
  filteredNews,
  uniqueNewsSources,
  newsLastUpdated,
  newsStatusLabel,
  newsStatusTone,
  newsStatusColor,
  setNewsFilter,
  setNewsSort,
  setNewsLimit,
  refreshNews,
  getNewsMapLayer,
  setGlobeLayer,
  setPlantFilter,
  setSearchQuery,
  scrollTo,
}) {
  return (
    <ErrorBoundary section="News">
      <section ref={sectionRef} style={{ padding: "var(--np-section-y) var(--np-section-x)", scrollMarginTop: 80, background: "linear-gradient(to bottom, var(--np-bg-alt) 0%, var(--np-bg) 100%)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer}>
            <SectionLabel>Industry News</SectionLabel>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 8 }}>
              Nuclear <em style={{ color: "var(--np-text-muted)" }}>dispatch.</em>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "var(--np-text-muted)", fontSize: 15, marginBottom: 20, maxWidth: 640, lineHeight: 1.6 }}>Live reactor, policy, uranium, and buildout coverage from the sources moving the nuclear conversation.</motion.p>
            <motion.div variants={fadeUp} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 28 }}>
              <span style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 700,
                color: newsStatusColor,
                background: newsStatusTone,
                border: `1px solid ${newsError ? "rgba(212,165,74,0.25)" : "rgba(74,222,128,0.22)"}`,
                padding: "6px 10px",
                borderRadius: 999,
              }}>
                {newsStatusLabel}
              </span>
              <span style={{ fontSize: 12, color: "var(--np-text-faint)" }}>
                {news.length} stories · {uniqueNewsSources} sources
              </span>
              {newsLastUpdated && (
                <span style={{ fontSize: 12, color: "var(--np-text-faint)" }}>
                  Updated {newsLastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              )}
            </motion.div>
          </motion.div>
          <div className="np-news-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
            {/* Tag filters */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["All", "Policy", "Industry", "Expansion", "Research", "Markets", "Innovation", "Safety"].map(tag => (
                <button key={tag} onClick={() => { setNewsFilter(tag); setNewsLimit(6); }} style={{
                  background: newsFilter === tag ? "var(--np-text)" : "var(--np-surface)",
                  color: newsFilter === tag ? "var(--np-bg)" : "var(--np-text-muted)",
                  border: `1px solid ${newsFilter === tag ? "var(--np-text)" : "var(--np-border)"}`,
                  borderRadius: 24, padding: "9px 20px", fontSize: 13, fontFamily: "'DM Sans',sans-serif",
                  fontWeight: 500, cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: newsFilter === tag ? "0 2px 8px rgba(0,0,0,0.15)" : "0 1px 3px rgba(0,0,0,0.04)",
                }}
                  onMouseEnter={e => { if (newsFilter !== tag) { e.currentTarget.style.borderColor = "var(--np-border-strong)"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.08)"; } }}
                  onMouseLeave={e => { if (newsFilter !== tag) { e.currentTarget.style.borderColor = "var(--np-border)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; } }}
                >{tag}</button>
              ))}
            </div>
            {/* Sort controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: "var(--np-text-faint)", fontWeight: 500, marginRight: 2 }}>Sort:</span>
              {[
                { key: "latest", label: "Latest" },
                { key: "top",    label: "Top Stories" },
                { key: "source", label: "By Source" },
              ].map(s => (
                <button key={s.key} onClick={() => { setNewsSort(s.key); setNewsLimit(6); }} style={{
                  background: newsSort === s.key ? "rgba(212,165,74,0.12)" : "var(--np-surface)",
                  color: newsSort === s.key ? "#d4a54a" : "var(--np-text-muted)",
                  border: `1px solid ${newsSort === s.key ? "rgba(212,165,74,0.35)" : "var(--np-border)"}`,
                  borderRadius: 8, padding: "7px 14px", fontSize: 12, fontFamily: "'DM Sans',sans-serif",
                  fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                }}>{s.label}</button>
              ))}
            </div>
          </div>
          {/* Live feed unavailable — show curated fallback banner */}
          {newsError && !newsLoading && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", marginBottom: 20, borderRadius: 8,
              background: "rgba(212,165,74,0.07)", border: "1px solid rgba(212,165,74,0.2)",
              fontSize: 12, color: "var(--np-text-muted)",
            }}>
              <span>Live feeds temporarily unavailable — showing curated articles.</span>
              <button onClick={refreshNews}
                style={{
                  background: "none", border: "1px solid rgba(212,165,74,0.4)", color: "#d4a54a",
                  padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans',sans-serif", flexShrink: 0, marginLeft: 12,
                }}>
                Retry
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            {newsLoading && news.length === 0 ? (
              <motion.div key="skeleton"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="np-news-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 24 }}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} style={{
                    padding: "28px 30px", borderRadius: 16, border: "1px solid var(--np-border)",
                    background: "var(--np-surface)", height: 160, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    animation: "pulse 1.5s ease-in-out infinite",
                    animationDelay: `${i * 0.08}s`,
                  }} />
                ))}
              </motion.div>
            ) : (
              <motion.div key={`articles-${newsFilter}-${newsSort}`}
                initial="hidden" animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                className="np-news-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 24 }}>
                {filteredNews.length > 0 ? filteredNews.slice(0, newsLimit).map((n, i) => {
                  const inferredLocation = inferNewsLocation(n);
                  return (
                  <motion.a key={n.url || i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: (i % 6) * 0.05 }}
                    href={n.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      padding: "28px 30px", borderRadius: 16, border: "1px solid var(--np-card-border)",
                      background: "var(--np-surface)", cursor: "pointer", transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
                      textDecoration: "none", color: "inherit", display: "block",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "rgba(212,165,74,0.4)";
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--np-card-border)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span style={{
                        fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700,
                        color: "#d4a54a", background: "rgba(212,165,74,0.08)", padding: "4px 10px",
                        borderRadius: 12
                      }}>{n.tag}</span>
                      <span style={{ fontSize: 11, color: "var(--np-text-faint)", fontWeight: 500 }}>{n.date}</span>
                    </div>
                    <h3 style={{
                      fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 500,
                      lineHeight: 1.4, margin: 0, color: "var(--np-text)", marginBottom: n.curiosityHook ? 10 : 12
                    }}>{n.title}</h3>
                    <p style={{
                      fontSize: 13, color: "var(--np-text-muted)", lineHeight: 1.6,
                      margin: "0 0 12px", display: "-webkit-box",
                      WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>{n.curiosityHook || n.whyItMatters}</p>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--np-text-faint)", marginBottom: 8 }}>
                      Why it matters
                    </div>
                    <div style={{
                      fontSize: 12, color: "var(--np-text-muted)", fontWeight: 500,
                      display: "flex", alignItems: "center", gap: 6
                    }}>
                      <span>{n.source}</span>
                      <span style={{ fontSize: 14 }}>→</span>
                    </div>
                      {inferredLocation && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setGlobeLayer(getNewsMapLayer(n));
                            setPlantFilter("All");
                            setSearchQuery(inferredLocation);
                            scrollTo("globe");
                          }}
                          style={{
                            marginTop: 12,
                            background: "none",
                            border: "1px solid rgba(212,165,74,0.25)",
                            color: "#d4a54a",
                            borderRadius: 999,
                            padding: "6px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                            fontFamily: "'DM Sans',sans-serif",
                          }}
                        >
                          Focus map: {inferredLocation}
                        </button>
                      )}
                    </motion.a>
                  );
                }) : (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 60, color: "var(--np-text-muted)" }}>
                    No news articles available. Try selecting a different category.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Show More / Show Less */}
          {!newsLoading && filteredNews.length > 6 && (
            <div style={{ textAlign: "center", marginTop: 40 }}>
              {newsLimit < filteredNews.length ? (
                <button onClick={() => setNewsLimit(l => l + 6)} style={{
                  background: "none", border: "1px solid var(--np-border-strong)",
                  borderRadius: 10, padding: "13px 36px", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", color: "var(--np-text)", fontFamily: "'DM Sans',sans-serif",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,165,74,0.5)"; e.currentTarget.style.color = "#d4a54a"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--np-border-strong)"; e.currentTarget.style.color = "var(--np-text)"; }}
                >
                  Show more · {Math.min(filteredNews.length - newsLimit, 6)} of {filteredNews.length - newsLimit} remaining
                </button>
              ) : (
                <button onClick={() => setNewsLimit(6)} style={{
                  background: "none", border: "1px solid var(--np-border)",
                  borderRadius: 10, padding: "13px 36px", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", color: "var(--np-text-muted)", fontFamily: "'DM Sans',sans-serif",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--np-border-strong)"; e.currentTarget.style.color = "var(--np-text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--np-border)"; e.currentTarget.style.color = "var(--np-text-muted)"; }}
                >
                  Show less ↑
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </ErrorBoundary>
  );
}
