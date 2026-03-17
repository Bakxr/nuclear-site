import { useEffect, useMemo, useState } from "react";
import { createCheckoutSession, createPortalSession } from "../../services/billingAPI.js";
import {
  terminalButtonStyle,
  terminalInputShellStyle,
  terminalInputStyle,
  terminalLabelStyle,
  terminalMetricTileStyle,
  terminalMutedStyle,
  terminalPanelStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "../terminal/components/styles.js";
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
      border: "1px solid rgba(125,255,155,0.26)",
      background: "rgba(125,255,155,0.1)",
      color: "var(--np-terminal-green)",
    };
  }
  if (tone === "warning") {
    return {
      border: "1px solid rgba(255,159,28,0.26)",
      background: "rgba(255,159,28,0.1)",
      color: "var(--np-terminal-amber)",
    };
  }
  return {
    border: "1px solid rgba(97,230,255,0.22)",
    background: "rgba(97,230,255,0.1)",
    color: "var(--np-terminal-cyan)",
  };
}

function accessPanelStyle(tone = "default") {
  return {
    ...terminalPanelStyle({ alt: tone === "alt" }),
    padding: 0,
    border: tone === "warning"
      ? "1px solid rgba(255,107,107,0.26)"
      : tone === "cyan"
        ? "1px solid rgba(97,230,255,0.18)"
        : "1px solid var(--np-terminal-border)",
  };
}

function planCardStyle(active) {
  return {
    ...terminalMetricTileStyle({ accent: active ? "var(--np-terminal-amber)" : "rgba(97,230,255,0.18)" }),
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    background: active
      ? "linear-gradient(180deg, rgba(34,24,10,0.95) 0%, rgba(14,18,26,0.96) 100%)"
      : "linear-gradient(180deg, rgba(17,23,35,0.95) 0%, rgba(10,14,20,0.96) 100%)",
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
    ? `Status: ${membership.subscription_status}${membership.plan_interval ? ` // ${membership.plan_interval}` : ""}`
    : "No active plan yet";

  return (
    <div className="np-terminal-shell">
      <div className="np-terminal-content" style={{ maxWidth: 1460, margin: "0 auto", padding: isMobileViewport ? "14px 14px 22px" : "18px 20px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={onExitTerminal} className="np-terminal-button" style={terminalButtonStyle(false, { tone: "amber" })}>
              Editorial view
            </button>
            <span style={terminalTagStyle({ tone: accessState === "active" ? "success" : "cyan", compact: true })}>
              {accessState === "active" ? "Access active" : "Access required"}
            </span>
          </div>
          {user ? (
            <div style={{ fontSize: 12, ...terminalMutedStyle() }}>
              Signed in as {user.email}
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0,1.08fr) minmax(360px,460px)", gap: 16, alignItems: "start" }}>
          <section style={{ display: "grid", gap: 16 }}>
            <div style={accessPanelStyle("alt")}>
              <div className="np-terminal-panel-body" style={{ padding: isMobileViewport ? "18px 16px 18px" : "24px 24px 22px" }}>
                <div style={terminalLabelStyle()}>Terminal access</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "clamp(28px,4.6vw,48px)", lineHeight: 1.04, marginTop: 10, color: "var(--np-terminal-text)", maxWidth: 760 }}>
                  Paid access to the nuclear tape.
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.75, color: "var(--np-terminal-muted)", maxWidth: 760, margin: "14px 0 0" }}>
                  The terminal is where the dense view lives: secure filings, operating signals, buildout tracking, market context, and source-level drilldowns that do not belong in the public bundle.
                </p>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
                  <span style={terminalTagStyle({ tone: "cyan", compact: true })}>Secure APIs</span>
                  <span style={terminalTagStyle({ tone: "success", compact: true })}>Ops feeds</span>
                  <span style={terminalTagStyle({ tone: "amber", compact: true })}>Filings</span>
                  <span style={terminalTagStyle({ compact: true })}>Market tape</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(2, minmax(0,1fr))", gap: 12, marginTop: 18 }}>
                  {FEATURE_ITEMS.map((item, index) => (
                    <div key={item} style={terminalMetricTileStyle({ accent: index % 2 === 0 ? "var(--np-terminal-cyan)" : "var(--np-terminal-amber)" })}>
                      <div style={terminalLabelStyle(index % 2 === 0 ? "cyan" : "amber")}>Capability {String(index + 1).padStart(2, "0")}</div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.65, color: "var(--np-terminal-text)", marginTop: 8 }}>{item}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={accessPanelStyle("cyan")}>
              <div className="np-terminal-panel-body" style={{ padding: isMobileViewport ? "16px" : "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                  <div>
                    <div style={terminalLabelStyle("cyan")}>Unlocked surfaces</div>
                    <div style={{ ...terminalValueStyle({ size: 20 }), marginTop: 8 }}>Console modules</div>
                  </div>
                  <span style={terminalTagStyle({ tone: "cyan", compact: true })}>Workspace parity</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(3, minmax(0,1fr))", gap: 12 }}>
                  {[
                    { label: "Filing radar", detail: "Track SEC signals by company, country, and ticker context.", tone: "amber" },
                    { label: "Operations pulse", detail: "Monitor NRC power-level signals with terminal-native filtering.", tone: "success" },
                    { label: "Project pipeline", detail: "Follow construction and advanced-reactor buildout in one workspace.", tone: "cyan" },
                  ].map((item) => (
                    <div key={item.label} style={terminalMetricTileStyle({ accent: item.tone === "success" ? "var(--np-terminal-green)" : item.tone === "cyan" ? "var(--np-terminal-cyan)" : "var(--np-terminal-amber)" })}>
                      <div style={terminalLabelStyle(item.tone === "success" ? "success" : item.tone === "cyan" ? "cyan" : "amber")}>{item.label}</div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.65, color: "var(--np-terminal-text)", marginTop: 8 }}>{item.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside style={{ display: "grid", gap: 16 }}>
            {statusNotice ? (
              <div style={{ borderRadius: 8, padding: "13px 14px", fontSize: 12.5, lineHeight: 1.65, ...noticeStyle(statusNotice.tone) }}>
                {statusNotice.text}
              </div>
            ) : null}

            {membershipError ? (
              <div style={{ borderRadius: 8, padding: "13px 14px", fontSize: 12.5, lineHeight: 1.65, ...noticeStyle("warning") }}>
                {membershipError}
              </div>
            ) : null}

            {!isConfigured ? (
              <div style={{ ...accessPanelStyle("warning"), padding: 0 }}>
                <div className="np-terminal-panel-body" style={{ padding: "16px" }}>
                  <div style={terminalLabelStyle("danger")}>Configuration warning</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.65, color: "var(--np-terminal-text)", marginTop: 8 }}>
                    Supabase browser auth is not configured yet. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to use the terminal paywall.
                  </div>
                </div>
              </div>
            ) : null}

            <div style={accessPanelStyle()}>
              <div className="np-terminal-panel-body" style={{ padding: isMobileViewport ? "16px" : "20px", display: "grid", gap: 14 }}>
                <div>
                  <div style={terminalLabelStyle()}>Subscription</div>
                  <div style={{ ...terminalValueStyle({ size: 24 }), marginTop: 8 }}>Choose access plan</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 8, ...terminalMutedStyle() }}>{membershipSummary}</div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {membership?.terminal_access ? <span style={terminalTagStyle({ tone: "success", compact: true })}>Terminal active</span> : null}
                  {membership?.plan_interval ? <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{membership.plan_interval}</span> : null}
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {PLAN_OPTIONS.map((plan) => {
                    const active = selectedInterval === plan.interval;
                    return (
                      <button key={plan.interval} type="button" onClick={() => setSelectedInterval(plan.interval)} className="np-terminal-button" style={planCardStyle(active)}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--np-terminal-text)" }}>{plan.name}</div>
                            <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 4, ...terminalMutedStyle() }}>{plan.detail}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            {plan.badge ? <div style={terminalLabelStyle("cyan")}>{plan.badge}</div> : null}
                            <div style={{ ...terminalValueStyle({ tone: active ? "amber" : "default", size: 22 }), marginTop: plan.badge ? 6 : 0 }}>
                              {plan.price}<span style={{ fontSize: 12, color: "var(--np-terminal-muted)" }}>{plan.cadence}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button type="button" onClick={handleCheckout} disabled={billingBusy || !user} className="np-terminal-button" style={{ ...terminalButtonStyle(true), width: "100%", justifyContent: "center", opacity: billingBusy || !user ? 0.6 : 1, cursor: billingBusy || !user ? "not-allowed" : "pointer" }}>
                  {billingBusy ? "Opening checkout..." : user ? "Continue to Stripe Checkout" : "Sign in to subscribe"}
                </button>

                {membership?.stripe_customer_id ? (
                  <button type="button" onClick={handleOpenPortal} disabled={billingBusy} className="np-terminal-button" style={{ ...terminalButtonStyle(false, { tone: "cyan" }), width: "100%", justifyContent: "center", opacity: billingBusy ? 0.6 : 1, cursor: billingBusy ? "not-allowed" : "pointer" }}>
                    Manage billing
                  </button>
                ) : null}
              </div>
            </div>

            <div style={accessPanelStyle("cyan")}>
              <div className="np-terminal-panel-body" style={{ padding: isMobileViewport ? "16px" : "20px", display: "grid", gap: 12 }}>
                <div>
                  <div style={terminalLabelStyle("cyan")}>Account access</div>
                  <div style={{ ...terminalValueStyle({ size: 22 }), marginTop: 8 }}>Email OTP sign-in</div>
                </div>

                {!user ? (
                  <>
                    <div style={terminalInputShellStyle()}>
                      <span style={terminalLabelStyle("cyan")}>Email</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Email address"
                        disabled={authBusy}
                        style={terminalInputStyle()}
                      />
                    </div>

                    {otpSent ? (
                      <div style={terminalInputShellStyle()}>
                        <span style={terminalLabelStyle()}>Code</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={code}
                          onChange={(event) => setCode(event.target.value)}
                          placeholder="6-digit code"
                          disabled={authBusy}
                          style={{ ...terminalInputStyle(), letterSpacing: "0.1em" }}
                        />
                      </div>
                    ) : null}

                    <div style={{ display: "grid", gap: 10 }}>
                      <button type="button" onClick={otpSent ? handleVerifyCode : handleSendCode} disabled={authBusy} className="np-terminal-button" style={{ ...terminalButtonStyle(false, { tone: "cyan" }), width: "100%", justifyContent: "center", opacity: authBusy ? 0.7 : 1, cursor: authBusy ? "not-allowed" : "pointer" }}>
                        {authBusy ? (otpSent ? "Verifying..." : "Sending code...") : (otpSent ? "Verify code" : "Send login code")}
                      </button>

                      {otpSent ? (
                        <button type="button" onClick={handleSendCode} disabled={authBusy} className="np-terminal-button" style={{ ...terminalButtonStyle(false), width: "100%", justifyContent: "center", opacity: authBusy ? 0.7 : 1, cursor: authBusy ? "not-allowed" : "pointer" }}>
                          Resend code
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 12.5, lineHeight: 1.65, ...terminalMutedStyle() }}>
                      This account is ready for checkout. Stripe will attach the subscription to {user.email}.
                    </div>
                    <button type="button" onClick={handleSignOut} className="np-terminal-button" style={{ ...terminalButtonStyle(false), width: "100%", justifyContent: "center" }}>
                      Sign out
                    </button>
                  </div>
                )}

                {errorMessage ? (
                  <div style={{ borderRadius: 8, padding: "12px 13px", fontSize: 12.5, lineHeight: 1.6, ...noticeStyle("warning") }}>
                    {errorMessage}
                  </div>
                ) : null}
                {successMessage ? (
                  <div style={{ borderRadius: 8, padding: "12px 13px", fontSize: 12.5, lineHeight: 1.6, ...noticeStyle("success") }}>
                    {successMessage}
                  </div>
                ) : null}

                <div style={{ fontSize: 11.5, lineHeight: 1.65, ...terminalMutedStyle() }}>
                  Email OTP must be enabled in Supabase Auth for this flow. Stripe tax handling remains intentionally unset until you choose the live tax configuration for US and Canada.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
