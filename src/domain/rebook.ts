// "Rebook your usual" (AENR-611 / 705): turn the guest's usual booking into a
// concrete proposal — a day, the sets, the party and the extras — that is
// actually free and bookable, and price it exactly like the booking wizard's
// all-in total, so the number on the Home tile is the number Pay shows.
// Pure: availability, closures and prices come in through `RebookEnv` /
// `RebookPrices`, wired by `useRebook` from the same sources the wizard uses.

import type { CartItem } from "./types";
import type { UsualBooking } from "./visits";
import { addDays } from "./period";

/** What the Home tile hands the wizard: the usual, resolved to the exact plan to open on Pay. */
export interface RebookHint extends UsualBooking {
  /** The proposed day; the wizard opens on it when the sets are still free. */
  date?: string;
}

/** Why the first day the guest could go doesn't work. */
export type RebookMiss = "closed" | "stopSell" | "soldOut" | "restricted";

export interface RebookEnv {
  /** First day to consider (the demo's today). */
  start: string;
  /** Days to look ahead for the next one that works. */
  horizon: number;
  /** A day the guest can't be offered at all (off-season, already booked there). */
  skip: (iso: string) => boolean;
  /** Why the zone can't be booked online that day (closure, booking rules, stop-sell), or null. */
  block: (iso: string) => { kind: Exclude<RebookMiss, "soldOut">; label: string } | null;
  /** The zone's free sets that day, in layout order. */
  free: (iso: string) => readonly { id: string }[];
  /** Lockers the provider still has that day (null = unknown → assume enough). */
  lockersLeft: (iso: string) => number | null;
}

export type RebookPlan =
  | {
      status: "ok";
      /** The day the guest would naturally go; `date` differs when that one doesn't work. */
      wanted: string;
      date: string;
      miss?: { kind: RebookMiss; label: string };
      setIds: string[];
      /** How many of those are sets they had before. */
      usualKept: number;
      party: Record<string, number>;
      lockers: number;
      parking: number;
    }
  | { status: "none"; wanted: string | null; miss?: { kind: RebookMiss; label: string } };

/** The first day from `start` the usual can be booked as-is: enough free sets in the zone, favourites first. */
export function planRebook(
  u: UsualBooking,
  env: RebookEnv,
  fallbackParty: Record<string, number>,
): RebookPlan {
  let wanted: string | null = null;
  let miss: { kind: RebookMiss; label: string } | undefined;
  for (let i = 0; i < env.horizon; i++) {
    const iso = addDays(env.start, i);
    if (env.skip(iso)) continue;
    wanted ??= iso;
    const blocked = env.block(iso);
    const free = blocked ? [] : env.free(iso);
    if (blocked || free.length < u.sets) {
      if (iso === wanted) miss = blocked ?? { kind: "soldOut", label: "sold out" };
      continue;
    }
    // The sets they had before when they're free (most-booked first), then the next free ones.
    const fav = u.setIds.filter((id) => free.some((x) => x.id === id));
    const rest = free.filter((x) => !fav.includes(x.id)).map((x) => x.id);
    const setIds = [...fav, ...rest].slice(0, u.sets);
    const left = env.lockersLeft(iso);
    return {
      status: "ok",
      wanted,
      date: iso,
      miss: iso === wanted ? undefined : miss,
      setIds,
      usualKept: setIds.filter((id) => fav.includes(id)).length,
      party: u.party && Object.keys(u.party).length ? u.party : fallbackParty,
      lockers: left == null ? u.lockers : Math.min(u.lockers, Math.max(0, left)),
      parking: u.parking,
    };
  }
  return { status: "none", wanted, miss };
}

export interface RebookPrices {
  /** A set's price that day (resolved with the booking context, as the wizard does). */
  set: (id: string, iso: string) => number;
  /** Active ticket categories, in display order — switched-off ones drop out. */
  ticketCats: readonly string[];
  ticket: (catId: string, iso: string) => number;
  locker: (iso: string) => number;
  parking: number;
  /** Customer service fees for these basket lines. */
  fees: (items: CartItem[]) => number;
}

export interface RebookQuote {
  /** The basket lines the wizard will add (labels are placeholders; kinds, ids and prices match). */
  items: CartItem[];
  goods: number;
  fees: number;
  /** All-in: what checkout charges before rewards, passes or credit. */
  total: number;
}

/** Price an ok plan the way the wizard builds its basket: one line per set, ticket kind, locker and spot. */
export function quoteRebook(
  p: Extract<RebookPlan, { status: "ok" }>,
  zoneId: string,
  prices: RebookPrices,
): RebookQuote {
  const iso = p.date;
  const items: CartItem[] = [
    ...p.setIds.map(
      (id): CartItem => ({
        kind: "sunbed",
        id: `${id}@${iso}`,
        label: id,
        sub: "",
        price: prices.set(id, iso),
        setId: id,
        zoneId,
        date: iso,
      }),
    ),
    ...prices.ticketCats
      .filter((k) => (p.party[k] ?? 0) > 0)
      .map(
        (k): CartItem => ({
          kind: "ticket",
          id: `${k}@${iso}`,
          label: k,
          sub: "",
          price: p.party[k] * prices.ticket(k, iso),
          qty: p.party[k],
          date: iso,
        }),
      ),
    ...Array.from(
      { length: p.lockers },
      (_, i): CartItem => ({
        kind: "locker",
        id: `LK-${i + 1}@${iso}`,
        label: "locker",
        sub: "",
        price: prices.locker(iso),
      }),
    ),
    ...Array.from(
      { length: p.parking },
      (_, i): CartItem => ({
        kind: "parking",
        id: `P${i + 1}@${iso}`,
        label: "parking",
        sub: "",
        price: prices.parking,
      }),
    ),
  ];
  const goods = items.reduce((a, i) => a + i.price, 0);
  const fees = goods > 0 ? prices.fees(items) : 0;
  return { items, goods, fees, total: Math.round((goods + fees) * 100) / 100 };
}

/** Headcount of a party. */
export const partySize = (party: Record<string, number>) =>
  Object.values(party).reduce((a, n) => a + n, 0);
