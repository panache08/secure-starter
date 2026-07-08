'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { authId, authRatelimit, limitOrThrow, RateLimitError } from '@/lib/security/rate-limit'
import { parseInput, signInSchema, signUpSchema } from '@/lib/validation'

// Server Actions that ACTUALLY apply the rate limiter + validation the kit
// ships. This closes the "limiter defined but never called" gap — every auth
// attempt is validated, then throttled per (source, email) pair before it ever
// reaches Supabase.

type ActionState = { error?: string } | undefined

// Reconstruct a minimal Request just to reuse clientId()/authId() header logic.
function requestFrom(h: Headers): Request {
  return new Request('http://internal', { headers: h })
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseInput(signInSchema, {
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.ok) return { error: 'Invalid email or password.' }

  const h = await headers()
  try {
    await limitOrThrow(authId(requestFrom(h), parsed.data.email), authRatelimit)
  } catch (e) {
    if (e instanceof RateLimitError) return { error: 'Too many attempts. Try again shortly.' }
    throw e
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  // Generic message: never reveal whether the email exists.
  if (error) return { error: 'Invalid email or password.' }

  redirect('/dashboard')
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseInput(signUpSchema, {
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
  })
  if (!parsed.ok) {
    const first = Object.values(parsed.errors).flat()[0]
    return { error: first ?? 'Please check your details.' }
  }

  const h = await headers()
  try {
    await limitOrThrow(authId(requestFrom(h), parsed.data.email), authRatelimit)
  } catch (e) {
    if (e instanceof RateLimitError) return { error: 'Too many attempts. Try again shortly.' }
    throw e
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  })
  if (error) return { error: 'Could not create the account.' }

  redirect('/login?checkEmail=1')
}
