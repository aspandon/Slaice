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
  { id: "akanthus", left: "1.5%", top: "55%", w: "15%", rot: -6 },
  { id: "central", left: "18%", top: "58%", w: "16%", rot: -3 },
  { id: "macaw", left: "37.5%", top: "60%", w: "9%", rot: -1 },
  { id: "bestbuy", left: "48.5%", top: "59%", w: "15%", rot: 2 },
  { id: "main", left: "65%", top: "57%", w: "15%", rot: 5 },
  { id: "bolivar", left: "82%", top: "54%", w: "15.5%", rot: 7 },
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

export const dateStrip = () => {
  const days = ["Today", "Tomorrow", "Sat", "Sun", "Mon", "Tue", "Wed"];
  const base = new Date();
  return days.map((d, i) => {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    return { label: d, sub: dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) };
  });
};

export const TENANT = {
  name: "Akti tou Iliou",
  place: "Alimos",
  subdomain: "aktitouiliou.slaice.app",
};
