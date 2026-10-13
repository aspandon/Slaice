// Tenants on the Slaice platform (AENR-500 / 515 / 517 / 518): one record per
// tenant with its lifecycle, settings, Stripe / compliance posture, plan,
// overrides, usage, notes and audit log — plus the pure rules the platform
// screens derive from it (allowed transitions, actions required, health score).

import type { ModuleOverride, LimitId } from "./plans";

export type Lifecycle =
  | "onboarding"
  | "live"
  | "paused_by_tenant"
  | "suspended_by_slaice"
  | "offboarding"
  | "closed";
export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  onboarding: "Onboarding",
  live: "Live",
  paused_by_tenant: "Paused by tenant",
  suspended_by_slaice: "Suspended by Slaice",
  offboarding: "Offboarding",
  closed: "Closed",
};
export const LIFECYCLE_TONE: Record<Lifecycle, string> = {
  onboarding: "amber",
  live: "green",
  paused_by_tenant: "blue",
  suspended_by_slaice: "red",
  offboarding: "amber",
  closed: "slate",
};
/** Allowed transitions (AENR-518). offboarding → live is the grace-period restore. */
export const LIFECYCLE_NEXT: Record<Lifecycle, Lifecycle[]> = {
  onboarding: ["live", "offboarding"],
  live: ["paused_by_tenant", "suspended_by_slaice", "offboarding"],
  paused_by_tenant: ["live", "suspended_by_slaice", "offboarding"],
  suspended_by_slaice: ["live", "offboarding"],
  offboarding: ["live", "closed"],
  closed: [],
};
export const canTransition = (from: Lifecycle, to: Lifecycle) => LIFECYCLE_NEXT[from].includes(to);

export type Env = "live" | "sandbox" | "demo";
export type ActorType =
  | "Tenant staff"
  | "Slaice staff"
  | "Slaice staff while viewing as"
  | "System";
export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  actorType: ActorType;
  section: string;
  change: string;
  from?: string;
  to?: string;
  reason?: string;
}
export interface StatusChange {
  from: Lifecycle;
  to: Lifecycle;
  reason: string;
  category?: string;
  actor: string;
  at: string;
}
export interface Contact {
  role: "owner" | "billing" | "operations" | "technical" | "dpo";
  name: string;
  email: string;
  phone: string;
  lang: string;
}
export interface Note {
  id: string;
  at: string;
  by: string;
  tag: "Billing" | "Onboarding" | "Risk" | "Product feedback";
  text: string;
  pinned: boolean;
}
export interface Invoice {
  no: string;
  period: string;
  amount: number;
  status: "Paid" | "Open" | "Overdue" | "Void";
  due: string;
}
export interface StripeReq {
  id: string;
  label: string;
  due: "past_due" | "currently_due" | "eventually_due";
  dueDate: string;
  capability: string;
}
export interface DataExport {
  id: string;
  at: string;
  status: "Queued" | "Preparing" | "Ready" | "Expired";
  format: "CSV" | "JSON" | "PDF";
  by: string;
}
export interface Suspension {
  category: "Non-payment" | "Risk / fraud" | "Compliance" | "Tenant request" | "Other";
  note: string;
  blockOnline: boolean;
  blockCashier: boolean;
  blockStaff: boolean;
  message: string;
  /** Scheduled start (future) — suspension applies from this date. */
  from?: string;
}
export interface Offboarding {
  step: number;
  started: string;
  retentionDays: number;
  deleteOn?: string;
  done: boolean[];
  certificate?: string;
}

export interface TenantRecord {
  id: string;
  name: string;
  legalName: string;
  subdomain: string;
  customDomain?: string;
  domainVerified: boolean;
  vatNo: string;
  address: string;
  country: string;
  language: string;
  languages: string[];
  timezone: string;
  currency: string;
  region: string;
  env: Env;
  lifecycle: Lifecycle;
  history: StatusChange[];
  suspension?: Suspension;
  offboarding?: Offboarding;
  onboardingStep?: number;
  goLive?: string;
  brand: string;
  plan: { id: string; version: number };
  billingCycle: "monthly" | "seasonal";
  trialEnd?: string;
  renewal: string;
  addOns: number;
  overrides: ModuleOverride[];
  beta: string[];
  releaseChannel: "stable" | "beta" | "preview";
  stripe: {
    details: boolean;
    charges: boolean;
    payouts: boolean;
    reqs: StripeReq[];
    schedule: string;
  };
  dpa: { status: "Signed" | "Pending"; version: string; signed?: string };
  mydata: "connected" | "missing" | "failing";
  webhooks: "healthy" | "failing";
  channels: { email: boolean; sms: boolean; viber: boolean };
  contacts: Contact[];
  accountManager: string;
  slaiceTeam: string[];
  supportGrant?: { until: string };
  usage: Record<LimitId, number>;
  invoices: Invoice[];
  locations: {
    sites: number;
    zones: number;
    sets: number;
    lockers: number;
    parking: number;
    season: string;
    hours: string;
  };
  kpi: { gmv: number; fees: number; bookings: number };
  health: {
    adoption: number;
    payments: number;
    support: number;
    commercial: number;
    trend: number[];
  };
  tickets: { id: string; title: string; status: "Open" | "Pending" | "Solved"; at: string }[];
  notes: Note[];
  audit: AuditEntry[];
  exports: DataExport[];
  security: {
    require2fa: boolean;
    sessionMins: number;
    methods: string[];
    events: { at: string; text: string }[];
  };
  invoicing: { series: string; vatRate: number; accountant: string; provider: string };
}

/* ---------- Actions required ---------- */
export type Severity = "blocking" | "past_due" | "due_soon" | "info";
export const SEVERITY_LABEL: Record<Severity, string> = {
  blocking: "Blocking",
  past_due: "Past due",
  due_soon: "Due soon",
  info: "Info",
};
export interface ActionItem {
  id: string;
  severity: Severity;
  title: string;
  impact: string;
  due?: string;
  section: string;
}
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
/** Everything that blocks or will block a tenant, most severe first. */
export function actionsRequired(t: TenantRecord, today: string): ActionItem[] {
  if (t.lifecycle === "closed") return [];
  const out: ActionItem[] = [];
  for (const r of t.stripe.reqs) {
    const sev: Severity =
      r.due === "past_due"
        ? "blocking"
        : r.due === "currently_due"
          ? r.dueDate < today
            ? "past_due"
            : "due_soon"
          : "info";
    out.push({
      id: `stripe-${r.id}`,
      severity: sev,
      title: `Stripe: ${r.label}`,
      impact: r.capability,
      due: r.dueDate,
      section: "payments",
    });
  }
  if (!t.stripe.payouts && !t.stripe.reqs.length)
    out.push({
      id: "stripe-payouts",
      severity: "blocking",
      title: "Stripe payouts not enabled",
      impact: "Payouts paused",
      section: "payments",
    });
  if (t.dpa.status !== "Signed")
    out.push({
      id: "dpa",
      severity: t.lifecycle === "live" ? "past_due" : "due_soon",
      title: "DPA not signed",
      impact: "Processing personal data without a signed DPA",
      section: "compliance",
    });
  if (t.mydata !== "connected")
    out.push({
      id: "mydata",
      severity: t.mydata === "failing" ? "blocking" : "due_soon",
      title: t.mydata === "failing" ? "myDATA transmission failing" : "myDATA credentials missing",
      impact: "ΑΠΥ / ΤΠΥ not transmitted to AADE",
      section: "invoicing",
    });
  if (t.customDomain && !t.domainVerified)
    out.push({
      id: "dns",
      severity: "due_soon",
      title: `Custom domain ${t.customDomain} not verified`,
      impact: "Customer site only on the slaice.app subdomain",
      section: "branding",
    });
  for (const inv of t.invoices.filter((i) => i.status === "Overdue"))
    out.push({
      id: `inv-${inv.no}`,
      severity: "past_due",
      title: `Slaice invoice ${inv.no} overdue`,
      impact: `€${inv.amount} unpaid since ${inv.due}`,
      due: inv.due,
      section: "billing",
    });
  const toRenew = daysBetween(today, t.renewal);
  if (t.lifecycle === "live" && toRenew >= 0 && toRenew < 30)
    out.push({
      id: "renewal",
      severity: "info",
      title: `Contract renews in ${toRenew} days`,
      impact: "Renewal conversation",
      due: t.renewal,
      section: "contract",
    });
  const order: Severity[] = ["blocking", "past_due", "due_soon", "info"];
  return out.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
}

/* ---------- Health score ---------- */
export const HEALTH_WEIGHTS = {
  adoption: 0.35,
  payments: 0.25,
  support: 0.2,
  commercial: 0.2,
} as const;
export function healthScore(
  t: TenantRecord,
  today: string,
): {
  score: number;
  label: "Healthy" | "At risk" | "Unhealthy";
  parts: { k: keyof typeof HEALTH_WEIGHTS; v: number; w: number }[];
} {
  const overdue = t.invoices.some((i) => i.status === "Overdue");
  const renewSoon = daysBetween(today, t.renewal) < 30;
  const commercial = Math.max(0, t.health.commercial - (overdue ? 35 : 0) - (renewSoon ? 10 : 0));
  const parts = (Object.keys(HEALTH_WEIGHTS) as (keyof typeof HEALTH_WEIGHTS)[]).map((k) => ({
    k,
    v: k === "commercial" ? commercial : t.health[k],
    w: HEALTH_WEIGHTS[k],
  }));
  const score = Math.round(parts.reduce((a, p) => a + p.v * p.w, 0));
  return { score, label: score >= 70 ? "Healthy" : score >= 40 ? "At risk" : "Unhealthy", parts };
}

/* ---------- View as tenant (AENR-515) ---------- */
export type ViewScope = "read" | "write";
export interface ViewAsSession {
  id: string;
  tenantId: string;
  by: string;
  reason: string;
  ticket?: string;
  scope: ViewScope;
  role: "admin" | "callcenter" | "cashier" | "controller" | "accountant";
  minutes: number;
  startedAt: string;
  endsAt: string;
  emergency: boolean;
  pages: string[];
  changes: { at: string; what: string; from?: string; to?: string }[];
  reveals: number;
  endedAt?: string;
  endReason?: "manual" | "expired" | "revoked";
}
export interface AccessRequest {
  id: string;
  tenantId: string;
  by: string;
  at: string;
  status: "Pending" | "Approved" | "Declined" | "Expired";
  draft: Omit<ViewAsSession, "id" | "startedAt" | "endsAt" | "pages" | "changes" | "reveals">;
}
/** Actions blocked in every View-as session, whatever the scope. */
export const VIEW_AS_BLOCKED =
  /payout|bank|stripe|export|delete user|remove user|plan|billing|refund/i;
export const MUTATING =
  /^(save|delete|remove|publish|apply|add|create|confirm|accept|reserve|send|update|issue|approve|discard|reset|copy|generate|run|take|charge|pay|refund|void|book|import|upload|clear)/i;
