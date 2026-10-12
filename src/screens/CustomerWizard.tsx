import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Icon } from "../lib/icons";
import type { IconRenderer } from "../lib/icons";
import { Btn, Badge, Stepper, Input, Field, DatePickerRow, Toggle, Modal } from "../components/ui";
import { prefersReducedMotion } from "../lib/motion";
import { gsap, Flip, motionOK, stashFlip, EASE } from "../lib/fx";
import { Sunbed, SunbedMark } from "../components/Beach";
import { SandScene } from "../components/SandScene";
import { ZONES, ZONE_BLOCKS, todayISO, chipLabel } from "../data/beach";
import { useLiveSlots } from "../lib/useLiveSlots";
import { checkRestrictions, dateBlock, resolvePrice } from "../domain/pricing";
import { stopSellFor } from "../domain/inventory";
import { LANDMARK_LABEL } from "../data/pricing";
import type { Landmark, SunbedSlot } from "../domain/types";
import { useApp, useSpotlight, useT } from "../app/store";
import { localeFor } from "../app/i18n";
import { PARKING_PRICE } from "../domain/pricing";
import { useExtras } from "../lib/useExtras";
import { useSiteStatus } from "../lib/usePlatform";

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

const STEPS = [
  { id: "beach",   label: "Beach",    icon: "umbrella", sub: "Pick your zone, sunbeds & days" },
  { id: "people",  label: "Guests",   icon: "group",    sub: "Tell us who's coming" },
  { id: "locker",  label: "Locker",   icon: "lock",     sub: "Add a day locker (optional)", optional: true },
  { id: "parking", label: "Parking Spot", icon: "car", sub: "Reserve a spot (optional)",    optional: true },
  { id: "review",  label: "Review",   icon: "checkCircle", sub: "Confirm & checkout" },
];

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
   When a store cluster is tapped, the overview unmounts immediately so the
   picked zone's umbrellas can FLIP into the full grid. The *other* clusters
   (and the picked one's name label) would vanish abruptly — so they're cloned
   at their viewport rects into a throwaway fixed layer and drift away from the
   picked store while fading. Pure snapshots: no reflow, no React. */
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
          <h1 className="mt-3 font-display font-bold text-xl text-navy-900">{site.tenant?.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{site.message}</p>
          <p className="mt-1 text-[12.5px] text-slate-500">Bookings you already have stay valid — show your QR at the entrance.</p>
          <Btn variant="teal" className="mt-4" icon={Icon.grid} onClick={() => go("customer", "mybookings")}>My bookings</Btn>
        </div>
      </div>
    );
  return <WizardInner />;
}

function WizardInner() {
  const tr = useT();
  const { go, toast, addToCart, hint, lang, beachPricing, priceRules, calendar, inventory } = useApp();
  useSpotlight("customer", "plan");

  // Deep-link: a Home tile can open the wizard straight at a given step.
  const initialStep = useMemo(() => {
    if (hint && hint.persona === "customer" && hint.page === "plan" && hint.step) {
      const i = STEPS.findIndex((s) => s.id === hint.step);
      if (i >= 0) return i;
    }
    return 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [stepIdx, setStepIdx] = useState(initialStep);
  const [people, setPeople] = useState<People>({ adult: 0, resident: 0, child: 0, senior: 0 });
  const [includeTickets, setIncludeTickets] = useState(true);
  // Track whether the guest has hand-edited the headcount. Until they do, we
  // pre-fill it from the chosen sets (2 entry tickets per set — see below).
  const [peopleTouched, setPeopleTouched] = useState(false);
  const [selDates, setSelDates] = useState([todayISO()]);
  const [multiDate, setMultiDate] = useState(false);
  const [zoneId, setZoneId] = useState("central");
  // Explicit umbrella-set picks — the single source of truth for sunbeds
  // (zone-scoped; cleared when the zone changes).
  const [bedSel, setBedSel] = useState<BedPick[]>([]);
  // Opt-in: combine sets from several stores in one booking (AENR-524).
  const [multiStore, setMultiStore] = useState(false);
  const multiStoreRef = useRef(false);
  useEffect(() => { multiStoreRef.current = multiStore; }, [multiStore]);
  const [lockerOn, setLockerOn] = useState(false);
  const [lockerQty, setLockerQty] = useState(1);
  const [lockerScope, setLockerScope] = useState<DayScope>("all");
  const [lockerDays, setLockerDays] = useState<string[]>([]);
  const [lockerBank, setLockerBank] = useState("A");
  const [parkingOn, setParkingOn] = useState(false);
  const [parkingQty, setParkingQty] = useState(1);
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
  const [phase, setPhase] = useState<BeachPhase>("zones");
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
  // …unless the guest opted into several stores, then picks are kept per store.
  useEffect(() => { if (!multiStoreRef.current) setBedSel([]); }, [zoneId]);

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
  const lockerDates = lockerOn ? (multiDate && lockerScope === "some" ? lockerDays : selDates) : [];
  const parkingDates = parkingOn ? (multiDate && parkingScope === "some" ? parkingDays : selDates) : [];

  // The admin-authored layout for this zone, if any — otherwise the default grid.
  // …with the live status for the chosen dates applied: sets sold at the till
  // or held in a till basket aren't bookable online (AENR-520).
  const liveSlots = useLiveSlots();
  const slots = useMemo(() => liveSlots(zone, selDates), [liveSlots, zone, selDates]);
  const selectedIds = useMemo(() => new Set(bedSel.filter((b) => b.zoneId === zone.id).map((b) => b.id)), [bedSel, zone.id]);
  // Live sets of every store with a pick — prices and the stale check before checkout.
  const pickZones = useMemo(() => [...new Set(bedSel.map((b) => b.zoneId))], [bedSel]);
  const pickSlots = useMemo(() => Object.fromEntries(pickZones.map((zid) => [zid, liveSlots(ZONES.find((z) => z.id === zid) ?? zone, selDates)])), [pickZones, liveSlots, selDates, zone]);
  const stalePicks = bedSel.filter((b) => pickSlots[b.zoneId]?.find((x) => x.id === b.id)?.state !== "a");
  const avail = useMemo(() => slots.filter((s) => s.state === "a").length, [slots]);

  // Booking restrictions (AENR-511): closed days, booking window and same-day
  // cut-off disable a date; minimum / maximum stay rules block Continue.
  const nowTime = new Date().toTimeString().slice(0, 5);
  const today = todayISO();
  const blockReason = (iso: string) => dateBlock(zone.id, iso, calendar.restrictions, today, nowTime);
  const stayCheck = checkRestrictions(zone.id, selDates, calendar.restrictions, today, nowTime);
  // Stop-sell (AENR-512): the store isn't sold online on these dates.
  const stopSell = stopSellFor(inventory, zone.id, selDates);
  // Each chosen day is priced on its own (categories, seasonal rules, date
  // overrides) and with the booking context (early-bird, last-minute, multi-day).
  const ctx = { bookedOn: today, time: nowTime, stayDays: selDates.length };
  const bedPrice = (b: BedPick, iso: string, withCtx = true) => { const s = (pickSlots[b.zoneId] ?? slots).find((x) => x.id === b.id); return s ? resolvePrice(s, b.zoneId, iso, beachPricing, priceRules, withCtx ? ctx : undefined).price : 0; };
  const setSubtotal = bedSel.reduce((a, b) => a + selDates.reduce((x, iso) => x + bedPrice(b, iso), 0), 0);
  const bookingAdj = setSubtotal - bedSel.reduce((a, b) => a + selDates.reduce((x, iso) => x + bedPrice(b, iso, false), 0), 0);
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

  // Tap a store → the camera dives in: its umbrellas FLIP from the cluster into
  // the full pick grid while the other stores drift away (desktop only; the
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
  const toggleBed = (slot: SunbedSlot, el?: HTMLElement | null) => {
    const adding = !bedSel.find((b) => b.id === slot.id);
    setBedSel((s) => (adding ? [...s, { id: slot.id, price: slot.price, zoneId: zone.id }] : s.filter((b) => b.id !== slot.id)));
    if (el) bedPickFx(el, slot.price, adding);
  };
  // Any manual change to the headcount flips off the auto pre-fill for the rest
  // of the session, so the guest's numbers are never overwritten.
  const editPeople = (v: SetStateAction<People>) => { setPeopleTouched(true); setPeople(v); };

  const next = () => setStepIdx((i) => Math.min(last, i + 1));
  // Back walks the flow in reverse: sets → zones → out to Home.
  const back = () => {
    if (stepIdx === 0) {
      if (step.id === "beach" && phase === "sets") { backToZones(); return; }
      go("customer", "home");
      return;
    }
    setStepIdx((i) => Math.max(0, i - 1));
  };

  const confirm = () => {
    // A set taken or put on hold since it was picked must be replaced first (AENR-524 / 520).
    if (stalePicks.length) {
      toast(`${stalePicks.map((b) => b.id).join(", ")} ${tr("is no longer available — remove it and pick another set.")}`, { tone: "warn" });
      setStepIdx(0);
      return;
    }
    let added = 0;
    const subOf = (iso: string) => chipLabel(iso, localeFor(lang)).sub;
    // Sunbeds + tickets cover every chosen day.
    selDates.forEach((iso) => {
      const sub = subOf(iso);
      bedSel.forEach((b) => {
        const bz = ZONES.find((z) => z.id === b.zoneId) ?? zone;
        addToCart({ kind: "sunbed", id: `${b.id}@${iso}`, label: `${tr("Sunbed")} ${b.id}`, sub: `${bz.name} · ${sub}`, price: bedPrice(b, iso), setId: b.id, zoneId: bz.id, date: iso });
        added++;
      });
      if (includeTickets) {
        ticketBreak.forEach(({ k, n, t }) => {
          if (n > 0) {
            addToCart({ kind: "ticket", id: `${k}@${iso}`, label: `${tr(t.label)} × ${n}`, sub: `${tr("Entry ticket")} · ${sub}`, price: n * ex.ticketPrice(k, iso), qty: n, date: iso });
            added++;
          }
        });
      }
    });
    // Lockers + parking cover only the days the guest chose for them.
    lockerDates.forEach((iso) => {
      const sub = subOf(iso);
      for (let i = 0; i < lockerQty; i++) {
        addToCart({ kind: "locker", id: `LK-${lockerBank}${i + 1}@${iso}`, label: `${tr("Day locker")} ${i + 1}`, sub: `${ex.banks.find((b) => b.id === lockerBank)?.name ?? ""} · ${sub}`, price: ex.lockerPrice(lockerBank, iso) });
        added++;
      }
    });
    // One cart line per spot per day; the plate comes from the per-spot list
    // (several cars) or the per-day map (single spot, possibly varying plate).
    parkingDates.forEach((iso) => {
      for (let i = 0; i < parkingQty; i++) {
        const plate = (parkingQty > 1 ? spotPlates[i] : plates[iso]) || "—";
        addToCart({
          kind: "parking",
          id: `P${i + 1}@${iso}`,
          label: parkingQty > 1 ? `${tr("Parking spot")} ${i + 1}` : tr("Parking spot"),
          sub: `${plate} · ${subOf(iso)}`,
          price: PARKING_PRICE,
        });
        added++;
      }
    });
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
  const showZones = step.id === "beach" && phase === "zones";
  const showSets = step.id === "beach" && phase === "sets";
  const showScene = step.id !== "beach" && bedSel.length > 0;
  const pickedByZone = bedSel.reduce<Record<string, number>>((m, b) => ({ ...m, [b.zoneId]: (m[b.zoneId] ?? 0) + 1 }), {});
  const revealDelay = prefersReducedMotion() ? "0ms" : "420ms";

  return (
    <div className="fixed inset-0 z-20 flex flex-col pointer-events-none select-none pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* ============ Menu over the sea (top) ============
           When picking sunbeds, the min-height holds the menu band down to ~the
           shoreline so the sets always start on the sand (never the sea). The
           store overview gives the menu band less reserved height so the
           clusters get more room to spread. */}
      <div className={`shrink-0 flex items-start justify-center px-3 pt-2 sm:pt-3 ${showSets ? "min-h-[50vh]" : "min-h-[44vh]"}`}>
        <div className="pointer-events-auto w-full max-w-2xl glass-card rounded-3xl shadow-float flex flex-col max-h-[64vh] overflow-hidden animate-fade-down" data-flip-id="checkout-panel">
          {/* Pinned header — leave, progress, (step title only on the form steps). */}
          <div className="p-4 sm:p-5 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => go("customer", "home")} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600 hover:text-navy-900 rounded-lg px-2 py-1 hover:bg-white/60 transition">
                <Icon.arrowL size={14} /> {tr("Leave")}
              </button>
              <div className="text-[12px] font-semibold text-slate-500 tnum">{stepIdx + 1} / {STEPS.length}</div>
            </div>

            <ProgressRail stepIdx={stepIdx} onJump={(i) => setStepIdx(i)} />
          </div>

          {/* Scrolling step body — a real scrollbar appears when a step (e.g.
              Review with many lines) overflows the panel. */}
          <div key={`${step.id}-${phase}`} className="px-4 sm:px-5 pb-1 overflow-y-auto animate-fade-up">
            {step.id === "beach" && (
              <BeachMenu blockReason={blockReason} stayReasons={[...(stopSell ? [`${zone.name}: not available online — ask at the beach (${stopSell.reason}).`] : []), ...Object.entries(stayCheck.blocked).map(([d, why]) => `${chipLabel(d, localeFor(lang)).sub}: ${why}`), ...stayCheck.reasons]}
                selDates={selDates} setSelDates={setSelDates}
                multiDate={multiDate} setMultiDate={setMultiDate}
                phase={phase} setPhase={(p) => (p === "zones" ? backToZones() : setPhase(p))}
                zone={zone} bedSel={bedSel} setBedSel={setBedSel}
                avail={avail} dayCount={dayCount}
                multiStore={multiStore} setMultiStore={setMultiStore} stale={stalePicks.map((b) => b.id)}
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
              />
            )}
            {step.id === "locker" && (
              <LockerStep
                on={lockerOn} setOn={setLockerOn}
                scope={lockerScope} setScope={setLockerScope}
                days={lockerDays} setDays={setLockerDays}
                qty={lockerQty} setQty={setLockerQty}
                selDates={selDates} multiDate={multiDate}
                banks={lockerChoices} bank={lockerBank} setBank={setLockerBank}
              />
            )}
            {step.id === "parking" && (
              <ParkingStep
                on={parkingOn} setOn={setParkingOn}
                qty={parkingQty} setQty={setParkingQty}
                scope={parkingScope} setScope={setParkingScope}
                days={parkingDays} setDays={setParkingDays}
                plates={plates} setPlates={setPlates}
                spotPlates={spotPlates} setSpotPlates={setSpotPlates}
                samePlate={parkingSamePlate} setSamePlate={setParkingSamePlate}
                selDates={selDates} multiDate={multiDate}
              />
            )}
            {step.id === "review" && (
              <ReviewStep
                people={people} totalPeople={totalPeople}
                selDates={selDates} dayCount={dayCount}
                zone={zone} bedSel={bedSel}
                includeTickets={includeTickets} ticketBreak={ticketBreak}
                lockerOn={lockerOn} lockerQty={lockerQty} lockerDates={lockerDates}
                parkingOn={parkingOn} parkingQty={parkingQty} parkingDates={parkingDates} plates={plates} spotPlates={spotPlates}
                onJump={(id) => { const i = STEPS.findIndex((s) => s.id === id); if (i >= 0) setStepIdx(i); }}
              />
            )}
          </div>

          {/* Pinned footer — live total + nav. */}
          <div className="flex items-center justify-between gap-3 p-4 sm:p-5 pt-3 border-t border-slate-200/70 shrink-0">
            <div className="leading-tight">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{tr("Total")}</div>
              <div className="font-display text-2xl font-bold text-navy-900 tnum leading-none" data-wizard-total>€<LiveEuro value={grandTotal} /></div>
              {bookingAdj !== 0 && <div className="text-[11px] font-semibold text-teal-700 mt-0.5">{tr("incl.")} {bookingAdj < 0 ? tr("booking discount") : tr("same-day supplement")} {bookingAdj < 0 ? "−" : "+"}€{Math.abs(Math.round(bookingAdj * 100) / 100)}</div>}
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="ghost" icon={Icon.arrowL} onClick={back}>
                {stepIdx === 0 && phase === "zones" ? tr("Home") : tr("Back")}
              </Btn>
              {stepIdx < last ? (
                <Btn variant="teal" onClick={next} disabled={step.id === "beach" && (!stayCheck.ok || !!stopSell)}>{tr("Continue")} <Icon.arrowR size={15} /></Btn>
              ) : (
                <Btn variant="dark" icon={Icon.card} onClick={confirm} disabled={grandTotal === 0}>{tr("Confirm")} · €{grandTotal}</Btn>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ The beach itself — fills the space below the menu so every
           set is visible (never hidden behind it) and is tapped directly. ====== */}
      <div className="flex-1 min-h-0 px-3 sm:px-5 flex justify-center animate-fade-in" style={{ animationDelay: revealDelay, animationFillMode: "both" }}>
        {/* The store overview spreads the full beach width (panoramic); a single
            zone's sunbed grid stays at a comfortable reading width. */}
        <div className={`relative w-full ${showSets ? "max-w-5xl" : "max-w-[1700px]"}`}>
          {showZones && <StoreOverview days={selDates} selectedId={zoneId} onPick={pickZone} rich={richOverview} flipEnter={flipBackRef.current ? zoneId : null} picked={pickedByZone} />}
          {showSets && <SandSunbeds slots={slots} selected={selectedIds} onToggle={toggleBed} landmarks={beachPricing.landmarks.filter((l) => l.zoneId === zone.id)} />}
          {showScene && (
            <SandScene
              slots={slots} picked={selectedIds} stepId={step.id}
              guests={totalPeople}
              lockerOn={lockerOn} lockerQty={lockerQty}
              parkingOn={parkingOn && parkingDates.length > 0} parkingQty={parkingQty}
              plate={parkingQty > 1 ? spotPlates[0] : plates[selDates[0]]}
            />
          )}
        </div>
      </div>

      {/* ============ Bottom bar — guidance + always-on Slaice credit ============ */}
      <div className="shrink-0 px-3 pb-1.5 pt-1 pointer-events-none">
        {(showZones || showSets || showScene) && (
          <div className="max-w-3xl mx-auto pointer-events-auto">
            {showZones && (
              <div className="rounded-2xl glass px-4 py-1.5 text-center">
                <span className="text-[12.5px] text-navy-900"><b>{tr("Tap a zone on the beach")}</b> {tr("to choose where you'll sit — the sea is at the top.")}</span>
              </div>
            )}
            {showScene && (
              <div className="rounded-2xl glass px-4 py-1.5 text-center">
                <span className="text-[12.5px] text-navy-900"><b>{pickZones.length > 1 ? pickZones.map((z) => `${ZONES.find((x) => x.id === z)?.name} ×${pickedByZone[z]}`).join(" · ") : zone.name}</b> · {bedSel.length} {bedSel.length !== 1 ? tr("umbrella sets") : tr("umbrella set")} — {tr("your picks stay on the sand while you finish up.")}</span>
              </div>
            )}
            {showSets && (
              <div className="rounded-2xl glass px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-700">
                <span className="flex items-center gap-1"><Sunbed state="a" size={14} readOnly />{tr("Available")}</span>
                <span className="flex items-center gap-1"><Sunbed state="h" size={14} readOnly />{tr("On hold")}</span>
                <span className="flex items-center gap-1"><Sunbed state="u" size={14} readOnly />{tr("Taken")}</span>
                <span className="flex items-center gap-1"><Sunbed state="a" sel size={14} readOnly />{tr("Yours")}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-600">{tr("Tap the umbrellas on the sand to pick your sets.")}</span>
              </div>
            )}
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11.5px] text-slate-700">
          <span>{tr("powered by")}</span>
          <span className="font-bold text-navy-900">SLA<span className="text-gold-600">i</span>CE</span>
        </div>
      </div>
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
const TRAIL_D = "M 10 8.5 C 16 6, 24 10.5, 30 8 S 44 6, 50 8.2 S 64 10.5, 70 7.8 S 84 6, 90 8.5";
function ProgressRail({ stepIdx, onJump }: { stepIdx: number; onJump: (i: number) => void }) {
  const tr = useT();
  const root = useRef<HTMLDivElement>(null);
  const frac = stepIdx / (STEPS.length - 1);
  // Pop the active station's dot whenever the step changes.
  useEffect(() => {
    if (!motionOK() || !root.current) return;
    const el = root.current.querySelector(`[data-station="${stepIdx}"] [data-station-dot]`);
    if (el) gsap.fromTo(el, { scale: 0.55 }, { scale: 1, duration: 0.5, ease: EASE.pop });
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
          style={{ transition: "stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div
        aria-hidden="true"
        className="absolute top-[7px] w-3.5 h-3.5 rounded-full bg-white ring-2 ring-teal-500 shadow -translate-x-1/2 z-[1]"
        style={{ left: `calc(10% + ${frac} * 80%)`, transition: "left .7s cubic-bezier(.22,1,.36,1)" }}
      />
      <div className="relative grid grid-cols-5">
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
                  active ? "bg-navy-900 text-white shadow-btn-primary" : done ? "bg-teal-500 text-white" : "bg-white/80 ring-1 ring-slate-300 text-slate-400 group-hover:ring-teal-400"
                }`}
              >
                {done ? <Icon.check size={13} /> : I ? <I size={12} /> : i + 1}
              </span>
              <span className={`text-[10px] font-semibold leading-none truncate max-w-full px-0.5 ${active ? "text-navy-900" : done ? "text-teal-700" : "text-slate-400"}`}>
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
function BeachMenu({ selDates, setSelDates, multiDate, setMultiDate, phase, setPhase, zone, bedSel, setBedSel, avail, dayCount, blockReason, stayReasons, multiStore, setMultiStore, stale }: {
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
      {/* Dates — apply to the whole booking. */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5"><Icon.calendar size={12} /> {tr("When are you coming?")}</div>
        <DatePickerRow value={selDates} onChange={setSelDates} multiple={multiDate} maxDays={7} blockReason={blockReason} />
        {stayReasons.length > 0 && <div role="alert" className="mt-2 rounded-xl bg-amber-50 ring-1 ring-amber-600/20 px-3 py-2 text-[12px] text-amber-800 space-y-0.5">{stayReasons.map((r) => <div key={r}>{r}</div>)}</div>}
        <div className="mt-2 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-[12.5px]">
            <Icon.calendar size={13} className="text-slate-500 shrink-0 mt-0.5" />
            <span className="text-slate-700">{multiDate
              ? <><b className="text-navy-900">{selDates.length} {selDates.length !== 1 ? tr("days") : tr("day")}</b> {tr("selected")} · {tr("up to 7")}</>
              : tr("Book several days at once")}</span>
          </div>
          <Toggle on={multiDate} onChange={(v) => { setMultiDate(v); if (!v && selDates.length > 1) setSelDates([selDates[0]]); }} ariaLabel={tr("Book several days at once")} />
        </div>
      </div>

      {/* The map and the sunbed glyphs live on the sand; here the menu keeps only
          the chosen-zone summary and your picks. The legend + tap prompts sit in
          the bottom bar so they never crowd this panel. */}
      {phase === "sets" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setPhase("zones")} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600 hover:text-navy-900 rounded-lg px-2 py-1 hover:bg-white/60">
              <Icon.arrowL size={14} /> {tr("All zones")}
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-lg grid place-items-center shrink-0" style={{ background: zone.color, color: "white" }}><Icon.umbrella size={13} /></span>
              <div className="font-display font-bold text-navy-900 text-sm truncate">{zone.name}</div>
              <Badge tone="green">{avail} {tr("free")}</Badge>
            </div>
          </div>

          {bedSel.length > 0 && !multiStore && (
            <div className="rounded-xl px-3 py-2.5 ring-1 ring-teal-300 bg-teal-50/80 flex items-center justify-between gap-3">
              <div className="min-w-0 text-[12.5px]">
                <div className="font-semibold text-navy-900 truncate">{bedSel.length} {bedSel.length !== 1 ? tr("umbrella sets") : tr("umbrella set")} · {bedSel.map((b) => b.id).join(", ")}</div>
                <div className="text-[11px] text-slate-600">€{pickedSubtotal} × {dayCount} {dayCount !== 1 ? tr("days") : tr("day")}</div>
              </div>
              <button onClick={() => setBedSel([])} className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 shrink-0">{tr("Clear")}</button>
            </div>
          )}
        </div>
      )}

      {/* Several stores in one booking (AENR-524) — off by default. */}
      <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2 flex items-center justify-between gap-3">
        <div className="text-[12.5px] min-w-0">
          <div className="font-semibold text-navy-900">{tr("Book in more than one store")}</div>
          <div className="text-[11px] text-slate-500">{tr("e.g. 2 sets in Macaw and 1 in Central — one payment.")}</div>
        </div>
        <Toggle on={multiStore} onChange={turnMulti} ariaLabel={tr("Book in more than one store")} />
      </div>
      {multiStore && bedSel.length > 0 && (
        <section aria-label={tr("Your sets by store")} className="rounded-xl ring-1 ring-teal-300 bg-teal-50/80 px-3 py-2.5 space-y-2">
          {groups.map((g) => (
            <div key={g.zone.id} className="text-[12.5px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-navy-900 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: g.zone.color }} aria-hidden />{g.zone.name} · {g.picks.length} {g.picks.length !== 1 ? tr("sets") : tr("set")}</span>
                <span className="tnum text-slate-700">€{g.picks.reduce((a, b) => a + b.price, 0) * dayCount}</span>
              </div>
              <ul className="mt-1 flex flex-wrap gap-1">
                {g.picks.map((b) => (
                  <li key={b.id}>
                    <button type="button" onClick={() => setBedSel((s) => s.filter((x) => x.id !== b.id))} aria-label={`${tr("Remove")} ${b.id}`}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold ring-1 ${stale.includes(b.id) ? "bg-rose-50 text-rose-700 ring-rose-300" : "bg-white text-navy-900 ring-slate-200 hover:ring-rose-300"}`}>
                      {b.id}{stale.includes(b.id) ? ` · ${tr("no longer free")}` : ""} <Icon.x size={11} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="border-t border-teal-200 pt-1.5 flex items-center justify-between text-[12.5px] font-semibold text-navy-900">
            <span>{bedSel.length} {tr("sets in")} {groups.length} {groups.length !== 1 ? tr("stores") : tr("store")} · {dayCount} {dayCount !== 1 ? tr("days") : tr("day")}</span>
            <span className="tnum">€{pickedSubtotal * dayCount}</span>
          </div>
        </section>
      )}
      {!multiStore && stale.length > 0 && <div role="alert" className="rounded-xl bg-rose-50 ring-1 ring-rose-300 px-3 py-2 text-[12px] text-rose-800">{stale.join(", ")} {tr("is no longer available — remove it and pick another set.")}</div>}
      <Modal open={keepAsk} onClose={() => setKeepAsk(false)} title={tr("Keep sets from one store?")}
        footer={<Btn variant="ghost" onClick={() => setKeepAsk(false)}>{tr("Cancel")}</Btn>}>
        <p className="text-sm text-slate-600 mb-3">{tr("You picked sets in several stores. Choose the store whose sets you keep — the others are removed.")}</p>
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

/* Track a CSS media query — used to pick the rich (desktop) vs compact (phone)
   store overview. */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* Push equal-size boxes apart until none overlap, starting from their given
   centres and keeping them inside [0,W]×[0,H]. A handful of relaxation passes —
   enough for six store clusters to settle near the admin's arrangement without
   colliding. */
function declutter(init: { x: number; y: number }[], W: number, H: number, cw: number, ch: number, gap: number) {
  const pos = init.map((p) => ({ ...p }));
  const minX = cw / 2, maxX = Math.max(cw / 2, W - cw / 2);
  const minY = ch / 2, maxY = Math.max(ch / 2, H - ch / 2);
  for (let it = 0; it < 90; it++) {
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const ox = cw + gap - Math.abs(dx);
        const oy = ch + gap - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (ox < oy) {
            const push = (ox / 2) * (dx < 0 ? -1 : 1);
            pos[i].x -= push; pos[j].x += push;
          } else {
            const push = (oy / 2) * (dy < 0 ? -1 : 1);
            pos[i].y -= push; pos[j].y += push;
          }
        }
      }
    }
    for (const p of pos) { p.x = clampN(p.x, minX, maxX); p.y = clampN(p.y, minY, maxY); }
  }
  return pos;
}

/* ============ Store overview ============
   Tablet / desktop: a panoramic beach — each store's real umbrella rows laid out
   on the open sand (no card chrome) at the admin's position, auto-spaced so they
   never overlap, with the store name + optional logo set on the sand beneath. Tap
   to open it. Phones / tight screens fall back to compact cards. `rich` is owned
   by the wizard (it gates the FLIP zoom); `flipEnter` names the zone whose beds
   are flying back in, so the entrance stagger skips that cluster. */
function StoreOverview({ days, selectedId, onPick, rich, flipEnter, picked }: { days: string[]; selectedId: string; onPick: (id: string) => void; rich: boolean; flipEnter: string | null; picked: Record<string, number> }) {
  return rich ? <StoreClusters days={days} selectedId={selectedId} onPick={onPick} flipEnter={flipEnter} picked={picked} /> : <StoreCards days={days} selectedId={selectedId} onPick={onPick} picked={picked} />;
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
  const cw = clampN(box.w * 0.155, 120, 290);
  const plotH = cw * 0.86;
  const ch = plotH + 46; // + the name/logo band on the sand
  const glyph = clampN(cw * 0.12, 16, 40);

  const positions = useMemo(() => {
    if (!box.w || !box.h) return [];
    const init = ZONES.map((z) => {
      const blk = ZONE_BLOCKS.find((b) => b.id === z.id);
      const left = blk ? parseFloat(blk.left) + parseFloat(blk.w) / 2 : 50;
      const depth = blk ? clampN((parseFloat(blk.top) - 71) / 6, 0, 1) : 0.5;
      return { x: (left / 100) * box.w, y: ch / 2 + 4 + depth * Math.max(0, box.h - ch - 10) };
    });
    return declutter(init, box.w, box.h, cw, ch, 12);
  }, [box, cw, ch]);

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
            {/* Soft tint on the sand under the selected / hovered store, so it
                reads as one beach section without a hard card edge. */}
            <span aria-hidden className={`absolute left-1/2 -translate-x-1/2 top-0 rounded-[45%] blur-2xl transition-opacity duration-300 ${active ? "opacity-45" : "opacity-0 group-hover:opacity-25"}`} style={{ width: "94%", height: plotH, background: z.color }} />

            {/* The store's real umbrella rows, straight on the sand (no card).
                data-flip-id pairs each mini glyph with its big grid cell so the
                zoom-in/out FLIPs them as one continuous camera move. */}
            <span className={`relative block transition-transform duration-300 ease-spring group-hover:-translate-y-1.5 ${active ? "-translate-y-0.5" : ""}`} style={{ height: plotH }}>
              {slots.map((s) => (
                <span key={s.id} data-flip-id={s.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%`, top: `${s.y}%`, width: glyph, height: glyph }}>
                  <SunbedMark state={s.state} fill />
                </span>
              ))}
            </span>

            {/* Store label set on the sand — logo + name + a line of detail. */}
            <span className="relative block text-center mt-0.5" data-cluster-label>
              {logo && <img src={logo} alt="" className="mx-auto mb-1 h-8 w-auto max-w-[82%] object-contain drop-shadow-[0_1px_2px_rgba(255,255,255,0.55)]" />}
              <span className={`block font-display font-bold text-[15px] tracking-wide transition-colors drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)] ${active ? "" : "text-navy-900 group-hover:text-teal-800"}`} style={active ? { color: z.color } : undefined}>{z.name}</span>
              <span className="block text-[10.5px] font-semibold tnum text-navy-800/80 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">{tr("from")} €{fromLabel} · {free} {tr("free")}</span>
            </span>

            {active && (
              <span className="absolute -top-1 right-2 w-5 h-5 rounded-full text-white grid place-items-center shadow ring-2 ring-white" style={{ background: z.color }}>
                <Icon.check size={12} />
              </span>
            )}
            {(picked[z.id] ?? 0) > 0 && (
              <span className="absolute -top-1 left-2 min-w-5 h-5 px-1.5 rounded-full bg-navy-900 text-white text-[11px] font-bold grid place-items-center shadow ring-2 ring-white">{picked[z.id]} {tr("picked")}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* Compact store cards — phones / tight screens. The same translucent glass
   material as the menu above, with the store's logo/name, from-price and live
   availability, in a tidy two-column grid. A small zone-colour umbrella chip
   keeps the stores distinguishable. */
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
              <span className="block text-navy-900 font-bold text-[14px] leading-tight">{z.name}</span>
              <span className="block text-slate-600 text-[11px] tnum mt-0.5">{tr("from")} €{fromLabel} · {free} {tr("free")}</span>
              {active && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-teal-500 text-white grid place-items-center shadow ring-2 ring-white">
                  <Icon.check size={12} />
                </span>
              )}
              {(picked[z.id] ?? 0) > 0 && (
                <span className="absolute top-2 left-2 h-5 px-1.5 rounded-full bg-navy-900 text-white text-[10.5px] font-bold grid place-items-center shadow">{picked[z.id]} {tr("picked")}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============ Sand layer — umbrella sets ============
   The chosen zone's layout, drawn directly on the sand. Front row (small y) sits
   near the sea at the top; the back row toward the promenade. Each set is sized to
   its nearest neighbour so glyphs keep clear air and never collide. Cells carry
   data-flip-id (the zoom FLIP pairs them with the overview minis) and hand their
   element to onToggle so the pick effects can run from the tapped spot. */
function SandSunbeds({ slots, selected, onToggle, readOnly = false, landmarks = [] }: {
  slots: SunbedSlot[];
  landmarks?: Landmark[];
  selected: Set<string>;
  onToggle?: (s: SunbedSlot, el: HTMLElement | null) => void;
  readOnly?: boolean;
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
          <Sunbed state={s.state} sel={selected.has(s.id)} price={s.price} label={`${s.id}${s.access ? " (step-free)" : ""}${s.inv ? ` — ${s.inv}` : ""}`} fill readOnly={readOnly} onClick={readOnly ? undefined : () => onToggle?.(s, cells.current.get(s.id) ?? null)} />
          {s.inv && <span aria-hidden title={s.inv} className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-navy-900 text-white text-[8px] grid place-items-center ring-2 ring-white pointer-events-none">🔒</span>}
          {s.access && <span aria-hidden className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-600 text-white text-[9px] grid place-items-center ring-2 ring-white pointer-events-none">♿</span>}
        </div>
      ))}
      {/* Landmarks (bar, showers, WC…) orient guests; they aren't bookable. */}
      {landmarks.map((l) => (
        <span key={l.id} className="absolute -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md bg-white/90 ring-1 ring-navy-900/20 px-1.5 py-0.5 text-[10px] font-semibold text-navy-900 shadow-sm pointer-events-none"
          style={{ left: `${l.x}%`, top: `${l.y}%` }}>
          <span aria-hidden>{LANDMARK_LABEL[l.kind].icon}</span>{l.label || LANDMARK_LABEL[l.kind].label}
        </span>
      ))}
    </div>
  );
}

/* ============ Guests ============ */
function PeopleStep({ tickets: TICKET, people, setPeople, includeTickets, setIncludeTickets, pickedSets, autoFilled, onPreset }: {
  tickets: TicketInfo;
  people: People;
  setPeople: Dispatch<SetStateAction<People>>;
  includeTickets: boolean;
  setIncludeTickets: Dispatch<SetStateAction<boolean>>;
  pickedSets: number;
  /** True while the headcount is still the auto pre-fill (untouched by the guest). */
  autoFilled: boolean;
  onPreset: (v: People) => void;
}) {
  const tr = useT();
  const totalPeople = Object.values(people).reduce((a, b) => a + b, 0);
  const presets = [
    { id: "solo",   label: tr("Solo"),       sub: tr("1 person"),     v: { adult: 1, resident: 0, child: 0, senior: 0 } },
    { id: "couple", label: tr("Couple"),     sub: tr("2 people"),     v: { adult: 2, resident: 0, child: 0, senior: 0 } },
    { id: "family", label: tr("Family · 4"), sub: tr("2 adults + 2 kids"), v: { adult: 2, resident: 0, child: 2, senior: 0 } },
    { id: "group",  label: tr("Group · 6"),  sub: tr("Friends day"),  v: { adult: 6, resident: 0, child: 0, senior: 0 } },
  ];
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{tr("Quick picks")}</div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const match = JSON.stringify(p.v) === JSON.stringify(people);
            return (
              <button key={p.id} onClick={() => onPreset(p.v)}
                className={`text-left rounded-xl px-3 py-2 ring-1 transition ${match ? "bg-navy-900 text-white ring-navy-900" : "bg-white/70 ring-slate-200 hover:ring-teal-400"}`}>
                <div className="text-[13px] font-semibold leading-tight">{p.label}</div>
                <div className={`text-[11px] leading-tight ${match ? "text-white/70" : "text-slate-500"}`}>{p.sub}</div>
              </button>
            );
          })}
          {/* Entry-tickets toggle sits inline, right after the quick picks. */}
          <button onClick={() => setIncludeTickets((v) => !v)} aria-pressed={includeTickets}
            className={`relative text-left rounded-xl pl-3 pr-9 py-2 ring-1 transition ${includeTickets ? "bg-teal-50 ring-teal-500" : "bg-white/70 ring-slate-200 hover:ring-teal-400"}`}>
            <div className="text-[13px] font-semibold leading-tight text-navy-900 flex items-center gap-1.5"><Icon.ticket size={13} className={includeTickets ? "text-teal-600" : "text-slate-500"} /> {tr("Add Entry tickets")}</div>
            <div className="text-[11px] leading-tight text-slate-500">{tr("One ticket per guest")}</div>
            <span className={`absolute top-1/2 -translate-y-1/2 right-2 w-5 h-5 rounded-full grid place-items-center ${includeTickets ? "bg-teal-600 text-white" : "ring-1 ring-slate-300 text-slate-400"}`}>
              {includeTickets ? <Icon.check size={12} /> : <Icon.plus size={12} />}
            </span>
          </button>
        </div>
      </div>

      {autoFilled && pickedSets > 0 && (
        <div className="rounded-xl ring-1 ring-teal-200 bg-teal-50/70 px-3 py-2 flex items-start gap-2 text-[12.5px] text-navy-900 animate-fade-up">
          <Icon.ticket size={14} className="text-teal-600 shrink-0 mt-0.5" />
          <span>{tr("We pre-filled")} <b>{pickedSets * 2} {tr("entry tickets")}</b> — {tr("2 per set. Change the headcount below if you need to.")}</span>
        </div>
      )}

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{tr("Headcount by category")}</div>
        <div className="space-y-1.5">
          {Object.keys(TICKET).map((k) => {
            const t = TICKET[k];
            return (
              <div key={k} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-navy-900">{tr(t.label)}</div>
                  <div className="text-[11px] text-slate-500">€{t.price} {tr("entry")}{t.sub ? ` · ${tr(t.sub)}` : ""}</div>
                </div>
                <Stepper label={tr(t.label)} value={people[k] ?? 0} onChange={(v) => setPeople((p) => ({ ...p, [k]: v }))} />
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11.5px] text-slate-500 flex items-start gap-1.5"><Icon.shield size={12} className="shrink-0 mt-0.5" /> {tr("Child tickets record only the type and count — no names or dates of birth.")}</p>
      </div>

      {pickedSets > 0 && (
        <div className={`rounded-xl ring-1 px-3 py-2.5 flex items-start gap-2.5 ${totalPeople > pickedSets * 2 ? "ring-amber-300 bg-amber-50/80" : "ring-teal-200 bg-teal-50/70"}`}>
          <span className={`w-8 h-8 rounded-lg text-white grid place-items-center shrink-0 ${totalPeople > pickedSets * 2 ? "bg-amber-500" : "bg-teal-600"}`}><Icon.umbrella size={15} /></span>
          <div className="text-[13px] leading-snug text-navy-900">
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
      <div role="status" className="rounded-xl ring-1 ring-amber-300 bg-amber-50/80 px-3 py-3 text-[13px] text-amber-900 flex items-start gap-2">
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
              <div className="text-[13px] font-semibold text-navy-900">{b.name}</div>
              <div className="text-[11px] text-slate-500">€{b.price}/{tr("day")} · {none ? tr("Sold out") : `${b.avail} ${tr("left")}`}</div>
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
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5"><Icon.calendar size={12} /> {tr("Which days?")}</div>
          <DayChips days={selDates} value={days} onChange={setDays} />
        </div>
      )}
      {on && (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5 flex items-center justify-between animate-pop">
          <div>
            <div className="font-semibold text-sm text-navy-900">{tr("How many lockers?")}</div>
            <div className="text-[11px] text-slate-500">{qty} × €{LOCKER_PRICE} × {n} {n !== 1 ? tr("days") : tr("day")}</div>
          </div>
          <Stepper label={tr("lockers")} value={qty} onChange={(v) => setQty(Math.max(1, Math.min(cur?.avail ?? v, v)))} min={1} />
        </div>
      )}
      <div className="text-[12px] text-slate-500 flex items-center gap-1.5">
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
            <span className="block text-[12px] font-semibold leading-tight">{c.label}</span>
            <span className={`block text-[10px] leading-tight ${on ? "text-white/70" : "text-slate-500"}`}>{c.sub}</span>
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
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5"><Icon.calendar size={12} /> {tr("Which days?")}</div>
          <DayChips days={selDates} value={days} onChange={setDays} />
        </div>
      )}
      {on && (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5 flex items-center justify-between animate-pop">
          <div>
            <div className="font-semibold text-sm text-navy-900">{tr("How many spots?")}</div>
            <div className="text-[11px] text-slate-500">{qty} × €{PARKING_PRICE} × {n} {n !== 1 ? tr("days") : tr("day")}</div>
          </div>
          <Stepper label={tr("parking spots")} value={qty} onChange={changeQty} min={1} />
        </div>
      )}
      {/* Several spots = several cars: one plate per spot, valid every parked
          day. The per-day plate matrix below stays for the single-spot case. */}
      {on && qty > 1 && (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-3 animate-pop space-y-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><Icon.car size={12} /> {tr("Vehicle plate per spot")}</div>
          {Array.from({ length: qty }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-navy-900 w-24 shrink-0">{tr("Spot")} {i + 1}</span>
              <Input value={spotPlates[i] || ""} onChange={(e) => setSpotPlate(i, e.target.value)} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" />
            </div>
          ))}
          <div className="flex items-center justify-between text-[12px] text-slate-600 pt-1.5 border-t border-slate-100">
            <span>{qty} {tr("spots")} × {n} {n !== 1 ? tr("days") : tr("day")} × €{PARKING_PRICE}</span>
            <span className="font-semibold text-navy-900 tnum">€{qty * PARKING_PRICE * n}</span>
          </div>
        </div>
      )}
      {on && qty === 1 && (multiDate ? (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-3 animate-pop space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><Icon.car size={12} /> {samePlate ? tr("Vehicle plate") : tr("Vehicle plate per day")}</div>
            <label className="flex items-center gap-2 text-[12px] font-semibold text-navy-900 cursor-pointer shrink-0">
              {tr("Same car plate")}
              <Toggle on={samePlate} onChange={(v) => { setSamePlate(v); if (v) writeShared(plates[activeDays[0]] ?? plates[selDates[0]] ?? ""); }} ariaLabel={tr("Same car plate")} />
            </label>
          </div>
          {activeDays.length === 0 ? (
            <div className="text-[12px] text-slate-500">{tr("Pick at least one day above.")}</div>
          ) : samePlate ? (
            <Input value={plates[selDates[0]] || ""} onChange={(e) => writeShared(e.target.value)} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" />
          ) : activeDays.map((iso) => {
            const c = chipLabel(iso, loc, tr);
            return (
              <div key={iso} className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-navy-900 w-24 shrink-0 leading-tight">{c.label}<span className="block text-[10px] text-slate-500 font-normal">{c.sub}</span></span>
                <Input value={plates[iso] || ""} onChange={(e) => setPlate(iso, e.target.value)} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" />
              </div>
            );
          })}
          <div className="flex items-center justify-between text-[12px] text-slate-600 pt-1.5 border-t border-slate-100">
            <span>{activeDays.length} {activeDays.length !== 1 ? tr("days") : tr("day")} × €{PARKING_PRICE}</span>
            <span className="font-semibold text-navy-900 tnum">€{PARKING_PRICE * activeDays.length}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-3 animate-pop">
          <Field label={tr("Vehicle plate")} hint={tr("Used by the gate camera to let you in automatically.")}>
            <Input value={plates[selDates[0]] || ""} onChange={(e) => setPlate(selDates[0], e.target.value)} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" />
          </Field>
          <div className="mt-2 flex items-center justify-between text-[12px] text-slate-600">
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
        <span className="block text-[13px] font-semibold text-navy-900 leading-tight">{title}</span>
        <span className="block text-[11px] text-slate-600 leading-tight">{sub}</span>
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
  // Grouped by store when the booking spans several (AENR-524).
  const byStore = [...new Set(bedSel.map((b) => b.zoneId))].map((zid) => ({ name: ZONES.find((z) => z.id === zid)?.name ?? zone.name, ids: bedSel.filter((b) => b.zoneId === zid).map((b) => b.id) }));
  const beachBody = bedSel.length > 0
    ? byStore.map((g) => `${g.name} · ${g.ids.length} ${g.ids.length !== 1 ? tr("sets") : tr("set")} · ${g.ids.join(", ")}`).join(" — ")
    : tr("Not included");
  return (
    <div className="space-y-2">
      <ReviewRow icon={Icon.umbrella} title={tr("Beach")} body={beachBody} onEdit={() => onJump("beach")} />
      <ReviewRow icon={Icon.calendar} title={tr("Dates")} body={dateLabel} onEdit={() => onJump("beach")} />
      <ReviewRow icon={Icon.group} title={tr("Guests")} body={totalPeople > 0 ? `${totalPeople} ${tr("total")} · ${humanPeople(people)}` : tr("None added")} onEdit={() => onJump("people")} />
      <ReviewRow
        icon={Icon.ticket}
        title={tr("Entry tickets")}
        body={includeTickets ? ticketBreak.filter((t) => t.n > 0).map((t) => `${t.n} × ${tr(t.t.label)}`).join(" · ") || "—" : tr("Not included")}
        onEdit={() => onJump("people")}
      />
      <ReviewRow icon={Icon.lock} title={tr("Day locker")} body={lockerOn && lockerDates.length > 0 ? `${lockerQty} ${lockerQty !== 1 ? tr("lockers") : tr("locker")} · ${lockerDates.length} ${lockerDates.length !== 1 ? tr("days") : tr("day")}` : tr("Not added")} onEdit={() => onJump("locker")} />
      <ReviewRow
        icon={Icon.car}
        title={tr("Parking Spot")}
        body={parkingOn && parkingDates.length > 0
          ? `${parkingQty} ${parkingQty !== 1 ? tr("spots") : tr("spot")} · ${parkingDates.length} ${parkingDates.length !== 1 ? tr("days") : tr("day")} · ${plateSummary}`
          : tr("Not added")}
        onEdit={() => onJump("parking")}
      />
    </div>
  );
}

function ReviewRow({ icon: IconC, title, body, onEdit }: { icon: IconRenderer; title: ReactNode; body: ReactNode; onEdit: () => void }) {
  const tr = useT();
  return (
    <div className="flex items-center gap-3 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
      <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 grid place-items-center shrink-0"><IconC size={16} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-navy-900 leading-tight">{title}</div>
        <div className="text-[12px] text-slate-600 leading-snug truncate">{body}</div>
      </div>
      <button onClick={onEdit} className="text-[12px] font-semibold text-teal-700 hover:text-teal-800 px-2 py-1 rounded-lg hover:bg-teal-50">{tr("Edit")}</button>
    </div>
  );
}

function humanPeople(p: People) {
  const parts = [];
  if (p.adult)    parts.push(`${p.adult} adult${p.adult !== 1 ? "s" : ""}`);
  if (p.resident) parts.push(`${p.resident} resident${p.resident !== 1 ? "s" : ""}`);
  if (p.child)    parts.push(`${p.child} child${p.child !== 1 ? "ren" : ""}`);
  if (p.senior)   parts.push(`${p.senior} senior${p.senior !== 1 ? "s" : ""}`);
  return parts.join(", ") || "—";
}

/* Renders an integer euro amount, smoothly tweened on change. */
function LiveEuro({ value }: { value: number }) {
  const display = useAnimatedNumber(value);
  return <span className="tnum">{Math.round(display).toLocaleString()}</span>;
}
