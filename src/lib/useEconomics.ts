import { useCallback, useMemo } from "react";
import { useApp } from "../app/store";
import { DEMO_TODAY } from "../domain/period";
import {
  eur,
  invoiceDue,
  statementInvoiceNo,
  termsOf,
  type CommercialTerms,
  type MonthStatement,
} from "../domain/economics";
import type { Invoice, TenantRecord } from "../domain/tenants";
import { tenantStatement, type StatementOpts } from "../data/economics";

/* ============ Commercial terms in the app (AENR-725 / 689) ============
   The tenant the demo personas represent (platform.siteTenant) is the one the
   guest books with and the beach's staff report on — the same store the
   Platform edits, so a change to its terms shows at once on every role. */

/** The tenant the customer, cashier, manager and accountant personas represent. */
export function useSiteTenant(): TenantRecord | undefined {
  const { platform } = useApp();
  return (
    platform.tenants.find((x) => x.id === platform.siteTenant) ??
    platform.tenants.find((x) => x.id === "akti")
  );
}
/** That tenant's commercial terms (defaults when it has none yet) — the same object until they change. */
export function useSiteTerms(): CommercialTerms {
  const tenant = useSiteTenant();
  return useMemo(() => termsOf(tenant), [tenant]);
}

/** Statement options for a viewer: the tenant's staff run on the demo day, the Platform on its own clock.
 *  The guest's demo bookings belong to the site tenant only. */
export function useStatementOpts(today: string = DEMO_TODAY): (t: TenantRecord) => StatementOpts {
  const { platform, account } = useApp();
  return useCallback(
    (t: TenantRecord) => ({
      plans: platform.plans,
      today,
      placed: t.id === platform.siteTenant ? account.bookings : undefined,
    }),
    [platform.plans, platform.siteTenant, account.bookings, today],
  );
}
/** A tenant's month, as the given viewer sees it. */
export function useTenantStatement(
  t: TenantRecord | undefined,
  month: string,
  today: string = DEMO_TODAY,
): MonthStatement | null {
  const opts = useStatementOpts(today);
  return useMemo(() => (t ? tenantStatement(t, month, opts(t)) : null), [t, month, opts]);
}

/** Issue a month-end invoice from Slaice to a tenant (demo: Slaice's month-end run is simulated). It is
 *  recorded on the tenant's Slaice invoices — Billing & plan and Platform › Subscription & billing — with
 *  the statement as issued, and written to the tenant's Audit log. `today` is the issuer's calendar day
 *  (the demo day on the tenant side, the real date on the Platform); it is due 14 days later. */
export function useIssueStatement() {
  const { setPlatform } = useApp();
  return useCallback(
    (t: TenantRecord, st: MonthStatement, o: { today: string; actor?: string }): Invoice => {
      const at = new Date().toISOString();
      const actor = o.actor ?? "Slaice billing · month-end run";
      const inv: Invoice = {
        no: statementInvoiceNo(t.id, st.month),
        period: st.label,
        amount: st.totals.due,
        status: "Open",
        due: invoiceDue(o.today),
        month: st.month,
        issued: `${o.today}T${at.slice(11, 16)}`,
        statement: st,
      };
      setPlatform((p) => ({
        ...p,
        tenants: p.tenants.map((x) =>
          x.id !== t.id || x.invoices.some((i) => i.month === st.month)
            ? x
            : {
                ...x,
                invoices: [inv, ...x.invoices],
                audit: [
                  {
                    id: `au-${Date.now().toString(36)}-inv`,
                    at,
                    actor,
                    actorType: "System",
                    section: "Subscription & billing",
                    change: `Month-end invoice ${inv.no} issued · ${st.label} · ${eur(inv.amount)} due`,
                  },
                  ...x.audit,
                ],
              },
        ),
      }));
      return inv;
    },
    [setPlatform],
  );
}
