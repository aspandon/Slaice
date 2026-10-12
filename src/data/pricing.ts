// Defaults for the admin Map Layout Editor (zone arrangement) and the seasonal /
// day-of-week pricing rules. These seed the persisted store the first time, so a
// fresh visitor still sees a sensible beach + a couple of live pricing rules to
// demonstrate the feature. (Pricing *logic* lives in domain/pricing.ts.)
import { ZONES } from "./beach";
import type { BeachPricing, Landmark, LandmarkKind, PriceCategory, PriceRule, ZoneMapItem } from "../domain/types";

// Seed zone positions across the lower (sand) band of the editor canvas: a 3×2
// grid, all sitting on the sand so they read as beach plots, not floating sea.
export const DEFAULT_ZONE_MAP: ZoneMapItem[] = ZONES.map((z, i) => ({
  id: z.id,
  name: z.name,
  prefix: z.prefix,
  color: z.color,
  total: z.total,
  rows: 8,
  cols: Math.max(6, Math.round(z.total / 8)),
  x: 6 + (i % 3) * 32,
  y: 30 + Math.floor(i / 3) * 30,
}));

// A couple of demonstrative rules so the feature isn't empty on first load:
// peak August weekends cost more; July weekdays get an early-bird discount.
export const DEFAULT_PRICE_RULES: PriceRule[] = [
  { id: "r-aug-weekend", label: "August weekends", zone: "all", from: "2026-08-01", to: "2026-08-31", days: "weekend", mode: "addAbs", amount: 10, enabled: true },
  { id: "r-jul-weekday", label: "July weekday early-bird", zone: "all", from: "2026-07-01", to: "2026-07-31", days: "weekday", mode: "addPct", amount: -10, enabled: true },
];

/* ---------- Price categories & landmarks (AENR-469) ----------
   Every store starts with three row-based categories — the generated layouts
   assign them by row — so the back row stays at the store's "from" price. The
   palette is a fixed token set; codes always accompany the colour. */
export const CATEGORY_COLORS = ["#3a47cc", "#0ea5e9", "#0D9488", "#f59e0b", "#a855f7", "#ec4899", "#64748b"];
export const catId = (zoneId: string, code: "fr" | "st" | "bk") => `${zoneId}-${code}`;
export const DEFAULT_CATEGORIES: PriceCategory[] = ZONES.flatMap((z) => [
  { id: catId(z.id, "fr"), zoneId: z.id, name: "Front row", code: "FR", color: CATEGORY_COLORS[0], price: z.from + 15 },
  { id: catId(z.id, "st"), zoneId: z.id, name: "Standard", code: "ST", color: CATEGORY_COLORS[1], price: z.from + 5 },
  { id: catId(z.id, "bk"), zoneId: z.id, name: "Back", code: "BK", color: CATEGORY_COLORS[2], price: z.from },
]);
export const DEFAULT_LANDMARKS: Landmark[] = [
  ...ZONES.map((z) => ({ id: `lm-${z.id}-in`, zoneId: z.id, kind: "entrance" as const, x: 50, y: 97 })),
  ...ZONES.map((z) => ({ id: `lm-${z.id}-sh`, zoneId: z.id, kind: "shower" as const, x: 3, y: 55 })),
  { id: "lm-central-bar", zoneId: "central", kind: "bar", x: 97, y: 30, label: "Beach bar" },
  { id: "lm-macaw-lg", zoneId: "macaw", kind: "lifeguard", x: 97, y: 4 },
  { id: "lm-main-wc", zoneId: "main", kind: "wc", x: 97, y: 70 },
];
export const DEFAULT_BEACH_PRICING: BeachPricing = { categories: DEFAULT_CATEGORIES, overrides: [], landmarks: DEFAULT_LANDMARKS };

export const LANDMARK_LABEL: Record<LandmarkKind, { icon: string; label: string }> = {
  bar: { icon: "🍹", label: "Bar" },
  shower: { icon: "🚿", label: "Shower" },
  wc: { icon: "🚻", label: "WC" },
  lifeguard: { icon: "🛟", label: "Lifeguard" },
  entrance: { icon: "🚪", label: "Entrance" },
  ramp: { icon: "♿", label: "Ramp" },
  path: { icon: "🚶", label: "Path" },
};
