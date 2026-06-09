// Loyalty schemes — the shared model written by the admin Loyalty screen and
// read by the customer Home (to show active rewards + progress). Config (which
// schemes are on, and their values) is serialisable and lives in the app store;
// the scheme *definitions* (icons, summaries, progress) are reconstructed here.
import { Icon } from "../lib/icons";
import type { IconRenderer } from "../lib/icons";
import { ZONES } from "./beach";

export const LOYALTY_REWARDS = ["10% off sunbeds", "20% off sunbeds", "Free coffee with a set", "Free drink with a set", "Free entry ticket", "Buy 1 set, 2nd half price"];

export type SchemeFieldType = "select" | "number" | "time" | "text";
export interface SchemeField {
  key: string;
  label: string;
  type: SchemeFieldType;
  def: string | number;
  options?: string[];
  suffix?: string;
  min?: number;
  max?: number;
  /** Span both columns of the config grid (free-text perks / names). */
  full?: boolean;
}
export type SchemeValues = Record<string, string | number>;
export interface LoyaltyScheme {
  id: string;
  icon: IconRenderer;
  title: string;
  blurb: string;
  eg: string;
  fields: SchemeField[];
  summarize: (v: SchemeValues) => string;
  /** User-added scheme: title comes from a field and it can be removed. */
  custom?: boolean;
}

export const BUILTIN_SCHEMES: LoyaltyScheme[] = [
  {
    id: "milestones", icon: Icon.star, title: "Visit milestones",
    blurb: "A stamp card — every Nth visit is on the house, tracked automatically by the gate QR.", eg: "10th sunbed free",
    fields: [
      { key: "everyN", label: "Free every", type: "number", def: 10, suffix: "visits", min: 2, max: 50 },
      { key: "reward", label: "Reward", type: "select", def: "Free sunbed", options: ["Free sunbed", "Free entry", "Free coffee", "20% off next visit"] },
    ],
    summarize: (v) => `Every ${v.everyN} visits → ${v.reward}`,
  },
  {
    id: "happy", icon: Icon.clock, title: "Happy hours & early-bird",
    blurb: "Discount the quiet slots so they fill up instead of sitting empty.", eg: "Weekdays 9–11 → 20% off front row",
    fields: [
      { key: "discount", label: "Discount", type: "select", def: "20% off", options: ["10% off", "15% off", "20% off", "30% off"] },
      { key: "days", label: "Days", type: "select", def: "Weekdays", options: ["Weekdays", "Weekends", "Every day"] },
      { key: "from", label: "From", type: "time", def: "09:00" },
      { key: "to", label: "To", type: "time", def: "11:00" },
    ],
    summarize: (v) => `${v.discount} · ${v.days} ${v.from}–${v.to}`,
  },
  {
    id: "tiers", icon: Icon.sparkles, title: "Tiered membership",
    blurb: "Silver / Gold / VIP — perks unlock the more a guest returns each season.", eg: "Gold: free parking + late checkout",
    fields: [
      { key: "silverAt", label: "Silver from", type: "number", def: 3, suffix: "visits", min: 1 },
      { key: "silverPerk", label: "Silver perk", type: "text", def: "10% off sunbeds" },
      { key: "goldAt", label: "Gold from", type: "number", def: 6, suffix: "visits", min: 1 },
      { key: "goldPerk", label: "Gold perk", type: "text", def: "Free parking + late checkout" },
      { key: "vipAt", label: "VIP from", type: "number", def: 12, suffix: "visits", min: 1 },
      { key: "vipPerk", label: "VIP perk", type: "text", def: "Front row + free coffee" },
    ],
    summarize: (v) => `Silver ${v.silverAt}+ · Gold ${v.goldAt}+ · VIP ${v.vipAt}+`,
  },
  {
    id: "bundle", icon: Icon.gift, title: "Bundle perks",
    blurb: "Pair a set with a freebie to lift the average spend and the experience.", eg: "Sunbed before noon → free coffee",
    fields: [
      { key: "buy", label: "When they book", type: "select", def: "A sunbed set", options: ["A sunbed set", "A front-row set", "Any 2 sets", "An entry ticket"] },
      { key: "get", label: "They get", type: "select", def: "A free coffee", options: ["A free coffee", "A free drink", "A free locker", "2nd set half price"] },
      { key: "when", label: "When", type: "select", def: "Before noon", options: ["Any time", "Before noon", "Weekdays only"] },
    ],
    summarize: (v) => `${v.buy} → ${v.get} · ${v.when}`,
  },
  {
    id: "referral", icon: Icon.users, title: "Bring a friend",
    blurb: "Referrals — both the inviter and the new guest get a small reward.", eg: "Refer a friend → €5 off each",
    fields: [
      { key: "inviter", label: "Inviter gets", type: "select", def: "€5 off", options: ["€5 off", "€10 off", "10% off", "A free coffee"] },
      { key: "friend", label: "New guest gets", type: "select", def: "€5 off", options: ["€5 off", "€10 off", "10% off", "Free entry"] },
    ],
    summarize: (v) => `Inviter ${v.inviter} · Friend ${v.friend}`,
  },
  {
    id: "birthday", icon: Icon.calendar, title: "Birthday week",
    blurb: "A small, automatic treat during a guest's birthday week. Cheap goodwill.", eg: "Free entry + a drink, on us",
    fields: [
      { key: "treat", label: "Treat", type: "select", def: "Free entry + a drink", options: ["Free entry + a drink", "Free sunbed for a day", "20% off everything", "A free dessert"] },
      { key: "window", label: "Valid", type: "select", def: "Birthday week", options: ["On the day", "Birthday week", "Birthday month"] },
    ],
    summarize: (v) => `${v.treat} · ${v.window}`,
  },
];

// A blank user-defined scheme: name it, pick a reward, scope and timing.
export const makeCustomScheme = (id: string): LoyaltyScheme => ({
  id, icon: Icon.gift, title: "Custom scheme", custom: true,
  blurb: "Your own reward rule — name it and choose what guests get.", eg: "",
  fields: [
    { key: "title", label: "Scheme name", type: "text", def: "Custom scheme", full: true },
    { key: "reward", label: "Reward", type: "select", def: LOYALTY_REWARDS[0], options: LOYALTY_REWARDS },
    { key: "appliesTo", label: "Applies to", type: "select", def: "All stores", options: ["All stores", ...ZONES.map((z) => z.name)] },
    { key: "when", label: "When", type: "select", def: "Weekday mornings", options: ["Weekday mornings", "Weekends", "All season", "Happy hour 17:00–19:00"] },
  ],
  summarize: (v) => `${v.reward} · ${v.appliesTo} · ${v.when}`,
});

export const schemeDefaults = (s: LoyaltyScheme): SchemeValues => Object.fromEntries(s.fields.map((f) => [f.key, f.def]));

export const schemeById = (id: string): LoyaltyScheme => BUILTIN_SCHEMES.find((s) => s.id === id) ?? makeCustomScheme(id);

/* ---------- Shared (persisted) loyalty config ---------- */
export interface LoyaltyState {
  /** Per-scheme saved values + whether it's live. */
  config: Record<string, { enabled: boolean; values: SchemeValues }>;
  /** IDs of user-added custom schemes (definitions reconstructed via makeCustomScheme). */
  customIds: string[];
}

const seed = (id: string) => ({ enabled: true, values: schemeDefaults(schemeById(id)) });
// A handful of schemes are live out of the box so the customer sees rewards.
export const DEFAULT_LOYALTY: LoyaltyState = {
  config: {
    milestones: seed("milestones"),
    tiers: seed("tiers"),
    happy: seed("happy"),
    referral: seed("referral"),
    bundle: seed("bundle"),
  },
  customIds: [],
};

/* ---------- Customer-side progress / rewards ---------- */
export interface LoyaltyStats {
  visits: number;
  referrals: number;
  birthdayWeek: boolean;
}
// The signed-in customer's (Elena's) demo stats — partway into the season.
export const HOME_LOYALTY_STATS: LoyaltyStats = { visits: 8, referrals: 0, birthdayWeek: false };

export type RewardState =
  | { kind: "claim"; reward: string; note?: string }
  | { kind: "progress"; reward: string; current: number; target: number; unit: string; note?: string }
  | { kind: "perk"; reward: string; note?: string };

/** Resolve a scheme + its values + the guest's stats into a home reward state. */
export function schemeProgress(scheme: LoyaltyScheme, v: SchemeValues, stats: LoyaltyStats): RewardState {
  const num = (k: string, d: number) => { const n = Number(v[k]); return Number.isFinite(n) && n > 0 ? n : d; };
  switch (scheme.id) {
    case "milestones": {
      const n = num("everyN", 10);
      const reward = String(v.reward || "a reward");
      const earned = Math.floor(stats.visits / n);
      const into = stats.visits % n;
      if (earned >= 1) return { kind: "claim", reward, note: `${into}/${n} visits to your next` };
      return { kind: "progress", reward, current: into, target: n, unit: "visits" };
    }
    case "tiers": {
      const s = num("silverAt", 3), g = num("goldAt", 6), p = num("vipAt", 12);
      const vis = stats.visits;
      if (vis >= p) return { kind: "claim", reward: String(v.vipPerk || "VIP perks"), note: "VIP — top tier" };
      if (vis >= g) return { kind: "claim", reward: String(v.goldPerk || "Gold perks"), note: `Gold · ${vis}/${p} to VIP` };
      if (vis >= s) return { kind: "claim", reward: String(v.silverPerk || "Silver perks"), note: `Silver · ${vis}/${g} to Gold` };
      return { kind: "progress", reward: String(v.silverPerk || "Silver perks"), current: vis, target: s, unit: "visits" };
    }
    case "referral":
      return { kind: "perk", reward: `You ${v.inviter} · friend ${v.friend}`, note: "Share your code to earn" };
    case "happy":
      return { kind: "perk", reward: String(v.discount), note: `${v.days} ${v.from}–${v.to}` };
    case "bundle":
      return { kind: "perk", reward: `${v.buy} → ${v.get}`, note: String(v.when) };
    case "birthday":
      return stats.birthdayWeek
        ? { kind: "claim", reward: String(v.treat), note: "It's your birthday week!" }
        : { kind: "perk", reward: String(v.treat), note: `During your ${String(v.window).toLowerCase()}` };
    default:
      return { kind: "perk", reward: scheme.summarize(v) };
  }
}
