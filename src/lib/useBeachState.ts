import { useApp } from "../app/store";
import { CUSTOMERS } from "../data/mock";
import { DEMO_TODAY } from "../domain/period";
import { NO_SHOW_CUTOFF, exceptionsOf, opsKey, type OpsStatus, type SetException } from "../domain/sunbedOps";
import { useDemoNow } from "./useLiveSlots";
import type { SunbedSlot } from "../domain/types";
import { useBookingOps, type OpsBooking } from "./useBookingOps";

/* Who is on a set and what state it's in, on a date — one reading for the
   Controller's Beach status (AENR-587) and the Manager's live map (AENR-580).
   A staff status wins; then a real booking (online, phone, till, pay-by-link,
   moved guests included); then the sample beach. */

export interface SetBooking {
  ref: string;
  guest: string;
  guests: number;
  paid: boolean;
  noShow: boolean;
  channel: string;
  /** The back-office booking, when there is one (moves and refunds act on it). */
  booking?: OpsBooking;
}

export function useBeachState(date: string) {
  const { sunbedOps, till } = useApp();
  const ops = useBookingOps();
  const bookingsOnDate = ops.bookings.filter(
    (b) => b.visitIso === date && b.status !== "Cancelled" && b.status !== "Refunded",
  );

  // The sample beach fills up through the arrival window (AENR-645): each sample guest
  // arrives at their own time between 09:00 and 11:00 on the demo clock; about one in
  // seven never comes (they become no-shows after the cut-off). Past days: everyone came.
  const now = new Date(useDemoNow()).toTimeString().slice(0, 5);
  const setNo = (s: SunbedSlot) => parseInt(s.id.replace(/\D/g, ""), 10) || 1;
  const sampleNoShow = (n: number) => n % 7 === 3;
  // Real bookings and till sales always turn up (their no-shows come from staff, not the sample).
  const isReal = (s: SunbedSlot) =>
    bookingsOnDate.some((b) => b.items.some((i) => i.startsWith("Sunbed · ") && i.endsWith(` · ${s.id}`))) ||
    till.sales.some((x) => x.day === date && x.lines.some((l) => l.setId === s.id));
  const arrivedBy = (s: SunbedSlot) => {
    const n = setNo(s);
    if (sampleNoShow(n) && !isReal(s)) return false;
    if (date < DEMO_TODAY) return true;
    if (date > DEMO_TODAY) return false;
    const mins = 9 * 60 + ((n * 37) % 120);
    return now >= `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  };
  const statusOf = (s: SunbedSlot): OpsStatus =>
    sunbedOps.status[opsKey(date, s.id)]?.status ??
    (s.state === "u" ? (arrivedBy(s) ? "occupied" : "booked") : s.state === "h" ? "hold" : "available");

  const bookingOf = (s: SunbedSlot): SetBooking | null => {
    const real = bookingsOnDate.find((b) =>
      b.items.some((i) => i.startsWith("Sunbed · ") && i.endsWith(` · ${s.id}`)),
    );
    const n = parseInt(s.id.replace(/\D/g, ""), 10) || 1;
    if (real)
      return {
        ref: real.id,
        guest: `${real.who} ${real.surname}`.trim(),
        guests: 2 + (n % 3),
        paid: real.status !== "Unpaid" && real.status !== "Awaiting payment",
        noShow: false,
        channel: real.channel,
        booking: real,
      };
    const sale = till.sales.find((x) => x.day === date && x.lines.some((l) => l.setId === s.id));
    if (sale)
      return {
        ref: sale.id,
        guest: sale.customer?.name ?? "Walk-in",
        guests: sale.lines.filter((l) => l.kind === "ticket").reduce((a, l) => a + l.qty, 0) || 2,
        paid: true,
        noShow: false,
        channel:
          sale.channel === "controller"
            ? "Controller"
            : sale.channel === "support"
              ? "Support Agent"
              : "Cashier",
      };
    // The sample beach: a set booked on the layout and still booked / checked in —
    // or one a sample guest was moved to (they keep who they are).
    const st = statusOf(s);
    const movedFrom =
      sunbedOps.status[opsKey(date, s.id)]?.reason?.match(/moved from ([A-Z]+-\d+)/)?.[1];
    if (!movedFrom && (s.state !== "u" || (st !== "booked" && st !== "occupied"))) return null;
    if (movedFrom && st !== "booked" && st !== "occupied") return null;
    const g = movedFrom ? parseInt(movedFrom.replace(/\D/g, ""), 10) || n : n;
    const c = CUSTOMERS[g % CUSTOMERS.length];
    return {
      ref: `#BK-${10300 + g * 3}`,
      guest: `${c.first} ${c.last}`,
      guests: 2 + (g % 3),
      paid: g % 5 !== 0,
      // Sample: about one booking in seven hasn't arrived by the cut-off (a moved guest has).
      noShow: !movedFrom && sampleNoShow(g) && (date < DEMO_TODAY || now >= NO_SHOW_CUTOFF),
      channel: g % 4 === 0 ? "Phone" : "Online",
    };
  };

  const exOf = (s: SunbedSlot): SetException[] =>
    exceptionsOf(statusOf(s), bookingOf(s), date === DEMO_TODAY);

  return { statusOf, bookingOf, exOf, ops };
}
