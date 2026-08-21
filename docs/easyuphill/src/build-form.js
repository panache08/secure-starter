const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, VerticalAlign, HeightRule, LevelFormat,
} = require("docx");
const { NAVY, RED, INK, TINT, WHITE, FONT, PAGE, CONTENT_WIDTH } = require("./brand");
const { styles } = require("./styles");
const { brandHeader, brandFooter } = require("./chrome");
const C = require("./form-content");

const RULE = "C8D3E4";
const line = (color = RULE, size = 4) => ({ style: BorderStyle.SINGLE, size, color });
const grid = { top: line(), bottom: line(), left: line(), right: line() };
const ROW = { height: { value: 400, rule: HeightRule.ATLEAST } };

// Auto-numbered terms: adding or deleting a clause in Word renumbers the rest.
const NUMBERING = {
  config: [{
    reference: "eu-terms",
    levels: [{
      level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: {
        run: { font: FONT, size: 17, bold: true, color: NAVY },
        paragraph: { indent: { left: 340, hanging: 340 } },
      },
    }],
  }],
};

const labelCell = (text, width) => new TableCell({
  width: { size: width, type: WidthType.DXA }, borders: grid,
  shading: { type: ShadingType.CLEAR, fill: TINT, color: "auto" },
  margins: { top: 60, bottom: 60, left: 140, right: 140 },
  verticalAlign: VerticalAlign.CENTER,
  children: [new Paragraph({ style: "FieldLabel", children: [new TextRun(text)] })],
});

// Blank cells are left white and roomy — click in, type, Tab to the next one.
const entryCell = (width, text = "") => new TableCell({
  width: { size: width, type: WidthType.DXA }, borders: grid,
  margins: { top: 60, bottom: 60, left: 140, right: 140 },
  verticalAlign: VerticalAlign.CENTER,
  children: [new Paragraph({ style: "FieldEntry", children: [new TextRun(text)] })],
});

const headCell = (text, width, align = AlignmentType.LEFT) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  borders: { ...grid, top: line(NAVY, 4), bottom: line(NAVY, 4), left: line(NAVY, 4), right: line(NAVY, 4) },
  shading: { type: ShadingType.CLEAR, fill: NAVY, color: "auto" },
  margins: { top: 60, bottom: 60, left: 140, right: 140 },
  verticalAlign: VerticalAlign.CENTER,
  children: [new Paragraph({ style: "TableHead", alignment: align, children: [new TextRun(text)] })],
});

const table = (rows, columnWidths) => new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths, rows,
});

// Label on the left, one blank box on the right.
function fieldTable(fields) {
  const lw = 3000, ew = CONTENT_WIDTH - lw;
  return table(
    fields.map(([label, value]) => new TableRow({
      ...ROW, children: [labelCell(label, lw), entryCell(ew, value)],
    })),
    [lw, ew],
  );
}

// Numbered delegate grid.
function delegateTable() {
  const nw = 620, rest = CONTENT_WIDTH - nw;
  const cw = Math.floor(rest / 3);
  const widths = [nw, cw, cw, rest - 2 * cw];
  const header = new TableRow({
    ...ROW, tableHeader: true,
    children: C.delegateColumns.map((c, i) =>
      headCell(c, widths[i], i === 0 ? AlignmentType.CENTER : AlignmentType.LEFT)),
  });
  const body = Array.from({ length: C.delegateRows }, (_, i) => new TableRow({
    height: { value: 440, rule: HeightRule.ATLEAST },
    children: [
      new TableCell({
        width: { size: widths[0], type: WidthType.DXA }, borders: grid,
        shading: { type: ShadingType.CLEAR, fill: TINT, color: "auto" },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          style: "FieldEntry", alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: String(i + 1), bold: true, color: NAVY })],
        })],
      }),
      entryCell(widths[1]), entryCell(widths[2]), entryCell(widths[3]),
    ],
  }));
  return table([header, ...body], widths);
}

// Four contact fields across, headers on navy, one blank row beneath.
function contactTable(fields) {
  const cw = Math.floor(CONTENT_WIDTH / fields.length);
  const widths = fields.map((_, i) => (i === fields.length - 1 ? CONTENT_WIDTH - cw * (fields.length - 1) : cw));
  return table([
    new TableRow({ ...ROW, tableHeader: true, children: fields.map((f, i) => headCell(f, widths[i])) }),
    new TableRow({ height: { value: 440, rule: HeightRule.ATLEAST }, children: widths.map((w) => entryCell(w)) }),
  ], widths);
}

const spacer = (after = 70) => new Paragraph({ spacing: { after }, children: [] });
const h1 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_1 });

const doc = new Document({
  creator: "EasyUphill Training & Consulting",
  title: `EasyUphill — ${C.title}`,
  description: "Course registration form",
  styles,
  numbering: NUMBERING,
  sections: [{
    properties: { page: PAGE },
    headers: { default: brandHeader() },
    footers: { default: brandFooter(C.footer) },
    children: [
      new Paragraph({ text: C.title, heading: HeadingLevel.TITLE }),
      new Paragraph({ style: "Standfirst", children: [new TextRun(C.intro)] }),

      fieldTable(C.courseFields),
      spacer(),

      h1(C.delegatesHeading),
      delegateTable(),
      spacer(),

      h1(C.companyHeading),
      fieldTable(C.companyFields),
      spacer(),

      ...C.contacts.flatMap(({ heading, fields }) => [h1(heading), contactTable(fields), spacer()]),

      h1(C.authorisationHeading),
      fieldTable(C.authorisationFields.map((f) => [f, ""])),
      spacer(),

      h1(C.termsHeading),
      ...C.terms.map((t) => new Paragraph({
        text: t, style: "Terms", numbering: { reference: "eu-terms", level: 0 },
      })),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("EasyUphill-Registration-Form.docx", buf);
  console.log("wrote EasyUphill-Registration-Form.docx", buf.length, "bytes");
});
