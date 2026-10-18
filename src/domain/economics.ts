// Commercial terms — what Slaice earns from a tenant (AENR-725 payment rules,
// AENR-689 payment plans). One per-tenant model, set by Slaice in Platform ›
// tenant › Commercial terms, and read by every figure that involves Slaice's
// money: the guest's service fee and VAT note at checkout, Reports › Platform
// fees, the accountant's monthly Slaice statement and invoice, and the
// Platform revenue overview.
//
// The rules, per online booking:
//   • each service (sunbeds, entry tickets, passes, lockers, parking) earns
//     Slaice `rate`% of the booking's tax-inclusive total for that service, or
//     the service's `min` per booking when the rate gives less;
//   • the guest pays a service fee per unit (€3 per sunbed set, €1 per entry
//     ticket by default), VAT included; with `feesInBase` the fees count toward
//     the commission base (30 € set + 3 € fee → 3% of 33 €);
//   • the commission is Slaice's net income; at month end the corporate tax on
//     it (`corporateTax`%) is re-billed to the tenant on the month's invoice,
//     together with the support fee and the monthly subscription.
// Pure functions only — no React, no store.

import type { CartItem } from "./types";

/* ---------- Services ---------- */
export const SERVICES = ["sunbeds", "tickets", "passes", "lockers", "parking"] as const;
export type ServiceId = (typeof SERVICES)[number];

export const SERVICE_LABEL: Record<ServiceId, string> = {
  sunbeds: "Sunbeds",
  tickets: "Entry tickets",
  passes: "Season & VIP passes",
  lockers: "Day lockers",
  parking: "Parking",
};
/** Lower-case names for running text — the guest's VAT note reads "sunbeds 24%, entry tickets 13%". */
export const SERVICE_NOUN: Record<ServiceId, string> = {
  sunbeds: "sunbeds",
  tickets: "entry tickets",
  passes: "passes",
  lockers: "lockers",
  parking: "parking",
};
/** What a guest fee is charged per. */
export const SERVICE_UNIT: Record<ServiceId, { one: string; many: string }> = {
  sunbeds: { one: "set", many: "sets" },
  tickets: { one: "ticket", many: "tickets" },
  passes: { one: "pass", many: "passes" },
  lockers: { one: "locker", many: "lockers" },
  parking: { one: "spot", many: "spots" },
};

/* ---------- Terms ---------- */
export type TaxBase = "commission" | "commissionAndFees";
export const FEE_CHANNELS = ["online", "phone"] as const;
export type FeeChannel = (typeof FEE_CHANNELS)[number];
export const FEE_CHANNEL_LABEL: Record<FeeChannel, string> = {
  online: "Online bookings",
  phone: "Phone bookings",
};
export interface ServiceTerms {
  /** Commission on the service's tax-inclusive total in one online booking, in % (3 = 3%). */
  rate: number;
  /** Minimum commission per online booking that includes the service (€) — 0 = none. */
  min: number;
  /** Guest service fee per unit (€, VAT included): per set, ticket, pass, locker or spot. */
  fee: number;
  /** VAT the guest pays on the service — and on its fee — in %. */
  vat: number;
}
export interface SupportItem {
  id: string;
  label: string;
  /** € per month. */
  amount: number;
}
export interface SupportFee {
  /** The line items the monthly support fee is built from (hosting, live support…). */
  items: SupportItem[];
  /** Last day it is charged (inclusive); null = no end date. The month it ends in is pro-rated. */
  until: string | null;
}
export type SubscriptionMode = "plan" | "custom" | "none";
export interface Subscription {
  /** plan = the catalog plan's list price every month · custom = season / off-season prices · none = commission only. */
  mode: SubscriptionMode;
  /** Custom price in an active (season) month, € per month. */
  active: number;
  /** Custom price in the other months, € per month. */
  inactive: number;
  /** Months (1–12) billed at the active price. */
  activeMonths: number[];
}
export interface CommercialTerms {
  services: Record<ServiceId, ServiceTerms>;
  /** The guest's service fees count toward the commission base. */
  feesInBase: boolean;
  /** Who keeps the guest service fee. */
  feeTo: "slaice" | "tenant";
  /** Corporate income tax on Slaice's net income, re-billed to the tenant at month end (%) — Greece 22%. */
  corporateTax: number;
  /** What the corporate tax is worked out on (AENR-728): the commission, or the commission plus the guest fees Slaice keeps. */
  taxBase: TaxBase;
  /** Which bookings carry commission and guest fees (AENR-728): online, and phone bookings taken by staff and paid by card or link. */
  channels: Record<FeeChannel, boolean>;
  support: SupportFee;
  subscription: Subscription;
}

/** The beach season, May–September — the default active months of a seasonal subscription. */
export const SEASON_MONTHS = [5, 6, 7, 8, 9];

/** The product owner's numbers (AENR-725); passes, lockers and parking take the same 3% with no minimum and no fee. */
export const DEFAULT_TERMS: CommercialTerms = {
  services: {
    sunbeds: { rate: 3, min: 1.5, fee: 3, vat: 24 },
    tickets: { rate: 3, min: 0.5, fee: 1, vat: 24 },
    passes: { rate: 3, min: 0, fee: 0, vat: 24 },
    lockers: { rate: 3, min: 0, fee: 0, vat: 24 },
    parking: { rate: 3, min: 0, fee: 0, vat: 24 },
  },
  feesInBase: true,
  feeTo: "slaice",
  corporateTax: 22,
  taxBase: "commission",
  channels: { online: true, phone: true },
  support: { items: [], until: null },
  subscription: { mode: "plan", active: 0, inactive: 0, activeMonths: SEASON_MONTHS },
};

/** Saved terms of any age with every field present (missing ones take the defaults). */
export function normalizeTerms(raw?: unknown): CommercialTerms {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<CommercialTerms>;
  const services = Object.fromEntries(
    SERVICES.map((s) => [s, { ...DEFAULT_TERMS.services[s], ...(r.services?.[s] ?? {}) }]),
  ) as Record<ServiceId, ServiceTerms>;
  return {
    ...DEFAULT_TERMS,
    ...r,
    services,
    channels: { ...DEFAULT_TERMS.channels, ...(r.channels ?? {}) },
    support: { ...DEFAULT_TERMS.support, ...(r.support ?? {}), items: r.support?.items ?? [] },
    subscription: {
      ...DEFAULT_TERMS.subscription,
      ...(r.subscription ?? {}),
      activeMonths: r.subscription?.activeMonths ?? SEASON_MONTHS,
    },
  };
}
/** A tenant's terms; a tenant that never had any gets the defaults. */
export const termsOf = (t?: { terms?: unknown } | null): CommercialTerms =>
  normalizeTerms(t?.terms);
/** A deep copy to edit (JSON, not structuredClone — Safari 14 is in the support matrix). */
export const cloneTerms = (t: CommercialTerms): CommercialTerms =>
  normalizeTerms(JSON.parse(JSON.stringify(t)));

/* ---------- Migrating the retired fee lines (AENR-521) ----------
   The old per-tenant fee lines held the guest fees and a % platform fee. Their
   demo defaults (€2.50 per set, €0.50 per entry person, 5%) were placeholders
   the owner replaced with the AENR-725 numbers, so untouched lines simply take
   the new defaults; lines someone changed carry over. */
export interface LegacyFeeLine {
  id: string;
  basis: string;
  amount: number;
  payer: string;
  active: boolean;
}
const LEGACY_DEFAULT: Record<string, number> = {
  "fee-online": 2.5,
  "fee-entry": 0.5,
  "fee-platform": 5,
};
export function termsFromLegacyFees(
  fees: readonly LegacyFeeLine[] | undefined,
  base: CommercialTerms = DEFAULT_TERMS,
): CommercialTerms | undefined {
  const changed = (fees ?? []).filter((f) => !(f.active && LEGACY_DEFAULT[f.id] === f.amount));
  if (!changed.length) return undefined;
  const out = cloneTerms(base);
  for (const f of changed) {
    const v = f.active ? Math.max(0, f.amount) : 0;
    if (f.payer === "customer" && f.basis === "perOnlineSet") out.services.sunbeds.fee = v;
    else if (f.payer === "customer" && f.basis === "perEntryPerson") out.services.tickets.fee = v;
    else if (f.payer === "tenant" && f.basis === "pctBooking")
      SERVICES.forEach((s) => (out.services[s].rate = Math.min(100, v)));
    // Fixed per-booking fees have no place in the new model and are dropped.
  }
  return out;
}

/* ---------- Validation ---------- */
const bad = (v: number) => typeof v !== "number" || !Number.isFinite(v);
export const pctError = (v: number) =>
  bad(v) ? "Enter a number" : v < 0 || v > 100 ? "Between 0 and 100%" : null;
export const amountError = (v: number) =>
  bad(v) ? "Enter a number" : v < 0 ? "Can't be negative" : null;
/** Every problem in a draft, keyed by field path ("services.sunbeds.rate", "support.items.0.label"…). */
export function termsErrors(t: CommercialTerms): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (k: string, e: string | null) => {
    if (e) out[k] = e;
  };
  for (const s of SERVICES) {
    const x = t.services[s];
    put(`services.${s}.rate`, pctError(x.rate));
    put(`services.${s}.min`, amountError(x.min));
    put(`services.${s}.fee`, amountError(x.fee));
    put(`services.${s}.vat`, pctError(x.vat));
  }
  put("corporateTax", pctError(t.corporateTax));
  t.support.items.forEach((it, i) => {
    put(`support.items.${i}.label`, it.label.trim() ? null : "Name the item");
    put(`support.items.${i}.amount`, amountError(it.amount));
  });
  if (t.support.until !== null && !/^\d{4}-\d{2}-\d{2}$/.test(t.support.until))
    out["support.until"] = "Pick a date";
  if (t.subscription.mode === "custom") {
    put("subscription.active", amountError(t.subscription.active));
    put("subscription.inactive", amountError(t.subscription.inactive));
  }
  return out;
}

/** What the corporate tax is re-billed on, per the tenant's terms (AENR-728). */
export const taxBaseOf = (terms: Pick<CommercialTerms, "taxBase">, commission: number, slaiceFees: number) =>
  terms.taxBase === "commissionAndFees" ? commission + slaiceFees : commission;

/* ---------- One booking ---------- */
const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: readonly number[]) => r2(xs.reduce((a, x) => a + x, 0));

/** One service's share of one online booking: how many units and their total, VAT included. */
export interface ServicePart {
  service: ServiceId;
  units: number;
  gross: number;
}
export interface ServiceEconomics extends ServicePart {
  /** Guest service fees for these units (VAT included). */
  fees: number;
  /** What the commission is calculated on. */
  base: number;
  /** rate × base, before the minimum. */
  byRate: number;
  commission: number;
  /** The minimum applied (rate × base was lower). */
  atMin: boolean;
  vatRate: number;
  /** What the guest paid for the service and its fee, without VAT — and the VAT in it. */
  net: number;
  vat: number;
}
export function serviceEconomics(part: ServicePart, terms: CommercialTerms): ServiceEconomics {
  const s = terms.services[part.service];
  const fees = r2(part.units * s.fee);
  const base = r2(part.gross + (terms.feesInBase ? fees : 0));
  const byRate = r2((base * s.rate) / 100);
  const commission = base > 0 ? r2(Math.max(byRate, s.min)) : 0;
  const paid = part.gross + fees;
  const net = r2(paid / (1 + s.vat / 100));
  return {
    ...part,
    fees,
    base,
    byRate,
    commission,
    atMin: base > 0 && s.min > byRate,
    vatRate: s.vat,
    net,
    vat: r2(paid - net),
  };
}

/** Group a booking's lines by service (every sunbed set is a line of its own). */
export function mergeParts(parts: readonly ServicePart[]): ServicePart[] {
  const by = new Map<ServiceId, ServicePart>();
  for (const p of parts) {
    const cur = by.get(p.service) ?? { service: p.service, units: 0, gross: 0 };
    by.set(p.service, { ...cur, units: cur.units + p.units, gross: r2(cur.gross + p.gross) });
  }
  return SERVICES.filter((s) => by.has(s)).map((s) => by.get(s) as ServicePart);
}

export interface BookingEconomics {
  services: ServiceEconomics[];
  gross: number;
  fees: number;
  /** All-in: services + guest fees, VAT included. */
  customerPays: number;
  commission: number;
  /** Guest fees Slaice keeps (feeTo = slaice). */
  slaiceFees: number;
  slaiceRevenue: number;
  /** What stays with the beach, before card processing. */
  tenantReceives: number;
  /** The month-end corporate-tax rebill on this booking's commission. */
  corporateTax: number;
}
/** Everything one online booking means for the guest, Slaice and the beach. */
export function bookingEconomics(
  parts: readonly ServicePart[],
  terms: CommercialTerms,
): BookingEconomics {
  const services = mergeParts(parts).map((p) => serviceEconomics(p, terms));
  const gross = sum(services.map((s) => s.gross));
  const fees = sum(services.map((s) => s.fees));
  const commission = sum(services.map((s) => s.commission));
  const slaiceFees = terms.feeTo === "slaice" ? fees : 0;
  const slaiceRevenue = r2(commission + slaiceFees);
  const customerPays = r2(gross + fees);
  return {
    services,
    gross,
    fees,
    customerPays,
    commission,
    slaiceFees,
    slaiceRevenue,
    tenantReceives: r2(customerPays - slaiceRevenue),
    corporateTax: r2((taxBaseOf(terms, commission, slaiceFees) * terms.corporateTax) / 100),
  };
}

/* ---------- The guest's basket ---------- */
const SERVICE_OF: Record<CartItem["kind"], ServiceId> = {
  sunbed: "sunbeds",
  ticket: "tickets",
  locker: "lockers",
  parking: "parking",
};
export const serviceOfKind = (kind: CartItem["kind"]): ServiceId => SERVICE_OF[kind];
/** Units a basket line carries: a set, the people on a ticket line, a locker, a parking spot. */
export const unitsOf = (i: Pick<CartItem, "kind" | "qty">) =>
  i.kind === "ticket" ? (i.qty ?? 1) : 1;
export const cartParts = (items: readonly CartItem[]): ServicePart[] =>
  items.map((i) => ({ service: SERVICE_OF[i.kind], units: unitsOf(i), gross: i.price }));

/** The guest's service fee per basket line and in total (what the guest sees — never the commission). */
export function guestFees(
  items: readonly CartItem[],
  terms: CommercialTerms,
  key: (i: CartItem) => string,
) {
  const perItem: Record<string, number> = {};
  for (const i of items) {
    const f = r2(unitsOf(i) * terms.services[SERVICE_OF[i.kind]].fee);
    if (f > 0) perItem[key(i)] = r2((perItem[key(i)] ?? 0) + f);
  }
  return { perItem, total: sum(Object.values(perItem)) };
}

/** The VAT rates in a basket: one rate for everything, or the rate per service when they differ. */
export function vatRates(
  items: readonly CartItem[],
  terms: CommercialTerms,
): { single: number | null; byService: [ServiceId, number][] } {
  const present = SERVICES.filter((s) => items.some((i) => SERVICE_OF[i.kind] === s));
  const byService = present.map((s): [ServiceId, number] => [s, terms.services[s].vat]);
  const rates = [...new Set(byService.map(([, r]) => r))];
  return { single: rates.length === 1 ? rates[0] : null, byService };
}

/* ---------- A period: weighted bookings ---------- */
/** `count` bookings with exactly this part (sample bookings come as a mix, demo bookings count 1). */
export interface WeightedPart extends ServicePart {
  count: number;
}
export interface EconInput {
  /** Online bookings — a booking counts once, whatever it holds. */
  bookings: number;
  parts: WeightedPart[];
}
export const emptyInput = (): EconInput => ({ bookings: 0, parts: [] });

export interface ServiceLine {
  service: ServiceId;
  /** Online bookings that include the service. */
  bookings: number;
  units: number;
  gross: number;
  fees: number;
  base: number;
  commission: number;
  /** Bookings where the minimum applied. */
  atMin: number;
  net: number;
  vat: number;
}
export interface EconTotals {
  bookings: number;
  /** Every service, zeros included, in SERVICES order. */
  services: ServiceLine[];
  gross: number;
  fees: number;
  commission: number;
  slaiceFees: number;
  slaiceRevenue: number;
}
/** Commission and guest fees over a period — each weighted booking priced like a real one. */
export function aggregate(input: EconInput, terms: CommercialTerms): EconTotals {
  const lines = new Map<ServiceId, ServiceLine>(
    SERVICES.map((s) => [
      s,
      {
        service: s,
        bookings: 0,
        units: 0,
        gross: 0,
        fees: 0,
        base: 0,
        commission: 0,
        atMin: 0,
        net: 0,
        vat: 0,
      },
    ]),
  );
  for (const p of input.parts) {
    if (!(p.count > 0)) continue;
    const e = serviceEconomics(p, terms);
    const l = lines.get(p.service) as ServiceLine;
    l.bookings += p.count;
    l.units += p.units * p.count;
    l.gross += e.gross * p.count;
    l.fees += e.fees * p.count;
    l.base += e.base * p.count;
    l.commission += e.commission * p.count;
    l.atMin += e.atMin ? p.count : 0;
    l.net += e.net * p.count;
    l.vat += e.vat * p.count;
  }
  const services = SERVICES.map((s) => {
    const l = lines.get(s) as ServiceLine;
    // Sample days carry weighted (fractional) counts; whole bookings and units read right.
    return {
      ...l,
      bookings: Math.round(l.bookings),
      units: Math.round(l.units),
      atMin: Math.round(l.atMin),
      gross: r2(l.gross),
      fees: r2(l.fees),
      base: r2(l.base),
      commission: r2(l.commission),
      net: r2(l.net),
      vat: r2(l.vat),
    };
  });
  const fees = sum(services.map((s) => s.fees));
  const commission = sum(services.map((s) => s.commission));
  const slaiceFees = terms.feeTo === "slaice" ? fees : 0;
  return {
    bookings: input.bookings,
    services,
    gross: sum(services.map((s) => s.gross)),
    fees,
    commission,
    slaiceFees,
    slaiceRevenue: r2(commission + slaiceFees),
  };
}

/* ---------- Monthly charges ---------- */
const daysInMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
const monthEnd = (month: string) => `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
/** Share of a month's days inside [from, until] (both optional, inclusive) — 1 for a full month. */
export function monthShare(month: string, from?: string | null, until?: string | null): number {
  const start = `${month}-01`;
  const end = monthEnd(month);
  const a = from && from > start ? from : start;
  const b = until && until < end ? until : end;
  if (a > b) return 0;
  const days =
    Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5) + 1;
  return days / daysInMonth(month);
}
export const supportMonthly = (t: CommercialTerms) => sum(t.support.items.map((i) => i.amount));
/** The support fee for a month: pro-rated in the month it starts (go-live) or ends. */
export function supportFor(t: CommercialTerms, month: string, from?: string) {
  const monthly = supportMonthly(t);
  const share = monthShare(month, from, t.support.until);
  return {
    monthly,
    share,
    amount: r2(monthly * share),
    ended: !!t.support.until && t.support.until < `${month}-01`,
  };
}
/** The subscription for a month: the plan's list price, the season / off-season price, or nothing. */
export function subscriptionFor(
  t: CommercialTerms,
  planPrice: number,
  month: string,
  from?: string,
) {
  const m = Number(month.slice(5, 7));
  const season = t.subscription.activeMonths.includes(m);
  const listed =
    t.subscription.mode === "none"
      ? 0
      : t.subscription.mode === "plan"
        ? planPrice
        : season
          ? t.subscription.active
          : t.subscription.inactive;
  const share = monthShare(month, from);
  return { mode: t.subscription.mode, season, listed, share, amount: r2(listed * share) };
}
/** Recurring charges as a run rate for a month (MRR): subscription + add-ons + support, before go-live pro-rating. */
export function recurringFor(
  t: CommercialTerms,
  planPrice: number,
  addOns: number,
  month: string,
): number {
  return r2(subscriptionFor(t, planPrice, month).listed + addOns + supportFor(t, month).amount);
}

/* ---------- The monthly statement ---------- */
export interface StatementContext {
  /** YYYY-MM */
  month: string;
  /** The viewer's today — an open month is counted to here. */
  today: string;
  /** Charges start on go-live (pro-rated in that month); before it there is nothing to bill. */
  goLive?: string;
  planPrice: number;
  planLabel: string;
  addOns: number;
  /** A subscription invoice (AENR-517) already billed this month's subscription and add-ons. */
  recurringInvoiced?: string;
}
export interface StatementCharge {
  label: string;
  detail: string;
  amount: number;
}
export interface MonthStatement {
  month: string;
  label: string;
  from: string;
  to: string;
  /** The month includes today — commissions so far, the invoice comes after it ends. */
  open: boolean;
  /** The tenant was live for at least a day of the month. */
  live: boolean;
  usage: EconTotals;
  subscription: StatementCharge & {
    mode: SubscriptionMode;
    season: boolean;
    listed: number;
    share: number;
  };
  addOns: StatementCharge;
  support: StatementCharge & {
    items: SupportItem[];
    monthly: number;
    share: number;
    ended: boolean;
    until: string | null;
  };
  corporateTax: { rate: number; base: number; amount: number };
  recurringInvoiced?: string;
  feeTo: CommercialTerms["feeTo"];
  /** The terms the statement was worked out with (kept on an issued invoice). */
  terms: CommercialTerms;
  totals: {
    /** Subscription + add-ons + support billed on this statement. */
    recurring: number;
    commission: number;
    corporateTax: number;
    invoiceTotal: number;
    /** Commission already collected as Stripe application fees on each online charge. */
    settled: number;
    /** What the tenant pays on the invoice. */
    due: number;
    guestFees: number;
    slaiceFees: number;
    /** Commission + guest fees kept + subscription + add-ons + support (the corporate-tax rebill is a pass-through). */
    slaiceRevenue: number;
  };
}
export const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
export const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
/** "2026-09-15" → "15 Sep 2026". */
export const dayLabel = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}/.test(iso)
    ? `${Number(iso.slice(8, 10))} ${MONTH_ABBR[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
    : iso;

export function monthStatement(
  input: EconInput,
  terms: CommercialTerms,
  ctx: StatementContext,
): MonthStatement {
  const { month } = ctx;
  const from = `${month}-01`;
  const end = monthEnd(month);
  const open = ctx.today >= from && ctx.today <= end;
  const live = !!ctx.goLive && ctx.goLive <= end && ctx.today >= from;
  const usage = aggregate(live ? input : emptyInput(), terms);
  const sub = subscriptionFor(terms, ctx.planPrice, month, ctx.goLive);
  const sup = supportFor(terms, month, ctx.goLive);
  const covered = !!ctx.recurringInvoiced;
  const pro = (share: number) =>
    share > 0 && share < 1
      ? ` · ${Math.round(share * daysInMonth(month))} of ${daysInMonth(month)} days`
      : "";
  const subAmount = live ? sub.amount : 0;
  const addOns = live ? r2(ctx.addOns * monthShare(month, ctx.goLive)) : 0;
  const supAmount = live ? sup.amount : 0;
  const recurringRevenue = r2(subAmount + addOns + supAmount);
  const recurring = covered ? supAmount : recurringRevenue;
  const taxBase = r2(taxBaseOf(terms, usage.commission, usage.slaiceFees));
  const corporateTax = r2((taxBase * terms.corporateTax) / 100);
  const invoiceTotal = r2(recurring + usage.commission + corporateTax);
  const subDetail =
    sub.mode === "none"
      ? "Commission only — no monthly subscription"
      : sub.mode === "plan"
        ? `${ctx.planLabel} · €${sub.listed.toFixed(2)} a month${pro(sub.share)}`
        : `${sub.season ? "Season" : "Off-season"} month · €${sub.listed.toFixed(2)}${pro(sub.share)}`;
  return {
    month,
    label: monthLabel(month),
    from,
    to: open ? ctx.today : end,
    open,
    live,
    usage,
    subscription: {
      label:
        sub.mode === "custom"
          ? "Monthly subscription"
          : sub.mode === "plan"
            ? "Plan subscription"
            : "Subscription",
      detail: covered ? `${subDetail} · billed on invoice ${ctx.recurringInvoiced}` : subDetail,
      amount: subAmount,
      mode: sub.mode,
      season: sub.season,
      listed: sub.listed,
      share: sub.share,
    },
    addOns: {
      label: "Add-ons",
      detail: covered
        ? `billed on invoice ${ctx.recurringInvoiced}`
        : `€${ctx.addOns.toFixed(2)} a month${pro(monthShare(month, ctx.goLive))}`,
      amount: addOns,
    },
    support: {
      label: "Support services",
      detail: sup.monthly
        ? sup.ended
          ? `Ended ${dayLabel(terms.support.until ?? "")}`
          : `${terms.support.items.map((i) => `${i.label} €${i.amount.toFixed(2)}`).join(" · ")}${pro(sup.share)}${terms.support.until ? ` · until ${dayLabel(terms.support.until)}` : ""}`
        : "No support fee",
      amount: supAmount,
      items: terms.support.items,
      monthly: sup.monthly,
      share: sup.share,
      ended: sup.ended,
      until: terms.support.until,
    },
    corporateTax: { rate: terms.corporateTax, base: taxBase, amount: corporateTax },
    recurringInvoiced: ctx.recurringInvoiced,
    feeTo: terms.feeTo,
    terms,
    totals: {
      recurring,
      commission: usage.commission,
      corporateTax,
      invoiceTotal,
      settled: usage.commission,
      due: r2(invoiceTotal - usage.commission),
      guestFees: usage.fees,
      slaiceFees: usage.slaiceFees,
      slaiceRevenue: r2(usage.slaiceRevenue + recurringRevenue),
    },
  };
}

/* ---------- What changed (Audit log lines) ---------- */
export interface TermsChange {
  label: string;
  from: string;
  to: string;
}
/** "May–Sep" / "Jan, Jul–Aug" / "none". */
export function monthsLabel(ms: readonly number[]): string {
  const s = [...new Set(ms)].filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b);
  if (!s.length) return "none";
  const runs: [number, number][] = [];
  for (const m of s) {
    const last = runs[runs.length - 1];
    if (last && last[1] === m - 1) last[1] = m;
    else runs.push([m, m]);
  }
  return runs
    .map(([a, b]) => (a === b ? MONTH_ABBR[a - 1] : `${MONTH_ABBR[a - 1]}–${MONTH_ABBR[b - 1]}`))
    .join(", ");
}
export const subscriptionLabel = (s: Subscription, planPrice?: number) =>
  s.mode === "none"
    ? "Commission only"
    : s.mode === "plan"
      ? `Plan list price${planPrice !== undefined ? ` (${eur(planPrice)} a month)` : ""}`
      : `${eur(s.active)} in ${monthsLabel(s.activeMonths)}, ${eur(s.inactive)} otherwise`;
export const supportLabel = (s: SupportFee) =>
  s.items.length
    ? `${eur(sum(s.items.map((i) => i.amount)))} a month · ${s.items.map((i) => i.label).join(", ")}${s.until ? ` · until ${dayLabel(s.until)}` : ""}`
    : "None";
/** Every difference between two sets of terms, in words — one Audit-log line each. */
export function termsChanges(a: CommercialTerms, b: CommercialTerms): TermsChange[] {
  const out: TermsChange[] = [];
  const put = (label: string, from: string, to: string) => {
    if (from !== to) out.push({ label, from, to });
  };
  for (const s of SERVICES) {
    const x = a.services[s];
    const y = b.services[s];
    put(`${SERVICE_LABEL[s]} commission`, pct(x.rate), pct(y.rate));
    put(`${SERVICE_LABEL[s]} minimum per booking`, eur(x.min), eur(y.min));
    put(`${SERVICE_LABEL[s]} guest fee`, feeLabel(s, x), feeLabel(s, y));
    put(`${SERVICE_LABEL[s]} VAT`, pct(x.vat), pct(y.vat));
  }
  put(
    "Guest fees in the commission base",
    a.feesInBase ? "yes" : "no",
    b.feesInBase ? "yes" : "no",
  );
  put(
    "Guest fee kept by",
    a.feeTo === "slaice" ? "Slaice" : "the beach",
    b.feeTo === "slaice" ? "Slaice" : "the beach",
  );
  put("Corporate tax re-billed", pct(a.corporateTax), pct(b.corporateTax));
  put("Corporate tax re-billed on", TAX_BASE_LABEL[a.taxBase], TAX_BASE_LABEL[b.taxBase]);
  for (const c of FEE_CHANNELS)
    put(`Commission & fees on ${FEE_CHANNEL_LABEL[c].toLowerCase()}`, a.channels[c] ? "yes" : "no", b.channels[c] ? "yes" : "no");
  put("Support fee", supportLabel(a.support), supportLabel(b.support));
  put("Monthly subscription", subscriptionLabel(a.subscription), subscriptionLabel(b.subscription));
  return out;
}

/** "online and phone bookings" — the bookings that carry commission under these terms (AENR-728). */
export function channelNoun(t: Pick<CommercialTerms, "channels">, one = false): string {
  const on = FEE_CHANNELS.filter((c) => t.channels[c]);
  const word = one ? "booking" : "bookings";
  return on.length === 2 ? `online and phone ${word}` : on.length === 1 ? `${on[0]} ${word}` : word;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "Online and phone bookings" */
export const ChannelNoun = (t: Pick<CommercialTerms, "channels">) => cap(channelNoun(t));

export const TAX_BASE_LABEL: Record<TaxBase, string> = {
  commission: "commission only",
  commissionAndFees: "commission + guest fees Slaice keeps",
};

/* ---------- Formatting ---------- */
/** €1,234.50 (−€3.00 for negatives). */
export const eur = (n: number) =>
  `${n < 0 ? "−" : ""}€${Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** 3% · 2.5% · 0% */
export const pct = (n: number) => `${Number.isFinite(n) ? Math.round(n * 100) / 100 : "—"}%`;
/** "3% · min €1.50" */
export const rateLabel = (s: ServiceTerms) =>
  `${pct(s.rate)}${s.min > 0 ? ` · min ${eur(s.min)}` : ""}`;
/** "€3.00 per set" or "no fee" */
export const feeLabel = (service: ServiceId, s: ServiceTerms) =>
  s.fee > 0 ? `${eur(s.fee)} per ${SERVICE_UNIT[service].one}` : "no fee";
/** One line for a terms summary: "Sunbeds 3% · min €1.50 · €3.00 per set · VAT 24%". */
export const serviceSummary = (service: ServiceId, s: ServiceTerms) =>
  `${SERVICE_LABEL[service]} ${rateLabel(s)} · ${feeLabel(service, s)} · VAT ${pct(s.vat)}`;
/** The invoice number of a month-end statement, e.g. SL-202607-AKT. */
export const statementInvoiceNo = (tenantId: string, month: string) =>
  `SL-${month.replace("-", "")}-${tenantId.slice(0, 3).toUpperCase()}`;
/** Payment terms of a month-end invoice: collected by SEPA Direct Debit 14 days after it is issued. */
export const INVOICE_TERMS_DAYS = 14;
export function invoiceDue(issuedDay: string): string {
  const d = new Date(`${issuedDay.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + INVOICE_TERMS_DAYS);
  return d.toISOString().slice(0, 10);
}
