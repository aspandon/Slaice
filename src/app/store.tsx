import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { translate } from "./i18n";
import { DEFAULT_BACKGROUND } from "../data/backgrounds";
import { DEFAULT_PASSES, DEFAULT_PASS_PRICING } from "../data/passes";
import { DEFAULT_LOYALTY } from "../data/loyalty";
import type { LoyaltyState } from "../data/loyalty";
import { DEFAULT_ACHIEVEMENTS } from "../data/gamification";
import type { Achievement } from "../data/gamification";
import { DEFAULT_ZONE_MAP, DEFAULT_PRICE_RULES, DEFAULT_BEACH_PRICING, DEFAULT_CALENDAR } from "../data/pricing";
import { DEFAULT_CHANNELS } from "../data/channels";
import { DEFAULT_PASS_CARDS } from "../data/passDesigns";
import type { BeachPricing, CalendarState, BeachBackground, BookingNote, CrmState, StaffAuditEntry, StaffUser, CartItem, CartKind, ChannelSetupState, Consent, CustomerPasses, LangCode, PassDesign, PassPricing, PersonaId, PriceRule, SeasonPlan, SunbedSlot, ZoneMapItem } from "../domain/types";
import { DAY_DEFAULT, DEFAULT_SCENE_FX } from "../data/beach";
import type { SceneFx, WeatherKind } from "../data/beach";
import { DEFAULT_TILL } from "../data/till";
import type { TillState } from "../domain/till";
import type { FinanceConfig } from "../domain/finance";
import { DEFAULT_INVENTORY, type InventoryState } from "../domain/inventory";
import { DEFAULT_SUNBED_OPS, type SunbedOpsState } from "../domain/sunbedOps";
import { DEFAULT_BOOKING_OPS } from "../data/bookingOps";
import type { BookingOpsState } from "../domain/bookingOps";
import type { PayLink } from "../domain/payLink";
import { DEFAULT_DISPLAY, type DisplayConfig } from "../domain/display";
import { DEFAULT_LAYOUT_STATE, type LayoutState } from "../domain/layoutVersions";
import { DEFAULT_EXTRAS, type ExtrasState } from "../domain/extras";
import { DEFAULT_ACCOUNT, type AccountState } from "../domain/account";
import { emptyPlatform, type PlatformState } from "../domain/platform";
import { DEFAULT_COMMS, type CommsState } from "../data/comms";
import { DEFAULT_PRIVACY, type PrivacyState } from "../data/gdpr";

// Optional spotlight set by go(...,{spotlight,tip}) so a landing page can
// highlight the section a journey points at.
export interface SpotlightHint {
  spotlight?: string;
  tip?: string;
  persona?: PersonaId;
  page?: string;
  /** Optional initial step id for a multi-step flow (e.g. the Plan wizard). */
  step?: string;
  /** Loyalty scheme id to pre-load when deep-linking into Communicate. */
  promote?: string;
  /** Sunbed set to open / sell (Controller beach → walk-in sale). */
  setId?: string;
  /** Guest details to pre-fill a manual / phone booking (from the guest profile). */
  prefill?: { name: string; email: string; phone: string };
  ts?: number;
}

export interface ToastOptions {
  action?: { label: string; onClick: () => void };
  tone?: "success" | "error" | "info" | "warn";
  duration?: number;
}

// The shape every screen reads via useApp(): toasts, cross-persona navigation,
// auth, language, the shared cart and consent.
export interface AppContextValue {
  toast: (msg: ReactNode, opts?: ToastOptions) => void;
  /** go(persona, page?, hint?) — navigate, optionally with a spotlight. */
  go: (persona: PersonaId, page?: string, hint?: Partial<SpotlightHint> | null) => void;
  /** Play the cinematic beach "dive" and open the booking wizard. */
  dive: () => void;
  persona: PersonaId;
  /** The current page key of the persona. */
  page: string;
  signedIn: boolean;
  setSignedIn: (v: boolean) => void;
  lang: LangCode;
  setLang: (l: LangCode) => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (kind: CartKind, id: string) => void;
  clearCart: () => void;
  hint: SpotlightHint | null;
  clearHint: () => void;
  consent: Consent;
  setConsent: (patch: Partial<Consent>) => void;
  reopenConsent: () => void;
  /** Tenant beach scene shown on the customer booking map. */
  background: BeachBackground;
  setBackground: (b: BeachBackground) => void;
  /** Admin-authored umbrella layouts per zone (zoneId → slots). A zone that is
   *  absent here falls back to the default grid. Written by the Map Editor's
   *  Sunbed-layout tab, read by the booking wizard's zoom. */
  beachLayout: Record<string, SunbedSlot[]>;
  setZoneLayout: (zoneId: string, slots: SunbedSlot[]) => void;
  /** Optional per-store (zone) logo as a data URL — set in the admin Map Editor,
   *  shown under the store name on the booking beach. */
  zoneLogos: Record<string, string>;
  setZoneLogo: (zoneId: string, src: string | null) => void;
  /** The customer's purchased passes (VIP credit + Season) — persisted. */
  passes: CustomerPasses;
  /** Buy (or top up) VIP credit by `amount` euros. */
  buyVipCredit: (amount: number) => void;
  /** Spend `amount` euros of VIP credit (debits the balance at Checkout). */
  spendVipCredit: (amount: number) => void;
  /** Buy a Season pass on the chosen plan. */
  buySeasonPass: (plan: SeasonPlan) => void;
  /** Drop a held pass (demo reset). */
  clearPass: (kind: "vip" | "season") => void;
  /** Admin-editable VIP/Season pricing, read by the customer purchase flow. */
  passPricing: PassPricing;
  setPassPricing: (p: PassPricing) => void;
  /** Loyalty scheme config (enabled + values + custom IDs) — admin-written, home-read. */
  loyalty: LoyaltyState;
  setLoyalty: (updater: (s: LoyaltyState) => LoyaltyState) => void;
  /** Gamification achievements (badge rules) — admin-written, home-read. */
  achievements: Achievement[];
  setAchievements: (a: Achievement[]) => void;
  /** Map Layout Editor zone arrangement (positions + grid + identity) — persisted. */
  zoneMap: ZoneMapItem[];
  setZoneMap: (z: ZoneMapItem[]) => void;
  /** Seasonal / day-of-week pricing rules — admin-written, persisted. */
  priceRules: PriceRule[];
  setPriceRules: (r: PriceRule[]) => void;
  /** Communicate channel connections (Email / Viber / SMS / Push) — persisted. */
  channels: ChannelSetupState;
  setChannels: (c: ChannelSetupState) => void;
  /** Admin-designed wallet pass cards — persisted. */
  passCards: PassDesign[];
  setPassCards: (c: PassDesign[]) => void;
  /** Demo weather (no real forecast) — drives the hero chip, the backdrop tint,
   *  the live sea's agitation and the rain layer. Set from the Home demo panel. */
  weather: WeatherKind;
  setWeather: (w: WeatherKind) => void;
  /** Demo scene clock (hours, DAY_MIN–DAY_MAX) — drives time-of-day lighting,
   *  identically on every customer page. */
  dayTime: number;
  setDayTime: (h: number) => void;
  /** Admin switches for the customer-surface atmosphere: demo weather graphics
   *  and the time-of-day lighting. */
  sceneFx: SceneFx;
  setSceneFx: (patch: Partial<SceneFx>) => void;
  /** Staff notes per booking id (call-centre notes, escalations) — persisted. */
  bookingNotes: Record<string, BookingNote[]>;
  addBookingNote: (bookingId: string, note: BookingNote) => void;
  /** Tenant staff accounts and their roles (RBAC) — persisted. */
  staffUsers: StaffUser[];
  /** Replace the staff list and record what changed in the audit trail. */
  updateStaff: (users: StaffUser[], action: string) => void;
  staffAudit: StaffAuditEntry[];
  /** "View as" preview: the staff user whose access is being previewed. */
  viewAs: StaffUser | null;
  startViewAs: (userId: string) => void;
  exitViewAs: () => void;
  /** Guest CRM: saved segments, tags, profile edits — persisted. */
  crm: CrmState;
  setCrm: (updater: (c: CrmState) => CrmState) => void;
  /** Cashier till: sales, holds, shifts, vouchers, offline queue — persisted. */
  till: TillState;
  setTill: (updater: (t: TillState) => TillState) => void;
  /** Per-tenant fee model + e-invoicing provider (Platform › Tenants), keyed by subdomain — persisted. */
  finance: Record<string, FinanceConfig>;
  setFinance: (subdomain: string, c: FinanceConfig) => void;
  /** Price categories, per-sunbed date overrides and landmarks (AENR-469) — published, persisted. */
  beachPricing: BeachPricing;
  setBeachPricing: (p: BeachPricing) => void;
  /** Stores closed for today with the reason (admin › Zones & availability) — persisted. */
  closedStores: Record<string, string>;
  setClosedStores: (c: Record<string, string>) => void;
  /** Booking restrictions and seasonal templates (AENR-511) — persisted. */
  calendar: CalendarState;
  setCalendar: (c: CalendarState) => void;
  /** Holds, channel allocations, stop-sell and the demo clock (AENR-512) — persisted. */
  inventory: InventoryState;
  setInventory: (u: (i: InventoryState) => InventoryState) => void;
  /** Staff-set sunbed status per date with history (AENR-499) — persisted. */
  sunbedOps: SunbedOpsState;
  setSunbedOps: (u: (s: SunbedOpsState) => SunbedOpsState) => void;
  /** Booking timelines, set moves and refund requests (AENR-579, 583). */
  bookingOps: BookingOpsState;
  setBookingOps: (u: (s: BookingOpsState) => BookingOpsState) => void;
  /** Pay-by-link reservations (AENR-534). */
  payLinks: PayLink[];
  setPayLinks: (u: (s: PayLink[]) => PayLink[]) => void;
  /** Entrance live-display settings (AENR-519). */
  display: DisplayConfig;
  setDisplay: (u: (s: DisplayConfig) => DisplayConfig) => void;
  /** Layout drafts, versions and schedules (AENR-514). */
  layouts: LayoutState;
  setLayouts: (u: (s: LayoutState) => LayoutState) => void;
  /** Entry-ticket categories, locker banks, their prices and the locker provider (AENR-529/530). */
  extras: ExtrasState;
  setExtras: (u: (s: ExtrasState) => ExtrasState) => void;
  /** The guest's account on this device: guest mode, saved card, placed bookings (AENR-532). */
  account: AccountState;
  setAccount: (u: (s: AccountState) => AccountState) => void;
  /** Slaice console: tenants, plans, View-as sessions (AENR-500/515/517/518). */
  platform: PlatformState;
  setPlatform: (u: (s: PlatformState) => PlatformState) => void;
  comms: CommsState;
  setComms: (u: (s: CommsState) => CommsState) => void;
  privacy: PrivacyState;
  setPrivacy: (u: (s: PrivacyState) => PrivacyState) => void;
}

export const DEFAULT_CRM: CrmState = { segments: [], tagDefs: [{ name: "Wedding party", color: "#a855f7" }, { name: "Local", color: "#0D9488" }], edits: {}, regularAfter: 15, lifecycle: { atRiskDays: 14, lapsedDays: 35 }, columns: ["lifecycle", "spend"], imported: [], mergedAway: [], eraseRequests: [], profiles: {}, customFields: [{ id: "cf-birthday", label: "Birthday", type: "date" }, { id: "cf-company", label: "Company", type: "text" }] };

const DEFAULT_CONSENT: Consent = {
  necessary: true,
  analytics: false,
  marketing: false,
  decided: false,
  ts: null,
};

// Default value (only used absent a Provider, which App always renders).
export const AppCtx = createContext<AppContextValue>({
  toast: () => {},
  go: () => {},
  dive: () => {},
  persona: "customer",
  page: "",
  signedIn: false,
  setSignedIn: () => {},
  lang: "en",
  setLang: () => {},
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  hint: null,
  clearHint: () => {},
  consent: DEFAULT_CONSENT,
  setConsent: () => {},
  reopenConsent: () => {},
  background: DEFAULT_BACKGROUND,
  setBackground: () => {},
  beachLayout: {},
  setZoneLayout: () => {},
  zoneLogos: {},
  setZoneLogo: () => {},
  passes: DEFAULT_PASSES,
  buyVipCredit: () => {},
  spendVipCredit: () => {},
  buySeasonPass: () => {},
  clearPass: () => {},
  passPricing: DEFAULT_PASS_PRICING,
  setPassPricing: () => {},
  loyalty: DEFAULT_LOYALTY,
  setLoyalty: () => {},
  achievements: DEFAULT_ACHIEVEMENTS,
  setAchievements: () => {},
  zoneMap: DEFAULT_ZONE_MAP,
  setZoneMap: () => {},
  priceRules: DEFAULT_PRICE_RULES,
  setPriceRules: () => {},
  channels: DEFAULT_CHANNELS,
  setChannels: () => {},
  passCards: DEFAULT_PASS_CARDS,
  setPassCards: () => {},
  weather: "sunny",
  setWeather: () => {},
  dayTime: DAY_DEFAULT,
  setDayTime: () => {},
  sceneFx: DEFAULT_SCENE_FX,
  setSceneFx: () => {},
  bookingNotes: {},
  addBookingNote: () => {},
  staffUsers: [],
  updateStaff: () => {},
  staffAudit: [],
  viewAs: null,
  startViewAs: () => {},
  exitViewAs: () => {},
  crm: DEFAULT_CRM,
  setCrm: () => {},
  till: DEFAULT_TILL,
  setTill: () => {},
  finance: {},
  setFinance: () => {},
  beachPricing: DEFAULT_BEACH_PRICING,
  setBeachPricing: () => {},
  closedStores: {},
  setClosedStores: () => {},
  calendar: DEFAULT_CALENDAR,
  setCalendar: () => {},
  inventory: DEFAULT_INVENTORY,
  setInventory: () => {},
  sunbedOps: DEFAULT_SUNBED_OPS,
  setSunbedOps: () => {},
  bookingOps: DEFAULT_BOOKING_OPS,
  setBookingOps: () => {},
  payLinks: [],
  setPayLinks: () => {},
  display: DEFAULT_DISPLAY,
  setDisplay: () => {},
  layouts: DEFAULT_LAYOUT_STATE,
  setLayouts: () => {},
  extras: DEFAULT_EXTRAS,
  setExtras: () => {},
  account: DEFAULT_ACCOUNT,
  setAccount: () => {},
  platform: emptyPlatform([]),
  setPlatform: () => {},
  comms: DEFAULT_COMMS,
  setComms: () => {},
  privacy: DEFAULT_PRIVACY,
  setPrivacy: () => {},
});

export const useApp = (): AppContextValue => useContext(AppCtx);

// Translation helper bound to the active language. Wrap UI strings as t("English")
// — non-English languages resolve via the generated dictionaries, English passes
// through unchanged.
export function useT() {
  const { lang } = useContext(AppCtx);
  return (text: string) => translate(lang, text);
}

// When the active hint matches the current persona+page, find the element with
// data-spotlight="<name>", scroll it into view and add a teal pulse ring for
// ~3s. The hint is cleared after firing so it only triggers once.
export function useSpotlight(persona: PersonaId, page: string) {
  const { hint, clearHint, toast } = useContext(AppCtx);
  useEffect(() => {
    if (!hint || hint.persona !== persona || (hint.page && hint.page !== page)) return;
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-spotlight="${hint.spotlight}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("spotlight-ring");
        setTimeout(() => el.classList.remove("spotlight-ring"), 3200);
      }
      if (hint.tip) toast(hint.tip, { tone: "success", duration: 4500 });
      clearHint();
    }, 350); // give the page a tick to mount
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint, persona, page]);
}

// The offered languages live in i18n.ts (single source of truth); re-export for
// the switcher call sites.
export { LANGUAGES } from "./i18n";
