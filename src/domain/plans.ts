// Plans, entitlements & usage limits (AENR-517). A tenant is on a plan
// version; modules come from the plan plus explicit per-tenant overrides (with
// optional expiry), limits are metered against the plan, and MRR is derived —
// never typed. Pure functions only.

export type LimitId = "locations" | "seats" | "bookings" | "messages" | "storage";
export const LIMIT_LABEL: Record<LimitId, string> = {
  locations: "Locations",
  seats: "Staff seats",
  bookings: "Bookings / month",
  messages: "SMS & Viber / month",
  storage: "Storage (GB)",
};
export interface PlanLimit {
  included: number;
  /** soft = allow + overage fee; hard = block. */
  mode: "soft" | "hard";
  overage?: number;
}
export interface PlanVersion {
  version: number;
  /** € per month. */
  price: number;
  modules: string[];
  limits: Record<LimitId, PlanLimit>;
  commission: { online: number; cashier: number; passes: number };
  created: string;
}
export interface Plan {
  id: string;
  name: string;
  versions: PlanVersion[];
}

export const MODULES = [
  "Sunbed Booking",
  "Entry Ticket",
  "e-Invoice/MyDATA",
  "Payments",
  "Reporting",
  "Day Locker",
  "Parking",
  "Cash Register",
  "Loyalty",
  "Reviews",
  "Catalogue",
  "Geo Map",
] as const;
export type ModuleId = (typeof MODULES)[number];

const lim = (
  locations: number,
  seats: number,
  bookings: number,
  messages: number,
  storage: number,
  mode: "soft" | "hard" = "soft",
): Record<LimitId, PlanLimit> => ({
  locations: { included: locations, mode: "hard" },
  seats: { included: seats, mode: "hard" },
  bookings: { included: bookings, mode, overage: 0.1 },
  messages: { included: messages, mode: "soft", overage: 0.05 },
  storage: { included: storage, mode: "soft", overage: 0.5 },
});
export const DEFAULT_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    versions: [
      {
        version: 1,
        price: 490,
        modules: ["Sunbed Booking", "Entry Ticket", "Payments"],
        limits: lim(1, 5, 3000, 1000, 5),
        commission: { online: 5, cashier: 0, passes: 5 },
        created: "2026-01-10",
      },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    versions: [
      {
        version: 1,
        price: 990,
        modules: [
          "Sunbed Booking",
          "Entry Ticket",
          "e-Invoice/MyDATA",
          "Payments",
          "Reporting",
          "Cash Register",
        ],
        limits: lim(2, 15, 12000, 5000, 20),
        commission: { online: 4.5, cashier: 1, passes: 4 },
        created: "2026-01-10",
      },
    ],
  },
  {
    id: "group",
    name: "Resort Group",
    versions: [
      {
        version: 1,
        price: 2400,
        modules: [
          "Sunbed Booking",
          "Entry Ticket",
          "e-Invoice/MyDATA",
          "Payments",
          "Reporting",
          "Cash Register",
          "Day Locker",
          "Parking",
          "Loyalty",
        ],
        limits: lim(10, 60, 60000, 25000, 100),
        commission: { online: 3.5, cashier: 0.8, passes: 3 },
        created: "2026-01-10",
      },
    ],
  },
];

export const planVersion = (
  plans: readonly Plan[],
  id: string,
  version: number,
): PlanVersion | undefined =>
  plans.find((p) => p.id === id)?.versions.find((v) => v.version === version);
export const latestVersion = (p: Plan) => p.versions[p.versions.length - 1];

export interface ModuleOverride {
  module: string;
  on: boolean;
  reason: string;
  /** ISO date the override lapses (inclusive); missing = permanent. */
  expires?: string;
  by: string;
  at: string;
  /** Set once the expiry has been written to the Audit log. */
  expiredLogged?: boolean;
}
export type ModuleSource = "plan" | "override" | "beta" | "blocked" | "off";
/** Whether a module is on for a tenant and why (plan / override / beta / blocked). */
export function moduleState(
  module: string,
  plan: PlanVersion | undefined,
  overrides: readonly ModuleOverride[],
  beta: readonly string[],
  blockers: Record<string, string>,
  today: string,
): { on: boolean; source: ModuleSource; detail: string; reverted?: ModuleOverride } {
  const all = overrides.filter((o) => o.module === module);
  const active = all.filter((o) => !o.expires || o.expires >= today).pop();
  const lapsed = all.filter((o) => o.expires && o.expires < today).pop();
  if (blockers[module]) return { on: false, source: "blocked", detail: blockers[module] };
  if (active)
    return {
      on: active.on,
      source: "override",
      detail: `${active.on ? "Granted" : "Removed"} by ${active.by}: ${active.reason}${active.expires ? ` · until ${active.expires}` : ""}`,
    };
  if (beta.includes(module)) return { on: true, source: "beta", detail: "Beta / preview channel" };
  const inPlan = !!plan?.modules.includes(module);
  return {
    on: inPlan,
    source: inPlan ? "plan" : "off",
    detail: inPlan ? "Included in plan" : "Not in plan",
    reverted: lapsed,
  };
}

export function usageLevel(
  used: number,
  included: number,
): { pct: number; level: "ok" | "warn" | "over"; label: string } {
  const pct = included ? Math.round((used / included) * 100) : 0;
  return pct >= 100
    ? { pct, level: "over", label: "Over limit" }
    : pct >= 80
      ? { pct, level: "warn", label: "Near limit" }
      : { pct, level: "ok", label: "Within limit" };
}

/** Plan-change preview: gained / lost modules, limits the tenant would exceed, prorated amount for the rest of the month. */
export function planChangePreview(
  from: PlanVersion | undefined,
  to: PlanVersion,
  usage: Partial<Record<LimitId, number>>,
  today: string,
) {
  const gained = to.modules.filter((m) => !from?.modules.includes(m));
  const lost = (from?.modules ?? []).filter((m) => !to.modules.includes(m));
  const exceeded = (Object.keys(to.limits) as LimitId[])
    .filter((k) => (usage[k] ?? 0) > to.limits[k].included)
    .map((k) => ({
      id: k,
      used: usage[k] ?? 0,
      included: to.limits[k].included,
      hard: to.limits[k].mode === "hard",
    }));
  const d = new Date(`${today}T00:00:00`);
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const left = days - d.getDate() + 1;
  const prorated = Math.round((((to.price - (from?.price ?? 0)) * left) / days) * 100) / 100;
  return {
    gained,
    lost,
    exceeded,
    blocking: exceeded.some((e) => e.hard),
    prorated,
    upgrade: to.price >= (from?.price ?? 0),
  };
}
