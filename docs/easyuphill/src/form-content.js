module.exports = {
  title: "Registration Form",
  intro:
    "To register, complete this form and email it to training@eubiz.co.za. All fields are mandatory. " +
    "For more information, or to arrange an in-house programme for your team, contact us using the " +
    "details above.",

  courseFields: [["Course / Seminar Title", ""], ["Course Date", ""]],

  delegatesHeading: "Delegates",
  delegateColumns: ["#", "Full Name", "Job Title", "Email Address"],
  delegateRows: 8,

  companyHeading: "Company Details",
  companyFields: [["Company Name", ""], ["Company Address", ""]],

  contacts: [
    { heading: "Registration Contact", fields: ["Name", "Job Title", "Email Address", "Telephone"] },
    { heading: "Accounts / Billing Contact", fields: ["Name", "Job Title", "Email Address", "Telephone"] },
  ],

  termsHeading: "Terms & Conditions",
  terms: [
    "Participant registration is confirmed upon receipt of this registration form.",
    "Courses will be confirmed before the date of commencement.",
    "Once a course is confirmed, full payment must be made before the course date.",
    "EasyUphill (Pty) Ltd reserves the right to reschedule or cancel any course in the event of " +
      "unforeseen circumstances; every effort will be made to inform participants.",
    "Substitution of participants may be made up to one week before the workshop, in writing to the " +
      "Training Administrator.",
    "There is no refund for cancellations once the course is confirmed.",
    "By submitting this form, you accept and agree to the terms and conditions as stated.",
    "Payment is by EFT. Banking details will be provided on the invoice.",
    "Please do not make any payment before you receive the invoice.",
  ],

  authorisationHeading: "Authorisation",
  authorisationFields: ["Authorised by", "Designation", "Amount authorised", "Signature", "Date"],

  footer: "EasyUphill Training & Consulting  ·  eubiz.co.za  ·  training@eubiz.co.za  ·  +27 81 041 7673",
};
