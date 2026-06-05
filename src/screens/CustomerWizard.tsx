import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../lib/icons";
import { Card, Btn, Badge, Stepper, Input, Field, DatePickerRow } from "../components/ui";
import { Reveal, prefersReducedMotion } from "../lib/motion";
import { Sunbed } from "../components/Beach";
import { ZONES, todayISO, chipLabel, makeGrid } from "../data/beach";
import { useApp, useSpotlight } from "../app/store";
import { TICKET_PRICES, TICKET_META, LOCKER_PRICE, PARKING_PRICE } from "../domain/pricing";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { IconRenderer } from "../lib/icons";

type People = Record<string, number>;
interface BedPick { id: string; price: number }
type WizardZone = (typeof ZONES)[number];
interface TicketBreakItem { k: string; n: number; t: { price: number; label: string; sub: string }; total: number }

/* Pricing now comes from the shared domain module (single source of truth), so
   the wizard, the standalone screens and Checkout can never disagree on a
   price. One "set" = 1 umbrella + 2 sunbeds (capacity 2). */
const TICKET: Record<string, { price: number; label: string; sub: string }> = {
  adult:    { price: TICKET_PRICES.adult,    ...TICKET_META.adult },
  resident: { price: TICKET_PRICES.resident, ...TICKET_META.resident },
  child:    { price: TICKET_PRICES.child,     ...TICKET_META.child },
  senior:   { price: TICKET_PRICES.senior,    ...TICKET_META.senior },
};

const STEPS = [
  { id: "people",  label: "Guests",   icon: "group",    sub: "Tell us who's coming" },
  { id: "dates",   label: "Dates",    icon: "calendar", sub: "Pick one or more days" },
  { id: "sets",    label: "Beach bar",icon: "umbrella", sub: "Choose your zone & sets" },
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
  const { go, toast, addToCart, cart } = useApp();
  useSpotlight("customer", "plan");

  const [stepIdx, setStepIdx] = useState(0);
  const [people, setPeople] = useState<People>({ adult: 2, resident: 0, child: 0, senior: 0 });
  const [includeTickets, setIncludeTickets] = useState(true);
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

  // Follow the recommendation as guests change, so switching presets
  // (Solo/Couple/Family/Group) re-balances the basket. Once the user has
  // explicitly picked a set count on the Sets step, hold that number and only
  // auto-bump upward to never under-cover the group.
  useEffect(() => {
    if (!setsTouched) setSets(recommendedSets);
    else setSets((s) => Math.max(s, recommendedSets));
  }, [recommendedSets, setsTouched]);

  // Bed IDs are zone-scoped — switching zone clears any picked beds.
  useEffect(() => { setBedSel([]); }, [zoneId]);

  // When the user has picked specific beds, those drive the totals and count;
  // otherwise fall back to the abstract sets × zone.from pricing.
  const effectiveSets = bedSel.length > 0 ? bedSel.length : sets;
  const setSubtotal = bedSel.length > 0
    ? bedSel.reduce((a, b) => a + b.price, 0) * dayCount
    : sets * zone.from * dayCount;
  const ticketBreak = Object.entries(people).map(([k, n]) => ({ k, n, t: TICKET[k], total: n * TICKET[k].price * dayCount }));
  const ticketSubtotal = includeTickets ? ticketBreak.reduce((a, b) => a + b.total, 0) : 0;
  const lockerSubtotal = lockerOn ? lockerQty * LOCKER_PRICE * dayCount : 0;
  const parkingSubtotal = parkingOn ? PARKING_PRICE * dayCount : 0;
  const grandTotal = setSubtotal + ticketSubtotal + lockerSubtotal + parkingSubtotal;

  const step = STEPS[stepIdx];
  const canNext = (() => {
    if (step.id === "people") return totalPeople > 0;
    if (step.id === "dates") return dayCount > 0;
    if (step.id === "sets") return sets > 0;
    return true;
  })();
  const next = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  const confirm = () => {
    let added = 0;
    selDates.forEach((iso) => {
      const sub = chipLabel(iso).sub;
      // sunbeds — use the user's picked bed IDs if any, otherwise synthesise
      // IDs in the chosen zone (auto-assign for the abstract `sets` count).
      if (bedSel.length > 0) {
        bedSel.forEach((b) => {
          addToCart({ kind: "sunbed", id: `${b.id}@${iso}`, label: `Sunbed ${b.id}`, sub: `${zone.name} · ${sub}`, price: b.price });
          added++;
        });
      } else {
        for (let i = 0; i < sets; i++) {
          const id = `${zone.prefix}-${String((i + 1) * 7).padStart(2, "0")}@${iso}`;
          addToCart({ kind: "sunbed", id, label: `Sunbed set ${i + 1}`, sub: `${zone.name} · ${sub}`, price: zone.from });
          added++;
        }
      }
      if (includeTickets) {
        ticketBreak.forEach(({ k, n, t }) => {
          if (n > 0) {
            addToCart({ kind: "ticket", id: `${k}@${iso}`, label: `${t.label} × ${n}`, sub: `Entry ticket · ${sub}`, price: n * t.price });
            added++;
          }
        });
      }
      if (lockerOn) {
        for (let i = 0; i < lockerQty; i++) {
          addToCart({ kind: "locker", id: `LK${i + 1}@${iso}`, label: `Day locker ${i + 1}`, sub, price: LOCKER_PRICE });
          added++;
        }
      }
      if (parkingOn) {
        addToCart({ kind: "parking", id: `P@${iso}`, label: "Parking spot", sub: `${plate || "—"} · ${sub}`, price: PARKING_PRICE });
        added++;
      }
    });
    toast(`Booking ready — ${added} item${added !== 1 ? "s" : ""} added to your basket.`, { tone: "success" });
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
                  <div className="font-display font-bold text-navy-900 text-xl sm:text-2xl">{step.label}</div>
                  {step.optional && <Badge tone="slate">Optional</Badge>}
                </div>
                <div className="text-[13px] text-slate-600 mt-0.5">{step.sub}</div>
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
              <Btn variant="ghost" icon={Icon.arrowL} onClick={back} disabled={stepIdx === 0}>Back</Btn>
              <div className="text-[12px] text-slate-500 hidden sm:block">
                {step.optional && <button onClick={next} className="font-semibold hover:text-navy-900">Skip this step →</button>}
              </div>
              {stepIdx < STEPS.length - 1 ? (
                <Btn variant="teal" onClick={next} disabled={!canNext}>
                  Continue <Icon.arrowR size={15} />
                </Btn>
              ) : (
                <Btn variant="dark" icon={Icon.card} onClick={confirm} disabled={grandTotal === 0}>
                  Confirm & checkout · €{grandTotal}
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
            zone={zone} sets={effectiveSets} bedSel={bedSel}
            setSubtotal={setSubtotal}
            includeTickets={includeTickets}
            ticketBreak={ticketBreak}
            ticketSubtotal={ticketSubtotal}
            lockerOn={lockerOn} lockerQty={lockerQty} lockerSubtotal={lockerSubtotal}
            parkingOn={parkingOn} parkingSubtotal={parkingSubtotal}
            grandTotal={grandTotal}
            cartCount={cart.length}
            onCta={stepIdx === STEPS.length - 1 ? confirm : next}
            ctaLabel={stepIdx === STEPS.length - 1 ? "Confirm & checkout" : "Continue"}
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
              <LiveEuro value={grandTotal} /> · {totalPeople} guest{totalPeople !== 1 ? "s" : ""} · {dayCount}d
            </span>
            <span className="block text-[11px] text-white/60">Tap to view your booking</span>
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
          <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm animate-fade-in cursor-default" onClick={() => setSheetOpen(false)} />
          <div className="absolute left-0 right-0 bottom-0 max-h-[88dvh] glass-card-solid rounded-t-2xl ring-1 ring-white/40 shadow-float flex flex-col overflow-hidden animate-slide-up pb-safe">
            <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
              <span className="mx-auto w-10 h-1 rounded-full bg-slate-300 absolute left-1/2 -translate-x-1/2 top-2" />
              <div className="font-display font-bold text-navy-900">Your booking</div>
              <button aria-label="Close" onClick={() => setSheetOpen(false)} className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-white/50"><Icon.x size={18} /></button>
            </div>
            <div className="overflow-y-auto p-4">
              <BasketPanel
                inline
                totalPeople={totalPeople}
                dayCount={dayCount}
                zone={zone} sets={effectiveSets} bedSel={bedSel}
                setSubtotal={setSubtotal}
                includeTickets={includeTickets}
                ticketBreak={ticketBreak}
                ticketSubtotal={ticketSubtotal}
                lockerOn={lockerOn} lockerQty={lockerQty} lockerSubtotal={lockerSubtotal}
                parkingOn={parkingOn} parkingSubtotal={parkingSubtotal}
                grandTotal={grandTotal}
                cartCount={cart.length}
                onCta={stepIdx === STEPS.length - 1 ? () => { setSheetOpen(false); confirm(); } : () => { setSheetOpen(false); next(); }}
                ctaLabel={stepIdx === STEPS.length - 1 ? "Confirm & checkout" : "Continue"}
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
              <span className="text-[12px] font-semibold whitespace-nowrap">{s.label}</span>
              {s.optional && !active && <Badge tone="slate" className="hidden sm:inline-flex">Optional</Badge>}
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
  const totalPeople = Object.values(people).reduce((a, b) => a + b, 0);
  const presets = [
    { id: "solo",   label: "Solo",       sub: "1 person",     v: { adult: 1, resident: 0, child: 0, senior: 0 } },
    { id: "couple", label: "Couple",     sub: "2 people",     v: { adult: 2, resident: 0, child: 0, senior: 0 } },
    { id: "family", label: "Family · 4", sub: "2 adults + 2 kids", v: { adult: 2, resident: 0, child: 2, senior: 0 } },
    { id: "group",  label: "Group · 6",  sub: "Friends day",  v: { adult: 6, resident: 0, child: 0, senior: 0 } },
  ];
  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Quick picks</div>
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
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Headcount by category</div>
        <div className="space-y-1.5">
          {Object.keys(TICKET).map((k) => {
            const t = TICKET[k];
            return (
              <div key={k} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-navy-900">{t.label}</div>
                  <div className="text-[11px] text-slate-500">€{t.price} entry · {t.sub}</div>
                </div>
                <Stepper label={t.label} value={people[k]} onChange={(v) => setPeople((p) => ({ ...p, [k]: v }))} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-recommendation */}
      <div className="rounded-xl ring-1 ring-teal-200 bg-teal-50/70 px-3 py-2.5 flex items-start gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-teal-600 text-white grid place-items-center shrink-0"><Icon.bolt size={15} /></span>
        <div className="text-[13px] text-teal-900 leading-snug">
          For <b>{totalPeople} guest{totalPeople !== 1 ? "s" : ""}</b> we'll suggest <b>{recommendedSets} umbrella set{recommendedSets !== 1 ? "s" : ""}</b> on the next step.
          Each set seats 2 (umbrella + 2 sunbeds).
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
            <span className="block text-[13px] font-semibold text-navy-900">Include entry tickets in this booking</span>
            <span className="block text-[11px] text-slate-600">{includeTickets ? "We'll bundle one ticket per guest per day." : "Just sunbeds — guests will buy tickets separately."}</span>
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
  return (
    <div className="space-y-3">
      <DatePickerRow value={selDates} onChange={setSelDates} />
      <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5 flex items-center gap-2.5 text-[13px] text-slate-700">
        <Icon.calendar size={14} className="text-slate-500 shrink-0" />
        <span>
          <b className="text-navy-900">{selDates.length} day{selDates.length !== 1 ? "s" : ""}</b> selected.
          Same selection applies to sunbeds, tickets, locker and parking.
        </span>
      </div>
    </div>
  );
}

/* ============ Step 3 — Beach bar zone & sets ============ */
function SetsStep({ zone, zoneId, setZoneId, sets, setSets, recommendedSets, dayCount, bedSel, setBedSel }: {
  zone: WizardZone;
  zoneId: string;
  setZoneId: Dispatch<SetStateAction<string>>;
  sets: number;
  setSets: (v: number) => void;
  recommendedSets: number;
  dayCount: number;
  bedSel: BedPick[];
  setBedSel: Dispatch<SetStateAction<BedPick[]>>;
}) {
  const { go } = useApp();
  const grid = useMemo(() => makeGrid(zone), [zone]);
  const toggleBed = (id: string, price: number) => {
    setBedSel((s) => s.find((b) => b.id === id) ? s.filter((b) => b.id !== id) : [...s, { id, price }]);
  };
  const pickedSubtotal = bedSel.reduce((a, b) => a + b.price, 0);
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Pick a zone</div>
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
                    {z.avail}/{z.total} free · {pct}% available
                  </span>
                </span>
                <span className={`text-[12px] font-bold tnum shrink-0 ${active ? "text-white" : "text-navy-900"}`}>from €{z.from}</span>
                {active && <Icon.check size={14} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="font-semibold text-sm text-navy-900">Umbrella sets in {zone.name}</div>
            <div className="text-[11px] text-slate-500">€{zone.from} per set / day · suggested for your group: <b>{recommendedSets}</b></div>
          </div>
          <Stepper label="umbrella sets" value={sets} onChange={(v) => setSets(Math.max(1, v))} min={1} />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[12px] text-slate-600">
          <span>{sets} set{sets !== 1 ? "s" : ""} × {dayCount} day{dayCount !== 1 ? "s" : ""}</span>
          <span className="font-semibold text-navy-900 tnum">€{sets * zone.from * dayCount}</span>
        </div>
      </div>

      {/* Inline beach map — pick specific umbrellas. When any are picked, they
          override the abstract stepper count above. */}
      <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm text-navy-900">Pick exact umbrellas in {zone.name}</div>
            <div className="text-[11px] text-slate-500">
              {bedSel.length > 0
                ? <>Using your <b>{bedSel.length}</b> picked bed{bedSel.length !== 1 ? "s" : ""} — the stepper above is ignored.</>
                : <>Optional · tap available (blue) beds to add them, or use the stepper above to auto-assign.</>}
            </div>
          </div>
          {bedSel.length > 0 && (
            <button onClick={() => setBedSel([])} className="text-[11px] font-semibold text-slate-500 hover:text-rose-600">
              Clear picks
            </button>
          )}
        </div>
        {/* Auto-fill columns keep each umbrella a healthy size and reflow with the
            container — bigger, densely-packed beds on desktop; ~6 tappable columns
            on phones — instead of 14 fixed columns that stranded tiny 16px glyphs
            in huge cells. `fill` scales each glyph to its cell. */}
        <div className="rounded-lg bg-gradient-to-b from-amber-50 to-amber-100/60 ring-1 ring-amber-200/70 p-2 max-h-[300px] sm:max-h-[360px] overflow-auto no-scrollbar">
          <div className="grid gap-1 sm:gap-1.5 grid-cols-[repeat(auto-fill,minmax(40px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(50px,1fr))]">
            {grid.map((b) => {
              const isSel = !!bedSel.find((x) => x.id === b.id);
              return (
                <div key={b.id} className="aspect-square p-0.5" style={{ lineHeight: 0 }}>
                  <Sunbed block fill state={b.s} sel={isSel} label={b.id} price={b.price} onClick={() => toggleBed(b.id, b.price)} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap text-[11px] text-slate-600">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><Sunbed state="a" size={14} />Available</span>
            <span className="flex items-center gap-1"><Sunbed state="h" size={14} />On hold</span>
            <span className="flex items-center gap-1"><Sunbed state="u" size={14} />Unavailable</span>
            <span className="flex items-center gap-1"><Sunbed state="a" sel size={14} />Selected</span>
          </div>
          {bedSel.length > 0 && (
            <span className="font-semibold text-navy-900 tnum">€{pickedSubtotal} × {dayCount} day{dayCount !== 1 ? "s" : ""} = €{pickedSubtotal * dayCount}</span>
          )}
        </div>
      </div>

      <div className="text-[12px] text-slate-500 flex items-center gap-1.5">
        <Icon.info size={13} className="shrink-0" />
        Want the full-screen map experience?
        <button onClick={() => go("customer", "book")}
          className="text-teal-700 hover:text-teal-800 font-semibold">Open the live beach map →</button>
      </div>
    </div>
  );
}

/* ============ Step 4 — Locker ============ */
function LockerStep({ on, setOn, qty, setQty, dayCount }: { on: boolean; setOn: Dispatch<SetStateAction<boolean>>; qty: number; setQty: Dispatch<SetStateAction<number>>; dayCount: number }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <YesNo on={on} value="yes" onClick={() => setOn(true)} title="Yes, add lockers" sub={`€${LOCKER_PRICE}/locker/day`} icon={Icon.lock} />
        <YesNo on={!on} value="no" onClick={() => setOn(false)} title="No, skip lockers" sub="Continue without" icon={Icon.x} />
      </div>
      {on && (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5 flex items-center justify-between animate-pop">
          <div>
            <div className="font-semibold text-sm text-navy-900">How many lockers?</div>
            <div className="text-[11px] text-slate-500">{qty} × €{LOCKER_PRICE} × {dayCount} day{dayCount !== 1 ? "s" : ""}</div>
          </div>
          <Stepper label="lockers" value={qty} onChange={(v) => setQty(Math.max(1, v))} min={1} />
        </div>
      )}
      <div className="text-[12px] text-slate-500 flex items-center gap-1.5">
        <Icon.info size={13} /> Pick exact lockers later from the My Bookings QR.
      </div>
    </div>
  );
}

/* ============ Step 5 — Parking ============ */
function ParkingStep({ on, setOn, plate, setPlate, dayCount }: { on: boolean; setOn: Dispatch<SetStateAction<boolean>>; plate: string; setPlate: Dispatch<SetStateAction<string>>; dayCount: number }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <YesNo on={on} value="yes" onClick={() => setOn(true)} title="Yes, reserve parking" sub={`€${PARKING_PRICE}/spot/day`} icon={Icon.car} />
        <YesNo on={!on} value="no" onClick={() => setOn(false)} title="No, skip parking" sub="Walking or public transport" icon={Icon.x} />
      </div>
      {on && (
        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-3 animate-pop">
          <Field label="Vehicle plate" hint="Used by the gate camera to let you in automatically.">
            <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" />
          </Field>
          <div className="mt-2 flex items-center justify-between text-[12px] text-slate-600">
            <span>1 spot × {dayCount} day{dayCount !== 1 ? "s" : ""}</span>
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
function ReviewStep({ people, totalPeople, selDates, zone, sets, bedSel = [], includeTickets, ticketBreak, lockerOn, lockerQty, parkingOn, plate, onJump }: {
  people: People;
  totalPeople: number;
  selDates: string[];
  dayCount: number;
  zone: WizardZone;
  sets: number;
  bedSel?: BedPick[];
  includeTickets: boolean;
  ticketBreak: TicketBreakItem[];
  lockerOn: boolean;
  lockerQty: number;
  parkingOn: boolean;
  plate: string;
  onJump: (id: string) => void;
}) {
  const dateLabel = selDates.length === 1
    ? chipLabel(selDates[0]).label + ", " + chipLabel(selDates[0]).sub
    : `${selDates.length} days (${selDates.map((d) => chipLabel(d).sub).join(", ")})`;
  const beachBody = bedSel.length > 0
    ? `${bedSel.length} picked · ${bedSel.map((b) => b.id).join(", ")}`
    : `${sets} umbrella set${sets !== 1 ? "s" : ""} · €${zone.from} each`;
  return (
    <div className="space-y-2">
      <ReviewRow icon={Icon.group} title="Guests" body={`${totalPeople} total · ${humanPeople(people)}`} onEdit={() => onJump("people")} />
      <ReviewRow icon={Icon.calendar} title="Dates" body={dateLabel} onEdit={() => onJump("dates")} />
      <ReviewRow icon={Icon.umbrella} title={`Beach bar · ${zone.name}`} body={beachBody} onEdit={() => onJump("sets")} />
      <ReviewRow
        icon={Icon.ticket}
        title="Entry tickets"
        body={includeTickets ? ticketBreak.filter((t) => t.n > 0).map((t) => `${t.n} × ${t.t.label}`).join(" · ") || "—" : "Not included"}
        onEdit={() => onJump("people")}
      />
      <ReviewRow icon={Icon.lock} title="Day locker" body={lockerOn ? `${lockerQty} locker${lockerQty !== 1 ? "s" : ""}` : "Not added"} onEdit={() => onJump("locker")} />
      <ReviewRow icon={Icon.car} title="Parking Spot" body={parkingOn ? `1 spot · ${plate || "plate pending"}` : "Not added"} onEdit={() => onJump("parking")} />
    </div>
  );
}

function ReviewRow({ icon: IconC, title, body, onEdit }: { icon: IconRenderer; title: ReactNode; body: ReactNode; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
      <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 grid place-items-center shrink-0"><IconC size={16} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-navy-900 leading-tight">{title}</div>
        <div className="text-[12px] text-slate-600 leading-snug truncate">{body}</div>
      </div>
      <button onClick={onEdit} className="text-[12px] font-semibold text-teal-700 hover:text-teal-800 px-2 py-1 rounded-lg hover:bg-teal-50">Edit</button>
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
  zone, sets, bedSel = [], setSubtotal,
  includeTickets, ticketBreak,
  lockerOn, lockerQty, lockerSubtotal,
  parkingOn, parkingSubtotal,
  grandTotal,
  cartCount,
  onCta, ctaLabel, ctaDisabled, confirmReady,
  stepIdx, totalSteps, onJumpToReview,
}: {
  inline?: boolean;
  totalPeople: number;
  dayCount: number;
  zone: WizardZone;
  sets: number;
  bedSel?: BedPick[];
  setSubtotal: number;
  includeTickets: boolean;
  ticketBreak: TicketBreakItem[];
  ticketSubtotal?: number;
  lockerOn: boolean;
  lockerQty: number;
  lockerSubtotal: number;
  parkingOn: boolean;
  parkingSubtotal: number;
  grandTotal: number;
  cartCount: number;
  onCta: () => void;
  ctaLabel: ReactNode;
  ctaDisabled: boolean;
  confirmReady: boolean;
  stepIdx: number;
  totalSteps: number;
  onJumpToReview: () => void;
}) {
  const Wrap = inline ? "div" : Card;
  const wrapClass = inline ? "" : "glass-card-solid p-5 shadow-float";
  return (
    <Wrap className={wrapClass}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-navy-900 text-white grid place-items-center"><Icon.card size={16} /></span>
          <div>
            <div className="font-display font-bold text-navy-900 text-base leading-tight">Your booking</div>
            <div className="text-[11px] text-slate-500 leading-tight">Step {stepIdx + 1} of {totalSteps} · live total</div>
          </div>
        </div>
        {cartCount > 0 && (
          <Badge tone="blue">+{cartCount} in basket</Badge>
        )}
      </div>

      <div className="space-y-2">
        <BasketChip icon={Icon.group} label="Guests" value={`${totalPeople} · ${dayCount} day${dayCount !== 1 ? "s" : ""}`} />
        <BasketLine
          icon={Icon.umbrella}
          label={`${zone.name} · ${sets} ${bedSel.length > 0 ? "bed" : "set"}${sets !== 1 ? "s" : ""}`}
          sub={bedSel.length > 0
            ? `Picked: ${bedSel.map((b) => b.id).join(", ")} × ${dayCount} day${dayCount !== 1 ? "s" : ""}`
            : `€${zone.from} × ${sets} × ${dayCount} day${dayCount !== 1 ? "s" : ""}`}
          amount={setSubtotal}
          on={sets > 0}
        />
        {includeTickets && ticketBreak.filter((t) => t.n > 0).map((t) => (
          <BasketLine
            key={t.k}
            icon={Icon.ticket}
            label={`${t.t.label} × ${t.n}`}
            sub={`€${t.t.price} × ${t.n} × ${dayCount} day${dayCount !== 1 ? "s" : ""}`}
            amount={t.total}
            on
          />
        ))}
        {!includeTickets && (
          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-[12px] text-slate-500 flex items-center gap-2">
            <Icon.ticket size={13} /> Tickets not included
          </div>
        )}
        <BasketLine
          icon={Icon.lock}
          label={lockerOn ? `Day locker × ${lockerQty}` : "Day locker"}
          sub={lockerOn ? `€${LOCKER_PRICE} × ${lockerQty} × ${dayCount} day${dayCount !== 1 ? "s" : ""}` : "Not added"}
          amount={lockerSubtotal}
          on={lockerOn}
          muted={!lockerOn}
        />
        <BasketLine
          icon={Icon.car}
          label="Parking spot"
          sub={parkingOn ? `€${PARKING_PRICE} × ${dayCount} day${dayCount !== 1 ? "s" : ""}` : "Not added"}
          amount={parkingSubtotal}
          on={parkingOn}
          muted={!parkingOn}
        />
      </div>

      <div className="my-3 h-px bg-slate-200" />

      <div className="flex items-end justify-between mb-3">
        <div className="text-[12px] text-slate-500 leading-tight">
          {dayCount} day{dayCount !== 1 ? "s" : ""} · {totalPeople} guest{totalPeople !== 1 ? "s" : ""}
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500">Total</div>
          <div className="font-display text-3xl font-bold text-navy-900 tnum tabular-nums leading-none">
            €<LiveEuro value={grandTotal} />
          </div>
        </div>
      </div>

      <Btn variant={confirmReady ? "dark" : "teal"} full size="lg" icon={confirmReady ? Icon.card : Icon.arrowR} onClick={onCta} disabled={ctaDisabled || grandTotal === 0}>
        {ctaLabel}
      </Btn>
      {!confirmReady && stepIdx < totalSteps - 1 && (
        <button onClick={onJumpToReview} className="mt-2 w-full text-center text-[11px] text-slate-500 hover:text-navy-900 font-semibold">
          Skip remaining steps · review now →
        </button>
      )}
      {confirmReady && (
        <div className="mt-2 text-center text-[11px] text-slate-500">Secured by Stripe · ΑΠΥ auto-issued to MyDATA</div>
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

function BasketLine({ icon: IconC, label, sub, amount, on, muted }: { icon: IconRenderer; label: ReactNode; sub: ReactNode; amount: number; on?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all ${muted ? "bg-slate-50 ring-1 ring-slate-200" : "bg-white ring-1 ring-slate-200"} ${on ? "animate-pop" : ""}`}>
      <span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${muted ? "bg-slate-100 text-slate-400" : "bg-teal-50 text-teal-700"}`}><IconC size={14} /></span>
      <div className="flex-1 min-w-0">
        <div className={`text-[12.5px] font-semibold leading-tight truncate ${muted ? "text-slate-500" : "text-navy-900"}`}>{label}</div>
        <div className={`text-[10.5px] leading-tight truncate ${muted ? "text-slate-400" : "text-slate-500"}`}>{sub}</div>
      </div>
      <div className={`text-[13px] font-bold tnum shrink-0 ${muted ? "text-slate-300" : "text-navy-900"}`}>
        €<LiveEuro value={amount} />
      </div>
    </div>
  );
}
