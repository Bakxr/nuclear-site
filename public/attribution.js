// First-touch attribution, shared by the app and the static SEO pages.
// On the first visit, remembers where the visitor came from (utm_* tags or
// the referring site) and the page they landed on. Sign-up forms send it
// along via window.npAttribution(surface).
(function () {
  var KEY = "np-attribution";
  var stored = null;
  try { stored = JSON.parse(window.localStorage.getItem(KEY) || "null"); } catch { stored = null; }

  if (!stored) {
    var params = new URLSearchParams(window.location.search);
    var refHost = "";
    try { refHost = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; } catch { refHost = ""; }
    if (refHost === window.location.hostname.replace(/^www\./, "")) refHost = "";
    stored = {
      source: params.get("utm_source") || refHost || "direct",
      campaign: params.get("utm_campaign") || "",
      referrer: refHost,
      landing: window.location.pathname,
    };
    try { window.localStorage.setItem(KEY, JSON.stringify(stored)); } catch { /* private mode */ }
  }

  window.npAttribution = function (surface) {
    return {
      source: stored.source,
      campaign: stored.campaign,
      referrer: stored.referrer,
      landing: stored.landing,
      surface: surface || "",
    };
  };
})();
