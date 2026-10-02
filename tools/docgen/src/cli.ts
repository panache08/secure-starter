#!/usr/bin/env -S npx tsx
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { InputError, loadDocument } from './load.js'
import { PaginationError } from './paginate.js'
import { launchBrowser, renderToPdf } from './render.js'

const USAGE = `docgen: branded A4 documents from JSON

Usage:
  docgen render <file.json...> [--out <dir>] [--html]   Validate, paginate, check, write PDF
  docgen check  <file.json...>                          Validate and run the overflow check only
  docgen validate <file.json...>                        Schema check only (no browser)

Options:
  --out <dir>   Output directory (default: next to each input file)
  --html        Also write the final HTML next to the PDF, for inspection

Environment:
  DOCGEN_CHROMIUM   Path to a Chrome/Chromium binary (optional)
`

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string' },
      html: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  })
  const [command, ...files] = positionals
  if (values.help || !command || !['render', 'check', 'validate'].includes(command) || files.length === 0) {
    process.stdout.write(USAGE)
    return values.help ? 0 : 2
  }

  let failed = 0
  if (command === 'validate') {
    for (const file of files) {
      try {
        await loadDocument(file)
        console.log(`ok    ${file}`)
      } catch (err) {
        failed++
        console.error(`FAIL  ${file}\n${(err as Error).message}`)
      }
    }
    return failed ? 1 : 0
  }

  const browser = await launchBrowser()
  try {
    for (const file of files) {
      try {
        const loaded = await loadDocument(file)
        const result = await renderToPdf(browser, loaded, { pdf: command === 'render' })
        if (result.issues.length > 0) {
          failed++
          console.error(`FAIL  ${file}: content overflows the page`)
          for (const i of result.issues) {
            const where = i.page === 0 ? 'cover' : `page ${i.page}`
            console.error(`  - ${where}: ${Math.round(i.by * 0.2646 * 10) / 10}mm past the ${i.kind === 'bottom' ? 'footer line' : 'right margin'} near "${i.text}"`)
          }
          continue
        }
        if (command === 'check') {
          console.log(`ok    ${file} (${result.pages} page${result.pages === 1 ? '' : 's'})`)
          continue
        }
        const outDir = values.out ? path.resolve(values.out) : path.dirname(path.resolve(file))
        await mkdir(outDir, { recursive: true })
        const base = path.join(outDir, path.basename(file, path.extname(file)))
        await writeFile(`${base}.pdf`, result.pdf!)
        if (values.html) await writeFile(`${base}.html`, result.html)
        const draft = loaded.doc.status === 'draft' ? '  [DRAFT watermark]' : ''
        console.log(`ok    ${path.relative(process.cwd(), base)}.pdf (${result.pages} page${result.pages === 1 ? '' : 's'})${draft}`)
      } catch (err) {
        failed++
        const known = err instanceof InputError || err instanceof PaginationError
        console.error(`FAIL  ${file}\n${known ? (err as Error).message : (err as Error).stack}`)
      }
    }
  } finally {
    await browser.close()
  }
  return failed ? 1 : 0
}

main().then(
  (code) => process.exit(code),
  (err: Error) => {
    console.error(err.message)
    process.exit(1)
  },
)
