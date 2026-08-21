// Every visual decision lives here as a NAMED Word style, so the documents can be
// restyled from Word's Styles gallery instead of paragraph by paragraph.
const { NAVY, RED, INK, SLATE, FONT } = require("./brand");

const styles = {
  default: {
    document: {
      run: { font: FONT, size: 20, color: INK },        // 10pt
      paragraph: { spacing: { line: 264, after: 100 } }, // ~1.10 line, 5pt after
    },
    heading1: {
      run: { font: FONT, size: 26, bold: true, color: NAVY },   // 13pt
      paragraph: {
        outlineLevel: 0,
        spacing: { before: 240, after: 100 },
        border: { bottom: { style: "single", size: 6, space: 4, color: NAVY } },
        keepNext: true,
      },
    },
    heading2: {
      run: { font: FONT, size: 22, bold: true, color: RED },     // 11pt
      paragraph: { outlineLevel: 1, spacing: { before: 260, after: 100 }, keepNext: true },
    },
    heading3: {
      run: { font: FONT, size: 20, bold: true, color: NAVY },    // 10pt
      paragraph: { outlineLevel: 2, spacing: { before: 110, after: 30 }, keepNext: true },
    },
    title: {
      run: { font: FONT, size: 40, bold: true, color: NAVY },    // 20pt
      paragraph: { spacing: { before: 40, after: 120 } },
    },
    listParagraph: {
      run: { font: FONT, size: 20, color: INK },
      paragraph: { spacing: { line: 264, after: 60 } },
    },
  },
  characterStyles: [
    {
      // The dots between agenda topics — restyle every separator from one place.
      id: "Separator", name: "EU Separator", basedOn: "DefaultParagraphFont", quickFormat: true,
      run: { font: FONT, color: RED, bold: true },
    },
  ],
  paragraphStyles: [
    {
      id: "Kicker", name: "EU Kicker", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 17, bold: true, color: RED, characterSpacing: 30, allCaps: true },
      paragraph: { spacing: { before: 0, after: 40 } },
    },
    {
      id: "Standfirst", name: "EU Standfirst", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 22, color: SLATE },
      paragraph: { spacing: { after: 200, line: 288 } },
    },
    {
      id: "Lead", name: "EU Lead Paragraph", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 20, color: INK },
      paragraph: { spacing: { after: 140, line: 276 } },
    },
    {
      id: "Topics", name: "EU Agenda Topics", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 18, color: INK },
      paragraph: { spacing: { after: 110, line: 252 }, indent: { left: 200 } },
    },
    {
      id: "Meta", name: "EU Meta", basedOn: "Normal", next: "Normal",
      run: { font: FONT, size: 16, color: SLATE },
      paragraph: { spacing: { after: 0, line: 240 } },
    },
    {
      id: "FieldLabel", name: "EU Field Label", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 16, bold: true, color: NAVY, allCaps: true, characterSpacing: 20 },
      paragraph: { spacing: { before: 40, after: 40, line: 240 } },
    },
    {
      id: "FieldEntry", name: "EU Field Entry", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 20, color: INK },
      paragraph: { spacing: { before: 60, after: 60, line: 240 } },
    },
    {
      id: "TableHead", name: "EU Table Head", basedOn: "Normal", next: "Normal",
      run: { font: FONT, size: 16, bold: true, color: "FFFFFF", allCaps: true, characterSpacing: 20 },
      paragraph: { spacing: { before: 60, after: 60, line: 240 } },
    },
    {
      id: "Terms", name: "EU Terms", basedOn: "Normal", next: "Terms",
      run: { font: FONT, size: 17, color: INK },
      paragraph: { spacing: { after: 70, line: 252 }, indent: { left: 260, hanging: 260 } },
    },
    {
      id: "Closing", name: "EU Closing Statement", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 20, bold: true, color: NAVY, italics: true },
      paragraph: { spacing: { before: 200, after: 120, line: 276 } },
    },
    {
      id: "BrandFooter", name: "EU Brand Footer", basedOn: "Normal", next: "Normal",
      run: { font: FONT, size: 15, color: SLATE },
      paragraph: { spacing: { before: 0, after: 0 }, alignment: "center" },
    },
  ],
};

module.exports = { styles };
