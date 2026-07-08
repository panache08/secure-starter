import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ---------------------------------------------------------------------------
// Rate limiting.
// IMPORTANT: in-memory limiters DO NOT work on Vercel / serverless. Each
// invocation is an isolated instance, so an in-memory counter resets every
// request and gives ZERO real protection. This uses a SHARED store (Upstash
// Redis, HTTP-based, edge-friendly).
//
// Env required:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
// ---------------------------------------------------------------------------

const redis = Redis.fromEnv()

// General API limiter: 10 requests / 10s per identifier.
export const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: 'rl:api',
})

// Auth limiter: strict, to blunt credential-stuffing / brute force.
// 5 attempts / 60s per identifier.
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: true,
  prefix: 'rl:auth',
})

export class RateLimitError extends Error {
  constructor(public reset: number) {
    super('Rate limit exceeded')
    this.name = 'RateLimitError'
  }
}

// Throws RateLimitError when the identifier is over budget. Catch it in your
// route/action and return HTTP 429 with Retry-After.
export async function limitOrThrow(
  identifier: string,
  limiter: Ratelimit = apiRatelimit
) {
  const { success, reset } = await limiter.limit(identifier)
  if (!success) throw new RateLimitError(reset)
}

// ---------------------------------------------------------------------------
// Client identifier.
// SECURITY: do NOT trust the leftmost x-forwarded-for value — clients can set
// x-forwarded-for freely, so keying rate limits on it lets an attacker mint a
// new bucket every request and bypass the limit entirely. Read the header your
// EDGE PROXY sets and cannot be forged past:
//   - Vercel sets `x-real-ip` (single, trusted, its own edge).
//   - Behind another trusted proxy, use whatever it guarantees, or take the
//     RIGHTMOST XFF entry (closest to your infra), not the leftmost.
// If we genuinely can't identify the client, FAIL CLOSED to a single shared
// bucket named 'unknown' so we still throttle rather than handing out infinite
// fresh buckets — but log it, because it means the proxy config is wrong.
// ---------------------------------------------------------------------------
export function clientId(request: Request): string {
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  // Fallback for non-Vercel trusted proxies: take the RIGHTMOST XFF hop.
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) {
    const parts = fwd.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }

  return 'unknown'
}

// For auth flows, key on BOTH the account being targeted and the source, so one
// attacker can't lock out a victim, and one victim's account can't be sprayed
// from many IPs without each pair hitting the limit.
export function authId(request: Request, email: string): string {
  return `${clientId(request)}:${email.toLowerCase()}`
}
