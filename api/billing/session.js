import { createBillingPortalSession, createCheckoutSession } from "../_lib/billing.js";
import { requireAuthenticatedUser } from "../_lib/auth.js";
import { ensureAllowedOrigin, setNoStore } from "../_lib/http.js";

function resolveSiteUrl(req) {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

export default async function handler(req, res) {
  if (!ensureAllowedOrigin(req, res, ["POST", "OPTIONS"])) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  setNoStore(res);

  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return;

  const action = String(req.body?.action || "").trim();

  try {
    if (action === "checkout") {
      const interval = String(req.body?.interval || "").trim();
      if (!["month", "year"].includes(interval)) {
        return res.status(400).json({ error: "A valid billing interval is required." });
      }

      const session = await createCheckoutSession({
        interval,
        userId: auth.user.id,
        email: auth.user.email || "",
        siteUrl: resolveSiteUrl(req),
      });

      console.info("[billing/create-checkout-session]", auth.user.id, interval, session.id);

      return res.status(200).json({
        sessionId: session.id,
        url: session.url,
      });
    }

    if (action === "portal") {
      const session = await createBillingPortalSession({
        userId: auth.user.id,
        siteUrl: resolveSiteUrl(req),
      });

      console.info("[billing/create-portal-session]", auth.user.id);

      return res.status(200).json({ url: session.url });
    }

    return res.status(400).json({ error: "A valid billing action is required." });
  } catch (error) {
    const label = action === "portal" ? "create-portal-session" : "create-checkout-session";
    console.error(`[billing/${label}]`, error?.message || error);
    const message = error?.message || (action === "portal"
      ? "Could not open the billing portal."
      : "Could not create a checkout session.");
    const statusCode = /configuration is incomplete/i.test(message) ? 500 : 400;

    return res.status(statusCode).json({ error: message });
  }
}
