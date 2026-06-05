import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../lib/icons";
import { Card, Btn, Badge, Stepper, Input, Field, DatePickerRow, SwipeRow } from "../components/ui";
import { Reveal, prefersReducedMotion } from "../lib/motion";
import { Sunbed } from "../components/Beach";
import { ZONES, todayISO, chipLabel, makeGrid } from "../data/beach";
import { useApp, useSpotlight, useT } from "../app/store";
import { TICKET_PRICES, TICKET_META, LOCKER_PRICE, PARKING_PRICE } from "../domain/pricing";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { IconRenderer } from "../lib/icons";

type People = Record<string, number>;
interface BedPick { id: string; price: number }
type WizardZone = (typeof ZONES)[number];
interface TicketBreakItem { k: string; n: number; t: { price: number; label: string; sub: string }; total: number }
interface PanelLine { key: string; icon: IconRenderer; label: ReactNode; sub: ReactNode; amount: number; onRemove: () => void }

/* Pricing now comes from the shared domain module (single source of truth), so
   the wizard and Checkout can never disagree on a price. One "set" = 1 umbrella
   + 2 sunbeds (capacity 2). */
const TICKET: Record<string, { price: number; label: string; sub: string }> = {
  adult:    { price: TICKET_PRICES.adult,    ...TICKET_META.adult },
  resident: { price: TICKET_PRICES.resident, ...TICKET_META.resident },
  child:    { price: TICKET_PRICES.child,     ...TICKET_META.child },
  senior:   { price: TICKET_PRICES.senior,    ...TICKET_META.senior },
};

const STEPS = [
  { id: "people",  label: "Guests",   icon: "group",    sub: "Tell us who's coming" },
  { id: "dates",   label: "Dates",    icon: "calendar", sub: "Pick one or more days" },
  { id: "sets",    label: "Beach bar",icon: "umbrella", sub: "Choose your zone & sets", optional: true },
  { id: "locker",  label: "Locker",   icon: "lock",     sub: "Add a day locker (optional)", optional: true },
  { id: "parking", label: "Parking Spot", icon: "car", sub: "Reserve a spot (optional)",    optional: true },
  { id: "review",  label: "Review",   icon: "checkCircle", sub: "Confirm & checkout" },
];

/* Smoothly tween a numeric value whenever it changes — used by the live total
   so the user actually sees the balance move when toggling a service. */
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

export function CustomerWizard() {
  const tr = useT();
  const { go, toast, addToCart, cart, clearCart, hint } = useApp();
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
  const [people, setPeople] = useState<People>({ adult: 2, resident: 0, child: 0, senior: 0 });
  const [includeTickets, setIncludeTickets] = useState(true);
  const [includeBeach, setIncludeBeach] = useState(true);
  const [selDates, setSelDates] = useState([todayISO()]);
  const [zoneId, setZoneId] = useState("central");
  const [sets, setSets] = useState(1);
  const [setsTouched, setSetsTouched] = useState(false);
  // Explicit umbrella picks from the inline beach grid. When non-empty, these
  // override the abstract `sets` count: the user has chosen specific beds.
  const [bedSel, setBedSel] = useState<BedPick[]>([]);
  const [lockerOn, setLockerOn] = useState(false);
  const [lockerQty, setLockerQty] = useState(1);
  const [parkingOn, setParkingOn] = useState(false);
  const [plate, setPlate] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const totalPeople = people.adult + people.resident + people.child + people.senior;
  const recommendedSets = Math.max(1, Math.ceil(Math.max(totalPeople, 1) / 2));
  const dayCount = selDates.length;
  const zone = ZONES.find((z) => z.id === zoneId) || ZONES[0];

  // Follow the recommendation as guests change (only while sunbeds are included),
  // so switching presets re-balances the basket. Once the user has explicitly
  // picked a set count, hold it and only auto-bump upward to never under-cover.
  useEffect(() => {
    if (!includeBeach) return;
    if (!setsTouched) setSets(recommendedSets);
    else setSets((s) => Math.max(s, recommendedSets));
  }, [recommendedSets, setsTouched, includeBeach]);

  // Bed IDs are zone-scoped — switching zone clears any picked beds.
  useEffect(() => { setBedSel([]); }, [zoneId]);

  // Sunbeds count only when included; picked beds override the abstract count.
  const effectiveSets = includeBeach ? (bedSel.length > 0 ? bedSel.length : sets) : 0;
  const setSubtotal = !includeBeach
    ? 0
    : bedSel.length > 0
      ? bedSel.reduce((a, b) => a + b.price, 0) * dayCount
      : sets * zone.from * dayCount;
  const ticketBreak = Object.entries(people).map(([k, n]) => ({ k, n, t: TICKET[k], total: n * TICKET[k].price * dayCount }));
  const ticketSubtotal = includeTickets ? ticketBreak.reduce((a, b) => a + b.total, 0) : 0;
  const lockerSubtotal = lockerOn ? lockerQty * LOCKER_PRICE * dayCount : 0;
  const parkingSubtotal = parkingOn ? PARKING_PRICE * dayCount : 0;
  const grandTotal = setSubtotal + ticketSubtotal + lockerSubtotal + parkingSubtotal;

  const step = STEPS[stepIdx];
  // Every step is skippable now — the live basket (grandTotal) gates checkout, so
  // a guest can proceed with only a locker or only parking if they wish.
  const canNext = true;
  const next = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  /* ---- Remove individual lines from the live basket (delete or swipe). ---- */
  const removeBeach = () => {
    const snap = { bedSel, sets, setsTouched };
    setIncludeBeach(false);
    toast(tr("Removed sunbeds."), { action: { label: tr("Undo"), onClick: () => { setIncludeBeach(true); setBedSel(snap.bedSel); setSets(snap.sets); setSetsTouched(snap.setsTouched); } } });
  };
  const removeTicketCat = (k: string) => {
    const prev = people[k];
    setSetsTouched(true); // removing tickets shouldn't shrink the sunbed count
    setPeople((p) => ({ ...p, [k]: 0 }));
    toast(`${tr("Removed")} ${tr(TICKET[k].label)} ${tr("tickets")}.`, { action: { label: tr("Undo"), onClick: () => setPeople((p) => ({ ...p, [k]: prev })) } });
  };
  const removeLocker = () => {
    const snap = lockerQty;
    setLockerOn(false);
    toast(tr("Removed day locker."), { action: { label: tr("Undo"), onClick: () => { setLockerOn(true); setLockerQty(snap); } } });
  };
  const removeParking = () => {
    const snap = plate;
    setParkingOn(false);
    toast(tr("Removed parking."), { action: { label: tr("Undo"), onClick: () => { setParkingOn(true); setPlate(snap); } } });
  };
  const emptyBasket = () => {
    const snap = { people, includeBeach, includeTickets, bedSel, sets, setsTouched, lockerOn, lockerQty, parkingOn, plate, cart: [...cart] };
    setIncludeBeach(false);
    setIncludeTickets(false);
    setBedSel([]);
    setLockerOn(false);
    setParkingOn(false);
    setSetsTouched(true);
    setPeople({ adult: 0, resident: 0, child: 0, senior: 0 });
    clearCart();
    toast(tr("Basket emptied."), { action: { label: tr("Undo"), onClick: () => {
      setPeople(snap.people); setIncludeBeach(snap.includeBeach); setIncludeTickets(snap.includeTickets);
      setBedSel(snap.bedSel); setSets(snap.sets); setSetsTouched(snap.setsTouched);
      setLockerOn(snap.lockerOn); setLockerQty(snap.lockerQty); setParkingOn(snap.parkingOn); setPlate(snap.plate);
      snap.cart.forEach(addToCart);
    } } });
  };

  // The removable lines the basket panel renders, derived from live state.
  const lines: PanelLine[] = [];
  if (includeBeach && effectiveSets > 0) {
    lines.push({
      key: "beach",
      icon: Icon.umbrella,
      label: `${zone.name} · ${effectiveSets} ${bedSel.length > 0 ? tr("bed") : tr("set")}${effectiveSets !== 1 ? "s" : ""}`,
      sub: bedSel.length > 0
        ? `${tr("Picked")}: ${bedSel.map((b) => b.id).join(", ")} × ${dayCount}d`
        : `€${zone.from} × ${sets} × ${dayCount}d`,
      amount: setSubtotal,
      onRemove: removeBeach,
    });
  }
  if (includeTickets) {
    ticketBreak.filter((t) => t.n > 0).forEach((t) => lines.push({
      key: `ticket-${t.k}`,
      icon: Icon.ticket,
      label: `${tr(t.t.label)} × ${t.n}`,
      sub: `€${t.t.price} × ${t.n} × ${dayCount}d`,
      amount: t.total,
      onRemove: () => removeTicketCat(t.k),
    }));
  }
  if (lockerOn) lines.push({ key: "locker", icon: Icon.lock, label: `${tr("Day locker")} × ${lockerQty}`, sub: `€${LOCKER_PRICE} × ${lockerQty} × ${dayCount}d`, amount: lockerSubtotal, onRemove: removeLocker });
  if (parkingOn) lines.push({ key: "parking", icon: Icon.car, label: tr("Parking spot"), sub: `€${PARKING_PRICE} × ${dayCount}d`, amount: parkingSubtotal, onRemove: removeParking });

  const confirm = () => {
    let added = 0;
    selDates.forEach((iso) => {
      const sub = chipLabel(iso).sub;
      // sunbeds — use the user's picked bed IDs if any, otherwise synthesise IDs
      // in the chosen zone (auto-assign for the abstract `sets` count).
      if (includeBeach) {
        if (bedSel.length > 0) {
          bedSel.forEach((b) => {
            addToCart({ kind: "sunbed", id: `${b.id}@${iso}`, label: `${tr("Sunbed")} ${b.id}`, sub: `${zone.name} · ${sub}`, price: b.price });
            added++;
          });
        } else {
          for (let i = 0; i < sets; i++) {
            const id = `${zone.prefix}-${String((i + 1) * 7).padStart(2, "0")}@${iso}`;
            addToCart({ kind: "sunbed", id, label: `${tr("Sunbed set")} ${i + 1}`, sub: `${zone.name} · ${sub}`, price: zone.from });
            added++;
          }
        }
      }
      if (includeTickets) {
        ticketBreak.forEach(({ k, n, t }) => {
          if (n > 0) {
            addToCart({ kind: "ticket", id: `${k}@${iso}`, label: `${tr(t.label)} × ${n}`, sub: `${tr("Entry ticket")} · ${sub}`, price: n * t.price });
            added++;
          }
        });
      }
      if (lockerOn) {
        for (let i = 0; i < lockerQty; i++) {
          addToCart({ kind: "locker", id: `LK${i + 1}@${iso}`, label: `${tr("Day locker")} ${i + 1}`, sub, price: LOCKER_PRICE });
          added++;
        }
      }
      if (parkingOn) {
        addToCart({ kind: "parking", id: `P@${iso}`, label: tr("Parking spot"), sub: `${plate || "—"} · ${sub}`, price: PARKING_PRICE });
        added++;
      }
    });
    toast(`${tr("Booking ready")} — ${added} ${added !== 1 ? tr("items") : tr("item")} ${tr("added to your basket.")}`, { tone: "success" });
    go("customer", "checkout");
  };

  return (
    <div className="animate-fade-up grid lg:grid-cols-[1fr_360px] gap-5 pb-24 lg:pb-5">
      {/* ============ LEFT: wizard ============ */}
      <div className="space-y-4 min-w-0">
        {/* Stepper rail */}
        <Card className="glass-card-solid p-3 sm:p-4">
          <ProgressRail stepIdx={stepIdx} onJump={(i) => setStepIdx(i)} />
        </Card>

        {/* Step card */}
        <Reveal as="div" key={step.id} className="reveal">
          <Card className="glass-card-solid p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-11 h-11 rounded-2xl grid place-items-center text-white bg-gradient-to-br from-teal-500 to-teal-700 shadow-sm shrink-0">
                {(() => { const I = Icon[step.icon]; return I ? <I size={20} /> : null; })()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-display font-bold text-navy-900 text-xl sm:text-2xl">{tr(step.label)}</div>
                  {step.optional && <Badge tone="slate">{tr("Optional")}</Badge>}
                </div>
                <div className="text-[13px] text-slate-600 mt-0.5">{tr(step.sub)}</div>
              </div>
              <div className="text-[12px] font-semibold text-slate-500 tnum shrink-0">{stepIdx + 1}/{STEPS.length}</div>
            </div>

            {step.id === "people" && (
              <PeopleStep
                people={people} setPeople={setPeople}
                includeTickets={includeTickets} setIncludeTickets={setIncludeTickets}
                recommendedSets={recommendedSets}
                onPreset={(v) => { setPeople(v); setSetsTouched(false); }}
              />
            )}
            {step.id === "dates" && (
              <DatesStep selDates={selDates} setSelDates={setSelDates} />
            )}
            {step.id === "sets" && (
              <SetsStep
                zone={zone} zoneId={zoneId} setZoneId={setZoneId}
                sets={sets}
                setSets={(v) => { setSets(v); setSetsTouched(true); }}
                recommendedSets={recommendedSets}
                dayCount={dayCount}
                bedSel={bedSel} setBedSel={setBedSel}
                includeBeach={includeBeach} setIncludeBeach={setIncludeBeach}
              />
            )}
            {step.id === "locker" && (
              <LockerStep on={lockerOn} setOn={setLockerOn} qty={lockerQty} setQty={setLockerQty} dayCount={dayCount} />
            )}
            {step.id === "parking" && (
              <ParkingStep on={parkingOn} setOn={setParkingOn} plate={plate} setPlate={setPlate} dayCount={dayCount} />
            )}
            {step.id === "review" && (
              <ReviewStep
                people={people} totalPeople={totalPeople}
                selDates={selDates} dayCount={dayCount}
                zone={zone} sets={effectiveSets} bedSel={bedSel}
                includeBeach={includeBeach}
                includeTickets={includeTickets}
                ticketBreak={ticketBreak}
                lockerOn={lockerOn} lockerQty={lockerQty}
                parkingOn={parkingOn} plate={plate}
                onJump={(id) => {
                  const i = STEPS.findIndex((s) => s.id === id);
                  if (i >= 0) setStepIdx(i);
                }}
              />
            )}
            {/* Footer nav — moved inside the step card so each step's Back /
                Continue sit on the same surface as its content. */}
            <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-200/70">
              <Btn variant="ghost" icon={Icon.arrowL} onClick={back} disabled={stepIdx === 0}>{tr("Back")}</Btn>
              <div className="text-[12px] text-slate-500 hidden sm:block">
                {stepIdx < STEPS.length - 1 && <button onClick={next} className="font-semibold hover:text-navy-900">{tr("Skip this step")} →</button>}
              </div>
              {stepIdx < STEPS.length - 1 ? (
                <Btn variant="teal" onClick={next} disabled={!canNext}>
                  {tr("Continue")} <Icon.arrowR size={15} />
                </Btn>
              ) : (
                <Btn variant="dark" icon={Icon.card} onClick={confirm} disabled={grandTotal === 0}>
                  {tr("Confirm & checkout")} · €{grandTotal}
                </Btn>
              )}
            </div>
          </Card>
        </Reveal>
      </div>

      {/* ============ RIGHT: live basket panel (desktop) ============ */}
      <div className="hidden lg:block">
        <div className="sticky top-[88px]">
          <BasketPanel
            totalPeople={totalPeople}
            dayCount={dayCount}
            lines={lines}
            grandTotal={grandTotal}
            cartCount={cart.length}
            onEmpty={emptyBasket}
            onCta={stepIdx === STEPS.length - 1 ? confirm : next}
            ctaLabel={stepIdx === STEPS.length - 1 ? tr("Confirm & checkout") : tr("Continue")}
            ctaDisabled={!canNext}
            confirmReady={stepIdx === STEPS.length - 1}
            stepIdx={stepIdx}
            totalSteps={STEPS.length}
            onJumpToReview={() => setStepIdx(STEPS.length - 1)}
          />
        </div>
      </div>

      {/* ============ Mobile: tap-to-expand basket bar ============
          Portaled to <body> so it pins to the viewport — the `animate-fade-up`
          root's transform would otherwise anchor this `fixed` bar to the bottom
          of the (tall) wizard, pushing it off-screen. Sits above the bottom tab
          bar via a safe-area-aware offset. */}
      {createPortal((
      <button
        onClick={() => setSheetOpen(true)}
        className="lg:hidden fixed left-3 right-3 z-30 glass-dark text-white rounded-2xl shadow-float ring-1 ring-white/15 px-4 py-3 flex items-center justify-between gap-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))]"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center shrink-0">
            <Icon.card size={17} />
          </span>
          <span className="text-left leading-tight min-w-0">
            <span className="block text-[13px] font-semibold truncate">
              <LiveEuro value={grandTotal} /> · {lines.length} {lines.length !== 1 ? tr("items") : tr("item")}
            </span>
            <span className="block text-[11px] text-white/60">{tr("Tap to view your booking")}</span>
          </span>
        </span>
        <Icon.chevD size={18} className="rotate-180 shrink-0" />
      </button>
      ), document.body)}

      {/* Portaled to <body>: this sheet lives inside the `animate-fade-up`
          root whose transform would otherwise make `position: fixed` relative
          to the (tall) wizard div and push the sheet off-screen. */}
      {sheetOpen && createPortal((
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <button type="button" aria-label={tr("Close")} tabIndex={-1} className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm animate-fade-in cursor-default" onClick={() => setSheetOpen(false)} />
          <div className="absolute left-0 right-0 bottom-0 max-h-[88dvh] glass-card-solid rounded-t-2xl ring-1 ring-white/40 shadow-float flex flex-col overflow-hidden animate-slide-up pb-safe">
            <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
              <span className="mx-auto w-10 h-1 rounded-full bg-slate-300 absolute left-1/2 -translate-x-1/2 top-2" />
              <div className="font-display font-bold text-navy-900">{tr("Your booking")}</div>
              <button aria-label={tr("Close")} onClick={() => setSheetOpen(false)} className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-white/50"><Icon.x size={18} /></button>
            </div>
            <div className="overflow-y-auto p-4">
              <BasketPanel
                inline
                totalPeople={totalPeople}
                dayCount={dayCount}
                lines={lines}
                grandTotal={grandTotal}
                cartCount={cart.length}
                onEmpty={emptyBasket}
                onCta={stepIdx === STEPS.length - 1 ? () => { setSheetOpen(false); confirm(); } : () => { setSheetOpen(false); next(); }}
                ctaLabel={stepIdx === STEPS.length - 1 ? tr("Confirm & checkout") : tr("Continue")}
                ctaDisabled={!canNext}
                confirmReady={stepIdx === STEPS.length - 1}
                stepIdx={stepIdx}
                totalSteps={STEPS.length}
                onJumpToReview={() => { setSheetOpen(false); setStepIdx(STEPS.length - 1); }}
              />
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

/* ============ Progress rail ============ */
function ProgressRail({ stepIdx, onJump }: { stepIdx: number; onJump: (i: number) => void }) {
  const tr = useT();
  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
      {STEPS.map((s, i) => {
        const I = Icon[s.icon];
        const done = i < stepIdx;
        const active = i === stepIdx;
        const reachable = i <= stepIdx; // forward jumps only via Continue
        return (
          <div key={s.id} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => reachable && onJump(i)}
              disabled={!reachable}
              className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition ${
                active
                  ? "bg-navy-900 text-white shadow-btn-primary"
                  : done
                    ? "bg-teal-50 text-teal-700 hover:bg-teal-100"
                    : "text-slate-500"
              }`}
            >
              <span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold ${
                active ? "bg-white/15" : done ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {done ? <Icon.check size={13} /> : I ? <I size={12} /> : i + 1}
              </span>
              <span className="text-[12px] font-semibold whitespace-nowrap">{tr(s.label)}</span>
              {s.optional && !active && <Badge tone="slate" className="hidden sm:inline-flex">{tr("Optional")}</Badge>}
            </button>
            {i < STEPS.length - 1 && <Icon.chevR size={12} className="text-slate-300 shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

/* ============ Step 1 — People ============ */
function PeopleStep({ people, setPeople, includeTickets, setIncludeTickets, recommendedSets, onPreset }: {
  people: People;
  setPeople: Dispatch<SetStateAction<People>>;
  includeTickets: boolean;
  setIncludeTickets: Dispatch<SetStateAction<boolean>>;
  recommendedSets: number;
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
      {/* Presets */}
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
        </div>
      </div>

      {/* Category steppers */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{tr("Headcount by category")}</div>
        <div className="space-y-1.5">
          {Object.keys(TICKET).map((k) => {
            const t = TICKET[k];
            return (
              <div key={k} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-navy-900">{tr(t.label)}</div>
                  <div className="text-[11px] text-slate-500">€{t.price} {tr("entry")} · {tr(t.sub)}</div>
                </div>
                <Stepper label={tr(t.label)} value={people[k]} onChange={(v) => setPeople((p) => ({ ...p, [k]: v }))} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-recommendation */}
      <div className="rounded-xl ring-1 ring-teal-200 bg-teal-50/70 px-3 py-2.5 flex items-start gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-teal-600 text-white grid place-items-center shrink-0"><Icon.bolt size={15} /></span>
        <div className="text-[13px] text-teal-900 leading-snug">
          {tr("For")} <b>{totalPeople} {totalPeople !== 1 ? tr("guests") : tr("guest")}</b> {tr("we'll suggest")} <b>{recommendedSets} {recommendedSets !== 1 ? tr("umbrella sets") : tr("umbrella set")}</b> {tr("on the next step.")}
          {tr("Each set seats 2 (umbrella + 2 sunbeds).")}
        </div>
      </div>

      {/* Tickets toggle */}
      <button
        onClick={() => setIncludeTickets((v) => !v)}
        className={`w-full flex items-center justify-between rounded-xl px-3 py-3 ring-1 transition ${includeTickets ? "ring-teal-500 bg-teal-50" : "ring-slate-200 bg-white/70 hover:ring-teal-400"}`}
      >
        <span className="flex items-center gap-2.5 min-w-0 text-left">
          <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${includeTickets ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}><Icon.ticket size={17} /></span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-navy-900">{tr("Include entry tickets in this booking")}</span>
            <span className="block text-[11px] text-slate-600">{includeTickets ? tr("We'll bundle one ticket per guest per day.") : tr("Just sunbeds — guests will buy tickets separately.")}</span>
          </span>
        </span>
        <span className={`w-6 h-6 rounded-full grid place-items-center ${includeTickets ? "bg-teal-600 text-white" : "ring-1 ring-slate-300 text-slate-500"}`}>
          {includeTickets ? <Icon.check size={14} /> : <Icon.plus size={14} />}
        </span>
      </button>
    </div>
  );
}

/* ============ Step 2 — Dates ============ */
function DatesStep({ selDates, setSelDates }: { selDates: string[]; setSelDates: Dispatch<SetStateAction<string[]>> }) {
  const tr = useT();
  return (
    <div className="space-y-3">
      <DatePickerRow value={selDates} onChange={setSelDates} />
      <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5 flex items-center gap-2.5 text-[13px] text-slate-700">
        <Icon.calendar size={14} className="text-slate-500 shrink-0" />
        <span>
          <b className="text-navy-900">{selDates.length} {selDates.length !== 1 ? tr("days") : tr("day")}</b> {tr("selected.")}
          {tr("Same selection applies to sunbeds, tickets, locker and parking.")}
        </span>
      </div>
    </div>
  );
}

/* ============ Step 3 — Beach bar zone & sets ============ */
function SetsStep({ zone, zoneId, setZoneId, sets, setSets, recommendedSets, dayCount, bedSel, setBedSel, includeBeach, setIncludeBeach }: {
  zone: WizardZone;
  zoneId: string;
  setZoneId: Dispatch<SetStateAction<string>>;
  sets: number;
  setSets: (v: number) => void;
  recommendedSets: number;
  dayCount: number;
  bedSel: BedPick[];
  setBedSel: Dispatch<SetStateAction<BedPick[]>>;
  includeBeach: boolean;
  setIncludeBeach: Dispatch<SetStateAction<boolean>>;
}) {
  // A compact, representative grid that fits in one view on a phone — no inner
  // scroll, fixed columns (8 on mobile / 12 on desktop), so nothing hides and
  // there's never any horizontal scrolling.
  const tr = useT();
  const grid = useMemo(() => makeGrid(zone, 8, 6), [zone]);
  const toggleBed = (id: string, price: number) => {
    setBedSel((s) => s.find((b) => b.id === id) ? s.filter((b) => b.id !== id) : [...s, { id, price }]);
  };
  const pickedSubtotal = bedSel.reduce((a, b) => a + b.price, 0);
  return (
    <div className="space-y-4">
      {/* Include / skip sunbeds — lets a guest book only a locker or parking. */}
      <button
        onClick={() => setIncludeBeach((v) => !v)}
        className={`w-full flex items-center justify-between rounded-xl px-3 py-3 ring-1 transition ${includeBeach ? "ring-teal-500 bg-teal-50" : "ring-slate-200 bg-white/70 hover:ring-teal-400"}`}
      >
        <span className="flex items-center gap-2.5 min-w-0 text-left">
          <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${includeBeach ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}><Icon.umbrella size={17} /></span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-navy-900">{tr("Add sunbeds to this booking")}</span>
            <span className="block text-[11px] text-slate-600">{includeBeach ? tr("Choose a zone and your umbrella sets below.") : tr("Skipped — continue to add only a locker or parking.")}</span>
          </span>
        </span>
        <span className={`w-6 h-6 rounded-full grid place-items-center ${includeBeach ? "bg-teal-600 text-white" : "ring-1 ring-slate-300 text-slate-500"}`}>
          {includeBeach ? <Icon.check size={14} /> : <Icon.plus size={14} />}
        </span>
      </button>

      {!includeBeach ? (
        <div className="rounded-xl ring-1 ring-dashed ring-slate-300 bg-slate-50 px-3 py-5 text-center text-[13px] text-slate-500">
          {tr("Sunbeds skipped. Toggle on to choose a zone, or continue to the next step.")}
        </div>
      ) : (
        <>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{tr("Pick a zone")}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ZONES.map((z) => {
                const active = z.id === zoneId;
                const pct = Math.round((z.avail / z.total) * 100);
                return (
                  <button key={z.id} onClick={() => setZoneId(z.id)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition text-left ${active ? "ring-navy-900 bg-navy-900 text-white" : "ring-slate-200 bg-white/70 hover:ring-teal-400"}`}>
                    <span className="w-9 h-9 rounded-full grid place-items-center shrink-0" style={{ background: z.color, color: "white" }}>
                      <Icon.umbrella size={16} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-semibold leading-tight">{z.name}</span>
                      <span className={`block text-[11px] tnum ${active ? "text-white/70" : "text-slate-500"}`}>
                        {z.avail}/{z.total} {tr("free")} · {pct}% {tr("available")}
                      </span>
                    </span>
                    <span className={`text-[12px] font-bold tnum shrink-0 ${active ? "text-white" : "text-navy-900"}`}>{tr("from")} €{z.from}</span>
                    {active && <Icon.check size={14} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-semibold text-sm text-navy-900">{tr("Umbrella sets in")} {zone.name}</div>
                <div className="text-[11px] text-slate-500">€{zone.from} {tr("per set / day · suggested for your group:")} <b>{recommendedSets}</b></div>
              </div>
              <Stepper label={tr("umbrella sets")} value={sets} onChange={(v) => setSets(Math.max(1, v))} min={1} />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[12px] text-slate-600">
              <span>{sets} {sets !== 1 ? tr("sets") : tr("set")} × {dayCount} {dayCount !== 1 ? tr("days") : tr("day")}</span>
              <span className="font-semibold text-navy-900 tnum">€{sets * zone.from * dayCount}</span>
            </div>
          </div>

          {/* Inline beach map — pick specific umbrellas. When any are picked, they
              override the abstract stepper count above. Fixed-size, fixed-column
              grid keeps the whole zone visible on a phone in one tap-friendly view. */}
          <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <div className="min-w-0">
                <div className="font-semibold text-sm text-navy-900">{tr("Pick exact umbrellas in")} {zone.name}</div>
                <div className="text-[11px] text-slate-500">
                  {bedSel.length > 0
                    ? <>{tr("Using your")} <b>{bedSel.length}</b> {bedSel.length !== 1 ? tr("picked beds") : tr("picked bed")} — {tr("the stepper above is ignored.")}</>
                    : <>{tr("Optional · tap available (blue) beds to add them, or use the stepper above to auto-assign.")}</>}
                </div>
              </div>
              {bedSel.length > 0 && (
                <button onClick={() => setBedSel([])} className="text-[11px] font-semibold text-slate-500 hover:text-rose-600">
                  {tr("Clear picks")}
                </button>
              )}
            </div>
            <div className="rounded-lg bg-gradient-to-b from-amber-50 to-amber-100/60 ring-1 ring-amber-200/70 p-2">
              <div className="grid grid-cols-8 sm:grid-cols-12 gap-1 sm:gap-1.5">
                {grid.map((b) => {
                  const isSel = !!bedSel.find((x) => x.id === b.id);
                  return (
                    <div key={b.id} className="h-9 sm:h-10" style={{ lineHeight: 0 }}>
                      <Sunbed block fill state={b.s} sel={isSel} label={b.id} price={b.price} onClick={() => toggleBed(b.id, b.price)} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 flex-wrap text-[11px] text-slate-600">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><Sunbed state="a" size={14} />{tr("Available")}</span>
                <span className="flex items-center gap-1"><Sunbed state="h" size={14} />{tr("On hold")}</span>
                <span className="flex items-center gap-1"><Sunbed state="u" size={14} />{tr("Unavailable")}</span>
                <span className="flex items-center gap-1"><Sunbed state="a" sel size={14} />{tr("Selected")}</span>
              </div>
              {bedSel.length > 0 && (
                <span className="font-semibold text-navy-900 tnum">€{pickedSubtotal} × {dayCount} {dayCount !== 1 ? tr("days") : tr("day")} = €{pickedSubtotal * dayCount}</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ============ Step 4 — Locker ============ */
function LockerStep({ on, setOn, qty, setQty, dayCount }: { on: boolean; setOn: Dispatch<SetStateAction<boolean>>; qty: number; setQty: Dispatch<SetStateAction<number>>; dayCount: number }) {
  const tr = useT();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <YesNo on={on} value="yes" onClick={() => setOn(true)} title={tr("Yes, add lockers")} sub={`€${LOCKER_PRICE}/locker/day`} icon={Icon.lock} />
        <YesNo on={!on} value="no" onClick={() => setOn(false)} title={tr("No, skip lockers")} sub={tr("Continue without")} icon={Icon.x} />
      </div>
      {on && (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5 flex items-center justify-between animate-pop">
          <div>
            <div className="font-semibold text-sm text-navy-900">{tr("How many lockers?")}</div>
            <div className="text-[11px] text-slate-500">{qty} × €{LOCKER_PRICE} × {dayCount} {dayCount !== 1 ? tr("days") : tr("day")}</div>
          </div>
          <Stepper label={tr("lockers")} value={qty} onChange={(v) => setQty(Math.max(1, v))} min={1} />
        </div>
      )}
      <div className="text-[12px] text-slate-500 flex items-center gap-1.5">
        <Icon.info size={13} /> {tr("Pick exact lockers later from the My Bookings")} QR.
      </div>
    </div>
  );
}

/* ============ Step 5 — Parking ============ */
function ParkingStep({ on, setOn, plate, setPlate, dayCount }: { on: boolean; setOn: Dispatch<SetStateAction<boolean>>; plate: string; setPlate: Dispatch<SetStateAction<string>>; dayCount: number }) {
  const tr = useT();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <YesNo on={on} value="yes" onClick={() => setOn(true)} title={tr("Yes, reserve parking")} sub={`€${PARKING_PRICE}/spot/day`} icon={Icon.car} />
        <YesNo on={!on} value="no" onClick={() => setOn(false)} title={tr("No, skip parking")} sub={tr("Walking or public transport")} icon={Icon.x} />
      </div>
      {on && (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-3 animate-pop">
          <Field label={tr("Vehicle plate")} hint={tr("Used by the gate camera to let you in automatically.")}>
            <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" />
          </Field>
          <div className="mt-2 flex items-center justify-between text-[12px] text-slate-600">
            <span>{tr("1 spot")} × {dayCount} {dayCount !== 1 ? tr("days") : tr("day")}</span>
            <span className="font-semibold text-navy-900 tnum">€{PARKING_PRICE * dayCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function YesNo({ on, title, sub, icon: IconC, onClick }: { on: boolean; value?: string; title: ReactNode; sub: ReactNode; icon: IconRenderer; onClick: () => void }) {
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

/* ============ Step 6 — Review ============ */
function ReviewStep({ people, totalPeople, selDates, zone, sets, bedSel = [], includeBeach, includeTickets, ticketBreak, lockerOn, lockerQty, parkingOn, plate, onJump }: {
  people: People;
  totalPeople: number;
  selDates: string[];
  dayCount: number;
  zone: WizardZone;
  sets: number;
  bedSel?: BedPick[];
  includeBeach: boolean;
  includeTickets: boolean;
  ticketBreak: TicketBreakItem[];
  lockerOn: boolean;
  lockerQty: number;
  parkingOn: boolean;
  plate: string;
  onJump: (id: string) => void;
}) {
  const tr = useT();
  const dateLabel = selDates.length === 1
    ? chipLabel(selDates[0]).label + ", " + chipLabel(selDates[0]).sub
    : `${selDates.length} ${tr("days")} (${selDates.map((d) => chipLabel(d).sub).join(", ")})`;
  const beachBody = !includeBeach
    ? tr("Not included")
    : bedSel.length > 0
      ? `${zone.name} · ${bedSel.length} ${tr("picked")} · ${bedSel.map((b) => b.id).join(", ")}`
      : `${zone.name} · ${sets} ${sets !== 1 ? tr("umbrella sets") : tr("umbrella set")} · €${zone.from} ${tr("each")}`;
  return (
    <div className="space-y-2">
      <ReviewRow icon={Icon.group} title={tr("Guests")} body={totalPeople > 0 ? `${totalPeople} ${tr("total")} · ${humanPeople(people)}` : tr("None added")} onEdit={() => onJump("people")} />
      <ReviewRow icon={Icon.calendar} title={tr("Dates")} body={dateLabel} onEdit={() => onJump("dates")} />
      <ReviewRow icon={Icon.umbrella} title={tr("Beach bar")} body={beachBody} onEdit={() => onJump("sets")} />
      <ReviewRow
        icon={Icon.ticket}
        title={tr("Entry tickets")}
        body={includeTickets ? ticketBreak.filter((t) => t.n > 0).map((t) => `${t.n} × ${tr(t.t.label)}`).join(" · ") || "—" : tr("Not included")}
        onEdit={() => onJump("people")}
      />
      <ReviewRow icon={Icon.lock} title={tr("Day locker")} body={lockerOn ? `${lockerQty} ${lockerQty !== 1 ? tr("lockers") : tr("locker")}` : tr("Not added")} onEdit={() => onJump("locker")} />
      <ReviewRow icon={Icon.car} title={tr("Parking Spot")} body={parkingOn ? `${tr("1 spot")} · ${plate || tr("plate pending")}` : tr("Not added")} onEdit={() => onJump("parking")} />
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

/* ============ Live basket panel ============ */
function BasketPanel({
  inline = false,
  totalPeople, dayCount,
  lines,
  grandTotal,
  cartCount,
  onEmpty,
  onCta, ctaLabel, ctaDisabled, confirmReady,
  stepIdx, totalSteps, onJumpToReview,
}: {
  inline?: boolean;
  totalPeople: number;
  dayCount: number;
  lines: PanelLine[];
  grandTotal: number;
  cartCount: number;
  onEmpty: () => void;
  onCta: () => void;
  ctaLabel: ReactNode;
  ctaDisabled: boolean;
  confirmReady: boolean;
  stepIdx: number;
  totalSteps: number;
  onJumpToReview: () => void;
}) {
  const tr = useT();
  const Wrap = inline ? "div" : Card;
  const wrapClass = inline ? "" : "glass-card-solid p-5 shadow-float";
  return (
    <Wrap className={wrapClass}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-navy-900 text-white grid place-items-center"><Icon.card size={16} /></span>
          <div>
            <div className="font-display font-bold text-navy-900 text-base leading-tight">{tr("Your booking")}</div>
            <div className="text-[11px] text-slate-500 leading-tight">{tr("Step")} {stepIdx + 1} {tr("of")} {totalSteps} {tr("· live total")}</div>
          </div>
        </div>
        {cartCount > 0 && (
          <Badge tone="blue">+{cartCount} {tr("in basket")}</Badge>
        )}
      </div>

      <div className="space-y-2">
        {totalPeople > 0 && (
          <BasketChip icon={Icon.group} label={tr("Guests")} value={`${totalPeople} · ${dayCount} ${dayCount !== 1 ? tr("days") : tr("day")}`} />
        )}
        {lines.length === 0 ? (
          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-6 text-center">
            <span className="mx-auto mb-2 w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200 grid place-items-center text-slate-400"><Icon.card size={17} /></span>
            <div className="text-[13px] font-semibold text-navy-900">{tr("Your basket is empty")}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{tr("Add sunbeds, tickets, a locker or parking from the steps.")}</div>
          </div>
        ) : (
          <>
            {/* Swipe a line left (or tap the trash) to remove it. */}
            {lines.map((ln) => (
              <SwipeRow key={ln.key} onDelete={ln.onRemove}>
                <BasketLine icon={ln.icon} label={ln.label} sub={ln.sub} amount={ln.amount} onRemove={ln.onRemove} />
              </SwipeRow>
            ))}
            <div className="flex justify-end pt-0.5">
              <button onClick={onEmpty} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600">
                <Icon.trash size={12} /> {tr("Empty basket")}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="my-3 h-px bg-slate-200" />

      <div className="flex items-end justify-between mb-3">
        <div className="text-[12px] text-slate-500 leading-tight">
          {dayCount} {dayCount !== 1 ? tr("days") : tr("day")}{totalPeople > 0 ? ` · ${totalPeople} ${totalPeople !== 1 ? tr("guests") : tr("guest")}` : ""}
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500">{tr("Total")}</div>
          <div className="font-display text-3xl font-bold text-navy-900 tnum tabular-nums leading-none">
            €<LiveEuro value={grandTotal} />
          </div>
        </div>
      </div>

      <Btn variant={confirmReady ? "dark" : "teal"} full size="lg" icon={confirmReady ? Icon.card : Icon.arrowR} onClick={onCta} disabled={ctaDisabled || (confirmReady && grandTotal === 0)}>
        {ctaLabel}
      </Btn>
      {!confirmReady && stepIdx < totalSteps - 1 && (
        <button onClick={onJumpToReview} className="mt-2 w-full text-center text-[11px] text-slate-500 hover:text-navy-900 font-semibold">
          {tr("Skip remaining steps · review now")} →
        </button>
      )}
      {confirmReady && (
        <div className="mt-2 text-center text-[11px] text-slate-500">{tr("Secured by")} Stripe · ΑΠΥ {tr("auto-issued to")} MyDATA</div>
      )}
    </Wrap>
  );
}

/* Renders an integer euro amount, smoothly tweened on change. */
function LiveEuro({ value }: { value: number }) {
  const display = useAnimatedNumber(value);
  return <span className="tnum">{Math.round(display).toLocaleString()}</span>;
}

function BasketChip({ icon: IconC, label, value }: { icon: IconRenderer; label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2">
      <span className="w-7 h-7 rounded-lg bg-white text-slate-600 grid place-items-center shrink-0"><IconC size={14} /></span>
      <div className="flex items-center justify-between flex-1 min-w-0">
        <span className="text-[12px] font-semibold text-navy-900">{label}</span>
        <span className="text-[12px] text-slate-600 tnum">{value}</span>
      </div>
    </div>
  );
}

function BasketLine({ icon: IconC, label, sub, amount, onRemove }: { icon: IconRenderer; label: ReactNode; sub: ReactNode; amount: number; onRemove?: () => void }) {
  const tr = useT();
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-white ring-1 ring-slate-200">
      <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0 bg-teal-50 text-teal-700"><IconC size={14} /></span>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold leading-tight truncate text-navy-900">{label}</div>
        <div className="text-[10.5px] leading-tight truncate text-slate-500">{sub}</div>
      </div>
      <div className="text-[13px] font-bold tnum shrink-0 text-navy-900">
        €<LiveEuro value={amount} />
      </div>
      {onRemove && (
        <button aria-label={tr("Remove item")} onClick={onRemove} className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 shrink-0">
          <Icon.trash size={14} />
        </button>
      )}
    </div>
  );
}
