// Online bookings behind Slaice's figures (AENR-725 / 689). Commission has a
// minimum per booking, so it can't be worked out from day totals: each sample
// day's online bookings become a booking mix — how many bookings hold 1, 2, 3
// or 4 sets, and the tickets, lockers and parking that come with them — taken
// from the same per-zone figures as Reporting › Payments (sampleDay), so units
// and fees reconcile. The guest's real demo bookings join exactly. The mix is
// terms-independent and cached; the commercial terms are applied on top
// (domain/economics), so a change on the Platform shows at once everywhere.
//
// Other tenants have no sample data of their own: they follow the demo beach's
// pattern scaled by their season GMV, from their go-live date.

import { ZONES } from "./beach";
import { dayStats, summarize } from "./analytics";
import { ENTRY_SECTION, sampleDay } from "./finance";
import { DEMO_TODAY, addDays, type DateRange } from "../domain/period";
import { LOCKER_PRICE, PARKING_PRICE } from "../domain/pricing";
import { planVersion, type Plan } from "../domain/plans";
import type { PlacedBooking } from "../domain/account";
import type { PayLink } from "../domain/payLink";
import type { Invoice, TenantRecord } from "../domain/tenants";
import {
  MONTH_ABBR,
  cartParts,
  emptyInput,
  mergeParts,
  monthStatement,
  termsOf,
  type EconInput,
  type FeeChannel,
  type MonthStatement,
  type WeightedPart,
} from "../domain/economics";

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Sets per online sunbed booking (mean 1.8, as in the analytics generator). */
const SET_MIX: [number, number][] = [
  [1, 0.45],
  [2, 0.35],
  [3, 0.15],
  [4, 0.05],
];
const SETS_PER_BOOKING = 1.8;
/** Entry tickets bought with each set (analytics: 1.2 per set). */
const TICKETS_PER_SET = 1.2;
/** Tickets per ticket-only online booking (mean 1.6). */
const TICKET_ONLY_MIX: [number, number][] = [
  [1, 0.5],
  [2, 0.4],
  [3, 0.1],
];
const TICKETS_PER_TICKET_BOOKING = 1.6;

const dayCache = new Map<string, Record<string, EconInput>>();
/** One arrival day's online bookings per section (zone), as a booking mix. */
export function onlineDay(iso: string): Record<string, EconInput> {
  const hit = dayCache.get(iso);
  if (hit) return hit;
  const s = dayStats(iso);
  const out: Record<string, EconInput> = {};
  if (s.open && s.units.Sunbeds > 0) {
    const sd = sampleDay(iso);
    const onlineShare = s.bookings ? s.byChannel.Online.bookings / s.bookings : 0;
    const ticketPrice = s.units.Tickets ? s.revenue.Tickets / s.units.Tickets : 7;
    for (const z of ZONES) {
      const v = sd[z.id];
      if (!v) continue;
      const share = (s.setsSold[z.id] ?? 0) / s.units.Sunbeds;
      const sunbedBookings = v.onlineSets / SETS_PER_BOOKING;
      const parts: WeightedPart[] = [];
      for (const [k, w] of SET_MIX) {
        const count = sunbedBookings * w;
        parts.push({ service: "sunbeds", units: k, gross: k * z.from, count });
        const tk = k * TICKETS_PER_SET;
        parts.push({ service: "tickets", units: tk, gross: r2(tk * ticketPrice), count });
      }
      // Online tickets beyond those bought with sets are ticket-only bookings.
      const ticketOnly =
        Math.max(0, v.entryPersons - v.onlineSets * TICKETS_PER_SET) / TICKETS_PER_TICKET_BOOKING;
      for (const [k, w] of TICKET_ONLY_MIX)
        parts.push({
          service: "tickets",
          units: k,
          gross: r2(k * ticketPrice),
          count: ticketOnly * w,
        });
      parts.push({
        service: "lockers",
        units: 1,
        gross: LOCKER_PRICE,
        count: s.units.Lockers * share * onlineShare,
      });
      parts.push({
        service: "parking",
        units: 1,
        gross: PARKING_PRICE,
        count: s.units.Parking * share * onlineShare,
      });
      out[z.id] = {
        bookings: sunbedBookings + ticketOnly,
        parts: parts.filter((p) => p.count > 0),
      };
    }
  }
  dayCache.set(iso, out);
  return out;
}

/** The day a basket line is for (lockers and parking carry it in the id: `P1@2026-07-20`). */
export const dayOfItem = (i: { date?: string; id: string }) => i.date ?? i.id.split("@")[1] ?? "";

/** Phone bookings (taken by staff, paid by card or link) per online booking that day — the sample's phone share. */
const phoneCache = new Map<string, number>();
function phonePerOnline(iso: string): number {
  const hit = phoneCache.get(iso);
  if (hit !== undefined) return hit;
  const s = dayStats(iso);
  const v = s.byChannel.Online.bookings ? s.byChannel.Phone.bookings / s.byChannel.Online.bookings : 0;
  phoneCache.set(iso, v);
  return v;
}

const rangeCache = new Map<string, EconInput>();
/** The sample's bookings over a range for the channels that carry commission (AENR-728): online, and
 *  phone bookings priced the same way (the day's online mix scaled to its phone volume). */
function sampleRange(range: DateRange, section: string | null, channels: Record<FeeChannel, boolean>): EconInput {
  const key = `${range.from}|${range.to}|${section ?? ""}|${channels.online ? 1 : 0}${channels.phone ? 1 : 0}`;
  const hit = rangeCache.get(key);
  if (hit) return hit;
  const merged = new Map<string, WeightedPart>();
  let bookings = 0;
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    const k = (channels.online ? 1 : 0) + (channels.phone ? phonePerOnline(d) : 0);
    if (!k) continue;
    for (const [sec, inp] of Object.entries(onlineDay(d))) {
      if (section && sec !== section) continue;
      bookings += inp.bookings * k;
      for (const p of inp.parts) {
        const key = `${p.service}|${p.units}|${p.gross}`;
        const cur = merged.get(key);
        if (cur) cur.count += p.count * k;
        else merged.set(key, { ...p, count: p.count * k });
      }
    }
  }
  const out = { bookings, parts: [...merged.values()] };
  if (rangeCache.size > 400) rangeCache.clear();
  rangeCache.set(key, out);
  return out;
}

/** The demo guest's own online bookings (Checkout) as exact bookings. Commission is earned when a booking
 *  is paid, and every demo booking is paid on the demo day — the date of its ΑΠΥ in Documents too — so
 *  they count on DEMO_TODAY whatever day they are for. Cancelled days drop out. */
export function placedInput(
  placed: readonly PlacedBooking[],
  range: DateRange,
  section: string | null,
): EconInput {
  const out = emptyInput();
  if (DEMO_TODAY < range.from || DEMO_TODAY > range.to) return out;
  for (const b of placed) {
    const items = b.items.filter((i) => !b.cancelledDates?.[dayOfItem(i)]);
    if (!items.length) continue;
    const sec = items.find((i) => i.zoneId)?.zoneId ?? ENTRY_SECTION.id;
    if (section && sec !== section) continue;
    out.bookings += 1;
    out.parts.push(...mergeParts(cartParts(items)).map((p) => ({ ...p, count: 1 })));
  }
  return out;
}

/** The demo's phone bookings (call centre / staff New booking, paid by card or a paid link) as exact
 *  bookings — counted on the demo day like the guest's own (AENR-728). The service-fee line is not a service. */
export function phoneInput(
  links: readonly PayLink[],
  range: DateRange,
  section: string | null,
): EconInput {
  const out = emptyInput();
  if (DEMO_TODAY < range.from || DEMO_TODAY > range.to) return out;
  for (const l of links) {
    if (l.closed !== "paid") continue;
    const lines = l.lines.filter((x) => !x.fee);
    const sec = lines.find((x) => x.zoneId)?.zoneId ?? ENTRY_SECTION.id;
    if (section && sec !== section) continue;
    out.bookings += 1;
    const parts = lines.map((x) =>
      x.setId
        ? { service: "sunbeds" as const, units: x.qty, gross: r2(x.qty * x.unit) }
        : { service: "tickets" as const, units: x.qty, gross: r2(x.qty * x.unit) },
    );
    out.parts.push(...mergeParts(parts).map((p) => ({ ...p, count: 1 })));
  }
  return out;
}

const ALL_CHANNELS: Record<FeeChannel, boolean> = { online: true, phone: true };
/** Bookings that carry commission over arrival dates — the sample mix (scaled for other tenants) for the
 *  channels the terms charge, plus the guest's online demo bookings and the staff's paid phone bookings. */
export function rangeInput(
  range: DateRange,
  section: string | null,
  o: {
    scale?: number;
    placed?: readonly PlacedBooking[];
    phone?: readonly PayLink[];
    channels?: Record<FeeChannel, boolean>;
  } = {},
): EconInput {
  const scale = o.scale ?? 1;
  const ch = o.channels ?? ALL_CHANNELS;
  const base = range.from <= range.to && scale > 0 ? sampleRange(range, section, ch) : emptyInput();
  const live = ch.online && o.placed?.length ? placedInput(o.placed, range, section) : emptyInput();
  const staff = ch.phone && o.phone?.length ? phoneInput(o.phone, range, section) : emptyInput();
  return {
    bookings: base.bookings * scale + live.bookings + staff.bookings,
    parts: [...base.parts.map((p) => ({ ...p, count: p.count * scale })), ...live.parts, ...staff.parts],
  };
}

/* ---------- Per tenant ---------- */
let sampleGmv = 0;
/** The demo beach's season GMV to the demo day — the yardstick other tenants scale by. */
function sampleSeasonGmv(): number {
  if (!sampleGmv)
    sampleGmv =
      Math.round(summarize({ from: `${DEMO_TODAY.slice(0, 4)}-05-01`, to: DEMO_TODAY }).revenue) ||
      1;
  return sampleGmv;
}
/** How a tenant's volume compares to the demo beach (its season GMV over the sample's). */
export const tenantScale = (t: Pick<TenantRecord, "id" | "kpi">) =>
  t.id === "akti" ? 1 : Math.max(0, t.kpi.gmv / sampleSeasonGmv());

/** "Jul 2026" / "Sept 2026" → "2026-07" / "2026-09" (the period label of the AENR-517 subscription invoices). */
export function periodMonth(period: string): string | null {
  const [m, y] = period.split(" ");
  const i = MONTH_ABBR.indexOf((m ?? "").slice(0, 3));
  return i >= 0 && /^\d{4}$/.test(y ?? "") ? `${y}-${String(i + 1).padStart(2, "0")}` : null;
}
/** The month-end invoice issued for a month, if any. */
export const statementInvoice = (
  t: Pick<TenantRecord, "invoices">,
  month: string,
): Invoice | undefined => t.invoices.find((i) => i.month === month);
/** A subscription invoice (AENR-517, no statement) that already billed the month's subscription and add-ons. */
const subscriptionInvoice = (t: Pick<TenantRecord, "invoices">, month: string) =>
  t.invoices.find((i) => !i.month && i.status !== "Void" && periodMonth(i.period) === month);

export interface StatementOpts {
  plans: readonly Plan[];
  /** The viewer's today: the demo day for the tenant's staff, the real date on the Platform. */
  today: string;
  /** The tenant's demo online bookings — only the tenant the demo personas represent has any. */
  placed?: readonly PlacedBooking[];
  /** Its demo phone bookings (staff New booking, AENR-728). */
  phone?: readonly PayLink[];
}
/** One tenant's month: commission and fees from its online bookings, its monthly charges and the corporate-tax rebill. */
export function tenantStatement(t: TenantRecord, month: string, o: StatementOpts): MonthStatement {
  const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);
  const from = t.goLive && t.goLive > `${month}-01` ? t.goLive : `${month}-01`;
  const to = last < o.today ? last : o.today;
  const input =
    t.goLive && from <= to
      ? rangeInput({ from, to }, null, { scale: tenantScale(t), placed: o.placed, phone: o.phone, channels: termsOf(t).channels })
      : emptyInput();
  const plan = o.plans.find((p) => p.id === t.plan.id);
  return monthStatement(input, termsOf(t), {
    month,
    today: o.today,
    goLive: t.goLive,
    planPrice: planVersion(o.plans, t.plan.id, t.plan.version)?.price ?? 0,
    planLabel: `${plan?.name ?? t.plan.id} v${t.plan.version}`,
    addOns: t.addOns,
    recurringInvoiced: subscriptionInvoice(t, month)?.no,
  });
}

/** Season months from May of `today`'s year up to today's month (YYYY-MM, oldest first). */
export function seasonMonthsTo(today: string): string[] {
  const y = today.slice(0, 4);
  const out: string[] = [];
  for (let m = 5; m <= 12; m++) {
    const month = `${y}-${String(m).padStart(2, "0")}`;
    if (month > today.slice(0, 7)) break;
    out.push(month);
  }
  return out;
}
/** The season so far for a tenant: every month's statement, and their sums. */
export function seasonToDate(t: TenantRecord, o: StatementOpts) {
  const months = seasonMonthsTo(o.today).map((m) => tenantStatement(t, m, o));
  const add = (f: (s: MonthStatement) => number) => r2(months.reduce((a, s) => a + f(s), 0));
  return {
    months,
    bookings: months.reduce((a, s) => a + s.usage.bookings, 0),
    commission: add((s) => s.totals.commission),
    slaiceFees: add((s) => s.totals.slaiceFees),
    recurring: add((s) => s.subscription.amount + s.addOns.amount + s.support.amount),
    corporateTax: add((s) => s.totals.corporateTax),
    slaiceRevenue: add((s) => s.totals.slaiceRevenue),
  };
}
