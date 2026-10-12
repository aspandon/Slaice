// Rule-based guest segments (AENR-474): conditions grouped with AND / OR, each
// a field + operator + value. Dynamic segments re-evaluate on every render;
// static segments keep the member list captured when saved. Pure functions.

import type { GuestFacts } from "../data/guests";
import { CHANNELS_CRM, CITIES, ITEM_TYPES_CRM, LANGUAGES_CRM } from "../data/guests";
import { ZONES } from "../data/beach";

export type FieldType = "number" | "enum" | "multi" | "date";
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  group: string;
  options?: string[];
  unit?: string;
  /** Read the value from a guest's facts (plus derived extras such as lifecycle). */
  get: (g: GuestFacts) => number | string | string[];
}
export type Op =
  | "gt"
  | "lt"
  | "eq"
  | "between"
  | "is"
  | "isNot"
  | "hasAny"
  | "hasNone"
  | "before"
  | "after"
  | "withinDays";
export interface Rule {
  field: string;
  op: Op;
  a?: number | string;
  b?: number | string;
  values?: string[];
}
export interface Segment {
  id: string;
  name: string;
  color: string;
  kind: "dynamic" | "static";
  match: "all" | "any";
  rules: Rule[];
  /** Static segments: the guest ids captured at save time. */
  members?: number[];
  /** Built-in segments can be edited (thresholds) but not deleted. */
  system?: boolean;
  updatedAt: string;
}

export const SEGMENT_FIELDS: FieldDef[] = [
  { key: "visits", label: "Visits", type: "number", group: "Activity", get: (g) => g.visits },
  {
    key: "spend",
    label: "Total spend",
    type: "number",
    group: "Value",
    unit: "€",
    get: (g) => g.spend,
  },
  {
    key: "avgSpend",
    label: "Avg spend per visit",
    type: "number",
    group: "Value",
    unit: "€",
    get: (g) => g.avgSpend,
  },
  {
    key: "lastVisit",
    label: "Last visit",
    type: "date",
    group: "Activity",
    get: (g) => g.lastVisit,
  },
  {
    key: "firstVisit",
    label: "First visit",
    type: "date",
    group: "Activity",
    get: (g) => g.firstVisit,
  },
  {
    key: "daysSinceLast",
    label: "Days since last visit",
    type: "number",
    group: "Activity",
    get: (g) => g.daysSinceLast,
  },
  {
    key: "channel",
    label: "Booking channel",
    type: "enum",
    group: "Behaviour",
    options: [...CHANNELS_CRM],
    get: (g) => g.channel,
  },
  {
    key: "zone",
    label: "Favourite zone",
    type: "enum",
    group: "Behaviour",
    options: ZONES.map((z) => z.name),
    get: (g) => g.zone,
  },
  {
    key: "itemTypes",
    label: "Items bought",
    type: "multi",
    group: "Behaviour",
    options: ITEM_TYPES_CRM,
    get: (g) => g.itemTypes,
  },
  {
    key: "partySize",
    label: "Party size",
    type: "number",
    group: "Behaviour",
    get: (g) => g.partySize,
  },
  {
    key: "pass",
    label: "Pass held",
    type: "enum",
    group: "Membership",
    options: ["VIP", "Season pass", "None"],
    get: (g) => g.pass,
  },
  {
    key: "loyaltyTier",
    label: "Loyalty tier",
    type: "enum",
    group: "Membership",
    options: ["Bronze", "Silver", "Gold"],
    get: (g) => g.loyaltyTier,
  },
  { key: "refunds", label: "Refunds", type: "number", group: "Value", get: (g) => g.refunds },
  {
    key: "language",
    label: "Language",
    type: "enum",
    group: "Profile",
    options: LANGUAGES_CRM,
    get: (g) => g.language,
  },
  {
    key: "city",
    label: "City",
    type: "enum",
    group: "Profile",
    options: CITIES,
    get: (g) => g.city,
  },
  {
    key: "consent",
    label: "Marketing consent",
    type: "multi",
    group: "Consent",
    options: ["email", "sms", "viber"],
    get: (g) => g.consent,
  },
  { key: "tags", label: "Tag", type: "multi", group: "Profile", options: [], get: (g) => g.tags },
];
export const fieldOf = (key: string, extra: FieldDef[] = []) =>
  [...SEGMENT_FIELDS, ...extra].find((f) => f.key === key);

export const OPS: Record<FieldType, { v: Op; l: string }[]> = {
  number: [
    { v: "gt", l: "more than" },
    { v: "lt", l: "less than" },
    { v: "eq", l: "equals" },
    { v: "between", l: "between" },
  ],
  enum: [
    { v: "is", l: "is any of" },
    { v: "isNot", l: "is none of" },
  ],
  multi: [
    { v: "hasAny", l: "includes any of" },
    { v: "hasNone", l: "includes none of" },
  ],
  date: [
    { v: "after", l: "after" },
    { v: "before", l: "before" },
    { v: "withinDays", l: "within the last (days)" },
  ],
};

/** Why a rule is incomplete, or null. */
export function ruleError(r: Rule, f: FieldDef | undefined): string | null {
  if (!f) return "Pick a field.";
  if (f.type === "number" || (f.type === "date" && r.op === "withinDays")) {
    if (r.a === undefined || r.a === "" || Number.isNaN(Number(r.a))) return "Enter a number.";
    if (r.op === "between" && (r.b === undefined || r.b === "" || Number(r.b) < Number(r.a)))
      return "Enter a valid range.";
    return null;
  }
  if (f.type === "date") return r.a ? null : "Pick a date.";
  return r.values && r.values.length ? null : "Pick at least one value.";
}

export function matchRule(g: GuestFacts, r: Rule, f: FieldDef | undefined, today: string): boolean {
  if (!f || ruleError(r, f)) return true;
  const v = f.get(g);
  switch (r.op) {
    case "gt":
      return Number(v) > Number(r.a);
    case "lt":
      return Number(v) < Number(r.a);
    case "eq":
      return Number(v) === Number(r.a);
    case "between":
      return Number(v) >= Number(r.a) && Number(v) <= Number(r.b);
    case "is":
      return (r.values ?? []).includes(String(v));
    case "isNot":
      return !(r.values ?? []).includes(String(v));
    case "hasAny":
      return (v as string[]).some((x) => (r.values ?? []).includes(x));
    case "hasNone":
      return !(v as string[]).some((x) => (r.values ?? []).includes(x));
    case "after":
      return String(v) > String(r.a);
    case "before":
      return String(v) < String(r.a);
    case "withinDays": {
      const t = new Date(`${today}T12:00:00`).getTime();
      const d = new Date(`${String(v)}T12:00:00`).getTime();
      return (t - d) / 86400000 <= Number(r.a);
    }
  }
}

export function inSegment(
  g: GuestFacts,
  s: Segment,
  today: string,
  extra: FieldDef[] = [],
): boolean {
  if (s.kind === "static") return (s.members ?? []).includes(g.id);
  if (!s.rules.length) return true;
  const hits = s.rules.map((r) => matchRule(g, r, fieldOf(r.field, extra), today));
  return s.match === "all" ? hits.every(Boolean) : hits.some(Boolean);
}

export function ruleLabel(r: Rule, f: FieldDef | undefined): string {
  if (!f) return "";
  const op = OPS[f.type].find((o) => o.v === r.op)?.l ?? r.op;
  const val = r.values?.length
    ? r.values.join(", ")
    : r.op === "between"
      ? `${f.unit ?? ""}${r.a}–${f.unit ?? ""}${r.b}`
      : `${f.unit ?? ""}${r.a ?? ""}`;
  return `${f.label} ${op} ${val}`;
}

export const SEGMENT_COLORS = [
  "#0D9488",
  "#0ea5e9",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#22c55e",
  "#64748b",
];

/** Built-in segments: the old fixed filters, now editable rules. */
export const SYSTEM_SEGMENTS: Segment[] = [
  {
    id: "sys-vip",
    name: "VIP",
    color: "#f59e0b",
    kind: "dynamic",
    match: "all",
    rules: [{ field: "pass", op: "is", values: ["VIP"] }],
    system: true,
    updatedAt: "2026-05-01",
  },
  {
    id: "sys-season",
    name: "Season pass",
    color: "#0ea5e9",
    kind: "dynamic",
    match: "all",
    rules: [{ field: "pass", op: "is", values: ["Season pass"] }],
    system: true,
    updatedAt: "2026-05-01",
  },
  {
    id: "sys-regular",
    name: "Regular",
    color: "#64748b",
    kind: "dynamic",
    match: "all",
    rules: [{ field: "visits", op: "gt", a: 15 }],
    system: true,
    updatedAt: "2026-05-01",
  },
  {
    id: "sys-new",
    name: "New",
    color: "#22c55e",
    kind: "dynamic",
    match: "all",
    rules: [{ field: "visits", op: "lt", a: 16 }],
    system: true,
    updatedAt: "2026-05-01",
  },
];
