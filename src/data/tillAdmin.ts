// Till sales and refunds as Admin rows (AENR-497 / AENR-506): sunbed sales show
// in Admin › Bookings with channel Cashier, till refunds and voids in Admin ›
// Refunds. The back office runs on the demo business day, so till rows carry
// that date label.

import { ZONES } from "./beach";
import { DEMO_TODAY, fmtDay } from "../domain/period";
import { refundedTotal, saleStatus, type TillSale } from "../domain/till";
import type { AdminBooking, AdminRefund } from "./mock";
import type { PayLink } from "../domain/payLink";
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

/** Paid pay-by-link reservations as Admin bookings (AENR-534), channel Pay-by-link. */
export function payLinkBookings(links: readonly PayLink[]): AdminBooking[] {
  return links
    .filter((l) => l.closed === "paid")
    .map((l) => ({
      id: `#${l.id}`,
      who: l.guest.name.split(" ")[0],
      items: l.lines.map((x) => (x.setId ? `Sunbed · ${zoneName(x.zoneId)} · ${x.setId}` : `Entry · ${x.label} ×${x.qty}`)),
      date: fmtDay(l.date),
      channel: "Pay-by-link",
      status: "Confirmed",
      amount: l.total,
    }));
}

/** Bookings placed online in the customer wizard on this device (AENR-532/524) — one row, every store's sets. */
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
