// GDPR rules for the controller workspace (AENR-484…489). Pure functions over
// the privacy state: data-subject requests with a one-month clock and a
// single status machine, the per-person consent log, policy versions, the
// Art. 30 register with LIAs and DPIA screening, and the breach register with
// the 72-hour clock. Roles: the tenant is the controller, Slaice the processor.

/* ---------- Dates ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
/** Calendar months, clamped to the month's last day (31 Jan + 1 → 28/29 Feb). */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(Math.min(d, last))}`;
}
export const daysBetween = (a: string, b: string) =>
  Math.round(
    (Date.parse(`${b.slice(0, 10)}T00:00:00Z`) - Date.parse(`${a.slice(0, 10)}T00:00:00Z`)) / 864e5,
  );
export const fmtDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/* ---------- Data-subject requests (Art. 12, 15–21) ---------- */
export const DSAR_TYPES = [
  "Access",
  "Portability",
  "Rectification",
  "Erasure",
  "Restriction",
  "Objection",
] as const;
export type DsarType = (typeof DSAR_TYPES)[number];
export const DSAR_ARTICLE: Record<DsarType, string> = {
  Access: "Art. 15",
  Portability: "Art. 20",
  Rectification: "Art. 16",
  Erasure: "Art. 17",
  Restriction: "Art. 18",
  Objection: "Art. 21",
};
export type DsarStatus =
  | "Received"
  | "Verifying identity"
  | "In progress"
  | "Extended"
  | "Completed"
  | "Refused";
export const DSAR_CHANNELS = ["Privacy Centre", "E-mail", "Phone", "In person"] as const;
export type DsarChannel = (typeof DSAR_CHANNELS)[number];
export const VERIFY_METHODS = [
  "Account login",
  "E-mail link",
  "ID document (sighted, not copied)",
] as const;
export interface AuditLine {
  at: string;
  by: string;
  what: string;
}
export interface DsarRequest {
  id: string;
  type: DsarType;
  guestId?: number;
  first: string;
  last: string;
  email: string;
  phone: string;
  channel: DsarChannel;
  received: string;
  status: DsarStatus;
  /** What the subject asked for, in their words. */
  detail?: string;
  verification?: { method: string; by: string; at: string };
  extension?: { months: 1 | 2; reason: string; noticeSentAt: string };
  refusal?: {
    ground: "Manifestly unfounded" | "Excessive" | "Identity not verified";
    reason: string;
    informedAt: string;
  };
  stepsDone: number;
  /** Art. 19 — recipients told about a rectification / erasure / restriction. */
  notified?: string[];
  completedAt?: string;
  audit: AuditLine[];
}
/** The single status machine (Art. 12): what each status may move to. */
export const DSAR_NEXT: Record<DsarStatus, DsarStatus[]> = {
  Received: ["Verifying identity", "Refused"],
  "Verifying identity": ["In progress", "Refused"],
  "In progress": ["Extended", "Completed", "Refused"],
  Extended: ["Completed", "Refused"],
  Completed: [],
  Refused: [],
};
export const isOpen = (r: DsarRequest) => r.status !== "Completed" && r.status !== "Refused";
/** One calendar month from receipt, plus up to two more when extended. */
export const dueDate = (r: Pick<DsarRequest, "received" | "extension">) =>
  addMonths(r.received, 1 + (r.extension?.months ?? 0));
export const daysLeft = (r: DsarRequest, today: string) => daysBetween(today, dueDate(r));
/** Extensions must be notified to the requester within the first month. */
export const canExtend = (r: DsarRequest, today: string) =>
  r.status === "In progress" && !r.extension && today <= addMonths(r.received, 1);

/** Art. 19 recipients for requests that change or remove data. */
export const RECIPIENTS = ["Stripe (payments)", "Messaging provider", "Accountant export"];
export const needsRecipientNotice = (t: DsarType) =>
  t === "Rectification" || t === "Erasure" || t === "Restriction";

export interface DsarStep {
  label: string;
  detail: string;
  action: string;
}
export function dsarSteps(t: DsarType): DsarStep[] {
  const locate = {
    label: "Locate personal data",
    detail: "Bookings, invoices, consents, CRM notes, messages and support history.",
    action: "Data located",
  };
  const confirm = {
    label: "Reply to the requester",
    detail: "Plain-language answer to the verified address.",
    action: "Reply sent",
  };
  const notify = {
    label: "Notify recipients (Art. 19)",
    detail: "Tell Stripe, the messaging provider and the accountant export about the change.",
    action: "Recipients notified",
  };
  switch (t) {
    case "Access":
    case "Portability":
      return [
        locate,
        {
          label:
            t === "Access"
              ? "Compile copy + Art. 15 information"
              : "Compile machine-readable export",
          detail:
            t === "Access"
              ? "Data copy plus purposes, recipients, retention, source and profiling information."
              : "JSON + CSV of data the subject provided, under contract or consent.",
          action: "Package built",
        },
        {
          label: "Send secure download",
          detail: "Time-limited link to the verified address.",
          action: "Link sent",
        },
      ];
    case "Erasure":
      return [
        locate,
        {
          label: "Apply legal holds",
          detail: "Invoices (ΑΠΥ/ΤΠΥ) stay 5 years under Greek tax law — excluded from erasure.",
          action: "Holds applied",
        },
        {
          label: "Erase the rest",
          detail: "Profile, marketing history, notes and non-retained records.",
          action: "Data erased",
        },
        notify,
        confirm,
      ];
    case "Rectification":
      return [
        locate,
        {
          label: "Apply correction",
          detail: "Update the fields and re-issue any affected receipt.",
          action: "Correction applied",
        },
        notify,
        confirm,
      ];
    case "Restriction":
      return [
        locate,
        {
          label: "Restrict processing",
          detail:
            "Flag the account: data kept but not used (no marketing, no profiling, no edits).",
          action: "Account restricted",
        },
        notify,
        confirm,
      ];
    default:
      return [
        locate,
        {
          label: "Stop the processing objected to",
          detail: "Marketing and profiling stop unless compelling legitimate grounds override.",
          action: "Processing stopped",
        },
        confirm,
      ];
  }
}

export function dsarKpis(rs: readonly DsarRequest[], today: string) {
  const open = rs.filter(isOpen);
  const done = rs.filter((r) => r.status === "Completed" && r.completedAt);
  const avg = done.length
    ? done.reduce((a, r) => a + daysBetween(r.received, r.completedAt ?? r.received), 0) /
      done.length
    : 0;
  return {
    open: open.length,
    overdue: open.filter((r) => daysLeft(r, today) < 0).length,
    dueSoon: open.filter((r) => {
      const d = daysLeft(r, today);
      return d >= 0 && d <= 10;
    }).length,
    avgDays: Math.round(avg * 10) / 10,
    completed: done.length,
  };
}

/* ---------- Consent (Art. 7, ePrivacy) ---------- */
export type ConsentPurpose = "analytics" | "marketing_cookies" | "email" | "sms" | "viber" | "push";
export const PURPOSE_LABEL: Record<ConsentPurpose, string> = {
  analytics: "Analytics cookies",
  marketing_cookies: "Marketing cookies",
  email: "Marketing · e-mail",
  sms: "Marketing · SMS",
  viber: "Marketing · Viber",
  push: "Marketing · push",
};
export const CHANNEL_PURPOSES: ConsentPurpose[] = ["email", "sms", "viber", "push"];
export type ConsentSource =
  | "Cookie banner"
  | "Privacy Centre"
  | "Checkout"
  | "Staff"
  | "Unsubscribe link"
  | "Sign-up";
export interface ConsentRecord {
  id: string;
  guestId: number;
  purpose: ConsentPurpose;
  granted: boolean;
  at: string;
  source: ConsentSource;
  /** Privacy-notice version shown when the choice was made. */
  version: string;
  wording: string;
}
/** Latest record for a guest and purpose (the log itself is append-only). */
export function latest(
  log: readonly ConsentRecord[],
  guestId: number,
  p: ConsentPurpose,
): ConsentRecord | undefined {
  let hit: ConsentRecord | undefined;
  for (const r of log)
    if (r.guestId === guestId && r.purpose === p && (!hit || r.at >= hit.at)) hit = r;
  return hit;
}
export function consentRates(log: readonly ConsentRecord[], guestIds: readonly number[]) {
  const purposes: ConsentPurpose[] = ["analytics", "email", "sms", "viber", "push"];
  return purposes.map((p) => {
    const recs = guestIds.map((g) => latest(log, g, p)).filter((r): r is ConsentRecord => !!r);
    const yes = recs.filter((r) => r.granted).length;
    return {
      purpose: p,
      rate: guestIds.length ? Math.round((yes / guestIds.length) * 100) : 0,
      granted: yes,
      recorded: recs.length,
    };
  });
}
export const withdrawals = (log: readonly ConsentRecord[], sinceIso: string) =>
  log.filter((r) => !r.granted && r.at >= sinceIso).length;

/* ---------- Policies & cookies ---------- */
export interface Policy {
  id: string;
  kind: "privacy" | "cookie";
  version: string;
  status: "Draft" | "Published" | "Superseded";
  effective: string;
  /** A material change re-asks returning visitors for consent. */
  material: boolean;
  changelog: string;
  body: string;
}
export const currentPolicy = (ps: readonly Policy[], kind: Policy["kind"]) =>
  ps.find((p) => p.kind === kind && p.status === "Published");
/** Version a visitor must have accepted: the latest material privacy policy. */
export function consentVersion(ps: readonly Policy[]): string {
  const material = ps
    .filter((p) => p.kind === "privacy" && p.status !== "Draft" && p.material)
    .sort((a, b) => b.effective.localeCompare(a.effective));
  return material[0]?.version ?? currentPolicy(ps, "privacy")?.version ?? "1";
}
export const nextVersion = (ps: readonly Policy[], kind: Policy["kind"]) =>
  String(
    Math.max(
      0,
      ...ps.filter((p) => p.kind === kind).map((p) => Math.floor(Number(p.version)) || 0),
    ) + 1,
  );
export interface CookieItem {
  name: string;
  provider: string;
  category: "necessary" | "analytics" | "marketing";
  purpose: string;
  duration: string;
  party: "First" | "Third";
}

/* ---------- Register (Art. 30), LIA (Art. 6(1)(f)), DPIA (Art. 35) ---------- */
export const BASES = [
  "Contract",
  "Legal obligation",
  "Consent",
  "Legitimate interest",
  "Vital interest",
  "Public task",
] as const;
export interface Lia {
  purpose: string;
  necessity: string;
  balancing: string;
  outcome: "Proceed" | "Proceed with safeguards" | "Do not proceed";
  review: string;
}
export interface Activity {
  id: string;
  name: string;
  purpose: string;
  basis: (typeof BASES)[number];
  subjects: string;
  dataCats: string;
  recipients: string;
  transfers: string;
  safeguard: string;
  retention: string;
  security: string;
  profiling: boolean;
  lia?: Lia;
  archived?: boolean;
}
export const ART30_FIELDS: [keyof Activity, string][] = [
  ["name", "Activity"],
  ["purpose", "Purpose"],
  ["subjects", "Categories of data subjects"],
  ["dataCats", "Categories of personal data"],
  ["recipients", "Recipients"],
  ["transfers", "International transfers"],
  ["retention", "Retention"],
  ["security", "Security measures"],
];
export function activityErrors(a: Activity): string[] {
  const e = ART30_FIELDS.filter(([k]) => !String(a[k] ?? "").trim()).map(
    ([, l]) => `${l} is required (Art. 30(1)).`,
  );
  if (a.transfers.trim() && !/^none/i.test(a.transfers.trim()) && !a.safeguard.trim())
    e.push("Name the safeguard for the international transfer (adequacy, DPF or SCCs).");
  if (a.basis === "Legitimate interest") {
    const l = a.lia;
    if (!l || !l.purpose.trim() || !l.necessity.trim() || !l.balancing.trim() || !l.review)
      e.push(
        "Legitimate interest needs a completed LIA — purpose, necessity and balancing tests, review date.",
      );
  }
  return e;
}
/** EDPB DPIA screening criteria (WP248 rev.01): two or more → DPIA likely required. */
export const DPIA_CRITERIA = [
  "Evaluation or scoring (incl. profiling)",
  "Automated decisions with legal or similar effect",
  "Systematic monitoring (e.g. CCTV)",
  "Sensitive or highly personal data",
  "Large-scale processing",
  "Matching or combining datasets",
  "Vulnerable data subjects (e.g. children)",
  "Innovative technology",
  "Prevents exercising a right or using a service",
];
export interface Dpia {
  id: string;
  activity: string;
  criteria: string[];
  status: "Not required" | "In progress" | "Done" | "Review due";
  owner: string;
  review: string;
  outcome?: string;
}
export const dpiaRequired = (criteria: readonly string[]) => criteria.length >= 2;

/* ---------- Retention ---------- */
export interface RetentionRow {
  id: string;
  data: string;
  basis: string;
  legal?: boolean;
  num: number | null;
  unit: string;
  text?: string;
}
export const retentionLabel = (r: RetentionRow) =>
  r.num !== null ? `${r.num} ${r.unit}` : (r.text ?? "");

/* ---------- Processors, transfers, DPA (Art. 28, 44–49) ---------- */
export type Safeguard =
  | "EU / EEA"
  | "Adequacy decision"
  | "EU-US Data Privacy Framework"
  | "SCCs (2021/914)";
export interface SubProcessor {
  name: string;
  purpose: string;
  location: string;
  safeguard: Safeguard;
  tia?: string;
  addedAt: string;
  /** End of the objection window for a newly added sub-processor. */
  windowEnds?: string;
}
export const isEu = (s: SubProcessor) => s.safeguard === "EU / EEA";
export const inWindow = (s: SubProcessor, today: string) => !!s.windowEnds && today <= s.windowEnds;

/* ---------- Breaches (Art. 33–34) ---------- */
export type Risk = "Unlikely to result in a risk" | "Risk" | "High risk";
export interface Breach {
  id: string;
  title: string;
  /** When the controller became aware (or was notified by Slaice). */
  awareAt: string;
  source: "Tenant" | "Slaice (processor)";
  facts: string;
  categories: string;
  people: number;
  records: number;
  consequences: string;
  measures: string;
  risk: Risk;
  notifiable?: boolean;
  decisionReason?: string;
  authority: { phase: "Initial" | "Follow-up"; at: string }[];
  subjects?: { text: string; sentAt: string };
  closedAt?: string;
  tenantIds?: string[];
}
export const BREACH_HOURS = 72;
export function hoursLeft(b: Breach, nowMs: number): number {
  return BREACH_HOURS - (nowMs - Date.parse(b.awareAt)) / 36e5;
}
export function closeErrors(b: Breach): string[] {
  const e: string[] = [];
  if (b.notifiable === undefined) e.push("Decide whether the breach is notifiable (Art. 33(1)).");
  if (!b.decisionReason?.trim()) e.push("Record the reason for the decision (Art. 33(5)).");
  if (b.notifiable && !b.authority.length)
    e.push("File the notification to the Hellenic DPA first.");
  if (b.risk === "High risk" && !b.subjects)
    e.push("High risk: tell the affected people (Art. 34) before closing.");
  return e;
}
/** Draft authority notification with every Art. 33(3) element. */
export function authorityDraft(
  b: Breach,
  dpo: { name: string; email: string; phone?: string },
  controller: string,
): { field: string; value: string }[] {
  return [
    { field: "Controller", value: controller },
    { field: "(a) Nature of the breach", value: b.facts || "—" },
    { field: "(a) Categories of data subjects / personal data", value: b.categories || "—" },
    { field: "(a) Approximate number of data subjects", value: String(b.people) },
    { field: "(a) Approximate number of records", value: String(b.records) },
    {
      field: "(b) DPO / contact point",
      value: `${dpo.name} · ${dpo.email}${dpo.phone ? ` · ${dpo.phone}` : ""}`,
    },
    { field: "(c) Likely consequences", value: b.consequences || "—" },
    { field: "(d) Measures taken or proposed", value: b.measures || "—" },
    { field: "Became aware", value: new Date(b.awareAt).toLocaleString("en-GB") },
  ];
}

/** A transfer impact assessment for a sub-processor outside the EU (AENR-593) — the
 *  standard EDPB steps, filled from the register entry. */
export function tiaReport(s: { name: string; purpose: string; location: string; safeguard: string; tia?: string }) {
  return {
    brand: "Slaice · processor",
    title: `Transfer impact assessment · ${s.name}`,
    subtitle: `${s.tia?.replace(/\.pdf$/, "") ?? "TIA"} · EDPB Recommendations 01/2020`,
    meta: [`Purpose: ${s.purpose} · data location: ${s.location}`],
    sections: [
      {
        title: "Assessment",
        table: {
          cols: ["Step", "Finding"],
          rows: [
            ["1 · Know the transfer", `${s.name} processes guest contact and transaction data for: ${s.purpose}.`],
            ["2 · Transfer tool", s.safeguard],
            ["3 · Law and practice in the destination", "Covered by the EU-US Data Privacy Framework adequacy decision (10 Jul 2023); certification checked."],
            ["4 · Supplementary measures", "Encryption in transit and at rest, data minimisation, pseudonymised identifiers where possible."],
            ["5 · Procedural steps", "DPA with SCCs as fallback; sub-processor notice 30 days before changes."],
            ["6 · Re-evaluation", "Yearly, or when the framework or the provider's certification changes."],
          ],
        },
      },
    ],
    footer: ["Conclusion: the transfer may proceed with the measures above."],
  };
}
