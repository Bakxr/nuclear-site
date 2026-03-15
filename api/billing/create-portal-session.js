import { createBillingPortalSession } from "../_lib/billing.js";
import { requireAuthenticatedUser } from "../_lib/auth.js";
import { ensureAllowedOrigin } from "../_lib/http.js";

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

  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return;

  try {
    const session = await createBillingPortalSession({
      userId: auth.user.id,
      siteUrl: resolveSiteUrl(req),
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("[billing/create-portal-session]", error?.message || error);
    return res.status(400).json({ error: error?.message || "Could not open the billing portal." });
  }
}
