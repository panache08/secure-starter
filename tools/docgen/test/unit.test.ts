import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { html, inline } from '../src/html.js'
import { computeTotals, lineTotalCents, taxCents } from '../src/money.js'
import { paginate, PaginationError, type MeasuredUnit } from '../src/paginate.js'
import { documentSchema } from '../src/schema.js'

describe('money', () => {
  it('avoids float drift', () => {
    // 0.1 + 0.2 style errors would show up here as 30.000000000000004.
    assert.equal(lineTotalCents(3, 0.1), 30)
    assert.equal(lineTotalCents(3, 33.33), 9999)
    assert.equal(lineTotalCents(2.5, 40), 10000)
  })
  it('rounds tax half up to the cent', () => {
    assert.equal(taxCents(432250, 15.5), 66999) // 669.9875 -> 669.99
    assert.equal(taxCents(100, 15), 15)
    assert.equal(taxCents(1, 50), 1) // 0.5c -> 1c
  })
  it('total equals the sum of printed lines plus tax', () => {
    const t = computeTotals(
      [
        { quantity: 1, unitPrice: 100 },
        { quantity: 3, unitPrice: 33.33 },
      ],
      15,
    )
    assert.deepEqual(t, { lines: [10000, 9999], subtotal: 19999, tax: 3000, total: 22999 })
    assert.equal(computeTotals([{ quantity: 1, unitPrice: 10 }], null).tax, 0)
  })
})

describe('html', () => {
  it('escapes interpolations', () => {
    assert.equal(html`<p>${'<img src=x onerror=alert(1)>'}</p>`.value, '<p>&lt;img src=x onerror=alert(1)&gt;</p>')
  })
  it('allows only **bold** inline', () => {
    assert.equal(inline('**50%** <b>x</b>').value, '<strong>50%</strong> &lt;b&gt;x&lt;/b&gt;')
  })
})

describe('schema', () => {
  const base = {
    theme: 'vanorika',
    kind: 'quotation',
    title: 'T',
    issueDate: '2026-10-02',
    blocks: [{ type: 'pricing', items: [{ description: 'x', unitPrice: 1 }], tax: null }],
  }
  it('requires a currency when there is pricing', () => {
    assert.equal(documentSchema.safeParse(base).success, false)
    assert.equal(documentSchema.safeParse({ ...base, currency: 'USD' }).success, true)
  })
  it('requires an explicit tax decision', () => {
    const noTax = { ...base, currency: 'USD', blocks: [{ type: 'pricing', items: [{ description: 'x', unitPrice: 1 }] }] }
    assert.equal(documentSchema.safeParse(noTax).success, false)
  })
  it('rejects sub-cent prices and impossible dates', () => {
    const subCent = { ...base, currency: 'USD', blocks: [{ type: 'pricing', items: [{ description: 'x', unitPrice: 1.005 }], tax: null }] }
    assert.equal(documentSchema.safeParse(subCent).success, false)
    assert.equal(documentSchema.safeParse({ ...base, currency: 'USD', issueDate: '2026-02-30' }).success, false)
  })
  it('defaults to draft so nothing is final by accident', () => {
    const parsed = documentSchema.parse({ ...base, currency: 'USD' })
    assert.equal(parsed.status, 'draft')
  })
})

describe('paginate', () => {
  const u = (own: number, extra: Partial<MeasuredUnit> = {}): MeasuredUnit => ({
    own,
    advance: own + 10,
    keepWithNext: false,
    breakBefore: false,
    continuationHead: 0,
    isHead: false,
    ...extra,
  })

  it('fills pages greedily, ignoring the trailing gap of the last unit', () => {
    // 3 x 100 own + 2 gaps = 320 fits exactly on a 320 page.
    assert.deepEqual(paginate([u(100), u(100), u(100), u(100)], { first: 320, rest: 320 }), [[0, 1, 2], [3]])
  })
  it('uses a smaller first page', () => {
    assert.deepEqual(paginate([u(100), u(100), u(100)], { first: 100, rest: 400 }), [[0], [1, 2]])
  })
  it('moves a keep-with-next chain as one piece', () => {
    const units = [u(100), u(50, { keepWithNext: true }), u(100)]
    assert.deepEqual(paginate(units, { first: 250, rest: 250 }), [[0], [1, 2]])
  })
  it('honours forced breaks', () => {
    assert.deepEqual(paginate([u(10), u(10, { breakBefore: true })], { first: 500, rest: 500 }), [[0], [1]])
  })
  it('reserves room for a repeated table header', () => {
    const units = [u(30, { isHead: true, keepWithNext: true }), u(100, { continuationHead: 30 }), u(100, { continuationHead: 30 })]
    // Page 2 starts mid-table: 30 header + 100 row = 130 > 120, so it must not fit the second row on a 120 page.
    assert.throws(() => paginate(units, { first: 160, rest: 120 }), PaginationError)
    assert.deepEqual(paginate(units, { first: 160, rest: 130 }), [[0, 1], [2]])
  })
  it('fails loudly when one unit is taller than a page', () => {
    assert.throws(() => paginate([u(600)], { first: 500, rest: 500 }), PaginationError)
  })
})
