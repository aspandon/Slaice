// Accountant month-end (AENR-588): one month's documents, myDATA transmission,
// card charges and payouts summarised, the exceptions that block closing the
// books (each pointing at the records that cause it), the VAT summary by rate
// and export layouts for common Greek accounting packages. Pure functions over
// the ledger rows the Documents & Payments page already uses.

import type { DocType, FiscalDoc, Txn } from "../data/ledger";
import { DOC_CODE } from "../data/ledger";
import type { Payout } from "../data/finance";

export interface MonthRef {
  /** YYYY-MM */
  month: string;
  from: string;
  to: string;
  label: string;
  /** The month includes today, so it is still in progress. */
  open: boolean;
}
/** Season months up to today's month, newest first. */
export function seasonMonths(today: string, firstMonth = "2026-05", lastMonth?: string): MonthRef[] {
  const out: MonthRef[] = [];
  let [y, m] = firstMonth.split("-").map(Number);
  const current = today.slice(0, 7);
  const last = lastMonth && lastMonth < current ? lastMonth : current;
  for (;;) {
    const month = `${y}-${String(m).padStart(2, "0")}`;
    if (month > last) break;
    const end = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const to = `${month}-${String(end).padStart(2, "0")}`;
    out.push({
      month,
      from: `${month}-01`,
      to: to > today ? today : to,
      label: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      open: month === current,
    });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out.reverse();
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: number[]) => r2(xs.reduce((a, x) => a + x, 0));

export interface MonthSummary {
  docs: {
    count: number;
    net: number;
    vat: number;
    total: number;
    byType: { type: DocType; count: number; total: number }[];
  };
  mydata: {
    sent: number;
    pending: number;
    failed: number;
    pendingTotal: number;
    failedTotal: number;
  };
  cards: {
    count: number;
    amount: number;
    fees: number;
    net: number;
    refunded: number;
    refundedAmount: number;
  };
  payouts: {
    paid: number;
    paidAmount: number;
    inTransit: number;
    inTransitAmount: number;
    scheduled: number;
    scheduledAmount: number;
  };
  vat: { rate: number; net: number; vat: number }[];
  /** Credit notes / cancellations issued vs card charges refunded. */
  credits: number;
}

export function summarize(
  docs: readonly FiscalDoc[],
  txs: readonly Txn[],
  pays: readonly Payout[],
): MonthSummary {
  const types: DocType[] = ["ΑΠΥ", "ΤΠΥ", "ΠΑΠΥ", "ΠΤΠΥ", "Cancellation"];
  const rates = new Map<number, { net: number; vat: number }>();
  for (const d of docs)
    for (const l of d.lines) {
      const cur = rates.get(l.rate) ?? { net: 0, vat: 0 };
      rates.set(l.rate, { net: cur.net + l.net, vat: cur.vat + l.vat });
    }
  const st = (s: Payout["status"]) => pays.filter((p) => p.status === s);
  return {
    docs: {
      count: docs.length,
      net: sum(docs.map((d) => d.net)),
      vat: sum(docs.map((d) => d.vat)),
      total: sum(docs.map((d) => d.total)),
      byType: types
        .map((type) => {
          const xs = docs.filter((d) => d.type === type);
          return { type, count: xs.length, total: sum(xs.map((d) => d.total)) };
        })
        .filter((x) => x.count > 0),
    },
    mydata: {
      sent: docs.filter((d) => d.status === "sent").length,
      pending: docs.filter((d) => d.status === "pending").length,
      failed: docs.filter((d) => d.status === "failed").length,
      pendingTotal: sum(docs.filter((d) => d.status === "pending").map((d) => d.total)),
      failedTotal: sum(docs.filter((d) => d.status === "failed").map((d) => d.total)),
    },
    cards: {
      count: txs.length,
      amount: sum(txs.map((t) => t.amount)),
      fees: sum(txs.map((t) => t.fee)),
      net: sum(txs.map((t) => t.net)),
      refunded: txs.filter((t) => t.status === "refunded").length,
      refundedAmount: sum(txs.filter((t) => t.status === "refunded").map((t) => t.amount)),
    },
    payouts: {
      paid: st("Paid").length,
      paidAmount: sum(st("Paid").map((p) => p.amount)),
      inTransit: st("In transit").length,
      inTransitAmount: sum(st("In transit").map((p) => p.amount)),
      scheduled: st("Scheduled").length,
      scheduledAmount: sum(st("Scheduled").map((p) => p.amount)),
    },
    vat: [...rates.entries()]
      .map(([rate, v]) => ({ rate, net: r2(v.net), vat: r2(v.vat) }))
      .sort((a, b) => b.rate - a.rate),
    credits: docs.filter((d) => d.type === "ΠΑΠΥ" || d.type === "ΠΤΠΥ" || d.type === "Cancellation")
      .length,
  };
}

export type ExceptionTarget =
  | { page: "documents"; status: "pending" | "failed" }
  | { page: "payments"; status: "refunded" | "in payout" }
  | { page: "commission" };
export interface MonthException {
  id: string;
  severity: "blocking" | "check";
  title: string;
  detail: string;
  count: number;
  target: ExceptionTarget;
}
/** What has to be cleared before the month can be closed. */
export function exceptions(s: MonthSummary, open: boolean): MonthException[] {
  const out: MonthException[] = [];
  if (s.mydata.failed)
    out.push({
      id: "mydata-failed",
      severity: "blocking",
      count: s.mydata.failed,
      title: `${s.mydata.failed} document${s.mydata.failed > 1 ? "s" : ""} rejected by myDATA`,
      detail:
        "Correct and re-transmit to AADE — the month can't be closed with rejected documents.",
      target: { page: "documents", status: "failed" },
    });
  if (s.mydata.pending)
    out.push({
      id: "mydata-pending",
      severity: open ? "check" : "blocking",
      count: s.mydata.pending,
      title: `${s.mydata.pending} document${s.mydata.pending > 1 ? "s" : ""} not yet transmitted to myDATA`,
      detail: open
        ? "Still sending — check again before closing."
        : "Transmit before closing the month.",
      target: { page: "documents", status: "pending" },
    });
  if (s.payouts.inTransit)
    out.push({
      id: "payout-transit",
      severity: "check",
      count: s.payouts.inTransit,
      title: `${s.payouts.inTransit} payout${s.payouts.inTransit > 1 ? "s" : ""} in transit`,
      detail: "Confirm the amount reached the bank account before reconciling.",
      target: { page: "commission" },
    });
  if (s.cards.refunded > s.credits)
    out.push({
      id: "refund-credit",
      severity: "check",
      count: s.cards.refunded - s.credits,
      title: `${s.cards.refunded - s.credits} card refund${s.cards.refunded - s.credits > 1 ? "s" : ""} without a credit note`,
      detail: "Each refund needs a ΠΑΠΥ / ΠΤΠΥ or a cancellation of the original document.",
      target: { page: "payments", status: "refunded" },
    });
  return out;
}

/* ---------- Prepare month (AENR-614) ----------
   What a machine can fix on its own: documents still waiting for myDATA are
   re-sent, and card refunds without a credit note get one drafted. Rejected
   documents (they need corrected data) and payouts in transit (they need the
   bank statement) stay for a person. */
export function fixable(s: MonthSummary): { resend: number; creditNotes: number } {
  return { resend: s.mydata.pending, creditNotes: Math.max(0, s.cards.refunded - s.credits) };
}
/** The summary after Prepare ran: re-sent documents count as sent, drafted credit notes as issued. */
export function applyPrepared(s: MonthSummary, p?: { resent: number; creditNotes: number }, corrected = 0): MonthSummary {
  const resent = Math.min(p?.resent ?? 0, s.mydata.pending);
  const fixed = Math.min(corrected, s.mydata.failed);
  return {
    ...s,
    mydata: {
      ...s.mydata,
      sent: s.mydata.sent + resent + fixed,
      pending: s.mydata.pending - resent,
      pendingTotal: resent === s.mydata.pending ? 0 : s.mydata.pendingTotal,
      failed: s.mydata.failed - fixed,
      failedTotal: fixed === s.mydata.failed ? 0 : s.mydata.failedTotal,
    },
    credits: s.credits + (p?.creditNotes ?? 0),
  };
}
/** Why myDATA rejected a document (demo): the usual causes, from what the document carries. */
export const rejectionReason = (d: FiscalDoc) =>
  d.vatNo ? "VAT number not found in the AADE registry" : d.type === "ΠΑΠΥ" || d.type === "ΠΤΠΥ" ? "Credit note without the original's MARK" : "Duplicate series / number";

/* ---------- Export presets ---------- */
export type ExportPreset = "generic" | "epsilon" | "softone" | "entersoft";
export const EXPORT_PRESETS: { id: ExportPreset; label: string; note: string }[] = [
  { id: "generic", label: "Generic CSV", note: "Comma-separated, one row per document" },
  { id: "epsilon", label: "Epsilon Net (Pylon)", note: "Semicolon, decimal comma, Greek headers" },
  { id: "softone", label: "SoftOne", note: "Semicolon, decimal comma, series and number split" },
  { id: "entersoft", label: "Entersoft", note: "Semicolon, decimal comma, myDATA type code first" },
];
const gr = (n: number) => n.toFixed(2).replace(".", ",");
const ddmmyyyy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const cell = (v: string, sep: string) =>
  v.includes(sep) || v.includes('"') || v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v;

/** One month's documents in the layout an accounting package imports. */
export function exportMonth(
  docs: readonly FiscalDoc[],
  preset: ExportPreset,
): { text: string; ext: string; mime: string } {
  const sep = preset === "generic" ? "," : ";";
  const rows: string[][] = (() => {
    switch (preset) {
      case "epsilon":
        return [
          [
            "Ημερομηνία",
            "Τύπος",
            "Σειρά",
            "Αριθμός",
            "Αντισυμβαλλόμενος",
            "ΑΦΜ",
            "Καθαρή αξία",
            "ΦΠΑ",
            "Σύνολο",
            "MARK",
          ],
          ...docs.map((d) => [
            ddmmyyyy(d.date),
            DOC_CODE[d.type],
            d.series,
            d.number,
            d.counterparty,
            (d.vatNo ?? "").replace(/^EL\s*/, ""),
            gr(d.net),
            gr(d.vat),
            gr(d.total),
            d.mark,
          ]),
        ];
      case "softone":
        return [
          [
            "TRNDATE",
            "SERIES",
            "FINCODE",
            "TRDR_NAME",
            "AFM",
            "NETAMNT",
            "VATAMNT",
            "SUMAMNT",
            "MYDATA_TYPE",
            "MARK",
          ],
          ...docs.map((d) => [
            ddmmyyyy(d.date),
            d.series,
            d.number,
            d.counterparty,
            (d.vatNo ?? "").replace(/^EL\s*/, ""),
            gr(d.net),
            gr(d.vat),
            gr(d.total),
            DOC_CODE[d.type],
            d.mark,
          ]),
        ];
      case "entersoft":
        return [
          [
            "InvoiceType",
            "IssueDate",
            "Series",
            "AA",
            "CounterpartVAT",
            "NetValue",
            "VatAmount",
            "GrossValue",
            "Mark",
            "PaymentMethod",
          ],
          ...docs.map((d) => [
            DOC_CODE[d.type],
            d.date,
            d.series,
            d.number,
            (d.vatNo ?? "").replace(/^EL\s*/, ""),
            gr(d.net),
            gr(d.vat),
            gr(d.total),
            d.mark,
            d.method,
          ]),
        ];
      default:
        return [
          [
            "Date",
            "Type",
            "myDATA code",
            "Series",
            "Number",
            "Counterparty",
            "VAT no.",
            "Net",
            "VAT",
            "Total",
            "MARK",
            "Status",
          ],
          ...docs.map((d) => [
            d.date,
            d.type,
            DOC_CODE[d.type],
            d.series,
            d.number,
            d.counterparty,
            d.vatNo ?? "",
            d.net.toFixed(2),
            d.vat.toFixed(2),
            d.total.toFixed(2),
            d.mark,
            d.status,
          ]),
        ];
    }
  })();
  // A UTF-8 BOM so Excel and Greek packages read the Greek headers correctly.
  const text = "﻿" + rows.map((r) => r.map((v) => cell(String(v), sep)).join(sep)).join("\r\n");
  return { text, ext: "csv", mime: "text/csv;charset=utf-8" };
}

/* ---------- Example months (AENR-701) ----------
   The demo opens with history: last season (May–Oct 2025) and May 2026 are
   already closed — each with what Prepare fixed — so the accountant sees closed,
   to-close and in-progress months side by side, and can reopen any of them. */
export const SEEDED_CLOSES: Record<string, string> = {
  "2025-05": "2025-06-09T10:12",
  "2025-06": "2025-07-08T09:40",
  "2025-07": "2025-08-11T11:05",
  "2025-08": "2025-09-09T10:30",
  "2025-09": "2025-10-08T09:55",
  "2025-10": "2025-11-10T10:20",
  "2026-05": "2026-06-09T10:15",
};
/** The seasons Month-end lists, newest first. */
export function monthSeasons(today: string): { season: string; months: MonthRef[] }[] {
  return [
    { season: today.slice(0, 4), months: seasonMonths(today, `${today.slice(0, 4)}-05`) },
    { season: String(Number(today.slice(0, 4)) - 1), months: seasonMonths(today, `${Number(today.slice(0, 4)) - 1}-05`, `${Number(today.slice(0, 4)) - 1}-10`) },
  ];
}
