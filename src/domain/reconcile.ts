// Reconciliation between the headline tiles and the finance block (AENR-545).
// The Revenue and Bookings tiles count every product and every payment method;
// the "Bookings, payments & AADE" block counts confirmed sunbed sets and card
// captures. Both come from the same generator, so the parts below add up
// exactly to the tile figures and the card part equals the block's
// "Captured" figure for the whole beach.

import type { Summary } from "../data/analytics";
import type { FinanceReport } from "../data/finance";

export interface Reconciliation {
  revenue: number;
  /** Card captures (online, phone and card at the till) — the finance block's "Captured". */
  card: number;
  /** Cash, POS terminals outside Stripe and other methods. */
  other: number;
  bookings: number;
  sunbedBookings: number;
  /** Confirmed sunbed sets — the finance block's "Sunbed bookings". */
  sets: number;
  ticketOnly: number;
}

export function reconcile(s: Summary, whole: FinanceReport): Reconciliation {
  const card = Math.min(whole.total.captured, s.revenue);
  return {
    revenue: s.revenue,
    card,
    other: s.revenue - card,
    bookings: s.bookings,
    sunbedBookings: s.sunbedBookings,
    sets: whole.total.sets,
    ticketOnly: s.bookings - s.sunbedBookings,
  };
}
