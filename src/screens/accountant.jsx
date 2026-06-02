import { useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Card, Btn, Badge, PageHead, Table, StatCard, Tabs, Modal } from "../components/ui.jsx";
import { useApp } from "../app/store.jsx";
import { downloadCSV, downloadText } from "../lib/download.js";

/* ============ e-INVOICING & MyDATA ============ */
export function AccountantInvoicing() {
  const { toast } = useApp();
  const [tab, setTab] = useState("all");
  const [view, setView] = useState(null);
  const docs = [
    { d: "ΑΠΥ-2026-004281", t: "ΑΠΥ", mark: "400001…2281", amt: "€30", st: "MyDATA ✓", type: "issued" },
    { d: "ΑΠΥ-2026-004280", t: "ΑΠΥ", mark: "400001…2280", amt: "€25", st: "MyDATA ✓", type: "issued" },
    { d: "ΤΠΥ-2026-000118", t: "ΤΠΥ", mark: "400001…0118", amt: "€120", st: "MyDATA ✓", type: "issued" },
    { d: "ΑΚΥ-2026-000044", t: "Cancellation", mark: "400001…0044", amt: "−€30", st: "Issued", type: "cancelled" },
    { d: "ΠΙΣ-2026-000012", t: "Credit (5.1)", mark: "400001…0012", amt: "−€22", st: "MyDATA ✓", type: "credited" },
  ];
  const filtered = docs.filter((x) => tab === "all" || x.type === tab);
  const tone = (s) => (s.includes("✓") ? "green" : "amber");
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
        <Table cols={["Document", "Type", "MARK", "Amount", "Status", ""]} right={[3]}
          rows={filtered.map((x) => [x.d, x.t, <span className="font-mono text-[12px]">{x.mark}</span>, x.amt, <Badge tone={tone(x.st)}>{x.st}</Badge>,
            <span className="flex gap-1 justify-end">
              <Btn size="sm" variant="ghost" icon={Icon.eye} onClick={() => setView(x)}>View</Btn>
              <Btn size="sm" variant="ghost" icon={Icon.download} onClick={() => { downloadText(`${x.d}.txt`, mockReceiptText(x), "text/plain;charset=utf-8"); toast(`Downloaded ${x.d}.`); }}>PDF</Btn>
            </span>])} />
      </Card>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.d} wide
        footer={<><Btn variant="ghost" onClick={() => setView(null)}>Close</Btn><Btn variant="primary" icon={Icon.download} onClick={() => { downloadText(`${view.d}.txt`, mockReceiptText(view), "text/plain;charset=utf-8"); setView(null); toast(`Downloaded ${view.d}.`); }}>Download PDF</Btn></>}>
        {view && (
          <div className="text-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div><div className="font-display font-bold text-navy-900 text-lg">{view.t}</div><div className="text-slate-400 text-[12px]">Akti tou Iliou ΑΕ · ΑΦΜ 123456789 · GR</div></div>
              <Badge tone={tone(view.st)}>{view.st}</Badge>
            </div>
            <Table cols={["Line", "Net", "VAT 24%", "Total"]} right={[1, 2, 3]} rows={[
              ["Sunbed booking", "€8.06", "€1.94", "€10.00"],
              ["Entry ticket", "€16.13", "€3.87", "€20.00"],
            ]} />
            <div className="flex justify-between mt-3 font-semibold text-navy-900"><span>Total gross</span><span className="tnum">€30.00</span></div>
            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[12px] text-slate-500 font-mono">MARK: {view.mark} · invoiceType 2.1 · payment 7 (Stripe online)</div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function mockReceiptText(x) {
  return [
    "AKTI TOU ILIOU AE · GR · ΑΦΜ 123456789",
    `${x.t} ${x.d}`,
    `MARK: ${x.mark}`,
    `Amount: ${x.amt}`,
    `Status: ${x.st}`,
    "",
    "Net €8.06 · VAT 24% €1.94 · Total €10.00 — Sunbed",
    "Net €16.13 · VAT 24% €3.87 · Total €20.00 — Entry ticket",
    "",
    "Payment type 7 (Stripe online) · invoiceType 2.1",
    "Transmitted to AADE · MyDATA",
  ].join("\n");
}

/* ============ COMMISSION & PAYOUTS ============ */
export function AccountantCommission() {
  const { toast } = useApp();
  const monthly = [
    ["May", "€48,000", "−€700", "−€2,400", "€44,900"],
    ["Jun", "€121,000", "−€1,760", "−€6,050", "€113,190"],
    ["Jul", "€198,000", "−€2,880", "−€9,900", "€185,220"],
    ["Aug", "€241,000", "−€3,500", "−€12,050", "€225,450"],
  ];
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
          ["Gross sales", "€198,400"], ["Stripe fees", "−€2,900"], ["Slaice commission (5%)", "−€9,920"], [<b>Tenant net</b>, <b>€185,580</b>],
        ]} />
      </Card>
      <Card className="p-5">
        <div className="font-semibold text-navy-900 mb-2">Monthly payouts (season)</div>
        <Table cols={["Month", "Gross", "Stripe fee", "Slaice 5%", "Tenant net"]} right={[1, 2, 3, 4]} rows={[
          ...monthly,
          [<b key="s">Season</b>, <b key="g">€704,000</b>, <b key="sf">−€10,200</b>, <b key="sl">−€35,200</b>, <b key="tn">€658,600</b>],
        ]} />
      </Card>
    </div>
  );
}
