// Beach zones — values match the video (Akanthus, Central, Macaw, Bestbuy, Main, Bolivar).
import type { Sunbed, SunbedSlot, SunbedState, Zone } from "../domain/types";

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

// Derive a zone's umbrella-set layout — positions in a normalized 0–100 box —
// from the deterministic grid. This seeds the shared layout the admin Map Editor
// will let tenants customise; the customer wizard renders whatever layout it is
// given, so editor and wizard stay in lock-step. Front row (r=0) sits near the
// sea (small y); the back row sits toward the promenade (large y).
export function zoneLayout(zone: Zone, cols = 8, rows = 6): SunbedSlot[] {
  const padX = 9;
  const padY = 12;
  const spanX = 100 - padX * 2;
  const spanY = 100 - padY * 2;
  return makeGrid(zone, cols, rows).map((b) => ({
    id: b.id,
    x: padX + (cols <= 1 ? spanX / 2 : (b.c / (cols - 1)) * spanX),
    y: padY + (rows <= 1 ? spanY / 2 : (b.r / (rows - 1)) * spanY),
    state: b.s,
    price: b.price,
  }));
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

/* ---- Demo weather ----
   There is no live forecast in the mockup: the conditions are a demo control
   (the pill on the customer Home). Each kind drives the hero chip plus the
   scene — `wind` agitates the live sea / ambient decor, `dim` darkens the
   whole backdrop (multiply tint), `glint` scales the sun sheen on the water. */
export type WeatherKind = "sunny" | "windy" | "overcast" | "rainy";
export interface WeatherDemo {
  label: string;
  tempC: number;
  icon: "sun" | "wind" | "cloud" | "rain";
  wind: number;
  dim: number;
  glint: number;
}
export const WEATHER_KINDS: WeatherKind[] = ["sunny", "windy", "overcast", "rainy"];
export const WEATHER_DEMO: Record<WeatherKind, WeatherDemo> = {
  sunny: { label: "Sunny", tempC: 28, icon: "sun", wind: 0.22, dim: 0, glint: 1 },
  windy: { label: "Windy", tempC: 24, icon: "wind", wind: 1, dim: 0.1, glint: 0.75 },
  overcast: { label: "Overcast", tempC: 22, icon: "cloud", wind: 0.45, dim: 0.26, glint: 0.12 },
  rainy: { label: "Rainy", tempC: 19, icon: "rain", wind: 0.7, dim: 0.34, glint: 0.05 },
};

/* ---- Scene clock (time-of-day lighting) ----
   A demo hour drives the scene's light: cool half-light at dawn, neutral
   daylight, a warm ramp into golden hour (~19:30 peak) and a deep blue dusk.
   Checkout/confirmation override the chosen hour with GOLDEN_HOUR so paying
   reads as the end of a perfect beach day. Both effects (and the weather
   graphics) can be switched off by the admin per tenant. */
export interface SceneFx {
  weather: boolean;
  daytime: boolean;
}
export const DEFAULT_SCENE_FX: SceneFx = { weather: true, daytime: true };
export const DAY_MIN = 5.5;
export const DAY_MAX = 21.5;
export const DAY_DEFAULT = 10;
export const GOLDEN_HOUR = 19.3;

const rampH = (h: number, a: number, b: number) => Math.min(1, Math.max(0, (h - a) / (b - a)));
/** warm = golden-hour factor (0–1), night = dawn/dusk darkening (0–1). */
export function dayLight(h: number): { warm: number; night: number } {
  const warm = rampH(h, 16.5, 19) * (1 - rampH(h, 19.9, 21.2));
  const night = Math.max(1 - rampH(h, 5.5, 7.5), rampH(h, 19.8, 21.5) * 0.85);
  return { warm, night };
}
/** 10.25 → "10:15" for the demo slider label. */
export function fmtHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

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
