// Platform-side state (AENR-500 / 515 / 517 / 518): the tenants, the plan
// catalog, View-as sessions and access requests, and a few console prefs.

import { DEFAULT_PLANS, type Plan } from "./plans";
import type { AccessRequest, TenantRecord, ViewAsSession } from "./tenants";

export interface PlatformState {
  tenants: TenantRecord[];
  plans: Plan[];
  /** The running View-as session, if any. */
  viewAs: ViewAsSession | null;
  sessions: ViewAsSession[];
  requests: AccessRequest[];
  pinned: string[];
  recent: string[];
  includeSandbox: boolean;
  /** Demo clock for the platform, in days ahead of the real date (expiry, retention, dunning). */
  clockDays: number;
  /** The Slaice staff role of the signed-in console user (permission hooks, AENR-503). */
  role: "admin" | "support" | "viewer";
  /** Which tenant the Customer / Cashier / Controller demo personas represent. */
  siteTenant: string;
}
export const emptyPlatform = (tenants: TenantRecord[]): PlatformState => ({
  tenants,
  plans: DEFAULT_PLANS,
  viewAs: null,
  sessions: [],
  requests: [],
  pinned: ["akti"],
  recent: [],
  includeSandbox: false,
  clockDays: 0,
  role: "admin",
  siteTenant: "akti",
});
export const tenantById = (p: PlatformState, id: string) => p.tenants.find((t) => t.id === id);

/* ---------- MRR history (AENR-589) ---------- */
export interface MrrPoint {
  /** Month as YYYY-MM. */
  month: string;
  label: string;
  /** MRR in euro. */
  v: number;
  /** The current month, still in progress. */
  partial: boolean;
}
/** Monthly MRR for the last `months` months up to today's month: each tenant
 *  counts from its go-live month at its current price (plan + add-ons), so the
 *  line only rises when a tenant goes live or leaves when it stops paying. */
export function mrrSeries(
  tenants: readonly TenantRecord[],
  mrrOf: (t: TenantRecord) => number,
  today: string,
  months = 12,
): MrrPoint[] {
  const [y, m] = today.slice(0, 7).split("-").map(Number);
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (months - 1 - i), 1));
    const month = d.toISOString().slice(0, 7);
    const v = tenants
      .filter((t) => t.goLive && t.goLive.slice(0, 7) <= month)
      .reduce((a, t) => a + mrrOf(t), 0);
    return {
      month,
      label: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
      v,
      partial: i === months - 1,
    };
  });
}
