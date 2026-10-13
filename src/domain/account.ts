// The signed-in guest's account on this device (AENR-532 / 524): guest mode
// (browsing without an account), a saved card and the bookings they placed.
// Service fees for the basket come from the tenant's customer fee lines.

import type { FeeLine } from "./finance";
import type { CartItem } from "./types";
import { DEFAULT_SELF_SERVICE, type CancelRecord, type SelfService } from "./visits";

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
  /** How it was paid (AENR-574): card, Apple Pay, Google Pay; deposit = the part paid online. */
  method?: "card" | "apple" | "google";
  deposit?: number;
  /** Days the guest cancelled (AENR-572) — their sets are back on sale. */
  cancelledDates?: Record<string, CancelRecord>;
}
/** A day a season pass holder gave back (AENR-578). */
export interface ReleasedDay {
  date: string;
  setId: string;
  zoneId: string;
  price: number;
  at: string;
  /** Set once the set sold again — the credit the guest earned. */
  resold?: { at: string; credit: number };
}
/** An invoice with VAT details the guest asked for (AENR-573). */
export interface InvoiceRequest {
  id: string;
  visitKey: string;
  company: string;
  vatNo: string;
  address: string;
  amount: number;
  at: string;
}
export interface AccountState {
  /** Browsing without an account — checkout asks to sign in first. */
  guest: boolean;
  savedCard: SavedCard | null;
  bookings: PlacedBooking[];
  /** The guest's changes to their visits (AENR-572). */
  selfService: SelfService;
  /** Beach credit — refunds taken as credit, released-day earnings (AENR-572 / 578). */
  credit: { balance: number; log: { at: string; text: string; amount: number }[] };
  released: ReleasedDay[];
  invoices: InvoiceRequest[];
  /** Visits added to a phone wallet (AENR-620): visit key → which wallet. */
  wallet: Record<string, WalletKind>;
  /** Who usually comes (AENR-613): the last party booked, by entry-ticket category; null until the first booking. */
  party: Record<string, number> | null;
}
export type WalletKind = "apple" | "google";
export const DEFAULT_ACCOUNT: AccountState = {
  guest: false,
  savedCard: null,
  bookings: [],
  selfService: DEFAULT_SELF_SERVICE,
  credit: { balance: 0, log: [] },
  released: [],
  invoices: [],
  wallet: {},
  party: null,
};
/** "You + 1 adult + 2 children" — the party in words (the guest is the first adult). */
export function partyLabel(party: Record<string, number>, names: Record<string, string> = {}, t: (s: string) => string = (s) => s): string {
  const NOUN: Record<string, [string, string]> = { adult: ["adult", "adults"], child: ["child", "children"], resident: ["resident", "residents"], senior: ["senior", "seniors"] };
  const parts: string[] = [];
  const adults = party.adult ?? 0;
  if (adults > 0) parts.push(t("You"));
  for (const [k, n0] of Object.entries(party)) {
    const n = k === "adult" ? n0 - 1 : n0;
    if (n <= 0) continue;
    const [one, many] = NOUN[k] ?? [names[k] ?? k, names[k] ?? k];
    parts.push(`${n} ${t(n === 1 ? one : many)}`);
  }
  return parts.join(" + ") || t("Nobody yet");
}
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
        .filter((i) => i.kind === "sunbed" && i.date === date && i.setId && !b.cancelledDates?.[date])
        .map((i) => i.setId as string),
    ),
  );
}
