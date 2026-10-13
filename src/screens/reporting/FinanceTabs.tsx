import { fmtEUR } from "../../data/analytics";
import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, ExportMenu, PeriodPicker, StatCard, Table, Tabs } from "../../components/ui";
import { BarChart, StackedBar } from "../../components/charts";
import { useApp } from "../../app/store";
import { readHashQuery, writeHashQuery } from "../../app/router";
import { docsTotal, financeReport, moneyFlow, payouts, sectionName, transmitted, type FinanceReport, type MoneyFlow, type Payout } from "../../data/finance";
import { TENANT, ZONES } from "../../data/beach";
import { feeLabel, type FinanceConfig } from "../../domain/finance";
import { fmtDay, rangeLabel, resolveRange, type DateRange } from "../../domain/period";
import { usePeriod } from "../../lib/usePeriod";
import { useFinance } from "../../lib/useFinance";
import { csvSectionsToReport, downloadReport, type CsvSection, type ReportDef } from "../../lib/download";

/* ============ Reporting › Overview · Payments · Invoices (AENR-521) ============
   Bookings by arrival date with captures and AADE transmission, the money flow
   (captures, service & platform fees, Stripe fees and payouts, saved cards) and
   the fiscal documents by type — all for one arrival-date range and section. */

const eur2 = (n: number) => `€${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const int = (n: number) => Math.round(n).toLocaleString("en-GB");
const pct = (a: number, b: number, d = 1) => (b ? `${((a / b) * 100).toFixed(d)}%` : "—");
const isWeekend = (iso: string) => { const d = new Date(`${iso}T12:00:00`).getDay(); return d === 0 || d === 6; };
const dm = (iso: string) => `${Number(iso.slice(8))}/${Number(iso.slice(5, 7))}`;

/* ---- Section filter (URL: ?section=macaw) ---- */
export function useSection(): [string | null, (s: string | null) => void] {
  const [section, setRaw] = useState<string | null>(() => readHashQuery().get("section"));
  const set = (s: string | null) => { setRaw(s); writeHashQuery(s ? { section: s } : {}, ["section"]); };
  return [section, set];
}
export function SectionChips({ value, onChange }: { value: string | null; onChange: (s: string | null) => void }) {
  const opts = [{ id: null as string | null, name: "All" }, ...ZONES.map((z) => ({ id: z.id as string | null, name: z.name }))];
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Zone">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">Zone</span>
      {opts.map((o) => (
        <button key={o.id ?? "all"} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
          className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${value === o.id ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 text-slate-700 hover:ring-slate-300"}`}>
          {o.name}
        </button>
      ))}
    </div>
  );
}

export interface FinanceData {
  rep: FinanceReport;
  flow: MoneyFlow;
  pay: Payout[];
  cfg: FinanceConfig;
  section: string | null;
}
export function useFinanceData(range: DateRange, section: string | null): FinanceData {
  const { till } = useApp();
  const [cfg] = useFinance();
  const rep = useMemo(() => financeReport(range, section, till.sales), [range, section, till.sales]);
  const flow = useMemo(() => moneyFlow(rep.total, cfg), [rep, cfg]);
  const pay = useMemo(() => payouts(range, section, till.sales, cfg), [range, section, till.sales, cfg]);
  return { rep, flow, pay, cfg, section };
}

/** KPI tile = the app's StatCard (accent stripe, count-up), with an optional badge. */
/** Money tiles (`eur`) abbreviate like every other report tile and show the
 *  full figure on hover; tables and exports keep full values (AENR-582). */
const Kpi = ({ label, value, eur, sub, badge, tone }: { label: string; value?: string; eur?: number; sub?: React.ReactNode; badge?: React.ReactNode; tone?: string }) => (
  <StatCard instant tone={tone} label={badge ? <span className="flex items-center justify-between gap-2">{label}{badge}</span> : label}
    value={eur !== undefined ? fmtEUR(eur) : value ?? ""} valueTitle={eur !== undefined ? eur2(eur) : undefined} sub={sub} />
);

/** Daily bars, weekdays and weekends coloured apart; long ranges are thinned. */
function DailyBars({ rep, pick, title, label }: { rep: FinanceReport; pick: (d: FinanceReport["days"][number]) => number; title: string; label: string }) {
  const days = rep.days.filter((d) => d.sets + d.tx > 0);
  if (!days.length) return <div className="text-sm text-slate-500 py-8 text-center">No open days in this period.</div>;
  const avg = days.reduce((a, d) => a + pick(d), 0) / days.length;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-[12px] text-slate-500">{title}</div>
        <div className="flex gap-3 text-[12px] text-slate-600">
          <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-teal-600" /> Weekday</span>
          <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-navy-800" /> Weekend</span>
        </div>
      </div>
      <BarChart label={label} height={230} data={days.map((d) => ({ l: dm(d.date), v: pick(d) }))} colors={days.map((d) => (isWeekend(d.date) ? "#13315c" : "#0D9488"))}
        avg={{ v: avg, label: `Avg ${avg.toFixed(1)}` }} labelEvery={Math.max(1, Math.ceil(days.length / 12))} />
    </>
  );
}

/* ============ 1 · Overview (inside Executive) ============ */
export function OverviewPanel({ d, onDocs }: { d: FinanceData; onDocs: () => void }) {
  const { rep, flow } = d;
  const t = rep.total;
  const open = rep.days.filter((x) => x.sets > 0);
  const peak = open.reduce((a, x) => (x.sets > (a?.sets ?? -1) ? x : a), open[0]);
  const docs = docsTotal(t.docs);
  return (
    <Card className="p-5 mb-4">
      <div className="font-semibold text-navy-900 mb-3">Bookings, payments &amp; AADE{d.section ? ` · ${sectionName(d.section)}` : ""}</div>
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <Kpi tone="teal" label="1 · Sunbed bookings" value={int(t.sets)} badge={<Badge tone="green">Confirmed</Badge>}
          sub={<>Sets with a confirmed booking · avg/day {open.length ? (t.sets / open.length).toFixed(1) : "—"}{peak ? ` · peak ${peak.sets} (${dm(peak.date)})` : ""}</>} />
        <Kpi tone="indigo" label="2 · Captured payments & revenue" eur={t.captured + flow.serviceTotal}
          sub={<>Captured {eur2(t.captured)} · service fees {eur2(flow.serviceTotal)} · {int(t.tx)} captures</>} />
        <Kpi label="3 · Transmitted to AADE" value={`${int(transmitted(t))} / ${int(docs)}`} badge={t.pending ? <Badge tone="amber">{int(t.pending)} pending</Badge> : <Badge tone="green">All sent</Badge>}
          sub={<>{pct(transmitted(t), docs)} of documents · <button type="button" onClick={onDocs} className="font-semibold text-teal-700 hover:underline">View documents</button></>} />
      </div>
      <DailyBars rep={rep} pick={(x) => x.sets} title="Confirmed sets per arrival day" label="Confirmed sunbed sets per arrival day" />
      <div className="mt-4">
        <Table dense cols={["Zone", "Bookings", "Share", "Captured", "Transmitted to AADE"]} right={[1, 2, 3, 4]}
          rows={[...rep.sections.map((s) => [s.name, int(s.sets), pct(s.sets, t.sets), eur2(s.captured), `${int(transmitted(s))} / ${int(docsTotal(s.docs))}`]),
            [<b>Total</b>, <b>{int(t.sets)}</b>, <b>{t.sets ? "100%" : "—"}</b>, <b>{eur2(t.captured)}</b>, <b>{int(transmitted(t))} / {int(docs)}</b>]]} />
      </div>
    </Card>
  );
}

/* ============ 2 · Payments ============ */
export function PaymentsTab({ d }: { d: FinanceData }) {
  const { rep, flow, pay, cfg } = d;
  const t = rep.total;
  const open = rep.days.filter((x) => x.tx > 0);
  const peak = open.reduce((a, x) => (x.tx > (a?.tx ?? -1) ? x : a), open[0]);
  const inTransit = pay.filter((p) => p.status === "In transit").reduce((a, p) => a + p.amount, 0);
  const paid = pay.filter((p) => p.status !== "Scheduled").reduce((a, p) => a + p.amount, 0);
  const savedPct = t.tx ? t.saved / t.tx : 0;
  const platform = cfg.fees.find((f) => f.payer === "tenant");
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi tone="teal" label="Total transactions" value={int(t.tx)} sub="Successful charges in the period" />
        <Kpi tone="teal" label="Total captured value" eur={t.captured} sub="Beach turnover paid by card" />
        <Kpi label="Total service fees" tone="indigo" eur={flow.serviceTotal} sub={
          <ul className="mt-0.5 space-y-0.5 text-[11.5px] text-slate-600">
            {flow.serviceFees.map((f) => <li key={f.id} className="flex justify-between gap-2"><span>{f.name}{f.units !== null ? ` · ${int(f.units)} × ${f.rate}` : ` · ${f.rate}`}</span><b className="tnum text-navy-900">{eur2(f.amount)}</b></li>)}
            {flow.serviceFees.length === 0 && <li>No customer fees configured</li>}
          </ul>} />
        <Kpi label="Total platform fees" eur={flow.platformFees} sub={platform ? `${feeLabel(platform)} · before VAT` : "None configured"} />
        <Kpi label="VAT on platform fees" eur={flow.platformVat} badge={<Badge tone="amber">{cfg.settlement === "monthly" ? "Monthly" : "Weekly"}</Badge>} sub={`${platform ? Math.round(platform.vat * 100) : 24}% on ${eur2(flow.platformFees)} · settled ${cfg.settlement}`} />
        <Kpi label="Stripe / bank fees" eur={flow.stripeFees} sub={`≈ ${(flow.stripePct * 100).toFixed(2)}% of captured value`} />
        <Kpi tone="indigo" label="Stripe payouts" eur={paid} sub={`Paid to the bank · ${eur2(inTransit)} in transit`} />
        <Kpi label="Saved cards usage" value={`${(savedPct * 100).toFixed(1)}%`} sub={`${int(t.saved)} of ${int(t.tx)} transactions`} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-3">Saved cards usage</div>
          <StackedBar height={14} segments={[{ l: "Saved card", v: t.saved || 0.0001, c: "#0D9488" }, { l: "New card", v: Math.max(0.0001, t.tx - t.saved), c: "#0ea5e9" }]} />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-xl ring-1 ring-slate-200 px-3 py-2.5"><div className="text-[12px] text-slate-600 flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-teal-600" /> Saved card · {(savedPct * 100).toFixed(1)}%</div><div className="font-display text-xl font-bold text-navy-900 tnum">{int(t.saved)}</div><div className="text-[11.5px] text-slate-500">{eur2(t.savedCaptured)} captured</div></div>
            <div className="rounded-xl ring-1 ring-slate-200 px-3 py-2.5"><div className="text-[12px] text-slate-600 flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> New card · {((1 - savedPct) * 100).toFixed(1)}%</div><div className="font-display text-xl font-bold text-navy-900 tnum">{int(t.tx - t.saved)}</div><div className="text-[11.5px] text-slate-500">{eur2(t.captured - t.savedCaptured)} captured</div></div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-2">Recent Stripe payouts</div>
          {pay.length === 0 ? <div className="text-sm text-slate-500 py-6 text-center">No payouts in this period.</div> : (
            <Table dense cols={["Date", "Bank", "Amount", "Status"]} right={[2]}
              rows={pay.slice(0, 6).map((p) => [fmtDay(p.date), <span className="tnum">Bank {p.bank}</span>, <span className="tnum font-semibold">{eur2(p.amount)}</span>,
                <Badge tone={p.status === "Paid" ? "green" : p.status === "In transit" ? "amber" : "slate"}>{p.status}</Badge>])} />
          )}
        </Card>
      </div>
      <Card className="p-5">
        <div className="font-semibold text-navy-900 mb-3">Daily trends</div>
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5"><div className="text-[12px] text-slate-500">Average transactions / day</div><div className="font-display text-xl font-bold text-navy-900 tnum">{open.length ? (t.tx / open.length).toFixed(1) : "—"}</div></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5"><div className="text-[12px] text-slate-500">Average revenue / day</div><div className="font-display text-xl font-bold text-navy-900 tnum">{open.length ? eur2((t.captured + flow.serviceTotal) / open.length) : "—"}</div></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5"><div className="text-[12px] text-slate-500">Peak day</div><div className="font-display text-xl font-bold text-navy-900 tnum">{peak ? `${dm(peak.date)} · ${int(peak.tx)}` : "—"}</div></div>
        </div>
        <DailyBars rep={rep} pick={(x) => x.tx} title="Transactions per arrival day" label="Card transactions per arrival day" />
      </Card>
      <FeeModelNote cfg={cfg} />
    </div>
  );
}

function FeeModelNote({ cfg }: { cfg: FinanceConfig }) {
  const { persona, go } = useApp();
  return (
    <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3 text-[12.5px] text-slate-600 flex flex-wrap items-center gap-2">
      <Icon.info size={14} className="text-slate-400" />
      <span><b className="text-navy-900">Fee model:</b> {cfg.fees.filter((f) => f.active).map((f) => `${f.name} ${feeLabel(f)}${f.payer === "customer" ? " (customer)" : " (tenant)"}`).join(" · ") || "no fees"} · e-invoicing via {cfg.provider}.</span>
      {persona === "platform" ? null : <span className="text-slate-500">Set by Slaice in Platform › Tenants.</span>}
      {persona === "platform" && <Btn size="sm" variant="ghost" onClick={() => go("platform", "tenants")}>Edit</Btn>}
    </div>
  );
}

/* ============ 3 · Invoices ============ */
const DOC_TYPES = [
  { k: "apy", l: "ΑΠΥ", d: "Receipts (B2C)", c: "#0D9488" },
  { k: "tpy", l: "ΤΠΥ", d: "Invoices (B2B)", c: "#0ea5e9" },
  { k: "papy", l: "ΠΑΠΥ", d: "Credit notes on receipts", c: "#f59e0b" },
  { k: "ptpy", l: "ΠΤΠΥ", d: "Credit notes on invoices", c: "#6366f1" },
] as const;

export function InvoicesTab({ d }: { d: FinanceData }) {
  const { rep, cfg } = d;
  const t = rep.total;
  const all = docsTotal(t.docs);
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {DOC_TYPES.map((x) => <Kpi key={x.k} tone={x.k === "apy" ? "teal" : undefined} label={`${x.l} · ${x.d}`} value={int(t.docs[x.k])} sub={`${pct(t.docs[x.k], all)} of documents`} />)}
        <Kpi tone="indigo" label={`Transmitted via ${cfg.provider.replace(" (no provider)", "")}`} value={int(transmitted(t))} sub={<>{pct(transmitted(t), all)} · {int(t.pending)} pending</>} badge={!cfg.providerConnected ? <Badge tone="red">Not connected</Badge> : undefined} />
        <Kpi label="Total documents" value={int(all)} sub="All types" />
      </div>
      <Card className="p-5">
        <div className="font-semibold text-navy-900 mb-3">Distribution by type</div>
        <StackedBar height={14} segments={DOC_TYPES.map((x) => ({ l: x.l, v: t.docs[x.k] || 0.0001, c: x.c }))} />
        <div className="flex flex-wrap gap-4 mt-2 text-[12.5px] text-slate-600">
          {DOC_TYPES.map((x) => <span key={x.k} className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: x.c }} /> <b className="text-navy-900">{x.l}</b> {pct(t.docs[x.k], all)}</span>)}
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <div className="font-semibold text-navy-900">By zone (total &amp; %)</div>
          <div className="text-[12px] text-slate-500">% of each zone’s documents</div>
        </div>
        <Table dense cols={["Zone", ...DOC_TYPES.map((x) => x.l), "Transmitted", "Total"]} right={[1, 2, 3, 4, 5, 6]}
          rows={[...rep.sections, t].map((s) => {
            const n = docsTotal(s.docs);
            const cell = (v: number, of: number) => <span className="tnum whitespace-nowrap">{int(v)} <span className="text-slate-500 text-[11.5px]">{pct(v, of)}</span></span>;
            const total = s === t;
            const row = [s.name, ...DOC_TYPES.map((x) => cell(s.docs[x.k], n)), cell(transmitted(s), n), cell(n, all)];
            return total ? row.map((c, i) => <b key={i}>{c}</b>) : row;
          })} />
      </Card>
    </div>
  );
}

/* ============ Exports ============ */
export function financeCsv(kind: "overview" | "payments" | "invoices", d: FinanceData, label: string): CsvSection[] {
  const { rep, flow, pay } = d;
  const t = rep.total;
  const sec = `Zone: ${d.section ? sectionName(d.section) : "All"}`;
  if (kind === "overview")
    return [
      { title: `Bookings, payments & AADE · arrival dates ${label} · ${sec}`, header: ["Metric", "Value"], rows: [["Confirmed sunbed sets", t.sets], ["Captured (€)", t.captured], ["Service fees (€)", flow.serviceTotal], ["Captures", t.tx], ["Documents transmitted", transmitted(t)], ["Documents issued", docsTotal(t.docs)], ["Pending", t.pending]] },
      { title: "By zone", header: ["Zone", "Bookings", "Share %", "Captured (€)", "Transmitted", "Issued"], rows: rep.sections.map((s) => [s.name, s.sets, t.sets ? +((s.sets / t.sets) * 100).toFixed(1) : 0, s.captured, transmitted(s), docsTotal(s.docs)]) },
      { title: "Confirmed sets per arrival day", header: ["Date", "Sets"], rows: rep.days.map((x) => [x.date, x.sets]) },
    ];
  if (kind === "payments")
    return [
      { title: `Payments · arrival dates ${label} · ${sec}`, header: ["Metric", "Value"], rows: [["Transactions", t.tx], ["Captured value (€)", t.captured], ["Service fees (€)", flow.serviceTotal], ...flow.serviceFees.map((f) => [`  ${f.name} (${f.units ?? ""} × ${f.rate})`, f.amount] as (string | number)[]), ["Platform fees (€)", flow.platformFees], ["VAT on platform fees (€)", flow.platformVat], ["Stripe / bank fees (€)", flow.stripeFees], ["Saved card transactions", t.saved], ["New card transactions", t.tx - t.saved]] },
      { title: "Stripe payouts", header: ["Date", "Bank", "Amount (€)", "Status"], rows: pay.map((p) => [p.date, p.bank, p.amount, p.status]) },
      { title: "Transactions per arrival day", header: ["Date", "Transactions", "Captured (€)"], rows: rep.days.map((x) => [x.date, x.tx, x.captured]) },
    ];
  const all = docsTotal(t.docs);
  return [
    { title: `Invoices · arrival dates ${label} · ${sec} · via ${d.cfg.provider}`, header: ["Type", "Count", "% of documents"], rows: [...DOC_TYPES.map((x) => [x.l, t.docs[x.k], all ? +((t.docs[x.k] / all) * 100).toFixed(1) : 0]), ["Transmitted", transmitted(t), all ? +((transmitted(t) / all) * 100).toFixed(1) : 0], ["Pending", t.pending, ""], ["Total", all, 100]] },
    { title: "By zone", header: ["Zone", ...DOC_TYPES.map((x) => x.l), "Transmitted", "Total"], rows: [...rep.sections, t].map((s) => [s.name, ...DOC_TYPES.map((x) => s.docs[x.k]), transmitted(s), docsTotal(s.docs)]) },
  ];
}

/** The tab as a report — the same content in PDF and CSV (AENR-593). */
export function financeExport(kind: "overview" | "payments" | "invoices", d: FinanceData, label: string, tenant: string): ReportDef {
  return csvSectionsToReport(
    { title: kind === "overview" ? "Finance overview" : kind === "payments" ? "Payments" : "Invoices & myDATA", subtitle: `${label} · zone: ${d.section ? sectionName(d.section) : "all"}`, meta: [`${tenant} · by arrival date`] },
    financeCsv(kind, d, label),
  );
}

/* ============ Accountant: read-only Payments & Invoices ============
   The same two reports as Admin › Reporting, for the accountant role. */
export function AccountantReports() {
  const { toast } = useApp();
  const [tab, setTab] = useState<"payments" | "invoices">("invoices");
  const [period, setPeriod] = usePeriod({ kind: "preset", preset: "month", offset: 0 });
  const range = useMemo(() => resolveRange(period) ?? resolveRange({ kind: "preset", preset: "season", offset: 0 })!, [period]);
  const label = rangeLabel(range);
  const [section, setSection] = useSection();
  const d = useFinanceData(range, section);
  const slug = `${tab}-${range.from}_${range.to}${section ? `-${section}` : ""}`;
  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Tabs tabs={[["invoices", "Invoices", Icon.receipt], ["payments", "Payments", Icon.card]]} value={tab} onChange={(v) => setTab(v as "payments" | "invoices")} />
        <Badge tone="slate">Read-only</Badge>
        <div className="flex gap-2 ml-auto">
          <ExportMenu variant="primary" what={tab} onExport={(f) => { downloadReport(slug, financeExport(tab, d, label, TENANT.name), f); toast(`Exported ${tab} (${label}, ${f.toUpperCase()}).`, { tone: "success" }); }} />
        </div>
      </div>
      <PeriodPicker value={period} onChange={setPeriod} presets={["day", "week", "month", "season"]} resetTo={{ kind: "preset", preset: "month", offset: 0 }} className="mb-3" />
      <div className="mb-4"><SectionChips value={section} onChange={setSection} /></div>
      {tab === "payments" ? <PaymentsTab d={d} /> : <InvoicesTab d={d} />}
    </div>
  );
}
