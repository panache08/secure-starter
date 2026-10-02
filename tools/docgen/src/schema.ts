import { z } from 'zod'

// ---------------------------------------------------------------------------
// The document model. Every input file is parsed through these schemas before
// anything is rendered, so a typo in a price or a missing client name fails
// loudly at the boundary instead of producing a plausible-looking PDF.
//
// Money is written in major units (e.g. 1250 or 1250.50) and converted to
// integer cents internally. Totals are always computed, never typed by hand.
// ---------------------------------------------------------------------------

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  // Round-trip, because Date.parse happily rolls 2026-02-30 over to March 2.
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
  }, 'Not a real date')

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour like #C9A84C')

// Short single-line strings vs. longer prose. Bounds keep a stray paste from
// blowing up a layout and give the overflow check a sane upper limit to work in.
const line = (max = 160) => z.string().trim().min(1).max(max)
const prose = z.string().trim().min(1).max(4000)

/** At most two decimal places, non-negative, below a trillion. */
const money = z
  .number()
  .nonnegative()
  .max(1e12)
  .refine((n) => Number.isInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'At most 2 decimal places')

const quantity = z
  .number()
  .positive()
  .max(1e6)
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'At most 2 decimal places')

// ---- Blocks ---------------------------------------------------------------

const headingBlock = z.object({
  type: z.literal('heading'),
  text: line(120),
  eyebrow: line(60).optional(),
})

const textBlock = z.object({
  type: z.literal('text'),
  /** One string per paragraph. Supports **bold** only; everything else is escaped. */
  paragraphs: z.array(prose).min(1).max(30),
})

const listBlock = z.object({
  type: z.literal('list'),
  title: line(120).optional(),
  style: z.enum(['bullet', 'numbered', 'check']).default('bullet'),
  items: z.array(z.string().trim().min(1).max(600)).min(1).max(60),
})

const factsBlock = z.object({
  type: z.literal('facts'),
  title: line(120).optional(),
  items: z.array(z.object({ label: line(60), value: line(300) })).min(1).max(40),
})

const lineItem = z.object({
  description: line(200),
  detail: z.string().trim().max(600).optional(),
  quantity: quantity.default(1),
  unit: line(24).optional(),
  unitPrice: money,
})

const taxSchema = z.object({
  label: line(24).default('VAT'),
  /** Percentage, e.g. 15 or 15.5. Up to two decimals. */
  ratePercent: z
    .number()
    .positive()
    .max(100)
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'At most 2 decimal places'),
  /** Optional registration number printed beside the tax line. */
  registrationNumber: line(40).optional(),
})

const pricingBlock = z.object({
  type: z.literal('pricing'),
  title: line(120).optional(),
  items: z.array(lineItem).min(1).max(200),
  /**
   * `null` means tax is deliberately not charged (e.g. issuer not registered).
   * Omitting it is an error: tax treatment must always be an explicit decision.
   */
  tax: taxSchema.nullable(),
  /** Printed under the totals, e.g. "Vanorika is not VAT registered." */
  note: z.string().trim().max(400).optional(),
})

const ratesBlock = z.object({
  type: z.literal('rates'),
  title: line(120).optional(),
  rows: z
    .array(
      z.object({
        service: line(200),
        detail: z.string().trim().max(600).optional(),
        /** e.g. "per hour", "per month", "once off" */
        unit: line(40),
        price: money,
        /** Renders "from $X" when the price is a starting point. */
        from: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(120),
  note: z.string().trim().max(400).optional(),
})

const acceptanceBlock = z.object({
  type: z.literal('acceptance'),
  title: line(120).default('Acceptance'),
  statement: prose.optional(),
  /** Signature parties. Defaults to client and issuer. */
  parties: z.array(line(80)).min(1).max(3).optional(),
})

const pageBreakBlock = z.object({ type: z.literal('pageBreak') })

export const blockSchema = z.discriminatedUnion('type', [
  headingBlock,
  textBlock,
  listBlock,
  factsBlock,
  pricingBlock,
  ratesBlock,
  acceptanceBlock,
  pageBreakBlock,
])

// ---- Document -------------------------------------------------------------

export const documentKinds = ['quotation', 'proposal', 'profile', 'rate-card'] as const

export const documentSchema = z
  .object({
    /** Theme name, resolved to themes/<name>.json, or a path ending in .json. */
    theme: line(120),
    kind: z.enum(documentKinds),
    title: line(140),
    subtitle: line(240).optional(),
    /** "draft" stamps every page so a sample can never be mistaken for a real offer. */
    status: z.enum(['draft', 'final']).default('draft'),
    reference: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._\-/]{0,39}$/, 'Letters, digits, . _ - / only (max 40)')
      .optional(),
    issueDate: isoDate,
    validUntil: isoDate.optional(),
    /** ISO 4217 code. Required whenever the document carries a price. */
    currency: z.string().regex(/^[A-Z]{3}$/, 'ISO 4217 code, e.g. USD or ZAR').optional(),
    /** BCP 47 locale for numbers and dates. Falls back to the theme's locale. */
    locale: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/).optional(),
    client: z
      .object({
        name: line(160),
        attention: line(120).optional(),
        lines: z.array(line(160)).max(6).default([]),
        /** Client logo printed on the cover, path relative to this file. */
        logo: line(400).optional(),
        /** Optional client accent used for the "prepared for" mark. */
        accent: hexColor.optional(),
      })
      .optional(),
    /** Full-page cover before the content. Recommended for proposals. */
    cover: z.boolean().default(false),
    blocks: z.array(blockSchema).min(1).max(400),
  })
  .superRefine((doc, ctx) => {
    if (doc.blocks.every((b) => b.type === 'pageBreak')) {
      ctx.addIssue({ code: 'custom', path: ['blocks'], message: 'Needs at least one block with content' })
    }
    const priced = doc.blocks.some((b) => b.type === 'pricing' || b.type === 'rates')
    if (priced && !doc.currency) {
      ctx.addIssue({ code: 'custom', path: ['currency'], message: 'Required when the document has pricing or rates' })
    }
    if (doc.validUntil && doc.validUntil < doc.issueDate) {
      ctx.addIssue({ code: 'custom', path: ['validUntil'], message: 'Must not be before issueDate' })
    }
  })

export const themeSchema = z.object({
  name: line(60),
  company: z.object({
    name: line(120),
    /** Optional registered/legal name if it differs from the trading name. */
    legalName: line(160).optional(),
    tagline: line(120).optional(),
    contact: z.array(line(120)).max(6).default([]),
    /** One short line for the footer, e.g. "Harare, Zimbabwe". */
    footer: line(160).optional(),
  }),
  /** Path relative to the theme file. SVG, PNG or JPEG. Optional: a text wordmark is used otherwise. */
  logo: line(400).optional(),
  /** Render the company name as a typeset wordmark beside (or instead of) the logo. */
  wordmark: z.boolean().default(true),
  locale: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/).default('en-US'),
  colors: z.object({
    /** Main text. */
    ink: hexColor,
    /** Secondary text, captions. */
    muted: hexColor,
    /** Hairlines and table rules. */
    rule: hexColor,
    /** Page background. Keep light for anything that will be printed. */
    paper: hexColor,
    /** Brand accent for eyebrows, totals, highlights. */
    accent: hexColor,
    /** Dark brand band used on the cover and page header. */
    band: hexColor,
    /** Text colour on the band. */
    bandInk: hexColor,
    /** Accent on the band (can be brighter than `accent`, which must read on paper). */
    bandAccent: hexColor,
    /** Secondary text on the band. */
    bandMuted: hexColor,
  }),
  fonts: z
    .object({
      display: z.enum(['bebas-neue', 'outfit']).default('bebas-neue'),
    })
    .default({}),
})

export type DocumentInput = z.input<typeof documentSchema>
export type Doc = z.output<typeof documentSchema>
export type Block = z.output<typeof blockSchema>
export type Theme = z.output<typeof themeSchema>

/** Format zod issues as one readable line each, with the JSON path. */
export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => `  - ${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`)
    .join('\n')
}
