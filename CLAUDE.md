# Nuclear Pulse — Notes for Claude

The README has the human-facing tour. This file is the working brief for future Claude sessions: what's load-bearing, where the sharp edges are, conventions to follow.

## What this actually is

A Vite/React 19 editorial site with a **paid `/terminal` product** behind it. The terminal is the revenue feature — gated by Supabase auth + a Stripe subscription that flips `billing_memberships.terminal_access`. Treat anything touching auth, billing, or terminal data as production-sensitive.

Frontend: React 19, Framer Motion, Recharts, Three.js (globe), D3.
Backend: Vercel serverless functions in `api/`, Supabase (Auth + Postgres + RLS), Stripe (Checkout + Billing Portal + webhooks), Resend (newsletter).
External data: Finnhub (quotes), SEC EDGAR, NRC, nuclear RSS feeds.

## Top-level layout

```
src/                React app
  App.jsx           Editorial shell — still large (~3.4k LOC), being incrementally split
  features/access/  Auth + membership state (context.jsx is the source of truth)
  features/terminal Terminal UI, selectors
  components/       Globe.jsx is its own beast (~800 LOC, Three.js + raycaster)
  services/         Client-side fetchers
api/                Vercel functions
  _lib/             Shared server utils — auth, billing, http, rate limit, snapshot cache
  auth/             OTP request endpoint
  billing/          Checkout session + portal session
  stripe/           Webhook handler (raw body, signature-verified)
  terminal/         Snapshot + entity endpoints (require active terminal_access)
  market/           Public quote fetch
  news.js, subscribe.js, unsubscribe.js
supabase/migrations Billing/terminal schema, RLS policies
scripts/            Newsletter sender
tests/              Vitest setup
```

## Load-bearing invariants

**Auth + billing**
- The membership table is read by the client via RLS (`auth.uid() = user_id`) AND written by the webhook via service key. Client must never get the service key.
- `requireTerminalAccess` (`api/_lib/auth.js`) gates terminal endpoints. Don't bypass.
- The Stripe webhook (`api/stripe/webhook.js`) needs `bodyParser: false` and raw-body signature verification — do not change this.
- Webhook idempotency: `stripe_webhook_events` table with unique `event_id`. Insert event row, catch `23505` duplicate, skip reprocess.

**Secrets**
- `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`, `FINNHUB_API_KEY`, `TERMINAL_REVALIDATE_TOKEN`, `UNSUBSCRIBE_SECRET` are server-only. Anything `VITE_*` ships to the browser.
- `UNSUBSCRIBE_SECRET` must be set — do not fall back to `SUPABASE_SERVICE_KEY` as the signing secret.
- `TERMINAL_REVALIDATE_TOKEN` is mandatory; revalidate endpoint refuses to run without it.

**Caching**
- `getTerminalSnapshot` reads from a Supabase `terminal_cache` table with in-memory fallback. Multiple concurrent misses must dedupe (in-flight promise) — do not regress that.
- `vite-plugin-pwa` is on; cache invalidation matters for service-worker behavior.

## Conventions

- ESM throughout (`"type": "module"`).
- Inline styles in the editorial sections (legacy). New components can use CSS modules or stay inline if it fits the surrounding code.
- Hooks-only React. No class components.
- Server routes export `default async function handler(req, res)` and use the helpers in `api/_lib/http.js` for CORS + method checks + no-store headers.
- Tests are Vitest + Testing Library; `tests/serverTestUtils.js` for API tests.
- `pnpm` is the preferred package manager (faster, less disk). `npm` works too.

## Sharp edges (read before changing)

- **`App.jsx` and `Globe.jsx` are god-files.** Hook dependency arrays are hard to verify at this size. Prefer to extract a piece into `features/` rather than adding more inline.
- **Rate limiting is Supabase-backed** (`api/_lib/rateLimit.js`) — atomic upsert on a `rate_limits` table. If you add an endpoint that needs limiting, use `rateLimit({ key, max, windowMs })` from that module.
- **`api/market/quotes.js` is public** but allowlists tickers from `STOCKS_BASE` and caps batch size. Keep both.
- **`api/auth/request-otp.js`** uses `getUserByEmail` (not `listUsers` pagination). Do not regress to scanning all users. It provisions on first sight, then the browser triggers the actual OTP email via Supabase Auth.
- **CORS**: state-changing routes must check `ensureAllowedOrigin` — don't accept missing-origin requests for POSTs.
- **Stripe `current_period_end`**: top-level field is deprecated in newer API versions. Read `subscription.items.data[0].current_period_end` as fallback.
- **`api/terminal/entity.js` imports from `src/features/terminal/selectors.js`** — this couples serverless code to the Vite tree. If you touch a selector, do not introduce `import.meta.env` or anything else client-only into its dependency chain.
- The `subscribers` table for newsletter isn't in `supabase/migrations/` — it exists in the live DB but the schema isn't tracked here yet. If you change subscribe/unsubscribe flows, document the expected shape.

## Recent work

- 2026-05-13: Security pass — locked down `revalidate` token requirement, rewrote `request-otp` to drop user enumeration, replaced in-memory rate limiter with Supabase-backed limiter, tightened `/api/market/quotes`, fixed `news.js` error leak, switched unsubscribe HMAC to dedicated `UNSUBSCRIBE_SECRET`, added in-flight dedup for terminal snapshot.

## When you change things

- Membership and billing changes need a webhook test (see `api/stripe/webhook.test.js`) and a Stripe shape test for `syncMembershipFromSubscription`.
- Don't introduce client-side calls to anything in `api/_lib/`.
- Never log full Stripe error objects — they can leak structure on field changes.
- Keep migrations forward-only and dated; existing ones use `YYYYMMDD_description.sql`.
