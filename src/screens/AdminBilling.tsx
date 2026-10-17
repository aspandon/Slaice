import { Icon } from "../lib/icons";
import { Badge, Btn, Card, EmptyState, PageHead, Table, ExportMenu } from "../components/ui";
import { usePlatform } from "../lib/usePlatform";
import { fmtDay } from "../domain/period";
import { todayISO } from "../data/beach";
import { SERVICES, SERVICE_LABEL, eur, feeLabel, pct, rateLabel, subscriptionLabel, supportLabel, termsOf } from "../domain/economics";
import { invoiceDownload } from "./reporting/Statement";

/* ============ Billing & plan (AENR-558) ============
   The beach's own view of its Slaice subscription — the same tenant record
   Platform manages (AENR-517): plan and modules, what it pays, the commercial
   terms Slaice set (commission and minimums per service, guest service fee,
   corporate-tax rebill, support, subscription — AENR-725 / 689) and Slaice's
   invoices to download. Changes go through Slaice. */

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
  const terms = termsOf(t);
  const open = t.invoices.filter((i) => i.status === "Open" || i.status === "Overdue");
  return (
    <div className="animate-fade-up space-y-4 max-w-5xl">
      <PageHead
        sub="Your Slaice subscription — plan, modules, commercial terms and invoices."
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
          // This month on the beach's calendar — a seasonal subscription costs less off-season.
          ["You pay", `€${mrr(t, todayISO().slice(0, 7)).toLocaleString("en-GB")}/month`],
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
          <dl className="mt-3 space-y-1 text-[13px]">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Subscription</dt><dd className="text-right text-navy-900 font-medium">{subscriptionLabel(terms.subscription, pv?.price)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Support</dt><dd className="text-right text-navy-900 font-medium">{supportLabel(terms.support)}</dd></div>
          </dl>
        </Card>
        <Card surface="raised" className="p-4">
          <h2 className="font-display font-bold text-navy-900 mb-1">Commission &amp; guest fees</h2>
          <p className="text-[12.5px] text-slate-500 mb-2">On online bookings only. Commission is a share of the booking's total per service{terms.feesInBase ? " (guest fee included)" : ""}, or the minimum per booking.</p>
          <Table
            dense
            cols={["Service", "Commission", "Guest fee", "VAT"]}
            rows={SERVICES.map((s) => [SERVICE_LABEL[s], rateLabel(terms.services[s]), feeLabel(s, terms.services[s]), pct(terms.services[s].vat)])}
          />
          <p className="mt-2 text-[12px] text-slate-600">
            Guest fees are {terms.feeTo === "slaice" ? "kept by Slaice" : "yours"}. Each month Slaice re-bills the {pct(terms.corporateTax)} corporate tax on its commission — on {eur(1000)} of commission that is {eur(terms.corporateTax * 10)}.
          </p>
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
              i.month ? `${i.period} · month-end` : i.period,
              fmtDay(i.due),
              eur(i.amount),
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
                onExport={(f) => invoiceDownload(i, t, planName(t), f)}
              />,
            ])}
          />
        )}
      </Card>
    </div>
  );
}
