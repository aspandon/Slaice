// What a tenant can see (AENR-691 / 696 / 677 / 721). Pure rules only.
//
// Three layers decide whether a feature shows, for every role of the tenant:
//   1. Modules — what Slaice sells the tenant (plan + overrides + beta, minus
//      blockers), edited in Platform › tenant › Modules & features and the Super Admin matrix.
//   2. Tenant features — finer per-tenant switches (auto-approve refunds, the
//      cashier's Sell tabs…), edited in Platform › tenant › Modules & features. Each is one
//      entry in TENANT_FEATURES; a new switch is one more entry.
//   3. Roadmap previews — the demo switch that shows or hides everything marked
//      Future (FUTURE badge / roadmap banner).
// A Future item shows only when previews are on AND its module (if any) is on.

import { moduleState, planVersion, type ModuleId, type ModuleOverride, type Plan } from "./plans";
import type { StaffRole } from "./types";

/** Modules a requirement switches off regardless of plan or override. */
export const blockersOf = (t: { stripe: { charges: boolean } }): Record<string, string> =>
  t.stripe.charges ? {} : { Payments: "Stripe charges_enabled is false" };

interface ModuleSubject {
  plan: { id: string; version: number };
  overrides: readonly ModuleOverride[];
  beta: readonly string[];
  stripe: { charges: boolean };
}
/** Whether a module is on for a tenant today (plan, override, beta, blocker). */
export function tenantHasModule(
  t: ModuleSubject,
  plans: readonly Plan[],
  module: ModuleId,
  today: string,
): boolean {
  return moduleState(
    module,
    planVersion(plans, t.plan.id, t.plan.version),
    t.overrides,
    t.beta,
    blockersOf(t),
    today,
  ).on;
}

/** What switching a module off hides in the tenant app (shown on Platform › tenant › Modules & features). */
export const MODULE_REACH: Partial<Record<ModuleId, string>> = {
  "Sunbed Booking": "Sunbeds tab on the till",
  "Entry Ticket": "Entry tickets in Products and on the till",
  "Day Locker":
    "Lockers in the booking wizard, Home, booked-visit extras, the till, Products and Reports",
  Parking:
    "Parking in the booking wizard, Home, booked-visit extras, the till, Products and Reports",
  "Cash Register": "The till — Sell, Sales and Cash register for Cashier and Support",
  Loyalty: "Rewards on Home and Wallet, badges, Loyalty and Badges pages",
  Reporting: "Reports for the manager and the accountant",
};

/** Which day extras a tenant sells — picks the wording of "Add a locker or parking" and friends. */
export type ExtrasKind = "both" | "locker" | "parking" | "none";
export const extrasPhrase = (locker: boolean, parking: boolean): ExtrasKind =>
  locker && parking ? "both" : locker ? "locker" : parking ? "parking" : "none";
/** The English call to action for the extras a tenant sells (translate with t()). */
export const ADD_EXTRAS_LABEL: Record<Exclude<ExtrasKind, "none">, string> = {
  both: "Add a locker or parking",
  locker: "Add a locker",
  parking: "Add parking",
};

/* ---------- Tenant feature switches (AENR-677, AENR-721) ---------- */
export type TenantFeatureId =
  | "refunds.autoApprove"
  | "till.quick"
  | "till.tickets"
  | "till.sunbeds"
  | "till.lockers"
  | "till.parking"
  | "guest.liveScene"
  | "guest.camera"
  | "guest.shoreWalk"
  | "guest.liveSea"
  | "guest.seaDepth"
  | "guest.seaDetail"
  | "guest.rainGlass";
export type TenantFeatureGroup = "Guest site" | "Refunds" | "Cashier till";
export interface TenantFeatureDef {
  key: TenantFeatureId;
  label: string;
  description: string;
  group: TenantFeatureGroup;
  /** Value when the tenant has never set it. */
  default: boolean;
  /** The module the feature also needs — off with the module, whatever the switch says. */
  module?: ModuleId;
}
export const TENANT_FEATURES: readonly TenantFeatureDef[] = [
  {
    key: "guest.liveScene",
    label: "Live weather and time of day",
    description:
      "The guest site follows the beach's weather (clouds, rain, wind, the forecast on Home and in Plan a visit) and the light of the day (golden hour, dusk). Off: guests always see a clear sunny day at 11:00 (AENR-737).",
    group: "Guest site",
    default: true,
  },
  {
    key: "guest.camera",
    label: "One-beach camera",
    description:
      "Every guest screen is a shot of one beach: changing screen moves the camera along the shore, into a zone and back. Off: the still beach backdrop (AENR-784).",
    group: "Guest site",
    default: true,
  },
  {
    key: "guest.shoreWalk",
    label: "Walk along the shore",
    description:
      "Guests choose a zone by dragging along a beach panorama — momentum, depth and one zone at a time in the middle with its free sets and price. Off: the zone cards (AENR-788).",
    group: "Guest site",
    default: true,
  },
  // The sea's effects (AENR-810), each its own switch so the Super Admin can tune the guest beach per tenant.
  {
    key: "guest.liveSea",
    label: "Live animated sea",
    description:
      "On computers the sea moves: a slow swell, shimmering filaments, the sun's glint and a breathing foam edge (WebGL). Off: the still painted sea. Phones and reduced motion always get the still sea.",
    group: "Guest site",
    default: true,
  },
  {
    key: "guest.seaDepth",
    label: "Sea depth and ambient life",
    description:
      "The sea, the sand and the greenery drift at different speeds as the guest scrolls. Off: one flat, still scene.",
    group: "Guest site",
    default: true,
  },
  {
    key: "guest.seaDetail",
    label: "Wave lines on the water",
    description:
      "Crest lines and small wavelets drawn on the open water. Off: a clean gradient sea.",
    group: "Guest site",
    default: true,
  },
  {
    key: "guest.rainGlass",
    label: "Rain on the glass",
    description:
      "When it rains on the beach, guests see rain drops landing on their screen, gathering into beads and running down it, as if looking through a window (AENR-826). Off: the rain stays in the scene only.",
    group: "Guest site",
    default: true,
  },
  {
    key: "refunds.autoApprove",
    label: "Auto-approve routine refunds",
    description:
      "The manager can let a refund policy approve routine requests (weather, closures…) as they arrive. Off: every request waits for a person.",
    group: "Refunds",
    default: true,
  },
  {
    key: "till.quick",
    label: "Quick keys",
    description:
      "Combos, Repeat last sale and bundles on the cashier's Quick tab.",
    group: "Cashier till",
    default: true,
  },
  {
    key: "till.tickets",
    label: "Entry tickets",
    description: "Entry tickets sold at the till — a key per category on the Quick tab (AENR-721).",
    group: "Cashier till",
    default: true,
    module: "Entry Ticket",
  },
  {
    key: "till.sunbeds",
    label: "Sunbeds",
    description: "Sunbed sets sold at the till from the zone map.",
    group: "Cashier till",
    default: true,
    module: "Sunbed Booking",
  },
  {
    key: "till.lockers",
    label: "Lockers",
    description: "Day lockers sold at the till.",
    group: "Cashier till",
    default: true,
    module: "Day Locker",
  },
  {
    key: "till.parking",
    label: "Parking",
    description: "Day parking spots sold at the till.",
    group: "Cashier till",
    default: true,
    module: "Parking",
  },
];
/* ---------- The guest sea, per device (AENR-813) ----------
   Which sea a tenant's guests see — one choice for desktop (1024 px and up), one for
   phones and tablets. Classic is today's sea (its three switches above still apply);
   Coastal the lightweight realistic shader (AENR-811); Video a looping aerial video of
   real water (AENR-814); Blender a rendered loop of the whole beach, sea and sand
   (AENR-827). Missing = Classic, so nothing changes until Slaice picks. */
export type SeaStyle = "classic" | "coastal" | "video" | "blender";
export type SeaDevice = "desktop" | "mobile";
/** How sharp a filmed or rendered sea plays, per device: the Blender beach (AENR-844, 4K since
 *  AENR-856) and the Video sea (AENR-859). Standard is each one's first file. */
export type SeaRes = "standard" | "high" | "fullhd" | "4k";
export type BlenderRes = SeaRes;
export type VideoRes = Exclude<SeaRes, "high">;
export type TenantSea = Partial<Record<SeaDevice, SeaStyle>> & {
  blenderRes?: Partial<Record<SeaDevice, BlenderRes>>;
  videoRes?: Partial<Record<SeaDevice, VideoRes>>;
};
export const SEA_STYLES: readonly { id: SeaStyle; label: string; description: string }[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Today's painted sea — live WebGL water on computers, the still sea on phones.",
  },
  {
    id: "coastal",
    label: "Coastal",
    description:
      "Lightweight realistic water: turquoise shallows over the sand, light patterns on the seabed, sun glints and waves running up the beach.",
  },
  {
    id: "video",
    label: "Video",
    description:
      "A looping aerial video of real water under the drawn sand — the lightest to play, graded for the weather and the time of day.",
  },
  {
    id: "blender",
    label: "Blender",
    description:
      "A rendered beach and sea made in Blender — realistic water over Greek sand, graded for the weather and the time of day.",
  },
];
export const SEA_DEVICES: readonly { id: SeaDevice; label: string }[] = [
  { id: "desktop", label: "Desktop" },
  { id: "mobile", label: "Phones and tablets" },
];
export const seaStyleOf = (t: { sea?: TenantSea } | undefined, d: SeaDevice): SeaStyle =>
  t?.sea?.[d] ?? "classic";

/** One resolution a sea can play at: its frame sizes and download weights per device. */
export interface SeaResTier<R extends SeaRes = SeaRes> {
  id: R;
  label: string;
  /** Its files are published (false while a render or an encode is still running — offered, not pickable). */
  ready: boolean;
  desktop: { px: string; mb: string };
  mobile: { px: string; mb: string };
  /** Asks a lot of the device's video decoder — said next to it (4K). */
  heavy?: boolean;
}

/* The Blender beach's resolutions (AENR-844, AENR-856): the same beach at four sizes, for the tenant
   to weigh sharpness against each guest's download. Computers play the whole frame, phones and
   tablets a portrait cut of its middle. Sizes are the files' (WebM / MP4 for computers, MP4 /
   WebM for phones — whichever the browser plays). */
export const BLENDER_RES: readonly SeaResTier<BlenderRes>[] = [
  { id: "standard", label: "Standard", ready: true, desktop: { px: "1280 × 1200", mb: "2.5–2.9 MB" }, mobile: { px: "648 × 1200", mb: "0.9–1.1 MB" } },
  { id: "high", label: "High", ready: true, desktop: { px: "1600 × 1500", mb: "5.2–6.5 MB" }, mobile: { px: "810 × 1500", mb: "2.6–3.3 MB" } },
  { id: "fullhd", label: "Full HD", ready: true, desktop: { px: "1920 × 1800", mb: "7.5–9.3 MB" }, mobile: { px: "972 × 1800", mb: "3.8–4.7 MB" } },
  { id: "4k", label: "4K", ready: false, heavy: true, desktop: { px: "3840 × 3600", mb: "TBD" }, mobile: { px: "1944 × 3600", mb: "TBD" } },
];
/* The Video sea's resolutions (AENR-859). Standard is the first clip (1080p on computers, 720p on
   phones); Full HD and 4K come from a 4K master, and phones and tablets held upright get a
   portrait cut of its middle — the whole 16:9 frame on a tall screen is mostly cropped away, so
   a landscape file plays three times enlarged there. */
export const VIDEO_RES: readonly SeaResTier<VideoRes>[] = [
  { id: "standard", label: "Standard", ready: true, desktop: { px: "1920 × 1080", mb: "3.7–4.6 MB" }, mobile: { px: "1280 × 720", mb: "2.3 MB" } },
  { id: "fullhd", label: "Full HD", ready: true, desktop: { px: "1920 × 1080", mb: "7.2–9.6 MB" }, mobile: { px: "1080 × 1920", mb: "7.2–9.6 MB" } },
  { id: "4k", label: "4K", ready: true, heavy: true, desktop: { px: "3840 × 2160", mb: "24–34 MB" }, mobile: { px: "1216 × 2160", mb: "9.0–12 MB" } },
];
/** The seas that offer a resolution, and where the tenant's choice is kept. */
export const SEA_RES = {
  blender: { key: "blenderRes", tiers: BLENDER_RES },
  video: { key: "videoRes", tiers: VIDEO_RES },
} as const satisfies Partial<Record<SeaStyle, { key: "blenderRes" | "videoRes"; tiers: readonly SeaResTier[] }>>;
export type SeaWithRes = keyof typeof SEA_RES;
export const hasRes = (s: SeaStyle): s is SeaWithRes => s in SEA_RES;
/** The published tiers of a sea, lowest first. */
export const readyRes = (s: SeaWithRes): readonly SeaResTier[] => SEA_RES[s].tiers.filter((r) => r.ready);
/** The tenant's resolution for a sea on a device — Standard when unset or not published yet. */
export const seaResOf = (t: { sea?: TenantSea } | undefined, s: SeaWithRes, d: SeaDevice): SeaRes => {
  const r = t?.sea?.[SEA_RES[s].key]?.[d] ?? "standard";
  return readyRes(s).some((x) => x.id === r) ? r : "standard";
};
export const blenderResOf = (t: { sea?: TenantSea } | undefined, d: SeaDevice): BlenderRes => seaResOf(t, "blender", d);
export const videoResOf = (t: { sea?: TenantSea } | undefined, d: SeaDevice): VideoRes => {
  const r = seaResOf(t, "video", d);
  return r === "high" ? "standard" : r;
};
/** The tenant's sea with one device's resolution changed (Platform › Guest sea, the Demo menu). */
export const withSeaRes = (sea: TenantSea | undefined, s: SeaWithRes, d: SeaDevice, r: SeaRes): TenantSea => {
  const key = SEA_RES[s].key;
  return { ...sea, [key]: { ...sea?.[key], [d]: r } };
};

export const TENANT_FEATURE_GROUPS: readonly TenantFeatureGroup[] = ["Guest site", "Refunds", "Cashier till"];
/** The group a switch belongs to must keep at least one switch on (e.g. the till needs one tab). */
export const KEEP_ONE_ON: readonly TenantFeatureGroup[] = ["Cashier till"];

export const featureDef = (key: TenantFeatureId) => TENANT_FEATURES.find((f) => f.key === key);
/** The tenant's own switch (ignores modules). */
export function featureSwitch(
  t: { features?: Partial<Record<TenantFeatureId, boolean>> } | undefined,
  key: TenantFeatureId,
): boolean {
  return t?.features?.[key] ?? featureDef(key)?.default ?? true;
}
/** Whether turning `key` off would leave its group with no switch on (blocked for KEEP_ONE_ON groups). */
export function isLastOn(
  t: { features?: Partial<Record<TenantFeatureId, boolean>> },
  key: TenantFeatureId,
  hasModule: (m: ModuleId) => boolean,
): boolean {
  const def = featureDef(key);
  if (!def || !KEEP_ONE_ON.includes(def.group)) return false;
  const on = TENANT_FEATURES.filter(
    (f) => f.group === def.group && featureSwitch(t, f.key) && (!f.module || hasModule(f.module)),
  );
  return on.length === 1 && on[0].key === key;
}

/* ---------- Tenant roles (AENR-716) ----------
   Slaice decides which staff roles a tenant uses (Platform › tenant › Users & roles).
   A role that is off disappears for that tenant: no role pickers, no "Your
   roles" / "View as", and its pages show the calm not-available card. Users who
   hold it keep it, shown as "role off for this beach", so turning it back on
   restores their access. Manager / Admin is always on: someone has to own the
   beach's configuration, staff and refunds. */
export const STAFF_ROLE_IDS: readonly StaffRole[] = [
  "admin",
  "callcenter",
  "cashier",
  "controller",
  "support",
  "accountant",
];
export const ALWAYS_ON_ROLE: StaffRole = "admin";
const isStaffRole = (r: string): r is StaffRole => STAFF_ROLE_IDS.some((x) => x === r);
/** Whether the tenant uses role `r`. Customer, Platform and unknown ids are never gated. */
export function tenantRoleOn(
  t: { roles?: Partial<Record<StaffRole, boolean>> } | undefined,
  r: string,
): boolean {
  if (r === ALWAYS_ON_ROLE || !isStaffRole(r)) return true;
  return t?.roles?.[r] ?? true;
}
/** The roles of a user the tenant still uses — the ones they can sign in with. */
export const usableRoles = (
  t: { roles?: Partial<Record<StaffRole, boolean>> } | undefined,
  roles: readonly StaffRole[],
): StaffRole[] => roles.filter((r) => tenantRoleOn(t, r));
