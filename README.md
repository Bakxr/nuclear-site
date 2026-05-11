# Nuclear Pulse

Nuclear Pulse is a Vite + React editorial site with a paid `/terminal` product layered on top of it.

This repo is not frontend-only. It contains:

- A public editorial experience in [`src`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/src)
- Vercel serverless APIs in [`api`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api)
- Supabase-backed auth and membership state
- Stripe subscription billing for paid terminal access
- A scheduled newsletter sender in [`scripts/send-newsletter.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/scripts/send-newsletter.js)

## Current Stack

- Frontend: React 19, Vite 7, Framer Motion, Recharts, Three.js, D3
- Auth and database: Supabase Auth + Postgres
- Billing: Stripe Checkout, Billing Portal, webhooks
- Deployment: Vercel SPA + serverless functions
- Email: Resend for newsletter sending
- External data: Finnhub, SEC EDGAR, NRC, nuclear RSS feeds

## Main Entry Points

- Frontend boot: [`src/main.jsx`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/src/main.jsx)
- Main app shell: [`src/App.jsx`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/src/App.jsx)
- Access state: [`src/features/access/context.jsx`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/src/features/access/context.jsx)
- Terminal route helpers: [`src/features/terminal/route.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/src/features/terminal/route.js)
- OTP provisioning endpoint: [`api/auth/request-otp.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/auth/request-otp.js)
- Billing entrypoint: [`api/billing/session.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/billing/session.js)
- Stripe webhook: [`api/stripe/webhook.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/stripe/webhook.js)
- Protected terminal snapshot: [`api/terminal/snapshot.js`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/api/terminal/snapshot.js)

## Repo Layout

```text
src/                   React app, editorial UI, paid terminal UI, client services
api/                   Vercel serverless routes and shared server utilities
docs/                  Operator and billing setup docs
public/                Static assets and PWA files
scripts/               One-off operational scripts such as newsletter sending
supabase/migrations/   Database schema for billing and related server features
```

## Local Development

```bash
npm install
cp .env.example .env.local

# Public frontend only
npm run dev

# Full app with API routes and Stripe webhook compatibility
npx vercel dev
```

Available scripts:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`
- `npm test`

## Operator Docs

- Full operator runbook: [`docs/operator-runbook.md`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/docs/operator-runbook.md)
- Terminal billing setup: [`docs/terminal-billing-setup.md`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/docs/terminal-billing-setup.md)
- Billing schema migration: [`supabase/migrations/20260315_stripe_terminal_access.sql`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/supabase/migrations/20260315_stripe_terminal_access.sql)

## Core User Flows

1. User requests an email OTP from the terminal or account dialog.
2. The server provisions or normalizes the Supabase user, then the browser sends the OTP email.
3. After sign-in, the client reads `billing_memberships` to determine access state.
4. Checkout starts through a protected server route and redirects to Stripe Checkout.
5. Stripe webhooks sync subscription state back into Supabase.
6. Protected terminal endpoints verify both the Supabase session and `terminal_access` before returning data.

## Current Constraints

- [`src/App.jsx`](/d:/Users/Adam%20Baker/Desktop/0%20newks/nuclear-pulse/src/App.jsx) is still large and is being incrementally split by feature.
- Terminal and market data use in-memory cache fallbacks when shared cache tables are unavailable.
- Newsletter subscribe/unsubscribe flows assume a `subscribers` table that is not currently created by the migrations in this repo.

## License

For informational purposes only. Data sources include IAEA, World Nuclear Association, NRC, SEC, Finnhub, and public RSS feeds.
