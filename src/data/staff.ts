// Seed staff accounts for the tenant (RBAC demo). Roles map to personas: a
// user signed in with a role sees exactly that persona's pages (NAV).
import type { StaffAuditEntry, StaffRole, StaffUser } from "../domain/types";
import type { TenantRecord } from "../domain/tenants";
import { inviteFor } from "../domain/staffInvite";

export const STAFF_ROLES: { id: StaffRole; label: string; blurb: string }[] = [
  {
    id: "admin",
    label: "Manager / Admin",
    blurb: "Everything for this beach: configuration, bookings, reports, refunds, staff.",
  },
  {
    id: "callcenter",
    label: "Call Center",
    blurb: "Phone bookings and booking lookup; escalates refunds to a manager.",
  },
  { id: "cashier", label: "Cashier", blurb: "On-site tickets and sales at the entrance." },
  {
    id: "controller",
    label: "Controller",
    blurb: "Gate validation, beach status, walk-ins and same-day release.",
  },
  {
    id: "support",
    label: "Support Agent",
    blurb: "Everything a Controller and a Cashier can do, plus pay-by-link reservations.",
  },
  { id: "accountant", label: "Accountant", blurb: "e-Invoicing, MyDATA, commission and payouts." },
];
export const roleLabel = (r: StaffRole) => STAFF_ROLES.find((x) => x.id === r)?.label ?? r;
/** Does the user hold this role (AENR-717)? Accepts any persona id — Customer
 *  and Platform are never staff roles, so they simply return false. */
export const hasRole = (u: Pick<StaffUser, "roles">, r: string) => u.roles.some((x) => x === r);
/** "Manager / Admin + Accountant" — for audit lines and compact hints. */
export const rolesLabel = (u: Pick<StaffUser, "roles">) => u.roles.map(roleLabel).join(" + ");

export const DEFAULT_STAFF: StaffUser[] = [
  {
    id: "u-01",
    name: "Eleni Markou",
    email: "eleni@aktitouiliou.gr",
    phone: "+30 694 200 0101",
    roles: ["admin", "accountant"],
    status: "active",
    lastSignIn: "2026-07-19T08:42:00",
    created: "2025-04-02",
  },
  {
    id: "u-02",
    name: "Giorgos Antoniou",
    email: "giorgos@aktitouiliou.gr",
    phone: "+30 694 200 0102",
    roles: ["admin"],
    status: "active",
    lastSignIn: "2026-07-18T19:10:00",
    created: "2025-04-02",
  },
  {
    id: "u-03",
    name: "Maria Kontou",
    email: "maria.k@aktitouiliou.gr",
    phone: "+30 694 200 0103",
    roles: ["callcenter", "cashier"],
    status: "active",
    lastSignIn: "2026-07-19T09:05:00",
    created: "2026-05-10",
  },
  {
    id: "u-04",
    name: "Kostas Leontis",
    email: "kostas@aktitouiliou.gr",
    phone: "+30 694 200 0104",
    roles: ["cashier"],
    status: "active",
    tillPin: "1111",
    lastSignIn: "2026-07-19T09:02:00",
    created: "2025-05-20",
  },
  {
    id: "u-05",
    name: "Eleni Sava",
    email: "eleni.s@aktitouiliou.gr",
    phone: "+30 694 200 0105",
    roles: ["cashier"],
    status: "active",
    tillPin: "2222",
    lastSignIn: "2026-07-18T17:55:00",
    created: "2026-05-28",
  },
  {
    id: "u-06",
    name: "Petros Nikolaou",
    email: "petros@aktitouiliou.gr",
    phone: "+30 694 200 0106",
    roles: ["controller"],
    status: "active",
    lastSignIn: "2026-07-19T08:30:00",
    created: "2025-06-01",
  },
  {
    id: "u-07",
    name: "Anna Mavridi",
    email: "anna@papadopoulos-accounting.gr",
    phone: "+30 210 900 1200",
    roles: ["accountant"],
    status: "active",
    lastSignIn: "2026-07-15T11:20:00",
    created: "2025-04-15",
  },
  {
    id: "u-08",
    name: "Nikos Papas",
    email: "nikos.p@aktitouiliou.gr",
    phone: "+30 694 200 0108",
    roles: ["controller"],
    status: "suspended",
    lastSignIn: "2026-06-30T18:00:00",
    created: "2026-06-01",
    suspendReason: "Seasonal contract paused",
  },
  {
    id: "u-09",
    name: "Sofia Lambrou",
    email: "sofia@aktitouiliou.gr",
    phone: "+30 694 200 0109",
    roles: ["callcenter"],
    status: "invited",
    lastSignIn: null,
    created: "2026-07-17",
    username: "sofia.lambrou",
    // Sent on 17 Jul and never opened — expired, so the demo shows Resend (AENR-718).
    invite: { sentAt: "2026-07-17T10:12:00", expiresAt: "2026-07-20T10:12:00", sends: 1 },
  },
  {
    id: "u-10",
    name: "Dimitris Galanis",
    email: "dimitris@aktitouiliou.gr",
    phone: "+30 694 200 0110",
    roles: ["support"],
    status: "active",
    tillPin: "3333",
    lastSignIn: "2026-07-19T08:15:00",
    created: "2026-06-20",
  },
];

export const DEFAULT_STAFF_AUDIT: StaffAuditEntry[] = [
  { at: "2026-07-17T10:12:00", by: "Eleni Markou", action: "Invited Sofia Lambrou as Call Center" },
  {
    at: "2026-06-30T18:30:00",
    by: "Giorgos Antoniou",
    action: "Suspended Nikos Papas (Seasonal contract paused)",
  },
  { at: "2026-05-28T09:00:00", by: "Eleni Markou", action: "Added Eleni Sava as Cashier" },
];

/** The tenant whose staff live in the app store (Team & roles) — the demo beach. */
export const DEMO_STAFF_TENANT = "akti";
/** A tenant's staff (AENR-716 / 718): the demo beach's come from the app store; any
 *  other tenant keeps its own on the tenant record, seeded from its contacts. */
export function tenantStaff(t: TenantRecord, demoStaff: readonly StaffUser[]): StaffUser[] {
  if (t.id === DEMO_STAFF_TENANT) return [...demoStaff];
  if (t.staff) return t.staff;
  const owner = t.contacts.find((c) => c.role === "owner") ?? t.contacts[0];
  const domain = owner?.email.split("@")[1] ?? `${t.subdomain}.gr`;
  const created = t.goLive ?? "2026-04-01";
  const live = t.lifecycle === "live";
  return [
    {
      id: `${t.id}-u1`,
      name: owner?.name ?? `${t.name} owner`,
      email: owner?.email ?? `owner@${domain}`,
      phone: owner?.phone ?? "",
      roles: ["admin"],
      status: "active",
      lastSignIn: live ? "2026-07-19T08:10:00" : null,
      created,
    },
    {
      id: `${t.id}-u2`,
      name: "Front desk",
      email: `frontdesk@${domain}`,
      phone: "+30 694 300 0011",
      roles: ["cashier"],
      status: "active",
      lastSignIn: live ? "2026-07-19T09:00:00" : null,
      created,
    },
    {
      id: `${t.id}-u3`,
      name: "Gate staff",
      email: `gate@${domain}`,
      phone: "+30 694 300 0012",
      roles: ["controller"],
      status: live ? "active" : "invited",
      lastSignIn: live ? "2026-07-18T18:40:00" : null,
      created,
    },
  ];
}

/** Saved state from before AENR-717 holds a single `role`: lift it into `roles`.
 *  A seed user still on its legacy role picks up the demo's multi-role seed
 *  (e.g. Eleni Markou → Manager / Admin + Accountant) as long as it agrees. */
export type LegacyStaffUser = Omit<StaffUser, "roles"> & { roles?: StaffRole[]; role?: StaffRole };
export function migrateStaffUser(u: LegacyStaffUser): StaffUser {
  const { role, roles, ...rest } = u;
  const seed = DEFAULT_STAFF.find((d) => d.id === u.id);
  // An Invited user saved before AENR-718 picks up the invitation it was sent.
  const withInvite = <T extends Omit<StaffUser, "roles">>(x: T): T =>
    x.status === "invited" && !x.invite ? { ...x, invite: seed?.invite ?? inviteFor(x), username: x.username ?? seed?.username } : x;
  if (roles && roles.length) return withInvite({ ...rest, roles });
  const next = seed && (!role || seed.roles.includes(role)) ? seed.roles : role ? [role] : ["cashier" as const];
  return withInvite({ ...rest, roles: [...next] });
}
