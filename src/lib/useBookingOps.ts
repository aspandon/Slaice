import { useMemo } from "react";
import { useApp } from "../app/store";
import { ADMIN_BOOKINGS, personByFirst, type AdminBooking, type AdminRefund } from "../data/mock";
import {
  awaitingLinkBookings,
  onlineBookings,
  payLinkBookings,
  tillBookings,
} from "../data/tillAdmin";
import { ZONES } from "../data/beach";
import { DEMO_TODAY, fmtDay, isoFromDayMonth } from "../domain/period";
import { opsKey } from "../domain/sunbedOps";
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

/** "Now" on the demo calendar: the demo day at the real time of day. */
export const opsNow = () => `${DEMO_TODAY}T${new Date().toTimeString().slice(0, 5)}`;

export function useBookingOps() {
  const {
    till,
    payLinks,
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
      ...awaitingLinkBookings(payLinks, Date.now()),
      ...onlineBookings(account.bookings),
      ...payLinkBookings(payLinks),
      ...tillBookings(till.sales),
      ...ADMIN_BOOKINGS,
    ];
    return all.map((b) => {
      const p = personByFirst(b.who);
      return {
        ...b,
        items: applyMoves(b.items, bookingOps.moves[b.id]),
        status: effectiveStatus(b, bookingOps),
        surname: p?.last ?? "",
        phone: p?.phone ?? "",
        email: p?.email ?? "",
        visitIso: isoFromDayMonth(b.date) ?? DEMO_TODAY,
      };
    });
  }, [payLinks, account.bookings, till.sales, bookingOps]);

  const addEvent = (id: string, kind: BookingEventKind, text: string) =>
    setBookingOps((o) => ({
      ...o,
      events: { ...o.events, [id]: [...(o.events[id] ?? []), { at: opsNow(), kind, text, by }] },
    }));

  const timelineOf = (b: OpsBooking): BookingEvent[] =>
    timeline(
      b,
      b.visitIso,
      bookingOps,
      (bookingNotes[b.id] ?? []).map((n) => ({
        text: n.escalated ? `${n.text} (escalated)` : n.text,
        at: n.at,
        by: n.by,
      })),
    );

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
