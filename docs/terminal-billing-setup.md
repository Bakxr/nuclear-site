# Terminal Billing Setup

This project already includes the Stripe + Supabase terminal access code.
To make it work end to end, finish the external setup below.

## 1. Local env

The local `.env.local` file is now prepared with the required keys.
You still need to fill in these Stripe values:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_ANNUAL`

## 2. Supabase database

Run this migration in the Supabase SQL editor:

- `supabase/migrations/20260315_stripe_terminal_access.sql`

That creates:

- `billing_memberships`
- `stripe_webhook_events`
- RLS policy for users to read only their own membership row

## 3. Supabase auth

In Supabase:

1. Open `Authentication -> Providers -> Email`.
2. Enable email sign-in.
3. Enable OTP / one-time code login.
4. Make sure the email flow sends a code that the user can paste into the site.

Optional:

- Configure SMTP if you want branded emails instead of the default sender.

## 4. Stripe products

In Stripe test mode:

1. Create a product named `Nuclear Terminal`.
2. Create a recurring monthly price for `$19 USD`.
3. Create a recurring yearly price for `$190 USD`.
4. Copy both price IDs into `.env.local` and Vercel env vars.

## 5. Stripe customer portal

In Stripe:

1. Open `Settings -> Billing -> Customer portal`.
2. Turn on the portal.
3. Enable subscription cancellation and payment method updates.
4. Save the portal configuration.

## 6. Stripe webhook

Create a webhook endpoint:

- Local with tunneling or Stripe CLI: `http://localhost:3000/api/stripe/webhook`
- Production: `https://atomic-energy.vercel.app/api/stripe/webhook`

Subscribe to these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the webhook signing secret into:

- `STRIPE_WEBHOOK_SECRET`

## 7. Vercel env vars

Add the same values from `.env.local` to your Vercel project:

- `VITE_FINNHUB_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_ANNUAL`
- `RESEND_API_KEY`
- `NEWSLETTER_FROM`
- `SITE_URL`
- `ALLOWED_ORIGINS`
- `UNSUBSCRIBE_SECRET`

## 8. Local testing

For frontend-only work:

- `npm run dev`

For the full app including API routes:

- `npx vercel dev`

If you want Stripe webhooks locally, forward them to the Vercel dev server.

## 9. Test flow

1. Visit `/terminal`.
2. Request an email code.
3. Sign in with the OTP code.
4. Start a checkout session.
5. Complete payment with Stripe test card `4242 4242 4242 4242`.
6. Confirm a row exists in `billing_memberships`.
7. Confirm `terminal_access` becomes `true`.
8. Refresh `/terminal` and verify the full terminal loads.

## 10. Production check

After deploying:

1. Reconfirm Vercel env vars.
2. Reconfirm the production Stripe webhook URL.
3. Test the full flow on desktop.
4. Test the full flow on mobile width.
