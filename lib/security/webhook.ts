// ---------------------------------------------------------------------------
// Webhook signature verification.
// An unverified webhook endpoint is a PUBLIC WRITE to your backend: anyone who
// finds the URL can POST a fake "payment succeeded" event. Every inbound
// webhook (Stripe, PayFast, Supabase, etc.) MUST be verified before you act.
//
// This implements the common HMAC-SHA256 pattern. Adapt the header name and
// signing string to your provider's spec (Stripe prepends a timestamp; PayFast
// uses an MD5 signature of the payload + passphrase; etc.).
// ---------------------------------------------------------------------------

// Constant-time compare to avoid leaking the signature via timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Verify a raw request body against a signature header.
// IMPORTANT: pass the RAW body string (await request.text()) — not a re-encoded
// JSON.stringify of the parsed object, which will not byte-match the signature.
export async function verifyWebhook(params: {
  rawBody: string
  signatureHeader: string | null
  secret: string
}): Promise<boolean> {
  const { rawBody, signatureHeader, secret } = params
  if (!signatureHeader || !secret) return false
  const expected = await hmacSha256Hex(secret, rawBody)
  return timingSafeEqual(signatureHeader.trim(), expected)
}
