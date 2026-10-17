import { useCallback, useEffect, useState } from "react";
import { useApp } from "../app/store";
import { subPath } from "../app/router";
import { realTodayISO } from "../data/beach";
import { addDays } from "../domain/period";
import { planVersion } from "../domain/plans";
import { recurringFor, termsOf } from "../domain/economics";
import type { AuditEntry, TenantRecord } from "../domain/tenants";

let seq = 0;
/** Platform helpers: the demo-clock date, tenant lookup and audited updates. */
export function usePlatform() {
  const { platform, setPlatform, toast } = useApp();
  const today = addDays(realTodayISO(), platform.clockDays);
  const actor = platform.viewAs ? platform.viewAs.by : "Sofia Antoniou";
  /** Change a tenant and write one audit entry (actor type follows the View-as session). */
  const updateTenant = useCallback(
    (
      id: string,
      fn: (t: TenantRecord) => TenantRecord,
      entry?: Omit<AuditEntry, "id" | "at" | "actor" | "actorType"> & {
        actorType?: AuditEntry["actorType"];
      },
    ) =>
      setPlatform((p) => ({
        ...p,
        tenants: p.tenants.map((t) => {
          if (t.id !== id) return t;
          const next = fn(t);
          if (!entry) return next;
          const a: AuditEntry = {
            id: `au-${Date.now().toString(36)}${++seq}`,
            at: new Date().toISOString(),
            actor,
            actorType:
              entry.actorType ?? (p.viewAs ? "Slaice staff while viewing as" : "Slaice staff"),
            ...entry,
          };
          return { ...next, audit: [a, ...next.audit] };
        }),
      })),
    [setPlatform, actor],
  );
  const plan = (t: TenantRecord) => planVersion(platform.plans, t.plan.id, t.plan.version);
  const planName = (t: TenantRecord) =>
    `${platform.plans.find((p) => p.id === t.plan.id)?.name ?? t.plan.id} v${t.plan.version}`;
  /** MRR for a month (default: this one), derived from the commercial terms (AENR-689): the subscription —
   *  plan list price, season / off-season price or none — plus add-ons and the support fee. */
  const mrr = (t: TenantRecord, month: string = today.slice(0, 7)) =>
    ["live", "paused_by_tenant", "suspended_by_slaice"].includes(t.lifecycle)
      ? recurringFor(termsOf(t), plan(t)?.price ?? 0, t.addOns, month)
      : 0;
  /** ARR: the twelve months of this year added up (seasonal prices differ month to month). */
  const arr = (t: TenantRecord) =>
    Array.from({ length: 12 }, (_, i) => mrr(t, `${today.slice(0, 4)}-${String(i + 1).padStart(2, "0")}`)).reduce((a, b) => a + b, 0);
  const canEdit = platform.role !== "viewer";
  return { platform, setPlatform, toast, today, updateTenant, plan, planName, mrr, arr, canEdit, actor };
}

/** The tenant id and section from `#/platform/tenant/<id>/<section>`, kept in sync with the hash. */
export function useTenantRoute(): {
  id: string;
  section: string;
  go: (id: string, section?: string) => void;
} {
  const [segs, setSegs] = useState(() => subPath());
  useEffect(() => {
    const on = () => setSegs(subPath());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = useCallback((id: string, section = "overview") => {
    window.location.hash = `#/platform/tenant/${id}/${section}`;
  }, []);
  return { id: segs[0] ?? "", section: segs[1] ?? "overview", go };
}

/** Whether the tenant the demo customer / cashier personas represent is open for business (AENR-518). */
export function useSiteStatus() {
  const { platform } = useApp();
  const t = platform.tenants.find((x) => x.id === platform.siteTenant);
  const suspended = t?.lifecycle === "suspended_by_slaice";
  const closed = t?.lifecycle === "offboarding" || t?.lifecycle === "closed";
  const paused = t?.lifecycle === "paused_by_tenant";
  return {
    tenant: t,
    blockOnline: !!t && ((suspended && !!t.suspension?.blockOnline) || paused || closed),
    blockCashier: !!t && ((suspended && !!t.suspension?.blockCashier) || closed),
    message: suspended
      ? (t?.suspension?.message ?? "Bookings are temporarily unavailable.")
      : paused
        ? "We're closed for the season — see you next summer."
        : "This beach no longer takes bookings online.",
  };
}
