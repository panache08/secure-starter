// Print stylesheet. Theme colours arrive as CSS variables (see template.ts).
// All sizes are in mm/pt so the layout maps 1:1 to the A4 sheet.

export const STYLES = String.raw`
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #E9E9EC; }
body {
  font-family: 'Outfit', system-ui, sans-serif;
  font-weight: 400; font-size: 9.6pt; line-height: 1.55;
  color: var(--ink);
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
  font-kerning: normal;
}
p { margin: 0; }
strong { font-weight: 600; }

/* ---- Sheet ------------------------------------------------------------- */
.page {
  width: 210mm; height: 297mm;
  margin: 0 auto 8mm; background: var(--paper);
  padding: 15mm 18mm 0;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
  break-after: page;
}
.page:last-child { break-after: auto; margin-bottom: 0; }
@media print { html, body { background: none; } .page { margin: 0; } }

.body { flex: 1 1 auto; min-height: 0; margin-bottom: 7mm; position: relative; }
/* Measurement mode: one tall page, natural height. */
.measuring .page { height: auto; overflow: visible; }
.measuring .body { flex: none; }

.foot {
  flex: none; height: 13mm;
  border-top: 0.5pt solid var(--rule);
  display: flex; align-items: flex-start; justify-content: space-between; gap: 6mm;
  padding-top: 3mm;
  font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 6.6pt; letter-spacing: 0.04em;
  color: var(--muted);
}
.foot .draft { color: #A1361F; letter-spacing: 0.12em; text-transform: uppercase; }
.foot .pg { white-space: nowrap; font-variant-numeric: tabular-nums; }

.watermark {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%) rotate(-32deg);
  font-family: var(--display); font-size: 150pt; letter-spacing: 0.08em; text-transform: uppercase;
  color: rgba(161, 54, 31, 0.07); pointer-events: none; white-space: nowrap; z-index: 2;
}
.page-cover .watermark { color: rgba(255, 255, 255, 0.05); }

/* ---- Shared type --------------------------------------------------------- */
.eyebrow, .label {
  font-family: 'IBM Plex Mono', ui-monospace, monospace; font-weight: 500;
  font-size: 6.8pt; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--accent);
}
.label { color: var(--muted); letter-spacing: 0.16em; margin-bottom: 1.2mm; white-space: nowrap; }
.strong { font-weight: 600; }
.ref { margin-left: 3mm; color: var(--muted); letter-spacing: 0.08em; }

.brand { display: flex; align-items: center; gap: 3.2mm; }
.brand .mark { width: 11mm; height: 11mm; display: block; }
.wordmark { display: flex; flex-direction: column; }
.wm-name { font-family: var(--display); font-size: 19pt; line-height: 0.9; letter-spacing: 0.02em; color: var(--ink); }
.wm-tag { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 6.2pt; letter-spacing: 0.32em; text-transform: uppercase; color: var(--accent); margin-top: 1.2mm; }
.brand.on-band .wm-name { color: var(--band-ink); }
.brand.on-band .wm-tag { color: var(--band-accent); }

.contact { text-align: right; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 7pt; line-height: 1.7; color: var(--muted); }

/* ---- First-page masthead ------------------------------------------------ */
.masthead { padding-bottom: 7mm; }
.mh-top { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 6mm; border-bottom: 1.4pt solid var(--ink); }
.mh-title { padding: 7.5mm 0 6mm; }
.mh-title h1, .page-cover h1 {
  font-family: var(--display); font-weight: 400;
  font-size: 36pt; line-height: 0.95; letter-spacing: 0.005em;
  margin: 2.5mm 0 0; text-wrap: balance;
}
.mh-title .subtitle { margin-top: 3mm; font-size: 11pt; color: var(--muted); max-width: 140mm; font-weight: 300; }
.meta {
  display: flex; gap: 9mm; align-items: flex-start;
  border-top: 0.5pt solid var(--rule); border-bottom: 0.5pt solid var(--rule);
  padding: 4mm 0;
}
.meta .cell { min-width: 0; }
.meta .cell.client { flex: 1 1 0; min-width: 52mm; }
.meta .value { font-size: 9pt; line-height: 1.45; }
.meta .cell:not(:first-child) .value { white-space: nowrap; }
.meta .client-logo { max-height: 12mm; max-width: 34mm; object-fit: contain; margin-left: auto; align-self: center; }

/* ---- Running header ----------------------------------------------------- */
.run {
  flex: none; display: flex; justify-content: space-between; align-items: center; gap: 8mm;
  padding-bottom: 3mm; margin-bottom: 8mm; border-bottom: 0.5pt solid var(--rule);
  font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 6.8pt; letter-spacing: 0.06em; color: var(--muted);
}
.run-l { display: flex; align-items: center; gap: 2.2mm; color: var(--ink); font-weight: 500; text-transform: uppercase; letter-spacing: 0.14em; }
.run .mark { width: 5mm; height: 5mm; }
.run-r { text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110mm; }

/* ---- Blocks ------------------------------------------------------------- */
.block { margin-bottom: 6mm; }
.b-heading { padding-top: 2mm; margin-bottom: 3.5mm; }
.b-heading h2 { font-weight: 600; font-size: 14pt; line-height: 1.25; letter-spacing: -0.005em; margin: 1.5mm 0 0; }
.b-title { font-weight: 600; font-size: 10.5pt; margin: 0 0 2.5mm; }

.b-text > .u, .b-text > p { margin-bottom: 2.6mm; }
.b-text > :last-child { margin-bottom: 0; }
.b-text p { max-width: 158mm; }

.b-list ul, .b-list ol { margin: 0; padding: 0; list-style: none; }
.b-list li { position: relative; padding-left: 6mm; margin-bottom: 1.8mm; max-width: 158mm; }
.b-list li:last-child { margin-bottom: 0; }
.l-bullet li::before { content: ''; position: absolute; left: 1mm; top: 0.62em; width: 1.6mm; height: 1.6mm; background: var(--accent); transform: rotate(45deg); }
.l-check li::before {
  content: ''; position: absolute; left: 0; top: 0.32em; width: 3.4mm; height: 3.4mm; background: var(--accent);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3 8.5l3.2 3.2L13 4.8' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat;
}
.l-numbered li { padding-left: 8mm; }
.l-numbered li::before {
  content: attr(data-n); position: absolute; left: 0; top: 0.1em;
  font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 7.5pt; color: var(--accent);
}

.b-facts dl { margin: 0; border-top: 0.5pt solid var(--rule); }
.fact { display: grid; grid-template-columns: 46mm 1fr; gap: 6mm; padding: 2.4mm 0; border-bottom: 0.5pt solid var(--rule); }
.fact dt { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 7pt; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); padding-top: 0.5mm; }
.fact dd { margin: 0; }

/* ---- Tables ------------------------------------------------------------- */
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
col.w-qty { width: 18mm; } col.w-money { width: 31mm; } col.w-unit { width: 34mm; }
th {
  font-family: 'IBM Plex Mono', ui-monospace, monospace; font-weight: 500; font-size: 6.6pt;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
  text-align: left; padding: 0 0 2mm; border-bottom: 1pt solid var(--ink);
}
td { padding: 2.8mm 0; border-bottom: 0.5pt solid var(--rule); vertical-align: top; }
th.c-num, td.c-num { text-align: right; padding-left: 3mm; }
td.c-num { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 8.6pt; font-variant-numeric: tabular-nums; white-space: nowrap; }
td.c-unit, th.c-unit { padding-left: 3mm; color: var(--muted); }
td.c-desc { padding-right: 4mm; overflow-wrap: anywhere; }
td .d { display: block; font-weight: 500; }
td .s { display: block; color: var(--muted); font-size: 8.6pt; margin-top: 0.8mm; }
td .u { display: block; color: var(--muted); font-size: 6.8pt; letter-spacing: 0.06em; text-transform: uppercase; }
td .u.from { display: inline; margin-right: 1.5mm; }
thead.is-cont th { color: var(--muted); }

.totals td { border-bottom: none; padding: 1.6mm 0; text-align: right; }
.totals tr:first-child td { padding-top: 3.6mm; }
.totals td:first-child { color: var(--muted); }
.totals td .u { display: inline; margin-left: 1.5mm; }
.totals .grand td { padding-top: 3mm; font-weight: 600; font-size: 11pt; color: var(--ink); border-top: 1.4pt solid var(--ink); }
.totals .grand td.c-num { font-size: 11pt; font-weight: 500; color: var(--accent); }
.totals .note td { text-align: left; color: var(--muted); font-size: 8.2pt; padding-top: 3mm; }

/* ---- Acceptance --------------------------------------------------------- */
.b-accept { padding-top: 2mm; }
.b-accept > p { color: var(--muted); max-width: 158mm; margin-bottom: 5mm; }
.sigs { display: flex; gap: 10mm; }
.sig { flex: 1 1 0; }
.sig .party { font-weight: 600; margin-bottom: 2mm; }
.sl { border-bottom: 0.5pt solid var(--ink); height: 9mm; position: relative; }
.sl span { position: absolute; bottom: -4mm; left: 0; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 6.4pt; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.sl + .sl { margin-top: 4mm; }
.sig { padding-bottom: 4mm; }

/* ---- Cover -------------------------------------------------------------- */
.page-cover { background: var(--band); color: var(--band-ink); padding: 18mm 18mm 16mm; }
.page-cover::before {
  content: ''; position: absolute; inset: 0 0 auto 0; height: 2.4mm; background: var(--band-accent);
}
.cv-top { display: flex; justify-content: space-between; align-items: flex-start; }
.page-cover .contact { color: var(--band-muted); }
.cv-main { margin-top: auto; padding-bottom: 18mm; }
.page-cover .eyebrow { color: var(--band-accent); }
.page-cover .ref { color: var(--band-muted); }
.page-cover h1 { font-size: 58pt; margin-top: 4mm; max-width: 165mm; }
.page-cover .subtitle { margin-top: 5mm; font-size: 13pt; font-weight: 300; color: var(--band-muted); max-width: 140mm; }
.cv-foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 10mm; padding-top: 7mm; border-top: 0.5pt solid rgba(255,255,255,0.16); }
.page-cover .label { color: var(--band-muted); }
.cv-client { display: flex; align-items: center; gap: 5mm; padding-left: 4mm; border-left: 1.2mm solid var(--client, var(--band-accent)); }
.cv-client .client-logo { max-height: 14mm; max-width: 40mm; object-fit: contain; background: #fff; padding: 2mm; border-radius: 1mm; }
.cv-client .strong { font-size: 12pt; }
.cv-dates { display: flex; gap: 10mm; text-align: left; }
`
