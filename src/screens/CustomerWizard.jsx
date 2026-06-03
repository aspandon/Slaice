import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Card, Btn, Badge, Stepper, Input, Field, DatePickerRow } from "../components/ui.jsx";
import { Reveal, prefersReducedMotion } from "../lib/motion.jsx";
import { ZONES, todayISO, chipLabel } from "../data/beach.js";
import { useApp, useSpotlight } from "../app/store.jsx";

/* Pricing tied to the existing customer pages so the wizard adds the same
   items to the cart as the standalone screens. One "set" = 1 umbrella + 2
   sunbeds (capacity 2). */
const TICKET = {
  adult:    { price: 10, label: "Adult",            sub: "Standard entry" },
  resident: { price: 6,  label: "Alimos resident",  sub: "Proof at gate" },
  child:    { price: 5,  label: "Child (6–12)",     sub: "Under 6 free" },
  senior:   { price: 7,  label: "Senior 65+",       sub: "ID required" },
};
const LOCKER_PRICE = 5;
const PARKING_PRICE = 15;

const STEPS = [
  { id: "people",  label: "Guests",   icon: "group",    sub: "Tell us who's coming" },
  { id: "dates",   label: "Dates",    icon: "calendar", sub: "Pick one or more days" },
  { id: "sets",    label: "Beach bar",icon: "umbrella", sub: "Choose your zone & sets" },
  { id: "locker",  label: "Locker",   icon: "lock",     sub: "Add a day locker (optional)", optional: true },
  { id: "parking", label: "Parking",  icon: "car",      sub: "Reserve a spot (optional)",    optional: true },
  { id: "review",  label: "Review",   icon: "checkCircle", sub: "Confirm & checkout" },
];

/* Smoothly tween a numeric value whenever it changes — used by the live total
   so the user actually sees the balance move when toggling a service. */
function useAnimatedNumber(value, duration = 480) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (prefersReducedMotion()) { setDisplay(value); prev.current = value; return; }
    const from = prev.current;
    const to = value;
    if (from === to) return;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
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
  const [people, setPeople] = useState({ adult: 2, resident: 0, child: 0, senior: 0 });
  const [includeTickets, setIncludeTickets] = useState(true);
  const [selDates, setSelDates] = useState([todayISO()]);
  const [zoneId, setZoneId] = useState("central");
  const [sets, setSets] = useState(1);
  const [lockerOn, setLockerOn] = useState(false);
  const [lockerQty, setLockerQty] = useState(1);
  const [parkingOn, setParkingOn] = useState(false);
  const [plate, setPlate] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const totalPeople = people.adult + people.resident + people.child + people.senior;
  const recommendedSets = Math.max(1, Math.ceil(Math.max(totalPeople, 1) / 2));
  const dayCount = selDates.length;
  const zone = ZONES.find((z) => z.id === zoneId) || ZONES[0];

  // Auto-bump set count when the head-count grows past what's covered.
  // Never auto-shrink — users may deliberately want fewer sets than people.
  useEffect(() => {
    if (recommendedSets > sets) setSets(recommendedSets);
  }, [recommendedSets]);

  const setSubtotal = sets * zone.from * dayCount;
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
      // sunbeds — assign synthetic IDs in the chosen zone (no map step here)
      for (let i = 0; i < sets; i++) {
        const id = `${zone.prefix}-${String((i + 1) * 7).padStart(2, "0")}@${iso}`;
        addToCart({ kind: "sunbed", id, label: `Sunbed set ${i + 1}`, sub: `${zone.name} · ${sub}`, price: zone.from });
        added++;
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
              />
            )}
            {step.id === "dates" && (
              <DatesStep selDates={selDates} setSelDates={setSelDates} />
            )}
            {step.id === "sets" && (
              <SetsStep
                zone={zone} zoneId={zoneId} setZoneId={setZoneId}
                sets={sets} setSets={setSets}
                recommendedSets={recommendedSets}
                dayCount={dayCount}
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
                zone={zone} sets={sets}
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
          </Card>
        </Reveal>

        {/* Footer nav */}
        <div className="flex items-center justify-between gap-3">
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
      </div>

      {/* ============ RIGHT: live basket panel (desktop) ============ */}
      <div className="hidden lg:block">
        <div className="sticky top-[88px]">
          <BasketPanel
            totalPeople={totalPeople}
            dayCount={dayCount}
            zone={zone} sets={sets}
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

      {/* ============ Mobile: tap-to-expand basket bar ============ */}
      <button
        onClick={() => setSheetOpen(true)}
        className="lg:hidden fixed bottom-3 left-3 right-3 z-30 glass-dark text-white rounded-2xl shadow-float ring-1 ring-white/15 px-4 py-3 flex items-center justify-between gap-3"
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

      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm animate-fade-in" onClick={() => setSheetOpen(false)} />
          <div className="absolute left-0 right-0 bottom-0 max-h-[88vh] glass-card-solid rounded-t-2xl ring-1 ring-white/40 shadow-float flex flex-col overflow-hidden animate-slide-up">
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
                zone={zone} sets={sets}
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
      )}
    </div>
  );
}

/* ============ Progress rail ============ */
function ProgressRail({ stepIdx, onJump }) {
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
function PeopleStep({ people, setPeople, includeTickets, setIncludeTickets, recommendedSets }) {
  const totalPeople = Object.values(people).reduce((a, b) => a + b, 0);
  const preset = (next) => setPeople(next);
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
              <button key={p.id} onClick={() => preset(p.v)}
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
                <Stepper value={people[k]} onChange={(v) => setPeople((p) => ({ ...p, [k]: v }))} />
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
function DatesStep({ selDates, setSelDates }) {
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
function SetsStep({ zone, zoneId, setZoneId, sets, setSets, recommendedSets, dayCount }) {
  const { go } = useApp();
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
          <Stepper value={sets} onChange={(v) => setSets(Math.max(1, v))} min={1} />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[12px] text-slate-600">
          <span>{sets} set{sets !== 1 ? "s" : ""} × {dayCount} day{dayCount !== 1 ? "s" : ""}</span>
          <span className="font-semibold text-navy-900 tnum">€{sets * zone.from * dayCount}</span>
        </div>
      </div>

      <div className="text-[12px] text-slate-500 flex items-center gap-1.5">
        <Icon.info size={13} className="shrink-0" />
        Want to pick exact beds on the map?
        <button onClick={() => go("customer", "book")}
          className="text-teal-700 hover:text-teal-800 font-semibold">Open the live beach map →</button>
      </div>
    </div>
  );
}

/* ============ Step 4 — Locker ============ */
function LockerStep({ on, setOn, qty, setQty, dayCount }) {
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
          <Stepper value={qty} onChange={(v) => setQty(Math.max(1, v))} min={1} />
        </div>
      )}
      <div className="text-[12px] text-slate-500 flex items-center gap-1.5">
        <Icon.info size={13} /> Pick exact lockers later from the My Bookings QR.
      </div>
    </div>
  );
}

/* ============ Step 5 — Parking ============ */
function ParkingStep({ on, setOn, plate, setPlate, dayCount }) {
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

function YesNo({ on, title, sub, icon: IconC, onClick }) {
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
function ReviewStep({ people, totalPeople, selDates, dayCount, zone, sets, includeTickets, ticketBreak, lockerOn, lockerQty, parkingOn, plate, onJump }) {
  const dateLabel = selDates.length === 1
    ? chipLabel(selDates[0]).label + ", " + chipLabel(selDates[0]).sub
    : `${selDates.length} days (${selDates.map((d) => chipLabel(d).sub).join(", ")})`;
  return (
    <div className="space-y-2">
      <ReviewRow icon={Icon.group} title="Guests" body={`${totalPeople} total · ${humanPeople(people)}`} onEdit={() => onJump("people")} />
      <ReviewRow icon={Icon.calendar} title="Dates" body={dateLabel} onEdit={() => onJump("dates")} />
      <ReviewRow icon={Icon.umbrella} title={`Beach bar · ${zone.name}`} body={`${sets} umbrella set${sets !== 1 ? "s" : ""} · €${zone.from} each`} onEdit={() => onJump("sets")} />
      <ReviewRow
        icon={Icon.ticket}
        title="Entry tickets"
        body={includeTickets ? ticketBreak.filter((t) => t.n > 0).map((t) => `${t.n} × ${t.t.label}`).join(" · ") || "—" : "Not included"}
        onEdit={() => onJump("people")}
      />
      <ReviewRow icon={Icon.lock} title="Day locker" body={lockerOn ? `${lockerQty} locker${lockerQty !== 1 ? "s" : ""}` : "Not added"} onEdit={() => onJump("locker")} />
      <ReviewRow icon={Icon.car} title="Parking" body={parkingOn ? `1 spot · ${plate || "plate pending"}` : "Not added"} onEdit={() => onJump("parking")} />
    </div>
  );
}

function ReviewRow({ icon: IconC, title, body, onEdit }) {
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

function humanPeople(p) {
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
  zone, sets, setSubtotal,
  includeTickets, ticketBreak, ticketSubtotal,
  lockerOn, lockerQty, lockerSubtotal,
  parkingOn, parkingSubtotal,
  grandTotal,
  cartCount,
  onCta, ctaLabel, ctaDisabled, confirmReady,
  stepIdx, totalSteps, onJumpToReview,
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
          label={`${zone.name} · ${sets} set${sets !== 1 ? "s" : ""}`}
          sub={`€${zone.from} × ${sets} × ${dayCount} day${dayCount !== 1 ? "s" : ""}`}
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
function LiveEuro({ value }) {
  const display = useAnimatedNumber(value);
  return <span className="tnum">{Math.round(display).toLocaleString()}</span>;
}

function BasketChip({ icon: IconC, label, value }) {
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

function BasketLine({ icon: IconC, label, sub, amount, on, muted }) {
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
