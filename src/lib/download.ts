// Trigger a browser download from in-memory data.
function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
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
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCSV(filename: string, header: (string | number)[], rows: (string | number)[][]) {
  const lines = [header.map(escapeCSV).join(",")];
  rows.forEach((r) => lines.push(r.map(escapeCSV).join(",")));
  trigger(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" }), filename);
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
function transliterate(s: string): string {
  let out = "";
  for (const ch of String(s)) out += GREEK[ch] ?? ch;
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

export interface PdfDoc {
  title?: string;
  subtitle?: string;
  meta?: string[];
  table?: { cols: string[]; rows: (string | number)[][]; rightCols?: number[] };
  totals?: string[][];
  footer?: string[];
}

export function downloadPDF(filename: string, doc: PdfDoc) {
  trigger(new Blob([buildPDFBytes(doc) as BlobPart], { type: "application/pdf" }), filename);
}

export function buildPDFBytes(doc: PdfDoc): Uint8Array {
  // Page geometry: A4 portrait (595 × 842 pt). Margins 50pt left/right.
  const W = 595, MARGIN = 50, RIGHT = 545;
  const stream: string[] = [];
  let y = 800;

  // --- drawing helpers (write into the content stream) -------------------
  const setFont = (key: string, size: number) => stream.push(`/${key} ${size} Tf`);
  const setGrey = (g: number) => stream.push(`${g} ${g} ${g} rg`);
  const black = () => stream.push(`0 0 0 rg`);
  const text = (x: number, yy: number, s: string) => stream.push(`BT ${x} ${yy} Td ${pdfStr(s)} Tj ET`);
  const line = (x1: number, y1: number, x2: number, y2: number, g = 0.85) => stream.push(`${g} ${g} ${g} RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`);

  // Cheap text-width estimate for Helvetica — good enough to right-align prices.
  const tw = (s: string, size: number) => toWinAnsi(s).length * size * 0.5;

  // --- title block --------------------------------------------------------
  black();
  setFont("F2", 18); text(MARGIN, y, doc.title || ""); y -= 22;
  if (doc.subtitle) { setFont("F1", 11); setGrey(0.4); text(MARGIN, y, doc.subtitle); y -= 16; }
  if (doc.meta && doc.meta.length) {
    setFont("F1", 9); setGrey(0.45);
    for (const m of doc.meta) { text(MARGIN, y, m); y -= 11; }
  }
  y -= 6;
  line(MARGIN, y, RIGHT, y); y -= 16;

  // --- table --------------------------------------------------------------
  if (doc.table) {
    const { cols, rows, rightCols = [] } = doc.table;
    const n = cols.length;
    const restW = 300;
    const colX: number[] = [MARGIN];
    const stepW = restW / (n - 1);
    for (let i = 1; i < n; i++) colX.push(RIGHT - restW + (i - 1) * stepW);
    // header
    black(); setFont("F2", 9);
    for (let i = 0; i < n; i++) {
      const tx = rightCols.includes(i) ? colX[i] - tw(cols[i], 9) + stepW * 0.9 : colX[i];
      text(tx, y, cols[i]);
    }
    y -= 8; line(MARGIN, y, RIGHT, y); y -= 14;
    // rows
    setFont("F1", 10.5); black();
    for (const r of rows) {
      for (let i = 0; i < r.length; i++) {
        const v = String(r[i] ?? "");
        const tx = rightCols.includes(i) ? colX[i] - tw(v, 10.5) + stepW * 0.9 : colX[i];
        text(tx, y, v);
      }
      y -= 15;
    }
    y -= 4; line(MARGIN, y, RIGHT, y); y -= 18;
  }

  // --- totals -------------------------------------------------------------
  if (doc.totals && doc.totals.length) {
    setFont("F2", 11); black();
    for (const [label, value] of doc.totals) {
      text(MARGIN, y, label);
      text(RIGHT - tw(value, 11), y, value);
      y -= 16;
    }
    y -= 6;
  }

  // --- footer -------------------------------------------------------------
  if (doc.footer && doc.footer.length) {
    setFont("F1", 9); setGrey(0.45);
    for (const f of doc.footer) { text(MARGIN, y, f); y -= 12; }
  }

  // --- assemble PDF objects ----------------------------------------------
  const objects: string[] = [];
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`;
  objects[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`;
  objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objects[5] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
  const content = stream.join("\n");
  objects[6] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;

  // Concatenate into a binary string with byte-accurate offsets.
  let body = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  for (let i = 1; i <= 6; i++) {
    offsets[i] = body.length;
    body += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = body.length;
  body += `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 1; i <= 6; i++) body += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  body += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  // Convert binary string → Uint8Array (each char already 0..255).
  const out = new Uint8Array(body.length);
  for (let i = 0; i < body.length; i++) out[i] = body.charCodeAt(i) & 0xFF;
  return out;
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
