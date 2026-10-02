# docgen

Branded A4 quotations, proposals, profiles and rate cards from a JSON file,
rendered to PDF with headless Chromium.

It replaces rebuilding each document by hand in HTML. You write the content
as data; docgen validates it, computes every total, lays it out across pages,
checks that nothing runs into a footer, and prints the PDF.

```bash
cd tools/docgen
npm install
npx playwright-core install chromium   # once, or set DOCGEN_CHROMIUM to an existing Chrome
npm run docgen -- render examples/quotation.json --out out
```

## Commands

| Command | What it does |
| --- | --- |
| `docgen validate <file.json…>` | Schema check only. No browser needed. |
| `docgen check <file.json…>` | Validate, paginate and run the overflow check. Writes nothing. |
| `docgen render <file.json…> [--out dir] [--html]` | All of the above, then write the PDF (and the final HTML with `--html`). |

`npm run examples` renders every file in `examples/` into `out/`.
`npm test` runs unit tests plus integration tests against real Chromium.

Exit code is non-zero if any file fails, so `check` can run in CI.

## Writing a document

A document is a theme, some metadata and a list of blocks. See `examples/`
for one of each kind; every value in them is a marked placeholder.

```jsonc
{
  "theme": "vanorika",            // themes/vanorika.json, or a path to your own .json
  "kind": "quotation",            // quotation | proposal | profile | rate-card
  "status": "draft",              // draft (default) stamps DRAFT on every page; set "final" to issue
  "title": "Website security audit",
  "reference": "VT-Q-0042",
  "issueDate": "2026-10-02",
  "validUntil": "2026-11-01",
  "currency": "USD",              // required when there is pricing; any ISO 4217 code
  "locale": "en-ZW",              // optional, number and date format; defaults to the theme's
  "client": { "name": "…", "attention": "…", "lines": ["…"], "logo": "logos/client.png", "accent": "#2F6F5E" },
  "cover": false,                 // true adds a full-bleed cover page (good for proposals)
  "blocks": [ … ]
}
```

| Block | Use it for |
| --- | --- |
| `heading` | Section heading with optional eyebrow (`"01  Scope"`). Always stays with what follows it. |
| `text` | Paragraphs. `**bold**` is the only inline formatting; everything else is escaped. |
| `list` | `bullet`, `numbered` or `check`. Numbering continues correctly across pages. |
| `facts` | Label and value rows: timelines, profile details. |
| `pricing` | Line items with quantity, unit and unit price. Subtotal, tax and total are computed. |
| `rates` | Rate card rows: service, basis (`per hour`, `per month`), price, optional `from`. |
| `acceptance` | Signature block. Parties default to the client and the issuer. |
| `pageBreak` | Force the next block onto a new page. |

### Money and tax

- Prices are written in major units (`1250` or `1250.50`), at most two decimals.
  Internally everything is integer cents, so the printed total always equals
  the printed lines plus tax.
- Every `pricing` block must say what happens with tax: either
  `"tax": { "label": "VAT", "ratePercent": 15 }` or `"tax": null` with a `note`
  explaining why none is charged. Leaving it out is a validation error, because
  getting tax wrong on a quote is expensive.
- Tax is rounded half up to the cent on the subtotal.

## Themes

A theme is the issuer's brand: company name, contact lines, footer line,
logo, locale and colours. `themes/vanorika.json` is the Vanorika theme. To
issue under another brand (for example a client that resells your work),
copy it, change the values and point `"theme"` at the new file.

Colour rules: `accent` must be readable as text on `paper` (the Vanorika gold
is darkened to `#8A6A17` for that reason; the bright `#C9A84C` is
`bandAccent`, used on the dark cover). Keep `paper` light for anything that
will be printed.

The client's own logo and accent colour are set per document under `client`,
and appear on the cover and the first page.

## Layout and the overflow check

Pages are fixed A4 sheets with a running header and a footer (company line,
draft notice, `Page n of N`; the cover is not numbered).

1. The document is split into units that must not break across a page: a
   paragraph, a list item, a table row, a signature block.
2. Each unit is measured in Chromium with the real fonts.
3. Units are packed onto pages. Headings and table headers stay with the next
   unit, the last line item stays with the totals, and a table that continues
   repeats its header row.
4. The final pages are rendered and checked: every element inside each page
   body must end above the footer line (with a 7 mm gap) and inside the right
   margin. Text that is clipped horizontally is reported too.
5. If a page still overflows (sub-pixel drift), its last unit is moved to the
   next page and the check runs again. If it cannot be fixed, the command fails
   and names the page and the text, and no PDF is written.

A single unit taller than a page (a huge paragraph) fails with a message
telling you to split it.

## Security

Documents are treated as untrusted input.

- All input is validated with zod before rendering; lengths, dates, colours,
  currencies and money precision are bounded.
- Every string is HTML-escaped. Only `**bold**` is interpreted.
- Logos must be `.svg`, `.png` or `.jpg` under 2 MB, inside the folder of the
  file that references them (no `../` escapes), and their bytes must match
  their extension.
- Fonts and images are embedded as data URIs. Chromium runs with JavaScript
  disabled, offline, with a CSP of `default-src 'none'`, and every non-data
  request aborted. Rendering a document cannot reach the network or the disk.

## Keeping client data out of git

`out/`, `documents/` and `*.pdf` are git-ignored. Keep real client documents
in `tools/docgen/documents/` (or anywhere outside the repo), not in
`examples/`.

## Fonts

Outfit, IBM Plex Mono and Bebas Neue, bundled from Fontsource (SIL Open Font
License). They are embedded in each PDF, so output looks identical on any
machine.
