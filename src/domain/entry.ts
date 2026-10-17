// Gate entry allowance (AENR-715). A booking lets a group in on a day: its
// sunbed sets — each in a zone, seating a few people — and its entry tickets
// by category. The QR is the booking's and the whole group shares it: every
// scan is one arrival that uses part of the allowance (tickets, and seats on a
// set), until nothing is left and the gate refuses the code. Pure functions;
// the arrivals ledger lives in the app store (bookingOps.arrivals).
//
// Who counts as a person: with entry tickets on the booking, every person who
// comes in uses one ticket (seats only say where they sit — a person may take
// none); a booking of sets without tickets admits one person per seat.

import { partyFromTickets, type PartyCat } from "./visits";
import { fmtDay, fmtWeekday } from "./period";

/* ---------- The allowance ---------- */
/** A sunbed set the booking holds on the day. */
export interface EntrySet {
  setId: string;
  zoneId: string;
  /** Zone name, e.g. "Akanthus". */
  zone: string;
  /** People the set seats (the layout's `cap`, default 2). */
  seats: number;
}
/** Entry tickets of one category. */
export interface EntryTickets {
  cat: string;
  label: string;
  qty: number;
}
export interface Allowance {
  sets: EntrySet[];
  tickets: EntryTickets[];
}

/** One line of a booking as the gate reads it; parking and lockers don't pass the gate. */
export type EntryLine =
  | { kind: "set"; setId: string; zoneId: string }
  | { kind: "tickets"; cat: string; qty: number };

export interface AllowanceCtx {
  zoneName: (zoneId: string) => string;
  seatsOf: (zoneId: string, setId: string) => number;
  ticketLabel: (cat: string) => string;
}

/** Lines → allowance: each set once, tickets summed per category (in the order first seen). */
export function buildAllowance(lines: readonly EntryLine[], ctx: AllowanceCtx): Allowance {
  const sets: EntrySet[] = [];
  const tickets: EntryTickets[] = [];
  for (const l of lines) {
    if (l.kind === "set") {
      if (!sets.some((s) => s.setId === l.setId))
        sets.push({
          setId: l.setId,
          zoneId: l.zoneId,
          zone: ctx.zoneName(l.zoneId),
          seats: Math.max(1, ctx.seatsOf(l.zoneId, l.setId)),
        });
    } else if (l.qty > 0) {
      const t = tickets.find((x) => x.cat === l.cat);
      if (t) t.qty += l.qty;
      else tickets.push({ cat: l.cat, label: ctx.ticketLabel(l.cat), qty: l.qty });
    }
  }
  return { sets, tickets };
}

/** The back office's item text — "Sunbed · Central · CE-12", "Entry · Normal ×2 + Child" — as lines. */
export function linesFromText(
  items: readonly string[],
  cats: readonly PartyCat[],
  zoneIdOf: (name: string) => string | undefined,
): EntryLine[] {
  const out: EntryLine[] = [];
  for (const it of items) {
    const parts = it.split(" · ");
    if (parts[0] === "Sunbed" && parts[2]) {
      const zoneId = zoneIdOf(parts[1]);
      if (zoneId) out.push({ kind: "set", setId: parts[2], zoneId });
    } else if (parts[0] === "Entry" && parts[1]) {
      for (const [cat, qty] of Object.entries(partyFromTickets([parts.slice(1).join(" · ")], cats)))
        out.push({ kind: "tickets", cat, qty });
    }
  }
  return out;
}

export const isEmpty = (a: Allowance) => a.sets.length === 0 && a.tickets.every((t) => t.qty <= 0);

/* ---------- Codes ---------- */
/** "BK-30001", "bk30001", "#BK-30001 " → "#BK-30001": one spelling for every lookup. */
export function normRef(raw: string): string {
  const c = raw.trim().toUpperCase().replace(/\s+/g, "").replace(/^#/, "");
  const m = /^([A-Z]{1,3})-?(\d+)$/.exec(c);
  return `#${m ? `${m[1]}-${m[2]}` : c}`;
}
/** What the QR carries: the booking reference without the "#" (the same pattern everywhere). */
export const qrCode = (ref: string) => normRef(ref).slice(1);
/** The ledger key of a booking on a day. */
export const entryKey = (ref: string, date: string) => `${normRef(ref)}|${date}`;

/* ---------- Arrivals ---------- */
/** One group through the gate. */
export interface Arrival {
  id: string;
  /** YYYY-MM-DDTHH:mm on the demo calendar. */
  at: string;
  by: string;
  gate: string;
  /** Tickets used now, by category. */
  tickets: Record<string, number>;
  /** People seated now, by set. */
  seats: Record<string, number>;
  /** Sets this arrival checked in (booked → occupied) — Undo books them again. */
  checkedIn: string[];
}
/** `entryKey(ref, date)` → arrivals, oldest first. */
export type ArrivalLedger = Record<string, Arrival[]>;

const total = (r: Record<string, number>) => Object.values(r).reduce((a, n) => a + n, 0);

export interface SetUse extends EntrySet {
  /** People seated here so far. */
  taken: number;
  free: number;
}
export interface TicketUse extends EntryTickets {
  used: number;
  left: number;
}
export interface EntryState {
  sets: SetUse[];
  tickets: TicketUse[];
  /** People are counted in entry tickets; a booking of sets only counts seats. */
  byTickets: boolean;
  /** People the booking admits in all. */
  total: number;
  entered: number;
  left: number;
  /** Nothing left to admit — the gate refuses the code from now on. */
  usedUp: boolean;
  arrivals: readonly Arrival[];
}

/** People in an arrival (or a draft). */
export const peopleOf = (a: Pick<Arrival, "tickets" | "seats">, byTickets: boolean) =>
  byTickets ? total(a.tickets) : total(a.seats);

/** What is used and what is left, after the arrivals so far. */
export function entryState(al: Allowance, arrivals: readonly Arrival[]): EntryState {
  const byTickets = al.tickets.some((t) => t.qty > 0);
  const tickets = al.tickets.map((t) => {
    const used = arrivals.reduce((a, x) => a + (x.tickets[t.cat] ?? 0), 0);
    return { ...t, used, left: Math.max(0, t.qty - used) };
  });
  const sets = al.sets.map((s) => {
    const taken = arrivals.reduce((a, x) => a + (x.seats[s.setId] ?? 0), 0);
    return { ...s, taken, free: Math.max(0, s.seats - taken) };
  });
  const all = byTickets
    ? tickets.reduce((a, t) => a + t.qty, 0)
    : sets.reduce((a, s) => a + s.seats, 0);
  const left = byTickets
    ? tickets.reduce((a, t) => a + t.left, 0)
    : sets.reduce((a, s) => a + s.free, 0);
  return {
    sets,
    tickets,
    byTickets,
    total: all,
    entered: all - left,
    left,
    usedUp: all > 0 && left === 0,
    arrivals,
  };
}

/** What the controller says this arrival uses. */
export interface ArrivalDraft {
  tickets: Record<string, number>;
  seats: Record<string, number>;
}
export type DraftIssue =
  | { kind: "empty" }
  | { kind: "tickets"; cat: string; left: number }
  | { kind: "seats"; setId: string; free: number }
  | { kind: "seated"; people: number; seated: number };

/** Why a draft can't be recorded, or null when it can. */
export function draftIssue(s: EntryState, d: ArrivalDraft): DraftIssue | null {
  for (const t of s.tickets) {
    const n = d.tickets[t.cat] ?? 0;
    if (n < 0 || n > t.left) return { kind: "tickets", cat: t.cat, left: t.left };
  }
  for (const set of s.sets) {
    const n = d.seats[set.setId] ?? 0;
    if (n < 0 || n > set.free) return { kind: "seats", setId: set.setId, free: set.free };
  }
  const people = peopleOf(d, s.byTickets);
  if (people <= 0) return { kind: "empty" };
  const seated = total(d.seats);
  if (s.byTickets && seated > people) return { kind: "seated", people, seated };
  return null;
}

/** Seats for `people`: sets the group already uses first (they sit together), then the rest in order. */
export function suggestSeats(s: EntryState, people: number): Record<string, number> {
  const seats: Record<string, number> = {};
  let rest = Math.max(0, people);
  const order = [...s.sets].sort((a, b) => Number(b.taken > 0) - Number(a.taken > 0));
  for (const set of order) {
    const n = Math.min(rest, set.free);
    if (n > 0) {
      seats[set.setId] = n;
      rest -= n;
    }
  }
  return seats;
}

/** A first guess for `people` coming in: tickets from the first categories with some left, then seats. */
export function suggestDraft(s: EntryState, people: number): ArrivalDraft {
  const n = Math.max(0, Math.min(people, s.left));
  const tickets: Record<string, number> = {};
  if (s.byTickets) {
    let rest = n;
    for (const t of s.tickets) {
      const k = Math.min(rest, t.left);
      if (k > 0) {
        tickets[t.cat] = k;
        rest -= k;
      }
    }
  }
  return { tickets, seats: suggestSeats(s, n) };
}

const positive = (r: Record<string, number>) =>
  Object.fromEntries(Object.entries(r).filter(([, n]) => n > 0));

/** The arrival a valid draft records. `occupied` = sets already checked in on the beach (no change for them). */
export function makeArrival(
  d: ArrivalDraft,
  meta: Pick<Arrival, "id" | "at" | "by" | "gate">,
  occupied: (setId: string) => boolean,
): Arrival {
  const seats = positive(d.seats);
  return {
    ...meta,
    tickets: positive(d.tickets),
    seats,
    checkedIn: Object.keys(seats).filter((id) => !occupied(id)),
  };
}

/* ---------- The gate's decision ---------- */
export type Refusal = "cancelled" | "refunded" | "expired" | "early" | "past" | "empty";
export type GateVerdict =
  | { kind: "admit"; state: EntryState }
  | { kind: "used_up"; state: EntryState }
  | { kind: "refused"; why: Refusal; text: string };

const dayLabel = (iso: string) => `${fmtWeekday(iso)} ${fmtDay(iso)}`;

/** Whether the code opens the gate today, and with what left. Unpaid bookings follow their own rule
 *  (they pay on arrival — the caller shows what is due); everything else here refuses or admits. */
export function gateVerdict(
  b: { status: string; days: readonly string[] },
  today: string,
  al: Allowance,
  arrivals: readonly Arrival[],
): GateVerdict {
  if (b.status === "Cancelled")
    return { kind: "refused", why: "cancelled", text: "Booking cancelled" };
  if (b.status === "Refunded")
    return { kind: "refused", why: "refunded", text: "Booking refunded" };
  if (b.status === "Expired")
    return {
      kind: "refused",
      why: "expired",
      text: "Payment link expired — never paid, sets released",
    };
  if (!b.days.includes(today)) {
    const next = [...b.days].sort().find((d) => d > today);
    if (next)
      return { kind: "refused", why: "early", text: `Valid on ${dayLabel(next)}, not today` };
    const last = [...b.days].sort().pop();
    return {
      kind: "refused",
      why: "past",
      text: last ? `This booking was for ${dayLabel(last)}` : "Not valid today",
    };
  }
  if (isEmpty(al))
    return { kind: "refused", why: "empty", text: "No sets or entry tickets on this booking" };
  const state = entryState(al, arrivals);
  return state.usedUp ? { kind: "used_up", state } : { kind: "admit", state };
}

/* ---------- Words (staff-facing) ---------- */
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "1 Normal + 2 Child" */
export function ticketsPhrase(tickets: Record<string, number>, al: Allowance): string {
  return Object.entries(tickets)
    .filter(([, n]) => n > 0)
    .map(([cat, n]) => `${n} ${al.tickets.find((t) => t.cat === cat)?.label ?? cat}`)
    .join(" + ");
}
/** "AK-12 (Akanthus) · BO-07 ×2 (Bolivar)" */
export function seatsPhrase(seats: Record<string, number>, al: Allowance): string {
  return Object.entries(seats)
    .filter(([, n]) => n > 0)
    .map(
      ([id, n]) =>
        `${id}${n > 1 ? ` ×${n}` : ""} (${al.sets.find((s) => s.setId === id)?.zone ?? "?"})`,
    )
    .join(" · ");
}
/** "1 Normal · AK-12 (Akanthus)" — what an arrival used. */
export function arrivalPhrase(a: Pick<Arrival, "tickets" | "seats">, al: Allowance): string {
  const byTickets = al.tickets.some((t) => t.qty > 0);
  const who = byTickets ? ticketsPhrase(a.tickets, al) : plural(total(a.seats), "person", "people");
  const where = seatsPhrase(a.seats, al);
  return [who, where || (al.sets.length ? "no set" : "")].filter(Boolean).join(" · ");
}
/** "4 entry tickets · 2 sets (Akanthus AK-12, Bolivar BO-07)" */
export function allowancePhrase(al: Allowance): string {
  const n = al.tickets.reduce((a, t) => a + t.qty, 0);
  const sets = al.sets.map((s) => `${s.zone} ${s.setId}`).join(", ");
  return [
    n ? plural(n, "entry ticket") : "",
    al.sets.length ? `${plural(al.sets.length, "set")} (${sets})` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
