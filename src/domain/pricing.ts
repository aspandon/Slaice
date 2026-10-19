/**
 * Pricing — the single source of truth for the per-unit prices and fees that
 * were previously duplicated across Checkout, the wizard and the standalone
 * customer screens. Centralising them here kills drift (the wizard and the
 * ticket screen can no longer disagree on what an adult ticket costs) and gives
 * the future backend one obvious contract surface to take over.
 */

import type { DemandBand, BeachPricing, CartItem, PriceOverride, PriceRule, PriceRuleDays, Restriction, RestrictionKind, SunbedSlot, TicketCategory } from "./types";

// What Slaice earns on a booking (commission, guest service fee) is the tenant's
// commercial terms — domain/economics (AENR-725), not a constant here.

export const TICKET_PRICES: Record<TicketCategory, number> = {
  adult: 10,
  resident: 6,
  child: 5,
  senior: 7,
};

export const LOCKER_PRICE = 5;
export const PARKING_PRICE = 15;

/** Cross-sell defaults offered inside the sunbed-booking flow. */
export const TICKET_CROSS_SELL_PRICE = TICKET_PRICES.adult;
export const LOCKER_CROSS_SELL_PRICE = LOCKER_PRICE;

export const TICKET_META: Record<TicketCategory, { label: string; sub: string }> = {
  adult: { label: "Individual (13+)", sub: "Standard entry · Above 13 Years" },
  resident: { label: "Alimos resident", sub: "Proof required at gate" },
  child: { label: "Child (6–12)", sub: "Under 6 free" },
  senior: { label: "Senior 65+", sub: "ID required" },
};

export function cartSubtotal(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ---------- Seasonal / day-of-week pricing ----------
   Resolve a zone's effective price on a given date from its base price and the
   admin's pricing rules. Pure + framework-agnostic so the Availability screen
   (and, later, the booking flow) can share one source of truth. */

/** A date is a weekend if it's Saturday or Sunday. */
function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

/** Does `days` cover the weekday of `date`? */
export function dayMatches(days: PriceRuleDays, date: Date): boolean {
  if (days === "all") return true;
  return days === "weekend" ? isWeekend(date) : !isWeekend(date);
}

/** Parse an ISO `YYYY-MM-DD` at local noon (avoids TZ off-by-one on weekday). */
function isoToDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

/** Does a date window (range + weekdays, or an explicit date list) cover `dateISO`? */
export function windowMatches(w: { from: string; to: string; days: PriceRuleDays; dow?: number[]; dates?: string[] }, dateISO: string): boolean {
  if (w.dates?.length) return w.dates.includes(dateISO);
  if (dateISO < w.from || dateISO > w.to) return false; // ISO dates sort lexically
  return w.dow?.length ? w.dow.includes(isoToDate(dateISO).getDay()) : dayMatches(w.days, isoToDate(dateISO));
}

/** Does this rule apply to `zoneId` on `dateISO` (YYYY-MM-DD)? Conditional
 *  kinds (early-bird, last-minute, multi-day) also need a booking context. */
export function ruleMatches(rule: PriceRule, zoneId: string, dateISO: string): boolean {
  if (!rule.enabled) return false;
  if (rule.zone !== "all" && rule.zone !== zoneId) return false;
  return windowMatches(rule, dateISO);
}

/** Who is booking, when, and for how long — drives the conditional rules. */
export interface PriceContext {
  /** Day the booking is made (ISO). */
  bookedOn?: string;
  /** Clock time of the booking, "HH:MM". */
  time?: string;
  /** Consecutive days in the stay. */
  stayDays?: number;
}
const daysBetween = (a: string, b: string) => Math.round((isoToDate(b).getTime() - isoToDate(a).getTime()) / 86400000);
/** A conditional rule applies only when its booking condition is met. */
export function conditionMet(rule: PriceRule, dateISO: string, ctx?: PriceContext): boolean {
  switch (rule.kind ?? "standard") {
    case "standard":
      return true;
    case "earlybird":
      return !!ctx?.bookedOn && daysBetween(ctx.bookedOn, dateISO) >= (rule.lead ?? 14);
    case "lastminute":
      return !!ctx?.bookedOn && ctx.bookedOn === dateISO && !!ctx.time && ctx.time >= (rule.after ?? "12:00");
    case "multiday":
      return (ctx?.stayDays ?? 1) >= (rule.minDays ?? 3);
  }
}
export const RULE_KIND_LABEL: Record<NonNullable<PriceRule["kind"]>, string> = {
  standard: "Price rule",
  earlybird: "Early-bird",
  lastminute: "Last-minute",
  multiday: "Multi-day",
};

/** Apply one rule to a running price. */
function applyRule(base: number, rule: PriceRule): number {
  if (rule.mode === "set") return rule.amount;
  if (rule.mode === "addAbs") return base + rule.amount;
  return base * (1 + rule.amount / 100);
}

/** The effective price for a zone on a date: base, with every matching rule
 *  applied in order (later rules compound on earlier ones). Never negative. */
export function effectivePrice(base: number, zoneId: string, dateISO: string, rules: readonly PriceRule[]): number {
  let price = base;
  for (const r of rules) if (ruleMatches(r, zoneId, dateISO) && (r.kind ?? "standard") === "standard" && !r.cats?.length) price = applyRule(price, r);
  return Math.max(0, round2(price));
}

/** A short human description of a rule's price effect, e.g. "Set to €40",
 *  "+€10", "−10%". */
export function ruleEffectLabel(rule: PriceRule): string {
  if (rule.mode === "set") return `Set to €${rule.amount}`;
  const sign = rule.amount < 0 ? "−" : "+";
  const mag = Math.abs(rule.amount);
  return rule.mode === "addAbs" ? `${sign}€${mag}` : `${sign}${mag}%`;
}

/* ---------- Per-sunbed price resolution (AENR-469) ----------
   Precedence, highest first:
     1. a sunbed-specific date override (latest one wins),
     2. zone / date rules (seasonal & weekday rules) applied on top of…
     3. …the sunbed's price category, else
     4. the set's own default price.
   Returns the price plus a human-readable trace of how it was reached. */
export interface PriceTrace {
  price: number;
  steps: string[];
  source: "override" | "rule" | "category" | "base";
}
export function overrideFor(slotId: string, zoneId: string, dateISO: string, overrides: readonly PriceOverride[]): PriceOverride | undefined {
  let hit: PriceOverride | undefined;
  for (const o of overrides) {
    if (o.zoneId !== zoneId || !o.setIds.includes(slotId)) continue;
    if (dateISO < o.from || dateISO > o.to || !dayMatches(o.days, isoToDate(dateISO))) continue;
    hit = o; // later overrides win
  }
  return hit;
}
export function resolvePrice(
  slot: Pick<SunbedSlot, "id" | "price" | "cat">,
  zoneId: string,
  dateISO: string,
  pricing: Pick<BeachPricing, "categories" | "overrides">,
  rules: readonly PriceRule[],
  ctx?: PriceContext,
): PriceTrace {
  const ov = overrideFor(slot.id, zoneId, dateISO, pricing.overrides);
  if (ov) return { price: ov.price, steps: [`€${ov.price} · date override “${ov.label}” (${ov.from} → ${ov.to})`], source: "override" };
  const cat = slot.cat ? pricing.categories.find((c) => c.id === slot.cat && c.zoneId === zoneId) : undefined;
  const base = cat ? cat.price : slot.price;
  const steps = [cat ? `€${base} · ${cat.name} (${cat.code}) category` : `€${base} · set default price`];
  let price = base;
  for (const r of rules) {
    if (!ruleMatches(r, zoneId, dateISO)) continue;
    if (r.cats?.length && !(slot.cat && r.cats.includes(slot.cat))) continue;
    if (!conditionMet(r, dateISO, ctx)) continue;
    price = applyRule(price, r);
    const kind = r.kind && r.kind !== "standard" ? `${RULE_KIND_LABEL[r.kind]} ` : "";
    steps.push(`${ruleEffectLabel(r)} · ${kind}rule “${r.label}” → €${round2(price)}`);
  }
  price = Math.max(0, round2(price));
  return { price, steps, source: steps.length > 1 ? "rule" : cat ? "category" : "base" };
}

/* ---------- Booking restrictions (AENR-511) ----------
   Per-date blocks (closed, booking window, same-day cut-off) and stay-length
   rules (minimum / maximum consecutive days), for a zone and a set of dates. */
export interface RestrictionCheck {
  ok: boolean;
  /** Dates that can't be booked at all, with the reason. */
  blocked: Record<string, string>;
  /** Stay-length problems for the chosen dates. */
  reasons: string[];
}
const fmtShort = (iso: string) => isoToDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export function restrictionApplies(r: Restriction, zoneId: string, dateISO: string): boolean {
  return r.enabled && (r.zone === "all" || r.zone === zoneId) && windowMatches(r, dateISO);
}
/** Why a single date can't be booked online (or null). */
export function dateBlock(zoneId: string, dateISO: string, restrictions: readonly Restriction[], today: string, nowTime: string): string | null {
  for (const r of restrictions) {
    if (!restrictionApplies(r, zoneId, dateISO)) continue;
    if (r.kind === "closed") return r.label || "Beach closed";
    if (r.kind === "window" && daysBetween(today, dateISO) > (r.value ?? 30)) return `Bookable up to ${r.value} days ahead`;
    if (r.kind === "cutoff" && dateISO === today && nowTime >= (r.time ?? "11:00")) return `Same-day online booking closes at ${r.time}`;
  }
  return null;
}
export function checkRestrictions(zoneId: string, dates: readonly string[], restrictions: readonly Restriction[], today: string, nowTime: string): RestrictionCheck {
  const blocked: Record<string, string> = {};
  for (const d of dates) {
    const b = dateBlock(zoneId, d, restrictions, today, nowTime);
    if (b) blocked[d] = b;
  }
  // Consecutive runs of the chosen dates.
  const sorted = [...dates].sort();
  const runs: string[][] = [];
  sorted.forEach((d) => { const last = runs[runs.length - 1]; if (last && daysBetween(last[last.length - 1], d) === 1) last.push(d); else runs.push([d]); });
  const reasons = new Set<string>();
  for (const run of runs) {
    for (const d of run) {
      for (const r of restrictions) {
        if (!restrictionApplies(r, zoneId, d)) continue;
        if (r.kind === "minDays" && run.length < (r.value ?? 2)) reasons.add(`${r.label || `Min ${r.value} days`} — ${fmtShort(d)} needs a stay of at least ${r.value} consecutive days`);
        if (r.kind === "maxDays" && run.length > (r.value ?? 7)) reasons.add(`${r.label || `Max ${r.value} days`} — stays including ${fmtShort(d)} can be at most ${r.value} days`);
      }
    }
  }
  return { ok: Object.keys(blocked).length === 0 && reasons.size === 0, blocked, reasons: [...reasons] };
}
export const RESTRICTION_LABEL: Record<RestrictionKind, string> = {
  minDays: "Minimum stay",
  maxDays: "Maximum stay",
  window: "Booking window",
  cutoff: "Same-day cut-off",
  closed: "Closed",
};
export function restrictionBadge(r: Restriction): string {
  if (r.kind === "minDays") return `Min ${r.value}d`;
  if (r.kind === "maxDays") return `Max ${r.value}d`;
  if (r.kind === "window") return `≤${r.value}d ahead`;
  if (r.kind === "cutoff") return `Cut-off ${r.time}`;
  return "Closed";
}

/* ---------- Demand pricing suggestions (AENR-513) ----------
   A deterministic suggestion inside the manager's band: busier dates (high
   occupancy on the books, booking faster than usual, close to the date) move
   the price toward the band's top; quiet ones toward the minimum. */
export interface DemandInput {
  /** Share of the category's sets already booked (0–1). */
  occupancy: number;
  daysOut: number;
  /** Booking pace vs the same weekday in recent weeks (1 = usual). */
  pace: number;
  weekend: boolean;
}
export interface DemandSuggestion {
  price: number;
  /** 0–1 position in the band. */
  pressure: number;
  reason: string;
}
export function suggestPrice(band: Pick<DemandBand, "wkMin" | "wkMax" | "weMin" | "weMax" | "step">, x: DemandInput): DemandSuggestion {
  const [min, max] = x.weekend ? [band.weMin, band.weMax] : [band.wkMin, band.wkMax];
  // Occupancy carries most weight; nearer dates trust it more; pace nudges either way.
  const near = x.daysOut <= 3 ? 0.12 : x.daysOut <= 7 ? 0.05 : 0;
  const pressure = Math.min(1, Math.max(0, (x.occupancy - 0.3) / 0.55 + near + (x.pace - 1) * 0.6));
  const step = band.step > 0 ? band.step : 1;
  const price = Math.min(max, Math.max(min, min + Math.round((pressure * (max - min)) / step) * step));
  const pct = Math.round(x.occupancy * 100);
  const paceTxt = Math.abs(x.pace - 1) < 0.05 ? "pace as usual" : `pace ${x.pace > 1 ? "+" : "−"}${Math.round(Math.abs(x.pace - 1) * 100)}% vs usual`;
  const where = pressure >= 0.75 ? "near the top of the band" : pressure <= 0.05 ? "the band minimum" : "inside the band";
  return { price, pressure, reason: `${pct}% booked ${x.daysOut} day${x.daysOut === 1 ? "" : "s"} out, ${paceTxt} — ${where}` };
}
