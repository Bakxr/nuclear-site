import { useCallback, useState } from "react";
import { createPortalSession } from "../../services/billingAPI.js";
import { useTerminalAccess } from "./context.jsx";

// Opens the Stripe customer portal (card, invoices, plan changes, cancellation).
export default function useBillingPortal() {
  const { getAccessToken } = useTerminalAccess();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const openPortal = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const { url } = await createPortalSession(await getAccessToken());
      window.location.assign(url);
    } catch (err) {
      setError(err.message || "Could not open billing.");
      setBusy(false);
    }
  }, [getAccessToken]);

  return { openPortal, busy, error };
}
