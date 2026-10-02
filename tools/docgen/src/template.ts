import { html, inline, raw, type SafeHtml } from './html.js'
import type { Loaded } from './load.js'
import { computeTotals, formatMoney, formatPercent, formatQuantity, toCents } from './money.js'
import type { Block } from './schema.js'
import { STYLES } from './styles.js'

// ---------------------------------------------------------------------------
// Templates. A document is flattened into "units": the smallest pieces that
// may not be split across a page (a paragraph, a list item, a table row).
// The paginator decides which units go on which page; this module renders
// units, groups them back into their blocks per page, and wraps pages.
// ---------------------------------------------------------------------------

export type UnitRole = 'masthead' | 'whole' | 'title' | 'item' | 'thead' | 'row' | 'totals'

export interface Unit {
  /** Index into Loaded.doc.blocks, or -1 for the first-page masthead. */
  block: number
  role: UnitRole
  /** Position among the block's items/rows, for numbered list continuation. */
  index: number
  keepWithNext: boolean
  breakBefore: boolean
  html: SafeHtml
}

const KIND_LABEL: Record<string, string> = {
  quotation: 'Quotation',
  proposal: 'Proposal',
  profile: 'Profile',
  'rate-card': 'Rate card',
}

export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  )
}

// ---- Units ----------------------------------------------------------------

export function buildUnits(loaded: Loaded): Unit[] {
  const { doc } = loaded
  const units: Unit[] = []
  const push = (u: Omit<Unit, 'breakBefore'>) => units.push({ ...u, breakBefore: false })

  if (!doc.cover) push({ block: -1, role: 'masthead', index: 0, keepWithNext: true, html: masthead(loaded) })

  let pendingBreak = false
  doc.blocks.forEach((block, b) => {
    const start = units.length
    if (block.type === 'pageBreak') {
      pendingBreak = true
      return
    }
    for (const u of blockUnits(block, b, loaded)) push(u)
    if (pendingBreak && units[start]) units[start].breakBefore = true
    pendingBreak = false
  })
  return units
}

function blockUnits(block: Exclude<Block, { type: 'pageBreak' }>, b: number, loaded: Loaded): Omit<Unit, 'breakBefore'>[] {
  const out: Omit<Unit, 'breakBefore'>[] = []
  const title = (text: string | undefined) => {
    if (text) out.push({ block: b, role: 'title', index: 0, keepWithNext: true, html: html`<h3 class="b-title">${text}</h3>` })
  }
  const { locale, doc } = loaded
  const money = (cents: number) => formatMoney(cents, doc.currency ?? 'USD', locale)

  switch (block.type) {
    case 'heading':
      out.push({
        block: b,
        role: 'whole',
        index: 0,
        keepWithNext: true,
        html: html`<div class="b-heading">${block.eyebrow ? html`<p class="eyebrow">${block.eyebrow}</p>` : ''}<h2>${block.text}</h2></div>`,
      })
      break

    case 'text':
      block.paragraphs.forEach((p, i) => out.push({ block: b, role: 'item', index: i, keepWithNext: false, html: html`<p>${inline(p)}</p>` }))
      break

    case 'list':
      title(block.title)
      block.items.forEach((item, i) =>
        out.push({
          block: b,
          role: 'item',
          index: i,
          keepWithNext: false,
          html: block.style === 'numbered' ? html`<li data-n="${String(i + 1).padStart(2, '0')}">${inline(item)}</li>` : html`<li>${inline(item)}</li>`,
        }),
      )
      break

    case 'facts':
      title(block.title)
      block.items.forEach((f, i) =>
        out.push({
          block: b,
          role: 'row',
          index: i,
          keepWithNext: false,
          html: html`<div class="fact"><dt>${f.label}</dt><dd>${inline(f.value)}</dd></div>`,
        }),
      )
      break

    case 'pricing': {
      const totals = computeTotals(block.items, block.tax?.ratePercent ?? null)
      title(block.title)
      out.push({
        block: b,
        role: 'thead',
        index: 0,
        keepWithNext: true,
        html: html`<thead><tr><th class="c-desc">Description</th><th class="c-num">Qty</th><th class="c-num">Unit price</th><th class="c-num">Amount</th></tr></thead>`,
      })
      block.items.forEach((item, i) =>
        out.push({
          block: b,
          role: 'row',
          index: i,
          // The last line item stays with the totals so a total never sits alone.
          keepWithNext: i === block.items.length - 1,
          html: html`<tbody><tr>
            <td class="c-desc"><span class="d">${item.description}</span>${item.detail ? html`<span class="s">${inline(item.detail)}</span>` : ''}</td>
            <td class="c-num">${formatQuantity(item.quantity, locale)}${item.unit ? html`<span class="u">${item.unit}</span>` : ''}</td>
            <td class="c-num">${money(toCents(item.unitPrice))}</td>
            <td class="c-num">${money(totals.lines[i] ?? 0)}</td>
          </tr></tbody>`,
        }),
      )
      const tax = block.tax
      out.push({
        block: b,
        role: 'totals',
        index: 0,
        keepWithNext: false,
        html: html`<tbody class="totals">
          ${tax
            ? html`<tr><td colspan="3">Subtotal</td><td class="c-num">${money(totals.subtotal)}</td></tr>
                <tr><td colspan="3">${tax.label} ${formatPercent(tax.ratePercent, locale)}${tax.registrationNumber ? html`<span class="u">Reg. ${tax.registrationNumber}</span>` : ''}</td><td class="c-num">${money(totals.tax)}</td></tr>`
            : ''}
          <tr class="grand"><td colspan="3">Total${tax ? html` incl. ${tax.label}` : ''} <span class="u">${doc.currency}</span></td><td class="c-num">${money(totals.total)}</td></tr>
          ${block.note ? html`<tr class="note"><td colspan="4">${inline(block.note)}</td></tr>` : ''}
        </tbody>`,
      })
      break
    }

    case 'rates':
      title(block.title)
      out.push({
        block: b,
        role: 'thead',
        index: 0,
        keepWithNext: true,
        html: html`<thead><tr><th class="c-desc">Service</th><th class="c-unit">Basis</th><th class="c-num">Price</th></tr></thead>`,
      })
      block.rows.forEach((r, i) =>
        out.push({
          block: b,
          role: 'row',
          index: i,
          keepWithNext: false,
          html: html`<tbody><tr>
            <td class="c-desc"><span class="d">${r.service}</span>${r.detail ? html`<span class="s">${inline(r.detail)}</span>` : ''}</td>
            <td class="c-unit">${r.unit}</td>
            <td class="c-num">${r.from ? html`<span class="u from">from</span>` : ''}${money(toCents(r.price))}</td>
          </tr></tbody>`,
        }),
      )
      if (block.note) {
        out.push({ block: b, role: 'totals', index: 0, keepWithNext: false, html: html`<tbody class="totals"><tr class="note"><td colspan="3">${inline(block.note)}</td></tr></tbody>` })
      }
      break

    case 'acceptance': {
      const parties = block.parties ?? [doc.client?.name ?? 'Client', loaded.theme.company.name]
      out.push({
        block: b,
        role: 'whole',
        index: 0,
        keepWithNext: false,
        html: html`<div class="b-accept">
          <h3 class="b-title">${block.title}</h3>
          ${block.statement ? html`<p>${inline(block.statement)}</p>` : ''}
          <div class="sigs">${parties.map(
            (p) => html`<div class="sig"><p class="party">${p}</p>
              <div class="sl"><span>Name</span></div><div class="sl"><span>Signature</span></div><div class="sl"><span>Date</span></div></div>`,
          )}</div>
        </div>`,
      })
      break
    }
  }
  return out
}

// ---- Grouping units back into blocks ---------------------------------------

/**
 * Render a run of units on one page. Consecutive units from the same block
 * share one container; a table that continues from the previous page gets
 * its header row repeated.
 */
export function renderFlow(loaded: Loaded, units: Unit[], ids: number[], tagged: boolean): SafeHtml {
  const groups: number[][] = []
  for (const id of ids) {
    const last = groups[groups.length - 1]
    const unit = units[id]!
    if (last && units[last[0]!]!.block === unit.block && unit.block !== -1) last.push(id)
    else groups.push([id])
  }

  return html`${groups.map((group) => {
    const first = units[group[0]!]!
    if (first.block === -1) return tag(first.html, group[0]!, tagged, 'div')
    const block = loaded.doc.blocks[first.block]!
    const titleIds = group.filter((id) => units[id]!.role === 'title')
    const bodyIds = group.filter((id) => units[id]!.role !== 'title')
    const titles = titleIds.map((id) => tag(units[id]!.html, id, tagged, 'div'))

    switch (block.type) {
      case 'list': {
        // Numbered items carry their own number (data-n), so a list that
        // continues on the next page keeps counting correctly.
        const items = bodyIds.map((id) => tagInto(units[id]!.html, id, tagged))
        const list = block.style === 'numbered' ? html`<ol class="l-numbered">${items}</ol>` : html`<ul class="l-${block.style}">${items}</ul>`
        return html`<div class="block b-list">${titles}${bodyIds.length ? list : ''}</div>`
      }
      case 'facts':
        return html`<div class="block b-facts">${titles}${bodyIds.length ? html`<dl>${bodyIds.map((id) => tagInto(units[id]!.html, id, tagged))}</dl>` : ''}</div>`
      case 'pricing':
      case 'rates': {
        const head = units.findIndex((u) => u.block === first.block && u.role === 'thead')
        const hasHead = bodyIds.some((id) => units[id]!.role === 'thead')
        const continued = !hasHead && bodyIds.length > 0
        const parts = bodyIds.map((id) => tagInto(units[id]!.html, id, tagged))
        const cols =
          block.type === 'pricing'
            ? raw('<colgroup><col class="w-desc"><col class="w-qty"><col class="w-money"><col class="w-money"></colgroup>')
            : raw('<colgroup><col class="w-desc"><col class="w-unit"><col class="w-money"></colgroup>')
        return html`<div class="block b-table">${titles}${
          bodyIds.length
            ? html`<table class="t-${block.type}">${cols}${continued ? tagInto(units[head]!.html, -1, false, 'is-cont') : ''}${parts}</table>`
            : ''
        }</div>`
      }
      case 'text':
        return html`<div class="block b-text">${bodyIds.map((id) => tag(units[id]!.html, id, tagged, 'div'))}</div>`
      default:
        return html`<div class="block">${titles}${bodyIds.map((id) => tag(units[id]!.html, id, tagged, 'div'))}</div>`
    }
  })}`
}

/** Wrap in a measurable element carrying the unit id. */
function tag(content: SafeHtml, id: number, tagged: boolean, el: 'div'): SafeHtml {
  return tagged ? raw(`<${el} class="u" data-u="${id}">${content.value}</${el}>`) : content
}

/** Add data-u (and optional class) to the outermost element of a unit. */
function tagInto(content: SafeHtml, id: number, tagged: boolean, extraClass?: string): SafeHtml {
  let attrs = ''
  if (tagged && id >= 0) attrs += ` data-u="${id}"`
  if (extraClass) attrs += ` class="${extraClass}"`
  if (!attrs) return content
  return raw(content.value.replace(/^(\s*<[a-z]+)/i, `$1${attrs}`))
}

// ---- Page chrome ------------------------------------------------------------

function brandLockup(loaded: Loaded, onBand: boolean): SafeHtml {
  const { theme, themeLogo } = loaded
  return html`<div class="brand${onBand ? ' on-band' : ''}">
    ${themeLogo ? html`<img class="mark" src="${themeLogo}" alt="">` : ''}
    ${theme.wordmark ? html`<div class="wordmark"><span class="wm-name">${theme.company.name}</span>${theme.company.tagline ? html`<span class="wm-tag">${theme.company.tagline}</span>` : ''}</div>` : ''}
  </div>`
}

function metaCells(loaded: Loaded): SafeHtml {
  const { doc, locale } = loaded
  const cell = (label: string, value: SafeHtml | string, cls = '') =>
    html`<div class="cell${cls}"><p class="label">${label}</p><div class="value">${value}</div></div>`
  return html`
    ${doc.client
      ? cell(
          'Prepared for',
          html`<p class="strong">${doc.client.name}</p>${doc.client.attention ? html`<p>Attn: ${doc.client.attention}</p>` : ''}${doc.client.lines.map((l) => html`<p>${l}</p>`)}`,
          ' client',
        )
      : ''}
    ${cell('Issued', formatDate(doc.issueDate, locale))}
    ${doc.validUntil ? cell('Valid until', formatDate(doc.validUntil, locale)) : ''}
    ${doc.reference ? cell('Reference', doc.reference) : ''}`
}

function eyebrowText(loaded: Loaded): string {
  return KIND_LABEL[loaded.doc.kind] ?? loaded.doc.kind
}

function masthead(loaded: Loaded): SafeHtml {
  const { theme, doc, clientLogo } = loaded
  return html`<div class="masthead">
    <div class="mh-top">
      ${brandLockup(loaded, false)}
      <div class="contact">${theme.company.contact.map((c) => html`<p>${c}</p>`)}</div>
    </div>
    <div class="mh-title">
      <p class="eyebrow">${eyebrowText(loaded)}</p>
      <h1>${doc.title}</h1>
      ${doc.subtitle ? html`<p class="subtitle">${doc.subtitle}</p>` : ''}
    </div>
    <div class="meta">${metaCells(loaded)}${clientLogo ? html`<img class="client-logo" src="${clientLogo}" alt="">` : ''}</div>
  </div>`
}

function cover(loaded: Loaded): SafeHtml {
  const { doc, theme, clientLogo, locale } = loaded
  const accent = doc.client?.accent
  return html`<section class="page page-cover">
    <div class="cv-top">${brandLockup(loaded, true)}<div class="contact">${theme.company.contact.map((c) => html`<p>${c}</p>`)}</div></div>
    <div class="cv-main">
      <p class="eyebrow">${eyebrowText(loaded)}${doc.reference ? html`<span class="ref">${doc.reference}</span>` : ''}</p>
      <h1>${doc.title}</h1>
      ${doc.subtitle ? html`<p class="subtitle">${doc.subtitle}</p>` : ''}
    </div>
    <div class="cv-foot">
      ${doc.client
        ? html`<div class="cv-client"${accent ? raw(` style="--client:${accent}"`) : ''}>
            ${clientLogo ? html`<img class="client-logo" src="${clientLogo}" alt="">` : ''}
            <div><p class="label">Prepared for</p><p class="strong">${doc.client.name}</p>${doc.client.attention ? html`<p>Attn: ${doc.client.attention}</p>` : ''}</div>
          </div>`
        : ''}
      <div class="cv-dates">
        <div><p class="label">Issued</p><p>${formatDate(doc.issueDate, locale)}</p></div>
        ${doc.validUntil ? html`<div><p class="label">Valid until</p><p>${formatDate(doc.validUntil, locale)}</p></div>` : ''}
      </div>
    </div>
    ${doc.status === 'draft' ? html`<div class="watermark" aria-hidden="true">Draft</div>` : ''}
  </section>`
}

function runningHeader(loaded: Loaded): SafeHtml {
  const { doc, theme, themeLogo } = loaded
  return html`<header class="run">
    <div class="run-l">${themeLogo ? html`<img class="mark" src="${themeLogo}" alt="">` : ''}<span>${theme.company.name}</span></div>
    <div class="run-r">${doc.title}${doc.reference ? html`<span class="ref">${doc.reference}</span>` : ''}</div>
  </header>`
}

function footer(loaded: Loaded, n: number, total: number): SafeHtml {
  const { theme, doc } = loaded
  return html`<footer class="foot">
    <span>${theme.company.footer ?? theme.company.legalName ?? theme.company.name}</span>
    ${doc.status === 'draft' ? html`<span class="draft">Draft. Not an offer.</span>` : ''}
    <span class="pg">Page ${n} of ${total}</span>
  </footer>`
}

export interface PageSpec {
  ids: number[]
}

/** The full HTML document. `tagged` adds data-u attributes for measurement. */
export function renderDocument(
  loaded: Loaded,
  units: Unit[],
  pages: PageSpec[],
  fontCss: string,
  opts: { tagged: boolean },
): string {
  const { doc, theme } = loaded
  const hasMasthead = !doc.cover
  const body = html`
    ${doc.cover ? cover(loaded) : ''}
    ${pages.map((page, i) => {
      const first = i === 0 && hasMasthead
      return html`<section class="page ${first ? 'page-first' : 'page-cont'}" data-page="${i + 1}">
        ${first ? '' : runningHeader(loaded)}
        <main class="body">${renderFlow(loaded, units, page.ids, opts.tagged)}</main>
        ${footer(loaded, i + 1, pages.length)}
        ${doc.status === 'draft' ? html`<div class="watermark" aria-hidden="true">Draft</div>` : ''}
      </section>`
    })}`

  const c = theme.colors
  const vars = `:root{--ink:${c.ink};--muted:${c.muted};--rule:${c.rule};--paper:${c.paper};--accent:${c.accent};--band:${c.band};--band-ink:${c.bandInk};--band-accent:${c.bandAccent};--band-muted:${c.bandMuted};--display:${theme.fonts.display === 'bebas-neue' ? "'Bebas Neue'" : "'Outfit'"};}`

  return `<!doctype html>
<html lang="${loaded.locale.split('-')[0]}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'">
<title>${html`${doc.title}`.value}</title>
<style>${fontCss}
${vars}
${STYLES}</style>
</head>
<body>${body.value}</body>
</html>`
}
