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

// Course calendar: one bookable row per session — dates, duration, format, fee.
function calendarTable() {
  const wDates = 5200, wVenue = 2800;
  const w = [wDates, wVenue, CONTENT_WIDTH - wDates - wVenue];
  const aligns = [AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.RIGHT];
  const edge = { style: BorderStyle.SINGLE, size: 8, color: WHITE };

  const header = new TableRow({
    tableHeader: true,
    children: C.calendarColumns.map((label, i) => new TableCell({
      width: { size: w[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: NAVY, color: "auto" },
      margins: { top: 70, bottom: 70, left: 140, right: 140 },
      verticalAlign: VerticalAlign.CENTER,
      borders: { top: edge, bottom: edge, left: edge, right: edge },
      children: [new Paragraph({
        style: "TableHead", spacing: { before: 0, after: 0 },
        alignment: aligns[i], children: [new TextRun(label)],
      })],
    })),
  });

  const rows = C.calendar.map((session, r) => new TableRow({
    children: session.map((value, i) => new TableCell({
      width: { size: w[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: r % 2 ? WHITE : TINT, color: "auto" },
      margins: { top: 60, bottom: 60, left: 140, right: 140 },
      verticalAlign: VerticalAlign.CENTER,
      borders: { top: edge, bottom: edge, left: edge, right: edge },
      children: [new Paragraph({
        style: "FieldEntry", spacing: { before: 0, after: 0 }, alignment: aligns[i],
        children: [new TextRun({
          text: value,
          bold: i === 0 || i === 2,
          color: i === 0 || i === 2 ? NAVY : INK,
        })],
      })],
    })),
  }));

  return new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: w, rows: [header, ...rows] });
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
      h1(C.calendarHeading),
      calendarTable(),
      new Paragraph({
        style: "Meta", spacing: { before: 100, after: 0 },
        children: [new TextRun(C.calendarNote)],
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
