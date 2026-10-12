// Deterministic sample analytics, keyed by date. Every dashboard / report / KPI
// in the admin reads from here, so the same date range always shows the same
// totals on every page (Dashboard, Reporting tabs, Refunds…). A day's figures
// are a pure function of its date: season curve × weekend lift × a stable
// per-day jitter. Off-season days are closed (all zeros).

import { ZONES } from "./beach";
import type { DateRange, Granularity } from "../domain/period";
import {
  addDays,
  eachDay,
  fmtDay,
  fmtMonth,
  fmtWeekday,
  granularityFor,
  isSeasonDay,
  parseISO,
} from "../domain/period";

export const CHANNELS = ["Online", "Walk-in", "Phone", "Cashier"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CAPABILITIES = ["Sunbeds", "Tickets", "Lockers", "Parking"] as const;
export type Capability = (typeof CAPABILITIES)[number];

const TICKET_AVG = 7;
const LOCKER_PRICE = 5;
const PARKING_PRICE = 15;
const SETS_PER_BOOKING = 1.8;
/** Share of each hour in a day's activity (08:00 → 19:00). */
export const HOURLY_PROFILE = [
  0.03, 0.07, 0.12, 0.15, 0.14, 0.12, 0.1, 0.09, 0.07, 0.05, 0.04, 0.02,
];
export const HOURS = HOURLY_PROFILE.map((_, i) => 8 + i);
// Zone demand relative to the beach average (Macaw sells out first).
const ZONE_LIFT: Record<string, number> = {
  akanthus: 0.97,
  central: 1.04,
  macaw: 1.14,
  bestbuy: 1.0,
  main: 0.95,
  bolivar: 0.9,
};

/* ---------- One day ---------- */
export interface DayStats {
  date: string;
  open: boolean;
  /** Sets sold per zone id. */
  setsSold: Record<string, number>;
  setsAvailable: number;
  revenue: Record<Capability, number>;
  units: Record<Capability, number>;
  bookings: number;
  sunbedBookings: number;
  byChannel: Record<Channel, { bookings: number; revenue: number }>;
  cancellations: number;
  noShows: number;
  refunds: { count: number; amount: number };
  newGuests: number;
  returningGuests: number;
  /** Sum of booking lead times in days (avg = leadDays / bookings). */
  leadDays: number;
}

// Stable pseudo-random in [0, 1) from a string (FNV-1a → xorshift).
function rand(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  h ^= h << 13;
  h ^= h >>> 17;
  h ^= h << 5;
  return ((h >>> 0) % 100000) / 100000;
}
const jitter = (key: string, spread: number) => (rand(key) * 2 - 1) * spread;

// Demand curve across the season: shoulder months low, August peak.
const MONTH_DEMAND: Record<number, number> = { 5: 0.36, 6: 0.52, 7: 0.66, 8: 0.78, 9: 0.48 };
function demand(iso: string): number {
  const d = parseISO(iso);
  const m = d.getMonth() + 1;
  const base = MONTH_DEMAND[m] ?? 0;
  const next = MONTH_DEMAND[m + 1] ?? base;
  const days = new Date(d.getFullYear(), m, 0).getDate();
  const curve = base + (next - base) * (d.getDate() / days) * 0.5;
  const weekend = d.getDay() === 0 || d.getDay() === 6 ? 1.22 : d.getDay() === 5 ? 1.08 : 1;
  const yearLift = d.getFullYear() === 2025 ? 0.9 : 1; // last season ran ~10% lower
  return curve * weekend * yearLift * (1 + jitter(iso, 0.06));
}

const cache = new Map<string, DayStats>();
export function dayStats(iso: string): DayStats {
  const hit = cache.get(iso);
  if (hit) return hit;
  const zero = (): Record<Capability, number> => ({
    Sunbeds: 0,
    Tickets: 0,
    Lockers: 0,
    Parking: 0,
  });
  const chan = (): Record<Channel, { bookings: number; revenue: number }> => ({
    Online: { bookings: 0, revenue: 0 },
    "Walk-in": { bookings: 0, revenue: 0 },
    Phone: { bookings: 0, revenue: 0 },
    Cashier: { bookings: 0, revenue: 0 },
  });
  const setsAvailable = ZONES.reduce((a, z) => a + z.total, 0);
  const s: DayStats = {
    date: iso,
    open: false,
    setsSold: {},
    setsAvailable,
    revenue: zero(),
    units: zero(),
    bookings: 0,
    sunbedBookings: 0,
    byChannel: chan(),
    cancellations: 0,
    noShows: 0,
    refunds: { count: 0, amount: 0 },
    newGuests: 0,
    returningGuests: 0,
    leadDays: 0,
  };
  if (isSeasonDay(iso)) {
    const d = demand(iso);
    s.open = true;
    for (const z of ZONES) {
      const occ = Math.min(
        0.99,
        Math.max(0.08, d * (ZONE_LIFT[z.id] ?? 1) + jitter(iso + z.id, 0.04)),
      );
      const sold = Math.round(occ * z.total);
      s.setsSold[z.id] = sold;
      s.units.Sunbeds += sold;
      s.revenue.Sunbeds += sold * z.from;
    }
    const sunbedBookings = Math.round(s.units.Sunbeds / SETS_PER_BOOKING);
    const ticketOnly = Math.round(sunbedBookings * (0.55 + jitter(iso + "to", 0.08)));
    s.sunbedBookings = sunbedBookings;
    s.bookings = sunbedBookings + ticketOnly;
    s.units.Tickets = Math.round(s.units.Sunbeds * 1.2 + ticketOnly * 1.6);
    s.revenue.Tickets = Math.round(s.units.Tickets * TICKET_AVG);
    s.units.Lockers = Math.round(s.bookings * (0.12 + jitter(iso + "lk", 0.03)));
    s.revenue.Lockers = s.units.Lockers * LOCKER_PRICE;
    s.units.Parking = Math.round(s.bookings * (0.24 + jitter(iso + "pk", 0.04)));
    s.revenue.Parking = s.units.Parking * PARKING_PRICE;
    const total = s.revenue.Sunbeds + s.revenue.Tickets + s.revenue.Lockers + s.revenue.Parking;
    // Channel split: online grows with demand (advance booking), walk-ins fill the rest.
    const online = 0.36 + d * 0.06 + jitter(iso + "on", 0.03);
    const phone = 0.09 + jitter(iso + "ph", 0.02);
    const cashier = 0.16 + jitter(iso + "ca", 0.02);
    const shares: Record<Channel, number> = {
      Online: online,
      Phone: phone,
      Cashier: cashier,
      "Walk-in": 1 - online - phone - cashier,
    };
    let bLeft = s.bookings;
    let rLeft = total;
    CHANNELS.forEach((c, i) => {
      const last = i === CHANNELS.length - 1;
      const b = last ? bLeft : Math.round(s.bookings * shares[c]);
      const r = last ? rLeft : Math.round(total * shares[c]);
      s.byChannel[c] = { bookings: b, revenue: r };
      bLeft -= b;
      rLeft -= r;
    });
    s.cancellations = Math.round(s.bookings * (0.031 + jitter(iso + "cx", 0.008)));
    s.noShows = Math.round(s.bookings * (0.028 + jitter(iso + "ns", 0.008)));
    const refundCount = Math.round(s.bookings * (0.014 + jitter(iso + "rf", 0.005)));
    s.refunds = {
      count: refundCount,
      amount: Math.round(refundCount * (27 + jitter(iso + "ra", 6))),
    };
    s.newGuests = Math.round(s.bookings * (0.38 + jitter(iso + "ng", 0.05)));
    s.returningGuests = s.bookings - s.newGuests;
    s.leadDays = Math.round(s.bookings * (2.3 + d * 0.6 + jitter(iso + "ld", 0.3)) * 10) / 10;
  }
  cache.set(iso, s);
  return s;
}

/* ---------- A range ---------- */
export interface Summary {
  range: DateRange;
  days: number;
  openDays: number;
  revenue: number;
  byCapability: Record<Capability, number>;
  units: Record<Capability, number>;
  bookings: number;
  sunbedBookings: number;
  byChannel: Record<Channel, { bookings: number; revenue: number }>;
  /** Average occupancy across open days, 0–1. */
  /** Sunbed revenue per zone id. */
  revenueByZone: Record<string, number>;
  /** Average occupancy on weekend vs weekday open days, 0–1. */
  weekendOccupancy: number;
  weekdayOccupancy: number;
  occupancy: number;
  occupancyByZone: Record<string, number>;
  setsSold: number;
  setNights: number; // sets available × open days
  avgBasket: number;
  cancellations: number;
  noShows: number;
  refunds: { count: number; amount: number };
  newGuests: number;
  returningGuests: number;
  avgLeadDays: number;
}

export function summarize(range: DateRange): Summary {
  const days = eachDay(range).map(dayStats);
  const open = days.filter((d) => d.open);
  const sum = (f: (d: DayStats) => number) => days.reduce((a, d) => a + f(d), 0);
  const byCapability = Object.fromEntries(
    CAPABILITIES.map((c) => [c, sum((d) => d.revenue[c])]),
  ) as Record<Capability, number>;
  const units = Object.fromEntries(CAPABILITIES.map((c) => [c, sum((d) => d.units[c])])) as Record<
    Capability,
    number
  >;
  const byChannel = Object.fromEntries(
    CHANNELS.map((c) => [
      c,
      {
        bookings: sum((d) => d.byChannel[c].bookings),
        revenue: sum((d) => d.byChannel[c].revenue),
      },
    ]),
  ) as Summary["byChannel"];
  const occupancyByZone = Object.fromEntries(
    ZONES.map((z) => [
      z.id,
      open.length
        ? open.reduce((a, d) => a + (d.setsSold[z.id] ?? 0), 0) / (z.total * open.length)
        : 0,
    ]),
  );
  const revenue = CAPABILITIES.reduce((a, c) => a + byCapability[c], 0);
  const bookings = sum((d) => d.bookings);
  const setsSold = units.Sunbeds;
  const setNights = open.reduce((a, d) => a + d.setsAvailable, 0);
  const occOf = (ds: DayStats[]) => {
    const avail = ds.reduce((a, d) => a + d.setsAvailable, 0);
    return avail ? ds.reduce((a, d) => a + d.units.Sunbeds, 0) / avail : 0;
  };
  const isWeekend = (d: DayStats) => [0, 6].includes(parseISO(d.date).getDay());
  return {
    range,
    days: days.length,
    openDays: open.length,
    revenue,
    byCapability,
    units,
    bookings,
    byChannel,
    sunbedBookings: sum((d) => d.sunbedBookings),
    revenueByZone: Object.fromEntries(
      ZONES.map((z) => [z.id, open.reduce((a, d) => a + (d.setsSold[z.id] ?? 0), 0) * z.from]),
    ),
    weekendOccupancy: occOf(open.filter(isWeekend)),
    weekdayOccupancy: occOf(open.filter((d) => !isWeekend(d))),
    occupancy: setNights ? setsSold / setNights : 0,
    occupancyByZone,
    setsSold,
    setNights,
    avgBasket: bookings ? revenue / bookings : 0,
    cancellations: sum((d) => d.cancellations),
    noShows: sum((d) => d.noShows),
    refunds: { count: sum((d) => d.refunds.count), amount: sum((d) => d.refunds.amount) },
    newGuests: sum((d) => d.newGuests),
    returningGuests: sum((d) => d.returningGuests),
    avgLeadDays: bookings ? sum((d) => d.leadDays) / bookings : 0,
  };
}

/* ---------- Chart series ---------- */
export interface Bucket {
  key: string;
  label: string;
  range: DateRange;
}
/** Split a range into chart buckets of the right granularity. */
export function buckets(range: DateRange, g: Granularity = granularityFor(range)): Bucket[] {
  const days = eachDay(range);
  if (g === "hour") return HOURS.map((h) => ({ key: `h${h}`, label: `${h}h`, range }));
  if (g === "day")
    return days.map((d) => ({
      key: d,
      label: days.length <= 7 ? fmtWeekday(d) : fmtDay(d),
      range: { from: d, to: d },
    }));
  const out: Bucket[] = [];
  for (const d of days) {
    const date = parseISO(d);
    const key = g === "week" ? addDays(d, -((date.getDay() + 6) % 7)) : d.slice(0, 7);
    const last = out[out.length - 1];
    if (last && last.key === key) last.range = { from: last.range.from, to: d };
    else
      out.push({ key, label: g === "week" ? fmtDay(d) : fmtMonth(d), range: { from: d, to: d } });
  }
  return out;
}

/** One value per bucket. Hour buckets spread the range's total by the hourly profile. */
export function series(
  range: DateRange,
  pick: (s: Summary) => number,
  g: Granularity = granularityFor(range),
): { l: string; v: number; hi?: number }[] {
  const bs = buckets(range, g);
  const vals =
    g === "hour"
      ? HOURLY_PROFILE.map((share) => pick(summarize(range)) * share)
      : bs.map((b) => pick(summarize(b.range)));
  const max = Math.max(...vals, 0);
  // Highlight the peaks (top ~20%) like the original charts did.
  return bs.map((b, i) => ({
    l: b.label,
    v: Math.round(vals[i]),
    ...(max > 0 && vals[i] >= max * 0.85 ? { hi: 1 } : {}),
  }));
}

/** Percentage change, rounded; null when there's nothing to compare against. */
export function pctChange(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

/* ---------- Display helpers ---------- */
/** €842 · €12.4k · €1.21M */
export function fmtEUR(n: number): string {
  if (Math.abs(n) >= 1e6) return `€${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e4) return `€${(n / 1e3).toFixed(1)}k`;
  return `€${Math.round(n).toLocaleString("en-GB")}`;
}
export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-GB");
export const fmtPct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;
/** "+12%" / "−4%" for a relative change; undefined when not comparable. */
export function trendPct(now: number, before: number): string | undefined {
  const p = pctChange(now, before);
  return p === null ? undefined : `${p >= 0 ? "+" : "−"}${Math.abs(p)}%`;
}
/** "+3pp" for a change in a 0–1 ratio. */
export function trendPp(now: number, before: number, hasBefore: boolean): string | undefined {
  if (!hasBefore) return undefined;
  const d = Math.round((now - before) * 100);
  return `${d >= 0 ? "+" : "−"}${Math.abs(d)}pp`;
}
/** "+€2" for an absolute change in euros. */
export function trendEUR(now: number, before: number, hasBefore: boolean): string | undefined {
  if (!hasBefore) return undefined;
  const d = Math.round(now - before);
  return `${d >= 0 ? "+" : "−"}€${Math.abs(d)}`;
}
