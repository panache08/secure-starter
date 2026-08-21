// Everything you would normally retype for a new invoice lives here.
// In Word, the same fields are the tinted boxes — type over the [ ... ] placeholders.
module.exports = {
  // South African VAT vendors must head the document "Tax Invoice".
  docTitle: "TAX INVOICE",

  from: {
    label: "From",
    name: "EasyUphill Training",
    lines: [
      "68 Sunstone Street, Germiston, 1401",
      "+27 81 041 7673  ·  training@eubiz.co.za",
      "eubiz.co.za",
      "VAT No. 4xxxxxxxxx  ·  Reg. 20xx/xxxxxx/07",
    ],
  },

  billTo: {
    label: "Bill To",
    name: "[ Client company name ]",
    lines: [
      "[ Address line ]",
      "[ City, postal code ]",
      "Attn: [ contact ]  ·  [ email ]",
    ],
  },

  details: [
    ["Invoice No.", "[ EU-INV-2026-000 ]"],
    ["Issue Date", "[ 00 Month 2026 ]"],
    ["Due Date", "[ 00 Month 2026 ]"],
    ["Terms", "Net 14"],
  ],

  lineColumns: ["Description", "Delegates", "Unit Price", "Amount"],
  lineRows: 6,
  linePlaceholder: ["[ Course or item ]", "[ 0 ]", "[ R 0.00 ]", "[ R 0.00 ]"],

  payment: {
    label: "Payment Details",
    rows: [
      ["Bank", "First National Bank (FNB)"],
      ["Account Name", "EasyUphill Training"],
      ["Account No.", "[ 0000000000 ]"],
      ["Branch Code", "250655"],
      ["Reference", "Your invoice number above"],
    ],
  },

  totals: [["Subtotal", "[ R 0.00 ]"], ["VAT (15%)", "[ R 0.00 ]"]],
  grandTotal: ["Total Due", "[ R 0.00 ]"],

  notesLabel: "Notes",
  notes:
    "Payment is due within the terms above. Certificates are issued on receipt of full payment. " +
    "Thank you for training with EasyUphill.",
};
