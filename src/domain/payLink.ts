// Pay-by-link reservations (AENR-534): staff reserve sets for a guest who
// isn't at the beach and send a (simulated) Stripe payment link. The sets are
// held until the deadline; paying confirms the booking, not paying releases
// them. Status is derived from the demo clock, never stored stale.

export type PayLinkStatus = "awaiting" | "unpaid" | "paid" | "expired" | "cancelled";
export const PAY_LINK_LABEL: Record<PayLinkStatus, string> = {
  awaiting: "Awaiting payment",
  unpaid: "Unpaid · pay on arrival",
  paid: "Paid",
  expired: "Expired",
  cancelled: "Cancelled",
};

export interface PayLinkLine {
  label: string;
  qty: number;
  unit: number;
  setId?: string;
  zoneId?: string;
}
export interface PayLinkEvent {
  at: string;
  text: string;
}
/** How a staff booking is paid (AENR-559): a card now, a link, or on arrival. */
export type StaffPayMode = "card" | "link" | "unpaid";
export const PAY_MODE_LABEL: Record<StaffPayMode, string> = {
  card: "Pay now by card",
  link: "Send a payment link",
  unpaid: "Reserve unpaid",
};
/** Who took a staff booking — recorded as the booking's channel. */
export type StaffChannel = "Phone" | "Call Center" | "Admin" | "Support Agent";

/** A booking made by staff (AENR-534, widened in AENR-559 to every payment mode). */
export interface PayLink {
  id: string;
  /** Absent on links made before AENR-559 (they are "link"). */
  mode?: StaffPayMode;
  channel?: StaffChannel;
  date: string;
  lines: PayLinkLine[];
  total: number;
  guest: { name: string; phone?: string; email?: string };
  /** ISO time the reservation lapses unless paid. */
  deadline: string;
  /** Only the end states are stored; "awaiting" / "expired" come from the clock. */
  closed?: "paid" | "cancelled";
  paidAt?: string;
  sentVia: ("sms" | "email")[];
  by: string;
  created: string;
  log: PayLinkEvent[];
}

export const payUrl = (l: Pick<PayLink, "id">) => `https://pay.slaice.gr/l/${l.id.toLowerCase()}`;

export function payLinkStatus(l: PayLink, now: number): PayLinkStatus {
  if (l.closed) return l.closed;
  if (l.mode === "unpaid") return "unpaid";
  return new Date(l.deadline).getTime() <= now ? "expired" : "awaiting";
}

/** Set id → reason, for the sets a link keeps on `date` (awaiting → held, paid → booked). */
export function payLinkSets(
  links: readonly PayLink[],
  date: string,
  now: number,
): Record<string, { kind: "held" | "booked"; label: string }> {
  const out: Record<string, { kind: "held" | "booked"; label: string }> = {};
  for (const l of links) {
    if (l.date !== date) continue;
    const st = payLinkStatus(l, now);
    if (st !== "awaiting" && st !== "paid" && st !== "unpaid") continue;
    for (const x of l.lines)
      if (x.setId)
        out[x.setId] =
          st === "paid"
            ? { kind: "booked", label: `Booked — ${l.id}` }
            : st === "unpaid"
              ? { kind: "booked", label: `Booked — unpaid, pays on arrival (${l.guest.name})` }
              : { kind: "held", label: `Reserved — awaiting payment (${l.guest.name})` };
  }
  return out;
}

/** Deadline choices (minutes from now; 0 = end of the beach day, 20:00). */
export const DEADLINES = [
  { v: 30, l: "30 minutes" },
  { v: 120, l: "2 hours" },
  { v: 0, l: "End of day (20:00)" },
];
export function deadlineFrom(now: number, minutes: number): string {
  if (minutes > 0) return new Date(now + minutes * 60000).toISOString();
  const d = new Date(now);
  d.setHours(20, 0, 0, 0);
  // Already past 20:00 → give the guest an hour.
  return (d.getTime() > now ? d : new Date(now + 3600000)).toISOString();
}
