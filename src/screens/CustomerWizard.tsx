import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../lib/icons";
import { Card, Btn, Badge, Stepper, Input, Field, DatePickerRow, SwipeRow, Toggle } from "../components/ui";
import { Reveal, prefersReducedMotion } from "../lib/motion";
import { Sunbed, BeachBackdrop } from "../components/Beach";

// Lazy so the konva canvas bundle only downloads when a guest actually zooms
// into a zone — keeps it off the initial load.
const BeachCanvas = lazy(() => import("../components/BeachCanvas").then((m) => ({ default: m.BeachCanvas })));
import { ZONES, ZONE_BLOCKS, FACILITIES, todayISO, chipLabel, zoneLayout } from "../data/beach";
import type { SunbedSlot } from "../domain/types";
import { useApp, useSpotlight, useT } from "../app/store";
import { localeFor } from "../app/i18n";
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
  { id: "beach",   label: "Beach",    icon: "umbrella", sub: "Pick your zone, sunbeds & days" },
  { id: "people",  label: "Guests",   icon: "group",    sub: "Tell us who's coming" },
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
  const { go, toast, addToCart, cart, clearCart, hint, lang } = useApp();
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
  // Beach comes before Guests now, so the basket starts empty and fills as the
  // guest picks sunbeds, then sets a headcount on the Guests step.
  const [people, setPeople] = useState<People>({ adult: 0, resident: 0, child: 0, senior: 0 });
  const [includeTickets, setIncludeTickets] = useState(true);
  const [selDates, setSelDates] = useState([todayISO()]);
  const [multiDate, setMultiDate] = useState(false); // single day by default; opt-in to several
  const [zoneId, setZoneId] = useState("central");
  // Explicit umbrella-set picks from the beach zoom — the single source of truth
  // for sunbeds in this booking (zone-scoped; cleared when the zone changes).
  const [bedSel, setBedSel] = useState<BedPick[]>([]);
  const [lockerOn, setLockerOn] = useState(false);
  const [lockerQty, setLockerQty] = useState(1);
  const [parkingOn, setParkingOn] = useState(false);
  const [plate, setPlate] = useState("");

  const totalPeople = people.adult + people.resident + people.child + people.senior;
  const dayCount = selDates.length;
  const zone = ZONES.find((z) => z.id === zoneId) || ZONES[0];

  // Bed IDs are zone-scoped — switching zone clears any picked beds.
  useEffect(() => { setBedSel([]); }, [zoneId]);

  // Sunbeds come only from the umbrellas the guest picked, across every day.
  const effectiveSets = bedSel.length;
  const setSubtotal = bedSel.reduce((a, b) => a + b.price, 0) * dayCount;
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
    const snap = bedSel;
    setBedSel([]);
    toast(tr("Removed sunbeds."), { action: { label: tr("Undo"), onClick: () => setBedSel(snap) } });
  };
  const removeTicketCat = (k: string) => {
    const prev = people[k];
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
    const snap = { people, includeTickets, bedSel, lockerOn, lockerQty, parkingOn, plate, cart: [...cart] };
    setIncludeTickets(false);
    setBedSel([]);
    setLockerOn(false);
    setParkingOn(false);
    setPeople({ adult: 0, resident: 0, child: 0, senior: 0 });
    clearCart();
    toast(tr("Basket emptied."), { action: { label: tr("Undo"), onClick: () => {
      setPeople(snap.people); setIncludeTickets(snap.includeTickets);
      setBedSel(snap.bedSel);
      setLockerOn(snap.lockerOn); setLockerQty(snap.lockerQty); setParkingOn(snap.parkingOn); setPlate(snap.plate);
      snap.cart.forEach(addToCart);
    } } });
  };

  // The removable lines the basket panel renders, derived from live state.
  const lines: PanelLine[] = [];
  if (effectiveSets > 0) {
    lines.push({
      key: "beach",
      icon: Icon.umbrella,
      label: `${zone.name} · ${effectiveSets} ${effectiveSets !== 1 ? tr("sets") : tr("set")}`,
      sub: `${tr("Picked")}: ${bedSel.map((b) => b.id).join(", ")} × ${dayCount}d`,
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
      const sub = chipLabel(iso, localeFor(lang)).sub;
      // sunbeds — the umbrella sets the guest picked, replicated per chosen day.
      bedSel.forEach((b) => {
        addToCart({ kind: "sunbed", id: `${b.id}@${iso}`, label: `${tr("Sunbed")} ${b.id}`, sub: `${zone.name} · ${sub}`, price: b.price });
        added++;
      });
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
    <div className="animate-fade-up grid lg:grid-cols-[1fr_360px] gap-5 pb-2 lg:pb-5">
      {/* ============ LEFT: wizard ============ */}
      <div className="space-y-4 min-w-0">
        {/* Stepper rail */}
        <Card className="p-3 sm:p-4">
          <ProgressRail stepIdx={stepIdx} onJump={(i) => setStepIdx(i)} />
        </Card>

        {/* Step card */}
        <Reveal as="div" key={step.id} className="reveal">
          <Card className="p-5 sm:p-6">
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

            {step.id === "beach" && (
              <BeachStep
                zone={zone} zoneId={zoneId} setZoneId={setZoneId}
                bedSel={bedSel} setBedSel={setBedSel}
                selDates={selDates} setSelDates={setSelDates}
                multiDate={multiDate} setMultiDate={setMultiDate}
                dayCount={dayCount}
              />
            )}
            {step.id === "people" && (
              <PeopleStep
                people={people} setPeople={setPeople}
                includeTickets={includeTickets} setIncludeTickets={setIncludeTickets}
                pickedSets={bedSel.length}
                onPreset={(v) => setPeople(v)}
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
                zone={zone} bedSel={bedSel}
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

      {/* The live-basket panel is desktop-only (the right rail). On mobile the
          top-bar cart is the single basket, and each step carries its own
          running total plus the footer Back / Continue — so no pinned bottom
          bar is needed. */}
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
function PeopleStep({ people, setPeople, includeTickets, setIncludeTickets, pickedSets, onPreset }: {
  people: People;
  setPeople: Dispatch<SetStateAction<People>>;
  includeTickets: boolean;
  setIncludeTickets: Dispatch<SetStateAction<boolean>>;
  pickedSets: number;
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

      {/* Cross-check against the umbrella sets picked on the Beach step. */}
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

/* Each beach facility → a pin glyph; restrooms have no clean icon so they
   render as a tiny "WC" text pin. */
const FACILITY_ICON: Record<string, IconRenderer | undefined> = {
  bar: Icon.glass,
  shower: Icon.drop,
  first: Icon.cross,
  wc: undefined,
};

/* Plain-language location of a zone, derived from its position on the beach
   overview (ZONE_BLOCKS) + the nearest bar landmark (FACILITIES) — e.g.
   "in the centre of the beach · steps from the Beach bar". */
function zoneLocationText(zoneId: string, tr: (s: string) => string): string {
  const blk = ZONE_BLOCKS.find((b) => b.id === zoneId);
  if (!blk) return "";
  const cx = parseFloat(blk.left) + parseFloat(blk.w) / 2;
  const horiz =
    cx < 24 ? tr("at the western end of the beach")
      : cx < 42 ? tr("towards the west side")
        : cx < 58 ? tr("in the centre of the beach")
          : cx < 78 ? tr("towards the east side")
            : tr("at the eastern end of the beach");
  const bars = FACILITIES.filter((f) => f.kind === "bar");
  if (!bars.length) return horiz;
  const nearest = bars.reduce((a, b) =>
    Math.abs(parseFloat(b.left) - cx) < Math.abs(parseFloat(a.left) - cx) ? b : a,
  );
  return `${horiz} · ${tr("steps from the")} ${tr(nearest.label)}`;
}

/* ---------- Aerial zone locator ----------
   A tap-to-select aerial of the tenant beach: every zone is drawn at its real
   ZONE_BLOCKS position so the guest sees where each sits relative to the sea
   (top) and the bars/facilities, then reads a plain-language location for the
   selected one. Selection is shared with the zone list below. */
function ZoneLocatorMap({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const tr = useT();
  const selected = ZONES.find((z) => z.id === selectedId);
  return (
    <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm text-navy-900">{tr("Find your spot on the beach")}</div>
          <div className="text-[11px] text-slate-500">{tr("Tap a zone to see where it sits — the sea is at the top.")}</div>
        </div>
        <Badge tone="green"><Icon.map size={11} /> {tr("Live map")}</Badge>
      </div>

      <BeachBackdrop className="aspect-video max-w-[640px] mx-auto ring-1 ring-white/50 shadow-soft">
        {/* Orientation labels — sea (top) → promenade (bottom). */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-white/90 text-[10px] font-bold uppercase tracking-[0.22em] drop-shadow">
          <Icon.wave size={12} /> {tr("Sea")}
        </div>
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-white/75 text-[9px] font-semibold uppercase tracking-[0.18em] drop-shadow">
          {tr("Promenade")}
        </div>

        {/* Facility landmarks (decorative — the zone buttons carry the semantics). */}
        {FACILITIES.map((f) => {
          const IconC = FACILITY_ICON[f.kind];
          return (
            <div key={f.id} aria-hidden className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: f.left, top: f.top }} title={f.label}>
              <span className="w-5 h-5 rounded-full bg-white/85 ring-1 ring-navy-900/10 grid place-items-center text-navy-700 shadow-sm">
                {IconC ? <IconC size={11} /> : <span className="text-[7px] font-bold leading-none">WC</span>}
              </span>
            </div>
          );
        })}

        {/* Zone clusters, positioned + angled exactly like the full-beach overview. */}
        {ZONES.map((z, i) => {
          const blk = ZONE_BLOCKS.find((b) => b.id === z.id);
          if (!blk) return null;
          const active = z.id === selectedId;
          return (
            <button
              key={z.id}
              onClick={() => onSelect(z.id)}
              aria-pressed={active}
              aria-label={`${z.name} — ${z.avail} ${tr("of")} ${z.total} ${tr("free")}, ${tr("from")} €${z.from}${active ? `, ${tr("selected")}` : ""}`}
              className="absolute origin-center focus:outline-none focus-visible:z-30 group animate-fade-in"
              style={{ left: blk.left, top: blk.top, width: blk.w, transform: `rotate(${blk.rot}deg)`, animationDelay: `${i * 80}ms` }}
            >
              <span
                className={`relative block rounded-[7px] px-1 pt-1 pb-0.5 ring-1 transition-all duration-300 ease-spring ${active ? "scale-110 ring-white shadow-[0_8px_24px_-6px_rgba(11,37,69,.55)] z-20" : "ring-white/40 group-hover:scale-105 group-hover:-translate-y-0.5 group-hover:ring-white/80"}`}
                style={{ background: active ? z.color : `${z.color}d9` }}
              >
                <span className="grid grid-cols-4 gap-[2px] mb-0.5 justify-items-center">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <i key={i} className="w-[3px] h-[3px] rounded-full bg-white/85" />
                  ))}
                </span>
                <span className="block text-center text-[9px] font-bold text-white leading-none tracking-wide drop-shadow-sm">{z.prefix}</span>
                {active && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white text-teal-600 grid place-items-center shadow ring-1 ring-black/5">
                    <Icon.check size={9} />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </BeachBackdrop>

      {/* Derived, human-readable location of the selected zone. */}
      <p className="mt-2.5 flex items-start gap-2 text-[12px] text-slate-600 leading-snug">
        <Icon.map size={14} className="text-teal-600 shrink-0 mt-0.5" />
        <span><b className="text-navy-900">{selected?.name}</b> {tr("is")} {zoneLocationText(selectedId, tr)}.</span>
      </p>
    </div>
  );
}

/* ============ Step 1 — Beach: zone overview → zoom to sunbeds (+ dates) ============
   The immersive entry point. Choose a day (or several), see every zone on the
   beach, tap one to zoom into its umbrella layout on a Konva canvas, then tap the
   umbrellas you want. The picks are the single source of truth for sunbeds. */
function BeachStep({ zone, zoneId, setZoneId, bedSel, setBedSel, selDates, setSelDates, multiDate, setMultiDate, dayCount }: {
  zone: WizardZone;
  zoneId: string;
  setZoneId: Dispatch<SetStateAction<string>>;
  bedSel: BedPick[];
  setBedSel: Dispatch<SetStateAction<BedPick[]>>;
  selDates: string[];
  setSelDates: Dispatch<SetStateAction<string[]>>;
  multiDate: boolean;
  setMultiDate: (v: boolean) => void;
  dayCount: number;
}) {
  const tr = useT();
  const { beachLayout } = useApp();
  const [zoomed, setZoomed] = useState(false);
  // The admin-authored layout for this zone, if any — otherwise the default grid.
  const slots = useMemo(() => beachLayout[zone.id] ?? zoneLayout(zone), [beachLayout, zone]);
  const selectedIds = useMemo(() => new Set(bedSel.map((b) => b.id)), [bedSel]);
  const toggle = (slot: SunbedSlot) =>
    setBedSel((s) => (s.find((b) => b.id === slot.id) ? s.filter((b) => b.id !== slot.id) : [...s, { id: slot.id, price: slot.price }]));
  // Opening a zone commits it (which clears prior picks via the wizard effect)
  // and zooms in to its umbrella layout.
  const openZone = (id: string) => { setZoneId(id); setZoomed(true); };
  const pickedSubtotal = bedSel.reduce((a, b) => a + b.price, 0);
  const avail = slots.filter((s) => s.state === "a").length;

  return (
    <div className="space-y-4">
      {/* Dates — apply to the whole booking; visible while you pick. */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5"><Icon.calendar size={12} /> {tr("When are you coming?")}</div>
        <DatePickerRow value={selDates} onChange={setSelDates} multiple={multiDate} />
        <div className="mt-2 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-[12.5px]">
            <Icon.calendar size={13} className="text-slate-500 shrink-0 mt-0.5" />
            <span className="text-slate-700">{multiDate
              ? <><b className="text-navy-900">{selDates.length} {selDates.length !== 1 ? tr("days") : tr("day")}</b> {tr("selected")}</>
              : tr("Book several days at once")}</span>
          </div>
          <Toggle on={multiDate} onChange={(v) => { setMultiDate(v); if (!v && selDates.length > 1) setSelDates([selDates[0]]); }} />
        </div>
      </div>

      {!zoomed ? (
        /* ---- Overview: all the zones on the beach ---- */
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5"><Icon.umbrella size={12} /> {tr("Tap a zone to choose your spot")}</div>
          <ZoneLocatorMap selectedId={zoneId} onSelect={openZone} />
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ZONES.map((z) => {
              const active = z.id === zoneId;
              return (
                <button key={z.id} onClick={() => openZone(z.id)}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ring-1 transition text-left ${active ? "ring-navy-900 bg-navy-900 text-white" : "ring-slate-200 bg-white/70 hover:ring-teal-400"}`}>
                  <span className="w-8 h-8 rounded-full grid place-items-center shrink-0" style={{ background: z.color, color: "white" }}><Icon.umbrella size={15} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-tight truncate">{z.name}</span>
                    <span className={`block text-[10.5px] tnum ${active ? "text-white/70" : "text-slate-500"}`}>{tr("from")} €{z.from} · {z.avail} {tr("free")}</span>
                  </span>
                  <Icon.chevR size={14} className={active ? "text-white/80 shrink-0" : "text-slate-300 shrink-0"} />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* ---- Zoom: the selected zone's umbrella layout (Konva canvas) ---- */
        <div className="animate-scale-in">
          <div className="flex items-center justify-between gap-2 mb-2">
            <button onClick={() => setZoomed(false)} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600 hover:text-navy-900 rounded-lg px-2 py-1 hover:bg-slate-100">
              <Icon.arrowL size={14} /> {tr("All zones")}
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-lg grid place-items-center shrink-0" style={{ background: zone.color, color: "white" }}><Icon.umbrella size={13} /></span>
              <div className="font-display font-bold text-navy-900 text-sm truncate">{zone.name}</div>
              <Badge tone="green">{avail} {tr("free")}</Badge>
            </div>
          </div>

          <Suspense fallback={<div className="w-full aspect-[5/3] rounded-2xl bg-gradient-to-b from-sky-100 to-amber-100/60 ring-1 ring-white/50 animate-pulse" />}>
            <BeachCanvas slots={slots} selected={selectedIds} onToggle={toggle} seaLabel={tr("Sea · front row")} backLabel={tr("Promenade")} />
          </Suspense>

          <div className="mt-2 flex items-center justify-between gap-2 flex-wrap text-[11px] text-slate-600">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><Sunbed state="a" size={14} />{tr("Available")}</span>
              <span className="flex items-center gap-1"><Sunbed state="h" size={14} />{tr("On hold")}</span>
              <span className="flex items-center gap-1"><Sunbed state="u" size={14} />{tr("Taken")}</span>
              <span className="flex items-center gap-1"><Sunbed state="a" sel size={14} />{tr("Yours")}</span>
            </div>
            {bedSel.length > 0 && (
              <button onClick={() => setBedSel([])} className="text-[11px] font-semibold text-slate-500 hover:text-rose-600">{tr("Clear")}</button>
            )}
          </div>

          <div className={`mt-2 rounded-xl px-3 py-2.5 ring-1 flex items-center justify-between gap-3 ${bedSel.length > 0 ? "ring-teal-300 bg-teal-50/80" : "ring-slate-200 bg-white/70"}`}>
            {bedSel.length > 0 ? (
              <>
                <div className="min-w-0 text-[12.5px]">
                  <div className="font-semibold text-navy-900 truncate">{bedSel.length} {bedSel.length !== 1 ? tr("umbrella sets") : tr("umbrella set")} · {bedSel.map((b) => b.id).join(", ")}</div>
                  <div className="text-[11px] text-slate-600">€{pickedSubtotal} × {dayCount} {dayCount !== 1 ? tr("days") : tr("day")}</div>
                </div>
                <div className="font-display font-bold text-navy-900 tnum shrink-0">€{pickedSubtotal * dayCount}</div>
              </>
            ) : (
              <div className="text-[12.5px] text-slate-600">{tr("Tap the blue umbrellas to pick your sets — or continue with just a locker or parking.")}</div>
            )}
          </div>
        </div>
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
function ReviewStep({ people, totalPeople, selDates, zone, bedSel = [], includeTickets, ticketBreak, lockerOn, lockerQty, parkingOn, plate, onJump }: {
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
  parkingOn: boolean;
  plate: string;
  onJump: (id: string) => void;
}) {
  const tr = useT();
  const { lang } = useApp();
  const loc = localeFor(lang);
  const first = chipLabel(selDates[0], loc, tr);
  const dateLabel = selDates.length === 1
    ? first.label + ", " + first.sub
    : `${selDates.length} ${tr("days")} (${selDates.map((d) => chipLabel(d, loc).sub).join(", ")})`;
  const beachBody = bedSel.length > 0
    ? `${zone.name} · ${bedSel.length} ${bedSel.length !== 1 ? tr("sets") : tr("set")} · ${bedSel.map((b) => b.id).join(", ")}`
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
  const wrapClass = inline ? "" : "p-5 shadow-float";
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
