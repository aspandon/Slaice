import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import { Card, Btn, PageHead, Table, StatCard } from "../components/ui";
import { Donut } from "../components/charts";
import { ACCOUNTANT_PAYOUTS } from "../data/mock";
import { useApp } from "../app/store";
import { downloadCSV } from "../lib/download";

const neg = (v: ReactNode) => <span className="text-rose-600 font-medium tnum">{v}</span>;
const negBold = (v: ReactNode) => <b className="text-rose-600 tnum">{v}</b>;

export function AccountantCommission() {
  const { toast } = useApp();
  const monthly = ACCOUNTANT_PAYOUTS;
  return (
    <div>
      <PageHead primary={<Btn variant="primary" icon={Icon.download} onClick={() => { downloadCSV("payouts.csv", ["Month", "Gross", "Stripe fee", "Slaice 5%", "Tenant net"], monthly); toast("Exported payout statement (CSV)."); }}>Export</Btn>} />
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
        <Card className="p-5 flex flex-col">
          <div className="font-semibold text-navy-900 mb-2">myDATA transmission</div>
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-1">
            <Donut segments={[{ v: 99.6, c: "#0D9488" }, { v: 0.4, c: "#f59e0b" }]} className="w-40 sm:w-44 lg:w-52 aspect-square max-w-full" />
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="flex items-center gap-4 text-[13px]">
                <Leg c="bg-teal-600" t="Accepted 99.6%" />
                <Leg c="bg-amber-500" t="Retry queue 0.4%" />
              </div>
              <div className="text-[12px] text-slate-500">3 docs retrying · auto-resubmit</div>
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
