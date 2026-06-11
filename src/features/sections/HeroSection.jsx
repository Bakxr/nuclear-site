import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { NUCLEAR_PLANTS } from "../../data/plants.js";
import { EASE, wordReveal } from "./animations.js";
import CountUp from "./CountUp.jsx";

// Fallback values used until the live fetch returns (or if every provider fails).
const URANIUM_FALLBACK = {
  target: 110,
  sub: "per lb U₃O₈",
  source: "UxC / Trading Economics",
  sourceUrl: "https://tradingeconomics.com/commodity/uranium",
};

const STATIC_GLOBAL_STATS = [
  { label: "Operating Reactors", target: 440, decimals: 0, prefix: "", suffix: "", sub: "across 32 countries", source: "IAEA PRIS", sourceUrl: "https://pris.iaea.org/PRIS/WorldStatistics/OperationalReactorsByCountry.aspx" },
  { label: "Under Construction", target: 63, decimals: 0, prefix: "", suffix: "", sub: "in 16 countries", source: "IAEA PRIS", sourceUrl: "https://pris.iaea.org/PRIS/WorldStatistics/UnderConstructionReactorsByCountry.aspx" },
  { label: "Global Electricity", target: 10, decimals: 0, prefix: "~", suffix: "%", sub: "2,818 TWh in 2024", source: "World Nuclear Association", sourceUrl: "https://world-nuclear.org/nuclear-essentials/how-much-of-the-world-s-electricity-comes-from-nuclear" },
  { label: "CO₂ Avoided", target: 2, decimals: 0, prefix: "", suffix: " Gt", sub: "per year vs. fossil fuels", source: "IAEA Climate Report", sourceUrl: "https://www.iaea.org/topics/nuclear-power-and-climate-change" },
  { label: "Capacity Factor", target: 92.5, decimals: 1, prefix: "", suffix: "%", sub: "highest of any source", source: "US EIA, 2024", sourceUrl: "https://www.eia.gov/electricity/monthly/" },
];

function buildUraniumStat(live) {
  if (live && Number.isFinite(live.pricePerLb)) {
    return {
      label: "Uranium Price",
      target: live.pricePerLb,
      decimals: live.pricePerLb >= 100 ? 0 : 2,
      prefix: "$",
      suffix: "",
      sub: URANIUM_FALLBACK.sub,
      source: live.source || URANIUM_FALLBACK.source,
      sourceUrl: live.sourceUrl || URANIUM_FALLBACK.sourceUrl,
    };
  }
  return {
    label: "Uranium Price",
    target: URANIUM_FALLBACK.target,
    decimals: 0,
    prefix: "$",
    suffix: "",
    sub: URANIUM_FALLBACK.sub,
    source: URANIUM_FALLBACK.source,
    sourceUrl: URANIUM_FALLBACK.sourceUrl,
  };
}

function useUraniumPrice() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch("/api/news", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => { if (!cancelled && payload?.uranium) setData(payload.uranium); })
      .catch(() => {});
    return () => { cancelled = true; controller.abort(); };
  }, []);
  return data;
}

export default function HeroSection({
  statsRef,
  isDark,
  isMobileViewport,
  heroY,
  heroOpacity,
  showStats,
}) {
  const uranium = useUraniumPrice();
  const GLOBAL_STATS = [...STATIC_GLOBAL_STATS, buildUraniumStat(uranium)];
  return (
    <div
      className="np-first-fold"
      style={{
        minHeight: "calc(100svh - 108px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        background: "var(--np-bg)",
      }}
    >
      {/* Hero */}
      <section className="np-hero" style={{
        textAlign: "center",
        padding: "44px 40px 8px",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isDark
          ? "radial-gradient(circle at top, rgba(212,165,74,0.12), transparent 30%), linear-gradient(180deg, #17120c 0%, #0e0b08 62%, #090705 100%)"
          : "radial-gradient(circle at top, rgba(212,165,74,0.16), transparent 38%), linear-gradient(180deg, #f7f5ec 0%, #efecdd 48%, #f3f1e8 100%)",
        overflow: "hidden",
        flex: 1,
      }}>
        <div aria-hidden="true" className="np-hero-grid" />
        <motion.div style={isMobileViewport ? { width: "100%" } : { y: heroY, opacity: heroOpacity, width: "100%" }}>
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } }}
            style={{
              fontFamily: "var(--np-font-display)", fontSize: "clamp(40px,7vw,84px)", fontWeight: 400,
              lineHeight: 0.94, letterSpacing: "-0.04em", maxWidth: 900, margin: "0 auto", color: isDark ? "#f5f0e8" : "#1b1609",
              textTransform: "uppercase",
              textShadow: isDark ? "0 12px 40px rgba(0,0,0,0.36)" : "none",
            }}
          >
            {["Baseload", "for", "the"].map((w, i) => (
              <motion.span key={i} variants={wordReveal} style={{ display: "inline-block", marginRight: "0.22em" }}>{w}</motion.span>
            ))}
            <br />
            <motion.em variants={wordReveal} style={{ color: isDark ? "#d4a54a" : "#a37b1e", display: "inline-block", marginRight: "0.22em", fontStyle: "normal" }}>industrial century.</motion.em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.85 }}
            style={{ fontSize: 16, color: isDark ? "rgba(245,240,232,0.76)" : "#5e5546", maxWidth: 680, margin: "16px auto 0", lineHeight: 1.75, fontWeight: 500 }}
          >
            The grid will not be rebuilt with slogans. Track {NUCLEAR_PLANTS.length}+ reactors, uranium-sensitive markets, national buildouts, and the political fight over firm power in one scroll-heavy briefing.
          </motion.p>
        </motion.div>
      </section>

      {/* Stats */}
      <section
        ref={statsRef}
        className="np-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6,1fr)",
          gap: 1,
          background: "var(--np-bg)",
          margin: "auto 0 0",
          flexShrink: 0,
        }}
      >
        {GLOBAL_STATS.map((s, i) => (
          <a key={i} href={s.sourceUrl} target="_blank" rel="noopener noreferrer" style={{
            background: "var(--np-bg)", padding: "18px 20px 22px", textAlign: "center",
            opacity: showStats ? 1 : 0, transform: showStats ? "translateY(0)" : "translateY(16px)",
            transition: `all 0.5s ease ${i * 0.08}s`,
            textDecoration: "none", color: "inherit", display: "block",
            position: "relative", cursor: "pointer",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--np-surface-dim)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--np-bg)"}
          >
            <div style={{ fontFamily: "var(--np-font-display)", fontSize: 36, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>
              <CountUp target={s.target} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} active={showStats} delay={i * 80} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--np-text-muted)", marginTop: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
            <div style={{ fontSize: 11, color: "var(--np-text-faint)", marginTop: 4, lineHeight: 1.4 }}>{s.sub}</div>
            <div style={{ fontSize: 9, color: "#d4a54a", marginTop: 8, letterSpacing: "0.04em", opacity: 0.7 }}>↗ {s.source}</div>
          </a>
        ))}
      </section>
    </div>
  );
}
