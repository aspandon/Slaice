// Cashier till (AENR-493): basket, tenders, sales, refunds, shifts and the
// per-day sunbed status the till drives. Pure, framework-agnostic functions —
// the screens render, these decide. Everything is demo state in the app store.

import type { TicketCategory } from "./types";

/* ---------- Basket ---------- */
export interface TillLine {
  id: string;
  kind: "ticket" | "sunbed" | "locker";
  label: string;
  qty: number;
  /** Unit price before discounts. */
  unit: number;
  cat?: TicketCategory;
  zoneId?: string;
  setId?: string;
  /** Locker bank and the locker codes handed out (AENR-531). */
  bank?: string;
  codes?: string[];
  /** Bundle the line came from — the basket shows the bundle as one line. */
  bundle?: string;
}
export interface TillDiscount {
  id: string;
  label: string;
  reason: string;
  kind: "pct" | "abs";
  value: number;
  /** Line it applies to; absent = the whole basket. */
  lineId?: string;
  /** Promo code it came from, if any. */
  code?: string;
  /** Who approved an open-amount discount (manager PIN). */
  approver?: string;
}

/* ---------- Payment ---------- */
export type TenderKind = "card" | "cash" | "voucher";
export interface Tender {
  kind: TenderKind;
  amount: number;
  /** Card: last 4 digits · voucher: code. */
  ref?: string;
  /** Cash handed over (≥ amount) — change = given − amount. */
  given?: number;
  /** POS terminal that took a card payment (AENR-527). */
  terminal?: string;
}
export type ReceiptChoice = "print" | "email" | "sms" | "qr" | "none";
export type MyDataStatus = "sent" | "pending" | "failed";

export interface TillRefund {
  id: string;
  at: string;
  kind: "void" | "refund";
  /** Refunded quantity per line id. */
  lines: Record<string, number>;
  amount: number;
  tender: "card" | "cash";
  reason: string;
  note?: string;
  approver?: string;
  /** Credit / cancellation document number transmitted to myDATA. */
  doc: string;
  shiftId: string | null;
}

export interface TillSale {
  id: string; // receipt number, e.g. R-1042
  apy: string; // ΑΠΥ series/number
  mark: string; // myDATA MARK ("" while pending)
  at: string; // ISO timestamp
  day: string; // business day (ISO date) — drives sunbed status
  shiftId: string | null;
  cashier: string;
  lines: TillLine[];
  discounts: TillDiscount[];
  total: number;
  tenders: Tender[];
  customer?: { name: string; phone: string; guestId?: number };
  receipt: ReceiptChoice;
  mydata: MyDataStatus;
  /** Sold while the till was offline; cleared when synced. */
  offline?: boolean;
  /** A sunbed in this offline sale was booked online meanwhile. */
  conflict?: string;
  refunds: TillRefund[];
  reprints?: number;
  /** Who sold it: the Cashier till (default), a Controller or a Support Agent on the beach. */
  channel?: "cashier" | "controller" | "support";
}

/* ---------- Shift / cash drawer ---------- */
export interface DrawerMove {
  id: string;
  at: string;
  kind: "in" | "out" | "nosale";
  amount: number;
  reason: string;
  approver?: string;
}
export interface TillShift {
  id: string;
  cashier: string;
  till: string;
  openedAt: string;
  float: number;
  moves: DrawerMove[];
  closedAt?: string;
  counted?: number;
  note?: string;
  blind?: boolean;
}

export interface TillState {
  sales: TillSale[];
  /** Sets held by a till basket: setId → expiry (ms epoch) + business day. */
  holds: Record<string, { day: string; until: number; by: string }>;
  shift: TillShift | null;
  shifts: TillShift[];
  /** Voucher / gift-card balances by code. */
  vouchers: Record<string, number>;
  promoUses: Record<string, number>;
  offline: boolean;
  /** Demo: the next myDATA transmission fails. */
  failNextMydata: boolean;
  /** Last POS terminal used at this till (AENR-527). */
  terminal?: string;
  /** Sets booked online while this till was offline (setId → day) — sync conflicts. */
  onlineSold: Record<string, string>;
  seq: number;
}

/* ---------- Money ---------- */
export const VAT_RATE = 0.24;
/** VAT per line kind (demo rates — the accountant confirms the tenant's real ones). */
export const VAT_BY_KIND: Record<TillLine["kind"], number> = { sunbed: 0.24, ticket: 0.13, locker: 0.24 };
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const eur = (n: number) => `€${Number.isInteger(r2(n)) ? r2(n) : r2(n).toFixed(2)}`;

export const lineGross = (l: TillLine) => r2(l.unit * l.qty);

/** Amount a discount takes off, capped at what it applies to. */
export function discountAmount(d: TillDiscount, lines: readonly TillLine[]): number {
  const target = d.lineId ? lines.find((l) => l.id === d.lineId) : undefined;
  const base = d.lineId
    ? target
      ? lineGross(target)
      : 0
    : lines.reduce((a, l) => a + lineGross(l), 0);
  const v = d.kind === "pct" ? (base * d.value) / 100 : d.value;
  return r2(Math.min(base, Math.max(0, v)));
}

export interface BasketTotals {
  gross: number;
  discount: number;
  total: number;
  net: number;
  vat: number;
}
export function basketTotals(
  lines: readonly TillLine[],
  discounts: readonly TillDiscount[],
): BasketTotals {
  const gross = r2(lines.reduce((a, l) => a + lineGross(l), 0));
  const discount = r2(
    Math.min(
      gross,
      discounts.reduce((a, d) => a + discountAmount(d, lines), 0),
    ),
  );
  const total = r2(gross - discount);
  const rates = vatBreakdown(lines, discount);
  const vat = r2(rates.reduce((a, r) => a + r.vat, 0));
  return { gross, discount, total, net: r2(total - vat), vat };
}

/** Net and VAT per rate, with the discount spread over the lines by value. */
export function vatBreakdown(lines: readonly TillLine[], discount = 0): { rate: number; net: number; vat: number }[] {
  const gross = lines.reduce((a, l) => a + lineGross(l), 0);
  const by = new Map<number, number>();
  for (const l of lines) {
    const share = gross ? lineGross(l) * (1 - discount / gross) : 0;
    const rate = VAT_BY_KIND[l.kind] ?? VAT_RATE;
    by.set(rate, (by.get(rate) ?? 0) + share);
  }
  return [...by.entries()].sort((a, b) => b[0] - a[0]).map(([rate, inc]) => {
    const net = r2(inc / (1 + rate));
    return { rate, net, vat: r2(inc - net) };
  });
}

export const paidSoFar = (tenders: readonly Tender[]) =>
  r2(tenders.reduce((a, t) => a + t.amount, 0));
export const changeDue = (tenders: readonly Tender[]) =>
  r2(tenders.reduce((a, t) => a + (t.kind === "cash" && t.given ? t.given - t.amount : 0), 0));

/* ---------- Promo codes ---------- */
export interface PromoCode {
  code: string;
  label: string;
  kind: "pct" | "abs";
  value: number;
  from: string;
  to: string;
  /** Zone ids it is valid for; absent = every zone (applies to sunbeds only when set). */
  zones?: string[];
  minSpend?: number;
  limit?: number;
}
export type PromoResult = { ok: true; discount: TillDiscount } | { ok: false; reason: string };

export function validatePromo(
  codeIn: string,
  codes: readonly PromoCode[],
  lines: readonly TillLine[],
  day: string,
  uses: Record<string, number>,
  zoneNames: Record<string, string>,
): PromoResult {
  const code = codeIn.trim().toUpperCase();
  const p = codes.find((c) => c.code === code);
  if (!p) return { ok: false, reason: `“${code}” isn’t a valid code.` };
  if (day < p.from || day > p.to)
    return {
      ok: false,
      reason: `${code} expired or not active today (valid ${p.from} → ${p.to}).`,
    };
  if (p.limit !== undefined && (uses[code] ?? 0) >= p.limit)
    return { ok: false, reason: `${code} has reached its usage limit.` };
  const { gross } = basketTotals(lines, []);
  if (p.minSpend && gross < p.minSpend)
    return { ok: false, reason: `${code} needs a minimum spend of €${p.minSpend}.` };
  if (p.zones) {
    const target = lines.find(
      (l) => l.kind === "sunbed" && l.zoneId && p.zones!.includes(l.zoneId),
    );
    if (!target) {
      const names = p.zones.map((z) => zoneNames[z] ?? z).join(", ");
      const other = lines.find((l) => l.kind === "sunbed");
      return {
        ok: false,
        reason: other
          ? `${code} is valid for ${names} only — not ${zoneNames[other.zoneId ?? ""] ?? "this store"}.`
          : `${code} applies to a sunbed set in ${names}.`,
      };
    }
    return {
      ok: true,
      discount: {
        id: `d-${code}`,
        label: `${code} · ${p.label}`,
        reason: "Promo code",
        kind: p.kind,
        value: p.value,
        lineId: target.id,
        code,
      },
    };
  }
  return {
    ok: true,
    discount: {
      id: `d-${code}`,
      label: `${code} · ${p.label}`,
      reason: "Promo code",
      kind: p.kind,
      value: p.value,
      code,
    },
  };
}

/* ---------- Refunds ---------- */
/** Same open shift → void (cancel before settlement); otherwise refund. */
export const refundMode = (sale: TillSale, shift: TillShift | null): "void" | "refund" =>
  shift && !shift.closedAt && sale.shiftId === shift.id ? "void" : "refund";

export function refundedQty(sale: TillSale, lineId: string): number {
  return sale.refunds.reduce((a, r) => a + (r.lines[lineId] ?? 0), 0);
}
export const refundedTotal = (sale: TillSale) => r2(sale.refunds.reduce((a, r) => a + r.amount, 0));

/** What refunding `qty` of each line is worth, after the sale's discounts (pro rata). */
export function refundValue(sale: TillSale, pick: Record<string, number>): number {
  const { gross, total } = basketTotals(sale.lines, sale.discounts);
  const ratio = gross ? total / gross : 0;
  const raw = sale.lines.reduce((a, l) => a + (pick[l.id] ?? 0) * l.unit, 0);
  return r2(Math.min(total - refundedTotal(sale), raw * ratio));
}

export type SaleStatus = "Completed" | "Voided" | "Refunded" | "Part refunded";
export function saleStatus(sale: TillSale): SaleStatus {
  if (!sale.refunds.length) return "Completed";
  const all = sale.lines.every((l) => refundedQty(sale, l.id) >= l.qty);
  if (!all) return "Part refunded";
  return sale.refunds.every((r) => r.kind === "void") ? "Voided" : "Refunded";
}

/* ---------- Sunbed status for a business day ---------- */
export type SetStatus = "sold" | "hold";
/** Sets sold (not refunded) or held by a till basket on `day`. */
export function tillSetStatus(
  till: Pick<TillState, "sales" | "holds" | "onlineSold">,
  day: string,
  now: number,
): Record<string, SetStatus> {
  const out: Record<string, SetStatus> = {};
  for (const [id, d] of Object.entries(till.onlineSold)) if (d === day) out[id] = "sold";
  for (const [id, h] of Object.entries(till.holds))
    if (h.day === day && h.until > now) out[id] = "hold";
  for (const s of till.sales) {
    if (s.day !== day) continue;
    for (const l of s.lines) if (l.setId && refundedQty(s, l.id) < l.qty) out[l.setId] = "sold";
  }
  return out;
}

/* ---------- Shift totals (X / Z report) ---------- */
export interface ShiftTotals {
  sales: number;
  tx: number;
  cash: number;
  card: number;
  voucher: number;
  refundsCash: number;
  refundsCard: number;
  refunds: number;
  voids: number;
  discounts: number;
  paidIn: number;
  paidOut: number;
  noSales: number;
  expectedCash: number;
  tickets: Record<string, number>;
  sunbeds: Record<string, number>;
  /** Card takings per POS terminal (AENR-527). */
  terminals: Record<string, number>;
}
export function shiftTotals(shift: TillShift, sales: readonly TillSale[]): ShiftTotals {
  const t: ShiftTotals = {
    sales: 0,
    tx: 0,
    cash: 0,
    card: 0,
    voucher: 0,
    refundsCash: 0,
    refundsCard: 0,
    refunds: 0,
    voids: 0,
    discounts: 0,
    paidIn: 0,
    paidOut: 0,
    noSales: 0,
    expectedCash: 0,
    tickets: {},
    sunbeds: {},
    terminals: {},
  };
  for (const s of sales) {
    if (s.shiftId === shift.id) {
      t.tx++;
      t.sales += s.total;
      t.discounts += basketTotals(s.lines, s.discounts).discount;
      for (const td of s.tenders) {
        t[td.kind] += td.amount;
        if (td.kind === "card") t.terminals[td.terminal ?? "Terminal 1 · Entrance"] = (t.terminals[td.terminal ?? "Terminal 1 · Entrance"] ?? 0) + td.amount;
      }
      for (const l of s.lines) {
        if (l.kind === "ticket") t.tickets[l.label] = (t.tickets[l.label] ?? 0) + l.qty;
        else t.sunbeds[l.zoneId ?? "?"] = (t.sunbeds[l.zoneId ?? "?"] ?? 0) + l.qty;
      }
    }
    for (const r of s.refunds) {
      if (r.shiftId !== shift.id) continue;
      if (r.kind === "void") t.voids += r.amount;
      else t.refunds += r.amount;
      if (r.tender === "cash") t.refundsCash += r.amount;
      else t.refundsCard += r.amount;
    }
  }
  for (const m of shift.moves) {
    if (m.kind === "in") t.paidIn += m.amount;
    if (m.kind === "out") t.paidOut += m.amount;
    if (m.kind === "nosale") t.noSales++;
  }
  t.expectedCash = r2(shift.float + t.cash + t.paidIn - t.paidOut - t.refundsCash);
  (
    [
      "sales",
      "cash",
      "card",
      "voucher",
      "refunds",
      "voids",
      "discounts",
      "refundsCash",
      "refundsCard",
    ] as const
  ).forEach((k) => (t[k] = r2(t[k])));
  return t;
}

/** Variance above this needs a note at Z close. */
export const VARIANCE_TOLERANCE = 2;

/* ---------- Offline limits (terminal store-and-forward) ---------- */
export const OFFLINE_CARD_CAP = 50;
export const OFFLINE_CARD_TOTAL = 200;
export function offlineCardCheck(amount: number, sales: readonly TillSale[]): string | null {
  if (amount > OFFLINE_CARD_CAP)
    return `Offline card payments are limited to €${OFFLINE_CARD_CAP} per sale — take cash or wait for the connection.`;
  const used = sales
    .filter((s) => s.offline)
    .reduce(
      (a, s) => a + s.tenders.filter((t) => t.kind === "card").reduce((x, t) => x + t.amount, 0),
      0,
    );
  if (used + amount > OFFLINE_CARD_TOTAL)
    return `Offline card total would exceed €${OFFLINE_CARD_TOTAL} — take cash or wait for the connection.`;
  return null;
}

/* ---------- Document numbers ---------- */
export const receiptNo = (seq: number) => `R-${1000 + seq}`;
export const apyNo = (seq: number) => `ΑΠΥ Α-${2400 + seq}`;
export const creditNo = (seq: number) => `ΠΙΣ Α-${300 + seq}`;
export const fakeMark = (seq: number) => `4000${String(seq * 7919 + 1234567).padStart(11, "0")}`;

/** Overlay the live status on a zone's layout: sold → unavailable, held → on hold. */
export function applySetStatus<T extends { id: string; state: "a" | "h" | "u" }>(
  slots: readonly T[],
  status: Record<string, SetStatus>,
  closed = false,
): T[] {
  return slots.map((s) => {
    if (closed) return { ...s, state: "u" };
    const st = status[s.id];
    if (st === "sold") return { ...s, state: "u" };
    if (st === "hold" && s.state === "a") return { ...s, state: "h" };
    return s;
  });
}
