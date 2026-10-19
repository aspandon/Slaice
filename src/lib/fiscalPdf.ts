import { assemblePDF, fitText, pdfStr, textWidth } from "./download";

/* ============================================================
   Tax documents as PDF (AENR-685): a guest's receipt, invoice or credit
   note laid out like a real Greek fiscal document — issuer letterhead,
   document number and type, bill-to block, line items with quantity, unit
   price and VAT, a VAT analysis, totals, and the myDATA MARK + QR.
   Pure and framework-free: screens map their data onto `FiscalDoc`.
   ============================================================ */

export type FiscalKind = "Receipt" | "Invoice" | "Credit note";

export interface FiscalIssuer {
  /** Trade name on the letterhead, e.g. "Akti tou Iliou". */
  trade: string;
  /** Legal entity, e.g. "Akti tou Iliou AE". */
  legal: string;
  address: string;
  vat: string;
  taxOffice?: string;
  phone?: string;
  email?: string;
  web?: string;
}
export interface FiscalLine {
  description: string;
  qty: number;
  /** Gross unit price (VAT included). */
  unit: number;
  vatRate: number;
  net: number;
  vat: number;
  gross: number;
}
export interface FiscalDoc {
  kind: FiscalKind;
  /** e.g. "ΑΠΥ-2026-004281" (Greek series codes are transliterated in the PDF). */
  number: string;
  /** myDATA document type, e.g. "11.1 · Retail receipt for services". */
  type: string;
  issued: string;
  issuer: FiscalIssuer;
  /** Invoice: the company billed. Receipt: the guest. */
  party: { title: string; name: string; lines: string[] };
  /** Label / value pairs on the right of the party block (service date, booking, payment…). */
  details: [string, string][];
  lines: FiscalLine[];
  /** "Total paid" / "Total due" / "Total refunded". */
  totalLabel: string;
  /** One line under the totals, e.g. "Paid in full by card online (Stripe) on 19 Jul 2026". */
  settlement?: string;
  mark: string;
  uid?: string;
  /** Faux QR cells (x, y) on an n×n grid — the myDATA verification code. */
  qr?: { n: number; cells: [number, number][] };
  notes?: string[];
}

const eur = (n: number) => `${n < 0 ? "-" : ""}€${Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function buildFiscalPDF(d: FiscalDoc): Uint8Array {
  const W = 595;
  const H = 842;
  const M = 48;
  const R = W - M;
  const NAVY = "0.043 0.145 0.271";
  const TEAL = "0.051 0.58 0.533";
  const TINT = "0.937 0.953 0.969";
  const pages: string[][] = [];
  let st: string[] = [];
  const fill = (c: string) => st.push(`${c} rg`);
  const grey = (g: number) => st.push(`${g} ${g} ${g} rg`);
  const font = (bold: boolean, size: number) => st.push(`/${bold ? "F2" : "F1"} ${size} Tf`);
  const text = (x: number, y: number, s: string) => st.push(`BT ${x.toFixed(1)} ${y.toFixed(1)} Td ${pdfStr(s)} Tj ET`);
  const rtext = (x: number, y: number, s: string, size: number, bold = false) => text(x - textWidth(s, size, bold), y, s);
  const rect = (x: number, y: number, w: number, h: number, c: string) => st.push(`${c} rg ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
  const hline = (x1: number, x2: number, y: number, g = 0.85, w = 0.6) => st.push(`${g} ${g} ${g} RG ${w} w ${x1.toFixed(1)} ${y.toFixed(1)} m ${x2.toFixed(1)} ${y.toFixed(1)} l S`);
  const label = (x: number, y: number, s: string) => {
    grey(0.45);
    font(true, 7);
    text(x, y, s.toUpperCase());
  };

  const startPage = () => {
    st = [];
    pages.push(st);
    rect(0, H - 6, W, 6, NAVY);
    rect(0, H - 8, W, 2, TEAL);
  };

  /* ---------- letterhead ---------- */
  startPage();
  let y = H - 58;
  fill(NAVY);
  font(true, 18);
  text(M, y, fitText(d.issuer.trade, 260, 18, true));
  grey(0.3);
  font(true, 8.5);
  text(M, y - 16, d.issuer.legal);
  grey(0.42);
  font(false, 8.5);
  const issuerLines = [
    d.issuer.address,
    `VAT ${d.issuer.vat}${d.issuer.taxOffice ? ` · Tax office ${d.issuer.taxOffice}` : ""}`,
    [d.issuer.phone, d.issuer.email].filter(Boolean).join(" · "),
    d.issuer.web ?? "",
  ].filter(Boolean);
  issuerLines.forEach((l, i) => text(M, y - 28 - i * 11, fitText(l, 270, 8.5)));

  const title = d.kind.toUpperCase();
  fill(TEAL);
  font(true, 22);
  rtext(R, y + 2, title, 22, true);
  grey(0.42);
  font(false, 8.5);
  rtext(R, y - 14, d.type, 8.5);
  fill(NAVY);
  font(true, 11);
  rtext(R, y - 32, `No. ${d.number}`, 11, true);
  grey(0.42);
  font(false, 8.5);
  rtext(R, y - 46, `Issued ${d.issued}`, 8.5);

  y = y - 28 - issuerLines.length * 11 - 14;
  hline(M, R, y, 0.82, 0.8);

  /* ---------- party + details ---------- */
  y -= 22;
  const colR = M + 290;
  label(M, y, d.party.title);
  fill(NAVY);
  font(true, 11);
  text(M, y - 15, fitText(d.party.name, colR - M - 20, 11, true));
  grey(0.3);
  font(false, 9);
  d.party.lines.forEach((l, i) => text(M, y - 29 - i * 12, fitText(l, colR - M - 20, 9)));
  label(colR, y, "Details");
  d.details.forEach(([k, v], i) => {
    const yy = y - 15 - i * 13;
    grey(0.45);
    font(false, 8.5);
    text(colR, yy, k);
    grey(0.12);
    font(true, 8.5);
    rtext(R, yy, fitText(v, R - colR - 90, 8.5, true), 8.5, true);
  });
  y -= 15 + Math.max(d.party.lines.length * 12 + 14, d.details.length * 13) + 18;

  /* ---------- line items ---------- */
  // # · Description · Qty · Unit price · VAT % · Net · VAT · Amount — fixed widths summing to R − M.
  const cols = ["#", "Description", "Qty", "Unit price", "VAT %", "Net", "VAT", "Amount"];
  const widths = [22, 165, 34, 64, 44, 56, 52, 62];
  const xs = widths.reduce<number[]>((a, _w, i) => [...a, i ? a[i - 1] + widths[i - 1] : M], []);
  const pad = 6;
  const head = () => {
    rect(M, y - 20, R - M, 20, NAVY);
    grey(1);
    font(true, 8);
    cols.forEach((c, i) => (i <= 1 ? text(xs[i] + pad, y - 13, c) : rtext(xs[i] + widths[i] - pad, y - 13, c, 8, true)));
    y -= 20;
  };
  head();
  const FOOT = 250; // room kept for totals + myDATA block on the last page
  d.lines.forEach((l, i) => {
    if (y - 22 < 70) {
      startPage();
      y = H - 50;
      grey(0.4);
      font(true, 9);
      text(M, y, `${d.kind} ${d.number} · continued`);
      y -= 14;
      head();
    }
    const rh = 22;
    if (i % 2 === 1) rect(M, y - rh, R - M, rh, "0.976 0.98 0.988");
    const by = y - 14;
    grey(0.45);
    font(false, 8.5);
    text(xs[0] + pad, by, String(i + 1));
    grey(0.1);
    font(true, 9);
    text(xs[1] + pad, by, fitText(l.description, widths[1] - pad * 2, 9, true));
    font(false, 9);
    grey(0.2);
    const cells = [String(l.qty), eur(l.unit), `${l.vatRate}%`, eur(l.net), eur(l.vat)];
    cells.forEach((c, k) => rtext(xs[k + 2] + widths[k + 2] - pad, by, c, 9));
    grey(0.05);
    font(true, 9);
    rtext(R - pad, by, eur(l.gross), 9, true);
    y -= rh;
    hline(M, R, y, 0.9, 0.5);
  });
  if (y < FOOT) {
    startPage();
    y = H - 60;
  }

  /* ---------- VAT analysis (left) + totals (right) ---------- */
  y -= 22;
  const top = y;
  const byRate = new Map<number, { net: number; vat: number; gross: number }>();
  for (const l of d.lines) {
    const r = byRate.get(l.vatRate) ?? { net: 0, vat: 0, gross: 0 };
    byRate.set(l.vatRate, { net: r.net + l.net, vat: r.vat + l.vat, gross: r.gross + l.gross });
  }
  label(M, y, "VAT analysis");
  y -= 8;
  const vx = [M, M + 60, M + 130, M + 195];
  const vw = 255;
  rect(M, y - 16, vw, 16, TINT);
  grey(0.35);
  font(true, 7.5);
  text(vx[0] + 6, y - 11, "Rate");
  rtext(vx[1] + 60, y - 11, "Net", 7.5, true);
  rtext(vx[2] + 55, y - 11, "VAT", 7.5, true);
  rtext(M + vw - 6, y - 11, "Gross", 7.5, true);
  y -= 16;
  [...byRate.entries()].forEach(([rate, s]) => {
    grey(0.2);
    font(false, 8.5);
    text(vx[0] + 6, y - 12, `${rate}%`);
    rtext(vx[1] + 60, y - 12, eur(s.net), 8.5);
    rtext(vx[2] + 55, y - 12, eur(s.vat), 8.5);
    rtext(M + vw - 6, y - 12, eur(s.gross), 8.5);
    y -= 17;
    hline(M, M + vw, y, 0.88, 0.5);
  });
  const leftEnd = y;

  const net = d.lines.reduce((a, l) => a + l.net, 0);
  const vat = d.lines.reduce((a, l) => a + l.vat, 0);
  const gross = d.lines.reduce((a, l) => a + l.gross, 0);
  const tx = R - 210;
  y = top;
  const trow = (k: string, v: string) => {
    grey(0.4);
    font(false, 9);
    text(tx, y, k);
    grey(0.12);
    font(false, 9);
    rtext(R, y, v, 9);
    y -= 16;
  };
  trow("Net amount", eur(net));
  trow(`VAT${byRate.size === 1 ? ` ${[...byRate.keys()][0]}%` : ""}`, eur(vat));
  y += 4;
  rect(tx - 10, y - 30, R - tx + 10, 30, NAVY);
  grey(1);
  font(true, 10);
  text(tx, y - 19, d.totalLabel.toUpperCase());
  font(true, 15);
  rtext(R - 10, y - 20, eur(gross), 15, true);
  y -= 30;
  if (d.settlement) {
    fill(TEAL);
    font(true, 8.5);
    rtext(R, y - 14, d.settlement, 8.5, true);
    y -= 14;
  }
  y = Math.min(y, leftEnd) - 28;

  /* ---------- notes ---------- */
  if (d.notes?.length) {
    grey(0.35);
    font(false, 8.5);
    d.notes.forEach((n) => {
      text(M, y, fitText(n, R - M, 8.5));
      y -= 12;
    });
    y -= 10;
  }

  /* ---------- myDATA block, pinned above the page footer ---------- */
  const bh = 78;
  const by0 = Math.min(y - bh, 120);
  rect(M, by0, R - M, bh, TINT);
  rect(M, by0, 3, bh, TEAL);
  if (d.qr) {
    const q = 62;
    const cell = q / d.qr.n;
    rect(M + 12, by0 + 8, q, q, "1 1 1");
    const qx = M + 12;
    const qy = by0 + 8;
    st.push(`${NAVY} rg`);
    for (const [cx, cy] of d.qr.cells) st.push(`${(qx + cx * cell).toFixed(2)} ${(qy + q - (cy + 1) * cell).toFixed(2)} ${cell.toFixed(2)} ${cell.toFixed(2)} re`);
    st.push("f");
  }
  const mx = M + (d.qr ? 88 : 14);
  fill(NAVY);
  font(true, 10);
  text(mx, by0 + bh - 20, "Transmitted to AADE · myDATA");
  grey(0.3);
  font(false, 8.5);
  text(mx, by0 + bh - 35, "MARK");
  font(true, 8.5);
  text(mx + 46, by0 + bh - 35, d.mark);
  if (d.uid) {
    font(false, 8.5);
    text(mx, by0 + bh - 48, "UID");
    font(false, 8.5);
    text(mx + 46, by0 + bh - 48, fitText(d.uid, R - mx - 56, 8.5));
  }
  grey(0.45);
  font(false, 7.5);
  text(mx, by0 + 12, "Scan the code or enter the MARK at aade.gr to verify this document.");

  /* ---------- page footer ---------- */
  pages.forEach((p, i) => {
    st = p;
    hline(M, R, 46, 0.85);
    grey(0.45);
    font(false, 7.5);
    text(M, 33, fitText(`${d.issuer.legal} · VAT ${d.issuer.vat} · ${d.issuer.address}`, 380, 7.5));
    rtext(R, 33, pages.length > 1 ? `Issued with Slaice · page ${i + 1} of ${pages.length}` : "Issued electronically with Slaice", 7.5);
  });

  return assemblePDF(pages.map((p) => p.join("\n")), W, H, `${d.kind} ${d.number}`);
}

/** Parse a display amount such as "€24.19" or "−€17.74". */
export const parseEur = (s: string): number => {
  const n = Number(String(s).replace(/[−–]/g, "-").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
