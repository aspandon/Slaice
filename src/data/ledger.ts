// Documents & payments for the Accountant (AENR-526): every fiscal document
// and every card transaction for a period, built from the same per-day,
// per-section figures as Reporting (so the totals reconcile) plus the real
// demo activity — till sales and refunds, online bookings and pay-by-link.

import { ZONES } from "./beach";
import { ENTRY_SECTION, sampleDay, sectionName } from "./finance";
import { DEMO_TODAY, addDays, type DateRange } from "../domain/period";
import { VAT_BY_KIND, lineGross, type TillSale, type VatRates } from "../domain/till";
import type { PlacedBooking } from "../domain/account";
import type { PayLink } from "../domain/payLink";

export type DocType = "ΑΠΥ" | "ΤΠΥ" | "ΠΑΠΥ" | "ΠΤΠΥ" | "Cancellation";
/** myDATA invoiceType codes for the accounting export. */
export const DOC_CODE: Record<DocType, string> = {
  ΑΠΥ: "11.1",
  ΤΠΥ: "2.1",
  ΠΑΠΥ: "11.4",
  ΠΤΠΥ: "5.1",
  Cancellation: "cancel",
};
export type DocStatus = "sent" | "pending" | "failed";
export type Channel = "Online" | "Cashier" | "Phone";
export interface DocLine {
  label: string;
  net: number;
  rate: number;
  vat: number;
}
export interface FiscalDoc {
  id: string;
  type: DocType;
  series: string;
  number: string;
  date: string;
  time: string;
  counterparty: string;
  vatNo?: string;
  section: string;
  channel: Channel;
  method: string;
  net: number;
  vat: number;
  total: number;
  mark: string;
  status: DocStatus;
  /** The document a credit / cancellation corrects, or the credits issued on this one. */
  original?: string;
  credits?: string[];
  lines: DocLine[];
  /** Receipt / booking the document belongs to (till sale, online booking, pay-by-link). */
  ref?: string;
  live?: boolean;
}
export interface Txn {
  id: string;
  date: string;
  time: string;
  ref: string;
  section: string;
  channel: Channel | "Walk-in";
  method: string;
  terminal?: string;
  amount: number;
  fee: number;
  net: number;
  payout: string;
  status: "captured" | "refunded" | "in payout" | "paid out";
  live?: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
function rnd(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  h ^= h << 13;
  h ^= h >>> 17;
  return ((h >>> 0) % 10000) / 10000;
}
const COMPANIES = [
  { n: "Aegean Events ΙΚΕ", v: "EL 801234901" },
  { n: "Blue Coast Travel ΑΕ", v: "EL 094567812" },
  { n: "Glyfada Sports Club", v: "EL 997012345" },
  { n: "Saronic Hotels ΑΕ", v: "EL 800456123" },
];
const BRANDS = ["Visa", "Mastercard", "Visa", "Amex", "Visa", "Mastercard"];
const hhmm = (k: string) =>
  `${String(9 + Math.floor(rnd(k) * 9)).padStart(2, "0")}:${String(Math.floor(rnd(k + "m") * 60)).padStart(2, "0")}`;
const mark = (k: string) => `4000010${String(Math.floor(rnd(k) * 1e11)).padStart(11, "0")}`;
const split = (gross: number, rate: number) => {
  const net = r2(gross / (1 + rate));
  return { net, vat: r2(gross - net) };
};
/** Payouts every 3 days from the period start, paid T+2 (same rule as Reporting). */
const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
export function payoutFor(date: string, from: string): { date: string; status: Txn["status"] } {
  const end = addDays(from, Math.floor(dayDiff(from, date) / 3) * 3 + 2);
  const pay = addDays(end, 2);
  return {
    date: pay,
    status:
      pay > DEMO_TODAY ? "captured" : pay >= addDays(DEMO_TODAY, -1) ? "in payout" : "paid out",
  };
}

/* ---------- Documents ---------- */
export function documents(
  range: DateRange,
  section: string | null,
  live: { sales: readonly TillSale[]; online: readonly PlacedBooking[]; links: readonly PayLink[]; vat?: VatRates },
): FiscalDoc[] {
  // The tenant's VAT per service (AENR-728); a till sale keeps the rates it was charged at.
  const V = live.vat ?? VAT_BY_KIND;
  const out: FiscalDoc[] = [];
  let seq = 4000;
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    const day = sampleDay(d);
    for (const [sec, v] of Object.entries(day)) {
      if (section && sec !== section) continue;
      const avg = v.tx ? v.captured / v.tx : 30;
      const issued: FiscalDoc[] = [];
      const make = (type: DocType, i: number, k: string, lastPending: boolean): FiscalDoc => {
        const total = r2(Math.max(6, avg * (0.55 + rnd(k) * 0.9)) * (type === "ΤΠΥ" ? 3 : 1));
        const sun = r2(total * 0.7);
        const tk = r2(total - sun);
        const l1 = {
          label: "Sunbed set",
          ...split(sun, V.sunbed),
          rate: V.sunbed,
        };
        const l2 = {
          label: "Entry tickets",
          ...split(tk, V.ticket),
          rate: V.ticket,
        };
        const co = COMPANIES[Math.floor(rnd(k + "co") * COMPANIES.length)];
        const ch: Channel =
          rnd(k + "ch") < 0.55 ? "Online" : rnd(k + "ch2") < 0.75 ? "Cashier" : "Phone";
        const status: DocStatus = lastPending
          ? rnd(k + "f") < 0.15
            ? "failed"
            : "pending"
          : "sent";
        const series = type === "ΤΠΥ" ? "Τ" : "Α";
        const number = String(++seq);
        return {
          id: `${type}-${d}-${sec}-${i}`,
          type,
          series,
          number,
          date: d,
          time: hhmm(k),
          section: sec,
          counterparty: type === "ΤΠΥ" ? co.n : "Retail customer",
          vatNo: type === "ΤΠΥ" ? co.v : undefined,
          channel: ch,
          method:
            ch === "Cashier" && rnd(k + "c") < 0.4
              ? "Cash"
              : `${BRANDS[Math.floor(rnd(k + "b") * BRANDS.length)]} ···${String(1000 + Math.floor(rnd(k + "l") * 9000))}`,
          net: r2(l1.net + l2.net),
          vat: r2(l1.vat + l2.vat),
          total,
          mark: status === "sent" ? mark(k) : "",
          status,
          lines: [l1, l2],
        };
      };
      const n = v.docs.apy + v.docs.tpy;
      for (let i = 0; i < n; i++)
        issued.push(make(i < v.docs.tpy ? "ΤΠΥ" : "ΑΠΥ", i, `${d}${sec}${i}`, i >= n - v.pending));
      out.push(...issued);
      // Credits / cancellations correct one of the day's documents, linked both ways.
      const credit = (kind: "receipt" | "invoice", j: number) => {
        const pool = issued.filter((x) =>
          kind === "invoice" ? x.type === "ΤΠΥ" : x.type === "ΑΠΥ",
        );
        const orig = pool[Math.floor(rnd(`${d}${sec}c${j}`) * pool.length)];
        if (!orig) return;
        const cancel = kind === "receipt" && rnd(`${d}${sec}x${j}`) < 0.3;
        const type: DocType = cancel ? "Cancellation" : kind === "invoice" ? "ΠΤΠΥ" : "ΠΑΠΥ";
        const k = `${d}${sec}cr${j}`;
        const doc: FiscalDoc = {
          ...orig,
          id: `${type}-${d}-${sec}-${j}`,
          type,
          series: cancel ? "ΑΚ" : kind === "invoice" ? "ΠΤ" : "ΠΑ",
          number: String(++seq),
          time: hhmm(k),
          net: -orig.net,
          vat: -orig.vat,
          total: -orig.total,
          mark: mark(k),
          status: "sent",
          original: `${orig.series}-${orig.number}`,
          lines: orig.lines.map((l) => ({ ...l, net: -l.net, vat: -l.vat })),
        };
        orig.credits = [...(orig.credits ?? []), `${doc.series}-${doc.number}`];
        out.push(doc);
      };
      for (let j = 0; j < v.docs.papy; j++) credit("receipt", j);
      for (let j = 0; j < v.docs.ptpy; j++) credit("invoice", j);
    }
  }
  // Live demo documents on the back-office day.
  if (DEMO_TODAY >= range.from && DEMO_TODAY <= range.to) {
    for (const s of live.sales) {
      const sec = s.lines.find((l) => l.zoneId)?.zoneId ?? ENTRY_SECTION.id;
      if (section && sec !== section) continue;
      const lines = s.lines.map((l) => {
        const rate = (s.vat ?? V)[l.kind] ?? 0.24;
        return { label: l.label, rate, ...split(lineGross(l), rate) };
      });
      const net = r2(lines.reduce((a, l) => a + l.net, 0));
      const card = s.tenders.find((t) => t.kind === "card");
      const base: FiscalDoc = {
        id: `live-${s.id}`,
        type: "ΑΠΥ",
        series: s.apy.split("-")[0] ?? "Α",
        number: s.apy.split("-")[1] ?? s.apy,
        date: DEMO_TODAY,
        time: s.at.slice(11, 16),
        section: sec,
        counterparty: s.customer?.name ?? "Retail customer",
        channel: "Cashier",
        method: card
          ? `Card ···${card.ref ?? ""}${card.terminal ? ` · ${card.terminal.split(" · ")[0]}` : ""}`
          : s.tenders.map((t) => t.kind).join(" + "),
        net,
        vat: r2(s.total - net),
        total: s.total,
        mark: s.mark,
        status: s.mydata === "sent" ? "sent" : s.mydata === "failed" ? "failed" : "pending",
        lines,
        live: true,
        ref: s.id,
        credits: s.refunds.map((r) => r.doc),
      };
      out.push(base);
      for (const r of s.refunds) {
        const ratio = s.total ? r.amount / s.total : 0;
        out.push({
          ...base,
          id: `live-${s.id}-${r.id}`,
          type: r.kind === "void" ? "Cancellation" : "ΠΑΠΥ",
          series: r.doc.split("-")[0] ?? "ΠΑ",
          number: r.doc.split("-")[1] ?? r.doc,
          time: r.at.slice(11, 16),
          net: -r2(net * ratio),
          vat: -r2((s.total - net) * ratio),
          total: -r.amount,
          mark: mark(r.doc),
          status: "sent",
          original: s.apy,
          credits: undefined,
          method: r.tender === "card" ? "Card refund" : "Cash refund",
          lines: lines.map((l) => ({ ...l, net: -r2(l.net * ratio), vat: -r2(l.vat * ratio) })),
        });
      }
    }
    const onlineDoc = (
      id: string,
      sec: string,
      total: number,
      who: string,
      label: string,
    ): FiscalDoc => {
      const { net, vat } = split(total, V.sunbed);
      return {
        id: `live-${id}`,
        type: "ΑΠΥ",
        series: "Α",
        number: id,
        date: DEMO_TODAY,
        time: "—",
        section: sec,
        counterparty: who,
        channel: "Online",
        method: "Card (Stripe)",
        net,
        vat,
        total,
        mark: mark(id),
        status: "sent",
        lines: [{ label, net, vat, rate: V.sunbed }],
        live: true,
        ref: id,
      };
    };
    for (const b of live.online) {
      const sec = b.items.find((i) => i.zoneId)?.zoneId ?? ENTRY_SECTION.id;
      if (!section || sec === section)
        out.push(
          onlineDoc(
            b.ref,
            sec,
            b.total,
            `${b.guest.first} ${b.guest.last}`,
            `Online booking ${b.ref}`,
          ),
        );
    }
    for (const l of live.links.filter((x) => x.closed === "paid")) {
      const sec = l.lines.find((x) => x.zoneId)?.zoneId ?? ENTRY_SECTION.id;
      if (!section || sec === section)
        out.push({
          ...onlineDoc(
            l.id,
            sec,
            l.total,
            l.guest.name,
            `${l.mode === "card" ? "Card by phone" : l.mode === "unpaid" ? "Paid on arrival" : "Pay-by-link"} ${l.id}`,
          ),
          channel: "Phone",
        });
    }
  }
  return out.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

/* ---------- Payments: one row per card charge; sums equal Reporting › Payments ---------- */
export function transactions(
  range: DateRange,
  section: string | null,
  sales: readonly TillSale[],
  stripePct: number,
): Txn[] {
  const out: Txn[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    const day = sampleDay(d);
    for (const [sec, v] of Object.entries(day)) {
      if (section && sec !== section) continue;
      if (!v.tx) continue;
      // Split the captured value into v.tx charges that add up exactly.
      const weights = Array.from({ length: v.tx }, (_, i) => 0.5 + rnd(`${d}${sec}w${i}`));
      const wsum = weights.reduce((a, w) => a + w, 0);
      let left = v.captured;
      weights.forEach((w, i) => {
        const k = `${d}${sec}t${i}`;
        const amount = i === v.tx - 1 ? r2(left) : r2((v.captured * w) / wsum);
        left = r2(left - amount);
        const chR = rnd(k + "ch");
        const channel: Txn["channel"] =
          chR < 0.6 ? "Online" : chR < 0.72 ? "Phone" : chR < 0.88 ? "Cashier" : "Walk-in";
        const p = payoutFor(d, range.from);
        const refunded = rnd(k + "rf") < 0.02;
        const fee = r2(amount * stripePct);
        out.push({
          id: `ch_${d.replace(/-/g, "")}${sec.slice(0, 2)}${i}`,
          date: d,
          time: hhmm(k),
          ref: `BK-${20000 + Math.floor(rnd(k + "r") * 9000)}`,
          section: sec,
          channel,
          method: `${BRANDS[Math.floor(rnd(k + "b") * BRANDS.length)]} ···${String(1000 + Math.floor(rnd(k + "l") * 9000))}`,
          terminal:
            channel === "Cashier" || channel === "Walk-in"
              ? `Terminal ${1 + Math.floor(rnd(k + "tm") * 3)}`
              : undefined,
          amount,
          fee,
          net: r2(amount - fee),
          payout: p.date,
          status: refunded ? "refunded" : p.status,
        });
      });
    }
  }
  if (DEMO_TODAY >= range.from && DEMO_TODAY <= range.to) {
    for (const s of sales) {
      const sec = s.lines.find((l) => l.zoneId)?.zoneId ?? ENTRY_SECTION.id;
      if (section && sec !== section) continue;
      for (const t of s.tenders.filter((x) => x.kind === "card")) {
        const fee = r2(t.amount * stripePct);
        const p = payoutFor(DEMO_TODAY, range.from);
        out.push({
          id: `ch_${s.id}`,
          date: DEMO_TODAY,
          time: s.at.slice(11, 16),
          ref: s.id,
          section: sec,
          channel: s.channel === "controller" || s.channel === "support" ? "Walk-in" : "Cashier",
          method: `Card ···${t.ref ?? ""}`,
          terminal: t.terminal?.split(" · ")[0],
          amount: t.amount,
          fee,
          net: r2(t.amount - fee),
          payout: p.date,
          status: s.refunds.some((r) => r.tender === "card") ? "refunded" : p.status,
          live: true,
        });
      }
    }
  }
  return out.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

export const SECTION_OPTIONS = [
  ...ZONES.map((z) => ({ v: z.id, l: z.name })),
  { v: ENTRY_SECTION.id, l: sectionName(ENTRY_SECTION.id) },
];
