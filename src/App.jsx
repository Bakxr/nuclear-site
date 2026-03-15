import { lazy, Suspense, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useInView, useScroll, useTransform, MotionConfig } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { STOCKS_BASE, NUCLEAR_SHARE, REACTOR_TYPES, LEARN_FACTS, LEARN_COLORS, ENERGY_COMPARISON, ENERGY_SOURCE_COLORS, STATUS_COLORS } from "./data/constants.js";
import { NUCLEAR_PLANTS } from "./data/plants.js";
import { SUPPLY_STAGE_COLORS, URANIUM_SUPPLY_SITES } from "./data/supplySites.js";
import { fetchStockHistory, fetchMultipleQuotes } from "./services/stocksAPI.js";
import { clearNewsCache, fetchNuclearNews, getInstantNews } from "./services/newsAPI.js";
import useDarkMode from "./hooks/useDarkMode.js";
import Timeline from "./components/Timeline.jsx";
import StockTicker from "./components/StockTicker.jsx";
import SearchOverlay from "./components/SearchOverlay.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ReactorDiagram from "./components/reactorDiagrams/index.jsx";
import useDialog from "./hooks/useDialog.js";
import { normalizeReactorType } from "./services/plantAPI.js";
import { groupPlantsByCountry, normalizeCountryName } from "./utils/countries.js";
import { NAV_ITEMS } from "./data/editorial.js";
import { inferNewsLocation } from "./utils/news.js";

const Globe = lazy(() => import("./components/Globe.jsx"));
const StockModal = lazy(() => import("./components/StockModal.jsx"));
const PlantModal = lazy(() => import("./components/PlantModal.jsx"));
const CountryModal = lazy(() => import("./components/CountryModal.jsx"));
const Reactor3D = lazy(() => import("./components/reactorDiagrams/Reactor3D.jsx"));

// ─── SECTION LABEL — animated gold line + uppercase text ──────────────
function SectionLabel({ children, dark = false }) {
  return (
    <motion.div
      variants={fadeUp}
      style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}
    >
      <motion.div
        variants={lineGrow}
        style={{
          height: 1, width: 28, background: "#d4a54a",
          flexShrink: 0, transformOrigin: "left",
        }}
      />
      <span style={{
        fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700,
        color: dark ? "rgba(212,165,74,0.7)" : "#d4a54a",
      }}>{children}</span>
    </motion.div>
  );
}

const NEWSLETTER_STORAGE_KEY = "np-newsletter-subscribed";
const NEWSLETTER_POPUP_SHOWN_KEY = "np-newsletter-popup-shown";
const NEWSLETTER_POPUP_DISMISSED_KEY = "np-newsletter-popup-dismissed";
const NEWSLETTER_FORM_DEFAULT = { email: "", website: "", status: "idle", error: "" };

function NewsletterCapture({
  surface,
  form,
  success,
  successMessage,
  onEmailChange,
  onWebsiteChange,
  onSubmit,
  buttonLabel = "Subscribe",
  placeholder = "Enter your email",
  note,
  align = "left",
  rowStyle,
  inputStyle,
  buttonStyle,
  successStyle,
  errorStyle,
}) {
  if (success) {
    return (
      <div style={{
        fontSize: 15,
        color: "#4ade80",
        fontWeight: 600,
        padding: "10px 0",
        textAlign: align,
        ...successStyle,
      }}>
        {successMessage}
      </div>
    );
  }

  return (
    <div>
      <div className="np-newsletter-row" style={{ display: "flex", justifyContent: align === "center" ? "center" : "flex-start", ...rowStyle }}>
        <input
          aria-hidden="true"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => onWebsiteChange(surface, e.target.value)}
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />
        <input
          type="email"
          aria-label="Email address"
          placeholder={placeholder}
          value={form.email}
          onChange={(e) => onEmailChange(surface, e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit(surface)}
          disabled={form.status === "loading"}
          style={{
            padding: "15px 22px",
            fontSize: 14,
            fontFamily: "'DM Sans',sans-serif",
            background: "var(--np-surface)",
            color: "var(--np-text)",
            border: `1px solid ${form.status === "error" ? "rgba(248,113,113,0.5)" : "var(--np-border)"}`,
            borderRadius: "10px 0 0 10px",
            width: 320,
            outline: "none",
            borderRight: "none",
            transition: "border-color 0.2s",
            opacity: form.status === "loading" ? 0.6 : 1,
            ...inputStyle,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,165,74,0.4)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = form.status === "error" ? "rgba(248,113,113,0.5)" : "var(--np-border)"; }}
        />
        <button
          aria-label="Subscribe to newsletter"
          onClick={() => onSubmit(surface)}
          disabled={form.status === "loading"}
          style={{
            padding: "15px 32px",
            fontSize: 13,
            fontFamily: "'DM Sans',sans-serif",
            fontWeight: 600,
            background: "var(--np-text)",
            color: "var(--np-bg)",
            border: "none",
            borderRadius: "0 10px 10px 0",
            cursor: form.status === "loading" ? "not-allowed" : "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            transition: "all 0.2s",
            opacity: form.status === "loading" ? 0.6 : 1,
            ...buttonStyle,
          }}
          onMouseEnter={(e) => { if (form.status !== "loading") e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { if (form.status !== "loading") e.currentTarget.style.opacity = "1"; }}
        >
          {form.status === "loading" ? "Subscribing…" : buttonLabel}
        </button>
      </div>
      {form.status === "error" && (
        <p style={{ fontSize: 13, color: "#f87171", marginTop: 10, textAlign: align, ...errorStyle }}>{form.error}</p>
      )}
      {note ? (
        <p style={{ fontSize: 12, color: "var(--np-text-faint)", marginTop: 10, textAlign: align, lineHeight: 1.6 }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

// ─── SMR TRACKER DATA ─────────────────────────────────────────────────
const SMR_PROJECTS = [
  { name: "BWRX-300", company: "GE Hitachi", country: "🇨🇦 Canada", capacity: 300, type: "BWR", status: "Licensing", year: 2029, desc: "First commercial BWRX-300 at Ontario Power Generation's Darlington site." },
  { name: "Xe-100", company: "X-energy", country: "🇺🇸 USA", capacity: 80, type: "HTGR", status: "Design", year: 2030, desc: "Pebble-bed high-temperature gas-cooled reactor. DOE funded. Dow partnership." },
  { name: "Natrium", company: "TerraPower", country: "🇺🇸 USA", capacity: 345, type: "SFR", status: "Construction", year: 2030, desc: "Sodium-cooled fast reactor with molten salt energy storage. Kemmerer, Wyoming." },
  { name: "Kairos KP-FHR", company: "Kairos Power", country: "🇺🇸 USA", capacity: 140, type: "FHR", status: "Licensing", year: 2031, desc: "Fluoride salt-cooled high-temperature reactor. DOE ARDP funded." },
  { name: "SMR-160", company: "Holtec", country: "🇺🇸 USA", capacity: 160, type: "PWR", status: "Design", year: 2032, desc: "Passively safe light water SMR. Gravity-driven cooling, no pumps required." },
  { name: "Rolls-Royce SMR", company: "Rolls-Royce", country: "🇬🇧 UK", capacity: 470, type: "PWR", status: "Licensing", year: 2033, desc: "UK government-backed SMR programme. Factory-built modular design." },
  { name: "NuScale VOYGR", company: "NuScale", country: "🇺🇸 USA", capacity: 77, type: "PWR", status: "Licensed", year: 2029, desc: "First SMR to receive NRC design approval. 12-module plant option." },
  { name: "ARC-100", company: "ARC Clean Energy", country: "🇨🇦 Canada", capacity: 100, type: "SFR", status: "Design", year: 2034, desc: "Sodium-cooled fast reactor. Uses used nuclear fuel as primary fuel source." },
  { name: "HTR-PM", company: "CNNC / Huaneng", country: "🇨🇳 China", capacity: 200, type: "HTGR", status: "Operational", year: 2023, desc: "World's first commercial pebble-bed reactor. Shidao Bay, Shandong." },
  { name: "RITM-200", company: "Rosatom", country: "🇷🇺 Russia", capacity: 50, type: "PWR", status: "Operational", year: 2020, desc: "Powers icebreakers; land-based versions for remote Arctic communities." },
  { name: "ACPR50S", company: "CGN", country: "🇨🇳 China", capacity: 60, type: "PWR", status: "Design", year: 2030, desc: "Offshore floating nuclear power plant for island and remote coastal power." },
  { name: "Thorcon MSR", company: "ThorCon", country: "🇮🇩 Indonesia", capacity: 500, type: "MSR", status: "Design", year: 2033, desc: "Ship-based molten salt reactor. Partnership with Indonesian government." },
];

const SMR_STATUS_ORDER = ["Operational", "Construction", "Licensed", "Licensing", "Design"];
const SMR_STATUS_COLORS = {
  Operational: "#4ade80",
  Construction: "#fbbf24",
  Licensed: "#60a5fa",
  Licensing: "#a78bfa",
  Design: "#94a3b8",
};

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
// Spec-recommended easing: smooth deceleration, no bounce
const EASE = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: EASE } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

// Word-by-word stagger (hero heading) — 400–700ms range
const wordReveal = {
  hidden: { opacity: 0, y: 28, skewY: 1 },
  visible: { opacity: 1, y: 0, skewY: 0, transition: { duration: 0.6, ease: EASE } },
};

// Draws a line left-to-right (section labels) — micro timing 300ms
const lineGrow = {
  hidden: { scaleX: 0, originX: 0 },
  visible: { scaleX: 1, originX: 0, transition: { duration: 0.5, ease: EASE, delay: 0.05 } },
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
    if (!active) return undefined;
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

  const visibleValue = active ? value : 0;
  const display = decimals > 0 ? visibleValue.toFixed(decimals) : Math.round(visibleValue).toString();
  return <>{prefix}{display}{suffix}</>;
}

function LazySectionFallback({ height = 320 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight: height,
        borderRadius: 16,
        background: "var(--np-surface-dim)",
        border: "1px solid var(--np-border)",
      }}
    />
  );
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
  const [stocks, setStocks] = useState(() => STOCKS_BASE.map(s => ({ ...s, price: 0, change: 0, pct: 0, history: [] })));
  const [stocksLoading, setStocksLoading] = useState(true);
  const [stocksError, setStocksError] = useState(false);
  const [stocksRetry, setStocksRetry] = useState(0);
  const [news, setNews] = useState(() => getInstantNews());
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);
  const [newsLastUpdated, setNewsLastUpdated] = useState(null);
  const [newsletterForms, setNewsletterForms] = useState({
    hero: { ...NEWSLETTER_FORM_DEFAULT },
    inline: { ...NEWSLETTER_FORM_DEFAULT },
    footer: { ...NEWSLETTER_FORM_DEFAULT },
    popup: { ...NEWSLETTER_FORM_DEFAULT },
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSubscribePopup, setShowSubscribePopup] = useState(false);

  // Data section state
  const [dataView, setDataView] = useState("countries");
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
  const [globeLayer, setGlobeLayer] = useState("reactors");
  const [mobileGlobePanelExpanded, setMobileGlobePanelExpanded] = useState(false);
  const [globeCountryFilter, setGlobeCountryFilter] = useState("");
  const [globeReactorTypeFilter, setGlobeReactorTypeFilter] = useState("");

  // Proof comparison state
  const [compareMetric, setCompareMetric] = useState("co2");
  const [hoveredSource, setHoveredSource] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  });

  // Parallax hero
  const { scrollY } = useScroll();
  const heroY       = useTransform(scrollY, [0, 520], [0, -90]);
  const heroOpacity = useTransform(scrollY, [0, 380], [1, 0]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  // Quote state — random on each page load, no auto-rotation
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [quoteFading, setQuoteFading] = useState(false);

  // Section refs for navigation — each ref is a named variable (not inside an object literal)
  // to satisfy the Rules of Hooks (hooks must be called unconditionally at the top level)
  const globeRef = useRef(null);
  const globePanelRef = useRef(null);
  const globePanelListRef = useRef(null);
  const stocksRef = useRef(null);
  const newsRef = useRef(null);
  const dataRef = useRef(null);
  const timelineRef = useRef(null);
  const learnRef = useRef(null);
  const smrRef = useRef(null);
  const navSections = useMemo(() => ([
    { key: "data", ref: dataRef },
    { key: "globe", ref: globeRef },
    { key: "news", ref: newsRef },
    { key: "stocks", ref: stocksRef },
    { key: "smr", ref: smrRef },
    { key: "learn", ref: learnRef },
    { key: "timeline", ref: timelineRef },
  ]), []);
  // Plain lookup map used by scrollTo and section refs in JSX.
  const sectionRefs = useMemo(
    () => Object.fromEntries(navSections.map(({ key, ref }) => [key, ref])),
    [navSections],
  );

  function updateNewsletterForm(surface, patch) {
    setNewsletterForms((prev) => ({ ...prev, [surface]: { ...prev[surface], ...patch } }));
  }

  function handleNewsletterEmailChange(surface, value) {
    setNewsletterForms((prev) => ({
      ...prev,
      [surface]: {
        ...prev[surface],
        email: value,
        status: prev[surface].status === "error" ? "idle" : prev[surface].status,
        error: prev[surface].status === "error" ? "" : prev[surface].error,
      },
    }));
  }

  function handleNewsletterWebsiteChange(surface, value) {
    updateNewsletterForm(surface, { website: value });
  }

  const dismissSubscribePopup = useCallback(() => {
    setShowSubscribePopup(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(NEWSLETTER_POPUP_DISMISSED_KEY, "1");
    }
  }, []);

  const maybeOpenSubscribePopup = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isSubscribed) return;
    if (window.sessionStorage.getItem(NEWSLETTER_POPUP_SHOWN_KEY)) return;
    if (window.sessionStorage.getItem(NEWSLETTER_POPUP_DISMISSED_KEY)) return;
    window.sessionStorage.setItem(NEWSLETTER_POPUP_SHOWN_KEY, "1");
    setShowSubscribePopup(true);
  }, [isSubscribed]);
  const popupDialogRef = useDialog(showSubscribePopup, dismissSubscribePopup);

  async function handleSubscribe(surface = "footer") {
    const form = newsletterForms[surface];
    const trimmed = form.email.trim();
    if (!trimmed) {
      updateNewsletterForm(surface, { status: "error", error: "Please enter your email address." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      updateNewsletterForm(surface, { status: "error", error: "Please enter a valid email address." });
      return;
    }

    updateNewsletterForm(surface, { status: "loading", error: "" });

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, website: form.website }),
      });
      const data = await res.json();
      if (!res.ok) {
        updateNewsletterForm(surface, { status: "error", error: data.error || "Something went wrong. Please try again." });
        return;
      }

      setIsSubscribed(true);
      setShowSubscribePopup(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(NEWSLETTER_STORAGE_KEY, "1");
        window.sessionStorage.setItem(NEWSLETTER_POPUP_DISMISSED_KEY, "1");
      }
      setNewsletterForms((prev) => ({
        hero: { ...prev.hero, status: "success", error: "" },
        inline: { ...prev.inline, status: "success", error: "" },
        footer: { ...prev.footer, status: "success", error: "" },
        popup: { ...prev.popup, status: "success", error: "" },
      }));
    } catch {
      updateNewsletterForm(surface, { status: "error", error: "Could not connect. Please try again." });
    }
  }

  const subEmail = newsletterForms.footer.email;
  const setSubEmail = (value) => handleNewsletterEmailChange("footer", value);
  const subWebsite = newsletterForms.footer.website;
  const setSubWebsite = (value) => handleNewsletterWebsiteChange("footer", value);
  const subStatus = isSubscribed ? "success" : newsletterForms.footer.status;
  const subErrorMsg = newsletterForms.footer.error;

  // Scroll to top on mount (prevents browser scroll restoration on refresh)
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    // Deep-link: open plant modal if ?plant= param is present
    const param = new URLSearchParams(window.location.search).get("plant");
    if (param) {
      const match = NUCLEAR_PLANTS.find(p => p.name.toLowerCase() === param.toLowerCase());
      if (match) setSelectedPlant(match);
    }
  }, [sectionRefs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(NEWSLETTER_STORAGE_KEY) === "1") {
      setIsSubscribed(true);
      setNewsletterForms((prev) => ({
        hero: { ...prev.hero, status: "success" },
        inline: { ...prev.inline, status: "success" },
        footer: { ...prev.footer, status: "success" },
        popup: { ...prev.popup, status: "success" },
      }));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isSubscribed) return undefined;
    if (window.sessionStorage.getItem(NEWSLETTER_POPUP_SHOWN_KEY) || window.sessionStorage.getItem(NEWSLETTER_POPUP_DISMISSED_KEY)) return undefined;

    const timer = window.setTimeout(() => maybeOpenSubscribePopup(), 45000);

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      if ((window.scrollY / scrollable) >= 0.5) {
        maybeOpenSubscribePopup();
      }
    };

    const onMouseOut = (event) => {
      if (window.innerWidth < 1024) return;
      if (event.relatedTarget || event.clientY > 20) return;
      maybeOpenSubscribePopup();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onMouseOut);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, [isSubscribed, maybeOpenSubscribePopup]);

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth <= 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Sync selectedPlant to URL so modals are shareable
  useEffect(() => {
    if (selectedPlant) {
      const url = new URL(window.location.href);
      url.searchParams.set("plant", selectedPlant.name);
      window.history.replaceState(null, "", url.toString());
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("plant");
      window.history.replaceState(null, "", url.toString());
    }
  }, [selectedPlant]);

  // Highlight active nav section based on scroll position.
  useEffect(() => {
    const updateActiveSection = () => {
      const offset = 140;
      let current = "data";

      navSections.forEach(({ key, ref }) => {
        if (!ref.current) return;
        const top = ref.current.getBoundingClientRect().top + window.scrollY;
        if (window.scrollY + offset >= top) {
          current = key;
        }
      });

      setActiveSection((prev) => (prev === current ? prev : current));
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [navSections]);

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
        setNewsLastUpdated(new Date());
      } catch {
        // Fall back to curated articles so the section is never empty
        setNews(getInstantNews());
        setNewsError(true);
        setNewsLastUpdated(new Date());
      } finally {
        setNewsLoading(false);
      }
    }

    loadNews();

    // Refresh live articles every 15 minutes
    const interval = setInterval(loadNews, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
    setActiveSection(section);
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

  const uniqueNewsSources = useMemo(() => new Set(news.map((item) => item.source)).size, [news]);

  const newsStatusLabel = newsError ? "Curated fallback" : "Live feeds";
  const newsStatusTone = newsError ? "rgba(212,165,74,0.12)" : "rgba(74,222,128,0.12)";
  const newsStatusColor = newsError ? "#d4a54a" : "#4ade80";

  async function refreshNews() {
    setNewsError(false);
    setNewsLoading(true);
    clearNewsCache();
    try {
      const articles = await fetchNuclearNews();
      setNews(articles);
      setNewsError(false);
      setNewsLastUpdated(new Date());
    } catch {
      setNews(getInstantNews());
      setNewsError(true);
      setNewsLastUpdated(new Date());
    } finally {
      setNewsLoading(false);
    }
  }

  function getNewsMapLayer(article) {
    const text = `${article?.title || ""} ${article?.curiosityHook || ""} ${article?.whyItMatters || ""} ${article?.tag || ""}`.toLowerCase();
    return /uranium|mine|mining|mill|enrichment|fuel|haleu|conversion|fabrication/.test(text)
      ? "uranium"
      : "reactors";
  }

  const globeCountryOptions = useMemo(() => {
    return [
      ...new Set(
        [...NUCLEAR_PLANTS, ...URANIUM_SUPPLY_SITES]
          .map((item) => item.country)
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, []);

  const globeReactorTypeOptions = useMemo(() => {
    return [
      ...new Set(
        NUCLEAR_PLANTS
          .map((plant) => normalizeReactorType(plant.type))
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, []);

  const filteredPlants = useMemo(() => {
    let result = NUCLEAR_PLANTS;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((plant) =>
        plant.name.toLowerCase().includes(q)
        || plant.country.toLowerCase().includes(q)
        || plant.type.toLowerCase().includes(q)
      );
    }
    if (plantFilter !== "All") {
      result = result.filter((plant) => plant.status === plantFilter);
    }
    if (globeCountryFilter) {
      result = result.filter((plant) => plant.country === globeCountryFilter);
    }
    if (globeReactorTypeFilter) {
      result = result.filter((plant) => normalizeReactorType(plant.type) === globeReactorTypeFilter);
    }
    return result;
  }, [searchQuery, plantFilter, globeCountryFilter, globeReactorTypeFilter]);

  const filteredSupplySites = useMemo(() => {
    let result = URANIUM_SUPPLY_SITES;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((site) =>
        site.name.toLowerCase().includes(q)
        || site.country.toLowerCase().includes(q)
        || site.region.toLowerCase().includes(q)
        || site.stage.toLowerCase().includes(q)
        || site.operator.toLowerCase().includes(q)
      );
    }
    if (globeCountryFilter) {
      result = result.filter((site) => site.country === globeCountryFilter);
    }
    return result;
  }, [searchQuery, globeCountryFilter]);

  const activeGlobeItems = globeLayer === "reactors" ? filteredPlants : filteredSupplySites;
  const globePanelPreviewCount = 3;
  const shouldUseCompactGlobePanel = isMobileViewport;
  const hasActiveGlobeFilters = Boolean(globeCountryFilter || globeReactorTypeFilter);
  const visibleGlobeItems = shouldUseCompactGlobePanel && !mobileGlobePanelExpanded
    ? activeGlobeItems.slice(0, globePanelPreviewCount)
    : activeGlobeItems;

  useEffect(() => {
    if (globeLayer !== "reactors") {
      setGlobeReactorTypeFilter("");
    }
  }, [globeLayer]);

  useEffect(() => {
    if (!isMobileViewport) return;
    setMobileGlobePanelExpanded(false);
  }, [globeLayer, searchQuery, plantFilter, globeCountryFilter, globeReactorTypeFilter, isMobileViewport]);

  // Plants grouped by country for Data section expansion
  const plantsByCountry = useMemo(() => {
    return groupPlantsByCountry(NUCLEAR_PLANTS);
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

  const activeComparisonMetric = useMemo(
    () => ENERGY_COMPARISON.find((metric) => metric.key === compareMetric) || ENERGY_COMPARISON[0],
    [compareMetric],
  );

  const comparisonRows = useMemo(() => {
    const metric = activeComparisonMetric;
    const max = Math.max(...metric.data.map((item) => item.value)) || 1;
    const bestValue = metric.lowerIsBetter
      ? Math.min(...metric.data.map((item) => item.value))
      : Math.max(...metric.data.map((item) => item.value));

    return metric.data.map((item) => ({
      ...item,
      width: (item.value / max) * 100,
      isBest: item.value === bestValue,
    }));
  }, [activeComparisonMetric]);

  const formatComparisonValue = (value) => {
    if (Number.isInteger(value)) return value.toLocaleString("en-US");
    if (value >= 1000) return value.toLocaleString("en-US");
    if (value >= 1) return value.toFixed(1).replace(/\.0$/, "");
    return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  };

  useEffect(() => {
    setHoveredCountry(null);
    setHoveredSource(null);
  }, [dataView, dataSort, compareMetric]);

  // Filtered learn facts
  const filteredFacts = useMemo(() => {
    if (learnFilter === "All") return LEARN_FACTS;
    return LEARN_FACTS.filter(f => f.category === learnFilter);
  }, [learnFilter]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="np-app-shell" style={{ minHeight: "100vh", background: "var(--np-bg)", fontFamily: "'DM Sans',sans-serif", color: "var(--np-text)" }}>
      <StockTicker stocks={stocks} onClickStock={setSelectedStock} />

      {/* Nav */}
      <nav className="np-nav" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px var(--np-section-x)", borderBottom: "1px solid var(--np-border)",
        position: "sticky", top: 0, zIndex: 100, background: "var(--np-nav-bg)",
        backdropFilter: "blur(24px)",
      }}>
        <div className="np-brand" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
             onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span style={{ fontSize: 24 }}>⚛</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
              Nuclear<span style={{ fontStyle: "italic", fontWeight: 400, color: "var(--np-text-muted)", marginLeft: 5 }}>Pulse</span>
            </span>
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--np-text-faint)", fontWeight: 700 }}>
              Strategic Energy Briefing
            </span>
          </div>
        </div>
        <div className="np-nav-links" style={{ display: "flex", gap: 28 }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeSection === item.key;
            return (
              <button key={item.key} onClick={() => scrollTo(item.key)} style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500,
                color: isActive ? "#d4a54a" : "var(--np-text-muted)",
                letterSpacing: "0.05em", textTransform: "uppercase",
                padding: "4px 0", transition: "color 0.2s",
                borderBottom: isActive ? "1px solid rgba(212,165,74,0.6)" : "1px solid transparent",
              }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--np-text)"}
                onMouseLeave={e => e.currentTarget.style.color = isActive ? "#d4a54a" : "var(--np-text-muted)"}
              >{item.label}</button>
            );
          })}
        </div>
        <div className="np-nav-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={toggleDarkMode} style={{
            background: "none", border: "1px solid var(--np-border)", borderRadius: "50%",
            width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 16, transition: "border-color 0.2s",
            color: "var(--np-text-muted)", flexShrink: 0,
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--np-accent)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--np-border)"}
          >{isDark ? "☀" : "☾"}</button>
          <div className="np-search-shell" style={{ position: "relative" }}>
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
            {NAV_ITEMS.map(item => (
              <button key={item.key} onClick={() => { scrollTo(item.key); setMobileMenuOpen(false); }}>
                {item.label}
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

      <div
        className="np-first-fold"
        style={{
          minHeight: "calc(100svh - 108px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
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
          : "radial-gradient(circle at top, rgba(212,165,74,0.14), transparent 34%), linear-gradient(180deg, #f2ebde 0%, #e4dbcb 38%, #0c0907 100%)",
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
              fontFamily: "'Playfair Display',serif", fontSize: "clamp(40px,7vw,84px)", fontWeight: 400,
              lineHeight: 0.94, letterSpacing: "-0.04em", maxWidth: 900, margin: "0 auto", color: isDark ? "#f5f0e8" : "#f7f3ed",
              textTransform: "uppercase",
              textShadow: isDark ? "0 12px 40px rgba(0,0,0,0.36)" : "0 10px 35px rgba(0,0,0,0.22)",
            }}
          >
            {["Baseload", "for", "the"].map((w, i) => (
              <motion.span key={i} variants={wordReveal} style={{ display: "inline-block", marginRight: "0.22em" }}>{w}</motion.span>
            ))}
            <br />
            <motion.em variants={wordReveal} style={{ color: "#d4a54a", display: "inline-block", marginRight: "0.22em", fontStyle: "normal" }}>industrial century.</motion.em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.85 }}
            style={{ fontSize: 16, color: isDark ? "rgba(245,240,232,0.76)" : "rgba(245,240,232,0.78)", maxWidth: 680, margin: "16px auto 0", lineHeight: 1.75, fontWeight: 500 }}
          >
            The grid will not be rebuilt with slogans. Track {NUCLEAR_PLANTS.length}+ reactors, uranium-sensitive markets, national buildouts, and the political fight over firm power in one scroll-heavy briefing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 1.02 }}
            style={{
              marginTop: 24,
              maxWidth: 760,
              marginInline: "auto",
              padding: isMobileViewport ? "18px 18px 16px" : "22px 22px 18px",
              borderRadius: 20,
              border: "1px solid rgba(212,165,74,0.18)",
              background: isDark ? "rgba(13,11,8,0.72)" : "rgba(20,18,14,0.26)",
              backdropFilter: "blur(14px)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#d4a54a" }}>
              Weekly briefing
            </div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(24px,3vw,34px)", lineHeight: 1.08, marginTop: 10, color: "#f5f0e8" }}>
              Get the weekly atomic briefing.
            </div>
            <div style={{ fontSize: 14, color: "rgba(245,240,232,0.74)", maxWidth: 620, margin: "10px auto 0", lineHeight: 1.7 }}>
              One sharp email each week on reactor buildouts, uranium markets, policy fights, and the moves that actually matter. No spam. Unsubscribe anytime.
            </div>
            <div style={{ marginTop: 18 }}>
              <NewsletterCapture
                surface="hero"
                form={newsletterForms.hero}
                success={isSubscribed}
                successMessage="You're in. The next briefing lands in your inbox this week."
                onEmailChange={handleNewsletterEmailChange}
                onWebsiteChange={handleNewsletterWebsiteChange}
                onSubmit={handleSubscribe}
                placeholder="Enter your email for the weekly briefing"
                buttonLabel="Get briefing"
                align="center"
                rowStyle={{ justifyContent: "center" }}
                inputStyle={{
                  width: isMobileViewport ? "100%" : 390,
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(20,18,14,0.18)",
                  color: "#f5f0e8",
                  borderColor: "rgba(245,240,232,0.14)",
                }}
                buttonStyle={{
                  background: "#f5f0e8",
                  color: "#14120e",
                }}
                note="Readers get the signal behind the week in nuclear, not a flood of headlines."
              />
            </div>
          </motion.div>

        </motion.div>
      </section>

      {/* Stats */}
      <section ref={statsRef} className="np-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 1, background: "var(--np-bg)", margin: "0 0 0 0" }}>
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
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>
              <CountUp target={s.target} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} active={showStats} delay={i * 80} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--np-text-muted)", marginTop: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
            <div style={{ fontSize: 11, color: "var(--np-text-faint)", marginTop: 4, lineHeight: 1.4 }}>{s.sub}</div>
            <div style={{ fontSize: 9, color: "#d4a54a", marginTop: 8, letterSpacing: "0.04em", opacity: 0.7 }}>↗ {s.source}</div>
          </a>
        ))}
      </section>
      </div>

      {/* ROTATING QUOTES */}
      <section style={{ padding: "var(--np-section-y) var(--np-section-x)", textAlign: "center", background: "var(--np-bg)" }}>
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
      <section ref={sectionRefs.data} className="np-data-section" style={{ padding: "var(--np-section-y) var(--np-section-x)", background: "var(--np-surface-dim)", scrollMarginTop: 80 }}>
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
                                    background: "linear-gradient(90deg, #d4a54a 0%, #8b7355 100%)",
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
                                    background: isNuclear ? "linear-gradient(90deg, #d4a54a 0%, #c4935a 100%)" : color,
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
      {/* GLOBE SECTION */}
      <ErrorBoundary section="Globe">
      <section ref={sectionRefs.globe} style={{ padding: "var(--np-section-y) var(--np-section-x) 48px", scrollMarginTop: 80, background: "var(--np-bg)" }}>
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
                <div className="np-globe-toggle-row" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
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
                <div className="np-globe-panel-meta" style={{ fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--np-text-muted)" }}>
                  {activeGlobeItems.length} {globeLayer === "reactors" ? "Plants" : "Mines"} {searchQuery && `· "${searchQuery}"`}
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

      {/* NEWS SECTION */}
      <ErrorBoundary section="News">
      <section ref={sectionRefs.news} style={{ padding: "var(--np-section-y) var(--np-section-x)", scrollMarginTop: 80, background: "linear-gradient(to bottom, var(--np-bg-alt) 0%, var(--np-bg) 100%)" }}>
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

      <section style={{ padding: "0 var(--np-section-x) var(--np-section-y)", background: "var(--np-bg)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{
            borderRadius: 24,
            border: "1px solid rgba(212,165,74,0.16)",
            background: isDark
              ? "linear-gradient(135deg, rgba(212,165,74,0.08) 0%, rgba(245,240,232,0.03) 100%)"
              : "linear-gradient(135deg, rgba(212,165,74,0.08) 0%, rgba(255,255,255,0.72) 100%)",
            padding: isMobileViewport ? "24px 18px" : "30px 34px",
            boxShadow: isDark ? "0 16px 40px rgba(0,0,0,0.18)" : "0 14px 36px rgba(30,25,18,0.08)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0, 1.1fr) minmax(320px, 420px)", gap: 22, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#d4a54a" }}>
                  The signal behind the week
                </div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,3vw,42px)", lineHeight: 1.08, marginTop: 10 }}>
                  Get the moves that matter, once a week.
                </div>
                <div style={{ fontSize: 15, color: "var(--np-text-muted)", lineHeight: 1.7, marginTop: 12, maxWidth: 620 }}>
                  If you made it this far, you already care about the buildout story. The briefing turns reactor maps, uranium signals, policy shifts, and market moves into one clean weekly read.
                </div>
              </div>
              <div>
                <NewsletterCapture
                  surface="inline"
                  form={newsletterForms.inline}
                  success={isSubscribed}
                  successMessage="Subscribed. You’ll get the next weekly atomic briefing in your inbox."
                  onEmailChange={handleNewsletterEmailChange}
                  onWebsiteChange={handleNewsletterWebsiteChange}
                  onSubmit={handleSubscribe}
                  placeholder="Email for the weekly briefing"
                  buttonLabel="Join free"
                  rowStyle={{ justifyContent: "flex-start" }}
                  inputStyle={{ width: "100%" }}
                  buttonStyle={{ minWidth: isMobileViewport ? "100%" : 152 }}
                  note="Weekly. Free. No spam. Unsubscribe anytime."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STOCKS SECTION */}
      <ErrorBoundary section="Stocks" dark={true}>
      <section ref={sectionRefs.stocks} style={{ padding: "var(--np-section-y) var(--np-section-x)", background: "var(--np-dark-bg)", color: "var(--np-dark-text)", scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer}>
          <SectionLabel dark>Market Overview</SectionLabel>
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
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,240,232,0.07)"; e.currentTarget.style.borderColor = "rgba(212,165,74,0.3)"; e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 20px 48px rgba(0,0,0,0.28)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,240,232,0.035)"; e.currentTarget.style.borderColor = "rgba(245,240,232,0.06)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
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

      {/* SMR TRACKER SECTION */}
      <section ref={sectionRefs.smr} style={{ padding: "var(--np-section-y) var(--np-section-x)", background: "var(--np-dark-bg)", color: "var(--np-dark-text)", scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer}>
            <SectionLabel dark>SMR Tracker</SectionLabel>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 8 }}>
              Small modular <em style={{ color: "#d4a54a" }}>reactors.</em>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "rgba(245,240,232,0.45)", fontSize: 15, marginBottom: 32, maxWidth: 580, lineHeight: 1.6 }}>
              The next generation of nuclear — factory-built, faster to deploy, and designed for a decarbonised grid.
            </motion.p>

            {/* Status legend */}
            <motion.div variants={fadeUp} style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 36 }}>
              {SMR_STATUS_ORDER.map(s => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(245,240,232,0.5)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: SMR_STATUS_COLORS[s], flexShrink: 0 }} />
                  {s} <span style={{ color: "rgba(245,240,232,0.25)", marginLeft: 2 }}>({SMR_PROJECTS.filter(p => p.status === s).length})</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* SMR cards grid */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={staggerContainer}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}
          >
            {[...SMR_PROJECTS].sort((a, b) => SMR_STATUS_ORDER.indexOf(a.status) - SMR_STATUS_ORDER.indexOf(b.status)).map((project) => (
              <motion.div key={project.name} variants={fadeUp} style={{
                background: "rgba(245,240,232,0.04)", border: "1px solid rgba(245,240,232,0.08)",
                borderRadius: 12, padding: "18px 20px",
                borderLeft: `3px solid ${SMR_STATUS_COLORS[project.status]}`,
                transition: "background 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(245,240,232,0.07)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(245,240,232,0.04)"}
              >
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 500, color: "#f5f0e8", lineHeight: 1.2 }}>{project.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(245,240,232,0.4)", marginTop: 2 }}>{project.company} · {project.country}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                    color: SMR_STATUS_COLORS[project.status],
                    background: SMR_STATUS_COLORS[project.status] + "18",
                    padding: "3px 8px", borderRadius: 20, flexShrink: 0, marginLeft: 8,
                  }}>{project.status}</span>
                </div>

                {/* Description */}
                <p style={{ fontSize: 12, color: "rgba(245,240,232,0.45)", lineHeight: 1.55, margin: "0 0 14px" }}>{project.desc}</p>

                {/* Stats row */}
                <div style={{ display: "flex", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(245,240,232,0.3)", marginBottom: 2 }}>Capacity</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600, color: "#d4a54a" }}>{project.capacity} MW</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(245,240,232,0.3)", marginBottom: 2 }}>Type</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600, color: "#d4a54a" }}>{project.type}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(245,240,232,0.3)", marginBottom: 2 }}>Target</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600, color: "#d4a54a" }}>{project.year}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            style={{ fontSize: 11, color: "rgba(245,240,232,0.2)", marginTop: 24, textAlign: "right" }}
          >
            Sources: IAEA, World Nuclear Association, company filings — updated Feb 2026
          </motion.p>
        </div>
      </section>

      {/* LEARN SECTION */}
      <section ref={sectionRefs.learn} style={{ padding: "var(--np-section-y) var(--np-section-x)", scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* Reactor Types */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer} style={{ marginBottom: 72 }}>
            <SectionLabel>Education</SectionLabel>
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
                              ? (
                                <Suspense fallback={<LazySectionFallback height={320} />}>
                                  <Reactor3D type={r.type} />
                                </Suspense>
                              )
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

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer}>
            <SectionLabel>Did You Know</SectionLabel>
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

      {/* TIMELINE SECTION */}
      <section ref={sectionRefs.timeline} style={{ padding: "var(--np-section-y) var(--np-section-x)", background: "var(--np-dark-bg)", color: "var(--np-dark-text)", scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer}>
            <SectionLabel dark>History</SectionLabel>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 8 }}>
              Nuclear <em style={{ color: "#d4a54a" }}>timeline.</em>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "rgba(245,240,232,0.4)", fontSize: 15, marginBottom: 48, maxWidth: 600, lineHeight: 1.6 }}>From the first chain reaction to the SMR revolution — eight decades of nuclear milestones.</motion.p>
          </motion.div>
          <Timeline />
        </div>
      </section>

      {/* Newsletter CTA */}
      <section style={{ padding: "var(--np-section-y) var(--np-section-x)", textAlign: "center", background: "var(--np-surface-dim)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer}>
            <SectionLabel>Newsletter</SectionLabel>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 400, marginBottom: 12, lineHeight: 1.2 }}>
              Stay close to the <em style={{ color: "var(--np-text-muted)" }}>weekly atomic briefing.</em>
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
                <input
                  aria-hidden="true"
                  tabIndex={-1}
                  autoComplete="off"
                  value={subWebsite}
                  onChange={e => setSubWebsite(e.target.value)}
                  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                />
                <input type="email" aria-label="Email address" placeholder="Enter your email"
                  value={subEmail}
                  onChange={e => setSubEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubscribe()}
                  disabled={subStatus === "loading"}
                  style={{ padding: "15px 22px", fontSize: 14, fontFamily: "'DM Sans',sans-serif", background: "var(--np-surface)", color: "var(--np-text)", border: `1px solid ${subStatus === "error" ? "rgba(248,113,113,0.5)" : "var(--np-border)"}`, borderRadius: "10px 0 0 10px", width: 320, outline: "none", borderRight: "none", transition: "border-color 0.2s", opacity: subStatus === "loading" ? 0.6 : 1 }}
                  onFocus={e => e.currentTarget.style.borderColor = "rgba(212,165,74,0.4)"}
                  onBlur={e => e.currentTarget.style.borderColor = subStatus === "error" ? "rgba(248,113,113,0.5)" : "var(--np-border)"} />
                <button aria-label="Subscribe to newsletter" onClick={handleSubscribe} disabled={subStatus === "loading"}
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

      <AnimatePresence>
        {showSubscribePopup && !isSubscribed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismissSubscribePopup}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(14,12,10,0.64)",
              backdropFilter: "blur(10px)",
              zIndex: 1100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 18,
            }}
          >
            <motion.div
              ref={popupDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="newsletter-popup-title"
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              style={{
                width: "min(92vw, 520px)",
                borderRadius: 24,
                border: "1px solid rgba(212,165,74,0.2)",
                background: "linear-gradient(180deg, rgba(22,18,13,0.98) 0%, rgba(13,11,8,0.98) 100%)",
                boxShadow: "0 28px 80px rgba(0,0,0,0.35)",
                padding: isMobileViewport ? "24px 18px 20px" : "28px 26px 24px",
                color: "#f5f0e8",
                position: "relative",
              }}
            >
              <button
                type="button"
                aria-label="Close newsletter popup"
                onClick={dismissSubscribePopup}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "1px solid rgba(245,240,232,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#f5f0e8",
                  cursor: "pointer",
                  fontSize: 20,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#d4a54a" }}>
                Weekly atomic briefing
              </div>
              <h3 id="newsletter-popup-title" style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,4vw,40px)", lineHeight: 1.08, margin: "10px 0 10px" }}>
                Don’t lose the signal.
              </h3>
              <p style={{ fontSize: 15, color: "rgba(245,240,232,0.72)", lineHeight: 1.7, margin: "0 0 18px" }}>
                Get one sharp weekly email on reactor buildouts, uranium markets, policy fights, and the stories worth your attention.
              </p>
              <NewsletterCapture
                surface="popup"
                form={newsletterForms.popup}
                success={false}
                onEmailChange={handleNewsletterEmailChange}
                onWebsiteChange={handleNewsletterWebsiteChange}
                onSubmit={handleSubscribe}
                placeholder="Email for the weekly briefing"
                buttonLabel="Join free"
                inputStyle={{
                  width: "100%",
                  background: "rgba(255,255,255,0.05)",
                  color: "#f5f0e8",
                  borderColor: "rgba(245,240,232,0.12)",
                }}
                buttonStyle={{
                  background: "#f5f0e8",
                  color: "#14120e",
                }}
                note="Free weekly email. No spam. Unsubscribe anytime."
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer style={{ background: "var(--np-dark-bg)", color: "var(--np-dark-text-muted)", padding: "var(--np-section-y-footer) var(--np-section-x)", fontSize: 12, borderTop: "1px solid rgba(212,165,74,0.1)" }}>
        <div className="np-footer-inner" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#f5f0e8", fontWeight: 700 }}>⚛ Nuclear<em style={{ fontWeight: 400, color: "#d4a54a" }}> Pulse</em></span>
            <div style={{ marginTop: 8, lineHeight: 1.5 }}>Live nuclear intelligence for the next industrial century.</div>
          </div>
          <div style={{ textAlign: "right", lineHeight: 1.6 }}>
            <div>Data sourced from IAEA PRIS, World Nuclear Association, and public markets.</div>
            <div style={{ marginTop: 4 }}>© 2026 NuclearPulse · For informational purposes only.</div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {selectedPlant && (
          <Suspense fallback={null}>
            <PlantModal key={selectedPlant.name} plant={selectedPlant} onClose={() => setSelectedPlant(null)} />
          </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedStock && (
          <Suspense fallback={null}>
            <StockModal stock={selectedStock} onClose={() => setSelectedStock(null)} />
          </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedCountry && (
          <Suspense fallback={null}>
            <CountryModal country={selectedCountry} onClose={() => setSelectedCountry(null)} onSelectPlant={setSelectedPlant} />
          </Suspense>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        ::selection{background:rgba(212,165,74,0.25);color:#1e1912}
      `}</style>
    </div>
    </MotionConfig>
  );
}
