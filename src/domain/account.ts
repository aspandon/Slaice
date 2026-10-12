// The signed-in guest's account on this device (AENR-532 / 524): guest mode
// (browsing without an account), a saved card and the bookings they placed.
// Service fees for the basket come from the tenant's customer fee lines.

import type { FeeLine } from "./finance";
import type { CartItem } from "./types";

export interface SavedCard {
  brand: string;
  last4: string;
  exp: string;
}
export interface PlacedBooking {
  ref: string;
  at: string;
  items: CartItem[];
  fees: { label: string; amount: number }[];
  total: number;
  guest: { first: string; last: string; email: string; phone: string };
  card?: string;
}
export interface AccountState {
  /** Browsing without an account — checkout asks to sign in first. */
  guest: boolean;
  savedCard: SavedCard | null;
  bookings: PlacedBooking[];
}
export const DEFAULT_ACCOUNT: AccountState = { guest: false, savedCard: null, bookings: [] };
/** The demo guest's profile. */
export const PROFILE = {
  first: "Elena",
  last: "Vlachos",
  email: "elena.vlachos@example.com",
  phone: "+30 694 100 0003",
};

const r2 = (n: number) => Math.round(n * 100) / 100;
export const cartKey = (i: Pick<CartItem, "kind" | "id">) => `${i.kind}:${i.id}`;

/** Service fees the guest pays on top of the beach prices, per item and as totals. */
export function serviceFees(cart: readonly CartItem[], fees: readonly FeeLine[], today: string) {
  const lines = fees.filter((f) => f.active && f.payer === "customer" && f.from <= today);
  const perItem: Record<string, number> = {};
  const totals: { label: string; amount: number }[] = [];
  const goods = cart.reduce((a, i) => a + i.price, 0);
  for (const f of lines) {
    let sum = 0;
    if (f.basis === "perOnlineSet" || f.basis === "perEntryPerson") {
      for (const i of cart) {
        const units =
          f.basis === "perOnlineSet"
            ? i.kind === "sunbed"
              ? 1
              : 0
            : i.kind === "ticket"
              ? (i.qty ?? 1)
              : 0;
        if (!units) continue;
        const v = r2(units * f.amount);
        perItem[cartKey(i)] = r2((perItem[cartKey(i)] ?? 0) + v);
        sum += v;
      }
    } else if (cart.length) {
      sum = f.basis === "fixedBooking" ? f.amount : (goods * f.amount) / 100;
    }
    if (sum > 0) totals.push({ label: f.name, amount: r2(sum) });
  }
  return { perItem, lines: totals, total: r2(totals.reduce((a, t) => a + t.amount, 0)) };
}

/** Sets a placed booking holds on a date — they show as booked on every map. */
export function bookedSets(bookings: readonly PlacedBooking[], date: string): Set<string> {
  return new Set(
    bookings.flatMap((b) =>
      b.items
        .filter((i) => i.kind === "sunbed" && i.date === date && i.setId)
        .map((i) => i.setId as string),
    ),
  );
}
