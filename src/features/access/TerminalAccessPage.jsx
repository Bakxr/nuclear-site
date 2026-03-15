import { useEffect, useMemo, useState } from "react";
import { createCheckoutSession, createPortalSession } from "../../services/billingAPI.js";
import { useTerminalAccess } from "./context.jsx";

const PLAN_OPTIONS = [
  {
    interval: "month",
    name: "Monthly",
    price: "$19",
    cadence: "/month",
    detail: "Flexible access for active readers, operators, and investors.",
  },
  {
    interval: "year",
    name: "Annual",
    price: "$190",
    cadence: "/year",
    detail: "Two months free for the readers who expect to live in the feed.",
    badge: "Best value",
  },
];

const FEATURE_ITEMS = [
  "Full terminal snapshot with secure filings, operations, and project intelligence",
  "Account-linked billing with Stripe Checkout and self-serve plan management",
  "Passwordless email OTP sign-in that works on desktop and mobile",
  "Protected terminal APIs so paid data is not exposed through the public bundle",
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
    return {
      tone: "success",
      text: "Payment completed. We are syncing terminal access to your account now.",
    };
  }
  if (checkout === "cancelled") {
    return {
      tone: "warning",
      text: "Checkout was canceled. Your account is still ready whenever you want to activate access.",
    };
  }
  if (billing === "return") {
    return {
      tone: "neutral",
      text: "You are back from the billing portal. Account status will refresh automatically.",
    };
  }
  if (membership?.cancel_at_period_end && membership?.current_period_end) {
    return {
      tone: "warning",
      text: `Your access stays live until ${formatPeriodEnd(membership.current_period_end)}.`,
    };
  }
  return null;
}

function noticeStyle(tone) {
  if (tone === "success") {
    return {
      border: "1px solid rgba(74,222,128,0.22)",
      background: "rgba(74,222,128,0.08)",
      color: "#b5f5cd",
    };
  }
  if (tone === "warning") {
    return {
      border: "1px solid rgba(251,191,36,0.22)",
      background: "rgba(251,191,36,0.08)",
      color: "#f6d98a",
    };
  }
  return {
    border: "1px solid rgba(125,211,252,0.18)",
    background: "rgba(125,211,252,0.08)",
    color: "#cbefff",
  };
}

export default function TerminalAccessPage({ isMobileViewport, onExitTerminal }) {
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

  async function handleSendCode() {
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
      setSuccessMessage("You are signed in. Choose a plan to activate terminal access.");
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

  const membershipSummary = membership?.subscription_status
    ? `Status: ${membership.subscription_status}${membership.plan_interval ? ` | ${membership.plan_interval}` : ""}`
    : "No active plan yet";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #080b11 0%, #0a1018 100%)", color: "#f5f0e8" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobileViewport ? "18px" : "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onExitTerminal}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(245,240,232,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#f5f0e8",
              padding: "10px 14px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Editorial view
          </button>
          {user ? (
            <div style={{ fontSize: 12, color: "rgba(245,240,232,0.66)" }}>
              Signed in as {user.email}
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1.08fr) minmax(360px,460px)", gap: 22, alignItems: "start" }}>
          <section style={{ display: "grid", gap: 18 }}>
            <div style={{
              borderRadius: 28,
              border: "1px solid rgba(212,165,74,0.16)",
              background: "linear-gradient(180deg, rgba(22,18,13,0.92) 0%, rgba(10,12,17,0.96) 100%)",
              padding: isMobileViewport ? "24px 18px" : "34px 34px 30px",
              boxShadow: "0 28px 90px rgba(0,0,0,0.28)",
            }}>
              <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#d4a54a", fontWeight: 700, marginBottom: 10 }}>
                Terminal access
              </div>
              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(34px,5vw,58px)", lineHeight: 1.02, margin: "0 0 14px" }}>
                Paid access to the <em style={{ color: "#d4a54a" }}>nuclear tape.</em>
              </h1>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: "rgba(245,240,232,0.68)", maxWidth: 760, margin: 0 }}>
                The terminal is where the dense view lives: secure filings, operating signals, buildout tracking, market context, and the source-level drilldowns that do not belong in the public bundle.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(2, minmax(0,1fr))", gap: 14, marginTop: 22 }}>
                {FEATURE_ITEMS.map((item) => (
                  <div
                    key={item}
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(245,240,232,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      padding: "16px 16px 15px",
                      fontSize: 13.5,
                      lineHeight: 1.65,
                      color: "rgba(245,240,232,0.76)",
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              borderRadius: 24,
              border: "1px solid rgba(125,211,252,0.14)",
              background: "rgba(7,10,15,0.82)",
              padding: isMobileViewport ? "18px" : "22px",
              display: "grid",
              gap: 14,
            }}>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 700 }}>
                What unlocks
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(3, minmax(0,1fr))", gap: 12 }}>
                {[
                  { label: "Filing radar", detail: "Track SEC signals by company, country, and ticker context." },
                  { label: "Operations pulse", detail: "Monitor NRC power-level signals with terminal-native filtering." },
                  { label: "Project pipeline", detail: "Follow construction and advanced-reactor buildout in one workspace." },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.03)",
                      padding: "16px 15px",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#f5f0e8", marginBottom: 6 }}>{item.label}</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.65, color: "rgba(245,240,232,0.6)" }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside style={{ display: "grid", gap: 18 }}>
            {statusNotice ? (
              <div style={{ borderRadius: 18, padding: "14px 16px", fontSize: 13, lineHeight: 1.6, ...noticeStyle(statusNotice.tone) }}>
                {statusNotice.text}
              </div>
            ) : null}

            {membershipError ? (
              <div style={{ borderRadius: 18, padding: "14px 16px", fontSize: 13, lineHeight: 1.6, ...noticeStyle("warning") }}>
                {membershipError}
              </div>
            ) : null}

            {!isConfigured ? (
              <div style={{ borderRadius: 24, border: "1px solid rgba(248,113,113,0.25)", background: "rgba(127,29,29,0.18)", padding: "18px 18px 16px" }}>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: "#f8c3c3" }}>
                  Supabase browser auth is not configured yet. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to use the terminal paywall.
                </div>
              </div>
            ) : null}

            <div style={{
              borderRadius: 24,
              border: "1px solid rgba(212,165,74,0.16)",
              background: "rgba(14,18,26,0.92)",
              padding: isMobileViewport ? "18px" : "22px",
              display: "grid",
              gap: 14,
            }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#d4a54a", fontWeight: 700, marginBottom: 8 }}>
                  Subscription
                </div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, lineHeight: 1.08, marginBottom: 6 }}>
                  Choose the access plan.
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(245,240,232,0.62)" }}>
                  {membershipSummary}
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {PLAN_OPTIONS.map((plan) => {
                  const active = selectedInterval === plan.interval;
                  return (
                    <button
                      key={plan.interval}
                      type="button"
                      onClick={() => setSelectedInterval(plan.interval)}
                      style={{
                        textAlign: "left",
                        borderRadius: 18,
                        border: `1px solid ${active ? "rgba(212,165,74,0.38)" : "rgba(255,255,255,0.08)"}`,
                        background: active ? "rgba(212,165,74,0.1)" : "rgba(255,255,255,0.03)",
                        color: "#f5f0e8",
                        padding: "16px 16px 14px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{plan.name}</div>
                          <div style={{ fontSize: 12.5, color: "rgba(245,240,232,0.58)", marginTop: 4 }}>{plan.detail}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          {plan.badge ? (
                            <div style={{ fontSize: 10, color: "#d4a54a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>
                              {plan.badge}
                            </div>
                          ) : null}
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22 }}>
                            {plan.price}<span style={{ fontSize: 12, color: "rgba(245,240,232,0.52)" }}>{plan.cadence}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={billingBusy || !user}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "1px solid rgba(212,165,74,0.35)",
                  background: "#f5f0e8",
                  color: "#14120e",
                  padding: "14px 16px",
                  cursor: billingBusy || !user ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: billingBusy || !user ? 0.6 : 1,
                }}
              >
                {billingBusy ? "Opening checkout..." : user ? "Continue to Stripe Checkout" : "Sign in to subscribe"}
              </button>

              {membership?.stripe_customer_id ? (
                <button
                  type="button"
                  onClick={handleOpenPortal}
                  disabled={billingBusy}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#f5f0e8",
                    padding: "13px 16px",
                    cursor: billingBusy ? "not-allowed" : "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    opacity: billingBusy ? 0.6 : 1,
                  }}
                >
                  Manage billing
                </button>
              ) : null}
            </div>

            <div style={{
              borderRadius: 24,
              border: "1px solid rgba(125,211,252,0.16)",
              background: "rgba(8,12,18,0.92)",
              padding: isMobileViewport ? "18px" : "22px",
              display: "grid",
              gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 700, marginBottom: 8 }}>
                  Account access
                </div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, lineHeight: 1.1 }}>
                  Email OTP sign-in.
                </div>
              </div>

              {!user ? (
                <>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    disabled={authBusy}
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
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
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.04)",
                        color: "#f5f0e8",
                        padding: "14px 15px",
                        fontSize: 14,
                        outline: "none",
                        letterSpacing: "0.1em",
                      }}
                    />
                  ) : null}

                  <div style={{ display: "grid", gap: 10 }}>
                    <button
                      type="button"
                      onClick={otpSent ? handleVerifyCode : handleSendCode}
                      disabled={authBusy}
                      style={{
                        width: "100%",
                        borderRadius: 14,
                        border: "1px solid rgba(125,211,252,0.24)",
                        background: "#7dd3fc",
                        color: "#09131d",
                        padding: "13px 16px",
                        cursor: authBusy ? "not-allowed" : "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        opacity: authBusy ? 0.7 : 1,
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
                          border: "1px solid rgba(255,255,255,0.12)",
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
                </>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "rgba(245,240,232,0.66)" }}>
                    This account is ready for checkout. Stripe will attach the subscription to {user.email}.
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
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
                <div style={{ borderRadius: 14, padding: "12px 13px", fontSize: 12.5, lineHeight: 1.6, ...noticeStyle("warning") }}>
                  {errorMessage}
                </div>
              ) : null}
              {successMessage ? (
                <div style={{ borderRadius: 14, padding: "12px 13px", fontSize: 12.5, lineHeight: 1.6, ...noticeStyle("success") }}>
                  {successMessage}
                </div>
              ) : null}

              <div style={{ fontSize: 11.5, lineHeight: 1.6, color: "rgba(245,240,232,0.45)" }}>
                Email OTP must be enabled in Supabase Auth for this flow. Stripe tax handling remains intentionally unset until you choose the live tax configuration for US and Canada.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
