import { useMemo, useRef, useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Card, Btn, Badge, PageHead, Table, Stepper, Toggle, Input, Field, EmptyState, StatusBadge, TableSkeleton, useMockLoad, StatCard, ContextPanel, Tabs, DatePickerRow } from "../components/ui.jsx";
import { Reveal } from "../lib/motion.jsx";
import { QR, Sparkline } from "../components/charts.jsx";
import { Sunbed, BeachBackdrop, ParkingBackdrop, LockerBackdrop } from "../components/Beach.jsx";
import { downloadPDF, downloadZIP, buildPDFBytes } from "../lib/download.js";
import { ZONES, ZONE_BLOCKS, FACILITIES, WEATHER, QUICK_PICKS, makeGrid, chipLabel, todayISO } from "../data/beach.js";
import { CUSTOMER_BOOKINGS, CUSTOMER_DOCS } from "../data/mock.js";
import { useApp, useSpotlight } from "../app/store.jsx";

/* ============ HOME ============
   One promo chip, one unified hero (greeting + weather + wizard CTA), one
   dominant Sunbed Booking row, and three secondary tiles. Account-area
   destinations (My Bookings / My Documents) live in the avatar menu. */
export function CustomerHome() {
  const { go } = useApp();
  const [promoDismissed, setPromoDismissed] = useState(false);
  const secondary = [
    { k: "ticket",  t: "Entry Ticket", d: "Buy entry for your group",  ic: Icon.ticket },
    { k: "locker",  t: "Day Locker",   d: "Keep your valuables safe",  ic: Icon.lock,  meta: "80 free",    metaTone: "green" },
    { k: "parking", t: "Parking",      d: "Reserve a spot",            ic: Icon.car,   meta: "39/50 free", metaTone: "green" },
  ];

  return (
    <div className="animate-fade-up space-y-4">
      {!promoDismissed && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-50 to-gold-50 ring-1 ring-gold-200 px-3 py-2">
          <span className="w-7 h-7 rounded-lg grid place-items-center bg-gold-500 text-white shrink-0 shadow-sm"><Icon.bolt size={14} /></span>
          <span className="flex-1 min-w-0 text-[13px] text-navy-900">
            <b className="font-semibold">20% off</b> front-row sunbeds this weekend
            <span className="text-slate-500 hidden sm:inline"> · gates open 09:00–20:00</span>
          </span>
          <button onClick={() => go("customer", "book")} className="text-[12.5px] font-semibold text-teal-700 hover:text-teal-800 rounded-md px-2 py-1 whitespace-nowrap">Claim →</button>
          <button aria-label="Dismiss offer" onClick={() => setPromoDismissed(true)} className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-navy-900 hover:bg-white/60 shrink-0"><Icon.x size={14} /></button>
        </div>
      )}

      <Reveal as="button" onClick={() => go("customer", "plan")} className="text-left group block w-full">
        <Card hover press className="relative overflow-hidden p-0">
          <div className="grad-sea text-white p-6 sm:p-8">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-200">
              <Icon.sun size={13} /> Good morning, Elena · sunny, 28°
            </div>
            <div className="mt-2 font-display font-bold text-2xl sm:text-3xl leading-tight max-w-2xl">
              Plan your full beach day in 60 seconds
            </div>
            <div className="text-[13.5px] text-white/85 mt-1.5 max-w-xl">
              Guests, dates, sunbeds, locker, parking — one guided flow with a live total.
            </div>
            <span className="mt-5 inline-flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-semibold bg-white text-navy-900 shadow-sm group-hover:translate-x-0.5 transition">
              <Icon.sparkles size={16} /> Start guided booking <Icon.arrowR size={16} />
            </span>
          </div>
        </Card>
      </Reveal>

      <Reveal as="button" onClick={() => go("customer", "book")} className="text-left group block w-full">
        <Card hover press className="glass-card-solid p-5 sm:p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl grid place-items-center text-white shadow-sm bg-gradient-to-br from-teal-500 to-teal-700 transition-transform duration-300 ease-spring group-hover:scale-110 group-hover:-rotate-3 shrink-0">
            <Icon.umbrella size={26} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-lg sm:text-xl text-navy-900 flex items-center gap-1.5">
              Sunbed Booking
              <Icon.chevR size={17} className="transition-transform duration-200 group-hover:translate-x-1 text-teal-600" />
            </div>
            <div className="text-[13.5px] text-slate-600 mt-0.5">Pick your spot on the live beach map — sea-view, shaded, or front-row.</div>
          </div>
          <Badge tone="green" className="hidden sm:inline-flex shrink-0">Live map</Badge>
        </Card>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {secondary.map((t, i) => (
          <Reveal as="button" key={t.k} delay={i * 60} onClick={() => go("customer", t.k)} className="text-left group">
            <Card hover press className="glass-card-solid p-4 h-full">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl grid place-items-center text-white shadow-sm bg-gradient-to-br from-navy-800 to-navy-950 transition-transform duration-300 ease-spring group-hover:scale-110 group-hover:-rotate-3">
                  <t.ic size={18} />
                </div>
                {t.meta && <Badge tone={t.metaTone || "slate"}>{t.meta}</Badge>}
              </div>
              <div className="mt-3 font-semibold text-navy-900 flex items-center gap-1 text-[14.5px]">
                {t.t}<Icon.chevR size={14} className="transition-transform duration-200 group-hover:translate-x-1 text-teal-600" />
              </div>
              <div className="text-[12.5px] text-slate-600 mt-0.5">{t.d}</div>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ============ SUNBED BOOKING helpers ============ */

// Tiny donut showing free / total. Stroke length = free ratio, lighter
// remainder underneath. Sized to nest inside the 7×7 zone-pill avatar.
function ZoneDonut({ free, total, color, size = 28 }) {
  const r = size / 2 - 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, free / total));
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3.5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={`${c*pct} ${c}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
}

// Hover tooltip rendered above the zone pill — a 6×4 sample of sunbeds so
// the user can sneak-peek occupancy before zooming in.
function ZonePreview({ zone }) {
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
function FacilityPin({ facility }) {
  const kind = facility.kind;
  const cfg = {
    bar:    { icon: Icon.glass,  tint: "from-amber-400 to-amber-600",  ring: "ring-amber-200" },
    wc:     { icon: Icon.cross,  tint: "from-slate-500 to-slate-700",  ring: "ring-slate-200" },
    shower: { icon: Icon.drop,   tint: "from-sky-400 to-sky-600",      ring: "ring-sky-200" },
    first:  { icon: Icon.shield, tint: "from-rose-400 to-rose-600",    ring: "ring-rose-200" },
  }[kind] || { icon: Icon.info, tint: "from-slate-500 to-slate-700", ring: "ring-slate-200" };
  return (
    <div className="absolute z-10 group" style={{ left: facility.left, top: facility.top }}>
      <div className={`w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center text-white bg-gradient-to-br ${cfg.tint} ring-2 ring-white shadow-md hover:scale-110 transition`} title={facility.label}>
        <cfg.icon size={13} />
      </div>
      <div className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-navy-900 ring-1 ${cfg.ring} shadow opacity-0 group-hover:opacity-100 transition pointer-events-none`}>
        {facility.label}
      </div>
    </div>
  );
}

/* ============ SUNBED BOOKING (hero, matches the video) ============ */
export function CustomerBooking() {
  const { go, toast, cart, addToCart, removeFromCart } = useApp();
  useSpotlight("customer", "book");
  const [step, setStep] = useState("zones"); // zones | grid
  const [zoneId, setZoneId] = useState(null);
  const [selDates, setSelDates] = useState([todayISO()]); // multi-select ISO dates
  const [sel, setSel] = useState([]); // {id, zone, price}
  const [extras, setExtras] = useState({ ticket: false, locker: false });
  const [sheetOpen, setSheetOpen] = useState(false); // mobile basket bottom-sheet
  const [hoveredZone, setHoveredZone] = useState(null); // zone-pill preview
  const [search, setSearch] = useState("");
  const [searchHit, setSearchHit] = useState(null); // {zoneId, bedId} — pulse target
  const zone = ZONES.find((z) => z.id === zoneId) || null;
  const grid = useMemo(() => (zone ? makeGrid(zone) : []), [zoneId]);

  const addBed = (id, price) => setSel((c) => (c.find((x) => x.id === id) ? c : [...c, { id, zone: zone.name, price }]));
  const rm = (id) => setSel((c) => c.filter((x) => x.id !== id));

  // Quick-pick: pick the zone with the most availability, then pick N
  // available beds matching the preset (adjacent / front-row / cheapest).
  const applyPreset = (preset) => {
    const z = [...ZONES].sort((a, b) => b.avail - a.avail)[0];
    const g = makeGrid(z);
    let pick = [];
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
  const runSearch = (q) => {
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
  const removeCartItem = (it) => { removeFromCart(it.kind, it.id); toast(`Removed ${it.label}.`, { action: { label: "Undo", onClick: () => addToCart(it) } }); };
  const dayCount = selDates.length;
  const sunTotal = sel.reduce((a, b) => a + b.price, 0) * dayCount;
  const extrasTotal = ((extras.ticket ? 10 : 0) + (extras.locker ? 5 : 0)) * dayCount;
  const total = sunTotal + extrasTotal;
  const focused = step === "grid" && zone;

  const reserve = () => {
    const dateLabels = selDates.map((iso) => chipLabel(iso).sub).join(", ");
    selDates.forEach((iso) => {
      const lbl = chipLabel(iso).sub;
      sel.forEach((b) => addToCart({ kind: "sunbed", id: `${b.id}@${iso}`, label: `Sunbed ${b.id}`, sub: `${b.zone} · ${lbl}`, price: b.price }));
      if (extras.ticket) addToCart({ kind: "ticket", id: `ADULT@${iso}`, label: "Entry ticket — Adult", sub: `Cross-sell · ${lbl}`, price: 10 });
      if (extras.locker) addToCart({ kind: "locker", id: `LK@${iso}`, label: "Day locker", sub: `Cross-sell · ${lbl}`, price: 5 });
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
            <div className="absolute top-[148px] lg:right-[362px] left-3 right-3 z-30">
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
                  <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/70 border-b border-slate-200/60">
                    {/* GUESTS — quick-pick presets as the primary control. */}
                    <div data-spotlight="quick-picks" className="p-4">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        <Icon.users size={12} className="text-teal-600" /> Guests
                      </div>
                      <div className="font-display font-semibold text-[15px] text-navy-900 mb-2.5">Pick a party size</div>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_PICKS.map((p) => {
                          const I = p.id === "couple" ? Icon.users : p.id === "family" ? Icon.group : p.id === "front" ? Icon.wave : Icon.umbrella;
                          return (
                            <button key={p.id} onClick={() => applyPreset(p)} title={p.hint}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 hover:bg-navy-900 hover:text-white text-navy-900 px-3 py-2 text-[12.5px] font-semibold transition">
                              <I size={13} /> {p.label}
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
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
                        {ZONES.map((z) => {
                          const hovered = hoveredZone === z.id;
                          return (
                            <div key={z.id} className="relative shrink-0"
                              onMouseEnter={() => setHoveredZone(z.id)}
                              onMouseLeave={() => setHoveredZone((cur) => (cur === z.id ? null : cur))}>
                              <button onClick={() => { setZoneId(z.id); setStep("grid"); }}
                                className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 hover:bg-navy-900 hover:text-white text-navy-900 pl-1 pr-3 py-1 whitespace-nowrap transition group">
                                <span className="relative w-8 h-8 grid place-items-center rounded-full bg-white/90 group-hover:bg-white/15 transition">
                                  <ZoneDonut free={z.avail} total={z.total} color={z.color} size={30} />
                                  <span className="absolute inset-0 grid place-items-center text-[9px] font-bold text-navy-900 group-hover:text-white transition">{Math.round(z.avail/z.total*100)}%</span>
                                </span>
                                <span className="text-left leading-tight">
                                  <span className="block text-[12.5px] font-semibold">{z.name}</span>
                                  <span className="block text-[10px] tnum text-slate-500 group-hover:text-white/70 transition">{z.avail} · €{z.from}+</span>
                                </span>
                              </button>
                              {hovered && <ZonePreview zone={z} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
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
                  return (
                    <button key={b.id} onClick={() => { setZoneId(z.id); setStep("grid"); }}
                      className="absolute group z-10" style={{ left: b.left, top: b.top, width: b.w, transform: `rotate(${b.rot}deg)` }}>
                      <div className="rounded-lg bg-white/30 ring-2 ring-white/80 backdrop-blur-[1px] p-1 shadow-lg group-hover:bg-white/55 transition">
                        <div className="grid gap-[1px]" style={{ gridTemplateColumns: "repeat(8,1fr)" }}>
                          {Array.from({ length: 24 }).map((_, i) => {
                            const s = ["a", "a", "h", "a", "u", "a"][(i * 5 + z.total) % 6];
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
                    <div className="rounded-3xl bg-white/55 ring-4 ring-white/80 backdrop-blur-[1px] p-3 sm:p-4 shadow-float max-w-[680px] max-h-[64vh] overflow-auto no-scrollbar">
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(14,1fr)" }}>
                        {grid.map((b) => {
                          const isSel = !!sel.find((x) => x.id === b.id);
                          const isHit = searchHit && searchHit.zoneId === zone.id && searchHit.bedId === b.id;
                          return (
                            <div key={b.id} className={`aspect-square grid place-items-center ${isHit ? "animate-pulse rounded-md ring-4 ring-teal-400" : ""}`}>
                              <Sunbed state={b.s} sel={isSel} label={b.id} price={b.price} onClick={() => (isSel ? rm(b.id) : addBed(b.id, b.price))} />
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
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Your selection{sel.length ? ` · ${sel.length}` : ""}</div>
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
                  <CrossSell on={extras.ticket} onClick={() => setExtras((e) => ({ ...e, ticket: !e.ticket }))} icon={Icon.ticket} title="Entry ticket — Adult" price={10} />
                  <CrossSell on={extras.locker} onClick={() => setExtras((e) => ({ ...e, locker: !e.locker }))} icon={Icon.lock} title="Day locker" price={5} />
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
            <button onClick={() => go("admin", "map")} className="mt-2 w-full text-center text-[11px] text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1"><Icon.cog size={12} /> Edit map layout</button>
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
              className="lg:hidden fixed bottom-3 left-3 right-3 z-30 glass-dark text-white rounded-2xl shadow-float ring-1 ring-white/15 px-4 py-3 flex items-center justify-between gap-3"
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
                <div className="absolute left-0 right-0 bottom-0 max-h-[88vh] glass rounded-t-2xl ring-1 ring-white/40 shadow-float flex flex-col overflow-hidden animate-slide-up">
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

function cartIcon(kind) {
  const m = { sunbed: Icon.umbrella, ticket: Icon.ticket, locker: Icon.lock, parking: Icon.car };
  const I = m[kind] || Icon.card;
  return <I size={15} />;
}

function CrossSell({ on, onClick, icon: IconC, title, price, future }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 ring-1 transition ${on ? "ring-teal-500 bg-teal-50" : "ring-slate-200 bg-white/70 hover:ring-teal-400"}`}>
      <span className="flex items-center gap-2.5 min-w-0">
        <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${on ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}><IconC size={16} /></span>
        <span className="text-left min-w-0"><span className="block text-[13px] font-semibold text-navy-900 flex items-center gap-1.5 truncate">{title}{future && <Badge tone="future">Future</Badge>}</span><span className="block text-[11px] text-slate-600">{on ? "Added to your day" : "Add to your day"}</span></span>
      </span>
      <span className="flex items-center gap-1.5 shrink-0">
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
  const [qty, setQty] = useState({ adult: 2, resident: 0, child: 1, senior: 0 });
  const [biz, setBiz] = useState(false);
  const [vat, setVat] = useState("");
  const dayCount = selDates.length;
  const perDay = cats.reduce((a, c) => a + c.p * qty[c.k], 0);
  const total = perDay * dayCount;
  const n = Object.values(qty).reduce((a, b) => a + b, 0);

  const pay = () => {
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
    <div className="animate-fade-up space-y-4 max-w-3xl">
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
            <Stepper value={qty[c.k]} onChange={(v) => setQty((q) => ({ ...q, [c.k]: v }))} />
          </div>
        ))}

        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-4 py-3">
          <div className="flex items-center justify-between">
            <div><div className="font-semibold text-navy-900 text-sm">Need an invoice (ΤΠΥ)?</div><div className="text-[12px] text-slate-600">B2B — issues a service invoice instead of a receipt (ΑΠΥ).</div></div>
            <Toggle on={biz} onChange={setBiz} />
          </div>
          {biz && (
            <div className="grid sm:grid-cols-2 gap-2 mt-3 animate-fade-in">
              <Field label="VAT number (ΑΦΜ)"><Input value={vat} onChange={(e) => setVat(e.target.value)} placeholder="123456789" /></Field>
              <Field label="Company name"><Input placeholder="Acme Ltd." /></Field>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-slate-600 text-sm">{n} ticket(s) × {dayCount} day{dayCount > 1 ? "s" : ""}{biz ? " · ΤΠΥ" : " · ΑΠΥ"}</div>
          <div className="text-2xl font-bold font-display text-navy-900 tnum">€{total}</div>
        </div>
        <Btn variant="teal" full size="lg" icon={Icon.card} disabled={!n} onClick={pay}>Add €{total} to basket</Btn>
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
    </div>
  );
}

/* ============ DAY LOCKER ============ */
export function CustomerLocker() {
  const { addToCart, toast } = useApp();
  const PRICE = 5;
  const [selDates, setSelDates] = useState([todayISO()]);
  const banks = ["A", "B", "C", "D", "E"];
  const lockers = useMemo(() => {
    const arr = [];
    banks.forEach((bk) => { for (let i = 1; i <= 20; i++) { const id = `${bk}${String(i).padStart(2, "0")}`; arr.push({ id, bank: bk, taken: (bk.charCodeAt(0) + i * 7) % 5 === 0 }); } });
    return arr;
  }, []);
  const [sel, setSel] = useState([]);
  const toggle = (id, taken) => { if (taken) return; setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); };
  const dayCount = selDates.length;
  const total = sel.length * PRICE * dayCount;
  const free = lockers.filter((l) => !l.taken).length;
  const reserve = () => {
    selDates.forEach((iso) => {
      const sub = chipLabel(iso).sub;
      sel.forEach((id) => addToCart({ kind: "locker", id: `${id}@${iso}`, label: `Locker ${id}`, sub, price: PRICE }));
    });
    toast(`${sel.length} locker${sel.length > 1 ? "s" : ""} × ${dayCount} day${dayCount > 1 ? "s" : ""} added to your basket.`, { tone: "success" });
    setSel([]);
  };
  const removeLocker = (id) => { setSel((s) => s.filter((x) => x !== id)); toast(`Locker ${id} removed.`, { action: { label: "Undo", onClick: () => setSel((s) => (s.includes(id) ? s : [...s, id])) } }); };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-5">
      <div>
        {/* Dates card. Locker legend (Available/Selected/Taken + free count)
            lives in a divider strip at the bottom of this same card so it
            doesn't read as a separate floating row. */}
        <Card className="glass-card-solid p-4 mb-4 overflow-visible">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Icon.calendar size={13} /> Dates · pick one or more</span>
            <span className="text-slate-600 normal-case tracking-normal">{dayCount} day{dayCount > 1 ? "s" : ""}</span>
          </div>
          <DatePickerRow value={selDates} onChange={setSelDates} />
          <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center gap-4 text-[11.5px] text-navy-900 flex-wrap">
            <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded bg-teal-500 inline-block ring-1 ring-white/70" />Available</span>
            <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded bg-navy-900 inline-block ring-1 ring-white/70" />Selected</span>
            <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded bg-slate-300 inline-block ring-1 ring-slate-400" />Taken</span>
            <span className="ml-auto font-semibold">{free} free today</span>
          </div>
        </Card>
        <LockerBackdrop className="p-5 ring-1 ring-white/30 shadow-float">
          <div className="relative space-y-4">
            {banks.map((bk) => (
              <div key={bk} className="rounded-xl bg-white/55 backdrop-blur-sm ring-1 ring-white/60 p-3">
                <div className="text-[12px] font-bold text-navy-900 mb-2 flex items-center gap-1.5">
                  <Icon.lock size={13} /> Bank {bk}
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(10,1fr)" }}>
                  {lockers.filter((l) => l.bank === bk).map((l) => {
                    const isSel = sel.includes(l.id);
                    const cl = l.taken
                      ? "bg-gradient-to-b from-slate-300 to-slate-400 text-slate-100 cursor-not-allowed"
                      : isSel
                        ? "bg-gradient-to-b from-navy-800 to-navy-950 text-white ring-2 ring-teal-400 shadow-lift"
                        : "bg-gradient-to-b from-teal-500 to-teal-700 text-white hover:from-teal-400 hover:to-teal-600 shadow-soft";
                    return (
                      <button key={l.id} disabled={l.taken} onClick={() => toggle(l.id, l.taken)} title={`${l.id} · ${l.taken ? "Taken" : "€" + PRICE}`} className={`relative aspect-[3/4] rounded-lg grid place-items-center transition ${cl} pb-5`}>
                        <Icon.lock size={22} />
                        <span className="absolute bottom-1.5 left-0 right-0 text-center text-[13px] font-bold leading-none tnum">{l.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </LockerBackdrop>
      </div>
      <div className="lg:sticky lg:top-4 h-max">
        <Card className="glass-card-solid p-5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Your lockers</div>
          {sel.length === 0 ? <EmptyState compact icon={Icon.lock} title="No lockers yet" body="Tap an available locker on the left to reserve it." /> : (
            <div className="space-y-2">
              {sel.map((id) => (
                <div key={id} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2">
                  <div className="flex items-center gap-2 text-navy-900"><Icon.lock size={15} /><span className="font-semibold text-sm">Locker {id}</span></div>
                  <div className="flex items-center gap-1"><span className="font-semibold tnum">€{PRICE * dayCount}</span><button aria-label={`Remove locker ${id}`} onClick={() => removeLocker(id)} className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Icon.trash size={15} /></button></div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-600">{sel.length} locker(s) × {dayCount} day{dayCount > 1 ? "s" : ""}</span><span className="font-bold text-navy-900 tnum text-lg">€{total}</span></div>
          <Btn variant="teal" full size="lg" className="mt-3" disabled={!sel.length} onClick={reserve}>{sel.length ? `Add ${sel.length}×${dayCount} to basket` : "Select a locker"}</Btn>
          <div className="mt-2 text-center text-[11px] text-slate-500">Redeem the QR at the entrance · Secured by Stripe</div>
        </Card>
      </div>
    </div>
  );
}

/* ============ PARKING ============ */
export function CustomerParking() {
  const { addToCart, toast } = useApp();
  const PRICE = 15;
  const [selDates, setSelDates] = useState([todayISO()]);
  const [plate, setPlate] = useState("");
  const [sel, setSel] = useState(null);
  // 50 spots organised across 5 rows of 10 (two paired banks + one outer row).
  const rows = useMemo(() => {
    const out = [];
    for (let r = 0; r < 5; r++) {
      const row = [];
      for (let c = 1; c <= 10; c++) row.push(`P${r * 10 + c}`);
      out.push(row);
    }
    return out;
  }, []);
  const taken = useMemo(() => new Set(["P3", "P7", "P12", "P18", "P21", "P24", "P29", "P33", "P40", "P44", "P47"]), []);
  const dayCount = selDates.length;
  const free = rows.flat().length - taken.size;
  const reserve = () => {
    selDates.forEach((iso) => {
      const sub = chipLabel(iso).sub;
      addToCart({ kind: "parking", id: `${sel}@${iso}`, label: `Parking ${sel}`, sub: `${plate || "—"} · ${sub}`, price: PRICE });
    });
    toast(`Parking spot ${sel} × ${dayCount} day${dayCount > 1 ? "s" : ""} added to your basket.`, { tone: "success" });
    setSel(null);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-5">
      <div>
        {/* Dates card. Parking status (X of 50 free) + Free/Selected/Taken
            legend live in a divider strip at the bottom of the same card so
            it doesn't read as a separate floating row. */}
        <Card className="glass-card-solid p-4 mb-4 overflow-visible">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Icon.calendar size={13} /> Dates · pick one or more</span>
            <span className="text-slate-600 normal-case tracking-normal">{dayCount} day{dayCount > 1 ? "s" : ""}</span>
          </div>
          <DatePickerRow value={selDates} onChange={setSelDates} />
          <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center justify-between text-navy-900 flex-wrap gap-2">
            <div className="font-semibold flex items-center gap-2 text-[13.5px]"><Icon.car size={17} /> Select a spot · {free} of 50 free</div>
            <div className="flex items-center gap-3 text-[11.5px]">
              <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded-sm bg-teal-500 inline-block ring-1 ring-white/60" />Free</span>
              <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded-sm bg-navy-900 inline-block ring-1 ring-white/60" />Selected</span>
              <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded-sm bg-slate-300 inline-block ring-1 ring-slate-400" />Taken</span>
            </div>
          </div>
        </Card>
        <ParkingBackdrop className="p-5 ring-1 ring-white/30 shadow-float">
          <div className="relative">
            {rows.map((row, ri) => {
              const lane = ri === 1 || ri === 3; // drive lane after row 0 and row 2
              return (
                <div key={ri}>
                  <div className="grid gap-1 mb-1.5" style={{ gridTemplateColumns: "repeat(10,1fr)" }}>
                    {row.map((id) => {
                      const isTaken = taken.has(id), isSel = sel === id;
                      const cl = isTaken
                        ? "bg-slate-300/90 text-slate-500 cursor-not-allowed"
                        : isSel
                          ? "bg-navy-900 text-white ring-2 ring-teal-400 shadow-lift"
                          : "bg-teal-500/95 text-white hover:bg-teal-600 shadow-soft";
                      return (
                        <button key={id} disabled={isTaken} onClick={() => setSel(isSel ? null : id)} title={`${id} · ${isTaken ? "Taken" : "€" + PRICE}`} className={`relative aspect-square rounded-md grid place-items-center transition border border-white/70 ${cl} pb-5`}>
                          <Icon.car size={22} />
                          <span className="absolute bottom-1 left-0 right-0 text-center text-[13px] font-bold leading-none tnum">{id}</span>
                        </button>
                      );
                    })}
                  </div>
                  {lane && (
                    <div className="my-2 h-6 flex items-center justify-center gap-2 text-[10px] text-yellow-200/95 tracking-widest uppercase font-bold drop-shadow">
                      <span>←</span><span>drive lane</span><span>→</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ParkingBackdrop>
        <p className="mt-3 text-[12px] text-navy-900 bg-white/70 backdrop-blur rounded-lg px-3 py-1.5 ring-1 ring-white/60 w-max">€{PRICE}/day per spot. Your plate is linked to the booking for gate recognition.</p>
      </div>
      <div className="lg:sticky lg:top-4 h-max">
        <Card className="glass-card-solid p-5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Your parking</div>
          <Field label="Vehicle plate"><Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" /></Field>
          <div className="mt-3">
            {sel ? (
              <div className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2">
                <div className="flex items-center gap-2 text-navy-900"><Icon.car size={15} /><span className="font-semibold text-sm">Spot {sel}</span></div>
                <div className="flex items-center gap-1"><span className="font-semibold tnum">€{PRICE * dayCount}</span><button aria-label={`Remove spot ${sel}`} onClick={() => setSel(null)} className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Icon.trash size={15} /></button></div>
              </div>
            ) : <EmptyState compact icon={Icon.car} title="No spot yet" body="Tap a free (green) spot in the lot to reserve it." />}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-600">{sel ? `1 spot × ${dayCount} day${dayCount > 1 ? "s" : ""}` : "0 spots"}</span><span className="font-bold text-navy-900 tnum text-lg">€{sel ? PRICE * dayCount : 0}</span></div>
          <Btn variant="teal" full size="lg" className="mt-3" disabled={!sel} onClick={reserve}>{sel ? `Add ${dayCount}×€${PRICE} to basket` : "Select a spot"}</Btn>
          <div className="mt-2 text-center text-[11px] text-slate-500">Show the QR at the barrier · Secured by Stripe</div>
        </Card>
      </div>
    </div>
  );
}

/* ============ MY BOOKINGS ============ */
export function CustomerBookings() {
  const { go, toast } = useApp();
  const [qrFor, setQrFor] = useState(null);
  const [filter, setFilter] = useState("all");
  const loading = useMockLoad();
  const data = CUSTOMER_BOOKINGS;
  const filtered = data.filter((d) => filter === "all" || d.state === filter);
  const total = data.reduce((a, b) => a + b.price, 0);
  const active = data.filter((d) => d.state === "active").length;
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Active bookings" value={active} sub="ready to redeem" tone="teal" />
        <StatCard label="This season" value={`€${total}`} sub={`${data.length} confirmed`} />
        <StatCard label="Next visit" value="Sun, 19 Jul" sub="Central zone · 2 sunbeds" tone="indigo" />
      </div>
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
        {loading ? (
          <TableSkeleton rows={4} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Icon.grid} title={filter === "active" ? "No active bookings" : "No past bookings yet"} body={filter === "active" ? "Book a sunbed for this weekend — Central front-row spots are 20% off." : "Once a visit is over, it will move here."} action={<Btn variant="teal" icon={Icon.umbrella} onClick={() => go("customer", "book")}>Book a sunbed</Btn>} />
        ) : (
          <Table cols={["Booking", "Item", "Date", "Status", "Price", "QR"]} right={[4]}
            rows={filtered.map((r) => [r.id, r.item, r.date, <StatusBadge status={r.status} />, `€${r.price}`, <Btn size="sm" variant="ghost" icon={Icon.qr} onClick={() => setQrFor(r.id)}>QR</Btn>])} />
        )}
      </Card>
      {qrFor && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4" onClick={() => setQrFor(null)}>
          <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()} className="relative bg-white rounded-2xl p-6 shadow-float text-center animate-pop">
            <div className="text-[12px] uppercase tracking-wide text-slate-400 font-semibold">Entry QR</div>
            <div className="font-display font-bold text-navy-900 text-lg mb-3">{qrFor}</div>
            <QR size={200} seed={qrFor} />
            <div className="mt-3 text-[12px] text-slate-500">Show at the gate · the controller validates in real time.</div>
            <Btn variant="outline" className="mt-4" icon={Icon.mail} onClick={() => { toast("QR re-sent to your e-mail.", { tone: "success" }); }}>Resend by e-mail</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ MY DOCUMENTS ============ */
export function CustomerDocs() {
  const { toast } = useApp();
  const docs = CUSTOMER_DOCS;
  const [view, setView] = useState(null);
  const loading = useMockLoad();
  const download = (d) => { downloadPDF(`${d.id}.pdf`, customerReceiptDoc(d)); toast(`Downloaded ${d.id}.pdf`, { tone: "success" }); };
  const downloadAll = () => {
    const files = filtered.map((d) => ({ name: `${d.id}.pdf`, content: buildReceiptBytes(d) }));
    if (!files.length) { toast("Nothing to bundle in this filter."); return; }
    downloadZIP(`slaice-receipts-${new Date().toISOString().slice(0,10)}.zip`, files);
    toast(`Bundled ${files.length} PDF${files.length === 1 ? "" : "s"} into ZIP.`, { tone: "success" });
  };
  const [filter, setFilter] = useState("all");
  const tone = (id) => id.startsWith("ΑΠΥ") ? "apy" : id.startsWith("ΤΠΥ") ? "tpy" : "credit";
  const filtered = docs.filter((d) => filter === "all" || tone(d.id) === filter);
  const totalAmount = docs.reduce((a, b) => {
    const v = parseInt(b.amt.replace(/[^0-9-−]/g, "").replace("−", "-"), 10) || 0;
    return a + v;
  }, 0);
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Receipts this season" value={docs.length} sub={`${docs.filter((d) => tone(d.id) === "apy").length} ΑΠΥ`} tone="teal" />
        <StatCard label="Total spend" value={`€${totalAmount}`} sub="all paid · MyDATA ✓" />
        <StatCard label="MyDATA status" value="100%" sub="transmitted" tone="indigo" />
      </div>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <Tabs tabs={[["all", "All"], ["apy", "ΑΠΥ"], ["tpy", "ΤΠΥ"], ["credit", "Credit notes"]]} value={filter} onChange={setFilter} />
          <Btn size="sm" variant="outline" icon={Icon.download} onClick={downloadAll}>Download all (ZIP)</Btn>
        </div>
        {loading ? (
          <TableSkeleton rows={2} cols={6} />
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
      {view && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4 animate-fade-in" onClick={() => setView(null)}>
          <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-xl" />
          <div onClick={(e) => e.stopPropagation()} className="glass-card relative rounded-2xl w-full max-w-md animate-pop">
            <div className="px-5 py-4 border-b border-white/40 flex items-center justify-between">
              <div className="font-display font-bold text-navy-900 text-lg">{view.id}</div>
              <button onClick={() => setView(null)} className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-white/40"><Icon.x size={18} /></button>
            </div>
            <div className="p-5 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div><div className="font-display font-bold text-navy-900">Akti tou Iliou AE</div><div className="text-slate-400 text-[12px]">ΑΦΜ 123456789 · GR · {view.date}</div></div>
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
            <div className="px-5 py-4 border-t border-white/40 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setView(null)}>Close</Btn>
              <Btn variant="primary" icon={Icon.download} onClick={() => { download(view); setView(null); }}>Download</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function customerReceiptDoc(d) {
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
function buildReceiptBytes(d) { return buildPDFBytes(customerReceiptDoc(d)); }
