import { Icon } from "../lib/icons";
import { Badge, Btn, Card, EmptyState, PageHead, Table, ExportMenu } from "../components/ui";
import { usePlatform } from "../lib/usePlatform";
import { downloadReport, slaiceInvoice } from "../lib/download";
import { fmtDay } from "../domain/period";

/* ============ Billing & plan (AENR-558) ============
   The beach's own view of its Slaice subscription — the same tenant record
   Platform manages (AENR-517): plan and modules, what it pays, commission per
   channel, and Slaice's invoices to download. Plan changes go through Slaice. */

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

export function AdminBilling() {
  const { platform, plan, planName, mrr, toast } = usePlatform();
  const t = platform.tenants.find((x) => x.id === "akti") ?? platform.tenants[0];
  if (!t)
    return (
      <EmptyState
        icon={Icon.receipt}
        title="No subscription found"
        body="Contact Slaice support."
      />
    );
  const pv = plan(t);
  const open = t.invoices.filter((i) => i.status === "Open" || i.status === "Overdue");
  return (
    <div className="animate-fade-up space-y-4 max-w-5xl">
      <PageHead
        sub="Your Slaice subscription — plan, modules, commission and invoices."
        primary={
          <Btn
            variant="outline"
            icon={Icon.chat}
            onClick={() =>
              toast("Demo — request sent; your Slaice account manager will call you.", {
                tone: "success",
              })
            }
          >
            Request a plan change
          </Btn>
        }
      />
      {open.length > 0 && (
        <div
          role="alert"
          className="rounded-xl bg-amber-50 ring-1 ring-amber-600/20 px-3 py-2.5 text-[13px] text-amber-900 flex items-center gap-2"
        >
          <Icon.alert size={15} />{" "}
          <b>
            {open.length} invoice{open.length === 1 ? "" : "s"} to pay
          </b>{" "}
          — collected by SEPA Direct Debit on the due date.
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["Plan", planName(t)],
          ["You pay", `€${mrr(t)}/month`],
          ["Billing", t.billingCycle === "monthly" ? "Monthly" : "Seasonal"],
          ["Renews", fmtDay(t.renewal)],
        ].map(([l, v]) => (
          <Card key={l} surface="raised" className="p-4">
            <div className="text-[12px] text-slate-500">{l}</div>
            <div className="font-display text-lg font-bold text-navy-900">{v}</div>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <Card surface="raised" className="p-4">
          <h2 className="font-display font-bold text-navy-900 mb-2">Included modules</h2>
          <ul className="flex flex-wrap gap-1.5">
            {(pv?.modules ?? []).map((m) => (
              <li key={m}>
                <Badge tone="info">{m}</Badge>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-[13px] text-slate-600">
            Add-ons: €{t.addOns}/month · Payment method: SEPA Direct Debit ···6012
          </div>
        </Card>
        <Card surface="raised" className="p-4">
          <h2 className="font-display font-bold text-navy-900 mb-2">Commission per sale</h2>
          {pv ? (
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Online", pv.commission.online],
                ["Till", pv.commission.cashier],
                ["Passes", pv.commission.passes],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-xl bg-slate-50 py-2">
                  <dt className="text-[12px] text-slate-500">{l}</dt>
                  <dd className="font-display font-bold text-navy-900 tnum">{pct(v as number)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-[13px] text-slate-600">No plan version found.</p>
          )}
        </Card>
      </div>
      <Card className="p-2">
        <h2 className="px-2 pt-2 font-display font-bold text-navy-900">Invoices from Slaice</h2>
        {t.invoices.length === 0 ? (
          <EmptyState
            compact
            icon={Icon.receipt}
            title="No invoices yet"
            body="The first invoice is issued after go-live."
          />
        ) : (
          <Table
            cols={["Invoice", "Period", "Due", "Amount", "Status", ""]}
            right={[3]}
            rows={t.invoices.map((i) => [
              <span className="font-mono">{i.no}</span>,
              i.period,
              fmtDay(i.due),
              `€${i.amount}`,
              <Badge
                tone={
                  i.status === "Paid"
                    ? "success"
                    : i.status === "Overdue"
                      ? "critical"
                      : i.status === "Open"
                        ? "warning"
                        : "neutral"
                }
              >
                {i.status}
              </Badge>,
              <ExportMenu
                size="sm"
                variant="ghost"
                label="Download"
                what={i.no}
                onExport={(f) => downloadReport(i.no, slaiceInvoice(i, t, planName(t)), f)}
              />,
            ])}
          />
        )}
      </Card>
    </div>
  );
}
