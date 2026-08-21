# EasyUphill course documents

Two Word documents, rebuilt so they can be edited comfortably in Word:

| File | Pages |
|---|---|
| `EasyUphill-COO-Programme.docx` | 2 |
| `EasyUphill-Registration-Form.docx` | 2 |

## Editing in Word

Everything visual is a **named style**, not hand-applied formatting. Change a style
once (right-click it in the Home > Styles gallery > Modify) and every paragraph using
it updates.

| Style | Used for |
|---|---|
| `Title` | Document title |
| `Heading 1` / `Heading 2` / `Heading 3` | Section / day band / module |
| `EU Kicker` | Small red line above the title |
| `EU Standfirst` | Grey intro paragraph |
| `EU Lead Paragraph` | Body copy |
| `EU Agenda Topics` | Run-in topic lists in the agenda |
| `EU Separator` | The `·` between agenda topics (character style) |
| `EU Field Label` / `EU Field Entry` / `EU Table Head` | Form tables |
| `EU Terms` | Numbered terms and conditions |
| `EU Closing Statement` | Tinted callout |

Notes:

- Headings carry outline levels, so **View > Navigation Pane** lists the whole
  document and a table of contents can be inserted.
- The logo, contact block and footer live in the page header/footer — edit them once
  and every page follows.
- Terms and conditions use automatic numbering: insert or delete a clause and the
  rest renumber themselves.
- Delegate and contact tables are real tables — click a cell and press Tab to move on.

## Rebuilding from source

The `src/` scripts regenerate both files. Copy is separated from layout, so wording
changes only touch `*-content.js`.

```bash
cd src && npm install docx
node build-brochure.js
node build-form.js
```

| File | Purpose |
|---|---|
| `brand.js` | Colours, font, page size, contact details |
| `styles.js` | The Word style sheet shared by both documents |
| `chrome.js` | Page header and footer |
| `brochure-content.js` / `form-content.js` | All copy |
| `build-brochure.js` / `build-form.js` | Layout |
