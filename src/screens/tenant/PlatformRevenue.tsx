import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import {
  Btn,
  Card,
  Drawer,
  EmptyState,
  ExportMenu,
  PageHead,
  StatCard,
  Table,
} from "../../components/ui";
import { usePlatform } from "../../lib/usePlatform";
import { useUrlState } from "../../lib/useUrlState";
import { useUndoToast } from "../../lib/useUndo";
import { downloadReport } from "../../lib/download";
import { downloadStatement } from "../../lib/slaiceInvoicePdf";
import { useIssueStatement, useStatementOpts } from "../../lib/useEconomics";
import { seasonMonths } from "../../domain/monthEnd";
import { eur } from "../../domain/economics";
import { seasonToDate, statementInvoice, tenantStatement } from "../../data/economics";
import { fmtEUR } from "../../data/analytics";
import {
  StatementBadge,
  StatementView,
  statementDoc,
  statementState,
} from "../reporting/Statement";

/* ============ Platform › Revenue & invoicing (AENR-725 / 689) ============
   What Slaice earns from every tenant — commission, the guest fees it keeps,
   subscriptions, add-ons and support — for a month and the season so far, and
   the month-end invoices: each tenant's statement opens beside the list, a
   complete month can be invoiced one by one or all at once. Runs on the
   Platform's own (real) calendar. */

/** Tiles abbreviate like every report tile (€842 · €12.4k); the full figure shows on hover (AENR-582). */
const eurK = (n: number) => fmtEUR(n);
const int = (n: number) => Math.round(n).toLocaleString("en-GB");

export function PlatformRevenue() {
  const { platform, setPlatform, today, toast } = usePlatform();
  const opts = useStatementOpts(today);
  const issue = useIssueStatement();
  const undo = useUndoToast();
  const months = useMemo(() => seasonMonths(today), [today]);
  const fallback = (months.find((m) => !m.open) ?? months[0])?.month ?? today.slice(0, 7);
  const [monthRaw, setMonth] = useUrlState("month", fallback);
  const month = months.some((m) => m.month === monthRaw) ? monthRaw : fallback;
  const ref = months.find((m) => m.month === month);
  const [openId, setOpenId] = useState<string | null>(null);
  // Tenants Slaice bills: live at some point (a go-live date), not closed; sandbox / demo only when switched on.
  const rows = useMemo(
    () =>
      platform.tenants
        .filter(
          (t) =>
            !!t.goLive && t.lifecycle !== "closed" && (platform.includeSandbox || t.env === "live"),
        )
        .map((t) => {
          const o = opts(t);
          return {
            t,
            st: tenantStatement(t, month, o),
            season: seasonToDate(t, o),
            inv: statementInvoice(t, month),
          };
        }),
    [platform.tenants, platform.includeSandbox, opts, month],
  );
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  const tot = {
    revenue: sum((r) => r.st.totals.slaiceRevenue),
    commission: sum((r) => r.st.totals.commission),
    fees: sum((r) => r.st.totals.slaiceFees),
    recurring: sum((r) => r.st.subscription.amount + r.st.addOns.amount + r.st.support.amount),
    tax: sum((r) => r.st.totals.corporateTax),
    bookings: sum((r) => r.st.usage.bookings),
    season: sum((r) => r.season.slaiceRevenue),
  };
  const ready = rows.filter((r) => statementState(r.st, r.inv) === "ready");
  const issueAll = () => {
    const before = platform;
    ready.forEach((r) => issue(r.t, r.st, { today, actor: "Sofia Antoniou · month-end run" }));
    undo(
      `${ready.length} month-end invoice${ready.length === 1 ? "" : "s"} issued for ${ref?.label}.`,
      () => setPlatform(() => before),
    );
  };
  const sel = rows.find((r) => r.t.id === openId);
  const exportMonth = (f: "pdf" | "csv") => {
    downloadReport(
      `slaice-revenue_${month}`,
      {
        brand: "Slaice · platform",
        title: `Slaice revenue · ${ref?.label ?? month}`,
        subtitle: `${rows.length} tenant${rows.length === 1 ? "" : "s"}${ref?.open ? " · month to date" : ""} · season to date to ${today}`,
        meta: [
          "Commission and guest fees from each tenant's online bookings, plus subscriptions, add-ons and support, per its commercial terms (AENR-725 / 689).",
        ],
        sections: [
          {
            kpis: [
              { label: "Slaice revenue", value: eurK(tot.revenue), sub: ref?.label },
              {
                label: "Commission",
                value: eurK(tot.commission),
                sub: `${int(tot.bookings)} online bookings`,
              },
              {
                label: "Monthly charges",
                value: eurK(tot.recurring),
                sub: "subscriptions, add-ons, support",
              },
              { label: "Season to date", value: eurK(tot.season) },
            ],
          },
          {
            title: "By tenant",
            table: {
              cols: [
                "Tenant",
                "Online bookings",
                "Commission (€)",
                "Guest fees kept (€)",
                "Monthly charges (€)",
                "Corporate tax re-billed (€)",
                "Slaice revenue (€)",
                "Season to date (€)",
                "Invoice",
              ],
              rows: rows.map((r) => [
                r.t.name,
                Math.round(r.st.usage.bookings),
                r.st.totals.commission,
                r.st.totals.slaiceFees,
                Math.round(
                  (r.st.subscription.amount + r.st.addOns.amount + r.st.support.amount) * 100,
                ) / 100,
                r.st.totals.corporateTax,
                r.st.totals.slaiceRevenue,
                r.season.slaiceRevenue,
                r.inv
                  ? `${r.inv.no} · ${r.inv.status}`
                  : statementState(r.st, r.inv) === "ready"
                    ? "Ready to issue"
                    : statementState(r.st, r.inv) === "open"
                      ? "In progress"
                      : "Not live",
              ]),
              total: [
                "Total",
                Math.round(tot.bookings),
                Math.round(tot.commission * 100) / 100,
                Math.round(tot.fees * 100) / 100,
                Math.round(tot.recurring * 100) / 100,
                Math.round(tot.tax * 100) / 100,
                Math.round(tot.revenue * 100) / 100,
                Math.round(tot.season * 100) / 100,
                "",
              ],
            },
          },
        ],
      },
      f,
    );
    toast(`Exported Slaice revenue for ${ref?.label} (${f.toUpperCase()}).`, { tone: "success" });
  };
  return (
    <div className="animate-fade-up space-y-4">
      <PageHead
        sub="What Slaice earns from each tenant — commission, guest fees it keeps, subscriptions, add-ons and support — and the month-end invoices."
        actions={
          ready.length > 0 ? (
            <Btn variant="outline" icon={Icon.receipt} onClick={issueAll}>
              Issue {ready.length} invoice{ready.length === 1 ? "" : "s"}
            </Btn>
          ) : undefined
        }
        primary={
          <ExportMenu
            variant="primary"
            what={`Slaice revenue ${ref?.label ?? month}`}
            onExport={exportMonth}
          />
        }
      />
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
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          instant
          tone="indigo"
          label={`Slaice revenue · ${ref?.label.split(" ")[0] ?? ""}`}
          value={eurK(tot.revenue)}
          valueTitle={eur(tot.revenue)}
          sub={ref?.open ? "month to date" : "complete month"}
        />
        <StatCard
          instant
          label="Commission"
          value={eurK(tot.commission)}
          valueTitle={eur(tot.commission)}
          sub={`${int(tot.bookings)} online bookings`}
        />
        <StatCard
          instant
          label="Guest fees kept"
          value={eurK(tot.fees)}
          valueTitle={eur(tot.fees)}
          sub="collected with the commission"
        />
        <StatCard
          instant
          label="Monthly charges"
          value={eurK(tot.recurring)}
          valueTitle={eur(tot.recurring)}
          sub="subscriptions, add-ons, support"
        />
        <StatCard
          instant
          tone="teal"
          label="Season to date"
          value={eurK(tot.season)}
          valueTitle={eur(tot.season)}
          sub={`May – ${new Date(`${today}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
        />
      </div>
      <Card className="p-2">
        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={Icon.building}
            title="No billable tenants"
            body="Tenants appear here once they go live."
          />
        ) : (
          <Table
            rowLink
            cols={[
              "Tenant",
              "Bookings",
              "Commission",
              "Guest fees kept",
              "Monthly charges",
              "Slaice revenue",
              "Season to date",
              "Invoice",
              "",
            ]}
            right={[1, 2, 3, 4, 5, 6]}
            rows={[
              ...rows.map((r) => [
                <button
                  type="button"
                  className="row-link text-left"
                  onClick={() => setOpenId(r.t.id)}
                  aria-label={`Open the ${ref?.label} statement of ${r.t.name}`}
                >
                  <b className="text-navy-900 hover:text-teal-700">{r.t.name}</b>
                  <span className="block text-[11.5px] text-slate-500">
                    {r.st.subscription.mode === "none"
                      ? "Commission only"
                      : r.st.subscription.mode === "plan"
                        ? "Plan price"
                        : r.st.subscription.season
                          ? "Season price"
                          : "Off-season price"}
                  </span>
                </button>,
                int(r.st.usage.bookings),
                eur(r.st.totals.commission),
                eur(r.st.totals.slaiceFees),
                eur(r.st.subscription.amount + r.st.addOns.amount + r.st.support.amount),
                <b className="tnum">{eur(r.st.totals.slaiceRevenue)}</b>,
                eur(r.season.slaiceRevenue),
                <StatementBadge st={r.st} inv={r.inv} />,
                <Btn size="sm" variant="ghost" icon={Icon.arrowR} onClick={() => setOpenId(r.t.id)}>
                  Statement
                </Btn>,
              ]),
              [
                <b>Total</b>,
                <b>{int(tot.bookings)}</b>,
                <b>{eur(tot.commission)}</b>,
                <b>{eur(tot.fees)}</b>,
                <b>{eur(tot.recurring)}</b>,
                <b className="tnum">{eur(tot.revenue)}</b>,
                <b>{eur(tot.season)}</b>,
                "",
                "",
              ],
            ]}
          />
        )}
      </Card>
      <p className="text-[12px] text-slate-500 flex items-center gap-1.5">
        <Icon.info size={13} /> Corporate tax re-billed this month: {eur(tot.tax)} — a pass-through
        on the invoices, not revenue. Terms per tenant: tenant › Commercial terms.
      </p>
      <Drawer
        open={!!sel}
        onClose={() => setOpenId(null)}
        label={sel ? `${sel.t.name} · ${sel.st.label} statement` : "Statement"}
        title={
          sel && (
            <div>
              <div className="font-display font-bold text-navy-900 text-lg">{sel.t.name}</div>
              <button
                type="button"
                className="text-[12.5px] font-semibold text-teal-700 hover:underline"
                onClick={() => {
                  window.location.hash = `#/platform/tenant/${sel.t.id}/terms`;
                }}
              >
                Commercial terms ›
              </button>
            </div>
          )
        }
      >
        {sel && (
          <StatementView
            st={sel.st}
            tenant={sel.t}
            inv={sel.inv}
            onIssue={() => {
              const i = issue(sel.t, sel.st, { today, actor: "Sofia Antoniou · month-end run" });
              downloadStatement(statementDoc(sel.t, sel.st, i), "pdf");
              toast(`Invoice ${i.no} issued to ${sel.t.name} — PDF downloaded.`, {
                tone: "success",
              });
            }}
            onExport={(f) => downloadStatement(statementDoc(sel.t, sel.st, sel.inv), f)}
          />
        )}
      </Drawer>
    </div>
  );
}
