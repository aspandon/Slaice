import { Suspense, useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
import type { ReactNode } from "react";
import { AppCtx, DEFAULT_CRM, useT } from "./app/store";
import type { AppContextValue, SpotlightHint, ToastOptions } from "./app/store";
import { DEFAULT_PAGE } from "./data/personas";
import { Icon } from "./lib/icons";
import { TopBar, Sidebar, BottomTabBar, CustomerNav, SiteFooter, Toasts, PersonaSwitcher, TillTabs } from "./components/Shell";
import { ConsentBanner } from "./components/ConsentBanner";
import { CustomerBackdrop } from "./components/CustomerBackdrop";
import { WeatherUi } from "./components/WeatherUi";
import { GlideLogo } from "./components/GlideLogo";
import { useFoilPointer } from "./lib/foilPointer";
import { useMediaQuery } from "./lib/useMediaQuery";
import { prefetchPage, prefetchPersona, routeFor } from "./routes";
import { PageGate } from "./components/Shell/PageGate";
import { Freeze } from "./components/Shell/KeepAlive";
import { markBusy } from "./lib/busy";
import { prefersReducedMotion } from "./lib/motion";
import { DISTANCE, DURATION, EASING } from "./lib/motionTokens";
import { parseHash, buildHash, hashPath, isValidPage, resolvePage } from "./app/router";
import { HTML_LANG, deviceLang, isLangLoaded, loadLang, normalizeLang } from "./app/i18n";
import { DEFAULT_BACKGROUND } from "./data/backgrounds";
import { DEFAULT_PASSES, DEFAULT_PASS_PRICING, SEASON_END_LABEL, seasonValidUntil, round2 } from "./data/passes";
import { DEFAULT_LOYALTY } from "./data/loyalty";
import type { LoyaltyState } from "./data/loyalty";
import { DEFAULT_ACHIEVEMENTS } from "./data/gamification";
import type { Achievement } from "./data/gamification";
import { DEFAULT_ZONE_MAP, DEFAULT_PRICE_RULES, isLegacyZoneMap } from "./data/pricing";
import { DEFAULT_CHANNELS } from "./data/channels";
import { DEFAULT_STAFF, DEFAULT_STAFF_AUDIT, hasRole, migrateStaffUser, roleLabel, rolesLabel } from "./data/staff";
import type { LegacyStaffUser } from "./data/staff";
import { DEFAULT_PASS_CARDS } from "./data/passDesigns";
import type { BeachBackground, BookingNote, CrmState, StaffAuditEntry, StaffRole, StaffUser, CartItem, ChannelSetupState, Consent, CustomerPasses, LangCode, PassDesign, PassPricing, PersonaId, PriceRule, SeasonPlan, SunbedSlot, ZoneMapItem } from "./domain/types";
import type { TillState } from "./domain/till";
import { stripLegacyFinance, type FinanceConfig, type LegacyFinanceConfig } from "./domain/finance";
import { DEFAULT_TERMS, termsFromLegacyFees } from "./domain/economics";
import type { BeachPricing, CalendarState } from "./domain/types";
import { DEFAULT_BEACH_PRICING, DEFAULT_CALENDAR } from "./data/pricing";
import { DEFAULT_INVENTORY, type InventoryState } from "./domain/inventory";
import { DEFAULT_SUNBED_OPS, type SunbedOpsState } from "./domain/sunbedOps";
import { DEFAULT_BOOKING_OPS } from "./data/bookingOps";
import type { BookingOpsState } from "./domain/bookingOps";
import type { PayLink } from "./domain/payLink";
import { DEFAULT_DISPLAY, displayLangs, type DisplayConfig } from "./domain/display";
import { lazyWithReload } from "./lib/staleChunk";
import { GuardCtx, Skeleton, TableSkeleton } from "./components/ui";
import { DEFAULT_LAYOUT_STATE, type LayoutState } from "./domain/layoutVersions";
import { DEFAULT_EXTRAS, type ExtrasState } from "./domain/extras";
import { DEFAULT_ACCOUNT, type AccountState } from "./domain/account";
import { useDemoFlag } from "./lib/useDemoFlag";
import { FIRST_TIME_RESET, enterFirstTime, leaveFirstTime, resetFirstTime, type GuestSnapshot } from "./lib/firstTimeGuest";
import { MODULES_SEED, emptyPlatform, type PlatformState } from "./domain/platform";
import { tenantRoleOn, usableRoles } from "./domain/features";
import { DEFAULT_COMMS, type CommsState } from "./data/comms";
import { DEFAULT_PRIVACY, type PrivacyState } from "./data/gdpr";
import { DEFAULT_INCIDENTS } from "./data/incidents";
import type { Incident } from "./domain/incidents";
import { DEFAULT_TENANTS, SEED_TERMS } from "./data/tenants";
import { DEFAULT_CLOSED_STORES } from "./data/beach";
import { DEFAULT_TILL } from "./data/till";
import { DAY_DEFAULT, DEFAULT_SCENE_FX } from "./data/beach";
import type { SceneFx, WeatherKind } from "./data/beach";
import { migrateLegacySegments, stripLegacyTags, visitSegmentName } from "./domain/segments";

interface ToastItem {
  id: number;
  msg: ReactNode;
  action?: { label: string; onClick: () => void };
  tone?: string;
  duration: number;
}

const DEFAULT_CONSENT: Consent = { necessary: true, analytics: false, marketing: false, decided: false, ts: null };

const LS_KEY = "slaice.v1";
const loadLS = (): Record<string, unknown> => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
};
const saved = loadLS() as {
  persona?: PersonaId;
  pageByPersona?: Record<string, string>;
  signedIn?: boolean;
  lang?: LangCode;
  cart?: CartItem[];
  consent?: Consent;
  background?: BeachBackground;
  beachLayout?: Record<string, SunbedSlot[]>;
  zoneLogos?: Record<string, string>;
  passes?: CustomerPasses;
  passPricing?: PassPricing;
  loyalty?: LoyaltyState;
  achievements?: Achievement[];
  zoneMap?: ZoneMapItem[];
  priceRules?: PriceRule[];
  channels?: ChannelSetupState;
  passCards?: PassDesign[];
  weather?: WeatherKind;
  dayTime?: number;
  sceneFx?: SceneFx;
  showPreviews?: boolean;
  bookingNotes?: Record<string, BookingNote[]>;
  staffUsers?: LegacyStaffUser[];
  staffMeId?: string | null;
  staffAudit?: StaffAuditEntry[];
  viewAsId?: string | null;
  crm?: CrmState;
  till?: TillState;
  finance?: Record<string, LegacyFinanceConfig>;
  beachPricing?: BeachPricing;
  closedStores?: Record<string, string>;
  calendar?: CalendarState;
  inventory?: InventoryState;
  sunbedOps?: SunbedOpsState;
  bookingOps?: BookingOpsState;
  payLinks?: PayLink[];
  display?: DisplayConfig;
  layouts?: LayoutState;
  extras?: ExtrasState;
  account?: AccountState;
  platform?: PlatformState;
  comms?: CommsState;
  privacy?: PrivacyState;
  incidents?: Incident[];
};
// A deep link in the URL wins over the last saved location.
const initialRoute = parseHash();
// `#/display` is the chrome-less entrance screen (AENR-519): no shell, sign-in
// or cookie banner; it reads the shared state and never writes it back.
const DISPLAY = hashPath().startsWith("#/display");
const LiveDisplay = lazyWithReload(() => import("./screens/display/LiveDisplay").then((m) => ({ default: m.LiveDisplay })));
// `#/pass?b=…&k=…` is a booking shared with the group (AENR-715): a public guest view — no
// sign-in, shell or cookie banner; like the display it reads the shared state and never writes it.
const PASS = hashPath().startsWith("#/pass");
/* Shell parts guests never see, and background jobs, load as their own chunks
   (AENR-764): the staff-only ones only for staff personas, the rest right after
   the first render — none of them sits in the first download any more. */
const ViewAsBanner = lazyWithReload(() => import("./screens/tenant/ViewAs").then((m) => ({ default: m.ViewAsBanner })));
const PlatformJanitor = lazyWithReload(() => import("./screens/tenant/Janitor").then((m) => ({ default: m.PlatformJanitor })));
const TenantSwitcher = lazyWithReload(() => import("./screens/tenant/TenantSwitcher").then((m) => ({ default: m.TenantSwitcher })));
const CommsJanitor = lazyWithReload(() => import("./screens/communicate/Janitor").then((m) => ({ default: m.CommsJanitor })));
const OfflineBanner = lazyWithReload(() => import("./screens/cashier/TillStatus").then((m) => ({ default: m.OfflineBanner })));
const ShiftSwitch = lazyWithReload(() => import("./screens/cashier/TillStatus").then((m) => ({ default: m.ShiftSwitch })));
const CommandPalette = lazyWithReload(() => import("./components/CommandPalette").then((m) => ({ default: m.CommandPalette })));
// Demo › Performance overlay (AENR-842): its own chunk, fetched only when switched on.
const PerfOverlay = lazyWithReload(() => import("./components/PerfOverlay"));
const GuestPass = lazyWithReload(() => import("./screens/customer/GuestPass").then((m) => ({ default: m.GuestPass })));
// Sign-in (and its react-hook-form + zod form stack) loads only for a signed-out visitor (AENR-839).
const AuthGate = lazyWithReload(() => import("./screens/auth").then((m) => ({ default: m.AuthGate })));
// The routine-decision jobs (refund policy, no-show release) render nothing; like the janitors they
// start right after the first render instead of riding in the first download (AENR-839).
const Automations = lazyWithReload(() => import("./lib/useAutomations").then((m) => ({ default: m.Automations })));

/** The customer's tabs in navigation order — sets the direction of page transitions (AENR-750). */
const CUSTOMER_TABS = ["home", "plan", "mybookings", "wallet", "account"];
/** Which way a guest page change travels: toward a later tab or deeper (1), or back (-1). */
const travel = (from: string, to: string): 1 | -1 => {
  const a = CUSTOMER_TABS.indexOf(from);
  const b = CUSTOMER_TABS.indexOf(to);
  return b < 0 ? 1 : a < 0 ? -1 : b > a ? 1 : -1;
};
/** Guest tabs kept mounted (frozen) once visited (AENR-841). The booking wizard always starts
 *  fresh, and Checkout / Confirmation / passes belong to one purchase, so they are not kept. */
const KEPT_PAGES = new Set(["home", "mybookings", "wallet", "account"]);
type VTDocument = Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };

export default function App() {
  const [persona, setPersona] = useState<PersonaId>(initialRoute.persona || saved.persona || "customer");
  const [pageByPersona, setPageByPersona] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = { ...DEFAULT_PAGE, ...(saved.pageByPersona || {}) };
    // Drop any stale page (e.g. a since-removed customer flow) so it resolves to
    // the persona's default instead of a blank/foreign screen.
    (Object.keys(base) as PersonaId[]).forEach((p) => {
      base[p] = resolvePage(p, base[p]);
      if (!isValidPage(p, base[p])) base[p] = DEFAULT_PAGE[p];
    });
    return initialRoute.persona && initialRoute.page
      ? { ...base, [initialRoute.persona]: initialRoute.page }
      : base;
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [signedIn, setSignedIn] = useState(!!saved.signedIn);
  // The language follows the device until the guest picks one (AENR-626); only a choice is saved.
  const [langChoice, setLangChoice] = useState<LangCode | null>(saved.lang ? normalizeLang(saved.lang) : null);
  const wantLang = langChoice ?? deviceLang();
  // Dictionaries load on demand (AENR-751): the UI keeps the language it has
  // until the chosen one's dictionary arrives, then switches in one go.
  const [loadedLang, setLoadedLang] = useState<LangCode>(wantLang);
  const lang = isLangLoaded(wantLang) ? wantLang : loadedLang;
  useEffect(() => {
    let live = true;
    loadLang(wantLang).then(() => live && setLoadedLang(wantLang));
    return () => { live = false; };
  }, [wantLang]);
  const setLang = useCallback((l: LangCode) => setLangChoice(l), []);
  const setLangAuto = useCallback(() => setLangChoice(null), []);
  const langAuto = langChoice === null;
  const [cart, setCart] = useState<CartItem[]>(saved.cart || []);
  const [consent, setConsentState] = useState<Consent>(saved.consent || DEFAULT_CONSENT);
  const [background, setBackground] = useState<BeachBackground>(saved.background || DEFAULT_BACKGROUND);
  const [beachLayout, setBeachLayoutState] = useState<Record<string, SunbedSlot[]>>(saved.beachLayout || {});
  const [zoneLogos, setZoneLogosState] = useState<Record<string, string>>(saved.zoneLogos || {});
  const [passes, setPasses] = useState<CustomerPasses>(saved.passes || DEFAULT_PASSES);
  const [passPricing, setPassPricing] = useState<PassPricing>(saved.passPricing || DEFAULT_PASS_PRICING);
  const [loyalty, setLoyaltyState] = useState<LoyaltyState>(saved.loyalty || DEFAULT_LOYALTY);
  const [achievements, setAchievements] = useState<Achievement[]>(saved.achievements || DEFAULT_ACHIEVEMENTS);
  const [zoneMap, setZoneMap] = useState<ZoneMapItem[]>(saved.zoneMap && !isLegacyZoneMap(saved.zoneMap) ? saved.zoneMap : DEFAULT_ZONE_MAP);
  const [priceRules, setPriceRules] = useState<PriceRule[]>(saved.priceRules || DEFAULT_PRICE_RULES);
  const [channels, setChannels] = useState<ChannelSetupState>(saved.channels || DEFAULT_CHANNELS);
  const [passCards, setPassCards] = useState<PassDesign[]>(saved.passCards || DEFAULT_PASS_CARDS);
  const [weather, setWeather] = useState<WeatherKind>(saved.weather || "sunny");
  const [dayTime, setDayTime] = useState<number>(saved.dayTime ?? DAY_DEFAULT);
  const [sceneFx, setSceneFxState] = useState<SceneFx>(saved.sceneFx || DEFAULT_SCENE_FX);
  const [showPreviews, setShowPreviews] = useState<boolean>(saved.showPreviews ?? false);
  const [bookingNotes, setBookingNotes] = useState<Record<string, BookingNote[]>>(saved.bookingNotes || {});
  const addBookingNote = useCallback((id: string, note: BookingNote) => setBookingNotes((m) => ({ ...m, [id]: [...(m[id] ?? []), note] })), []);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(() =>
    // Seed accounts added in later releases (e.g. the Support Agent) join a saved list.
    {
      // Saved users with a single legacy `role` migrate to `roles` (AENR-717).
      const su = saved.staffUsers?.map(migrateStaffUser);
      return su ? [...su, ...DEFAULT_STAFF.filter((d) => !su.some((u) => u.id === d.id))] : DEFAULT_STAFF;
    },
  );
  const [staffAudit, setStaffAudit] = useState<StaffAuditEntry[]>(saved.staffAudit || DEFAULT_STAFF_AUDIT);
  const [viewAsId, setViewAsId] = useState<string | null>(saved.viewAsId ?? null);
  // The staff member signed in on this device once they pick one of their roles
  // from the account menu (AENR-717) — keeps "who" while the role changes.
  const [staffMeId, setStaffMeId] = useState<string | null>(saved.staffMeId ?? null);
  const [crm, setCrmState] = useState<CrmState>(() => {
    const c: CrmState = { ...DEFAULT_CRM, ...(saved.crm || {}) };
    // Retired New / Regular tags (AENR-548): rules become visit counts, tags are dropped.
    return {
      ...c,
      segments: migrateLegacySegments(c.segments, c.regularAfter),
      edits: Object.fromEntries(Object.entries(c.edits).map(([id, e]) => [id, e.tags ? { ...e, tags: stripLegacyTags(e.tags) } : e])),
    };
  });
  const setCrm = useCallback((u: (c: CrmState) => CrmState) => setCrmState(u), []);
  const [till, setTillState] = useState<TillState>({ ...DEFAULT_TILL, ...(saved.till || {}) });
  const setTill = useCallback((u: (t: TillState) => TillState) => setTillState(u), []);
  // Fee lines saved before AENR-725 moved into the tenants' commercial terms (see platform below).
  const [finance, setFinanceState] = useState<Record<string, FinanceConfig>>(() =>
    Object.fromEntries(Object.entries(saved.finance || {}).map(([k, c]) => [k, stripLegacyFinance(c)])),
  );
  const setFinance = useCallback((sub: string, c: FinanceConfig) => setFinanceState((f) => ({ ...f, [sub]: c })), []);
  const [beachPricing, setBeachPricing] = useState<BeachPricing>({ ...DEFAULT_BEACH_PRICING, ...(saved.beachPricing || {}) });
  const [closedStores, setClosedStores] = useState<Record<string, string>>(saved.closedStores ?? DEFAULT_CLOSED_STORES);
  const [calendar, setCalendar] = useState<CalendarState>({ ...DEFAULT_CALENDAR, ...(saved.calendar || {}) });
  const [inventory, setInventoryState] = useState<InventoryState>({ ...DEFAULT_INVENTORY, ...(saved.inventory || {}) });
  const setInventory = useCallback((u: (i: InventoryState) => InventoryState) => setInventoryState(u), []);
  const [sunbedOps, setSunbedOpsState] = useState<SunbedOpsState>({ ...DEFAULT_SUNBED_OPS, ...(saved.sunbedOps || {}) });
  const setSunbedOps = useCallback((u: (s: SunbedOpsState) => SunbedOpsState) => setSunbedOpsState(u), []);
  const [bookingOps, setBookingOpsState] = useState<BookingOpsState>({ ...DEFAULT_BOOKING_OPS, ...(saved.bookingOps || {}) });
  const setBookingOps = useCallback((u: (s: BookingOpsState) => BookingOpsState) => setBookingOpsState(u), []);
  const [payLinks, setPayLinksState] = useState<PayLink[]>(saved.payLinks || []);
  const setPayLinks = useCallback((u: (s: PayLink[]) => PayLink[]) => setPayLinksState(u), []);
  const [display, setDisplayState] = useState<DisplayConfig>(() => {
    const d = { ...DEFAULT_DISPLAY, ...(saved.display || {}) };
    // AENR-678: older saves held "en+el" / "en" / "el"; keep them, drop anything unknown.
    return { ...d, langs: displayLangs(d.langs) };
  });
  const setDisplay = useCallback((u: (s: DisplayConfig) => DisplayConfig) => setDisplayState(u), []);
  const [layouts, setLayoutsState] = useState<LayoutState>({ ...DEFAULT_LAYOUT_STATE, ...(saved.layouts || {}) });
  const setLayouts = useCallback((u: (s: LayoutState) => LayoutState) => setLayoutsState(u), []);
  const [extras, setExtrasState] = useState<ExtrasState>(() => {
    const e: ExtrasState = { ...DEFAULT_EXTRAS, ...(saved.extras || {}), policy: { ...DEFAULT_EXTRAS.policy, ...(saved.extras?.policy || {}) } };
    // "AMEA" is shown as ΑμεΑ with its meaning (AENR-552).
    return { ...e, tickets: e.tickets.map((t) => (t.id === "amea" && t.short === "AMEA" ? { ...t, name: "ΑμεΑ (persons with disabilities)", short: "ΑμεΑ" } : t)) };
  });
  const setExtras = useCallback((u: (s: ExtrasState) => ExtrasState) => setExtrasState(u), []);
  const [account, setAccountState] = useState<AccountState>({ ...DEFAULT_ACCOUNT, ...(saved.account || {}), selfService: { ...DEFAULT_ACCOUNT.selfService, ...(saved.account?.selfService || {}) } });
  const setAccount = useCallback((u: (s: AccountState) => AccountState) => setAccountState(u), []);
  // Demo › first-time guest (AENR-778): swap the guest's own account and passes for an empty one
  // while the switch is on, and back when it is off — also on load, for a switch turned on earlier.
  const [newGuest] = useDemoFlag("newGuest");
  const [perfOn] = useDemoFlag("perf");
  const applyGuest = (g: GuestSnapshot) => {
    setAccountState(g.account);
    setPasses(g.passes);
    setCart(g.cart);
  };
  useEffect(() => {
    const swap = (newGuest ? enterFirstTime : leaveFirstTime)({ account, passes, cart });
    if (swap) applyGuest(swap);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on the switch, with the state at that moment
  }, [newGuest]);
  // Demo › Reset (under the switch): the simulated guest starts over.
  useEffect(() => {
    const onReset = () => applyGuest(resetFirstTime());
    window.addEventListener(FIRST_TIME_RESET, onReset);
    return () => window.removeEventListener(FIRST_TIME_RESET, onReset);
  }, []);
  const [platform, setPlatformState] = useState<PlatformState>(() => {
    const base = emptyPlatform(DEFAULT_TENANTS);
    const sp = saved.platform;
    if (!sp) return base;
    // Tenants seeded in later releases join a saved list.
    // Saved seed tenants pick up later seed facts they never had (staggered go-live, AENR-589).
    const seeded = sp.tenants.map((t0) => {
      const d = DEFAULT_TENANTS.find((x) => x.id === t0.id);
      // Commercial terms (AENR-725 / 689): a tenant saved before them takes the fee lines someone
      // customised in the retired fee model (AENR-521), else its seed terms, else the defaults.
      const migrated = t0.terms ? undefined : (termsFromLegacyFees(saved.finance?.[t0.subdomain]?.fees, SEED_TERMS[t0.id] ?? DEFAULT_TERMS) ?? SEED_TERMS[t0.id]);
      const t = migrated ? { ...t0, terms: migrated } : t0;
      const t2 = d?.goLive && t.goLive === "2026-04-20" ? { ...t, goLive: d.goLive } : t;
      // Seed module overrides added later (AENR-696: the demo beach has every module) join once,
      // never replacing an override the Platform set since.
      if (!d || (sp.modulesSeed ?? 0) >= MODULES_SEED) return t2;
      const add = d.overrides.filter((o) => !t2.overrides.some((x) => x.module === o.module));
      return add.length ? { ...t2, overrides: [...t2.overrides, ...add] } : t2;
    });
    return { ...base, ...sp, modulesSeed: MODULES_SEED, tenants: [...seeded, ...DEFAULT_TENANTS.filter((d) => !sp.tenants.some((t) => t.id === d.id))] };
  });
  const setPlatform = useCallback((u: (s: PlatformState) => PlatformState) => setPlatformState(u), []);
  const [comms, setCommsState] = useState<CommsState>(() => {
    const c: CommsState = { ...DEFAULT_COMMS, ...(saved.comms || {}), settings: { ...DEFAULT_COMMS.settings, ...(saved.comms?.settings || {}) } };
    // The visit-threshold segment is no longer called "Regular" (AENR-548).
    const ra = saved.crm?.regularAfter ?? DEFAULT_CRM.regularAfter;
    return { ...c, campaigns: c.campaigns.map((x) => (x.segmentId === "sys-regular" && x.segmentName === "Regular" ? { ...x, segmentName: visitSegmentName(ra) } : x)) };
  });
  const setComms = useCallback((u: (s: CommsState) => CommsState) => setCommsState(u), []);
  const [privacy, setPrivacyState] = useState<PrivacyState>(() => ({ ...DEFAULT_PRIVACY, ...(saved.privacy || {}) }));
  const setPrivacy = useCallback((u: (s: PrivacyState) => PrivacyState) => setPrivacyState(u), []);
  // Incidents reported to Slaice (AENR-720); seed incidents added later join a saved list.
  const [incidents, setIncidentsState] = useState<Incident[]>(() => {
    const si = saved.incidents;
    return si ? [...si, ...DEFAULT_INCIDENTS.filter((d) => !si.some((x) => x.id === d.id))] : DEFAULT_INCIDENTS;
  });
  const setIncidents = useCallback((u: (s: Incident[]) => Incident[]) => setIncidentsState(u), []);

  // Other windows of the app (e.g. the entrance display, AENR-519) share the
  // operational state: when one saves, the others adopt what changed. Only
  // differing slices are set, so windows don't echo each other's writes.
  const shared = { beachLayout, zoneLogos, zoneMap, priceRules, till, finance, beachPricing, closedStores, calendar, inventory, sunbedOps, bookingOps, payLinks, weather, display, layouts, extras, account, platform, comms, privacy, incidents };
  const sharedRef = useRef(shared);
  useEffect(() => { sharedRef.current = shared; });
  // Warm the current role's screens once the first page is up (AENR-730), so the next tap is instant —
  // quietly, when the browser is idle (AENR-837), and not at all on Save-Data (the taps below still
  // fetch on intent).
  useEffect(() => {
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    const ric = window.requestIdleCallback;
    if (!ric) {
      const id = window.setTimeout(() => prefetchPersona(persona), 1500);
      return () => window.clearTimeout(id);
    }
    const id = ric(() => prefetchPersona(persona), { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }, [persona]);
  // Preload on intent (AENR-837): a pointer over, a press on or focus on any nav item (data-page)
  // starts that page's download ~100–300 ms before the click lands.
  useEffect(() => {
    const onIntent = (e: Event) => {
      const el = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-page]") : null;
      if (el?.dataset.page) prefetchPage(persona, el.dataset.page);
    };
    const opts = { passive: true, capture: true } as const;
    document.addEventListener("pointerover", onIntent, opts);
    document.addEventListener("pointerdown", onIntent, opts);
    document.addEventListener("focusin", onIntent, opts);
    return () => {
      document.removeEventListener("pointerover", onIntent, opts);
      document.removeEventListener("pointerdown", onIntent, opts);
      document.removeEventListener("focusin", onIntent, opts);
    };
  }, [persona]);
  useEffect(() => {
    const setters: Record<keyof typeof shared, (v: never) => void> = {
      beachLayout: setBeachLayoutState, zoneLogos: setZoneLogosState, zoneMap: setZoneMap, priceRules: setPriceRules,
      till: setTillState, finance: setFinanceState, beachPricing: setBeachPricing, closedStores: setClosedStores,
      calendar: setCalendar, inventory: setInventoryState, sunbedOps: setSunbedOpsState, bookingOps: setBookingOpsState, payLinks: setPayLinksState,
      weather: setWeather, display: setDisplayState, layouts: setLayoutsState, extras: setExtrasState, account: setAccountState, platform: setPlatformState, comms: setCommsState, privacy: setPrivacyState, incidents: setIncidentsState,
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LS_KEY || !e.newValue) return;
      let next: Record<string, unknown>;
      try { next = JSON.parse(e.newValue); } catch { return; }
      for (const k of Object.keys(setters) as (keyof typeof shared)[]) {
        if (next[k] !== undefined && JSON.stringify(next[k]) !== JSON.stringify(sharedRef.current[k])) setters[k](next[k] as never);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const updateStaff = useCallback((users: StaffUser[], action: string, by = "Manager / Admin") => {
    setStaffUsers(users);
    setStaffAudit((a) => [{ at: new Date().toISOString(), by, action }, ...a]);
  }, []);

  useEffect(() => {
    if (DISPLAY || PASS) return;
    // Guard the write: Safari Private Mode and a full quota throw on setItem.
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ persona, pageByPersona, signedIn, lang: langChoice ?? undefined, cart, consent, background, beachLayout, zoneLogos, passes, passPricing, loyalty, achievements, zoneMap, priceRules, channels, passCards, weather, dayTime, sceneFx, showPreviews, bookingNotes, staffUsers, staffMeId, staffAudit, viewAsId, crm, till, finance, beachPricing, closedStores, calendar, inventory, sunbedOps, bookingOps, payLinks, display, layouts, extras, account, platform, comms, privacy, incidents }));
    } catch {
      /* storage unavailable (private mode / quota) — ignore */
    }
  }, [persona, pageByPersona, signedIn, langChoice, cart, consent, background, beachLayout, zoneLogos, passes, passPricing, loyalty, achievements, zoneMap, priceRules, channels, passCards, weather, dayTime, sceneFx, showPreviews, bookingNotes, staffUsers, staffMeId, staffAudit, viewAsId, crm, till, finance, beachPricing, closedStores, calendar, inventory, sunbedOps, bookingOps, payLinks, display, layouts, extras, account, platform, comms, privacy, incidents]);

  // Keep <html lang> in sync with the chosen language (a11y / SEO correctness).
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang] || "en";
  }, [lang]);

  // Mirror the active persona onto <html data-persona> so persona-scoped theming
  // can target it in CSS — e.g. the customer surface's translucent glass cards
  // (see index.css). An attribute on the root also reaches portaled surfaces.
  useEffect(() => {
    document.documentElement.dataset.persona = PASS ? "customer" : persona;
  }, [persona]);

  const setConsent = useCallback((patch: Partial<Consent>) => {
    setConsentState((c) => ({ ...c, ...patch, decided: true, ts: new Date().toISOString() }));
  }, []);
  const reopenConsent = useCallback(() => setConsentState((c) => ({ ...c, decided: false })), []);
  // Publish (or replace) a zone's umbrella layout from the admin Map Editor.
  const setZoneLayout = useCallback((zoneId: string, slots: SunbedSlot[]) => {
    setBeachLayoutState((m) => ({ ...m, [zoneId]: slots }));
  }, []);
  // Set (or clear, with null) a zone's logo from the admin Map Editor.
  const setZoneLogo = useCallback((zoneId: string, src: string | null) => {
    setZoneLogosState((m) => {
      if (!src) {
        const next = { ...m };
        delete next[zoneId];
        return next;
      }
      return { ...m, [zoneId]: src };
    });
  }, []);

  const page = pageByPersona[persona];
  // ---- Page changes on the guest site (AENR-840) ----
  // Where a browser has View Transitions, the page being left is captured and fades out over the
  // new one while the new one slides in (before, the old page simply vanished). Only the old page
  // is named for the transition: the new page stays part of the live document, so its frosted
  // glass keeps blurring the sea behind it and the camera keeps flying (a named element would be
  // its own isolated layer). The wizard has its own choreography and is left out; reduced motion,
  // staff screens and older browsers change in place (with the slide-in below).
  const mainRef = useRef<HTMLElement>(null);
  const cur = useRef({ persona, page });
  cur.current = { persona, page };
  const vtRan = useRef(false);
  const transitionTo = useCallback((toPersona: PersonaId, toPage: string | undefined, update: () => void) => {
    const from = cur.current;
    const main = mainRef.current;
    const doc = document as VTDocument;
    const guest = from.persona === "customer" && toPersona === "customer";
    if (!guest || !toPage || toPage === from.page || from.page === "plan" || toPage === "plan" || !main || !doc.startViewTransition || prefersReducedMotion()) {
      update();
      return;
    }
    const root = document.documentElement;
    root.dataset.pageDir = travel(from.page, toPage) > 0 ? "fwd" : "back";
    main.style.setProperty("view-transition-name", "guest-page");
    const vt = doc.startViewTransition(() => {
      flushSync(update);
      // The new page isn't captured — see above.
      main.style.removeProperty("view-transition-name");
    });
    vtRan.current = true;
    void vt.finished.finally(() => {
      delete root.dataset.pageDir;
      main.style.removeProperty("view-transition-name");
    });
  }, []);
  const setPage = useCallback((k: string) => transitionTo(persona, k, () => setPageByPersona((s) => ({ ...s, [persona]: k }))), [persona, transitionTo]);

  // ---- URL routing: mirror persona+page into the location hash. ----
  const firstRoute = useRef(true);
  useEffect(() => {
    if (DISPLAY || PASS) return;
    const target = buildHash(persona, page);
    // Compare the path only: a page's own query (e.g. ?period=month) and
    // deeper segments (e.g. /tenant/<id>/<section>) stay.
    const cur = hashPath();
    if (cur !== target && !cur.startsWith(`${target}/`)) {
      if (firstRoute.current) window.history.replaceState(null, "", target);
      else window.history.pushState(null, "", target);
    }
    firstRoute.current = false;
  }, [persona, page]);

  // Browser Back/Forward (and manual hash edits) -> app state.
  useEffect(() => {
    const onPop = () => {
      const r = parseHash();
      if (!r.persona) return;
      const to = r.persona;
      transitionTo(to, r.page, () => {
        setPersona(to);
        if (r.page) setPageByPersona((s) => ({ ...s, [to]: r.page as string }));
      });
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onPop);
    };
  }, [transitionTo]);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback((msg: ReactNode, opts: ToastOptions = {}) => {
    const id = Date.now() + Math.random();
    const duration = opts.duration ?? (opts.action ? 6500 : 4200);
    setToasts((t) => [...t, { id, msg, action: opts.action, tone: opts.tone, duration }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const [hint, setHint] = useState<SpotlightHint | null>(null);
  const clearHint = useCallback(() => setHint(null), []);
  const go = useCallback((p: PersonaId, k?: string, h?: Partial<SpotlightHint> | null) => {
    // Retired page keys still work (AENR-558/559): resolve them like a hash link.
    const page = k && resolvePage(p, k);
    transitionTo(p, page || undefined, () => {
      setPersona(p);
      if (page) setPageByPersona((s) => ({ ...s, [p]: page }));
      setHint(h ? { ...h, persona: p, page, ts: Date.now() } : null);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [transitionTo]);
  // Cinematic entry into the booking wizard. The "reveal" is now the page
  // background itself: entering the "plan" page lifts the shoreline so the sand
  // sweeps up into view (see CustomerBackdrop) and the immersive flow mounts on
  // top — so this just navigates.
  const dive = useCallback(() => go("customer", "plan"), [go]);
  // RBAC "view as": show the app exactly as a staff user would see it — their
  // role's pages only — until the admin exits the preview.
  const viewAs = staffUsers.find((u) => u.id === viewAsId && u.status === "active") ?? null;
  // Roles the demo beach doesn't use (AENR-716) are never a preview or switch target.
  const siteTenant = platform.tenants.find((x) => x.id === platform.siteTenant);
  const viewAsHome: PersonaId = viewAs ? (usableRoles(siteTenant, viewAs.roles)[0] ?? viewAs.roles[0]) : "admin";
  const startViewAs = useCallback((id: string) => {
    const u = staffUsers.find((x) => x.id === id);
    const first = u ? usableRoles(siteTenant, u.roles)[0] : undefined;
    if (!u || u.status !== "active" || !first) return;
    setViewAsId(id);
    go(first, DEFAULT_PAGE[first]);
  }, [staffUsers, go, siteTenant]);
  // "Your roles" in the account menu (AENR-717): the same user, another of their
  // roles — lands on that role's start page. On the till, a role switch while a
  // shift is open hands the till to this person (they're signed in already).
  const switchRole = useCallback((userId: string, role: StaffRole) => {
    const u = staffUsers.find((x) => x.id === userId);
    if (!u || !hasRole(u, role) || !tenantRoleOn(siteTenant, role)) return;
    if (!viewAsId) {
      setStaffMeId(userId);
      if (role === "cashier" || role === "support") setTill((t) => (t.shift ? { ...t, active: u.name } : t));
    }
    go(role, DEFAULT_PAGE[role]);
  }, [staffUsers, viewAsId, go, setTill, siteTenant]);
  const exitViewAs = useCallback(() => {
    setViewAsId(null);
    go("admin", "rbac");
  }, [go]);

  const addToCart = useCallback((item: CartItem) => setCart((c) => (c.find((x) => x.kind === item.kind && x.id === item.id) ? c : [...c, item])), []);
  const removeFromCart = useCallback((kind: CartItem["kind"], id: string) => setCart((c) => c.filter((x) => !(x.kind === kind && x.id === id))), []);
  const clearCart = useCallback(() => setCart([]), []);

  // ---- Passes: VIP credit (top-up + spend) and the Season pass. ----
  const buyVipCredit = useCallback((amount: number) => {
    setPasses((p) => ({
      ...p,
      vip: {
        balance: round2((p.vip?.balance ?? 0) + amount),
        purchased: round2((p.vip?.purchased ?? 0) + amount),
        validUntil: `End of season · ${SEASON_END_LABEL}`,
      },
    }));
  }, []);
  const spendVipCredit = useCallback((amount: number) => {
    setPasses((p) => (p.vip ? { ...p, vip: { ...p.vip, balance: Math.max(0, round2(p.vip.balance - amount)) } } : p));
  }, []);
  const buySeasonPass = useCallback((plan: SeasonPlan) => {
    setPasses((p) => ({ ...p, season: { plan, validUntil: seasonValidUntil(plan) } }));
  }, []);
  const clearPass = useCallback((kind: "vip" | "season") => {
    setPasses((p) => ({ ...p, [kind]: null }));
  }, []);
  const setLoyalty = useCallback((updater: (s: LoyaltyState) => LoyaltyState) => setLoyaltyState(updater), []);
  const setSceneFx = useCallback((patch: Partial<SceneFx>) => setSceneFxState((s) => ({ ...s, ...patch })), []);

  // Memoised so the provider value keeps a stable identity across renders.
  const ctx = useMemo<AppContextValue>(
    () => ({ toast, go, dive, persona, page, signedIn, setSignedIn, lang, setLang, langAuto, setLangAuto, cart, addToCart, removeFromCart, clearCart, hint, clearHint, consent, setConsent, reopenConsent, background, setBackground, beachLayout, setZoneLayout, zoneLogos, setZoneLogo, passes, buyVipCredit, spendVipCredit, buySeasonPass, clearPass, passPricing, setPassPricing, loyalty, setLoyalty, achievements, setAchievements, zoneMap, setZoneMap, priceRules, setPriceRules, channels, setChannels, passCards, setPassCards, weather, setWeather, dayTime, setDayTime, sceneFx, setSceneFx, showPreviews, setShowPreviews, bookingNotes, addBookingNote, staffUsers, updateStaff, staffAudit, viewAs, startViewAs, exitViewAs, staffMeId, switchRole, crm, setCrm, till, setTill, finance, setFinance, beachPricing, setBeachPricing, closedStores, setClosedStores, calendar, setCalendar, inventory, setInventory, sunbedOps, setSunbedOps, bookingOps, setBookingOps, payLinks, setPayLinks, display, setDisplay, layouts, setLayouts, extras, setExtras, account, setAccount, platform, setPlatform, comms, setComms, privacy, setPrivacy, incidents, setIncidents }),
    [toast, go, dive, persona, page, signedIn, setSignedIn, lang, setLang, langAuto, setLangAuto, cart, addToCart, removeFromCart, clearCart, hint, clearHint, consent, setConsent, reopenConsent, background, setBackground, beachLayout, setZoneLayout, zoneLogos, setZoneLogo, passes, buyVipCredit, spendVipCredit, buySeasonPass, clearPass, passPricing, setPassPricing, loyalty, setLoyalty, achievements, setAchievements, zoneMap, setZoneMap, priceRules, setPriceRules, channels, setChannels, passCards, setPassCards, weather, setWeather, dayTime, setDayTime, sceneFx, setSceneFx, showPreviews, setShowPreviews, bookingNotes, addBookingNote, staffUsers, updateStaff, staffAudit, viewAs, startViewAs, exitViewAs, staffMeId, switchRole, crm, setCrm, till, setTill, finance, setFinance, beachPricing, setBeachPricing, closedStores, setClosedStores, calendar, setCalendar, inventory, setInventory, sunbedOps, setSunbedOps, bookingOps, setBookingOps, payLinks, setPayLinks, display, setDisplay, layouts, setLayouts, extras, setExtras, account, setAccount, platform, setPlatform, comms, setComms, privacy, setPrivacy, incidents, setIncidents],
  );

  // The booking wizard takes over the whole viewport: the beach becomes the
  // tappable surface, so the standing chrome (tenant logo, bottom tab bar) steps
  // aside and the backdrop lifts its shoreline.
  const immersive = persona === "customer" && page === "plan";
  // Desktop wizard layout (panel on the right, sea down to the middle) — picks which beach logo is in the DOM.
  const wide = useMediaQuery("(min-width: 1024px)");
  // On computers the pass cards' foil follows the pointer (the phone tilt was removed, AENR-848).
  useFoilPointer(signedIn && persona === "customer");

  // Page transitions on the customer surface (AENR-750): a tab change slides the
  // new page in from the side of the tab you chose (Home → Account from the
  // right, back from the left); a page outside the tabs (Checkout, a pass) is
  // "deeper" and arrives from the right, returning to a tab comes from the left.
  // Derived while rendering — the previous page lives in state. Reduced motion
  // removes the travel (global CSS), leaving an instant change.
  const [shownPage, setShownPage] = useState(page);
  const [pageDir, setPageDir] = useState<1 | -1>(1);
  if (page !== shownPage) {
    setPageDir(travel(shownPage, page));
    setShownPage(page);
  }
  // Keep visited guest tabs ready (AENR-841): derived while rendering, like the direction above.
  // Leaving the guest site, or previewing a staff user, lets them go.
  const keepOn = persona === "customer" && !viewAs;
  const [kept, setKept] = useState<string[]>([]);
  if (!keepOn && kept.length) setKept([]);
  else if (keepOn && KEPT_PAGES.has(page) && !kept.includes(page)) setKept([...kept, page]);
  // Each kept tab comes back where the guest left it; a first visit opens at the top.
  const scrollOf = useRef<Record<string, number>>({});
  const scrollPage = useRef(page);
  useEffect(() => {
    const onScroll = () => {
      scrollOf.current[scrollPage.current] = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const shownAt = useRef(`${persona}/${page}`);
  useLayoutEffect(() => {
    scrollPage.current = page;
    const at = `${persona}/${page}`;
    if (shownAt.current === at) return; // first load (and StrictMode's re-run)
    shownAt.current = at;
    // The live sea yields the frames of a page change to the page (AENR-836).
    markBusy(DURATION.page + 160);
    if (persona !== "customer") return;
    if (KEPT_PAGES.has(page)) window.scrollTo({ top: scrollOf.current[page] ?? 0, behavior: "instant" });
    // The new page slides in from the side of travel (AENR-750) — unless reduced motion, or the wizard.
    if (page === "plan" || prefersReducedMotion()) return;
    const pane = mainRef.current?.querySelector<HTMLElement>(`:scope > [data-pane="${page}"]`);
    pane?.animate(
      [
        { opacity: 0, transform: `translateX(${pageDir * DISTANCE.page}px)` },
        { opacity: 1, transform: "none" },
      ],
      // After a View Transition the old page is still fading out on top: arrive a touch later.
      { duration: DURATION.page, delay: vtRan.current ? 40 : 0, easing: EASING.out.css, fill: "backwards" },
    );
    vtRan.current = false;
  }, [persona, page, pageDir]);
  // Move focus to the new page so keyboard and screen-reader users start there
  // (not on first load, and not into the immersive wizard, which manages its own).
  const focusedFor = useRef(`${persona}/${page}`);
  useEffect(() => {
    const at = `${persona}/${page}`;
    if (focusedFor.current === at) return; // first load (and StrictMode's re-run)
    focusedFor.current = at;
    if (persona === "customer" && page !== "plan") mainRef.current?.focus({ preventScroll: true });
  }, [persona, page]);
  const guard = useMemo(() => ({ viewAs: !!platform.viewAs && persona !== "platform", readOnly: platform.viewAs?.scope === "read" }), [platform.viewAs, persona]);

  if (DISPLAY)
    return (
      <AppCtx.Provider value={ctx}>
        <Suspense fallback={<div className="min-h-dvh bg-navy-900" />}>
          <LiveDisplay />
        </Suspense>
      </AppCtx.Provider>
    );
  if (PASS)
    return (
      <AppCtx.Provider value={ctx}>
        <Suspense fallback={<div className="min-h-dvh grad-sea" />}>
          <GuestPass />
        </Suspense>
        <Toasts items={toasts} onDismiss={dismissToast} />
      </AppCtx.Provider>
    );

  return (
    <AppCtx.Provider value={ctx}>
      {!signedIn ? (
        <Suspense fallback={<div className="min-h-dvh grad-sea" />}>
          <AuthGate />
        </Suspense>
      ) : (
        <div className="w-full px-3 sm:px-5 pt-4 relative min-h-dvh flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-1">
          {persona === "customer" && <CustomerBackdrop immersive={immersive} page={page} />}
          {persona === "customer" && <WeatherUi />}
          {/* The beach logo stays in the sea on every guest screen (AENR-783). Below 1024px it is
              the same element in the wizard as on the tabs — it doesn't remount, so it never
              moves or blinks: the wizard's sheet stops at 78vh, leaving the top-bar row
              (and the sea band above the raised shoreline) free. Inside the wizard it is
              decorative, so a stray tap can't throw away a half-made booking ("Leave" is
              the way out); the wizard's own layer (z-20) stays above it either way. */}
          {persona === "customer" && (!immersive || !wide) && (
            <button
              onClick={() => go("customer", "home")}
              aria-label="Go to home"
              disabled={immersive}
              aria-hidden={immersive || undefined}
              // Phones: a compact logo beside the icon bar, so content starts high (AENR-649);
              // desktop keeps the large logo on Home only. Tablets in the wizard: sized by the
              // sea left above the sheet, so a short (landscape) screen gets a smaller logo.
              className={`flex max-md:justify-start md:justify-center items-center max-md:-mt-[54px] max-md:h-12 relative z-10 md:pt-1 md:pb-1 mb-2 sm:mb-4 w-fit md:w-full max-md:mr-auto group hover:opacity-90 active:opacity-75 transition-opacity disabled:pointer-events-none`}
            >
              <GlideLogo spot="home" className={`w-auto max-md:h-9 ${immersive ? "md:h-[min(4rem,12vh)]" : page === "home" ? "md:h-[100px]" : "md:h-16"}`} />
            </button>
          )}
          {/* Booking wizard on desktop: the beach logo floats over the open sea, as on Home (AENR-671),
              scaled to the screen's height so it stays well above the shoreline (AENR-783). */}
          {persona === "customer" && immersive && wide && (
            <div className="flex fixed z-[15] top-[13vh] left-0 right-[min(460px,36vw)] justify-center pointer-events-none">
              <button onClick={() => go("customer", "home")} aria-label="Go to home" className="pointer-events-auto rounded-2xl hover:opacity-90 active:opacity-75 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <GlideLogo spot="wizard" className="h-[clamp(56px,13vh,110px)] w-auto drop-shadow-[0_2px_10px_rgba(0,40,80,0.25)]" />
              </button>
            </div>
          )}
          {persona === "customer" && !immersive && !viewAs && <CustomerNav page={page} setPage={setPage} />}
          {viewAs && (
            <div role="status" className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-navy-900 text-white px-4 py-2.5 text-[13px] shadow-lift">
              <Icon.eye size={15} className="text-teal-300 shrink-0" />
              <span className="flex-1 min-w-0">Viewing as <b>{viewAs.name}</b> · {rolesLabel(viewAs)} — you see only the pages {viewAs.roles.length > 1 ? "these roles" : "this role"} can open.</span>
              <button type="button" onClick={exitViewAs} className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 font-semibold transition">Exit preview</button>
            </div>
          )}
          <Suspense fallback={null}>
            {(persona !== "customer" || platform.viewAs) && <ViewAsBanner />}
            <PlatformJanitor />
            <CommsJanitor />
            {persona === "platform" && <TenantSwitcher />}
            <CommandPalette />
          </Suspense>
          {/* Routine decisions that run by themselves — refund policy, no-show release (AENR-623). */}
          <Suspense fallback={null}>
            <Automations />
          </Suspense>
          {persona !== "platform" && platform.siteTenant !== "akti" && (
            <div role="status" className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-slaice-600 text-white px-4 py-2 text-[13px]">
              <Icon.eye size={15} /> Previewing <b>{platform.tenants.find((x) => x.id === platform.siteTenant)?.name}</b>'s site and till
              <button type="button" onClick={() => setPlatformState((p) => ({ ...p, siteTenant: "akti" }))} className="ml-auto rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1 font-semibold">Back to Akti tou Iliou</button>
            </div>
          )}
          <TopBar persona={persona} setPersona={setPersona} page={page} setPage={setPage} previewing={!!viewAs} lead={persona === "cashier" && tenantRoleOn(siteTenant, "cashier") ? <Suspense fallback={null}><ShiftSwitch /></Suspense> : undefined} />
          {persona === "customer" ? (
            // flex-1 lets the content region grow so the SiteFooter is pushed to
            // the bottom of the viewport (the beach backdrop's green band)
            // instead of floating up under short pages.
            <div className="flex-1">
              <main ref={mainRef} tabIndex={-1} className="min-w-0 outline-none">
                {viewAs ? (
                  <AccessDenied user={viewAs} onHome={() => go(viewAsHome, DEFAULT_PAGE[viewAsHome])} />
                ) : (
                  <>
                    {/* Visited tabs stay mounted, frozen while hidden (AENR-841); other pages mount fresh. */}
                    {kept.map((k) => (
                      <Freeze key={k} freeze={k !== page}>
                        <div data-pane={k}>
                          <PageGate persona="customer" page={k}><Suspense fallback={<RouteLoading guest />}>{routeFor("customer", k)}</Suspense></PageGate>
                        </div>
                      </Freeze>
                    ))}
                    {!kept.includes(page) && (
                      <div key={page} data-pane={page}>
                        <PageGate persona={persona} page={page}><Suspense fallback={<RouteLoading guest />}>{routeFor(persona, page)}</Suspense></PageGate>
                      </div>
                    )}
                  </>
                )}
              </main>
            </div>
          ) : (
            <div className="flex-1 flex gap-5 min-h-0">
              {persona !== "cashier" && <Sidebar persona={persona} page={page} setPage={setPage} />}
              {/* While Slaice staff view a tenant, the guard disables mutating / blocked controls (AENR-515). */}
              <GuardCtx.Provider value={guard}>
                <main className="flex-1 min-w-0">{persona === "cashier" && <TillTabs persona={persona} page={page} setPage={setPage} />}{persona === "cashier" && !viewAs && <Suspense fallback={null}><OfflineBanner /></Suspense>}{viewAs && !hasRole(viewAs, persona) ? <AccessDenied user={viewAs} onHome={() => go(viewAsHome, DEFAULT_PAGE[viewAsHome])} /> : <PageGate persona={persona} page={page}><Suspense fallback={<RouteLoading />}>{routeFor(persona, page)}</Suspense></PageGate>}</main>
              </GuardCtx.Provider>
            </div>
          )}
          {/* The tenant badge bows out once the guest dives into the booking
              wizard, so the beach + zones take over the screen. */}
          {!immersive && <SiteFooter />}
          {/* Bottom tab bar (mobile only). In the customer booking flow it slides
              away so the step's own action bar is the only footer (AENR-752);
              "Leave" is the way out, and the bar returns with the next page. */}
          {persona !== "cashier" && <BottomTabBar persona={persona} page={page} setPage={setPage} away={immersive} />}
          {/* The "view as another persona" control lives in the bottom-right
              corner of the customer Home only (AENR-745) — a quiet demo
              affordance, opening upward, that never covers a page's sticky
              action bar (the wizard, checkout). */}
          {persona === "customer" && page === "home" && !viewAs && (
            <div className="hidden md:block fixed right-5 z-40 bottom-4">
              <PersonaSwitcher persona={persona} setPersona={setPersona} variant="demo" side="top" />
            </div>
          )}
        </div>
      )}
      <ConsentBanner />
      <Toasts items={toasts} onDismiss={dismissToast} />
      {perfOn && <Suspense fallback={null}><PerfOverlay /></Suspense>}
    </AppCtx.Provider>
  );
}

/* Shown while previewing a staff user who opens a page outside their role. */
function AccessDenied({ user, onHome }: { user: StaffUser; onHome: () => void }) {
  return (
    <div className="glass-card rounded-3xl p-8 max-w-lg mx-auto mt-6 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-700 grid place-items-center"><Icon.lock size={22} /></div>
      <h1 className="mt-3 font-display font-bold text-xl text-navy-900">Access denied</h1>
      <p className="mt-1 text-sm text-slate-600">{user.roles.length > 1 ? `None of ${user.name}'s roles (${rolesLabel(user)}) can` : `The ${roleLabel(user.roles[0])} role can't`} open this page.</p>
      <button type="button" onClick={onHome} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy-900 text-white px-4 py-2 text-sm font-semibold">Go to my start page</button>
    </div>
  );
}

/* While a screen's chunk downloads (AENR-730) — a quiet skeleton in the page's shape. */
/* While a screen's code loads, the shell stays and the content area shows the
   shape of what is coming (AENR-756): guest pages get frosted guest cards,
   staff pages a title, stat tiles and table rows — never a blank fill. */
function RouteLoading({ guest = false }: { guest?: boolean }) {
  const t = useT();
  if (guest)
    return (
      <div aria-busy="true" className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
        <span className="sr-only">{t("Loading…")}</span>
        <div className="glass-flat rounded-3xl p-5 sm:p-7 grid gap-2.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-5 w-full max-w-md" />
          <div className="flex gap-2 pt-2"><Skeleton className="h-11 w-28 rounded-[14px]" /><Skeleton className="h-11 w-24 rounded-[14px]" /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="glass-flat rounded-3xl p-5 grid gap-2.5">
              <div className="flex items-center gap-3"><Skeleton className="w-10 h-10 rounded-xl" /><Skeleton className="h-4 flex-1" /></div>
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <div aria-busy="true" className="grid gap-4 pt-1">
      <span className="sr-only">Loading…</span>
      <div className="flex items-center justify-between gap-3"><Skeleton className="h-7 w-48" /><Skeleton className="h-9 w-28 rounded-xl" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-soft py-1"><TableSkeleton rows={6} cols={5} /></div>
    </div>
  );
}
