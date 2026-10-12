// Derived guest facts for the CRM (Users & Segments). The seed customers carry
// visits, spend, tags and last visit; everything else a segment can filter on
// (channel, favourite zone, party size, language, consent…) is a stable,
// deterministic function of the guest id — sample data, not random per load.

import { ZONES } from "./beach";
import type { Customer } from "../domain/types";
import { DEMO_TODAY, addDays, daysIn, isoFromDayMonth } from "../domain/period";

export interface GuestFacts {
  id: number;
  visits: number;
  spend: number;
  avgSpend: number;
  lastVisit: string; // ISO
  firstVisit: string; // ISO
  daysSinceLast: number;
  channel: "Online" | "Walk-in" | "Phone" | "Cashier";
  zone: string;
  itemTypes: string[];
  partySize: number;
  language: string;
  city: string;
  consent: string[]; // channels with marketing consent: email / sms / viber
  pass: string; // VIP / Season pass / None
  loyaltyTier: string;
  refunds: number;
  tags: string[];
  /** Derived scores (AENR-475), filled in by the CRM screen. */
  lifecycle?: string;
  rfm?: string;
}

const pick = <T>(arr: readonly T[], n: number) => arr[Math.abs(n) % arr.length];
const h = (id: number, salt: number) => {
  let x = (id * 2654435761 + salt * 40503) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  x ^= x >>> 13;
  return x;
};

export const LANGUAGES_CRM = ["el", "en", "de", "fr", "it"];
export const CITIES = [
  "Alimos",
  "Athens",
  "Glyfada",
  "Piraeus",
  "Kallithea",
  "Thessaloniki",
  "Munich",
  "Paris",
  "Milan",
];
export const CHANNELS_CRM = ["Online", "Walk-in", "Phone", "Cashier"] as const;
export const ITEM_TYPES_CRM = ["Sunbed", "Entry ticket", "Locker", "Parking"];

export function guestFacts(c: Customer, tags: string[]): GuestFacts {
  const lastVisit = isoFromDayMonth(c.lastVisit) ?? DEMO_TODAY;
  const firstVisit = (() => {
    const back = Math.min(420, c.bookings * 9 + (h(c.id, 1) % 40));
    const d = addDays(lastVisit, -back);
    return d < "2025-05-01" ? "2025-05-01" : d;
  })();
  const items = [
    "Sunbed",
    ...ITEM_TYPES_CRM.slice(1).filter((_, i) => h(c.id, 10 + i) % 100 < [55, 25, 40][i]),
  ];
  const consent = ["email", "sms", "viber"].filter(
    (_, i) => h(c.id, 20 + i) % 100 < [72, 48, 35][i],
  );
  const pass = c.tags.includes("VIP")
    ? "VIP"
    : c.tags.includes("Season pass")
      ? "Season pass"
      : "None";
  return {
    id: c.id,
    visits: c.bookings,
    spend: c.spend,
    avgSpend: Math.round(c.spend / Math.max(1, c.bookings)),
    lastVisit,
    firstVisit,
    daysSinceLast: Math.max(0, daysIn({ from: lastVisit, to: DEMO_TODAY }) - 1),
    channel: pick(CHANNELS_CRM, h(c.id, 2) % 10 < 5 ? 0 : h(c.id, 3)),
    zone: pick(
      ZONES.map((z) => z.name),
      h(c.id, 4),
    ),
    itemTypes: items,
    partySize: 1 + (h(c.id, 5) % 5),
    language: h(c.id, 6) % 10 < 6 ? "el" : pick(LANGUAGES_CRM, h(c.id, 7)),
    city: pick(CITIES, h(c.id, 8)),
    consent,
    pass,
    loyaltyTier: c.bookings >= 20 ? "Gold" : c.bookings >= 8 ? "Silver" : "Bronze",
    refunds: h(c.id, 9) % 10 < 7 ? 0 : 1 + (h(c.id, 11) % 2),
    tags,
  };
}
