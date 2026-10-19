import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { Card, EmptyState } from "../../components/ui";
import { useApp } from "../../app/store";
import { readHashQuery, writeHashQuery } from "../../app/router";
import { DEMO_TODAY } from "../../domain/period";
import { seasonMonths } from "../../domain/monthEnd";
import { statementInvoice } from "../../data/economics";
import { downloadStatement } from "../../lib/slaiceInvoicePdf";
import { useIssueStatement, useSiteTenant, useTenantStatement } from "../../lib/useEconomics";
import { StatementView, statementDoc } from "../reporting/Statement";

/* ============ Accountant › Payments & payouts › Slaice statement (AENR-725 / 689) ============
   The month's bill from Slaice: commission per service (settled on each online
   payment), the guest service fees, subscription, add-ons, support and the
   corporate-tax rebill — and the month-end invoice, as PDF and CSV. A month in
   progress shows its figures to date; a complete month can be invoiced. */
export function SlaiceStatement() {
  const { toast } = useApp();
  const tenant = useSiteTenant();
  const months = useMemo(() => seasonMonths(DEMO_TODAY), []);
  const initial = readHashQuery().get("month");
  const [month, setMonthRaw] = useState(
    months.find((m) => m.month === initial)?.month ??
      (months.find((m) => !m.open) ?? months[0]).month,
  );
  const setMonth = (m: string) => {
    setMonthRaw(m);
    writeHashQuery({ month: m });
  };
  const st = useTenantStatement(tenant, month, DEMO_TODAY);
  const issue = useIssueStatement();
  const [issuing, setIssuing] = useState(false);
  if (!tenant || !st)
    return (
      <Card className="p-6">
        <EmptyState
          icon={Icon.receipt}
          title="No Slaice account found"
          body="This beach has no Slaice tenant record — contact Slaice support."
        />
      </Card>
    );
  const inv = statementInvoice(tenant, month);
  const doIssue = () => {
    setIssuing(true);
    // Demo: Slaice's month-end run issues the invoice; here it runs on request.
    window.setTimeout(() => {
      const i = issue(tenant, st, { today: DEMO_TODAY });
      downloadStatement(statementDoc(tenant, st, i), "pdf");
      toast(
        `Invoice ${i.no} for ${st.label} issued by Slaice — PDF downloaded. It is listed in Billing & plan too.`,
        { tone: "success" },
      );
      setIssuing(false);
    }, 900);
  };
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-slate-600 max-w-3xl">
        What Slaice charges {tenant.name} each month, from the commercial terms Slaice agreed with
        the beach. Commission is taken from each online payment by Stripe; the month-end invoice
        adds the subscription, support and the corporate tax on the commission.
      </p>
      <div role="group" aria-label="Month" className="flex flex-wrap gap-1.5">
        {months.map((m) => (
          <button
            key={m.month}
            type="button"
            aria-pressed={m.month === month}
            onClick={() => setMonth(m.month)}
            className={`min-h-[40px] rounded-xl px-3.5 py-2 text-[13px] font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${m.month === month ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-400"}`}
          >
            {m.label}
            {m.open && (
              <span
                className={`ml-1.5 text-[11px] font-normal ${m.month === month ? "text-white/75" : "text-slate-500"}`}
              >
                in progress
              </span>
            )}
            {statementInvoice(tenant, m.month) && (
              <>
                <Icon.check
                  size={13}
                  aria-hidden
                  className={`inline ml-1.5 ${m.month === month ? "text-teal-300" : "text-teal-600"}`}
                />
                <span className="sr-only"> · invoiced</span>
              </>
            )}
          </button>
        ))}
      </div>
      <StatementView
        st={st}
        tenant={tenant}
        inv={inv}
        onIssue={doIssue}
        issuing={issuing}
        onExport={(f) => {
          downloadStatement(statementDoc(tenant, st, inv), f);
          toast(
            `${inv ? `Invoice ${inv.no}` : `${st.label} statement`} (${f.toUpperCase()}) downloaded.`,
            { tone: "success" },
          );
        }}
        note={
          !inv && !st.open && st.live
            ? "Demo — Slaice issues the invoice when the month closes; Issue invoice runs that step now."
            : undefined
        }
      />
    </div>
  );
}
