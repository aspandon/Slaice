// Pass defaults + helpers. VIP credit and the Season pass are bought by the
// customer, priced by the admin (PassPricing), and spent at Checkout.
import type { CustomerPasses, PassPricing, SeasonPlan } from "../domain/types";

/** End-of-season label — VIP credit and the summer Season pass run to here. */
export const SEASON_END_LABEL = "30 Sep 2026";

export const DEFAULT_PASSES: CustomerPasses = { vip: null, season: null };

export const DEFAULT_PASS_PRICING: PassPricing = {
  vipTiers: [500, 1000],
  vipDiscount: 0.2,
  seasonMonthly: 120,
  seasonSummer: 350,
};

/** A short label for how long a season plan stays valid. */
export function seasonValidUntil(plan: SeasonPlan): string {
  if (plan === "summer") return `End of season · ${SEASON_END_LABEL}`;
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `Valid to ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
}

export const seasonPlanLabel = (plan: SeasonPlan): string => (plan === "monthly" ? "Monthly" : "Whole summer");

export const round2 = (n: number): number => Math.round(n * 100) / 100;
