import { existsSync } from 'node:fs'
import { chromium, type Browser, type Page } from 'playwright-core'
import { embeddedFontCss } from './assets.js'
import type { Loaded } from './load.js'
import { paginate, type MeasuredUnit } from './paginate.js'
import { buildUnits, renderDocument, type Unit } from './template.js'

// ---------------------------------------------------------------------------
// Rendering pipeline:
//   1. flatten the document into units and measure them in Chromium
//   2. paginate (pure function)
//   3. render the real pages and run the overflow check
//   4. if a page overflows anyway (sub-pixel drift, font fallback), push its
//      last unit to the next page and try again; give up loudly after N tries
//   5. print to PDF
// The browser runs with JavaScript disabled and every network request
// blocked: documents are data, and rendering one must not reach anything.
// ---------------------------------------------------------------------------

export interface OverflowIssue {
  page: number
  kind: 'bottom' | 'right'
  /** How far past the edge, in CSS px (1px = 0.2646mm). */
  by: number
  text: string
}

export interface RenderResult {
  html: string
  pdf?: Buffer
  pages: number
  issues: OverflowIssue[]
}

const MAX_REFLOWS = 12

export async function launchBrowser(): Promise<Browser> {
  const executablePath = process.env.DOCGEN_CHROMIUM
  if (executablePath && !existsSync(executablePath)) {
    throw new Error(`DOCGEN_CHROMIUM points to ${executablePath}, which does not exist`)
  }
  try {
    return await chromium.launch({ executablePath: executablePath || undefined, headless: true })
  } catch (err) {
    if (executablePath) throw err
    // Fall back to an installed Google Chrome before giving up.
    try {
      return await chromium.launch({ channel: 'chrome', headless: true })
    } catch {
      throw new Error(
        'No Chromium found. Run `npx playwright-core install chromium`, or set DOCGEN_CHROMIUM to a Chrome/Chromium binary.',
      )
    }
  }
}

async function lockedDownPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ javaScriptEnabled: false, offline: true })
  const page = await context.newPage()
  await page.route('**/*', (route) => (route.request().url().startsWith('data:') ? route.continue() : route.abort()))
  await page.emulateMedia({ media: 'print' })
  return page
}

async function load(page: Page, html: string, measuring = false): Promise<void> {
  await page.setContent(measuring ? html.replace('<body>', '<body class="measuring">') : html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

async function measure(page: Page, loaded: Loaded, units: Unit[], fontCss: string): Promise<MeasuredUnit[]> {
  const all = units.map((_, i) => i)
  await load(page, renderDocument(loaded, units, [{ ids: all }], fontCss, { tagged: true }), true)
  const boxes = await page.evaluate((count) => {
    const out: { top: number; bottom: number }[] = []
    for (let i = 0; i < count; i++) {
      const el = document.querySelector(`[data-u="${i}"]`)
      if (!el) throw new Error(`unit ${i} missing from measurement`)
      const r = el.getBoundingClientRect()
      out.push({ top: r.top, bottom: r.bottom })
    }
    const body = document.querySelector('.body')!.getBoundingClientRect()
    return { out, end: body.bottom }
  }, units.length)

  const headHeight = new Map<number, number>()
  units.forEach((u, i) => {
    if (u.role === 'thead') headHeight.set(u.block, boxes.out[i]!.bottom - boxes.out[i]!.top)
  })

  return units.map((u, i) => {
    const box = boxes.out[i]!
    const next = boxes.out[i + 1]
    const own = box.bottom - box.top
    // Gap to the next unit, or the trailing block margin for the last one.
    const advance = next ? Math.max(own, next.top - box.top) : Math.max(own, boxes.end - box.top)
    const inTable = u.role === 'row' || u.role === 'totals'
    return {
      own,
      advance,
      keepWithNext: u.keepWithNext,
      breakBefore: u.breakBefore,
      continuationHead: inTable ? (headHeight.get(u.block) ?? 0) : 0,
      isHead: u.role === 'thead',
    }
  })
}

async function capacities(page: Page, loaded: Loaded, units: Unit[], fontCss: string) {
  // Two empty pages give the usable body height of a first and a later page.
  await load(page, renderDocument(loaded, units, [{ ids: [] }, { ids: [] }], fontCss, { tagged: false }))
  const [first, rest] = await page.evaluate(() =>
    Array.from(document.querySelectorAll('section.page:not(.page-cover) .body')).map((b) => b.getBoundingClientRect().height),
  )
  return { first: first!, rest: rest! }
}

/**
 * The overflow check. For every content page, nothing inside the body may
 * extend below the body's bottom edge (the line above the footer, minus its
 * gap) or past its right edge.
 */
export async function checkOverflow(page: Page): Promise<OverflowIssue[]> {
  return page.evaluate(() => {
    const issues: { page: number; kind: 'bottom' | 'right'; by: number; text: string }[] = []
    document.querySelectorAll<HTMLElement>('section.page').forEach((sheet, idx) => {
      const pageNo = Number(sheet.dataset.page ?? idx + 1)
      const body = sheet.querySelector('.body')
      if (!body) {
        // The cover: its content must stay inside the sheet itself.
        const s = sheet.getBoundingClientRect()
        for (const el of Array.from(sheet.querySelectorAll('*'))) {
          if (el.classList.contains('watermark')) continue
          const r = el.getBoundingClientRect()
          if (r.height > 0 && r.bottom > s.bottom + 0.5) {
            issues.push({ page: 0, kind: 'bottom', by: r.bottom - s.bottom, text: (el.textContent ?? '').trim().slice(0, 80) })
            break
          }
        }
        return
      }
      const limit = body.getBoundingClientRect()
      let worstBottom: { by: number; text: string } | null = null
      let worstRight: { by: number; text: string } | null = null
      for (const el of Array.from(body.querySelectorAll('*'))) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue
        const below = r.bottom - limit.bottom
        const right = r.right - limit.right
        const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
        if (below > 0.5 && (!worstBottom || below > worstBottom.by)) worstBottom = { by: below, text }
        if (right > 0.5 && (!worstRight || right > worstRight.by)) worstRight = { by: right, text }
        // Text wider than its own box (e.g. an unbreakable string) is clipped in print.
        if (el instanceof HTMLElement && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible') {
          const by = el.scrollWidth - el.clientWidth
          if (!worstRight || by > worstRight.by) worstRight = { by, text }
        }
      }
      if (worstBottom) issues.push({ page: pageNo, kind: 'bottom', ...worstBottom })
      if (worstRight) issues.push({ page: pageNo, kind: 'right', ...worstRight })
    })
    return issues
  })
}

export async function renderToPdf(
  browser: Browser,
  loaded: Loaded,
  opts: { pdf: boolean } = { pdf: true },
): Promise<RenderResult> {
  const fontCss = await embeddedFontCss()
  const page = await lockedDownPage(browser)
  try {
    const units = buildUnits(loaded)
    const measured = await measure(page, loaded, units, fontCss)
    const cap = await capacities(page, loaded, units, fontCss)

    let html = ''
    let pages: number[][] = []
    let issues: OverflowIssue[] = []
    for (let attempt = 0; attempt <= MAX_REFLOWS; attempt++) {
      pages = paginate(measured, cap)
      html = renderDocument(loaded, units, pages.map((ids) => ({ ids })), fontCss, { tagged: false })
      await load(page, html)
      issues = await checkOverflow(page)
      const bottom = issues.find((i) => i.kind === 'bottom' && i.page > 0)
      if (!bottom) break
      // Self-heal: start the overflowing page's last unit on the next page.
      const ids = pages[bottom.page - 1]!
      const last = ids[ids.length - 1]!
      if (ids.length < 2 || measured[last]!.breakBefore) break
      measured[last]!.breakBefore = true
    }

    if (issues.length > 0 || !opts.pdf) return { html, pages: pages.length, issues }
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true, outline: false })
    return { html, pdf, pages: pages.length, issues }
  } finally {
    await page.context().close()
  }
}
