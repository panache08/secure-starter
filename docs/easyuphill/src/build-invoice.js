const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, VerticalAlign, HeightRule,
} = require("docx");
const { NAVY, RED, INK, SLATE, TINT, WHITE, FONT, PAGE, CONTENT_WIDTH } = require("./brand");
const { styles } = require("./styles");
const C = require("./invoice-content");

const LOGO = fs.readFileSync(`${__dirname}/easyuphill-logo-light.png`);
const RULE = "C8D3E4";
const NONE = { style: BorderStyle.NONE, size: 0, color: WHITE };
const blank = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const line = (color = RULE, size = 4) => ({ style: BorderStyle.SINGLE, size, color });
const grid = { top: line(), bottom: line(), left: line(), right: line() };

const cell = (children, width, o = {}) => new TableCell({
  children, width: { size: width, type: WidthType.DXA },
  borders: o.borders || blank,
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
  margins: o.margins || { top: 60, bottom: 60, left: 140, right: 140 },
  verticalAlign: o.valign || VerticalAlign.CENTER,
  columnSpan: o.span,
});
const table = (rows, columnWidths) =>
  new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths, rows, borders: blank });
const spacer = (after) => new Paragraph({ spacing: { after }, children: [] });
const split = (n) => {
  const w = Math.floor(CONTENT_WIDTH / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? CONTENT_WIDTH - w * (n - 1) : w));
};

// ── Navy title band. The invoice number is deliberately NOT repeated here;
//    it lives once, in the details strip below.
function titleBand() {
  const [a, b] = [6000, CONTENT_WIDTH - 6000];
  return table([new TableRow({
    height: { value: 1100, rule: HeightRule.ATLEAST },
    children: [
      cell([
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new ImageRun({ type: "png", data: LOGO, transformation: { width: 42, height: 34 } }),
            new TextRun({ text: "  EasyUphill", font: FONT, size: 32, bold: true, color: WHITE }),
          ],
        }),
        new Paragraph({
          spacing: { before: 40, after: 0 },
          children: [new TextRun({
            text: "TRAINING  ·  CORPORATE DEVELOPMENT",
            font: FONT, size: 14, bold: true, color: "9DC0F0", characterSpacing: 40,
          })],
        }),
      ], a, { fill: NAVY, margins: { top: 220, bottom: 220, left: 300, right: 140 } }),
      cell([new Paragraph({ style: "InvoiceTitle", children: [new TextRun(C.docTitle)] })],
        b, { fill: NAVY, margins: { top: 220, bottom: 220, left: 140, right: 300 } }),
    ],
  })], [a, b]);
}

// ── FROM and BILL TO side by side instead of stacked, so the page starts tighter.
function partiesBlock() {
  const w = split(2);
  const party = (p) => [
    new Paragraph({ style: "BlockLabel", children: [new TextRun(p.label)] }),
    new Paragraph({ style: "BlockName", children: [new TextRun(p.name)] }),
    ...p.lines.map((l) => new Paragraph({ style: "BlockText", children: [new TextRun(l)] })),
  ];
  return table([new TableRow({
    children: [
      cell(party(C.from), w[0], { valign: VerticalAlign.TOP, margins: { top: 0, bottom: 0, left: 0, right: 300 } }),
      cell(party(C.billTo), w[1], { valign: VerticalAlign.TOP, margins: { top: 0, bottom: 0, left: 300, right: 0 } }),
    ],
  })], w);
}

// ── Four details across the page. The old layout stacked them in a narrow
//    column, which wrapped every date onto two lines.
function detailsStrip() {
  const w = split(4);
  const head = (t, i) => cell(
    [new Paragraph({ style: "TableHead", children: [new TextRun(t)] })], w[i],
    { fill: NAVY, borders: { top: line(NAVY, 4), bottom: line(NAVY, 4), left: line(WHITE, 8), right: line(WHITE, 8) } });
  const value = (t, i) => cell(
    [new Paragraph({ style: "FieldEntry", children: [new TextRun({ text: t, bold: true, color: NAVY })] })],
    w[i], { fill: TINT, borders: { ...grid, left: line(WHITE, 8), right: line(WHITE, 8) } });
  return table([
    new TableRow({ tableHeader: true, children: C.details.map(([l], i) => head(l, i)) }),
    new TableRow({ height: { value: 420, rule: HeightRule.ATLEAST },
      children: C.details.map(([, v], i) => value(v, i)) }),
  ], w);
}

// ── Line items. Delegates column widened so its header stops splitting.
function lineItems() {
  const desc = 5400, num = 1500, price = 1783;
  const w = [desc, num, price, CONTENT_WIDTH - desc - num - price];
  const aligns = [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.RIGHT, AlignmentType.RIGHT];
  const header = new TableRow({
    tableHeader: true,
    children: C.lineColumns.map((c, i) => cell(
      [new Paragraph({ style: "TableHead", alignment: aligns[i], children: [new TextRun(c)] })],
      w[i], { fill: NAVY, borders: { top: line(NAVY, 4), bottom: line(NAVY, 4), left: line(NAVY, 4), right: line(NAVY, 4) } })),
  });
  const rows = Array.from({ length: C.lineRows }, (_, r) => new TableRow({
    height: { value: 460, rule: HeightRule.ATLEAST },
    children: C.linePlaceholder.map((t, i) => cell(
      [new Paragraph({
        style: i === 0 ? "FieldEntry" : "Money",
        alignment: aligns[i],
        children: [new TextRun(i === 0 ? t : t)],
      })],
      w[i], { fill: r % 2 ? TINT : undefined, borders: grid })),
  }));
  return table([header, ...rows], w);
}

// ── Payment details on the left, totals on the right.
function paymentAndTotals() {
  const left = 5900, gap = 400, right = CONTENT_WIDTH - left - gap;
  const payment = [
    new Paragraph({ style: "BlockLabel", children: [new TextRun(C.payment.label)] }),
    ...C.payment.rows.map(([k, v]) => new Paragraph({
      style: "BlockText",
      children: [
        new TextRun({ text: `${k}: `, color: SLATE }),
        new TextRun({ text: v, bold: true, color: NAVY }),
      ],
    })),
  ];
  const tw = [Math.floor(right * 0.5), right - Math.floor(right * 0.5)];
  const totals = new Table({
    width: { size: right, type: WidthType.DXA }, columnWidths: tw, borders: blank,
    rows: [
      ...C.totals.map(([k, v]) => new TableRow({
        children: [
          cell([new Paragraph({ style: "BlockText", spacing: { before: 50, after: 50 }, children: [new TextRun({ text: k, color: SLATE })] })],
            tw[0], { borders: { ...blank, bottom: line() }, margins: { top: 40, bottom: 40, left: 100, right: 100 } }),
          cell([new Paragraph({ style: "Money", children: [new TextRun({ text: v, bold: true, color: NAVY })] })],
            tw[1], { borders: { ...blank, bottom: line() }, margins: { top: 40, bottom: 40, left: 100, right: 100 } }),
        ],
      })),
      new TableRow({
        height: { value: 520, rule: HeightRule.ATLEAST },
        children: [
          cell([new Paragraph({ style: "TableHead", children: [new TextRun(C.grandTotal[0])] })],
            tw[0], { fill: NAVY, margins: { top: 80, bottom: 80, left: 140, right: 100 } }),
          cell([new Paragraph({ style: "GrandTotal", children: [new TextRun(C.grandTotal[1])] })],
            tw[1], { fill: NAVY, margins: { top: 80, bottom: 80, left: 100, right: 140 } }),
        ],
      }),
    ],
  });
  return table([new TableRow({
    children: [
      cell(payment, left, { valign: VerticalAlign.TOP, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
      cell([new Paragraph({ spacing: { after: 0 }, children: [] })], gap),
      cell([totals], right, { valign: VerticalAlign.TOP, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
    ],
  })], [left, gap, right]);
}

const doc = new Document({
  creator: "EasyUphill Training",
  title: "EasyUphill — Tax Invoice",
  description: "Invoice template",
  styles,
  sections: [{
    properties: { page: { ...PAGE, margin: { ...PAGE.margin, top: 720, bottom: 720 } } },
    children: [
      titleBand(),
      spacer(320),
      partiesBlock(),
      spacer(320),
      detailsStrip(),
      spacer(320),
      lineItems(),
      spacer(360),
      paymentAndTotals(),
      spacer(320),
      new Paragraph({ style: "BlockLabel", children: [new TextRun(C.notesLabel)] }),
      new Paragraph({ style: "BlockText", children: [new TextRun(C.notes)] }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("EasyUphill-Invoice.docx", buf);
  console.log("wrote EasyUphill-Invoice.docx", buf.length, "bytes");
});
