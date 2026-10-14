import { useMemo } from "react";
import { useApp } from "../app/store";
import { ADMIN_BOOKINGS, CUSTOMER_BOOKINGS, personByFirst, type AdminBooking, type AdminRefund } from "../data/mock";
import { PROFILE } from "../domain/account";
import { onlineBookings, staffBookings, tillBookings } from "../data/tillAdmin";
import { ZONES } from "../data/beach";
import type { CancelRecord } from "../domain/visits";
import { DEMO_TODAY, fmtDay, isoFromDayMonth } from "../domain/period";
import { opsKey, type OpsStatus } from "../domain/sunbedOps";
import {
  applyMoves,
  effectiveStatus,
  pendingRefundOf,
  timeline,
  type BookingEvent,
  type BookingEventKind,
  type RefundRequest,
} from "../domain/bookingOps";

/* Back-office bookings with their live state (AENR-579/580/583): every source
   (online, pay-by-link, till, seed), set moves and refund decisions applied,
   and the actions staff take on them — each written once to the app store so
   the Bookings list, the live map, Refunds and the other personas agree. */

export type OpsBooking = AdminBooking & {
  surname: string;
  phone: string;
  email: string;
  visitIso: string;
};

const linkEventKind = (text: string): BookingEventKind =>
  /^(Reserved|Booked)/.test(text)
    ? "created"
    : /paid|Paid/.test(text)
      ? "paid"
      : /resent|link sent/i.test(text)
        ? "link_sent"
        : /Cancelled|declined/.test(text)
          ? "refund_declined"
          : "note";

/* The demo guest's own bookings (My bookings) that the sample list lacks —
   so their self-service (cancel, AENR-572) shows in the back office too. */
const GUEST_HISTORY: AdminBooking[] = CUSTOMER_BOOKINGS.filter((r) => !ADMIN_BOOKINGS.some((a) => a.id === r.id)).map((r) => ({
  id: r.id,
  who: PROFILE.first,
  items: [r.item.replace(/^Day Locker/, "Day locker")],
  date: r.date.replace(/^\w+,\s*/, ""),
  channel: "Online",
  status: r.status,
  amount: r.price,
}));

/** "Now" on the demo calendar: the demo day at the real time of day. */
export const opsNow = () => `${DEMO_TODAY}T${new Date().toTimeString().slice(0, 5)}`;

export function useBookingOps() {
  const {
    till,
    payLinks,
    inventory,
    account,
    bookingOps,
    setBookingOps,
    setSunbedOps,
    bookingNotes,
    persona,
    viewAs,
  } = useApp();
  const by = viewAs?.name ?? (persona === "callcenter" ? "Call Center" : "Manager / Admin");

  const bookings: OpsBooking[] = useMemo(() => {
    const all = [
      ...staffBookings(payLinks, Date.now() + inventory.clockOffset * 60000),
      ...onlineBookings(account.bookings),
      ...tillBookings(till.sales),
      ...ADMIN_BOOKINGS,
      ...GUEST_HISTORY,
    ];
    const guestCancelled: Record<string, CancelRecord> = {};
    for (const c of Object.values(account.selfService.cancelled)) for (const r of c.refs ?? []) guestCancelled[r] = c;
    for (const pb of account.bookings) {
      const days = Object.values(pb.cancelledDates ?? {});
      if (days.length) guestCancelled[`#${pb.ref}`] = days[0];
    }
    return all.map((b) => {
      // A staff booking knows its guest (AENR-559); sample rows borrow a sample person.
      const g = payLinks.find((l) => `#${l.id}` === b.id)?.guest;
      const p = g
        ? { last: g.name.split(" ").slice(1).join(" "), phone: g.phone, email: g.email }
        : personByFirst(b.who);
      const guestCancel = guestCancelled[b.id];
      return {
        ...b,
        items: applyMoves(b.items, bookingOps.moves[b.id]),
        // A guest's own cancellation (AENR-572) shows here at once.
        status: guestCancel
          ? guestCancel.refund > 0
            ? "Refunded"
            : "Cancelled"
          : effectiveStatus(b, bookingOps),
        surname: p?.last ?? "",
        phone: p?.phone ?? "",
        email: p?.email ?? "",
        visitIso: isoFromDayMonth(b.date) ?? DEMO_TODAY,
      };
    });
  }, [payLinks, inventory.clockOffset, account.bookings, account.selfService, till.sales, bookingOps]);

  const addEvent = (id: string, kind: BookingEventKind, text: string) =>
    setBookingOps((o) => ({
      ...o,
      events: { ...o.events, [id]: [...(o.events[id] ?? []), { at: opsNow(), kind, text, by }] },
    }));

  const timelineOf = (b: OpsBooking): BookingEvent[] => {
    // A staff booking (AENR-559) has its own real history — use it, not the sample one.
    const link = payLinks.find((l) => `#${l.id}` === b.id);
    if (link)
      return [
        ...link.log.map((e) => ({
          at: `${DEMO_TODAY}T${new Date(e.at).toTimeString().slice(0, 5)}`,
          kind: linkEventKind(e.text),
          text: e.text,
        })),
        ...(bookingOps.events[b.id] ?? []),
      ].sort((x, y) => x.at.localeCompare(y.at));
    return timeline(
      b,
      b.visitIso,
      bookingOps,
      (bookingNotes[b.id] ?? []).map((n) => ({
        text: n.escalated ? `${n.text} (escalated)` : n.text,
        at: n.at,
        by: n.by,
      })),
    );
  };

  const resendQr = (b: OpsBooking, channel: string, dest: string) =>
    addEvent(b.id, "qr_resent", `Gate QR re-sent via ${channel} to ${dest}`);

  /** Move a guest from one set to another: the booking and both sets change everywhere. */
  const move = (b: OpsBooking, from: string, to: string, reason = "Guest moved") => {
    const at = new Date().toISOString();
    setBookingOps((o) => {
      const cur = { ...(o.moves[b.id] ?? {}) };
      // Moving an already-moved set rewrites its original → new mapping.
      const orig = Object.keys(cur).find((k) => cur[k] === from) ?? from;
      cur[orig] = to;
      return {
        ...o,
        moves: { ...o.moves, [b.id]: cur },
        events: {
          ...o.events,
          [b.id]: [
            ...(o.events[b.id] ?? []),
            { at: opsNow(), kind: "moved", text: `Moved from ${from} to ${to} · ${reason}`, by },
          ],
        },
      };
    });
    setSunbedOps((o) => ({
      status: {
        ...o.status,
        [opsKey(b.visitIso, from)]: { status: "available", reason: `${reason} → ${to}`, by, at },
        [opsKey(b.visitIso, to)]: {
          status: "booked",
          reason: `${b.id} moved from ${from}`,
          by,
          at,
        },
      },
      history: [
        {
          setId: to,
          date: b.visitIso,
          from: "available" as const,
          to: "booked" as const,
          reason: `${b.id} moved from ${from}`,
          by,
          at,
        },
        {
          setId: from,
          date: b.visitIso,
          from: "booked" as const,
          to: "available" as const,
          reason: `${reason} → ${to}`,
          by,
          at,
        },
        ...o.history,
      ].slice(0, 300),
    }));
  };

  /** Swap two sets' state on a date for a guest without a back-office booking (sample beach). */
  const moveSet = (date: string, from: string, to: string, reason = "Guest moved") => {
    const at = new Date().toISOString();
    setSunbedOps((o) => ({
      status: {
        ...o.status,
        [opsKey(date, from)]: { status: "available", reason: `${reason} → ${to}`, by, at },
        [opsKey(date, to)]: { status: "booked", reason: `Guest moved from ${from}`, by, at },
      },
      history: [
        {
          setId: to,
          date,
          from: "available" as const,
          to: "booked" as const,
          reason: `Guest moved from ${from}`,
          by,
          at,
        },
        {
          setId: from,
          date,
          from: "booked" as const,
          to: "available" as const,
          reason: `${reason} → ${to}`,
          by,
          at,
        },
        ...o.history,
      ].slice(0, 300),
    }));
  };

  /** Free a set for resale (no-show after the cut-off): sellable at once everywhere. */
  const release = (setId: string, date: string, reason: string, bookingId?: string) => {
    const at = new Date().toISOString();
    setSunbedOps((o) => ({
      status: { ...o.status, [opsKey(date, setId)]: { status: "available", reason, by, at } },
      history: [
        { setId, date, from: "booked" as const, to: "available" as const, reason, by, at },
        ...o.history,
      ].slice(0, 300),
    }));
    if (bookingId) addEvent(bookingId, "released", `${setId} released for resale · ${reason}`);
  };

  /** Set a set's status on a date (Hold, Out of service, back to Available…), with history. */
  const setSetStatus = (setId: string, date: string, from: OpsStatus, to: OpsStatus, reason: string) => {
    const at = new Date().toISOString();
    setSunbedOps((o) => ({
      status: { ...o.status, [opsKey(date, setId)]: { status: to, reason, by, at } },
      history: [{ setId, date, from, to, reason, by, at }, ...o.history].slice(0, 300),
    }));
  };
  /** The guest is on the sand (AENR-651): the set turns occupied and the booking logs the arrival. */
  const checkIn = (setId: string, date: string, ref?: string) => {
    setSetStatus(setId, date, "booked", "occupied", "Checked in on the live map");
    if (ref) addEvent(ref, "scanned", `Checked in at ${setId} by ${by}`);
  };
  /** Payment taken on the spot (AENR-651): the booking counts as paid everywhere. */
  const takePayment = (ref: string, amount: number, how: string, where = "on the live map") =>
    addEvent(ref, "paid", `Paid €${amount.toFixed(2)} · ${how} · taken ${where}`);

  const newRequest = (
    b: Pick<OpsBooking, "id" | "who" | "amount">,
    amount: number,
    reason: string,
    seq: number,
  ): RefundRequest => ({
    id: `RR-${seq + 1}`,
    bookingId: b.id,
    tx: `#TX-${88300 + seq - 1000}`,
    who: b.who,
    amount,
    reason,
    requestedAt: opsNow(),
    requestedBy: by,
    status: "pending",
  });
  /** A request for a manager's decision (Call Center, or a guest's ask). */
  const requestRefund = (
    b: Pick<OpsBooking, "id" | "who" | "amount">,
    amount: number,
    reason: string,
  ) =>
    setBookingOps((o) => ({
      ...o,
      seq: o.seq + 1,
      refunds: [newRequest(b, amount, reason, o.seq), ...o.refunds],
      events: {
        ...o.events,
        [b.id]: [
          ...(o.events[b.id] ?? []),
          {
            at: opsNow(),
            kind: "refund_requested",
            text: `Refund of €${amount} requested · ${reason}`,
            by,
          },
        ],
      },
    }));
  /** A manager refunding straight away: the request is recorded already approved. */
  const refundNow = (
    b: Pick<OpsBooking, "id" | "who" | "amount">,
    amount: number,
    reason: string,
  ) =>
    setBookingOps((o) => ({
      ...o,
      seq: o.seq + 1,
      refunds: [
        {
          ...newRequest(b, amount, reason, o.seq),
          status: "approved",
          refundAmount: amount,
          decidedBy: by,
          decidedAt: opsNow(),
        },
        ...o.refunds,
      ],
      events: {
        ...o.events,
        [b.id]: [
          ...(o.events[b.id] ?? []),
          {
            at: opsNow(),
            kind: "refunded",
            text: `Refunded €${amount} via Stripe · ${reason} · credit note sent to myDATA`,
            by,
          },
        ],
      },
    }));

  /** One decision path for the queue and the booking drawer (AENR-583). */
  const decideRefund = (reqId: string, d: { approve: number } | { decline: string }) =>
    setBookingOps((o) => {
      const r = o.refunds.find((x) => x.id === reqId);
      if (!r || r.status !== "pending") return o;
      const next: RefundRequest =
        "approve" in d
          ? {
              ...r,
              status: "approved",
              refundAmount: d.approve,
              decidedBy: by,
              decidedAt: opsNow(),
            }
          : {
              ...r,
              status: "declined",
              declineReason: d.decline,
              decidedBy: by,
              decidedAt: opsNow(),
            };
      const ev: BookingEvent =
        "approve" in d
          ? {
              at: opsNow(),
              kind: "refunded",
              text: `Refunded €${d.approve} via Stripe · credit note sent to myDATA`,
              by,
            }
          : { at: opsNow(), kind: "refund_declined", text: `Refund declined · ${d.decline}`, by };
      return {
        ...o,
        refunds: o.refunds.map((x) => (x.id === reqId ? next : x)),
        events: r.bookingId
          ? { ...o.events, [r.bookingId]: [...(o.events[r.bookingId] ?? []), ev] }
          : o.events,
      };
    });

  return {
    bookings,
    by,
    timelineOf,
    resendQr,
    move,
    moveSet,
    release,
    setSetStatus,
    checkIn,
    takePayment,
    requestRefund,
    refundNow,
    decideRefund,
    pendingRefund: (id: string) => pendingRefundOf(id, bookingOps),
    refunds: bookingOps.refunds,
  };
}

/** Decided requests as rows of the Refunds history (AENR-583). */
export function decidedRefundRows(refunds: readonly RefundRequest[]): AdminRefund[] {
  return refunds
    .filter((r) => r.status !== "pending")
    .map((r) => ({
      tx: r.tx,
      who: r.who,
      amount: r.amount,
      refundAmount: r.status === "approved" ? r.refundAmount : undefined,
      reason: r.status === "declined" ? `${r.reason} — declined: ${r.declineReason}` : r.reason,
      status: r.status === "approved" ? "Refunded" : "Declined",
      date: fmtDay((r.decidedAt ?? r.requestedAt).slice(0, 10)),
      approver: r.decidedBy,
    }));
}

export const zoneByName = (name: string) => ZONES.find((z) => z.name === name);
