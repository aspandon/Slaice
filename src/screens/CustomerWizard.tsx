import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "../lib/useMediaQuery";
import { useTenantFeatures } from "../lib/useFeatures";
import { ADD_EXTRAS_LABEL, extrasPhrase, type ExtrasKind } from "../domain/features";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Icon } from "../lib/icons";
import type { IconRenderer } from "../lib/icons";
import { Btn, Badge, Stepper, Input, Field, DatePickerRow, Toggle, Modal, Sheet, type DayInfo } from "../components/ui";
import { prefersReducedMotion } from "../lib/motion";
import { gsap, Flip, motionOK, stashFlip, EASE, DUR } from "../lib/fx";
import { DURATION, EASING } from "../lib/motionTokens";
import { Sunbed, SunbedMark } from "../components/Beach";
import { SetTile, SetTileLegend, euro, tileGeometry, tilePosition } from "../components/SetTile";
import { ZONES, ZONE_BLOCKS, todayISO, chipLabel, forecastFor, WEATHER_DEMO } from "../data/beach";
import { addDays } from "../domain/period";
import { useClosure, useLiveSlots } from "../lib/useLiveSlots";
import { checkRestrictions, dateBlock, resolvePrice } from "../domain/pricing";
import { stopSellFor } from "../domain/inventory";
import type { CartItem, SunbedSlot } from "../domain/types";
import { useApp, useSpotlight, useT } from "../app/store";
import { localeFor } from "../app/i18n";
import { PARKING_PRICE } from "../domain/pricing";
import { useExtras } from "../lib/useExtras";
import { useSiteTerms } from "../lib/useEconomics";
import { partyLabel, serviceFees } from "../domain/account";
import { useSiteStatus } from "../lib/usePlatform";
import { Checkout } from "./Checkout";
import { bestSets } from "../domain/bestSets";
import { ZoomBox } from "../components/ZoomBox";
import { useDemoFlag } from "../lib/useDemoFlag";
import { useGuestScene } from "../lib/useGuestScene";

type People = Record<string, number>;
interface BedPick { id: string; price: number; zoneId: string }
type WizardZone = (typeof ZONES)[number];
type BeachPhase = "zones" | "sets";
/** Locker / parking can apply to every chosen day or a hand-picked subset. */
type DayScope = "all" | "some";
interface TicketBreakItem { k: string; n: number; t: { price: number; label: string; sub: string }; total: number }

/* Ticket categories, prices and lockers come from Admin › Beach, Availability &
   Pricing (Entry tickets / Lockers, AENR-529/530) — the same source as the
   till. One "set" = 1 umbrella + 2 sunbeds. */
type TicketInfo = Record<string, { price: number; label: string; sub: string }>;
export interface LockerChoice { id: string; name: string; price: number; avail: number | null }

// Four steps (AENR-673; AENR-612 had three): the day, then where you sit — so a missing set is
// always named — then who and pay. Locker and parking are one optional row on Pay, not steps.
const STEPS = [
  { id: "when",   label: "When",  icon: "calendar",    sub: "Pick your day" },
  { id: "beach",  label: "Where", icon: "umbrella",    sub: "Pick your zone and sets" },
  { id: "people", label: "Who",          icon: "group",       sub: "Tell us who's coming" },
  { id: "review", label: "Pay",          icon: "checkCircle", sub: "Check, add extras and pay" },
];
/** The extras section heading for what the beach sells (AENR-696). */
const EXTRAS_TITLE: Record<Exclude<ExtrasKind, "none">, string> = { both: "Locker and parking", locker: "Locker", parking: "Parking" };
/** Old deep links to the retired locker / parking steps open the extras on Pay. */
const EXTRA_STEPS = ["locker", "parking"];
const BEACH_IDX = STEPS.findIndex((s) => s.id === "beach");

type FlipStateT = ReturnType<typeof Flip.getState>;

/* ---- Sunbed pick feedback (C3) ----
   Selecting a set pops the umbrella open, ripples the sand around it, and arcs
   a price chip up into the running total, which pulses on arrival. Deselecting
   gives a small dip. Imperative one-shot DOM — nothing for React to track. */
function bedPickFx(el: HTMLElement, price: number, adding: boolean) {
  if (!motionOK()) return;
  if (!adding) {
    gsap.fromTo(el, { scale: 0.88 }, { scale: 1, duration: 0.3, ease: "power2.out" });
    return;
  }
  gsap.fromTo(el, { scale: 0.72 }, { scale: 1, duration: 0.55, ease: EASE.pop });
  const rip = document.createElement("span");
  rip.className = "absolute inset-0 rounded-full ring-2 ring-coral-500 pointer-events-none";
  el.appendChild(rip);
  gsap.fromTo(rip, { scale: 0.6, opacity: 0.9 }, { scale: 2.2, opacity: 0, duration: 0.7, ease: "power1.out", onComplete: () => rip.remove() });

  const totalEl = document.querySelector<HTMLElement>("[data-wizard-total]");
  if (!totalEl) return;
  const a = el.getBoundingClientRect();
  const b = totalEl.getBoundingClientRect();
  const chip = document.createElement("div");
  chip.className = "fixed z-[60] pointer-events-none rounded-full bg-navy-900 text-white text-[12px] font-bold px-2.5 py-1 shadow-float tnum";
  chip.textContent = `+€${price}`;
  chip.style.left = `${a.left + a.width / 2}px`;
  chip.style.top = `${a.top + a.height * 0.2}px`;
  document.body.appendChild(chip);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height * 0.2);
  gsap.timeline({ onComplete: () => chip.remove() })
    .fromTo(chip, { xPercent: -50, yPercent: -50, scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: "power2.out" })
    // Arc up and over to the total (the chip rises before it travels).
    .to(chip, {
      motionPath: { path: [{ x: 0, y: 0 }, { x: dx * 0.45, y: Math.min(dy * 0.4, -70) }, { x: dx, y: dy }], curviness: 1.3 },
      duration: 0.7,
      ease: "power2.inOut",
    }, 0.06)
    .to(chip, { scale: 0.35, opacity: 0, duration: 0.18, ease: "power2.in" }, "-=0.14")
    .fromTo(totalEl, { scale: 1 }, { scale: 1.07, duration: 0.13, yoyo: true, repeat: 1, ease: "power1.inOut", transformOrigin: "left center" }, "-=0.25");
}

/* ---- Zone fly-out snapshots (C1) ----
   When a zone cluster is tapped, the overview unmounts immediately so the
   picked zone's umbrellas can FLIP into the full grid. The *other* clusters
   (and the picked one's name label) would vanish abruptly — so they're cloned
   at their viewport rects into a throwaway fixed layer and drift away from the
   picked zone while fading. Pure snapshots: no reflow, no React. */
function cloneFadeClusters(pickedId: string) {
  const layer = document.createElement("div");
  layer.className = "fixed inset-0 z-10 pointer-events-none";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  const picked = document.querySelector<HTMLElement>(`[data-cluster="${pickedId}"]`);
  const pr = picked?.getBoundingClientRect();
  const pcx = pr ? pr.left + pr.width / 2 : window.innerWidth / 2;
  document.querySelectorAll<HTMLElement>("[data-cluster]").forEach((el) => {
    const isPicked = el.dataset.cluster === pickedId;
    // The picked cluster's beds continue as the big grid — only its label fades.
    const src = isPicked ? el.querySelector<HTMLElement>("[data-cluster-label]") : el;
    if (!src) return;
    const r = src.getBoundingClientRect();
    const node = src.cloneNode(true) as HTMLElement;
    node.style.cssText += `;position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;`;
    layer.appendChild(node);
    const drift = isPicked ? 0 : (r.left + r.width / 2 - pcx) * 0.14;
    gsap.to(node, { opacity: 0, scale: isPicked ? 1 : 0.9, x: drift, duration: isPicked ? 0.25 : 0.45, ease: "power2.in" });
  });
  gsap.delayedCall(0.6, () => layer.remove());
}

/* Smoothly tween a numeric value whenever it changes — used by the live total so
   the user sees the balance move when toggling a service. */
function useAnimatedNumber(value: number, duration = 480) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (prefersReducedMotion()) { setDisplay(value); prev.current = value; return; }
    const from = prev.current;
    const to = value;
    if (from === to) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else { setDisplay(to); prev.current = to; }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

/* ============================================================================
   Immersive booking wizard.

   The beach IS the page: zones, then the chosen zone's umbrella sets, are tapped
   directly on the sand (the page backdrop, whose shoreline lifts on entry — see
   CustomerBackdrop). A floating glass menu over the sea carries the dates, step
   forms, running total and Back/Continue. After the Beach step the sand keeps
   showing the picks, read-only, while later steps run in the menu.
   ============================================================================ */
/* The wizard, unless the tenant isn't taking bookings (suspended / paused / closed, AENR-518). */
export function CustomerWizard() {
  const site = useSiteStatus();
  const { go } = useApp();
  if (site.blockOnline)
    return (
      <div className="grid place-items-center min-h-[60dvh] px-3">
        <div role="alert" className="glass-card rounded-2xl p-8 max-w-md text-center">
          <span className="mx-auto w-12 h-12 rounded-xl bg-amber-100 text-amber-700 grid place-items-center"><Icon.clock size={22} /></span>
          <h1 className="mt-3 font-display font-bold text-guest-head text-navy-900">{site.tenant?.name}</h1>
          <p className="mt-1 text-guest-body text-slate-600">{site.message}</p>
          <p className="mt-1 text-guest-meta text-slate-500">Bookings you already have stay valid — show your QR at the entrance.</p>
          <Btn variant="teal" className="mt-4" icon={Icon.grid} onClick={() => go("customer", "mybookings")}>My bookings</Btn>
        </div>
      </div>
    );
  return <WizardInner />;
}

function WizardInner() {
  const tr = useT();
  const { go, toast, addToCart, removeFromCart, hint, lang, beachPricing, priceRules, calendar, inventory, account, setAccount } = useApp();
  const { weather, live: sceneLive } = useGuestScene(); // AENR-737: off → a sunny forecast every day
  const [newGuest] = useDemoFlag("newGuest"); // Demo › first-time guest (AENR-702)
  useSpotlight("customer", "plan");
  const liveSlots = useLiveSlots();
  // Lockers / parking only when the beach has the module (AENR-696) — the Pay row, the usual and the basket.
  const { module } = useTenantFeatures();
  const canLocker = module("Day Locker");
  const canParking = module("Parking");
  const extrasKind = extrasPhrase(canLocker, canParking);

  // "Book again" (AENR-611): the guest's usual — zone, sets, party, locker / parking — on the
  // next day it is free, worked out once when the wizard opens and shown on Pay.
  const [plan] = useState(() => {
    const u = hint?.persona === "customer" && hint.page === "plan" ? hint.rebook : undefined;
    const z = u && ZONES.find((x) => x.name === u.zone || x.id === u.zone);
    if (!u || !z) return null;
    const time = new Date().toTimeString().slice(0, 5);
    // AENR-705: Home already checked the proposed day free — start there (it re-checks, in case it changed).
    const start = u.date && u.date >= todayISO() ? u.date : todayISO();
    for (let i = 0; i < 21; i++) {
      const iso = addDays(start, i);
      if (dateBlock(z.id, iso, calendar.restrictions, todayISO(), time) || stopSellFor(inventory, z.id, [iso])) continue;
      const free = liveSlots(z, [iso]).filter((x) => x.state === "a");
      if (free.length < u.sets) continue;
      // The sets they had before when they're free (most-booked first), then the next free ones.
      const fav = u.setIds.flatMap((id) => free.filter((x) => x.id === id));
      const picks = [...fav, ...free.filter((x) => !u.setIds.includes(x.id))].slice(0, u.sets);
      return { zoneId: z.id, date: iso, picks: picks.map((x): BedPick => ({ id: x.id, price: x.price, zoneId: z.id })), lockers: u.lockers, parking: u.parking, party: u.party };
    }
    return null;
  });

  // Deep-link: a Home tile can open the wizard straight at a given step.
  const hintStep = hint && hint.persona === "customer" && hint.page === "plan" ? hint.step : undefined;
  const initialStep = useMemo(() => {
    if (plan) return STEPS.findIndex((s) => s.id === "review");
    // A zone already open (deep link or the usual) starts on Where; the day is set.
    if (hintStep === "beach") return BEACH_IDX;
    if (hintStep) {
      const i = STEPS.findIndex((s) => s.id === (EXTRA_STEPS.includes(hintStep) ? "review" : hintStep));
      if (i >= 0) return i;
    }
    return 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // "Add a locker or parking" on Pay — closed until asked for (or deep-linked).
  const [extrasOpen, setExtrasOpen] = useState(() => !!hintStep && EXTRA_STEPS.includes(hintStep));
  const extrasRef = useRef<HTMLElement>(null);
  // Bring the locker / parking pickers into view when they open.
  useEffect(() => {
    if (extrasOpen) extrasRef.current?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [extrasOpen]);

  const [stepIdx, setStepIdx] = useState(initialStep);
  // Who starts with as many tickets as the chosen sets seat — 2 per set (AENR-712); "Your usual"
  // (AENR-613) is one tap away. A one-tap rebook of the usual keeps that party.
  const [people, setPeople] = useState<People>(() => (plan ? plan.party ?? account.party ?? { adult: plan.picks.length * 2, resident: 0, child: 0, senior: 0 } : { adult: 0, resident: 0, child: 0, senior: 0 }));
  const [includeTickets, setIncludeTickets] = useState(true);
  // Track whether the guest has hand-edited the headcount. Until they do, we
  // pre-fill it from the chosen sets (2 entry tickets per set — see below).
  const [peopleTouched, setPeopleTouched] = useState(!!plan);
  const [selDates, setSelDates] = useState([plan?.date ?? todayISO()]);
  const [multiDate, setMultiDate] = useState(false);
  const [zoneId, setZoneId] = useState(plan?.zoneId ?? "central");
  // Explicit umbrella-set picks — the single source of truth for sunbeds
  // (zone-scoped; cleared when the zone changes).
  const [bedSel, setBedSel] = useState<BedPick[]>(plan?.picks ?? []);
  // Opt-in: combine sets from several zones in one booking (AENR-524).
  const [multiStore, setMultiStore] = useState(false);
  const multiStoreRef = useRef(false);
  useEffect(() => { multiStoreRef.current = multiStore; }, [multiStore]);
  const [lockerOn, setLockerOn] = useState(!!plan?.lockers);
  const [lockerQty, setLockerQty] = useState(plan?.lockers || 1);
  const [lockerScope, setLockerScope] = useState<DayScope>("all");
  const [lockerDays, setLockerDays] = useState<string[]>([]);
  const [lockerBank, setLockerBank] = useState("A");
  const [parkingOn, setParkingOn] = useState(!!plan?.parking);
  const [parkingQty, setParkingQty] = useState(plan?.parking || 1);
  const [parkingScope, setParkingScope] = useState<DayScope>("all");
  const [parkingDays, setParkingDays] = useState<string[]>([]);
  // Vehicle plate per ISO date (multi-day trips can use a different plate each
  // day) — used while booking a single spot.
  const [plates, setPlates] = useState<Record<string, string>>({});
  // Booking several spots = several cars: one plate per spot, all days.
  const [spotPlates, setSpotPlates] = useState<string[]>([]);
  // Most guests park the same car all week — default to one shared plate.
  const [parkingSamePlate, setParkingSamePlate] = useState(true);
  // Within the Beach step: choosing a zone vs. tapping its sets.
  const [phase, setPhase] = useState<BeachPhase>(plan ? "sets" : "zones");
  // Desktop overview = clusters on open sand (FLIP-zoomable); phones = cards.
  const richOverview = useMediaQuery("(min-width: 768px) and (min-height: 560px)");
  // Camera-zoom plumbing: the captured FLIP state riding across the phase
  // switch, whether the next zones-mount should enter via FLIP (vs the usual
  // stagger), and a guard against re-entrant taps mid-transition.
  const flipRef = useRef<FlipStateT | null>(null);
  const flipBackRef = useRef(false);
  const zoomingRef = useRef(false);

  const ex = useExtras();
  const firstDay = selDates[0] ?? todayISO();
  const TICKET: TicketInfo = Object.fromEntries(ex.tickets.map((t) => [t.id, { price: ex.ticketPrice(t.id, firstDay), label: t.name, sub: t.note ?? "" }]));
  const totalPeople = ex.tickets.reduce((a, t) => a + (people[t.id] ?? 0), 0);
  const dayCount = selDates.length;
  const zone = ZONES.find((z) => z.id === zoneId) || ZONES[0];

  // Bed IDs are zone-scoped — switching zone clears any picked beds.
  // …unless the guest opted into several zones, then picks are kept per zone.
  const shownZone = useRef(zoneId);
  useEffect(() => {
    if (shownZone.current === zoneId) return; // not on mount — "Book again" opens with its sets picked
    shownZone.current = zoneId;
    if (!multiStoreRef.current) setBedSel([]);
  }, [zoneId]);

  // A set seats two, so default the headcount to 2 entry tickets per chosen set.
  // We stop auto-filling the moment the guest adjusts the numbers themselves.
  useEffect(() => {
    if (peopleTouched) return;
    setPeople({ adult: bedSel.length * 2, resident: 0, child: 0, senior: 0 });
  }, [bedSel.length, peopleTouched]);

  // Keep the per-service day picks within the chosen trip dates.
  useEffect(() => {
    const set = new Set(selDates);
    setLockerDays((d) => d.filter((x) => set.has(x)));
    setParkingDays((d) => d.filter((x) => set.has(x)));
  }, [selDates]);
  // The days each service actually covers: all chosen days, or a subset (multi-day).
  const lockerDates = lockerOn && canLocker ? (multiDate && lockerScope === "some" ? lockerDays : selDates) : [];
  const parkingDates = parkingOn && canParking ? (multiDate && parkingScope === "some" ? parkingDays : selDates) : [];

  // The admin-authored layout for this zone, if any — otherwise the default grid.
  // …with the live status for the chosen dates applied: sets sold at the till
  // or held in a till basket aren't bookable online (AENR-520).
  const slots = useMemo(() => liveSlots(zone, selDates), [liveSlots, zone, selDates]);
  const selectedIds = useMemo(() => new Set(bedSel.filter((b) => b.zoneId === zone.id).map((b) => b.id)), [bedSel, zone.id]);
  // Live sets of every zone with a pick — prices and the stale check before checkout.
  const pickZones = useMemo(() => [...new Set(bedSel.map((b) => b.zoneId))], [bedSel]);
  const pickSlots = useMemo(() => Object.fromEntries(pickZones.map((zid) => [zid, liveSlots(ZONES.find((z) => z.id === zid) ?? zone, selDates)])), [pickZones, liveSlots, selDates, zone]);
  const stalePicks = bedSel.filter((b) => pickSlots[b.zoneId]?.find((x) => x.id === b.id)?.state !== "a");
  const avail = useMemo(() => slots.filter((s) => s.state === "a").length, [slots]);

  // Each day before choosing it (AENR-570): weather, price level and spots left —
  // for the chosen zone once inside it, for the whole beach on the zone overview.
  const scopeZones = phase === "sets" ? [zone] : ZONES;
  const minBase = useMemo(() => Math.min(...ZONES.map((z) => z.from)), []);
  const dayInfo = (iso: string): DayInfo => {
    const free = scopeZones.flatMap((z) => liveSlots(z, [iso]).filter((x) => x.state === "a").map((x) => ({ x, z })));
    const prices = free.map(({ x, z }) => resolvePrice(x, z.id, iso, beachPricing, priceRules).price);
    const price = prices.length ? Math.min(...prices) : undefined;
    const fc = forecastFor(iso, todayISO(), weather, sceneLive);
    const ref = phase === "sets" ? zone.from : minBase;
    return { icon: WEATHER_DEMO[fc.kind].icon, temp: fc.tempC, price, level: price == null ? undefined : price <= ref ? "low" : price >= ref * 1.25 ? "high" : "mid", left: free.length };
  };
  // A full day never ends the journey: nearest days with room, other zones that day, or a notification.
  const fullDay = !multiDate && selDates.length === 1 && dayInfo(selDates[0]).left === 0 ? selDates[0] : null;

  // Booking restrictions (AENR-511): closed days, booking window and same-day
  // cut-off disable a date; minimum / maximum stay rules block Continue.
  const nowTime = new Date().toTimeString().slice(0, 5);
  const today = todayISO();
  const blockReason = (iso: string) => dateBlock(zone.id, iso, calendar.restrictions, today, nowTime);
  const stayCheck = checkRestrictions(zone.id, selDates, calendar.restrictions, today, nowTime);
  // Stop-sell (AENR-512): the zone isn't sold online on these dates.
  const stopSell = stopSellFor(inventory, zone.id, selDates);
  // Each chosen day is priced on its own (categories, seasonal rules, date
  // overrides) and with the booking context (early-bird, last-minute, multi-day).
  const ctx = { bookedOn: today, time: nowTime, stayDays: selDates.length };
  const bedPrice = (b: BedPick, iso: string, withCtx = true) => { const s = (pickSlots[b.zoneId] ?? slots).find((x) => x.id === b.id); return s ? resolvePrice(s, b.zoneId, iso, beachPricing, priceRules, withCtx ? ctx : undefined).price : 0; };
  const setSubtotal = bedSel.reduce((a, b) => a + selDates.reduce((x, iso) => x + bedPrice(b, iso), 0), 0);
  // Switched-off categories drop out; each day is priced on its own (weekday / weekend, periods).
  const ticketBreak = ex.tickets.map((tc) => { const n = people[tc.id] ?? 0; return { k: tc.id, n, t: TICKET[tc.id], total: selDates.reduce((a, iso) => a + n * ex.ticketPrice(tc.id, iso), 0) }; });
  const ticketSubtotal = includeTickets ? ticketBreak.reduce((a, b) => a + b.total, 0) : 0;
  // Lockers: the chosen bank's price per day; availability from the locker provider (AENR-530).
  const lockerDaysForAvail = lockerOn ? lockerDates : selDates;
  const bankAvail = (id: string) => { const v = lockerDaysForAvail.map((d) => ex.lockerAvail(id, d)); return v.some((x) => x === null) ? null : Math.min(...(v as number[])); };
  const lockerChoices: LockerChoice[] = ex.banks.map((b) => ({ id: b.id, name: b.name, price: ex.lockerPrice(b.id, firstDay), avail: bankAvail(b.id) }));
  const lockerSubtotal = lockerDates.reduce((a, iso) => a + lockerQty * ex.lockerPrice(lockerBank, iso), 0);
  const parkingSubtotal = parkingQty * PARKING_PRICE * parkingDates.length;
  const grandTotal = setSubtotal + ticketSubtotal + lockerSubtotal + parkingSubtotal;

  const step = STEPS[stepIdx];
  const last = STEPS.length - 1;

  // Tap a zone → the camera dives in: its umbrellas FLIP from the cluster into
  // the full pick grid while the other zones drift away (desktop only; the
  // phone card list keeps the instant swap).
  const pickZone = (id: string) => {
    if (zoomingRef.current) return;
    if (richOverview && motionOK() && phase === "zones") {
      flipRef.current = Flip.getState(`[data-cluster="${id}"] [data-flip-id]`);
      cloneFadeClusters(id);
      zoomingRef.current = true;
    }
    flipBackRef.current = false;
    setZoneId(id);
    // The guest picks their own sets (owner, AENR-732) — opening a zone no longer pre-selects any;
    // "Pick for me" stays as an explicit choice.
    setPhase("sets");
  };
  // Reverse camera: the big grid FLIPs back down into its cluster on the map.
  const backToZones = () => {
    if (zoomingRef.current) return;
    if (richOverview && motionOK()) {
      flipRef.current = Flip.getState("[data-bed-cell]");
      flipBackRef.current = true;
      zoomingRef.current = true;
    }
    setPhase("zones");
  };
  // Runs right after the phase switch renders the destination layout: animate
  // the matched sunbeds from their captured rects (zoom in and zoom out). The
  // flip itself is deferred one frame — the destination grids measure their
  // box in a layout effect and re-render synchronously, so by the rAF the
  // cells sit at their final size/positions (and nothing has painted yet).
  useLayoutEffect(() => {
    const state = flipRef.current;
    if (!state) return;
    flipRef.current = null;
    const zoomIn = phase === "sets";
    const targets = zoomIn ? "[data-bed-cell]" : `[data-cluster="${zoneId}"] [data-flip-id]`;
    gsap.set(targets, { opacity: 0 }); // belt-and-braces against a stray pre-flip paint
    const raf = requestAnimationFrame(() => {
      gsap.set(targets, { opacity: 1 });
      Flip.from(state, {
        targets,
        scale: true,
        duration: zoomIn ? 0.9 : 0.75,
        ease: EASE.inOut,
        stagger: zoomIn ? { each: 0.0045, from: "center" } : 0,
        onComplete: () => { zoomingRef.current = false; },
      });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flip reads refs + DOM
  }, [phase]);
  const [announce, setAnnounce] = useState("");
  const [sheetPref, setSheetPref] = useState<Record<string, boolean>>({});
  const toggleBed = (slot: SunbedSlot, el?: HTMLElement | null) => {
    const adding = !bedSel.find((b) => b.id === slot.id);
    setBedSel((s) => (adding ? [...s, { id: slot.id, price: slot.price, zoneId: zone.id }] : s.filter((b) => b.id !== slot.id)));
    setAuto((a) => (a && !a.edited ? { ...a, edited: true } : a));
    if (el) bedPickFx(el, slot.price, adding);
    const n = bedSel.length + (adding ? 1 : -1);
    setAnnounce(`${slot.id} ${adding ? tr("selected") : tr("removed")}, €${slot.price}. ${n} ${n === 1 ? tr("set") : tr("sets")} ${tr("picked")}.`);
  };
  // Tapping a set opens its spot sheet first (AENR-568); Select there picks it.
  const [inspect, setInspect] = useState<{ slot: SunbedSlot; el: HTMLElement | null } | null>(null);
  const tierOfZone = useMemo(() => tierInfo(slots), [slots]);

  // "Choose for me" (AENR-641): opening a zone lands on the best free sets for the
  // party (two guests a set) — side by side, cheapest, nearest the sea — the way an
  // airline app assigns seats. Tapping a set swaps it; the pick follows the party
  // size until the guest edits it by hand.
  const usualSize = account.party && !newGuest ? Object.values(account.party).reduce((a, b) => a + b, 0) : 2;
  const wantSets = Math.max(1, Math.ceil((peopleTouched ? totalPeople : usualSize) / 2));
  const [auto, setAuto] = useState<{ zoneId: string; ids: string[]; together: boolean; rowIdx: number; edited: boolean } | null>(null);
  const autoPick = (id: string, n = wantSets, onlyRow?: number, replace = false) => {
    const z = ZONES.find((x) => x.id === id);
    if (!z || (!replace && bedSel.some((b) => b.zoneId === id))) return; // the guest's own picks stay
    const all = liveSlots(z, selDates);
    const pick = bestSets(all.filter((x) => x.state === "a"), all, n, onlyRow);
    if (!pick) return;
    const price = new Map(all.map((x) => [x.id, x.price]));
    const picks = pick.ids.map((sid) => ({ id: sid, price: price.get(sid) ?? 0, zoneId: id }));
    shownZone.current = id; // the zone-switch effect must not wipe this pick
    setBedSel((s) => (multiStoreRef.current ? [...s.filter((b) => b.zoneId !== id), ...picks] : picks));
    setAuto({ zoneId: id, ids: pick.ids, together: pick.together, rowIdx: pick.rowIdx, edited: false });
    setAnnounce(`${tr("Picked for you")}: ${pick.ids.join(", ")}, €${pick.total}.`);
  };
  const autoIntact = !!auto && !auto.edited && auto.ids.every((id) => bedSel.some((b) => b.id === id)) && bedSel.filter((b) => b.zoneId === auto.zoneId).length === auto.ids.length;
  const lastWant = useRef(wantSets);
  useEffect(() => {
    if (lastWant.current === wantSets) return;
    lastWant.current = wantSets;
    if (auto && autoIntact) autoPick(auto.zoneId, wantSets, undefined, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-pick only when the party size changes
  }, [wantSets]);
  const autoNote = useMemo(() => {
    if (!auto || !autoIntact || auto.zoneId !== zone.id) return null;
    const picked = slots.filter((x) => auto.ids.includes(x.id));
    const total = picked.reduce((a, x) => a + x.price, 0);
    const n = picked.length;
    const rowName = picked[0] ? tierOfZone(picked[0]).tier.name : TIERS[1].name;
    const head = n === 1 ? tr("1 set") : `${n} ${tr("sets")} ${auto.together ? tr("together") : tr("— none free side by side")}`;
    const text = `${head} · ${tr(rowName)} · €${total}${dayCount > 1 ? ` ${tr("a day")}` : ""}`;
    let upgrade: { label: string; onClick: () => void } | undefined;
    if (auto.rowIdx > 0) {
      const front = bestSets(slots.filter((x) => x.state === "a"), slots, n, 0);
      if (front) upgrade = { label: `${tr("Front row instead")} (+€${front.total - total})`, onClick: () => autoPick(zone.id, n, 0, true) };
    }
    return { text, upgrade };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- autoPick is a plain closure
  }, [auto, autoIntact, zone.id, slots, tierOfZone, dayCount, tr]);
  // Any manual change to the headcount flips off the auto pre-fill for the rest
  // of the session, so the guest's numbers are never overwritten.
  const editPeople = (v: SetStateAction<People>) => { setPeopleTouched(true); setPeople(v); };

  // Where with no set picked never moves on silently (AENR-673): Continue says what is
  // missing and offers entry tickets only instead.
  const [noSet, setNoSet] = useState(false);
  const [leaveAsk, setLeaveAsk] = useState(false);
  // Which way the guest is moving through the flow (AENR-748): forward (and from
  // zones into a zone's sets) slides the next step in from the right, back from
  // the left. Derived while rendering — the previous position lives in state.
  const flowPos = stepIdx * 2 + (step.id === "beach" && phase === "sets" ? 1 : 0);
  const [lastPos, setLastPos] = useState(flowPos);
  const [stepDir, setStepDir] = useState<1 | -1>(1);
  if (flowPos !== lastPos) {
    setLastPos(flowPos);
    setStepDir(flowPos > lastPos ? 1 : -1);
  }
  /** Leave the flow — asking first when sets are picked (AENR-752). */
  const leave = () => (bedSel.length > 0 ? setLeaveAsk(true) : go("customer", "home"));
  // With a zone open and nothing picked, the main button reads "Pick for me" (AENR-747)
  // while the zone has a free set; with none free, Continue explains (AENR-673).
  const guidePick = step.id === "beach" && phase === "sets" && bedSel.length === 0 && !stopSell && slots.some((x) => x.state === "a");
  const next = () => {
    if (step.id === "beach" && bedSel.length === 0) { setNoSet(true); return; }
    setNoSet(false);
    setStepIdx((i) => Math.min(last, i + 1));
  };
  const entryOnly = () => { setNoSet(false); setIncludeTickets(true); setStepIdx(BEACH_IDX + 1); };
  // Back walks the flow in reverse: sets → zones → When → out to Home.
  const back = () => {
    setNoSet(false);
    if (step.id === "beach" && phase === "sets") { backToZones(); return; }
    if (stepIdx === 0) { leave(); return; }
    setStepIdx((i) => Math.max(0, i - 1));
  };

  // The basket lines this plan becomes — one per set, ticket kind, locker and spot per day.
  const buildItems = (): CartItem[] => {
    const items: CartItem[] = [];
    const subOf = (iso: string) => chipLabel(iso, localeFor(lang)).sub;
    // Sunbeds + tickets cover every chosen day.
    selDates.forEach((iso) => {
      const sub = subOf(iso);
      bedSel.forEach((b) => {
        const bz = ZONES.find((z) => z.id === b.zoneId) ?? zone;
        items.push({ kind: "sunbed", id: `${b.id}@${iso}`, label: `${tr("Sunbed")} ${b.id}`, sub: `${bz.name} · ${sub}`, price: bedPrice(b, iso), setId: b.id, zoneId: bz.id, date: iso });
      });
      if (includeTickets) {
        ticketBreak.forEach(({ k, n, t }) => {
          if (n > 0) {
            items.push({ kind: "ticket", id: `${k}@${iso}`, label: `${tr(t.label)} × ${n}`, sub: `${tr("Entry ticket")} · ${sub}`, price: n * ex.ticketPrice(k, iso), qty: n, date: iso });
              }
        });
      }
    });
    // Lockers + parking cover only the days the guest chose for them.
    lockerDates.forEach((iso) => {
      const sub = subOf(iso);
      for (let i = 0; i < lockerQty; i++) {
        items.push({ kind: "locker", id: `LK-${lockerBank}${i + 1}@${iso}`, label: `${tr("Day locker")} ${i + 1}`, sub: `${ex.banks.find((b) => b.id === lockerBank)?.name ?? ""} · ${sub}`, price: ex.lockerPrice(lockerBank, iso) });
      }
    });
    // One cart line per spot per day; the plate comes from the per-spot list
    // (several cars) or the per-day map (single spot, possibly varying plate).
    parkingDates.forEach((iso) => {
      for (let i = 0; i < parkingQty; i++) {
        const plate = (parkingQty > 1 ? spotPlates[i] : plates[iso]) || "—";
        items.push({
          kind: "parking",
          id: `P${i + 1}@${iso}`,
          label: parkingQty > 1 ? `${tr("Parking spot")} ${i + 1}` : tr("Parking spot"),
          sub: `${plate} · ${subOf(iso)}`,
          price: PARKING_PRICE,
        });
      }
    });
    return items;
  };
  // All-in total (AENR-569 / 725): the beach prices plus the guest's service fee from the tenant's
  // commercial terms — the same function and sum checkout charges.
  const terms = useSiteTerms();
  const feeTotal = grandTotal > 0 ? serviceFees(buildItems(), terms).total : 0;
  const allIn = Math.round((grandTotal + feeTotal) * 100) / 100;
  // The footer grows step by step (owner, AENR-733): Where shows the sets only, Who adds the entry
  // tickets, and Pay shows the all-in total with the service fee and any locker / parking.
  const stepTotal = step.id === "beach" ? setSubtotal : step.id === "people" ? setSubtotal + ticketSubtotal : allIn;
  const stepFee = step.id === "beach" || step.id === "people" ? 0 : feeTotal;

  // The Pay step pays (AENR-640): this visit's items are kept in the basket while the guest is on
  // Pay (replacing the ones from an earlier pass), and the checkout panel below takes the payment.
  const wizKeys = useRef<{ kind: CartItem["kind"]; id: string }[]>([]);
  const payItems = step.id === "review" && !stalePicks.length && grandTotal > 0 ? buildItems() : null;
  const payKey = payItems ? JSON.stringify(payItems.map((i) => [i.kind, i.id, i.price])) : "";
  useEffect(() => {
    if (!payItems) return;
    wizKeys.current.forEach((k) => removeFromCart(k.kind, k.id));
    payItems.forEach((it) => addToCart(it));
    wizKeys.current = payItems.map((i) => ({ kind: i.kind, id: i.id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- payKey captures the items
  }, [payKey]);
  const payRef = useRef<HTMLElement>(null);
  const confirm = () => {
    // A set taken or put on hold since it was picked must be replaced first (AENR-524 / 520).
    if (stalePicks.length) {
      toast(`${stalePicks.map((b) => b.id).join(", ")} ${tr("is no longer available — remove it and pick another set.")}`, { tone: "warn" });
      setStepIdx(BEACH_IDX);
      return;
    }
    const items = buildItems();
    items.forEach((it) => addToCart(it));
    // Remember who came (AENR-613) — next time the party is already filled in.
    if (totalPeople > 0) setAccount((a) => ({ ...a, party: Object.fromEntries(Object.entries(people).filter(([, n]) => n > 0)) }));
    const added = items.length;
    toast(`${tr("Booking ready")} — ${added} ${added !== 1 ? tr("items") : tr("item")} ${tr("added to your basket.")}`, { tone: "success" });
    // Hand the menu card's rect to Checkout so its summary panel morphs out of
    // it — the journey's last scene instead of a hard screen swap.
    stashFlip("checkout-panel", '[data-flip-id="checkout-panel"]');
    go("customer", "checkout");
  };

  // The sand carries the zone choices, then the sunbed sets. After the Beach
  // step it stays alive: your picked sets remain on the sand (read-only) and
  // each later step adds its vignette — towels for the guests, the locker
  // cabin, your car at the parking pad — so the booking visibly builds up.
  // When shows the whole beach behind the day picker; tapping a zone there goes straight to Where.
  const showZones = step.id === "when" || (step.id === "beach" && phase === "zones");
  const showSets = step.id === "beach" && phase === "sets";
  const showScene = step.id !== "beach" && step.id !== "when" && bedSel.length > 0;
  // The zone shown behind Who and Pay: where the last set was picked (AENR-670).
  const sceneZone = ZONES.find((z) => z.id === bedSel[bedSel.length - 1]?.zoneId) ?? zone;
  const sceneSlots = sceneZone.id === zone.id ? slots : liveSlots(sceneZone, selDates);
  const sceneIds = new Set(bedSel.filter((b) => b.zoneId === sceneZone.id).map((b) => b.id));
  const pickedByZone = bedSel.reduce<Record<string, number>>((m, b) => ({ ...m, [b.zoneId]: (m[b.zoneId] ?? 0) + 1 }), {});
  const revealDelay = prefersReducedMotion() ? "0ms" : "420ms";
  // Below 1024px the panel is a bottom sheet over the beach (AENR-660): on the beach
  // step it starts lowered (total + Continue) so the sand is the screen; the form
  // steps start raised. The guest's own choice per step wins.
  const sheetKey = `${step.id}-${phase}`;
  // Zones are now chosen on the beach panorama (AENR-760), so the sheet starts lowered on
  // Where too; raising it still shows the zone list.
  const sheetOpen = sheetPref[sheetKey] ?? step.id !== "beach";
  const setSheetOpen = (v: boolean) => setSheetPref((m) => ({ ...m, [sheetKey]: v }));
  const swipe = useRef<number | null>(null);
  const sheetHide = sheetOpen ? "" : "max-lg:hidden";

  return (
    <div className="fixed inset-0 z-20 flex flex-col pointer-events-none select-none pt-[72px] md:pt-0">
      {/* ============ Menu over the sea (top) ============
           When picking sunbeds, the min-height holds the menu band down to ~the
           shoreline so the sets always start on the sand (never the sea). The
           zone overview gives the menu band less reserved height so the
           clusters get more room to spread. */}
      {/* Desktop (≥1024px): a sticky column on the right, the beach fills the rest.
          Smaller screens: a bottom sheet the guest raises or lowers (AENR-660). */}
      <div className="absolute z-10 inset-x-0 bottom-0 lg:inset-x-auto lg:right-0 lg:top-[68px] lg:bottom-0 lg:w-[min(460px,36vw)] lg:px-4 lg:pb-4 flex items-end lg:items-start justify-center">
        <div className="pointer-events-auto w-full max-w-2xl glass-card rounded-t-3xl lg:rounded-3xl shadow-float flex flex-col max-h-[78vh] lg:max-h-full overflow-hidden animate-fade-down pb-safe lg:pb-0" data-flip-id="checkout-panel">
          {/* Sheet handle (phones/tablets): tap or swipe to raise / lower. */}
          <button
            type="button"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(!sheetOpen)}
            onPointerDown={(e) => { swipe.current = e.clientY; }}
            onPointerUp={(e) => { const y0 = swipe.current; swipe.current = null; if (y0 != null && Math.abs(e.clientY - y0) > 24) { e.preventDefault(); setSheetOpen(e.clientY < y0); } }}
            className="lg:hidden shrink-0 w-full pt-2 pb-1 flex flex-col items-center gap-1 touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 rounded-t-3xl"
          >
            <span aria-hidden className="w-10 h-1.5 rounded-full bg-slate-300" />
            {sheetOpen ? (
              <span className="sr-only">{tr("Lower the panel to see the beach")}</span>
            ) : (
              <span className="text-guest-caption font-semibold text-slate-600 inline-flex items-center gap-1">
                {step.id === "beach" && !richOverview && phase === "sets" ? `${zone.name} · ${bedSel.length ? `${bedSel.length} ${bedSel.length === 1 ? tr("set") : tr("sets")} · ` : ""}${tr("tap a set on the map")}` : step.id === "beach" ? `${selDates.length === 1 ? chipLabel(selDates[0], localeFor(lang)).sub : `${selDates.length} ${tr("days")}`} · ${phase === "sets" ? zone.name : tr("all zones")} · ${tr("Change")}` : `${tr("Step")} ${stepIdx + 1} ${tr("of")} ${STEPS.length} · ${tr(step.label)}`}
                <Icon.chevD size={13} className="rotate-180" />
              </span>
            )}
          </button>
          {/* Pinned header — leave, progress, (step title only on the form steps). */}
          <div className={`p-4 sm:p-5 pb-3 max-lg:pt-1 shrink-0 ${sheetHide}`}>
            <div className="flex items-center justify-between mb-3">
              <button onClick={leave} className="inline-flex items-center gap-1.5 text-guest-meta font-semibold text-slate-600 hover:text-navy-900 rounded-lg px-2 py-1 hover:bg-white/60 transition">
                <Icon.arrowL size={14} /> {tr("Leave")}
              </button>
              <div className="text-guest-caption font-semibold text-slate-500 tnum">{tr("Step")} {stepIdx + 1} {tr("of")} {STEPS.length} · <span className="text-navy-900">{tr(step.label)}</span></div>
            </div>

            <ProgressRail stepIdx={stepIdx} onJump={(i) => setStepIdx(i)} />
          </div>

          {/* Scrolling step body — a real scrollbar appears when a step (e.g.
              Review with many lines) overflows the panel. */}
          <div key={`${step.id}-${phase}`} className={`px-4 sm:px-5 pb-1 overflow-y-auto ${stepDir > 0 ? "animate-step-fwd" : "animate-step-back"} ${sheetHide}`}>
            {(step.id === "when" || step.id === "beach") && (
              <BeachMenu part={step.id === "when" ? "when" : "where"} onEditDates={() => { setNoSet(false); setStepIdx(0); }}
                zonePicker={!richOverview && step.id === "beach" ? <ZoneList days={selDates} selectedId={zoneId} onPick={pickZone} picked={pickedByZone} /> : undefined} blockReason={blockReason} dayInfo={dayInfo} fullDay={fullDay}
                alternatives={fullDay ? {
                  days: [1, -1, 2, -2, 3, 4, 5, 6, 7].map((n) => addDays(fullDay, n)).filter((d) => d >= todayISO() && !blockReason(d) && (dayInfo(d).left ?? 0) > 0).slice(0, 3),
                  zones: step.id === "beach" && phase === "sets" ? ZONES.filter((z) => z.id !== zone.id).map((z) => ({ z, left: liveSlots(z, [fullDay]).filter((x) => x.state === "a").length })).filter((x) => x.left > 0).slice(0, 3) : [],
                } : null}
                onPickZone={(id) => { setBedSel([]); setZoneId(id); }} stayReasons={[...(stopSell ? [`${zone.name}: not available online — ask at the beach (${stopSell.reason}).`] : []), ...Object.entries(stayCheck.blocked).map(([d, why]) => `${chipLabel(d, localeFor(lang)).sub}: ${why}`), ...stayCheck.reasons]}
                selDates={selDates} setSelDates={setSelDates}
                multiDate={multiDate} setMultiDate={setMultiDate}
                phase={phase} setPhase={(p) => (p === "zones" ? backToZones() : setPhase(p))}
                zone={zone} bedSel={bedSel} setBedSel={setBedSel}
                avail={avail} dayCount={dayCount}
                multiStore={multiStore} setMultiStore={setMultiStore} stale={stalePicks.map((b) => b.id)}
                autoNote={autoNote}
              />
            )}
            {step.id === "people" && (
              <PeopleStep
                tickets={TICKET}
                people={people} setPeople={editPeople}
                includeTickets={includeTickets} setIncludeTickets={setIncludeTickets}
                pickedSets={bedSel.length}
                autoFilled={!peopleTouched}
                onPreset={(v) => editPeople(v)}
                usualParty={newGuest ? null : account.party}
              />
            )}
            {step.id === "review" && plan && (
              <div role="status" className="mb-3 rounded-xl ring-1 ring-teal-200 bg-teal-50/70 px-3 py-2 flex items-start gap-2 text-guest-meta text-navy-900">
                <Icon.sparkles size={14} className="text-teal-600 shrink-0 mt-0.5" />
                <span><b>{tr("Your usual, ready for")} {((c) => `${c.label}, ${c.sub}`)(chipLabel(plan.date, localeFor(lang), tr))}.</b> {tr("Change anything with Edit, or pay now.")}</span>
              </div>
            )}
            {step.id === "review" && (
              <ReviewStep
                people={people} totalPeople={totalPeople}
                selDates={selDates} dayCount={dayCount}
                zone={zone} bedSel={bedSel}
                includeTickets={includeTickets} ticketBreak={ticketBreak}
                lockerOn={lockerOn && canLocker} lockerQty={lockerQty} lockerDates={lockerDates}
                parkingOn={parkingOn && canParking} parkingQty={parkingQty} parkingDates={parkingDates} plates={plates} spotPlates={spotPlates}
                onJump={(id) => { if (EXTRA_STEPS.includes(id)) { setExtrasOpen(true); return; } const i = STEPS.findIndex((s) => s.id === id); if (i >= 0) setStepIdx(i); }}
              />
            )}
            {step.id === "review" && extrasKind !== "none" && (
              <section ref={extrasRef} aria-label={tr(EXTRAS_TITLE[extrasKind])} className="mt-3 mb-2 scroll-mt-2">
                {!extrasOpen && !(lockerOn && canLocker) && !(parkingOn && canParking) ? (
                  <button
                    type="button"
                    onClick={() => setExtrasOpen(true)}
                    aria-expanded={false}
                    className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-3.5 py-3 text-left hover:border-teal-400 hover:bg-white/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 grid place-items-center shrink-0"><Icon.plus size={15} /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-guest-meta font-semibold text-navy-900">{tr(ADD_EXTRAS_LABEL[extrasKind])}</span>
                      <span className="block text-guest-caption text-slate-600">
                        {canLocker && lockerChoices.length > 0 && <>{tr("Optional — day lockers from")} €{Math.min(...lockerChoices.map((b) => b.price))}</>}
                        {canLocker && lockerChoices.length > 0 && canParking && " · "}
                        {canParking && <>{canLocker && lockerChoices.length > 0 ? tr("parking") : tr("Optional — parking")} €{PARKING_PRICE} {tr("a day")}</>}
                      </span>
                    </span>
                    <Icon.chevR size={15} className="text-slate-500" />
                  </button>
                ) : (
                  <div className="space-y-3 rounded-2xl ring-1 ring-slate-200 bg-white/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-guest-meta font-semibold text-navy-900">{tr(EXTRAS_TITLE[extrasKind])}</div>
                      {!(lockerOn && canLocker) && !(parkingOn && canParking) && (
                        <button type="button" onClick={() => setExtrasOpen(false)} className="text-guest-caption font-semibold text-slate-500 hover:text-navy-900 rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{tr("Not now")}</button>
                      )}
                    </div>
                    {canLocker && <LockerStep
                      on={lockerOn} setOn={setLockerOn}
                      scope={lockerScope} setScope={setLockerScope}
                      days={lockerDays} setDays={setLockerDays}
                      qty={lockerQty} setQty={setLockerQty}
                      selDates={selDates} multiDate={multiDate}
                      banks={lockerChoices} bank={lockerBank} setBank={setLockerBank}
                    />}
                    {canParking && <ParkingStep
                      on={parkingOn} setOn={setParkingOn}
                      qty={parkingQty} setQty={setParkingQty}
                      scope={parkingScope} setScope={setParkingScope}
                      days={parkingDays} setDays={setParkingDays}
                      plates={plates} setPlates={setPlates}
                      spotPlates={spotPlates} setSpotPlates={setSpotPlates}
                      samePlate={parkingSamePlate} setSamePlate={setParkingSamePlate}
                      selDates={selDates} multiDate={multiDate}
                    />}
                  </div>
                )}
              </section>
            )}
            {step.id === "review" && payItems && (
              <section ref={payRef} aria-label={tr("Payment")} className="mb-2 scroll-mt-2">
                <Checkout embedded />
                <p className="mt-1.5 px-1 text-guest-caption text-slate-600">{tr("Not paying now? This visit waits in your basket.")}</p>
              </section>
            )}
          </div>

          {/* Pinned footer — live total + nav. */}
          {noSet && step.id === "beach" && bedSel.length === 0 && (
            <div role="alert" className="mx-4 sm:mx-5 mb-2 rounded-xl bg-amber-50 ring-1 ring-amber-600/25 px-3 py-2.5 text-guest-meta text-amber-900 shrink-0">
              <div className="flex items-start gap-2">
                <Icon.umbrella size={15} className="shrink-0 mt-0.5 text-amber-700" />
                <div className="min-w-0">
                  <b>{tr("You haven't picked a set yet.")}</b>{" "}
                  {phase === "zones" ? (richOverview ? tr("Tap a zone on the sand, then tap a set (an umbrella with two sunbeds) to add it.") : tr("Pick a zone in the list, then tap a set (an umbrella with two sunbeds) on the map.")) : tr("Tap a free set on the sand to add it.")}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 pl-[23px]">
                {phase === "sets" && avail > 0 && (
                  <button type="button" onClick={() => autoPick(zone.id, wantSets, undefined, true)} className="inline-flex items-center gap-1.5 min-h-[36px] rounded-lg bg-white px-3 font-semibold text-teal-800 ring-1 ring-teal-300 hover:ring-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                    <Icon.sparkles size={13} /> {tr("Pick for me")}
                  </button>
                )}
                <button type="button" onClick={entryOnly} className="inline-flex items-center min-h-[36px] rounded-lg bg-white/70 px-3 font-semibold text-navy-900 ring-1 ring-amber-300 hover:ring-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                  {tr("Entry tickets only")}
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 p-4 sm:p-5 pt-3 border-t border-slate-200/70 shrink-0">
            {step.id === "review" && payItems ? (
              // On Pay the payment panel holds the one total that counts (rewards, credit, passes applied).
              <div className="leading-tight min-w-0 text-guest-meta text-slate-600">{tr("Check the total and pay below.")}</div>
            ) : step.id === "when" || stepTotal === 0 || (step.id === "beach" && bedSel.length === 0) ? (
              // A calm first step (AENR-658): no price before a set is chosen; the
              // cancellation terms appear once, on Pay.
              <div className="leading-tight min-w-0 text-guest-meta text-slate-600">
                {step.id === "when" ? tr("Pick your day, then choose where to sit.") : step.id === "beach" ? (phase === "zones" ? tr("Pick a zone, then your sets.") : guidePick ? (
                  // The sheet's header already says "tap a set"; this is the quiet way
                  // to come without one (AENR-747).
                  <button type="button" onClick={entryOnly} className="font-semibold text-teal-700 underline underline-offset-2 decoration-teal-700/40 hover:decoration-teal-700 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{tr("Entry tickets only")}</button>
                ) : tr("Tap a set to add it.")) : tr("Add a set or a ticket to see the price.")}
              </div>
            ) : (
            // Just the total (AENR-682): the truncated set/day line and the "all-in" toggle are gone.
            <div className="leading-tight min-w-0">
              <span className="font-display text-2xl font-bold text-navy-900 tnum leading-none" data-wizard-total>€<LiveEuro value={stepTotal} /></span>
              {step.id === "people" && ticketSubtotal > 0 && <span className="block mt-1 text-guest-caption text-slate-500 tnum">{tr("incl. entry tickets")} €{ticketSubtotal}</span>}
              {stepFee > 0 && <span className="block mt-1 text-guest-caption text-slate-500 tnum" data-wizard-fee>{tr("incl. service fee")} €{stepFee.toFixed(2)}</span>}
            </div>
            )}
            <div className="flex items-center gap-2">
              <Btn variant="ghost" icon={Icon.arrowL} onClick={back} className="whitespace-nowrap">
                {step.id === "beach" && phase === "sets" ? tr("All zones") : stepIdx === 0 ? tr("Home") : tr("Back")}
              </Btn>
              {guidePick ? (
                // Nothing picked yet on the map (AENR-747): the main button does the
                // useful thing — picks the best free set(s) — instead of leading
                // to a "you haven't picked a set" notice.
                <Btn variant="teal" icon={Icon.sparkles} className="whitespace-nowrap" onClick={() => autoPick(zone.id, wantSets, undefined, true)}>{tr("Pick for me")}</Btn>
              ) : stepIdx < last ? (
                <Btn variant="teal" onClick={next} disabled={(step.id === "beach" && (!stayCheck.ok || !!stopSell)) || (step.id === "when" && Object.keys(stayCheck.blocked).length > 0)}>{tr("Continue")} <Icon.arrowR size={15} /></Btn>
              ) : (
                <Btn variant="dark" icon={Icon.card} className="whitespace-nowrap" disabled={grandTotal === 0} onClick={() => (stalePicks.length ? confirm() : payRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }))}>{tr("Go to payment")}</Btn>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ The beach itself — fills the space below the menu so every
           set is visible (never hidden behind it) and is tapped directly. ====== */}
      <div className={`flex-1 min-h-0 px-3 sm:px-5 pt-[20vh] lg:pt-[max(calc(50vh+8px),440px)] max-lg:pb-[132px] ${showZones ? "" : "lg:mr-[min(460px,36vw)]"} flex justify-center animate-fade-in`} style={{ animationDelay: revealDelay, animationFillMode: "both" }}>
        {/* The zone overview spreads the full beach width (panoramic); a single
            zone's sunbed grid stays at a comfortable reading width. */}
        <div className={`relative w-full ${showSets ? "max-w-5xl" : "max-w-[1700px]"}`}>
          {showZones && richOverview && <StoreOverview days={selDates} selectedId={zoneId} onPick={(id) => { if (step.id === "when") setStepIdx(BEACH_IDX); pickZone(id); }} rich={richOverview} flipEnter={flipBackRef.current ? zoneId : null} picked={pickedByZone} />}
          {step.id === "when" && !richOverview && <ZoneStrip days={selDates} onPick={(id) => { setStepIdx(BEACH_IDX); pickZone(id); }} />}
          {step.id === "beach" && phase === "zones" && !richOverview && <ZonePanorama days={selDates} selectedId={zoneId} picked={pickedByZone} onPick={pickZone} />}
          {showSets && (richOverview ? (
            <SandSunbeds slots={slots} selected={selectedIds} onToggle={(slot, el) => setInspect({ slot, el })} />
          ) : (
            // Phones: set tiles fitted to the width (AENR-749) — a legend and one
            // zoom toggle sit above the map, never on the sets; pinch still zooms.
            <ZoomBox className="h-full pointer-events-auto" hint={null} minWidth={0} aspect={(w) => tileGeometry(slots, w).height} controls="none"
              toolbar={(z) => <TileMapBar {...z} />}
              focus={(() => { const f = slots.find((x) => selectedIds.has(x.id)) ?? slots.find((x) => x.state === "a"); return f ? { x: f.x, y: f.y } : undefined; })()}>
              <SandSunbeds tiles slots={slots} selected={selectedIds} onToggle={(slot, el) => setInspect({ slot, el })} />
            </ZoomBox>
          ))}
          {/* Who and Pay keep your zone on the sand (AENR-670): the last zone you picked
              sets from, read-only, your sets highlighted — no extra vignettes. */}
          {showScene && (richOverview ? (
            <SandSunbeds readOnly slots={sceneSlots} selected={sceneIds} />
          ) : (
            <ZoomBox className="h-full pointer-events-auto" hint={null} minWidth={0} aspect={(w) => tileGeometry(sceneSlots, w).height} controls="none"
              focus={(() => { const f = sceneSlots.find((x) => sceneIds.has(x.id)); return f ? { x: f.x, y: f.y } : undefined; })()}>
              <SandSunbeds tiles readOnly slots={sceneSlots} selected={sceneIds} />
            </ZoomBox>
          ))}
        </div>
      </div>

      <div className="sr-only" aria-live="polite">{announce}</div>
      {inspect && (
        <div className="pointer-events-auto">
          <SpotSheet zoneName={zone.name} slot={inspect.slot} info={tierOfZone(inspect.slot)} selected={selectedIds.has(inspect.slot.id)} priceText={`€${inspect.slot.price}`}
            onClose={() => setInspect(null)}
            onSelect={() => { toggleBed(inspect.slot, inspect.el); setInspect(null); }} />
        </div>
      )}
      {/* ============ Bottom bar — guidance + always-on Slaice credit ============ */}
      <div className={`shrink-0 px-3 pb-1.5 pt-1 pointer-events-none max-lg:hidden ${showZones ? "" : "lg:mr-[min(460px,36vw)]"}`}>
        {(showZones || showSets || showScene) && (
          <div className="max-w-3xl mx-auto pointer-events-auto">
            {showZones && (
              <div className="rounded-2xl glass px-4 py-1.5 text-center">
                {step.id === "when"
                  ? <span className="text-guest-meta text-navy-900"><b>{tr("Pick your day")}</b> {tr("— the free sets on the beach update with it. Or tap a zone to go straight to it.")}</span>
                  : <span className="text-guest-meta text-navy-900"><b>{tr("Tap a zone on the beach")}</b> {tr("to choose where you'll sit — the sea is at the top.")}</span>}
              </div>
            )}
            {showScene && (
              <div className="rounded-2xl glass px-4 py-1.5 text-center">
                <span className="text-guest-meta text-navy-900"><b>{pickZones.length > 1 ? pickZones.map((z) => `${ZONES.find((x) => x.id === z)?.name} ×${pickedByZone[z]}`).join(" · ") : sceneZone.name}</b> · {bedSel.length} {bedSel.length !== 1 ? tr("umbrella sets") : tr("umbrella set")} — {tr("your picks stay on the sand while you finish up.")}</span>
              </div>
            )}
            {showSets && (
              <div className="rounded-2xl glass px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-guest-caption text-slate-700">
                <span className="flex items-center gap-1"><Sunbed state="a" size={14} readOnly />{tr("Available")}</span>
                <span className="flex items-center gap-1"><Sunbed state="h" size={14} readOnly />{tr("On hold")}</span>
                <span className="flex items-center gap-1"><Sunbed state="u" size={14} readOnly />{tr("Taken")}</span>
                <span className="flex items-center gap-1"><Sunbed state="a" sel size={14} readOnly />{tr("Yours")}</span>
                <span className="text-slate-500">·</span>
                {TIERS.map((ti) => <span key={ti.key} className="flex items-center gap-1"><span className="rounded px-1 text-guest-caption font-bold text-white" style={{ background: ti.color }}>{ti.letter}</span>{tr(ti.name)}</span>)}
                <span className="text-slate-500">·</span>
                <span className="text-slate-600">{tr("Tap a set to see its view and price.")}</span>
              </div>
            )}
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-guest-caption text-slate-700">
          <span>{tr("powered by")}</span>
          <span className="font-bold text-navy-900">SLA<span className="text-gold-600">i</span>CE</span>
        </div>
      </div>
      {/* Leaving with sets picked asks first (AENR-752) — the flow is the whole
          screen on phones, so leaving is a deliberate act. */}
      <Modal open={leaveAsk} onClose={() => setLeaveAsk(false)} title={tr("Leave this booking?")}
        footer={<div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setLeaveAsk(false)}>{tr("Keep booking")}</Btn><Btn variant="primary" onClick={() => go("customer", "home")}>{tr("Leave")}</Btn></div>}>
        <p className="text-guest-body text-slate-600">
          {bedSel.length === 1 ? tr("Your picked set goes back on the beach.") : `${bedSel.length} ${tr("picked sets go back on the beach.")}`} {tr("Nothing has been charged.")}
        </p>
      </Modal>
    </div>
  );
}

/* ============ Progress rail — the journey path ============
   A dotted footpath across the sand connecting the five steps; the walked
   stretch draws in teal as you advance and a marker strolls to the active
   station. Stations stay buttons (back-jumps only, like the old rail).
   The path runs exactly from the first to the last station centre (x 10→90
   matches the 5-column grid), so `stepIdx / 4` lands the drawn stroke and the
   marker precisely on each dot. No vector-effect on the strokes: Chromium
   mis-evaluates pathLength-normalised dashes under non-scaling-stroke, which
   rendered the walked line as broken dash cycles. */
// Station centres in the 0–100 viewBox for an N-column grid, and a gently wavy footpath through them.
const CENTRES = STEPS.map((_, i) => ((i + 0.5) / STEPS.length) * 100);
const TRAIL_D = CENTRES.slice(1).reduce(
  (d, x, i) => `${d} Q ${(CENTRES[i] + x) / 2} ${i % 2 ? 10.5 : 6}, ${x} 8.5`,
  `M ${CENTRES[0]} 8.5`,
);
function ProgressRail({ stepIdx, onJump }: { stepIdx: number; onJump: (i: number) => void }) {
  const tr = useT();
  const root = useRef<HTMLDivElement>(null);
  const frac = stepIdx / (STEPS.length - 1);
  // Pop the active station's dot whenever the step changes; moving forward, the
  // station just finished pops its tick in as well (AENR-748).
  const prevIdx = useRef(stepIdx);
  useEffect(() => {
    const from = prevIdx.current;
    prevIdx.current = stepIdx;
    if (!motionOK() || !root.current) return;
    const el = root.current.querySelector(`[data-station="${stepIdx}"] [data-station-dot]`);
    if (el) gsap.fromTo(el, { scale: 0.55 }, { scale: 1, duration: DUR.sm, ease: EASE.pop });
    if (stepIdx > from) {
      const tick = root.current.querySelector(`[data-station="${stepIdx - 1}"] [data-station-dot] svg`);
      if (tick) gsap.fromTo(tick, { scale: 0, rotate: -45 }, { scale: 1, rotate: 0, duration: DUR.sm, ease: EASE.pop, delay: DUR.xs });
    }
  }, [stepIdx]);
  return (
    <div ref={root} className="relative">
      {/* The path baseline runs through the station-dot centres (14px down);
          x 10/30/50/70/90 in the 0–100 viewBox matches the 5-column grid. */}
      <svg aria-hidden="true" className="absolute left-0 right-0 top-[7px] h-[14px] w-full" viewBox="0 0 100 14" preserveAspectRatio="none">
        <path d={TRAIL_D} fill="none" stroke="#cbd5e1" strokeWidth={2} strokeLinecap="round" pathLength={100} strokeDasharray="0.4 2.8" />
        <path
          d={TRAIL_D} fill="none" stroke="#14b8a6" strokeWidth={2.5} strokeLinecap="round"
          pathLength={100} strokeDasharray={100} strokeDashoffset={100 - frac * 100}
          style={{ transition: `stroke-dashoffset ${DURATION.slow}ms ${EASING.out.css}` }}
        />
      </svg>
      <div
        aria-hidden="true"
        className="absolute top-[7px] w-3.5 h-3.5 rounded-full bg-white ring-2 ring-teal-500 shadow -translate-x-1/2 z-[1]"
        style={{ left: `calc(${CENTRES[0]}% + ${frac} * ${CENTRES[CENTRES.length - 1] - CENTRES[0]}%)`, transition: `left ${DURATION.slow}ms ${EASING.out.css}` }}
      />
      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
        {STEPS.map((s, i) => {
          const I = Icon[s.icon];
          const done = i < stepIdx;
          const active = i === stepIdx;
          const reachable = i <= stepIdx; // forward jumps only via Continue
          return (
            <button
              key={s.id}
              data-station={i}
              onClick={() => reachable && onJump(i)}
              disabled={!reachable}
              aria-current={active ? "step" : undefined}
              className="flex flex-col items-center gap-1 min-w-0 group disabled:cursor-default"
            >
              <span
                data-station-dot
                className={`w-7 h-7 rounded-full grid place-items-center transition-colors ${
                  active ? "bg-navy-900 text-white shadow-btn-primary" : done ? "bg-teal-500 text-white" : "bg-white/80 ring-1 ring-slate-300 text-slate-500 group-hover:ring-teal-400"
                }`}
              >
                {done ? <Icon.check size={13} /> : I ? <I size={12} /> : i + 1}
              </span>
              <span className={`text-guest-caption font-semibold leading-none truncate max-w-full px-0.5 ${active ? "text-navy-900" : done ? "text-teal-700" : "text-slate-500"}`}>
                {tr(s.label)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============ Beach step — menu side (dates + phase controls) ============
   The map and the sunbed grid have moved onto the page background; the menu keeps
   the dates and the supporting info (zone summary, legend, picks). */
function BeachMenu({ part, onEditDates, zonePicker, selDates, setSelDates, multiDate, setMultiDate, phase, setPhase, zone, bedSel, setBedSel, avail, dayCount, blockReason, stayReasons, multiStore, setMultiStore, stale, dayInfo, fullDay, alternatives, onPickZone, autoNote }: {
  /** When = the day(s); Where = zone, sets and several zones (AENR-673). */
  part: "when" | "where";
  onEditDates: () => void;
  /** Phones (AENR-693): the zones are part of the step — a list in the panel, with a Zone → Sets indicator. */
  zonePicker?: ReactNode;
  /** The "Choose for me" pick in words, with the front-row upgrade (AENR-641). */
  autoNote?: { text: string; upgrade?: { label: string; onClick: () => void } } | null;
  dayInfo: (iso: string) => DayInfo;
  fullDay: string | null;
  alternatives: { days: string[]; zones: { z: WizardZone; left: number }[] } | null;
  onPickZone: (id: string) => void;
  multiStore: boolean;
  setMultiStore: (v: boolean) => void;
  /** Picks taken or put on hold since they were chosen. */
  stale: string[];
  blockReason: (iso: string) => string | null;
  stayReasons: string[];
  selDates: string[];
  setSelDates: Dispatch<SetStateAction<string[]>>;
  multiDate: boolean;
  setMultiDate: (v: boolean) => void;
  phase: BeachPhase;
  setPhase: (p: BeachPhase) => void;
  zone: WizardZone;
  bedSel: BedPick[];
  setBedSel: Dispatch<SetStateAction<BedPick[]>>;
  avail: number;
  dayCount: number;
}) {
  const tr = useT();
  const { lang } = useApp();
  const pickedSubtotal = bedSel.reduce((a, b) => a + b.price, 0);
  const groups = [...new Set(bedSel.map((b) => b.zoneId))].map((zid) => ({ zone: ZONES.find((z) => z.id === zid) ?? zone, picks: bedSel.filter((b) => b.zoneId === zid) }));
  const [keepAsk, setKeepAsk] = useState(false);
  const turnMulti = (v: boolean) => {
    if (v) return setMultiStore(true);
    if (groups.length > 1) return setKeepAsk(true); // never drop picks silently
    setMultiStore(false);
  };
  return (
    <div className="space-y-4">
      {/* Dates — apply to the whole booking (When). */}
      {part === "where" ? (
        <button type="button" onClick={onEditDates} className="w-full flex items-center gap-2 rounded-xl bg-white/70 ring-1 ring-slate-200 px-3 min-h-[40px] text-left text-guest-meta hover:ring-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
          <Icon.calendar size={13} className="text-slate-500 shrink-0" />
          <span className="flex-1 min-w-0 truncate text-navy-900 font-semibold">{selDates.length === 1 ? ((c) => `${c.label} ${c.sub}`)(chipLabel(selDates[0], localeFor(lang), tr)) : `${selDates.length} ${tr("days")}`}</span>
          <span className="text-teal-700 font-semibold">{tr("Change")}</span>
        </button>
      ) : (
      <div>
        <div className="text-guest-over font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5"><Icon.calendar size={12} /> {tr("When are you coming?")}</div>
        <DatePickerRow value={selDates} onChange={setSelDates} multiple={multiDate} maxDays={7} blockReason={blockReason} dayInfo={dayInfo} />
        {fullDay && alternatives && <FullDayHelp day={fullDay} zoneName="" alt={alternatives} onDay={(d) => setSelDates([d])} onZone={onPickZone} />}
        {stayReasons.length > 0 && <div role="alert" className="mt-2 rounded-xl bg-amber-50 ring-1 ring-amber-600/20 px-3 py-2 text-guest-caption text-amber-800 space-y-0.5">{stayReasons.map((r) => <div key={r}>{r}</div>)}</div>}
        {multiDate && (
        <div className="mt-2 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-guest-meta">
            <Icon.calendar size={13} className="text-slate-500 shrink-0 mt-0.5" />
            <span className="text-slate-700">{multiDate
              ? <><b className="text-navy-900">{selDates.length} {selDates.length !== 1 ? tr("days") : tr("day")}</b> {tr("selected")} · {tr("up to 7")}</>
              : tr("Book several days at once")}</span>
          </div>
          <Toggle on={multiDate} onChange={(v) => { setMultiDate(v); if (!v && selDates.length > 1) setSelDates([selDates[0]]); }} ariaLabel={tr("Book several days at once")} />
        </div>
        )}
        {!multiDate && (
          <div className="mt-2 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2 text-guest-meta">
              <Icon.calendar size={13} className="text-slate-500 shrink-0 mt-0.5" />
              <span className="text-slate-700">{tr("Book several days at once")}</span>
            </div>
            <Toggle on={multiDate} onChange={(v) => setMultiDate(v)} ariaLabel={tr("Book several days at once")} />
          </div>
        )}
      </div>
      )}
      {part === "where" && fullDay && alternatives && <FullDayHelp day={fullDay} zoneName={phase === "sets" ? zone.name : ""} alt={alternatives} onDay={(d) => setSelDates([d])} onZone={onPickZone} />}
      {part === "where" && stayReasons.length > 0 && <div role="alert" className="rounded-xl bg-amber-50 ring-1 ring-amber-600/20 px-3 py-2 text-guest-caption text-amber-800 space-y-0.5">{stayReasons.map((r) => <div key={r}>{r}</div>)}</div>}
      {part === "where" && <>

      {zonePicker && (
        <ol aria-label={tr("Where — two parts")} className="grid grid-cols-2 gap-1.5 text-guest-caption font-semibold">
          {([["zones", tr("Zone")], ["sets", tr("Sets")]] as const).map(([k, l], i) => {
            const now = phase === k;
            const done = k === "zones" && phase === "sets";
            return (
              <li key={k}>
                <button type="button" disabled={k === "sets" && phase === "zones"} onClick={() => k === "zones" && phase === "sets" && setPhase("zones")} aria-current={now ? "step" : undefined}
                  className={`w-full flex items-center gap-2 rounded-xl px-2.5 min-h-[40px] ring-1 text-left transition disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${now ? "bg-navy-900 text-white ring-navy-900" : done ? "bg-teal-50 text-teal-800 ring-teal-300" : "bg-white/60 text-slate-500 ring-slate-200"}`}>
                  <span className={`w-5 h-5 rounded-full grid place-items-center text-guest-caption shrink-0 ${now ? "bg-white text-navy-900" : done ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"}`}>{done ? <Icon.check size={11} /> : i + 1}</span>
                  <span className="truncate">{k === "zones" ? (phase === "sets" ? zone.name : l) : bedSel.length ? `${l} · ${bedSel.length}` : l}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
      {zonePicker && phase === "zones" && zonePicker}

      {/* The map and the sunbed glyphs live on the sand; here the menu keeps only
          the chosen-zone summary and your picks. The legend + tap prompts sit in
          the bottom bar so they never crowd this panel. */}
      {phase === "sets" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {/* A real button, not grey text: it is how guests reach the other zones (AENR-666).
                Phones use the Zone step above instead (AENR-693). */}
            <button type="button" onClick={() => setPhase("zones")} className={`${zonePicker ? "hidden" : ""} inline-flex items-center gap-1.5 min-h-[36px] text-guest-meta font-semibold text-navy-900 rounded-xl px-3 py-1.5 bg-white/80 ring-1 ring-slate-200 hover:ring-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500`}>
              <Icon.arrowL size={14} /> {tr("All zones")}
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-lg grid place-items-center shrink-0" style={{ background: zone.color, color: "white" }}><Icon.umbrella size={13} /></span>
              <div className="font-display font-bold text-navy-900 text-guest-body truncate">{zone.name}</div>
              <Badge tone="green">{avail} {tr("free")}</Badge>
            </div>
          </div>

          {bedSel.length > 0 && !multiStore && (
            <div className="rounded-xl px-3 py-2.5 ring-1 ring-teal-300 bg-teal-50/80 flex items-center justify-between gap-3">
              <div className="min-w-0 text-guest-meta flex items-start gap-2" role="status">
                {autoNote && <Icon.sparkles size={14} className="text-teal-700 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  {autoNote && <div className="font-semibold text-navy-900">{tr("Picked for you")}: {autoNote.text}</div>}
                  <div className={autoNote ? "text-guest-caption text-slate-600" : "font-semibold text-navy-900 truncate"}>{bedSel.length} {bedSel.length !== 1 ? tr("umbrella sets") : tr("umbrella set")} · {bedSel.map((b) => b.id).join(", ")}</div>
                  <div className="text-guest-caption text-slate-600">€{pickedSubtotal} × {dayCount} {dayCount !== 1 ? tr("days") : tr("day")}{autoNote ? ` · ${tr("tap a set on the sand to swap it")}` : ""}</div>
                </div>
              </div>
              <button onClick={() => setBedSel([])} className="text-guest-caption font-semibold text-slate-500 hover:text-rose-600 shrink-0 min-h-[32px] px-1">{tr("Clear")}</button>
            </div>
          )}
          {autoNote?.upgrade && !multiStore && (
            <button type="button" onClick={autoNote.upgrade.onClick} className="inline-flex items-center gap-1.5 min-h-[36px] rounded-full px-3 text-guest-caption font-semibold text-teal-800 bg-white/90 ring-1 ring-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              <Icon.wave size={13} /> {autoNote.upgrade.label}
            </button>
          )}
        </div>
      )}

      {/* Several days live on When; "Book in more than one zone" (AENR-524) is always in view (AENR-709). */}
          <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2 flex items-center justify-between gap-3">
            <div className="text-guest-meta min-w-0">
              <div className="font-semibold text-navy-900">{tr("Book in more than one zone")}</div>
              <div className="text-guest-caption text-slate-500">{tr("e.g. 2 sets in Macaw and 1 in Central — one payment.")}</div>
            </div>
            <Toggle on={multiStore} onChange={turnMulti} ariaLabel={tr("Book in more than one zone")} />
          </div>
      {multiStore && bedSel.length > 0 && (
        <section aria-label={tr("Your sets by zone")} className="rounded-xl ring-1 ring-teal-300 bg-teal-50/80 px-3 py-2.5 space-y-2">
          {groups.map((g) => (
            <div key={g.zone.id} className="text-guest-meta">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-navy-900 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: g.zone.color }} aria-hidden />{g.zone.name} · {g.picks.length} {g.picks.length !== 1 ? tr("sets") : tr("set")}</span>
                <span className="tnum text-slate-700">€{g.picks.reduce((a, b) => a + b.price, 0) * dayCount}</span>
              </div>
              <ul className="mt-1 flex flex-wrap gap-1">
                {g.picks.map((b) => (
                  <li key={b.id}>
                    <button type="button" onClick={() => setBedSel((s) => s.filter((x) => x.id !== b.id))} aria-label={`${tr("Remove")} ${b.id}`}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-guest-caption font-semibold ring-1 ${stale.includes(b.id) ? "bg-rose-50 text-rose-700 ring-rose-300" : "bg-white text-navy-900 ring-slate-200 hover:ring-rose-300"}`}>
                      {b.id}{stale.includes(b.id) ? ` · ${tr("no longer free")}` : ""} <Icon.x size={11} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {phase === "sets" && (
            <button type="button" onClick={() => setPhase("zones")} className="w-full inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl bg-white text-teal-800 text-guest-meta font-semibold ring-1 ring-teal-300 hover:ring-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              <Icon.plus size={14} /> {tr("Add sets in another zone")}
            </button>
          )}
          <div className="border-t border-teal-200 pt-1.5 flex items-center justify-between text-guest-meta font-semibold text-navy-900">
            <span>{bedSel.length} {tr("sets in")} {groups.length} {groups.length !== 1 ? tr("zones") : tr("zone")} · {dayCount} {dayCount !== 1 ? tr("days") : tr("day")}</span>
            <span className="tnum">€{pickedSubtotal * dayCount}</span>
          </div>
        </section>
      )}
      {!multiStore && stale.length > 0 && <div role="alert" className="rounded-xl bg-rose-50 ring-1 ring-rose-300 px-3 py-2 text-guest-caption text-rose-800">{stale.join(", ")} {tr("is no longer available — remove it and pick another set.")}</div>}
      </>}
      <Modal open={keepAsk} onClose={() => setKeepAsk(false)} title={tr("Keep sets from one zone?")}
        footer={<Btn variant="ghost" onClick={() => setKeepAsk(false)}>{tr("Cancel")}</Btn>}>
        <p className="text-guest-body text-slate-600 mb-3">{tr("You picked sets in several zones. Choose the zone whose sets you keep — the others are removed.")}</p>
        <div className="grid gap-2">
          {groups.map((g) => (
            <Btn key={g.zone.id} variant="outline" onClick={() => { setBedSel((s) => s.filter((b) => b.zoneId === g.zone.id)); setMultiStore(false); setKeepAsk(false); }}>
              {tr("Keep")} {g.zone.name} · {g.picks.map((b) => b.id).join(", ")}
            </Btn>
          ))}
        </div>
      </Modal>
    </div>
  );
}

/* A sold-out day (AENR-570): the nearest days with room, other zones that day,
   or "Notify me" (simulated SMS when a spot frees up). */
function FullDayHelp({ day, zoneName, alt, onDay, onZone }: { day: string; zoneName: string; alt: { days: string[]; zones: { z: WizardZone; left: number }[] }; onDay: (d: string) => void; onZone: (id: string) => void }) {
  const tr = useT();
  const { toast, lang } = useApp();
  const [notified, setNotified] = useState(false);
  const loc = localeFor(lang);
  const dayLbl = chipLabel(day, loc, tr);
  return (
    <div role="status" className="mt-2 rounded-xl bg-amber-50 ring-1 ring-amber-600/20 px-3 py-2.5 text-guest-meta text-amber-900 space-y-2">
      <div><b>{zoneName ? `${zoneName} ${tr("is full on")}` : tr("The beach is full on")} {dayLbl.label} {dayLbl.sub}.</b> {tr("Try one of these:")}</div>
      <div className="flex flex-wrap gap-1.5">
        {alt.days.map((d) => { const c = chipLabel(d, loc, tr); return <button key={d} type="button" onClick={() => onDay(d)} className="rounded-lg bg-white ring-1 ring-amber-300 px-2.5 min-h-[36px] font-semibold text-navy-900 hover:ring-teal-400">{c.label} {c.sub}</button>; })}
        {alt.zones.map(({ z, left }) => <button key={z.id} type="button" onClick={() => onZone(z.id)} className="rounded-lg bg-white ring-1 ring-amber-300 px-2.5 min-h-[36px] font-semibold text-navy-900 hover:ring-teal-400">{z.name} · {left} {tr("free")}</button>)}
      </div>
      <button type="button" disabled={notified} onClick={() => { setNotified(true); toast(`${tr("We'll text you if a spot frees up on")} ${dayLbl.sub}.`, { tone: "success" }); }} className="inline-flex items-center gap-1.5 font-semibold text-teal-800 hover:underline disabled:no-underline disabled:text-emerald-800">
        <Icon.bell size={13} /> {notified ? tr("You'll be notified") : tr("Notify me if a spot frees up")}
      </button>
    </div>
  );
}

/* One selection colour on the beach overview (owner, AENR-732): every zone's glow, name and tick use
   the sky blue Central had, instead of each zone's own colour. */
const ZONE_ACTIVE = "#0ea5e9";

const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ============ Zone overview ============
   Tablet / desktop: a panoramic beach — each zone's real umbrella rows laid out
   on the open sand (no card chrome) in one front row along the water, in beach
   order across the whole width (AENR-668), with the zone name + optional logo set on the sand beneath. Tap
   to open it. Phones / tight screens fall back to compact cards. `rich` is owned
   by the wizard (it gates the FLIP zoom); `flipEnter` names the zone whose beds
   are flying back in, so the entrance stagger skips that cluster. */
function StoreOverview({ days, selectedId, onPick, rich, flipEnter, picked }: { days: string[]; selectedId: string; onPick: (id: string) => void; rich: boolean; flipEnter: string | null; picked: Record<string, number> }) {
  return rich ? <StoreClusters days={days} selectedId={selectedId} onPick={onPick} flipEnter={flipEnter} picked={picked} /> : <StoreCards days={days} selectedId={selectedId} onPick={onPick} picked={picked} />;
}

/* ============ Phones, When step: the beach filling up (AENR-758) ============
   A swipeable strip of the zones in beach order, each a mini map of its sets
   coloured by state for the chosen day (free teal, on hold amber, taken grey)
   with the free count and the from-price. Changing the day re-colours the sets
   and rolls the counts; tapping a zone opens it on Where. */
const STRIP_DOT: Record<string, string> = { a: "bg-teal-500", h: "bg-amber-400", u: "bg-slate-300" };
function ZoneStrip({ days, onPick }: { days: string[]; onPick: (id: string) => void }) {
  const tr = useT();
  const liveSlots = useLiveSlots();
  const order = useMemo(
    () => [...ZONES].sort((a, b) => parseFloat(ZONE_BLOCKS.find((x) => x.id === a.id)?.left ?? "50") - parseFloat(ZONE_BLOCKS.find((x) => x.id === b.id)?.left ?? "50")),
    [],
  );
  return (
    <div className="absolute inset-x-0 top-0 pointer-events-auto animate-fade-up">
      <div className="px-1 pb-1.5 text-guest-caption font-semibold text-navy-900/80 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">{tr("Free sets on the beach that day")} · {tr("tap a zone")}</div>
      <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory overscroll-x-contain pb-2 -mx-3 px-3 [scrollbar-width:none]">
        {order.map((z) => <ZoneStripTile key={z.id} zone={z} slots={liveSlots(z, days)} onPick={onPick} />)}
      </div>
    </div>
  );
}
function ZoneStripTile({ zone, slots, onPick }: { zone: WizardZone; slots: SunbedSlot[]; onPick: (id: string) => void }) {
  const tr = useT();
  const freeSlots = slots.filter((s) => s.state === "a");
  const free = useAnimatedNumber(freeSlots.length, DURATION.slow);
  const from = freeSlots.length ? Math.min(...freeSlots.map((s) => s.price)) : null;
  const full = freeSlots.length === 0;
  return (
    <button type="button" onClick={() => onPick(zone.id)}
      aria-label={`${zone.name} — ${freeSlots.length} ${tr("free")}${from !== null ? `, ${tr("from")} ${euro(from)}` : ""}`}
      className={`snap-start shrink-0 w-[118px] rounded-2xl glass-card px-2.5 pt-2 pb-2 text-left transition duration-fast ease-ios active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${full ? "opacity-70" : ""}`}>
      <span className="flex items-center gap-1.5 min-w-0">
        <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ background: zone.color }} />
        <span className="font-semibold text-guest-meta text-navy-900 truncate">{zone.name}</span>
      </span>
      <span aria-hidden className="relative block mt-1.5 h-[52px] rounded-lg bg-[#f3e3c4]/70">
        {slots.map((s) => (
          <span key={s.id} className={`absolute w-[6px] h-[6px] rounded-[2px] -translate-x-1/2 -translate-y-1/2 transition-colors duration-base ${STRIP_DOT[s.state] ?? STRIP_DOT.u}`} style={{ left: `${s.x}%`, top: `${s.y}%` }} />
        ))}
      </span>
      <span className="mt-1.5 block text-guest-caption leading-tight">
        <b className="tnum text-navy-900">{full ? tr("Full") : `${Math.round(free)} ${tr("free")}`}</b>
        {from !== null && <span className="block text-slate-600 tnum">{tr("from")} {euro(from)}</span>}
      </span>
    </button>
  );
}

/* ============ Phones, Where: choose a zone on the beach (AENR-760) ============
   A sideways-swiping panorama of the sand: the zones in the order and the
   front-to-back stagger of the admin's zone map (Beach layout), each drawn as a
   mini map of its sets for the chosen day with its name and a free · from chip.
   It snaps zone by zone; tapping a zone opens its sets. The zone list stays in
   the raised sheet as the accessible alternative. */
function ZonePanorama({ days, selectedId, picked, onPick }: { days: string[]; selectedId: string; picked: Record<string, number>; onPick: (id: string) => void }) {
  const tr = useT();
  const { zoneMap } = useApp();
  const liveSlots = useLiveSlots();
  const placed = useMemo(() => {
    const at = (id: string) => zoneMap.find((m) => m.id === id);
    const xOf = (id: string) => at(id)?.x ?? parseFloat(ZONE_BLOCKS.find((b) => b.id === id)?.left ?? "50");
    const ys = ZONES.map((z) => at(z.id)?.y ?? 50);
    const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
    return [...ZONES]
      .sort((a, b) => xOf(a.id) - xOf(b.id))
      .map((z) => ({ z, lift: y1 > y0 ? Math.round((((at(z.id)?.y ?? 50) - y0) / (y1 - y0)) * 28) : 0 }));
  }, [zoneMap]);
  return (
    <div className="absolute inset-x-0 top-0 pointer-events-auto animate-fade-up">
      <div className="px-1 pb-1 text-guest-caption font-semibold text-navy-900/80 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] flex items-center gap-1.5">
        <Icon.arrowR size={12} className="rotate-180" /> {tr("Swipe along the beach · tap a zone")} <Icon.arrowR size={12} />
      </div>
      <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory overscroll-x-contain pb-3 pt-1 -mx-3 px-[max(0.75rem,calc(50%-80px))] [scrollbar-width:none]" aria-label={tr("Zones on the beach")}>
        {placed.map(({ z, lift }) => {
          const slots = liveSlots(z, days);
          const freeSlots = slots.filter((x) => x.state === "a");
          const from = freeSlots.length ? Math.min(...freeSlots.map((x) => x.price)) : null;
          const active = z.id === selectedId;
          const n = picked[z.id] ?? 0;
          return (
            <li key={z.id} className="snap-center shrink-0" style={{ marginTop: lift }}>
              <button type="button" onClick={() => onPick(z.id)}
                aria-label={`${z.name} — ${freeSlots.length} ${tr("free")}${from !== null ? `, ${tr("from")} ${euro(from)}` : ""}${n ? `, ${n} ${tr("picked")}` : ""}`}
                className={`relative w-[160px] rounded-3xl p-3 text-left transition duration-fast ease-ios active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${active ? "bg-white/85 ring-2 ring-teal-600 shadow-lift" : "bg-white/55 ring-1 ring-white/70 shadow-soft"} ${freeSlots.length ? "" : "opacity-70"}`}>
                <span aria-hidden className="relative block h-[96px] rounded-2xl bg-[#f3e3c4]">
                  {slots.map((x) => (
                    <span key={x.id} className={`absolute w-[9px] h-[9px] rounded-[3px] -translate-x-1/2 -translate-y-1/2 transition-colors duration-base ${STRIP_DOT[x.state] ?? STRIP_DOT.u}`} style={{ left: `${x.x}%`, top: `${x.y}%` }} />
                  ))}
                </span>
                <span className="mt-2 flex items-center gap-1.5">
                  <span aria-hidden className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: z.color }} />
                  <span className="font-display font-bold text-guest-body text-navy-900 truncate">{z.name}</span>
                </span>
                <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-guest-caption font-semibold text-navy-900 ring-1 ring-slate-200 tnum">
                  {freeSlots.length ? `${freeSlots.length} ${tr("free")}${from !== null ? ` · ${tr("from")} ${euro(from)}` : ""}` : tr("Full")}
                </span>
                {n > 0 && <span className="absolute -top-2 -right-2 min-w-6 h-6 px-1.5 rounded-full bg-coral-700 text-white text-guest-caption font-bold grid place-items-center ring-2 ring-white">{n}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StoreClusters({ days, selectedId, onPick, flipEnter, picked }: { days: string[]; selectedId: string; onPick: (id: string) => void; flipEnter: string | null; picked: Record<string, number> }) {
  const tr = useT();
  const { zoneLogos } = useApp();
  const liveSlots = useLiveSlots();
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  // Layout effect: the first measure must land before paint so the zoom-out
  // FLIP (deferred one frame by the wizard) finds the clusters at final size.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); setBox({ w: Math.round(r.width), h: Math.round(r.height) }); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Entrance — GSAP instead of a CSS class so it can't re-trigger on re-render.
  // Runs once the measured positions exist; when the camera is zooming back out
  // (`flipEnter`), that zone's cluster appears instantly so its beds can FLIP.
  const entered = useRef(false);
  const hasPositions = box.w > 0 && box.h > 0;
  useLayoutEffect(() => {
    if (entered.current || !hasPositions || !ref.current) return;
    entered.current = true;
    if (!motionOK()) return;
    const targets = ref.current.querySelectorAll(
      flipEnter ? `[data-cluster]:not([data-cluster="${flipEnter}"])` : "[data-cluster]",
    );
    gsap.from(targets, { opacity: 0, scale: 0.94, y: 10, duration: 0.5, ease: EASE.out, stagger: 0.06, delay: flipEnter ? 0.1 : 0 });
  }, [hasPositions, flipEnter]);

  // Big enough to fill the open beach, small enough that six sit side by side.
  const cw = clampN(Math.min(box.w * 0.155, box.w / (ZONES.length + 0.6)), 120, 290);
  const plotH = cw * 0.86;
  const ch = plotH + 46; // + the name/logo band on the sand
  const glyph = clampN(cw * 0.12, 16, 40);

  const positions = useMemo(() => {
    if (!box.w || !box.h) return [];
    // Every zone in one front row along the water (AENR-668), in beach order, evenly
    // across the whole width (this also keeps them right under the shoreline, AENR-667).
    const order = [...ZONES].sort((a, b) => parseFloat(ZONE_BLOCKS.find((x) => x.id === a.id)?.left ?? "50") - parseFloat(ZONE_BLOCKS.find((x) => x.id === b.id)?.left ?? "50"));
    const gap = box.w / ZONES.length;
    // Centred in the open sand between the shoreline and the guidance bar (AENR-670).
    return ZONES.map((z) => ({ x: gap * (order.indexOf(z) + 0.5), y: Math.max(ch / 2 + 4, box.h / 2) }));
  }, [box, ch]);

  return (
    <div ref={ref} className="absolute inset-0">
      {ZONES.map((z, i) => {
        const pos = positions[i];
        if (!pos) return null;
        const slots = liveSlots(z, days);
        const free = slots.filter((s) => s.state === "a").length;
        const from = Math.min(...slots.filter((s) => s.state === "a").map((s) => s.price), Infinity);
        const fromLabel = Number.isFinite(from) ? from : z.from;
        const logo = zoneLogos[z.id];
        const active = z.id === selectedId;
        return (
          <button
            key={z.id}
            data-cluster={z.id}
            onClick={() => onPick(z.id)}
            aria-pressed={active}
            aria-label={`${z.name} — ${slots.length} ${tr("sets")}, ${free} ${tr("free")}, ${tr("from")} €${fromLabel}${picked[z.id] ? `, ${picked[z.id]} ${tr("picked")}` : ""}${active ? `, ${tr("selected")}` : ""}`}
            className="absolute group focus:outline-none pointer-events-auto"
            style={{ left: pos.x - cw / 2, top: pos.y - ch / 2, width: cw }}
          >
            {/* Soft tint on the sand under the selected / hovered zone, so it
                reads as one beach section without a hard card edge. */}
            <span aria-hidden className={`absolute left-1/2 -translate-x-1/2 top-0 rounded-[45%] blur-2xl transition-opacity duration-300 ${active ? "opacity-45" : "opacity-0"}`} style={{ width: "94%", height: plotH, background: ZONE_ACTIVE }} />

            {/* The zone's real umbrella rows, straight on the sand (no card).
                data-flip-id pairs each mini glyph with its big grid cell so the
                zoom-in/out FLIPs them as one continuous camera move. */}
            <span className={`relative block transition-transform duration-300 ease-spring group-hover:-translate-y-1.5 ${active ? "-translate-y-0.5" : ""}`} style={{ height: plotH }}>
              {slots.map((s) => (
                <span key={s.id} data-flip-id={s.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%`, top: `${s.y}%`, width: glyph, height: glyph }}>
                  <SunbedMark state={s.state} fill />
                </span>
              ))}
            </span>

            {/* Zone label set on the sand — logo + name + a line of detail. */}
            <span className="relative block text-center mt-0.5" data-cluster-label>
              {logo && <img src={logo} alt="" className="mx-auto mb-1 h-8 w-auto max-w-[82%] object-contain drop-shadow-[0_1px_2px_rgba(255,255,255,0.55)]" />}
              <span className={`block font-display font-bold text-guest-body tracking-wide transition-colors drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)] ${active ? "" : "text-navy-900 group-hover:text-teal-800"}`} style={active ? { color: ZONE_ACTIVE } : undefined}>{z.name}</span>
              <span className="block text-[10.5px] font-semibold tnum text-navy-800/80 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">{tr("from")} €{fromLabel} · {free} {tr("free")}</span>
            </span>

            {active && (
              <span className="absolute -top-1 right-2 w-5 h-5 rounded-full text-white grid place-items-center shadow ring-2 ring-white" style={{ background: ZONE_ACTIVE }}>
                <Icon.check size={12} />
              </span>
            )}
            {(picked[z.id] ?? 0) > 0 && (
              <span className="absolute -top-1 left-2 min-w-5 h-5 px-1.5 rounded-full bg-navy-900 text-white text-guest-caption font-bold grid place-items-center shadow ring-2 ring-white">{picked[z.id]} {tr("picked")}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* Compact zone cards — phones / tight screens. The same translucent glass
   material as the menu above, with the zone's logo/name, from-price and live
   availability, in a tidy two-column grid. A small zone-colour umbrella chip
   keeps the zones distinguishable. */
function StoreCards({ days, selectedId, onPick, picked }: { days: string[]; selectedId: string; onPick: (id: string) => void; picked: Record<string, number> }) {
  const tr = useT();
  const { zoneLogos } = useApp();
  const liveSlots = useLiveSlots();
  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar pointer-events-auto">
      <div className="grid grid-cols-2 gap-2.5 p-0.5">
        {ZONES.map((z) => {
          const active = z.id === selectedId;
          const logo = zoneLogos[z.id];
          const slots = liveSlots(z, days);
          const free = slots.filter((s) => s.state === "a").length;
        const from = Math.min(...slots.filter((s) => s.state === "a").map((s) => s.price), Infinity);
        const fromLabel = Number.isFinite(from) ? from : z.from;
          return (
            <button
              key={z.id}
              onClick={() => onPick(z.id)}
              aria-pressed={active}
              className={`glass-card relative rounded-2xl p-3 text-center transition animate-fade-up ${active ? "ring-2 ring-teal-500 scale-[1.02] shadow-lift" : "ring-1 ring-white/50 active:scale-[.98]"}`}
            >
              {logo ? (
                <img src={logo} alt="" className="mx-auto mb-1.5 h-9 w-auto max-w-[72%] object-contain" />
              ) : (
                <span className="mx-auto mb-1.5 w-9 h-9 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: z.color }}><Icon.umbrella size={18} /></span>
              )}
              <span className="block text-navy-900 font-bold text-guest-body leading-tight">{z.name}</span>
              <span className="block text-slate-600 text-guest-caption tnum mt-0.5">{tr("from")} €{fromLabel} · {free} {tr("free")}</span>
              {active && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-teal-500 text-white grid place-items-center shadow ring-2 ring-white">
                  <Icon.check size={12} />
                </span>
              )}
              {(picked[z.id] ?? 0) > 0 && (
                <span className="absolute top-2 left-2 h-5 px-1.5 rounded-full bg-navy-900 text-white text-guest-caption font-bold grid place-items-center shadow">{picked[z.id]} {tr("picked")}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Phones (AENR-693): the zones as a list inside the Where step — big rows with what
   matters for choosing (free sets, price from, your picks). */
function ZoneList({ days, selectedId, onPick, picked }: { days: string[]; selectedId: string; onPick: (id: string) => void; picked: Record<string, number> }) {
  const tr = useT();
  const { zoneLogos } = useApp();
  const liveSlots = useLiveSlots();
  const closure = useClosure();
  return (
    <section aria-labelledby="zone-list-h">
      <h2 id="zone-list-h" className="font-display font-bold text-navy-900 text-guest-head mb-0.5">{tr("Where would you like to sit?")}</h2>
      <p className="text-guest-meta text-slate-600 mb-2.5">{tr("Pick a zone — then choose your sets on the map.")}</p>
      <ul className="space-y-2">
        {ZONES.map((z) => {
          const slots = liveSlots(z, days);
          const freeSlots = slots.filter((s) => s.state === "a");
          const closed = days.map((d) => closure(z.id, d)).find(Boolean);
          const from = freeSlots.length ? Math.min(...freeSlots.map((s) => s.price)) : null;
          const off = !!closed || freeSlots.length === 0;
          const n = picked[z.id] ?? 0;
          const logo = zoneLogos[z.id];
          return (
            <li key={z.id}>
              <button type="button" onClick={() => onPick(z.id)} disabled={off}
                aria-label={`${z.name} — ${closed ? closed : off ? tr("full") : `${freeSlots.length} ${tr("free")}, ${tr("from")} €${from}`}${n ? `, ${n} ${tr("picked")}` : ""}`}
                className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 min-h-[64px] text-left ring-1 transition active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-60 disabled:active:scale-100 ${z.id === selectedId && n ? "bg-teal-50 ring-teal-400" : "bg-white/80 ring-slate-200 hover:ring-teal-400"}`}>
                {logo ? (
                  <img src={logo} alt="" className="h-10 w-10 object-contain shrink-0" />
                ) : (
                  <span className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0 shadow-sm" style={{ background: z.color }}><Icon.umbrella size={18} /></span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-navy-900 text-guest-body leading-tight">{z.name}</span>
                  <span className="block text-guest-meta text-slate-600 tnum">{closed ? closed : off ? tr("Full on this day") : `${freeSlots.length} ${tr("free")} · ${tr("from")} €${from}`}</span>
                </span>
                {n > 0 && <span className="h-6 px-2 rounded-full bg-navy-900 text-white text-guest-caption font-bold grid place-items-center shrink-0">{n} {tr("picked")}</span>}
                {!off && <Icon.chevR size={16} className="text-slate-500 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ============ Sand layer — umbrella sets ============
   The chosen zone's layout, drawn directly on the sand. Front row (small y) sits
   near the sea at the top; the back row toward the promenade. Each set is sized to
   its nearest neighbour so glyphs keep clear air and never collide. Cells carry
   data-flip-id (the zoom FLIP pairs them with the overview minis) and hand their
   element to onToggle so the pick effects can run from the tapped spot. */
/* ---- Price tiers and the spot sheet (AENR-568) ----
   Rows nearer the sea cost more; guests see the tier (colour + letter, never
   colour alone) and the price on every set before tapping. Tapping opens the
   spot sheet: row, metres to the sea, shade, what's included, the view, price. */
export type Tier = { key: "front" | "middle" | "back"; name: string; letter: string; color: string };
export const TIERS: Tier[] = [
  { key: "front", name: "Front row", letter: "F", color: "#0e7490" },
  { key: "middle", name: "Middle rows", letter: "M", color: "#b45309" },
  { key: "back", name: "Back rows", letter: "B", color: "#475569" },
];
export function tierInfo(slots: readonly SunbedSlot[]) {
  const rows = [...new Set(slots.map((s) => Math.round(s.y)))].sort((a, b) => a - b);
  return (s: SunbedSlot) => {
    const row = rows.indexOf(Math.round(s.y));
    const f = rows.length > 1 ? row / (rows.length - 1) : 0;
    const tier = row === 0 ? TIERS[0] : f < 0.67 ? TIERS[1] : TIERS[2];
    return { tier, row: row + 1, metres: 8 + row * 5 };
  };
}

function SpotView({ row, tier }: { row: number; tier: Tier }) {
  // A simple "view from the spot": the closer the row, the more sea you see.
  const sea = Math.max(18, 46 - (row - 1) * 6);
  const rowsInFront = Math.min(3, row - 1);
  return (
    <svg viewBox="0 0 320 140" className="w-full h-auto rounded-xl" role="img" aria-label={`View from the ${tier.name.toLowerCase()}: ${rowsInFront ? `${rowsInFront} row${rowsInFront === 1 ? "" : "s"} of umbrellas, then the sea` : "nothing between you and the sea"}`}>
      <rect width="320" height="140" fill="#e0f2fe" />
      <rect y={60 - sea / 2} width="320" height={sea} fill="#38bdf8" />
      <rect y={60 + sea / 2} width="320" height={140 - (60 + sea / 2)} fill="#f5deb3" />
      {Array.from({ length: rowsInFront }).flatMap((_, r) =>
        Array.from({ length: 5 }).map((__, i) => {
          const y = 60 + sea / 2 + 10 + r * 18;
          const x = 30 + i * 65 + (r % 2) * 30;
          return (
            <g key={`${r}-${i}`}>
              <line x1={x} y1={y} x2={x} y2={y + 16} stroke="#78350f" strokeWidth="2" />
              <path d={`M${x - 16} ${y} Q${x} ${y - 12} ${x + 16} ${y} Z`} fill={r % 2 ? "#fb923c" : "#f97316"} />
            </g>
          );
        }),
      )}
      <circle cx="270" cy="22" r="10" fill="#fde047" />
    </svg>
  );
}

/* A slim set card (AENR-707): the zone as the title, the view, and just the two facts that
   matter — the row and what the set includes. The price sits on the Select button. */
function SpotSheet({ zoneName, slot, info, selected, priceText, onClose, onSelect }: { zoneName: string; slot: SunbedSlot; info: ReturnType<ReturnType<typeof tierInfo>>; selected: boolean; priceText: string; onClose: () => void; onSelect: () => void }) {
  const tr = useT();
  const beds = slot.cap ?? 2;
  return (
    <Sheet open onClose={onClose} title={zoneName}
      footer={<><Btn variant="ghost" onClick={onClose}>{tr("Close")}</Btn><Btn variant={selected ? "outline" : "teal"} icon={selected ? Icon.x : Icon.check} onClick={onSelect}>{selected ? tr("Remove") : `${tr("Select")} · ${priceText}`}</Btn></>}>
      <div className="space-y-3 text-guest-meta">
        <SpotView row={info.row} tier={info.tier} />
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <dt className="text-guest-caption text-slate-500">{tr("Row")}</dt>
            <dd className="font-semibold text-navy-900 flex items-center gap-1.5">
              <span className="rounded px-1 text-guest-caption font-bold text-white" style={{ background: info.tier.color }} aria-hidden>{info.tier.letter}</span>
              {info.row} · {tr(info.tier.name)}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <dt className="text-guest-caption text-slate-500">{tr("Includes")}</dt>
            <dd className="font-semibold text-navy-900">{beds} {tr("sunbeds")} + 1 {tr("umbrella")}</dd>
          </div>
        </dl>
        <p className="text-guest-caption text-slate-500">{tr("Set")} {slot.id}{slot.access ? ` · ${tr("step-free access")}` : ""}</p>
      </div>
    </Sheet>
  );
}

function SandSunbeds({ slots, selected, onToggle, readOnly = false, tiles = false }: {
  slots: SunbedSlot[];
  selected: Set<string>;
  onToggle?: (s: SunbedSlot, el: HTMLElement | null) => void;
  readOnly?: boolean;
  /** Phones: modern set tiles fitted to the width (AENR-749) instead of umbrella glyphs. */
  tiles?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cells = useRef(new Map<string, HTMLElement>());
  const [box, setBox] = useState({ w: 0, h: 0 });
  // Layout effect: glyph size derives from this box, so it must settle before
  // paint for the zoom-in FLIP to capture the cells at their final size.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); setBox({ w: Math.round(r.width), h: Math.round(r.height) }); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const size = useMemo(() => {
    const base = Math.min(64, box.w * 0.085);
    if (slots.length < 2 || box.w === 0) return Math.max(28, base);
    let min = Infinity;
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const dx = ((slots[i].x - slots[j].x) / 100) * box.w;
        const dy = ((slots[i].y - slots[j].y) / 100) * box.h;
        min = Math.min(min, Math.hypot(dx, dy));
      }
    }
    return Math.max(26, Math.min(base, min * 0.84));
  }, [slots, box]);
  const tierOf = useMemo(() => tierInfo(slots), [slots]);
  const geo = useMemo(() => (tiles && box.w ? tileGeometry(slots, box.w) : null), [tiles, slots, box.w]);
  if (tiles) {
    return (
      <div ref={ref} className="absolute inset-0">
        {geo && slots.map((s) => {
          const at = tilePosition(s, geo, box.w, box.h);
          return (
            <div
              key={s.id}
              ref={(el) => { if (el) cells.current.set(s.id, el); else cells.current.delete(s.id); }}
              data-bed-cell
              data-flip-id={s.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              style={{ left: at.left, top: at.top, width: geo.w, height: geo.h }}
            >
              <SetTile state={s.state} sel={selected.has(s.id)} price={s.price} readOnly={readOnly}
                label={`${s.id}, ${tierOf(s).tier.name}${s.access ? " (step-free)" : ""}${s.inv ? ` — ${s.inv}` : ""}`}
                onClick={readOnly ? undefined : () => onToggle?.(s, cells.current.get(s.id) ?? null)} />
              {s.inv && <span aria-hidden title={s.inv} className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-navy-900 text-white text-[9px] grid place-items-center ring-2 ring-white pointer-events-none">🔒</span>}
              {s.access && <span aria-hidden className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-sky-600 text-white text-[9px] grid place-items-center ring-2 ring-white pointer-events-none">♿</span>}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div ref={ref} className="absolute inset-0">
      {slots.map((s) => (
        <div
          key={s.id}
          ref={(el) => { if (el) cells.current.set(s.id, el); else cells.current.delete(s.id); }}
          data-bed-cell
          data-flip-id={s.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: size, height: size }}
        >
          <Sunbed state={s.state} sel={selected.has(s.id)} price={s.price} label={`${s.id}, ${tierOf(s).tier.name}${s.access ? " (step-free)" : ""}${s.inv ? ` — ${s.inv}` : ""}`} fill readOnly={readOnly} onClick={readOnly ? undefined : () => onToggle?.(s, cells.current.get(s.id) ?? null)} />
          {!readOnly && s.state === "a" && size >= 30 && (
            <span aria-hidden className="absolute left-1/2 -translate-x-1/2 -bottom-2 rounded px-1 text-guest-caption font-bold leading-[13px] text-white whitespace-nowrap pointer-events-none shadow-sm" style={{ background: tierOf(s).tier.color }}>
              {tierOf(s).tier.letter} €{s.price}
            </span>
          )}
          {s.inv && <span aria-hidden title={s.inv} className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-navy-900 text-white text-guest-caption grid place-items-center ring-2 ring-white pointer-events-none">🔒</span>}
          {s.access && <span aria-hidden className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-600 text-white text-guest-caption grid place-items-center ring-2 ring-white pointer-events-none">♿</span>}
        </div>
      ))}
    </div>
  );
}

/* The phone map's top row (AENR-749): what the tiles mean, and one zoom toggle —
   fitted (every set on screen) or zoomed in (bigger tiles, pan to move). */
function TileMapBar({ zoom, fit, setZoom }: { zoom: number; fit: number; setZoom: (z: number) => void }) {
  const tr = useT();
  const zoomed = zoom > fit + 0.01;
  return (
    <div className="flex items-center justify-between gap-2 pb-2 shrink-0">
      <div className="rounded-full glass px-3 py-1.5"><SetTileLegend /></div>
      <button type="button" onClick={() => setZoom(zoomed ? fit : 1.5)} aria-pressed={zoomed}
        className="shrink-0 w-11 h-11 grid place-items-center rounded-full glass text-navy-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        aria-label={zoomed ? tr("Fit the map to the screen") : tr("Zoom in")}>
        {zoomed ? <Icon.minus size={17} /> : <Icon.plus size={17} />}
      </button>
    </div>
  );
}

/* ============ Guests ============ */
function PeopleStep({ tickets: TICKET, people, setPeople, includeTickets, setIncludeTickets, pickedSets, autoFilled, onPreset, usualParty }: {
  tickets: TicketInfo;
  people: People;
  setPeople: Dispatch<SetStateAction<People>>;
  includeTickets: boolean;
  setIncludeTickets: Dispatch<SetStateAction<boolean>>;
  pickedSets: number;
  /** True while the headcount is still the auto pre-fill (untouched by the guest). */
  autoFilled: boolean;
  onPreset: (v: People) => void;
  /** The party from their last booking (AENR-613), offered first. */
  usualParty: People | null;
}) {
  const tr = useT();
  const totalPeople = Object.values(people).reduce((a, b) => a + b, 0);
  const same = (a: People, b: People) => Object.keys({ ...a, ...b }).every((k) => (a[k] ?? 0) === (b[k] ?? 0));
  const isUsual = !!usualParty && same(people, usualParty);
  const presets = [
    ...(usualParty ? [{ id: "usual", label: tr("Your usual"), sub: partyLabel(usualParty, Object.fromEntries(Object.entries(TICKET).map(([k, t]) => [k, t.label.toLowerCase()])), tr), v: usualParty }] : []),
    // Plain adult counts (AENR-713): Solo, Adult ×2, ×3, ×4.
    { id: "solo", label: tr("Solo"),     sub: tr("1 adult"),  v: { adult: 1, resident: 0, child: 0, senior: 0 } },
    { id: "a2",   label: `${tr("Adult")} ×2`, sub: tr("2 adults"), v: { adult: 2, resident: 0, child: 0, senior: 0 } },
    { id: "a3",   label: `${tr("Adult")} ×3`, sub: tr("3 adults"), v: { adult: 3, resident: 0, child: 0, senior: 0 } },
    { id: "a4",   label: `${tr("Adult")} ×4`, sub: tr("4 adults"), v: { adult: 4, resident: 0, child: 0, senior: 0 } },
  ];
  return (
    <div className="space-y-4">
      <div>
        <div className="text-guest-over font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{tr("Quick picks")}</div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const match = p.id === "usual" ? isUsual : !(isUsual && usualParty && same(p.v, usualParty)) && same(p.v, people);
            return (
              <button key={p.id} onClick={() => onPreset(p.v)}
                className={`text-left rounded-xl px-3 py-2 ring-1 transition ${match ? "bg-navy-900 text-white ring-navy-900" : "bg-white/70 ring-slate-200 hover:ring-teal-400"}`}>
                <div className="text-guest-meta font-semibold leading-tight">{p.label}</div>
                <div className={`text-guest-caption leading-tight ${match ? "text-white/70" : "text-slate-500"}`}>{p.sub}</div>
              </button>
            );
          })}
          {/* Entry-tickets toggle sits inline, right after the quick picks. */}
          <button onClick={() => setIncludeTickets((v) => !v)} aria-pressed={includeTickets}
            className={`relative text-left rounded-xl pl-3 pr-9 py-2 ring-1 transition ${includeTickets ? "bg-teal-50 ring-teal-500" : "bg-white/70 ring-slate-200 hover:ring-teal-400"}`}>
            <div className="text-guest-meta font-semibold leading-tight text-navy-900 flex items-center gap-1.5"><Icon.ticket size={13} className={includeTickets ? "text-teal-600" : "text-slate-500"} /> {tr("Add Entry tickets")}</div>
            <div className="text-guest-caption leading-tight text-slate-500">{tr("One ticket per guest")}</div>
            <span className={`absolute top-1/2 -translate-y-1/2 right-2 w-5 h-5 rounded-full grid place-items-center ${includeTickets ? "bg-teal-600 text-white" : "ring-1 ring-slate-300 text-slate-500"}`}>
              {includeTickets ? <Icon.check size={12} /> : <Icon.plus size={12} />}
            </span>
          </button>
        </div>
      </div>

      {isUsual && (
        <div className="rounded-xl ring-1 ring-teal-200 bg-teal-50/70 px-3 py-2 flex items-start gap-2 text-guest-meta text-navy-900 animate-fade-up">
          <Icon.group size={14} className="text-teal-600 shrink-0 mt-0.5" />
          <span>{tr("Same people as last time.")} {tr("Change the headcount below if someone else is coming.")}</span>
        </div>
      )}
      {autoFilled && pickedSets > 0 && (
        <div className="rounded-xl ring-1 ring-teal-200 bg-teal-50/70 px-3 py-2 flex items-start gap-2 text-guest-meta text-navy-900 animate-fade-up">
          <Icon.ticket size={14} className="text-teal-600 shrink-0 mt-0.5" />
          <span>{tr("We pre-filled")} <b>{pickedSets * 2} {tr("entry tickets")}</b> — {tr("2 per set. Change the headcount below if you need to.")}</span>
        </div>
      )}

      <div>
        <div className="text-guest-over font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{tr("Headcount by category")}</div>
        <div className="space-y-1.5">
          {Object.keys(TICKET).map((k) => {
            const t = TICKET[k];
            return (
              <div key={k} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="font-semibold text-guest-body text-navy-900">{tr(t.label)}</div>
                  <div className="text-guest-caption text-slate-500">€{t.price} {tr("entry")}{t.sub ? ` · ${tr(t.sub)}` : ""}</div>
                </div>
                <Stepper label={tr(t.label)} value={people[k] ?? 0} onChange={(v) => setPeople((p) => ({ ...p, [k]: v }))} />
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-guest-caption text-slate-500 flex items-start gap-1.5"><Icon.shield size={12} className="shrink-0 mt-0.5" /> {tr("Child tickets record only the type and count — no names or dates of birth.")}</p>
      </div>

      {pickedSets > 0 && (
        <div className={`rounded-xl ring-1 px-3 py-2.5 flex items-start gap-2.5 ${totalPeople > pickedSets * 2 ? "ring-amber-300 bg-amber-50/80" : "ring-teal-200 bg-teal-50/70"}`}>
          <span className={`w-8 h-8 rounded-lg text-white grid place-items-center shrink-0 ${totalPeople > pickedSets * 2 ? "bg-amber-500" : "bg-teal-600"}`}><Icon.umbrella size={15} /></span>
          <div className="text-guest-meta leading-snug text-navy-900">
            {tr("You picked")} <b>{pickedSets} {pickedSets !== 1 ? tr("umbrella sets") : tr("umbrella set")}</b> — {tr("seats up to")} <b>{pickedSets * 2}</b>.{" "}
            {totalPeople > pickedSets * 2
              ? tr("That's fewer seats than guests — add a set on the Beach step if you need more.")
              : tr("Each set seats 2 (umbrella + 2 sunbeds).")}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Locker ============ */
function LockerStep({ on, setOn, scope, setScope, days, setDays, qty, setQty, selDates, multiDate, banks, bank, setBank }: {
  banks: LockerChoice[];
  bank: string;
  setBank: (id: string) => void;
  on: boolean;
  setOn: Dispatch<SetStateAction<boolean>>;
  scope: DayScope;
  setScope: Dispatch<SetStateAction<DayScope>>;
  days: string[];
  setDays: Dispatch<SetStateAction<string[]>>;
  qty: number;
  setQty: Dispatch<SetStateAction<number>>;
  selDates: string[];
  multiDate: boolean;
}) {
  const tr = useT();
  const activeDays = multiDate && scope === "some" ? days : selDates;
  const n = activeDays.length;
  const cur = banks.find((b) => b.id === bank) ?? banks[0];
  const LOCKER_PRICE = cur?.price ?? 0;
  const paused = banks.length > 0 && banks.every((b) => b.avail === null);
  const choose = (mode: "all" | "some" | "off") => {
    if (mode === "off") { setOn(false); return; }
    setOn(true);
    setScope(mode);
    if (mode === "some" && days.length === 0) setDays([...selDates]); // start from all chosen days
  };
  if (paused)
    return (
      <div role="status" className="rounded-xl ring-1 ring-amber-300 bg-amber-50/80 px-3 py-3 text-guest-meta text-amber-900 flex items-start gap-2">
        <Icon.alert size={15} className="shrink-0 mt-0.5" /> {tr("Lockers can't be booked online right now — ask at the entrance.")}
      </div>
    );
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label={tr("Locker type")} className="grid sm:grid-cols-3 gap-2">
        {banks.map((b) => {
          const none = b.avail === 0;
          return (
            <button key={b.id} type="button" role="radio" aria-checked={bank === b.id} disabled={none} onClick={() => { setBank(b.id); setOn(true); }}
              className={`text-left rounded-xl px-3 py-2 ring-1 transition disabled:opacity-50 disabled:cursor-not-allowed ${bank === b.id ? "bg-teal-50 ring-teal-500" : "bg-white/70 ring-slate-200 hover:ring-teal-400"}`}>
              <div className="text-guest-meta font-semibold text-navy-900">{b.name}</div>
              <div className="text-guest-caption text-slate-500">€{b.price}/{tr("day")} · {none ? tr("Sold out") : `${b.avail} ${tr("left")}`}</div>
            </button>
          );
        })}
      </div>
      {multiDate ? (
        <div className="grid sm:grid-cols-3 gap-2">
          <YesNo on={on && scope === "all"} onClick={() => choose("all")} title={tr("Yes — all days")} sub={`${selDates.length} ${selDates.length !== 1 ? tr("days") : tr("day")} · €${LOCKER_PRICE}/day`} icon={Icon.lock} />
          <YesNo on={on && scope === "some"} onClick={() => choose("some")} title={tr("Yes — specific days")} sub={tr("Pick which days")} icon={Icon.calendar} />
          <YesNo on={!on} onClick={() => choose("off")} title={tr("No, skip lockers")} sub={tr("Continue without")} icon={Icon.x} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <YesNo on={on} onClick={() => choose("all")} title={tr("Yes, add lockers")} sub={`€${LOCKER_PRICE}/locker/day`} icon={Icon.lock} />
          <YesNo on={!on} onClick={() => choose("off")} title={tr("No, skip lockers")} sub={tr("Continue without")} icon={Icon.x} />
        </div>
      )}
      {on && multiDate && scope === "some" && (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5 animate-pop">
          <div className="text-guest-over font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5"><Icon.calendar size={12} /> {tr("Which days?")}</div>
          <DayChips days={selDates} value={days} onChange={setDays} />
        </div>
      )}
      {on && (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5 flex items-center justify-between animate-pop">
          <div>
            <div className="font-semibold text-guest-body text-navy-900">{tr("How many lockers?")}</div>
            <div className="text-guest-caption text-slate-500">{qty} × €{LOCKER_PRICE} × {n} {n !== 1 ? tr("days") : tr("day")}</div>
          </div>
          <Stepper label={tr("lockers")} value={qty} onChange={(v) => setQty(Math.max(1, Math.min(cur?.avail ?? v, v)))} min={1} />
        </div>
      )}
      <div className="text-guest-caption text-slate-500 flex items-center gap-1.5">
        <Icon.info size={13} /> {tr("Pick exact lockers later from the My Bookings")} QR.
      </div>
    </div>
  );
}

/* Toggleable day chips — choose which of the chosen trip days a service covers. */
function DayChips({ days, value, onChange }: { days: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const tr = useT();
  const { lang } = useApp();
  const loc = localeFor(lang);
  const toggle = (iso: string) => onChange(value.includes(iso) ? value.filter((x) => x !== iso) : [...value, iso].sort());
  return (
    <div className="flex flex-wrap gap-1.5">
      {days.map((iso) => {
        const c = chipLabel(iso, loc, tr);
        const on = value.includes(iso);
        return (
          <button key={iso} type="button" onClick={() => toggle(iso)} aria-pressed={on}
            className={`rounded-xl px-3 py-1.5 ring-1 text-center transition ${on ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 hover:ring-teal-400"}`}>
            <span className="block text-guest-caption font-semibold leading-tight">{c.label}</span>
            <span className={`block text-guest-caption leading-tight ${on ? "text-white/70" : "text-slate-500"}`}>{c.sub}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============ Parking ============ */
function ParkingStep({ on, setOn, qty, setQty, scope, setScope, days, setDays, plates, setPlates, spotPlates, setSpotPlates, samePlate, setSamePlate, selDates, multiDate }: {
  on: boolean;
  setOn: Dispatch<SetStateAction<boolean>>;
  qty: number;
  setQty: Dispatch<SetStateAction<number>>;
  scope: DayScope;
  setScope: Dispatch<SetStateAction<DayScope>>;
  days: string[];
  setDays: Dispatch<SetStateAction<string[]>>;
  plates: Record<string, string>;
  setPlates: Dispatch<SetStateAction<Record<string, string>>>;
  spotPlates: string[];
  setSpotPlates: Dispatch<SetStateAction<string[]>>;
  samePlate: boolean;
  setSamePlate: Dispatch<SetStateAction<boolean>>;
  selDates: string[];
  multiDate: boolean;
}) {
  const tr = useT();
  const { lang } = useApp();
  const loc = localeFor(lang);
  const activeDays = multiDate && scope === "some" ? days : selDates;
  const n = activeDays.length;
  const choose = (mode: "all" | "some" | "off") => {
    if (mode === "off") { setOn(false); return; }
    setOn(true);
    setScope(mode);
    if (mode === "some" && days.length === 0) setDays([...selDates]);
  };
  const setPlate = (iso: string, v: string) => setPlates((p) => ({ ...p, [iso]: v.toUpperCase() }));
  // One plate for the whole trip — write it to every chosen day so any parked day is covered.
  const writeShared = (v: string) => setPlates((p) => { const u = v.toUpperCase(); const next = { ...p }; selDates.forEach((d) => { next[d] = u; }); return next; });
  const setSpotPlate = (i: number, v: string) =>
    setSpotPlates((s) => { const next = [...s]; next[i] = v.toUpperCase(); return next; });
  // Growing to several spots seeds spot 1 from the single-spot plate, so the
  // guest never re-types the car they already entered.
  const changeQty = (v: number) => {
    const next = Math.max(1, v);
    setQty(next);
    if (next > 1) setSpotPlates((s) => (s[0] ? s : [plates[selDates[0]] || "", ...s.slice(1)]));
  };
  return (
    <div className="space-y-3">
      {multiDate ? (
        <div className="grid sm:grid-cols-3 gap-2">
          <YesNo on={on && scope === "all"} onClick={() => choose("all")} title={tr("Yes — all days")} sub={`${selDates.length} ${selDates.length !== 1 ? tr("days") : tr("day")} · €${PARKING_PRICE}/day`} icon={Icon.car} />
          <YesNo on={on && scope === "some"} onClick={() => choose("some")} title={tr("Yes — specific days")} sub={tr("Pick which days")} icon={Icon.calendar} />
          <YesNo on={!on} onClick={() => choose("off")} title={tr("No, skip parking")} sub={tr("Walking or public transport")} icon={Icon.x} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <YesNo on={on} onClick={() => choose("all")} title={tr("Yes, reserve parking")} sub={`€${PARKING_PRICE}/spot/day`} icon={Icon.car} />
          <YesNo on={!on} onClick={() => choose("off")} title={tr("No, skip parking")} sub={tr("Walking or public transport")} icon={Icon.x} />
        </div>
      )}
      {on && multiDate && scope === "some" && (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5 animate-pop">
          <div className="text-guest-over font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5"><Icon.calendar size={12} /> {tr("Which days?")}</div>
          <DayChips days={selDates} value={days} onChange={setDays} />
        </div>
      )}
      {on && (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5 flex items-center justify-between animate-pop">
          <div>
            <div className="font-semibold text-guest-body text-navy-900">{tr("How many spots?")}</div>
            <div className="text-guest-caption text-slate-500">{qty} × €{PARKING_PRICE} × {n} {n !== 1 ? tr("days") : tr("day")}</div>
          </div>
          <Stepper label={tr("parking spots")} value={qty} onChange={changeQty} min={1} />
        </div>
      )}
      {/* Several spots = several cars: one plate per spot, valid every parked
          day. The per-day plate matrix below stays for the single-spot case. */}
      {on && qty > 1 && (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-3 animate-pop space-y-2.5">
          <div className="text-guest-over font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><Icon.car size={12} /> {tr("Vehicle plate per spot")}</div>
          {Array.from({ length: qty }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-guest-caption font-semibold text-navy-900 w-24 shrink-0">{tr("Spot")} {i + 1}</span>
              <Input value={spotPlates[i] || ""} onChange={(e) => setSpotPlate(i, e.target.value)} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" />
            </div>
          ))}
          <div className="flex items-center justify-between text-guest-caption text-slate-600 pt-1.5 border-t border-slate-100">
            <span>{qty} {tr("spots")} × {n} {n !== 1 ? tr("days") : tr("day")} × €{PARKING_PRICE}</span>
            <span className="font-semibold text-navy-900 tnum">€{qty * PARKING_PRICE * n}</span>
          </div>
        </div>
      )}
      {on && qty === 1 && (multiDate ? (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-3 animate-pop space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-guest-over font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><Icon.car size={12} /> {samePlate ? tr("Vehicle plate") : tr("Vehicle plate per day")}</div>
            <label className="flex items-center gap-2 text-guest-caption font-semibold text-navy-900 cursor-pointer shrink-0">
              {tr("Same car plate")}
              <Toggle on={samePlate} onChange={(v) => { setSamePlate(v); if (v) writeShared(plates[activeDays[0]] ?? plates[selDates[0]] ?? ""); }} ariaLabel={tr("Same car plate")} />
            </label>
          </div>
          {activeDays.length === 0 ? (
            <div className="text-guest-caption text-slate-500">{tr("Pick at least one day above.")}</div>
          ) : samePlate ? (
            <Input value={plates[selDates[0]] || ""} onChange={(e) => writeShared(e.target.value)} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" />
          ) : activeDays.map((iso) => {
            const c = chipLabel(iso, loc, tr);
            return (
              <div key={iso} className="flex items-center gap-2">
                <span className="text-guest-caption font-semibold text-navy-900 w-24 shrink-0 leading-tight">{c.label}<span className="block text-guest-caption text-slate-500 font-normal">{c.sub}</span></span>
                <Input value={plates[iso] || ""} onChange={(e) => setPlate(iso, e.target.value)} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" />
              </div>
            );
          })}
          <div className="flex items-center justify-between text-guest-caption text-slate-600 pt-1.5 border-t border-slate-100">
            <span>{activeDays.length} {activeDays.length !== 1 ? tr("days") : tr("day")} × €{PARKING_PRICE}</span>
            <span className="font-semibold text-navy-900 tnum">€{PARKING_PRICE * activeDays.length}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-3 animate-pop">
          <Field label={tr("Vehicle plate")} hint={tr("Used by the gate camera to let you in automatically.")}>
            <Input value={plates[selDates[0]] || ""} onChange={(e) => setPlate(selDates[0], e.target.value)} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" />
          </Field>
          <div className="mt-2 flex items-center justify-between text-guest-caption text-slate-600">
            <span>{tr("1 spot")} × {selDates.length} {selDates.length !== 1 ? tr("days") : tr("day")}</span>
            <span className="font-semibold text-navy-900 tnum">€{PARKING_PRICE * selDates.length}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function YesNo({ on, title, sub, icon: IconC, onClick }: { on: boolean; title: ReactNode; sub: ReactNode; icon: IconRenderer; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1 transition text-left ${on ? "ring-teal-500 bg-teal-50" : "ring-slate-200 bg-white/70 hover:ring-teal-400"}`}>
      <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${on ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}>
        <IconC size={17} />
      </span>
      <span className="min-w-0">
        <span className="block text-guest-meta font-semibold text-navy-900 leading-tight">{title}</span>
        <span className="block text-guest-caption text-slate-600 leading-tight">{sub}</span>
      </span>
    </button>
  );
}

/* ============ Review ============ */
function ReviewStep({ people, totalPeople, selDates, zone, bedSel = [], includeTickets, ticketBreak, lockerOn, lockerQty, lockerDates, parkingOn, parkingQty, parkingDates, plates, spotPlates, onJump }: {
  people: People;
  totalPeople: number;
  selDates: string[];
  dayCount: number;
  zone: WizardZone;
  bedSel?: BedPick[];
  includeTickets: boolean;
  ticketBreak: TicketBreakItem[];
  lockerOn: boolean;
  lockerQty: number;
  lockerDates: string[];
  parkingOn: boolean;
  parkingQty: number;
  parkingDates: string[];
  plates: Record<string, string>;
  spotPlates: string[];
  onJump: (id: string) => void;
}) {
  const tr = useT();
  const { lang } = useApp();
  const loc = localeFor(lang);
  const platesUsed = parkingQty > 1
    ? [...new Set(spotPlates.slice(0, parkingQty).filter(Boolean))]
    : [...new Set(parkingDates.map((d) => plates[d]).filter(Boolean))];
  const plateSummary = platesUsed.length === 0 ? tr("plate pending") : platesUsed.join(", ");
  const first = chipLabel(selDates[0], loc, tr);
  const dateLabel = selDates.length === 1
    ? first.label + ", " + first.sub
    : `${selDates.length} ${tr("days")} (${selDates.map((d) => chipLabel(d, loc).sub).join(", ")})`;
  // Per zone, how many sets — the set codes stay on the map (AENR-714); grouped by zone when the booking spans several (AENR-524).
  const byStore = [...new Set(bedSel.map((b) => b.zoneId))].map((zid) => ({ name: ZONES.find((z) => z.id === zid)?.name ?? zone.name, n: bedSel.filter((b) => b.zoneId === zid).length }));
  const ticketCount = ticketBreak.reduce((a, b) => a + b.n, 0);
  return (
    <div className="space-y-2.5">
      {/* Order (AENR-714): when, where, who — then any extras. */}
      <ReviewRow icon={Icon.calendar} title={tr("Dates")} onEdit={() => onJump("when")}>{dateLabel}</ReviewRow>
      <ReviewRow icon={Icon.umbrella} title={tr("Beach")} onEdit={() => onJump("beach")}>
        {bedSel.length > 0
          ? byStore.map((g) => <span key={g.name} className="block"><b className="font-semibold text-navy-900">{g.name}</b> · {g.n} {g.n !== 1 ? tr("umbrella sets") : tr("umbrella set")}</span>)
          : tr("No sunbeds — entry only")}
      </ReviewRow>
      <ReviewRow icon={Icon.group} title={tr("Guests & entry tickets")} onEdit={() => onJump("people")}>
        <span className="block">{totalPeople > 0 ? `${totalPeople} ${totalPeople !== 1 ? tr("guests") : tr("guest")} · ${humanPeople(people, tr)}` : tr("None added")}</span>
        <span className="block">{includeTickets && ticketCount > 0 ? `${ticketCount} ${ticketCount !== 1 ? tr("entry tickets included") : tr("entry ticket included")}` : tr("Entry tickets not included")}</span>
      </ReviewRow>
      {/* Locker and parking show here once added; "Add a locker or parking" below adds them (AENR-612) — only when the beach sells them (AENR-696). */}
      {lockerOn && lockerDates.length > 0 && (
        <ReviewRow icon={Icon.lock} title={tr("Day locker")} onEdit={() => onJump("locker")}>{`${lockerQty} ${lockerQty !== 1 ? tr("lockers") : tr("locker")} · ${lockerDates.length} ${lockerDates.length !== 1 ? tr("days") : tr("day")}`}</ReviewRow>
      )}
      {parkingOn && parkingDates.length > 0 && (
        <ReviewRow icon={Icon.car} title={tr("Parking Spot")} onEdit={() => onJump("parking")}>
          {`${parkingQty} ${parkingQty !== 1 ? tr("spots") : tr("spot")} · ${parkingDates.length} ${parkingDates.length !== 1 ? tr("days") : tr("day")} · ${plateSummary}`}
        </ReviewRow>
      )}
    </div>
  );
}

/* One Pay-step tile (AENR-714): a clear icon, the title and what was chosen in full (no truncation), and a 44px Edit. */
function ReviewRow({ icon: IconC, title, children, onEdit }: { icon: IconRenderer; title: string; children: ReactNode; onEdit: () => void }) {
  const tr = useT();
  return (
    <div className="flex items-center gap-3.5 rounded-2xl ring-1 ring-slate-200 bg-white/80 px-3.5 py-3">
      <span className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 grid place-items-center shrink-0"><IconC size={20} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-guest-body font-semibold text-navy-900 leading-tight">{title}</div>
        <div className="mt-0.5 text-guest-meta text-slate-600 leading-snug">{children}</div>
      </div>
      <button type="button" onClick={onEdit} aria-label={`${tr("Edit")} ${title}`} className="shrink-0 min-h-[44px] px-3 rounded-xl text-guest-meta font-semibold text-teal-700 hover:text-teal-800 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{tr("Edit")}</button>
    </div>
  );
}

function humanPeople(p: People, tr: (s: string) => string = (s) => s) {
  const parts = [];
  if (p.adult)    parts.push(`${p.adult} ${tr(p.adult !== 1 ? "adults" : "adult")}`);
  if (p.resident) parts.push(`${p.resident} ${tr(p.resident !== 1 ? "residents" : "resident")}`);
  if (p.child)    parts.push(`${p.child} ${tr(p.child !== 1 ? "children" : "child")}`);
  if (p.senior)   parts.push(`${p.senior} ${tr(p.senior !== 1 ? "seniors" : "senior")}`);
  return parts.join(", ") || "—";
}

/* Renders an integer euro amount, smoothly tweened on change. */
function LiveEuro({ value }: { value: number }) {
  const display = useAnimatedNumber(value);
  // Cents when the total has them, so it reads exactly like checkout (AENR-569).
  const cents = Math.round(value * 100) % 100 !== 0;
  return <span className="tnum">{cents ? display.toFixed(2) : Math.round(display).toLocaleString()}</span>;
}
