import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Pager, moneyVal } from "../components/TableTools";
import { Icon } from "../lib/icons";
import { Card, Btn, Badge, PageHead, Table, StatCard, Modal, Field, Input, Select, Tabs, Toggle, EmptyState, FutureBanner, ContextPanel, Spinner, PeriodPicker, DateInput } from "../components/ui";
import type { TabEntry } from "../components/ui";
import { BarChart, HBarChart, LineChartMini, Donut, QR, Sparkline } from "../components/charts";
import { SunbedMark } from "../components/Beach";

import { fileToBackgroundSrc } from "../lib/image";
import { ZONES, zoneLayout, TENANT } from "../data/beach";
import { LOYALTY_REWARDS, BUILTIN_SCHEMES, makeCustomScheme, schemeDefaults } from "../data/loyalty";
import type { LoyaltyScheme, SchemeValues, SchemeField } from "../data/loyalty";
import { BADGE_COLORS, BADGE_COLOR_KEYS, BADGE_ICONS, GAME_METRICS } from "../data/gamification";
import type { Achievement, GameMetric } from "../data/gamification";
import type { SunbedSlot, PassDesign, CardText } from "../domain/types";
import { CardFace, ScaledCard, WalletRendition, TEXT_KEYS, TEXT_LABELS, type DragKey } from "../components/PassDesigner";
import { TOP_CUSTOMERS, REVENUE_TX, REPORTING_TICKETS, personByFirst, CUSTOMERS } from "../data/mock";
import { SendModal, type SendChannel } from "../components/SendModal";
import { useApp } from "../app/store";
import { downloadCSV, downloadCSVReport, downloadPDF, type CsvSection } from "../lib/download";
import { usePeriod } from "../lib/usePeriod";
import { OccupancyTab, occupancyCsv, useOccupancy } from "./reporting/OccupancyTab";
import { ChannelsTab, channelsCsv, useChannels } from "./reporting/ChannelsTab";


import { resolveRange, comparisonRange, lastYearRange, granularityFor, rangeLabel, periodNoun, comparisonLabel, isoFromDayMonth, inRange, fmtWeekday as fmtWeekdayP, DEMO_TODAY } from "../domain/period";
import { summarize, series, buckets, fmtEUR, fmtInt, fmtPct, trendPct, trendPp, trendEUR } from "../data/analytics";
import { Masked } from "./tenant/ViewAs";
import { tillRefunds } from "../data/tillAdmin";
import { useListUrl } from "../lib/useUrlState";
import { refundHistory, refundStats } from "../data/refunds";
import { decidedRefundRows, opsNow, useBookingOps } from "../lib/useBookingOps";
import { slaState } from "../domain/bookingOps";
import { PendingRefund } from "./bookings/BookingDrawer";
import { InvoicesTab, OverviewPanel, PaymentsTab, SectionChips, financeCsv, financePdf, useFinanceData, useSection } from "./reporting/FinanceTabs";
import { financeReport } from "../data/finance";
import { reconcile } from "../domain/reconcile";
import { VARIANCE_TOLERANCE, eur as eurTill, shiftTotals } from "../domain/till";

/** Full euro amount for exports and tables; tiles use the abbreviated fmtEUR. */
const eurFull = (n: number) => `€${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ============ DASHBOARD ============ */
export function AdminDashboard() {
  const { toast, till } = useApp();
  // One period drives every tile, delta, chart and the export (AENR-466).
  const [period, setPeriod] = usePeriod({ kind: "preset", preset: "week", offset: 0 });
  const range = resolveRange(period) ?? resolveRange({ kind: "preset", preset: "week", offset: 0 })!;
  const now = summarize(range);
  const prev = summarize(comparisonRange(period, range));
  const hasPrev = prev.openDays > 0;
  const noun = periodNoun(period);
  const vs = comparisonLabel(period);
  const g = granularityFor(range);
  const axis = { hour: "Hour", day: "Day", week: "Week of", month: "Month" }[g];
  const rev = series(range, (x) => x.revenue, g);
  const other = now.byCapability.Lockers + now.byCapability.Parking;
  const share = (v: number) => (now.revenue ? Math.round((v / now.revenue) * 100) : 0);
  const mix = [
    { l: "Sunbeds", v: share(now.byCapability.Sunbeds), amt: now.byCapability.Sunbeds, c: "#0D9488", cls: "bg-teal-600" },
    { l: "Tickets", v: share(now.byCapability.Tickets), amt: now.byCapability.Tickets, c: "#0ea5e9", cls: "bg-sky-500" },
    { l: "Lockers & parking", v: share(other), amt: other, c: "#f59e0b", cls: "bg-amber-500" },
  ];
  const occByZone = ZONES.map((z) => ({ l: z.name, v: Math.round((now.occupancyByZone[z.id] ?? 0) * 100) }));
  const peak = Math.max(...occByZone.map((z) => z.v));
  const occSeries = occByZone.map((z) => (z.v === peak && peak > 0 ? { ...z, hi: 1 } : z));
  // Same measures and the same split as Reporting › Executive (AENR-545).
  const rc = reconcile(now, financeReport(range, null, till.sales));
  const kpis: { label: string; value: string; full: string; detail?: string; trend?: string; tone: string }[] = [
    { label: `Revenue · ${noun}`, value: fmtEUR(rc.revenue), full: eurFull(rc.revenue), detail: `card ${fmtEUR(rc.card)} · cash & other ${fmtEUR(rc.other)}`, trend: hasPrev ? trendPct(now.revenue, prev.revenue) : undefined, tone: "teal" },
    { label: `Bookings · ${noun}`, value: fmtInt(rc.bookings), full: fmtInt(rc.bookings), detail: `${fmtInt(rc.sunbedBookings)} sunbed (${fmtInt(rc.sets)} sets) · ${fmtInt(rc.ticketOnly)} ticket-only`, trend: hasPrev ? trendPct(now.bookings, prev.bookings) : undefined, tone: "navy" },
    { label: "Occupancy", value: fmtPct(now.occupancy), full: fmtPct(now.occupancy, 1), trend: trendPp(now.occupancy, prev.occupancy, hasPrev), tone: "navy" },
    { label: "Avg basket", value: fmtEUR(now.avgBasket), full: eurFull(now.avgBasket), trend: trendEUR(now.avgBasket, prev.avgBasket, hasPrev), tone: "navy" },
  ];
  const label = rangeLabel(range);
  // Export the whole dashboard — KPIs *and* the data behind every visual — as
  // one columnar CSV for the selected period.
  const exportDashboard = () => {
    downloadCSVReport(`dashboard-${range.from}_${range.to}.csv`, [
      { title: `Key metrics · ${label}`, header: ["Metric", "Value", "Detail", "Change", "Compared"], rows: kpis.map((k) => [k.label, k.full, k.detail ?? "", k.trend ?? "—", vs]) },
      { title: `Revenue · ${label}`, header: [axis, "Revenue (€)"], rows: rev.map((d) => [d.l, d.v]) },
      { title: "Revenue mix", header: ["Product", "Share %"], rows: mix.map((m) => [m.l, m.v]) },
      { title: `Occupancy by zone · ${label}`, header: ["Zone", "Occupancy %"], rows: occByZone.map((z) => [z.l, z.v]) },
    ]);
    toast(`Exported the dashboard (${label}) to CSV.`, { tone: "success" });
  };
  const closed = now.openDays === 0;
  return (
    <div className="animate-fade-up">
      <PageHead title="Dashboard" sub="Akti tou Iliou · bookings & revenue overview" badge={<Badge tone="mvp">MVP</Badge>}
        actions={<PeriodPicker value={period} onChange={setPeriod} />} primary={<Btn variant="outline" icon={Icon.download} onClick={exportDashboard}>Export</Btn>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => <StatCard key={k.label} label={k.label} value={k.value} valueTitle={k.full} sub={<span>{k.detail && <span className="block">{k.detail}</span>}<span className={k.detail ? "block text-slate-500" : undefined}>{k.trend ? vs : "no comparison data"}</span></span>} tone={k.tone} trend={k.trend} />)}
      </div>
      {closed && (
        <div className="mt-4"><EmptyState icon={Icon.umbrella} title="The beach was closed" body={`No bookings or revenue in ${label}. The season runs 1 May – 30 Sep.`} /></div>
      )}
      {!closed && <>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2"><div className="font-semibold text-navy-900">Revenue · {noun}</div>{kpis[0].trend && <Badge tone={kpis[0].trend.startsWith("+") ? "green" : "red"}><Icon.trend size={11} className={kpis[0].trend.startsWith("+") ? "" : "-scale-y-100"} /> {kpis[0].trend}</Badge>}</div>
          <BarChart data={rev} label={`Revenue by ${axis.toLowerCase()}, ${label}`} />
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-2">Revenue mix</div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
            <Donut segments={mix.map((m) => ({ v: m.v, c: m.c }))} size={180} total={fmtEUR(now.revenue)} totalLabel="revenue" label={`Revenue mix, ${fmtEUR(now.revenue)}: ${mix.map((m) => `${m.l} ${fmtEUR(m.amt)} (${m.v}%)`).join(", ")}`} />
            <div className="text-sm space-y-2">
              {mix.map((m) => <Leg key={m.l} c={m.cls} t={`${m.l} · ${fmtEUR(m.amt)} · ${m.v}%`} />)}
            </div>
          </div>
        </Card>
      </div>
      {/* Individual bookings live on the Bookings page; the dashboard stays aggregate (AENR-463). */}
      <Card className="p-5 mt-4">
        <div className="font-semibold text-navy-900 mb-1">Occupancy by zone · {noun}</div>
        <HBarChart color="#0ea5e9" unit="%" max={100} data={occSeries} label={`Occupancy by zone, ${label}`} />
      </Card>
      </>}
    </div>
  );
}
const Leg = ({ c, t }: { c: string; t: ReactNode }) => <div className="flex items-center gap-2"><i className={`w-3 h-3 rounded-sm ${c} inline-block`} />{t}</div>;

export { AdminAvailability } from "./beach/BeachAdmin";
export { AdminBookings } from "./bookings/Bookings";

/* ============ BOOKINGS LIST ============ */
/* Compact live beach coverage for the manual booking — the same umbrella sets the
   customer sees, scaled into the form. Available sets are tappable (fill the
   code); taken sets are dimmed. */
function ManualCoverage({ zone, slots, selectedCode, onPick }: {
  zone: { name: string };
  slots: SunbedSlot[];
  selectedCode: string;
  onPick: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); setBox({ w: r.width, h: r.height }); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const size = useMemo(() => {
    const base = Math.min(40, box.w * 0.07);
    if (slots.length < 2 || box.w === 0) return Math.max(16, base);
    let min = Infinity;
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const dx = ((slots[i].x - slots[j].x) / 100) * box.w;
        const dy = ((slots[i].y - slots[j].y) / 100) * box.h;
        min = Math.min(min, Math.hypot(dx, dy));
      }
    }
    return Math.max(14, Math.min(base, min * 0.82));
  }, [slots, box]);
  const free = slots.filter((s) => s.state === "a").length;
  const want = selectedCode.trim().toUpperCase();
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><Icon.umbrella size={12} /> Live beach coverage · {zone.name}</div>
        <div className="text-[11px] text-slate-500 tnum">{free} free · {slots.length} sets</div>
      </div>
      <div ref={ref} className="relative w-full rounded-xl ring-1 ring-slate-200 overflow-hidden" style={{ aspectRatio: "16 / 6", background: "linear-gradient(to bottom, #bfe6f5 0%, #cdebf6 16%, #f1ddb4 30%, #ecd3a1 100%)" }}>
        {slots.map((s) => {
          const sel = !!want && s.id.toUpperCase() === want;
          const taken = s.state !== "a";
          return (
            <button
              key={s.id}
              type="button"
              disabled={taken}
              onClick={() => onPick(s.id)}
              title={`${s.id} · ${taken ? "taken" : "available"}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform ${taken ? "opacity-35 cursor-not-allowed" : "hover:scale-110 hover:z-10 cursor-pointer"}`}
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: size, height: size }}
            >
              <SunbedMark state={s.state} sel={sel} fill />
            </button>
          );
        })}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">Tap an available set to fill the code · taken sets are dimmed.</div>
    </div>
  );
}

/* ============ MANUAL / PHONE BOOKING ============ */
export function AdminManual() {
  const { toast, beachLayout, hint } = useApp();
  // Opened from a guest profile ("New booking"): start with that guest's details.
  const pre = hint?.page === "manual" ? hint.prefill : undefined;
  const [done, setDone] = useState(false);
  const [zoneName, setZoneName] = useState(ZONES[0].name);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState(pre?.email ?? "maria@example.com");
  const [mphone, setMphone] = useState(pre?.phone ?? "+30 694 100 0001");
  const [sendOpen, setSendOpen] = useState(false);
  const [sentVia, setSentVia] = useState<SendChannel>("Email");
  const [sentTo, setSentTo] = useState("");
  const today = DEMO_TODAY;
  const [bookDate, setBookDate] = useState<string>(DEMO_TODAY);
  const zone = ZONES.find((z) => z.name === zoneName) ?? ZONES[0];
  const slots = beachLayout[zone.id] ?? zoneLayout(zone);
  const reserve = () => {
    if (!code.trim()) { toast("Pick a set on the map (or type a code) first.", { tone: "error" }); return; }
    setSendOpen(true);
  };
  return (
    <>
      <div className="animate-fade-up grid lg:grid-cols-[1fr_320px] gap-5">
        <div>
          <PageHead title="Manual / Phone Booking" sub="Reserve and block a sunbed without taking payment (VIP / phone), then send the QR to the customer." badge={<Badge tone="mvp">MVP</Badge>} />
          <Card className="p-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Customer name"><Input placeholder="e.g. Maria K." defaultValue={pre?.name ?? "Maria K."} /></Field>
              <Field label="Customer e-mail"><Input placeholder="maria@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <Field label="Customer phone"><Input placeholder="+30 694 …" value={mphone} onChange={(e) => setMphone(e.target.value)} /></Field>
              <Field label="Zone"><Select value={zoneName} onChange={(e) => { setZoneName(e.target.value); setCode(""); }} options={ZONES.map((z) => z.name)} /></Field>
              <Field label="Sunbed code"><Input placeholder="CE-92" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></Field>
              <Field label="Date"><DateInput value={bookDate} onChange={setBookDate} min={today} required /></Field>
              <Field label="Mark as"><Select options={["Unpaid (manual)", "Comp / VIP", "Pay later"]} /></Field>
            </div>
            <ManualCoverage zone={zone} slots={slots} selectedCode={code} onPick={(id) => setCode(id)} />
            <div className="mt-4">
              <Btn variant="primary" full className="sm:w-auto" icon={Icon.lock} onClick={reserve}>Reserve &amp; send QR</Btn>
            </div>
          </Card>
          {done && (
            <Card className="p-5 mt-4 flex items-center gap-4 animate-fade-up">
              <QR size={96} seed={`MANUAL-${code}`} />
              <div>
                <div className="font-semibold text-navy-900 flex items-center gap-2">Reserved <Badge tone="amber">Unpaid</Badge></div>
                <div className="text-sm text-slate-600">{zone.name} · {code} — QR sent via <b>{sentVia}</b> to {sentTo}. The customer can pay later or present the QR at the gate.</div>
              </div>
            </Card>
          )}
        </div>
        <ContextPanel title="Manual / phone bookings" items={[
          { icon: Icon.phone, title: "Block without payment", body: "Used for phone bookings, VIP comps, and pay-later guests." },
          { icon: Icon.mail, title: "QR by e-mail / Viber / SMS", body: "The guest gets the same gate QR as an online booking, on the channel you pick." },
          { icon: Icon.cash, title: "Settle later", body: "Mark unpaid bookings paid in Bookings when they arrive." },
        ]} footer="Manual bookings appear in Reporting with channel = Phone." />
      </div>
      <SendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Reserve & send QR"
        intro={`Block ${zone.name} · ${code} and send the gate QR to the customer.`}
        email={email}
        phone={mphone}
        sendLabel="Reserve & send"
        onSend={(ch, dest) => { setSentVia(ch); setSentTo(dest); setDone(true); toast(`Demo — ${zone.name} · ${code} blocked & QR sent via ${ch} to ${dest}.`, { tone: "success" }); }}
      />
    </>
  );
}

/* ============ REPORTING & ANALYTICS ============ */
const FIN_TABS = ["exec", "payments", "invoices"];
export function AdminReporting() {
  const { toast, go, till } = useApp();
  const [tab, setTab] = useState("exec");
  const tabs: TabEntry[] = [
    ["exec", "Executive", Icon.chart],
    ["revenue", "Revenue", Icon.cash],
    ["occupancy", "Occupancy", Icon.umbrella],
    ["bookings", "Bookings", Icon.grid],
    ["channel", "Channels", Icon.globe],
    ["customers", "Customers", Icon.users],
    ["tickets", "Tickets", Icon.ticket],
    ["ops", "Operations", Icon.clock],
    ["payments", "Payments", Icon.card],
    ["invoices", "Invoices", Icon.receipt],
  ];
  // One period for the whole page (kept when switching tabs, AENR-466).
  const [period, setPeriod] = usePeriod({ kind: "preset", preset: "season", offset: 0 });
  // Memoised on the period so the tab modules can cache their (heavier) figures.
  const range = useMemo(() => resolveRange(period) ?? resolveRange({ kind: "preset", preset: "season", offset: 0 })!, [period]);
  const cmpRange = useMemo(() => comparisonRange(period, range), [period, range]);
  const label = rangeLabel(range);
  const noun = periodNoun(period);
  const now = summarize(range);
  const prev = summarize(comparisonRange(period, range));
  const ly = summarize(lastYearRange(range));
  const hasPrev = prev.openDays > 0;
  const vs = comparisonLabel(period);
  const g = granularityFor(range);
  const axis = { hour: "Hour", day: "Day", week: "Week of", month: "Month" }[g];
  const closed = now.openDays === 0;
  // Whole-beach finance figures, whatever section the block above is filtered to.
  const finWhole = useMemo(() => financeReport(range, null, till.sales), [range, till.sales]);

  /* ---- Figures, computed once and shared by the screen and the CSV ---- */
  const ratio = (a: number, b: number) => (b ? a / b : 0);
  const otherRev = now.byCapability.Lockers + now.byCapability.Parking;
  const mix = [
    { l: "Sunbeds", v: Math.round(ratio(now.byCapability.Sunbeds, now.revenue) * 100), amt: now.byCapability.Sunbeds, c: "#0D9488", cls: "bg-teal-600" },
    { l: "Tickets", v: Math.round(ratio(now.byCapability.Tickets, now.revenue) * 100), amt: now.byCapability.Tickets, c: "#0ea5e9", cls: "bg-sky-500" },
    { l: "Lockers & parking", v: Math.round(ratio(otherRev, now.revenue) * 100), amt: otherRev, c: "#f59e0b", cls: "bg-amber-500" },
  ];
  const k = (s: typeof now) => ({
    online: ratio(s.byChannel.Online.bookings, s.bookings),
    refund: ratio(s.refunds.amount, s.revenue),
    revpatb: ratio(s.revenue, s.setNights),
    adr: ratio(s.byCapability.Sunbeds, s.setsSold),
    attach: ratio(s.units.Lockers + s.units.Parking, s.bookings),
    noShow: ratio(s.noShows, s.bookings),
    cancel: ratio(s.cancellations, s.bookings),
    setsPerBooking: ratio(s.setsSold, s.sunbedBookings),
  });
  const kn = k(now), kp = k(prev);
  const pp = (a: number, b: number, digits = 0) => (hasPrev ? `${a - b >= 0 ? "+" : "−"}${Math.abs((a - b) * 100).toFixed(digits)}pp` : undefined);
  // The Revenue / Bookings tiles count every product and payment method; the
  // block above counts card captures and confirmed sets. Split the tiles into
  // those parts so the two reconcile (AENR-545).
  const rc = reconcile(now, finWhole);
  const execKpis: { label: string; value: string; sub: string; full?: string; detail?: string; trend?: string; tone?: string }[] = [
    { label: "Revenue · all methods", value: fmtEUR(rc.revenue), full: eurFull(rc.revenue), detail: `card ${fmtEUR(rc.card)} · cash & other ${fmtEUR(rc.other)}`, sub: vs, trend: hasPrev ? trendPct(now.revenue, prev.revenue) : undefined, tone: "teal" },
    { label: "Bookings · all products", value: fmtInt(rc.bookings), detail: `${fmtInt(rc.sunbedBookings)} sunbed (${fmtInt(rc.sets)} sets) · ${fmtInt(rc.ticketOnly)} ticket-only`, sub: vs, trend: hasPrev ? trendPct(now.bookings, prev.bookings) : undefined },
    { label: "Avg occupancy", value: fmtPct(now.occupancy), sub: "across zones", trend: trendPp(now.occupancy, prev.occupancy, hasPrev) },
    { label: "Online share", value: fmtPct(kn.online), sub: "of bookings", trend: pp(kn.online, kp.online) },
    { label: "Refund rate", value: fmtPct(kn.refund, 1), sub: "of revenue", trend: pp(kn.refund, kp.refund, 1), tone: "teal" },
    { label: "RevPATB", value: `€${kn.revpatb.toFixed(1)}`, sub: "rev / available sunbed", trend: hasPrev ? trendPct(kn.revpatb, kp.revpatb) : undefined, tone: "indigo" },
    { label: "ADR", value: `€${kn.adr.toFixed(1)}`, sub: "avg daily rate / set", trend: hasPrev ? trendPct(kn.adr, kp.adr) : undefined },
    { label: "Ancillary attach", value: kn.attach.toFixed(2), sub: "extras per booking", trend: hasPrev ? `${kn.attach - kp.attach >= 0 ? "+" : "−"}${Math.abs(kn.attach - kp.attach).toFixed(2)}` : undefined },
    { label: "No-show rate", value: fmtPct(kn.noShow, 1), sub: "of reservations", trend: pp(kn.noShow, kp.noShow, 1), tone: "teal" },
  ];
  const revSeries = series(range, (x) => x.revenue, g);
  const bookSeries = series(range, (x) => x.bookings, g);
  const paceVsLy = ly.bookings ? trendPct(now.bookings, ly.bookings) : undefined;
  const zoneOcc = ZONES.map((z) => ({ id: z.id, l: z.name, v: Math.round((now.occupancyByZone[z.id] ?? 0) * 100) }));
  const topZone = [...zoneOcc].sort((a, b) => b.v - a.v)[0];
  const weekendLift = now.weekdayOccupancy ? Math.round((now.weekendOccupancy / now.weekdayOccupancy - 1) * 100) : 0;
  const capRows = [
    { l: "Sunbed", v: now.byCapability.Sunbeds }, { l: "Ticket", v: now.byCapability.Tickets },
    { l: "Locker", v: now.byCapability.Lockers }, { l: "Parking", v: now.byCapability.Parking },
  ];
  const capMax = Math.max(...capRows.map((c) => c.v));
  const zoneRev = ZONES.map((z) => ({ l: z.name, v: Math.round(now.revenueByZone[z.id] ?? 0) }));
  // Occupancy tab (AENR-478): its own filters and analysis, same period.
  const heatBuckets = useMemo(() => buckets(range, g === "hour" ? "day" : g).map((b) => ({ ...b, label: g === "month" ? b.label : `${Number(b.range.from.slice(8))}/${Number(b.range.from.slice(5, 7))}` })), [range, g]);
  const occ = useOccupancy(range, cmpRange, g === "hour" ? "day" : g);
  const chs = useChannels(range, cmpRange, g === "hour" ? "day" : g);
  // Overview / Payments / Invoices (AENR-521): arrival-date range + section.
  const [section, setSection] = useSection();
  const fin = useFinanceData(range, section);
  const finDocs = fin.rep.total.docs;
  // Customers: the seed top-customer list scaled to the period's share of a full season.
  const seasonRev = summarize(resolveRange({ kind: "preset", preset: "season", offset: -1 })!).revenue;
  const custScale = Math.min(1.2, ratio(now.revenue, seasonRev));
  const topCustomers = closed ? [] : TOP_CUSTOMERS.map((c) => ({ ...c, visits: Math.max(1, Math.round(c.visits * custScale)), spendN: Math.round(moneyVal(c.spend) * custScale) }));
  const vipRev = now.revenue * 0.17;
  const tickets = REPORTING_TICKETS.filter((r) => inRange(isoFromDayMonth(r[3]), range));
  // Operations: per-capability totals for the period; refunds split by revenue share.
  const refundShare = (v: number) => Math.round(ratio(v, now.revenue) * now.refunds.amount);
  const ops = [
    { l: "Sunbed bookings", n: now.sunbedBookings, g: now.byCapability.Sunbeds },
    { l: "Entry tickets", n: now.units.Tickets, g: now.byCapability.Tickets },
    { l: "Day lockers", n: now.units.Lockers, g: now.byCapability.Lockers },
    { l: "Parking", n: now.units.Parking, g: now.byCapability.Parking },
  ].map((o) => ({ ...o, rf: refundShare(o.g), net: o.g - refundShare(o.g) }));
  const opsTotal = ops.reduce((a, o) => ({ n: a.n + o.n, g: a.g + o.g, rf: a.rf + o.rf, net: a.net + o.net }), { n: 0, g: 0, rf: 0, net: 0 });
  // Breakdown by day (by week / month for long ranges) so daily operations stay visible (AENR-480).
  const [opsByDay, setOpsByDay] = useState(false);
  const opsG = g === "hour" ? "day" : g;
  const opsRows = buckets(range, opsG).map((b) => { const x = summarize(b.range); return { l: opsG === "day" ? `${fmtWeekdayP(b.range.from)} ${b.label.includes(" ") ? b.label : rangeLabel(b.range)}` : b.label, x }; }).filter((r) => r.x.openDays > 0);
  const eur = (n: number) => `€${Math.round(n).toLocaleString("en-GB")}`;

  // Build a faithful CSV of exactly what each tab shows — its KPI cards and its
  // tables / chart series — for the selected period.
  const buildReport = (t: string): CsvSection[] => {
    const head = `· ${label}`;
    switch (t) {
      case "exec":
        return [
          { title: `Executive · key metrics ${head}`, header: ["Metric", "Value", "Detail", "Change"], rows: execKpis.map((x) => [x.label, x.full ?? x.value, x.detail ? `${x.detail} · ${x.sub}` : x.sub, x.trend ?? "—"]) },
          { title: `Revenue by ${axis.toLowerCase()} (€)`, header: [axis, "Revenue"], rows: revSeries.map((d) => [d.l, d.v]) },
          { title: "Revenue mix", header: ["Category", "Share %"], rows: mix.map((m) => [m.l, m.v]) },
          { title: `Booking pace (vs same period last year ${paceVsLy ?? "—"})`, header: [axis, "Bookings"], rows: bookSeries.map((d) => [d.l, d.v]) },
          ...financeCsv("overview", fin, label),
        ];
      case "payments":
        return financeCsv("payments", fin, label);
      case "invoices":
        return financeCsv("invoices", fin, label);
      case "revenue":
        return [
          { title: `Revenue by product (€) ${head}`, header: ["Product", "Revenue"], rows: capRows.map((c) => [c.l, c.v]) },
          { title: `Sunbed revenue by zone (€) ${head}`, header: ["Zone", "Revenue"], rows: zoneRev.map((z) => [z.l, z.v]) },
          { title: "Latest transactions", header: ["Tx", "Capability", "Channel", "Status", "Amount"], rows: REVENUE_TX.map((r) => [r[0], r[1], r[2].label, r[3].label, r[4]]) },
        ];
      case "occupancy":
        return occupancyCsv(occ.report, occ.f, label);
      case "bookings":
        return [
          { title: `Bookings · key metrics ${head}`, header: ["Metric", "Value"], rows: [
            ["Avg lead time", `${now.avgLeadDays.toFixed(1)}d`], ["Online vs other", `${Math.round(kn.online * 100)} / ${100 - Math.round(kn.online * 100)}`], ["Cancellation", fmtPct(kn.cancel, 1)], ["Sets / booking", kn.setsPerBooking.toFixed(1)],
          ] },
          { title: `Booking volume by ${axis.toLowerCase()}`, header: [axis, "Bookings"], rows: bookSeries.map((d) => [d.l, d.v]) },
        ];
      case "channel":
        return channelsCsv(chs, label);
      case "customers":
        return [
          { title: `Customers · key metrics ${head}`, header: ["Metric", "Value", "Detail"], rows: [
            ["New vs returning", `${Math.round(ratio(now.newGuests, now.bookings) * 100)} / ${Math.round(ratio(now.returningGuests, now.bookings) * 100)}`, "% of bookings"], ["VIP segment rev", fmtEUR(vipRev), "17% of total"], ["Season-pass holders", "412", "active"],
          ] },
          { title: "Top customers", header: ["Customer", "Segment", "Visits", "Spend"], rows: topCustomers.map((c) => [c.name, c.segment.label, c.visits, eur(c.spendN)]) },
        ];
      case "tickets":
        return [{ title: `Ticket history ${head}`, header: ["Ticket", "Category", "Issuer", "Date", "Customer type", "Revenue", "Status"], rows: tickets.map((r) => [r[0], r[1], r[2], r[3], r[4], r[5], r[6].label]) }];
      case "ops":
        return [
          { title: `Operations ${head}`, header: ["Capability", "Count", "Gross", "Refunds", "Net"], rows: [
            ...ops.map((o) => [o.l, o.n, eur(o.g), `−${eur(o.rf)}`, eur(o.net)] as (string | number)[]),
            ["Total", opsTotal.n, eur(opsTotal.g), `−${eur(opsTotal.rf)}`, eur(opsTotal.net)],
          ] },
          { title: "Documents issued", header: ["Type", "Count"], rows: [["ΑΠΥ", finDocs.apy], ["ΤΠΥ", finDocs.tpy], ["ΠΑΠΥ", finDocs.papy], ["ΠΤΠΥ", finDocs.ptpy], ["Pending transmission", fin.rep.total.pending]] },
          ...(opsByDay && opsRows.length > 1 ? [{ title: `Operations by ${opsG}`, header: [opsG === "day" ? "Day" : opsG === "week" ? "Week of" : "Month", "Sunbed bookings", "Entry tickets", "Lockers", "Parking", "Gross", "Refunds", "Net"],
            rows: opsRows.map((r) => [r.l, r.x.sunbedBookings, r.x.units.Tickets, r.x.units.Lockers, r.x.units.Parking, eur(r.x.revenue), `−${eur(r.x.refunds.amount)}`, eur(r.x.revenue - r.x.refunds.amount)]) }] : []),
        ];
      default:
        return [];
    }
  };
  const tabLabel = (t: string) => tabs.find((x) => x[0] === t)?.[1] ?? t;
  const secSlug = section ? `-${section}` : "";
  const exportReport = (t: string) => { downloadCSVReport(`reporting-${t}-${range.from}_${range.to}${FIN_TABS.includes(t) ? secSlug : ""}.csv`, buildReport(t)); toast(`Exported the ${tabLabel(t)} report (${label}, CSV).`, { tone: "success" }); };
  const exportPdf = (t: string) => {
    const kind = t === "exec" ? "overview" : (t as "payments" | "invoices");
    const doc = financePdf(kind, fin, label, TENANT.name);
    // The Executive PDF carries the same reconciled headline tiles as the screen.
    if (t === "exec") doc.meta = [...execKpis.slice(0, 2).map((x) => `${x.label}: ${x.full ?? x.value} (${x.detail})`), ...(doc.meta ?? [])];
    downloadPDF(`reporting-${t}-${range.from}_${range.to}${secSlug}.pdf`, doc);
    toast(`Exported the ${tabLabel(t)} report (${label}, PDF).`, { tone: "success" });
  };

  return (
    <div className="animate-fade-up">
      {/* One header (AENR-550): the export is the page's primary action, PDF in More. */}
      <PageHead sub="How the beach is doing — revenue, occupancy, bookings, channels, guests and payments for any period."
        primary={<Btn variant="primary" icon={Icon.download} onClick={() => exportReport(tab)}>{FIN_TABS.includes(tab) ? "Export CSV" : "Export"}</Btn>}
        secondary={FIN_TABS.includes(tab) ? [{ label: "Export PDF", icon: Icon.doc, onClick: () => exportPdf(tab) }] : []} />
      <div className="mb-3"><Tabs tabs={tabs} value={tab} onChange={setTab} scroll /></div>
      <PeriodPicker value={period} onChange={setPeriod} presets={["day", "week", "month", "year", "season"]} resetTo={{ kind: "preset", preset: "season", offset: 0 }} className="mb-4" />

      {closed && <EmptyState icon={Icon.umbrella} title="The beach was closed" body={`No activity in ${label}. The season runs 1 May – 30 Sep — pick a date inside it.`} />}

      {FIN_TABS.includes(tab) && !closed && <div className="mb-4"><SectionChips value={section} onChange={setSection} /></div>}
      {!closed && tab === "payments" && <PaymentsTab d={fin} />}
      {!closed && tab === "invoices" && <InvoicesTab d={fin} />}
      {!closed && tab === "exec" && <>
        <OverviewPanel d={fin} onDocs={() => setTab("invoices")} />
        <p className="text-[12.5px] text-slate-500 mb-2">
          Whole beach · all products and payment methods. Card revenue = “Captured” above{section ? " for the whole beach — the zone filter applies to the block above only" : ""}; sunbed sets = “Sunbed bookings” above.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {execKpis.slice(0, 5).map((x, i) => <StatCard instant key={x.label} label={x.label} value={x.value} valueTitle={x.full} sub={x.detail ? <span><span className="block">{x.detail}</span><span className="block text-slate-500">{x.sub}</span></span> : x.sub} tone={x.tone} trend={x.trend}
            sparkline={i === 0 ? <Sparkline data={revSeries.map((d) => d.v)} /> : i === 1 ? <Sparkline data={bookSeries.map((d) => d.v)} color="#0ea5e9" /> : undefined} />)}
        </div>
        {/* Leisure-industry KPIs (RevPATB ≈ RevPAR for sunbeds). */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {execKpis.slice(5).map((x) => <StatCard instant key={x.label} label={x.label} value={x.value} sub={x.sub} tone={x.tone} trend={x.trend} compare={vs} />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          <Card className="p-5 lg:col-span-2"><div className="font-semibold text-navy-900 mb-1">Revenue by {axis.toLowerCase()} (€) · {noun}</div><LineChartMini data={revSeries} label={`Revenue by ${axis.toLowerCase()}, ${label}`} /></Card>
          <Card className="p-5"><div className="font-semibold text-navy-900 mb-2">Revenue mix</div>
            <div className="flex items-center gap-4"><Donut segments={mix.map((m) => ({ v: m.v, c: m.c }))} total={fmtEUR(now.revenue)} totalLabel="revenue" label={`Revenue mix, ${fmtEUR(now.revenue)}: ${mix.map((m) => `${m.l} ${fmtEUR(m.amt)} (${m.v}%)`).join(", ")}`} />
              <div className="text-sm space-y-1.5">{mix.map((m) => <Leg key={m.l} c={m.cls} t={`${m.l} · ${fmtEUR(m.amt)} · ${m.v}%`} />)}</div></div>
          </Card>
        </div>
        {/* Pace + an actionable insight callout derived from the period. */}
        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="font-semibold text-navy-900">Booking pace · {noun}</div>
              {paceVsLy && <Badge tone={paceVsLy.startsWith("+") ? "green" : "red"}>{paceVsLy} vs same period last year</Badge>}
            </div>
            <BarChart color="#13315c" data={bookSeries} label={`Bookings by ${axis.toLowerCase()}, ${label}`} />
          </Card>
          {/* Insight in the brand system (AENR-582): a card like the others, teal accent, with the period it covers. */}
          <Card className="p-5 flex flex-col relative overflow-hidden">
            <span aria-hidden className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-teal-500" />
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-700"><Icon.sparkles size={14} /> Insight · {label}</div>
            <div className="mt-2 font-display font-bold text-lg leading-snug text-navy-900">{weekendLift > 0 ? `Weekends run ${weekendLift}% fuller than weekdays.` : "Demand is even across the week."}</div>
            <p className="text-[13px] text-slate-600 mt-1 leading-snug">{topZone.l} averages {topZone.v}% occupancy {noun}. Consider dynamic weekend pricing on front-row sets to lift RevPATB.</p>
            <Btn variant="teal" size="sm" className="mt-auto self-start" icon={Icon.trend} onClick={() => go("admin", "availability")}>Set a rule</Btn>
          </Card>
        </div>
      </>}

      {!closed && tab === "revenue" && <>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5"><div className="font-semibold text-navy-900 mb-1">Revenue by product (€) · {noun}</div><BarChart data={capRows.map((c) => (c.v === capMax ? { ...c, hi: 1 } : c))} label={`Revenue by product, ${label}`} /></Card>
          <Card className="p-5"><div className="font-semibold text-navy-900 mb-1">Sunbed revenue by zone (€) · {noun}</div><HBarChart color="#0ea5e9" data={zoneRev} label={`Sunbed revenue by zone, ${label}`} /></Card>
        </div>
        <Card className="p-5 mt-4"><div className="font-semibold text-navy-900 mb-2">Latest transactions</div>
          <Table cols={["Tx", "Capability", "Channel", "Status", "Amount"]} right={[4]}
            rows={REVENUE_TX.map((r) => [r[0], r[1], <Badge tone={r[2].tone}>{r[2].label}</Badge>, <Badge tone={r[3].tone}>{r[3].label}</Badge>, r[4].startsWith("−") ? <span className="text-rose-600 font-medium tnum">{r[4]}</span> : r[4]])} /></Card>
      </>}

      {!closed && tab === "occupancy" && <OccupancyTab occ={occ} range={range} label={label} noun={noun} vs={vs} hasPrev={hasPrev} buckets={heatBuckets} />}

      {!closed && tab === "bookings" && <>
        <div className="grid sm:grid-cols-4 gap-4">
          <StatCard label="Avg lead time" value={`${now.avgLeadDays.toFixed(1)}d`} sub="ahead of date" />
          <StatCard label="Online vs other" value={`${Math.round(kn.online * 100)} / ${100 - Math.round(kn.online * 100)}`} sub="% of bookings" />
          <StatCard label="Cancellation" value={fmtPct(kn.cancel, 1)} sub={vs} trend={pp(kn.cancel, kp.cancel, 1)} />
          <StatCard label="Sets / booking" value={kn.setsPerBooking.toFixed(1)} sub="sunbed bookings" />
        </div>
        <Card className="p-5 mt-4"><div className="font-semibold text-navy-900 mb-1">Booking volume by {axis.toLowerCase()} · {noun}</div><LineChartMini data={bookSeries} label={`Bookings by ${axis.toLowerCase()}, ${label}`} /></Card>
      </>}

      {!closed && tab === "channel" && <ChannelsTab ch={chs} period={period} label={label} noun={noun} vs={vs} hasPrev={hasPrev} />}

      {!closed && tab === "customers" && <>
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="New vs returning" value={`${Math.round(ratio(now.newGuests, now.bookings) * 100)} / ${Math.round(ratio(now.returningGuests, now.bookings) * 100)}`} sub="% of bookings" />
          <StatCard label="VIP segment rev" value={fmtEUR(vipRev)} sub="17% of total" />
          <StatCard label="Season-pass holders" value="412" sub="active" />
        </div>
        <Card className="p-5 mt-4"><div className="font-semibold text-navy-900 mb-2">Top customers · {noun}</div>
          <Table cols={["Customer", "Segment", "Visits", "Spend"]} right={[2, 3]}
            rows={topCustomers.map((c) => [c.name, <Badge tone={c.segment.tone}>{c.segment.label}</Badge>, c.visits, eur(c.spendN)])} /></Card>
      </>}

      {!closed && tab === "tickets" && <Card className="p-5"><div className="flex items-center justify-between mb-2"><div className="font-semibold text-navy-900">Ticket history · {noun}</div><Btn size="sm" variant="outline" icon={Icon.download} onClick={() => exportReport("tickets")}>CSV</Btn></div>
        {tickets.length
          ? <Table cols={["Ticket", "Category", "Issuer", "Date", "Customer type", "Revenue", "Status"]} right={[5]}
              rows={tickets.map((r) => [r[0], r[1], r[2], r[3], r[4], r[5], <Badge tone={r[6].tone}>{r[6].label}</Badge>])} />
          : <EmptyState compact icon={Icon.ticket} title="No tickets in this period" body="Try a wider range, e.g. This season." />}
      </Card>}

      {!closed && tab === "ops" && <Card className="p-5"><div className="flex items-center justify-between gap-2 mb-2 flex-wrap"><div className="font-semibold text-navy-900">Operations · {label}</div>
          <div className="flex items-center gap-2">
            {opsRows.length > 1 && <Toggle on={opsByDay} onChange={setOpsByDay} label={`By ${opsG}`} />}
            <Btn size="sm" variant="outline" icon={Icon.download} onClick={() => exportReport("ops")}>Export</Btn>
          </div></div>
        <Table cols={["Capability", "Count", "Gross", "Refunds", "Net"]} right={[1, 2, 3, 4]} rows={[
          ...ops.map((o) => [o.l, fmtInt(o.n), eur(o.g), o.rf ? <span className="text-rose-600 font-medium tnum">−{eur(o.rf)}</span> : "€0", eur(o.net)]),
          [<b>Total</b>, <b>{fmtInt(opsTotal.n)}</b>, <b>{eur(opsTotal.g)}</b>, <b className="text-rose-600">−{eur(opsTotal.rf)}</b>, <b>{eur(opsTotal.net)}</b>],
        ]} />
        <div className="mt-3 text-[12px] text-slate-600">Documents issued: {fmtInt(finDocs.apy)} ΑΠΥ · {fmtInt(finDocs.tpy)} ΤΠΥ · {fmtInt(finDocs.papy + finDocs.ptpy)} credit notes (ΠΑΠΥ / ΠΤΠΥ) · {fin.rep.total.pending ? `${fmtInt(fin.rep.total.pending)} pending transmission` : "all transmitted to MyDATA ✓"} · <button type="button" className="font-semibold text-teal-700 hover:underline" onClick={() => setTab("invoices")}>Invoices</button></div>
        {opsByDay && opsRows.length > 1 && <div className="mt-5">
          <div className="font-semibold text-navy-900 mb-1">By {opsG}</div>
          <Table dense cols={[opsG === "day" ? "Day" : opsG === "week" ? "Week of" : "Month", "Sunbed bookings", "Entry tickets", "Lockers", "Parking", "Gross", "Refunds", "Net"]} right={[1, 2, 3, 4, 5, 6, 7]}
            rows={opsRows.map((r) => [<span className="whitespace-nowrap">{r.l}</span>, fmtInt(r.x.sunbedBookings), fmtInt(r.x.units.Tickets), fmtInt(r.x.units.Lockers), fmtInt(r.x.units.Parking), eur(r.x.revenue), <span className="text-rose-600 tnum">−{eur(r.x.refunds.amount)}</span>, eur(r.x.revenue - r.x.refunds.amount)])} />
        </div>}
      </Card>}
      {tab === "ops" && <TillShiftsCard />}
    </div>
  );
}

/* Closed Cashier till shifts with their Z totals (AENR-507) — the manager's view. */
function TillShiftsCard() {
  const { till, go } = useApp();
  if (!till.shifts.length) return null;
  const hm = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");
  return (
    <Card className="p-5 mt-4">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="font-semibold text-navy-900">Cashier shifts · Z reports</div>
        <Btn size="sm" variant="ghost" icon={Icon.arrowR} onClick={() => go("cashier", "register")}>Open Cash Register</Btn>
      </div>
      <Table dense cols={["Shift", "Cashier", "Till", "Time", "Sales", "Cash", "Card", "Expected cash", "Counted", "Variance", "Note"]} right={[4, 5, 6, 7, 8, 9]}
        rows={till.shifts.map((sh) => {
          const tt = shiftTotals(sh, till.sales);
          const v = sh.counted !== undefined ? Math.round((sh.counted - tt.expectedCash) * 100) / 100 : 0;
          return [<span className="font-mono text-[12px]">{sh.id}</span>, sh.cashier, sh.till, <span className="whitespace-nowrap">{hm(sh.openedAt)}–{hm(sh.closedAt)}</span>, eurTill(tt.sales), eurTill(tt.cash), eurTill(tt.card), eurTill(tt.expectedCash), sh.counted !== undefined ? eurTill(sh.counted) : "—",
            <span className={Math.abs(v) > VARIANCE_TOLERANCE ? "text-rose-600 font-semibold tnum" : "tnum"}>{v > 0 ? "+" : v < 0 ? "−" : ""}{eurTill(Math.abs(v))}</span>, sh.note || "—"];
        })} />
    </Card>
  );
}

/* ============ REFUNDS (AENR-583 decision queue) ============ */
export function AdminRefunds() {
  const { toast, till, persona } = useApp();
  const agent = persona === "callcenter";
  const ops = useBookingOps();
  // The shared period filters the KPIs, the history and the export (AENR-466).
  const [period, setPeriod] = usePeriod({ kind: "preset", preset: "month", offset: 0 });
  const range = resolveRange(period);
  const label = range ? rangeLabel(range) : "All dates";
  const noun = periodNoun(period);
  // Needs decision (AENR-583): every pending request, oldest first, whatever the period.
  const queue = ops.refunds.filter((r) => r.status === "pending").sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
  const overdue = queue.filter((r) => slaState(r.requestedAt, opsNow()) === "overdue").length;
  // History (AENR-546): refunds made at the till, decided requests, then the
  // refund history generated from the Reporting day figures — one list for the
  // table, the KPIs and the export.
  const visible = [...tillRefunds(till.sales), ...decidedRefundRows(ops.refunds)]
    .filter((r) => inRange(isoFromDayMonth(r.date), range))
    .concat(refundHistory(range));
  const stats = refundStats(visible);
  const prevRange = range ? comparisonRange(period, range) : null;
  const prevStats = prevRange ? refundStats(refundHistory(prevRange)) : null;
  const salesRange = range ?? { from: "2026-05-01", to: DEMO_TODAY };
  const sales = summarize(salesRange).revenue;
  const prevSales = prevRange ? summarize(prevRange).revenue : 0;
  const hasPrev = !!prevStats && prevSales > 0;
  const refundRate = sales ? stats.amount / sales : 0;
  const prevRate = prevStats && prevSales ? prevStats.amount / prevSales : 0;
  const REFUND_PAGE = 25;
  const { page, setPage } = useListUrl();
  const pageCount = Math.max(1, Math.ceil(visible.length / REFUND_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const shown = visible.slice(safePage * REFUND_PAGE, (safePage + 1) * REFUND_PAGE);

  const exportCSV = () => {
    const data = visible.map((r) => {
      const p = personByFirst(r.who);
      const refunded = r.status === "Refunded" ? (r.refundAmount ?? r.amount) : "";
      return [r.tx, r.date || "—", r.who, p?.last || "—", p?.phone || "—", r.amount, refunded, r.reason || "—", r.status || "Pending"];
    });
    downloadCSV(range ? `refunds-${range.from}_${range.to}.csv` : "refunds.csv", ["Transaction", "Date", "Name", "Surname", "Phone", "Charge (€)", "Refunded (€)", "Reason", "Status"], data);
    toast(`Exported ${visible.length} refunds (${label}) to CSV.`, { tone: "success" });
  };

  return (
    <div className="animate-fade-up">
      <PageHead title="Refunds" sub="Decide refund requests first, then the history — full or partial via Stripe, with reason logging and an automatic credit note (myDATA)." badge={<Badge tone="mvp">MVP</Badge>}
        actions={<PeriodPicker value={period} onChange={setPeriod} presets={["day", "week", "month", "season"]} allowAll resetTo={{ kind: "preset", preset: "month", offset: 0 }} />} primary={<Btn variant="outline" icon={Icon.download} onClick={exportCSV}>Export</Btn>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Needs decision" value={queue.length} sub={overdue ? `${overdue} past the 48 h SLA` : "all within the 48 h SLA"} tone={overdue ? "rose" : "amber"} />
        <StatCard label={`Refunded · ${noun}`} value={fmtEUR(stats.amount)} sub={`${fmtInt(stats.count)} refund${stats.count === 1 ? "" : "s"} in the history below`} tone="teal" trend={hasPrev ? trendPct(stats.amount, prevStats.amount) : undefined} compare={prevRange ? `vs ${rangeLabel(prevRange)}` : undefined} />
        <StatCard label="Refund rate" value={fmtPct(refundRate, 1)} sub={`of ${fmtEUR(sales)} sales`} compare={prevRange ? `vs ${rangeLabel(prevRange)}` : undefined} trend={hasPrev ? `${refundRate - prevRate >= 0 ? "+" : "−"}${Math.abs((refundRate - prevRate) * 100).toFixed(1)}pp` : undefined} />
        <StatCard label="Top reason" value={stats.top ? stats.top.reason : "—"} sub={stats.top ? `${Math.round(stats.top.share * 100)}% of refunds` : "no refunds yet"} tone="indigo" />
      </div>

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 className="font-display font-bold text-navy-900 text-lg">Needs decision <span className="text-slate-400 tnum">{queue.length}</span></h2>
          <span className="text-[12px] text-slate-500">Oldest first · decide within 48 h · the same decision is available in the booking</span>
        </div>
        {queue.length === 0 ? (
          <EmptyState compact icon={Icon.checkCircle} title="Nothing to decide" body="Every refund request has an answer. New requests from guests and the call centre land here." />
        ) : (
          <ul className="space-y-3">
            {queue.map((r) => (
              <li key={r.id}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1.5 text-[13px] text-slate-600">
                  <b className="text-navy-900">{r.who} {personByFirst(r.who)?.last ?? ""}</b> · {r.tx}
                  {r.bookingId && <> · <a className="font-semibold text-teal-700 hover:underline" href={`#/admin/bookings?booking=${encodeURIComponent(r.bookingId)}`}>{r.bookingId}</a></>}
                </div>
                <PendingRefund r={r} agent={agent} onDecide={ops.decideRefund} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-2">
        <h2 className="font-display font-bold text-navy-900 px-2 pt-2 pb-1">History · {label}</h2>
        {visible.length === 0 ? <EmptyState compact icon={Icon.refund} title="No refunds in this period" body={`Nothing was refunded in ${label}.`} action={<Btn size="sm" variant="outline" onClick={() => setPeriod({ kind: "all" })}>Show all dates</Btn>} /> :
        <Table cols={["Transaction", "Date", "Guest", "Amount", "Reason", "Status"]} right={[3]}
          rows={shown.map((r) => {
            const p = personByFirst(r.who);
            return [r.channel ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap">{r.tx}<Badge tone="green">{r.channel}</Badge></span> : r.tx, r.date || "—",
              <div className="leading-tight"><div className="whitespace-nowrap">{r.who} {p?.last ?? ""}</div>{p?.phone && <div className="text-[11.5px] text-slate-500 tnum whitespace-nowrap"><Masked value={p.phone} /></div>}</div>,
              r.refundAmount != null && r.refundAmount < r.amount
                ? <div className="leading-tight"><span className="tnum">€{r.amount}</span><div className="text-[11px] text-rose-600 tnum">−€{r.refundAmount} refunded</div></div>
                : `€${r.amount}`,
              r.approver ? <div className="leading-tight">{r.reason}<div className="text-[11px] text-slate-500">decided by {r.approver}</div></div> : r.reason || "—",
              <Badge tone={r.status === "Refunded" ? "green" : "slate"}>{r.status}</Badge>];
          })} />}
        {pageCount > 1 && <Pager page={safePage} pageCount={pageCount} total={visible.length} pageSize={REFUND_PAGE} onPage={setPage} />}
      </Card>
    </div>
  );
}

/* ============ LOYALTY (Future) ============
   A handful of proven loyalty patterns (stamp cards, happy hours, tiers, bundles,
   referrals, birthday treats) — each one configurable via a typed field schema,
   plus a way to add your own. Below sit two working demo builders: a timed public
   offer and a visit-milestone email campaign whose audience comes from the real
   roster. Schemes are data-driven (fields + a summary builder), so the config
   modal and the card both render from one source — no per-scheme forms. */

/* Scheme model + built-in schemes live in data/loyalty.ts (shared with the
   customer Home). The config modal + admin UI stay here. */

/* One control per field type — keeps the config modal declarative. */
function SchemeFieldControl({ field, value, onChange }: { field: SchemeField; value: string | number; onChange: (v: string | number) => void }) {
  if (field.type === "select") return <Select value={String(value)} onChange={(e) => onChange(e.target.value)} options={field.options} />;
  if (field.type === "time") return <Input type="time" value={String(value)} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === "number")
    return (
      <div className="flex items-center gap-2">
        <Input type="number" min={field.min} max={field.max} value={Number(value)}
          onChange={(e) => onChange(Math.max(field.min ?? 0, Math.min(field.max ?? 9999, Math.round(+e.target.value) || field.min || 0)))} />
        {field.suffix && <span className="text-[12px] text-slate-500 shrink-0">{field.suffix}</span>}
      </div>
    );
  return <Input type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} />;
}

/* Configure a scheme's parameters. Mounted only while open, so it always seeds
   fresh from the saved values (or the scheme defaults for a first set-up). */
function SchemeConfigModal({ scheme, initial, configured, onSave, onClose }: {
  scheme: LoyaltyScheme; initial: SchemeValues; configured: boolean; onSave: (v: SchemeValues) => void; onClose: () => void;
}) {
  const [values, setValues] = useState<SchemeValues>(initial);
  const SIcon = scheme.icon;
  const heading = scheme.custom ? String(values.title || "Custom scheme") : scheme.title;
  return (
    <Modal open onClose={onClose} wide
      title={<span className="inline-flex items-center gap-2"><SIcon size={18} className="text-sky-700" /> Configure · {heading}</span>}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon={Icon.check} onClick={() => onSave(values)}>{configured ? "Save changes" : "Save & activate"}</Btn></>}>
      <div className="space-y-3">
        <p className="text-[13px] text-slate-600 -mt-1">{scheme.blurb}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {scheme.fields.map((f) => (
            <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
              <Field label={f.label}>
                <SchemeFieldControl field={f} value={values[f.key]} onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
              </Field>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-teal-50/70 ring-1 ring-teal-200 px-3 py-2 text-[12.5px] text-navy-900"><b>Preview:</b> {scheme.summarize(values)}</div>
      </div>
    </Modal>
  );
}

export function AdminLoyalty() {
  const { toast, loyalty, setLoyalty, go } = useApp();
  const [reward, setReward] = useState("20% off sunbeds");
  const [store, setStore] = useState("All zones");
  const [schedule, setSchedule] = useState("Weekday mornings");
  const [offers, setOffers] = useState<{ id: number; reward: string; store: string; schedule: string }[]>([]);
  const [send, setSend] = useState<{ off: string; count: number } | null>(null);
  const idRef = useRef(0);
  const tier = (min: number) => CUSTOMERS.filter((c) => c.bookings >= min).length;

  // Scheme lifecycle: a scheme is "configured" once it has saved values; the
  // `enabled` flag then turns it live/paused without losing the config. Custom
  // schemes are added at runtime and removable.
  const config = loyalty.config;
  const customs = useMemo(() => loyalty.customIds.map(makeCustomScheme), [loyalty.customIds]);
  const [editing, setEditing] = useState<string | null>(null);
  const allSchemes = useMemo(() => [...BUILTIN_SCHEMES, ...customs], [customs]);
  const activeCount = Object.values(config).filter((c) => c.enabled).length;
  const editScheme = editing ? allSchemes.find((s) => s.id === editing) ?? null : null;

  const saveConfig = (id: string, values: SchemeValues) => {
    setLoyalty((s) => ({ ...s, config: { ...s.config, [id]: { enabled: true, values } } }));
    const sch = allSchemes.find((s) => s.id === id);
    const name = sch?.custom ? String(values.title || "Custom scheme") : sch?.title;
    toast(`Enabled “${name}” — now live for guests.`, { tone: "success" });
    setEditing(null);
  };
  const closeConfig = () => {
    // Drop a brand-new custom card if its first set-up was cancelled.
    if (editing && !config[editing]) setLoyalty((s) => ({ ...s, customIds: s.customIds.filter((c) => c !== editing) }));
    setEditing(null);
  };
  const toggleEnabled = (id: string) => {
    const willEnable = !config[id]?.enabled;
    setLoyalty((s) => (s.config[id] ? { ...s, config: { ...s.config, [id]: { ...s.config[id], enabled: willEnable } } } : s));
    const sch = allSchemes.find((s) => s.id === id);
    const name = sch?.custom ? String(config[id]?.values.title || "Custom scheme") : sch?.title;
    toast(willEnable ? `Resumed “${name}”.` : `Paused “${name}”.`, willEnable ? { tone: "success" } : {});
  };
  const addCustom = () => {
    const id = `custom-${Date.now().toString(36)}`;
    setLoyalty((s) => ({ ...s, customIds: [...s.customIds, id] }));
    setEditing(id);
  };
  const removeCustom = (id: string) => {
    setLoyalty((s) => { const cfg = { ...s.config }; delete cfg[id]; return { ...s, customIds: s.customIds.filter((c) => c !== id), config: cfg }; });
    toast("Removed scheme.");
  };

  const publish = () => {
    setOffers((o) => [{ id: ++idRef.current, reward, store, schedule }, ...o]);
    toast(`Published offer: ${reward} (${store} · ${schedule}).`, { tone: "success" });
  };
  const tiers = [
    { min: 5, off: "10% off", tone: "slate" },
    { min: 10, off: "15% off + free coffee", tone: "blue" },
    { min: 20, off: "VIP: front row + free parking", tone: "amber" },
  ];

  return (
    <div className="animate-fade-up">
      <PageHead title="Loyalty" sub="Reward repeat guests and fill the quiet hours — schemes, timed offers and visit-based campaigns." badge={<Badge tone="future">Future</Badge>} />
      <FutureBanner />

      <div className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-2 px-1">Pick a scheme to set up{activeCount > 0 && <span className="text-teal-600"> · {activeCount} active</span>}</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allSchemes.map((s) => {
            const SIcon = s.icon;
            const st = config[s.id];
            const configured = !!st;
            const on = !!st?.enabled;
            const title = s.custom ? String(st?.values.title ?? s.title) : s.title;
            return (
              <Card key={s.id} className={`p-4 flex flex-col gap-2 transition ${on ? "ring-2 ring-teal-500" : ""}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${on ? "bg-teal-600 text-white" : "bg-sky-50 text-sky-800"}`}><SIcon size={18} /></span>
                  <div className="font-semibold text-navy-900 flex-1 min-w-0 truncate">{title}</div>
                  {configured && <Toggle on={on} onChange={() => toggleEnabled(s.id)} ariaLabel={`Enable ${title}`} />}
                </div>
                <div className="text-[13px] text-slate-600 leading-snug">{s.blurb}</div>
                {configured ? (
                  <div className="text-[12.5px] text-navy-900 rounded-lg bg-teal-50/70 ring-1 ring-teal-200 px-2.5 py-1.5 flex items-start gap-1.5">
                    <Icon.check size={13} className="text-teal-600 shrink-0 mt-0.5" /><span>{s.summarize(st.values)}</span>
                  </div>
                ) : (
                  <div className="text-[12px] text-slate-500 rounded-lg bg-slate-50 ring-1 ring-slate-100 px-2.5 py-1.5">e.g. {s.eg}</div>
                )}
                <div className="mt-auto flex gap-2 pt-0.5">
                  {configured ? (
                    <>
                      <Btn variant="outline" size="sm" className="flex-1" icon={Icon.edit} onClick={() => setEditing(s.id)}>Edit</Btn>
                      <Btn variant="ghost" size="sm" className="flex-1" icon={Icon.bell} onClick={() => go("admin", "communicate", { promote: s.id })}>Promote</Btn>
                      {s.custom && (
                        <button type="button" onClick={() => removeCustom(s.id)} aria-label={`Remove ${title}`}
                          className="shrink-0 w-9 h-9 rounded-[14px] grid place-items-center ring-1 ring-slate-200 text-rose-600 hover:bg-rose-50 hover:ring-rose-300 transition"><Icon.trash size={15} /></button>
                      )}
                    </>
                  ) : (
                    <Btn variant="tint" size="sm" full icon={Icon.plus} onClick={() => setEditing(s.id)}>Set up</Btn>
                  )}
                </div>
              </Card>
            );
          })}
          <button type="button" onClick={addCustom}
            className="rounded-3xl border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/40 transition grid place-items-center p-6 text-center min-h-[176px] group">
            <span className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-teal-700">
              <span className="w-11 h-11 rounded-2xl bg-white ring-1 ring-slate-200 group-hover:ring-teal-300 grid place-items-center shadow-sm transition"><Icon.plus size={20} /></span>
              <span className="text-[13px] font-semibold">Add a custom scheme</span>
              <span className="text-[11.5px] text-slate-400 group-hover:text-teal-600">Name it, pick a reward, choose when.</span>
            </span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Timed public offer builder */}
        <Card className="p-5 space-y-3">
          <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.clock size={16} /> Timed public offer</div>
          <div className="text-[12.5px] text-slate-600 -mt-1">Run a deal for everyone, on the dates and hours you choose.</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Reward"><Select value={reward} onChange={(e) => setReward(e.target.value)} options={LOYALTY_REWARDS} /></Field>
            <Field label="Applies to"><Select value={store} onChange={(e) => setStore(e.target.value)} options={["All zones", ...ZONES.map((z) => z.name)]} /></Field>
            <Field label="When"><Select value={schedule} onChange={(e) => setSchedule(e.target.value)} options={["Weekday mornings", "Weekends", "Specific date range", "All month", "Happy hour 17:00–19:00"]} /></Field>
            <Field label="Time window"><div className="flex items-center gap-2"><Input type="time" defaultValue="09:00" /><span className="text-slate-400">–</span><Input type="time" defaultValue="11:00" /></div></Field>
          </div>
          <div className="rounded-xl bg-teal-50/70 ring-1 ring-teal-200 px-3 py-2 text-[12.5px] text-navy-900"><b>Preview:</b> {reward} · {store} · {schedule}.</div>
          <div className="flex justify-end">
            <Btn variant="primary" icon={Icon.check} onClick={publish}>Publish offer</Btn>
          </div>
          {offers.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 pt-2">Live offers · {offers.length}</div>
              {offers.map((o) => (
                <div key={o.id} className="flex items-center gap-2 rounded-lg ring-1 ring-teal-200 bg-teal-50/50 px-3 py-2 text-[12.5px] animate-pop">
                  <Icon.clock size={13} className="text-teal-600 shrink-0" />
                  <span className="flex-1 min-w-0 text-navy-900"><b>{o.reward}</b> · {o.store} · {o.schedule}</span>
                  <button type="button" onClick={() => setOffers((x) => x.filter((y) => y.id !== o.id))} className="text-slate-400 hover:text-rose-600 shrink-0" aria-label="Remove offer"><Icon.x size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Visit-milestone campaign — audience from the real roster */}
        <Card className="p-5 space-y-3">
          <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.mail size={16} /> Reward your regulars</div>
          <div className="text-[12.5px] text-slate-600 -mt-1">Message guests who keep coming back this season — the audience comes from Users &amp; Segments.</div>
          <div className="space-y-2">
            {tiers.map((t) => (
              <div key={t.min} className="flex items-center gap-3 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                <span className="w-10 h-10 rounded-lg bg-sky-50 text-sky-800 grid place-items-center font-bold tnum text-[13px] shrink-0">{t.min}+</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-navy-900 flex items-center gap-1.5 flex-wrap">Visited {t.min}+ times → <Badge tone={t.tone}>{t.off}</Badge></div>
                  <div className="text-[11px] text-slate-500"><b className="tnum">{tier(t.min)}</b> guests qualify this season</div>
                </div>
                <Btn size="sm" variant="outline" icon={Icon.mail} onClick={() => setSend({ off: t.off, count: tier(t.min) })}>Send</Btn>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><Icon.info size={13} /> Thresholds and rewards here are examples — change them in the schemes above.</div>
        </Card>
      </div>

      {editScheme && (
        <SchemeConfigModal
          scheme={editScheme}
          configured={!!config[editScheme.id]}
          initial={config[editScheme.id]?.values ?? schemeDefaults(editScheme)}
          onSave={(v) => saveConfig(editScheme.id, v)}
          onClose={closeConfig}
        />
      )}

      <SendModal
        open={send !== null}
        onClose={() => setSend(null)}
        title="Send offer to regulars"
        intro={send ? `Send “${send.off}” to the ${send.count} guests who qualify.` : undefined}
        email={send ? `${send.count} guests` : undefined}
        phone={send ? `${send.count} guests` : undefined}
        sendLabel="Send"
        onSend={(ch) => toast(`Sent “${send?.off}” to ${send?.count} guests via ${ch}.`, { tone: "success" })}
      />
    </div>
  );
}

/* ============ PASSES (Future) ============
   VIP credit packs and Season-pass pricing — the prices guests see when buying a
   pass on the customer app. Editable here, read live by the purchase flow. */
/* Deep copy a design (nested elements) — avoids structuredClone for old engines. */
const cloneDesign = (d: PassDesign): PassDesign => ({
  ...d, bg: [d.bg[0], d.bg[1]],
  title: { ...d.title }, subtitle: { ...d.subtitle }, holder: { ...d.holder }, number: { ...d.number }, validUntil: { ...d.validUntil },
  logo: { ...d.logo }, qr: { ...d.qr },
});

/* A labelled native colour swatch. */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 text-[12px] text-slate-600">
      <span>{label}</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono text-[11px] text-slate-400 uppercase">{value}</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="w-7 h-7 rounded-md ring-1 ring-slate-200 bg-white p-0.5 cursor-pointer" />
      </span>
    </label>
  );
}

/* ---- Pass pricing (the original VIP / Season pricing, now a tab) ---- */
function PassPricingPanel() {
  const { toast, passPricing, setPassPricing } = useApp();
  const [tiers, setTiers] = useState<number[]>(passPricing.vipTiers);
  const [disc, setDisc] = useState(Math.round(passPricing.vipDiscount * 100));
  const [monthly, setMonthly] = useState(passPricing.seasonMonthly);
  const [summer, setSummer] = useState(passPricing.seasonSummer);
  const setTier = (i: number, v: number) => setTiers((ts) => ts.map((x, j) => (j === i ? v : x)));
  const addTier = () => setTiers((ts) => [...ts, 250]);
  const removeTier = (i: number) => setTiers((ts) => (ts.length > 1 ? ts.filter((_, j) => j !== i) : ts));
  const spendsLike = (amt: number) => Math.round(amt / (1 - Math.min(95, Math.max(0, disc)) / 100));
  const save = () => {
    setPassPricing({
      vipTiers: tiers.map((n) => Math.max(0, Math.round(n))).filter((n) => n > 0),
      vipDiscount: Math.min(95, Math.max(0, disc)) / 100,
      seasonMonthly: Math.max(0, Math.round(monthly)),
      seasonSummer: Math.max(0, Math.round(summer)),
    });
    toast("Saved — pass pricing is live on the customer app.", { tone: "success" });
  };
  return (
    <div>
      <div className="flex justify-end mb-3"><Btn variant="primary" icon={Icon.check} onClick={save}>Save pricing</Btn></div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 space-y-3">
          <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.sparkles size={16} className="text-sky-700" /> VIP credit</div>
          <div className="text-[12.5px] text-slate-600 -mt-1">Prepaid credit guests spend at checkout — the discount applies to whatever the credit pays for.</div>
          <Field label="Spend discount">
            <div className="flex items-center gap-2 max-w-[10rem]">
              <Input type="number" min={0} max={95} value={disc} onChange={(e) => setDisc(Math.max(0, Math.min(95, Math.round(+e.target.value) || 0)))} />
              <span className="text-[12px] text-slate-500">% off</span>
            </div>
          </Field>
          <div>
            <div className="text-[12px] font-semibold text-slate-700 mb-1.5">Credit packs</div>
            <div className="space-y-2">
              {tiers.map((amt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">€</span>
                  <div className="w-28"><Input type="number" min={0} value={amt} onChange={(e) => setTier(i, Math.max(0, Math.round(+e.target.value) || 0))} /></div>
                  <span className="text-[12px] text-slate-500 flex-1">credit · spends like <b className="text-navy-900 tnum">€{spendsLike(amt).toLocaleString()}</b></span>
                  <button type="button" onClick={() => removeTier(i)} aria-label="Remove pack" disabled={tiers.length <= 1}
                    className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition"><Icon.trash size={15} /></button>
                </div>
              ))}
            </div>
            <Btn variant="ghost" size="sm" icon={Icon.plus} className="mt-2" onClick={addTier}>Add pack</Btn>
          </div>
          <div className="rounded-xl bg-sky-50 ring-1 ring-sky-600/15 px-3 py-2 text-[12px] text-sky-800">Valid to the end of the season · spent on any service · the {disc}% applies to the card-paid share.</div>
        </Card>
        <Card className="p-5 space-y-3">
          <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.ticket size={16} className="text-teal-600" /> Season pass</div>
          <div className="text-[12.5px] text-slate-600 -mt-1">Covers one entry ticket per visit while valid. Two plans for guests to choose:</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Monthly (€)"><Input type="number" min={0} value={monthly} onChange={(e) => setMonthly(Math.max(0, Math.round(+e.target.value) || 0))} /></Field>
            <Field label="Whole summer (€)"><Input type="number" min={0} value={summer} onChange={(e) => setSummer(Math.max(0, Math.round(+e.target.value) || 0))} /></Field>
          </div>
          <div className="rounded-xl bg-teal-50 ring-1 ring-teal-600/15 px-3 py-2 text-[12px] text-teal-700">At checkout, one entry per visit is auto-covered for pass holders.</div>
        </Card>
      </div>
      <div className="mt-4 text-[12px] text-slate-500 flex items-center gap-1.5"><Icon.info size={13} /> Changes apply instantly to the customer’s VIP / Season-pass purchase screens.</div>
    </div>
  );
}

/* ---- Review & publish: the card + its Apple / Google Wallet renditions ---- */
function PassReviewModal({ open, card, onClose, onPublish }: { open: boolean; card: PassDesign; onClose: () => void; onPublish: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Review &amp; publish" wide
      footer={<><Btn variant="ghost" onClick={onClose}>Keep editing</Btn><Btn variant="primary" icon={Icon.check} onClick={onPublish}>Publish card</Btn></>}>
      <div className="space-y-4">
        <div className="text-[13px] text-slate-600">This is exactly what guests will carry — on their card and in Apple / Google Wallet. Publishing makes it live everywhere.</div>
        <div className="flex flex-wrap items-start justify-center gap-6">
          <div className="text-center"><div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Card</div><div className="w-[300px]"><ScaledCard design={card} maxWidth={300} /></div></div>
          <div className="text-center"><div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Apple Wallet</div><WalletRendition design={card} platform="apple" /></div>
          <div className="text-center"><div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Google Wallet</div><WalletRendition design={card} platform="google" /></div>
        </div>
      </div>
    </Modal>
  );
}

/* ---- Card designer: add cards, edit + drag every element, review, publish ---- */
function PassDesignerPanel() {
  const { toast, passCards, setPassCards } = useApp();
  const [cards, setCards] = useState<PassDesign[]>(passCards);
  const [selId, setSelId] = useState(cards[0]?.id ?? "");
  const [selEl, setSelEl] = useState<DragKey>("title");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const card = cards.find((c) => c.id === selId) ?? cards[0];

  // Debounced persist so a drag doesn't write every frame; skip the first run.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const t = setTimeout(() => setPassCards(cards), 300);
    return () => clearTimeout(t);
  }, [cards, setPassCards]);

  const updateCard = (patch: Partial<PassDesign>) => setCards((cs) => cs.map((c) => (c.id === selId ? { ...c, ...patch } : c)));
  const updateEl = (key: DragKey, patch: Record<string, unknown>) => setCards((cs) => cs.map((c) => (c.id === selId ? ({ ...c, [key]: { ...(c[key] as object), ...patch } } as PassDesign) : c)));
  const moveEl = (key: DragKey, x: number, y: number) => setCards((cs) => cs.map((c) => (c.id === selId ? ({ ...c, [key]: { ...(c[key] as object), x, y } } as PassDesign) : c)));

  const addCard = () => {
    const id = `card-${Date.now().toString(36)}`;
    setCards((cs) => [...cs, { ...cloneDesign(card), id, name: `Card ${cs.length + 1}`, published: false }]);
    setSelId(id); setSelEl("title");
  };
  const duplicateCard = () => {
    const id = `card-${Date.now().toString(36)}`;
    setCards((cs) => [...cs, { ...cloneDesign(card), id, name: `${card.name} copy`, published: false }]);
    setSelId(id);
  };
  const removeCard = () => {
    if (cards.length <= 1) return;
    const rest = cards.filter((c) => c.id !== selId);
    setCards(rest); setSelId(rest[0].id);
  };
  const onLogo = async (file?: File) => {
    if (!file) return;
    setLogoBusy(true);
    try {
      const src = await fileToBackgroundSrc(file, { maxW: 320, maxH: 320, quality: 0.9 });
      updateEl("logo", { src });
      toast("Logo updated on the card.", { tone: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "That image couldn’t be used.", { tone: "error" });
    } finally { setLogoBusy(false); }
  };
  const publish = () => {
    const next = cards.map((c) => (c.id === selId ? { ...c, published: true } : c));
    setCards(next); setPassCards(next); setReviewOpen(false);
    toast(`“${card.name}” published — live on the customer card and Apple / Google Wallet.`, { tone: "success" });
  };

  const isText = (TEXT_KEYS as string[]).includes(selEl);
  const t = card[selEl] as CardText; // valid when isText
  const aligns: { v: "left" | "center" | "right"; label: string }[] = [{ v: "left", label: "L" }, { v: "center", label: "C" }, { v: "right", label: "R" }];

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
      <Card className="p-4">
        {/* Card list */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {cards.map((c) => (
            <button key={c.id} onClick={() => setSelId(c.id)} className={`shrink-0 rounded-xl p-1.5 ring-1 transition ${c.id === selId ? "ring-2 ring-teal-500 bg-teal-50/40" : "ring-slate-200 hover:ring-teal-400"}`}>
              <div className="w-[120px] pointer-events-none"><ScaledCard design={c} maxWidth={120} /></div>
              <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-navy-900 truncate max-w-[120px]">{c.name}{c.published && <Icon.checkCircle size={11} className="text-teal-600 shrink-0" />}</div>
            </button>
          ))}
          <button onClick={addCard} className="shrink-0 w-[120px] h-[96px] rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/40 grid place-items-center text-slate-500 hover:text-teal-700 transition">
            <span className="flex flex-col items-center gap-1 text-[12px] font-semibold"><Icon.plus size={18} /> Add card</span>
          </button>
        </div>

        {/* Editable canvas */}
        <div className="mt-3 rounded-2xl bg-[linear-gradient(135deg,#eef2f7,#e2e8f0)] ring-1 ring-slate-200 p-6 grid place-items-center overflow-auto">
          <CardFace design={card} editable selected={selEl} onSelect={setSelEl} onMove={moveEl} qrSeed={card.id} />
        </div>

        {/* Element picker */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {([...TEXT_KEYS, "logo", "qr"] as DragKey[]).map((k) => (
            <button key={k} onClick={() => setSelEl(k)} className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold ring-1 transition ${selEl === k ? "bg-navy-900 text-white ring-navy-900" : "ring-slate-200 text-slate-600 hover:ring-teal-400"}`}>{TEXT_LABELS[k]}</button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <Btn size="sm" variant="ghost" icon={Icon.grid} onClick={duplicateCard}>Duplicate</Btn>
            <Btn size="sm" variant="ghost" icon={Icon.trash} onClick={removeCard} disabled={cards.length <= 1} className="text-rose-600 hover:bg-rose-50">Delete</Btn>
          </div>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5"><Icon.info size={12} /> Drag any element on the card to reposition it, or pick one above to style it.</div>
      </Card>

      {/* Properties */}
      <Card className="p-4 h-max space-y-4">
        <div>
          <Field label="Card name"><Input value={card.name} onChange={(e) => updateCard({ name: e.target.value })} /></Field>
        </div>

        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 pt-2">Background</div>
          <ColorField label="Top colour" value={card.bg[0]} onChange={(v) => updateCard({ bg: [v, card.bg[1]] })} />
          <ColorField label="Bottom colour" value={card.bg[1]} onChange={(v) => updateCard({ bg: [card.bg[0], v] })} />
          <ColorField label="Wave accent" value={card.wave} onChange={(v) => updateCard({ wave: v })} />
        </div>

        <div className="space-y-2.5 pt-1 border-t border-slate-100">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 pt-2 flex items-center gap-1.5"><Icon.edit size={12} /> {TEXT_LABELS[selEl]}</div>
          {isText ? (
            <>
              <Field label="Text"><Input value={t.text} onChange={(e) => updateEl(selEl, { text: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Size (px)"><Input type="number" min={6} max={72} value={t.size} onChange={(e) => updateEl(selEl, { size: Math.max(6, Math.min(72, Math.round(+e.target.value) || 6)) })} /></Field>
                <Field label="Tracking"><Input type="number" min={0} max={12} step={0.5} value={t.tracking ?? 0} onChange={(e) => updateEl(selEl, { tracking: Math.max(0, Math.min(12, +e.target.value || 0)) })} /></Field>
              </div>
              <ColorField label="Text colour" value={t.color} onChange={(v) => updateEl(selEl, { color: v })} />
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-lg ring-1 ring-slate-200 overflow-hidden">
                  {aligns.map((a) => (
                    <button key={a.v} onClick={() => updateEl(selEl, { align: a.v })} className={`px-2.5 py-1 text-[12px] font-semibold transition ${(t.align ?? "left") === a.v ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{a.label}</button>
                  ))}
                </div>
                <button onClick={() => updateEl(selEl, { weight: (t.weight ?? 600) >= 700 ? 600 : 800 })} className={`px-2.5 py-1 rounded-lg text-[12px] font-bold ring-1 transition ${(t.weight ?? 600) >= 700 ? "bg-navy-900 text-white ring-navy-900" : "ring-slate-200 text-slate-600 hover:ring-teal-400"}`}>Bold</button>
              </div>
            </>
          ) : selEl === "logo" ? (
            <>
              <div className="flex items-center gap-2">
                <label className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold ring-1 bg-white transition ${logoBusy ? "ring-teal-300 text-teal-700" : "ring-slate-200 text-slate-700 hover:ring-teal-400"}`}>
                  <input type="file" accept="image/*" className="sr-only" disabled={logoBusy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void onLogo(f); }} />
                  {logoBusy ? <Spinner size={13} /> : <Icon.upload size={13} />} {card.logo.src ? "Replace logo" : "Upload logo"}
                </label>
                {card.logo.src && <button onClick={() => updateEl("logo", { src: null })} className="text-[12px] text-slate-500 hover:text-rose-600 font-semibold">Remove</button>}
              </div>
              <Field label="Size (% of card)"><Input type="number" min={8} max={70} value={card.logo.scale} onChange={(e) => updateEl("logo", { scale: Math.max(8, Math.min(70, Math.round(+e.target.value) || 8)) })} /></Field>
              <div className="text-[11px] text-slate-500">Drag the logo on the card to position it.</div>
            </>
          ) : (
            <>
              <Toggle on={card.qr.show} onChange={(v) => updateEl("qr", { show: v })} label="Show QR code" />
              <Field label="Size (% of card)"><Input type="number" min={12} max={50} value={card.qr.scale} onChange={(e) => updateEl("qr", { scale: Math.max(12, Math.min(50, Math.round(+e.target.value) || 12)) })} /></Field>
              <div className="text-[11px] text-slate-500">The QR encodes the member’s pass — drag it to position.</div>
            </>
          )}
        </div>

        <div className="pt-1 border-t border-slate-100">
          <Btn variant="primary" full icon={Icon.eye} onClick={() => setReviewOpen(true)}>Review &amp; publish</Btn>
          <div className="mt-2 text-[11px] text-slate-500 leading-snug">{card.published ? "Published — live on the customer card + wallets." : "Draft — review to publish to the customer card and Apple / Google Wallet."}</div>
        </div>
      </Card>

      <PassReviewModal open={reviewOpen} card={card} onClose={() => setReviewOpen(false)} onPublish={publish} />
    </div>
  );
}

export function AdminPasses() {
  const [tab, setTab] = useState("designer");
  return (
    <div className="animate-fade-up">
      <PageHead title="Passes" sub="Design the wallet cards guests carry, and set VIP / Season-pass pricing." badge={<Badge tone="future">Future</Badge>} />
      <FutureBanner />
      <div className="mb-4"><Tabs tabs={[["designer", "Card designer"], ["pricing", "Pricing"]]} value={tab} onChange={setTab} /></div>
      {tab === "designer" ? <PassDesignerPanel /> : <PassPricingPanel />}
    </div>
  );
}

/* ============ GAMIFICATION (Future) ============
   Achievements that earn a guest a summer badge once a metric (visits / bookings
   / spend) passes a threshold. Editable here, read by the customer home. */
export function AdminGamification() {
  const { toast, achievements, setAchievements } = useApp();
  const [list, setList] = useState<Achievement[]>(achievements);
  const update = (id: string, patch: Partial<Achievement>) => setList((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const remove = (id: string) => setList((l) => l.filter((a) => a.id !== id));
  const add = () => setList((l) => [...l, { id: `ach-${Date.now().toString(36)}`, name: "New badge", icon: "star", color: "sun", metric: "visits", threshold: 5 }]);
  const save = () => {
    setAchievements(list.map((a) => ({ ...a, name: a.name.trim() || "Badge", threshold: Math.max(0, Math.round(a.threshold)) })));
    toast("Saved — badges are live on the customer app.", { tone: "success" });
  };
  const earners = (a: Achievement) => CUSTOMERS.filter((c) => (a.metric === "spend" ? c.spend : c.bookings) >= a.threshold).length;
  return (
    <div className="animate-fade-up">
      <PageHead title="Gamification" sub="Achievements that earn guests a summer badge when they hit a milestone." badge={<Badge tone="future">Future</Badge>}
        primary={<Btn variant="primary" icon={Icon.check} onClick={save}>Save badges</Btn>} />
      <FutureBanner />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((a) => {
          const Glyph = Icon[a.icon] || Icon.star;
          return (
            <Card key={a.id} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className={`w-12 h-12 rounded-2xl grid place-items-center text-white shrink-0 shadow-sm ring-2 ring-white bg-gradient-to-br ${BADGE_COLORS[a.color] || BADGE_COLORS.sun}`}><Glyph size={22} /></span>
                <div className="min-w-0 flex-1"><Input value={a.name} onChange={(e) => update(a.id, { name: e.target.value })} className="font-semibold" /></div>
                <button onClick={() => remove(a.id)} aria-label={`Remove ${a.name}`} className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 transition"><Icon.trash size={15} /></button>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Icon</div>
                <div className="flex flex-wrap gap-1.5">
                  {BADGE_ICONS.map((ik) => { const I = Icon[ik] || Icon.star; const on = a.icon === ik; return (
                    <button key={ik} onClick={() => update(a.id, { icon: ik })} aria-label={ik} className={`w-8 h-8 rounded-lg grid place-items-center ring-1 transition ${on ? "ring-2 ring-navy-900 bg-navy-900 text-white" : "ring-slate-200 text-slate-600 hover:ring-teal-400"}`}><I size={15} /></button>
                  ); })}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Colour</div>
                <div className="flex flex-wrap gap-1.5">
                  {BADGE_COLOR_KEYS.map((ck) => { const on = a.color === ck; return (
                    <button key={ck} onClick={() => update(a.id, { color: ck })} aria-label={ck} className={`w-8 h-8 rounded-lg shadow-sm bg-gradient-to-br ${BADGE_COLORS[ck]} ring-2 transition ${on ? "ring-navy-900 scale-105" : "ring-white hover:scale-105"}`} />
                  ); })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="When"><Select value={a.metric} onChange={(e) => update(a.id, { metric: e.target.value as GameMetric })} options={GAME_METRICS.map((m) => ({ v: m.v, l: m.l }))} /></Field>
                <Field label="Reaches"><Input type="number" min={0} value={a.threshold} onChange={(e) => update(a.id, { threshold: Math.max(0, Math.round(+e.target.value) || 0) })} /></Field>
              </div>
              <div className="text-[11px] text-slate-500"><b className="text-navy-900 tnum">{earners(a)}</b> of {CUSTOMERS.length} guests would earn this</div>
            </Card>
          );
        })}
        <button onClick={add} className="rounded-3xl border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/40 transition grid place-items-center p-6 text-center min-h-[220px] group">
          <span className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-teal-700">
            <span className="w-11 h-11 rounded-2xl bg-white ring-1 ring-slate-200 group-hover:ring-teal-300 grid place-items-center shadow-sm transition"><Icon.plus size={20} /></span>
            <span className="text-[13px] font-semibold">Add an achievement</span>
            <span className="text-[11.5px] text-slate-400 group-hover:text-teal-600">Name it, pick an icon + rule.</span>
          </span>
        </button>
      </div>
      <div className="mt-4 text-[12px] text-slate-500 flex items-center gap-1.5"><Icon.info size={13} /> Badges appear on the guest's home — earned ones light up, locked ones show progress.</div>
    </div>
  );
}

