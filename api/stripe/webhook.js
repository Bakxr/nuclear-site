import { getStripe, recordWebhookEvent, syncMembershipFromSubscription, syncMembershipFromSubscriptionId } from "../_lib/billing.js";
import { readRawBody } from "../_lib/http.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return res.status(500).json({ error: "Stripe webhook configuration is incomplete." });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    const shouldProcess = await recordWebhookEvent(event);

    if (!shouldProcess) {
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

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await syncMembershipFromSubscription(event.data.object);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[stripe/webhook]", error?.message || error);
    return res.status(400).json({ error: "Webhook handling failed." });
  }
}
