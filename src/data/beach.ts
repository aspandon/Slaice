// Beach zones — values match the video (Akanthus, Central, Macaw, Bestbuy, Main, Bolivar).
import type { Sunbed, SunbedState, Zone } from "../domain/types";

export const ZONES: Zone[] = [
  { id: "akanthus", name: "Akanthus", avail: 67, total: 100, from: 30, color: "#6366f1", prefix: "AK" },
  { id: "central", name: "Central", avail: 83, total: 125, from: 25, color: "#0ea5e9", prefix: "CE" },
  { id: "macaw", name: "Macaw", avail: 16, total: 24, from: 35, color: "#ef4444", prefix: "MC" },
  { id: "bestbuy", name: "Bestbuy", avail: 69, total: 89, from: 22, color: "#22c55e", prefix: "BE" },
  { id: "main", name: "Main", avail: 44, total: 65, from: 28, color: "#f59e0b", prefix: "MA" },
  { id: "bolivar", name: "Bolivar", avail: 57, total: 86, from: 18, color: "#a855f7", prefix: "BO" },
];

export interface ZoneBlock {
  id: string;
  left: string;
  top: string;
  w: string;
  rot: number;
}

// Angled cluster block positions across the sand (full-beach overview), matching the video.
export const ZONE_BLOCKS: ZoneBlock[] = [
  { id: "akanthus", left: "1.5%", top: "72%", w: "15%", rot: -6 },
  { id: "central", left: "18%", top: "75%", w: "16%", rot: -3 },
  { id: "macaw", left: "37.5%", top: "77%", w: "9%", rot: -1 },
  { id: "bestbuy", left: "48.5%", top: "76%", w: "15%", rot: 2 },
  { id: "main", left: "65%", top: "74%", w: "15%", rot: 5 },
  { id: "bolivar", left: "82%", top: "71%", w: "15.5%", rot: 7 },
];

// Build a deterministic sunbed grid for a zone.
export function makeGrid(zone: Zone, cols = 14, rows = 8): Sunbed[] {
  const states: SunbedState[] = ["a", "a", "a", "h", "a", "u", "a", "a", "h", "a", "a", "u", "a", "a"];
  const arr: Sunbed[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const s = states[(i * 7 + zone.total) % states.length];
    arr.push({
      id: `${zone.prefix}-${String(i + 1).padStart(2, "0")}`,
      s,
      price: zone.from + ((i * 5) % 3) * 5,
      c: i % cols,
      r: Math.floor(i / cols),
    });
  }
  return arr;
}

// --- Date helpers (ISO YYYY-MM-DD is the canonical key) ---
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toISO(d);
}

export interface DateChip {
  label: string;
  sub: string;
}
// { label, sub } for a date — "Today"/"Tomorrow"/weekday + dd MMM.
// `locale` localizes the weekday/month (e.g. "el" → "Κυρ", "6 Ιουν"); `t`
// translates the "Today"/"Tomorrow" tokens. Both default to English/identity so
// non-localized callers keep working.
export function chipLabel(iso: string, locale = "en-GB", t: (s: string) => string = (s) => s): DateChip {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = fromISO(iso);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const sub = d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  if (diff === 0) return { label: t("Today"), sub };
  if (diff === 1) return { label: t("Tomorrow"), sub };
  return { label: d.toLocaleDateString(locale, { weekday: "short" }), sub };
}
// Quick strip: today + next n-1 days, each with iso + label + sub.
export const dateStrip = (n = 7, locale = "en-GB", t: (s: string) => string = (s) => s): Array<DateChip & { iso: string }> => {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: n }).map((_, i) => {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    const iso = toISO(dt);
    return { iso, ...chipLabel(iso, locale, t) };
  });
};

export type FacilityKind = "bar" | "wc" | "shower" | "first";
export interface Facility {
  id: string;
  kind: FacilityKind;
  label: string;
  left: string;
  top: string;
}

// Static facility pins overlaid on the beach overview. Coordinates are in
// the same percentage space as ZONE_BLOCKS, so they sit on the sand strip.
export const FACILITIES: Facility[] = [
  { id: "bar1", kind: "bar", label: "Beach bar", left: "9%", top: "62%" },
  { id: "bar2", kind: "bar", label: "Sunset bar", left: "73%", top: "63%" },
  { id: "wc1", kind: "wc", label: "Restrooms", left: "35%", top: "60%" },
  { id: "wc2", kind: "wc", label: "Restrooms", left: "62%", top: "61%" },
  { id: "shower", kind: "shower", label: "Outdoor shower", left: "26%", top: "65%" },
  { id: "shower2", kind: "shower", label: "Outdoor shower", left: "53%", top: "65%" },
  { id: "first", kind: "first", label: "First aid", left: "44%", top: "60%" },
];

// Mocked live weather + tide line for the overview chip.
export const WEATHER = {
  tempC: 28,
  cond: "Sunny",
  wind: "Light NE 8 kn",
  sea: "Calm · 0.3 m",
  uv: 8,
  sunset: "20:42",
};

export interface QuickPick {
  id: string;
  label: string;
  beds: number;
  hint: string;
}

// Quick-pick presets for the beach overview.
// One bed = one umbrella set = 2 people, so bed counts are half the headcount.
export const QUICK_PICKS: QuickPick[] = [
  { id: "solo", label: "1 person", beds: 1, hint: "First available · cheapest" },
  { id: "couple", label: "Couple", beds: 1, hint: "One set · shared shade" },
  { id: "family", label: "Family · 4", beds: 2, hint: "Two sets · adjacent" },
  { id: "front", label: "Front row", beds: 2, hint: "Closest to the sea" },
];

export const TENANT = {
  name: "Akti tou Iliou",
  place: "Alimos",
  subdomain: "aktitouiliou.slaice.app",
};
