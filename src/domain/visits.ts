// A guest's beach days (AENR-541). Customers think in visits — "Saturday at
// Central, two sunbeds, tickets and parking" — not in line items, so every
// customer screen (Home, My bookings, receipts, Wallet) reads bookings through
// this one model: the account's sample history plus bookings placed on this
// device, grouped by date, with the guest's self-service changes (cancel,
// move, add extras, release a day) applied. The tenant's guest policy
// (cancellation window, refund, release credit) lives here too.

import type { CartItem, CustomerBooking } from "./types";
import type { PlacedBooking } from "./account";
import { SEASON_START, addDays, isSeasonDay, isoFromDayMonth } from "./period";

/* ---------- Guest policy (AENR-569 / 574 / 578) ---------- */
export interface GuestPolicy {
  /** Free cancellation until this many hours before the visit day opens. */
  cancelHours: number;
  /** Refund inside the window, % of the paid total. */
  refundPct: number;
  /** Refund after the window closes, % (0 = no refund). */
  lateRefundPct: number;
  /** Pass holders can release a reserved day until this many hours before opening. */
  releaseHours: number;
  /** Credit to the pass holder when a released set resells, % of its price. */
  releaseCreditPct: number;
}
export const DEFAULT_POLICY: GuestPolicy = {
  cancelHours: 24,
  refundPct: 100,
  lateRefundPct: 0,
  releaseHours: 12,
  releaseCreditPct: 50,
};
/** The beach opens at 09:00; the gate expects guests until the no-show cut-off. */
export const OPENS = "09:00";
export const ARRIVAL_WINDOW = "09:00 – 11:00";

const WK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

/** The last moment (YYYY-MM-DDTHH:mm) a visit can be cancelled for the full refund. */
export function cancelDeadline(visitIso: string, p: Pick<GuestPolicy, "cancelHours">): string {
  return hoursBefore(visitIso, p.cancelHours);
}
/** The last moment a pass holder can release a day. */
export function releaseDeadline(visitIso: string, p: Pick<GuestPolicy, "releaseHours">): string {
  return hoursBefore(visitIso, p.releaseHours);
}
function hoursBefore(visitIso: string, hours: number): string {
  const [h, m] = OPENS.split(":").map(Number);
  const mins = h * 60 + m - Math.round(hours * 60);
  const days = Math.floor(mins / 1440);
  const rest = mins - days * 1440;
  return `${addDays(visitIso, days)}T${pad(Math.floor(rest / 60))}:${pad(rest % 60)}`;
}
/** "Sat 18 Jul, 09:00" — the one way a deadline is written for guests. */
export function fmtDeadline(at: string): string {
  const d = new Date(`${at.slice(0, 10)}T12:00:00`);
  return `${WK[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}, ${at.slice(11, 16)}`;
}
/** The guest-facing cancellation line for a visit, honest when the window has passed. */
export function cancelLine(visitIso: string, now: string, p: GuestPolicy): string {
  const d = cancelDeadline(visitIso, p);
  if (now < d) return `Free cancellation until ${fmtDeadline(d)}`;
  return p.lateRefundPct > 0
    ? `${p.lateRefundPct}% refund if you cancel`
    : "This booking can’t be refunded";
}
/** What cancelling now gives back. */
export function refundQuote(total: number, visitIso: string, now: string, p: GuestPolicy) {
  const inWindow = now < cancelDeadline(visitIso, p);
  const pct = inWindow ? p.refundPct : p.lateRefundPct;
  return { inWindow, pct, refund: Math.round(total * pct) / 100 };
}

/* ---------- Visits ---------- */
export type VisitStatus = "today" | "upcoming" | "used" | "cancelled";
export interface VisitLine {
  ref: string;
  kind: "sunbed" | "ticket" | "parking" | "locker";
  label: string;
  amount: number;
}
export interface Visit {
  /** Stable id: the first booking ref + the original date. */
  key: string;
  refs: string[];
  /** ISO date (after any move). */
  date: string;
  movedFrom?: string;
  zone: string;
  sets: string[];
  tickets: string[];
  parking: string[];
  lockers: string[];
  lines: VisitLine[];
  total: number;
  status: VisitStatus;
  /** Booked on this device (its sets are live inventory) or the account's history. */
  source: "placed" | "history";
  cancelled?: CancelRecord;
}
export interface CancelRecord {
  at: string;
  refund: number;
  to: "card" | "credit";
  /** The booking refs it cancels (the admin Bookings follow them). */
  refs?: string[];
}

/** The guest's own changes, persisted with the account. */
export interface SelfService {
  cancelled: Record<string, CancelRecord>;
  /** visit key → new ISO date */
  moved: Record<string, string>;
  /** visit key → extras added after booking */
  added: Record<string, VisitLine[]>;
}
export const DEFAULT_SELF_SERVICE: SelfService = { cancelled: {}, moved: {}, added: {} };

const kindOf = (item: string): VisitLine["kind"] =>
  item.startsWith("Sunbed")
    ? "sunbed"
    : item.startsWith("Parking")
      ? "parking"
      : item.toLowerCase().includes("locker")
        ? "locker"
        : "ticket";

/** The account's history (sample bookings), one visit per date. */
export function historyVisits(rows: readonly CustomerBooking[]): Visit[] {
  const byDate = new Map<string, CustomerBooking[]>();
  for (const r of rows) {
    const iso = isoFromDayMonth(r.date);
    if (!iso) continue;
    byDate.set(iso, [...(byDate.get(iso) ?? []), r]);
  }
  return [...byDate.entries()].map(([date, rs]) => {
    const short = (item: string) => item.split(" · ").slice(1).join(" · ") || item;
    // Receipt lines say what the item is ("Locker A07", "Sunbed CE-89 · Central").
    const full = (item: string) =>
      item
        .replace(/^Sunbed · ([^·]+) · (.+)$/, "Sunbed $2 · $1")
        .replace(/^Entry · /, "Entry ")
        .replace(/^Parking · Spot /, "Parking ")
        .replace(/^Day Locker · /i, "Locker ");
    const lines: VisitLine[] = rs.map((r) => ({
      ref: r.id,
      kind: kindOf(r.item),
      label: full(r.item),
      amount: r.price,
    }));
    const sun = rs.filter((r) => kindOf(r.item) === "sunbed").map((r) => r.item.split(" · "));
    return {
      key: `${rs[0].id}@${date}`,
      refs: rs.map((r) => r.id),
      date,
      zone: [...new Set(sun.map((p) => p[1]))].join(" · "),
      sets: sun.map((p) => p[2]).filter(Boolean),
      tickets: rs.filter((r) => kindOf(r.item) === "ticket").map((r) => short(r.item)),
      parking: rs
        .filter((r) => kindOf(r.item) === "parking")
        .map((r) => short(r.item).replace(/^Spot /, "")),
      lockers: rs.filter((r) => kindOf(r.item) === "locker").map((r) => short(r.item)),
      lines,
      total: lines.reduce((a, l) => a + l.amount, 0),
      status: rs.every((r) => r.status === "Used") ? "used" : "upcoming",
      source: "history" as const,
    };
  });
}

/** Bookings placed on this device, one visit per booking and date. */
export function placedVisits(
  bookings: readonly PlacedBooking[],
  zoneName: (id?: string) => string,
): Visit[] {
  return bookings.flatMap((b) => {
    const dates = [...new Set(b.items.map((i) => i.date).filter(Boolean))] as string[];
    const feeShare = (d: string) => {
      const sub = b.items.reduce((a, i) => a + i.price, 0);
      const day = b.items.filter((i) => i.date === d).reduce((a, i) => a + i.price, 0);
      return sub ? Math.round(((b.total - sub) * day) / sub) : 0;
    };
    return dates.map((date) => {
      const items = b.items.filter((i) => i.date === date || (!i.date && date === dates[0]));
      const lines: VisitLine[] = items.map((i: CartItem) => ({
        ref: `#${b.ref}`,
        kind: i.kind,
        label: i.label,
        amount: i.price,
      }));
      const fee = feeShare(date);
      if (fee) lines.push({ ref: `#${b.ref}`, kind: "ticket", label: "Service fee", amount: fee });
      const c = b.cancelledDates?.[date];
      return {
        key: `${b.ref}@${date}`,
        refs: [`#${b.ref}`],
        date,
        zone: [
          ...new Set(items.filter((i) => i.kind === "sunbed").map((i) => zoneName(i.zoneId))),
        ].join(" · "),
        sets: items.filter((i) => i.kind === "sunbed" && i.setId).map((i) => i.setId as string),
        tickets: items.filter((i) => i.kind === "ticket").map((i) => i.label),
        parking: items.filter((i) => i.kind === "parking").map((i) => i.label),
        lockers: items.filter((i) => i.kind === "locker").map((i) => i.label),
        lines,
        total: lines.reduce((a, l) => a + l.amount, 0),
        status: "upcoming" as VisitStatus,
        source: "placed" as const,
        cancelled: c,
      };
    });
  });
}

/** Apply the guest's changes and today's date; newest-relevant first (today, upcoming, then past). */
export function resolveVisits(visits: readonly Visit[], ss: SelfService, today: string): Visit[] {
  const out = visits.map((v) => {
    const moved = ss.moved[v.key];
    const added = ss.added[v.key] ?? [];
    const cancelled = v.cancelled ?? ss.cancelled[v.key];
    const date = moved ?? v.date;
    const lines = [...v.lines, ...added];
    const status: VisitStatus = cancelled
      ? "cancelled"
      : v.status === "used" || date < today
        ? "used"
        : date === today
          ? "today"
          : "upcoming";
    return {
      ...v,
      date,
      movedFrom: moved ? v.date : undefined,
      lines,
      tickets: [...v.tickets, ...added.filter((l) => l.kind === "ticket").map((l) => l.label)],
      parking: [...v.parking, ...added.filter((l) => l.kind === "parking").map((l) => l.label)],
      lockers: [...v.lockers, ...added.filter((l) => l.kind === "locker").map((l) => l.label)],
      total: lines.reduce((a, l) => a + l.amount, 0),
      status,
      cancelled,
    };
  });
  const rank: Record<VisitStatus, number> = { today: 0, upcoming: 1, used: 2, cancelled: 3 };
  return out.sort((a, b) =>
    rank[a.status] !== rank[b.status]
      ? rank[a.status] - rank[b.status]
      : a.status === "upcoming"
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date),
  );
}

/** The next visit the guest will make (today first). */
export const nextVisit = (visits: readonly Visit[]) =>
  visits.find((v) => v.status === "today" || v.status === "upcoming") ?? null;

/** The guest's usual booking (AENR-611 / 705) — the most common pattern in their own visits: their
 *  most-booked zone, the number of sets they book most often, those sets ranked by how often they had
 *  them, the party that usually came and the lockers / parking spots that usually came along. A tie
 *  always goes to the latest visit. */
export interface UsualBooking {
  zone: string;
  sets: number;
  /** Their sets in that zone, most-booked first. */
  setIds: string[];
  lockers: number;
  parking: number;
  /** Entry tickets per category id (e.g. { adult: 2, child: 1 }) when the visits say who came. */
  party?: Record<string, number>;
}
/** A ticket category as the party parser needs it. */
export interface PartyCat { id: string; name: string; short: string }

/** "Adult ×2 + Child" / "Normal (13+) × 2" → { adult: 2, child: 1 }; names it can't place are skipped. */
export function partyFromTickets(lines: readonly string[], cats: readonly PartyCat[]): Record<string, number> {
  const out: Record<string, number> = {};
  const norm = (x: string) => x.toLowerCase().replace(/\s+/g, " ").trim();
  const catOf = (name: string) => {
    const n = norm(name);
    return (
      cats.find((c) => [c.id, c.name, c.short].some((k) => norm(k) === n)) ??
      cats.find((c) => n.startsWith(norm(c.id)) || n.startsWith(norm(c.short)))
    );
  };
  for (const line of lines)
    for (const part of line.split(/\s\+\s|,/)) {
      const m = /^(.*?)\s*[×x]\s*(\d+)\s*$/.exec(part.trim());
      const c = catOf(m ? m[1] : part);
      if (c) out[c.id] = (out[c.id] ?? 0) + (m ? Number(m[2]) : 1);
    }
  return out;
}

/** The most frequent value; a tie goes to the one seen first (callers pass the latest first). */
function mode<T>(values: readonly T[], key: (v: T) => string = String): T | undefined {
  const seen = new Map<string, { v: T; c: number; i: number }>();
  values.forEach((v, i) => {
    const e = seen.get(key(v));
    if (e) e.c++;
    else seen.set(key(v), { v, c: 1, i });
  });
  return [...seen.values()].sort((a, b) => b.c - a.c || a.i - b.i)[0]?.v;
}

export function usual(visits: readonly Visit[], cats: readonly PartyCat[] = []): UsualBooking | null {
  const live = visits
    .filter((v) => v.zone && v.status !== "cancelled")
    .sort((a, b) => b.date.localeCompare(a.date));
  const zone = mode(live.map((v) => v.zone));
  if (!zone) return null;
  const withZone = live.filter((v) => v.zone === zone && v.sets.length);
  // Sets ranked by how often they were booked here, the latest visit's first on a tie.
  const rank = new Map<string, { c: number; i: number }>();
  withZone.forEach((v, i) =>
    v.sets.forEach((id) => {
      const e = rank.get(id);
      if (e) e.c++;
      else rank.set(id, { c: 1, i });
    }),
  );
  const setIds = [...rank.entries()].sort((a, b) => b[1].c - a[1].c || a[1].i - b[1].i).map(([id]) => id);
  const parties = withZone.map((v) => partyFromTickets(v.tickets, cats)).filter((p) => Object.keys(p).length > 0);
  const party = mode(parties, (p) => JSON.stringify(Object.entries(p).sort()));
  return {
    zone,
    sets: Math.max(1, mode(withZone.map((v) => v.sets.length)) ?? 1),
    setIds,
    lockers: mode(withZone.map((v) => v.lockers.length)) ?? 0,
    parking: mode(withZone.map((v) => v.parking.length)) ?? 0,
    ...(party ? { party } : {}),
  };
}

/* ---------- Home follows the moment (AENR-610) ---------- */
/** When the arrival window closes and when the beach day is over (local time). */
export const ARRIVAL_ENDS = "11:00";
export const DAY_ENDS = "19:00";
export type MomentKind = "morning" | "during" | "after" | "upcoming" | "offseason" | "none";
export type HomeMoment =
  | { kind: "morning" | "during" | "after" | "upcoming"; v: Visit }
  | { kind: "offseason"; opens: string }
  | { kind: "none" };
/** What Home leads with: the QR on the morning of a visit, extras during it, the receipt and
 *  "Book again" after it, next season's opening off-season — otherwise the next visit.
 *  `force` previews a moment (demo); it falls back when there is no visit to show it with. */
export function homeMoment(visits: readonly Visit[], date: string, time: string, force?: MomentKind): HomeMoment {
  const live = visits.filter((v) => v.status === "today" || v.status === "upcoming");
  const today = live.find((v) => v.date === date);
  const next = [...live].filter((v) => v.date > date).sort((a, b) => a.date.localeCompare(b.date))[0];
  const recent = [...visits]
    .filter((v) => v.status !== "cancelled" && v.date < date && v.date >= addDays(date, -2))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const opens = () => {
    const y = Number(date.slice(0, 4));
    const start = `${y}-${String(SEASON_START.month).padStart(2, "0")}-${String(SEASON_START.day).padStart(2, "0")}`;
    return date < start ? start : `${y + 1}${start.slice(4)}`;
  };
  if (force === "offseason") return { kind: "offseason", opens: opens() };
  const shown = today ?? next;
  if ((force === "morning" || force === "during" || force === "upcoming") && shown) return { kind: force, v: shown };
  if (force === "after" && (recent ?? today ?? next)) return { kind: "after", v: (recent ?? today ?? next) as Visit };
  if (!isSeasonDay(date) && !live.length) return { kind: "offseason", opens: opens() };
  if (today) return { kind: time < ARRIVAL_ENDS ? "morning" : time < DAY_ENDS ? "during" : "after", v: today };
  // Just back from the beach — unless the next visit is tomorrow, which matters more.
  if (recent && !(next && next.date <= addDays(date, 1))) return { kind: "after", v: recent };
  return next ? { kind: "upcoming", v: next } : { kind: "none" };
}

/** What a VIP pass would have saved the guest this season (AENR-576): discount × sunbed spend. */
export function vipSavings(visits: readonly Visit[], discount: number): number {
  const spend = visits
    .filter((v) => v.status !== "cancelled")
    .flatMap((v) => v.lines)
    .filter((l) => l.kind === "sunbed")
    .reduce((a, l) => a + l.amount, 0);
  return Math.round(spend * discount);
}
/** Visits needed per season to make a season pass worth it. */
export function seasonBreakEven(visits: readonly Visit[], seasonPrice: number) {
  const done = visits.filter((v) => v.status !== "cancelled" && v.sets.length);
  const perVisit = done.length
    ? done.reduce(
        (a, v) => a + v.lines.filter((l) => l.kind === "sunbed").reduce((x, l) => x + l.amount, 0),
        0,
      ) / done.length
    : 25;
  return {
    visits: done.length,
    perVisit: Math.round(perVisit),
    breakEven: Math.ceil(seasonPrice / Math.max(1, perVisit)),
  };
}
