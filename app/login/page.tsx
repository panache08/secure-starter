'use client'

import { useActionState } from 'react'
import { signIn } from './actions'

// Minimal login form wired to the rate-limited, validated server action via
// useActionState (the action returns { error } for display). Swap in your own
// UI; keep the server action as the boundary.
export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, undefined)

  return (
    <main style={{ maxWidth: 380, margin: '4rem auto', fontFamily: 'system-ui' }}>
      <h1>Sign in</h1>
      <form action={formAction} style={{ display: 'grid', gap: 12 }}>
        <input name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        <input name="password" type="password" placeholder="Password" required autoComplete="current-password" />
        <button type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
        {state?.error && <p style={{ color: 'crimson' }} role="alert">{state.error}</p>}
      </form>
    </main>
  )
}
