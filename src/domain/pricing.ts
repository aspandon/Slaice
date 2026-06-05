/**
 * Pricing — the single source of truth for the per-unit prices and fees that
 * were previously duplicated across Checkout, the wizard and the standalone
 * customer screens. Centralising them here kills drift (the wizard and the
 * ticket screen can no longer disagree on what an adult ticket costs) and gives
 * the future backend one obvious contract surface to take over.
 */

import type { CartItem, TicketCategory } from "./types";

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
