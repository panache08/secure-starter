import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options?: CookieOptions }

// ---------------------------------------------------------------------------
// Auth middleware + nonce-based Content-Security-Policy.
// Runs at the edge before any page/route handler. It does three things:
//   1. Mints a per-request CSP nonce and attaches a strict, nonce'd CSP.
//   2. Refreshes the Supabase session cookie.
//   3. Gate-keeps protected route prefixes for authenticated users only.
// ---------------------------------------------------------------------------

const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/api/private']

const isProd = process.env.NODE_ENV === 'production'

function buildCsp(nonce: string): string {
  // In production, scripts must carry the nonce (or be pulled in via
  // strict-dynamic by a nonce'd script). In dev, Next's HMR/eval needs
  // 'unsafe-eval', so we relax ONLY in dev.
  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`

  return [
    "default-src 'self'",
    scriptSrc,
    // style-src still allows inline styles: Next injects some, and nonce'ing
    // every style is impractical. Tighten to a nonce/hash if your UI allows.
    "style-src 'self' 'unsafe-inline'",
    // Lock img/connect to YOUR domains before launch — see SECURITY.md.
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

export async function middleware(request: NextRequest) {
  // Edge-safe random nonce.
  const nonce = crypto.randomUUID().replace(/-/g, '')
  const csp = buildCsp(nonce)

  // Propagate the nonce to the app via a request header so layouts can read it
  // (headers().get('x-nonce')) and stamp it onto any inline <script>.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  let response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: requestHeaders } })
          response.headers.set('Content-Security-Policy', csp)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: getUser() revalidates the token server-side. getSession() trusts
  // an unverified cookie and can be spoofed — never use it for authz.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', path)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Run on everything except static assets and images.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
