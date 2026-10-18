import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import { Card, PageHead, Table, StatCard, ExportMenu } from "../components/ui";
import { Donut } from "../components/charts";
import { summarize } from "../data/analytics";
import { DEMO_TODAY } from "../domain/period";
import { useMemo } from "react";
import { useApp } from "../app/store";
import { downloadReport } from "../lib/download";
import { rateLabel, termsOf } from "../domain/economics";
import { tenantStatement } from "../data/economics";
import { useSiteTenant, useStatementOpts } from "../lib/useEconomics";

import { TENANT } from "../data/beach";
const neg = (v: ReactNode) => <span className="text-rose-600 font-medium tnum">{v}</span>;
const negBold = (v: ReactNode) => <b className="text-rose-600 tnum">{v}</b>;

/* Commission & payouts from the same figures as Reports and Month-end (AENR-643):
   season months up to the demo day, the current month to date, nothing in the future.
   The Slaice commission is the beach's commercial terms applied to its online
   bookings, minimums included (AENR-725) — the same figure as the Slaice statement. */
const STRIPE_RATE = 0.015;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
interface PayoutMonth {
  label: string;
  gross: number;
  stripe: number;
  slaice: number;
  /** Guest service fees, when the beach keeps them (they are paid on top of its prices). */
  fees: number;
  net: number;
  open: boolean;
}
function payoutMonths(commission: (month: string) => { commission: number; fees: number }, feesToTenant: boolean): PayoutMonth[] {
  const y = Number(DEMO_TODAY.slice(0, 4));
  const out: PayoutMonth[] = [];
  for (let m = 5; m <= 9; m++) {
    const month = `${y}-${String(m).padStart(2, "0")}`;
    const from = `${month}-01`;
    if (from > DEMO_TODAY) break;
    const last = new Date(y, m, 0).getDate();
    const end = `${month}-${last}`;
    const to = end > DEMO_TODAY ? DEMO_TODAY : end;
    const gross = Math.round(summarize({ from, to }).revenue);
    const stripe = Math.round(gross * STRIPE_RATE);
    const c = commission(month);
    const slaice = Math.round(c.commission);
    const fees = feesToTenant ? Math.round(c.fees) : 0;
    out.push({ label: MONTHS[m - 1] + (to < end ? " (to date)" : ""), gross, stripe, slaice, fees, net: gross - stripe - slaice + fees, open: to < end });
  }
  return out;
}
const eurK = (n: number) => `€${(n / 1000).toFixed(1)}k`;
const eurN = (n: number) => `€${n.toLocaleString("en-GB")}`;

export function AccountantCommission({ lead }: { lead?: ReactNode } = {}) {
  const { toast } = useApp();
  const tenant = useSiteTenant();
  const opts = useStatementOpts(DEMO_TODAY);
  const terms = termsOf(tenant);
  const feesToTenant = terms.feeTo === "tenant";
  const monthly = useMemo(
    () =>
      payoutMonths((month) => {
        const st = tenant ? tenantStatement(tenant, month, opts(tenant)) : null;
        return { commission: st?.totals.commission ?? 0, fees: st?.totals.guestFees ?? 0 };
      }, feesToTenant),
    [tenant, opts, feesToTenant],
  );
  const sum = monthly.reduce((a, r) => ({ g: a.g + r.gross, sf: a.sf + r.stripe, sl: a.sl + r.slaice, f: a.f + r.fees, n: a.n + r.net }), { g: 0, sf: 0, sl: 0, f: 0, n: 0 });
  const cur = monthly[monthly.length - 1];
  const rule = `sunbeds ${rateLabel(terms.services.sunbeds)}, entry tickets ${rateLabel(terms.services.tickets)} per online booking`;
  return (
    <div>
      <PageHead lead={lead} primary={<ExportMenu variant="primary" what="payout statement" onExport={(f) => {
        downloadReport("payouts", {
          title: "Commission & payouts",
          subtitle: `Season ${DEMO_TODAY.slice(0, 4)} · by month, to ${DEMO_TODAY}`,
          meta: [`${TENANT.name} · Stripe Connect direct charges; the Slaice commission (${rule}) is the application fee`],
          sections: [
            { kpis: [{ label: "Season gross", value: eurK(sum.g) }, { label: "Stripe fees", value: `−${eurK(sum.sf)}`, sub: "~1.5%" }, { label: "Slaice commission", value: `−${eurK(sum.sl)}`, sub: "online bookings, minimums applied" }, { label: "Tenant net", value: eurK(sum.n) }] },
            { title: "Payout statement", table: {
              cols: ["Month", "Gross (€)", "Stripe fee (€)", "Slaice commission (€)", ...(feesToTenant ? ["Guest fees (€)"] : []), "Tenant net (€)"],
              rows: monthly.map((r) => [r.label, r.gross, -r.stripe, -r.slaice, ...(feesToTenant ? [r.fees] : []), r.net]),
              total: ["Total", sum.g, -sum.sf, -sum.sl, ...(feesToTenant ? [sum.f] : []), sum.n],
            } },
          ],
        }, f);
        toast(`Exported payout statement (${f.toUpperCase()}).`);
      }} />} />
      <div className="grid sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Season gross" value={eurK(sum.g)} sub="same as Reports" tone="teal" icon={Icon.chart} />
        <StatCard label="Stripe fees" value={`−${eurK(sum.sf)}`} sub="~1.5%" icon={Icon.stripe} />
        <StatCard label="Slaice commission" value={`−${eurK(sum.sl)}`} sub="online bookings · application fee" icon={Icon.trend} />
        <StatCard label="Tenant net" value={eurK(sum.n)} tone="teal" icon={Icon.cash} />
      </div>
      {cur && (
        <Card className="p-5 mb-4">
          <div className="font-semibold text-navy-900 mb-2">Gross → net ({cur.label})</div>
          <Table cols={["Line", "Amount"]} right={[1]} rows={[
            ["Gross sales", eurN(cur.gross)],
            ["Stripe fees", neg(`−${eurN(cur.stripe)}`)],
            ["Slaice commission", neg(`−${eurN(cur.slaice)}`)],
            ...(feesToTenant ? [["Guest service fees (kept by the beach)", `+${eurN(cur.fees)}`]] : []),
            [<b>Tenant net</b>, <b className="tnum">{eurN(cur.net)}</b>],
          ]} />
          <p className="mt-2 text-[12px] text-slate-500">
            Commission from the commercial terms Slaice set for {TENANT.name}: {rule}. The month-end invoice adds the corporate tax on it — see the Slaice statement tab.
          </p>
        </Card>
      )}
      <Card className="p-5">
        <div className="font-semibold text-navy-900 mb-2">Monthly payouts (season to date)</div>
        <Table cols={["Month", "Gross", "Stripe fee", "Slaice commission", "Tenant net", "Payout"]} right={[1, 2, 3, 4]} rows={[
          ...monthly.map((r) => [r.label, eurN(r.gross), neg(`−${eurN(r.stripe)}`), neg(`−${eurN(r.slaice)}`), <b className="tnum">{eurN(r.net)}</b>, r.open ? "Weekly, in progress" : "Paid"]),
          [<b key="s">Season</b>, <b key="g" className="tnum">{eurN(sum.g)}</b>, negBold(`−${eurN(sum.sf)}`), negBold(`−${eurN(sum.sl)}`), <b key="tn" className="tnum">{eurN(sum.n)}</b>, ""],
        ]} />
      </Card>

      {/* VAT, MyDATA health & payout reconciliation (P5.4) */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-2">VAT collected by rate</div>
          {/* From the season gross with the ledger's rate mix (sunbeds 24%, entry and F&B 13%). */}
          {(() => {
            const net = sum.g / (1 + 0.68 * 0.24 + 0.32 * 0.13);
            const r24 = Math.round(net * 0.68), r13 = Math.round(net * 0.32);
            const v24 = Math.round(r24 * 0.24), v13 = Math.round(r13 * 0.13);
            return <Table cols={["Rate", "Net", "VAT"]} right={[1, 2]} rows={[
              ["24% (standard)", eurN(r24), eurN(v24)],
              ["13% (reduced)", eurN(r13), eurN(v13)],
              [<b>Total</b>, <b className="tnum">{eurN(r24 + r13)}</b>, <b className="tnum">{eurN(v24 + v13)}</b>],
            ]} />;
          })()}
        </Card>
        <Card className="p-5 flex flex-col">
          <div className="font-semibold text-navy-900 mb-2">myDATA transmission</div>
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-1">
            <Donut segments={[{ v: 99.6, c: "#0D9488" }, { v: 0.4, c: "#f59e0b" }]} total="99.6%" totalLabel="accepted" label="myDATA: 99.6% accepted, 0.4% in the retry queue" className="w-40 sm:w-44 lg:w-52 aspect-square max-w-full" />
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
            <RecRow label="Stripe balance" value={eurN((cur?.net ?? 0) + (cur?.stripe ?? 0))} />
            <RecRow label="In transit to bank" value={eurN(cur?.net ?? 0)} />
            <RecRow label="Fees withheld" value={`−${eurN(cur?.stripe ?? 0)}`} neg />
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
