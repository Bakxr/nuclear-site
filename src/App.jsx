import { lazy, Suspense, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useInView, useScroll, useTransform, MotionConfig } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { STOCKS_BASE, NUCLEAR_SHARE, LEARN_FACTS, ENERGY_COMPARISON } from "./data/constants.js";
import { NUCLEAR_PLANTS } from "./data/plants.js";
import { SUPPLY_STAGE_COLORS, URANIUM_SUPPLY_SITES } from "./data/supplySites.js";
import { fetchStockHistory, fetchMultipleQuotes } from "./services/stocksAPI.js";
import { clearNewsCache, fetchNuclearNews, getInstantNews } from "./services/newsAPI.js";
import useDarkMode from "./hooks/useDarkMode.js";
import TimelineSection from "./features/sections/TimelineSection.jsx";
import SmrSection from "./features/sections/SmrSection.jsx";
import StocksSection from "./features/sections/StocksSection.jsx";
import NewsletterSection from "./features/sections/NewsletterSection.jsx";
import FooterSection from "./features/sections/FooterSection.jsx";
import HeroSection from "./features/sections/HeroSection.jsx";
import QuotesSection, { QUOTES } from "./features/sections/QuotesSection.jsx";
import NewsSection from "./features/sections/NewsSection.jsx";
import LearnSection from "./features/sections/LearnSection.jsx";
import GlobeSection from "./features/sections/GlobeSection.jsx";
import DataSection from "./features/sections/DataSection.jsx";
import StockTicker from "./components/StockTicker.jsx";
import SearchOverlay from "./components/SearchOverlay.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import LazySectionFallback from "./components/LazySectionFallback.jsx";
import ReactorDiagram from "./components/reactorDiagrams/index.jsx";
import useDialog from "./hooks/useDialog.js";
import { normalizeReactorType } from "./services/plantAPI.js";
import { groupPlantsByCountry } from "./utils/countries.js";
import { NAV_ITEMS } from "./data/editorial.js";
import { formatAccessDate, getAccountStatusMeta } from "./features/access/accountStatus.js";
import { useTerminalAccess } from "./features/access/context.jsx";
import TerminalRouteView from "./features/terminal/TerminalRouteView.jsx";
import { mergeTerminalSnapshots } from "./features/terminal/mergeSnapshots.js";
import { buildPublicTerminalSignals } from "./features/terminal/publicSignals.js";
import { buildAppPath, getAppViewFromLocation } from "./features/terminal/route.js";
import { useTerminalSnapshot } from "./features/terminal/useTerminalSnapshot.js";
import TerminalEditorialStrip from "./components/TerminalEditorialStrip.jsx";

const Globe = lazy(() => import("./components/Globe.jsx"));
const StockModal = lazy(() => import("./components/StockModal.jsx"));
const PlantModal = lazy(() => import("./components/PlantModal.jsx"));
const CountryModal = lazy(() => import("./components/CountryModal.jsx"));
const Reactor3D = lazy(() => import("./components/reactorDiagrams/Reactor3D.jsx"));

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
            padding: "15px 20px",
            fontSize: 14,
            fontFamily: "'DM Sans',sans-serif",
            background: "var(--np-surface)",
            color: "var(--np-text)",
            border: `1px solid ${form.status === "error" ? "rgba(248,113,113,0.5)" : "var(--np-border-strong)"}`,
            borderRadius: "6px 0 0 6px",
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
            padding: "15px 30px",
            fontSize: 12,
            fontFamily: "'DM Sans',sans-serif",
            fontWeight: 700,
            background: "var(--np-text)",
            color: "var(--np-bg)",
            border: "none",
            borderRadius: "0 6px 6px 0",
            cursor: form.status === "loading" ? "not-allowed" : "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
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
              border: "1px solid rgba(212,165,74,0.2)",
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
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#d4a54a" }}>
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
              {membership?.subscription_status ? (
                <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "rgba(245,240,232,0.58)" }}>
                  Stripe status: {membership.subscription_status}{membership.plan_interval ? ` | ${membership.plan_interval}` : ""}
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
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="6-digit code"
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
                    border: "1px solid rgba(125,211,252,0.24)",
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
                    border: "1px solid rgba(212,165,74,0.35)",
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

            {errorMessage ? (
              <div style={{ borderRadius: 16, border: "1px solid rgba(251,191,36,0.22)", background: "rgba(251,191,36,0.08)", padding: "13px 14px", fontSize: 12.5, lineHeight: 1.6, color: "#f6d98a" }}>
                {errorMessage}
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  });
  const [appView, setAppView] = useState(() => {
    if (typeof window === "undefined") return "home";
    return getAppViewFromLocation(window.location);
  });

  // Parallax hero
  const { scrollY } = useScroll();
  const heroY       = useTransform(scrollY, [0, 520], [0, -90]);
  const heroOpacity = useTransform(scrollY, [0, 380], [1, 0]);
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

  // Quote state — random on each page load, no auto-rotation
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [quoteFading, setQuoteFading] = useState(false);

  // Section refs for navigation — each ref is a named variable (not inside an object literal)
  // to satisfy the Rules of Hooks (hooks must be called unconditionally at the top level)
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
  const closeAccountDialog = useCallback(() => {
    setShowAccountDialog(false);
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

  const switchAppView = useCallback((view) => {
    setAppView(view);
    if (typeof window !== "undefined") {
      const nextUrl = buildAppPath(view);
      if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
        window.history.pushState({}, "", nextUrl);
      }
    }
    setMobileMenuOpen(false);
  }, []);

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

  const newsStatusLabel = newsError ? "Curated fallback" : "Live feeds";
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
        <div className="np-app-shell" style={{ minHeight: "100vh", background: "var(--np-bg)", fontFamily: "'DM Sans',sans-serif", color: "var(--np-text)" }}>
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
    <div className="np-app-shell" style={{ minHeight: "100vh", background: "var(--np-bg)", fontFamily: "'DM Sans',sans-serif", color: "var(--np-text)" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 140, background: "var(--np-bg)" }}>
      <StockTicker stocks={stocks} onClickStock={setSelectedStock} />

      {/* Masthead */}
      <nav className="np-nav" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px var(--np-section-x)", borderBottom: "1px solid var(--np-hairline)",
        background: "var(--np-nav-bg)",
        backdropFilter: "blur(24px)",
      }}>
        <div className="np-brand" style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}
             onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 26 26" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="13" cy="13" r="2.2" fill="var(--np-accent)" />
            <ellipse cx="13" cy="13" rx="10.6" ry="4.4" stroke="var(--np-text)" strokeWidth="1.1" />
            <ellipse cx="13" cy="13" rx="10.6" ry="4.4" stroke="var(--np-text)" strokeWidth="1.1" transform="rotate(60 13 13)" />
            <ellipse cx="13" cy="13" rx="10.6" ry="4.4" stroke="var(--np-text)" strokeWidth="1.1" transform="rotate(120 13 13)" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontFamily: "var(--np-font-display)", fontSize: 21, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1, color: "var(--np-text)" }}>
              Nuclear<em style={{ fontStyle: "italic", fontWeight: 350, marginLeft: 5 }}>Pulse</em>
            </span>
            <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.22em", color: "var(--np-text-faint)", fontWeight: 700 }}>
              Strategic Energy Briefing
            </span>
          </div>
        </div>
        <div className="np-nav-links" style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {NAV_ITEMS.map((item, i) => {
            const isActive = activeSection === item.key;
            return (
              <button key={item.key} onClick={() => scrollTo(item.key)} className={`np-nav-link${isActive ? " is-active" : ""}`}>
                <span className="np-nav-index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                {item.label}
              </button>
            );
          })}
          <button onClick={() => switchAppView("terminal")} style={{
            background: "transparent", cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif", fontSize: 11.5, fontWeight: 700,
            color: "var(--np-accent-ink)", letterSpacing: "0.13em", textTransform: "uppercase",
            padding: "9px 16px", borderRadius: 6,
            border: "1px solid rgba(212,165,74,0.45)",
            transition: "background 0.2s, color 0.2s, border-color 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--np-text)"; e.currentTarget.style.color = "var(--np-bg)"; e.currentTarget.style.borderColor = "var(--np-text)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--np-accent-ink)"; e.currentTarget.style.borderColor = "rgba(212,165,74,0.45)"; }}
          >Terminal</button>
        </div>
        <div className="np-nav-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!isMobileViewport ? (
            <button
              type="button"
              onClick={() => setShowAccountDialog(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
                maxWidth: 200,
                flexShrink: 0,
                whiteSpace: "nowrap",
                borderRadius: 6,
                border: "1px solid var(--np-hairline)",
                background: "transparent",
                color: "var(--np-text)",
                padding: "7px 12px",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--np-border-strong)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--np-hairline)"}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: accountStatusMeta.accent, flexShrink: 0 }} />
              <span style={{ display: "grid", minWidth: 0, textAlign: "left" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--np-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {accountStatusMeta.title}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: accountStatusMeta.accent }}>
                  {accountStatusMeta.detail}
                </span>
              </span>
            </button>
          ) : null}
          <button
            onClick={toggleDarkMode}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: "none", border: "1px solid var(--np-hairline)", borderRadius: 6,
              width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 15, transition: "border-color 0.2s",
              color: "var(--np-text-muted)", flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--np-accent)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--np-hairline)"}
          ><span aria-hidden="true">{isDark ? "☀" : "☾"}</span></button>
          <div className="np-search-shell" style={{ position: "relative" }}>
            <div className="np-nav-search" style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", borderRadius: 6, padding: "7px 14px", border: "1px solid var(--np-hairline)", transition: "border-color 0.2s" }}>
              <svg aria-hidden="true" width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.45, flexShrink: 0 }}>
                <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.4" />
                <line x1="9.4" y1="9.4" x2="13" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                aria-label="Search everything"
                placeholder="Search everything..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => { if (searchQuery) setShowSearch(true); }}
                onBlur={() => setTimeout(() => setShowSearch(false), 150)}
                style={{ background: "none", border: "none", outline: "none", fontSize: 13, fontFamily: "'DM Sans',sans-serif", color: "var(--np-text)", width: 160 }}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setShowSearch(false); }} aria-label="Clear search" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--np-text-muted)", fontSize: 14, padding: 0, lineHeight: 1 }}><span aria-hidden="true">✕</span></button>
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
          <button className="np-hamburger" onClick={() => setMobileMenuOpen(prev => !prev)} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen}>
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
            <button onClick={() => switchAppView("terminal")}>
              Terminal
            </button>
            <div style={{
              margin: "6px 12px 8px",
              padding: "12px",
              borderRadius: 14,
              border: "1px solid var(--np-border)",
              background: "var(--np-surface-dim)",
              display: "grid",
              gap: 8,
            }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--np-text-faint)" }}>
                Account
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: accountStatusMeta.accent, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--np-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user ? user.email : "Not signed in"}
                  </div>
                  <div style={{ fontSize: 11, color: accountStatusMeta.accent, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
                    {accountStatusMeta.detail}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowAccountDialog(true); setMobileMenuOpen(false); }}
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: "1px solid rgba(212,165,74,0.18)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--np-text)",
                  padding: "10px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {user ? "Manage account" : "Sign in"}
              </button>
            </div>
            {NAV_ITEMS.map(item => (
              <button key={item.key} onClick={() => { scrollTo(item.key); setMobileMenuOpen(false); }}>
                {item.label}
              </button>
            ))}
            <div style={{ padding: "8px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--np-surface-dim)", borderRadius: 6, padding: "8px 12px" }}>
                <svg aria-hidden="true" width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.45, flexShrink: 0 }}>
                  <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.4" />
                  <line x1="9.4" y1="9.4" x2="13" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input type="text" placeholder="Search plants..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: "none", border: "none", outline: "none", fontSize: 14, fontFamily: "'DM Sans',sans-serif", color: "var(--np-text)", width: "100%" }} />
              </div>
            </div>
          </div>
        )}
      </nav>
      </header>

      <main id="main">
      <HeroSection
        statsRef={statsRef}
        isDark={isDark}
        isMobileViewport={isMobileViewport}
        heroY={heroY}
        heroOpacity={heroOpacity}
        showStats={showStats}
      />

      <QuotesSection
        quoteIndex={quoteIndex}
        quoteFading={quoteFading}
        setQuoteIndex={setQuoteIndex}
        setQuoteFading={setQuoteFading}
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
        newsStatusLabel={newsStatusLabel}
        newsStatusColor={newsStatusColor}
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

      <section style={{ padding: "0 var(--np-section-x) var(--np-section-y)", background: "var(--np-bg)" }}>
        <div style={{ maxWidth: "var(--np-content-max)", margin: "0 auto" }}>
          <div style={{
            borderTop: "1px solid var(--np-hairline)",
            borderBottom: "1px solid var(--np-hairline)",
            padding: isMobileViewport ? "36px 0" : "clamp(40px, 5vw, 64px) 0",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0, 1.1fr) minmax(320px, 420px)", gap: 28, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--np-accent-ink)" }}>
                  The signal behind the week
                </div>
                <div style={{ fontFamily: "var(--np-font-display)", fontSize: "clamp(28px,3.4vw,48px)", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.06, marginTop: 14, textWrap: "balance" }}>
                  Get the moves that matter, <em style={{ fontStyle: "italic", fontWeight: 350, color: "var(--np-accent-ink)" }}>once a week.</em>
                </div>
                <div style={{ fontSize: 15, color: "var(--np-text-muted)", lineHeight: 1.7, marginTop: 14, maxWidth: "56ch" }}>
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

      <StocksSection
        sectionRef={sectionRefs.stocks}
        stocks={stocks}
        stocksLoading={stocksLoading}
        stocksError={stocksError}
        setStocksError={setStocksError}
        setStocksRetry={setStocksRetry}
        setSelectedStock={setSelectedStock}
      />

      <TerminalEditorialStrip signals={editorialSignals} onOpenTerminal={() => switchAppView("terminal")} />

      <SmrSection sectionRef={sectionRefs.smr} />

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

      <TimelineSection sectionRef={sectionRefs.timeline} />

      <NewsletterSection
        subStatus={subStatus}
        subEmail={subEmail}
        subWebsite={subWebsite}
        subErrorMsg={subErrorMsg}
        setSubEmail={setSubEmail}
        setSubWebsite={setSubWebsite}
        handleSubscribe={handleSubscribe}
      />

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
                borderRadius: 18,
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
              <h3 id="newsletter-popup-title" style={{ fontFamily: "var(--np-font-display)", fontSize: "clamp(28px,4vw,40px)", lineHeight: 1.08, margin: "10px 0 10px" }}>
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
        ::selection{background:rgba(212,165,74,0.25);color:#1e1912}
      `}</style>
    </div>
    </MotionConfig>
  );
}
