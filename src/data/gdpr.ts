// GDPR / data-protection sample data shared across personas, plus the seeded
// privacy state (AENR-484…489) the admin, customer and platform screens share.

import type {
  Activity,
  Breach,
  ConsentRecord,
  CookieItem,
  Dpia,
  DsarRequest,
  Policy,
  RetentionRow,
  SubProcessor,
} from "../domain/gdpr";
import { CUSTOMERS } from "./mock";
import { guestFacts } from "./guests";

// Consent purposes shown in the cookie banner + customer privacy centre.
export const CONSENT_PURPOSES = [
  { key: "necessary", label: "Strictly necessary", required: true,
    desc: "Sign-in, security, your basket and checkout. Always on — the site can't work without these." },
  { key: "analytics", label: "Analytics", required: false,
    desc: "Anonymous usage stats that help the beach improve the booking experience." },
  { key: "marketing", label: "Marketing", required: false,
    desc: "Cookies that measure our ads and show you relevant offers on other sites. Offers by e-mail, SMS, Viber or push are chosen separately in Account → Privacy & data." },
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
  { data: "Account & profile", period: "Until deletion + 30 days", basis: "Contract" },
  { data: "Analytics events (anonymised)", period: "14 months", basis: "Consent" },
  { data: "Payment tokens", period: "Held by Stripe", basis: "Contract" },
  { data: "Gate CCTV (where present)", period: "72 hours", basis: "Legitimate interest" },
];

// Customer-facing rights (Art. 15–21).
export const DATA_RIGHTS = [
  { key: "access", icon: "fileDown", title: "Access & portability", desc: "Download a copy of all data we hold about you (machine-readable)." },
  { key: "rectify", icon: "edit", title: "Rectification", desc: "Correct your name, e-mail or phone at any time in Profile." },
  { key: "restrict", icon: "sliders", title: "Restrict / object", desc: "Pause how we use your data, or object to profiling and marketing." },
  { key: "erase", icon: "trash", title: "Erasure", desc: "Delete your account and personal data, subject to legal retention." },
];


/* ============ Privacy state (AENR-484…489) ============ */
export interface PrivacyState {
  requests: DsarRequest[];
  consentLog: ConsentRecord[];
  policies: Policy[];
  cookies: CookieItem[];
  activities: Activity[];
  dpias: Dpia[];
  retention: RetentionRow[];
  retentionHistory: { at: string; by: string; data: string; from: string; to: string }[];
  anonRuns: { at: string; by: string; auto: boolean; counts: { data: string; n: number }[] }[];
  dpo: { name: string; email: string; phone: string; address: string };
  subprocessors: SubProcessor[];
  /** Sub-processors the tenant objected to inside the window. */
  objections: string[];
  dpa: { current: string; signedVersion: string; signedAt: string };
  breaches: Breach[];
}

const A = (at: string, by: string, what: string) => ({ at, by, what });
const SEED_REQUESTS: DsarRequest[] = [
  { id: "DSAR-204", type: "Access", first: "Maria", last: "Kostis", email: "maria.kostis@example.com", phone: "+30 697 200 0014", channel: "E-mail", received: "2026-07-08", status: "In progress", stepsDone: 1, verification: { method: "E-mail link", by: "Eleni Markou", at: "2026-07-09" }, audit: [A("2026-07-08", "System", "Received by e-mail"), A("2026-07-09", "Eleni Markou", "Identity verified · E-mail link"), A("2026-07-10", "Eleni Markou", "Step done · Data located")] },
  { id: "DSAR-203", type: "Erasure", guestId: 2, first: "Nikos", last: "Papas", email: "nikos.papas@example.com", phone: "+30 694 100 0002", channel: "Phone", received: "2026-07-02", status: "Verifying identity", stepsDone: 0, audit: [A("2026-07-02", "Eleni Markou", "Logged from a phone call"), A("2026-07-03", "Eleni Markou", "Verification link sent")] },
  { id: "DSAR-202", type: "Portability", first: "Sofia", last: "Lambrou", email: "sofia.lambrou@example.com", phone: "+30 697 200 0022", channel: "Privacy Centre", received: "2026-06-30", status: "In progress", stepsDone: 2, verification: { method: "Account login", by: "System", at: "2026-06-30" }, audit: [A("2026-06-30", "System", "Submitted in the Privacy Centre · verified by account login")] },
  { id: "DSAR-201", type: "Rectification", first: "Giorgos", last: "Antoniou", email: "g.antoniou@example.com", phone: "+30 697 200 0031", channel: "In person", received: "2026-06-25", status: "In progress", stepsDone: 1, detail: "Surname misspelt on invoices (Antoniou).", verification: { method: "ID document (sighted, not copied)", by: "Kostas Ioannou", at: "2026-06-25" }, audit: [A("2026-06-25", "Kostas Ioannou", "Logged at the cashier · ID sighted")] },
  { id: "DSAR-200", type: "Access", guestId: 13, first: "Christina", last: "Rapti", email: "c.raptis@example.com", phone: "+30 694 100 0013", channel: "E-mail", received: "2026-06-15", status: "In progress", stepsDone: 1, verification: { method: "E-mail link", by: "Eleni Markou", at: "2026-06-16" }, audit: [A("2026-06-15", "System", "Received by e-mail"), A("2026-06-16", "Eleni Markou", "Identity verified · E-mail link")] },
  { id: "DSAR-199", type: "Restriction", guestId: 14, first: "Vasilis", last: "Dimou", email: "v.dimou@example.com", phone: "+30 694 100 0014", channel: "E-mail", received: "2026-07-16", status: "Received", stepsDone: 0, detail: "Contests the accuracy of a refund record — asks to restrict use until checked.", audit: [A("2026-07-16", "System", "Received by e-mail")] },
  { id: "DSAR-198", type: "Objection", guestId: 17, first: "Marina", last: "Georgiou", email: "marina.geo@example.com", phone: "+30 694 100 0017", channel: "Privacy Centre", received: "2026-06-10", status: "Extended", stepsDone: 1, verification: { method: "Account login", by: "System", at: "2026-06-10" }, extension: { months: 1, reason: "Objection covers four years of CRM history and partner data — needs a full review.", noticeSentAt: "2026-07-01" }, audit: [A("2026-06-10", "System", "Submitted in the Privacy Centre"), A("2026-07-01", "Eleni Markou", "Extended by 1 month · notice sent to the requester")] },
  { id: "DSAR-197", type: "Access", guestId: 16, first: "Thanos", last: "Petrou", email: "t.petrou@example.com", phone: "+30 694 100 0016", channel: "E-mail", received: "2026-05-20", status: "Completed", stepsDone: 3, completedAt: "2026-06-02", verification: { method: "E-mail link", by: "Eleni Markou", at: "2026-05-21" }, audit: [A("2026-05-20", "System", "Received"), A("2026-06-02", "Eleni Markou", "Completed · download link sent")] },
  { id: "DSAR-196", type: "Erasure", first: "Elena", last: "Drosou", email: "elena.drosou@example.com", phone: "+30 697 200 0048", channel: "Privacy Centre", received: "2026-05-11", status: "Completed", stepsDone: 5, completedAt: "2026-05-28", notified: ["Stripe (payments)", "Messaging provider", "Accountant export"], verification: { method: "Account login", by: "System", at: "2026-05-11" }, audit: [A("2026-05-11", "System", "Submitted in the Privacy Centre"), A("2026-05-28", "Eleni Markou", "Completed · invoices kept under tax law")] },
  { id: "DSAR-195", type: "Rectification", guestId: 19, first: "Katerina", last: "Manou", email: "k.manou@example.com", phone: "+30 694 100 0019", channel: "E-mail", received: "2026-05-06", status: "Completed", stepsDone: 4, completedAt: "2026-05-09", notified: ["Stripe (payments)", "Accountant export"], verification: { method: "E-mail link", by: "Eleni Markou", at: "2026-05-06" }, audit: [A("2026-05-06", "System", "Received"), A("2026-05-09", "Eleni Markou", "Completed")] },
  { id: "DSAR-194", type: "Access", first: "Petros", last: "Galanis", email: "p.galanis@example.com", phone: "+30 697 200 0090", channel: "E-mail", received: "2026-05-02", status: "Refused", stepsDone: 0, refusal: { ground: "Manifestly unfounded", reason: "Sixth identical request in 30 days, each answered in full; the requester stated the aim is to disrupt operations.", informedAt: "2026-05-04" }, audit: [A("2026-05-02", "System", "Received"), A("2026-05-04", "Eleni Markou", "Refused · informed of the right to complain to the Hellenic DPA and to a court")] },
];

/* Consent log seeded from each guest's sign-up choices (deterministic). */
function seedConsent(): ConsentRecord[] {
  const out: ConsentRecord[] = [];
  for (const c of CUSTOMERS) {
    const g = guestFacts(c, c.tags);
    const at = `${g.firstVisit}T10:00`;
    const rec = (purpose: ConsentRecord["purpose"], granted: boolean, when = at, source: ConsentRecord["source"] = "Sign-up", version = "1") =>
      out.push({ id: `c-${c.id}-${purpose}-${when}`, guestId: c.id, purpose, granted, at: when, source, version, wording: granted ? "Yes, send me offers" : "No thanks" });
    rec("analytics", c.id % 3 !== 0, at, "Cookie banner");
    rec("email", g.consent.includes("email"));
    rec("sms", g.consent.includes("sms"));
    rec("viber", g.consent.includes("viber"));
    rec("push", g.channel === "Online" || c.id === 3);
  }
  // A few later withdrawals.
  out.push({ id: "c-6-sms-w", guestId: 6, purpose: "sms", granted: false, at: "2026-07-12T19:40", source: "Unsubscribe link", version: "2", wording: "Reply STOP" });
  out.push({ id: "c-10-email-w", guestId: 10, purpose: "email", granted: false, at: "2026-07-05T08:12", source: "Privacy Centre", version: "2", wording: "Marketing · e-mail off" });
  return out;
}

const PRIVACY_V2 = `Who we are: Akti tou Iliou AE, Alimos — the controller of your data. Slaice provides the booking platform as our processor.

What we collect: your name, contact details, bookings, payments (handled by Stripe — we never see your card number), your consents and, if you agree, how you use the site.

Why: to take and manage your bookings (contract), to issue invoices (legal obligation), to improve service and tailor offers through segments and visit history (legitimate interest — you can object), and to send offers on the channels you choose (consent).

Profiling: we group guests by visits and spend (segments, lifecycle stage) to tailor offers. It has no legal or similar effect on you, and you can object at any time.

Children: accounts are for adults (18+). Child entry tickets record only the category and count — no names or dates of birth.

Your rights: access, portability, rectification, erasure, restriction and objection — in Account → Privacy & data, or by writing to our DPO. You can complain to the Hellenic Data Protection Authority (www.dpa.gr).`;

export const DEFAULT_PRIVACY: PrivacyState = {
  requests: SEED_REQUESTS,
  consentLog: seedConsent(),
  policies: [
    { id: "pp-1", kind: "privacy", version: "1", status: "Superseded", effective: "2025-04-01", material: true, changelog: "First published notice.", body: "Original privacy notice (2025 season)." },
    { id: "pp-2", kind: "privacy", version: "2", status: "Published", effective: "2026-03-01", material: true, changelog: "Added profiling (segments, lifecycle), Viber as a channel and the children's section.", body: PRIVACY_V2 },
    { id: "cp-1", kind: "cookie", version: "1", status: "Published", effective: "2026-03-01", material: false, changelog: "Cookie inventory published.", body: "We use strictly-necessary cookies to run the site and, with your consent, analytics and marketing cookies. The full list with providers and durations is below; change your choice any time in Account → Privacy & data." },
  ],
  cookies: [
    { name: "slaice_session", provider: "Akti tou Iliou (Slaice)", category: "necessary", purpose: "Keeps you signed in and secures requests", duration: "Session", party: "First" },
    { name: "slaice_basket", provider: "Akti tou Iliou (Slaice)", category: "necessary", purpose: "Remembers your basket during booking", duration: "7 days", party: "First" },
    { name: "__cf_bm", provider: "Cloudflare", category: "necessary", purpose: "Bot protection", duration: "30 minutes", party: "Third" },
    { name: "__stripe_mid", provider: "Stripe", category: "necessary", purpose: "Fraud prevention at checkout", duration: "1 year", party: "Third" },
    { name: "slaice_an", provider: "Akti tou Iliou (Slaice)", category: "analytics", purpose: "Anonymous usage statistics", duration: "13 months", party: "First" },
    { name: "_fbp", provider: "Meta", category: "marketing", purpose: "Measures ad campaigns", duration: "3 months", party: "Third" },
    { name: "_gcl_au", provider: "Google Ads", category: "marketing", purpose: "Ad conversion measurement", duration: "90 days", party: "Third" },
  ],
  activities: [
    { id: "ra-booking", name: "Online sunbed booking", purpose: "Take and manage reservations", basis: "Contract", subjects: "Customers", dataCats: "Identity, contact, booking details", recipients: "Slaice (processor), Stripe", transfers: "None", safeguard: "", retention: "Bookings & QR tickets", security: "TLS, role-based access, EU hosting", profiling: false },
    { id: "ra-pay", name: "Payments & invoicing", purpose: "Take payment, issue ΑΠΥ / ΤΠΥ", basis: "Legal obligation", subjects: "Customers", dataCats: "Transaction, tax ID", recipients: "Stripe, AADE myDATA, accountant", transfers: "USA (Stripe Inc. fraud tooling)", safeguard: "EU-US Data Privacy Framework", retention: "Invoices (ΑΠΥ/ΤΠΥ) & myDATA records", security: "Tokenised cards (PCI DSS by Stripe)", profiling: false },
    { id: "ra-mkt", name: "Marketing", purpose: "Offers and campaigns", basis: "Consent", subjects: "Customers who opted in", dataCats: "Contact, preferences, consent history", recipients: "Messaging provider", transfers: "USA (Twilio, Postmark)", safeguard: "EU-US Data Privacy Framework", retention: "Marketing consents & history", security: "Consent check on every send, opt-out footer", profiling: false },
    { id: "ra-crm", name: "CRM & segmentation", purpose: "Service, loyalty and tailored offers", basis: "Legitimate interest", subjects: "Customers", dataCats: "Visits, spend, segments, lifecycle stage", recipients: "Slaice (processor)", transfers: "None", safeguard: "", retention: "Bookings & QR tickets", security: "Role-based access, no special categories", profiling: true, lia: { purpose: "Recognise regulars and tailor service and offers.", necessity: "Visit and spend history is the least data that shows who is a regular; no third-party data is added.", balancing: "Guests expect a beach club to recognise them; profiling has no legal effect, objection is one click and marketing still needs consent.", outcome: "Proceed with safeguards", review: "2027-03-01" } },
    { id: "ra-support", name: "Customer support", purpose: "Resolve questions and complaints", basis: "Legitimate interest", subjects: "Customers, visitors", dataCats: "Contact, conversation", recipients: "Slaice (processor)", transfers: "None", safeguard: "", retention: "Support conversations", security: "Access limited to staff on duty", profiling: false, lia: { purpose: "Answer the guest's own request.", necessity: "Only what the guest sends us.", balancing: "Expected by the guest; deleted after 12 months.", outcome: "Proceed", review: "2027-03-01" } },
    { id: "ra-cctv", name: "Gate CCTV", purpose: "Safety and loss prevention at the entrance", basis: "Legitimate interest", subjects: "Visitors, staff", dataCats: "Images", recipients: "Police on lawful request", transfers: "None", safeguard: "", retention: "Gate CCTV (where present)", security: "Local recorder, 72-hour overwrite, signage at the gate", profiling: false, lia: { purpose: "Protect guests, staff and property at the gate.", necessity: "Cameras cover only the gate and the till — not sunbeds or changing areas.", balancing: "Signage, 72-hour retention, no audio, viewing logged.", outcome: "Proceed with safeguards", review: "2026-09-30" } },
  ],
  dpias: [
    { id: "dpia-cctv", activity: "Gate CCTV", criteria: ["Systematic monitoring (e.g. CCTV)", "Vulnerable data subjects (e.g. children)"], status: "In progress", owner: "Eleni Markou", review: "2026-08-31" },
    { id: "dpia-prof", activity: "CRM & segmentation", criteria: ["Evaluation or scoring (incl. profiling)", "Matching or combining datasets"], status: "Done", owner: "Eleni Markou", review: "2027-03-01", outcome: "Residual risk low — objection link in every message, no automated decisions." },
  ],
  retention: [
    { id: "rt-book", data: "Bookings & QR tickets", basis: "Contract / legitimate interest", num: 24, unit: "months" },
    { id: "rt-inv", data: "Invoices (ΑΠΥ/ΤΠΥ) & myDATA records", basis: "Greek tax law — overrides erasure", legal: true, num: 5, unit: "years" },
    { id: "rt-mkt", data: "Marketing consents & history", basis: "Consent", num: null, unit: "", text: "Until withdrawn" },
    { id: "rt-sup", data: "Support conversations", basis: "Legitimate interest", num: 12, unit: "months" },
    { id: "rt-acc", data: "Account & profile", basis: "Contract", num: null, unit: "", text: "Until deletion + 30 days" },
    { id: "rt-an", data: "Analytics events (anonymised)", basis: "Consent", num: 14, unit: "months" },
    { id: "rt-child", data: "Child entry tickets (category & count only)", basis: "Contract", num: 24, unit: "months" },
    { id: "rt-cctv", data: "Gate CCTV (where present)", basis: "Legitimate interest", num: 72, unit: "hours" },
  ],
  retentionHistory: [{ at: "2026-03-01T09:00", by: "Eleni Markou", data: "Support conversations", from: "24 months", to: "12 months" }],
  anonRuns: [{ at: "2026-07-19T03:00", by: "Nightly job", auto: true, counts: [{ data: "Bookings & QR tickets", n: 38 }, { data: "Support conversations", n: 12 }, { data: "Gate CCTV (where present)", n: 3 }] }],
  dpo: { name: "Data Protection Officer · Akti tou Iliou", email: "dpo@aktitouiliou.gr", phone: "+30 210 985 0000", address: "Poseidonos Ave 32, 174 55 Alimos, Greece" },
  subprocessors: [
    { name: "AWS (Frankfurt)", purpose: "Hosting & storage", location: "Germany", safeguard: "EU / EEA", addedAt: "2025-01-10" },
    { name: "Stripe", purpose: "Payments & Connect payouts", location: "Ireland · USA (fraud tooling)", safeguard: "EU-US Data Privacy Framework", tia: "TIA-Stripe-2026.pdf", addedAt: "2025-01-10" },
    { name: "Postmark", purpose: "Transactional e-mail", location: "USA", safeguard: "EU-US Data Privacy Framework", tia: "TIA-Postmark-2026.pdf", addedAt: "2025-01-10" },
    { name: "Twilio", purpose: "SMS / push", location: "USA", safeguard: "EU-US Data Privacy Framework", tia: "TIA-Twilio-2026.pdf", addedAt: "2025-01-10" },
    { name: "Cloudflare", purpose: "CDN & DDoS protection", location: "Global edge · USA", safeguard: "SCCs (2021/914)", tia: "TIA-Cloudflare-2026.pdf", addedAt: "2025-01-10" },
    { name: "Sentry", purpose: "Error monitoring", location: "Germany (EU data region)", safeguard: "EU / EEA", addedAt: "2025-04-02" },
    { name: "Vercel", purpose: "Front-end delivery", location: "USA", safeguard: "EU-US Data Privacy Framework", tia: "TIA-Vercel-2026.pdf", addedAt: "2025-04-02" },
  ],
  objections: [],
  dpa: { current: "2.1", signedVersion: "2.1", signedAt: "2026-02-10" },
  breaches: [
    { id: "BR-003", title: "Booking confirmation sent to the wrong e-mail", awareAt: "2026-06-14T11:20:00Z", source: "Tenant", facts: "A cashier typed a guest's e-mail wrongly; one confirmation (name, date, zone) went to a stranger, who reported it.", categories: "Customers · name, booking date, zone", people: 1, records: 1, consequences: "Minimal — no contact or payment data; the recipient deleted it.", measures: "Recipient confirmed deletion; e-mail now double-entered at the till.", risk: "Unlikely to result in a risk", notifiable: false, decisionReason: "One record, no sensitive or financial data, recipient confirmed deletion — unlikely to result in a risk (Art. 33(1)). Documented under Art. 33(5).", authority: [], closedAt: "2026-06-15T09:00:00Z" },
  ],
};
