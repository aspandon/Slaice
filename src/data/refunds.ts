// Refund history (AENR-546): one row per refund, generated from the same day
// figures as Reporting (dayStats().refunds), so the Refunds list, its count,
// amount, rate and top reason all come from one set of rows. The hand-written
// seed refunds keep their place on their dates as part of that day's count.

import { dayStats } from "./analytics";
import { ADMIN_REFUNDS, CUSTOMERS, type AdminRefund } from "./mock";
import { DEMO_TODAY, eachDay, fmtDay, isoFromDayMonth, type DateRange } from "../domain/period";

/** Reasons an operator can pick; the history uses the same list. */
export const REFUND_REASONS = [
  "Weather",
  "Double booking",
  "Customer request",
  "Service issue",
] as const;
const WEIGHTS = [0.42, 0.18, 0.27, 0.13];

/** "Weather (rain)" → "Weather": the reason as reported, without the detail. */
export const reasonGroup = (reason: string) => reason.replace(/\s*\(.*\)$/, "");

function rnd(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  h ^= h << 13;
  h ^= h >>> 17;
  return ((h >>> 0) % 10000) / 10000;
}
const pickReason = (key: string) => {
  let x = rnd(key);
  for (let i = 0; i < WEIGHTS.length; i++) {
    x -= WEIGHTS[i];
    if (x < 0) return REFUND_REASONS[i];
  }
  return REFUND_REASONS[0];
};

const SEEDS = ADMIN_REFUNDS.filter((r) => r.status === "Refunded");
/** Requests still awaiting a decision (not refunded yet, so not in the totals). */
export const PENDING_REFUNDS = ADMIN_REFUNDS.filter((r) => !r.status);

const cache = new Map<string, AdminRefund[]>();
/** Refunds issued on one day — their amounts add up to that day's refund total. */
export function refundsOn(iso: string): AdminRefund[] {
  const hit = cache.get(iso);
  if (hit) return hit;
  const { count, amount } = dayStats(iso).refunds;
  const seeds = SEEDS.filter((s) => isoFromDayMonth(s.date) === iso).slice(0, count);
  const rest = count - seeds.length;
  let left = amount - seeds.reduce((a, s) => a + s.amount, 0);
  const rows: AdminRefund[] = [...seeds];
  for (let i = 0; i < rest; i++) {
    const last = i === rest - 1;
    const avg = left / (rest - i);
    const amt = last ? left : Math.max(8, Math.round(avg * (0.75 + rnd(`${iso}a${i}`) * 0.5)));
    left -= amt;
    const c = CUSTOMERS[Math.floor(rnd(`${iso}c${i}`) * CUSTOMERS.length)];
    rows.push({
      tx: `#TX-${String(70000 + Math.floor(rnd(`${iso}t${i}`) * 9999)).padStart(5, "0")}`,
      who: c.first,
      amount: Math.max(1, amt),
      reason: pickReason(`${iso}r${i}`),
      status: "Refunded",
      date: fmtDay(iso),
    });
  }
  cache.set(iso, rows);
  return rows;
}

/** Every refund issued in the range (newest first); "all dates" = the season to date. */
export function refundHistory(range: DateRange | null): AdminRefund[] {
  const r = range ?? { from: "2026-05-01", to: DEMO_TODAY };
  const to = r.to > DEMO_TODAY ? DEMO_TODAY : r.to;
  if (to < r.from) return [];
  return eachDay({ from: r.from, to }).reverse().flatMap(refundsOn);
}

export interface RefundStats {
  count: number;
  amount: number;
  top: { reason: string; share: number } | null;
}
/** Count, amount and top reason over the refunded rows of a list. */
export function refundStats(rows: readonly AdminRefund[]): RefundStats {
  const done = rows.filter((r) => r.status === "Refunded" || r.status === "Voided");
  const amount = done.reduce((a, r) => a + (r.refundAmount ?? r.amount), 0);
  const by = new Map<string, number>();
  for (const r of done)
    if (r.reason)
      for (const x of r.reason.split(", "))
        by.set(reasonGroup(x), (by.get(reasonGroup(x)) ?? 0) + 1);
  const tagged = [...by.values()].reduce((a, b) => a + b, 0);
  const best = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    count: done.length,
    amount,
    top: best ? { reason: best[0], share: best[1] / tagged } : null,
  };
}
