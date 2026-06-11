// Defaults for the admin Map Layout Editor (zone arrangement) and the seasonal /
// day-of-week pricing rules. These seed the persisted store the first time, so a
// fresh visitor still sees a sensible beach + a couple of live pricing rules to
// demonstrate the feature. (Pricing *logic* lives in domain/pricing.ts.)
import { ZONES } from "./beach";
import type { PriceRule, ZoneMapItem } from "../domain/types";

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
