import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { translate } from "./i18n";
import { DEFAULT_BACKGROUND } from "../data/backgrounds";
import { DEFAULT_PASSES, DEFAULT_PASS_PRICING } from "../data/passes";
import { DEFAULT_LOYALTY } from "../data/loyalty";
import type { LoyaltyState } from "../data/loyalty";
import type { BeachBackground, CartItem, CartKind, Consent, CustomerPasses, LangCode, PassPricing, PersonaId, SeasonPlan, SunbedSlot } from "../domain/types";

// Optional spotlight set by go(...,{spotlight,tip}) so a landing page can
// highlight the section a journey points at.
export interface SpotlightHint {
  spotlight?: string;
  tip?: string;
  persona?: PersonaId;
  page?: string;
  /** Optional initial step id for a multi-step flow (e.g. the Plan wizard). */
  step?: string;
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
}

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
