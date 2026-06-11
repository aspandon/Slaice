/**
 * Pricing — the single source of truth for the per-unit prices and fees that
 * were previously duplicated across Checkout, the wizard and the standalone
 * customer screens. Centralising them here kills drift (the wizard and the
 * ticket screen can no longer disagree on what an adult ticket costs) and gives
 * the future backend one obvious contract surface to take over.
 */

import type { CartItem, PriceRule, PriceRuleDays, TicketCategory } from "./types";

/** Mock economics, mirrors the Checkout summary. */
export const SLAICE_FEE_RATE = 0.05; // Slaice application fee
export const STRIPE_FEE_RATE = 0.015; // ~Stripe processing

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

export interface CartTotals {
  subtotal: number;
  stripeFee: number;
  slaiceFee: number;
  /** What the tenant nets after Stripe + Slaice fees. */
  tenantNet: number;
  /** What Slaice nets (the application fee). */
  slaiceNet: number;
}

export function cartSubtotal(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

export function priceCart(items: readonly CartItem[]): CartTotals {
  const subtotal = cartSubtotal(items);
  const stripeFee = round2(subtotal * STRIPE_FEE_RATE);
  const slaiceFee = round2(subtotal * SLAICE_FEE_RATE);
  return {
    subtotal,
    stripeFee,
    slaiceFee,
    tenantNet: round2(subtotal - stripeFee - slaiceFee),
    slaiceNet: slaiceFee,
  };
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

/** Does this rule apply to `zoneId` on `dateISO` (YYYY-MM-DD)? */
export function ruleMatches(rule: PriceRule, zoneId: string, dateISO: string): boolean {
  if (!rule.enabled) return false;
  if (rule.zone !== "all" && rule.zone !== zoneId) return false;
  if (dateISO < rule.from || dateISO > rule.to) return false; // ISO dates sort lexically
  return dayMatches(rule.days, isoToDate(dateISO));
}

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
  for (const r of rules) if (ruleMatches(r, zoneId, dateISO)) price = applyRule(price, r);
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
