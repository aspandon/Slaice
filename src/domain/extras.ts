// Entry tickets and lockers (AENR-529 / 530 / 531): the tenant's ticket
// categories and locker banks, their prices by period and weekday / weekend,
// and the locker provider's live availability (simulated). One source of
// truth for the wizard, the till, the walk-in sale and pay-by-link.

import { dayMatches } from "./pricing";
import type { PriceRuleDays } from "./types";

export interface TicketCat {
  id: string;
  name: string;
  /** Short label for buttons and receipts. */
  short: string;
  /** Eligibility note shown to guests and staff (e.g. proof at the gate). */
  note?: string;
  active: boolean;
  order: number;
  /** Base €/person. */
  price: number;
}
export interface LockerBank {
  id: string;
  name: string;
  size: "Standard" | "Large" | "Premium";
  price: number;
  /** Lockers in the bank. */
  total: number;
  active: boolean;
}
/** A price for some categories / banks over a period (range, chosen days or a month) and weekdays / weekends. */
export interface ExtraRule {
  id: string;
  target: "ticket" | "locker";
  ids: string[];
  from: string;
  to: string;
  /** Specific days instead of the whole range. */
  dates?: string[];
  days: PriceRuleDays;
  price: number;
  label: string;
}
export interface LockerProvider {
  name: string;
  connected: boolean;
  /** Demo outage: the provider isn't answering — locker sales pause. */
  outage: boolean;
  lastSync: string;
  /** `${bankId}|${date}` → available count reported by the provider (overrides the sample feed). */
  reported: Record<string, number>;
}
export interface ExtrasState {
  tickets: TicketCat[];
  lockers: LockerBank[];
  rules: ExtraRule[];
  provider: LockerProvider;
  /** `${bankId}|${date}` → lockers sold through Slaice (the provider's count drops with them). */
  sold: Record<string, number>;
}

export const DEFAULT_EXTRAS: ExtrasState = {
  tickets: [
    {
      id: "adult",
      name: "Normal (13+)",
      short: "Normal",
      note: "Standard entry, above 13 years",
      active: true,
      order: 1,
      price: 10,
    },
    {
      id: "amea",
      // ΑμεΑ = Άτομα με Αναπηρία (persons with disabilities) — the Greek term guests know (AENR-552).
      name: "ΑμεΑ (persons with disabilities)",
      short: "ΑμεΑ",
      note: "Persons with disabilities — proof required at the gate",
      active: true,
      order: 2,
      price: 0,
    },
    {
      id: "resident",
      name: "Alimos resident",
      short: "Resident",
      note: "Proof of residence required at the gate",
      active: true,
      order: 3,
      price: 6,
    },
    {
      id: "child",
      name: "Child (6–12)",
      short: "Child",
      note: "Under 6 free",
      active: true,
      order: 4,
      price: 5,
    },
    {
      id: "senior",
      name: "Senior 65+",
      short: "Senior 65+",
      note: "ID required",
      active: true,
      order: 5,
      price: 7,
    },
  ],
  lockers: [
    { id: "A", name: "Bank A · Entrance", size: "Standard", price: 5, total: 40, active: true },
    { id: "B", name: "Bank B · Beach bar", size: "Large", price: 7, total: 16, active: true },
    { id: "C", name: "Bank C · Showers", size: "Premium", price: 9, total: 8, active: true },
  ],
  rules: [],
  provider: {
    name: "LockerLink",
    connected: true,
    outage: false,
    lastSync: "2026-10-12T09:00:00",
    reported: {},
  },
  sold: {},
};

const pickRule = (
  rules: readonly ExtraRule[],
  target: ExtraRule["target"],
  id: string,
  date: string,
) => {
  let hit: ExtraRule | undefined;
  for (const r of rules) {
    if (r.target !== target || !r.ids.includes(id)) continue;
    if (r.dates?.length ? !r.dates.includes(date) : date < r.from || date > r.to) continue;
    if (!dayMatches(r.days, new Date(`${date}T00:00:00`))) continue;
    hit = r; // later rules win
  }
  return hit;
};

/** A ticket category's price on a date: the last matching rule, else the base price. */
export function ticketPrice(
  s: Pick<ExtrasState, "tickets" | "rules">,
  catId: string,
  date: string,
): { price: number; rule?: ExtraRule } {
  const rule = pickRule(s.rules, "ticket", catId, date);
  return { price: rule ? rule.price : (s.tickets.find((t) => t.id === catId)?.price ?? 0), rule };
}
export function lockerPrice(
  s: Pick<ExtrasState, "lockers" | "rules">,
  bankId: string,
  date: string,
): { price: number; rule?: ExtraRule } {
  const rule = pickRule(s.rules, "locker", bankId, date);
  return { price: rule ? rule.price : (s.lockers.find((l) => l.id === bankId)?.price ?? 0), rule };
}

/** Sample provider feed: most lockers free, a few already rented elsewhere (deterministic per date). */
function feed(bank: LockerBank, date: string): number {
  let h = 7;
  for (const c of bank.id + date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Math.max(0, bank.total - (h % Math.max(2, Math.round(bank.total * 0.4))));
}
/** Lockers available in a bank on a date, or null while the provider is offline (sales paused). */
export function lockerAvail(s: ExtrasState, bankId: string, date: string): number | null {
  if (!s.provider.connected || s.provider.outage) return null;
  const bank = s.lockers.find((l) => l.id === bankId);
  if (!bank || !bank.active) return 0;
  const k = `${bankId}|${date}`;
  const base = s.provider.reported[k] ?? feed(bank, date);
  return Math.max(0, base - (s.sold[k] ?? 0));
}

export const activeTickets = (s: Pick<ExtrasState, "tickets">) =>
  [...s.tickets].filter((t) => t.active).sort((a, b) => a.order - b.order);
