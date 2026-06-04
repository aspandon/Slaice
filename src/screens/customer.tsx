import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import type { IconRenderer } from "../lib/icons";
import { Card, Btn, Badge, PageHead, Table, Stepper, Toggle, Input, Field, EmptyState, ErrorState, StatusBadge, TableSkeleton, CardGridSkeleton, StatCard, Tabs, DatePickerRow, Modal, StickyActionBar } from "../components/ui";
import { WalletButtons } from "../components/WalletPass";
import { Reveal } from "../lib/motion";
import { QR, Sparkline } from "../components/charts";
import { Sunbed, BeachBackdrop } from "../components/Beach";
import { downloadPDF, downloadZIP, buildPDFBytes } from "../lib/download";
import { ZONES, ZONE_BLOCKS, FACILITIES, WEATHER, QUICK_PICKS, makeGrid, chipLabel, todayISO } from "../data/beach";
import { listCustomerBookings, listCustomerDocuments } from "../api";
import { useAsync } from "../lib/useAsync";
import { LOCKER_PRICE } from "../domain/pricing";
import type { CartItem, CustomerBooking, CustomerDocument } from "../domain/types";
import { useApp, useSpotlight, useT } from "../app/store";

type Zone = (typeof ZONES)[number];
type Facility = (typeof FACILITIES)[number];
interface SelBed { id: string; zone: string; price: number }

/* ============ HOME ============
   Unified glass aesthetic over the beach backdrop: a slim promo pill, a
   hero card with soft gradient orbs (no heavy colored slab), and a single
   service grid where Sunbed Booking is the featured tile. */
export function CustomerHome() {
  const { go } = useApp();
  const tr = useT();
  const [promoDismissed, setPromoDismissed] = useState(false);
  const services = [
    { k: "book",    t: tr("home.tile.book.t"),    d: tr("home.tile.book.d"),    ic: Icon.umbrella, accent: "teal",   meta: tr("home.tile.book.meta"),    metaTone: "green", featured: true },
    { k: "ticket",  t: tr("home.tile.ticket.t"),  d: tr("home.tile.ticket.d"),  ic: Icon.ticket,   accent: "navy" },
    { k: "locker",  t: tr("home.tile.locker.t"),  d: tr("home.tile.locker.d"),  ic: Icon.lock,     accent: "amber",  meta: tr("home.tile.locker.meta"),  metaTone: "green" },
    { k: "parking", t: tr("home.tile.parking.t"), d: tr("home.tile.parking.d"), ic: Icon.car,      accent: "indigo", meta: tr("home.tile.parking.meta"), metaTone: "green" },
  ];
  const accents: Record<string, string> = {
    teal:   "from-teal-400 to-teal-600",
    navy:   "from-navy-700 to-navy-900",
    amber:  "from-amber-400 to-gold-600",
    indigo: "from-slaice-500 to-slaice-700",
  };

  return (
    <div className="animate-fade-up space-y-4">
      {/* Guided-booking hero — the primary entry point, so it sits first,
          directly under the nav; the promo bar and shortcuts follow below. */}
      <Reveal as="button" onClick={() => go("customer", "plan")} className="text-left group block w-full">
        <Card hover press className="glass-card-solid relative overflow-hidden p-6 sm:p-9">
          <div aria-hidden className="absolute -top-28 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-teal-300/45 via-teal-400/20 to-transparent blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-gradient-to-tr from-gold-300/35 via-amber-300/15 to-transparent blur-3xl" />
          <div aria-hidden className="absolute top-1/3 right-1/3 w-44 h-44 rounded-full bg-gradient-to-br from-coral-300/25 to-transparent blur-2xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              <span className="w-6 h-6 rounded-full grid place-items-center bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-sm"><Icon.sun size={11} /></span>
              {tr("home.greeting")} · {tr("home.sunny")} 28°
            </div>
            <h1 className="mt-3 font-display font-bold text-[28px] sm:text-[36px] leading-[1.05] tracking-tight text-navy-900 max-w-2xl">
              {tr("home.hero.title")} <span className="text-teal-700">{tr("home.hero.title2")}</span>
            </h1>
            <div className="text-[14px] text-slate-700 mt-3 max-w-xl">
              {tr("home.hero.sub")}
            </div>
            <span className="mt-6 inline-flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-semibold bg-navy-900 text-white shadow-btn-primary group-hover:translate-x-0.5 transition">
              <Icon.sparkles size={16} /> {tr("home.hero.cta")} <Icon.arrowR size={16} />
            </span>
          </div>
        </Card>
      </Reveal>

      {!promoDismissed && (
        <div className="glass rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg grid place-items-center bg-gradient-to-br from-gold-400 to-gold-600 text-white shrink-0 shadow-sm"><Icon.bolt size={14} /></span>
          <span className="flex-1 min-w-0 text-[13px] text-navy-900">
            <b className="font-semibold">{tr("home.promo.bold")}</b> {tr("home.promo.text")}
            <span className="text-slate-700 hidden sm:inline"> · {tr("home.promo.hours")}</span>
          </span>
          <button onClick={() => go("customer", "book")} className="text-[12.5px] font-semibold text-teal-700 hover:text-teal-800 rounded-md px-2 py-1 whitespace-nowrap">{tr("home.promo.claim")} →</button>
          <button aria-label="Dismiss offer" onClick={() => setPromoDismissed(true)} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:text-navy-900 hover:bg-white/60 shrink-0"><Icon.x size={14} /></button>
        </div>
      )}

      {/* Returning-guest shortcut — jump straight back to the favourite zone. */}
      <button onClick={() => go("customer", "book")} className="glass rounded-2xl px-3.5 py-2.5 w-full flex items-center gap-3 text-left hover:bg-white/70 transition group">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white grid place-items-center shrink-0"><Icon.umbrella size={17} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-semibold text-navy-900">{tr("home.rebook.title")}</span>
          <span className="block text-[12px] text-slate-600 truncate">{tr("home.rebook.sub")}</span>
        </span>
        <Icon.chevR size={16} className="text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition shrink-0" />
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {services.map((t, i) => (
          <Reveal as="button" key={t.k} delay={i * 60} onClick={() => go("customer", t.k)}
            className={`text-left group ${t.featured ? "sm:col-span-2 lg:col-span-2" : ""}`}>
            <Card hover press className="glass-card relative overflow-hidden p-5 h-full">
              {t.featured && (
                <div aria-hidden className="absolute -top-16 -right-10 w-44 h-44 rounded-full bg-gradient-to-br from-teal-300/35 to-transparent blur-2xl" />
              )}
              <div className="relative flex items-start justify-between gap-2">
                <div className={`w-11 h-11 rounded-2xl grid place-items-center text-white shadow-sm bg-gradient-to-br ${accents[t.accent]} transition-transform duration-300 ease-spring group-hover:scale-110 group-hover:-rotate-3`}>
                  <t.ic size={20} />
                </div>
                {t.meta && <Badge tone={t.metaTone || "slate"}>{t.meta}</Badge>}
              </div>
              <div className="relative mt-3 font-display font-bold text-navy-900 flex items-center gap-1 text-[15.5px]">
                {t.t}<Icon.chevR size={15} className="transition-transform duration-200 group-hover:translate-x-1 text-teal-600" />
              </div>
              <div className="relative text-[12.5px] text-slate-700 mt-0.5">{t.d}</div>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ============ SUNBED BOOKING helpers ============ */

// Hover tooltip rendered above the zone pill — a 6×4 sample of sunbeds so
// the user can sneak-peek occupancy before zooming in.
function ZonePreview({ zone }: { zone: Zone }) {
  const grid = useMemo(() => makeGrid(zone, 6, 4).slice(0, 24), [zone.id]);
  return (
    <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-44 rounded-xl bg-white shadow-float ring-1 ring-slate-200 p-2.5 animate-pop">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold text-navy-900">{zone.name}</span>
        <span className="text-[10px] text-slate-500 tnum">{zone.avail}/{zone.total} · €{zone.from}+</span>
      </div>
      <div className="grid gap-[2px] rounded-md p-1 bg-slate-50 ring-1 ring-slate-100" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        {grid.map((b) => (
          <div key={b.id} className="aspect-square" style={{ lineHeight: 0 }}>
            <Sunbed state={b.s} size={12} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Facility pin (bar / WC / shower / first aid) positioned over the beach.
// Label shows on hover (desktop) AND on tap (touch) so it's never hover-only.
function FacilityPin({ facility }: { facility: Facility }) {
  const [show, setShow] = useState(false);
  const kind = facility.kind;
  const cfg = {
    bar:    { icon: Icon.glass,  tint: "from-amber-400 to-amber-600",  ring: "ring-amber-200" },
    wc:     { icon: Icon.cross,  tint: "from-slate-500 to-slate-700",  ring: "ring-slate-200" },
    shower: { icon: Icon.drop,   tint: "from-sky-400 to-sky-600",      ring: "ring-sky-200" },
    first:  { icon: Icon.shield, tint: "from-rose-400 to-rose-600",    ring: "ring-rose-200" },
  }[kind] || { icon: Icon.info, tint: "from-slate-500 to-slate-700", ring: "ring-slate-200" };
  return (
    <div className="absolute z-10 group" style={{ left: facility.left, top: facility.top }}>
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={facility.label}
        className={`w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center text-white bg-gradient-to-br ${cfg.tint} ring-2 ring-white shadow-md hover:scale-110 active:scale-95 transition`}>
        <cfg.icon size={14} />
      </button>
      <div className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-navy-900 ring-1 ${cfg.ring} shadow transition pointer-events-none ${show ? "opacity-100" : "opacity-0"} group-hover:opacity-100`}>
        {facility.label}
      </div>
    </div>
  );
}

/* ============ SUNBED BOOKING (hero, matches the video) ============ */
export function CustomerBooking() {
  const { go, toast, cart, addToCart, removeFromCart } = useApp();
  useSpotlight("customer", "book");
  const [step, setStep] = useState<"zones" | "grid">("zones");
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [selDates, setSelDates] = useState([todayISO()]); // multi-select ISO dates
  const [sel, setSel] = useState<SelBed[]>([]);
  const [extras, setExtras] = useState({ ticket: false, locker: false });
  const [sheetOpen, setSheetOpen] = useState(false); // mobile basket bottom-sheet
  const [railOpen, setRailOpen] = useState(false); // mobile: expand Who/When/Where controls
  const [hoveredZone, setHoveredZone] = useState<string | null>(null); // zone-pill preview
  const [search, setSearch] = useState("");
  const [searchHit, setSearchHit] = useState<{ zoneId: string; bedId: string } | null>(null);
  const zone = ZONES.find((z) => z.id === zoneId) || null;
  const grid = useMemo(() => (zone ? makeGrid(zone) : []), [zoneId]);

  // Hold timer — like ticketing/airline checkout: once beds are selected we
  // "hold" them for 10 minutes so a contested spot isn't lost mid-flow. The
  // hold starts on first selection, resets when the selection is cleared, and
  // releases the beds (with a toast) when it lapses.
  const HOLD_MS = 10 * 60 * 1000;
  const [holdUntil, setHoldUntil] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    if (sel.length === 0) { setHoldUntil(null); return; }
    setHoldUntil((h) => h ?? Date.now() + HOLD_MS);
  }, [sel.length]);
  useEffect(() => {
    if (!holdUntil) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [holdUntil]);
  const holdLeft = holdUntil ? Math.max(0, holdUntil - nowTs) : 0;
  useEffect(() => {
    if (holdUntil && holdLeft === 0) {
      setSel([]);
      toast("Your held sunbeds were released — pick again when you're ready.", { tone: "warn" });
    }
  }, [holdLeft, holdUntil]);
  const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

  const addBed = (id: string, price: number) => { if (!zone) return; setSel((c) => (c.find((x) => x.id === id) ? c : [...c, { id, zone: zone.name, price }])); };
  const rm = (id: string) => setSel((c) => c.filter((x) => x.id !== id));

  // Quick-pick: pick the zone with the most availability, then pick N
  // available beds matching the preset (adjacent / front-row / cheapest).
  const applyPreset = (preset: (typeof QUICK_PICKS)[number]) => {
    const z = [...ZONES].sort((a, b) => b.avail - a.avail)[0];
    const g = makeGrid(z);
    let pick: typeof g = [];
    if (preset.id === "front") {
      pick = g.filter((b) => b.s === "a" && b.r === 0).slice(0, preset.beds);
    } else if (preset.id === "solo") {
      pick = [...g].filter((b) => b.s === "a").sort((a, b) => a.price - b.price).slice(0, 1);
    } else {
      // walk rows looking for N consecutive available beds
      for (let r = 0; r < 8 && pick.length === 0; r++) {
        const row = g.filter((b) => b.r === r);
        for (let c = 0; c + preset.beds <= row.length; c++) {
          const slice = row.slice(c, c + preset.beds);
          if (slice.every((b) => b.s === "a")) { pick = slice; break; }
        }
      }
    }
    if (pick.length === 0) { toast("No matching beds free in that zone right now.", { tone: "warn" }); return; }
    setZoneId(z.id); setStep("grid");
    setSel(pick.map((b) => ({ id: b.id, zone: z.name, price: b.price })));
    toast(`${preset.label}: ${pick.length} bed${pick.length > 1 ? "s" : ""} pre-selected in ${z.name}.`, { tone: "success" });
  };

  // Search by bed id ("AK-12" / "ce 89" / "MC03") — jumps to the zone
  // and pulses the matching tile for ~2.5s so the eye can find it.
  const runSearch = (q: string) => {
    const m = String(q).toUpperCase().match(/([A-Z]{2})[\s-]*(\d{1,3})/);
    if (!m) { toast("Type a sunbed id like AK-12 or CE-89.", { tone: "warn" }); return; }
    const [, pfx, num] = m;
    const z = ZONES.find((x) => x.prefix === pfx);
    if (!z) { toast(`No zone with prefix ${pfx}.`, { tone: "warn" }); return; }
    const id = `${pfx}-${String(parseInt(num, 10)).padStart(2, "0")}`;
    setZoneId(z.id); setStep("grid"); setSearchHit({ zoneId: z.id, bedId: id });
    setTimeout(() => setSearchHit(null), 2500);
    toast(`Jumped to ${id} in ${z.name}.`, { tone: "success" });
  };
  const clearSel = () => { const prev = sel; setSel([]); toast("Selection cleared.", { action: { label: "Undo", onClick: () => setSel(prev) } }); };
  const removeCartItem = (it: CartItem) => { removeFromCart(it.kind, it.id); toast(`Removed ${it.label}.`, { action: { label: "Undo", onClick: () => addToCart(it) } }); };
  // Bundle pricing — adding a ticket/locker alongside a sunbed is cheaper than
  // buying it standalone (€10→€8, €5→€4), nudging attach rate.
  const BUNDLE = { ticket: 8, locker: 4 };
  const dayCount = selDates.length;
  const sunTotal = sel.reduce((a, b) => a + b.price, 0) * dayCount;
  const extrasTotal = ((extras.ticket ? BUNDLE.ticket : 0) + (extras.locker ? BUNDLE.locker : 0)) * dayCount;
  const total = sunTotal + extrasTotal;
  const focused = step === "grid" && zone;

  const reserve = () => {
    const dateLabels = selDates.map((iso) => chipLabel(iso).sub).join(", ");
    selDates.forEach((iso) => {
      const lbl = chipLabel(iso).sub;
      sel.forEach((b) => addToCart({ kind: "sunbed", id: `${b.id}@${iso}`, label: `Sunbed ${b.id}`, sub: `${b.zone} · ${lbl}`, price: b.price }));
      if (extras.ticket) addToCart({ kind: "ticket", id: `ADULT@${iso}`, label: "Entry ticket — Adult", sub: `Bundle · ${lbl}`, price: BUNDLE.ticket });
      if (extras.locker) addToCart({ kind: "locker", id: `LK@${iso}`, label: "Day locker", sub: `Bundle · ${lbl}`, price: BUNDLE.locker });
    });
    const n = sel.length;
    toast(`${n} sunbed${n > 1 ? "s" : ""} × ${dayCount} day${dayCount > 1 ? "s" : ""} added (${dateLabels}).`, { tone: "success" });
    setSel([]);
    setExtras({ ticket: false, locker: false });
  };

  const cartTotal = cart.reduce((a, b) => a + b.price, 0);

  return (
    <div>
      {/* ===== FULL-VIEWPORT BEACH (fixed background) ===== */}
      <div className="fixed inset-0 z-0">
        <div className="relative w-full h-full">
          <BeachBackdrop pos="absolute" className="inset-0 rounded-none">
            {/* ===== Control rail — Option B "Who / When / Where".
                 Three labelled blocks side-by-side, each with a clear header,
                 a bold current-value line, and the interactive pills below.
                 Weather + search live in a thin ambient strip at the bottom,
                 so they read as context rather than competing controls.
                 When a zone is active (focused), the rail collapses into a
                 breadcrumb + the WHEN block + the ambient strip. */}
            <div className="absolute top-[88px] lg:right-[362px] left-3 right-3 z-30">
              <div className="rounded-2xl bg-white/90 backdrop-blur-xl ring-1 ring-white/70 shadow-lg overflow-hidden">
                {focused ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3 flex-wrap border-b border-slate-200/60">
                      <button onClick={() => { setStep("zones"); setZoneId(null); }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 px-3 py-2 text-[13px] font-semibold text-slate-700 hover:text-navy-900 transition">
                        <Icon.arrowL size={14} /> All zones
                      </button>
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl grid place-items-center text-white shadow-sm" style={{ background: zone.color }}><Icon.umbrella size={16} /></span>
                        <div className="leading-tight">
                          <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Zone</div>
                          <div className="font-display font-bold text-[16px] text-navy-900">{zone.name}</div>
                        </div>
                      </div>
                      <span className="text-[12.5px] text-slate-500 tnum">{zone.avail}/{zone.total} free · from €{zone.from}</span>
                    </div>
                    <div data-spotlight="dates" className="px-4 py-3 border-b border-slate-200/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                          <Icon.calendar size={12} className="text-teal-600" /> When
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 tnum">{dayCount} day{dayCount > 1 ? "s" : ""}</span>
                      </div>
                      <DatePickerRow value={selDates} onChange={setSelDates} />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Mobile: collapse the Who/When/Where controls so the beach
                        map gets room; always expanded from lg up. */}
                    <button onClick={() => setRailOpen((o) => !o)}
                      className="lg:hidden w-full flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60 text-left">
                      <span className="flex items-center gap-2 text-[13px] font-semibold text-navy-900">
                        <Icon.sparkles size={14} className="text-teal-600" /> Plan your spot
                        <span className="font-normal text-slate-500">· {dayCount} day{dayCount > 1 ? "s" : ""}</span>
                      </span>
                      <Icon.chevD size={16} className={`text-slate-400 transition-transform ${railOpen ? "rotate-180" : ""}`} />
                    </button>
                  <div className={`${railOpen ? "grid" : "hidden"} lg:grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/70 border-b border-slate-200/60`}>
                    {/* GUESTS — quick-pick presets as the primary control. */}
                    <div data-spotlight="quick-picks" className="p-4">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        <Icon.users size={12} className="text-teal-600" /> Guests
                      </div>
                      <div className="font-display font-semibold text-[15px] text-navy-900 mb-2.5">Pick a party size</div>
                      {/* Date-box styled cards so Guests reads as the same
                          family of tiles as the When date strip. */}
                      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                        {QUICK_PICKS.map((p) => {
                          const I = p.id === "couple" ? Icon.users : p.id === "family" ? Icon.group : p.id === "front" ? Icon.wave : Icon.umbrella;
                          return (
                            <button key={p.id} onClick={() => applyPreset(p)} title={p.hint}
                              className="shrink-0 min-w-[84px] min-h-[64px] px-3 py-2.5 rounded-xl ring-1 bg-white ring-slate-200 hover:ring-teal-400 hover:-translate-y-0.5 transition inline-flex flex-col items-center justify-center gap-1 text-navy-900">
                              <span className="flex items-center gap-1 leading-none">
                                <I size={13} className="text-teal-600" />
                                <span className="text-[12.5px] font-semibold">{p.label}</span>
                              </span>
                              <span className="text-[10.5px] text-slate-500 leading-none">{p.beds} set{p.beds !== 1 ? "s" : ""}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* WHEN — date strip lives inline at full width. */}
                    <div data-spotlight="dates" className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                          <Icon.calendar size={12} className="text-teal-600" /> When
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 tnum">{dayCount} day{dayCount > 1 ? "s" : ""}</span>
                      </div>
                      <div className="font-display font-semibold text-[15px] text-navy-900 mb-2.5">
                        {selDates.length === 1 ? chipLabel(selDates[0]).sub : `${dayCount} days selected`}
                      </div>
                      <DatePickerRow value={selDates} onChange={setSelDates} />
                    </div>

                    {/* ZONE — the existing donut pills but with bigger labels
                        and the percentage moved into the donut itself. */}
                    <div data-spotlight="zones" className="p-4 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                          <Icon.umbrella size={12} className="text-teal-600" /> Zone
                        </div>
                        <span className="text-[11px] text-slate-500">{ZONES.length} zones</span>
                      </div>
                      <div className="font-display font-semibold text-[15px] text-navy-900 mb-2.5">Choose a zone</div>
                      {/* Date-box styled cards (matching When); a small colour
                          dot keeps each zone's identity, the % + price sits on
                          the sub line like a date's day-of-month. */}
                      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                        {ZONES.map((z) => {
                          const hovered = hoveredZone === z.id;
                          return (
                            <div key={z.id} className="relative shrink-0"
                              onMouseEnter={() => setHoveredZone(z.id)}
                              onMouseLeave={() => setHoveredZone((cur) => (cur === z.id ? null : cur))}>
                              <button onClick={() => { setZoneId(z.id); setStep("grid"); }}
                                className="min-w-[92px] min-h-[64px] px-3 py-2.5 rounded-xl ring-1 bg-white ring-slate-200 hover:ring-teal-400 hover:-translate-y-0.5 transition inline-flex flex-col items-center justify-center gap-1">
                                <span className="flex items-center gap-1.5 leading-none">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: z.color }} />
                                  <span className="text-[12.5px] font-semibold text-navy-900">{z.name}</span>
                                </span>
                                <span className="text-[10.5px] tnum text-slate-500 leading-none">{Math.round(z.avail / z.total * 100)}% · €{z.from}+</span>
                              </button>
                              {hovered && <ZonePreview zone={z} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  </>
                )}

                {/* Ambient strip — weather context + a discreet sunbed search.
                    Lives at the bottom of the rail in both states so it never
                    competes with the primary controls. */}
                <div className="flex items-center gap-3 px-4 py-2 bg-white/55 text-[12px] flex-wrap">
                  <div className="hidden sm:flex flex-1 min-w-[180px] max-w-[280px] items-center gap-1.5 rounded-full bg-slate-100/80 px-3 py-1.5">
                    <Icon.search size={13} className="text-slate-400 shrink-0" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runSearch(search)}
                      placeholder="Find a sunbed (CE-89)"
                      className="bg-transparent outline-none text-[12px] flex-1 min-w-0 placeholder:text-slate-400" />
                    {search && <button onClick={() => { setSearch(""); setSearchHit(null); }} className="text-slate-400 hover:text-slate-700"><Icon.x size={12} /></button>}
                  </div>
                  <div className="ml-auto inline-flex items-center gap-3 text-slate-600">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600"><Icon.sun size={13} />{WEATHER.tempC}°</span>
                    <span className="hidden md:inline tnum text-slate-500">UV {WEATHER.uv}</span>
                    <span className="hidden md:inline-flex items-center gap-1 text-sky-700"><Icon.wave size={12} />{WEATHER.sea}</span>
                    <span className="hidden lg:inline text-slate-500">sunset {WEATHER.sunset}</span>
                  </div>
                </div>
              </div>
            </div>

            {!focused && (
              <>
                <div className="absolute bottom-24 lg:bottom-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="rounded-full bg-navy-950/55 backdrop-blur px-3 py-1.5 text-white text-[12px] font-semibold ring-1 ring-white/20 shadow-md">Drag to explore · click a zone to zoom in</span>
                </div>
                {/* Keep pins + zone blocks inside the visible beach area on lg
                    so the right-most zone (Bolivar) isn't hidden behind the
                    basket panel. */}
                <div className="absolute inset-0 lg:right-[352px]">
                {FACILITIES.map((f) => <FacilityPin key={f.id} facility={f} />)}
                {ZONE_BLOCKS.map((b) => {
                  const z = ZONES.find((x) => x.id === b.id);
                  if (!z) return null;
                  return (
                    <button key={b.id} onClick={() => { setZoneId(z.id); setStep("grid"); }}
                      className="absolute group z-10" style={{ left: b.left, top: b.top, width: b.w, transform: `rotate(${b.rot}deg)` }}>
                      <div className="rounded-lg bg-white/30 ring-2 ring-white/80 backdrop-blur-[1px] p-1 shadow-lg group-hover:bg-white/55 transition">
                        <div className="grid gap-[1px]" style={{ gridTemplateColumns: "repeat(8,1fr)" }}>
                          {Array.from({ length: 24 }).map((_, i) => {
                            const s = (["a", "a", "h", "a", "u", "a"] as const)[(i * 5 + z.total) % 6];
                            return <div key={i} className="aspect-square" style={{ lineHeight: 0, transform: `rotate(${-b.rot}deg)` }}><Sunbed state={s} size={14} /></div>;
                          })}
                        </div>
                      </div>
                      <div className="mt-1 mx-auto w-max flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow ring-1 ring-slate-200" style={{ transform: `rotate(${-b.rot}deg)` }}>
                        <span className="w-4 h-4 rounded-full" style={{ background: z.color }} />
                        <span className="text-[11px] font-semibold text-navy-900">{z.name}</span>
                        <span className="text-[10px] text-slate-500 tnum">{z.avail}/{z.total}</span>
                      </div>
                    </button>
                  );
                })}
                </div>
              </>
            )}

            {focused && (
              <>
                <div className="absolute inset-0 grid place-items-center px-4 pt-44 pb-4 z-10 pointer-events-none">
                  <div className="pointer-events-auto animate-scale-in">
                    <div className="rounded-3xl bg-white/55 ring-4 ring-white/80 backdrop-blur-[1px] p-3 sm:p-4 shadow-float max-w-[680px] max-h-[62dvh] overflow-auto no-scrollbar">
                      {/* Fewer columns on phones so each sunbed is a ≥44px tap
                          target (block button fills the cell); widens to 14
                          across on desktop. */}
                      <div className="grid gap-1.5 grid-cols-7 min-[400px]:grid-cols-9 sm:grid-cols-12 md:grid-cols-[repeat(14,minmax(0,1fr))]">
                        {grid.map((b) => {
                          const isSel = !!sel.find((x) => x.id === b.id);
                          const isHit = searchHit && searchHit.zoneId === zone.id && searchHit.bedId === b.id;
                          return (
                            <div key={b.id} className={`aspect-square min-w-[40px] sm:min-w-0 ${isHit ? "animate-pulse rounded-md ring-4 ring-teal-400" : ""}`}>
                              <Sunbed block size={22} state={b.s} sel={isSel} label={b.id} price={b.price} onClick={() => (isSel ? rm(b.id) : addBed(b.id, b.price))} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-3 mx-auto w-max flex items-center gap-2.5 rounded-full bg-white px-5 py-2.5 shadow-float ring-1 ring-slate-200">
                      <span className="w-8 h-8 rounded-full grid place-items-center text-white" style={{ background: zone.color }}><Icon.umbrella size={16} /></span>
                      <span className="font-display text-xl font-bold text-navy-900 italic">{zone.name}</span>
                      <span className="text-slate-400 tnum">{zone.avail}/{zone.total}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => { setStep("zones"); setZoneId(null); }} className="absolute bottom-24 lg:bottom-3 left-3 z-20 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-navy-900/70 hover:bg-navy-900 rounded-full px-3 py-1.5 backdrop-blur"><Icon.arrowL size={15} /> Back to full beach</button>
              </>
            )}
          </BeachBackdrop>
        </div>
      </div>

      {/* ===== BASKET CONTENT (shared by desktop panel + mobile sheet) ===== */}
      {(() => {
        const body = (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1"><Icon.calendar size={12} /> Dates · pick one or more</span>
                <span className="text-slate-600 normal-case tracking-normal">{dayCount} day{dayCount > 1 ? "s" : ""}</span>
              </div>
              <DatePickerRow value={selDates} onChange={setSelDates} />
            </div>

            {focused && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Zone</div>
                <div className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full grid place-items-center text-white" style={{ background: zone.color }}><Icon.umbrella size={13} /></span>
                    <div><div className="font-semibold text-sm text-navy-900">{zone.name}</div><div className="text-[11px] text-slate-500">{zone.avail} of {zone.total} available · from €{zone.from}</div></div>
                  </div>
                  <button onClick={() => { setStep("zones"); setZoneId(null); }} className="text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200 rounded-lg px-2.5 py-1.5 min-h-[40px] hover:bg-slate-50">Back</button>
                </div>
              </div>
            )}

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center justify-between">
                <span>Your selection{sel.length ? ` · ${sel.length}` : ""}</span>
                {sel.length > 0 && holdUntil && (
                  <span className="inline-flex items-center gap-1 normal-case tracking-normal text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-full px-2 py-0.5"><Icon.clock size={11} /> Held {mmss(holdLeft)}</span>
                )}
              </div>
              {sel.length === 0 ? (
                <div className="text-[12px] text-slate-600 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2.5 flex items-center gap-2">
                  <Icon.umbrella size={14} className="text-slate-500 shrink-0" />
                  <span>{focused ? "Tap available (blue) sunbeds on the map to add them here." : "Pick a zone on the beach, then tap sunbeds to add them."}</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {sel.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-2.5 py-2 animate-pop">
                      <div className="flex items-center gap-2"><Sunbed state="a" sel size={18} /><div><div className="font-semibold text-[13px] text-navy-900 leading-none">{b.id}</div><div className="text-[10px] text-slate-500 mt-0.5">{b.zone}</div></div></div>
                      <div className="flex items-center gap-1"><span className="font-semibold text-[13px] tnum">€{b.price}</span><button aria-label={`Remove ${b.id}`} onClick={() => rm(b.id)} className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Icon.trash size={15} /></button></div>
                    </div>
                  ))}
                  <button onClick={clearSel} className="text-[11px] text-slate-500 hover:text-rose-500 px-1 py-1">Clear all</button>
                </div>
              )}
            </div>

            {/* cross-sell */}
            {sel.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Add to your day</div>
                <div className="space-y-1.5">
                  <CrossSell on={extras.ticket} onClick={() => setExtras((e) => ({ ...e, ticket: !e.ticket }))} icon={Icon.ticket} title="Entry ticket — Adult" price={BUNDLE.ticket} was={10} />
                  <CrossSell on={extras.locker} onClick={() => setExtras((e) => ({ ...e, locker: !e.locker }))} icon={Icon.lock} title="Day locker" price={BUNDLE.locker} was={5} />
                </div>
              </div>
            )}

            {cart.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center justify-between">
                  <span>In your basket · {cart.length}</span>
                  <button onClick={() => go("customer", "checkout")} className="text-teal-700 hover:text-teal-800 normal-case tracking-normal font-semibold">Checkout →</button>
                </div>
                <div className="space-y-1.5">
                  {cart.map((it) => (
                    <div key={it.kind + it.id} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-2.5 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 grid place-items-center text-slate-600 shrink-0">{cartIcon(it.kind)}</span>
                        <div className="min-w-0"><div className="font-semibold text-[12px] text-navy-900 leading-tight truncate">{it.label}</div><div className="text-[10px] text-slate-500 truncate">{it.sub}</div></div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0"><span className="font-semibold text-[12px] tnum">€{it.price}</span><button aria-label={`Remove ${it.label}`} onClick={() => removeCartItem(it)} className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Icon.trash size={14} /></button></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Legend</div>
              <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
                <span className="flex items-center gap-1"><Sunbed state="a" size={18} />Available</span>
                <span className="flex items-center gap-1"><Sunbed state="h" size={18} />On hold</span>
                <span className="flex items-center gap-1"><Sunbed state="u" size={18} />Unavailable</span>
                <span className="flex items-center gap-1"><Sunbed state="a" sel size={18} />Selected</span>
              </div>
            </div>
          </div>
        );

        const footer = (
          <div className="border-t border-white/40 p-4 bg-white/40 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-slate-600">{sel.length} sunbed{sel.length !== 1 ? "s" : ""} × {dayCount} day{dayCount > 1 ? "s" : ""}{extrasTotal ? " + extras" : ""}</span>
              <span className="font-bold text-navy-900 tnum text-lg">€{total}</span>
            </div>
            <Btn variant="dark" full size="lg" disabled={!sel.length} onClick={reserve}>
              {sel.length ? `Add ${sel.length}×${dayCount} to basket` : "Select sunbeds to add to basket"}
            </Btn>
            {cart.length > 0 && (
              <Btn variant="teal" full size="lg" className="mt-2" icon={Icon.card} onClick={() => go("customer", "checkout")}>
                Checkout · {cart.length} item{cart.length > 1 ? "s" : ""} · €{cartTotal}
              </Btn>
            )}
          </div>
        );

        return (
          <>
            {/* Desktop: floating glass panel on the right edge */}
            <div className="hidden lg:flex fixed top-[88px] right-3 bottom-3 w-[340px] z-20 glass-card-solid rounded-2xl shadow-float flex-col overflow-hidden">
              {body}
              {footer}
            </div>

            {/* Mobile: collapsed summary bar (tap to expand a bottom sheet) */}
            <button
              onClick={() => setSheetOpen(true)}
              className="lg:hidden fixed left-3 right-3 z-30 glass-dark text-white rounded-2xl shadow-float ring-1 ring-white/15 px-4 py-3 flex items-center justify-between gap-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center shrink-0 relative">
                  <Icon.card size={17} />
                  {cart.length > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 grid place-items-center text-[9px] font-bold bg-gold-400 text-navy-950 rounded-full">{cart.length}</span>}
                </span>
                <span className="text-left leading-tight min-w-0">
                  <span className="block text-[13px] font-semibold truncate">{sel.length ? `${sel.length} selected · €${total}` : cart.length ? `${cart.length} in basket · €${cartTotal}` : "Pick your spot"}</span>
                  <span className="block text-[11px] text-white/60">Tap to view basket & dates</span>
                </span>
              </span>
              <Icon.chevD size={18} className="rotate-180 shrink-0" />
            </button>

            {/* Mobile: bottom sheet */}
            {sheetOpen && (
              <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
                <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm animate-fade-in" onClick={() => setSheetOpen(false)} />
                <div className="absolute left-0 right-0 bottom-0 max-h-[88dvh] glass rounded-t-2xl ring-1 ring-white/40 shadow-float flex flex-col overflow-hidden animate-slide-up pb-safe">
                  <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
                    <span className="mx-auto w-10 h-1 rounded-full bg-slate-300 absolute left-1/2 -translate-x-1/2 top-2" />
                    <div className="font-display font-bold text-navy-900">Your basket</div>
                    <button aria-label="Close" onClick={() => setSheetOpen(false)} className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-white/50"><Icon.x size={18} /></button>
                  </div>
                  {body}
                  {footer}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

function cartIcon(kind: string) {
  const m: Record<string, IconRenderer> = { sunbed: Icon.umbrella, ticket: Icon.ticket, locker: Icon.lock, parking: Icon.car };
  const I = m[kind] || Icon.card;
  return <I size={15} />;
}

function CrossSell({ on, onClick, icon: IconC, title, price, was, future }: { on: boolean; onClick: () => void; icon: IconRenderer; title: ReactNode; price: number; was?: number; future?: boolean }) {
  const saving = was && was > price ? was - price : 0;
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 ring-1 transition ${on ? "ring-teal-500 bg-teal-50" : "ring-slate-200 bg-white/70 hover:ring-teal-400"}`}>
      <span className="flex items-center gap-2.5 min-w-0">
        <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${on ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}><IconC size={16} /></span>
        <span className="text-left min-w-0"><span className="block text-[13px] font-semibold text-navy-900 flex items-center gap-1.5 truncate">{title}{future && <Badge tone="future">Future</Badge>}</span><span className="block text-[11px] text-slate-600">{saving ? `Bundle & save €${saving}` : on ? "Added to your day" : "Add to your day"}</span></span>
      </span>
      <span className="flex items-center gap-1.5 shrink-0">
        {saving > 0 && <span className="text-[11px] text-slate-400 line-through tnum">€{was}</span>}
        <span className={`text-[11px] font-bold tnum rounded-full px-2 py-0.5 ${on ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700"}`}>+€{price}</span>
        <span className={`w-6 h-6 rounded-full grid place-items-center ${on ? "bg-teal-600 text-white" : "ring-1 ring-slate-300 text-slate-500"}`}>{on ? <Icon.check size={14} /> : <Icon.plus size={14} />}</span>
      </span>
    </button>
  );
}

/* ============ ENTRY TICKET ============ */
export function CustomerTicket() {
  const { addToCart, toast } = useApp();
  const cats = [
    { k: "adult", t: "Adult", p: 10, d: "Standard entry" },
    { k: "resident", t: "Alimos resident", p: 6, d: "Proof required at gate" },
    { k: "child", t: "Child (6–12)", p: 5, d: "Under 6 free" },
    { k: "senior", t: "Senior 65+", p: 7, d: "ID required" },
  ];
  const [selDates, setSelDates] = useState([todayISO()]);
  const [qty, setQty] = useState<Record<string, number>>({ adult: 2, resident: 0, child: 1, senior: 0 });
  const [biz, setBiz] = useState(false);
  const [vat, setVat] = useState("");
  const dayCount = selDates.length;
  const perDay = cats.reduce((a, c) => a + c.p * qty[c.k], 0);
  const total = perDay * dayCount;
  const n = Object.values(qty).reduce((a, b) => a + b, 0);
  // Greek ΑΦΜ is 9 digits — only enforced when a B2B invoice (ΤΠΥ) is requested.
  const vatOk = !biz || /^\d{9}$/.test(vat.trim());

  const pay = () => {
    if (biz && !vatOk) { toast("Enter a valid 9-digit ΑΦΜ for the invoice.", { tone: "warn" }); return; }
    selDates.forEach((iso) => {
      const sub = chipLabel(iso).sub;
      cats.forEach((c) => qty[c.k] > 0 && addToCart({ kind: "ticket", id: `${c.k}@${iso}`, label: `${c.t} × ${qty[c.k]}`, sub: `Entry ticket · ${sub}`, price: c.p * qty[c.k] }));
    });
    toast(`${n} ticket${n > 1 ? "s" : ""} × ${dayCount} day${dayCount > 1 ? "s" : ""} added to your basket.`, { tone: "success" });
    setQty({ adult: 0, resident: 0, child: 0, senior: 0 });
  };

  const aboutItems = [
    { icon: Icon.bolt,    title: "Dynamic pricing", body: "Resident, child, senior categories adapt automatically — no coupons needed." },
    { icon: Icon.receipt, title: "ΑΠΥ or ΤΠΥ",      body: "Personal receipt by default; toggle the B2B switch to issue a service invoice with VAT details." },
    { icon: Icon.ticket,  title: "Add at checkout", body: "Tickets can also be bundled during a sunbed booking — same QR at the gate." },
  ];

  return (
    <div className="animate-fade-up space-y-4 max-w-3xl pb-24 lg:pb-0">
      <PageHead title="Entry Ticket" sub="Buy entry for yourself or your group — pricing adapts to each person's category." badge={<Badge tone="mvp">MVP</Badge>} />
      <Card className="glass-card-solid p-5">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><Icon.calendar size={13} /> Dates · pick one or more</span>
          <span className="text-slate-600 normal-case tracking-normal">{dayCount} day{dayCount > 1 ? "s" : ""}</span>
        </div>
        <DatePickerRow value={selDates} onChange={setSelDates} />
      </Card>
      <Card className="glass-card-solid p-5 space-y-3">
        {cats.map((c) => (
          <div key={c.k} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-4 py-3">
            <div><div className="font-semibold text-navy-900">{c.t}</div><div className="text-[12px] text-slate-600">€{c.p} · {c.d}</div></div>
            <Stepper label={`${c.t} tickets`} value={qty[c.k]} onChange={(v) => setQty((q) => ({ ...q, [c.k]: v }))} />
          </div>
        ))}

        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-4 py-3">
          <div className="flex items-center justify-between">
            <div><div className="font-semibold text-navy-900 text-sm">Need an invoice (ΤΠΥ)?</div><div className="text-[12px] text-slate-600">B2B — issues a service invoice instead of a receipt (ΑΠΥ).</div></div>
            <Toggle on={biz} onChange={setBiz} />
          </div>
          {biz && (
            <div className="grid sm:grid-cols-2 gap-2 mt-3 animate-fade-in">
              <Field label="VAT number (ΑΦΜ)" hint={vat && !vatOk ? undefined : "9 digits"}>
                <Input value={vat} onChange={(e) => setVat(e.target.value.replace(/[^\d]/g, "").slice(0, 9))} inputMode="numeric" placeholder="123456789" aria-invalid={!!(vat && !vatOk)} className={vat && !vatOk ? "ring-2 ring-rose-400" : ""} />
                {vat && !vatOk && <div className="text-[11px] text-rose-600 flex items-center gap-1 mt-1"><Icon.alert size={11} /> ΑΦΜ must be 9 digits.</div>}
              </Field>
              <Field label="Company name"><Input placeholder="Acme Ltd." /></Field>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-slate-600 text-sm">{n} ticket(s) × {dayCount} day{dayCount > 1 ? "s" : ""}{biz ? " · ΤΠΥ" : " · ΑΠΥ"}</div>
          <div className="text-2xl font-bold font-display text-navy-900 tnum">€{total}</div>
        </div>
        <Btn variant="teal" full size="lg" icon={Icon.card} disabled={!n || !vatOk} onClick={pay}>Add €{total} to basket</Btn>
      </Card>

      {/* "About entry tickets" — now stacked below the main box rather than
          floating in a right-hand panel. Same three items, same footer. */}
      <Card className="glass-card-solid p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <Icon.info size={13} /> About entry tickets
        </div>
        <div className="space-y-3">
          {aboutItems.map((it, i) => (
            <div key={i} className="flex gap-3">
              <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 grid place-items-center shrink-0"><it.icon size={15} /></span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-navy-900">{it.title}</div>
                <div className="text-[12.5px] text-slate-600 leading-snug mt-0.5">{it.body}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 text-[11.5px] text-slate-500">QR is scanned at the gate by the Controller.</div>
      </Card>
      {/* Mobile: keep the CTA in reach below the category list. */}
      <StickyActionBar>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-navy-900 truncate">{n ? `${n} ticket${n > 1 ? "s" : ""} · €${total}` : "No tickets yet"}</div>
            <div className="text-[11px] text-slate-500">{biz ? "ΤΠΥ invoice" : "ΑΠΥ receipt"} · {dayCount} day{dayCount > 1 ? "s" : ""}</div>
          </div>
          <Btn variant="teal" size="md" icon={Icon.card} disabled={!n || !vatOk} onClick={pay}>Add €{total}</Btn>
        </div>
      </StickyActionBar>
    </div>
  );
}

/* Deterministic 4-digit access PIN for a locker code — stable per id so the
   same locker always shows the same PIN (demo only). */
function lockerPin(id: string) {
  const n = (id.charCodeAt(0) * 137 + parseInt(id.slice(1), 10) * 911) % 9000 + 1000;
  return String(n);
}

/* ============ DAY LOCKER ============
   Reserve-and-assign model (luggage-storage / gym-locker convention): the guest
   chooses how many lockers and which days — the system assigns the locker codes
   and access PINs. No floor map to hunt through. */
export function CustomerLocker() {
  const { addToCart, toast } = useApp();
  const PRICE = LOCKER_PRICE;
  const [selDates, setSelDates] = useState([todayISO()]);
  const [qty, setQty] = useState(1);
  // Free-locker pool (same occupancy rule as before) — we assign the next N
  // free codes rather than make the guest pick one off a grid.
  const freeCodes = useMemo(() => {
    const arr: string[] = [];
    ["A", "B", "C", "D", "E"].forEach((bk) => {
      for (let i = 1; i <= 20; i++) {
        if ((bk.charCodeAt(0) + i * 7) % 5 !== 0) arr.push(`${bk}${String(i).padStart(2, "0")}`);
      }
    });
    return arr;
  }, []);
  const free = freeCodes.length;
  const assigned = useMemo(() => freeCodes.slice(0, qty), [freeCodes, qty]);
  const dayCount = selDates.length;
  const total = qty * PRICE * dayCount;
  const reserve = () => {
    selDates.forEach((iso) => {
      const sub = chipLabel(iso).sub;
      assigned.forEach((id) => addToCart({ kind: "locker", id: `${id}@${iso}`, label: `Locker ${id}`, sub: `PIN ${lockerPin(id)} · ${sub}`, price: PRICE }));
    });
    toast(`${qty} locker${qty > 1 ? "s" : ""} × ${dayCount} day${dayCount > 1 ? "s" : ""} added to your basket.`, { tone: "success" });
  };

  const perks = [
    { icon: Icon.lock,  title: "Secure & private",   body: "Steel day locker by the beach bar — fits two beach bags, a tablet and your valuables." },
    { icon: Icon.qr,    title: "Open with QR or PIN", body: "Unlock from your phone; we also assign a backup 4-digit PIN, shown on the right." },
    { icon: Icon.clock, title: "All-day access",      body: "Come and go as you like until closing — re-lock it between swims." },
  ];

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-5 pb-28 lg:pb-0">
      <div className="space-y-4 min-w-0">
        <Card className="glass-card-solid p-5 relative overflow-hidden">
          <div aria-hidden className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-gradient-to-br from-teal-300/35 to-transparent blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white grid place-items-center shadow-sm shrink-0"><Icon.lock size={22} /></span>
            <div className="min-w-0">
              <div className="font-display font-bold text-navy-900 text-xl">Day locker</div>
              <div className="text-[12.5px] text-slate-600">Keep your phone, keys and valuables safe while you swim. €{PRICE}/locker/day · {free} free today.</div>
            </div>
          </div>
        </Card>

        <Card className="glass-card-solid p-4 overflow-visible">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Icon.calendar size={13} /> Dates · pick one or more</span>
            <span className="text-slate-600 normal-case tracking-normal">{dayCount} day{dayCount > 1 ? "s" : ""}</span>
          </div>
          <DatePickerRow value={selDates} onChange={setSelDates} />
        </Card>

        <Card className="glass-card-solid p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="font-semibold text-navy-900">How many lockers?</div>
              <div className="text-[12px] text-slate-600">{qty} × €{PRICE} × {dayCount} day{dayCount > 1 ? "s" : ""} · assigned automatically</div>
            </div>
            <Stepper label="lockers" value={qty} onChange={(v) => setQty(Math.max(1, Math.min(free, v)))} min={1} />
          </div>
          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            {perks.map((p, i) => (
              <div key={i} className="rounded-xl ring-1 ring-slate-200 bg-white/70 p-3">
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 grid place-items-center mb-2"><p.icon size={16} /></span>
                <div className="text-[13px] font-semibold text-navy-900">{p.title}</div>
                <div className="text-[12px] text-slate-600 leading-snug mt-0.5">{p.body}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="lg:sticky lg:top-4 h-max">
        <Card className="glass-card-solid p-5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Your lockers</div>
          <div className="rounded-xl bg-teal-50/70 ring-1 ring-teal-200 px-3 py-2.5 flex items-start gap-2.5 mb-3">
            <Icon.bolt size={15} className="text-teal-700 mt-0.5 shrink-0" />
            <div className="text-[12px] text-teal-900 leading-snug">We auto-assign the next free locker{qty > 1 ? "s" : ""} — your code{qty > 1 ? "s" : ""} &amp; PIN unlock the bank by the beach bar.</div>
          </div>
          <div className="space-y-2">
            {assigned.map((id) => (
              <div key={id} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0 text-navy-900">
                  <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-navy-800 to-navy-950 text-white grid place-items-center shrink-0"><Icon.lock size={16} /></span>
                  <div className="leading-tight min-w-0">
                    <div className="font-semibold text-sm">Locker {id}</div>
                    <div className="text-[11px] text-slate-500 tnum">PIN {lockerPin(id)}</div>
                  </div>
                </div>
                <span className="font-semibold tnum shrink-0">€{PRICE * dayCount}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-600">{qty} locker{qty > 1 ? "s" : ""} × {dayCount} day{dayCount > 1 ? "s" : ""}</span><span className="font-bold text-navy-900 tnum text-lg">€{total}</span></div>
          <Btn variant="teal" full size="lg" className="mt-3" disabled={!qty} onClick={reserve}>Add {qty}×{dayCount} to basket</Btn>
          <div className="mt-2 text-center text-[11px] text-slate-500">Code &amp; PIN saved to My Bookings · Secured by Stripe</div>
        </Card>
      </div>

      {/* Mobile: keep the CTA reachable without scrolling. */}
      <StickyActionBar>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-navy-900 truncate">{qty} locker{qty > 1 ? "s" : ""} · €{total}</div>
            <div className="text-[11px] text-slate-500 truncate tnum">{assigned.join(", ") || "—"}</div>
          </div>
          <Btn variant="teal" size="md" disabled={!qty} onClick={reserve}>Add €{total}</Btn>
        </div>
      </StickyActionBar>
    </div>
  );
}

/* ============ PARKING ============
   Reserve-and-assign model (SpotHero / airport-parking convention): the guest
   enters a plate and we assign the best free spot near the entrance — the
   barrier camera reads the plate on arrival. No lot map to pick from. */
export function CustomerParking() {
  const { addToCart, toast } = useApp();
  const PRICE = 15;
  const [selDates, setSelDates] = useState([todayISO()]);
  const [plate, setPlate] = useState("");
  const taken = useMemo(() => new Set(["P3", "P7", "P12", "P18", "P21", "P24", "P29", "P33", "P40", "P44", "P47"]), []);
  const freeSpots = useMemo(() => Array.from({ length: 50 }, (_, i) => `P${i + 1}`).filter((s) => !taken.has(s)), [taken]);
  const spot = freeSpots[0]; // best available, nearest the entrance
  const free = freeSpots.length;
  const dayCount = selDates.length;
  const total = PRICE * dayCount;
  const reserve = () => {
    if (!plate.trim()) { toast("Add a vehicle plate so the barrier can recognise you.", { tone: "warn" }); return; }
    selDates.forEach((iso) => {
      const sub = chipLabel(iso).sub;
      addToCart({ kind: "parking", id: `${spot}@${iso}`, label: `Parking ${spot}`, sub: `${plate} · ${sub}`, price: PRICE });
    });
    toast(`Parking spot ${spot} × ${dayCount} day${dayCount > 1 ? "s" : ""} added to your basket.`, { tone: "success" });
  };

  const perks = [
    { icon: Icon.scan,     title: "Plate recognition",  body: "The barrier camera reads your plate — no ticket, the gate just opens." },
    { icon: Icon.umbrella, title: "Steps from the sand", body: "Shaded lot beside the main entrance, a short walk to every zone." },
    { icon: Icon.qr,       title: "Backup QR",          body: "Can't read the plate? Show the QR from My Bookings at the barrier." },
  ];

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-5 pb-28 lg:pb-0">
      <div className="space-y-4 min-w-0">
        <Card className="glass-card-solid p-5 relative overflow-hidden">
          <div aria-hidden className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-gradient-to-br from-indigo-300/35 to-transparent blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slaice-500 to-slaice-700 text-white grid place-items-center shadow-sm shrink-0"><Icon.car size={22} /></span>
            <div className="min-w-0">
              <div className="font-display font-bold text-navy-900 text-xl">Parking spot</div>
              <div className="text-[12.5px] text-slate-600">Reserve a spot by the entrance — we assign it and the gate reads your plate. €{PRICE}/spot/day · {free} of 50 free.</div>
            </div>
          </div>
        </Card>

        <Card className="glass-card-solid p-4 overflow-visible">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Icon.calendar size={13} /> Dates · pick one or more</span>
            <span className="text-slate-600 normal-case tracking-normal">{dayCount} day{dayCount > 1 ? "s" : ""}</span>
          </div>
          <DatePickerRow value={selDates} onChange={setSelDates} />
        </Card>

        <Card className="glass-card-solid p-5">
          <Field label="Vehicle plate" hint="Used by the gate camera to let you in automatically — required.">
            <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" />
          </Field>
          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            {perks.map((p, i) => (
              <div key={i} className="rounded-xl ring-1 ring-slate-200 bg-white/70 p-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-slaice-700 grid place-items-center mb-2"><p.icon size={16} /></span>
                <div className="text-[13px] font-semibold text-navy-900">{p.title}</div>
                <div className="text-[12px] text-slate-600 leading-snug mt-0.5">{p.body}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="lg:sticky lg:top-4 h-max">
        <Card className="glass-card-solid p-5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Your parking</div>
          {/* Assigned-spot hero so the guest sees their spot code at a glance. */}
          <div className="rounded-2xl bg-gradient-to-br from-navy-800 to-navy-950 text-white p-4 mb-3 relative overflow-hidden">
            <div aria-hidden className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-white/5 blur-2xl" />
            <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold flex items-center gap-1.5"><Icon.bolt size={12} /> Assigned spot</div>
            <div className="mt-1 flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center shrink-0"><Icon.car size={20} /></span>
              <span className="font-display font-bold text-3xl tnum">{spot}</span>
              <span className="ml-auto text-[11px] text-white/70 text-right leading-tight">near the<br />entrance</span>
            </div>
          </div>
          <div className="space-y-1.5 text-[13px]">
            <div className="flex items-center justify-between"><span className="text-slate-600">Plate</span><span className="font-semibold text-navy-900 tnum">{plate || "—"}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-600">Days</span><span className="font-semibold text-navy-900 tnum">{dayCount}</span></div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center justify-between text-sm"><span className="text-slate-600">1 spot × {dayCount} day{dayCount > 1 ? "s" : ""}</span><span className="font-bold text-navy-900 tnum text-lg">€{total}</span></div>
          <Btn variant="teal" full size="lg" className="mt-3" disabled={!plate.trim()} onClick={reserve}>{!plate.trim() ? "Enter your plate" : `Add ${dayCount}×€${PRICE} to basket`}</Btn>
          {!plate.trim() && <div className="mt-1.5 text-[11px] text-amber-600 flex items-center gap-1"><Icon.info size={12} /> A plate is required — the barrier reads it on arrival.</div>}
          <div className="mt-2 text-center text-[11px] text-slate-500">Spot &amp; QR saved to My Bookings · Secured by Stripe</div>
        </Card>
      </div>

      {/* Mobile: plate + CTA reachable without scrolling. */}
      <StickyActionBar>
        <div className="flex items-center gap-2">
          <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="Plate e.g. ΙΖΡ-1234" className="uppercase tnum flex-1 min-w-0" aria-label="Vehicle plate" />
          <Btn variant="teal" size="md" disabled={!plate.trim()} onClick={reserve}>{plate.trim() ? `€${total}` : "Add"}</Btn>
        </div>
      </StickyActionBar>
    </div>
  );
}

/* ============ MY BOOKINGS ============ */
export function CustomerBookings() {
  const { go, toast } = useApp();
  const [qrFor, setQrFor] = useState<CustomerBooking | null>(null);
  const [filter, setFilter] = useState("all");
  const bookings = useAsync(listCustomerBookings);
  const data = bookings.status === "success" ? bookings.data : [];
  const filtered = data.filter((d) => filter === "all" || d.state === filter);
  const total = data.reduce((a, b) => a + b.price, 0);
  const active = data.filter((d) => d.state === "active").length;
  return (
    <div className="space-y-4">
      {bookings.status === "loading" ? (
        <CardGridSkeleton count={3} className="grid sm:grid-cols-3 gap-4" />
      ) : (
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Active bookings" value={active} sub="ready to redeem" tone="teal" />
          <StatCard label="This season" value={`€${total}`} sub={`${data.length} confirmed`} />
          <StatCard label="Next visit" value="Sun, 19 Jul" sub="Central zone · 2 sunbeds" tone="indigo" />
        </div>
      )}
      {/* Season in review (P5.6) */}
      <Card className="overflow-hidden">
        <div className="grad-sea text-white p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-200"><Icon.sparkles size={13} /> Your season in review</div>
            <div className="mt-1 font-display font-bold text-xl">You've had a sunny summer, Elena ☀️</div>
            <div className="text-[13px] text-white/80 mt-0.5">9 visits · favourite zone <b className="text-white">Central</b> · you saved <b className="text-white">€34</b> with offers.</div>
          </div>
          <div className="flex items-center gap-5 shrink-0">
            <div className="text-center"><div className="text-2xl font-bold font-display tnum">9</div><div className="text-[11px] text-white/70">visits</div></div>
            <div className="text-center"><div className="text-2xl font-bold font-display tnum">€{total}</div><div className="text-[11px] text-white/70">spent</div></div>
            <div className="w-px h-10 bg-white/20" />
            <div className="w-28"><Sparkline data={[1,2,1,3,2,4,3,5]} color="#5EEAD4" width={112} height={36} /><div className="text-[10px] text-white/70 text-center mt-1">visits / month</div></div>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <Tabs tabs={[["all", "All"], ["active", "Active"], ["past", "Past"]]} value={filter} onChange={setFilter} />
          <Btn size="sm" variant="outline" icon={Icon.download} onClick={() => toast("Demo — all QRs e-mailed.", { tone: "success" })}>E-mail all QRs</Btn>
        </div>
        {bookings.status === "loading" ? (
          <TableSkeleton rows={4} cols={6} />
        ) : bookings.status === "error" ? (
          <ErrorState compact body="We couldn't load your bookings." onRetry={bookings.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Icon.grid} title={filter === "active" ? "No active bookings" : "No past bookings yet"} body={filter === "active" ? "Book a sunbed for this weekend — Central front-row spots are 20% off." : "Once a visit is over, it will move here."} action={<Btn variant="teal" icon={Icon.umbrella} onClick={() => go("customer", "book")}>Book a sunbed</Btn>} />
        ) : (
          <Table cols={["Booking", "Item", "Date", "Status", "Price", "QR"]} right={[4]}
            rows={filtered.map((r) => [r.id, r.item, r.date, <StatusBadge status={r.status} />, `€${r.price}`, <Btn size="sm" variant="ghost" icon={Icon.qr} onClick={() => setQrFor(r)}>QR</Btn>])} />
        )}
      </Card>
      <Modal open={!!qrFor} onClose={() => setQrFor(null)} title={`Entry QR · ${qrFor?.id ?? ""}`}>
        {qrFor && (
          <div className="text-center">
            <div className="grid place-items-center"><QR size={200} seed={qrFor.id} /></div>
            <div className="mt-3 text-[12px] text-slate-500">Show at the gate · the controller validates in real time.</div>
            <WalletButtons
              className="mt-4 pt-4 border-t border-slate-100"
              pass={{ ref: qrFor.id, holder: "Elena M.", zone: qrFor.item || "Akti tou Iliou", date: qrFor.date || "", seat: "—", guests: 1, total: `€${qrFor.price ?? ""}` }}
            />
            <Btn variant="outline" full className="mt-4" icon={Icon.mail} onClick={() => { toast("QR re-sent to your e-mail.", { tone: "success" }); }}>Resend by e-mail</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============ MY DOCUMENTS ============ */
export function CustomerDocs() {
  const { toast } = useApp();
  const docsQ = useAsync(listCustomerDocuments);
  const docs = docsQ.status === "success" ? docsQ.data : [];
  const [view, setView] = useState<CustomerDocument | null>(null);
  const download = (d: CustomerDocument) => { downloadPDF(`${d.id}.pdf`, customerReceiptDoc(d)); toast(`Downloaded ${d.id}.pdf`, { tone: "success" }); };
  const downloadAll = () => {
    const files = filtered.map((d) => ({ name: `${d.id}.pdf`, content: buildReceiptBytes(d) }));
    if (!files.length) { toast("Nothing to bundle in this filter."); return; }
    downloadZIP(`slaice-receipts-${new Date().toISOString().slice(0,10)}.zip`, files);
    toast(`Bundled ${files.length} PDF${files.length === 1 ? "" : "s"} into ZIP.`, { tone: "success" });
  };
  const [filter, setFilter] = useState("all");
  const tone = (id: string) => id.startsWith("ΑΠΥ") ? "apy" : id.startsWith("ΤΠΥ") ? "tpy" : "credit";
  const filtered = docs.filter((d) => filter === "all" || tone(d.id) === filter);
  const totalAmount = docs.reduce((a, b) => {
    const v = parseInt(b.amt.replace(/[^0-9-−]/g, "").replace("−", "-"), 10) || 0;
    return a + v;
  }, 0);
  return (
    <div className="space-y-4">
      {docsQ.status === "loading" ? (
        <CardGridSkeleton count={3} className="grid sm:grid-cols-3 gap-4" />
      ) : (
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Receipts this season" value={docs.length} sub={`${docs.filter((d) => tone(d.id) === "apy").length} ΑΠΥ`} tone="teal" />
          <StatCard label="Total spend" value={`€${totalAmount}`} sub="all paid · MyDATA ✓" />
          <StatCard label="MyDATA status" value="100%" sub="transmitted" tone="indigo" />
        </div>
      )}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <Tabs tabs={[["all", "All"], ["apy", "ΑΠΥ"], ["tpy", "ΤΠΥ"], ["credit", "Credit notes"]]} value={filter} onChange={setFilter} />
          <Btn size="sm" variant="outline" icon={Icon.download} onClick={downloadAll}>Download all (ZIP)</Btn>
        </div>
        {docsQ.status === "loading" ? (
          <TableSkeleton rows={2} cols={6} />
        ) : docsQ.status === "error" ? (
          <ErrorState compact body="We couldn't load your documents." onRetry={docsQ.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Icon.receipt} title="No documents in this filter" body="Try selecting another category." />
        ) : (
          <Table cols={["Document", "For", "Date", "Amount", "Status", ""]} right={[3]}
            rows={filtered.map((d) => [d.id, d.for, d.date, d.amt, <StatusBadge status="MyDATA ✓" />,
              <span className="flex gap-1 justify-end">
                <Btn size="sm" variant="ghost" icon={Icon.doc} onClick={() => setView(d)}>View</Btn>
                <Btn size="sm" variant="ghost" icon={Icon.download} onClick={() => download(d)}>PDF</Btn>
              </span>])} />
        )}
      </Card>
      <Modal open={!!view} onClose={() => setView(null)} title={view?.id ?? "Document"}
        footer={<>
          <Btn variant="ghost" onClick={() => setView(null)}>Close</Btn>
          <Btn variant="primary" icon={Icon.download} onClick={() => { if (!view) return; download(view); setView(null); }}>Download</Btn>
        </>}>
        {view && (
          <div className="text-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div><div className="font-display font-bold text-navy-900">Akti tou Iliou AE</div><div className="text-slate-500 text-[12px]">ΑΦΜ 123456789 · GR · {view.date}</div></div>
              <Badge tone="green">MyDATA ✓</Badge>
            </div>
            <div className="space-y-1 text-[13px]">
              {view.lines.map(([l, n, v, t], i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 text-slate-600">
                  <span>{l}</span><span className="tnum">{n}</span><span className="tnum text-slate-400">+{v}</span><span className="tnum font-semibold text-navy-900">{t}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between font-semibold text-navy-900"><span>Total gross</span><span className="tnum">{view.amt}</span></div>
            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-lg bg-white p-1.5 ring-1 ring-slate-200"><QR size={84} seed={view.id} /></div>
              <div className="text-[11px] text-slate-500 font-mono leading-snug break-all">MARK<br /><b>{view.mark}</b><br />invoiceType 2.1 · payment 7</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function customerReceiptDoc(d: CustomerDocument) {
  const kind = d.id.startsWith("ΑΠΥ") ? "Retail receipt (ΑΠΥ)"
            : d.id.startsWith("ΤΠΥ") ? "Service receipt (ΤΠΥ)"
            : "Credit note";
  return {
    title: "AKTI TOU ILIOU AE",
    subtitle: `${kind} · ${d.id}`,
    meta: [
      `ΑΦΜ 123456789 · GR · payment 7 (Stripe online)`,
      `Issued ${d.date} · for ${d.for}`,
      `MARK ${d.mark}`,
    ],
    table: {
      cols: ["Item", "Qty", "Net", "VAT", "Total"],
      rightCols: [1, 2, 3, 4],
      rows: d.lines.map(([l, n, v, t]) => [l, n, v, t]),
    },
    totals: [["Total gross", d.amt]],
    footer: [
      "Transmitted to AADE · MyDATA — invoiceType 2.1",
      "Slaice POS · cashier 7 · register 1",
    ],
  };
}
function buildReceiptBytes(d: CustomerDocument) { return buildPDFBytes(customerReceiptDoc(d)); }
