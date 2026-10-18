// The signed-in guest's account on this device (AENR-532 / 524): guest mode
// (browsing without an account), a saved card and the bookings they placed.
// The basket's service fee comes from the tenant's commercial terms (AENR-725).

import { guestFees, type CommercialTerms } from "./economics";
import type { CartItem } from "./types";
import { DEFAULT_SELF_SERVICE, type CancelRecord, type SelfService } from "./visits";
import type { InvoiceDetails } from "./invoiceDetails";

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
  /** Paid with "I need an invoice" on (AENR-714): who the invoice (ΤΠΥ) is made out to. */
  invoiceTo?: { company: string; vatNo: string; email: string };
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
  /** The full details when given at Pay or in the request form (AENR-714). */
  details?: InvoiceDetails;
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
  /** Single-use rewards already taken off a booking (AENR-619), by scheme id. */
  rewardsUsed: string[];
  /** The 18+ confirmation, asked once at the first booking (AENR-489 / 622). */
  adultConfirmed: boolean;
  /** Invoice details kept for next time (AENR-714); null until the guest saves them. */
  invoiceDetails?: InvoiceDetails | null;
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
  rewardsUsed: [],
  adultConfirmed: false,
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

/** What checkout takes off the all-in total, in order: the earned reward, the season pass's entry,
 *  VIP credit (€B of credit at a `discount` settles B/(1−discount) of the order), then beach credit
 *  (refunds as credit, released days — AENR-577/578). `fullDue` is what the card pays. */
export function settleCheckout(
  total: number,
  o: { rewardOff: number; seasonCovered: number; vip: { balance: number; discount: number } | null; credit: number },
) {
  const afterSeason = r2(Math.max(0, total - o.rewardOff - o.seasonCovered));
  const vipCover = o.vip ? Math.min(afterSeason, r2(o.vip.balance / (1 - o.vip.discount))) : 0; // order value the credit settles
  const vipDebit = r2(vipCover * (1 - (o.vip?.discount ?? 0))); // charged to the balance
  const vipSaved = r2(vipCover - vipDebit);
  const afterPasses = r2(afterSeason - vipCover);
  const creditUsed = r2(Math.min(o.credit, afterPasses));
  return { vipCover, vipDebit, vipSaved, creditUsed, fullDue: r2(afterPasses - creditUsed) };
}

/** The service fee the guest pays on top of the beach prices (per set, per entry ticket… from the
 *  tenant's commercial terms), per basket line and as the one "Service fee" line checkout shows. */
export function serviceFees(cart: readonly CartItem[], terms: CommercialTerms) {
  const { perItem, total } = guestFees(cart, terms, cartKey);
  return { perItem, lines: total > 0 ? [{ label: "Service fee", amount: total }] : [], total };
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
