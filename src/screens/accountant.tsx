import { useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { Icon } from "../lib/icons";
import { Card, Btn, Badge, PageHead, Table, StatCard, Tabs, Modal, StatusBadge, TableSkeleton, useMockLoad } from "../components/ui";
import { Donut } from "../components/charts";
import { ACCOUNTANT_DOCS, ACCOUNTANT_PAYOUTS } from "../data/mock";
import { useApp } from "../app/store";
import type { AppContextValue } from "../app/store";
import { downloadCSV, downloadPDF } from "../lib/download";

type AccountantDoc = (typeof ACCOUNTANT_DOCS)[number];

const neg = (v: ReactNode) => <span className="text-rose-600 font-medium tnum">{v}</span>;
const negBold = (v: ReactNode) => <b className="text-rose-600 tnum">{v}</b>;

function CopyMark({ mark, toast }: { mark: string; toast?: AppContextValue["toast"] }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: ReactMouseEvent) => {
    e.stopPropagation();
    try { navigator.clipboard.writeText(mark); } catch { /* clipboard unavailable */ }
    setCopied(true);
    toast?.(`Copied MARK ${mark}.`, { tone: "success", duration: 1600 });
    setTimeout(() => setCopied(false), 1200);
  };
  // MARK codes are 15+ digits — show head…tail in the table to keep rows
  // tidy, with the full value in the native tooltip and in the toast.
  const short = mark.length > 12 ? `${mark.slice(0, 6)}…${mark.slice(-4)}` : mark;
  return (
    <button onClick={copy} title={`MARK ${mark} — click to copy`} className="inline-flex items-center gap-1.5 font-mono text-[12px] text-navy-900 hover:text-teal-700 group tnum">
      <span>{short}</span>
      <span className="opacity-50 group-hover:opacity-100 transition-opacity">{copied ? <Icon.check size={12} className="text-teal-600" /> : <Icon.doc size={12} />}</span>
    </button>
  );
}

/* ============ e-INVOICING & MyDATA ============ */
export function AccountantInvoicing() {
  const { toast } = useApp();
  const [tab, setTab] = useState("all");
  const [view, setView] = useState<AccountantDoc | null>(null);
  const docs = ACCOUNTANT_DOCS;
  const filtered = docs.filter((x) => tab === "all" || x.type === tab);
  const tone = (s: string) => (s.includes("✓") ? "green" : "amber");
  const loading = useMockLoad();
  const amountCell = (a: string) => (a.startsWith("−") ? neg(a) : a);
  return (
    <div className="animate-fade-up">
      <PageHead actions={<Btn variant="primary" icon={Icon.download} onClick={() => { downloadCSV("invoicing.csv", ["Document", "Type", "MARK", "Amount", "Status"], filtered.map((x) => [x.d, x.t, x.mark, x.amt, x.st])); toast(`Exported ${filtered.length} documents (CSV).`); }}>Export</Btn>} />
      <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-amber-50/70 ring-1 ring-amber-600/15 px-3.5 py-2.5 text-[12px] text-amber-800">
        <Icon.shieldAlert size={15} className="shrink-0 mt-0.5 text-amber-600" />
        <span className="leading-snug"><b>GDPR &amp; tax law:</b> issued ΑΠΥ/ΤΠΥ and their myDATA records are retained for <b>5 years</b> and are exempt from customer erasure requests — a legal-obligation basis overrides the right to be forgotten for these documents.</span>
      </div>
      <div className="grid sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Docs today" value="738" sub="726 ΑΠΥ · 12 ΤΠΥ" tone="teal" icon={Icon.receipt} />
        <StatCard label="Transmitted" value="100%" sub="to MyDATA" tone="teal" icon={Icon.checkCircle} />
        <StatCard label="Cancellations" value="4" icon={Icon.x} />
        <StatCard label="Credit notes" value="2" icon={Icon.refund} />
      </div>
      <Tabs tabs={[["all", "All"], ["issued", "Issued"], ["cancelled", "Cancellations"], ["credited", "Credit notes"]]} value={tab} onChange={setTab} className="mb-3" />
      <Card className="p-2">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : (
          <Table cols={["Document", "Type", "MARK", "Amount", "Status", ""]} right={[3]}
            rows={filtered.map((x) => [x.d, x.t, <CopyMark mark={x.mark} toast={toast} />, amountCell(x.amt), <StatusBadge status={x.st} />,
              <span className="flex gap-1 justify-end">
                <Btn size="sm" variant="ghost" icon={Icon.eye} onClick={() => setView(x)}>View</Btn>
                <Btn size="sm" variant="ghost" icon={Icon.download} onClick={() => { downloadPDF(`${x.d}.pdf`, accountantReceiptDoc(x)); toast(`Downloaded ${x.d}.pdf`, { tone: "success" }); }}>PDF</Btn>
              </span>])} />
        )}
      </Card>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.d} wide
        footer={<><Btn variant="ghost" onClick={() => setView(null)}>Close</Btn><Btn variant="primary" icon={Icon.download} onClick={() => { if (!view) return; downloadPDF(`${view.d}.pdf`, accountantReceiptDoc(view)); setView(null); toast(`Downloaded ${view.d}.pdf`); }}>Download PDF</Btn></>}>
        {view && (
          <div className="text-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div><div className="font-display font-bold text-navy-900 text-lg">{view.t}</div><div className="text-slate-600 text-[12px]">Akti tou Iliou ΑΕ · ΑΦΜ 123456789 · GR</div></div>
              <Badge tone={tone(view.st)}>{view.st}</Badge>
            </div>
            <Table cols={["Line", "Net", "VAT 24%", "Total"]} right={[1, 2, 3]} rows={[
              ["Sunbed booking", "€8.06", "€1.94", "€10.00"],
              ["Entry ticket", "€16.13", "€3.87", "€20.00"],
            ]} />
            <div className="flex justify-between mt-3 font-semibold text-navy-900"><span>Total gross</span><span className="tnum">€30.00</span></div>
            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[12px] text-slate-600 font-mono">MARK: {view.mark} · invoiceType 2.1 · payment 7 (Stripe online)</div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function accountantReceiptDoc(x: AccountantDoc) {
  const isCredit = x.t === "Credit note";
  const sign = x.amt.startsWith("−") ? "−" : "";
  return {
    title: "AKTI TOU ILIOU AE",
    subtitle: `${x.t} · ${x.d}`,
    meta: [
      "ΑΦΜ 123456789 · GR · payment 7 (Stripe online)",
      `MARK ${x.mark}`,
      `MyDATA status: ${x.st}`,
    ],
    table: {
      cols: ["Line", "Net", "VAT 24%", "Total"],
      rightCols: [1, 2, 3],
      rows: isCredit ? [
        ["Refund — sunbed booking", "−€8.06", "−€1.94", "−€10.00"],
        ["Refund — entry ticket",  "−€16.13", "−€3.87", "−€20.00"],
      ] : [
        ["Sunbed booking", "€8.06", "€1.94", "€10.00"],
        ["Entry ticket",   "€16.13", "€3.87", "€20.00"],
      ],
    },
    totals: [["Total gross", `${sign}€30.00`]],
    footer: [
      "Transmitted to AADE · MyDATA — invoiceType 2.1",
      "Slaice POS · cashier 7 · register 1",
    ],
  };
}

/* ============ COMMISSION & PAYOUTS ============ */
export function AccountantCommission() {
  const { toast } = useApp();
  const monthly = ACCOUNTANT_PAYOUTS;
  return (
    <div>
      <PageHead actions={<Btn variant="primary" icon={Icon.download} onClick={() => { downloadCSV("payouts.csv", ["Month", "Gross", "Stripe fee", "Slaice 5%", "Tenant net"], monthly); toast("Exported payout statement (CSV)."); }}>Export</Btn>} />
      <div className="grid sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Season gross" value="€704k" tone="teal" icon={Icon.chart} />
        <StatCard label="Stripe fees" value="−€10.2k" sub="~1.5%" icon={Icon.stripe} />
        <StatCard label="Slaice 5%" value="−€35.2k" sub="application fee" icon={Icon.trend} />
        <StatCard label="Tenant net" value="€658.6k" tone="teal" icon={Icon.cash} />
      </div>
      <Card className="p-5 mb-4">
        <div className="font-semibold text-navy-900 mb-2">Gross → net (this month)</div>
        <Table cols={["Line", "Amount"]} right={[1]} rows={[
          ["Gross sales", "€198,400"],
          ["Stripe fees", neg("−€2,900")],
          ["Slaice commission (5%)", neg("−€9,920")],
          [<b>Tenant net</b>, <b className="tnum">€185,580</b>],
        ]} />
      </Card>
      <Card className="p-5">
        <div className="font-semibold text-navy-900 mb-2">Monthly payouts (season)</div>
        <Table cols={["Month", "Gross", "Stripe fee", "Slaice 5%", "Tenant net"]} right={[1, 2, 3, 4]} rows={(() => {
          const sums = monthly.reduce((acc, r) => ({
            g: acc.g + parseInt(r[1].replace(/[^0-9]/g, ""), 10),
            sf: acc.sf + parseInt(r[2].replace(/[^0-9]/g, ""), 10),
            sl: acc.sl + parseInt(r[3].replace(/[^0-9]/g, ""), 10),
            n: acc.n + parseInt(r[4].replace(/[^0-9]/g, ""), 10),
          }), { g: 0, sf: 0, sl: 0, n: 0 });
          const fmt = (v: number) => "€" + v.toLocaleString();
          return [
            ...monthly.map((r) => [r[0], r[1], neg(r[2]), neg(r[3]), <b className="tnum">{r[4]}</b>]),
            [<b key="s">Season</b>, <b key="g" className="tnum">{fmt(sums.g)}</b>, negBold(`−${fmt(sums.sf)}`), negBold(`−${fmt(sums.sl)}`), <b key="tn" className="tnum">{fmt(sums.n)}</b>],
          ];
        })()} />
      </Card>

      {/* VAT, MyDATA health & payout reconciliation (P5.4) */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-2">VAT collected by rate</div>
          <Table cols={["Rate", "Net", "VAT"]} right={[1, 2]} rows={[
            ["24% (standard)", "€512,300", "€122,952"],
            ["13% (reduced F&B)", "€84,100", "€10,933"],
            ["6% (super-reduced)", "€7,400", "€444"],
            [<b>Total</b>, <b className="tnum">€603,800</b>, <b className="tnum">€134,329</b>],
          ]} />
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-2">myDATA transmission</div>
          <div className="flex items-center gap-4">
            <Donut segments={[{ v: 99.6, c: "#0D9488" }, { v: 0.4, c: "#f59e0b" }]} size={104} />
            <div className="text-sm space-y-1.5">
              <Leg c="bg-teal-600" t="Accepted 99.6%" />
              <Leg c="bg-amber-500" t="Retry queue 0.4%" />
              <div className="text-[12px] text-slate-500 pt-1">3 docs retrying · auto-resubmit</div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-2">Payout reconciliation</div>
          <div className="space-y-2 text-[13px]">
            <RecRow label="Stripe balance" value="€187,420" />
            <RecRow label="In transit to bank" value="€185,580" />
            <RecRow label="Fees withheld" value="−€1,840" neg />
            <RecRow label="Unreconciled" value="€0" ok />
          </div>
          <div className="mt-3 text-[11px] text-teal-700 bg-teal-50 ring-1 ring-teal-600/15 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5"><Icon.checkCircle size={13} /> Bank statement matched to the cent.</div>
        </Card>
      </div>
    </div>
  );
}

const Leg = ({ c, t }: { c: string; t: ReactNode }) => <div className="flex items-center gap-2 text-[13px] text-slate-700"><i className={`w-3 h-3 rounded-sm ${c} inline-block`} />{t}</div>;
const RecRow = ({ label, value, neg, ok }: { label?: ReactNode; value?: ReactNode; neg?: boolean; ok?: boolean }) => (
  <div className="flex items-center justify-between border-b border-slate-100 last:border-0 pb-1.5 last:pb-0">
    <span className="text-slate-600">{label}</span>
    <span className={`font-semibold tnum ${neg ? "text-rose-600" : ok ? "text-teal-700" : "text-navy-900"}`}>{value}</span>
  </div>
);
