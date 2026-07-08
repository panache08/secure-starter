# Security

This starter is built security-first. Below is exactly what has been hardened,
why it matters, and what **you** must still do before you ship. Security is a
process, not a checkbox — this document keeps you honest.

---

## What this kit hardens out of the box

### 1. HTTP security headers (`next.config.mjs` + `middleware.ts`)
Static headers ship on every response; the CSP is emitted per-request from
middleware so it can carry a nonce.
- **HSTS** — forces HTTPS, blocks protocol-downgrade. (`preload` is opt-in —
  read the warning in `next.config.mjs` before keeping it.)
- **X-Frame-Options: DENY** + **CSP `frame-ancestors 'none'`** — blocks clickjacking.
- **X-Content-Type-Options: nosniff** — stops MIME-sniffing attacks.
- **Referrer-Policy** — prevents full-URL leakage to third parties.
- **Permissions-Policy** — disables camera/mic/geolocation by default.
- **Cross-Origin-Opener-Policy: same-origin** — process isolation (Spectre-class).
- **X-DNS-Prefetch-Control: off** — no DNS leakage for un-clicked links.
- **Content-Security-Policy (nonce-based)** — in production, inline scripts must
  carry a per-request nonce (`'strict-dynamic'`); no blanket `'unsafe-inline'`
  for scripts. Dev relaxes `script-src` only for Next's HMR. This is your
  strongest defence against XSS.
- **`poweredByHeader: false`** — no free framework recon.

### 2. Authenticated route protection (`middleware.ts`)
- Sessions refreshed on every request via the Supabase SSR client.
- Protected prefixes (`/dashboard`, `/settings`, `/api/private`) redirect
  unauthenticated users to `/login`.
- Auth decisions use **`getUser()`** (revalidates the token) — **never
  `getSession()` alone**, which trusts an unverified cookie and can be spoofed.
- Pages re-check `getUser()` themselves (defense in depth) — see `app/dashboard`.

### 3. Database Row Level Security (`supabase/policies.sql`)
- RLS enabled on every table; **deny by default**.
- Least-privilege, per-operation policies scoped to the owning user.
- `handle_new_user()` uses `security definer` + empty `search_path` to prevent
  search-path privilege escalation (all objects schema-qualified).
- A verification query that returns any table left without RLS.

### 4. Rate limiting (`lib/security/rate-limit.ts`) — and it's actually wired in
- Serverless-safe, backed by Upstash Redis (in-memory limiters do nothing on Vercel).
- **`clientId()` does not trust the leftmost `x-forwarded-for`** (client-forgeable
  → trivial bypass). It reads Vercel's trusted `x-real-ip`, falls back to the
  rightmost XFF hop, and fails closed to a shared `unknown` bucket rather than
  minting infinite fresh buckets.
- **`authId()`** keys auth limits on `(source, email)` so neither an attacker
  spraying one account nor one victim being targeted slips the limit.
- The login/signup **Server Actions in `app/login/actions.ts` call the limiter** —
  the protection is applied, not just available.

### 5. Input validation (`lib/validation.ts`)
- Zod schemas validate every external input at the boundary.
- 12-character minimum password policy (length over arbitrary complexity);
  sign-in intentionally does *not* enforce the policy (no policy leakage).

### 6. Webhook signature verification (`lib/security/webhook.ts`)
- Constant-time HMAC-SHA256 verification helper. An unverified webhook is a
  public write to your backend — verify the **raw** body before acting on it.

---

## What YOU must do before launch (do not skip)

- [ ] **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.** It bypasses
      RLS. Server-only, never `NEXT_PUBLIC_*`.
- [ ] **Lock CSP `connect-src`/`img-src`** to your real domains only.
- [ ] **Consider nonce'ing `style-src`** if your UI allows (currently
      `'unsafe-inline'` for styles).
- [ ] **Verify RLS on every table** using the query at the bottom of `policies.sql`.
- [ ] **Verify webhook signatures** on every payment/3rd-party webhook using
      `verifyWebhook()` (adapt the header/signing string to your provider).
- [ ] **Set auth redirect URLs** in the Supabase dashboard to your domains only.
- [ ] **Enable leaked-password protection** in Supabase Auth settings.
- [ ] **Decide on HSTS `preload`** — remove it unless every subdomain is HTTPS-ready.
- [ ] **Rotate all keys** before going live; never commit `.env`.
- [ ] **Enable 2FA** on Supabase, Vercel, and your Git host.
- [ ] **Run the Supabase Advisor** (Security lints) and clear findings.

---

## Reporting a vulnerability
Email `security@your-domain` with details. Please do not open a public issue.
