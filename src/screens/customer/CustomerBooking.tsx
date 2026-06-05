import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { Btn, Badge, DatePickerRow } from "../../components/ui";
import { Sunbed, BeachBackdrop } from "../../components/Beach";
import { ZONES, ZONE_BLOCKS, FACILITIES, WEATHER, QUICK_PICKS, makeGrid, chipLabel, todayISO } from "../../data/beach";
import type { CartItem } from "../../domain/types";
import { useApp, useSpotlight } from "../../app/store";

type Zone = (typeof ZONES)[number];
type Facility = (typeof FACILITIES)[number];
interface SelBed { id: string; zone: string; price: number }

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
