import Stripe from "stripe";
import { getSupabaseServiceClient } from "./supabase.js";

const MEMBERSHIP_TABLE = process.env.BILLING_MEMBERSHIPS_TABLE || "billing_memberships";
const WEBHOOK_EVENTS_TABLE = process.env.STRIPE_WEBHOOK_EVENTS_TABLE || "stripe_webhook_events";
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

let stripeClient = null;

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

export function getStripe() {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error("Stripe configuration is incomplete.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function hasTerminalAccessStatus(status) {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(String(status || "").toLowerCase());
}

function buildTimestamp() {
  return new Date().toISOString();
}

function getPriceIdForInterval(interval) {
  if (interval === "month") return process.env.STRIPE_PRICE_MONTHLY?.trim() || "";
  if (interval === "year") return process.env.STRIPE_PRICE_ANNUAL?.trim() || "";
  return "";
}

function normalizeInterval(interval) {
  if (interval === "month" || interval === "year") return interval;
  return null;
}

function toIsoFromUnix(value) {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

async function resolveCustomer(customerOrId) {
  if (!customerOrId) return null;
  if (typeof customerOrId !== "string") {
    return customerOrId.deleted ? null : customerOrId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerOrId);
  if (customer.deleted) return null;
  return customer;
}

export async function getMembershipForUser(userId) {
  const client = getSupabaseServiceClient();
  const { data, error } = await client
    .from(MEMBERSHIP_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data || null;
}

export async function upsertMembership(patch) {
  const client = getSupabaseServiceClient();
  const { data, error } = await client
    .from(MEMBERSHIP_TABLE)
    .upsert(
      {
        subscription_status: "inactive",
        terminal_access: false,
        cancel_at_period_end: false,
        updated_at: buildTimestamp(),
        ...patch,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function recordWebhookEvent(event) {
  const client = getSupabaseServiceClient();
  const { error } = await client.from(WEBHOOK_EVENTS_TABLE).insert({
    event_id: event.id,
    event_type: event.type,
    payload: event,
    processed_at: buildTimestamp(),
  });

  if (error?.code === "23505") {
    return false;
  }
  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function getOrCreateStripeCustomer({ userId, email }) {
  const stripe = getStripe();
  const membership = await getMembershipForUser(userId);
  const normalisedEmail = email?.toLowerCase().trim() || null;

  if (membership?.stripe_customer_id) {
    const customer = await stripe.customers.update(membership.stripe_customer_id, {
      email: normalisedEmail || undefined,
      metadata: {
        user_id: userId,
        email: normalisedEmail || "",
      },
    });

    return customer.id;
  }

  let customer = null;
  if (normalisedEmail) {
    const existing = await stripe.customers.list({ email: normalisedEmail, limit: 10 });
    customer = existing.data.find((item) => item.metadata?.user_id === userId) || existing.data[0] || null;
  }

  if (customer) {
    customer = await stripe.customers.update(customer.id, {
      email: normalisedEmail || customer.email || undefined,
      metadata: {
        ...customer.metadata,
        user_id: userId,
        email: normalisedEmail || customer.email || "",
      },
    });
  } else {
    customer = await stripe.customers.create({
      email: normalisedEmail || undefined,
      metadata: {
        user_id: userId,
        email: normalisedEmail || "",
      },
    });
  }

  await upsertMembership({
    user_id: userId,
    email: normalisedEmail,
    stripe_customer_id: customer.id,
  });

  return customer.id;
}

export async function createCheckoutSession({ interval, userId, email, siteUrl }) {
  const planInterval = normalizeInterval(interval);
  const priceId = getPriceIdForInterval(planInterval);
  if (!planInterval || !priceId) {
    throw new Error("Stripe price configuration is incomplete.");
  }

  const membership = await getMembershipForUser(userId);
  if (membership?.terminal_access) {
    throw new Error("This account already has active terminal access.");
  }

  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer({ userId, email });
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    billing_address_collection: "auto",
    success_url: `${siteUrl}/terminal?checkout=success`,
    cancel_url: `${siteUrl}/terminal?checkout=cancelled`,
    subscription_data: {
      metadata: {
        user_id: userId,
        email: email || "",
      },
    },
    metadata: {
      user_id: userId,
      email: email || "",
      plan_interval: planInterval,
      access_product: "terminal",
    },
  });

  await upsertMembership({
    user_id: userId,
    email: email?.toLowerCase().trim() || null,
    stripe_customer_id: customerId,
    stripe_price_id: priceId,
    plan_interval: planInterval,
    last_checkout_session_id: session.id,
  });

  return session;
}

export async function createBillingPortalSession({ userId, siteUrl }) {
  const membership = await getMembershipForUser(userId);
  if (!membership?.stripe_customer_id) {
    throw new Error("No Stripe customer is linked to this account yet.");
  }

  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: membership.stripe_customer_id,
    return_url: `${siteUrl}/terminal?billing=return`,
  });
}

export async function syncMembershipFromSubscription(subscription, options = {}) {
  const customer = await resolveCustomer(subscription.customer);
  const userId = options.userId || subscription.metadata?.user_id || customer?.metadata?.user_id || null;
  const email = (
    options.email
    || subscription.metadata?.email
    || customer?.email
    || customer?.metadata?.email
    || null
  );

  if (!userId) {
    throw new Error("Stripe subscription is missing the linked Supabase user id.");
  }

  const price = subscription.items?.data?.[0]?.price || null;
  return upsertMembership({
    user_id: userId,
    email: email?.toLowerCase().trim() || null,
    stripe_customer_id: customer?.id || (typeof subscription.customer === "string" ? subscription.customer : null),
    stripe_subscription_id: subscription.id,
    stripe_price_id: price?.id || null,
    plan_interval: price?.recurring?.interval || null,
    subscription_status: subscription.status || "inactive",
    terminal_access: hasTerminalAccessStatus(subscription.status),
    current_period_end: toIsoFromUnix(subscription.current_period_end),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    ...(options.checkoutSessionId ? { last_checkout_session_id: options.checkoutSessionId } : {}),
  });
}

export async function syncMembershipFromSubscriptionId(subscriptionId, options = {}) {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["customer", "items.data.price"],
  });

  return syncMembershipFromSubscription(subscription, options);
}
