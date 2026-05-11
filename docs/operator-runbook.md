# Operator Runbook

This document describes how the app actually works today so an operator can run it without reverse-engineering the codebase.

## What This Repo Is

Nuclear Pulse has two products in one codebase:

- A public editorial site at `/`
- A paid terminal experience at `/terminal`

The public site renders in the browser. The paid terminal depends on server-side access checks, server-side data assembly, Supabase membership state, and Stripe subscription syncing.

## Runtime Responsibilities

### Frontend

The browser app is responsible for:

- Rendering the editorial experience
- Rendering the terminal paywall and terminal UI shell
- Managing the Supabase browser session
- Starting checkout and billing portal flows
- Requesting protected terminal data only after sign-in

Primary frontend entry points:

- [`src/main.jsx`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/src/main.jsx)
- [`src/App.jsx`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/src/App.jsx)
- [`src/features/access/context.jsx`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/src/features/access/context.jsx)
- [`src/features/access/TerminalAccessPage.jsx`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/src/features/access/TerminalAccessPage.jsx)
- [`src/components/NuclearTerminal.jsx`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/src/components/NuclearTerminal.jsx)

### Server

The serverless layer is responsible for:

- Creating or normalizing Supabase users before OTP login
- Verifying Supabase bearer tokens
- Enforcing terminal access
- Creating Stripe Checkout and Billing Portal sessions
- Processing Stripe webhooks and syncing memberships
- Building the secure terminal snapshot
- Proxying public market and news data
- Handling newsletter subscribe and unsubscribe

Primary server entry points:

- [`api/auth/request-otp.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/auth/request-otp.js)
- [`api/billing/session.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/billing/session.js)
- [`api/stripe/webhook.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/stripe/webhook.js)
- [`api/terminal/snapshot.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/terminal/snapshot.js)
- [`api/_lib/auth.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/_lib/auth.js)
- [`api/_lib/billing.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/_lib/billing.js)
- [`api/_lib/terminalSnapshot.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/_lib/terminalSnapshot.js)

## Stack

- UI: React 19, Vite 7, Framer Motion, Recharts, Three.js, D3
- Auth and state of record: Supabase Auth and Postgres
- Paid access: Stripe Checkout, Billing Portal, webhooks
- Server runtime: Vercel serverless functions
- Email: Resend
- Public data sources: Finnhub, SEC EDGAR, NRC, RSS feeds

## API Routes

| Route | Method | Auth | Responsibility |
| --- | --- | --- | --- |
| `/api/news` | `GET` | Public | Returns live or fallback news payload |
| `/api/market/quotes` | `GET` | Public | Returns market quotes for one or more tickers |
| `/api/subscribe` | `POST` | Public | Upserts newsletter subscribers |
| `/api/unsubscribe` | `GET` | Public token | Deactivates a subscriber using a signed token |
| `/api/auth/request-otp` | `POST` | Public | Provisions or normalizes a Supabase user before OTP |
| `/api/billing/session` | `POST` | Supabase bearer token | Creates Stripe Checkout or Billing Portal sessions |
| `/api/stripe/webhook` | `POST` | Stripe signature | Syncs Stripe subscription events into Supabase |
| `/api/terminal/snapshot` | `GET` | Supabase bearer token + paid access | Returns the full secure terminal snapshot |
| `/api/terminal/search` | `GET` | Supabase bearer token + paid access | Searches the secure terminal snapshot |
| `/api/terminal/entity` | `GET` | Supabase bearer token + paid access | Returns an entity plus related panels |
| `/api/terminal/panel` | `GET` | Supabase bearer token + paid access | Returns a single terminal panel payload |
| `/api/terminal/revalidate` | `GET` | Optional token | Forces terminal snapshot regeneration |

Vercel rewrites:

- `/terminal` rewrites to `/` so the SPA handles terminal routing
- `/api/terminal/entity/:id` rewrites to `/api/terminal/entity?id=:id`
- `/api/terminal/panel/:key` rewrites to `/api/terminal/panel?key=:key`

See [`vercel.json`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/vercel.json).

## External Services

| Service | Used for | Primary code |
| --- | --- | --- |
| Supabase Auth | Email OTP sign-in and browser session | [`src/lib/supabaseClient.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/src/lib/supabaseClient.js) |
| Supabase Postgres | Billing membership state, webhook events, optional terminal cache | [`api/_lib/billing.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/_lib/billing.js), [`api/_lib/terminalStore.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/_lib/terminalStore.js) |
| Stripe | Checkout, billing portal, webhooks | [`api/billing/session.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/billing/session.js), [`api/stripe/webhook.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/stripe/webhook.js) |
| Finnhub | Public quote data and newsletter market data | [`api/_lib/market.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/_lib/market.js), [`scripts/send-newsletter.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/scripts/send-newsletter.js) |
| SEC EDGAR | Company filings in terminal snapshot | [`api/_lib/sec.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/_lib/sec.js) |
| NRC | Reactor operations signals | [`api/_lib/nrc.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/_lib/nrc.js) |
| RSS feeds | Live industry news aggregation | [`api/_lib/newsFeed.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/_lib/newsFeed.js) |
| Resend | Newsletter delivery | [`scripts/send-newsletter.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/scripts/send-newsletter.js) |

## Environment Variables

### Required for local development and production

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Supabase project URL for browser auth |
| `VITE_SUPABASE_ANON_KEY` | Browser | Supabase anon key for browser auth |
| `SUPABASE_URL` | Server | Supabase project URL for server routes |
| `SUPABASE_ANON_KEY` | Server | Server-side JWT lookup and public database work |
| `SUPABASE_SERVICE_KEY` | Server | Supabase admin work, billing sync, newsletter |
| `STRIPE_SECRET_KEY` | Server | Stripe API access |
| `STRIPE_WEBHOOK_SECRET` | Server | Stripe webhook signature verification |
| `STRIPE_PRICE_MONTHLY` | Server | Monthly terminal subscription price id |
| `STRIPE_PRICE_ANNUAL` | Server | Annual terminal subscription price id |
| `SITE_URL` | Browser and server | Canonical app host for redirects and links |
| `ALLOWED_ORIGINS` | Server | Comma-separated browser origins allowed to call APIs |
| `UNSUBSCRIBE_SECRET` | Server | HMAC secret for unsubscribe links |

### Required for market/newsletter features

| Variable | Used by | Purpose |
| --- | --- | --- |
| `FINNHUB_API_KEY` | Server | Preferred server-side Finnhub key |
| `VITE_FINNHUB_API_KEY` | Browser/server fallback | Browser-visible fallback key for local dev or simple deployments |
| `RESEND_API_KEY` | Server/script | Newsletter sending |
| `NEWSLETTER_FROM` | Server/script | Newsletter sender identity |

### Optional but recommended

| Variable | Purpose |
| --- | --- |
| `SEC_USER_AGENT` | Required by SEC best practice for EDGAR requests |
| `TERMINAL_REVALIDATE_TOKEN` | Protects the manual snapshot revalidation endpoint |
| `TERMINAL_CACHE_TABLE` | Overrides the shared cache table name |
| `BILLING_MEMBERSHIPS_TABLE` | Overrides the membership table name |
| `STRIPE_WEBHOOK_EVENTS_TABLE` | Overrides the webhook event table name |

See the current template in [`.env.example`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/.env.example).

## Database Objects

Current migrations in this repo create:

- `billing_memberships`
- `stripe_webhook_events`
- `terminal_cache`

Relevant migration files:

- [`supabase/migrations/20260315_stripe_terminal_access.sql`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/supabase/migrations/20260315_stripe_terminal_access.sql)
- [`supabase/migrations/20260318_terminal_cache.sql`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/supabase/migrations/20260318_terminal_cache.sql)

Gap to be aware of:

- Newsletter subscribe and unsubscribe code expects a `subscribers` table, but this repo does not currently include that migration.

## Actual User Flows

### 1. Sign-in flow

1. User enters an email on the terminal page or account dialog.
2. Frontend calls `/api/auth/request-otp`.
3. Server ensures a Supabase user exists and is email-confirmed.
4. Frontend calls `supabase.auth.signInWithOtp(...)`.
5. User receives a one-time code by email.
6. Frontend verifies the code with `supabase.auth.verifyOtp(...)`.
7. Access context loads the user session and the `billing_memberships` row.

### 2. Checkout flow

1. Signed-in user selects a monthly or yearly plan.
2. Frontend calls `/api/billing/session` with the Supabase bearer token.
3. Server verifies the user, resolves or creates a Stripe customer, and creates a Checkout session.
4. User completes payment in Stripe Checkout.
5. Stripe sends subscription webhooks to `/api/stripe/webhook`.
6. Server syncs subscription status into `billing_memberships`.
7. User returns to `/terminal?checkout=success` and the frontend refreshes membership state.

### 3. Paid terminal access flow

1. Frontend sees `membership.terminal_access === true`.
2. Browser requests `/api/terminal/*` routes with the Supabase bearer token.
3. Server verifies the bearer token and then verifies `billing_memberships.terminal_access`.
4. Server assembles or reads the terminal snapshot and returns only the protected data needed by the terminal UI.

## Local Operation

### Frontend-only work

Use:

```bash
npm run dev
```

### Full stack work

Use:

```bash
npx vercel dev
```

Reason:

- Vite alone will not run the `api/` routes.
- Stripe webhooks and server-enforced terminal access require the Vercel dev server.

## Support Playbook

### If a paid user cannot access the terminal

Check these in order:

1. Confirm the user can sign in and has a valid Supabase session.
2. Inspect `billing_memberships` for their `user_id`, `terminal_access`, `subscription_status`, and `stripe_customer_id`.
3. In Stripe, confirm the subscription exists and is `active`, `trialing`, or `past_due`.
4. In Stripe Events, confirm the webhook hit `/api/stripe/webhook` and did not keep failing.
5. Replay the relevant webhook event if Stripe shows delivery failures.
6. Refresh `/terminal` and confirm protected endpoints now return `200`.

### If checkout succeeds but access is delayed

- Expect a short delay while the webhook sync updates `billing_memberships`.
- If the membership row never updates, inspect webhook delivery before asking the user to retry payment.

### If terminal data is stale

- Confirm external data providers are reachable.
- Trigger `/api/terminal/revalidate?token=...` if `TERMINAL_REVALIDATE_TOKEN` is configured.
- Confirm the optional `terminal_cache` table exists if you want cache consistency across serverless instances.

## Current Operational Risks

- [`src/App.jsx`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/src/App.jsx) is still large, so app-shell changes should stay incremental.
- Rate limiting still has in-memory fallback behavior, which is acceptable for light protection but not a full abuse-control system.
- Newsletter persistence is not fully self-contained until the `subscribers` schema is added to migrations.
