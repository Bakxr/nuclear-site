import { useEffect, useRef, useState } from "react";
import { describePlan } from "../../access/accountStatus.js";
import { useTerminalAccess } from "../../access/context.jsx";
import useBillingPortal from "../../access/useBillingPortal.js";
import UserIcon from "../../access/UserIcon.jsx";

// Account dropdown in the terminal top bar: plan status, billing portal, sign out.
export default function AccountMenu({ onSignedOut }) {
  const { user, membership, signOut } = useTerminalAccess();
  const { openPortal, busy, error } = useBillingPortal();
  const [open, setOpen] = useState(false);
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

  async function handleSignOut() {
    await signOut().catch(() => {});
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
        aria-label="Account"
        title="Account"
      >
        <UserIcon size={14} />
      </button>
      {open ? (
        <div className="npt-account-menu" role="menu">
          <div className="npt-account-head">
            <strong>{user?.email || "Signed in"}</strong>
            <span>{describePlan(membership)}</span>
          </div>
          {membership?.stripe_customer_id ? (
            <button type="button" role="menuitem" onClick={openPortal} disabled={busy}>
              {busy ? "Opening…" : "Billing & subscription"}
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
