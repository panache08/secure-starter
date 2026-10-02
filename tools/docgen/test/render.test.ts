import assert from 'node:assert/strict'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import type { Browser } from 'playwright-core'
import { loadDocument, PACKAGE_ROOT } from '../src/load.js'
import { checkOverflow, launchBrowser, renderToPdf } from '../src/render.js'

// Integration tests: real Chromium, real fonts, real pagination.

let browser: Browser
before(async () => {
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
})

const fixture = (name: string) => path.join(PACKAGE_ROOT, name)

describe('render', () => {
  for (const file of ['examples/quotation.json', 'examples/proposal.json', 'examples/profile.json', 'examples/rate-card.json', 'test/fixtures/long-quotation.json']) {
    it(`${file} renders with no overflow`, async () => {
      const result = await renderToPdf(browser, await loadDocument(fixture(file)))
      assert.deepEqual(result.issues, [])
      assert.ok(result.pdf && result.pdf.subarray(0, 5).toString() === '%PDF-')
    })
  }

  it('repeats the table header and keeps totals with the last row', async () => {
    const result = await renderToPdf(browser, await loadDocument(fixture('test/fixtures/long-quotation.json')), { pdf: false })
    assert.ok(result.pages >= 3, `expected the fixture to span 3+ pages, got ${result.pages}`)
    const continued = result.html.match(/<thead class="is-cont">/g) ?? []
    assert.ok(continued.length >= 2, 'header should repeat on each continuation page')
    // The grand total and the last line item are on the same page.
    const lastPageWithTotal = result.html.split('<section').find((s) => s.includes('class="grand"'))!
    assert.ok(lastPageWithTotal.includes('Placeholder line item 46'))
  })

  it('escapes hostile client text', async () => {
    const loaded = await loadDocument(fixture('examples/quotation.json'))
    loaded.doc.client!.name = '<script>alert(1)</script>'
    const result = await renderToPdf(browser, loaded, { pdf: false })
    assert.ok(!result.html.includes('<script>alert(1)'))
    assert.ok(result.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  })
})

describe('overflow check', () => {
  it('reports content that runs into the footer', async () => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.setContent(`<style>.page{width:794px;height:400px;display:flex;flex-direction:column}.body{flex:1;min-height:0}.foot{height:40px}</style>
      <section class="page" data-page="1"><main class="body"><div style="height:500px">too tall</div></main><footer class="foot"></footer></section>`)
    const issues = await checkOverflow(page)
    await context.close()
    assert.equal(issues.length, 1)
    assert.equal(issues[0]!.kind, 'bottom')
    assert.equal(issues[0]!.page, 1)
  })

  it('rejects logos outside the document folder', async () => {
    const { loadImage } = await import('../src/assets.js')
    await assert.rejects(loadImage('../../package.json', fixture('examples')), /must be inside/)
    await assert.rejects(loadImage('../package.json', fixture('examples')), /must be inside/)
  })
})
