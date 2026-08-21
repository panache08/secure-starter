// Repeating page furniture: brand bar in the header, contact line in the footer.
// Keeping it out of the body means the body is pure editable content.
const fs = require("fs");
const {
  Header, Footer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, VerticalAlign,
} = require("docx");
const { NAVY, RED, SLATE, FONT, CONTENT_WIDTH, CONTACT } = require("./brand");

const LOGO = fs.readFileSync(`${__dirname}/easyuphill-logo.png`);
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const blank = { top: NONE, bottom: NONE, left: NONE, right: NONE };

function bareCell(children, width, extra = {}) {
  return new TableCell({
    children, width: { size: width, type: WidthType.DXA },
    borders: blank, margins: { top: 0, bottom: 0, left: 0, right: 0 },
    verticalAlign: VerticalAlign.CENTER, ...extra,
  });
}

function brandHeader() {
  const left = [
    new Paragraph({
      spacing: { after: 0 },
      children: [
        new ImageRun({ type: "png", data: LOGO, transformation: { width: 30, height: 25 } }),
        new TextRun({ text: "  EasyUphill", font: FONT, size: 28, bold: true, color: NAVY }),
      ],
    }),
    new Paragraph({
      spacing: { before: 20, after: 0 },
      children: [new TextRun({
        text: "TRAINING  ·  CORPORATE DEVELOPMENT",
        font: FONT, size: 13, bold: true, color: RED, characterSpacing: 30,
      })],
    }),
  ];

  const right = [CONTACT.phone, CONTACT.email, CONTACT.address, CONTACT.web].map(
    (line, i) => new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: i === 0 ? 0 : 10, after: 0 },
      children: [new TextRun({ text: line, font: FONT, size: 14, color: SLATE })],
    }),
  );

  return new Header({
    children: [
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [5233, 5233],
        borders: blank,
        rows: [new TableRow({ children: [bareCell(left, 5233), bareCell(right, 5233)] })],
      }),
      new Paragraph({
        spacing: { before: 80, after: 0 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, space: 1, color: NAVY } },
        children: [],
      }),
    ],
  });
}

function brandFooter(text) {
  return new Footer({
    children: [
      new Paragraph({
        spacing: { before: 0, after: 40 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, space: 6, color: "D6DEEA" } },
        children: [],
      }),
      new Paragraph({ style: "BrandFooter", children: [new TextRun(text)] }),
    ],
  });
}

module.exports = { brandHeader, brandFooter, bareCell, blank, NONE };
