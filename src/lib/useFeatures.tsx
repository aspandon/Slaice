import type { ReactNode } from "react";
import { useApp } from "../app/store";
import { realTodayISO } from "../data/beach";
import {
  featureSwitch,
  featureDef,
  tenantHasModule,
  tenantRoleOn,
  type TenantFeatureId,
} from "../domain/features";
import { addDays } from "../domain/period";
import type { ModuleId } from "../domain/plans";

/* ============ What this tenant's app shows (AENR-691 / 696 / 677 / 721) ============
   One hook for every gate: roadmap previews (the demo switch), the tenant's
   modules and feature switches (Platform › tenant › Modules & features)
   and the staff roles it uses (› Users & roles, AENR-716).
   The tenant is the one the demo personas represent (platform.siteTenant), so
   a change on the Platform reaches every role at once — it is the same store. */

/** A gate: shown only when every condition it names holds. */
export interface Gate {
  /** Marked Future (FUTURE badge / roadmap banner) — needs roadmap previews on. */
  future?: boolean;
  /** Needs this module on for the tenant. */
  module?: ModuleId;
  /** Needs this tenant feature switch on (and the switch's own module, if any). */
  feature?: TenantFeatureId;
}

/** Roadmap previews on? Off by default (AENR-618); off hides every Future item (AENR-691). */
export function useRoadmap(): boolean {
  return useApp().showPreviews;
}

export function useTenantFeatures() {
  const { platform, showPreviews } = useApp();
  const tenant = platform.tenants.find((x) => x.id === platform.siteTenant);
  const today = addDays(realTodayISO(), platform.clockDays);
  /** Unknown tenant (shouldn't happen) = everything on, so nothing vanishes by accident. */
  const module = (m: ModuleId) => !tenant || tenantHasModule(tenant, platform.plans, m, today);
  const feature = (k: TenantFeatureId) => {
    const m = featureDef(k)?.module;
    return featureSwitch(tenant, k) && (!m || module(m));
  };
  const allows = (g: Gate) =>
    (!g.future || showPreviews) &&
    (!g.module || module(g.module)) &&
    (!g.feature || feature(g.feature));
  /** Whether the tenant uses this staff role (Platform › tenant › Users & roles, AENR-716) — Customer and Platform always do. */
  const role = (r: string) => tenantRoleOn(tenant, r);
  return { tenant, roadmap: showPreviews, module, feature, role, allows };
}

/** Renders its children only when the gate allows them — use it at every Future or module-bound site. */
export function Gated({ children, ...g }: Gate & { children: ReactNode }) {
  const { allows } = useTenantFeatures();
  return allows(g) ? <>{children}</> : null;
}

/** Shorthand for a Future-marked block: hidden unless roadmap previews are on (and its module is on). */
export function Roadmap({ module, children }: { module?: ModuleId; children: ReactNode }) {
  return (
    <Gated future module={module}>
      {children}
    </Gated>
  );
}
