import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, Input, Modal, PageHead, StickyActionBar, Stepper } from "../../components/ui";
import { Sunbed } from "../../components/Beach";
import { SunbedMap } from "../../components/SunbedMap";
import { useApp } from "../../app/store";
import { ZONES } from "../../data/beach";
import { CUSTOMERS } from "../../data/mock";
import { BUNDLES, DISCOUNT_PRESETS, PROMO_CODES, QUICK_KEYS, TICKET_LABEL, TICKET_ORDER, type Bundle, type QuickKey } from "../../data/till";
import { TICKET_PRICES, resolvePrice } from "../../domain/pricing";
import { basketTotals, discountAmount, eur, lineGross, validatePromo, type Tender, type TenderKind, type TillDiscount, type TillLine, type TillSale } from "../../domain/till";
import type { SunbedSlot, TicketCategory } from "../../domain/types";
import { useClosure, useLiveSlots, useNow } from "../../lib/useLiveSlots";
import { useTill } from "./useTill";
import { ManagerPinModal, ReceiptModal, SaleDone } from "./TillParts";
import { TenderModal } from "./Tender";
import { OpenShiftCard, TillStatus } from "./TillStatus";

/* ============ ISSUE TICKET — the till (AENR-497) ============
   One basket for entry tickets, sunbed sets in the store the walk-in chooses,
   and bundles. Quick keys put the common sale one tap away; sets in the basket
   are held for this till (On hold everywhere else) until paid or released.
   Payment: card / cash / voucher, split as needed. Every sale → ΑΠΥ to myDATA. */

type Pin = { reason: string; then: (manager: string) => void };
const ZONE_NAMES = Object.fromEntries(ZONES.map((z) => [z.id, z.name]));
let uidN = 0;
const uid = (p: string) => `${p}${++uidN}`;
const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

export function CashierIssue() {
  const { toast, go, priceRules, beachPricing } = useApp();
  const closure = useClosure();
  const t = useTill();
  const now = useNow(1000);
  const liveSlots = useLiveSlots("walkin");
  const [lines, setLines] = useState<TillLine[]>([]);
  const [discounts, setDiscounts] = useState<TillDiscount[]>([]);
  const [customer, setCustomer] = useState<TillSale["customer"]>();
  const [zoneId, setZoneId] = useState("central");
  const [tender, setTender] = useState<TenderKind | null>(null);
  const [done, setDone] = useState<TillSale | null>(null);
  const [last, setLast] = useState<{ sale: TillSale; until: number } | null>(null);
  const [reprint, setReprint] = useState<TillSale | null>(null);
  const [pin, setPin] = useState<Pin | null>(null);
  const [discOpen, setDiscOpen] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoErr, setPromoErr] = useState("");
  const [custOpen, setCustOpen] = useState(false);
  const [err, setErr] = useState("");

  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  const priceOf = (s: SunbedSlot, zId = zone.id) => resolvePrice(s, zId, t.day, beachPricing, priceRules).price;
  const inBasket = useMemo(() => new Set(lines.filter((l) => l.setId).map((l) => l.setId as string)), [lines]);
  const zoneSlots = (zId: string) => liveSlots(ZONES.find((z) => z.id === zId)!, [t.day]);
  const slots = zoneSlots(zone.id);
  const freeIn = (zId: string) => zoneSlots(zId).filter((s) => s.state === "a" && !inBasket.has(s.id));
  const totals = basketTotals(lines, discounts);
  const hasSets = inBasket.size > 0;

  const shiftOpen = !!t.till.shift;
  // The phone pay bar hides once the basket itself is on screen.
  const [basketInView, setBasketInView] = useState(false);
  useEffect(() => {
    const el = document.getElementById("till-basket");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setBasketInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [shiftOpen]);
  // Last sale stays in a side strip for 30 s for a quick reprint.
  useEffect(() => { if (last && now > last.until) setLast(null); }, [now, last]);

  /* ---- Basket edits ---- */
  // Adding anything while the last receipt is up starts the next sale.
  const fresh = () => { if (done) newSale(); };
  const setTicketQty = (cat: TicketCategory, qty: number) => { fresh(); setLines((ls) => {
    const id = `t-${cat}`;
    const rest = ls.filter((l) => l.id !== id);
    if (qty <= 0) return rest;
    const line: TillLine = { id, kind: "ticket", label: TICKET_LABEL[cat], qty, unit: TICKET_PRICES[cat], cat };
    return ls.some((l) => l.id === id) ? ls.map((l) => (l.id === id ? line : l)) : [...ls, line];
  }); };
  const ticketQty = (cat: TicketCategory) => lines.find((l) => l.id === `t-${cat}`)?.qty ?? 0;
  const setLine = (s: SunbedSlot, zId: string, bundle?: string): TillLine => ({ id: uid("s-"), kind: "sunbed", label: `Sunbed set ${s.id} · ${ZONE_NAMES[zId]}`, qty: 1, unit: priceOf(s, zId), zoneId: zId, setId: s.id, bundle });
  /** Best available = front row first, then cheapest. */
  const bestFree = (n: number) => [...freeIn(zone.id)].sort((a, b) => a.y - b.y || a.price - b.price).slice(0, n);
  const addSets = (picked: SunbedSlot[], bundle?: string) => {
    setLines((ls) => [...ls, ...picked.map((s) => setLine(s, zone.id, bundle))]);
    t.hold(picked.map((s) => s.id));
  };
  const toggleSet = (s: SunbedSlot) => {
    fresh();
    setErr("");
    if (inBasket.has(s.id)) return removeLines(lines.filter((l) => l.setId === s.id).map((l) => l.id));
    if (s.state !== "a") return;
    addSets([s]);
  };
  const anyFree = (n = 1) => {
    fresh();
    const picked = bestFree(n);
    if (picked.length < n) return setErr(`Only ${picked.length} free set${picked.length === 1 ? "" : "s"} left in ${zone.name}.`), null;
    addSets(picked);
    return picked;
  };
  const removeLines = (ids: string[]) => {
    const gone = lines.filter((l) => ids.includes(l.id));
    t.release(gone.filter((l) => l.setId).map((l) => l.setId as string));
    setLines((ls) => ls.filter((l) => !ids.includes(l.id)));
    setDiscounts((ds) => ds.filter((d) => !d.lineId || !ids.includes(d.lineId)));
  };
  const removeBundle = (b: string) => {
    removeLines(lines.filter((l) => l.bundle === b).map((l) => l.id));
    setDiscounts((ds) => ds.filter((d) => d.id !== `d-${b}`));
  };
  const quick = (q: QuickKey) => {
    setErr("");
    Object.entries(q.tickets).forEach(([c, n]) => setTicketQty(c as TicketCategory, ticketQty(c as TicketCategory) + (n ?? 0)));
    if (q.sets) anyFree(q.sets);
  };
  const addBundle = (b: Bundle) => {
    fresh();
    setErr("");
    if (closure(zone.id, t.day)) return setErr(`${zone.name} is closed — choose another store first.`);
    const picked = bestFree(b.sets);
    if (picked.length < b.sets) return setErr(`${b.label} needs ${b.sets} free sets in ${zone.name}.`);
    const tag = `${b.label} #${lines.filter((l) => l.bundle).length + 1}`;
    const tix: TillLine[] = Object.entries(b.tickets).map(([c, n]) => ({ id: uid(`b-${c}-`), kind: "ticket", label: TICKET_LABEL[c as TicketCategory], qty: n ?? 0, unit: TICKET_PRICES[c as TicketCategory], cat: c as TicketCategory, bundle: tag }));
    setLines((ls) => [...ls, ...tix, ...picked.map((s) => setLine(s, zone.id, tag))]);
    t.hold(picked.map((s) => s.id));
    setDiscounts((ds) => [...ds, { id: `d-${tag}`, label: `${b.label} saving`, reason: "Bundle", kind: "abs", value: b.saving }]);
  };
  const clear = () => {
    t.release([...inBasket]);
    setLines([]);
    setDiscounts([]);
    setCustomer(undefined);
    setErr("");
    setPromo("");
    setPromoErr("");
  };

  /* ---- Discounts / promo (AENR-508) ---- */
  const addDiscount = (d: Omit<TillDiscount, "id">) => setDiscounts((ds) => [...ds.filter((x) => x.label !== d.label), { ...d, id: uid("d-") }]);
  const applyPromo = () => {
    const r = validatePromo(promo, PROMO_CODES, lines, t.day, t.till.promoUses, ZONE_NAMES);
    if (!r.ok) return setPromoErr(r.reason);
    if (discounts.some((d) => d.code === r.discount.code)) return setPromoErr(`${r.discount.code} is already applied.`);
    setDiscounts((ds) => [...ds, r.discount]);
    setPromo("");
    setPromoErr("");
  };

  /* ---- Pay ---- */
  const holdLeft = (setId: string) => (t.till.holds[setId]?.until ?? 0) - now;
  const startPay = (m: TenderKind) => {
    setErr("");
    const status = t.status(now);
    const lost = lines.find((l) => l.setId && status[l.setId] === "sold");
    if (lost) return setErr(`${lost.setId} was just sold elsewhere — remove it and pick another set.`);
    // Re-hold anything whose hold lapsed while the basket sat open.
    const lapsed = lines.filter((l) => l.setId && holdLeft(l.setId) <= 0).map((l) => l.setId as string);
    if (lapsed.length) t.hold(lapsed);
    setTender(m);
  };
  const onPaid = (tenders: Tender[]) => {
    const sale = t.completeSale({ lines, discounts, total: totals.total, tenders, customer });
    setTender(null);
    setDone(sale);
    setLines([]);
    setDiscounts([]);
    setCustomer(undefined);
  };
  const onCancelTender = (taken: Tender[]) => {
    setTender(null);
    const back = taken.reduce((a, x) => a + x.amount, 0);
    if (back > 0) toast(`Demo — ${eur(back)} already taken was reversed (${taken.map((x) => x.kind).join(" + ")}).`, { tone: "info" });
  };
  const newSale = () => {
    if (done) setLast({ sale: done, until: Date.now() + 30000 });
    setDone(null);
    setPromo("");
  };

  // Group the basket: plain lines as-is, bundle lines collapsed under their bundle.
  const bundleTags = [...new Set(lines.filter((l) => l.bundle).map((l) => l.bundle as string))];
  const plain = lines.filter((l) => !l.bundle);

  return (
    <div className="animate-fade-up pb-20 md:pb-0">
      <PageHead title="Issue Ticket" sub="Sell entry tickets and sunbed sets in one charge — card, cash, voucher or split." badge={<Badge tone="mvp">MVP</Badge>}
        actions={<Btn variant="outline" icon={Icon.list} onClick={() => go("cashier", "transactions")}>Today’s transactions</Btn>} />
      <TillStatus />
      {!shiftOpen ? (
        <OpenShiftCard />
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
          <div className="space-y-4 min-w-0">
            {/* Quick keys + bundles */}
            <Card className="p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Quick keys</div>
              <div className="flex flex-wrap gap-2">
                {QUICK_KEYS.map((q) => (
                  <button key={q.id} type="button" onClick={() => quick(q)}
                    className="min-h-[48px] rounded-xl bg-navy-900 text-white px-4 font-semibold text-sm shadow-sm hover:bg-navy-800 active:scale-[.97] transition disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2">
                    {q.label}
                  </button>
                ))}
                {BUNDLES.map((b) => (
                  <button key={b.id} type="button" onClick={() => addBundle(b)}
                    className="min-h-[48px] rounded-xl bg-teal-50 text-teal-800 ring-1 ring-teal-600/25 px-4 text-left text-sm hover:bg-teal-100 active:scale-[.97] transition disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                    <span className="font-semibold">{b.label}</span>
                    <span className="block text-[11px] text-teal-700/80">{Object.entries(b.tickets).map(([c, n]) => `${n} ${TICKET_LABEL[c as TicketCategory]}`).join(" + ")} + {b.sets} set{b.sets > 1 ? "s" : ""} · save €{b.saving}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Step 1 · tickets */}
            <Card className="p-4">
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="font-display font-bold text-navy-900">1 · Entry tickets</h2>
                <span className="text-[12px] text-slate-500">Anonymous · skip for a sunbed-only sale</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {TICKET_ORDER.map((c) => (
                  <div key={c} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2">
                    <div><div className="font-semibold text-navy-900 text-sm">{TICKET_LABEL[c]}</div><div className="text-[12px] text-slate-600">€{TICKET_PRICES[c]} each</div></div>
                    <Stepper label={`${TICKET_LABEL[c]} tickets`} value={ticketQty(c)} onChange={(v) => setTicketQty(c, v)} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Step 2 · store */}
            <Card className="p-4">
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="font-display font-bold text-navy-900">2 · Store</h2>
                <span className="text-[12px] text-slate-500">Live availability for today</span>
              </div>
              <div role="radiogroup" aria-label="Store" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ZONES.map((z) => {
                  const closed = closure(z.id, t.day);
                  const free = freeIn(z.id);
                  const from = free.length ? Math.min(...free.map((s) => priceOf(s, z.id))) : null;
                  const off = !!closed || free.length === 0;
                  const active = z.id === zone.id;
                  return (
                    <button key={z.id} type="button" role="radio" aria-checked={active} disabled={off && !active}
                      onClick={() => { setZoneId(z.id); setErr(""); }}
                      className={`min-h-[56px] rounded-xl px-3 py-2 text-left ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${active ? "bg-navy-900 text-white ring-navy-900" : off ? "bg-slate-50 ring-slate-200 text-slate-400 cursor-not-allowed" : "bg-white/70 ring-slate-200 text-navy-900 hover:bg-white"}`}>
                      <span className="flex items-center gap-1.5 font-semibold text-sm"><i className="w-2 h-2 rounded-full" style={{ background: z.color }} />{z.name}</span>
                      <span className={`block text-[11.5px] mt-0.5 ${active ? "text-white/75" : off ? "text-slate-400" : "text-slate-500"}`}>
                        {closed ? closed : free.length === 0 ? "Full today" : `${free.length} free · from €${from}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Step 3 · sunbeds */}
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-2 justify-between mb-2">
                <h2 className="font-display font-bold text-navy-900">3 · Sunbeds · {zone.name}</h2>
                <Btn size="sm" variant="outline" icon={Icon.sparkles} disabled={!!closure(zone.id, t.day)} onClick={() => anyFree(1)}>Any free set</Btn>
              </div>
              {t.till.offline && (
                <div className="mb-2 rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-600/20 px-3 py-1.5 text-[12px] flex items-center gap-1.5"><Icon.alert size={13} /> Offline — this is the cached map; availability may be out of date. Conflicts are flagged when the till reconnects.</div>
              )}
              {closure(zone.id, t.day) ? (
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-6 text-center text-sm text-slate-600">{zone.name}: {closure(zone.id, t.day)}. Choose another store.</div>
              ) : (
                <>
                  <SunbedMap label={`${zone.name} sunbed map`} slots={slots} selected={inBasket} onToggle={toggleSet} priceOf={(s) => priceOf(s)}
                    landmarks={beachPricing.landmarks.filter((l) => l.zoneId === zone.id)} />
                  <div className="mt-2 flex flex-wrap gap-3 text-[11.5px] text-slate-600">
                    <span className="flex items-center gap-1"><Sunbed state="a" size={14} readOnly /> Free</span>
                    <span className="flex items-center gap-1"><Sunbed state="h" size={14} readOnly /> On hold</span>
                    <span className="flex items-center gap-1"><Sunbed state="u" size={14} readOnly /> Booked / blocked</span>
                    <span className="flex items-center gap-1"><Sunbed state="a" sel size={14} readOnly /> In this basket</span>
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Basket */}
          <div id="till-basket" className="lg:sticky lg:top-4 space-y-3 scroll-mt-4">
            <Card className="p-4">
              {done ? (
                <SaleDone sale={done} onNew={newSale}
                  onDeliver={(c, to) => { t.setDelivery(done.id, c); toast(c === "email" ? `Demo — receipt e-mailed to ${to}.` : c === "sms" ? `Demo — receipt link sent by SMS to ${to}.` : c === "print" ? "Demo — printed on the receipt printer (ESC/POS)." : c === "qr" ? "Receipt QR shown — the customer scans it." : "No receipt — the ΑΠΥ is still recorded.", { tone: "success" }); }} />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-display font-bold text-navy-900">Basket</h2>
                    {lines.length > 0 && <Btn size="sm" variant="ghost" icon={Icon.trash} onClick={clear}>Clear</Btn>}
                  </div>
                  {lines.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 ring-1 ring-dashed ring-slate-300 px-4 py-6 text-center text-[13px] text-slate-600">
                      Tap a quick key, add tickets or pick sets on the map.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {bundleTags.map((b) => {
                        const ls = lines.filter((l) => l.bundle === b);
                        return (
                          <li key={b} className="py-2 flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-navy-900 text-sm">{b.replace(/ #\d+$/, "")}</div>
                              <div className="text-[11.5px] text-slate-500">{ls.map((l) => (l.setId ? l.setId : `${l.qty} ${l.label}`)).join(" · ")}</div>
                              {ls.some((l) => l.setId) && <HoldChip ms={Math.min(...ls.filter((l) => l.setId).map((l) => holdLeft(l.setId as string)))} />}
                            </div>
                            <span className="tnum font-semibold text-sm">{eur(ls.reduce((a, l) => a + lineGross(l), 0))}</span>
                            <RemoveBtn label={`Remove ${b}`} onClick={() => removeBundle(b)} />
                          </li>
                        );
                      })}
                      {plain.map((l) => (
                        <li key={l.id} className="py-2 flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-navy-900 text-sm">{l.kind === "ticket" ? `${l.qty} × ${l.label}` : l.label}</div>
                            <div className="text-[11.5px] text-slate-500">{l.kind === "ticket" ? `€${l.unit} each` : `Today’s price €${l.unit}`}</div>
                            {l.setId && <HoldChip ms={holdLeft(l.setId)} />}
                          </div>
                          <span className="tnum font-semibold text-sm">{eur(lineGross(l))}</span>
                          <RemoveBtn label={`Remove ${l.label}`} onClick={() => removeLines([l.id])} />
                        </li>
                      ))}
                      {discounts.map((d) => (
                        <li key={d.id} className="py-2 flex items-start gap-2 text-emerald-700">
                          <div className="min-w-0 flex-1 text-sm"><div className="font-semibold">{d.label}</div><div className="text-[11.5px] text-emerald-700/80">{d.reason}{d.approver ? ` · approved by ${d.approver}` : ""}</div></div>
                          <span className="tnum font-semibold text-sm">−{eur(discountAmount(d, lines))}</span>
                          {d.reason !== "Bundle" && <RemoveBtn label={`Remove ${d.label}`} onClick={() => setDiscounts((ds) => ds.filter((x) => x.id !== d.id))} />}
                        </li>
                      ))}
                    </ul>
                  )}

                  {lines.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <form className="flex gap-2 items-start" onSubmit={(e) => { e.preventDefault(); if (promo.trim()) applyPromo(); }}>
                        <div className="flex-1">
                          <Input aria-label="Promo code" placeholder="Promo code" value={promo} onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoErr(""); }} aria-invalid={!!promoErr} />
                        </div>
                        <Btn type="submit" variant="outline" disabled={!promo.trim()}>Apply</Btn>
                        <Btn variant="ghost" icon={Icon.tag} onClick={() => setDiscOpen(true)}>Discount</Btn>
                      </form>
                      {promoErr && <div role="alert" className="text-[12px] text-rose-700">{promoErr}</div>}
                      <CustomerAttach open={custOpen} setOpen={setCustOpen} customer={customer} setCustomer={setCustomer} needed={hasSets} />
                    </div>
                  )}

                  <div className="mt-3 border-t border-slate-200 pt-3 space-y-0.5 text-[13px]">
                    {totals.discount > 0 && <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tnum">{eur(totals.gross)}</span></div>}
                    {totals.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discounts</span><span className="tnum">−{eur(totals.discount)}</span></div>}
                    <div className="flex items-end justify-between pt-1">
                      <span className="text-slate-600">Total <span className="text-[11px] text-slate-400">incl. VAT {eur(totals.vat)}</span></span>
                      <span className="font-display text-3xl font-bold text-navy-900 tnum" aria-live="polite">{eur(totals.total)}</span>
                    </div>
                  </div>
                  {err && <div role="alert" className="mt-2 rounded-lg bg-rose-50 text-rose-800 ring-1 ring-rose-600/20 px-3 py-2 text-[12.5px]">{err}</div>}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Btn variant="teal" size="lg" icon={Icon.card} disabled={!lines.length} onClick={() => startPay("card")}>Card</Btn>
                    <Btn variant="primary" size="lg" icon={Icon.cash} disabled={!lines.length} onClick={() => startPay("cash")}>Cash</Btn>
                    <Btn variant="outline" className="col-span-2" icon={Icon.layers} disabled={!lines.length} onClick={() => startPay("voucher")}>Split / voucher</Btn>
                  </div>
                </>
              )}
            </Card>
            {last && !done && (
              <div className="rounded-xl bg-white/70 ring-1 ring-slate-200 px-3 py-2 flex items-center gap-2 text-[12.5px]">
                <Icon.receipt size={14} className="text-slate-500" />
                <span className="flex-1 min-w-0 truncate">Last sale <b className="text-navy-900">{last.sale.id}</b> · {eur(last.sale.total)}</span>
                <Btn size="sm" variant="ghost" icon={Icon.print} onClick={() => { t.reprint(last.sale.id); setReprint(last.sale); }}>Reprint</Btn>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phones / small tablets: the basket sits below the catalogue, so keep the total and a jump to it in reach. */}
      {shiftOpen && !done && lines.length > 0 && !basketInView && (
        <StickyActionBar>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><div className="text-[11.5px] text-slate-500">{lines.reduce((a, l) => a + l.qty, 0)} item{lines.reduce((a, l) => a + l.qty, 0) === 1 ? "" : "s"} in basket</div><div className="font-display text-xl font-bold text-navy-900 tnum">{eur(totals.total)}</div></div>
            <Btn variant="teal" icon={Icon.card} onClick={() => document.getElementById("till-basket")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Pay</Btn>
          </div>
        </StickyActionBar>
      )}
      {tender && (
        <TenderModal total={totals.total} initial={tender} offline={t.till.offline} offlineSales={t.till.sales} vouchers={t.till.vouchers} onCancel={onCancelTender} onPaid={onPaid} />
      )}
      {reprint && <ReceiptModal sale={reprint} copy onClose={() => setReprint(null)} />}
      {pin && <ManagerPinModal reason={pin.reason} onClose={() => setPin(null)} onApproved={(m) => { const p = pin; setPin(null); p.then(m); }} />}
      {discOpen && (
        <DiscountModal lines={lines} onClose={() => setDiscOpen(false)}
          onPreset={(d) => { addDiscount(d); setDiscOpen(false); }}
          onOpen={(d) => { setDiscOpen(false); setPin({ reason: `Open discount of ${d.kind === "pct" ? `${d.value}%` : eur(d.value)} on this basket needs a manager.`, then: (m) => { addDiscount({ ...d, approver: m }); toast(`Discount approved by ${m}.`, { tone: "success" }); } }); }} />
      )}
    </div>
  );
}

function HoldChip({ ms }: { ms: number }) {
  return ms > 0 ? (
    <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-amber-700"><Icon.clock size={11} /> Held for this till · {mmss(ms)}</span>
  ) : (
    <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-rose-700"><Icon.alert size={11} /> Hold expired — re-held when you pay if still free</span>
  );
}

function RemoveBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="w-9 h-9 -my-1 rounded-lg grid place-items-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 shrink-0">
      <Icon.x size={15} />
    </button>
  );
}

/* Optional guest attach for sunbed sales: find an existing guest or capture a
   walk-in's name + phone. No marketing consent is recorded here. */
function CustomerAttach({ open, setOpen, customer, setCustomer, needed }: { open: boolean; setOpen: (v: boolean) => void; customer: TillSale["customer"]; setCustomer: (c: TillSale["customer"]) => void; needed: boolean }) {
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const qq = q.trim().toLowerCase();
  const hits = qq.length >= 2 ? CUSTOMERS.filter((c) => `${c.first} ${c.last} ${c.email} ${c.phone.replace(/\s/g, "")}`.toLowerCase().includes(qq.replace(/\s/g, ""))).slice(0, 4) : [];
  if (customer)
    return (
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-[12.5px]">
        <Icon.users size={14} className="text-slate-500" />
        <span className="flex-1 min-w-0 truncate"><b className="text-navy-900">{customer.name}</b> · {customer.phone}</span>
        <button type="button" className="text-slate-500 hover:text-rose-600 font-semibold" onClick={() => setCustomer(undefined)}>Remove</button>
      </div>
    );
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[12.5px] font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1">
        <Icon.plus size={13} /> Attach customer {needed ? "(optional, for the sunbed booking)" : "(optional)"}
      </button>
    );
  return (
    <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 p-3 space-y-2">
      <Field label="Find a guest (name, phone or e-mail)"><Input value={q} onChange={(e) => setQ(e.target.value)} /></Field>
      {hits.length > 0 && (
        <ul className="space-y-1">
          {hits.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => { setCustomer({ name: `${c.first} ${c.last}`, phone: c.phone, guestId: c.id }); setOpen(false); }} className="w-full text-left rounded-lg px-2.5 py-1.5 hover:bg-slate-50 text-[12.5px]">
                <b className="text-navy-900">{c.first} {c.last}</b> <span className="text-slate-500">· {c.phone} · {c.bookings} visits</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {qq.length >= 2 && hits.length === 0 && <div className="text-[12px] text-slate-500">No guest found — add them as a walk-in below.</div>}
      <form className="grid grid-cols-2 gap-2 items-end" onSubmit={(e) => { e.preventDefault(); if (name.trim() && phone.trim()) { setCustomer({ name: name.trim(), phone: phone.trim() }); setOpen(false); } }}>
        <Field label="Walk-in name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Mobile"><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Btn type="submit" size="sm" variant="outline" disabled={!name.trim() || !phone.trim()}>Attach</Btn>
        <Btn size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
      </form>
    </div>
  );
}

/* Preset discounts with a reason; an open amount needs a manager PIN. */
function DiscountModal({ lines, onClose, onPreset, onOpen }: { lines: TillLine[]; onClose: () => void; onPreset: (d: Omit<TillDiscount, "id">) => void; onOpen: (d: Omit<TillDiscount, "id">) => void }) {
  const [kind, setKind] = useState<"pct" | "abs">("pct");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const sets = lines.filter((l) => l.kind === "sunbed");
  return (
    <Modal open onClose={onClose} title="Apply a discount" footer={<Btn variant="ghost" onClick={onClose}>Cancel</Btn>}>
      <div className="space-y-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Preset</div>
          <div className="grid sm:grid-cols-3 gap-2">
            {DISCOUNT_PRESETS.map((p) => {
              const lineOnly = p.id === "late";
              const disabled = lineOnly && sets.length === 0;
              return (
                <button key={p.id} type="button" disabled={disabled}
                  onClick={() => (lineOnly ? sets.forEach((s) => onPreset({ label: `${p.label} −${p.value}% · ${s.setId}`, reason: p.reason, kind: p.kind, value: p.value, lineId: s.id })) : onPreset({ label: `${p.label} −${p.value}%`, reason: p.reason, kind: p.kind, value: p.value }))}
                  className="min-h-[56px] rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2 text-left hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                  <span className="block font-semibold text-navy-900 text-sm">{p.label} −{p.value}%</span>
                  <span className="block text-[11.5px] text-slate-500">{lineOnly ? "Sunbed sets only" : "Whole basket"} · {p.reason}</span>
                </button>
              );
            })}
          </div>
        </div>
        <form className="rounded-xl ring-1 ring-slate-200 p-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (Number(value) > 0 && reason.trim()) onOpen({ label: `Manual discount ${kind === "pct" ? `−${value}%` : `−€${value}`}`, reason: reason.trim(), kind, value: Number(value) }); }}>
          <div className="font-semibold text-navy-900 text-sm flex items-center gap-1.5"><Icon.lock size={13} /> Open amount <span className="text-[11.5px] font-normal text-slate-500">· needs a manager PIN</span></div>
          <div className="grid grid-cols-[auto_1fr] gap-2 items-end">
            <div role="radiogroup" aria-label="Discount type" className="flex rounded-xl ring-1 ring-slate-200 overflow-hidden h-[44px]">
              {(["pct", "abs"] as const).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`px-3 text-sm font-semibold ${kind === k ? "bg-navy-900 text-white" : "bg-white text-navy-900"}`}>{k === "pct" ? "%" : "€"}</button>
              ))}
            </div>
            <Field label="Amount"><Input type="number" inputMode="decimal" min={0} value={value} onChange={(e) => setValue(e.target.value)} /></Field>
          </div>
          <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Service recovery" /></Field>
          <Btn type="submit" variant="outline" icon={Icon.lock} disabled={!(Number(value) > 0) || !reason.trim()}>Ask for approval</Btn>
        </form>
      </div>
    </Modal>
  );
}
