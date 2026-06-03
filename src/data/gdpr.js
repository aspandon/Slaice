// GDPR / data-protection mock data shared across personas.

// Consent purposes shown in the cookie banner + customer privacy centre.
export const CONSENT_PURPOSES = [
  { key: "necessary", label: "Strictly necessary", required: true,
    desc: "Sign-in, security, your basket and checkout. Always on — the site can't work without these." },
  { key: "analytics", label: "Analytics", required: false,
    desc: "Anonymous usage stats that help the beach improve the booking experience." },
  { key: "marketing", label: "Marketing", required: false,
    desc: "Personalised offers and weekend deals by e-mail, SMS or push." },
];

// Who processes a customer's personal data, and on what legal basis (Art. 6).
export const PROCESSORS = [
  { name: "Akti tou Iliou AE", role: "Data controller", purpose: "Runs the beach; owns the customer relationship.", location: "Greece (EU)", basis: "Contract" },
  { name: "Slaice", role: "Processor", purpose: "Provides the booking platform on the controller's behalf.", location: "EU (Frankfurt)", basis: "Contract / DPA" },
  { name: "Stripe Payments Europe", role: "Sub-processor", purpose: "Card payments & payouts. Slaice never stores card numbers.", location: "EU / adequacy", basis: "Contract" },
  { name: "AADE — myDATA", role: "Recipient", purpose: "Mandatory e-invoice transmission to the Greek tax authority.", location: "Greece (EU)", basis: "Legal obligation" },
  { name: "Messaging provider", role: "Sub-processor", purpose: "Transactional e-mail/SMS (confirmations, QR codes).", location: "EU", basis: "Contract" },
];

// Retention schedule (controller side).
export const RETENTION = [
  { data: "Bookings & QR tickets", period: "24 months", basis: "Contract / legitimate interest" },
  { data: "Invoices (ΑΠΥ/ΤΠΥ) & myDATA records", period: "5 years", basis: "Greek tax law — overrides erasure", legal: true },
  { data: "Marketing consents & history", period: "Until withdrawn", basis: "Consent" },
  { data: "Support conversations", period: "12 months", basis: "Legitimate interest" },
  { data: "Payment tokens", period: "Held by Stripe", basis: "Contract" },
  { data: "Gate CCTV (where present)", period: "72 hours", basis: "Legitimate interest" },
];

// Customer-facing rights (Art. 15–21).
export const DATA_RIGHTS = [
  { key: "access", icon: "fileDown", title: "Access & portability", desc: "Download a copy of all data we hold about you (machine-readable)." },
  { key: "rectify", icon: "edit", title: "Rectification", desc: "Correct your name, e-mail or phone at any time in Profile." },
  { key: "restrict", icon: "sliders", title: "Restrict / object", desc: "Pause marketing or object to certain processing." },
  { key: "erase", icon: "trash", title: "Erasure", desc: "Delete your account and personal data, subject to legal retention." },
];

// Admin DSAR (Data Subject Access Request) queue — 30-day statutory clock.
export const DSAR_QUEUE = [
  { id: "DSAR-204", type: "Access", subject: "Maria Kostis", email: "maria.k@example.com", received: "28 May", dueDays: 24, status: "In progress" },
  { id: "DSAR-203", type: "Erasure", subject: "Nikos Papas", email: "n.papas@example.com", received: "26 May", dueDays: 22, status: "Awaiting ID" },
  { id: "DSAR-202", type: "Portability", subject: "Sofia Lambrou", email: "sofia.l@example.com", received: "21 May", dueDays: 17, status: "In progress" },
  { id: "DSAR-201", type: "Rectification", subject: "Giorgos Anton", email: "g.anton@example.com", received: "12 May", dueDays: 8, status: "Overdue soon" },
  { id: "DSAR-198", type: "Erasure", subject: "Elena Dropped", email: "elena.x@example.com", received: "2 May", dueDays: -1, status: "Completed" },
];

// Records of Processing Activities (Art. 30) — controller register.
export const ROPA = [
  { activity: "Online sunbed booking", purpose: "Fulfil reservations", categories: "Identity, contact, booking", basis: "Contract", retention: "24 mo" },
  { activity: "Payments & invoicing", purpose: "Take payment, issue ΑΠΥ", categories: "Transaction, tax ID", basis: "Legal obligation", retention: "5 yr" },
  { activity: "Marketing", purpose: "Offers & campaigns", categories: "Contact, preferences", basis: "Consent", retention: "Until withdrawn" },
  { activity: "Gate validation", purpose: "Admit ticket holders", categories: "QR token", basis: "Contract", retention: "Session" },
  { activity: "CRM & segmentation", purpose: "Service & loyalty", categories: "Behavioural, tags", basis: "Legitimate interest", retention: "24 mo" },
];

// Platform (Slaice) — sub-processor sheet.
export const SUBPROCESSORS = [
  { name: "Stripe", purpose: "Payments & Connect payouts", region: "EU", dpa: "Signed" },
  { name: "AWS (Frankfurt)", purpose: "Hosting & storage", region: "EU", dpa: "Signed" },
  { name: "myDATA / AADE", purpose: "e-Invoice transmission", region: "EU", dpa: "Statutory" },
  { name: "Postmark", purpose: "Transactional e-mail", region: "EU", dpa: "Signed" },
  { name: "Twilio", purpose: "SMS / push", region: "EU", dpa: "Signed" },
];

// Platform — breach register with the 72-hour notification clock.
export const BREACHES = [
  { id: "INC-014", date: "—", severity: "None open", status: "All clear", note: "No reportable incidents in the last 12 months." },
];

// Platform — per-tenant DPA / compliance posture.
export const TENANT_DPA = [
  { tenant: "Akti tou Iliou", dpa: "Signed", residency: "EU", dpo: "Yes", lastReview: "Apr 2026" },
  { tenant: "Sun & Sea Paros", dpa: "Signed", residency: "EU", dpo: "Shared", lastReview: "May 2026" },
  { tenant: "Blue Lagoon Beach", dpa: "Pending", residency: "EU", dpo: "No", lastReview: "—" },
];
