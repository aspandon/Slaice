import { useCallback, useEffect, useState } from "react";
import { useApp } from "../app/store";
import { todayISO, zoneLayout } from "../data/beach";
import { resolvePrice, restrictionApplies } from "../domain/pricing";
import { applySetStatus, tillSetStatus, type SetStatus } from "../domain/till";
import { invLabel, invStatus, type SalesChannel } from "../domain/inventory";
import type { SunbedSlot, Zone } from "../domain/types";

/** Re-render every `ms` so time-based state (holds expiring) stays current. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

/** The demo clock: real time plus the admin's fast-forward offset (AENR-512). */
export function useDemoNow(ms = 15000): number {
  const { inventory } = useApp();
  return useNow(ms) + inventory.clockOffset * 60000;
}

/** A zone's sunbed sets with the live per-day status applied — till sales and
 *  basket holds, closed stores, and inventory controls (holds, channel
 *  allocations, stop-sell) for the selling channel — the one view every
 *  persona renders. For several days, a set taken on any of them counts. */
export function useLiveSlots(channel: SalesChannel = "online"): (zone: Zone, days: readonly string[]) => SunbedSlot[] {
  const { beachLayout, till, beachPricing, priceRules, inventory } = useApp();
  const closure = useClosure();
  const now = useDemoNow();
  return useCallback(
    (zone: Zone, days: readonly string[]) => {
      const status: Record<string, SetStatus> = {};
      for (const d of days) {
        for (const [id, s] of Object.entries(tillSetStatus(till, d, now)))
          if (status[id] !== "sold") status[id] = s;
      }
      // Prices shown are the resolved price for the first day (category, rules, overrides).
      const priced = (beachLayout[zone.id] ?? zoneLayout(zone)).map((s) =>
        days[0] ? { ...s, price: resolvePrice(s, zone.id, days[0], beachPricing, priceRules).price } : s,
      );
      const live = applySetStatus(priced, status, days.some((d) => !!closure(zone.id, d)));
      // Inventory controls: held → on hold; allocated to another channel or
      // stop-sold online → unavailable here — with the reason attached.
      return live.map((s) => {
        if (s.state === "u") return s;
        for (const d of days) {
          const st = invStatus(inventory, zone.id, s.id, s.cat, d, channel, now);
          if (st.kind === "held") return { ...s, state: "h" as const, inv: invLabel(st) };
          if (st.kind !== "open") return { ...s, state: "u" as const, inv: invLabel(st) };
        }
        return s;
      });
    },
    [beachLayout, till, now, closure, beachPricing, priceRules, inventory, channel],
  );
}

/** Why a store is closed on a date: the admin's "closed today" switch (today
 *  only) or a "closed" restriction on the pricing calendar (AENR-511). */
export function useClosure(): (zoneId: string, day: string) => string | undefined {
  const { closedStores, calendar } = useApp();
  return useCallback(
    (zoneId: string, day: string) => {
      if (day === todayISO() && closedStores[zoneId]) return closedStores[zoneId];
      const r = calendar.restrictions.find((x) => x.kind === "closed" && restrictionApplies(x, zoneId, day));
      return r ? r.label || "Closed" : undefined;
    },
    [closedStores, calendar],
  );
}
