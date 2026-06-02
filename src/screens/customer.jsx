import { useMemo, useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Card, Btn, Badge, PageHead, Table, Stepper, Toggle, Input, Field } from "../components/ui.jsx";
import { QR } from "../components/charts.jsx";
import { Sunbed, BeachBackdrop } from "../components/Beach.jsx";
import { ZONES, ZONE_BLOCKS, makeGrid, dateStrip, TENANT } from "../data/beach.js";
import { useApp } from "../app/store.jsx";

/* ============ HOME ============ */
export function CustomerHome() {
  const { go } = useApp();
  const tools = [
    { k: "book", t: "Sunbed Booking", d: "Reserve your spot on the live beach map", ic: Icon.umbrella, tone: "teal" },
    { k: "ticket", t: "Entry Ticket", d: "Buy entry for yourself or your group", ic: Icon.ticket },
    { k: "locker", t: "Day Locker", d: "Keep your valuables safe", ic: Icon.lock },
    { k: "parking", t: "Parking", d: "Reserve a spot at the car park", ic: Icon.car },
    { k: "mybookings", t: "My Bookings", d: "Reservations, QR codes & status", ic: Icon.grid },
    { k: "mydocs", t: "My Documents", d: "Receipts & invoices (MyDATA)", ic: Icon.receipt },
  ];
  const trust = [
    { ic: Icon.star, t: "4.9", s: "guest rating" },
    { ic: Icon.umbrella, t: "12k+", s: "beach days booked" },
    { ic: Icon.qr, t: "Instant", s: "QR entry" },
  ];
  return (
    <div className="animate-fade-up">
      <BeachBackdrop className="p-8 md:p-12 text-white relative ring-1 ring-white/10">
        <div className="absolute inset-0 bg-gradient-to-tr from-navy-950/70 via-navy-950/30 to-transparent" />
        <div className="relative">
          <Badge tone="mvp"><Icon.bolt size={11} /> {TENANT.name} · {TENANT.place}</Badge>
          <h1 className="mt-3 text-4xl md:text-5xl font-display font-bold leading-[1.05] drop-shadow-lg">Relax. Reserve.<br className="hidden sm:block" /> Repeat.</h1>
          <p className="mt-3 text-white/85 max-w-lg drop-shadow text-[15px]">Book ahead, skip the queues, and pick your sunbed on the live beach map.</p>
          <div className="mt-6 flex gap-3 flex-wrap">
            <Btn variant="teal" size="lg" icon={Icon.umbrella} onClick={() => go("customer", "book")}>Book a sunbed</Btn>
            <Btn variant="light" size="lg" icon={Icon.ticket} onClick={() => go("customer", "ticket")}>Buy a ticket</Btn>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
            {trust.map((x) => (
              <div key={x.s} className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl glass grid place-items-center text-gold-500 ring-1 ring-white/30"><x.ic size={16} /></span>
                <span className="leading-tight"><span className="block font-display font-bold text-lg">{x.t}</span><span className="block text-[11px] text-white/70 uppercase tracking-wide">{x.s}</span></span>
              </div>
            ))}
          </div>
        </div>
      </BeachBackdrop>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {tools.map((t) => (
          <button key={t.k} onClick={() => go("customer", t.k)} className="text-left group">
            <Card hover className="p-5 h-full">
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl grid place-items-center text-white shadow-sm transition-transform duration-200 ease-spring group-hover:scale-110 group-hover:-rotate-3 ${t.tone === "teal" ? "bg-gradient-to-br from-teal-500 to-teal-700" : "bg-gradient-to-br from-navy-800 to-navy-950"}`}><t.ic size={20} /></div>
                {t.future && <Badge tone="future">Future</Badge>}
              </div>
              <div className="mt-3 font-semibold text-navy-900 flex items-center gap-1">{t.t}<Icon.chevR size={15} className="transition-transform duration-200 group-hover:translate-x-1 text-teal-600" /></div>
              <div className="text-[13px] text-slate-500 mt-0.5">{t.d}</div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============ SUNBED BOOKING (hero, matches the video) ============ */
export function CustomerBooking() {
  const { go, toast, cart, addToCart, removeFromCart } = useApp();
  const [step, setStep] = useState("zones"); // zones | grid
  const [zoneId, setZoneId] = useState(null);
  const [date, setDate] = useState(0);
  const [sel, setSel] = useState([]); // {id, zone, price}
  const [extras, setExtras] = useState({ ticket: false, locker: false });
  const dates = useMemo(dateStrip, []);
  const zone = ZONES.find((z) => z.id === zoneId) || null;
  const grid = useMemo(() => (zone ? makeGrid(zone) : []), [zoneId]);

  const addBed = (id, price) => setSel((c) => (c.find((x) => x.id === id) ? c : [...c, { id, zone: zone.name, price }]));
  const rm = (id) => setSel((c) => c.filter((x) => x.id !== id));
  const sunTotal = sel.reduce((a, b) => a + b.price, 0);
  const extrasTotal = (extras.ticket ? 10 : 0) + (extras.locker ? 5 : 0);
  const total = sunTotal + extrasTotal;
  const focused = step === "grid" && zone;

  const reserve = () => {
    sel.forEach((b) => addToCart({ kind: "sunbed", id: b.id, label: `Sunbed ${b.id}`, sub: `${b.zone} · ${dates[date].label}`, price: b.price }));
    if (extras.ticket) addToCart({ kind: "ticket", id: "ADULT", label: "Entry ticket — Adult", sub: "Cross-sell", price: 10 });
    if (extras.locker) addToCart({ kind: "locker", id: "LK", label: "Day locker", sub: "Cross-sell", price: 5 });
    toast(`${sel.length} sunbed${sel.length > 1 ? "s" : ""} added to your basket.`);
    setSel([]);
    setExtras({ ticket: false, locker: false });
  };

  return (
    <div className="animate-fade-up">
      {/* ===== FULL-VIEWPORT BEACH (fixed background) ===== */}
      <div className="fixed inset-0 z-0">
        <div className="relative w-full h-full">
          <BeachBackdrop pos="absolute" className="inset-0 rounded-none">
            {/* zone pill-tabs */}
            <div className="absolute top-3 left-3 right-3 flex gap-2 overflow-x-auto z-20 pb-1 no-scrollbar">
              {ZONES.map((z) => {
                const active = zone && zone.id === z.id;
                return (
                  <button key={z.id} onClick={() => { setZoneId(z.id); setStep("grid"); }}
                    className={`flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 whitespace-nowrap transition shadow-md ${active ? "bg-navy-900 text-white" : "bg-white/90 backdrop-blur hover:bg-white"}`}>
                    <span className="w-7 h-7 rounded-full grid place-items-center text-white" style={{ background: z.color }}><Icon.umbrella size={13} /></span>
                    <span className="text-left leading-tight">
                      <span className="block text-[12px] font-semibold">{z.name}</span>
                      <span className={`block text-[10px] ${active ? "text-white/70" : "text-slate-400"}`}>{active ? "ACTIVE" : z.avail + " FREE"}</span>
                    </span>
                    {active && <Icon.check size={13} />}
                  </button>
                );
              })}
            </div>

            {!focused && (
              <>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/90 text-[12px] font-semibold drop-shadow z-10">Drag to explore · click a zone to zoom in</div>
                {ZONE_BLOCKS.map((b) => {
                  const z = ZONES.find((x) => x.id === b.id);
                  return (
                    <button key={b.id} onClick={() => { setZoneId(z.id); setStep("grid"); }}
                      className="absolute group z-10" style={{ left: b.left, top: b.top, width: b.w, transform: `rotate(${b.rot}deg)` }}>
                      <div className="rounded-lg bg-white/25 ring-2 ring-white/70 backdrop-blur-[1px] p-1 shadow-lg group-hover:bg-white/50 transition">
                        <div className="grid gap-[1px]" style={{ gridTemplateColumns: "repeat(8,1fr)" }}>
                          {Array.from({ length: 24 }).map((_, i) => {
                            const s = ["a", "a", "h", "a", "u", "a"][(i * 5 + z.total) % 6];
                            return <div key={i} className="aspect-square" style={{ lineHeight: 0 }}><Sunbed state={s} size={14} /></div>;
                          })}
                        </div>
                      </div>
                      <div className="mt-1 mx-auto w-max flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow ring-1 ring-slate-200" style={{ transform: `rotate(${-b.rot}deg)` }}>
                        <span className="w-4 h-4 rounded-full" style={{ background: z.color }} />
                        <span className="text-[11px] font-semibold text-navy-900">{z.name}</span>
                        <span className="text-[10px] text-slate-400 tnum">{z.avail}/{z.total}</span>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {focused && (
              <>
                <div className="absolute inset-0 grid place-items-center px-4 pt-20 pb-4 z-10 pointer-events-none">
                  <div className="pointer-events-auto">
                    <div className="rounded-2xl bg-white/45 ring-4 ring-white/80 backdrop-blur-[1px] p-3 sm:p-4 shadow-float max-w-[680px] max-h-[70vh] overflow-auto no-scrollbar">
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(14,1fr)" }}>
                        {grid.map((b) => {
                          const isSel = !!sel.find((x) => x.id === b.id);
                          return (
                            <div key={b.id} className="aspect-square grid place-items-center">
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
                <button onClick={() => { setStep("zones"); setZoneId(null); }} className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-navy-900/70 hover:bg-navy-900 rounded-full px-3 py-1.5 backdrop-blur"><Icon.arrowL size={15} /> Back to full beach</button>
              </>
            )}
          </BeachBackdrop>
        </div>
      </div>

      {/* ===== FLOATING GLASS BASKET (right edge) ===== */}
      <div className="fixed top-[88px] right-3 bottom-3 w-[340px] max-w-[calc(100vw-1.5rem)] z-20 glass rounded-2xl ring-1 ring-white/40 shadow-float flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-slate-400 text-sm"><Icon.search size={16} /> Find your perfect spot</div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5 flex items-center gap-1"><Icon.calendar size={12} /> Date</div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {dates.slice(0, 5).map((d, i) => (
                  <button key={i} onClick={() => setDate(i)} className={`px-2.5 py-1.5 rounded-lg text-center min-w-[60px] ring-1 transition ${date === i ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 hover:ring-teal-400"}`}>
                    <div className="text-[12px] font-semibold leading-tight">{d.label}</div>
                    <div className={`text-[10px] ${date === i ? "text-white/70" : "text-slate-400"}`}>{d.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Map overview</div>
              {focused ? (
                <div className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full grid place-items-center text-white" style={{ background: zone.color }}><Icon.umbrella size={13} /></span>
                    <div><div className="font-semibold text-sm text-navy-900">{zone.name}</div><div className="text-[11px] text-slate-400">{zone.avail} of {zone.total} available · from €{zone.from}</div></div>
                  </div>
                  <button onClick={() => { setStep("zones"); setZoneId(null); }} className="text-[12px] font-semibold text-slate-500 ring-1 ring-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-50">Back</button>
                </div>
              ) : (
                <div className="text-[12px] text-slate-500 rounded-xl bg-slate-50 px-3 py-2.5">Pick a zone on the beach to zoom in, then tap sunbeds to add them. You can book several at once.</div>
              )}
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Your selection{sel.length ? ` · ${sel.length}` : ""}</div>
              {sel.length === 0 ? (
                <div className="text-[12px] text-slate-400 rounded-xl bg-slate-50 px-3 py-3">No sunbeds selected yet. Tap available (blue) sunbeds to add them here.</div>
              ) : (
                <div className="space-y-1.5">
                  {sel.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 px-2.5 py-2 animate-pop">
                      <div className="flex items-center gap-2"><Sunbed state="a" sel size={18} /><div><div className="font-semibold text-[13px] text-navy-900 leading-none">{b.id}</div><div className="text-[10px] text-slate-400 mt-0.5">{b.zone}</div></div></div>
                      <div className="flex items-center gap-2"><span className="font-semibold text-[13px] tnum">€{b.price}</span><button onClick={() => rm(b.id)} className="text-slate-300 hover:text-rose-500"><Icon.trash size={15} /></button></div>
                    </div>
                  ))}
                  <button onClick={() => setSel([])} className="text-[11px] text-slate-400 hover:text-rose-500">Clear all</button>
                </div>
              )}
            </div>

            {/* cross-sell */}
            {sel.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Add to your day</div>
                <div className="space-y-1.5">
                  <CrossSell on={extras.ticket} onClick={() => setExtras((e) => ({ ...e, ticket: !e.ticket }))} icon={Icon.ticket} title="Entry ticket — Adult" price={10} />
                  <CrossSell on={extras.locker} onClick={() => setExtras((e) => ({ ...e, locker: !e.locker }))} icon={Icon.lock} title="Day locker" price={5} />
                </div>
              </div>
            )}

            {cart.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>In your basket · {cart.length}</span>
                  <button onClick={() => go("customer", "checkout")} className="text-teal-700 hover:text-teal-800 normal-case tracking-normal">Checkout →</button>
                </div>
                <div className="space-y-1.5">
                  {cart.map((it) => (
                    <div key={it.kind + it.id} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-2.5 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 grid place-items-center text-slate-500 shrink-0">{cartIcon(it.kind)}</span>
                        <div className="min-w-0"><div className="font-semibold text-[12px] text-navy-900 leading-tight truncate">{it.label}</div><div className="text-[10px] text-slate-400 truncate">{it.sub}</div></div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0"><span className="font-semibold text-[12px] tnum">€{it.price}</span><button onClick={() => removeFromCart(it.kind, it.id)} className="text-slate-300 hover:text-rose-500"><Icon.trash size={14} /></button></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Legend</div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                <span className="flex items-center gap-1"><Sunbed state="a" size={18} />Available</span>
                <span className="flex items-center gap-1"><Sunbed state="h" size={18} />On hold</span>
                <span className="flex items-center gap-1"><Sunbed state="u" size={18} />Unavailable</span>
                <span className="flex items-center gap-1"><Sunbed state="a" sel size={18} />Selected</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/40 p-4 bg-white/40 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-slate-600">{sel.length} sunbed{sel.length !== 1 ? "s" : ""}{extrasTotal ? " + extras" : ""}</span>
              <span className="font-bold text-navy-900 tnum text-lg">€{total}</span>
            </div>
            <Btn variant="dark" full size="lg" disabled={!sel.length} onClick={reserve}>
              {sel.length ? `Add ${sel.length} sunbed${sel.length > 1 ? "s" : ""} to basket` : "Select sunbeds to add to basket"}
            </Btn>
            {cart.length > 0 && (
              <Btn variant="teal" full size="lg" className="mt-2" icon={Icon.card} onClick={() => go("customer", "checkout")}>
                Checkout · {cart.length} item{cart.length > 1 ? "s" : ""} · €{cart.reduce((a, b) => a + b.price, 0)}
              </Btn>
            )}
            <button onClick={() => go("admin", "map")} className="mt-2 w-full text-center text-[11px] text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1"><Icon.cog size={12} /> Edit map layout</button>
          </div>
      </div>
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
    <button onClick={onClick} className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 ring-1 transition ${on ? "ring-teal-500 bg-teal-50" : "ring-slate-200 hover:ring-teal-400"}`}>
      <span className="flex items-center gap-2.5">
        <span className={`w-8 h-8 rounded-lg grid place-items-center ${on ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"}`}><IconC size={16} /></span>
        <span className="text-left"><span className="block text-[13px] font-semibold text-navy-900 flex items-center gap-1.5">{title}{future && <Badge tone="future">Future</Badge>}</span><span className="block text-[11px] text-slate-400">+€{price}</span></span>
      </span>
      <span className={`w-6 h-6 rounded-full grid place-items-center ${on ? "bg-teal-600 text-white" : "ring-1 ring-slate-300 text-slate-400"}`}>{on ? <Icon.check size={14} /> : <Icon.plus size={14} />}</span>
    </button>
  );
}

/* ============ ENTRY TICKET ============ */
export function CustomerTicket() {
  const { go, addToCart, clearCart, toast } = useApp();
  const cats = [
    { k: "adult", t: "Adult", p: 10, d: "Standard entry" },
    { k: "resident", t: "Alimos resident", p: 6, d: "Proof required at gate" },
    { k: "child", t: "Child (6–12)", p: 5, d: "Under 6 free" },
    { k: "senior", t: "Senior 65+", p: 7, d: "ID required" },
  ];
  const [qty, setQty] = useState({ adult: 2, resident: 0, child: 1, senior: 0 });
  const [biz, setBiz] = useState(false);
  const [vat, setVat] = useState("");
  const total = cats.reduce((a, c) => a + c.p * qty[c.k], 0);
  const n = Object.values(qty).reduce((a, b) => a + b, 0);

  const pay = () => {
    cats.forEach((c) => qty[c.k] > 0 && addToCart({ kind: "ticket", id: c.k, label: `${c.t} × ${qty[c.k]}`, sub: "Entry ticket", price: c.p * qty[c.k] }));
    toast(`${n} ticket${n > 1 ? "s" : ""} added to your basket.`);
    setQty({ adult: 0, resident: 0, child: 0, senior: 0 });
  };

  return (
    <div className="animate-fade-up max-w-2xl">
      <PageHead title="Entry Ticket" sub="Buy entry for yourself or your group — pricing adapts to each person's category." badge={<Badge tone="mvp">MVP</Badge>} />
      <Card className="p-5 space-y-3">
        {cats.map((c) => (
          <div key={c.k} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 px-4 py-3">
            <div><div className="font-semibold text-navy-900">{c.t}</div><div className="text-[12px] text-slate-400">€{c.p} · {c.d}</div></div>
            <Stepper value={qty[c.k]} onChange={(v) => setQty((q) => ({ ...q, [c.k]: v }))} />
          </div>
        ))}

        <div className="rounded-xl ring-1 ring-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div><div className="font-semibold text-navy-900 text-sm">Need an invoice (ΤΠΥ)?</div><div className="text-[12px] text-slate-400">B2B — issues a service invoice instead of a receipt (ΑΠΥ).</div></div>
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
          <div className="text-slate-500 text-sm">{n} ticket(s){biz ? " · ΤΠΥ" : " · ΑΠΥ"}</div>
          <div className="text-2xl font-bold font-display text-navy-900 tnum">€{total}</div>
        </div>
        <Btn variant="teal" full size="lg" icon={Icon.card} disabled={!n} onClick={pay}>Add €{total} to basket</Btn>
      </Card>
      <p className="text-[12px] text-slate-400 mt-3 flex items-center gap-1.5"><Icon.bolt size={13} /> Dynamic pricing by profile (resident / age). Cross-sell: tickets can also be added during sunbed checkout.</p>
    </div>
  );
}

/* ============ DAY LOCKER ============ */
export function CustomerLocker() {
  const { go, addToCart, clearCart, toast } = useApp();
  const PRICE = 5;
  const [date, setDate] = useState(0);
  const dates = useMemo(dateStrip, []);
  const banks = ["A", "B", "C", "D", "E"];
  const lockers = useMemo(() => {
    const arr = [];
    banks.forEach((bk) => { for (let i = 1; i <= 20; i++) { const id = `${bk}${String(i).padStart(2, "0")}`; arr.push({ id, bank: bk, taken: (bk.charCodeAt(0) + i * 7) % 5 === 0 }); } });
    return arr;
  }, []);
  const [sel, setSel] = useState([]);
  const toggle = (id, taken) => { if (taken) return; setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); };
  const total = sel.length * PRICE;
  const free = lockers.filter((l) => !l.taken).length;
  const reserve = () => { sel.forEach((id) => addToCart({ kind: "locker", id, label: `Locker ${id}`, sub: dates[date].label, price: PRICE })); toast(`${sel.length} locker${sel.length > 1 ? "s" : ""} added to your basket.`); setSel([]); };

  return (
    <div className="animate-fade-up grid lg:grid-cols-[1fr_320px] gap-5">
      <div>
        <PageHead title="Day Locker" sub="Keep your valuables safe — reserve a locker for the day." badge={<Badge tone="mvp">MVP</Badge>} />
        <Card className="p-4 mb-4">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1"><Icon.calendar size={13} /> Date</div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {dates.slice(0, 5).map((d, i) => (
              <button key={i} onClick={() => setDate(i)} className={`px-3.5 py-2 rounded-xl text-center min-w-[78px] ring-1 transition ${date === i ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 hover:ring-teal-400"}`}>
                <div className="text-[13px] font-semibold">{d.label}</div><div className={`text-[11px] ${date === i ? "text-white/70" : "text-slate-400"}`}>{d.sub}</div>
              </button>
            ))}
          </div>
        </Card>
        <div className="flex items-center gap-4 text-[11px] text-slate-500 mb-2 px-1 flex-wrap">
          <span className="flex items-center gap-1.5"><i className="w-4 h-4 rounded bg-teal-500/80 inline-block" />Available</span>
          <span className="flex items-center gap-1.5"><i className="w-4 h-4 rounded bg-navy-900 inline-block" />Selected</span>
          <span className="flex items-center gap-1.5"><i className="w-4 h-4 rounded bg-slate-200 inline-block" />Taken</span>
          <span className="ml-auto text-slate-400">{free} free today</span>
        </div>
        <Card className="p-5 space-y-4">
          {banks.map((bk) => (
            <div key={bk}>
              <div className="text-[12px] font-semibold text-slate-500 mb-1.5">Bank {bk}</div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(10,1fr)" }}>
                {lockers.filter((l) => l.bank === bk).map((l) => {
                  const isSel = sel.includes(l.id);
                  const cl = l.taken ? "bg-slate-200 text-slate-400 cursor-not-allowed" : isSel ? "bg-navy-900 text-white ring-2 ring-teal-400" : "bg-teal-500/80 text-white hover:bg-teal-600";
                  return (
                    <button key={l.id} disabled={l.taken} onClick={() => toggle(l.id, l.taken)} title={`${l.id} · ${l.taken ? "Taken" : "€" + PRICE}`} className={`relative aspect-[3/4] rounded-md grid place-items-center transition ${cl}`}>
                      <Icon.lock size={13} /><span className="absolute bottom-0.5 text-[7px] font-bold leading-none">{l.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      </div>
      <div className="lg:sticky lg:top-4 h-max">
        <Card className="p-5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Your lockers</div>
          {sel.length === 0 ? <div className="text-sm text-slate-400 py-8 text-center">No lockers selected yet.</div> : (
            <div className="space-y-2">
              {sel.map((id) => (
                <div key={id} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 px-3 py-2">
                  <div className="flex items-center gap-2 text-navy-900"><Icon.lock size={15} /><span className="font-semibold text-sm">Locker {id}</span></div>
                  <div className="flex items-center gap-2"><span className="font-semibold tnum">€{PRICE}</span><button onClick={() => setSel((s) => s.filter((x) => x !== id))} className="text-slate-300 hover:text-rose-500"><Icon.trash size={15} /></button></div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-500">{sel.length} locker(s)</span><span className="font-bold text-navy-900 tnum text-lg">€{total}</span></div>
          <Btn variant="teal" full size="lg" className="mt-3" disabled={!sel.length} onClick={reserve}>{sel.length ? `Add ${sel.length} locker${sel.length > 1 ? "s" : ""} to basket` : "Select a locker"}</Btn>
          <div className="mt-2 text-center text-[11px] text-slate-400">Redeem the QR at the entrance · Secured by Stripe</div>
        </Card>
      </div>
    </div>
  );
}

/* ============ PARKING ============ */
export function CustomerParking() {
  const { go, addToCart, clearCart, toast } = useApp();
  const PRICE = 15;
  const [date, setDate] = useState(0);
  const dates = useMemo(dateStrip, []);
  const [plate, setPlate] = useState("");
  const [sel, setSel] = useState(null);
  const rows = [["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"], ["P9", "P10", "P11", "P12", "P13", "P14", "P15", "P16"]];
  const taken = new Set(["P3", "P4", "P10", "P14", "P15"]);
  const reserve = () => { addToCart({ kind: "parking", id: sel, label: `Parking ${sel}`, sub: `${plate || "—"} · ${dates[date].label}`, price: PRICE }); toast(`Parking spot ${sel} added to your basket.`); setSel(null); };

  return (
    <div className="animate-fade-up grid lg:grid-cols-[1fr_320px] gap-5">
      <div>
        <PageHead title="Parking" sub="Reserve a parking spot for the day at the beach car park." badge={<Badge tone="mvp">MVP</Badge>} />
        <Card className="p-4 mb-4">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1"><Icon.calendar size={13} /> Date</div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {dates.slice(0, 5).map((d, i) => (
              <button key={i} onClick={() => setDate(i)} className={`px-3.5 py-2 rounded-xl text-center min-w-[78px] ring-1 transition ${date === i ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 hover:ring-teal-400"}`}>
                <div className="text-[13px] font-semibold">{d.label}</div><div className={`text-[11px] ${date === i ? "text-white/70" : "text-slate-400"}`}>{d.sub}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.car size={18} /> Select a spot</div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-teal-500 inline-block" />Free</span>
              <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-navy-900 inline-block" />Selected</span>
              <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-slate-200 inline-block" />Taken</span>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-100 p-4 ring-1 ring-slate-200">
            {rows.map((row, ri) => (
              <div key={ri}>
                <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `repeat(${row.length},1fr)` }}>
                  {row.map((id) => {
                    const isTaken = taken.has(id), isSel = sel === id;
                    const cl = isTaken ? "bg-slate-200 text-slate-400 cursor-not-allowed" : isSel ? "bg-navy-900 text-white ring-2 ring-teal-400" : "bg-teal-500/80 text-white hover:bg-teal-600";
                    return (
                      <button key={id} disabled={isTaken} onClick={() => setSel(isSel ? null : id)} title={`${id} · ${isTaken ? "Taken" : "€" + PRICE}`} className={`aspect-[3/4] rounded-lg grid place-items-center transition ${cl}`}>
                        <Icon.car size={16} /><span className="text-[9px] font-bold mt-0.5">{id}</span>
                      </button>
                    );
                  })}
                </div>
                {ri === 0 && <div className="h-7 flex items-center justify-center text-[10px] text-slate-400 tracking-widest uppercase my-1">↑ drive lane ↓</div>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-slate-400">€{PRICE}/day per spot. Your plate is linked to the booking for gate recognition.</p>
        </Card>
      </div>
      <div className="lg:sticky lg:top-4 h-max">
        <Card className="p-5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Your parking</div>
          <Field label="Vehicle plate"><Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" /></Field>
          <div className="mt-3">
            {sel ? (
              <div className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 px-3 py-2">
                <div className="flex items-center gap-2 text-navy-900"><Icon.car size={15} /><span className="font-semibold text-sm">Spot {sel}</span></div>
                <div className="flex items-center gap-2"><span className="font-semibold tnum">€{PRICE}</span><button onClick={() => setSel(null)} className="text-slate-300 hover:text-rose-500"><Icon.trash size={15} /></button></div>
              </div>
            ) : <div className="text-sm text-slate-400 py-6 text-center">No spot selected yet.</div>}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-500">{sel ? "1 spot" : "0 spots"}</span><span className="font-bold text-navy-900 tnum text-lg">€{sel ? PRICE : 0}</span></div>
          <Btn variant="teal" full size="lg" className="mt-3" disabled={!sel} onClick={reserve}>{sel ? "Add parking to basket" : "Select a spot"}</Btn>
          <div className="mt-2 text-center text-[11px] text-slate-400">Show the QR at the barrier · Secured by Stripe</div>
        </Card>
      </div>
    </div>
  );
}

/* ============ MY BOOKINGS ============ */
export function CustomerBookings() {
  const { toast } = useApp();
  const [qrFor, setQrFor] = useState(null);
  const rows = [
    ["#BK-10428", "Central · CE-89", "Sun, 19 Jul", <Badge tone="green">Confirmed</Badge>, "€30"],
    ["#BK-10402", "Central · CE-92", "Sun, 19 Jul", <Badge tone="green">Confirmed</Badge>, "€30"],
    ["#TK-55120", "Entry · Adult ×2", "Sun, 19 Jul", <Badge tone="green">Confirmed</Badge>, "€20"],
    ["#BK-10310", "Bestbuy · BE-14", "Sat, 12 Jul", <Badge tone="slate">Used</Badge>, "€22"],
  ];
  return (
    <div className="animate-fade-up">
      <PageHead title="My Bookings" sub="Your reservations with QR, status, zone, price and date." badge={<Badge tone="mvp">MVP</Badge>} />
      <Card className="p-2">
        <Table cols={["Booking", "Item", "Date", "Status", "Price", "QR"]} right={[4]}
          rows={rows.map((r) => [...r, <Btn size="sm" variant="ghost" icon={Icon.qr} onClick={() => setQrFor(r[0])}>QR</Btn>])} />
      </Card>
      {qrFor && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4" onClick={() => setQrFor(null)}>
          <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()} className="relative bg-white rounded-2xl p-6 shadow-float text-center animate-pop">
            <div className="text-[12px] uppercase tracking-wide text-slate-400 font-semibold">Entry QR</div>
            <div className="font-display font-bold text-navy-900 text-lg mb-3">{qrFor}</div>
            <QR size={200} seed={qrFor} />
            <div className="mt-3 text-[12px] text-slate-500">Show at the gate · the controller validates in real time.</div>
            <Btn variant="outline" className="mt-4" icon={Icon.mail} onClick={() => { toast("Demo — QR re-sent to your e-mail."); }}>Resend by e-mail</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ MY DOCUMENTS ============ */
export function CustomerDocs() {
  const { toast } = useApp();
  const rows = [
    ["ΑΠΥ-2026-004281", "Sunbed booking", "19 Jul 2026", "€30", <Badge tone="green">MyDATA ✓</Badge>],
    ["ΑΠΥ-2026-004102", "Entry tickets ×3", "12 Jul 2026", "€25", <Badge tone="green">MyDATA ✓</Badge>],
  ];
  return (
    <div className="animate-fade-up">
      <PageHead title="My Documents" sub="Receipts (ΑΠΥ) and invoices transmitted to MyDATA, each with a MARK. Viewable via a public document URL." badge={<Badge tone="mvp">MVP</Badge>} />
      <Card className="p-2">
        <Table cols={["Document", "For", "Date", "Amount", "Status", "PDF"]} right={[3]}
          rows={rows.map((r) => [...r, <Btn size="sm" variant="ghost" icon={Icon.download} onClick={() => toast("Demo — downloads PDF with MARK + AADE QR.")}>PDF</Btn>])} />
      </Card>
    </div>
  );
}
