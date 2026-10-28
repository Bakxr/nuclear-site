import { lazy, Suspense, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { FEATURED_STOCKS, NUCLEAR_SHARE, LEARN_FACTS, ENERGY_COMPARISON } from "./data/constants.js";
import { NUCLEAR_PLANTS } from "./data/plants.js";
import { SUPPLY_STAGE_COLORS, URANIUM_SUPPLY_SITES } from "./data/supplySites.js";
import { fetchStockHistory, fetchMultipleQuotes } from "./services/stocksAPI.js";
import { useNewsFeed } from "./features/news/useNewsFeed.js";
import { useNewsletter } from "./features/newsletter/useNewsletter.js";
import NewsletterCapture from "./features/newsletter/NewsletterCapture.jsx";
import useDarkMode from "./hooks/useDarkMode.js";
import TimelineSection from "./features/sections/TimelineSection.jsx";
import SmrSection from "./features/sections/SmrSection.jsx";
import ProSection from "./features/sections/ProSection.jsx";
import FooterSection from "./features/sections/FooterSection.jsx";
import NewsSection from "./features/sections/NewsSection.jsx";
import LearnSection from "./features/sections/LearnSection.jsx";
import GlobeSection from "./features/sections/GlobeSection.jsx";
import DataSection from "./features/sections/DataSection.jsx";
import SearchOverlay from "./components/SearchOverlay.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import LazySectionFallback from "./components/LazySectionFallback.jsx";
import useDialog from "./hooks/useDialog.js";
import { normalizeReactorType } from "./services/plantAPI.js";
import { groupPlantsByCountry } from "./utils/countries.js";
import { describePlan, formatAccessDate, getAccountStatusMeta } from "./features/access/accountStatus.js";
import UserIcon from "./features/access/UserIcon.jsx";
import useBillingPortal from "./features/access/useBillingPortal.js";
import { useTerminalAccess } from "./features/access/context.jsx";
import TerminalRouteView from "./features/terminal/TerminalRouteView.jsx";
import { mergeTerminalSnapshots } from "./features/terminal/mergeSnapshots.js";
import { buildPublicTerminalSignals } from "./features/terminal/publicSignals.js";
import { buildAppPath, getAppViewFromLocation } from "./features/terminal/route.js";
import { useTerminalSnapshot } from "./features/terminal/useTerminalSnapshot.js";
import TerminalEditorialStrip from "./components/TerminalEditorialStrip.jsx";
import Masthead from "./features/front/Masthead.jsx";
import FrontPage from "./features/front/FrontPage.jsx";
import { useFrontSignals } from "./features/front/useFrontSignals.js";
import MarketsTable from "./features/front/MarketsTable.jsx";
import { pickFront } from "./features/front/pickFront.js";
import "./features/front/front.css";

const Globe = lazy(() => import("./components/Globe.jsx"));
const StockModal = lazy(() => import("./components/StockModal.jsx"));
const PlantModal = lazy(() => import("./components/PlantModal.jsx"));
const CountryModal = lazy(() => import("./components/CountryModal.jsx"));

function AccountAccessDialog({ isOpen, onClose, onOpenTerminal, isMobileViewport }) {
  const {
    accessState,
    isConfigured,
    membership,
    membershipError,
    membershipLoading,
    refreshMembership,
    sendOtp,
    signOut,
    user,
    verifyOtp,
  } = useTerminalAccess();
  const dialogRef = useDialog(isOpen, onClose);
  const { openPortal, busy: portalBusy, error: portalError } = useBillingPortal();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const accountMeta = useMemo(
    () => getAccountStatusMeta({ accessState, isConfigured, membershipLoading, membership, user }),
    [accessState, isConfigured, membershipLoading, membership, user],
  );

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");
    setSuccessMessage("");
  }, [isOpen]);

  const accessSummary = useMemo(() => {
    if (!isConfigured) {
      return "Supabase browser auth is not configured in this environment yet.";
    }
    if (membershipLoading || accessState === "loading") {
      return "Restoring your session and checking terminal access.";
    }
    if (!user) {
      return "Sign in with your email once, then use the same account for terminal access everywhere on the site.";
    }
    if (membership?.terminal_access) {
      const untilText = membership.current_period_end ? ` Access is live until ${formatAccessDate(membership.current_period_end)}.` : "";
      return `Signed in as ${user.email}. Terminal access is active.${untilText}`;
    }

    return `Signed in as ${user.email}. Your editorial account is live, and you can open the terminal page anytime to manage access.`;
  }, [accessState, isConfigured, membership, membershipLoading, user]);

  async function handleSendCode() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage("Enter your email to receive a one-time code.");
      return;
    }

    setAuthBusy(true);
    try {
      const normalizedEmail = await sendOtp(email);
      setEmail(normalizedEmail);
      setOtpSent(true);
      setSuccessMessage(`A login code was sent to ${normalizedEmail}.`);
    } catch (error) {
      setErrorMessage(error.message || "Could not send the login code.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerifyCode() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!code.trim()) {
      setErrorMessage("Enter the one-time code from your email.");
      return;
    }

    setAuthBusy(true);
    try {
      await verifyOtp(email, code);
      await refreshMembership();
      setCode("");
      setOtpSent(false);
      setSuccessMessage("You are signed in. Your account status is now available from the main page.");
    } catch (error) {
      setErrorMessage(error.message || "That code could not be verified.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setErrorMessage("");
    setSuccessMessage("");
    await signOut();
    setOtpSent(false);
    setCode("");
    setSuccessMessage("You have been signed out.");
  }

  function handleOpenTerminal() {
    onOpenTerminal();
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(12,10,8,0.68)",
            backdropFilter: "blur(10px)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-access-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            style={{
              width: "min(92vw, 540px)",
              borderRadius: 18,
              border: "1px solid rgba(var(--np-accent-rgb), 0.2)",
              background: "linear-gradient(180deg, rgba(22,18,13,0.98) 0%, rgba(12,10,8,0.98) 100%)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.35)",
              padding: isMobileViewport ? "24px 18px 20px" : "28px 26px 24px",
              color: "#f5f0e8",
              position: "relative",
              display: "grid",
              gap: 16,
            }}
          >
            <button
              type="button"
              aria-label="Close account dialog"
              onClick={onClose}
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

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--np-accent)" }}>
                Account access
              </div>
              <h3 id="account-access-title" style={{ fontFamily: "var(--np-font-display)", fontSize: "clamp(28px,4vw,40px)", lineHeight: 1.08, margin: "10px 0 8px" }}>
                {user ? "You're signed in." : "Sign in from the main page."}
              </h3>
              <p style={{ fontSize: 15, color: "rgba(245,240,232,0.72)", lineHeight: 1.7, margin: 0 }}>
                {accessSummary}
              </p>
            </div>

            <div style={{
              borderRadius: 18,
              border: "1px solid rgba(245,240,232,0.08)",
              background: "rgba(255,255,255,0.04)",
              padding: "16px 16px 15px",
              display: "grid",
              gap: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(245,240,232,0.48)", fontWeight: 700, marginBottom: 6 }}>
                    Current status
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f0e8", lineHeight: 1.3, wordBreak: "break-word" }}>
                    {user ? user.email : "Not signed in"}
                  </div>
                </div>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(245,240,232,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: accountMeta.accent,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: accountMeta.accent, flexShrink: 0 }} />
                  {accountMeta.detail}
                </span>
              </div>
              {describePlan(membership) ? (
                <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(245,240,232,0.66)" }}>
                  {describePlan(membership)}
                </div>
              ) : null}
            </div>

            {!isConfigured ? (
              <div style={{ borderRadius: 16, border: "1px solid rgba(248,113,113,0.24)", background: "rgba(127,29,29,0.18)", padding: "13px 14px", fontSize: 12.5, lineHeight: 1.6, color: "#f8c3c3" }}>
                Supabase browser auth is not configured yet, so main-page sign-in is unavailable in this environment.
              </div>
            ) : null}

            {membershipError ? (
              <div style={{ borderRadius: 16, border: "1px solid rgba(251,191,36,0.22)", background: "rgba(251,191,36,0.08)", padding: "13px 14px", fontSize: 12.5, lineHeight: 1.6, color: "#f6d98a" }}>
                {membershipError}
              </div>
            ) : null}

            {!user ? (
              <div style={{ display: "grid", gap: 10 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  disabled={authBusy || !isConfigured}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    border: "1px solid rgba(245,240,232,0.12)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#f5f0e8",
                    padding: "14px 15px",
                    fontSize: 14,
                    outline: "none",
                  }}
                />

                {otpSent ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="8-digit code"
                    disabled={authBusy}
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "1px solid rgba(245,240,232,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#f5f0e8",
                      padding: "14px 15px",
                      fontSize: 14,
                      outline: "none",
                      letterSpacing: "0.1em",
                    }}
                  />
                ) : null}

                <button
                  type="button"
                  onClick={otpSent ? handleVerifyCode : handleSendCode}
                  disabled={authBusy || !isConfigured}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    border: "1px solid rgba(var(--np-accent-rgb), 0.35)",
                    background: "#f5f0e8",
                    color: "#14120e",
                    padding: "13px 16px",
                    cursor: authBusy || !isConfigured ? "not-allowed" : "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    opacity: authBusy || !isConfigured ? 0.65 : 1,
                  }}
                >
                  {authBusy ? (otpSent ? "Verifying..." : "Sending code...") : (otpSent ? "Verify code" : "Send login code")}
                </button>

                {otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={authBusy}
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "1px solid rgba(245,240,232,0.12)",
                      background: "rgba(255,255,255,0.03)",
                      color: "#f5f0e8",
                      padding: "12px 16px",
                      cursor: authBusy ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      opacity: authBusy ? 0.7 : 1,
                    }}
                  >
                    Resend code
                  </button>
                ) : null}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleOpenTerminal}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    border: "1px solid rgba(var(--np-accent-rgb), 0.35)",
                    background: "#f5f0e8",
                    color: "#14120e",
                    padding: "13px 16px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {membership?.terminal_access ? "Open terminal" : "Open terminal plans"}
                </button>
                {membership?.stripe_customer_id ? (
                  <button
                    type="button"
                    onClick={openPortal}
                    disabled={portalBusy}
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "1px solid rgba(var(--np-accent-rgb), 0.22)",
                      background: "rgba(255,255,255,0.03)",
                      color: "#f5f0e8",
                      padding: "12px 16px",
                      cursor: portalBusy ? "wait" : "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      opacity: portalBusy ? 0.7 : 1,
                    }}
                  >
                    {portalBusy ? "Opening…" : "Billing & subscription"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    border: "1px solid rgba(245,240,232,0.12)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#f5f0e8",
                    padding: "12px 16px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Sign out
                </button>
              </div>
            )}

            {errorMessage || portalError ? (
              <div style={{ borderRadius: 16, border: "1px solid rgba(251,191,36,0.22)", background: "rgba(251,191,36,0.08)", padding: "13px 14px", fontSize: 12.5, lineHeight: 1.6, color: "#f6d98a" }}>
                {errorMessage || portalError}
              </div>
            ) : null}
            {successMessage ? (
              <div style={{ borderRadius: 16, border: "1px solid rgba(74,222,128,0.22)", background: "rgba(74,222,128,0.08)", padding: "13px 14px", fontSize: 12.5, lineHeight: 1.6, color: "#b5f5cd" }}>
                {successMessage}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}


// ─── MAIN APP ───────────────────────────────────────────────────────────


export default function NuclearPulse() {
  const { accessState, getAccessToken, isConfigured, membership, membershipLoading, user } = useTerminalAccess();
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newsFilter, setNewsFilter] = useState("All");
  const [newsSort, setNewsSort] = useState("latest");
  const [newsLimit, setNewsLimit] = useState(12);
  const [plantFilter, setPlantFilter] = useState("All");
  const [stocks, setStocks] = useState(() => FEATURED_STOCKS.map(s => ({ ...s, price: 0, change: 0, pct: 0, history: [] })));
  const [stocksLoading, setStocksLoading] = useState(true);
  const [stocksError, setStocksError] = useState(false);
  const [stocksRetry, setStocksRetry] = useState(0);
  const [stocksLastUpdated, setStocksLastUpdated] = useState(null);
  const {
    news,
    loading: newsLoading,
    error: newsError,
    lastUpdated: newsLastUpdated,
    refresh: refreshNews,
  } = useNewsFeed();
  const {
    forms: newsletterForms,
    isSubscribed,
    showPopup: showSubscribePopup,
    dismissPopup: dismissSubscribePopup,
    handleEmailChange: handleNewsletterEmailChange,
    handleWebsiteChange: handleNewsletterWebsiteChange,
    handleSubscribe,
  } = useNewsletter();
  const [showAccountDialog, setShowAccountDialog] = useState(false);

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
  const [globeFiltersOpen, setGlobeFiltersOpen] = useState(false);

  // Proof comparison state
  const [compareMetric, setCompareMetric] = useState("co2");
  const [hoveredSource, setHoveredSource] = useState(null);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  });
  const [appView, setAppView] = useState(() => {
    if (typeof window === "undefined") return "home";
    return getAppViewFromLocation(window.location);
  });

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const accountStatusMeta = useMemo(
    () => getAccountStatusMeta({ accessState, isConfigured, membershipLoading, membership, user }),
    [accessState, isConfigured, membershipLoading, membership, user],
  );
  const {
    remoteTerminalSnapshot,
    terminalLoading,
    terminalError,
    refreshTerminalSnapshot,
  } = useTerminalSnapshot({ accessState, appView, getAccessToken });

  // Section refs for navigation — each ref is a named variable (not inside an object literal)
  // to satisfy the Rules of Hooks (hooks must be called unconditionally at the top level)
  const frontRef = useRef(null);
  const globeRef = useRef(null);
  const globePanelRef = useRef(null);
  const globePanelListRef = useRef(null);
  const globeFiltersRef = useRef(null);
  const stocksRef = useRef(null);
  const newsRef = useRef(null);
  const dataRef = useRef(null);
  const timelineRef = useRef(null);
  const learnRef = useRef(null);
  const smrRef = useRef(null);
  // Home-page sections in page order (drives the active nav link); the
  // /learn page's sections are scroll targets only.
  const navSections = useMemo(() => ([
    { key: "front", ref: frontRef },
    { key: "stocks", ref: stocksRef },
    { key: "news", ref: newsRef },
    { key: "globe", ref: globeRef },
    { key: "smr", ref: smrRef },
  ]), []);
  // Plain lookup map used by scrollTo and section refs in JSX.
  const sectionRefs = useMemo(
    () => ({
      ...Object.fromEntries(navSections.map(({ key, ref }) => [key, ref])),
      data: dataRef,
      learn: learnRef,
      timeline: timelineRef,
    }),
    [navSections],
  );

  const closeAccountDialog = useCallback(() => {
    setShowAccountDialog(false);
  }, []);
  const popupDialogRef = useDialog(showSubscribePopup, dismissSubscribePopup);

  const newsletter = {
    forms: newsletterForms,
    isSubscribed,
    handleEmailChange: handleNewsletterEmailChange,
    handleWebsiteChange: handleNewsletterWebsiteChange,
    handleSubscribe,
  };
  const { uranium: frontUranium, fleet: frontFleet } = useFrontSignals();
  const mastReadings = [
    frontUranium ? `U₃O₈ $${frontUranium.pricePerLb.toFixed(2)}/lb` : null,
    frontFleet ? `US fleet ${frontFleet.online}/${frontFleet.total} online` : null,
  ].filter(Boolean).join(" · ");
  const frontUrls = useMemo(() => pickFront(news).frontUrls, [news]);

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
      let current = "front";

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
        const tickers = FEATURED_STOCKS.map(s => s.ticker);
        const quotes = await fetchMultipleQuotes(tickers);

        // Merge base data with live quotes and history
        const stocksWithData = await Promise.all(
          FEATURED_STOCKS.map(async (stock) => {
            const quote = quotes[stock.ticker];
            const currentPrice = quote?.price || 0;

            // Real daily closes (shared, cached request); empty if unavailable.
            const history = await fetchStockHistory(stock.ticker);

            return {
              ...stock,
              price: currentPrice,
              change: quote?.change || 0,
              pct: quote?.pct || 0,
              history,
            };
          })
        );

        setStocks(stocksWithData);
        setStocksLastUpdated(new Date());
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

  const scrollTo = (section) => {
    setActiveSection(section);
    sectionRefs[section]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const switchAppView = useCallback((view) => {
    setAppView(view);
    if (typeof window !== "undefined") {
      const nextUrl = buildAppPath(view);
      if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
        window.history.pushState({}, "", nextUrl);
        window.scrollTo(0, 0);
      }
    }
  }, []);

  // Section links work from /learn too: go home first, then scroll once the
  // home sections have rendered.
  const goToSection = (section) => {
    if (appView === "home") {
      scrollTo(section);
      return;
    }
    switchAppView("home");
    window.setTimeout(() => scrollTo(section), 60);
  };

  useEffect(() => {
    const onPopState = () => {
      setAppView(getAppViewFromLocation(window.location));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("view") === "terminal" && window.location.pathname !== "/terminal") {
      window.history.replaceState({}, "", buildAppPath("terminal"));
    }
  }, []);

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

  const terminalSnapshot = useMemo(
    () => mergeTerminalSnapshots(stocks, remoteTerminalSnapshot),
    [stocks, remoteTerminalSnapshot],
  );

  const editorialSignals = useMemo(() => buildPublicTerminalSignals({ stocks, news }), [stocks, news]);

  const uniqueNewsSources = useMemo(() => new Set(news.map((item) => item.source)).size, [news]);


  async function handleTerminalRefresh() {
    try {
      await refreshTerminalSnapshot();
    } catch {
      // The hook already captures the user-facing terminal error state.
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
    setGlobeFiltersOpen(false);
  }, [globeLayer]);

  useEffect(() => {
    if (!isMobileViewport) return;
    setMobileGlobePanelExpanded(false);
    setGlobeFiltersOpen(false);
  }, [globeLayer, searchQuery, plantFilter, globeCountryFilter, globeReactorTypeFilter, isMobileViewport]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!globeFiltersRef.current?.contains(event.target)) {
        setGlobeFiltersOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    setGlobeFiltersOpen(false);
  }, [globeCountryFilter, globeReactorTypeFilter]);

  useEffect(() => {
    if (!mobileGlobePanelExpanded) {
      setGlobeFiltersOpen(false);
    }
  }, [mobileGlobePanelExpanded]);

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

  if (appView === "terminal") {
    return (
      <MotionConfig reducedMotion="user">
        <div className="np-app-shell" style={{ minHeight: "100vh", background: "var(--np-bg)", fontFamily: "var(--np-font-sans)", color: "var(--np-text)" }}>
          <TerminalRouteView
            GlobeComponent={Globe}
            accessState={accessState}
            isMobileViewport={isMobileViewport}
            terminalSnapshot={terminalSnapshot}
            terminalLoading={terminalLoading}
            terminalError={terminalError}
            onExitTerminal={() => switchAppView("home")}
            onOpenPlant={setSelectedPlant}
            onOpenStock={setSelectedStock}
            onRefreshData={handleTerminalRefresh}
          />

          {selectedPlant && (
            <Suspense fallback={null}>
              <PlantModal key={selectedPlant.name} plant={selectedPlant} onClose={() => setSelectedPlant(null)} />
            </Suspense>
          )}
          {selectedStock && (
            <Suspense fallback={null}>
              <StockModal stock={selectedStock} onClose={() => setSelectedStock(null)} />
            </Suspense>
          )}
          {selectedCountry && (
            <Suspense fallback={null}>
              <CountryModal country={selectedCountry} onClose={() => setSelectedCountry(null)} onSelectPlant={setSelectedPlant} />
            </Suspense>
          )}
        </div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="np-app-shell" style={{ minHeight: "100vh", background: "var(--np-bg)", fontFamily: "var(--np-font-sans)", color: "var(--np-text)" }}>
      <Masthead
        appView={appView}
        activeSection={activeSection}
        onSection={goToSection}
        onView={switchAppView}
        isDark={isDark}
        onToggleTheme={toggleDarkMode}
        user={user}
        accountStatusMeta={accountStatusMeta}
        onOpenAccount={() => setShowAccountDialog(true)}
        readings={mastReadings}
        searchQuery={searchQuery}
        onSearchChange={(value) => { setSearchQuery(value); setShowSearch(true); }}
        onSearchFocus={() => { if (searchQuery) setShowSearch(true); }}
        onSearchBlur={() => setTimeout(() => setShowSearch(false), 150)}
        searchOverlay={(
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
        )}
      />

      <main id="main">
      {appView === "learn" ? (
        <>
          <section className="np-wrap" style={{ paddingTop: "clamp(24px, 4vw, 40px)" }}>
            <h1 style={{ margin: 0, fontFamily: "var(--np-font-display)", fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.05 }}>Learn</h1>
            <p style={{ margin: "12px 0 0", maxWidth: "62ch", fontSize: 18, lineHeight: 1.55, color: "var(--np-text-muted)" }}>
              How the world&apos;s reactors work, where nuclear power already carries the grid, and eighty years of the history behind it.
            </p>
          </section>
          <LearnSection
            sectionRef={sectionRefs.learn}
            isMobileViewport={isMobileViewport}
            expandedReactor={expandedReactor}
            setExpandedReactor={setExpandedReactor}
            reactorViewMode={reactorViewMode}
            setReactorViewMode={setReactorViewMode}
            learnFilter={learnFilter}
            setLearnFilter={setLearnFilter}
            flippedCards={flippedCards}
            setFlippedCards={setFlippedCards}
            filteredFacts={filteredFacts}
            highlightedFact={highlightedFact}
            setHighlightedFact={setHighlightedFact}
          />
          <DataSection
            sectionRef={sectionRefs.data}
            isDark={isDark}
            dataView={dataView}
            setDataView={setDataView}
            dataSort={dataSort}
            setDataSort={setDataSort}
            expandedCountry={expandedCountry}
            setExpandedCountry={setExpandedCountry}
            hoveredCountry={hoveredCountry}
            setHoveredCountry={setHoveredCountry}
            hoveredSource={hoveredSource}
            setHoveredSource={setHoveredSource}
            compareMetric={compareMetric}
            setCompareMetric={setCompareMetric}
            activeComparisonMetric={activeComparisonMetric}
            totalCountries={totalCountries}
            sortedNuclearShare={sortedNuclearShare}
            halfCount={halfCount}
            dataShowAll={dataShowAll}
            setDataShowAll={setDataShowAll}
            getBarWidth={getBarWidth}
            plantsByCountry={plantsByCountry}
            comparisonRows={comparisonRows}
            formatComparisonValue={formatComparisonValue}
            setSelectedPlant={setSelectedPlant}
            setSelectedCountry={setSelectedCountry}
            setSearchQuery={setSearchQuery}
            scrollTo={scrollTo}
          />
          <TimelineSection sectionRef={sectionRefs.timeline} />
        </>
      ) : (
        <>
          <FrontPage
            sectionRef={sectionRefs.front}
            news={news}
            newsLoading={newsLoading}
            stocks={stocks}
            onOpenStock={setSelectedStock}
            onShowWire={() => scrollTo("news")}
            newsletter={newsletter}
          />

          <MarketsTable
            sectionRef={sectionRefs.stocks}
            stocks={stocks}
            stocksLoading={stocksLoading}
            stocksLastUpdated={stocksLastUpdated}
            stocksError={stocksError}
            onRetry={() => { setStocksError(false); setStocksRetry((r) => r + 1); }}
            onOpenStock={setSelectedStock}
          />

          <NewsSection
            sectionRef={sectionRefs.news}
            news={news}
            newsLoading={newsLoading}
            newsError={newsError}
            newsFilter={newsFilter}
            newsSort={newsSort}
            newsLimit={newsLimit}
            filteredNews={filteredNews}
            uniqueNewsSources={uniqueNewsSources}
            newsLastUpdated={newsLastUpdated}
            excludeUrls={frontUrls}
            setNewsFilter={setNewsFilter}
            setNewsSort={setNewsSort}
            setNewsLimit={setNewsLimit}
            refreshNews={refreshNews}
            getNewsMapLayer={getNewsMapLayer}
            setGlobeLayer={setGlobeLayer}
            setPlantFilter={setPlantFilter}
            setSearchQuery={setSearchQuery}
            scrollTo={scrollTo}
          />

          <GlobeSection
            sectionRef={sectionRefs.globe}
            globeLayer={globeLayer}
            setGlobeLayer={setGlobeLayer}
            plantFilter={plantFilter}
            setPlantFilter={setPlantFilter}
            filteredPlants={filteredPlants}
            filteredSupplySites={filteredSupplySites}
            activeGlobeItems={activeGlobeItems}
            visibleGlobeItems={visibleGlobeItems}
            setSelectedPlant={setSelectedPlant}
            globePanelRef={globePanelRef}
            globePanelListRef={globePanelListRef}
            globeFiltersRef={globeFiltersRef}
            shouldUseCompactGlobePanel={shouldUseCompactGlobePanel}
            mobileGlobePanelExpanded={mobileGlobePanelExpanded}
            setMobileGlobePanelExpanded={setMobileGlobePanelExpanded}
            globePanelPreviewCount={globePanelPreviewCount}
            globeCountryFilter={globeCountryFilter}
            setGlobeCountryFilter={setGlobeCountryFilter}
            globeReactorTypeFilter={globeReactorTypeFilter}
            setGlobeReactorTypeFilter={setGlobeReactorTypeFilter}
            globeCountryOptions={globeCountryOptions}
            globeReactorTypeOptions={globeReactorTypeOptions}
            hasActiveGlobeFilters={hasActiveGlobeFilters}
            globeFiltersOpen={globeFiltersOpen}
            setGlobeFiltersOpen={setGlobeFiltersOpen}
            searchQuery={searchQuery}
          />

          <ProSection
            isMobileViewport={isMobileViewport}
            onOpenTerminal={() => switchAppView("terminal")}
            preview={<TerminalEditorialStrip signals={editorialSignals} onOpenTerminal={() => switchAppView("terminal")} />}
          />

          <SmrSection sectionRef={sectionRefs.smr} />

          <div className="np-wrap">
            <div className="np-learn-promo">
              <a href="/learn" onClick={(e) => { e.preventDefault(); switchAppView("learn"); }}>
                <div className="np-kicker">Learn</div>
                <strong>Know your reactors</strong>
                <span>The six designs that power the world, with working 3-D models →</span>
              </a>
              <a href="/learn" onClick={(e) => { e.preventDefault(); switchAppView("learn"); }}>
                <div className="np-kicker">Learn</div>
                <strong>Where nuclear is already real</strong>
                <span>Capacity, reactors and share of power by country →</span>
              </a>
              <a href="/learn" onClick={(e) => { e.preventDefault(); switchAppView("learn"); }}>
                <div className="np-kicker">Learn</div>
                <strong>Eight decades of fission</strong>
                <span>From Chicago Pile-1 to the SMR era →</span>
              </a>
            </div>
          </div>
        </>
      )}

      <AccountAccessDialog
        isOpen={showAccountDialog}
        onClose={closeAccountDialog}
        onOpenTerminal={() => switchAppView("terminal")}
        isMobileViewport={isMobileViewport}
      />

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
              background: "rgba(14,12,10,0.5)",
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
                borderRadius: "var(--np-r-md)",
                borderTop: "3px double var(--np-rule)",
                background: "var(--np-bg)",
                boxShadow: "0 28px 80px rgba(0,0,0,0.3)",
                padding: isMobileViewport ? "24px 18px 20px" : "28px 26px 24px",
                color: "var(--np-text)",
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
                  width: 44,
                  height: 44,
                  borderRadius: "var(--np-r-sm)",
                  border: "1px solid var(--np-border)",
                  background: "transparent",
                  color: "var(--np-text)",
                  cursor: "pointer",
                  fontSize: 20,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
              <div className="np-kicker">The Sunday briefing</div>
              <h3 id="newsletter-popup-title" style={{ fontFamily: "var(--np-font-display)", fontSize: "clamp(28px,4vw,40px)", lineHeight: 1.08, margin: "10px 0 10px" }}>
                The week in nuclear, in five minutes.
              </h3>
              <p style={{ fontSize: 16, color: "var(--np-text-muted)", lineHeight: 1.6, margin: "0 0 18px" }}>
                One email every Sunday: the stories that mattered, the uranium price and the stocks that moved. Free.
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
                inputStyle={{ width: "100%" }}
                note="Free weekly email. No spam. Unsubscribe anytime."
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </main>

      <FooterSection />

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
        ::selection{background:rgba(var(--np-accent-rgb), 0.25);color:#1e1912}
      `}</style>
    </div>
    </MotionConfig>
  );
}
