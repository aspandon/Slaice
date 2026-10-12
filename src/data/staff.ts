// Seed staff accounts for the tenant (RBAC demo). Roles map to personas: a
// user signed in with a role sees exactly that persona's pages (NAV).
import type { StaffAuditEntry, StaffRole, StaffUser } from "../domain/types";

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
    blurb: "Gate validation, walk-ins and same-day release.",
  },
  { id: "accountant", label: "Accountant", blurb: "e-Invoicing, MyDATA, commission and payouts." },
];
export const roleLabel = (r: StaffRole) => STAFF_ROLES.find((x) => x.id === r)?.label ?? r;

export const DEFAULT_STAFF: StaffUser[] = [
  {
    id: "u-01",
    name: "Eleni Markou",
    email: "eleni@aktitouiliou.gr",
    phone: "+30 694 200 0101",
    role: "admin",
    status: "active",
    lastSignIn: "2026-07-19T08:42:00",
    created: "2025-04-02",
  },
  {
    id: "u-02",
    name: "Giorgos Antoniou",
    email: "giorgos@aktitouiliou.gr",
    phone: "+30 694 200 0102",
    role: "admin",
    status: "active",
    lastSignIn: "2026-07-18T19:10:00",
    created: "2025-04-02",
  },
  {
    id: "u-03",
    name: "Maria Kontou",
    email: "maria.k@aktitouiliou.gr",
    phone: "+30 694 200 0103",
    role: "callcenter",
    status: "active",
    lastSignIn: "2026-07-19T09:05:00",
    created: "2026-05-10",
  },
  {
    id: "u-04",
    name: "Kostas Leontis",
    email: "kostas@aktitouiliou.gr",
    phone: "+30 694 200 0104",
    role: "cashier",
    status: "active",
    lastSignIn: "2026-07-19T09:02:00",
    created: "2025-05-20",
  },
  {
    id: "u-05",
    name: "Eleni Sava",
    email: "eleni.s@aktitouiliou.gr",
    phone: "+30 694 200 0105",
    role: "cashier",
    status: "active",
    lastSignIn: "2026-07-18T17:55:00",
    created: "2026-05-28",
  },
  {
    id: "u-06",
    name: "Petros Nikolaou",
    email: "petros@aktitouiliou.gr",
    phone: "+30 694 200 0106",
    role: "controller",
    status: "active",
    lastSignIn: "2026-07-19T08:30:00",
    created: "2025-06-01",
  },
  {
    id: "u-07",
    name: "Anna Mavridi",
    email: "anna@papadopoulos-accounting.gr",
    phone: "+30 210 900 1200",
    role: "accountant",
    status: "active",
    lastSignIn: "2026-07-15T11:20:00",
    created: "2025-04-15",
  },
  {
    id: "u-08",
    name: "Nikos Papas",
    email: "nikos.p@aktitouiliou.gr",
    phone: "+30 694 200 0108",
    role: "controller",
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
    role: "callcenter",
    status: "invited",
    lastSignIn: null,
    created: "2026-07-17",
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
