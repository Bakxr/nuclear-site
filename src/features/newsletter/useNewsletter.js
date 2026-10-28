import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "np-newsletter-subscribed";
const POPUP_SHOWN_KEY = "np-newsletter-popup-shown";
const POPUP_DISMISSED_KEY = "np-newsletter-popup-dismissed";
// Persisted dismissal so returning readers aren't asked every visit.
const POPUP_SNOOZE_KEY = "np-newsletter-popup-snoozed-until";
const POPUP_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
const FORM_DEFAULT = { email: "", website: "", status: "idle", error: "" };
const SURFACES = ["hero", "inline", "footer", "popup"];

function storageGet(storage, key) {
  try {
    return window[storage].getItem(key);
  } catch {
    return null;
  }
}

function storageSet(storage, key, value) {
  try {
    window[storage].setItem(key, value);
  } catch {
    // storage unavailable — in-memory state still applies
  }
}

function popupRecentlyDismissed() {
  return Number(storageGet("localStorage", POPUP_SNOOZE_KEY) || 0) > Date.now();
}

function allSurfaces(patch, prev) {
  return Object.fromEntries(SURFACES.map((surface) => [surface, { ...(prev?.[surface] || FORM_DEFAULT), ...patch }]));
}

// Newsletter sign-up state shared by every form on the page (hero, inline,
// footer, popup): one success marks them all done. Also owns the popup's
// trigger rules (60s on the page, or exit intent on desktop; at most once per
// session, snoozed 14 days after a dismissal).
export function useNewsletter() {
  const [isSubscribed, setIsSubscribed] = useState(() => storageGet("localStorage", STORAGE_KEY) === "1");
  const [forms, setForms] = useState(() => allSurfaces(isSubscribed ? { status: "success" } : {}));
  const [showPopup, setShowPopup] = useState(false);

  const updateForm = useCallback((surface, patch) => {
    setForms((prev) => ({ ...prev, [surface]: { ...prev[surface], ...patch } }));
  }, []);

  const handleEmailChange = useCallback((surface, value) => {
    setForms((prev) => ({
      ...prev,
      [surface]: {
        ...prev[surface],
        email: value,
        status: prev[surface].status === "error" ? "idle" : prev[surface].status,
        error: prev[surface].status === "error" ? "" : prev[surface].error,
      },
    }));
  }, []);

  const handleWebsiteChange = useCallback((surface, value) => updateForm(surface, { website: value }), [updateForm]);

  const dismissPopup = useCallback(() => {
    setShowPopup(false);
    storageSet("sessionStorage", POPUP_DISMISSED_KEY, "1");
    storageSet("localStorage", POPUP_SNOOZE_KEY, String(Date.now() + POPUP_SNOOZE_MS));
  }, []);

  const maybeOpenPopup = useCallback(() => {
    if (isSubscribed) return;
    if (storageGet("sessionStorage", POPUP_SHOWN_KEY) || storageGet("sessionStorage", POPUP_DISMISSED_KEY)) return;
    if (popupRecentlyDismissed()) return;
    storageSet("sessionStorage", POPUP_SHOWN_KEY, "1");
    setShowPopup(true);
  }, [isSubscribed]);

  useEffect(() => {
    if (isSubscribed) return undefined;
    if (storageGet("sessionStorage", POPUP_SHOWN_KEY) || storageGet("sessionStorage", POPUP_DISMISSED_KEY) || popupRecentlyDismissed()) return undefined;

    // A minute of reading, or (desktop) the pointer leaving for the tab bar.
    // No scroll trigger: on a long page it fired within seconds.
    const timer = window.setTimeout(maybeOpenPopup, 60000);
    const onMouseOut = (event) => {
      if (window.innerWidth < 1024) return;
      if (event.relatedTarget || event.clientY > 20) return;
      maybeOpenPopup();
    };

    document.addEventListener("mouseout", onMouseOut);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, [isSubscribed, maybeOpenPopup]);

  async function handleSubscribe(surface = "footer") {
    const form = forms[surface];
    const trimmed = form.email.trim();
    if (!trimmed) {
      updateForm(surface, { status: "error", error: "Please enter your email address." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      updateForm(surface, { status: "error", error: "Please enter a valid email address." });
      return;
    }

    updateForm(surface, { status: "loading", error: "" });

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, website: form.website, attribution: window.npAttribution?.(surface) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        updateForm(surface, { status: "error", error: data.error || "Something went wrong. Please try again." });
        return;
      }

      setIsSubscribed(true);
      setShowPopup(false);
      storageSet("localStorage", STORAGE_KEY, "1");
      storageSet("sessionStorage", POPUP_DISMISSED_KEY, "1");
      setForms((prev) => allSurfaces({ status: "success", error: "" }, prev));
    } catch {
      updateForm(surface, { status: "error", error: "Could not connect. Please try again." });
    }
  }

  return {
    forms,
    isSubscribed,
    showPopup,
    dismissPopup,
    handleEmailChange,
    handleWebsiteChange,
    handleSubscribe,
  };
}
