/* Rewards that apply themselves (AENR-619).
   An earned reward is worth money when its wording names a discount the basket
   can take ("10% off sunbeds", "Free entry", "€5 off"); checkout applies the
   best one on its own, as a line the guest can remove. Rewards that are a
   treat on site ("Free coffee") ride along on the visit's QR instead. */
import type { CartItem } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A reward the guest has earned and may use now. */
export interface EarnedReward {
  /** Scheme id. */
  id: string;
  title: string;
  /** The reward in words, as the beach configured it. */
  reward: string;
  /** Tier perks apply to every booking; milestone, birthday and custom rewards once. */
  reusable: boolean;
}

/** What `reward` takes off this basket (0 when it isn't a discount on these items). */
export function rewardValue(reward: string, cart: readonly CartItem[]): number {
  const sum = (k?: CartItem["kind"]) => cart.filter((i) => !k || i.kind === k).reduce((a, i) => a + i.price, 0);
  const cheapest = (k: CartItem["kind"], unit = false) => {
    const prices = cart.filter((i) => i.kind === k).map((i) => (unit && i.qty ? i.price / i.qty : i.price));
    return prices.length ? Math.min(...prices) : 0;
  };
  const r = reward.toLowerCase();
  const pct = r.match(/(\d+(?:\.\d+)?)\s*%\s*off(?:\s+(sunbeds?|entry|tickets?|everything|next visit))?/);
  if (pct) {
    const what = pct[2] ?? "everything";
    const base = what.startsWith("sunbed") ? sum("sunbed") : what === "entry" || what.startsWith("ticket") ? sum("ticket") : sum();
    return round2((base * Number(pct[1])) / 100);
  }
  const off = r.match(/€\s*(\d+(?:\.\d+)?)\s*off/);
  if (off) return round2(Math.min(Number(off[1]), sum()));
  // "Free …" — one of the item, the cheapest in the basket; several freebies add up.
  let free = 0;
  if (/free sunbed/.test(r)) free += cheapest("sunbed");
  if (/free entry/.test(r)) free += cheapest("ticket", true);
  if (/free parking/.test(r)) free += cheapest("parking");
  if (/free locker/.test(r)) free += cheapest("locker");
  return round2(free);
}

/** Whether a reward is a discount checkout can take (otherwise it's a treat on site). */
export const appliesAtCheckout = (reward: string) => /%\s*off|€\s*\d+(?:\.\d+)?\s*off|free (sunbed|entry|parking|locker)/i.test(reward);

/** The reward worth the most on this basket, or null when none takes anything off. */
export function bestReward(earned: readonly EarnedReward[], cart: readonly CartItem[]): { reward: EarnedReward; amount: number } | null {
  let best: { reward: EarnedReward; amount: number } | null = null;
  for (const e of earned) {
    const amount = rewardValue(e.reward, cart);
    if (amount > 0 && (!best || amount > best.amount)) best = { reward: e, amount };
  }
  return best;
}

/** The rewards the guest can use now: earned ("claim") states, minus single-use ones already used. */
export function usableRewards(
  rewards: readonly { id: string; title: string; state: { kind: string; reward: string } }[],
  used: readonly string[],
): EarnedReward[] {
  return rewards
    .filter((r) => r.state.kind === "claim")
    .map((r) => ({ id: r.id, title: r.title, reward: r.state.reward, reusable: r.id === "tiers" }))
    .filter((r) => r.reusable || !used.includes(r.id));
}
