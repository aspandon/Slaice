import {
  assemblePDF,
  downloadBlob,
  downloadCSVReport,
  fitText,
  pdfStr,
  textWidth,
  type CsvSection,
} from "./download";
import {
  SERVICE_LABEL,
  SERVICE_UNIT,
  eur,
  pct,
  rateLabel,
  channelNoun,
  ChannelNoun,
  type MonthStatement,
} from "../domain/economics";

/* ============================================================
   Slaice's month-end invoice to a tenant (AENR-725 / 689), laid out like
   the tenant's own fiscal documents (fiscalPdf.ts): letterhead, invoice
   number and dates, bill-to block, the month's lines — subscription,
   support, commission per service, corporate-tax rebill — the totals with
   the commission already settled through Stripe, and how it was worked out.
   The CSV carries the same figures for Excel (UTF-16LE with BOM, tab-separated — AENR-701).
   ============================================================ */

export const SLAICE_ISSUER = {
  trade: "Slaice",
  legal: "Slaice Technologies IKE",
  address: "Leof. Kifisias 44, 151 25 Marousi, Athens",
  vat: "EL801234567",
  taxOffice: "FAE Athinon",
  email: "billing@slaice.app",
  web: "slaice.app",
};

export interface StatementDoc {
  no: string;
  /** ISO date-time it was issued; a draft has none. */
  issued?: string;
  /** When the balance is collected (issued invoices only). */
  due?: string;
  status?: string;
  tenant: {
    name: string;
    legalName: string;
    vatNo: string;
    address: string;
    billingEmail?: string;
  };
  statement: MonthStatement;
}

const fmtDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const int = (n: number) => Math.round(n).toLocaleString("en-GB");

interface Line {
  title: string;
  detail: string;
  basis: string;
  amount: number;
}
/** The invoice lines, in reading order: monthly charges, commission per service, the corporate-tax rebill. */
export function statementLines(st: MonthStatement): Line[] {
  const out: Line[] = [];
  const covered = st.recurringInvoiced ? `Billed on invoice ${st.recurringInvoiced}` : "";
  if (st.subscription.mode !== "none" || st.subscription.amount > 0)
    out.push({
      title: `${st.subscription.label} · ${st.label}`,
      detail: st.subscription.detail,
      basis: covered
        ? "Not billed again"
        : st.subscription.share < 1
          ? `${Math.round(st.subscription.share * 100)}% of the month`
          : "Monthly",
      amount: covered ? 0 : st.subscription.amount,
    });
  if (st.addOns.amount > 0)
    out.push({
      title: "Add-ons",
      detail: st.addOns.detail,
      basis: covered ? "Not billed again" : "Monthly",
      amount: covered ? 0 : st.addOns.amount,
    });
  if (st.support.monthly > 0)
    out.push({
      title: st.support.label,
      detail: st.support.detail,
      basis: st.support.ended
        ? "Ended"
        : st.support.share < 1
          ? `${Math.round(st.support.share * 100)}% of the month`
          : "Monthly",
      amount: st.support.amount,
    });
  const used = st.usage.services.filter((s) => s.bookings > 0.0001 || s.commission > 0);
  for (const s of used) {
    const t = st.terms.services[s.service];
    out.push({
      title: `Commission · ${SERVICE_LABEL[s.service]}`,
      detail: `${int(s.bookings)} ${channelNoun(st.terms, Math.round(s.bookings) === 1)} · base ${eur(s.base)}${st.terms.feesInBase && s.fees > 0 ? " incl. guest fees" : ""}${s.atMin > 0.0001 ? ` · minimum on ${int(s.atMin)}` : ""}`,
      basis: rateLabel(t),
      amount: s.commission,
    });
  }
  if (!used.length)
    out.push({
      title: `Commission on ${channelNoun(st.terms)}`,
      detail: `No ${channelNoun(st.terms)} this month`,
      basis: "—",
      amount: 0,
    });
  out.push({
    title: "Corporate tax re-billed",
    detail: `${pct(st.corporateTax.rate)} of ${eur(st.corporateTax.base)} ${st.terms.taxBase === "commissionAndFees" ? "net commission and kept guest fees" : "net commission"}`,
    basis: pct(st.corporateTax.rate),
    amount: st.corporateTax.amount,
  });
  return out;
}

/** What the guests paid as service fees, by service: "Sunbeds 1,234 sets × €3.00". */
const feeBreakdown = (st: MonthStatement) =>
  st.usage.services
    .filter((s) => s.fees > 0)
    .map(
      (s) =>
        `${SERVICE_LABEL[s.service]} ${int(s.units)} ${SERVICE_UNIT[s.service].many} × ${eur(st.terms.services[s.service].fee)}`,
    )
    .join(" · ");

export function buildStatementPDF(d: StatementDoc): Uint8Array {
  const st = d.statement;
  const draft = !d.issued;
  const W = 595;
  const H = 842;
  const M = 48;
  const R = W - M;
  const NAVY = "0.043 0.145 0.271";
  const TEAL = "0.051 0.58 0.533";
  const TINT = "0.937 0.953 0.969";
  const AMBER = "0.71 0.33 0.04";
  const pages: string[][] = [];
  let st2: string[] = [];
  const fill = (c: string) => st2.push(`${c} rg`);
  const grey = (g: number) => st2.push(`${g} ${g} ${g} rg`);
  const font = (bold: boolean, size: number) => st2.push(`/${bold ? "F2" : "F1"} ${size} Tf`);
  const text = (x: number, y: number, s: string) =>
    st2.push(`BT ${x.toFixed(1)} ${y.toFixed(1)} Td ${pdfStr(s)} Tj ET`);
  const rtext = (x: number, y: number, s: string, size: number, bold = false) =>
    text(x - textWidth(s, size, bold), y, s);
  const rect = (x: number, y: number, w: number, h: number, c: string) =>
    st2.push(`${c} rg ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
  const hline = (x1: number, x2: number, y: number, g = 0.85, w = 0.6) =>
    st2.push(
      `${g} ${g} ${g} RG ${w} w ${x1.toFixed(1)} ${y.toFixed(1)} m ${x2.toFixed(1)} ${y.toFixed(1)} l S`,
    );
  const label = (x: number, y: number, s: string) => {
    grey(0.45);
    font(true, 7);
    text(x, y, s.toUpperCase());
  };
  const wrap = (s: string, w: number, size: number, bold = false, max = 3): string[] => {
    const words = s.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const word of words) {
      const next = cur ? `${cur} ${word}` : word;
      if (textWidth(next, size, bold) <= w) cur = next;
      else {
        if (cur) lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur);
    const out = lines.slice(0, max).map((l) => fitText(l, w, size, bold));
    if (lines.length > max) out[max - 1] = fitText(`${out[max - 1]} …`, w, size, bold);
    return out;
  };
  const startPage = () => {
    st2 = [];
    pages.push(st2);
    rect(0, H - 6, W, 6, NAVY);
    rect(0, H - 8, W, 2, TEAL);
  };

  /* ---------- letterhead ---------- */
  startPage();
  let y = H - 58;
  fill(NAVY);
  font(true, 18);
  text(M, y, SLAICE_ISSUER.trade);
  grey(0.3);
  font(true, 8.5);
  text(M, y - 16, SLAICE_ISSUER.legal);
  grey(0.42);
  font(false, 8.5);
  const issuerLines = [
    SLAICE_ISSUER.address,
    `VAT ${SLAICE_ISSUER.vat} · Tax office ${SLAICE_ISSUER.taxOffice}`,
    `${SLAICE_ISSUER.email} · ${SLAICE_ISSUER.web}`,
  ];
  issuerLines.forEach((l, i) => text(M, y - 28 - i * 11, l));

  fill(TEAL);
  font(true, 22);
  rtext(R, y + 2, draft ? "STATEMENT" : "INVOICE", 22, true);
  grey(0.42);
  font(false, 8.5);
  rtext(R, y - 14, `Month-end ${draft ? "statement" : "invoice"} · ${st.label}`, 8.5);
  fill(NAVY);
  font(true, 11);
  rtext(R, y - 32, draft ? `Draft · ${d.no}` : `No. ${d.no}`, 11, true);
  grey(0.42);
  font(false, 8.5);
  rtext(
    R,
    y - 46,
    draft
      ? st.open
        ? `Month to date · ${fmtDate(st.to)}`
        : "Not issued yet"
      : `Issued ${fmtDate(d.issued as string)}${d.due ? ` · due ${fmtDate(d.due)}` : ""}`,
    8.5,
  );
  if (draft) {
    const tag = st.open ? "DRAFT — the month is still running" : "DRAFT — not yet invoiced";
    const tw = textWidth(tag, 7.5, true) + 14;
    rect(R - tw, y - 66, tw, 14, "1 0.953 0.85");
    fill(AMBER);
    font(true, 7.5);
    rtext(R - 7, y - 62, tag, 7.5, true);
  }
  y = y - 28 - issuerLines.length * 11 - 18;
  hline(M, R, y, 0.82, 0.8);

  /* ---------- bill to + details ---------- */
  y -= 22;
  const colR = M + 290;
  label(M, y, "Bill to");
  fill(NAVY);
  font(true, 11);
  text(M, y - 15, fitText(d.tenant.legalName, colR - M - 20, 11, true));
  grey(0.3);
  font(false, 9);
  const party = [
    d.tenant.name !== d.tenant.legalName ? `Trading as ${d.tenant.name}` : "",
    `VAT ${d.tenant.vatNo}`,
    d.tenant.address,
    d.tenant.billingEmail ?? "",
  ].filter(Boolean);
  party.forEach((l, i) => text(M, y - 29 - i * 12, fitText(l, colR - M - 20, 9)));
  label(colR, y, "Details");
  const details: [string, string][] = [
    ["Period", `${fmtDate(st.from)} – ${fmtDate(st.to)}`],
    [ChannelNoun(st.terms), int(st.usage.bookings)],
    ["Commission", "Settled at each payment (Stripe)"],
    ["Balance", draft || !d.due ? "—" : `Direct Debit · ${fmtDate(d.due)}`],
  ];
  if (d.status && !draft) details.push(["Status", d.status]);
  details.forEach(([k, v], i) => {
    const yy = y - 15 - i * 13;
    grey(0.45);
    font(false, 8.5);
    text(colR, yy, k);
    grey(0.12);
    font(true, 8.5);
    rtext(R, yy, fitText(v, R - colR - 70, 8.5, true), 8.5, true);
  });
  y -= 15 + Math.max(party.length * 12 + 14, details.length * 13) + 16;

  /* ---------- lines ---------- */
  const widths = [22, 236, 169, 72];
  const xs = widths.reduce<number[]>((a, _w, i) => [...a, i ? a[i - 1] + widths[i - 1] : M], []);
  const pad = 6;
  const head = () => {
    rect(M, y - 20, R - M, 20, NAVY);
    grey(1);
    font(true, 8);
    text(xs[0] + pad, y - 13, "#");
    text(xs[1] + pad, y - 13, "Description");
    text(xs[2] + pad, y - 13, "Rate / basis");
    rtext(R - pad, y - 13, "Amount", 8, true);
    y -= 20;
  };
  head();
  statementLines(st).forEach((l, i) => {
    const detail = wrap(l.detail, widths[1] - pad * 2, 7.5, false, 2);
    const rh = 16 + detail.length * 9.5;
    if (y - rh < 250) {
      startPage();
      y = H - 50;
      grey(0.4);
      font(true, 9);
      text(M, y, `${draft ? "Statement" : "Invoice"} ${d.no} · continued`);
      y -= 14;
      head();
    }
    if (i % 2 === 1) rect(M, y - rh, R - M, rh, "0.976 0.98 0.988");
    const by = y - 13;
    grey(0.45);
    font(false, 8.5);
    text(xs[0] + pad, by, String(i + 1));
    grey(0.1);
    font(true, 9);
    text(xs[1] + pad, by, fitText(l.title, widths[1] - pad * 2, 9, true));
    grey(0.42);
    font(false, 7.5);
    detail.forEach((dl, k) => text(xs[1] + pad, by - 11 - k * 9.5, dl));
    grey(0.25);
    font(false, 8.5);
    text(xs[2] + pad, by, fitText(l.basis, widths[2] - pad * 2, 8.5));
    grey(0.05);
    font(true, 9);
    rtext(R - pad, by, eur(l.amount), 9, true);
    y -= rh;
    hline(M, R, y, 0.9, 0.5);
  });

  /* ---------- guest fees (left) + totals (right) ---------- */
  y -= 20;
  const top = y;
  const lw = 250;
  label(M, y, "Guest service fees");
  y -= 8;
  const fees = feeBreakdown(st);
  const feeHead =
    st.totals.guestFees > 0
      ? `${eur(st.totals.guestFees)} ${st.feeTo === "slaice" ? "kept by Slaice" : `kept by ${d.tenant.name}`}`
      : "None this month";
  const feeBody = wrap(
    st.totals.guestFees > 0
      ? `${fees}. Paid by guests at checkout on top of the beach prices${st.feeTo === "slaice" ? " and collected with the commission — not charged on this invoice." : " — they stay with the beach."}`
      : "No guest service fees were charged this month.",
    lw - 20,
    7.5,
    false,
    5,
  );
  const bh = 26 + feeBody.length * 9.5;
  rect(M, y - bh, lw, bh, TINT);
  rect(M, y - bh, 3, bh, TEAL);
  fill(NAVY);
  font(true, 9.5);
  text(M + 12, y - 15, feeHead);
  grey(0.35);
  font(false, 7.5);
  feeBody.forEach((l, i) => text(M + 12, y - 28 - i * 9.5, l));
  const leftEnd = y - bh;

  const tx = R - 230;
  y = top;
  const trow = (k: string, v: string, bold = false) => {
    grey(bold ? 0.12 : 0.4);
    font(bold, 9);
    text(tx, y, k);
    grey(0.12);
    font(bold, 9);
    rtext(R, y, v, 9, bold);
    y -= 15;
  };
  trow("Monthly charges", eur(st.totals.recurring));
  trow("Commission", eur(st.totals.commission));
  trow(`Corporate tax re-billed (${pct(st.corporateTax.rate)})`, eur(st.totals.corporateTax));
  hline(tx, R, y + 9, 0.75, 0.6);
  trow("Invoice total", eur(st.totals.invoiceTotal), true);
  trow("Less commission settled via Stripe", eur(-st.totals.settled));
  y += 3;
  rect(tx - 10, y - 30, R - tx + 10, 30, NAVY);
  grey(1);
  font(true, 10);
  text(tx, y - 19, draft ? "BALANCE (DRAFT)" : "AMOUNT DUE");
  font(true, 15);
  rtext(R - 10, y - 20, eur(st.totals.due), 15, true);
  y -= 30;
  if (!draft && d.due) {
    fill(TEAL);
    font(true, 8.5);
    rtext(R, y - 14, `By SEPA Direct Debit on ${fmtDate(d.due)}`, 8.5, true);
    y -= 14;
  }
  y = Math.min(y, leftEnd) - 24;

  /* ---------- how it was worked out ---------- */
  label(M, y, "Notes");
  y -= 13;
  const t = st.terms;
  const lastDay = new Date(Date.UTC(Number(st.month.slice(0, 4)), Number(st.month.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);
  const notes = [
    draft
      ? `Not an invoice yet: ${st.open ? `${st.label} is still running — Slaice issues the invoice after ${fmtDate(lastDay)}` : "Slaice issues it in its month-end run"}; figures can still change.`
      : `Payment: the ${eur(st.totals.due)} balance is collected by SEPA Direct Debit${d.due ? ` on ${fmtDate(d.due)}` : ""} — please do not transfer it. The ${eur(st.totals.settled)} commission was already collected at each online payment (Stripe application fee). Questions: ${SLAICE_ISSUER.email}.`,
    `Commission is a share of each ${channelNoun(t, true)}'s total per service, VAT included${t.feesInBase ? ", guest service fees included" : ""}, or the minimum per booking when the share is lower: ${(["sunbeds", "tickets"] as const).map((s) => `${SERVICE_LABEL[s].toLowerCase()} ${rateLabel(t.services[s])}`).join("; ")}; passes ${rateLabel(t.services.passes)}; lockers ${rateLabel(t.services.lockers)}; parking ${rateLabel(t.services.parking)}.`,
    `Commission is Slaice's net income. The ${pct(t.corporateTax)} corporate tax on ${t.taxBase === "commissionAndFees" ? "it and on the guest fees Slaice keeps" : "it"} is re-billed once a month on this invoice.`,
    st.recurringInvoiced
      ? `The ${st.label} subscription and add-ons were billed in advance on invoice ${st.recurringInvoiced} and are not charged again.`
      : "",
    `All amounts in euro. Only ${channelNoun(t)} carry commission and guest service fees; sales at the beach (till, walk-in) do not.`,
  ].filter(Boolean);
  grey(0.3);
  font(false, 8);
  for (const n of notes) {
    for (const l of wrap(n, R - M, 8, false, 4)) {
      text(M, y, l);
      y -= 10.5;
    }
    y -= 3;
  }

  /* ---------- page footer ---------- */
  pages.forEach((p, i) => {
    st2 = p;
    hline(M, R, 46, 0.85);
    grey(0.45);
    font(false, 7.5);
    text(
      M,
      33,
      fitText(
        `${SLAICE_ISSUER.legal} · VAT ${SLAICE_ISSUER.vat} · ${SLAICE_ISSUER.address}`,
        380,
        7.5,
      ),
    );
    rtext(
      R,
      33,
      pages.length > 1
        ? `Issued with Slaice · page ${i + 1} of ${pages.length}`
        : draft
          ? "Draft — not a tax document"
          : "Issued electronically with Slaice",
      7.5,
    );
  });
  return assemblePDF(
    pages.map((p) => p.join("\n")),
    W,
    H,
    `${draft ? "Statement" : "Invoice"} ${d.no}`,
  );
}

/** The same figures as the PDF, as CSV blocks. */
export function statementCsv(d: StatementDoc): CsvSection[] {
  const st = d.statement;
  const n = (v: number) => Math.round(v * 100) / 100;
  return [
    {
      title: `${d.issued ? "Slaice month-end invoice" : "Slaice month-end statement (draft)"} ${d.no}`,
      rows: [
        ["Bill to", d.tenant.legalName],
        ["VAT", d.tenant.vatNo],
        ["Period", `${st.from} to ${st.to}`],
        ["Issued", d.issued ? d.issued.slice(0, 10) : "not issued"],
        ["Due", d.due ?? "—"],
        [ChannelNoun(st.terms), Math.round(st.usage.bookings)],
      ],
    },
    {
      title: `Commission on ${channelNoun(st.terms)}`,
      header: [
        "Service",
        "Online bookings",
        "Units",
        "Online sales incl. VAT (€)",
        "Guest fees (€)",
        "Commission base (€)",
        "Rate %",
        "Minimum per booking (€)",
        "Bookings at minimum",
        "Commission (€)",
      ],
      rows: [
        ...st.usage.services.map((s) => [
          SERVICE_LABEL[s.service],
          Math.round(s.bookings),
          n(s.units),
          s.gross,
          s.fees,
          s.base,
          st.terms.services[s.service].rate,
          st.terms.services[s.service].min,
          Math.round(s.atMin),
          s.commission,
        ]),
        [
          "Total",
          Math.round(st.usage.bookings),
          "",
          st.usage.gross,
          st.usage.fees,
          n(st.usage.services.reduce((a, s) => a + s.base, 0)),
          "",
          "",
          "",
          st.usage.commission,
        ],
      ],
    },
    {
      title: "Invoice lines",
      header: ["Line", "Detail", "Rate / basis", "Amount (€)"],
      rows: statementLines(st).map((l) => [l.title, l.detail, l.basis, l.amount]),
    },
    {
      title: "Totals",
      header: ["Measure", "Amount (€)"],
      rows: [
        ["Monthly charges", st.totals.recurring],
        ["Commission", st.totals.commission],
        [`Corporate tax re-billed (${st.corporateTax.rate}%)`, st.totals.corporateTax],
        ["Invoice total", st.totals.invoiceTotal],
        ["Commission settled via Stripe", -st.totals.settled],
        ["Amount due", st.totals.due],
        [
          `Guest service fees (${st.feeTo === "slaice" ? "kept by Slaice" : "kept by the beach"})`,
          st.totals.guestFees,
        ],
        ["Slaice revenue", st.totals.slaiceRevenue],
      ],
    },
  ];
}

export function downloadStatement(d: StatementDoc, format: "pdf" | "csv") {
  const base = `${d.issued ? "invoice" : "statement"}_${d.no}`;
  if (format === "pdf")
    downloadBlob(
      new Blob([buildStatementPDF(d) as BlobPart], { type: "application/pdf" }),
      `${base}.pdf`,
    );
  else downloadCSVReport(`${base}.csv`, statementCsv(d));
}
