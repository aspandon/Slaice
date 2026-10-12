import { useCallback, useEffect, useState } from "react";
import { useApp } from "../app/store";
import { CLOSED_STORES, zoneLayout } from "../data/beach";
import { applySetStatus, tillSetStatus, type SetStatus } from "../domain/till";
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

/** A zone's sunbed sets with the live per-day status (till sales and holds,
 *  closed stores) applied — the one view every persona renders. For several
 *  days, a set taken on any of them counts as taken. */
export function useLiveSlots(): (zone: Zone, days: readonly string[]) => SunbedSlot[] {
  const { beachLayout, till } = useApp();
  const now = useNow(15000);
  return useCallback(
    (zone: Zone, days: readonly string[]) => {
      const status: Record<string, SetStatus> = {};
      for (const d of days) {
        for (const [id, s] of Object.entries(tillSetStatus(till, d, now)))
          if (status[id] !== "sold") status[id] = s;
      }
      return applySetStatus(
        beachLayout[zone.id] ?? zoneLayout(zone),
        status,
        !!CLOSED_STORES[zone.id],
      );
    },
    [beachLayout, till, now],
  );
}
