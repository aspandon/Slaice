// Beach zones — values match the video (Akanthus, Central, Macaw, Bestbuy, Main, Bolivar).
export const ZONES = [
  { id: "akanthus", name: "Akanthus", avail: 67, total: 100, from: 30, color: "#6366f1", prefix: "AK" },
  { id: "central", name: "Central", avail: 83, total: 125, from: 25, color: "#0ea5e9", prefix: "CE" },
  { id: "macaw", name: "Macaw", avail: 16, total: 24, from: 35, color: "#ef4444", prefix: "MC" },
  { id: "bestbuy", name: "Bestbuy", avail: 69, total: 89, from: 22, color: "#22c55e", prefix: "BE" },
  { id: "main", name: "Main", avail: 44, total: 65, from: 28, color: "#f59e0b", prefix: "MA" },
  { id: "bolivar", name: "Bolivar", avail: 57, total: 86, from: 18, color: "#a855f7", prefix: "BO" },
];

// Angled cluster block positions across the sand (full-beach overview), matching the video.
export const ZONE_BLOCKS = [
  { id: "akanthus", left: "1.5%", top: "72%", w: "15%", rot: -6 },
  { id: "central", left: "18%", top: "75%", w: "16%", rot: -3 },
  { id: "macaw", left: "37.5%", top: "77%", w: "9%", rot: -1 },
  { id: "bestbuy", left: "48.5%", top: "76%", w: "15%", rot: 2 },
  { id: "main", left: "65%", top: "74%", w: "15%", rot: 5 },
  { id: "bolivar", left: "82%", top: "71%", w: "15.5%", rot: 7 },
];

// Build a deterministic sunbed grid for a zone.
// state: "a" available · "h" on hold · "u" unavailable
export function makeGrid(zone, cols = 14, rows = 8) {
  const states = ["a", "a", "a", "h", "a", "u", "a", "a", "h", "a", "a", "u", "a", "a"];
  const arr = [];
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
export function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function fromISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toISO(d);
}
// { label, sub } for a date — "Today"/"Tomorrow"/weekday + dd MMM
export function chipLabel(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = fromISO(iso);
  const diff = Math.round((d - today) / 86400000);
  const sub = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  if (diff === 0) return { label: "Today", sub };
  if (diff === 1) return { label: "Tomorrow", sub };
  return { label: d.toLocaleDateString("en-GB", { weekday: "short" }), sub };
}
// Quick strip: today + next n-1 days, each with iso + label + sub.
export const dateStrip = (n = 7) => {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: n }).map((_, i) => {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    const iso = toISO(dt);
    return { iso, ...chipLabel(iso) };
  });
};

// Static facility pins overlaid on the beach overview. Coordinates are in
// the same percentage space as ZONE_BLOCKS, so they sit on the sand strip.
export const FACILITIES = [
  { id: "bar1",   kind: "bar",     label: "Beach bar",     left: "9%",  top: "62%" },
  { id: "bar2",   kind: "bar",     label: "Sunset bar",    left: "73%", top: "63%" },
  { id: "wc1",    kind: "wc",      label: "Restrooms",     left: "35%", top: "60%" },
  { id: "wc2",    kind: "wc",      label: "Restrooms",     left: "62%", top: "61%" },
  { id: "shower", kind: "shower",  label: "Outdoor shower", left: "26%", top: "65%" },
  { id: "shower2",kind: "shower",  label: "Outdoor shower", left: "53%", top: "65%" },
  { id: "first",  kind: "first",   label: "First aid",     left: "44%", top: "60%" },
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

// Quick-pick presets for the beach overview.
// One bed = one umbrella set = 2 people, so bed counts are half the headcount
// (Couple → 1 set, Family · 4 → 2 sets).
export const QUICK_PICKS = [
  { id: "solo",   label: "1 person",  beds: 1, hint: "First available · cheapest" },
  { id: "couple", label: "Couple",    beds: 1, hint: "One set · shared shade" },
  { id: "family", label: "Family · 4",beds: 2, hint: "Two sets · adjacent" },
  { id: "front",  label: "Front row", beds: 2, hint: "Closest to the sea" },
];

export const TENANT = {
  name: "Akti tou Iliou",
  place: "Alimos",
  subdomain: "aktitouiliou.slaice.app",
};
