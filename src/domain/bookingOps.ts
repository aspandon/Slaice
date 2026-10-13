// Back-office booking operations (AENR-579, 580, 583): each booking's
// timeline, guests moved between sets, and refund requests decided in a queue.
// Pure functions over the booking rows the Bookings list already shows; the
// demo state (events, moves, requests) lives in the app store.

import type { AdminBooking } from "../data/mock";

export type BookingEventKind =
  | "created"
  | "paid"
  | "link_sent"
  | "qr_sent"
  | "qr_resent"
  | "scanned"
  | "moved"
  | "note"
  | "refund_requested"
  | "refunded"
  | "refund_declined"
  | "released";
export interface BookingEvent {
  /** ISO date-time (YYYY-MM-DDTHH:mm). */
  at: string;
  kind: BookingEventKind;
  text: string;
  by?: string;
}

export type RefundStatus = "pending" | "approved" | "declined";
export interface RefundRequest {
  id: string;
  /** The booking it refunds, when it came from one. */
  bookingId?: string;
  tx: string;
  who: string;
  amount: number;
  reason: string;
  requestedAt: string;
  requestedBy: string;
  status: RefundStatus;
  refundAmount?: number;
  decidedBy?: string;
  decidedAt?: string;
  /** Why a request was declined (told to the guest). */
  declineReason?: string;
}

export interface BookingOpsState {
  events: Record<string, BookingEvent[]>;
  /** bookingId → { fromSet: toSet } */
  moves: Record<string, Record<string, string>>;
  refunds: RefundRequest[];
  seq: number;
}

/* ---------- Refund SLA ---------- */
/** Refund requests should be decided within this many hours. */
export const REFUND_SLA_HOURS = 48;
export const DECLINE_REASONS = [
  "Outside the cancellation policy",
  "Already used",
  "Duplicate request",
  "Offered a date change instead",
  "Other",
];
const ms = (iso: string) => Date.parse(iso.length === 16 ? `${iso}:00` : iso);
export function ageHours(requestedAt: string, now: string): number {
  return Math.max(0, (ms(now) - ms(requestedAt)) / 3_600_000);
}
export type SlaState = "ok" | "due" | "overdue";
/** Due = less than a quarter of the SLA left; overdue = past it. */
export function slaState(requestedAt: string, now: string): SlaState {
  const h = ageHours(requestedAt, now);
  return h > REFUND_SLA_HOURS ? "overdue" : h > REFUND_SLA_HOURS * 0.75 ? "due" : "ok";
}
export function ageLabel(requestedAt: string, now: string): string {
  const h = ageHours(requestedAt, now);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} days`;
}

/* ---------- Moves ---------- */
/** Items with any set moves applied ("Sunbed · Central · CE-12"). */
export function applyMoves(
  items: readonly string[],
  moves: Record<string, string> | undefined,
): string[] {
  if (!moves) return [...items];
  return items.map((it) => {
    const parts = it.split(" · ");
    const to = parts[0] === "Sunbed" ? moves[parts[2]] : undefined;
    return to ? `${parts[0]} · ${parts[1]} · ${to}` : it;
  });
}
export const setsOf = (items: readonly string[]) =>
  items.filter((i) => i.startsWith("Sunbed · ")).map((i) => i.split(" · ")[2]);

/* ---------- Effective status ---------- */
/** An approved refund makes the booking Refunded everywhere. */
export function effectiveStatus(
  b: Pick<AdminBooking, "id" | "status">,
  ops: BookingOpsState,
): string {
  return ops.refunds.some((r) => r.bookingId === b.id && r.status === "approved")
    ? "Refunded"
    : b.status;
}
export const pendingRefundOf = (bookingId: string, ops: BookingOpsState) =>
  ops.refunds.find((r) => r.bookingId === bookingId && r.status === "pending");

/* ---------- Timeline ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
function seedOf(id: string) {
  return parseInt(id.replace(/\D/g, ""), 10) || 7;
}
function shift(iso: string, days: number, hh: number, mm: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.toISOString().slice(0, 10)}T${pad(hh)}:${pad(mm)}`;
}
/** What the booking's own data says happened, in order (deterministic). */
export function baseTimeline(
  b: AdminBooking & { channel: string },
  visitIso: string,
): BookingEvent[] {
  const n = seedOf(b.id);
  const lead = b.channel === "Walk-in" || b.channel === "Cashier" ? 0 : 1 + (n % 6);
  const createdAt = lead
    ? shift(visitIso, -lead, 9 + (n % 10), (n * 7) % 60)
    : shift(visitIso, 0, 9 + (n % 5), (n * 7) % 60);
  const plus = (iso: string, min: number) => {
    const d = new Date(`${iso}:00Z`);
    d.setUTCMinutes(d.getUTCMinutes() + min);
    return d.toISOString().slice(0, 16);
  };
  const via =
    b.channel === "Online"
      ? "the website"
      : b.channel === "Phone"
        ? "the call centre"
        : b.channel === "Pay-by-link"
          ? "a payment link"
          : b.channel === "Cashier"
            ? "the till"
            : "the beach";
  const out: BookingEvent[] = [
    {
      at: createdAt,
      kind: "created",
      text: `Booked via ${via}`,
      by: b.channel === "Online" ? "Guest" : "Staff",
    },
  ];
  if (b.channel === "Pay-by-link")
    out.push({ at: plus(createdAt, 1), kind: "link_sent", text: "Payment link sent" });
  if (b.status !== "Unpaid") {
    const paid = plus(createdAt, b.channel === "Pay-by-link" ? 18 : 1);
    out.push({
      at: paid,
      kind: "paid",
      text: `Paid €${b.amount}${b.channel === "Walk-in" || b.channel === "Cashier" ? " at the till" : " by card"}`,
    });
    out.push({ at: plus(paid, 1), kind: "qr_sent", text: "Gate QR sent by e-mail" });
  }
  if (b.status === "Used")
    out.push({
      at: shift(visitIso, 0, 9 + (n % 3), (n * 13) % 60),
      kind: "scanned",
      text: `Scanned at the gate · Gate ${1 + (n % 2)}`,
    });
  if (b.status === "Cancelled")
    out.push({
      at: plus(createdAt, 60 * 20),
      kind: "refund_declined",
      text: "Cancelled — no charge",
    });
  return out;
}
/** Base events + what staff did, newest last. */
export function timeline(
  b: AdminBooking & { channel: string },
  visitIso: string,
  ops: BookingOpsState,
  notes: { text: string; at: string; by: string }[] = [],
): BookingEvent[] {
  const extra = ops.events[b.id] ?? [];
  const noteEvents: BookingEvent[] = notes.map((x) => ({
    at: x.at.slice(0, 16),
    kind: "note",
    text: x.text,
    by: x.by,
  }));
  const refunds: BookingEvent[] =
    b.status === "Refunded" && !ops.refunds.some((r) => r.bookingId === b.id)
      ? [
          {
            at: shift(visitIso, -1, 18, 5),
            kind: "refunded",
            text: `Refunded €${b.amount} · credit note sent to myDATA`,
          },
        ]
      : [];
  return [...baseTimeline(b, visitIso), ...refunds, ...extra, ...noteEvents].sort((a, c) =>
    a.at.localeCompare(c.at),
  );
}
