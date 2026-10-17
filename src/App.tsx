import { Suspense, useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { AppCtx, DEFAULT_CRM } from "./app/store";
import type { AppContextValue, SpotlightHint, ToastOptions } from "./app/store";
import { DEFAULT_PAGE } from "./data/personas";
import { Icon } from "./lib/icons";
import { TopBar, Sidebar, BottomTabBar, CustomerNav, SiteFooter, Toasts, PersonaSwitcher, TillTabs } from "./components/Shell";
import { AuthGate } from "./screens/auth";
import { ConsentBanner } from "./components/ConsentBanner";
import { CustomerBackdrop } from "./components/CustomerBackdrop";
import { GlideLogo } from "./components/GlideLogo";
import { routeFor } from "./routes";
import { parseHash, buildHash, hashPath, isValidPage, resolvePage } from "./app/router";
import { HTML_LANG, deviceLang, normalizeLang } from "./app/i18n";
import { DEFAULT_BACKGROUND } from "./data/backgrounds";
import { DEFAULT_PASSES, DEFAULT_PASS_PRICING, SEASON_END_LABEL, seasonValidUntil, round2 } from "./data/passes";
import { DEFAULT_LOYALTY } from "./data/loyalty";
import type { LoyaltyState } from "./data/loyalty";
import { DEFAULT_ACHIEVEMENTS } from "./data/gamification";
import type { Achievement } from "./data/gamification";
import { DEFAULT_ZONE_MAP, DEFAULT_PRICE_RULES } from "./data/pricing";
import { DEFAULT_CHANNELS } from "./data/channels";
import { DEFAULT_STAFF, DEFAULT_STAFF_AUDIT, hasRole, migrateStaffUser, roleLabel, rolesLabel } from "./data/staff";
import type { LegacyStaffUser } from "./data/staff";
import { DEFAULT_PASS_CARDS } from "./data/passDesigns";
import type { BeachBackground, BookingNote, CrmState, StaffAuditEntry, StaffRole, StaffUser, CartItem, ChannelSetupState, Consent, CustomerPasses, LangCode, PassDesign, PassPricing, PersonaId, PriceRule, SeasonPlan, SunbedSlot, ZoneMapItem } from "./domain/types";
import type { TillState } from "./domain/till";
import type { FinanceConfig } from "./domain/finance";
import type { BeachPricing, CalendarState } from "./domain/types";
import { DEFAULT_BEACH_PRICING, DEFAULT_CALENDAR } from "./data/pricing";
import { DEFAULT_INVENTORY, type InventoryState } from "./domain/inventory";
import { DEFAULT_SUNBED_OPS, type SunbedOpsState } from "./domain/sunbedOps";
import { DEFAULT_BOOKING_OPS } from "./data/bookingOps";
import type { BookingOpsState } from "./domain/bookingOps";
import type { PayLink } from "./domain/payLink";
import { DEFAULT_DISPLAY, displayLangs, type DisplayConfig } from "./domain/display";
import { lazyWithReload } from "./lib/staleChunk";
import { GuardCtx } from "./components/ui";
import { ViewAsBanner } from "./screens/tenant/ViewAs";
import { PlatformJanitor } from "./screens/tenant/Janitor";
import { TenantSwitcher } from "./screens/tenant/TenantPage";
import { DEFAULT_LAYOUT_STATE, type LayoutState } from "./domain/layoutVersions";
import { DEFAULT_EXTRAS, type ExtrasState } from "./domain/extras";
import { DEFAULT_ACCOUNT, type AccountState } from "./domain/account";
import { emptyPlatform, type PlatformState } from "./domain/platform";
import { DEFAULT_COMMS, type CommsState } from "./data/comms";
import { DEFAULT_PRIVACY, type PrivacyState } from "./data/gdpr";
import { CommsJanitor } from "./screens/communicate/Janitor";
import { DEFAULT_TENANTS } from "./data/tenants";
import { DEFAULT_CLOSED_STORES } from "./data/beach";
import { DEFAULT_TILL } from "./data/till";
import { DAY_DEFAULT, DEFAULT_SCENE_FX } from "./data/beach";
import type { SceneFx, WeatherKind } from "./data/beach";
import { OfflineBanner } from "./screens/cashier/TillStatus";
import { CommandPalette } from "./components/CommandPalette";
import { migrateLegacySegments, stripLegacyTags, visitSegmentName } from "./domain/segments";

import { Automations } from "./lib/useAutomations";
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
  finance?: Record<string, FinanceConfig>;
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
};
// A deep link in the URL wins over the last saved location.
const initialRoute = parseHash();
// `#/display` is the chrome-less entrance screen (AENR-519): no shell, sign-in
// or cookie banner; it reads the shared state and never writes it back.
const DISPLAY = hashPath().startsWith("#/display");
const LiveDisplay = lazyWithReload(() => import("./screens/display/LiveDisplay").then((m) => ({ default: m.LiveDisplay })));

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
  const lang = langChoice ?? deviceLang();
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
  const [zoneMap, setZoneMap] = useState<ZoneMapItem[]>(saved.zoneMap || DEFAULT_ZONE_MAP);
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
  const [finance, setFinanceState] = useState<Record<string, FinanceConfig>>(saved.finance || {});
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
  const [platform, setPlatformState] = useState<PlatformState>(() => {
    const base = emptyPlatform(DEFAULT_TENANTS);
    const sp = saved.platform;
    if (!sp) return base;
    // Tenants seeded in later releases join a saved list.
    // Saved seed tenants pick up later seed facts they never had (staggered go-live, AENR-589).
    const seeded = sp.tenants.map((t) => {
      const d = DEFAULT_TENANTS.find((x) => x.id === t.id);
      return d?.goLive && t.goLive === "2026-04-20" ? { ...t, goLive: d.goLive } : t;
    });
    return { ...base, ...sp, tenants: [...seeded, ...DEFAULT_TENANTS.filter((d) => !sp.tenants.some((t) => t.id === d.id))] };
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

  // Other windows of the app (e.g. the entrance display, AENR-519) share the
  // operational state: when one saves, the others adopt what changed. Only
  // differing slices are set, so windows don't echo each other's writes.
  const shared = { beachLayout, zoneLogos, zoneMap, priceRules, till, finance, beachPricing, closedStores, calendar, inventory, sunbedOps, bookingOps, payLinks, weather, display, layouts, extras, account, platform, comms, privacy };
  const sharedRef = useRef(shared);
  useEffect(() => { sharedRef.current = shared; });
  useEffect(() => {
    const setters: Record<keyof typeof shared, (v: never) => void> = {
      beachLayout: setBeachLayoutState, zoneLogos: setZoneLogosState, zoneMap: setZoneMap, priceRules: setPriceRules,
      till: setTillState, finance: setFinanceState, beachPricing: setBeachPricing, closedStores: setClosedStores,
      calendar: setCalendar, inventory: setInventoryState, sunbedOps: setSunbedOpsState, bookingOps: setBookingOpsState, payLinks: setPayLinksState,
      weather: setWeather, display: setDisplayState, layouts: setLayoutsState, extras: setExtrasState, account: setAccountState, platform: setPlatformState, comms: setCommsState, privacy: setPrivacyState,
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
  const updateStaff = useCallback((users: StaffUser[], action: string) => {
    setStaffUsers(users);
    setStaffAudit((a) => [{ at: new Date().toISOString(), by: "Manager / Admin", action }, ...a]);
  }, []);

  useEffect(() => {
    if (DISPLAY) return;
    // Guard the write: Safari Private Mode and a full quota throw on setItem.
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ persona, pageByPersona, signedIn, lang: langChoice ?? undefined, cart, consent, background, beachLayout, zoneLogos, passes, passPricing, loyalty, achievements, zoneMap, priceRules, channels, passCards, weather, dayTime, sceneFx, showPreviews, bookingNotes, staffUsers, staffMeId, staffAudit, viewAsId, crm, till, finance, beachPricing, closedStores, calendar, inventory, sunbedOps, bookingOps, payLinks, display, layouts, extras, account, platform, comms, privacy }));
    } catch {
      /* storage unavailable (private mode / quota) — ignore */
    }
  }, [persona, pageByPersona, signedIn, langChoice, cart, consent, background, beachLayout, zoneLogos, passes, passPricing, loyalty, achievements, zoneMap, priceRules, channels, passCards, weather, dayTime, sceneFx, showPreviews, bookingNotes, staffUsers, staffMeId, staffAudit, viewAsId, crm, till, finance, beachPricing, closedStores, calendar, inventory, sunbedOps, bookingOps, payLinks, display, layouts, extras, account, platform, comms, privacy]);

  // Keep <html lang> in sync with the chosen language (a11y / SEO correctness).
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang] || "en";
  }, [lang]);

  // Mirror the active persona onto <html data-persona> so persona-scoped theming
  // can target it in CSS — e.g. the customer surface's translucent glass cards
  // (see index.css). An attribute on the root also reaches portaled surfaces.
  useEffect(() => {
    document.documentElement.dataset.persona = persona;
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
  const setPage = useCallback((k: string) => setPageByPersona((s) => ({ ...s, [persona]: k })), [persona]);

  // ---- URL routing: mirror persona+page into the location hash. ----
  const firstRoute = useRef(true);
  useEffect(() => {
    if (DISPLAY) return;
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
      setPersona(r.persona);
      if (r.page) setPageByPersona((s) => ({ ...s, [r.persona as PersonaId]: r.page as string }));
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onPop);
    };
  }, []);

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
    setPersona(p);
    // Retired page keys still work (AENR-558/559): resolve them like a hash link.
    const page = k && resolvePage(p, k);
    if (page) setPageByPersona((s) => ({ ...s, [p]: page }));
    setHint(h ? { ...h, persona: p, page, ts: Date.now() } : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  // Cinematic entry into the booking wizard. The "reveal" is now the page
  // background itself: entering the "plan" page lifts the shoreline so the sand
  // sweeps up into view (see CustomerBackdrop) and the immersive flow mounts on
  // top — so this just navigates.
  const dive = useCallback(() => go("customer", "plan"), [go]);
  // RBAC "view as": show the app exactly as a staff user would see it — their
  // role's pages only — until the admin exits the preview.
  const viewAs = staffUsers.find((u) => u.id === viewAsId && u.status === "active") ?? null;
  const startViewAs = useCallback((id: string) => {
    const u = staffUsers.find((x) => x.id === id);
    if (!u || u.status !== "active") return;
    setViewAsId(id);
    go(u.roles[0], DEFAULT_PAGE[u.roles[0]]);
  }, [staffUsers, go]);
  // "Your roles" in the account menu (AENR-717): the same user, another of their
  // roles — lands on that role's start page. On the till, a role switch while a
  // shift is open hands the till to this person (they're signed in already).
  const switchRole = useCallback((userId: string, role: StaffRole) => {
    const u = staffUsers.find((x) => x.id === userId);
    if (!u || !hasRole(u, role)) return;
    if (!viewAsId) {
      setStaffMeId(userId);
      if (role === "cashier" || role === "support") setTill((t) => (t.shift ? { ...t, active: u.name } : t));
    }
    go(role, DEFAULT_PAGE[role]);
  }, [staffUsers, viewAsId, go, setTill]);
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
    () => ({ toast, go, dive, persona, page, signedIn, setSignedIn, lang, setLang, langAuto, setLangAuto, cart, addToCart, removeFromCart, clearCart, hint, clearHint, consent, setConsent, reopenConsent, background, setBackground, beachLayout, setZoneLayout, zoneLogos, setZoneLogo, passes, buyVipCredit, spendVipCredit, buySeasonPass, clearPass, passPricing, setPassPricing, loyalty, setLoyalty, achievements, setAchievements, zoneMap, setZoneMap, priceRules, setPriceRules, channels, setChannels, passCards, setPassCards, weather, setWeather, dayTime, setDayTime, sceneFx, setSceneFx, showPreviews, setShowPreviews, bookingNotes, addBookingNote, staffUsers, updateStaff, staffAudit, viewAs, startViewAs, exitViewAs, staffMeId, switchRole, crm, setCrm, till, setTill, finance, setFinance, beachPricing, setBeachPricing, closedStores, setClosedStores, calendar, setCalendar, inventory, setInventory, sunbedOps, setSunbedOps, bookingOps, setBookingOps, payLinks, setPayLinks, display, setDisplay, layouts, setLayouts, extras, setExtras, account, setAccount, platform, setPlatform, comms, setComms, privacy, setPrivacy }),
    [toast, go, dive, persona, page, signedIn, setSignedIn, lang, setLang, langAuto, setLangAuto, cart, addToCart, removeFromCart, clearCart, hint, clearHint, consent, setConsent, reopenConsent, background, setBackground, beachLayout, setZoneLayout, zoneLogos, setZoneLogo, passes, buyVipCredit, spendVipCredit, buySeasonPass, clearPass, passPricing, setPassPricing, loyalty, setLoyalty, achievements, setAchievements, zoneMap, setZoneMap, priceRules, setPriceRules, channels, setChannels, passCards, setPassCards, weather, setWeather, dayTime, setDayTime, sceneFx, setSceneFx, showPreviews, setShowPreviews, bookingNotes, addBookingNote, staffUsers, updateStaff, staffAudit, viewAs, startViewAs, exitViewAs, staffMeId, switchRole, crm, setCrm, till, setTill, finance, setFinance, beachPricing, setBeachPricing, closedStores, setClosedStores, calendar, setCalendar, inventory, setInventory, sunbedOps, setSunbedOps, bookingOps, setBookingOps, payLinks, setPayLinks, display, setDisplay, layouts, setLayouts, extras, setExtras, account, setAccount, platform, setPlatform, comms, setComms, privacy, setPrivacy],
  );

  // The booking wizard takes over the whole viewport: the beach becomes the
  // tappable surface, so the standing chrome (tenant logo, bottom tab bar) steps
  // aside and the backdrop lifts its shoreline.
  const immersive = persona === "customer" && page === "plan";
  const guard = useMemo(() => ({ viewAs: !!platform.viewAs && persona !== "platform", readOnly: platform.viewAs?.scope === "read" }), [platform.viewAs, persona]);

  if (DISPLAY)
    return (
      <AppCtx.Provider value={ctx}>
        <Suspense fallback={<div className="min-h-dvh bg-navy-900" />}>
          <LiveDisplay />
        </Suspense>
      </AppCtx.Provider>
    );

  return (
    <AppCtx.Provider value={ctx}>
      {!signedIn ? (
        <AuthGate />
      ) : (
        <div className="w-full px-3 sm:px-5 pt-4 relative min-h-dvh flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-1">
          {persona === "customer" && <CustomerBackdrop immersive={immersive} />}
          {persona === "customer" && !immersive && (
            <button
              onClick={() => go("customer", "home")}
              aria-label="Go to home"
              // Phones: a compact logo beside the icon bar, so content starts high (AENR-649);
              // desktop keeps the large logo on Home only.
              className={`flex max-md:justify-start md:justify-center items-center max-md:-mt-[54px] max-md:h-12 relative z-10 md:pt-1 md:pb-1 mb-2 sm:mb-4 w-fit md:w-full max-md:mr-auto group hover:opacity-90 active:opacity-75 transition-opacity`}
            >
              <GlideLogo spot="home" className={`w-auto max-md:h-9 ${page === "home" ? "md:h-[100px]" : "md:h-16"}`} />
            </button>
          )}
          {/* Booking wizard on desktop: the beach logo floats over the open sea, as on Home (AENR-671). */}
          {persona === "customer" && immersive && (
            <div className="hidden lg:flex fixed z-[15] top-[13vh] left-0 right-[min(460px,36vw)] justify-center pointer-events-none">
              <button onClick={() => go("customer", "home")} aria-label="Go to home" className="pointer-events-auto rounded-2xl hover:opacity-90 active:opacity-75 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <GlideLogo spot="wizard" className="h-[110px] w-auto drop-shadow-[0_2px_10px_rgba(0,40,80,0.25)]" />
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
          <ViewAsBanner />
          <PlatformJanitor />
          <CommsJanitor />
          {persona === "platform" && <TenantSwitcher />}
          <CommandPalette />
          {/* Routine decisions that run by themselves — refund policy, no-show release (AENR-623). */}
          <Automations />
          {persona !== "platform" && platform.siteTenant !== "akti" && (
            <div role="status" className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-slaice-600 text-white px-4 py-2 text-[13px]">
              <Icon.eye size={15} /> Previewing <b>{platform.tenants.find((x) => x.id === platform.siteTenant)?.name}</b>'s site and till
              <button type="button" onClick={() => setPlatformState((p) => ({ ...p, siteTenant: "akti" }))} className="ml-auto rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1 font-semibold">Back to Akti tou Iliou</button>
            </div>
          )}
          <TopBar persona={persona} setPersona={setPersona} page={page} setPage={setPage} previewing={!!viewAs} />
          {persona === "customer" ? (
            // flex-1 lets the content region grow so the SiteFooter is pushed to
            // the bottom of the viewport (the beach backdrop's green band)
            // instead of floating up under short pages.
            <div className="flex-1">
              <main className="min-w-0">{viewAs ? <AccessDenied user={viewAs} onHome={() => go(viewAs.roles[0], DEFAULT_PAGE[viewAs.roles[0]])} /> : routeFor(persona, page)}</main>
            </div>
          ) : (
            <div className="flex-1 flex gap-5 min-h-0">
              {persona !== "cashier" && <Sidebar persona={persona} page={page} setPage={setPage} />}
              {/* While Slaice staff view a tenant, the guard disables mutating / blocked controls (AENR-515). */}
              <GuardCtx.Provider value={guard}>
                <main className="flex-1 min-w-0">{persona === "cashier" && <TillTabs persona={persona} page={page} setPage={setPage} />}{persona === "cashier" && !viewAs && <OfflineBanner />}{viewAs && !hasRole(viewAs, persona) ? <AccessDenied user={viewAs} onHome={() => go(viewAs.roles[0], DEFAULT_PAGE[viewAs.roles[0]])} /> : routeFor(persona, page)}</main>
              </GuardCtx.Provider>
            </div>
          )}
          {/* The tenant badge bows out once the guest dives into the booking
              wizard, so the beach + zones take over the screen. */}
          {!immersive && <SiteFooter />}
          {/* Bottom tab bar (mobile only) stays visible everywhere — including the
              immersive booking flow — so global navigation is always reachable. */}
          {persona !== "cashier" && <BottomTabBar persona={persona} page={page} setPage={setPage} />}
          {/* The "view as another persona" control lives in the bottom-right
              corner on the customer surface — a quiet demo affordance, opening
              upward, lifted clear of the mobile bottom tab bar. */}
          {persona === "customer" && !viewAs && (
            <div className="hidden md:block fixed right-5 z-40 bottom-4">
              <PersonaSwitcher persona={persona} setPersona={setPersona} variant="demo" side="top" />
            </div>
          )}
        </div>
      )}
      <ConsentBanner />
      <Toasts items={toasts} onDismiss={dismissToast} />
    </AppCtx.Provider>
  );
}

/* Shown while previewing a staff user who opens a page outside their role. */
function AccessDenied({ user, onHome }: { user: StaffUser; onHome: () => void }) {
  return (
    <div className="glass-card rounded-3xl p-8 max-w-lg mx-auto mt-6 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 grid place-items-center"><Icon.lock size={22} /></div>
      <h1 className="mt-3 font-display font-bold text-xl text-navy-900">Access denied</h1>
      <p className="mt-1 text-sm text-slate-600">{user.roles.length > 1 ? `None of ${user.name}'s roles (${rolesLabel(user)}) can` : `The ${roleLabel(user.roles[0])} role can't`} open this page.</p>
      <button type="button" onClick={onHome} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy-900 text-white px-4 py-2 text-sm font-semibold">Go to my start page</button>
    </div>
  );
}
