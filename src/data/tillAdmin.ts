// Till sales and refunds as Admin rows (AENR-497 / AENR-506): sunbed sales show
// in Admin › Bookings with channel Cashier, till refunds and voids in Admin ›
// Refunds. The back office runs on the demo business day, so till rows carry
// that date label.

import { ZONES } from "./beach";
import { DEMO_TODAY, fmtDay } from "../domain/period";
import { refundedTotal, saleStatus, type TillSale } from "../domain/till";
import type { AdminBooking, AdminRefund } from "./mock";
import { payLinkStatus, type PayLink, type PayLinkStatus } from "../domain/payLink";
import type { PlacedBooking } from "../domain/account";

const zoneName = (id?: string) => ZONES.find((z) => z.id === id)?.name ?? "";
const first = (s: TillSale) => s.customer?.name.split(" ")[0] ?? "Walk-in";
const STATUS: Record<string, string> = {
  Completed: "Confirmed",
  "Part refunded": "Confirmed",
  Refunded: "Refunded",
  Voided: "Cancelled",
};

export function tillBookings(sales: readonly TillSale[]): AdminBooking[] {
  return sales
    .filter((s) => s.lines.some((l) => l.setId))
    .map((s) => ({
      id: `#${s.id}`,
      who: first(s),
      items: s.lines.map((l) =>
        l.setId ? `Sunbed · ${zoneName(l.zoneId)} · ${l.setId}` : `Entry · ${l.label} ×${l.qty}`,
      ),
      date: fmtDay(DEMO_TODAY),
      // On-the-beach sales by the Controller / Support Agent are walk-ins (AENR-528).
      channel: s.channel && s.channel !== "cashier" ? "Walk-in" : "Cashier",
      status: STATUS[saleStatus(s)],
      amount: s.total,
    }));
}

export function tillRefunds(sales: readonly TillSale[]): AdminRefund[] {
  return sales
    .filter((s) => s.refunds.length)
    .map((s) => {
      const last = s.refunds[s.refunds.length - 1];
      return {
        tx: `#${s.id}`,
        who: first(s),
        amount: s.total,
        refundAmount: refundedTotal(s),
        reason: [...new Set(s.refunds.map((r) => r.reason))].join(", "),
        status: saleStatus(s) === "Voided" ? "Voided" : "Refunded",
        date: fmtDay(DEMO_TODAY),
        channel: "Cashier",
        approver: last.approver,
      };
    });
}

const LINK_STATUS: Record<PayLinkStatus, string> = {
  awaiting: "Awaiting payment",
  unpaid: "Unpaid",
  paid: "Confirmed",
  expired: "Expired",
  cancelled: "Cancelled",
};
const payMethodOf = (l: PayLink, st: PayLinkStatus) =>
  l.mode === "card"
    ? "Card on the phone (simulated terminal)"
    : l.mode === "unpaid"
      ? st === "paid"
        ? "Paid on arrival"
        : "Pay on arrival (cash or card at the till)"
      : st === "paid"
        ? "Card via payment link (Stripe)"
        : st === "expired"
          ? "Payment link expired — not paid, sets released"
          : st === "cancelled"
            ? "Payment link cancelled — not charged"
            : "Payment link sent — not paid yet";

/** Staff bookings — phone, call center, admin, pay-by-link (AENR-534/559) — as
    Admin bookings, every state: awaiting a link, unpaid, paid, expired, cancelled. */
export function staffBookings(links: readonly PayLink[], now: number): AdminBooking[] {
  return links.map((l) => {
    const st = payLinkStatus(l, now);
    return {
      id: `#${l.id}`,
      who: l.guest.name.split(" ")[0],
      items: l.lines.filter((x) => !x.fee).map((x) => (x.setId ? `Sunbed · ${zoneName(x.zoneId)} · ${x.setId}` : `Entry · ${x.label} ×${x.qty}`)),
      date: fmtDay(l.date),
      channel: l.channel ?? "Pay-by-link",
      status: LINK_STATUS[st],
      amount: l.total,
      payMethod: payMethodOf(l, st),
    };
  });
}

/** Bookings placed online in the customer wizard on this device (AENR-532/524) — one row, every zone's sets. */
export function onlineBookings(list: readonly PlacedBooking[]): AdminBooking[] {
  return list.map((b) => {
    const dates = [...new Set(b.items.map((i) => i.date).filter(Boolean))] as string[];
    return {
      id: `#${b.ref}`,
      who: b.guest.first,
      items: b.items.map((i) => (i.kind === "sunbed" && i.setId ? `Sunbed · ${zoneName(i.zoneId)} · ${i.setId}` : `${i.label}`)),
      date: dates.length ? fmtDay(dates[0]) : fmtDay(DEMO_TODAY),
      channel: "Online",
      status: "Confirmed",
      amount: b.total,
    };
  });
}
