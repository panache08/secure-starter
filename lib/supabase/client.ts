import { createBrowserClient } from '@supabase/ssr'

// Browser Supabase client. Uses the ANON key (safe to expose). RLS is your
// enforcement boundary here — assume everything this client can reach is
// public to the signed-in user.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
