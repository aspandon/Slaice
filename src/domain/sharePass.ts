// A booking shared with the people coming along (AENR-715). Everyone gets the
// same booking QR — the group shares one allowance and the gate counts who is
// in (see entry.ts). The link opens a public guest view on any phone, signed in
// or not.
//
// Demo vs production: production links carry an opaque token that the server
// signs and resolves to the live booking. The demo has no server, so the link
// carries the booking itself (ref, day, sets, tickets, a snapshot of who is in)
// with a checksum; the guest view adds the live arrivals when this browser has
// them. Pure functions — no store, no DOM.

import { z } from "zod";

export interface SharedBooking {
  /** Booking reference without "#", e.g. "BK-30001" (also the QR). */
  ref: string;
  /** The beach day, YYYY-MM-DD. */
  date: string;
  /** Who shared it, e.g. "Elena V.". */
  from: string;
  sets: { id: string; zone: string; seats: number }[];
  tickets: { cat: string; label: string; qty: number }[];
  /** People already in when it was shared. */
  entered: number;
  /** When it was shared, YYYY-MM-DDTHH:mm. */
  at: string;
}

/* Compact wire format: short keys and tuples keep the link SMS-sized. */
const Wire = z.object({
  v: z.literal(1),
  r: z.string().regex(/^[A-Z]{1,3}-\d{1,8}$/),
  d: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  f: z.string().max(40),
  s: z
    .array(z.tuple([z.string().max(12), z.string().max(40), z.number().int().min(1).max(12)]))
    .max(20),
  t: z
    .array(z.tuple([z.string().max(24), z.string().max(40), z.number().int().min(1).max(99)]))
    .max(10),
  e: z.number().int().min(0).max(999),
  a: z.string().max(16),
});

function toB64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64Url(s: string): string {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** A short checksum of the payload (two FNV-1a passes). Tamper-evident for the demo — the real
 *  link is signed on the server, never in the browser. */
export function checksum(payload: string): string {
  const fnv = (seed: number) => {
    let h = seed;
    for (let i = 0; i < payload.length; i++) h = Math.imul(h ^ payload.charCodeAt(i), 16777619);
    return (h >>> 0).toString(36);
  };
  return `${fnv(2166136261)}${fnv(0x9747b28c)}`.slice(0, 12);
}

export function encodeShared(b: SharedBooking): string {
  return toB64Url(
    JSON.stringify({
      v: 1,
      r: b.ref,
      d: b.date,
      f: b.from,
      s: b.sets.map((x) => [x.id, x.zone, x.seats]),
      t: b.tickets.map((x) => [x.cat, x.label, x.qty]),
      e: b.entered,
      a: b.at,
    }),
  );
}

/** The guest link for a booking: `<app>#/pass?b=<payload>&k=<checksum>`. */
export function shareLink(appUrl: string, b: SharedBooking): string {
  const payload = encodeShared(b);
  return `${appUrl.replace(/#.*$/, "")}#/pass?b=${payload}&k=${checksum(payload)}`;
}

export type ReadShared =
  | { ok: true; booking: SharedBooking }
  | { ok: false; why: "missing" | "changed" | "unreadable" };

/** Read a guest link's query back — refusing a missing, altered or malformed one. */
export function readShared(q: URLSearchParams): ReadShared {
  const payload = q.get("b");
  const k = q.get("k");
  if (!payload || !k) return { ok: false, why: "missing" };
  if (checksum(payload) !== k) return { ok: false, why: "changed" };
  let raw: unknown;
  try {
    raw = JSON.parse(fromB64Url(payload));
  } catch {
    return { ok: false, why: "unreadable" };
  }
  const w = Wire.safeParse(raw);
  if (!w.success) return { ok: false, why: "unreadable" };
  const x = w.data;
  return {
    ok: true,
    booking: {
      ref: x.r,
      date: x.d,
      from: x.f,
      sets: x.s.map(([id, zone, seats]) => ({ id, zone, seats })),
      tickets: x.t.map(([cat, label, qty]) => ({ cat, label, qty })),
      entered: x.e,
      at: x.a,
    },
  };
}

/** Where a message goes: e-mail, SMS and Viber open with it filled in (nothing is sent by Slaice). */
export function shareTargets(
  text: string,
  subject: string,
): { email: string; sms: string; viber: string } {
  const enc = encodeURIComponent;
  return {
    email: `mailto:?subject=${enc(subject)}&body=${enc(text)}`,
    // "?&body=" works on both iOS and Android.
    sms: `sms:?&body=${enc(text)}`,
    viber: `viber://forward?text=${enc(text)}`,
  };
}

/** People the shared booking admits (tickets, or seats when it has none). */
export const sharedTotal = (b: Pick<SharedBooking, "sets" | "tickets">) =>
  b.tickets.length
    ? b.tickets.reduce((a, t) => a + t.qty, 0)
    : b.sets.reduce((a, s) => a + s.seats, 0);
