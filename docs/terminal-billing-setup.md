# Terminal Billing Setup

Use this document when you are wiring up terminal access for a fresh environment.

For the wider system map, API inventory, and operator support flow, see [`docs/operator-runbook.md`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/docs/operator-runbook.md).

## 1. Environment Variables

Copy [`.env.example`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/.env.example) to `.env.local` and fill in the values for:

- Supabase browser auth
- Supabase server access
- Stripe secrets and price ids
- `SITE_URL`
- `ALLOWED_ORIGINS`
- `UNSUBSCRIBE_SECRET`

For local full-stack testing, `SITE_URL` can stay local if you are using `vercel dev`.

## 2. Supabase Database

Run these migrations:

- [`supabase/migrations/20260315_stripe_terminal_access.sql`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/supabase/migrations/20260315_stripe_terminal_access.sql)
- [`supabase/migrations/20260318_terminal_cache.sql`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/supabase/migrations/20260318_terminal_cache.sql)

This creates:

- `billing_memberships`
- `stripe_webhook_events`
- `terminal_cache`

The `terminal_cache` table is recommended for shared snapshot caching across serverless instances. The app still falls back to in-memory cache if the table is missing.

## 3. Supabase Auth

In Supabase:

1. Enable Email auth.
2. Enable OTP / one-time code login.
3. Set the Auth site URL and allowed redirects to the real deployed host for production.
4. Configure SMTP if you want branded email delivery.

This app provisions first-time users server-side before requesting OTP, so the intended first email is the login code email rather than a separate signup-confirmation flow.

## 4. Stripe Product and Prices

In Stripe:

1. Create a product for terminal access.
2. Create a recurring monthly price.
3. Create a recurring annual price.
4. Put those ids in:
   - `STRIPE_PRICE_MONTHLY`
   - `STRIPE_PRICE_ANNUAL`

## 5. Stripe Customer Portal

Enable the Stripe Billing Portal and allow:

- Payment method updates
- Subscription cancellation
- Subscription management

## 6. Stripe Webhook

Create a webhook endpoint:

- Local: `http://localhost:3000/api/stripe/webhook`
- Production: `https://your-real-site.vercel.app/api/stripe/webhook`

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Store the signing secret in `STRIPE_WEBHOOK_SECRET`.

## 7. Vercel Environment Variables

Add the same values from `.env.local` to Vercel for Preview and Production.

Minimum set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_ANNUAL`
- `SITE_URL`
- `ALLOWED_ORIGINS`
- `UNSUBSCRIBE_SECRET`

Optional but recommended:

- `FINNHUB_API_KEY`
- `RESEND_API_KEY`
- `NEWSLETTER_FROM`
- `SEC_USER_AGENT`
- `TERMINAL_REVALIDATE_TOKEN`

## 8. Local Testing Modes

For frontend-only work:

```bash
npm run dev
```

For auth, billing, and API testing:

```bash
npx vercel dev
```

If you need local Stripe webhooks, forward them to the Vercel dev server.

## 9. End-to-End Test Flow

1. Visit `/terminal`.
2. Request an email login code.
3. Sign in with the OTP code.
4. Start a checkout session.
5. Complete checkout with a Stripe test card such as `4242 4242 4242 4242`.
6. Confirm the `billing_memberships` row exists for the Supabase user.
7. Confirm `terminal_access` becomes `true`.
8. Refresh `/terminal` and confirm the protected terminal loads.
9. Open the Billing Portal and confirm the customer portal works for the same account.

## 10. If a Paid User Does Not Get Access

Check these first:

1. Stripe subscription state
2. Stripe webhook delivery
3. `billing_memberships.terminal_access`
4. `billing_memberships.subscription_status`
5. `billing_memberships.stripe_customer_id`
6. Vercel env vars for Stripe and Supabase

Do not ask the user to pay again until you confirm the membership row and webhook delivery state.
