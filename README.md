# Secure Starter

A security-first **Next.js 15 (App Router) + Supabase** baseline. Clone it as
the starting point for new projects instead of re-hardening from scratch.

## What's inside

```
next.config.mjs           Static security headers (HSTS, XFO, nosniff, COOP, …)
middleware.ts             Nonce-based CSP + Supabase session refresh + route gating
lib/
  supabase/server.ts      Cookie-scoped server client (RLS applies)
  supabase/client.ts      Browser client (anon key)
  security/rate-limit.ts  Upstash-backed limiter, spoof-resistant client id
  security/webhook.ts     Constant-time HMAC webhook verification
  validation.ts           Zod schemas at the boundary
app/
  login/                  Rate-limited + validated auth server actions
  dashboard/              Protected page (defense-in-depth getUser check)
supabase/policies.sql     Deny-by-default RLS, per-op policies, verify query
SECURITY.md               What's hardened + pre-launch checklist
```

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Upstash values
# run supabase/policies.sql in the Supabase SQL editor
npm run dev
```

## Before you ship
Work through the checklist in [SECURITY.md](./SECURITY.md). The big three:
lock the CSP `connect-src`/`img-src` to your domains, verify RLS on every
table, and verify every inbound webhook signature.

## Notes
- **Rate limiting needs Upstash** — in-memory limiters silently do nothing on
  Vercel. Set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
- **CSP is nonce-based in production.** Any inline `<script>` you add must carry
  the nonce from `headers().get('x-nonce')` (see `app/layout.tsx`).
