import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookieToSet = { name: string; value: string; options?: CookieOptions }

// Server-side Supabase client, scoped to the request's cookies. Uses the ANON
// key, so Row Level Security still applies — this client can only see what the
// signed-in user is allowed to see. Use it in Server Components, Route Handlers,
// and Server Actions.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component (read-only cookies). Safe to ignore:
            // middleware.ts refreshes the session cookie on every request.
          }
        },
      },
    }
  )
}
