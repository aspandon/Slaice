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
