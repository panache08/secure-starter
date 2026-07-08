import { headers } from 'next/headers'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Secure Starter',
  description: 'Security-first Next.js + Supabase starter.',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The CSP nonce minted in middleware.ts. Pass it to any inline <script> you
  // add so it satisfies the nonce-based Content-Security-Policy.
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="en">
      <body>
        {children}
        {/* Example of a nonce'd inline script — remove if unused. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: '' }} />
      </body>
    </html>
  )
}
