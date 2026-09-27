import { useEffect, useRef, useState } from "react";
import { useTerminalAccess } from "../../access/context.jsx";
import { createPortalSession } from "../../../services/billingAPI.js";

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function planSummary(membership) {
  if (!membership) return "";
  const plan = membership.plan_interval === "year" ? "Annual" : membership.plan_interval === "month" ? "Monthly" : "Pro";
  const end = fmtDate(membership.current_period_end);
  if (membership.cancel_at_period_end) return `${plan} · access ends ${end}`;
  if (membership.subscription_status === "trialing") return `Free trial · ends ${end}`;
  if (membership.subscription_status === "past_due") return `${plan} · payment failed, update your card`;
  return end ? `${plan} · renews ${end}` : plan;
}

// Account dropdown in the terminal top bar: plan status, billing portal, sign out.
export default function AccountMenu({ onSignedOut }) {
  const { user, membership, getAccessToken, signOut } = useTerminalAccess();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleBilling() {
    setError("");
    setBusy(true);
    try {
      const { url } = await createPortalSession(await getAccessToken());
      window.location.assign(url);
    } catch (err) {
      setError(err.message || "Could not open billing.");
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    await signOut().catch(() => {});
    setBusy(false);
    setOpen(false);
    onSignedOut?.();
  }

  return (
    <div className="npt-account" ref={rootRef}>
      <button
        type="button"
        className="npt-icon-btn"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account and billing"
        title="Account and billing"
      >
        <UserIcon />
      </button>
      {open ? (
        <div className="npt-account-menu" role="menu">
          <div className="npt-account-head">
            <strong>{user?.email || "Signed in"}</strong>
            <span>{planSummary(membership)}</span>
          </div>
          {membership?.stripe_customer_id ? (
            <button type="button" role="menuitem" onClick={handleBilling} disabled={busy}>
              {busy ? "Opening…" : "Manage billing & cancel"}
            </button>
          ) : null}
          <button type="button" role="menuitem" onClick={handleSignOut} disabled={busy}>
            Sign out
          </button>
          {error ? <p className="npt-account-error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
