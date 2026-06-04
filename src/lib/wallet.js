// Add-to-Wallet helpers (Apple Wallet .pkpass + Google Wallet save link).
//
// This is a no-backend mockup, so the cryptographic signing that production
// requires (Apple's signature.p7s from a Pass Type cert; a JWT signed by a
// Google service account) happens server-side in the real product. What we do
// here is build the *real artifacts* up to that final signing step:
//   • a structurally-valid, inspectable .pkpass ZIP (pass.json + manifest +
//     icons) that demonstrates the exact data model, and
//   • a Google Wallet "Save" link with the real EventTicket claims.
// Both are honestly labelled as demo in the UI.

import { TENANT } from "../data/beach.js";
import { zipBytes, downloadBlob } from "./download.js";

/* ---------- platform detection ---------- */
// 'ios' | 'android' | 'other' — used to surface the right badge first.
export function detectWalletPlatform() {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  // iPadOS 13+ reports as Mac; detect the touch-capable Mac case too.
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (iOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

/* ---------- SHA-1 (sync, dependency-free) ----------
   Used for the .pkpass manifest. Works on every browser and in non-secure
   contexts (unlike crypto.subtle, which is async + secure-context only). */
export function sha1Hex(bytes) {
  const data = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  const ml = data.length * 8;
  // pad
  const withOne = data.length + 1;
  const total = withOne + ((56 - (withOne % 64) + 64) % 64) + 8;
  const buf = new Uint8Array(total);
  buf.set(data);
  buf[data.length] = 0x80;
  // 64-bit big-endian length (we only need the low 32 bits for our sizes)
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 4, ml >>> 0, false);
  dv.setUint32(total - 8, Math.floor(ml / 0x100000000), false);

  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
  const w = new Uint32Array(80);
  const rol = (n, s) => (n << s) | (n >>> (32 - s));
  for (let i = 0; i < total; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4, false);
    for (let j = 16; j < 80; j++) w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let j = 0; j < 80; j++) {
      let f, k;
      if (j < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
      else if (j < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
      else { f = b ^ c ^ d; k = 0xCA62C1D6; }
      const t = (rol(a, 5) + f + e + k + w[j]) >>> 0;
      e = d; d = c; c = rol(b, 30) >>> 0; b = a; a = t;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  const hex = (n) => n.toString(16).padStart(8, "0");
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4);
}

/* ---------- tiny PNG icon (canvas, with a safe fallback) ---------- */
// A valid 1×1 transparent PNG — used if <canvas> is unavailable.
const FALLBACK_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Draw a branded square (navy field + gold sun) and return PNG bytes.
function brandPng(size) {
  try {
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("no 2d");
    ctx.fillStyle = "#0B2545";
    ctx.fillRect(0, 0, size, size);
    // gold sun
    ctx.fillStyle = "#f2b705";
    ctx.beginPath();
    ctx.arc(size / 2, size * 0.42, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // teal wave
    ctx.strokeStyle = "#5EEAD4";
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.72);
    ctx.quadraticCurveTo(size * 0.35, size * 0.64, size * 0.5, size * 0.72);
    ctx.quadraticCurveTo(size * 0.65, size * 0.8, size * 0.8, size * 0.72);
    ctx.stroke();
    const url = c.toDataURL("image/png");
    return b64ToBytes(url.split(",")[1]);
  } catch {
    return b64ToBytes(FALLBACK_PNG_B64);
  }
}

/* ---------- Apple Wallet (.pkpass) ---------- */
export function buildPassJson(pass) {
  const qr = {
    format: "PKBarcodeFormatQR",
    message: pass.ref,
    messageEncoding: "iso-8859-1",
    altText: pass.ref,
  };
  return {
    formatVersion: 1,
    passTypeIdentifier: "pass.app.slaice.akti",
    serialNumber: pass.ref,
    teamIdentifier: "SLAICE0000",
    organizationName: TENANT.name,
    description: `${TENANT.name} — beach entry pass`,
    logoText: TENANT.name,
    foregroundColor: "rgb(255,255,255)",
    backgroundColor: "rgb(11,37,69)",
    labelColor: "rgb(94,234,212)",
    barcode: qr,
    barcodes: [qr],
    eventTicket: {
      primaryFields: [{ key: "zone", label: "BEACH ZONE", value: pass.zone || "Akti tou Iliou" }],
      secondaryFields: [
        { key: "date", label: "DATE", value: pass.date || "" },
        { key: "guests", label: "GUESTS", value: String(pass.guests ?? "") },
      ],
      auxiliaryFields: [
        { key: "seat", label: "SUNBED", value: pass.seat || "—" },
        { key: "total", label: "TOTAL", value: pass.total || "" },
      ],
      backFields: [
        { key: "booking", label: "Booking reference", value: pass.ref },
        { key: "holder", label: "Guest", value: pass.holder || "" },
        { key: "terms", label: "Terms", value: "Show this QR at the gate. Validated in real time by the controller." },
      ],
    },
  };
}

// Returns the .pkpass bytes (a real ZIP). No signature.p7s — that is produced
// server-side from the Pass Type ID certificate in production.
export function buildPkpassBytes(pass) {
  const passJson = JSON.stringify(buildPassJson(pass), null, 2);
  const icon = brandPng(29);
  const icon2x = brandPng(58);
  const logo = brandPng(48);
  const files = [
    { name: "pass.json", content: passJson },
    { name: "icon.png", content: icon },
    { name: "icon@2x.png", content: icon2x },
    { name: "logo.png", content: logo },
  ];
  const manifest = {};
  for (const f of files) manifest[f.name] = sha1Hex(f.content);
  files.push({ name: "manifest.json", content: JSON.stringify(manifest, null, 2) });
  return zipBytes(files);
}

export function downloadPkpass(pass) {
  const bytes = buildPkpassBytes(pass);
  downloadBlob(new Blob([bytes], { type: "application/vnd.apple.pkpass" }), `slaice-${pass.ref}.pkpass`);
}

/* ---------- Google Wallet (Save link) ---------- */
function base64url(obj) {
  const json = typeof obj === "string" ? obj : JSON.stringify(obj);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// The EventTicket claims a backend would sign. We return the object + a
// representative save URL (token unsigned — production signs with the issuer's
// service-account key).
export function buildGoogleSave(pass) {
  const obj = {
    iss: "slaice@beach.iam.gserviceaccount.com",
    aud: "google",
    typ: "savetowallet",
    payload: {
      eventTicketObjects: [
        {
          id: `slaice.akti.${pass.ref}`,
          classId: "slaice.akti.beachpass",
          state: "ACTIVE",
          ticketHolderName: pass.holder || "",
          ticketNumber: pass.ref,
          seatInfo: { seat: { kind: "walletobjects#eventSeat", seat: { defaultValue: pass.seat || "—" } } },
          barcode: { type: "QR_CODE", value: pass.ref, alternateText: pass.ref },
          hexBackgroundColor: "#0B2545",
        },
      ],
    },
  };
  return { claims: obj, url: `https://pay.google.com/gp/v/save/${base64url({ alg: "RS256", typ: "JWT" })}.${base64url(obj)}.` };
}

// Copy the Save link to the clipboard (clipboard API with a legacy fallback).
export async function copyGoogleSaveLink(pass) {
  const { url } = buildGoogleSave(pass);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch { /* fall through to legacy path */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = url;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
