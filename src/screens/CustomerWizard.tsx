import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Icon } from "../lib/icons";
import type { IconRenderer } from "../lib/icons";
import { Btn, Badge, Stepper, Input, Field, DatePickerRow, Toggle } from "../components/ui";
import { prefersReducedMotion } from "../lib/motion";
import { Sunbed, SunbedMark } from "../components/Beach";
import { ZONES, ZONE_BLOCKS, todayISO, chipLabel, zoneLayout } from "../data/beach";
import type { SunbedSlot } from "../domain/types";
import { useApp, useSpotlight, useT } from "../app/store";
import { localeFor } from "../app/i18n";
import { TICKET_PRICES, TICKET_META, LOCKER_PRICE, PARKING_PRICE } from "../domain/pricing";

type People = Record<string, number>;
interface BedPick { id: string; price: number }
type WizardZone = (typeof ZONES)[number];
type BeachPhase = "zones" | "sets";
interface TicketBreakItem { k: string; n: number; t: { price: number; label: string; sub: string }; total: number }

/* Pricing comes from the shared domain module (single source of truth), so the
   wizard and Checkout can never disagree. One "set" = 1 umbrella + 2 sunbeds. */
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
export function CustomerWizard() {
  const tr = useT();
  const { go, toast, addToCart, hint, lang, beachLayout } = useApp();
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
  const [selDates, setSelDates] = useState([todayISO()]);
  const [multiDate, setMultiDate] = useState(false);
  const [zoneId, setZoneId] = useState("central");
  // Explicit umbrella-set picks — the single source of truth for sunbeds
  // (zone-scoped; cleared when the zone changes).
  const [bedSel, setBedSel] = useState<BedPick[]>([]);
  const [lockerOn, setLockerOn] = useState(false);
  const [lockerQty, setLockerQty] = useState(1);
  const [parkingOn, setParkingOn] = useState(false);
  const [plate, setPlate] = useState("");
  // Within the Beach step: choosing a zone vs. tapping its sets.
  const [phase, setPhase] = useState<BeachPhase>("zones");

  const totalPeople = people.adult + people.resident + people.child + people.senior;
  const dayCount = selDates.length;
  const zone = ZONES.find((z) => z.id === zoneId) || ZONES[0];

  // Bed IDs are zone-scoped — switching zone clears any picked beds.
  useEffect(() => { setBedSel([]); }, [zoneId]);

  // The admin-authored layout for this zone, if any — otherwise the default grid.
  const slots = useMemo(() => beachLayout[zone.id] ?? zoneLayout(zone), [beachLayout, zone]);
  const selectedIds = useMemo(() => new Set(bedSel.map((b) => b.id)), [bedSel]);
  const avail = useMemo(() => slots.filter((s) => s.state === "a").length, [slots]);

  const setSubtotal = bedSel.reduce((a, b) => a + b.price, 0) * dayCount;
  const ticketBreak = Object.entries(people).map(([k, n]) => ({ k, n, t: TICKET[k], total: n * TICKET[k].price * dayCount }));
  const ticketSubtotal = includeTickets ? ticketBreak.reduce((a, b) => a + b.total, 0) : 0;
  const lockerSubtotal = lockerOn ? lockerQty * LOCKER_PRICE * dayCount : 0;
  const parkingSubtotal = parkingOn ? PARKING_PRICE * dayCount : 0;
  const grandTotal = setSubtotal + ticketSubtotal + lockerSubtotal + parkingSubtotal;

  const step = STEPS[stepIdx];
  const last = STEPS.length - 1;

  const pickZone = (id: string) => { setZoneId(id); setPhase("sets"); };
  const toggleBed = (slot: SunbedSlot) =>
    setBedSel((s) => (s.find((b) => b.id === slot.id) ? s.filter((b) => b.id !== slot.id) : [...s, { id: slot.id, price: slot.price }]));

  const next = () => setStepIdx((i) => Math.min(last, i + 1));
  // Back walks the flow in reverse: sets → zones → out to Home.
  const back = () => {
    if (stepIdx === 0) {
      if (step.id === "beach" && phase === "sets") { setPhase("zones"); return; }
      go("customer", "home");
      return;
    }
    setStepIdx((i) => Math.max(0, i - 1));
  };

  const confirm = () => {
    let added = 0;
    selDates.forEach((iso) => {
      const sub = chipLabel(iso, localeFor(lang)).sub;
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

  // The sand carries the zone choices, then the sunbed sets — but only on the
  // Beach step itself. Once the guest moves on, the beach clears (no sets shown
  // on Guests / Locker / Parking / Review).
  const showZones = step.id === "beach" && phase === "zones";
  const showSets = step.id === "beach" && phase === "sets";
  const revealDelay = prefersReducedMotion() ? "0ms" : "420ms";

  return (
    <div className="fixed inset-0 z-20 flex flex-col pointer-events-none select-none">
      {/* ============ Menu over the sea (top) ============
           When picking sunbeds, the min-height holds the menu band down to ~the
           shoreline so the sets always start on the sand (never the sea). The
           store overview gives the menu band less reserved height so the
           clusters get more room to spread. */}
      <div className={`shrink-0 flex items-start justify-center px-3 pt-2 sm:pt-3 ${showSets ? "min-h-[50vh]" : "min-h-[38vh]"}`}>
        <div className="pointer-events-auto w-full max-w-2xl glass-card rounded-3xl shadow-float flex flex-col max-h-[64vh] overflow-hidden animate-fade-down">
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
              <BeachMenu
                selDates={selDates} setSelDates={setSelDates}
                multiDate={multiDate} setMultiDate={setMultiDate}
                phase={phase} setPhase={setPhase}
                zone={zone} bedSel={bedSel} setBedSel={setBedSel}
                avail={avail} dayCount={dayCount}
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
            {step.id === "locker" && <LockerStep on={lockerOn} setOn={setLockerOn} qty={lockerQty} setQty={setLockerQty} dayCount={dayCount} />}
            {step.id === "parking" && <ParkingStep on={parkingOn} setOn={setParkingOn} plate={plate} setPlate={setPlate} dayCount={dayCount} />}
            {step.id === "review" && (
              <ReviewStep
                people={people} totalPeople={totalPeople}
                selDates={selDates} dayCount={dayCount}
                zone={zone} bedSel={bedSel}
                includeTickets={includeTickets} ticketBreak={ticketBreak}
                lockerOn={lockerOn} lockerQty={lockerQty}
                parkingOn={parkingOn} plate={plate}
                onJump={(id) => { const i = STEPS.findIndex((s) => s.id === id); if (i >= 0) setStepIdx(i); }}
              />
            )}
          </div>

          {/* Pinned footer — live total + nav. */}
          <div className="flex items-center justify-between gap-3 p-4 sm:p-5 pt-3 border-t border-slate-200/70 shrink-0">
            <div className="leading-tight">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{tr("Total")}</div>
              <div className="font-display text-2xl font-bold text-navy-900 tnum leading-none">€<LiveEuro value={grandTotal} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="ghost" icon={Icon.arrowL} onClick={back}>
                {stepIdx === 0 && phase === "zones" ? tr("Home") : tr("Back")}
              </Btn>
              {stepIdx < last ? (
                <Btn variant="teal" onClick={next}>{tr("Continue")} <Icon.arrowR size={15} /></Btn>
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
        <div className="relative w-full max-w-5xl">
          {showZones && <StoreOverview selectedId={zoneId} onPick={pickZone} />}
          {showSets && <SandSunbeds slots={slots} selected={selectedIds} onToggle={toggleBed} />}
        </div>
      </div>

      {/* ============ Bottom bar — guidance + always-on Slaice credit ============ */}
      <div className="shrink-0 px-3 pb-1.5 pt-1 pointer-events-none">
        {(showZones || showSets) && (
          <div className="max-w-3xl mx-auto pointer-events-auto">
            {showZones && (
              <div className="rounded-2xl glass px-4 py-2.5 flex items-center justify-center gap-2.5 text-center">
                <span className="w-7 h-7 rounded-lg bg-teal-600 text-white grid place-items-center shrink-0"><Icon.umbrella size={14} /></span>
                <span className="text-[12.5px] text-navy-900"><b>{tr("Tap a zone on the beach")}</b> {tr("to choose where you'll sit — the sea is at the top.")}</span>
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
                active ? "bg-navy-900 text-white shadow-btn-primary" : done ? "bg-teal-50 text-teal-700 hover:bg-teal-100" : "text-slate-500"
              }`}
            >
              <span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold ${active ? "bg-white/15" : done ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {done ? <Icon.check size={13} /> : I ? <I size={12} /> : i + 1}
              </span>
              <span className="text-[12px] font-semibold whitespace-nowrap">{tr(s.label)}</span>
            </button>
            {i < STEPS.length - 1 && <Icon.chevR size={12} className="text-slate-300 shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

/* ============ Beach step — menu side (dates + phase controls) ============
   The map and the sunbed grid have moved onto the page background; the menu keeps
   the dates and the supporting info (zone summary, legend, picks). */
function BeachMenu({ selDates, setSelDates, multiDate, setMultiDate, phase, setPhase, zone, bedSel, setBedSel, avail, dayCount }: {
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
  return (
    <div className="space-y-4">
      {/* Dates — apply to the whole booking. */}
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

          {bedSel.length > 0 && (
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
   Desktop (with room): each store rendered as its real umbrella layout, placed on
   the beach map at the admin's position and auto-spaced so clusters never
   overlap, with the store name + optional logo beneath. Tap to open it. Phones /
   tight screens fall back to compact cards with less detail. */
function StoreOverview({ selectedId, onPick }: { selectedId: string; onPick: (id: string) => void }) {
  const rich = useMediaQuery("(min-width: 1024px) and (min-height: 640px)");
  return rich ? <StoreClusters selectedId={selectedId} onPick={onPick} /> : <StoreCards selectedId={selectedId} onPick={onPick} />;
}

function StoreClusters({ selectedId, onPick }: { selectedId: string; onPick: (id: string) => void }) {
  const tr = useT();
  const { beachLayout, zoneLogos } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); setBox({ w: Math.round(r.width), h: Math.round(r.height) }); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cw = clampN(box.w * 0.18, 150, 220);
  const plotH = cw * 0.66;
  const ch = plotH + 48; // + the name/logo band
  const glyph = plotH * 0.14;

  const positions = useMemo(() => {
    if (!box.w || !box.h) return [];
    const init = ZONES.map((z) => {
      const blk = ZONE_BLOCKS.find((b) => b.id === z.id);
      const left = blk ? parseFloat(blk.left) + parseFloat(blk.w) / 2 : 50;
      const depth = blk ? clampN((parseFloat(blk.top) - 71) / 6, 0, 1) : 0.5;
      return { x: (left / 100) * box.w, y: ch / 2 + 6 + depth * Math.max(0, box.h - ch - 12) };
    });
    return declutter(init, box.w, box.h, cw, ch, 16);
  }, [box, cw, ch]);

  return (
    <div ref={ref} className="absolute inset-0">
      {ZONES.map((z, i) => {
        const pos = positions[i];
        if (!pos) return null;
        const slots = beachLayout[z.id] ?? zoneLayout(z);
        const free = slots.filter((s) => s.state === "a").length;
        const logo = zoneLogos[z.id];
        const active = z.id === selectedId;
        return (
          <button
            key={z.id}
            onClick={() => onPick(z.id)}
            aria-pressed={active}
            aria-label={`${z.name} — ${slots.length} ${tr("sets")}, ${free} ${tr("free")}, ${tr("from")} €${z.from}${active ? `, ${tr("selected")}` : ""}`}
            className="absolute group focus:outline-none focus-visible:z-30 animate-fade-up pointer-events-auto text-left"
            style={{ left: pos.x - cw / 2, top: pos.y - ch / 2, width: cw, animationDelay: `${i * 60}ms` }}
          >
            <span className={`block rounded-2xl ring-1 transition-all duration-300 ease-spring ${active ? "ring-white scale-[1.03] shadow-[0_16px_40px_-8px_rgba(11,37,69,.55)] z-10" : "ring-white/40 group-hover:-translate-y-1 group-hover:ring-white/80 shadow-lift"}`} style={{ background: active ? `${z.color}f2` : `${z.color}d9` }}>
              {/* The store's real umbrella layout. */}
              <span className="relative block w-full rounded-t-2xl overflow-hidden" style={{ height: plotH, background: "rgba(8,24,45,0.14)" }}>
                {slots.map((s) => (
                  <span key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%`, top: `${s.y}%`, width: glyph, height: glyph }}>
                    <SunbedMark state={s.state} fill />
                  </span>
                ))}
              </span>
              {/* Logo + name + counts. */}
              <span className="block px-2 py-1.5 text-center">
                {logo && <img src={logo} alt="" className="mx-auto mb-1 h-6 w-auto max-w-[72%] object-contain drop-shadow" />}
                <span className="block text-white font-bold text-[13px] leading-tight drop-shadow-sm">{z.name}</span>
                <span className="block text-white/85 text-[10px] tnum mt-0.5">{tr("from")} €{z.from} · {slots.length} {tr("sets")} · {free} {tr("free")}</span>
              </span>
              {active && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-teal-600 grid place-items-center shadow ring-1 ring-black/5">
                  <Icon.check size={12} />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* Compact store cards — phones / tight screens. Less detail (logo, name, from
   price) in a tidy two-column grid so nothing overlaps. */
function StoreCards({ selectedId, onPick }: { selectedId: string; onPick: (id: string) => void }) {
  const tr = useT();
  const { zoneLogos } = useApp();
  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar">
      <div className="grid grid-cols-2 gap-2.5 p-0.5">
        {ZONES.map((z) => {
          const active = z.id === selectedId;
          const logo = zoneLogos[z.id];
          return (
            <button
              key={z.id}
              onClick={() => onPick(z.id)}
              aria-pressed={active}
              className={`rounded-2xl p-3 text-center ring-1 transition animate-fade-up ${active ? "ring-white scale-[1.02] shadow-lift" : "ring-white/40 active:scale-[.98] shadow-soft"}`}
              style={{ background: active ? `${z.color}f2` : `${z.color}d9` }}
            >
              {logo ? (
                <img src={logo} alt="" className="mx-auto mb-1.5 h-9 w-auto max-w-[72%] object-contain drop-shadow" />
              ) : (
                <span className="mx-auto mb-1.5 w-9 h-9 rounded-lg bg-white/20 grid place-items-center text-white"><Icon.umbrella size={18} /></span>
              )}
              <span className="block text-white font-bold text-[14px] drop-shadow-sm">{z.name}</span>
              <span className="block text-white/85 text-[11px] tnum mt-0.5">{tr("from")} €{z.from}</span>
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
   its nearest neighbour so glyphs keep clear air and never collide. */
function SandSunbeds({ slots, selected, onToggle, readOnly = false }: {
  slots: SunbedSlot[];
  selected: Set<string>;
  onToggle?: (s: SunbedSlot) => void;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
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
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: size, height: size }}
        >
          <Sunbed state={s.state} sel={selected.has(s.id)} price={s.price} label={s.id} fill readOnly={readOnly} onClick={readOnly ? undefined : () => onToggle?.(s)} />
        </div>
      ))}
    </div>
  );
}

/* ============ Guests ============ */
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

      {/* Entry-tickets toggle sits right under the quick picks. */}
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
function LockerStep({ on, setOn, qty, setQty, dayCount }: { on: boolean; setOn: Dispatch<SetStateAction<boolean>>; qty: number; setQty: Dispatch<SetStateAction<number>>; dayCount: number }) {
  const tr = useT();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <YesNo on={on} onClick={() => setOn(true)} title={tr("Yes, add lockers")} sub={`€${LOCKER_PRICE}/locker/day`} icon={Icon.lock} />
        <YesNo on={!on} onClick={() => setOn(false)} title={tr("No, skip lockers")} sub={tr("Continue without")} icon={Icon.x} />
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

/* ============ Parking ============ */
function ParkingStep({ on, setOn, plate, setPlate, dayCount }: { on: boolean; setOn: Dispatch<SetStateAction<boolean>>; plate: string; setPlate: Dispatch<SetStateAction<string>>; dayCount: number }) {
  const tr = useT();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <YesNo on={on} onClick={() => setOn(true)} title={tr("Yes, reserve parking")} sub={`€${PARKING_PRICE}/spot/day`} icon={Icon.car} />
        <YesNo on={!on} onClick={() => setOn(false)} title={tr("No, skip parking")} sub={tr("Walking or public transport")} icon={Icon.x} />
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

/* Renders an integer euro amount, smoothly tweened on change. */
function LiveEuro({ value }: { value: number }) {
  const display = useAnimatedNumber(value);
  return <span className="tnum">{Math.round(display).toLocaleString()}</span>;
}
