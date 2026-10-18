import type { ReactNode } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, EmptyState, ExportMenu, Table } from "../../components/ui";
import { fmtDateGB } from "../../components/ui/DateInput";
import { downloadReport, slaiceInvoice } from "../../lib/download";
import { downloadStatement, statementLines, type StatementDoc } from "../../lib/slaiceInvoicePdf";
import {
  SERVICE_LABEL,
  eur,
  pct,
  rateLabel,
  statementInvoiceNo,
  type MonthStatement,
  channelNoun,
} from "../../domain/economics";
import type { Invoice, TenantRecord } from "../../domain/tenants";

/* ============ The monthly Slaice statement (AENR-725 / 689) ============
   One view for the accountant (their beach) and the Platform (any tenant):
   commission per service with the minimums applied, the guest service fees,
   the month's subscription / add-ons / support, the corporate-tax rebill and
   what the invoice asks for once the commission already settled through
   Stripe is taken off. Staff only — the guest never sees any of it. */

const int = (n: number) => Math.round(n).toLocaleString("en-GB");

/** The document behind the PDF / CSV — the issued invoice's snapshot, or a draft of the live statement. */
export function statementDoc(t: TenantRecord, st: MonthStatement, inv?: Invoice): StatementDoc {
  const s = inv?.statement ?? st;
  return {
    no: inv?.no ?? statementInvoiceNo(t.id, s.month),
    issued: inv?.issued,
    due: inv?.due,
    status: inv?.status,
    tenant: {
      name: t.name,
      legalName: t.legalName,
      vatNo: t.vatNo,
      address: t.address,
      billingEmail: t.contacts.find((c) => c.role === "billing")?.email,
    },
    statement: s,
  };
}
/** Download any Slaice invoice: a month-end invoice as issued, a subscription invoice (AENR-517) as before. */
export function invoiceDownload(i: Invoice, t: TenantRecord, planLabel: string, f: "pdf" | "csv") {
  if (i.statement) downloadStatement(statementDoc(t, i.statement, i), f);
  else downloadReport(i.no, slaiceInvoice(i, t, planLabel), f);
}

export type StatementState = "notLive" | "open" | "ready" | "issued";
export const statementState = (st: MonthStatement, inv?: Invoice): StatementState =>
  inv ? "issued" : !st.live ? "notLive" : st.open ? "open" : "ready";
export function StatementBadge({ st, inv }: { st: MonthStatement; inv?: Invoice }) {
  const s = statementState(st, inv);
  if (s === "issued" && inv)
    return (
      <Badge
        tone={inv.status === "Paid" ? "success" : inv.status === "Overdue" ? "critical" : "info"}
      >
        <Icon.doc size={11} /> {inv.no} · {inv.status}
      </Badge>
    );
  if (s === "open")
    return (
      <Badge tone="warning">
        <Icon.clock size={11} /> In progress
      </Badge>
    );
  if (s === "ready")
    return (
      <Badge tone="info">
        <Icon.receipt size={11} /> Ready to issue
      </Badge>
    );
  return <Badge tone="neutral">Not live</Badge>;
}

export function StatementView({
  st,
  tenant,
  inv,
  onIssue,
  issuing,
  onExport,
  note,
}: {
  st: MonthStatement;
  tenant: TenantRecord;
  inv?: Invoice;
  /** Shown only when the month can be invoiced (complete, not issued yet). */
  onIssue?: () => void;
  issuing?: boolean;
  onExport: (format: "pdf" | "csv") => void;
  note?: ReactNode;
}) {
  // An issued invoice shows the figures as issued; the live statement shows today's.
  const s = inv?.statement ?? st;
  const state = statementState(st, inv);
  const used = s.usage.services.filter((x) => x.bookings > 0.0001 || x.commission > 0);
  const lines = statementLines(s).filter((l) => !l.title.startsWith("Commission"));
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
              Slaice → {tenant.name}
            </div>
            <h2 className="font-display font-bold text-navy-900 text-xl">{s.label}</h2>
            <p className="text-[13px] text-slate-500">
              {state === "notLive"
                ? `${tenant.name} was not live yet.`
                : state === "open"
                  ? `Month to date · up to ${fmtDateGB(st.to)} — the invoice is issued after the month ends.`
                  : state === "issued" && inv
                    ? `Issued ${fmtDateGB((inv.issued ?? "").slice(0, 10))} · due ${fmtDateGB(inv.due)} by SEPA Direct Debit`
                    : `Complete month · ${fmtDateGB(s.from)} – ${fmtDateGB(s.to)}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatementBadge st={st} inv={inv} />
            <ExportMenu
              size="sm"
              what={`${s.label} Slaice ${inv ? "invoice" : "statement"}`}
              label={inv ? "Invoice" : "Statement"}
              onExport={onExport}
            />
            {state === "ready" && onIssue && (
              <Btn
                size="sm"
                variant="primary"
                icon={Icon.receipt}
                loading={issuing}
                onClick={onIssue}
              >
                Issue invoice
              </Btn>
            )}
          </div>
        </div>
        {note && <div className="mt-2 text-[12px] text-slate-500">{note}</div>}
        <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Fact
            k="Commission"
            v={eur(s.totals.commission)}
            sub={`${int(s.usage.bookings)} ${channelNoun(s.terms, Math.round(s.usage.bookings) === 1)} · settled at payment`}
          />
          <Fact
            k="Monthly charges"
            v={eur(s.totals.recurring)}
            sub={
              s.recurringInvoiced
                ? `support · subscription on ${s.recurringInvoiced}`
                : "subscription, add-ons, support"
            }
          />
          <Fact
            k={`Corporate tax · ${pct(s.corporateTax.rate)}`}
            v={eur(s.totals.corporateTax)}
            sub={`on ${eur(s.corporateTax.base)} ${s.terms.taxBase === "commissionAndFees" ? "commission + kept fees" : "commission"}`}
          />
          <Fact
            k={state === "issued" ? "Amount due" : "Balance"}
            v={eur(s.totals.due)}
            sub={`invoice ${eur(s.totals.invoiceTotal)} − ${eur(s.totals.settled)} settled`}
            strong
          />
        </dl>
      </Card>

      <Card className="p-2">
        <h3 className="px-3 pt-3 font-semibold text-navy-900">Commission on {channelNoun(s.terms)}</h3>
        <p className="px-3 pb-2 text-[12.5px] text-slate-500">
          Each booking pays the rate on its total per service, VAT included
          {s.terms.feesInBase ? ", guest fees included" : ""} — or the minimum when the rate gives
          less.
        </p>
        {used.length === 0 ? (
          <EmptyState
            compact
            icon={Icon.umbrella}
            title={`No ${channelNoun(s.terms)} this month`}
            body={
              st.live
                ? "Nothing was booked online, so there is no commission — the monthly charges still apply."
                : "The tenant went live later."
            }
          />
        ) : (
          <Table
            dense
            cols={[
              "Service",
              "Bookings",
              "Online sales",
              "Guest fees",
              "Base",
              "Rate · min",
              "At minimum",
              "Commission",
            ]}
            right={[1, 2, 3, 4, 6, 7]}
            rows={[
              ...used.map((x) => [
                <b className="text-navy-900">{SERVICE_LABEL[x.service]}</b>,
                int(x.bookings),
                eur(x.gross),
                eur(x.fees),
                eur(x.base),
                rateLabel(s.terms.services[x.service]),
                int(x.atMin),
                <b className="tnum">{eur(x.commission)}</b>,
              ]),
              [
                <b>Total</b>,
                <b>{int(s.usage.bookings)}</b>,
                <b>{eur(s.usage.gross)}</b>,
                <b>{eur(s.usage.fees)}</b>,
                "",
                "",
                "",
                <b className="tnum">{eur(s.usage.commission)}</b>,
              ],
            ]}
          />
        )}
      </Card>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <Card className="p-2">
          <h3 className="px-3 pt-3 pb-1 font-semibold text-navy-900">Monthly charges &amp; tax</h3>
          <Table
            dense
            cols={["Line", "Detail", "Amount"]}
            right={[2]}
            rows={lines.map((l) => [
              <b className="text-navy-900">{l.title}</b>,
              <span className="text-slate-600">{l.detail}</span>,
              <span className="tnum font-semibold">{eur(l.amount)}</span>,
            ])}
          />
        </Card>
        <Card className="p-5" surface="raised">
          <h3 className="font-semibold text-navy-900 mb-2">
            {state === "issued" ? "Invoice" : "If invoiced now"}
          </h3>
          <Row l="Monthly charges" v={eur(s.totals.recurring)} />
          <Row l="Commission" v={eur(s.totals.commission)} />
          <Row
            l={`Corporate tax re-billed (${pct(s.corporateTax.rate)})`}
            v={eur(s.totals.corporateTax)}
          />
          <div className="h-px bg-slate-200 my-1.5" />
          <Row l="Invoice total" v={eur(s.totals.invoiceTotal)} bold />
          <Row l="Commission settled via Stripe" v={eur(-s.totals.settled)} />
          <div className="mt-2 rounded-xl bg-navy-900 text-white px-3 py-2.5 flex items-baseline justify-between gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-wider">
              {state === "issued" ? "Amount due" : "Balance"}
            </span>
            <span className="font-display text-xl font-bold tnum">{eur(s.totals.due)}</span>
          </div>
          <div className="mt-3 rounded-xl bg-teal-50/70 ring-1 ring-teal-600/15 px-3 py-2 text-[12px] text-teal-900 leading-snug">
            <b>Guest service fees {eur(s.totals.guestFees)}</b> —{" "}
            {s.totals.guestFees > 0
              ? s.feeTo === "slaice"
                ? "paid by guests at checkout and kept by Slaice; not charged to the beach."
                : "paid by guests at checkout and kept by the beach."
              : "none this month."}
          </div>
          <div className="mt-2 text-[12px] text-slate-500">
            Slaice revenue this month{" "}
            <b className="text-navy-900 tnum">{eur(s.totals.slaiceRevenue)}</b> (commission, fees
            kept, subscription, add-ons, support).
          </div>
        </Card>
      </div>
    </div>
  );
}

const Row = ({ l, v, bold }: { l: ReactNode; v: ReactNode; bold?: boolean }) => (
  <div
    className={`flex items-baseline justify-between gap-3 py-0.5 text-[13px] ${bold ? "font-bold text-navy-900" : "text-slate-600"}`}
  >
    <span className="min-w-0">{l}</span>
    <span className="tnum shrink-0">{v}</span>
  </div>
);

function Fact({ k, v, sub, strong }: { k: string; v: string; sub: string; strong?: boolean }) {
  return (
    <div
      className={`rounded-xl ring-1 px-3.5 py-3 ${strong ? "ring-navy-900/25 bg-slate-50" : "ring-slate-200 bg-white"}`}
    >
      <dt className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{k}</dt>
      <dd className="font-display font-bold text-navy-900 text-xl tnum mt-0.5">{v}</dd>
      <dd className="text-[12px] text-slate-500 mt-0.5">{sub}</dd>
    </div>
  );
}
