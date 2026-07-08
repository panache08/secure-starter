/** @type {import('next').NextConfig} */

// ---------------------------------------------------------------------------
// Static security headers applied to EVERY response.
// NOTE: Content-Security-Policy is NOT here — it is emitted per-request from
// middleware.ts so it can carry a fresh nonce (nonce-based CSP is far stronger
// than 'unsafe-inline'). Keeping the two in sync is intentional: static stuff
// here, the dynamic nonce'd CSP in middleware.
// ---------------------------------------------------------------------------
const securityHeaders = [
  // Force HTTPS for 2 years, including subdomains.
  // WARNING: `preload` commits ALL subdomains to HTTPS-only and is slow to undo.
  // Only keep `preload` if every current and future subdomain is HTTPS-ready.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Disallow being framed anywhere -> blocks clickjacking. (CSP frame-ancestors backs this up.)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop MIME-sniffing a response away from its declared type.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Send only the origin cross-origin -> no full-URL leakage.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Deny powerful browser features by default.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // Process isolation (Spectre-class mitigations). same-origin is the strong choice;
  // relax to same-origin-allow-popups only if you use OAuth popups that break.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Don't leak DNS lookups for links the user never clicks.
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
]

const nextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework -> less free recon for attackers.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
