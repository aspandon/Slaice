// Incidents reported to Slaice (AENR-720). A tenant's call center reports what a
// guest or the beach's staff ran into — a payment, a booking, an app bug, the
// venue, safety — and Slaice works it across tenants: New → Acknowledged → In
// progress → Resolved, with replies the tenant sees and internal notes it
// doesn't. Pure rules only; the records live in the app store.

export type IncidentSeenBy = "customer" | "staff";
export type IncidentCategory = "payment" | "booking" | "app" | "venue" | "safety" | "other";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "new" | "acknowledged" | "in_progress" | "resolved";

export interface IncidentUpdate {
  id: string;
  at: string; // ISO timestamp (minute precision)
  by: string;
  side: "slaice" | "tenant";
  /** status = a status change (with an optional message); reply = a message the
   *  other side sees; note = Slaice-internal, never shown to the tenant. */
  kind: "status" | "reply" | "note";
  text: string;
  status?: IncidentStatus;
}
export interface Incident {
  id: string;
  tenantId: string;
  reportedAt: string;
  reporter: { name: string; role: string };
  seenBy: IncidentSeenBy;
  category: IncidentCategory;
  severity: IncidentSeverity;
  title: string;
  description: string;
  /** Related booking ref, e.g. "#BK-10428" — optional. */
  bookingRef?: string;
  contact: { name: string; phone?: string; email?: string };
  /** A screenshot or file the reporter attached — demo: only its name and size are kept. */
  attachment?: { name: string; size: number };
  status: IncidentStatus;
  updates: IncidentUpdate[];
}

export const SEEN_BY_LABEL: Record<IncidentSeenBy, string> = {
  customer: "A guest",
  staff: "Our staff",
};
export const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  payment: "Payment",
  booking: "Booking",
  app: "App bug",
  venue: "Venue / facility",
  safety: "Safety",
  other: "Other",
};
export const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};
export const SEVERITY_HINT: Record<IncidentSeverity, string> = {
  low: "An inconvenience — there's a workaround.",
  medium: "Some guests or staff are affected.",
  high: "Many are affected, or money is involved.",
  critical: "A safety risk, or the beach can't sell.",
};
/** How soon Slaice answers, by severity (the incident's first response target). */
export const RESPONSE_TARGET: Record<IncidentSeverity, string> = {
  low: "within 3 days",
  medium: "within 1 business day",
  high: "within 4 hours",
  critical: "within 1 hour, day and night",
};
export const SEVERITY_RANK: Record<IncidentSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
export const STATUS_ORDER: readonly IncidentStatus[] = [
  "new",
  "acknowledged",
  "in_progress",
  "resolved",
];
export const STATUS_LABEL: Record<IncidentStatus, string> = {
  new: "New",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  resolved: "Resolved",
};
/** The forward action Slaice takes from each status (none once resolved). */
export const NEXT_ACTION: Record<IncidentStatus, { to: IncidentStatus; label: string } | null> = {
  new: { to: "acknowledged", label: "Acknowledge" },
  acknowledged: { to: "in_progress", label: "Start work" },
  in_progress: { to: "resolved", label: "Resolve" },
  resolved: null,
};
export const isOpen = (i: Pick<Incident, "status">) => i.status !== "resolved";

/* ---------- Reporting ---------- */
export interface IncidentDraft {
  seenBy: IncidentSeenBy | "";
  category: IncidentCategory | "";
  severity: IncidentSeverity | "";
  bookingRef: string;
  title: string;
  description: string;
  contactName: string;
  contactReach: string;
  attachment?: { name: string; size: number };
}
export const EMPTY_INCIDENT: IncidentDraft = {
  seenBy: "",
  category: "",
  severity: "",
  bookingRef: "",
  title: "",
  description: "",
  contactName: "",
  contactReach: "",
};
export type IncidentErrors = Partial<Record<keyof IncidentDraft, string>>;
export const TITLE_MAX = 80;
export const DESCRIPTION_MIN = 20;
/** "#bk-10428", "BK10428", " 10428 " → "#BK-10428" (the form bookings use). */
export function normalizeRef(s: string): string {
  const d = s.replace(/\D/g, "");
  return d ? `#BK-${d}` : "";
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s()-]{8,}$/;

export function validateIncident(
  d: IncidentDraft,
  bookingExists: (ref: string) => boolean,
): IncidentErrors {
  const e: IncidentErrors = {};
  if (!d.seenBy) e.seenBy = "Say who ran into it.";
  if (!d.category) e.category = "Pick a category.";
  if (!d.severity) e.severity = "Pick how serious it is.";
  if (d.bookingRef.trim() && !bookingExists(normalizeRef(d.bookingRef)))
    e.bookingRef = "No booking with this ref — check it with the caller, or leave it empty.";
  if (d.title.trim().length < 5) e.title = "Give it a short title (5 characters or more).";
  else if (d.title.trim().length > TITLE_MAX)
    e.title = `Keep the title under ${TITLE_MAX} characters.`;
  if (d.description.trim().length < DESCRIPTION_MIN)
    e.description = `Describe what happened in a sentence or two (${DESCRIPTION_MIN}+ characters).`;
  if (!d.contactName.trim()) e.contactName = "Who should Slaice contact?";
  const reach = d.contactReach.trim();
  if (!reach) e.contactReach = "Add a phone number or an e-mail.";
  else if (!EMAIL.test(reach) && !PHONE.test(reach))
    e.contactReach = "Enter a valid phone number or e-mail.";
  return e;
}

export function nextIncidentId(list: readonly Incident[]): string {
  const max = list.reduce((m, i) => Math.max(m, Number(i.id.replace(/\D/g, "")) || 0), 2040);
  return `INC-${max + 1}`;
}
export function createIncident(
  d: IncidentDraft,
  ctx: { id: string; tenantId: string; at: string; reporter: { name: string; role: string } },
): Incident {
  const reach = d.contactReach.trim();
  return {
    id: ctx.id,
    tenantId: ctx.tenantId,
    reportedAt: ctx.at,
    reporter: ctx.reporter,
    seenBy: d.seenBy || "staff",
    category: d.category || "other",
    severity: d.severity || "medium",
    title: d.title.trim(),
    description: d.description.trim(),
    bookingRef: d.bookingRef.trim() ? normalizeRef(d.bookingRef) : undefined,
    contact: {
      name: d.contactName.trim(),
      ...(EMAIL.test(reach) ? { email: reach } : { phone: reach }),
    },
    attachment: d.attachment,
    status: "new",
    updates: [],
  };
}

/* ---------- Working an incident ---------- */
let seq = 0;
const uid = () => `iu-${Date.now().toString(36)}${++seq}`;
export function setIncidentStatus(
  i: Incident,
  status: IncidentStatus,
  by: string,
  at: string,
  message = "",
): Incident {
  if (i.status === status) return i;
  return {
    ...i,
    status,
    updates: [
      ...i.updates,
      { id: uid(), at, by, side: "slaice", kind: "status", status, text: message.trim() },
    ],
  };
}
export function addIncidentUpdate(i: Incident, u: Omit<IncidentUpdate, "id" | "status">): Incident {
  return { ...i, updates: [...i.updates, { ...u, text: u.text.trim(), id: uid() }] };
}
/** What the tenant sees: everything except Slaice's internal notes. */
export const tenantUpdates = (i: Incident) => i.updates.filter((u) => u.kind !== "note");
/** The latest thing Slaice told the tenant (a reply, or a status change). */
export const lastSlaiceWord = (i: Incident) =>
  [...tenantUpdates(i)].reverse().find((u) => u.side === "slaice");

/** Open first, then by severity, then newest. */
export function sortIncidents(list: readonly Incident[]): Incident[] {
  return [...list].sort(
    (a, b) =>
      Number(!isOpen(a)) - Number(!isOpen(b)) ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      b.reportedAt.localeCompare(a.reportedAt),
  );
}
export interface IncidentFilter {
  tenant: string;
  severity: IncidentSeverity | "";
  status: IncidentStatus | "open" | "";
  q: string;
}
export function filterIncidents(list: readonly Incident[], f: IncidentFilter): Incident[] {
  const q = f.q.trim().toLowerCase();
  return list.filter(
    (i) =>
      (!f.tenant || i.tenantId === f.tenant) &&
      (!f.severity || i.severity === f.severity) &&
      (!f.status || (f.status === "open" ? isOpen(i) : i.status === f.status)) &&
      (!q || `${i.id} ${i.title} ${i.description} ${i.bookingRef ?? ""}`.toLowerCase().includes(q)),
  );
}
