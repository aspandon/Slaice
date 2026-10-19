// Per-channel performance (AENR-479), derived from the shared per-day
// analytics so channel revenue and bookings reconcile with every other report.
// Channel behaviour (basket size, lead time, cancellations, fees…) uses fixed
// profiles typical of each channel.

import { CHANNELS, HOURS, dayStats, type Channel } from "./analytics";
import type { DateRange } from "../domain/period";
import { addDays, eachDay, fmtDay, fmtMonth, fmtWeekday, parseISO } from "../domain/period";

interface Profile {
  items: number; // items per booking
  lead: number; // days booked ahead
  cancel: number;
  refund: number; // share of revenue refunded
  noShow: number;
  newShare: number;
  fee: number; // payment + platform fees as a share of revenue
  mix: [number, number, number, number]; // sunbeds, tickets, lockers, parking
  role: string;
  staff: { name: string; share: number }[];
  hours: number[]; // share of bookings per hour 08–19
}
const P: Record<Channel, Profile> = {
  Online: {
    items: 1.9,
    lead: 3.1,
    cancel: 0.038,
    refund: 0.014,
    noShow: 0.034,
    newShare: 0.42,
    fee: 0.0715,
    mix: [0.66, 0.24, 0.02, 0.08],
    role: "customer, self-service",
    staff: [],
    hours: [0.05, 0.07, 0.08, 0.08, 0.08, 0.07, 0.07, 0.08, 0.1, 0.11, 0.11, 0.1],
  },
  "Walk-in": {
    items: 1.4,
    lead: 0,
    cancel: 0.004,
    refund: 0.003,
    noShow: 0,
    newShare: 0.46,
    fee: 0.014,
    mix: [0.55, 0.37, 0.02, 0.06],
    role: "controller at the gate",
    staff: [
      { name: "Petros N.", share: 0.62 },
      { name: "Nikos P.", share: 0.38 },
    ],
    hours: [0.08, 0.16, 0.19, 0.17, 0.13, 0.1, 0.07, 0.05, 0.03, 0.01, 0.01, 0],
  },
  Phone: {
    items: 1.7,
    lead: 2.2,
    cancel: 0.029,
    refund: 0.011,
    noShow: 0.041,
    newShare: 0.18,
    fee: 0.004,
    mix: [0.72, 0.18, 0.01, 0.09],
    role: "call centre",
    staff: [
      { name: "Maria K.", share: 0.71 },
      { name: "Sofia L.", share: 0.29 },
    ],
    hours: [0.04, 0.12, 0.16, 0.15, 0.12, 0.1, 0.09, 0.08, 0.07, 0.04, 0.02, 0.01],
  },
  Cashier: {
    items: 1.3,
    lead: 0,
    cancel: 0.006,
    refund: 0.004,
    noShow: 0,
    newShare: 0.4,
    fee: 0.0098,
    mix: [0.3, 0.62, 0.03, 0.05],
    role: "cashier on site",
    staff: [
      { name: "Kostas L.", share: 0.47 },
      { name: "Eleni S.", share: 0.33 },
      { name: "Maria T.", share: 0.2 },
    ],
    hours: [0.09, 0.15, 0.17, 0.15, 0.12, 0.1, 0.08, 0.06, 0.04, 0.02, 0.01, 0.01],
  },
};
export const CHANNEL_COLORS: Record<Channel, string> = {
  Online: "#0ea5e9",
  "Walk-in": "#f59e0b",
  Phone: "#6366f1",
  Cashier: "#0D9488",
};
export const CHANNEL_ROLE: Record<Channel, string> = Object.fromEntries(
  CHANNELS.map((c) => [c, P[c].role]),
) as Record<Channel, string>;

export interface ChannelStats {
  channel: Channel;
  revenue: number;
  bookings: number;
  share: number; // of revenue
  avgBasket: number;
  itemsPerBooking: number;
  leadDays: number;
  cancelRate: number;
  refundRate: number;
  noShowRate: number;
  newShare: number;
  fees: number;
  net: number;
  mix: { l: string; v: number }[];
  staff: { name: string; bookings: number; revenue: number }[];
}

export function channelStats(range: DateRange): ChannelStats[] {
  const days = eachDay(range).map(dayStats);
  const total = days.reduce(
    (a, d) => a + CHANNELS.reduce((b, c) => b + d.byChannel[c].revenue, 0),
    0,
  );
  return CHANNELS.map((c) => {
    const p = P[c];
    const revenue = days.reduce((a, d) => a + d.byChannel[c].revenue, 0);
    const bookings = days.reduce((a, d) => a + d.byChannel[c].bookings, 0);
    const fees = revenue * p.fee;
    const labels = ["Sunbeds", "Tickets", "Lockers", "Parking"];
    return {
      channel: c,
      revenue,
      bookings,
      share: total ? revenue / total : 0,
      avgBasket: bookings ? revenue / bookings : 0,
      itemsPerBooking: p.items,
      leadDays: p.lead,
      cancelRate: p.cancel,
      refundRate: p.refund,
      noShowRate: p.noShow,
      newShare: p.newShare,
      fees,
      net: revenue - fees - revenue * p.refund,
      mix: p.mix.map((v, i) => ({ l: labels[i], v: Math.round(v * 100) })),
      staff: p.staff.map((s) => ({
        name: s.name,
        bookings: Math.round(bookings * s.share),
        revenue: Math.round(revenue * s.share),
      })),
    };
  });
}

/** Revenue per channel per time bucket (day / week / month). */
export function channelTrend(
  range: DateRange,
  g: "day" | "week" | "month",
): { labels: string[]; series: Record<Channel, number[]> } {
  const key = (d: string) =>
    g === "day" ? d : g === "month" ? d.slice(0, 7) : addDays(d, -((parseISO(d).getDay() + 6) % 7));
  const order: string[] = [];
  const acc = new Map<string, Record<Channel, number>>();
  for (const d of eachDay(range)) {
    const k = key(d);
    if (!acc.has(k)) {
      order.push(k);
      acc.set(k, { Online: 0, "Walk-in": 0, Phone: 0, Cashier: 0 });
    }
    const s = dayStats(d);
    const row = acc.get(k)!;
    CHANNELS.forEach((c) => {
      row[c] += s.byChannel[c].revenue;
    });
  }
  return {
    labels: order.map((k) =>
      g === "month"
        ? fmtMonth(`${k}-01`)
        : g === "day" && order.length <= 7
          ? fmtWeekday(k)
          : fmtDay(k),
    ),
    series: Object.fromEntries(
      CHANNELS.map((c) => [c, order.map((k) => Math.round(acc.get(k)![c]))]),
    ) as Record<Channel, number[]>,
  };
}

/** When each channel sells: bookings by hour and by weekday. */
export function channelPatterns(range: DateRange): {
  hours: string[];
  byHour: Record<Channel, number[]>;
  weekdays: string[];
  byWeekday: Record<Channel, number[]>;
} {
  const days = eachDay(range).map(dayStats);
  const wds = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const byWeekday = Object.fromEntries(
    CHANNELS.map((c) => [
      c,
      wds.map((w) =>
        days
          .filter((d) => fmtWeekday(d.date) === w)
          .reduce((a, d) => a + d.byChannel[c].bookings, 0),
      ),
    ]),
  ) as Record<Channel, number[]>;
  const totals = Object.fromEntries(
    CHANNELS.map((c) => [c, days.reduce((a, d) => a + d.byChannel[c].bookings, 0)]),
  ) as Record<Channel, number>;
  const byHour = Object.fromEntries(
    CHANNELS.map((c) => [c, P[c].hours.map((h) => Math.round(totals[c] * h))]),
  ) as Record<Channel, number[]>;
  return { hours: HOURS.map((h) => `${h}h`), byHour, weekdays: wds, byWeekday };
}

/** Online funnel (sample conversion rates): visits → plan started → checkout → paid. */
export function onlineFunnel(range: DateRange): { l: string; v: number }[] {
  const paid = eachDay(range).reduce((a, d) => a + dayStats(d).byChannel.Online.bookings, 0);
  const checkout = Math.round(paid / 0.71);
  const started = Math.round(checkout / 0.42);
  const visits = Math.round(started / 0.31);
  return [
    { l: "Visits", v: visits },
    { l: "Plan started", v: started },
    { l: "Checkout", v: checkout },
    { l: "Paid", v: paid },
  ];
}
