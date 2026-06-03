import { useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Card, Btn, Badge, PageHead, Table, StatCard, Tabs, Modal, StatusBadge, TableSkeleton, useMockLoad } from "../components/ui.jsx";
import { ACCOUNTANT_DOCS, ACCOUNTANT_PAYOUTS } from "../data/mock.js";
import { useApp } from "../app/store.jsx";
import { downloadCSV, downloadPDF } from "../lib/download.js";

const neg = (v) => <span className="text-rose-600 font-medium tnum">{v}</span>;
const negBold = (v) => <b className="text-rose-600 tnum">{v}</b>;

function CopyMark({ mark, toast }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    try { navigator.clipboard.writeText(mark); } catch {}
    setCopied(true);
    toast?.(`Copied MARK ${mark}.`, { tone: "success", duration: 1600 });
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <button onClick={copy} title="Copy MARK to clipboard" className="inline-flex items-center gap-1.5 font-mono text-[12px] text-navy-900 hover:text-teal-700 group tnum">
      <span>{mark}</span>
      <span className="opacity-50 group-hover:opacity-100 transition-opacity">{copied ? <Icon.check size={12} className="text-teal-600" /> : <Icon.doc size={12} />}</span>
    </button>
  );
}

/* ============ e-INVOICING & MyDATA ============ */
export function AccountantInvoicing() {
  const { toast } = useApp();
  const [tab, setTab] = useState("all");
  const [view, setView] = useState(null);
  const docs = ACCOUNTANT_DOCS;
  const filtered = docs.filter((x) => tab === "all" || x.type === tab);
  const tone = (s) => (s.includes("✓") ? "green" : "amber");
  const loading = useMockLoad();
  const amountCell = (a) => (a.startsWith("−") ? neg(a) : a);
  return (
    <div className="animate-fade-up">
      <PageHead actions={<Btn variant="primary" icon={Icon.download} onClick={() => { downloadCSV("invoicing.csv", ["Document", "Type", "MARK", "Amount", "Status"], filtered.map((x) => [x.d, x.t, x.mark, x.amt, x.st])); toast(`Exported ${filtered.length} documents (CSV).`); }}>Export</Btn>} />
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
        footer={<><Btn variant="ghost" onClick={() => setView(null)}>Close</Btn><Btn variant="primary" icon={Icon.download} onClick={() => { downloadPDF(`${view.d}.pdf`, accountantReceiptDoc(view)); setView(null); toast(`Downloaded ${view.d}.pdf`); }}>Download PDF</Btn></>}>
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

function accountantReceiptDoc(x) {
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
          const fmt = (v) => "€" + v.toLocaleString();
          return [
            ...monthly.map((r) => [r[0], r[1], neg(r[2]), neg(r[3]), <b className="tnum">{r[4]}</b>]),
            [<b key="s">Season</b>, <b key="g" className="tnum">{fmt(sums.g)}</b>, negBold(`−${fmt(sums.sf)}`), negBold(`−${fmt(sums.sl)}`), <b key="tn" className="tnum">{fmt(sums.n)}</b>],
          ];
        })()} />
      </Card>
    </div>
  );
}
