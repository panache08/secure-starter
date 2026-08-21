// EasyUphill brand tokens, lifted from the original documents.
const NAVY   = "0C2C5A";  // primary — headings, rules, table headers
const RED    = "A31621";  // accent — kickers, day labels
const INK    = "141A22";  // body text
const SLATE  = "5A6B82";  // secondary / meta text
const TINT   = "F3F6FB";  // pale navy fill
const WHITE  = "FFFFFF";
const FONT   = "Calibri";

// A4 with the narrow margins the originals used.
const PAGE = {
  size: { width: 11906, height: 16838 },
  margin: { top: 680, right: 720, bottom: 620, left: 720, header: 400, footer: 340 },
};
const CONTENT_WIDTH = 11906 - 720 - 720; // 10466 twips

const CONTACT = {
  phone: "+27 81 041 7673",
  email: "training@eubiz.co.za",
  address: "68 Sunstone Street, Germiston, 1401",
  web: "eubiz.co.za",
};

module.exports = { NAVY, RED, INK, SLATE, TINT, WHITE, FONT, PAGE, CONTENT_WIDTH, CONTACT };
