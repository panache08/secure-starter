const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, VerticalAlign, LevelFormat,
} = require("docx");
const { NAVY, RED, INK, SLATE, TINT, WHITE, FONT, PAGE, CONTENT_WIDTH } = require("./brand");
const { styles } = require("./styles");
const { brandHeader, brandFooter, NONE } = require("./chrome");
const C = require("./brochure-content");

const BULLETS = {
  config: [{
    reference: "eu-bullets",
    levels: [{
      level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
      style: {
        run: { font: FONT, size: 20, color: RED },
        paragraph: { indent: { left: 340, hanging: 220 } },
      },
    }],
  }],
};
const bullet = (text) =>
  new Paragraph({ text, style: "ListParagraph", numbering: { reference: "eu-bullets", level: 0 } });
const h1 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_1 });
const split = (n) => {
  const w = Math.floor(CONTENT_WIDTH / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? CONTENT_WIDTH - w * (n - 1) : w));
};

// One compact bar for the things that never change between intakes.
function metaStrip() {
  const w = [3400, 2700, CONTENT_WIDTH - 3400 - 2700];
  const box = (children, i, fill) => new TableCell({
    children, width: { size: w[i], type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill, color: "auto" },
    margins: { top: 70, bottom: 70, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top: NONE, bottom: NONE,
      left: { style: BorderStyle.SINGLE, size: 8, color: WHITE },
      right: { style: BorderStyle.SINGLE, size: 8, color: WHITE },
    },
  });
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: w,
    rows: [new TableRow({
      children: C.meta.map(([label, value], i) => box([new Paragraph({
        style: "FieldEntry",
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text: `${label.toUpperCase()}   `, size: 15, bold: true, color: "9DC0F0", characterSpacing: 30 }),
          new TextRun({ text: value, bold: true, color: WHITE }),
        ],
      })], i, NAVY)),
    })],
  });
}

// Every 2026 intake at a glance: four across, two deep.
function scheduleGrid() {
  const per = 4;
  const w = split(per);
  const rows = [];
  for (let i = 0; i < C.schedule.length; i += per) {
    rows.push(new TableRow({
      children: C.schedule.slice(i, i + per).map((date, j) => new TableCell({
        width: { size: w[j], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: TINT, color: "auto" },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        verticalAlign: VerticalAlign.CENTER,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 8, color: WHITE },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: WHITE },
          left: { style: BorderStyle.SINGLE, size: 8, color: WHITE },
          right: { style: BorderStyle.SINGLE, size: 8, color: WHITE },
        },
        children: [new Paragraph({
          style: "FieldEntry",
          spacing: { before: 0, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: date, bold: true, color: NAVY })],
        })],
      })),
    }));
  }
  return new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: w, rows });
}

// Fees: label over figure, three across.
function feesGrid() {
  const w = split(C.fees.length);
  const box = (children, i, fill, top) => new TableCell({
    children, width: { size: w[i], type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill, color: "auto" },
    margins: { top: top ? 90 : 20, bottom: top ? 20 : 90, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: WHITE },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: WHITE },
      left: { style: BorderStyle.SINGLE, size: 8, color: WHITE },
      right: { style: BorderStyle.SINGLE, size: 8, color: WHITE },
    },
  });
  const line = (fn, top) => new TableRow({
    children: C.fees.map((f, i) => box([fn(f, i)], i, TINT, top)),
  });
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: w,
    rows: [
      line(([label]) => new Paragraph({
        style: "TableHead", spacing: { before: 0, after: 0 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: label, color: SLATE })],
      }), true),
      line(([, amount]) => new Paragraph({
        style: "FieldEntry", spacing: { before: 0, after: 0 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: amount, bold: true, size: 28, color: NAVY })],
      }), false),
    ],
  });
}

// "Day 1  ·  Theme" as a single tinted band — one paragraph, easy to retype.
function dayBand(day, theme) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    shading: { type: ShadingType.CLEAR, fill: TINT, color: "auto" },
    border: { left: { style: BorderStyle.SINGLE, size: 18, space: 8, color: RED } },
    indent: { left: 120, right: 120 },
    children: [
      new TextRun({ text: day.toUpperCase(), bold: true, color: RED, size: 20, characterSpacing: 30 }),
      new TextRun({ text: "   ", size: 20 }),
      new TextRun({ text: theme, bold: true, color: NAVY, size: 22 }),
    ],
  });
}

const agenda = C.agenda.flatMap(({ day, theme, modules }) => [
  dayBand(day, theme),
  ...modules.flatMap(([name, topics]) => [
    new Paragraph({ text: name, heading: HeadingLevel.HEADING_3 }),
    // Topics run inline, separated by a mid dot: same content, a third of the space.
    new Paragraph({
      style: "Topics",
      children: topics.flatMap((t, i) => (i === 0 ? [] : [
        new TextRun({ text: "  ·  ", style: "Separator" }),
      ]).concat(new TextRun(t))),
    }),
  ]),
]);

const doc = new Document({
  creator: "EasyUphill Training & Consulting",
  title: C.title,
  description: C.standfirst,
  styles,
  numbering: BULLETS,
  sections: [{
    properties: { page: PAGE },
    headers: { default: brandHeader() },
    footers: { default: brandFooter(C.footer) },
    children: [
      new Paragraph({ style: "Kicker", children: [new TextRun(C.kicker)] }),
      new Paragraph({ text: C.title, heading: HeadingLevel.TITLE }),
      new Paragraph({ style: "Standfirst", children: [new TextRun(C.standfirst)] }),
      metaStrip(),
      h1(C.scheduleHeading),
      scheduleGrid(),
      new Paragraph({
        style: "Meta", spacing: { before: 90, after: 0 },
        children: [new TextRun(C.scheduleNote)],
      }),

      h1(C.feesHeading),
      feesGrid(),
      new Paragraph({
        style: "Meta", spacing: { before: 90, after: 0 },
        children: [new TextRun(C.feesNote)],
      }),

      h1("Programme Overview"),
      new Paragraph({ style: "Lead", children: [new TextRun(C.overview)] }),
      ...C.responsibilities.map(bullet),

      h1("What You Will Gain"),
      ...C.gains.map(bullet),

      h1("Who Should Attend"),
      new Paragraph({
        style: "Topics",
        children: C.audience.flatMap((a, i) => (i === 0 ? [] : [
          new TextRun({ text: "  ·  ", style: "Separator" }),
        ]).concat(new TextRun(a))),
      }),

      new Paragraph({
        style: "Closing",
        spacing: { before: 240, after: 60 },
        shading: { type: ShadingType.CLEAR, fill: TINT, color: "auto" },
        border: { left: { style: BorderStyle.SINGLE, size: 18, space: 8, color: NAVY } },
        indent: { left: 140, right: 140 },
        children: [new TextRun(C.closing)],
      }),
      new Paragraph({
        text: "Course Agenda", heading: HeadingLevel.HEADING_1, pageBreakBefore: true,
      }),
      ...agenda,

    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("EasyUphill-COO-Programme.docx", buf);
  console.log("wrote EasyUphill-COO-Programme.docx", buf.length, "bytes");
});
