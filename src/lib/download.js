// Trigger a browser download from in-memory data.
function trigger(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const escapeCSV = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCSV(filename, header, rows) {
  const lines = [header.map(escapeCSV).join(",")];
  rows.forEach((r) => lines.push(r.map(escapeCSV).join(",")));
  trigger(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" }), filename);
}

export function downloadText(filename, text, mime = "text/plain;charset=utf-8") {
  trigger(new Blob([text], { type: mime }), filename);
}

/* ============================================================
   Zero-dependency PDF 1.4 emitter.
   Renders a receipt-style document with Helvetica + Helvetica-Bold
   (PDF base fonts, no embedding). Strings are encoded in WinAnsi;
   Greek letters are transliterated to Latin so they render rather
   than turning into "?". Returns a real `application/pdf` Blob.
   ============================================================ */

// Greek → Latin transliteration (uppercase + lowercase) so customer
// labels like ΑΠΥ / ΤΠΥ / ΑΦΜ stay readable in WinAnsi.
const GREEK = {
  "Α":"A","Β":"B","Γ":"G","Δ":"D","Ε":"E","Ζ":"Z","Η":"I","Θ":"Th",
  "Ι":"I","Κ":"K","Λ":"L","Μ":"M","Ν":"N","Ξ":"X","Ο":"O","Π":"P",
  "Ρ":"R","Σ":"S","Τ":"T","Υ":"Y","Φ":"F","Χ":"Ch","Ψ":"Ps","Ω":"O",
  "α":"a","β":"b","γ":"g","δ":"d","ε":"e","ζ":"z","η":"i","θ":"th",
  "ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"x","ο":"o","π":"p",
  "ρ":"r","σ":"s","ς":"s","τ":"t","υ":"y","φ":"f","χ":"ch","ψ":"ps","ω":"o",
};
function transliterate(s) {
  let out = "";
  for (const ch of String(s)) out += GREEK[ch] ?? ch;
  return out;
}

// WinAnsi single-byte encoding (CP1252). Maps the high-range chars we
// actually use (€, bullets, en-dash, smart quotes, etc.); everything
// outside falls back to '?'.
const WINANSI_MAP = {
  0x20AC:0x80, 0x201A:0x82, 0x0192:0x83, 0x201E:0x84, 0x2026:0x85,
  0x2020:0x86, 0x2021:0x87, 0x02C6:0x88, 0x2030:0x89, 0x0160:0x8A,
  0x2039:0x8B, 0x0152:0x8C, 0x017D:0x8E, 0x2018:0x91, 0x2019:0x92,
  0x201C:0x93, 0x201D:0x94, 0x2022:0x95, 0x2013:0x96, 0x2014:0x97,
  0x02DC:0x98, 0x2122:0x99, 0x0161:0x9A, 0x203A:0x9B, 0x0153:0x9C,
  0x017E:0x9E, 0x0178:0x9F,
};
function toWinAnsi(s) {
  const out = [];
  for (const ch of transliterate(s)) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80 || (cp >= 0xA0 && cp <= 0xFF)) out.push(cp);
    else if (WINANSI_MAP[cp] !== undefined) out.push(WINANSI_MAP[cp]);
    else out.push(0x3F); // ?
  }
  return out;
}

// Build a PDF string literal — wraps in () and escapes ( ) \ .
function pdfStr(s) {
  const bs = toWinAnsi(s);
  let out = "(";
  for (const b of bs) {
    if (b === 40 || b === 41 || b === 92) out += "\\";
    out += String.fromCharCode(b);
  }
  return out + ")";
}

/* downloadPDF(filename, doc)
   doc = {
     title:    string  — large headline at the top
     subtitle: string? — secondary headline
     meta:     string[]? — small grey lines under the subtitle
     table:    { cols: string[], rows: string[][], rightCols?: number[] }?
     totals:   [label, value][]? — right-aligned summary lines
     footer:   string[]? — small grey paragraphs at the bottom
   }
*/
export function downloadPDF(filename, doc) {
  trigger(new Blob([buildPDFBytes(doc)], { type: "application/pdf" }), filename);
}

export function buildPDFBytes(doc) {
  // Page geometry: A4 portrait (595 × 842 pt). Margins 50pt left/right.
  const W = 595, MARGIN = 50, RIGHT = 545;
  const stream = [];
  let y = 800;

  // --- drawing helpers (write into the content stream) -------------------
  const setFont = (key, size) => stream.push(`/${key} ${size} Tf`);
  const setGrey = (g) => stream.push(`${g} ${g} ${g} rg`);
  const black = () => stream.push(`0 0 0 rg`);
  const text = (x, yy, s) => stream.push(`BT ${x} ${yy} Td ${pdfStr(s)} Tj ET`);
  const rectFill = (x, yy, w, h, g) => stream.push(`${g} ${g} ${g} rg ${x} ${yy} ${w} ${h} re f`);
  const line = (x1, y1, x2, y2, g = 0.85) => stream.push(`${g} ${g} ${g} RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`);

  // Cheap text-width estimate for Helvetica at the given size — good enough
  // to right-align prices. Real metrics aren't worth the bytes here.
  const tw = (s, size) => {
    // average glyph ~0.5em; digits and . slightly narrower
    const wa = toWinAnsi(s).length;
    return wa * size * 0.5;
  };

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
    // Column x positions: first col wide, rest evenly spaced on the right.
    const restW = 300;
    const colX = [MARGIN];
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
  const objects = [];
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`;
  objects[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`;
  objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objects[5] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
  const content = stream.join("\n");
  objects[6] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;

  // Concatenate into a binary string with byte-accurate offsets.
  let body = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [];
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
   Used by "Download all (ZIP)" so the customer gets one bundle.
   ============================================================ */

// CRC32 table — built once on first use.
let CRC_TABLE = null;
function crc32(bytes) {
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
function w16(buf, o, v) { buf[o] = v & 0xFF; buf[o + 1] = (v >>> 8) & 0xFF; }
function w32(buf, o, v) {
  buf[o] = v & 0xFF; buf[o + 1] = (v >>> 8) & 0xFF;
  buf[o + 2] = (v >>> 16) & 0xFF; buf[o + 3] = (v >>> 24) & 0xFF;
}

// files: [{ name: string, content: Uint8Array | string }]
export function downloadZIP(filename, files) {
  const enc = new TextEncoder();
  const entries = files.map((f) => {
    const data = typeof f.content === "string" ? enc.encode(f.content) : f.content;
    return { name: enc.encode(f.name), data, crc: crc32(data) };
  });

  // Local file headers + data
  const localParts = [];
  const centralParts = [];
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

  trigger(new Blob([out], { type: "application/zip" }), filename);
}
