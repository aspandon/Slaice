// What a tenant can see (AENR-691 / 696 / 677 / 721). Pure rules only.
//
// Three layers decide whether a feature shows, for every role of the tenant:
//   1. Modules — what Slaice sells the tenant (plan + overrides + beta, minus
//      blockers), edited in Platform › tenant › Modules and the Super Admin matrix.
//   2. Tenant features — finer per-tenant switches (auto-approve refunds, the
//      cashier's Sell tabs…), edited in Platform › tenant › Features. Each is one
//      entry in TENANT_FEATURES; a new switch is one more entry.
//   3. Roadmap previews — the demo switch that shows or hides everything marked
//      Future (FUTURE badge / roadmap banner).
// A Future item shows only when previews are on AND its module (if any) is on.

import { moduleState, planVersion, type ModuleId, type ModuleOverride, type Plan } from "./plans";

/** Modules a requirement switches off regardless of plan or override. */
export const blockersOf = (t: { stripe: { charges: boolean } }): Record<string, string> =>
  t.stripe.charges ? {} : { Payments: "Stripe charges_enabled is false" };

interface ModuleSubject {
  plan: { id: string; version: number };
  overrides: readonly ModuleOverride[];
  beta: readonly string[];
  stripe: { charges: boolean };
}
/** Whether a module is on for a tenant today (plan, override, beta, blocker). */
export function tenantHasModule(
  t: ModuleSubject,
  plans: readonly Plan[],
  module: ModuleId,
  today: string,
): boolean {
  return moduleState(
    module,
    planVersion(plans, t.plan.id, t.plan.version),
    t.overrides,
    t.beta,
    blockersOf(t),
    today,
  ).on;
}

/** What switching a module off hides in the tenant app (shown on Platform › tenant › Modules). */
export const MODULE_REACH: Partial<Record<ModuleId, string>> = {
  "Sunbed Booking": "Sunbeds tab on the till",
  "Entry Ticket": "Entry tickets in Products and on the till",
  "Day Locker":
    "Lockers in the booking wizard, Home, booked-visit extras, the till, Products and Reports",
  Parking:
    "Parking in the booking wizard, Home, booked-visit extras, the till, Products and Reports",
  "Cash Register": "The till — Sell, Sales and Cash register for Cashier and Support",
  Loyalty: "Rewards on Home and Wallet, badges, Loyalty and Badges pages",
  Reporting: "Reports for the manager and the accountant",
};

/** Which day extras a tenant sells — picks the wording of "Add a locker or parking" and friends. */
export type ExtrasKind = "both" | "locker" | "parking" | "none";
export const extrasPhrase = (locker: boolean, parking: boolean): ExtrasKind =>
  locker && parking ? "both" : locker ? "locker" : parking ? "parking" : "none";
/** The English call to action for the extras a tenant sells (translate with t()). */
export const ADD_EXTRAS_LABEL: Record<Exclude<ExtrasKind, "none">, string> = {
  both: "Add a locker or parking",
  locker: "Add a locker",
  parking: "Add parking",
};

/* ---------- Tenant feature switches (AENR-677, AENR-721) ---------- */
export type TenantFeatureId =
  | "refunds.autoApprove"
  | "till.quick"
  | "till.tickets"
  | "till.sunbeds"
  | "till.lockers"
  | "till.parking";
export type TenantFeatureGroup = "Refunds" | "Cashier till";
export interface TenantFeatureDef {
  key: TenantFeatureId;
  label: string;
  description: string;
  group: TenantFeatureGroup;
  /** Value when the tenant has never set it. */
  default: boolean;
  /** The module the feature also needs — off with the module, whatever the switch says. */
  module?: ModuleId;
}
export const TENANT_FEATURES: readonly TenantFeatureDef[] = [
  {
    key: "refunds.autoApprove",
    label: "Auto-approve routine refunds",
    description:
      "The manager can let a refund policy approve routine requests (weather, closures…) as they arrive. Off: every request waits for a person.",
    group: "Refunds",
    default: true,
  },
  {
    key: "till.quick",
    label: "Quick keys",
    description:
      "Combos, Repeat last sale and bundles on the cashier's Quick tab.",
    group: "Cashier till",
    default: true,
  },
  {
    key: "till.tickets",
    label: "Entry tickets",
    description: "Entry tickets sold at the till — a key per category on the Quick tab (AENR-721).",
    group: "Cashier till",
    default: true,
    module: "Entry Ticket",
  },
  {
    key: "till.sunbeds",
    label: "Sunbeds",
    description: "Sunbed sets sold at the till from the zone map.",
    group: "Cashier till",
    default: true,
    module: "Sunbed Booking",
  },
  {
    key: "till.lockers",
    label: "Lockers",
    description: "Day lockers sold at the till.",
    group: "Cashier till",
    default: true,
    module: "Day Locker",
  },
  {
    key: "till.parking",
    label: "Parking",
    description: "Day parking spots sold at the till.",
    group: "Cashier till",
    default: true,
    module: "Parking",
  },
];
export const TENANT_FEATURE_GROUPS: readonly TenantFeatureGroup[] = ["Refunds", "Cashier till"];
/** The group a switch belongs to must keep at least one switch on (e.g. the till needs one tab). */
export const KEEP_ONE_ON: readonly TenantFeatureGroup[] = ["Cashier till"];

export const featureDef = (key: TenantFeatureId) => TENANT_FEATURES.find((f) => f.key === key);
/** The tenant's own switch (ignores modules). */
export function featureSwitch(
  t: { features?: Partial<Record<TenantFeatureId, boolean>> } | undefined,
  key: TenantFeatureId,
): boolean {
  return t?.features?.[key] ?? featureDef(key)?.default ?? true;
}
/** Whether turning `key` off would leave its group with no switch on (blocked for KEEP_ONE_ON groups). */
export function isLastOn(
  t: { features?: Partial<Record<TenantFeatureId, boolean>> },
  key: TenantFeatureId,
  hasModule: (m: ModuleId) => boolean,
): boolean {
  const def = featureDef(key);
  if (!def || !KEEP_ONE_ON.includes(def.group)) return false;
  const on = TENANT_FEATURES.filter(
    (f) => f.group === def.group && featureSwitch(t, f.key) && (!f.module || hasModule(f.module)),
  );
  return on.length === 1 && on[0].key === key;
}
