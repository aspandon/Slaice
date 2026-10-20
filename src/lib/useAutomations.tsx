import { useEffect, useRef } from "react";
import { useApp } from "../app/store";
import { isBusy } from "./busy";
import { ZONES } from "../data/beach";
import { DEMO_TODAY } from "../domain/period";
import { DEFAULT_RULES, POLICY_BY, policyCovers, type BookingEvent } from "../domain/bookingOps";
import { opsKey } from "../domain/sunbedOps";
import { useBeachState } from "./useBeachState";
import { useLiveSlots } from "./useLiveSlots";
import { opsNow, useBookingOps } from "./useBookingOps";
import { useTenantFeatures } from "./useFeatures";

/* ============ Routine decisions run by themselves (AENR-623) ============
   Mounted once in the app. The refund policy approves the routine requests
   (weather, closures…) as soon as they arrive; the no-show rule releases
   today's no-shows at the set time, once a day, with a one-hour Undo shown
   on Today. People see only the exceptions. */

/** Finding today's no-shows in open zones, and a release that records what it did — without
 *  computing anything while rendering (AENR-854): the finder walks every set on the beach. */
function useNoShowOps() {
  const { closedStores, bookingOps, setBookingOps, setSunbedOps } = useApp();
  const { exOf, bookingOf, ops } = useBeachState(DEMO_TODAY);
  const liveSlots = useLiveSlots("walkin");
  const rules = bookingOps.rules ?? DEFAULT_RULES;
  const find = () => ZONES.filter((z) => !closedStores[z.id]).flatMap((z) => liveSlots(z, [DEMO_TODAY]).filter((s) => exOf(s).includes("noshow")));
  const release = (noShows: ReturnType<typeof find>, auto: boolean) => {
    if (!noShows.length) return 0;
    noShows.forEach((s) => ops.release(s.id, DEMO_TODAY, auto ? `No-show — released automatically at ${rules.noShow.time}` : `No-show after ${rules.noShow.time} — released for resale`, bookingOf(s)?.booking?.id));
    if (auto)
      setBookingOps((o) => {
        const r = o.rules ?? DEFAULT_RULES;
        return { ...o, rules: { ...r, noShow: { ...r.noShow, lastRun: DEMO_TODAY, last: { at: new Date().toISOString(), date: DEMO_TODAY, sets: noShows.map((s) => s.id) } } } };
      });
    return noShows.length;
  };
  /** Undo the last automatic release (within the hour): the sets are booked again. */
  const undoLast = () => {
    const last = rules.noShow.last;
    if (!last) return;
    setSunbedOps((o) => {
      const status = { ...o.status };
      last.sets.forEach((id) => delete status[opsKey(last.date, id)]);
      return { ...o, status };
    });
    setBookingOps((o) => {
      const r = o.rules ?? DEFAULT_RULES;
      return { ...o, rules: { ...r, noShow: { ...r.noShow, last: undefined } } };
    });
  };
  return { find, release, undoLast, rules };
}

/** Today's no-shows in open zones (for Today), and a release that records what it did. */
export function useNoShowRelease() {
  const { find, release, undoLast, rules } = useNoShowOps();
  const noShows = find();
  return { noShows, releaseAll: (auto: boolean) => release(noShows, auto), undoLast, rules };
}

export function Automations() {
  const { bookingOps, setBookingOps, inventory } = useApp();
  const rules = bookingOps.rules ?? DEFAULT_RULES;
  // Mounted under every screen, so it re-renders with every change to the app store: the beach
  // is walked only on the rule's own clock, never in render (AENR-854 — it cost a phone ~35 ms
  // on each guest step). The interval reads the latest finder through a ref.
  const noShowOps = useNoShowOps();
  const latest = useRef(noShowOps);
  latest.current = noShowOps;
  useBookingOps();

  // Refunds the policy covers are approved as they arrive (and when the policy is widened).
  // Only when Slaice enabled automatic approval for the tenant (AENR-677).
  const { feature } = useTenantFeatures();
  const autoOn = feature("refunds.autoApprove");
  const due = autoOn ? bookingOps.refunds.filter((r) => policyCovers(rules.refunds, r)).map((r) => r.id).join(",") : "";
  useEffect(() => {
    if (!due) return;
    const ids = new Set(due.split(","));
    setBookingOps((o) => {
      const at = opsNow();
      const events = { ...o.events };
      const refunds = o.refunds.map((r) => {
        if (!ids.has(r.id) || r.status !== "pending") return r;
        if (r.bookingId) {
          const ev: BookingEvent = { at, kind: "refunded", text: `Refund of €${r.amount} approved by the refund policy · ${r.reason}`, by: POLICY_BY };
          events[r.bookingId] = [...(events[r.bookingId] ?? []), ev];
        }
        return { ...r, status: "approved" as const, refundAmount: r.amount, decidedBy: POLICY_BY, decidedAt: at };
      });
      return { ...o, refunds, events };
    });
  }, [due, setBookingOps]);

  // No-shows go back on sale at the set time, once a business day.
  useEffect(() => {
    if (!rules.noShow.on || rules.noShow.lastRun === DEMO_TODAY) return;
    const check = () => {
      const now = new Date(Date.now() + inventory.clockOffset * 60000).toTimeString().slice(0, 5);
      // Not in the middle of a page change: the next tick will do.
      if (now < rules.noShow.time || isBusy()) return;
      const { find, release } = latest.current;
      release(find(), true);
    };
    check();
    const id = window.setInterval(check, 20000);
    return () => window.clearInterval(id);
  }, [rules.noShow.on, rules.noShow.time, rules.noShow.lastRun, inventory.clockOffset]);
  return null;
}
