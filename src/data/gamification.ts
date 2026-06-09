// Gamification — achievements that earn a badge when a metric (visits / bookings
// / spend) crosses a threshold. Admin-editable; surfaced as badges on the home.
// Fully serialisable (icon + colour are string keys), so it lives in the store.

export type GameMetric = "visits" | "bookings" | "spend";

export interface Achievement {
  id: string;
  name: string;
  icon: string;   // Icon key (lib/icons)
  color: string;  // BADGE_COLORS key
  metric: GameMetric;
  threshold: number;
}

export interface GameStats { visits: number; bookings: number; spend: number; }
// The signed-in customer's (Elena's) demo stats — partway into the season.
export const HOME_GAME_STATS: GameStats = { visits: 8, bookings: 12, spend: 640 };

/** Summer-vibe badge palette (Tailwind gradient stops). */
export const BADGE_COLORS: Record<string, string> = {
  sun: "from-amber-300 to-amber-500",
  coral: "from-orange-400 to-rose-500",
  gold: "from-yellow-300 to-amber-500",
  teal: "from-teal-400 to-teal-600",
  sky: "from-sky-400 to-cyan-500",
  sea: "from-cyan-400 to-blue-500",
};
export const BADGE_COLOR_KEYS = Object.keys(BADGE_COLORS);

/** Curated summer-y icons the admin can pick for a badge. */
export const BADGE_ICONS = ["sun", "umbrella", "wave", "star", "sparkles", "drop", "ticket", "gift", "seat", "trend", "cash", "wallet"];

export const GAME_METRICS: { v: GameMetric; l: string }[] = [
  { v: "visits", l: "Visits" },
  { v: "bookings", l: "Bookings" },
  { v: "spend", l: "Spend (€)" },
];

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: "first-splash", name: "First Splash", icon: "drop", color: "sky", metric: "visits", threshold: 1 },
  { id: "sun-seeker", name: "Sun Seeker", icon: "sun", color: "sun", metric: "visits", threshold: 5 },
  { id: "big-spender", name: "Big Spender", icon: "wallet", color: "gold", metric: "spend", threshold: 500 },
  { id: "beach-regular", name: "Beach Regular", icon: "umbrella", color: "teal", metric: "visits", threshold: 10 },
  { id: "wave-rider", name: "Wave Rider", icon: "wave", color: "sea", metric: "visits", threshold: 20 },
  { id: "summer-legend", name: "Summer Legend", icon: "star", color: "coral", metric: "visits", threshold: 30 },
];

export const statValue = (s: GameStats, m: GameMetric): number => (m === "spend" ? s.spend : m === "bookings" ? s.bookings : s.visits);
export const metricLabel = (m: GameMetric): string => (m === "spend" ? "spend" : m === "bookings" ? "bookings" : "visits");
export const metricFmt = (m: GameMetric, n: number): string => (m === "spend" ? `€${n.toLocaleString()}` : `${n}`);
