// Finance figures for Reporting › Overview / Payments / Invoices (AENR-521):
// card captures, service & platform fees, Stripe fees and payouts, saved-card
// usage, and fiscal documents (ΑΠΥ / ΤΠΥ / ΠΑΠΥ / ΠΤΠΥ) with their transmission
// status. Everything is computed per section (store) and arrival day from the
// same deterministic generator as the rest of Reporting, so rows always sum to
// the totals — plus the real demo activity from the Cashier till.

import { ZONES } from "./beach";
import { dayStats } from "./analytics";
import { DEMO_TODAY, addDays, inRange, type DateRange } from "../domain/period";
import { feeAmount, type FeeBase, type FinanceConfig } from "../domain/finance";
import type { TillSale } from "../domain/till";

/** Ticket-only sales at the till have no store; they report under this row. */
export const ENTRY_SECTION = { id: "entry", name: "Entrance (tickets only)" };
export const SECTIONS = [...ZONES.map((z) => ({ id: z.id, name: z.name })), ENTRY_SECTION];
export const sectionName = (id: string) => SECTIONS.find((s) => s.id === id)?.name ?? id;

export interface SectionDay {
  sets: number; // confirmed sunbed sets
  tx: number; // successful card charges
  captured: number; // card-captured beach turnover (€)
  onlineSets: number;
  entryPersons: number; // entry tickets bought online
  saved: number; // charges made with a saved card
  savedCaptured: number;
  docs: { apy: number; tpy: number; papy: number; ptpy: number };
  pending: number; // documents not yet transmitted
}
const emptyDay = (): SectionDay => ({
  sets: 0,
  tx: 0,
  captured: 0,
  onlineSets: 0,
  entryPersons: 0,
  saved: 0,
  savedCaptured: 0,
  docs: { apy: 0, tpy: 0, papy: 0, ptpy: 0 },
  pending: 0,
});

// Deterministic 0–1 from a key (same style as analytics).
function r(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  h ^= h << 13;
  h ^= h >>> 17;
  return ((h >>> 0) % 10000) / 10000;
}

const dayCache = new Map<string, Record<string, SectionDay>>();
/** Sample figures for one arrival day, per section. */
function sampleDay(iso: string): Record<string, SectionDay> {
  const hit = dayCache.get(iso);
  if (hit) return hit;
  const s = dayStats(iso);
  const out: Record<string, SectionDay> = {};
  if (s.open && s.units.Sunbeds > 0) {
    const card = (c: keyof typeof s.byChannel, k: number) => ({
      b: s.byChannel[c].bookings * k,
      v: s.byChannel[c].revenue * k,
    });
    const parts = [card("Online", 1), card("Phone", 1), card("Cashier", 0.6), card("Walk-in", 0.6)];
    const txDay = parts.reduce((a, p) => a + p.b, 0);
    const capDay = parts.reduce((a, p) => a + p.v, 0);
    const onlineShare = s.bookings ? s.byChannel.Online.bookings / s.bookings : 0;
    const savedShare = Math.min(0.6, (s.bookings ? s.returningGuests / s.bookings : 0) * 0.66);
    for (const z of ZONES) {
      const sets = s.setsSold[z.id] ?? 0;
      const share = sets / s.units.Sunbeds;
      const tx = Math.round(txDay * share);
      const captured = Math.round(capDay * share);
      const saved = Math.round(tx * savedShare);
      const docsAll = Math.round(s.bookings * share);
      const tpy = Math.round(docsAll * (0.055 + r(iso + z.id + "t") * 0.02));
      // Stochastic rounding so small sections still get their share of credit notes over a period.
      const xc = s.refunds.count * share;
      const credits = Math.floor(xc) + (r(iso + z.id + "cr") < xc - Math.floor(xc) ? 1 : 0);
      const ptpy = r(iso + z.id + "c") < 0.18 ? Math.min(credits, 1) : 0;
      const docs = { apy: docsAll - tpy, tpy, papy: credits - ptpy, ptpy };
      const total = docsAll + credits;
      // Recent days still have documents queued at the provider.
      const lag = iso >= addDays(DEMO_TODAY, -1) ? 0.12 : 0.012;
      out[z.id] = {
        sets,
        tx,
        captured,
        onlineSets: Math.round(sets * onlineShare),
        entryPersons: Math.round(s.units.Tickets * share * onlineShare),
        saved,
        savedCaptured: Math.round(captured * (saved / Math.max(1, tx))),
        docs,
        pending: Math.round(total * (lag + r(iso + z.id + "p") * 0.01)),
      };
    }
  }
  dayCache.set(iso, out);
  return out;
}

/** Real demo activity: till sales count on the back-office business day. */
function tillDay(sales: readonly TillSale[]): Record<string, SectionDay> {
  const out: Record<string, SectionDay> = {};
  for (const sale of sales) {
    const zone = sale.lines.find((l) => l.zoneId)?.zoneId ?? ENTRY_SECTION.id;
    const d = (out[zone] ??= emptyDay());
    const card = sale.tenders.filter((t) => t.kind === "card").reduce((a, t) => a + t.amount, 0);
    d.sets += sale.lines.filter((l) => l.setId).length;
    if (card > 0) {
      d.tx += 1;
      d.captured += card;
    }
    d.docs.apy += 1;
    d.docs.papy += sale.refunds.length;
    if (sale.mydata !== "sent") d.pending += 1;
  }
  return out;
}

export interface SectionTotals extends SectionDay {
  id: string;
  name: string;
}
export interface FinanceReport {
  days: { date: string; sets: number; tx: number; captured: number }[];
  sections: SectionTotals[];
  total: SectionTotals;
}

const add = (a: SectionDay, b: SectionDay) => {
  a.sets += b.sets;
  a.tx += b.tx;
  a.captured += b.captured;
  a.onlineSets += b.onlineSets;
  a.entryPersons += b.entryPersons;
  a.saved += b.saved;
  a.savedCaptured += b.savedCaptured;
  a.docs.apy += b.docs.apy;
  a.docs.tpy += b.docs.tpy;
  a.docs.papy += b.docs.papy;
  a.docs.ptpy += b.docs.ptpy;
  a.pending += b.pending;
};

/** Figures for an arrival-date range, optionally one section only. */
export function financeReport(
  range: DateRange,
  section: string | null,
  sales: readonly TillSale[],
): FinanceReport {
  const per: Record<string, SectionTotals> = Object.fromEntries(
    SECTIONS.map((s) => [
      s.id,
      { ...emptyDay(), docs: { apy: 0, tpy: 0, papy: 0, ptpy: 0 }, id: s.id, name: s.name },
    ]),
  );
  const days: FinanceReport["days"] = [];
  const till = inRange(DEMO_TODAY, range) ? tillDay(sales) : {};
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    const day = { date: d, sets: 0, tx: 0, captured: 0 };
    const parts = [sampleDay(d), d === DEMO_TODAY ? till : {}];
    for (const part of parts) {
      for (const [id, v] of Object.entries(part)) {
        if (section && id !== section) continue;
        add(per[id], v);
        day.sets += v.sets;
        day.tx += v.tx;
        day.captured += v.captured;
      }
    }
    days.push(day);
  }
  const sections = Object.values(per).filter((s) =>
    section ? s.id === section : s.id !== ENTRY_SECTION.id || s.tx + s.docs.apy > 0,
  );
  const total: SectionTotals = {
    ...emptyDay(),
    docs: { apy: 0, tpy: 0, papy: 0, ptpy: 0 },
    id: "all",
    name: "Total",
  };
  sections.forEach((s) => add(total, s));
  return { days, sections, total };
}

export const docsTotal = (d: SectionDay["docs"]) => d.apy + d.tpy + d.papy + d.ptpy;
export const transmitted = (s: SectionDay) => docsTotal(s.docs) - s.pending;

/* ---------- Money flow ---------- */
export interface MoneyFlow {
  serviceFees: { id: string; name: string; units: number | null; rate: string; amount: number }[];
  serviceTotal: number;
  platformFees: number;
  platformVat: number;
  stripeFees: number;
  stripePct: number;
  /** What reaches the tenant's bank: captured + service fees − Stripe − platform fees (+VAT). */
  netToBank: number;
}
export function moneyFlow(t: SectionDay, cfg: FinanceConfig): MoneyFlow {
  const base: FeeBase = {
    onlineSets: t.onlineSets,
    entryPersons: t.entryPersons,
    captured: t.captured,
    bookings: t.tx,
  };
  const serviceFees = cfg.fees
    .filter((f) => f.active && f.payer === "customer")
    .map((f) => ({
      id: f.id,
      name: f.name,
      units:
        f.basis === "pctBooking"
          ? null
          : f.basis === "perOnlineSet"
            ? base.onlineSets
            : f.basis === "perEntryPerson"
              ? base.entryPersons
              : base.bookings,
      rate: f.basis === "pctBooking" ? `${f.amount}%` : `€${f.amount}`,
      amount: feeAmount(f, base),
    }));
  const serviceTotal = serviceFees.reduce((a, f) => a + f.amount, 0);
  const platformFees = cfg.fees
    .filter((f) => f.payer === "tenant")
    .reduce((a, f) => a + feeAmount(f, base), 0);
  const platformVat = cfg.fees
    .filter((f) => f.payer === "tenant")
    .reduce((a, f) => a + feeAmount(f, base) * f.vat, 0);
  // Stripe EEA cards: 1.5% + €0.25 per successful charge.
  const stripeFees = (t.captured + serviceTotal) * 0.015 + t.tx * 0.25;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    serviceFees,
    serviceTotal: r2(serviceTotal),
    platformFees: r2(platformFees),
    platformVat: r2(platformVat),
    stripeFees: r2(stripeFees),
    stripePct: t.captured ? stripeFees / t.captured : 0,
    netToBank: r2(t.captured + serviceTotal - stripeFees - platformFees - platformVat),
  };
}

/** Stripe payouts every 3 days over the range: net of the preceding days. */
export interface Payout {
  date: string;
  bank: string;
  amount: number;
  status: "Paid" | "In transit" | "Scheduled";
}
export function payouts(
  range: DateRange,
  section: string | null,
  sales: readonly TillSale[],
  cfg: FinanceConfig,
): Payout[] {
  const out: Payout[] = [];
  let from = range.from;
  for (let d = addDays(range.from, 2); d <= range.to; d = addDays(d, 3)) {
    const t = financeReport({ from, to: d }, section, sales).total;
    if (t.captured > 0) {
      const pay = addDays(d, 2); // T+2 settlement
      out.push({
        date: pay,
        bank: "···4521",
        amount: moneyFlow(t, cfg).netToBank,
        status:
          pay > DEMO_TODAY ? "Scheduled" : pay >= addDays(DEMO_TODAY, -1) ? "In transit" : "Paid",
      });
    }
    from = addDays(d, 1);
  }
  return out.reverse();
}
