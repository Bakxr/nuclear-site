import { getStripe, hasRecordedWebhookEvent, recordWebhookEvent, syncMembershipFromSubscription, syncMembershipFromSubscriptionId } from "../_lib/billing.js";
import { sendEmail } from "../_lib/dispatch.js";
import { readRawBody, setNoStore } from "../_lib/http.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Instant owner notification when a new paid subscription is created.
// Never throws and never breaks the webhook: missing OWNER_EMAIL or a
// failed send is logged and skipped silently.
async function notifyOwnerOfNewSubscription(subscription) {
  try {
    const ownerEmail = process.env.OWNER_EMAIL?.trim();
    if (!ownerEmail) return;

    const item = subscription?.items?.data?.[0] || null;
    const price = item?.price || null;
    const interval = price?.recurring?.interval || "unknown";
    const amount = price?.unit_amount != null && price?.currency
      ? `${(price.unit_amount / 100).toFixed(2)} ${String(price.currency).toUpperCase()}`
      : "unknown";
    const customer = subscription?.customer;
    const customerEmail = subscription?.metadata?.email
      || (customer && typeof customer === "object" ? customer.email : null)
      || "unknown";

    const subject = `⚛️ New PRO subscriber — ${customerEmail}`;
    const text = [
      "A new paid subscription was created on Nuclear Pulse.",
      "",
      `Customer: ${customerEmail}`,
      `Plan: ${amount} / ${interval}`,
      `Subscription: ${subscription?.id || "unknown"}`,
      `Status: ${subscription?.status || "unknown"}`,
    ].join("\n");
    const html = [
      "<div style=\"font-family:sans-serif;max-width:560px\">",
      "<h2>⚛️ New PRO subscriber</h2>",
      `<p><strong>Customer:</strong> ${customerEmail}<br/>`,
      `<strong>Plan:</strong> ${amount} / ${interval}<br/>`,
      `<strong>Subscription:</strong> ${subscription?.id || "unknown"}<br/>`,
      `<strong>Status:</strong> ${subscription?.status || "unknown"}</p>`,
      "</div>",
    ].join("\n");

    const result = await sendEmail({ to: ownerEmail, subject, html, text });
    if (result.ok) {
      console.info("[stripe/webhook] owner alert sent", result.id);
    } else {
      console.error("[stripe/webhook] owner alert failed", result.error);
    }
  } catch (error) {
    console.error("[stripe/webhook] owner alert error", error?.message || error);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  setNoStore(res);

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return res.status(500).json({ error: "Stripe webhook configuration is incomplete." });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (await hasRecordedWebhookEvent(event.id)) {
      console.info("[stripe/webhook] duplicate", event.id, event.type);
      return res.status(200).json({ received: true, duplicate: true });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        await syncMembershipFromSubscriptionId(session.subscription, {
          userId: session.client_reference_id || session.metadata?.user_id,
          email: session.customer_details?.email || session.customer_email || session.metadata?.email || null,
          checkoutSessionId: session.id,
        });
      }
    }

    if (event.type === "customer.subscription.created") {
      await notifyOwnerOfNewSubscription(event.data.object);
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await syncMembershipFromSubscription(event.data.object);
    }

    const recorded = await recordWebhookEvent(event);
    if (!recorded) {
      console.info("[stripe/webhook] duplicate-after-sync", event.id, event.type);
      return res.status(200).json({ received: true, duplicate: true });
    }

    console.info("[stripe/webhook] processed", event.id, event.type);

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[stripe/webhook]", error?.message || error);
    return res.status(400).json({ error: "Webhook handling failed." });
  }
}
