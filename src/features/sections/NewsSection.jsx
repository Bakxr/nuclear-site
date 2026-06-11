import { motion, AnimatePresence } from "framer-motion";
import ErrorBoundary from "../../components/ErrorBoundary.jsx";
import { inferNewsLocation } from "../../utils/news.js";
import { fadeUp, staggerContainer } from "./animations.js";
import { SectionHeader } from "./shared.jsx";

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
        <div style={{ maxWidth: "var(--np-content-max)", margin: "0 auto" }}>
          <SectionHeader
            index="03"
            label="Dispatch"
            meta={`${news.length} stories · ${uniqueNewsSources} sources`}
            title={<>The nuclear <em>dispatch.</em></>}
            lede="Live reactor, policy, uranium, and buildout coverage from the sources moving the nuclear conversation."
          />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer}>
            <motion.div variants={fadeUp} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 28, marginTop: -24 }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontWeight: 700,
                color: newsStatusColor,
                border: `1px solid ${newsError ? "rgba(212,165,74,0.35)" : "rgba(74,222,128,0.3)"}`,
                padding: "6px 12px",
                borderRadius: 999,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: newsStatusColor, ...(newsError ? {} : { boxShadow: "0 0 0 3px rgba(74,222,128,0.15)" }) }} />
                {newsStatusLabel}
              </span>
              {newsLastUpdated && (
                <span style={{ fontFamily: "var(--np-font-mono)", fontSize: 11, color: "var(--np-text-faint)", letterSpacing: "0.04em" }}>
                  Updated {newsLastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              )}
            </motion.div>
          </motion.div>
          <div className="np-news-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
            {/* Tag filters */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["All", "Policy", "Industry", "Expansion", "Research", "Markets", "Innovation", "Safety"].map(tag => (
                <button key={tag} onClick={() => { setNewsFilter(tag); setNewsLimit(6); }}
                  className={`np-chip${newsFilter === tag ? " is-active" : ""}`}
                >{tag}</button>
              ))}
            </div>
            {/* Sort controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10.5, color: "var(--np-text-faint)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginRight: 4 }}>Sort</span>
              {[
                { key: "latest", label: "Latest" },
                { key: "top",    label: "Top Stories" },
                { key: "source", label: "By Source" },
              ].map(s => (
                <button key={s.key} onClick={() => { setNewsSort(s.key); setNewsLimit(6); }}
                  className={`np-chip np-chip--accent${newsSort === s.key ? " is-active" : ""}`}
                >{s.label}</button>
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
                    className="np-card"
                    style={{
                      padding: "26px 28px",
                      cursor: "pointer",
                      textDecoration: "none", color: "inherit", display: "block",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--np-border)" }}>
                      <span style={{
                        fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 700,
                        color: "var(--np-accent-ink)",
                      }}>{n.tag}</span>
                      <span style={{ fontFamily: "var(--np-font-mono)", fontSize: 10.5, color: "var(--np-text-faint)" }}>{n.date}</span>
                    </div>
                    <h3 style={{
                      fontFamily: "var(--np-font-display)", fontSize: 21, fontWeight: 450, letterSpacing: "-0.01em",
                      lineHeight: 1.3, margin: 0, color: "var(--np-text)", marginBottom: n.curiosityHook ? 10 : 12
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
                <button onClick={() => setNewsLimit(l => l + 6)} className="np-btn np-btn--ghost">
                  Show more <span className="np-btn-arrow" aria-hidden="true">↓</span>
                </button>
              ) : (
                <button onClick={() => setNewsLimit(6)} className="np-btn np-btn--ghost">
                  Show less <span className="np-btn-arrow" aria-hidden="true">↑</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </ErrorBoundary>
  );
}
