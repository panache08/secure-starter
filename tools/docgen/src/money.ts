// ---------------------------------------------------------------------------
// Money arithmetic in integer cents. Floats are only touched at the boundary
// (schema input -> cents) and at the end (cents -> formatted string), so a
// quotation total always equals the sum of its printed lines.
// ---------------------------------------------------------------------------

/** 1250.5 -> 125050. Input is already validated to two decimals. */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/** Quantity in hundredths: 1.5 -> 150. */
function toHundredths(qty: number): number {
  return Math.round(qty * 100)
}

/** Divide and round half away from zero, on integers only. */
function divRound(numerator: number, denominator: number): number {
  const q = Math.floor(numerator / denominator)
  const r = numerator - q * denominator
  return 2 * r >= denominator ? q + 1 : q
}

export function lineTotalCents(quantity: number, unitPrice: number): number {
  return divRound(toHundredths(quantity) * toCents(unitPrice), 100)
}

/** Tax on a subtotal, rate given as a percentage with up to two decimals. */
export function taxCents(subtotalCents: number, ratePercent: number): number {
  const basisPointsTimes100 = Math.round(ratePercent * 100) // 15.5% -> 1550
  return divRound(subtotalCents * basisPointsTimes100, 10_000)
}

export interface Totals {
  lines: number[]
  subtotal: number
  tax: number
  total: number
}

export function computeTotals(
  items: ReadonlyArray<{ quantity: number; unitPrice: number }>,
  ratePercent: number | null,
): Totals {
  const lines = items.map((i) => lineTotalCents(i.quantity, i.unitPrice))
  const subtotal = lines.reduce((a, b) => a + b, 0)
  const tax = ratePercent === null ? 0 : taxCents(subtotal, ratePercent)
  if (!Number.isSafeInteger(subtotal + tax)) throw new Error('Total exceeds safe integer range')
  return { lines, subtotal, tax, total: subtotal + tax }
}

export function formatMoney(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100)
}

export function formatQuantity(qty: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(qty)
}

export function formatPercent(ratePercent: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(ratePercent) + '%'
}
