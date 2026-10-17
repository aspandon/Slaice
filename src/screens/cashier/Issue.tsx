import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ZoneChips } from "../../components/ZoneChips";
import { Icon, type IconRenderer } from "../../lib/icons";
import { ActionsMenu, Btn, Card, EmptyState, Field, Input, Modal, StickyActionBar, Stepper } from "../../components/ui";
import { SunbedMap, StaffSet } from "../../components/SunbedMap";
import { SetScanner, type ScanHit } from "../../components/SetScanner";
import { useApp } from "../../app/store";
import { ZONES } from "../../data/beach";
import { CUSTOMERS } from "../../data/mock";
import { BUNDLES, DISCOUNT_PRESETS, PARKING_LOT, PROMO_CODES, QUICK_KEYS, parkingSold, type Bundle, type QuickKey } from "../../data/till";
import { PARKING_PRICE } from "../../domain/pricing";
import { resolvePrice } from "../../domain/pricing";
import { useExtras } from "../../lib/useExtras";
import { useSiteStatus } from "../../lib/usePlatform";
import { basketTotals, discountAmount, eur, lineGross, validatePromo, type Tender, type TenderKind, type TillDiscount, type TillLine, type TillSale, vatBreakdown } from "../../domain/till";
import type { SunbedSlot, TicketCategory } from "../../domain/types";
import { useClosure, useLiveSlots, useNow } from "../../lib/useLiveSlots";
import { useFinance } from "../../lib/useFinance";
import { useTill } from "./useTill";
import { ChargeButton, ManagerPinModal, ReceiptModal, SaleDone } from "./TillParts";
import { TenderModal } from "./Tender";
import { openDisplay } from "../../domain/display";
import { OpenShiftCard, TillStatus } from "./TillStatus";
import { useTenantFeatures } from "../../lib/useFeatures";

/* ============ ISSUE TICKET — the till (AENR-497) ============
   One basket for entry tickets, sunbed sets in the zone the walk-in chooses,
   and bundles. Quick keys put the common sale one tap away; sets in the basket
   are held for this till (On hold everywhere else) until paid or released.
   Payment: card / cash / voucher, split as needed. Every sale → ΑΠΥ to myDATA. */

type Pin = { reason: string; then: (manager: string) => void };
type ProductTab = "quick" | "tickets" | "sunbeds" | "lockers" | "parking";
const PRODUCT_TABS: { id: ProductTab; label: string; icon: IconRenderer }[] = [
  { id: "quick", label: "Quick", icon: Icon.bolt },
  { id: "tickets", label: "Tickets", icon: Icon.ticket },
  { id: "sunbeds", label: "Sunbeds", icon: Icon.umbrella },
  { id: "lockers", label: "Lockers", icon: Icon.lock },
  { id: "parking", label: "Parking", icon: Icon.car },
];
const ZONE_NAMES = Object.fromEntries(ZONES.map((z) => [z.id, z.name]));
let uidN = 0;
const uid = (p: string) => `${p}${++uidN}`;
const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

/* The till, unless Slaice blocked cashier sales for this tenant (AENR-518). */
export function CashierIssue() {
  const site = useSiteStatus();
  if (site.blockCashier)
    return (
      <Card className="p-6 max-w-lg">
        <div role="alert" className="flex items-start gap-3"><Icon.lock size={20} className="text-rose-600 shrink-0" /><div><div className="font-semibold text-navy-900">Sales are paused for {site.tenant?.name}</div><p className="text-[13px] text-slate-600">Slaice suspended this account ({site.tenant?.suspension?.category}). Tickets already sold still validate at the gate. Contact the manager.</p></div></div>
      </Card>
    );
  return <IssueInner />;
}

function IssueInner() {
  const { toast, go, persona, priceRules, beachPricing } = useApp();
  const ex = useExtras();
  const closure = useClosure();
  const [finance] = useFinance();
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
  const [scanOpen, setScanOpen] = useState(false);
  const [tabPick, setTab] = useState<ProductTab>("quick");
  // The Sell tabs the tenant switched on (AENR-721), each also needing its module (AENR-696).
  const { feature } = useTenantFeatures();
  const tabs = PRODUCT_TABS.filter((x) => feature(`till.${x.id}`));
  const tab: ProductTab | undefined = tabs.some((x) => x.id === tabPick) ? tabPick : tabs[0]?.id;
  const canTickets = feature("till.tickets");
  const canSets = feature("till.sunbeds");
  const quickKeys = QUICK_KEYS.filter((q) => (canTickets || !Object.values(q.tickets).some((n) => (n ?? 0) > 0)) && (canSets || !q.sets));
  const bundles = canTickets && canSets ? BUNDLES : [];

  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  const priceOf = (s: SunbedSlot, zId = zone.id) => resolvePrice(s, zId, t.day, beachPricing, priceRules).price;
  const inBasket = useMemo(() => new Set(lines.filter((l) => l.setId).map((l) => l.setId as string)), [lines]);
  const zoneSlots = (zId: string) => liveSlots(ZONES.find((z) => z.id === zId)!, [t.day]);
  const slots = zoneSlots(zone.id);
  const freeIn = (zId: string) => zoneSlots(zId).filter((s) => s.state === "a" && !inBasket.has(s.id));
  const totals = basketTotals(lines, discounts);
  const hasSets = inBasket.size > 0;

  const shiftOpen = !!t.till.shift;
  // Tablet and up: catalogue and basket fill the screen below the till status,
  // so a whole sale needs no page scroll (AENR-584). Phones keep the page flow.
  const gridRef = useRef<HTMLDivElement>(null);
  const [fitH, setFitH] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const fit = () => {
      if (!mq.matches) return setFitH(null);
      const r = el.getBoundingClientRect();
      // The site footer and the page's bottom padding stay on screen too.
      const foot = document.querySelector("body footer");
      const fr = foot?.getBoundingClientRect();
      const below = fr ? document.documentElement.scrollHeight - (fr.top + window.scrollY) + 24 : 40;
      setFitH(Math.max(460, Math.floor(window.innerHeight - (r.top + window.scrollY) - below)));
    };
    fit();
    window.addEventListener("resize", fit);
    mq.addEventListener("change", fit);
    return () => { window.removeEventListener("resize", fit); mq.removeEventListener("change", fit); };
  }, [shiftOpen, t.till.offline]);
  // The phone pay bar hides once the basket itself is on screen.
  const [basketInView, setBasketInView] = useState(false);
  useEffect(() => {
    const el = document.getElementById("till-basket");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setBasketInView(e.intersectionRatio >= 0.6), { threshold: [0, 0.6, 1] });
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
    const line: TillLine = { id, kind: "ticket", label: ex.ticketLabel(cat), qty, unit: ex.ticketPrice(cat, t.day), cat };
    return ls.some((l) => l.id === id) ? ls.map((l) => (l.id === id ? line : l)) : [...ls, line];
  }); };
  const ticketQty = (cat: TicketCategory) => lines.find((l) => l.id === `t-${cat}`)?.qty ?? 0;
  // Lockers: one line per bank; codes continue after the lockers already rented today.
  const lockerQty = (bank: string) => lines.find((l) => l.id === `l-${bank}`)?.qty ?? 0;
  const setLockerQty = (bank: string, qty: number) => { fresh(); setLines((ls) => {
    const id = `l-${bank}`;
    const rest = ls.filter((l) => l.id !== id);
    if (qty <= 0) return rest;
    const b = ex.banks.find((x) => x.id === bank);
    const from = (b?.total ?? 0) - (ex.lockerAvail(bank, t.day) ?? 0); // next free number after the rented ones
    const line: TillLine = { id, kind: "locker", label: `Locker · ${b?.name ?? bank}`, qty, unit: ex.lockerPrice(bank, t.day), bank, codes: Array.from({ length: qty }, (_, i) => `${bank}-${String(from + i + 1).padStart(2, "0")}`) };
    return ls.some((l) => l.id === id) ? ls.map((l) => (l.id === id ? line : l)) : [...ls, line];
  }); };
  const setLine = (s: SunbedSlot, zId: string, bundle?: string): TillLine => ({ id: uid("s-"), kind: "sunbed", label: `Sunbed set ${s.id} · ${ZONE_NAMES[zId]}`, qty: 1, unit: priceOf(s, zId), zoneId: zId, setId: s.id, bundle });
  /** Best available = front row first, then cheapest. */
  const bestFree = (n: number) => [...freeIn(zone.id)].sort((a, b) => a.y - b.y || a.price - b.price).slice(0, n);
  const addSets = (picked: SunbedSlot[], bundle?: string, zId = zone.id) => {
    setLines((ls) => [...ls, ...picked.map((s) => setLine(s, zId, bundle))]);
    t.hold(picked.map((s) => s.id));
  };
  // Scanning the QR label on a set (AENR-499) jumps to its zone and adds it.
  const onScan = (h: ScanHit) => {
    if (h.kind === "booking") return setErr(`${h.code} is a booking QR — redeem it at the gate, not as a sale.`);
    setScanOpen(false);
    fresh();
    setErr("");
    setZoneId(h.zoneId);
    setTab("sunbeds");
    const s = zoneSlots(h.zoneId).find((x) => x.id === h.setId);
    if (!s || inBasket.has(h.setId)) return;
    if (s.state !== "a") return setErr(`${h.setId} can't be sold now — ${s.inv ?? (s.state === "h" ? "on hold" : "already booked or out of service")}.`);
    addSets([s], undefined, h.zoneId);
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
  // Parking (AENR-584): one line, spot codes continue after today's sold spots.
  const parkingQty = lines.find((l) => l.id === "p-day")?.qty ?? 0;
  const parkingTaken = PARKING_LOT.bookedOnline + parkingSold(t.till.sales, t.day);
  const parkingFree = Math.max(0, PARKING_LOT.spots - parkingTaken - parkingQty);
  const setParkingQty = (qty: number) => { fresh(); setLines((ls) => {
    const rest = ls.filter((l) => l.id !== "p-day");
    if (qty <= 0) return rest;
    const line: TillLine = { id: "p-day", kind: "parking", label: "Parking · day spot", qty, unit: PARKING_PRICE, codes: Array.from({ length: qty }, (_, i) => `P${String(parkingTaken + i + 1).padStart(2, "0")}`) };
    return ls.some((l) => l.id === "p-day") ? ls.map((l) => (l.id === "p-day" ? line : l)) : [...ls, line];
  }); };
  // Arrow keys / Home / End move between product tabs (WAI-ARIA tabs pattern).
  const tabKeys = (e: KeyboardEvent) => {
    const i = tabs.findIndex((x) => x.id === tab);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (next === null || !tabs.length) return;
    e.preventDefault();
    const id = tabs[(next + tabs.length) % tabs.length].id;
    setTab(id);
    document.getElementById(`till-tab-${id}`)?.focus();
  };
  const tabCount = (id: ProductTab) =>
    id === "tickets" ? lines.filter((l) => l.kind === "ticket").reduce((a, l) => a + l.qty, 0)
    : id === "sunbeds" ? inBasket.size
    : id === "lockers" ? lines.filter((l) => l.kind === "locker").reduce((a, l) => a + l.qty, 0)
    : id === "parking" ? parkingQty
    : 0;
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
  // What a quick key costs now — tickets at today's price, sets at the best free set in this zone.
  const quickPrice = (q: QuickKey) =>
    Object.entries(q.tickets).reduce((a, [c, n]) => a + (n ?? 0) * ex.ticketPrice(c, t.day), 0) +
    (q.sets ? bestFree(q.sets).reduce((a, s) => a + priceOf(s, zone.id), 0) : 0);
  /* Repeat last sale (AENR-606): the previous basket again — same tickets, lockers and
     parking; sunbeds as the best free sets in the same zones (the old ones are sold). */
  const lastSale = t.till.sales.find((x) => x.shiftId === t.till.shift?.id && x.cashier === t.cashier && x.lines.length);
  const repeatLast = () => {
    if (!lastSale) return;
    fresh();
    setErr("");
    lastSale.lines.forEach((l) => {
      // Only what the till still sells (AENR-721).
      if (l.kind === "ticket" && l.cat && canTickets) setTicketQty(l.cat, ticketQty(l.cat) + l.qty);
      else if (l.kind === "locker" && l.bank && feature("till.lockers")) setLockerQty(l.bank, lockerQty(l.bank) + l.qty);
      else if (l.kind === "parking" && feature("till.parking")) setParkingQty(parkingQty + l.qty);
    });
    const byZone = lastSale.lines.filter((l) => canSets && l.kind === "sunbed" && l.zoneId).reduce<Record<string, number>>((m, l) => ({ ...m, [l.zoneId as string]: (m[l.zoneId as string] ?? 0) + l.qty }), {});
    const short: string[] = [];
    Object.entries(byZone).forEach(([zId, n]) => {
      const picked = [...freeIn(zId)].sort((a, b) => a.y - b.y || a.price - b.price).slice(0, n);
      if (picked.length < n) short.push(`${n - picked.length} in ${ZONE_NAMES[zId]}`);
      if (picked.length) addSets(picked, undefined, zId);
    });
    if (short.length) setErr(`Not enough free sets to repeat it all — missing ${short.join(", ")}.`);
  };
  const quick = (q: QuickKey) => {
    setErr("");
    Object.entries(q.tickets).forEach(([c, n]) => setTicketQty(c as TicketCategory, ticketQty(c as TicketCategory) + (n ?? 0)));
    if (q.sets) anyFree(q.sets);
  };
  const addBundle = (b: Bundle) => {
    fresh();
    setErr("");
    if (closure(zone.id, t.day)) return setErr(`${zone.name} is closed — choose another zone first.`);
    const picked = bestFree(b.sets);
    if (picked.length < b.sets) return setErr(`${b.label} needs ${b.sets} free sets in ${zone.name}.`);
    const tag = `${b.label} #${lines.filter((l) => l.bundle).length + 1}`;
    const tix: TillLine[] = Object.entries(b.tickets).map(([c, n]) => ({ id: uid(`b-${c}-`), kind: "ticket", label: ex.ticketLabel(c), qty: n ?? 0, unit: ex.ticketPrice(c, t.day), cat: c as TicketCategory, bundle: tag }));
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
    // Charge opens on the tender that took the most this time (AENR-606).
    const main = [...tenders].sort((a, b) => b.amount - a.amount)[0];
    if (main) t.rememberTender(main.kind);
    lines.forEach((l) => { if (l.kind === "locker" && l.bank) ex.recordLockers(l.bank, t.day, l.qty); });
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
    <div className="animate-fade-up pb-24 lg:pb-0">
      {/* Shift strip and the few extras share one row: the till keeps its space for selling (AENR-654). */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1"><TillStatus /></div>
        <ActionsMenu label="More till actions" actions={[{ id: "tx", label: "Today’s transactions", icon: Icon.list, onSelect: () => go(persona, "transactions") }, { id: "display", label: "Open live display", icon: Icon.monitor, onSelect: openDisplay }]} />
      </div>
      {!shiftOpen ? (
        <OpenShiftCard />
      ) : (
        <div ref={gridRef} className="grid md:grid-cols-[minmax(0,1fr)_288px] xl:grid-cols-[minmax(0,1fr)_380px] gap-4 xl:gap-5 items-start">
          {/* Catalogue: product tabs, one panel at a time (AENR-584) — on a
              tablet the whole sale fits the screen; only a panel scrolls. */}
          <div className="min-w-0 flex flex-col gap-3" style={fitH ? { height: fitH } : undefined}>
            {tabs.length > 1 && (
            <div role="tablist" aria-label="Products" aria-orientation="horizontal" className="shrink-0 grid gap-1 rounded-2xl glass-card p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
              {tabs.map((x) => {
                const n = tabCount(x.id);
                const on = tab === x.id;
                const I = x.icon;
                return (
                  <button key={x.id} id={`till-tab-${x.id}`} type="button" role="tab" aria-selected={on} aria-controls="till-panel" tabIndex={on ? 0 : -1} onClick={() => setTab(x.id)} onKeyDown={tabKeys}
                    className={`relative min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-0.5 px-1 text-[12.5px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${on ? "bg-navy-900 text-white shadow-btn-primary" : "text-slate-600 hover:bg-white/80 hover:text-navy-900"}`}>
                    <I size={18} />
                    <span className="truncate max-w-full">{x.label}</span>
                    {n > 0 && <span className={`absolute top-1 left-1/2 ml-2.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] leading-[18px] tnum ${on ? "bg-teal-400 text-navy-900" : "bg-teal-600 text-white"}`} aria-label={`${n} in basket`}>{n}</span>}
                  </button>
                );
              })}
            </div>
            )}

            <div id="till-panel" role={tabs.length > 1 ? "tabpanel" : undefined} aria-labelledby={tabs.length > 1 ? `till-tab-${tab}` : undefined} className="glass-card surface-raised rounded-3xl p-4 flex-1 min-h-0 overflow-y-auto">
              {!tab && <EmptyState compact icon={Icon.ticket} title="Nothing to sell here" body="Every product on the till is switched off for this beach. Slaice sets them in Platform › Tenants › Features." />}
              {tab === "quick" && (
                <>
                  {quickKeys.length > 0 && <h2 className="font-display font-bold text-navy-900 mb-2">Quick keys</h2>}
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                    {quickKeys.map((q) => (
                      <button key={q.id} type="button" onClick={() => quick(q)}
                        className="min-h-[56px] rounded-xl bg-navy-900 text-white px-4 py-1.5 font-semibold text-sm shadow-sm hover:bg-navy-800 active:scale-[.97] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2">
                        <span className="block">{q.label}</span>
                        <span className="block text-[12px] font-medium text-white/70 tnum">{q.sets ? "from " : ""}{eur(quickPrice(q))}</span>
                      </button>
                    ))}
                  </div>
                  {lastSale && (
                    <button type="button" onClick={repeatLast}
                      className="mt-2 w-full min-h-[48px] rounded-xl ring-1 ring-slate-200 bg-white/80 px-4 flex items-center gap-2 text-left text-sm hover:ring-teal-400 active:scale-[.99] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                      <Icon.refund size={16} className="text-teal-700 shrink-0" />
                      <span className="flex-1 min-w-0"><b className="text-navy-900">Repeat last sale</b> <span className="text-slate-600">· {lastSale.lines.map((l) => `${l.qty}× ${l.kind === "sunbed" ? "set" : l.label}`).join(", ")}</span></span>
                      <span className="font-semibold text-navy-900 tnum">{eur(lastSale.total)}</span>
                    </button>
                  )}
                  {bundles.length > 0 && <>
                  <h2 className="font-display font-bold text-navy-900 mt-4 mb-2">Bundles · {zone.name}</h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                    {bundles.map((b) => (
                      <button key={b.id} type="button" onClick={() => addBundle(b)}
                        className="min-h-[56px] rounded-xl bg-teal-50 text-teal-800 ring-1 ring-teal-600/25 px-4 py-2 text-left text-sm hover:bg-teal-100 active:scale-[.97] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                        <span className="font-semibold">{b.label}</span>
                        <span className="block text-[11.5px] text-teal-700/90">{Object.entries(b.tickets).map(([c, n]) => `${n} ${ex.ticketLabel(c)}`).join(" + ")} + {b.sets} set{b.sets > 1 ? "s" : ""} · save €{b.saving}</span>
                      </button>
                    ))}
                  </div>
                  </>}
                  {canSets && <p className="mt-3 text-[12px] text-slate-500">Sets go in the zone picked under <button type="button" className="font-semibold text-teal-700 hover:underline" onClick={() => setTab("sunbeds")}>Sunbeds</button> (now {zone.name}).</p>}
                </>
              )}

              {tab === "tickets" && (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 mb-2">
                    <h2 className="font-display font-bold text-navy-900">Entry tickets</h2>
                    <span className="text-[12px] text-slate-500">Anonymous · skip for a sunbed-only sale</span>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2">
                    {ex.tickets.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-navy-900 text-sm" title={c.note}>{c.short}</div>
                          <div className="text-[12px] text-slate-600">{ex.ticketPrice(c.id, t.day) === 0 ? "Free" : `€${ex.ticketPrice(c.id, t.day)} each`}{c.note ? <span className="block text-[11px] text-slate-500">{c.note}</span> : null}</div>
                        </div>
                        <Stepper size="lg" label={`${c.short} tickets`} value={ticketQty(c.id)} onChange={(v) => setTicketQty(c.id, v)} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {tab === "sunbeds" && (
                <>
                  <ZoneChips disableOff value={zone.id} onChange={(id) => { setZoneId(id); setErr(""); }}
                    info={(id) => {
                      const closed = closure(id, t.day);
                      const free = freeIn(id);
                      const from = free.length ? Math.min(...free.map((s) => priceOf(s, id))) : null;
                      return { off: !!closed || free.length === 0, sub: closed ? "Closed" : free.length === 0 ? "Full today" : `${free.length} free · €${from}+` };
                    }} />
                  <div className="flex flex-wrap items-center gap-2 justify-between my-2">
                    <h2 className="font-display font-bold text-navy-900">Sunbeds · {zone.name}</h2>
                    <div className="flex gap-2">
                      <Btn size="sm" variant="outline" icon={Icon.qr} onClick={() => setScanOpen(true)}>Scan set QR</Btn>
                      <Btn size="sm" variant="outline" icon={Icon.sparkles} disabled={!!closure(zone.id, t.day)} onClick={() => anyFree(1)}>Any free set</Btn>
                    </div>
                  </div>
                  {t.till.offline && (
                    <div className="mb-2 rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-600/20 px-3 py-1.5 text-[12px] flex items-center gap-1.5"><Icon.alert size={13} /> Offline — this is the cached map; availability may be out of date. Conflicts are flagged when the till reconnects.</div>
                  )}
                  {closure(zone.id, t.day) ? (
                    <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-6 text-center text-sm text-slate-600">{zone.name}: {closure(zone.id, t.day)}. Choose another zone.</div>
                  ) : (
                    <>
                      <SunbedMap staff label={`${zone.name} sunbed map`} slots={slots} selected={inBasket} onToggle={toggleSet} priceOf={(s) => priceOf(s)} />
                      <div className="mt-2 flex flex-wrap gap-3 text-[11.5px] text-slate-600">
                        <span className="flex items-center gap-1"><StaffSet state="a" size={16} /> Free</span>
                        <span className="flex items-center gap-1"><StaffSet state="h" size={16} /> On hold</span>
                        <span className="flex items-center gap-1"><StaffSet state="u" size={16} /> Booked / blocked</span>
                        <span className="flex items-center gap-1"><StaffSet state="a" sel size={16} /> In this basket</span>
                      </div>
                    </>
                  )}
                </>
              )}

              {tab === "lockers" && (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 mb-2">
                    <h2 className="font-display font-bold text-navy-900">Lockers</h2>
                    <span className="text-[12px] text-slate-500">Locker-only sales are fine</span>
                  </div>
                  {ex.banks.length > 0 && ex.banks.every((b) => ex.lockerAvail(b.id, t.day) === null) ? (
                    <div role="status" className="rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-600/20 px-3 py-2 text-[12.5px] flex items-center gap-1.5"><Icon.alert size={13} /> Locker provider offline — locker sales are paused.</div>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2">
                      {ex.banks.map((b) => {
                        const avail = ex.lockerAvail(b.id, t.day) ?? 0;
                        const q = lockerQty(b.id);
                        return (
                          <div key={b.id} className={`flex items-center justify-between gap-2 rounded-xl ring-1 px-3 py-2 ${avail === 0 && q === 0 ? "ring-slate-200 bg-slate-50 opacity-70" : "ring-slate-200 bg-white/70"}`}>
                            <div className="min-w-0">
                              <div className="font-semibold text-navy-900 text-sm">{b.name}</div>
                              <div className="text-[12px] text-slate-600">€{ex.lockerPrice(b.id, t.day)} · {b.size} · <span className={avail === 0 ? "text-rose-700 font-semibold" : ""}>{avail === 0 ? "none free" : `${avail} free`}</span></div>
                            </div>
                            <Stepper size="lg" label={`${b.name} lockers`} value={q} onChange={(v) => setLockerQty(b.id, Math.min(v, avail))} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {tab === "parking" && (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 mb-2">
                    <h2 className="font-display font-bold text-navy-900">Parking</h2>
                    <span className="text-[12px] text-slate-500">Day spot · the code is printed on the receipt</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2 max-w-md">
                    <div className="min-w-0">
                      <div className="font-semibold text-navy-900 text-sm">Car park · day spot</div>
                      <div className="text-[12px] text-slate-600">€{PARKING_PRICE} · <span className={parkingFree === 0 ? "text-rose-700 font-semibold" : ""}>{parkingFree === 0 ? "car park full" : `${parkingFree} of ${PARKING_LOT.spots} free`}</span></div>
                    </div>
                    <Stepper size="lg" label="parking spots" value={parkingQty} onChange={(v) => setParkingQty(Math.min(v, parkingQty + parkingFree))} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Basket */}
          <div id="till-basket" className="flex flex-col gap-3 scroll-mt-4" style={fitH ? { height: fitH } : undefined}>
            <Card surface="raised" className="p-4 flex flex-col min-h-0 flex-1 overflow-y-auto">
              {done ? (
                <SaleDone sale={done} onNew={newSale}
                  onDeliver={(c, to) => { t.setDelivery(done.id, c); toast(c === "email" ? (t.till.offline ? `Offline — receipt e-mail to ${to} queued, sent on reconnect.` : `Demo — receipt e-mailed to ${to}.`) : c === "sms" ? (t.till.offline ? `Offline — receipt SMS to ${to} queued, sent on reconnect.` : `Demo — receipt link sent by SMS to ${to}.`) : c === "print" ? "Demo — printed on the receipt printer (ESC/POS)." : c === "qr" ? "Receipt QR shown — the customer scans it." : "No receipt — the ΑΠΥ is still recorded.", { tone: "success" }); }} />
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
                    <ul className="divide-y divide-slate-100 md:flex-1 md:min-h-[72px] md:overflow-y-auto -mx-1 px-1">
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
                            <div className="font-semibold text-navy-900 text-sm">{l.kind !== "sunbed" ? `${l.qty} × ${l.label}` : l.label}</div>
                            <div className="text-[11.5px] text-slate-500">{l.kind !== "sunbed" ? `€${l.unit} each${l.codes?.length ? ` · ${l.codes.join(", ")}` : ""}` : `Today’s price €${l.unit}`}</div>
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
                      <form className="flex flex-wrap gap-2 items-start" onSubmit={(e) => { e.preventDefault(); if (promo.trim()) applyPromo(); }}>
                        <div className="flex-1 min-w-[150px]">
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
                    {lines.length > 0 && <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tnum">{eur(totals.gross)}</span></div>}
                    {totals.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discounts</span><span className="tnum">−{eur(totals.discount)}</span></div>}
                    {lines.length > 0 && vatBreakdown(lines, totals.discount).map((r) => (
                      <div key={r.rate} className="flex justify-between text-[12px] text-slate-500"><span>Net {eur(r.net)} + VAT {Math.round(r.rate * 100)}%</span><span className="tnum">{eur(r.vat)}</span></div>
                    ))}
                    <div className="flex items-end justify-between pt-1">
                      <span className="text-slate-600">Total <span className="text-[11px] text-slate-400">incl. VAT {eur(totals.vat)}</span></span>
                      <span className="font-display text-3xl font-bold text-navy-900 tnum" aria-live="polite">{eur(totals.total)}</span>
                    </div>
                  </div>
                  {err && <div role="alert" className="mt-2 rounded-lg bg-rose-50 text-rose-800 ring-1 ring-rose-600/20 px-3 py-2 text-[12.5px]">{err}</div>}
                  {/* One Charge button (AENR-606): it opens on the tender used last; card, cash, voucher or split are chosen there. */}
                  {lines.length > 0 && (
                    <div className="mt-3">
                      <ChargeButton total={totals.total} last={t.till.lastTender} onCharge={startPay} />
                    </div>
                  )}
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
      {/* Phones: the total and Charge are always in reach (AENR-654); tapping the total jumps to the basket. */}
      {shiftOpen && !done && !basketInView && (
        <StickyActionBar noTabBar>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => document.getElementById("till-basket")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-w-0 flex-1 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              <div className="text-[11.5px] text-slate-500">{lines.length ? `${lines.reduce((a, l) => a + l.qty, 0)} item${lines.reduce((a, l) => a + l.qty, 0) === 1 ? "" : "s"} in basket · view` : "Basket is empty"}</div>
              <div className="font-display text-xl font-bold text-navy-900 tnum">{eur(totals.total)}</div>
            </button>
            <Btn variant="teal" icon={Icon.card} disabled={!lines.length} onClick={() => startPay(t.till.lastTender ?? "card")}>{lines.length ? `Charge ${eur(totals.total)}` : "Charge"}</Btn>
          </div>
        </StickyActionBar>
      )}
      {tender && (
        <TenderModal total={totals.total} initial={tender} offline={t.till.offline} offlineSales={t.till.sales} vouchers={t.till.vouchers} onCancel={onCancelTender} onPaid={onPaid}
          terminals={finance.terminals} terminal={t.till.terminal} onTerminal={t.setTerminal} />
      )}
      <Modal open={scanOpen} onClose={() => setScanOpen(false)} title="Scan a sunbed set" footer={<Btn variant="ghost" onClick={() => setScanOpen(false)}>Close</Btn>}>
        <SetScanner onHit={onScan} />
        {err && <div role="alert" className="mt-2 text-[12.5px] text-rose-700">{err}</div>}
      </Modal>
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
