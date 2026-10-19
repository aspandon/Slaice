// Occupancy analysis on top of the shared per-day analytics (AENR-478).
// Everything is a deterministic function of the date range and the filters,
// so the Occupancy tab, its CSV and the rest of Reporting agree.

import { ZONES, zoneLayout } from "./beach";
import { CHANNELS, HOURLY_PROFILE, HOURS, dayStats, type Channel } from "./analytics";
import type { DateRange } from "../domain/period";
import { addDays, eachDay, fmtDay, fmtWeekday, lastYearRange, parseISO } from "../domain/period";

export type Asset = "sunbeds" | "lockers" | "parking";
export type SetKind = "standard" | "front" | "cabana";
export interface OccFilters {
  zones: string[]; // zone ids; empty = all
  asset: Asset;
  kinds: SetKind[]; // sunbed types; empty = all
  channels: Channel[]; // empty = all
  days: "all" | "weekday" | "weekend";
}
export const DEFAULT_OCC_FILTERS: OccFilters = {
  zones: [],
  asset: "sunbeds",
  kinds: [],
  channels: [],
  days: "all",
};

const LOCKERS = 120;
const PARKING = 80;
// Demand by set type relative to the zone average; share of sets per type.
const KIND_LIFT: Record<SetKind, number> = { front: 1.14, cabana: 1.06, standard: 0.96 };
const KIND_SHARE: Record<SetKind, number> = { front: 0.18, cabana: 0.07, standard: 0.75 };

const isWeekend = (iso: string) => [0, 6].includes(parseISO(iso).getDay());
const rand = (key: string) => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

interface ZoneDay {
  zoneId: string;
  date: string;
  capacity: number;
  sold: number;
  revenue: number;
  checkedIn: number;
  noShows: number;
}

/** Sold capacity for one zone on one day, after asset / type / channel filters. */
function zoneDay(zoneId: string, date: string, f: OccFilters): ZoneDay | null {
  const d = dayStats(date);
  if (!d.open) return null;
  const z = ZONES.find((x) => x.id === zoneId)!;
  const chShare = f.channels.length
    ? f.channels.reduce((a, c) => a + d.byChannel[c].bookings, 0) / Math.max(1, d.bookings)
    : 1;
  let capacity: number;
  let sold: number;
  if (f.asset === "sunbeds") {
    const kinds: SetKind[] = f.kinds.length ? f.kinds : ["standard", "front", "cabana"];
    const base = (d.setsSold[zoneId] ?? 0) / z.total;
    capacity = kinds.reduce((a, k) => a + z.total * KIND_SHARE[k], 0);
    sold = kinds.reduce(
      (a, k) => a + z.total * KIND_SHARE[k] * Math.min(0.99, base * KIND_LIFT[k]),
      0,
    );
  } else {
    // Lockers / parking are beach-wide; split them across zones by size.
    const share = z.total / ZONES.reduce((a, x) => a + x.total, 0);
    capacity = (f.asset === "lockers" ? LOCKERS : PARKING) * share;
    sold = Math.min(
      capacity * 0.99,
      (f.asset === "lockers" ? d.units.Lockers : d.units.Parking) * share,
    );
  }
  sold *= chShare;
  const price = f.asset === "sunbeds" ? z.from : f.asset === "lockers" ? 5 : 15;
  const noShows = sold * (0.028 + (rand(date + zoneId) - 0.5) * 0.012);
  return {
    zoneId,
    date,
    capacity,
    sold,
    revenue: sold * price,
    checkedIn: sold - noShows,
    noShows,
  };
}

function rows(range: DateRange, f: OccFilters): ZoneDay[] {
  const zones = f.zones.length ? f.zones : ZONES.map((z) => z.id);
  return eachDay(range)
    .filter((d) => f.days === "all" || (f.days === "weekend") === isWeekend(d))
    .flatMap((d) => zones.map((z) => zoneDay(z, d, f)).filter((x): x is ZoneDay => !!x));
}
const occOf = (rs: ZoneDay[]) => {
  const cap = rs.reduce((a, r) => a + r.capacity, 0);
  return cap ? rs.reduce((a, r) => a + r.sold, 0) / cap : 0;
};

export interface OccReport {
  avg: number;
  peak: { v: number; date: string } | null;
  soldOutDays: number;
  revpatb: number;
  adr: number;
  noShowRate: number;
  overTime: { l: string; v: number }[];
  overTimeLy: { l: string; v: number }[];
  byZone: {
    id: string;
    name: string;
    occ: number;
    sold: number;
    capacity: number;
    checkedIn: number;
    noShows: number;
    revenue: number;
    soldOut: number;
  }[];
  byHour: { l: string; v: number }[];
  weekdayHour: { day: string; cells: number[] }[];
  soldOut: { date: string; zone: string; by: string }[];
  openDays: number;
}

export function occupancyReport(
  range: DateRange,
  f: OccFilters,
  granularity: "day" | "week" | "month",
): OccReport {
  const rs = rows(range, f);
  const byDate = new Map<string, ZoneDay[]>();
  rs.forEach((r) => byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]));
  const dayOcc = [...byDate.entries()].map(([date, xs]) => ({ date, v: occOf(xs) }));
  const peak = dayOcc.reduce<{ v: number; date: string } | null>(
    (a, x) => (!a || x.v > a.v ? x : a),
    null,
  );
  const sold = rs.reduce((a, r) => a + r.sold, 0);
  const cap = rs.reduce((a, r) => a + r.capacity, 0);
  const revenue = rs.reduce((a, r) => a + r.revenue, 0);
  const noShows = rs.reduce((a, r) => a + r.noShows, 0);
  const zoneSoldOut = rs.filter((r) => r.sold / r.capacity >= 0.95);

  // Over time: bucket by the chosen granularity; last year on the same dates.
  const bucketKey = (d: string) =>
    granularity === "day"
      ? d
      : granularity === "month"
        ? d.slice(0, 7)
        : addDays(d, -((parseISO(d).getDay() + 6) % 7));
  const series = (xs: ZoneDay[]) => {
    const m = new Map<string, ZoneDay[]>();
    xs.forEach((r) => m.set(bucketKey(r.date), [...(m.get(bucketKey(r.date)) ?? []), r]));
    return [...m.entries()].sort().map(([k, v]) => ({ k, v: Math.round(occOf(v) * 100) }));
  };
  const now = series(rs);
  const lyR = lastYearRange(range);
  const ly = series(rows(lyR, f).map((r) => ({ ...r, date: addDays(r.date, 365) })));
  const lyMap = new Map(ly.map((x) => [x.k, x.v]));
  const label = (k: string) =>
    granularity === "month"
      ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
          Number(k.slice(5, 7)) - 1
        ]
      : fmtDay(k);

  // Time of day: occupancy builds up through the day (cumulative arrivals,
  // minus early leavers after 16:00).
  let cum = 0;
  const curve = HOURLY_PROFILE.map((s, i) => {
    cum += s;
    return Math.min(1, cum * 1.15) * (HOURS[i] >= 17 ? 0.9 : 1);
  });
  const avg = occOf(rs);
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const byWeekday = weekdays.map((wd) => occOf(rs.filter((r) => fmtWeekday(r.date) === wd)));

  return {
    avg,
    peak,
    soldOutDays: new Set(zoneSoldOut.map((r) => r.date)).size,
    revpatb: cap ? revenue / cap : 0,
    adr: sold ? revenue / sold : 0,
    noShowRate: sold ? noShows / sold : 0,
    overTime: now.map((x) => ({ l: label(x.k), v: x.v })),
    overTimeLy: now.map((x) => ({ l: label(x.k), v: lyMap.get(x.k) ?? 0 })),
    byZone: (f.zones.length ? ZONES.filter((z) => f.zones.includes(z.id)) : ZONES).map((z) => {
      const zr = rs.filter((r) => r.zoneId === z.id);
      return {
        id: z.id,
        name: z.name,
        occ: occOf(zr),
        sold: zr.reduce((a, r) => a + r.sold, 0),
        capacity: zr.reduce((a, r) => a + r.capacity, 0),
        checkedIn: zr.reduce((a, r) => a + r.checkedIn, 0),
        noShows: zr.reduce((a, r) => a + r.noShows, 0),
        revenue: zr.reduce((a, r) => a + r.revenue, 0),
        soldOut: zr.filter((r) => r.sold / r.capacity >= 0.95).length,
      };
    }),
    byHour: HOURS.map((h, i) => ({ l: `${h}h`, v: Math.round(avg * curve[i] * 100) })),
    weekdayHour: weekdays.map((wd, i) => ({
      day: wd,
      cells: curve.map((c) => Math.round(byWeekday[i] * c * 100)),
    })),
    soldOut: zoneSoldOut
      .sort((a, b) => b.sold / b.capacity - a.sold / a.capacity)
      .slice(0, 8)
      .map((r) => ({
        date: r.date,
        zone: ZONES.find((z) => z.id === r.zoneId)!.name,
        by: `${Math.max(10, Math.min(16, 8 + Math.round((1 - r.sold / r.capacity) * 60 + rand(r.date + r.zoneId) * 3)))}:00`,
      })),
    openDays: byDate.size,
  };
}

/** Per-set occupancy over a range — for the beach-map heatmap. Front-row sets
 *  sell best; a stable per-set jitter keeps the map from looking uniform. */
export function setHeatmap(
  range: DateRange,
  f: OccFilters,
  zoneId: string,
): { id: string; x: number; y: number; occ: number; row: number }[] {
  const z = ZONES.find((x) => x.id === zoneId)!;
  const base = occOf(rows(range, { ...f, zones: [zoneId], asset: "sunbeds", kinds: [] }));
  return zoneLayout(z).map((s) => {
    const row = Math.round((s.y - 12) / (76 / 5));
    const lift = row === 0 ? 1.14 : 1 - row * 0.035;
    return {
      id: s.id,
      x: s.x,
      y: s.y,
      row,
      occ: Math.max(0.05, Math.min(0.99, base * lift + (rand(s.id) - 0.5) * 0.16)),
    };
  });
}

/** On-the-books forecast for the 14 days after `today`: bookings already
 *  taken vs the same point last year (pickup follows the booking lead time). */
export function forecast(
  today: string,
  f: OccFilters,
): { l: string; otb: number; ly: number; date: string }[] {
  return Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i + 1);
    // Share of the final occupancy already booked: high for tomorrow, falling
    // with the days ahead (most beach bookings are made 1–3 days before).
    const booked = Math.exp(-(i + 1) / 6);
    const final = occOf(rows({ from: date, to: date }, f));
    const lyDate = lastYearRange({ from: date, to: date }).from;
    const lyFinal = occOf(rows({ from: lyDate, to: lyDate }, f));
    return {
      date,
      l: `${fmtWeekday(date)} ${parseISO(date).getDate()}`,
      otb: Math.round(final * booked * 100),
      ly: Math.round(lyFinal * booked * 0.92 * 100),
    };
  });
}

export const ALL_CHANNELS = CHANNELS;
