export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: '4rem auto', fontFamily: 'system-ui', lineHeight: 1.6 }}>
      <h1>Secure Starter</h1>
      <p>
        A security-first Next.js + Supabase baseline. See <code>SECURITY.md</code> for
        what is hardened and the pre-launch checklist.
      </p>
      <p>
        <a href="/login">Sign in</a> · <a href="/dashboard">Dashboard (protected)</a>
      </p>
    </main>
  )
}
