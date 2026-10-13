// Trigger a browser download from in-memory data.
function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // ASCII-safe file names (Greek document codes become Latin: ΑΠΥ → APY) so every
  // browser and OS keeps the name (AENR-593).
  a.download = transliterate(filename).replace(/[^\w.-]+/g, "_");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Public alias — download an already-built Blob (used by the wallet pass).
export function downloadBlob(blob: Blob, filename: string) {
  trigger(blob, filename);
}

const escapeCSV = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /["\r\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Serialise CSV lines into a Blob with two compatibility shims so the file opens
// as proper columns everywhere:
//   • a UTF-8 BOM, so Excel reads accents / Greek correctly;
//   • a `sep=,` directive on line 1, so Excel splits on commas regardless of the
//     OS list-separator locale. Without it, EU/Greek Excel (which defaults to
//     ';') dumps every row into a single cell — the "all data in one cell" bug.
// CRLF endings are the CSV standard and the most spreadsheet-friendly.
function csvBlob(lines: string[]): Blob {
  return new Blob(["﻿sep=,\r\n" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
}

/** CSV text (with the Excel shims) for files bundled in a ZIP. */
export function csvText(header: (string | number)[], rows: (string | number)[][]): string {
  return "\uFEFFsep=,\r\n" + [header, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\r\n");
}
export function downloadCSV(filename: string, header: (string | number)[], rows: (string | number)[][]) {
  const lines = [header.map(escapeCSV).join(",")];
  rows.forEach((r) => lines.push(r.map(escapeCSV).join(",")));
  trigger(csvBlob(lines), filename);
}

/** One titled block (optional title + header + rows) within a multi-section CSV. */
export interface CsvSection {
  title?: string;
  header?: (string | number)[];
  rows: (string | number)[][];
}

// Multi-section CSV: several titled blocks in one sheet, blank-line separated.
// Lets a report export carry its KPIs *and* its tables/series in one faithful
// file (used by Reporting → Export, where each tab shows several panels).
export function downloadCSVReport(filename: string, sections: CsvSection[]) {
  const lines: string[] = [];
  sections.forEach((s, i) => {
    if (i) lines.push("");
    if (s.title) lines.push(escapeCSV(s.title));
    if (s.header) lines.push(s.header.map(escapeCSV).join(","));
    s.rows.forEach((r) => lines.push(r.map(escapeCSV).join(",")));
  });
  trigger(csvBlob(lines), filename);
}

export function downloadText(filename: string, text: string, mime = "text/plain;charset=utf-8") {
  trigger(new Blob([text], { type: mime }), filename);
}

export interface IcsEvent {
  uid: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

// Build + download an .ics calendar invite. `start`/`end` are ISO YYYY-MM-DD
// (all-day event). Lets a guest add their beach day to Apple/Google/Outlook.
export function downloadICS(filename: string, { uid, title, start, end, location, description }: IcsEvent) {
  const day = (d: string) => d.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const esc = (s: string = "") => String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Slaice//Beach//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day(start)}`, `DTEND;VALUE=DATE:${day(end)}`,
    `SUMMARY:${esc(title)}`,
    location ? `LOCATION:${esc(location)}` : "",
    description ? `DESCRIPTION:${esc(description)}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  downloadText(filename, ics, "text/calendar;charset=utf-8");
}

/* ============================================================
   Zero-dependency PDF 1.4 emitter (Helvetica base fonts, WinAnsi;
   Greek transliterated to Latin). Returns an application/pdf Uint8Array.
   ============================================================ */

const GREEK: Record<string, string> = {
  "Α":"A","Β":"B","Γ":"G","Δ":"D","Ε":"E","Ζ":"Z","Η":"I","Θ":"Th",
  "Ι":"I","Κ":"K","Λ":"L","Μ":"M","Ν":"N","Ξ":"X","Ο":"O","Π":"P",
  "Ρ":"R","Σ":"S","Τ":"T","Υ":"Y","Φ":"F","Χ":"Ch","Ψ":"Ps","Ω":"O",
  "α":"a","β":"b","γ":"g","δ":"d","ε":"e","ζ":"z","η":"i","θ":"th",
  "ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"x","ο":"o","π":"p",
  "ρ":"r","σ":"s","ς":"s","τ":"t","υ":"y","φ":"f","χ":"ch","ψ":"ps","ω":"o",
};
// Symbols outside the PDF's WinAnsi set get a plain stand-in (a "−" became "?").
const SYMBOLS: Record<string, string> = { "−": "-", "‑": "-", "→": "->", "←": "<-", "↔": "<->", "≥": ">=", "≤": "<=", "✓": "v", "✕": "x", "★": "*", "≈": "~", "\u00a0": " ", "\u202f": " " };
function transliterate(s: string): string {
  let out = "";
  for (const ch of String(s)) out += GREEK[ch] ?? SYMBOLS[ch] ?? ch;
  return out;
}

// WinAnsi single-byte encoding (CP1252) for the high-range chars we use.
const WINANSI_MAP: Record<number, number> = {
  0x20AC:0x80, 0x201A:0x82, 0x0192:0x83, 0x201E:0x84, 0x2026:0x85,
  0x2020:0x86, 0x2021:0x87, 0x02C6:0x88, 0x2030:0x89, 0x0160:0x8A,
  0x2039:0x8B, 0x0152:0x8C, 0x017D:0x8E, 0x2018:0x91, 0x2019:0x92,
  0x201C:0x93, 0x201D:0x94, 0x2022:0x95, 0x2013:0x96, 0x2014:0x97,
  0x02DC:0x98, 0x2122:0x99, 0x0161:0x9A, 0x203A:0x9B, 0x0153:0x9C,
  0x017E:0x9E, 0x0178:0x9F,
};
function toWinAnsi(s: string): number[] {
  const out: number[] = [];
  for (const ch of transliterate(s)) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp < 0x80 || (cp >= 0xA0 && cp <= 0xFF)) out.push(cp);
    else if (WINANSI_MAP[cp] !== undefined) out.push(WINANSI_MAP[cp]);
    else out.push(0x3F); // ?
  }
  return out;
}

// Build a PDF string literal — wraps in () and escapes ( ) \ .
function pdfStr(s: string): string {
  const bs = toWinAnsi(s);
  let out = "(";
  for (const b of bs) {
    if (b === 40 || b === 41 || b === 92) out += "\\";
    out += String.fromCharCode(b);
  }
  return out + ")";
}

/** A headline figure in a report (label above, value below). */
export interface PdfKpi {
  label: string;
  value: string;
  sub?: string;
}
export interface PdfTable {
  cols: string[];
  rows: (string | number)[][];
  /** Columns to right-align (numbers); numeric-looking columns are detected anyway. */
  rightCols?: number[];
  /** A bold last row (e.g. Total). */
  total?: (string | number)[];
}
/** One block of a report: a heading, a few lines of text, KPI boxes and/or a table. */
export interface PdfSection {
  title?: string;
  text?: string[];
  kpis?: PdfKpi[];
  table?: PdfTable;
}
export interface PdfDoc {
  title?: string;
  subtitle?: string;
  meta?: string[];
  /** Small line in the header band (who issues it); defaults to the tenant · Slaice. */
  brand?: string;
  sections?: PdfSection[];
  /** Single-table documents (receipts, invoices) — rendered as the first section. */
  table?: PdfTable;
  totals?: string[][];
  footer?: string[];
  /** Landscape for wide tables; chosen automatically above 7 columns. */
  landscape?: boolean;
}

export function downloadPDF(filename: string, doc: PdfDoc) {
  trigger(new Blob([buildPDFBytes(doc) as BlobPart], { type: "application/pdf" }), filename);
}

/* Helvetica advance widths (1/1000 em) for printable ASCII 32–126 — so columns
   are measured, numbers right-align exactly and long cells truncate with "…"
   instead of overlapping. Bold is ~5% wider. */
const HELV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
function textWidth(s: string, size: number, bold = false): number {
  let w = 0;
  for (const b of toWinAnsi(s)) w += b >= 32 && b <= 126 ? HELV[b - 32] : b === 0x80 ? 556 : b === 0x85 ? 1000 : b === 0x96 ? 556 : b === 0x97 ? 1000 : 556;
  return (w / 1000) * size * (bold ? 1.05 : 1);
}
function fitText(s: string, max: number, size: number, bold = false): string {
  if (textWidth(s, size, bold) <= max + 0.5) return s;
  let t = s;
  while (t.length > 1 && textWidth(`${t}…`, size, bold) > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}
const NUMERIC = /^[−\-+]?\s?€?\s?[\d.,]+\s?(%|€|h|min|×)?$/;

/** A branded, paginated A4 report or document (PDF 1.4, Helvetica, Greek transliterated). */
export function buildPDFBytes(doc: PdfDoc): Uint8Array {
  const sections: PdfSection[] = [...(doc.table ? [{ table: doc.table }] : []), ...(doc.sections ?? [])];
  const maxCols = Math.max(0, ...sections.map((x) => x.table?.cols.length ?? 0));
  const land = doc.landscape ?? maxCols > 7;
  const W = land ? 842 : 595;
  const H = land ? 595 : 842;
  const M = 42;
  const R = W - M;
  const BOTTOM = 56;
  const NAVY = "0.043 0.145 0.271";
  const TEAL = "0.051 0.58 0.533";

  const pages: string[][] = [];
  let st: string[] = [];
  let y = 0;
  const rgb = (c: string) => st.push(`${c} rg`);
  const grey = (g: number) => st.push(`${g} ${g} ${g} rg`);
  const font = (bold: boolean, size: number) => st.push(`/${bold ? "F2" : "F1"} ${size} Tf`);
  const text = (x: number, yy: number, s: string) => st.push(`BT ${x.toFixed(1)} ${yy.toFixed(1)} Td ${pdfStr(s)} Tj ET`);
  const rect = (x: number, yy: number, w: number, h: number, fill: string) => st.push(`${fill} rg ${x.toFixed(1)} ${yy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
  const hline = (x1: number, x2: number, yy: number, g = 0.82, w = 0.6) => st.push(`${g} ${g} ${g} RG ${w} w ${x1} ${yy.toFixed(1)} m ${x2} ${yy.toFixed(1)} l S`);

  const newPage = (first: boolean) => {
    st = [];
    pages.push(st);
    if (first) {
      // Header band: issuer line, title, subtitle.
      const bandH = doc.subtitle ? 86 : 70;
      rect(0, H - bandH, W, bandH, NAVY);
      rect(0, H - bandH - 3, W, 3, TEAL);
      grey(1);
      font(false, 8.5);
      text(M, H - 22, (doc.brand ?? "Akti tou Iliou · powered by Slaice").toUpperCase());
      font(true, 19);
      text(M, H - 46, fitText(doc.title ?? "", R - M, 19, true));
      if (doc.subtitle) {
        st.push("0.8 0.86 0.92 rg");
        font(false, 10.5);
        text(M, H - 66, fitText(doc.subtitle, R - M, 10.5));
      }
      y = H - bandH - 22;
      if (doc.meta?.length) {
        grey(0.35);
        font(false, 8.5);
        for (const m of doc.meta) {
          text(M, y, fitText(m, R - M, 8.5));
          y -= 11.5;
        }
        y -= 6;
      }
    } else {
      grey(0.35);
      font(true, 9);
      text(M, H - 30, fitText(doc.title ?? "", R - M - 80, 9, true));
      hline(M, R, H - 38);
      y = H - 56;
    }
  };
  const ensure = (h: number) => {
    if (y - h < BOTTOM) newPage(false);
  };

  newPage(true);

  for (const sec of sections) {
    if (sec.title) {
      // Keep a heading with what follows it (never alone at the foot of a page).
      ensure(sec.table ? 90 : sec.kpis ? 80 : 50);
      y -= 4;
      rgb(NAVY);
      font(true, 12);
      text(M, y, sec.title);
      y -= 16;
    }
    if (sec.text?.length) {
      grey(0.25);
      font(false, 9.5);
      for (const t of sec.text) {
        // Wrap long lines to the page width.
        const words = t.split(" ");
        let cur = "";
        const lines: string[] = [];
        for (const w of words) {
          const next = cur ? `${cur} ${w}` : w;
          if (textWidth(next, 9.5) <= R - M) cur = next;
          else {
            if (cur) lines.push(cur);
            cur = w;
          }
        }
        if (cur) lines.push(cur);
        lines.forEach((l, li) => {
          ensure(14);
          text(M + (li ? 10 : 0), y, fitText(l, R - M - (li ? 10 : 0), 9.5));
          y -= 13;
        });
      }
      y -= 4;
    }
    if (sec.kpis?.length) {
      const per = Math.min(4, sec.kpis.length);
      const gap = 8;
      const bw = (R - M - gap * (per - 1)) / per;
      for (let i = 0; i < sec.kpis.length; i += per) {
        ensure(52);
        sec.kpis.slice(i, i + per).forEach((k, j) => {
          const x = M + j * (bw + gap);
          rect(x, y - 40, bw, 46, "0.953 0.965 0.98");
          grey(0.4);
          font(false, 7.5);
          text(x + 8, y - 6, fitText(k.label.toUpperCase(), bw - 16, 7.5));
          rgb(NAVY);
          font(true, 14);
          text(x + 8, y - 23, fitText(k.value, bw - 16, 14, true));
          if (k.sub) {
            grey(0.45);
            font(false, 7.5);
            text(x + 8, y - 34, fitText(k.sub, bw - 16, 7.5));
          }
        });
        y -= 54;
      }
    }
    if (sec.table) {
      const { cols, rows, rightCols = [], total } = sec.table;
      // PDF shows numbers formatted (1,234.50 in € columns); the CSV keeps raw values.
      const money = cols.map((c) => /€/.test(c));
      const fmt = (v: string | number | undefined, i: number) =>
        typeof v === "number" ? (v || 0).toLocaleString("en-GB", money[i] ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 2 }) : String(v ?? "");
      const all = (total ? [...rows, total] : rows).map((r) => r.map((v, i) => fmt(v, i)));
      const size = cols.length > 8 ? 7.5 : cols.length > 6 ? 8.5 : 9.5;
      const pad = 6;
      const right = cols.map((_, i) => rightCols.includes(i) || (all.length > 0 && all.every((r) => r[i] === "" || r[i] == null || typeof r[i] === "number" || NUMERIC.test(String(r[i]).trim()))));
      // Natural widths (header and the longest cells), then fit to the page:
      // numbers keep their width, short columns keep theirs, long text columns
      // share what is left and wrap (up to 3 lines).
      const nat = cols.map((c, i) => Math.max(textWidth(c, size, true), ...all.slice(0, 400).map((r, ri) => textWidth(String(r[i] ?? ""), size, !!total && ri === all.length - 1))) + pad * 2 + 1);
      const avail = R - M;
      const sum = nat.reduce((a, b) => a + b, 0);
      let widths = [...nat];
      if (sum > avail) {
        let remaining = avail - nat.reduce((a, w, i) => a + (right[i] ? w : 0), 0);
        let flex = cols.map((_, i) => i).filter((i) => !right[i]);
        let changed = true;
        while (changed && flex.length) {
          changed = false;
          const fair = remaining / flex.length;
          for (const i of [...flex]) {
            if (nat[i] <= fair) {
              remaining -= nat[i];
              flex = flex.filter((x) => x !== i);
              changed = true;
            }
          }
        }
        const share = Math.max(36, remaining / Math.max(1, flex.length));
        widths = nat.map((w, i) => (flex.includes(i) ? share : w));
        const s2 = widths.reduce((a, b) => a + b, 0);
        if (s2 > avail) widths = widths.map((w) => (w * avail) / s2);
      } else {
        // Few columns: keep the table compact (label next to its number), not stretched across the page.
        const extra = (avail - sum) / cols.length;
        widths = cols.length <= 3 ? nat.map((w, i) => w + Math.min(extra, i === 0 ? 120 : 40)) : nat.map((w) => w + extra);
      }
      const tableW = widths.reduce((a, b) => a + b, 0);
      const xs = widths.reduce<number[]>((acc, _w, i) => [...acc, i ? acc[i - 1] + widths[i - 1] : M], []);
      const lineH = size + 2.5;
      const wrap = (v: string, w: number, bold: boolean): string[] => {
        if (textWidth(v, size, bold) <= w + 0.5) return [v];
        const words = v.split(" ");
        const lines: string[] = [];
        let cur = "";
        for (const word of words) {
          const next = cur ? `${cur} ${word}` : word;
          if (textWidth(next, size, bold) <= w + 0.5) cur = next;
          else {
            if (cur) lines.push(cur);
            cur = word;
          }
        }
        if (cur) lines.push(cur);
        const out = lines.slice(0, 3).map((l) => fitText(l, w, size, bold));
        if (lines.length > 3) out[2] = fitText(`${out[2]} …`, w, size, bold);
        return out;
      };
      const head = () => {
        const hh = lineH + 8;
        rect(M, y - hh + 4, tableW, hh, "0.894 0.918 0.945");
        rgb(NAVY);
        font(true, size);
        cols.forEach((c, i) => {
          const t = fitText(c, widths[i] - pad * 2, size, true);
          text(right[i] ? xs[i] + widths[i] - pad - textWidth(t, size, true) : xs[i] + pad, y - hh + 9.5, t);
        });
        y -= hh;
      };
      ensure((lineH + 8) * 3);
      head();
      all.forEach((r, ri) => {
        const isTotal = !!total && ri === all.length - 1;
        const cells = cols.map((_, i) => (right[i] ? [fitText(String(r[i] ?? ""), widths[i] - pad * 2, size, isTotal)] : wrap(String(r[i] ?? ""), widths[i] - pad * 2, isTotal)));
        const nLines = Math.max(1, ...cells.map((c) => c.length));
        const rh = nLines * lineH + 7;
        if (y - rh < BOTTOM) {
          newPage(false);
          head();
        }
        if (isTotal) hline(M, M + tableW, y + 3.5, 0.3, 0.8);
        else if (ri % 2 === 1) rect(M, y - rh + 4, tableW, rh, "0.972 0.976 0.984");
        font(isTotal, size);
        grey(isTotal ? 0 : 0.12);
        cells.forEach((lines, i) =>
          lines.forEach((t, li) => text(right[i] ? xs[i] + widths[i] - pad - textWidth(t, size, isTotal) : xs[i] + pad, y - 8 - size * 0.55 - li * lineH, t)),
        );
        y -= rh;
      });
      const rowH = lineH + 7;
      if (!rows.length) {
        grey(0.45);
        font(false, size);
        text(M + pad, y - rowH + 9, "No rows for this selection.");
        y -= rowH;
      }
      y -= 14;
    }
  }

  if (doc.totals?.length) {
    ensure(18 * doc.totals.length + 10);
    hline(M + (R - M) / 2, R, y + 6, 0.3, 0.8);
    for (const [label, value] of doc.totals) {
      rgb(NAVY);
      font(true, 11);
      text(M + (R - M) / 2, y - 8, label);
      text(R - textWidth(value, 11, true), y - 8, value);
      y -= 18;
    }
    y -= 8;
  }
  if (doc.footer?.length) {
    grey(0.4);
    font(false, 8.5);
    for (const f of doc.footer) {
      ensure(12);
      text(M, y, fitText(f, R - M, 8.5));
      y -= 11.5;
    }
  }

  // Page footer on every page: when it was made and "Page n of N".
  const made = new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  pages.forEach((p, i) => {
    st = p;
    hline(M, R, 38, 0.85);
    grey(0.45);
    font(false, 7.5);
    text(M, 26, `Generated ${made} · Slaice`);
    const pn = `Page ${i + 1} of ${pages.length}`;
    text(R - textWidth(pn, 7.5), 26, pn);
  });

  // --- assemble PDF objects ----------------------------------------------
  const n = pages.length;
  const objects: string[] = [];
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
  const kids: string[] = [];
  pages.forEach((p, i) => {
    const pageId = 5 + i * 2;
    const contentId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    const content = p.join("\n");
    objects[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });
  objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${n} >>`;
  const last = 4 + n * 2;
  let body = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  for (let i = 1; i <= last; i++) {
    offsets[i] = body.length;
    body += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = body.length;
  body += `xref\n0 ${last + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= last; i++) body += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  body += `trailer\n<< /Size ${last + 1} /Root 1 0 R /Info << /Title ${pdfStr(doc.title ?? "Report")} /Producer (Slaice) >> >>\nstartxref\n${xrefStart}\n%%EOF`;
  const out = new Uint8Array(body.length);
  for (let i = 0; i < body.length; i++) out[i] = body.charCodeAt(i) & 0xff;
  return out;
}

/* ---------- One report, two formats (AENR-593) ----------
   Screens describe an export once — title, period, KPIs, tables — and get
   the same content as a branded PDF and as a CSV (one titled block per
   section), so the two never drift apart. */
export interface ReportDef extends PdfDoc {
  sections: PdfSection[];
}
/** A single-table document (receipt, invoice) as a report. */
export const docToReport = (d: PdfDoc): ReportDef => ({ ...d, table: undefined, sections: [...(d.table ? [{ table: d.table }] : []), ...(d.sections ?? [])] });
export function reportCsvSections(r: ReportDef): CsvSection[] {
  const head: CsvSection = { title: r.title, rows: [...(r.subtitle ? [[r.subtitle]] : []), ...(r.meta ?? []).map((m) => [m])] };
  return [
    head,
    ...r.sections.flatMap((s): CsvSection[] => {
      const out: CsvSection[] = [];
      if (s.kpis?.length) out.push({ title: s.title, header: ["Measure", "Value", "Note"], rows: s.kpis.map((k) => [k.label, k.value, k.sub ?? ""]) });
      if (s.text?.length && !s.table && !s.kpis?.length) out.push({ title: s.title, rows: s.text.map((t) => [t]) });
      if (s.table) out.push({ title: s.kpis?.length ? undefined : s.title, header: s.table.cols, rows: s.table.total ? [...s.table.rows, s.table.total] : s.table.rows });
      return out;
    }),
    ...(r.totals?.length ? [{ title: "Totals", rows: r.totals }] : []),
    ...(r.footer?.length ? [{ rows: r.footer.map((f) => [f]) }] : []),
  ];
}
export function downloadReport(filename: string, r: ReportDef, format: "pdf" | "csv") {
  const base = filename.replace(/\.(pdf|csv)$/i, "");
  if (format === "pdf") downloadPDF(`${base}.pdf`, r);
  else downloadCSVReport(`${base}.csv`, reportCsvSections(r));
}

/* ============================================================
   Zero-dependency ZIP writer (STORE / no compression).
   ============================================================ */

let CRC_TABLE: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      CRC_TABLE[n] = c;
    }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// Write a little-endian uint16 / uint32 into a Uint8Array at offset.
function w16(buf: Uint8Array, o: number, v: number) { buf[o] = v & 0xFF; buf[o + 1] = (v >>> 8) & 0xFF; }
function w32(buf: Uint8Array, o: number, v: number) {
  buf[o] = v & 0xFF; buf[o + 1] = (v >>> 8) & 0xFF;
  buf[o + 2] = (v >>> 16) & 0xFF; buf[o + 3] = (v >>> 24) & 0xFF;
}

export interface ZipFile {
  name: string;
  content: Uint8Array | string;
}

// Build a ZIP (STORE) in memory and return the bytes.
export function zipBytes(files: ZipFile[]): Uint8Array {
  const enc = new TextEncoder();
  const entries = files.map((f) => {
    const data = typeof f.content === "string" ? enc.encode(f.content) : f.content;
    return { name: enc.encode(f.name), data, crc: crc32(data) };
  });

  // Local file headers + data
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const localHdr = new Uint8Array(30 + e.name.length);
    w32(localHdr, 0, 0x04034b50);    // signature
    w16(localHdr, 4, 20);             // version
    w16(localHdr, 6, 0);              // flags
    w16(localHdr, 8, 0);              // method 0 = store
    w16(localHdr, 10, 0); w16(localHdr, 12, 0); // mtime/mdate
    w32(localHdr, 14, e.crc);
    w32(localHdr, 18, e.data.length); // comp size
    w32(localHdr, 22, e.data.length); // uncomp size
    w16(localHdr, 26, e.name.length);
    w16(localHdr, 28, 0);             // extra len
    localHdr.set(e.name, 30);
    localParts.push(localHdr, e.data);

    const central = new Uint8Array(46 + e.name.length);
    w32(central, 0, 0x02014b50);
    w16(central, 4, 20); w16(central, 6, 20);
    w16(central, 8, 0); w16(central, 10, 0);
    w16(central, 12, 0); w16(central, 14, 0);
    w32(central, 16, e.crc);
    w32(central, 20, e.data.length);
    w32(central, 24, e.data.length);
    w16(central, 28, e.name.length);
    w16(central, 30, 0); w16(central, 32, 0);
    w16(central, 34, 0); w16(central, 36, 0);
    w32(central, 38, 0);
    w32(central, 42, offset);
    central.set(e.name, 46);
    centralParts.push(central);

    offset += localHdr.length + e.data.length;
  }

  // End of central directory
  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const centralOffset = offset;
  const eocd = new Uint8Array(22);
  w32(eocd, 0, 0x06054b50);
  w16(eocd, 4, 0); w16(eocd, 6, 0);
  w16(eocd, 8, entries.length); w16(eocd, 10, entries.length);
  w32(eocd, 12, centralSize); w32(eocd, 16, centralOffset);
  w16(eocd, 20, 0);

  const total = offset + centralSize + eocd.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of localParts)   { out.set(p, pos); pos += p.length; }
  for (const p of centralParts) { out.set(p, pos); pos += p.length; }
  out.set(eocd, pos);
  return out;
}

export function downloadZIP(filename: string, files: ZipFile[]) {
  trigger(new Blob([zipBytes(files) as BlobPart], { type: "application/zip" }), filename);
}

/** An existing multi-section CSV as a report: "Metric" blocks become KPI boxes,
 *  everything else a table; a last row starting "Total" is set as the total. */
export function csvSectionsToReport(base: Omit<ReportDef, "sections">, secs: CsvSection[]): ReportDef {
  return {
    ...base,
    sections: secs.map((c): PdfSection => {
      const head = (c.header ?? []).map(String);
      if (head[0] === "Metric" || head[0] === "Measure")
        return {
          title: c.title,
          kpis: c.rows.map((r) => {
            const label = String(r[0]).trim();
            const euro = /\(€\)/.test(label);
            const v = r[1];
            const pct = /\s%$/.test(label);
            const value = typeof v === "number" ? `${euro ? "€" : ""}${v.toLocaleString("en-GB", { maximumFractionDigits: euro ? 0 : 2 })}${pct ? "%" : ""}` : String(v ?? "—");
            return { label: label.replace(/\s*\(€\)/, "").replace(/\s%$/, ""), value, sub: r.slice(2).filter((x) => x !== "" && x !== "—").map((x) => (typeof x === "number" && /%/.test(head[2] ?? "") ? `${x}%` : String(x))).join(" · ") || undefined };
          }),
        };
      if (!head.length) return { title: c.title, text: c.rows.map((r) => r.join("  ")) };
      const last = c.rows[c.rows.length - 1];
      const hasTotal = !!last && /^total/i.test(String(last[0]));
      return { title: c.title, table: { cols: head, rows: hasTotal ? c.rows.slice(0, -1) : c.rows, total: hasTotal ? last : undefined } };
    }),
  };
}

/** A Slaice subscription invoice to a tenant — the same document from Platform and from the tenant's Billing page. */
export function slaiceInvoice(i: { no: string; period: string; amount: number; status: string; due: string }, t: { name: string; legalName: string; vatNo: string }, planLabel: string): ReportDef {
  const net = Math.round((i.amount / 1.24) * 100) / 100;
  return {
    brand: "Slaice Technologies IKE · VAT EL801234567 · Athens",
    title: `Invoice ${i.no}`,
    subtitle: `${t.legalName} · VAT ${t.vatNo}`,
    meta: [`Period ${i.period} · due ${i.due} · status ${i.status}`, `Bill to: ${t.legalName} (${t.name})`],
    sections: [{ table: { cols: ["Description", "Net (€)", "VAT 24% (€)", "Total (€)"], rows: [[`${planLabel} · ${i.period}`, net, Math.round((i.amount - net) * 100) / 100, i.amount]], total: ["Total", net, Math.round((i.amount - net) * 100) / 100, i.amount] } }],
    footer: ["Paid by SEPA Direct Debit on the due date. Questions: billing@slaice.app"],
  };
}
