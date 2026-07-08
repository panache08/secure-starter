import { z } from 'zod'

// ---------------------------------------------------------------------------
// Input validation. Parse, don't trust. Validate EVERY external input at the
// boundary — request bodies, query params, form data, webhook payloads. Zod
// gives you a runtime schema and a static type from one definition.
// ---------------------------------------------------------------------------

export const emailSchema = z.string().trim().toLowerCase().email().max(254)

// 12+ chars minimum. Length beats arbitrary complexity rules for real-world
// resistance. Enable Supabase's leaked-password (HIBP) check on top of this.
export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(128, 'Too long')

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1, 'Name is required').max(100),
})

export const signInSchema = z.object({
  email: emailSchema,
  // Do NOT enforce the 12-char policy on sign-in: it leaks your policy and
  // rejects legitimate older passwords. Just bound the length.
  password: z.string().min(1).max(128),
})

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
})

// Parse unknown input -> typed data or structured errors. Never pass raw
// request JSON straight into a DB call — run it through this first.
export function parseInput<T extends z.ZodTypeAny>(schema: T, data: unknown) {
  const result = schema.safeParse(data)
  if (!result.success) {
    return { ok: false as const, errors: result.error.flatten().fieldErrors }
  }
  return { ok: true as const, data: result.data as z.infer<T> }
}
