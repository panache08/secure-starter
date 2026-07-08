import { createClient } from '@/lib/supabase/server'

// Protected by middleware.ts (redirects unauthenticated users to /login).
// We STILL re-check getUser() here: defense in depth — never rely on the
// middleware alone for the authz decision inside the page.
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main style={{ maxWidth: 640, margin: '4rem auto', fontFamily: 'system-ui' }}>
      <h1>Dashboard</h1>
      <p>Signed in as {user?.email ?? 'unknown'}.</p>
    </main>
  )
}
