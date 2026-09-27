import { useEffect, useMemo, useState } from "react";
import { createCheckoutSession, createPortalSession } from "../../services/billingAPI.js";
import { STOCKS_BASE } from "../../data/constants.js";
import { useTerminalAccess } from "./context.jsx";
import "../terminal/shell/terminal.css";
import "./access.css";

const PLAN_OPTIONS = [
  { interval: "month", name: "Monthly", price: 19, cadence: "/mo", note: "Billed monthly. Cancel anytime." },
  { interval: "year", name: "Annual", price: 190, cadence: "/yr", note: "Two months free — $15.83/mo billed yearly.", badge: "Save 17%" },
];

// Customer-facing capabilities — each maps to a live terminal panel.
const FEATURES = [
  { title: "Nuclear equity board", body: "Twelve names from miners to SMR developers with real daily history, 52-week ranges and breadth." },
  { title: "Event odds", body: "Polymarket and Kalshi markets on enrichment, deals and policy — deduplicated, expired markets removed." },
  { title: "Insider & 8-K flow", body: "Form 4 open-market buys and sells parsed from SEC XML, plus every material 8-K item." },
  { title: "Fleet & unit status", body: "Global fleet by country, live NRC unit power levels, and the new-build pipeline." },
  { title: "Regulatory wire", body: "NRC licensing notices and SEC filings next to sector news, in one chronological tape." },
  { title: "Alerts & daily brief", body: "Price and event alerts by email, and a personalised morning brief for your watchlist." },
];

function getQueryState() {
  if (typeof window === "undefined") return { checkout: "", billing: "" };
  const params = new URLSearchParams(window.location.search);
  return {
    checkout: params.get("checkout") || "",
    billing: params.get("billing") || "",
  };
}

function formatPeriodEnd(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function buildStatusNotice({ checkout, billing, membership }) {
  if (checkout === "success") {
    return { tone: "success", text: "Payment completed. We are syncing terminal access to your account now." };
  }
  if (checkout === "cancelled") {
    return { tone: "warning", text: "Checkout was canceled. Your account is still ready whenever you want to activate access." };
  }
  if (billing === "return") {
    return { tone: "neutral", text: "You are back from the billing portal. Account status will refresh automatically." };
  }
  if (membership?.cancel_at_period_end && membership?.current_period_end) {
    return { tone: "warning", text: `Your access stays live until ${formatPeriodEnd(membership.current_period_end)}.` };
  }
  return null;
}

// Illustrative miniature of the workspace (no live data behind it).
function ProductPreview() {
  const tickers = STOCKS_BASE.slice(0, 9).map((stock) => stock.ticker);
  const spark = "M0 18 L8 15 L16 16 L24 11 L32 12 L40 8 L48 10 L56 5 L64 7 L72 3";
  return (
    <figure className="npa-preview" aria-label="Illustration of the terminal workspace">
      <div className="npa-preview-frame" aria-hidden="true">
        <div className="npa-pv-top">
          <span className="npa-pv-brand" />
          {["Overview", "Markets", "Fleet", "Regulatory", "Wire"].map((tab, i) => (
            <span key={tab} className={`npa-pv-tab${i === 0 ? " is-on" : ""}`}>{tab}</span>
          ))}
        </div>
        <div className="npa-pv-tape">
          {tickers.map((t, i) => <span key={t}><b>{t}</b><i className={i % 3 === 1 ? "down" : "up"} /></span>)}
        </div>
        <div className="npa-pv-kpis">{Array.from({ length: 5 }, (_, i) => <span key={i}><i /><b /></span>)}</div>
        <div className="npa-pv-grid">
          <div className="npa-pv-panel">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="npa-pv-row">
                <b>{tickers[i]}</b>
                <svg viewBox="0 0 72 20" width="64" height="18"><path d={spark} fill="none" stroke={i % 3 === 1 ? "#f0616d" : "#3ecf8e"} strokeWidth="1.4" transform={i % 2 ? "scale(1,-1) translate(0,-20)" : undefined} /></svg>
              </div>
            ))}
          </div>
          <div className="npa-pv-panel npa-pv-globe"><span /></div>
          <div className="npa-pv-panel">
            {Array.from({ length: 5 }, (_, i) => <div key={i} className="npa-pv-line"><i /><b style={{ width: `${88 - i * 9}%` }} /></div>)}
          </div>
        </div>
      </div>
      <figcaption>The workspace: five desks, a live tape, and an inspector for any company, plant or filing.</figcaption>
    </figure>
  );
}

export default function TerminalAccessPage({ onExitTerminal }) {
  const {
    accessState,
    getAccessToken,
    isConfigured,
    membership,
    membershipError,
    refreshMembership,
    sendOtp,
    signOut,
    user,
    verifyOtp,
  } = useTerminalAccess();

  const [selectedInterval, setSelectedInterval] = useState("year");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const queryState = useMemo(() => getQueryState(), []);
  const statusNotice = useMemo(() => buildStatusNotice({ ...queryState, membership }), [membership, queryState]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (queryState.checkout !== "success" || !user || accessState === "active") return undefined;

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const nextMembership = await refreshMembership();
        if (!cancelled && nextMembership?.terminal_access) {
          setSuccessMessage("Terminal access is active. Opening your workspace now.");
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Payment succeeded, but access sync is still catching up. Refresh in a moment if needed.");
        }
      }
    };

    poll();
    const timer = window.setInterval(() => {
      if (attempts >= 8) {
        window.clearInterval(timer);
        return;
      }
      poll();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [accessState, queryState.checkout, refreshMembership, user]);

  async function handleSendCode(event) {
    event?.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage("Enter your email to receive a one-time code.");
      return;
    }

    setAuthBusy(true);
    try {
      const normalisedEmail = await sendOtp(email);
      setEmail(normalisedEmail);
      setOtpSent(true);
      setSuccessMessage(`A login code was sent to ${normalisedEmail}.`);
    } catch (error) {
      setErrorMessage(error.message || "Could not send the login code.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerifyCode(event) {
    event?.preventDefault();
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
      setSuccessMessage("You're signed in. Choose a plan to activate the terminal.");
      setCode("");
    } catch (error) {
      setErrorMessage(error.message || "That code could not be verified.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleCheckout() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!user) {
      setErrorMessage("Sign in with your email first so access can be linked to your account.");
      return;
    }

    setBillingBusy(true);
    try {
      const accessToken = await getAccessToken();
      const { url } = await createCheckoutSession(selectedInterval, accessToken);
      window.location.assign(url);
    } catch (error) {
      setErrorMessage(error.message || "Could not start checkout.");
      setBillingBusy(false);
    }
  }

  async function handleOpenPortal() {
    setErrorMessage("");
    setSuccessMessage("");
    setBillingBusy(true);

    try {
      const accessToken = await getAccessToken();
      const { url } = await createPortalSession(accessToken);
      window.location.assign(url);
    } catch (error) {
      setErrorMessage(error.message || "Could not open the billing portal.");
      setBillingBusy(false);
    }
  }

  async function handleSignOut() {
    setErrorMessage("");
    setSuccessMessage("");
    await signOut();
    setOtpSent(false);
    setCode("");
  }

  const plan = PLAN_OPTIONS.find((option) => option.interval === selectedInterval) || PLAN_OPTIONS[1];
  const step = user ? 3 : otpSent ? 2 : 1;
  const lapsed = membership?.subscription_status && !membership?.terminal_access;

  return (
    <div className="np-terminal-shell npt npa">
      <header className="npa-top">
        <button type="button" className="npt-brand" onClick={onExitTerminal} aria-label="Back to Nuclear Pulse">
          <svg className="npt-brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="2.2" fill="#e0a84e" />
            <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#e0a84e" strokeWidth="1.2" opacity="0.9" />
            <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#e0a84e" strokeWidth="1.2" opacity="0.55" transform="rotate(60 12 12)" />
            <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#e0a84e" strokeWidth="1.2" opacity="0.35" transform="rotate(-60 12 12)" />
          </svg>
          <span className="npt-brand-word">Nuclear <em>Pulse</em></span>
          <span className="npt-pro">PRO</span>
        </button>
        <div className="npa-top-right">
          {user ? <span className="npt-muted npa-signed">{user.email}</span> : null}
          <button type="button" className="npt-btn" onClick={onExitTerminal}>← Back to the briefing</button>
        </div>
      </header>

      <main className="npa-main">
        <section className="npa-intro">
          <p className="npa-eyebrow">Nuclear Pulse Terminal</p>
          <h1 className="npa-title">The nuclear sector, <em>on one screen.</em></h1>
          <p className="npa-lede">
            Equities, event odds, insider flow, NRC licensing and fleet status — the working desk behind the Nuclear Pulse briefing, built for people who trade and operate around nuclear.
          </p>
        </section>

        <section className="npa-details">
          <ul className="npa-features">
            {FEATURES.map((feature) => (
              <li key={feature.title}>
                <span className="npa-check" aria-hidden="true">✓</span>
                <span>
                  <strong>{feature.title}</strong>
                  {feature.body}
                </span>
              </li>
            ))}
          </ul>

          <ProductPreview />
        </section>

        <aside className="npa-card" aria-label="Subscribe">
          {statusNotice ? <div className="npa-notice" data-tone={statusNotice.tone}>{statusNotice.text}</div> : null}
          {membershipError ? <div className="npa-notice" data-tone="warning">{membershipError}</div> : null}
          {!isConfigured ? (
            <div className="npa-notice" data-tone="warning">Sign-in is temporarily unavailable. Please try again shortly.</div>
          ) : null}

          <div className="npa-seg" role="radiogroup" aria-label="Billing period">
            {PLAN_OPTIONS.map((option) => (
              <button
                key={option.interval}
                type="button"
                role="radio"
                aria-checked={selectedInterval === option.interval}
                onClick={() => setSelectedInterval(option.interval)}
              >
                {option.name}
                {option.badge ? <span className="npa-badge">{option.badge}</span> : null}
              </button>
            ))}
          </div>

          <div className="npa-price">
            <span className="npa-price-num">${plan.price}</span>
            <span className="npa-price-cad">{plan.cadence}</span>
          </div>
          <p className="npa-price-note">{plan.note}</p>

          <ol className="npa-steps" aria-label="Checkout steps">
            {["Email", "Verify", "Checkout"].map((label, index) => (
              <li key={label} data-state={step > index + 1 ? "done" : step === index + 1 ? "current" : "todo"}>
                <span>{step > index + 1 ? "✓" : index + 1}</span>{label}
              </li>
            ))}
          </ol>

          {!user ? (
            <form className="npa-form" onSubmit={otpSent ? handleVerifyCode : handleSendCode}>
              <label className="npa-field">
                <span>Work email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  disabled={authBusy || otpSent}
                  required
                />
              </label>
              {otpSent ? (
                <label className="npa-field">
                  <span>6-digit code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="••••••"
                    disabled={authBusy}
                    autoFocus
                    style={{ letterSpacing: "0.3em" }}
                  />
                </label>
              ) : null}
              <button type="submit" className="npa-cta" disabled={authBusy}>
                {authBusy ? (otpSent ? "Verifying…" : "Sending code…") : otpSent ? "Verify & continue" : "Continue with email"}
              </button>
              {otpSent ? (
                <div className="npa-row-links">
                  <button type="button" className="npa-link" onClick={() => { setOtpSent(false); setCode(""); setSuccessMessage(""); }} disabled={authBusy}>Change email</button>
                  <button type="button" className="npa-link" onClick={handleSendCode} disabled={authBusy}>Resend code</button>
                </div>
              ) : (
                <p className="npa-fine">We'll email a one-time code — no password to remember.</p>
              )}
            </form>
          ) : (
            <div className="npa-form">
              <button type="button" className="npa-cta" onClick={handleCheckout} disabled={billingBusy}>
                {billingBusy ? "Opening secure checkout…" : lapsed ? `Reactivate — $${plan.price}${plan.cadence}` : `Start Pro — $${plan.price}${plan.cadence}`}
              </button>
              {membership?.stripe_customer_id ? (
                <button type="button" className="npt-btn" onClick={handleOpenPortal} disabled={billingBusy} style={{ justifyContent: "center" }}>
                  Manage billing
                </button>
              ) : null}
              <div className="npa-row-links">
                <span className="npt-muted">Signed in as {user.email}</span>
                <button type="button" className="npa-link" onClick={handleSignOut}>Sign out</button>
              </div>
            </div>
          )}

          {errorMessage ? <div className="npa-notice" data-tone="warning" role="alert">{errorMessage}</div> : null}
          {successMessage ? <div className="npa-notice" data-tone="success" role="status">{successMessage}</div> : null}

          <ul className="npa-assure">
            <li>Secure payment by Stripe</li>
            <li>Cancel anytime from the billing portal</li>
            <li>Access follows your email across devices</li>
          </ul>
        </aside>
      </main>
    </div>
  );
}
