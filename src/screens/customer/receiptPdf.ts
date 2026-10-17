import { OPERATOR, TENANT } from "../../data/beach";
import { PROFILE } from "../../domain/account";
import type { CustomerDocument } from "../../domain/types";
import { buildFiscalPDF, parseEur, type FiscalDoc, type FiscalKind, type FiscalLine } from "../../lib/fiscalPdf";
import { downloadBlob } from "../../lib/download";
import { QR_N, qrCells } from "../../components/charts";

/* A guest's receipt, invoice or credit note as a PDF (AENR-685) — the one
   format guests download; CSV stays a back-office export. */

/** Plain words for the guest; the Greek series codes stay inside the document. */
export const docKind = (id: string): FiscalKind => (id.startsWith("ΑΠΥ") ? "Receipt" : id.startsWith("ΤΠΥ") ? "Invoice" : "Credit note");
// myDATA document type: retail receipt for services 11.1, invoice for services 2.1, retail credit note 11.4.
const TYPE: Record<FiscalKind, string> = {
  Receipt: "Retail receipt for services · myDATA type 11.1",
  Invoice: "Invoice for services · myDATA type 2.1",
  "Credit note": "Retail credit note · myDATA type 11.4",
};
const VAT_RATE = 24;

/** "Adult ×2" → description "Adult", qty 2; prices come from the gross amount. */
function line([label, net, vat, gross]: string[]): FiscalLine {
  const m = /\s*×\s*(\d+)\s*$/.exec(label);
  const qty = m ? Number(m[1]) : 1;
  const g = parseEur(gross);
  return { description: m ? label.slice(0, m.index) : label, qty, unit: Math.round((g / qty) * 100) / 100, vatRate: VAT_RATE, net: parseEur(net), vat: parseEur(vat), gross: g };
}
/** A stable 40-hex document UID from the number + MARK (mocked like the MARK itself). */
function uid(s: string): string {
  let out = "";
  let h = 2166136261;
  for (let r = 0; out.length < 40; r++) {
    for (const c of `${s}:${r}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    out += h.toString(16).padStart(8, "0");
  }
  return out.slice(0, 40).toUpperCase();
}

export function customerFiscalDoc(d: CustomerDocument): FiscalDoc {
  const kind = docKind(d.id);
  const guest = `${PROFILE.first} ${PROFILE.last}`;
  return {
    kind,
    number: d.id,
    type: TYPE[kind],
    issued: d.date,
    issuer: { trade: TENANT.name, ...OPERATOR, web: TENANT.subdomain },
    party: d.billTo
      ? { title: "Billed to", name: d.billTo.company, lines: [`VAT ${d.billTo.vatNo}`, d.billTo.address, `Booked by ${guest}`] }
      : { title: "Customer", name: guest, lines: [PROFILE.email, PROFILE.phone] },
    details: [
      [kind === "Credit note" ? "Reason" : "Service", kind === "Credit note" ? d.for.replace(/^Refund\s*·\s*/, "") : d.for],
      ["Service date", d.date],
      ...(d.ref ? ([["Booking", d.ref]] as [string, string][]) : []),
      kind === "Credit note" ? ["Refund to", "Original card (Stripe)"] : ["Payment", "Card online (Stripe)"],
      ["Currency", "EUR"],
    ],
    lines: d.lines.map(line),
    totalLabel: kind === "Credit note" ? "Total refunded" : kind === "Invoice" ? "Total" : "Total paid",
    settlement: kind === "Credit note" ? "Refunded to the original card" : `Paid in full by card · ${d.date}`,
    mark: d.mark,
    uid: uid(`${d.id}${d.mark}`),
    qr: { n: QR_N, cells: qrCells(d.mark) },
    notes: [
      `Prices include VAT at ${VAT_RATE}%.`,
      ...(kind === "Invoice" ? ["Issued at the customer's request instead of the retail receipt for this visit."] : []),
      ...(kind === "Credit note" ? ["Cancels the corresponding amount of the original receipt."] : []),
      `Thank you for spending the day at ${TENANT.name}. Questions about this document: ${OPERATOR.email}`,
    ],
  };
}

export const customerDocBytes = (d: CustomerDocument) => buildFiscalPDF(customerFiscalDoc(d));
export function downloadCustomerDoc(d: CustomerDocument) {
  downloadBlob(new Blob([customerDocBytes(d) as BlobPart], { type: "application/pdf" }), `${d.id}.pdf`);
}
