import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { STOCKS_BASE, NUCLEAR_SHARE, REACTOR_TYPES, LEARN_FACTS, LEARN_COLORS, ENERGY_COMPARISON, ENERGY_SOURCE_COLORS, STATUS_COLORS } from "./data/constants.js";
import { NUCLEAR_PLANTS } from "./data/plants.js";
import { fetchStockHistory, fetchMultipleQuotes } from "./services/stocksAPI.js";
import { fetchNuclearNews, getInstantNews } from "./services/newsAPI.js";
import useDarkMode from "./hooks/useDarkMode.js";
import Timeline from "./components/Timeline.jsx";
import Globe from "./components/Globe.jsx";
import StockModal from "./components/StockModal.jsx";
import PlantModal from "./components/PlantModal.jsx";
import CountryModal from "./components/CountryModal.jsx";
import StockTicker from "./components/StockTicker.jsx";
import SearchOverlay from "./components/SearchOverlay.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ReactorDiagram from "./components/reactorDiagrams/index.jsx";
import Reactor3D from "./components/reactorDiagrams/Reactor3D.jsx";

// ─── ROTATING QUOTES ──────────────────────────────────────────────────
const QUOTES = [
  {
    text: "Nuclear energy produces zero carbon during operation, achieves a 92.5% capacity factor, and runs 24/7 — making it humanity's most reliable clean baseload power.",
    attr: "World Nuclear Association",
  },
  {
    text: "Nuclear power is the only large-scale, reliable, weather-independent electricity source that produces minimal carbon emissions. We need it.",
    attr: "James Hansen, NASA Climate Scientist",
  },
  {
    text: "To address climate change we will need safe and reliable low-carbon energy sources. Nuclear power, it turns out, is far safer than most forms of energy.",
    attr: "Steven Pinker, Harvard University",
  },
];

// ─── ANIMATION VARIANTS ───────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const GLOBAL_STATS = [
  { label: "Operating Reactors", target: 440, decimals: 0, prefix: "", suffix: "", sub: "across 32 countries", source: "IAEA PRIS", sourceUrl: "https://pris.iaea.org/PRIS/WorldStatistics/OperationalReactorsByCountry.aspx" },
  { label: "Under Construction", target: 63, decimals: 0, prefix: "", suffix: "", sub: "in 16 countries", source: "IAEA PRIS", sourceUrl: "https://pris.iaea.org/PRIS/WorldStatistics/UnderConstructionReactorsByCountry.aspx" },
  { label: "Global Electricity", target: 10, decimals: 0, prefix: "~", suffix: "%", sub: "2,818 TWh in 2024", source: "World Nuclear Association", sourceUrl: "https://world-nuclear.org/nuclear-essentials/how-much-of-the-world-s-electricity-comes-from-nuclear" },
  { label: "CO₂ Avoided", target: 2, decimals: 0, prefix: "", suffix: " Gt", sub: "per year vs. fossil fuels", source: "IAEA Climate Report", sourceUrl: "https://www.iaea.org/topics/nuclear-power-and-climate-change" },
  { label: "Capacity Factor", target: 92.5, decimals: 1, prefix: "", suffix: "%", sub: "highest of any source", source: "US EIA, 2024", sourceUrl: "https://www.eia.gov/electricity/monthly/" },
  { label: "Uranium Price", target: 110, decimals: 0, prefix: "$", suffix: "", sub: "per lb U₃O₈", source: "UxC / Trading Economics", sourceUrl: "https://tradingeconomics.com/commodity/uranium" },
];

// ─── ANIMATED COUNTER ────────────────────────────────────────────────────
function CountUp({ target, decimals = 0, prefix = "", suffix = "", active, delay = 0 }) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const duration = 1800; // ms

  useEffect(() => {
    if (!active) { setValue(0); return; }
    const delayTimer = setTimeout(() => {
      startRef.current = performance.now();
      const animate = (now) => {
        const elapsed = now - startRef.current;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(eased * target);
        if (progress < 1) rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);
    return () => { clearTimeout(delayTimer); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, target, delay]);

  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  return <>{prefix}{display}{suffix}</>;
}

// ─── MAIN APP ───────────────────────────────────────────────────────────
export default function NuclearPulse() {
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newsFilter, setNewsFilter] = useState("All");
  const [newsSort, setNewsSort] = useState("latest");
  const [newsLimit, setNewsLimit] = useState(6);
  const [plantFilter, setPlantFilter] = useState("All");
  const [showStats, setShowStats] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [stocksLoading, setStocksLoading] = useState(true);
  const [stocksError, setStocksError] = useState(false);
  const [stocksRetry, setStocksRetry] = useState(0);
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);
  const [subEmail, setSubEmail] = useState("");
  const [subStatus, setSubStatus] = useState("idle"); // idle | loading | success | error
  const [subErrorMsg, setSubErrorMsg] = useState("");

  // Data section state
  const [dataSort, setDataSort] = useState("capacity");
  const [dataShowAll, setDataShowAll] = useState(false);
  const [expandedCountry, setExpandedCountry] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [expandedReactor, setExpandedReactor] = useState(null);
  const [reactorViewMode, setReactorViewMode] = useState("3d");

  // Learn section state
  const [learnFilter, setLearnFilter] = useState("All");
  const [flippedCards, setFlippedCards] = useState({});
  const [highlightedFact, setHighlightedFact] = useState(null);

  // Compare section state
  const [compareMetric, setCompareMetric] = useState("co2");
  const [hoveredSource, setHoveredSource] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  // Quote state — random on each page load, no auto-rotation
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [quoteFading, setQuoteFading] = useState(false);

  // Section refs for navigation
  const sectionRefs = {
    globe: useRef(null),
    stocks: useRef(null),
    news: useRef(null),
    data: useRef(null),
    compare: useRef(null),
    timeline: useRef(null),
    learn: useRef(null),
  };

  // Scroll to top on mount (prevents browser scroll restoration on refresh)
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  // Highlight active nav section as user scrolls
  useEffect(() => {
    const observers = [];
    Object.entries(sectionRefs).forEach(([key, ref]) => {
      if (!ref.current) return;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(key); },
        { threshold: 0.25, rootMargin: "-80px 0px -50% 0px" }
      );
      observer.observe(ref.current);
      observers.push(observer);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  // Fetch live stock data from Finnhub API
  useEffect(() => {
    async function loadStocks() {
      setStocksLoading(true);
      setStocksError(false);

      try {
        // Fetch quotes for all stocks in parallel
        const tickers = STOCKS_BASE.map(s => s.ticker);
        const quotes = await fetchMultipleQuotes(tickers);

        // Merge base data with live quotes and history
        const stocksWithData = await Promise.all(
          STOCKS_BASE.map(async (stock) => {
            const quote = quotes[stock.ticker];
            const currentPrice = quote?.price || 0;

            // Fetch history with current price for fallback generation
            const history = await fetchStockHistory(stock.ticker, 'D', 90, currentPrice);

            return {
              ...stock,
              price: currentPrice,
              change: quote?.change || 0,
              pct: quote?.pct || 0,
              history: history.length > 0 ? history : [{ day: 0, price: currentPrice, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) }],
            };
          })
        );

        setStocks(stocksWithData);
      } catch (error) {
        console.error('Error loading stock data:', error);
        setStocksError(true);
        setStocks([]);
      } finally {
        setStocksLoading(false);
      }
    }

    loadStocks();

    // Refresh stock data every 5 minutes
    const interval = setInterval(loadStocks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [stocksRetry]);

  // Fetch live news from RSS feeds
  useEffect(() => {
    async function loadNews() {
      setNewsLoading(true);
      try {
        const articles = await fetchNuclearNews();
        setNews(articles);
        setNewsError(false);
      } catch (error) {
        // Fall back to curated articles so the section is never empty
        setNews(getInstantNews());
        setNewsError(true);
      } finally {
        setNewsLoading(false);
      }
    }

    loadNews();

    // Refresh live articles every 15 minutes
    const interval = setInterval(loadNews, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Newsletter subscribe handler
  async function handleSubscribe() {
    if (!subEmail.trim()) { setSubStatus("error"); setSubErrorMsg("Please enter your email address."); return; }
    setSubStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: subEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setSubStatus("error"); setSubErrorMsg(data.error || "Something went wrong. Please try again."); return; }
      setSubStatus("success");
    } catch {
      setSubStatus("error");
      setSubErrorMsg("Could not connect. Please try again.");
    }
  }

  // Stats counter animation
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, amount: 0.3 });

  useEffect(() => {
    if (statsInView) {
      const timer = setTimeout(() => setShowStats(true), 100);
      return () => clearTimeout(timer);
    }
  }, [statsInView]);

  const scrollTo = (section) => {
    sectionRefs[section]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filteredNews = useMemo(() => {
    const filtered = newsFilter === "All" ? [...news] : news.filter(n => n.tag === newsFilter);
    if (newsSort === "latest") {
      return filtered.sort((a, b) => {
        const ta = a.pubDate ? a.pubDate.getTime() : 0;
        const tb = b.pubDate ? b.pubDate.getTime() : 0;
        return tb - ta;
      });
    }
    if (newsSort === "top") {
      return filtered.sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0));
    }
    if (newsSort === "source") {
      return filtered.sort((a, b) => (a.source || "").localeCompare(b.source || ""));
    }
    return filtered;
  }, [news, newsFilter, newsSort]);

  const filteredPlants = useMemo(() => {
    let result = NUCLEAR_PLANTS;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q) || p.type.toLowerCase().includes(q));
    }
    if (plantFilter !== "All") {
      result = result.filter(p => p.status === plantFilter);
    }
    return result;
  }, [searchQuery, plantFilter]);

  const countryCounts = useMemo(() => {
    const counts = {};
    NUCLEAR_PLANTS.forEach(p => { counts[p.country] = (counts[p.country] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, []);

  // Plants grouped by country for Data section expansion
  const plantsByCountry = useMemo(() => {
    const map = {};
    NUCLEAR_PLANTS.forEach(p => {
      if (!map[p.country]) map[p.country] = [];
      map[p.country].push(p);
    });
    return map;
  }, []);

  // Sorted nuclear share data + bar width helper
  const { sortedNuclearShare, getBarWidth, totalCountries, halfCount } = useMemo(() => {
    const data = [...NUCLEAR_SHARE];
    let sorted, getValue;
    if (dataSort === "capacity") {
      sorted = data.sort((a, b) => parseFloat(b.capacity) - parseFloat(a.capacity));
      getValue = c => parseFloat(c.capacity);
    } else if (dataSort === "reactors") {
      sorted = data.sort((a, b) => b.reactors - a.reactors);
      getValue = c => c.reactors;
    } else {
      sorted = data.sort((a, b) => b.nuclear - a.nuclear);
      getValue = c => c.nuclear;
    }
    const max = getValue(sorted[0]) || 1;
    const half = Math.ceil(sorted.length / 2);
    return { sortedNuclearShare: sorted, getBarWidth: c => (getValue(c) / max) * 100, totalCountries: sorted.length, halfCount: half };
  }, [dataSort]);

  // Filtered learn facts
  const filteredFacts = useMemo(() => {
    if (learnFilter === "All") return LEARN_FACTS;
    return LEARN_FACTS.filter(f => f.category === learnFilter);
  }, [learnFilter]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--np-bg)", fontFamily: "'DM Sans',sans-serif", color: "var(--np-text)" }}>
      <StockTicker stocks={stocks} onClickStock={setSelectedStock} />

      {/* Nav */}
      <nav className="np-nav" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 40px", borderBottom: "1px solid var(--np-border)",
        position: "sticky", top: 0, zIndex: 100, background: "var(--np-nav-bg)",
        backdropFilter: "blur(24px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
             onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span style={{ fontSize: 24 }}>⚛</span>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Nuclear<span style={{ fontStyle: "italic", fontWeight: 400, color: "var(--np-text-muted)", marginLeft: 5 }}>Pulse</span>
          </span>
        </div>
        <div className="np-nav-links" style={{ display: "flex", gap: 28 }}>
          {["Data", "Globe", "News", "Stocks", "Learn", "Compare", "Timeline"].map(item => {
            const isActive = activeSection === item.toLowerCase();
            return (
              <button key={item} onClick={() => scrollTo(item.toLowerCase())} style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500,
                color: isActive ? "#d4a54a" : "var(--np-text-muted)",
                letterSpacing: "0.05em", textTransform: "uppercase",
                padding: "4px 0", transition: "color 0.2s",
                borderBottom: isActive ? "1px solid rgba(212,165,74,0.6)" : "1px solid transparent",
              }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--np-text)"}
                onMouseLeave={e => e.currentTarget.style.color = isActive ? "#d4a54a" : "var(--np-text-muted)"}
              >{item}</button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={toggleDarkMode} style={{
            background: "none", border: "1px solid var(--np-border)", borderRadius: "50%",
            width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 16, transition: "border-color 0.2s",
            color: "var(--np-text-muted)", flexShrink: 0,
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--np-accent)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--np-border)"}
          >{isDark ? "☀" : "☾"}</button>
          <div style={{ position: "relative" }}>
            <div className="np-nav-search" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--np-surface-dim)", borderRadius: 20, padding: "7px 16px", border: "1px solid var(--np-border)", transition: "border-color 0.2s" }}>
              <span style={{ opacity: 0.3, fontSize: 13 }}>🔍</span>
              <input
                type="text"
                placeholder="Search everything..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => { if (searchQuery) setShowSearch(true); }}
                onBlur={() => setTimeout(() => setShowSearch(false), 150)}
                style={{ background: "none", border: "none", outline: "none", fontSize: 13, fontFamily: "'DM Sans',sans-serif", color: "var(--np-text)", width: 160 }}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setShowSearch(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--np-text-muted)", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
              )}
            </div>
            <AnimatePresence>
              {showSearch && searchQuery.trim().length > 0 && (
                <SearchOverlay
                  query={searchQuery}
                  plants={NUCLEAR_PLANTS}
                  news={news}
                  stocks={stocks}
                  onSelectPlant={setSelectedPlant}
                  onSelectStock={setSelectedStock}
                  onSelectCountry={setSelectedCountry}
                  onClose={() => setShowSearch(false)}
                  scrollTo={scrollTo}
                />
              )}
            </AnimatePresence>
          </div>
          <button className="np-hamburger" onClick={() => setMobileMenuOpen(prev => !prev)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileMenuOpen
                ? <><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></>
                : <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>
              }
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="np-mobile-menu">
            {["Data", "Globe", "News", "Stocks", "Learn", "Compare", "Timeline"].map(item => (
              <button key={item} onClick={() => { scrollTo(item.toLowerCase()); setMobileMenuOpen(false); }}>
                {item}
              </button>
            ))}
            <div style={{ padding: "8px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--np-surface-dim)", borderRadius: 12, padding: "8px 12px" }}>
                <span style={{ opacity: 0.3, fontSize: 13 }}>🔍</span>
                <input type="text" placeholder="Search plants..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: "none", border: "none", outline: "none", fontSize: 14, fontFamily: "'DM Sans',sans-serif", color: "var(--np-text)", width: "100%" }} />
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="np-hero" style={{ textAlign: "center", padding: "100px 40px 56px", position: "relative", background: "linear-gradient(to bottom, var(--np-bg-alt) 0%, var(--np-bg) 100%)" }}>
        <h1 style={{
          fontFamily: "'Playfair Display',serif", fontSize: "clamp(44px,7vw,88px)", fontWeight: 400,
          lineHeight: 1.08, letterSpacing: "-0.025em", maxWidth: 880, margin: "0 auto", color: "var(--np-text)",
        }}>
          Explore the world's<br /><em style={{ color: "#d4a54a" }}>nuclear energy</em> landscape.
        </h1>
        <p style={{ fontSize: 16, color: "var(--np-text-muted)", maxWidth: 540, margin: "28px auto 0", lineHeight: 1.7, fontWeight: 400 }}>
          Live data on {NUCLEAR_PLANTS.length}+ global reactors, industry stocks, research breakthroughs, and the future of clean energy.
        </p>
        <div className="np-hero-search" style={{ display: "flex", justifyContent: "center", marginTop: 40, gap: 0 }}>
          <input type="text" placeholder='Try "Canada" or "CANDU"' value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: "16px 26px", fontSize: 15, fontFamily: "'DM Sans',sans-serif",
              background: "var(--np-surface)", color: "var(--np-text)", border: "1px solid var(--np-border-strong)",
              borderRadius: "10px 0 0 10px", width: 360, outline: "none",
              transition: "all 0.2s", borderRight: "none"
            }}
            onFocus={e => e.currentTarget.style.borderColor = "rgba(212,165,74,0.4)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--np-border-strong)"} />
          <button onClick={() => scrollTo("globe")}
            style={{
              padding: "16px 32px", fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
              background: "var(--np-text)", color: "var(--np-bg)", border: "none", borderRadius: "0 10px 10px 0",
              cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"; }}>
            Explore
          </button>
        </div>
      </section>

      {/* Stats */}
      <section ref={statsRef} className="np-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 1, background: "var(--np-bg)", margin: "0 0 0 0" }}>
        {GLOBAL_STATS.map((s, i) => (
          <a key={i} href={s.sourceUrl} target="_blank" rel="noopener noreferrer" style={{
            background: "var(--np-bg)", padding: "32px 20px", textAlign: "center",
            opacity: showStats ? 1 : 0, transform: showStats ? "translateY(0)" : "translateY(16px)",
            transition: `all 0.5s ease ${i * 0.08}s`,
            textDecoration: "none", color: "inherit", display: "block",
            position: "relative", cursor: "pointer",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--np-surface-dim)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--np-bg)"}
          >
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>
              <CountUp target={s.target} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} active={showStats} delay={i * 80} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--np-text-muted)", marginTop: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
            <div style={{ fontSize: 11, color: "var(--np-text-faint)", marginTop: 4, lineHeight: 1.4 }}>{s.sub}</div>
            <div style={{ fontSize: 9, color: "#d4a54a", marginTop: 8, letterSpacing: "0.04em", opacity: 0.7 }}>↗ {s.source}</div>
          </a>
        ))}
      </section>

      {/* ROTATING QUOTES */}
      <section style={{ padding: "80px 40px", textAlign: "center", background: "var(--np-bg)" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div style={{ width: 40, height: 1, background: "rgba(212,165,74,0.5)", margin: "0 auto 48px" }} />
          <div style={{ minHeight: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <p style={{
              fontFamily: "'Playfair Display',serif", fontSize: "clamp(20px,3vw,36px)", fontWeight: 400,
              lineHeight: 1.45, letterSpacing: "-0.015em", color: "var(--np-text)",
              opacity: quoteFading ? 0 : 1, transition: "opacity 0.4s ease",
              margin: 0,
            }}>
              "{QUOTES[quoteIndex].text}"
            </p>
            <p style={{
              marginTop: 28, fontSize: 12, fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em",
              color: "#d4a54a", fontWeight: 600, textTransform: "uppercase",
              opacity: quoteFading ? 0 : 1, transition: "opacity 0.4s ease",
            }}>
              — {QUOTES[quoteIndex].attr}
            </p>
          </div>
          {/* Dot indicators */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 40 }}>
            {QUOTES.map((_, i) => (
              <button key={i} onClick={() => { setQuoteFading(true); setTimeout(() => { setQuoteIndex(i); setQuoteFading(false); }, 400); }} style={{
                width: i === quoteIndex ? 24 : 8, height: 8,
                borderRadius: 4, border: "none", cursor: "pointer", padding: 0,
                background: i === quoteIndex ? "#d4a54a" : "var(--np-border-strong)",
                transition: "all 0.3s ease",
              }} />
            ))}
          </div>
          <div style={{ width: 40, height: 1, background: "rgba(212,165,74,0.5)", margin: "48px auto 0" }} />
        </div>
      </section>

      {/* DATA SECTION */}
      <section ref={sectionRefs.data} style={{ padding: "80px 40px", background: "var(--np-surface-dim)", scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={staggerContainer}>
            <motion.p variants={fadeUp} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4a54a", fontWeight: 600, marginBottom: 16 }}>Global Data</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 8 }}>
              Nuclear share of <em style={{ color: "var(--np-text-muted)" }}>electricity.</em>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "var(--np-text-muted)", fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>IAEA 2024 data — percentage of national electricity from nuclear power.</motion.p>

            {/* Sort controls */}
            <motion.div variants={fadeUp} style={{ display: "flex", gap: 8, marginBottom: 28 }}>
              {[
                { key: "capacity", label: "By Capacity" },
                { key: "share", label: "By Nuclear %" },
                { key: "reactors", label: "By Reactors" },
              ].map(s => (
                <button key={s.key} onClick={() => setDataSort(s.key)} style={{
                  background: dataSort === s.key ? "var(--np-text)" : "var(--np-surface-dim)",
                  color: dataSort === s.key ? "var(--np-bg)" : "var(--np-text-muted)",
                  border: "1px solid " + (dataSort === s.key ? "var(--np-text)" : "var(--np-border)"),
                  borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
                  letterSpacing: "0.02em",
                }}>{s.label}</button>
              ))}
            </motion.div>
          </motion.div>

          {/* Nuclear share rows */}
          <motion.div key={dataSort} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={staggerContainer}>
            {(dataShowAll ? sortedNuclearShare : sortedNuclearShare.slice(0, halfCount)).map((c, i) => (
              <motion.div key={c.country} variants={fadeUp}>
                <div
                  onClick={() => setExpandedCountry(expandedCountry === c.country ? null : c.country)}
                  onMouseEnter={() => setHoveredCountry(c.country)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  className="np-data-row"
                  style={{
                    display: "grid", gridTemplateColumns: "36px 90px 1fr 64px 100px 20px", alignItems: "center", gap: 12,
                    padding: "11px 8px", borderBottom: "1px solid var(--np-border)", cursor: "pointer",
                    borderRadius: 6, transition: "background 0.2s",
                    background: hoveredCountry === c.country ? "rgba(212,165,74,0.04)" : expandedCountry === c.country ? "rgba(212,165,74,0.06)" : "transparent",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{c.flag}</span>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{c.country}</span>
                  <div className="np-data-bar" style={{ position: "relative", height: 20, borderRadius: 3, background: "var(--np-surface-dim)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getBarWidth(c)}%` }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: i * 0.04 }}
                      style={{
                        position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 3,
                        background: hoveredCountry === c.country ? "linear-gradient(90deg,#d4a54a,#c4935a)" : "linear-gradient(90deg,#d4a54a,#8b7355)",
                      }}
                    />
                    {/* Tooltip on hover */}
                    {hoveredCountry === c.country && (
                      <div style={{
                        position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                        background: "var(--np-dark-bg)", color: "var(--np-dark-text)", padding: "8px 14px", borderRadius: 8,
                        fontSize: 12, whiteSpace: "nowrap", zIndex: 10, pointerEvents: "none",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.3)", border: "1px solid rgba(212,165,74,0.2)",
                      }}>
                        <span style={{ fontWeight: 700, color: "#d4a54a" }}>{c.country}</span> — {c.nuclear}% nuclear · {c.reactors} reactors · {c.capacity}
                      </div>
                    )}
                  </div>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, textAlign: "right" }}>
                    {dataSort === "capacity" ? c.capacity : dataSort === "reactors" ? `${c.reactors}` : `${c.nuclear}%`}
                  </span>
                  <span className="np-data-sub" style={{ fontSize: 11, color: "var(--np-text-faint)", textAlign: "right" }}>
                    {dataSort === "capacity" ? `${c.nuclear}% · ${c.reactors}r` : dataSort === "reactors" ? `${c.nuclear}% · ${c.capacity}` : `${c.reactors} reactors · ${c.capacity}`}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--np-text-muted)", transition: "transform 0.3s", transform: expandedCountry === c.country ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
                </div>

                {/* Expandable country detail */}
                <AnimatePresence>
                  {expandedCountry === c.country && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{ padding: "16px 8px 20px 48px", borderBottom: "1px solid rgba(212,165,74,0.1)" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                          {(plantsByCountry[c.country] || []).map((p, pi) => (
                            <span key={pi} onClick={(e) => { e.stopPropagation(); setSelectedPlant(p); }} style={{
                              background: "var(--np-surface-dim)", border: "1px solid var(--np-border)",
                              borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer",
                              transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 6,
                            }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,165,74,0.1)"; e.currentTarget.style.borderColor = "rgba(212,165,74,0.3)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "var(--np-surface-dim)"; e.currentTarget.style.borderColor = "var(--np-border)"; }}
                            >
                              <span style={{ fontWeight: 600 }}>{p.name}</span>
                              <span style={{ color: "var(--np-text-muted)", fontSize: 11 }}>{p.capacity.toLocaleString()} MW · {p.type.split(" ")[0]}</span>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLORS[p.status] ?? STATUS_COLORS.Idle }} />
                            </span>
                          ))}
                        </div>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          setSearchQuery(c.country);
                          scrollTo("globe");
                        }} style={{
                          background: "none", border: "1px solid rgba(212,165,74,0.3)", borderRadius: 8,
                          padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          color: "#d4a54a", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,165,74,0.1)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                        >
                          View on globe →
                        </button>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCountry(c.country);
                        }} style={{
                          background: "none", border: "1px solid rgba(212,165,74,0.3)", borderRadius: 8,
                          padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          color: "#d4a54a", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,165,74,0.1)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                        >
                          Country profile →
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>

          {/* Show more */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button
              onClick={() => setDataShowAll(v => !v)}
              style={{
                background: "none", border: "1px solid var(--np-border)", borderRadius: 10,
                padding: "10px 28px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                color: "var(--np-text-muted)", fontFamily: "'DM Sans',sans-serif",
                transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,165,74,0.4)"; e.currentTarget.style.color = "#d4a54a"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--np-border)"; e.currentTarget.style.color = "var(--np-text-muted)"; }}
            >
              {dataShowAll ? "Show less ▲" : `Show all ${totalCountries} countries ▼`}
            </button>
          </div>

        </div>
      </section>

      {/* GLOBE SECTION */}
      <ErrorBoundary section="Globe" dark={false}>
      <section ref={sectionRefs.globe} style={{ padding: "0 40px 80px", scrollMarginTop: 80 }}>
        <div className="np-globe-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} variants={staggerContainer}>
            <motion.p variants={fadeUp} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4a54a", fontWeight: 600, marginBottom: 14 }}>Interactive Map</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", margin: 0 }}>
              Every reactor on <em style={{ color: "var(--np-text-muted)" }}>Earth.</em>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "var(--np-text-muted)", fontSize: 14, marginTop: 8 }}>Drag to rotate · Click markers for details · {filteredPlants.length} plants shown</motion.p>
          </motion.div>
          <div style={{ display: "flex", gap: 14, fontSize: 11, alignItems: "center" }}>
            {Object.entries(STATUS_COLORS).map(([label, color]) => (
              <span key={label} onClick={() => setPlantFilter(plantFilter === label ? "All" : label)}
                style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", opacity: plantFilter !== "All" && plantFilter !== label ? 0.3 : 1, transition: "opacity 0.2s" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block" }} /> {label}
              </span>
            ))}
          </div>
        </div>

        <div className="np-globe-layout" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, minHeight: 520 }}>
          <div style={{ background: "radial-gradient(ellipse at 50% 40%, #0d1b2a 0%, #0a1520 60%, #060e15 100%)", borderRadius: 16, border: "1px solid var(--np-border)", overflow: "hidden", position: "relative" }}>
            <Globe onSelectPlant={setSelectedPlant} plants={filteredPlants} />
          </div>
          <div style={{ background: "var(--np-surface-dim)", borderRadius: 16, border: "1px solid var(--np-border)", padding: "16px 18px", overflowY: "auto", maxHeight: 520 }}>
            <div style={{ fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--np-text-muted)", marginBottom: 12, position: "sticky", top: 0, background: "var(--np-nav-bg)", padding: "4px 0", backdropFilter: "blur(8px)" }}>
              {filteredPlants.length} Plants {searchQuery && `· "${searchQuery}"`}
            </div>
            {filteredPlants.map((p, i) => (
              <div key={i} onClick={() => setSelectedPlant(p)} style={{
                padding: "10px 12px", borderRadius: 8, cursor: "pointer", display: "flex",
                justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--np-border)",
                transition: "background 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(212,165,74,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--np-text-muted)" }}>{p.country} · {p.type}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12.5, fontWeight: 600 }}>{p.capacity.toLocaleString()} MW</div>
                  <div style={{ fontSize: 10, color: STATUS_COLORS[p.status] ?? STATUS_COLORS.Idle }}>● {p.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </ErrorBoundary>

      {/* NEWS SECTION */}
      <ErrorBoundary section="News">
      <section ref={sectionRefs.news} style={{ padding: "80px 40px", scrollMarginTop: 80, background: "linear-gradient(to bottom, var(--np-bg-alt) 0%, var(--np-bg) 100%)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={staggerContainer}>
            <motion.p variants={fadeUp} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4a54a", fontWeight: 600, marginBottom: 16 }}>Industry News</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 8 }}>
              Latest <em style={{ color: "var(--np-text-muted)" }}>news.</em>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "var(--np-text-muted)", fontSize: 15, marginBottom: 36, maxWidth: 540, lineHeight: 1.6 }}>Curated developments from the global nuclear energy industry.</motion.p>
          </motion.div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
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
              <button onClick={() => { setNewsError(false); setNewsLoading(true); fetchNuclearNews().then(a => { setNews(a); setNewsLoading(false); }).catch(() => { setNews(getInstantNews()); setNewsError(true); setNewsLoading(false); }); }}
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
            {newsLoading ? (
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
                {filteredNews.length > 0 ? filteredNews.slice(0, newsLimit).map((n, i) => (
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
                    {n.curiosityHook && (
                      <p style={{
                        fontSize: 13, color: "var(--np-text-muted)", lineHeight: 1.6,
                        margin: "0 0 12px", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>{n.curiosityHook}</p>
                    )}
                    <div style={{
                      fontSize: 12, color: "var(--np-text-muted)", fontWeight: 500,
                      display: "flex", alignItems: "center", gap: 6
                    }}>
                      <span>{n.source}</span>
                      <span style={{ fontSize: 14 }}>→</span>
                    </div>
                  </motion.a>
                )) : (
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

      {/* STOCKS SECTION */}
      <ErrorBoundary section="Stocks" dark={true}>
      <section ref={sectionRefs.stocks} style={{ padding: "80px 40px", background: "var(--np-dark-bg)", color: "var(--np-dark-text)", scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={staggerContainer}>
          <motion.p variants={fadeUp} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(212,165,74,0.6)", fontWeight: 600, marginBottom: 16 }}>Market Overview</motion.p>
          <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 8 }}>
            Nuclear industry <em style={{ color: "#d4a54a" }}>stocks.</em>
          </motion.h2>
          <motion.p variants={fadeUp} style={{ color: "rgba(245,240,232,0.4)", fontSize: 15, marginBottom: 40, maxWidth: 540, lineHeight: 1.6 }}>Click any card for detailed charts, metrics, and company information.</motion.p>
        </motion.div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 16 }}>
          {stocksLoading ? (
            // Loading skeleton
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                background: "rgba(245,240,232,0.035)", border: "1px solid rgba(245,240,232,0.06)",
                borderRadius: 14, padding: "20px 22px", height: 140,
                animation: "pulse 1.5s ease-in-out infinite"
              }} />
            ))
          ) : stocksError ? (
            // Error state with retry
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 40px" }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>⚠</div>
              <p style={{ color: "rgba(245,240,232,0.5)", fontSize: 15, marginBottom: 24 }}>
                Market data couldn't load. Check your connection and try again.
              </p>
              <button onClick={() => { setStocksError(false); setStocksRetry(r => r + 1); }}
                style={{
                  background: "none", border: "1px solid #d4a54a", color: "#d4a54a",
                  padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#d4a54a"; e.currentTarget.style.color = "#14120e"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#d4a54a"; }}>
                Retry
              </button>
            </div>
          ) : (
            stocks.map((s, i) => {
              const mini = s.history?.slice(-14) || [];
            return (
              <div key={i} onClick={() => setSelectedStock(s)} style={{
                background: "rgba(245,240,232,0.035)", border: "1px solid rgba(245,240,232,0.06)",
                borderRadius: 14, padding: "20px 22px", cursor: "pointer", transition: "all 0.25s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,240,232,0.07)"; e.currentTarget.style.borderColor = "rgba(212,165,74,0.25)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,240,232,0.035)"; e.currentTarget.style.borderColor = "rgba(245,240,232,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700, color: "#d4a54a" }}>{s.ticker}</div>
                    <div style={{ fontSize: 11, color: "rgba(245,240,232,0.35)", marginTop: 2 }}>{s.name}</div>
                  </div>
                  <div style={{
                    background: s.change >= 0 ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                    color: s.change >= 0 ? "#4ade80" : "#f87171", padding: "3px 8px", borderRadius: 16,
                    fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono',monospace",
                  }}>{s.change >= 0 ? "+" : ""}{s.pct.toFixed(2)}%</div>
                </div>
                {/* Mini sparkline */}
                <div style={{ height: 40, margin: "12px 0 4px" }}>
                  <ResponsiveContainer width="100%" height={40}>
                    <LineChart data={mini}>
                      <Line type="monotone" dataKey="price" stroke={s.change >= 0 ? "#4ade80" : "#f87171"} strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700 }}>${s.price.toFixed(2)}</span>
                  <span style={{ fontSize: 10, color: "rgba(245,240,232,0.3)", fontFamily: "'DM Mono',monospace" }}>{s.sector}</span>
                </div>
              </div>
            );
            })
          )}
        </div>
        <p style={{ fontSize: 10, color: "rgba(245,240,232,0.2)", marginTop: 24, textAlign: "center" }}>Data is illustrative. Not financial advice. Always do your own research.</p>
        </div>
      </section>
      </ErrorBoundary>

      {/* LEARN SECTION */}
      <section ref={sectionRefs.learn} style={{ padding: "80px 40px", scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* Reactor Types */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={staggerContainer} style={{ marginBottom: 72 }}>
            <motion.p variants={fadeUp} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4a54a", fontWeight: 600, marginBottom: 16 }}>Education</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 8 }}>
              Reactor <em style={{ color: "var(--np-text-muted)" }}>types.</em>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "var(--np-text-muted)", fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>The six major reactor designs powering the world — click any card to explore.</motion.p>
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
                  <div style={{ position: "absolute", top: 16, right: 16, fontFamily: "'Playfair Display',serif", fontSize: 44, fontWeight: 700, color: "var(--np-surface-dim)", lineHeight: 1 }}>{r.share}%</div>
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
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
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
                            <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--np-border)" }}>
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
                              ? <Reactor3D type={r.type} />
                              : <div style={{ padding: "16px 20px" }}><ReactorDiagram type={r.type} width={900} /></div>
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

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={staggerContainer}>
            <motion.p variants={fadeUp} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4a54a", fontWeight: 600, marginBottom: 16 }}>Did You Know</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 12 }}>
              Did you <em style={{ color: "var(--np-text-muted)" }}>know?</em>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "var(--np-text-muted)", fontSize: 15, marginBottom: 24, maxWidth: 540, lineHeight: 1.6 }}>Key facts that explain why nuclear power matters for our energy future.</motion.p>

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
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}
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
                            fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 500,
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

      {/* COMPARE SECTION — Nuclear vs Other Energy */}
      <section ref={sectionRefs.compare} style={{ padding: "80px 40px", scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={staggerContainer}>
            <motion.p variants={fadeUp} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4a54a", fontWeight: 600, marginBottom: 16 }}>Energy Comparison</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 8 }}>
              Nuclear vs other <em style={{ color: "var(--np-text-muted)" }}>energy.</em>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "var(--np-text-muted)", fontSize: 15, marginBottom: 32, maxWidth: 600, lineHeight: 1.6 }}>
              How does nuclear stack up against wind, solar, hydro, gas, and coal? Select a metric to compare.
            </motion.p>

            {/* Metric tab pills */}
            <motion.div variants={fadeUp} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
              {ENERGY_COMPARISON.map(m => (
                <button key={m.key} onClick={() => setCompareMetric(m.key)} style={{
                  background: compareMetric === m.key ? "var(--np-text)" : "var(--np-surface-dim)",
                  color: compareMetric === m.key ? "var(--np-bg)" : "var(--np-text-muted)",
                  border: "1px solid " + (compareMetric === m.key ? "var(--np-text)" : "var(--np-border)"),
                  borderRadius: 20, padding: "8px 18px", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
                  letterSpacing: "0.02em",
                }}>{m.label}</button>
              ))}
            </motion.div>
          </motion.div>

          {/* Animated bar chart */}
          <AnimatePresence mode="wait">
            {ENERGY_COMPARISON.filter(m => m.key === compareMetric).map(metric => {
              const maxVal = Math.max(...metric.data.map(d => d.value));
              const bestVal = metric.lowerIsBetter
                ? Math.min(...metric.data.map(d => d.value))
                : Math.max(...metric.data.map(d => d.value));

              return (
                <motion.div
                  key={metric.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {/* Description + unit */}
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 14, color: "var(--np-text-muted)", lineHeight: 1.5, margin: "0 0 4px" }}>{metric.description}</p>
                    <span style={{ fontSize: 11, color: "var(--np-text-faint)", fontFamily: "'DM Mono',monospace" }}>Unit: {metric.unit} · {metric.lowerIsBetter ? "Lower is better" : "Higher is better"}</span>
                  </div>

                  {/* Bars */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {metric.data.map((d, i) => {
                      const isNuclear = d.name === "Nuclear";
                      const isBest = d.value === bestVal;
                      const barPct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
                      const color = ENERGY_SOURCE_COLORS[d.name] || "#8b7355";

                      return (
                        <div
                          key={d.name}
                          className="np-compare-bar"
                          onMouseEnter={() => setHoveredSource(d.name)}
                          onMouseLeave={() => setHoveredSource(null)}
                          style={{
                            display: "grid", gridTemplateColumns: "80px 1fr 90px", alignItems: "center", gap: 12,
                            padding: "6px 0", position: "relative",
                          }}
                        >
                          <span style={{
                            fontSize: 13, fontWeight: isNuclear ? 700 : 500,
                            color: isNuclear ? "var(--np-text)" : "var(--np-text-muted)",
                          }}>{d.name}</span>

                          <div style={{ position: "relative", height: 28, borderRadius: 6, background: "var(--np-surface-dim)", overflow: "hidden" }}>
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${Math.max(barPct, 1.5)}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 1, ease: "easeOut", delay: i * 0.08 }}
                              style={{
                                position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 6,
                                background: isNuclear
                                  ? "linear-gradient(90deg, #d4a54a, #c4935a)"
                                  : color,
                                opacity: isNuclear ? 1 : hoveredSource === d.name ? 0.85 : 0.55,
                                transition: "opacity 0.2s",
                              }}
                            />

                            {/* Hover tooltip */}
                            {hoveredSource === d.name && (
                              <div style={{
                                position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                                background: "var(--np-dark-bg)", color: "var(--np-dark-text)", padding: "6px 12px", borderRadius: 8,
                                fontSize: 11, whiteSpace: "nowrap", zIndex: 10, pointerEvents: "none",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.3)", border: "1px solid rgba(212,165,74,0.2)",
                              }}>
                                <span style={{ fontWeight: 700, color: isNuclear ? "#d4a54a" : color }}>{d.name}</span> — {d.value} {metric.unit}
                                {isBest && <span style={{ marginLeft: 6, color: "#4ade80", fontSize: 10, fontWeight: 700 }}>BEST</span>}
                              </div>
                            )}
                          </div>

                          <span style={{
                            fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, textAlign: "right",
                            color: isBest ? (isNuclear ? "#d4a54a" : "#4ade80") : "var(--np-text)",
                          }}>
                            {d.value}{metric.unit === "%" ? "%" : ""}
                            {isBest && <span style={{ fontSize: 9, marginLeft: 4, color: "#4ade80", fontWeight: 700 }}>★</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Insight callout */}
                  <div style={{
                    marginTop: 24, padding: "18px 22px", borderRadius: 12,
                    background: "rgba(212,165,74,0.06)", border: "1px solid rgba(212,165,74,0.15)",
                  }}>
                    <p style={{ fontSize: 14, color: "var(--np-text)", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                      {metric.insight}
                    </p>
                    <a
                      href={metric.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: "#d4a54a", textDecoration: "none", fontWeight: 600, marginTop: 8, display: "inline-block" }}
                    >
                      Source: {metric.source} ↗
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </section>

      {/* TIMELINE SECTION */}
      <section ref={sectionRefs.timeline} style={{ padding: "80px 40px", background: "var(--np-dark-bg)", color: "var(--np-dark-text)", scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={staggerContainer}>
            <motion.p variants={fadeUp} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(212,165,74,0.6)", fontWeight: 600, marginBottom: 16 }}>History</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 8 }}>
              Nuclear <em style={{ color: "#d4a54a" }}>timeline.</em>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "rgba(245,240,232,0.4)", fontSize: 15, marginBottom: 48, maxWidth: 600, lineHeight: 1.6 }}>From the first chain reaction to the SMR revolution — eight decades of nuclear milestones.</motion.p>
          </motion.div>
          <Timeline />
        </div>
      </section>

      {/* Newsletter CTA */}
      <section style={{ padding: "96px 40px", textAlign: "center", background: "var(--np-surface-dim)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }} variants={staggerContainer}>
            <motion.p variants={fadeUp} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#d4a54a", fontWeight: 600, marginBottom: 20 }}>Newsletter</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 400, marginBottom: 12, lineHeight: 1.2 }}>
              Stay informed on the <em style={{ color: "var(--np-text-muted)" }}>nuclear renaissance.</em>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "var(--np-text-muted)", fontSize: 15, marginBottom: 36, lineHeight: 1.6 }}>Weekly briefings on reactor developments, policy, and market movements — sourced from World Nuclear News, ANS, IAEA, and more.</motion.p>
          </motion.div>
          {subStatus === "success" ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: 15, color: "#4ade80", fontWeight: 600, padding: "18px 0" }}>
              You're subscribed! First issue lands this Sunday.
            </motion.div>
          ) : (
            <div>
              <div className="np-newsletter-row" style={{ display: "flex", justifyContent: "center" }}>
                <input type="email" placeholder="Enter your email"
                  value={subEmail}
                  onChange={e => { setSubEmail(e.target.value); if (subStatus === "error") setSubStatus("idle"); }}
                  onKeyDown={e => e.key === "Enter" && handleSubscribe()}
                  disabled={subStatus === "loading"}
                  style={{ padding: "15px 22px", fontSize: 14, fontFamily: "'DM Sans',sans-serif", background: "var(--np-surface)", color: "var(--np-text)", border: `1px solid ${subStatus === "error" ? "rgba(248,113,113,0.5)" : "var(--np-border)"}`, borderRadius: "10px 0 0 10px", width: 320, outline: "none", borderRight: "none", transition: "border-color 0.2s", opacity: subStatus === "loading" ? 0.6 : 1 }}
                  onFocus={e => e.currentTarget.style.borderColor = "rgba(212,165,74,0.4)"}
                  onBlur={e => e.currentTarget.style.borderColor = subStatus === "error" ? "rgba(248,113,113,0.5)" : "var(--np-border)"} />
                <button onClick={handleSubscribe} disabled={subStatus === "loading"}
                  style={{ padding: "15px 32px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, background: "var(--np-text)", color: "var(--np-bg)", border: "none", borderRadius: "0 10px 10px 0", cursor: subStatus === "loading" ? "not-allowed" : "pointer", textTransform: "uppercase", letterSpacing: "0.04em", transition: "all 0.2s", opacity: subStatus === "loading" ? 0.6 : 1 }}
                  onMouseEnter={e => { if (subStatus !== "loading") e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { if (subStatus !== "loading") e.currentTarget.style.opacity = "1"; }}>
                  {subStatus === "loading" ? "Subscribing…" : "Subscribe"}
                </button>
              </div>
              {subStatus === "error" && (
                <p style={{ fontSize: 13, color: "#f87171", marginTop: 10, textAlign: "center" }}>{subErrorMsg}</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "var(--np-dark-bg)", color: "var(--np-dark-text-muted)", padding: "48px 40px", fontSize: 12, borderTop: "1px solid rgba(212,165,74,0.1)" }}>
        <div className="np-footer-inner" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#f5f0e8", fontWeight: 700 }}>⚛ Nuclear<em style={{ fontWeight: 400, color: "#d4a54a" }}> Pulse</em></span>
            <div style={{ marginTop: 8, lineHeight: 1.5 }}>Comprehensive nuclear energy information hub.</div>
          </div>
          <div style={{ textAlign: "right", lineHeight: 1.6 }}>
            <div>Data sourced from IAEA PRIS, World Nuclear Association, and public markets.</div>
            <div style={{ marginTop: 4 }}>© 2026 NuclearPulse · For informational purposes only.</div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {selectedPlant && <PlantModal plant={selectedPlant} onClose={() => setSelectedPlant(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {selectedStock && <StockModal stock={selectedStock} onClose={() => setSelectedStock(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {selectedCountry && <CountryModal country={selectedCountry} onClose={() => setSelectedCountry(null)} onSelectPlant={setSelectedPlant} />}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        ::selection{background:rgba(212,165,74,0.25);color:#1e1912}
      `}</style>
    </div>
  );
}
