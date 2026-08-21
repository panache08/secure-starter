const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, VerticalAlign, LevelFormat, PageBreak,
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

// The four-up fact strip: label row on navy, values on a pale tint.
function factStrip() {
  const w = Math.floor(CONTENT_WIDTH / 4);
  const widths = [w, w, w, CONTENT_WIDTH - 3 * w];
  const cell = (children, width, fill) => new TableCell({
    children, width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill, color: "auto" },
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top: NONE, bottom: NONE,
      left: { style: BorderStyle.SINGLE, size: 8, color: WHITE },
      right: { style: BorderStyle.SINGLE, size: 8, color: WHITE },
    },
  });
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: C.facts.map(([label], i) =>
          cell([new Paragraph({ style: "TableHead", children: [new TextRun(label)] })], widths[i], NAVY)),
      }),
      new TableRow({
        children: C.facts.map(([, value], i) =>
          cell([new Paragraph({
            style: "FieldEntry",
            children: [new TextRun({ text: value, bold: true, color: NAVY })],
          })], widths[i], TINT)),
      }),
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
      factStrip(),
      new Paragraph({ spacing: { after: 0 }, children: [] }),

      h1("Programme Overview"),
      new Paragraph({ style: "Lead", children: [new TextRun(C.overview)] }),
      ...C.responsibilities.map(bullet),

      h1("What You Will Gain"),
      ...C.gains.map(bullet),

      h1("Who Should Attend"),
      ...C.audience.map(bullet),

      h1(C.certificateHeading),
      // Certificate + call to action share one tinted callout, so the pitch closes on page one.
      new Paragraph({
        style: "Lead",
        spacing: { before: 40, after: 0 },
        shading: { type: ShadingType.CLEAR, fill: TINT, color: "auto" },
        border: { left: { style: BorderStyle.SINGLE, size: 18, space: 8, color: NAVY } },
        indent: { left: 140, right: 140 },
        children: [new TextRun(C.certificate)],
      }),
      new Paragraph({
        style: "Closing",
        spacing: { before: 40, after: 60 },
        shading: { type: ShadingType.CLEAR, fill: TINT, color: "auto" },
        border: { left: { style: BorderStyle.SINGLE, size: 18, space: 8, color: NAVY } },
        indent: { left: 140, right: 140 },
        children: [new TextRun(C.closing)],
      }),
      new Paragraph({ children: [new PageBreak()] }),
      h1("Course Agenda"),
      ...agenda,

    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("EasyUphill-COO-Programme.docx", buf);
  console.log("wrote EasyUphill-COO-Programme.docx", buf.length, "bytes");
});
