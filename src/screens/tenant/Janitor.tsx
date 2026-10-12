import { useEffect } from "react";
import { usePlatform } from "../../lib/usePlatform";

/* Platform housekeeping on the demo clock (AENR-517 / 518): expired module
   overrides revert and are logged; offboarding tenants whose retention window
   has passed are closed with a deletion certificate. Writes as "System". */
export function PlatformJanitor() {
  const { platform, setPlatform, today } = usePlatform();
  useEffect(() => {
    const needs = platform.tenants.some(
      (t) =>
        t.overrides.some((o) => o.expires && o.expires < today && !o.expiredLogged) ||
        (t.lifecycle === "offboarding" &&
          !!t.offboarding?.deleteOn &&
          t.offboarding.deleteOn <= today),
    );
    if (!needs) return;
    const at = new Date().toISOString();
    setPlatform((p) => ({
      ...p,
      tenants: p.tenants.map((t) => {
        let x = t;
        const lapsed = x.overrides.filter(
          (o) => o.expires && o.expires < today && !o.expiredLogged,
        );
        if (lapsed.length)
          x = {
            ...x,
            overrides: x.overrides.map((o) =>
              lapsed.includes(o) ? { ...o, expiredLogged: true } : o,
            ),
            audit: [
              ...lapsed.map((o, i) => ({
                id: `au-exp-${Date.now().toString(36)}${i}`,
                at,
                actor: "System",
                actorType: "System" as const,
                section: "Modules",
                change: `Override expired: ${o.module} reverted to plan`,
                from: o.on ? "on" : "off",
                reason: o.reason,
              })),
              ...x.audit,
            ],
          };
        if (
          x.lifecycle === "offboarding" &&
          x.offboarding?.deleteOn &&
          x.offboarding.deleteOn <= today
        )
          x = {
            ...x,
            lifecycle: "closed",
            offboarding: {
              ...x.offboarding,
              done: x.offboarding.done.map(() => true),
              certificate: at,
            },
            history: [
              ...x.history,
              {
                from: "offboarding",
                to: "closed",
                reason: "Retention window ended — data deleted",
                actor: "System",
                at,
              },
            ],
            audit: [
              {
                id: `au-close-${Date.now().toString(36)}`,
                at,
                actor: "System",
                actorType: "System",
                section: "Lifecycle",
                change: "Offboarding → Closed · deletion certificate issued",
              },
              ...x.audit,
            ],
          };
        return x;
      }),
    }));
  }, [platform.tenants, today, setPlatform]);
  return null;
}
