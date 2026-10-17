import { useMemo } from "react";
import { useApp } from "../app/store";
import { listCustomerBookings } from "../api";
import { useAsync } from "./useAsync";
import { useDemoFlag } from "./useDemoFlag";
import { ZONES, todayISO } from "../data/beach";
import {
  historyVisits,
  placedVisits,
  refundQuote,
  resolveVisits,
  type Visit,
  type VisitLine,
} from "../domain/visits";

/* The signed-in guest's visits with their self-service actions (AENR-541).
   Everything writes to the account in the app store, so My bookings, Home,
   Wallet and the admin Bookings agree at once. */

const zoneName = (id?: string) => ZONES.find((z) => z.id === id)?.name ?? "";
/** The guest's "now": the demo day at the real time of day. */
export const guestNow = () => `${todayISO()}T${new Date().toTimeString().slice(0, 5)}`;

export function useVisits() {
  const { account, setAccount, extras } = useApp();
  const history = useAsync(listCustomerBookings);
  const today = todayISO();
  // Demo › "Simulate a first-time guest" (AENR-702): no bookings at all, everywhere.
  const [newGuest] = useDemoFlag("newGuest");
  const visits: Visit[] = useMemo(
    () =>
      newGuest ? [] : resolveVisits(
        [
          ...placedVisits(account.bookings, zoneName),
          ...(history.status === "success" ? historyVisits(history.data) : []),
        ],
        account.selfService,
        today,
      ),
    [account.bookings, account.selfService, history, today, newGuest],
  );
  const policy = extras.policy;

  const credit = (amount: number, text: string) =>
    setAccount((a) => ({
      ...a,
      credit: {
        balance: Math.round((a.credit.balance + amount) * 100) / 100,
        log: [{ at: guestNow(), text, amount }, ...a.credit.log],
      },
    }));

  /** Cancel a visit; the refund follows the policy and goes to the card or to beach credit. */
  const cancel = (v: Visit, to: "card" | "credit") => {
    const q = refundQuote(v.total, v.date, guestNow(), policy);
    const rec = { at: guestNow(), refund: q.refund, to, refs: v.refs };
    setAccount((a) => {
      if (v.source === "placed") {
        const ref = v.refs[0].slice(1);
        return {
          ...a,
          bookings: a.bookings.map((b) =>
            b.ref === ref
              ? { ...b, cancelledDates: { ...(b.cancelledDates ?? {}), [v.date]: rec } }
              : b,
          ),
        };
      }
      return {
        ...a,
        selfService: { ...a.selfService, cancelled: { ...a.selfService.cancelled, [v.key]: rec } },
      };
    });
    if (to === "credit" && q.refund > 0) credit(q.refund, `Refund as credit · ${v.refs[0]}`);
    return q;
  };

  /** Move a visit to another date (its sets move with it). */
  const move = (v: Visit, date: string) =>
    setAccount((a) => {
      if (v.source === "placed") {
        const ref = v.refs[0].slice(1);
        return {
          ...a,
          // Its sets are live inventory: moving the items frees the old day and takes the new one.
          bookings: a.bookings.map((b) =>
            b.ref === ref
              ? { ...b, items: b.items.map((i) => (i.date === v.date ? { ...i, date } : i)) }
              : b,
          ),
        };
      }
      return {
        ...a,
        selfService: { ...a.selfService, moved: { ...a.selfService.moved, [v.key]: date } },
      };
    });

  /** Add an extra (ticket, parking, locker) to a booked visit — paid with the saved card. */
  const addExtra = (v: Visit, line: VisitLine) =>
    setAccount((a) => ({
      ...a,
      selfService: {
        ...a.selfService,
        added: { ...a.selfService.added, [v.key]: [...(a.selfService.added[v.key] ?? []), line] },
      },
    }));

  return {
    status: history.status,
    refetch: history.refetch,
    visits,
    policy,
    cancel,
    move,
    addExtra,
    credit,
  };
}
