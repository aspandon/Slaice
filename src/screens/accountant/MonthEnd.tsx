import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, ConfirmModal, EmptyState, Modal, PageHead, Select, fmtDateGB, ExportMenu } from "../../components/ui";
import { useApp } from "../../app/store";
import { readHashQuery, writeHashQuery } from "../../app/router";
import { documents, transactions } from "../../data/ledger";
import { DEMO_TODAY } from "../../domain/period";
import { downloadText, downloadReport } from "../../lib/download";
import { useFinanceData } from "../reporting/FinanceTabs";
import { useFinance } from "../../lib/useFinance";
import type { MonthClose } from "../../domain/finance";
import { useSiteTerms } from "../../lib/useEconomics";
import { vatFromTerms } from "../../domain/till";
import {
  EXPORT_PRESETS,
  applyPrepared,
  exceptions,
  fixable,
  rejectionReason,
  exportMonth,
  monthSeasons,
  SEEDED_CLOSES,
  summarize,
  type ExceptionTarget,
  type ExportPreset,
} from "../../domain/monthEnd";

import { TENANT } from "../../data/beach";
import { eur as eurE } from "../../domain/economics";
import { statementInvoice } from "../../data/economics";
import { useSiteTenant, useTenantStatement } from "../../lib/useEconomics";
import { StatementBadge } from "../reporting/Statement";
/* ============ Accountant › Month-end (AENR-588) ============
   One month at a glance: documents issued, what reached myDATA, card charges
   and fees, payouts paid / in transit / scheduled, and the VAT summary by
   rate — with the exceptions to clear before closing the books, each linking
   to the documents or payouts behind it, and exports laid out for common
   Greek accounting packages. Built from the same ledger as Documents &
   Payments, so every figure reconciles with that page. */

const eur = (n: number) =>
  `${n < 0 ? "−" : ""}€${Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function MonthEnd() {
  const { till, account, payLinks, toast } = useApp();
  const seasons = useMemo(() => monthSeasons(DEMO_TODAY), []);
  const months = useMemo(() => seasons.flatMap((s) => s.months), [seasons]);
  // Default: the last complete month — the one an accountant is closing.
  const initial = readHashQuery().get("month");
  const [month, setMonthRaw] = useState(
    months.find((m) => m.month === initial)?.month ??
      (seasons[0].months.find((m) => !m.open) ?? months[0]).month,
  );
  const setMonth = (m: string) => {
    setMonthRaw(m);
    writeHashQuery({ month: m });
  };
  const ref = months.find((m) => m.month === month) ?? months[0];
  const range = useMemo(() => ({ from: ref.from, to: ref.to }), [ref.from, ref.to]);
  const fin = useFinanceData(range, null);
  // The tenant's VAT per service (AENR-728) for every document of the month.
  const siteTerms = useSiteTerms();
  const vatRates = useMemo(() => vatFromTerms(siteTerms), [siteTerms]);
  const docs = useMemo(
    () => documents(range, null, { sales: till.sales, online: account.bookings, links: payLinks, vat: vatRates }),
    [range, till.sales, account.bookings, payLinks, vatRates],
  );
  const txs = useMemo(
    () => transactions(range, null, till.sales, fin.flow.stripePct),
    [range, till.sales, fin.flow.stripePct],
  );
  // Prepare month (AENR-614) fixes what it can; Close unlocks once nothing blocks.
  const [cfg, setCfg] = useFinance();
  const raw = useMemo(() => summarize(docs, txs, fin.pay), [docs, txs, fin.pay]);
  // An example month that was closed before the demo (AENR-701) — prepared in full, until reopened.
  const seeded = (m: string): MonthClose | undefined => {
    const at = SEEDED_CLOSES[m];
    return at ? { closedAt: at } : undefined;
  };
  const closedAtOf = (m: string) => (cfg.months?.[m] ?? seeded(m))?.closedAt;
  const seed = seeded(ref.month);
  const seedFix = fixable(raw);
  const state: MonthClose =
    cfg.months?.[ref.month] ??
    (seed?.closedAt
      ? { ...seed, prepared: { at: seed.closedAt, resent: seedFix.resend, creditNotes: seedFix.creditNotes }, corrected: raw.mydata.failed }
      : {});
  const setState = (u: MonthClose) => setCfg({ ...cfg, months: { ...(cfg.months ?? {}), [ref.month]: u } });
  const s = applyPrepared(raw, state.prepared, state.corrected);
  const ex = exceptions(s, ref.open);
  const blocking = ex.filter((e) => e.severity === "blocking").length;
  const fx = fixable(s);
  const toFix = fx.resend + fx.creditNotes;
  const [preparing, setPreparing] = useState(false);
  const prepare = () => {
    setPreparing(true);
    window.setTimeout(() => {
      const prev = state.prepared;
      setState({ ...state, prepared: { at: new Date().toISOString(), resent: (prev?.resent ?? 0) + fx.resend, creditNotes: (prev?.creditNotes ?? 0) + fx.creditNotes } });
      setPreparing(false);
      const parts = [fx.resend ? `${fx.resend} re-sent to myDATA` : "", fx.creditNotes ? `${fx.creditNotes} credit note${fx.creditNotes > 1 ? "s" : ""} drafted` : ""].filter(Boolean);
      toast(`${ref.label} prepared — ${parts.join(", ")}.`, { tone: "success" });
    }, 1200);
  };
  // Rejected documents need a person: review them in one place, then re-send.
  const [review, setReview] = useState(false);
  const rejected = docs.filter((d) => d.status === "failed").slice(state.corrected ?? 0);
  const resendCorrected = () => {
    setState({ ...state, corrected: (state.corrected ?? 0) + rejected.length });
    setReview(false);
    toast(`${rejected.length} corrected document${rejected.length > 1 ? "s" : ""} re-sent — myDATA accepted them.`, { tone: "success" });
  };
  const canClose = !ref.open && blocking === 0 && !state.closedAt;
  // Reopen a closed month (AENR-701, demo): exports unlock and Close is offered again.
  const [reopening, setReopening] = useState(false);
  const reopen = () => {
    const before = state;
    setState({ ...state, closedAt: undefined });
    setReopening(false);
    toast(`${ref.label} reopened — close it again when you're done.`, { tone: "info", action: { label: "Undo", onClick: () => setState(before) } });
  };
  const closeMonth = () => {
    const before = state;
    setState({ ...state, closedAt: `${DEMO_TODAY}T${new Date().toTimeString().slice(0, 5)}` });
    toast(`${ref.label} closed.`, { tone: "success", action: { label: "Undo", onClick: () => setState(before) } });
  };
  // The accounting-package layout is remembered on this device (AENR-625), so Export is one click.
  const [preset, setPresetRaw] = useState<ExportPreset>(() => {
    try {
      const v = localStorage.getItem("slaice.monthend.preset");
      return EXPORT_PRESETS.some((p) => p.id === v) ? (v as ExportPreset) : "generic";
    } catch {
      return "generic";
    }
  });
  const setPreset = (v: ExportPreset) => {
    setPresetRaw(v);
    try {
      localStorage.setItem("slaice.monthend.preset", v);
    } catch {
      /* storage blocked */
    }
  };

  const open = (t: ExceptionTarget) => {
    if (t.page === "commission") {
      window.location.hash = "#/accountant/payments?view=payouts";
      return;
    }
    const q = new URLSearchParams({ status: t.status, from: ref.from, to: ref.to });
    window.location.hash = `#/accountant/${t.page}?${q.toString()}`;
  };
  const money = (n: number) => n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // The month-end pack as a readable report — PDF to file, CSV to work in (AENR-593).
  const exportSummary = (format: "pdf" | "csv") => {
    downloadReport(`month-end_${ref.month}`, {
      title: `Month-end · ${ref.label}`,
      subtitle: ref.open ? "Month still open — figures can change" : "Closed month",
      meta: [`${TENANT.name} · documents by issue date, card charges and Stripe payouts`],
      sections: [
        { title: "Summary", kpis: [
          { label: "Documents", value: s.docs.count.toLocaleString("en-GB"), sub: `€${money(s.docs.total)} gross` },
          { label: "VAT", value: `€${money(s.docs.vat)}`, sub: `net €${money(s.docs.net)}` },
          { label: "myDATA", value: `${s.mydata.sent.toLocaleString("en-GB")} sent`, sub: `${s.mydata.pending} pending · ${s.mydata.failed} rejected` },
          { label: "Card charges", value: `€${money(s.cards.amount)}`, sub: `${s.cards.count} · fees €${money(s.cards.fees)}` },
        ] },
        { title: "Exceptions to clear", text: ex.length ? ex.map((e) => `${e.severity === "blocking" ? "BLOCKING · " : ""}${e.title} — ${e.detail}`) : ["None — the month is ready to close."] },
        { title: "VAT by rate", table: { cols: ["Rate", "Net (€)", "VAT (€)", "Gross (€)"], rows: s.vat.map((v) => [`${Math.round(v.rate * 100)}%`, v.net, v.vat, v.net + v.vat]), total: ["Total", s.docs.net, s.docs.vat, s.docs.total] } },
        { title: "Documents by type", table: { cols: ["Type", "Count", "Total (€)"], rows: s.docs.byType.map((x) => [x.type, x.count, x.total]) } },
        { title: "Payouts", table: { cols: ["Status", "Count", "Amount (€)"], rows: [["Paid", s.payouts.paid, s.payouts.paidAmount], ["In transit", s.payouts.inTransit, s.payouts.inTransitAmount], ["Scheduled", s.payouts.scheduled, s.payouts.scheduledAmount]] } },
      ],
    }, format);
    toast(`Month-end summary for ${ref.label} (${format.toUpperCase()}).`, { tone: "success" });
  };
  const exportNow = () => {
    const out = exportMonth(docs, preset);
    downloadText(`documents_${ref.month}_${preset}.${out.ext}`, out.text, out.mime);
    toast(
      `${docs.length.toLocaleString("en-GB")} documents exported for ${ref.label} (${EXPORT_PRESETS.find((p) => p.id === preset)?.label}).`,
      { tone: "success" },
    );
  };

  return (
    <div className="animate-fade-up space-y-4">
      <PageHead
        daily
        sub="Close the books for a month: what reached myDATA, card charges and payouts, VAT by rate, and the exceptions to clear first."
        actions={
          <div className="w-56">
            <Select
              aria-label="Export layout"
              value={preset}
              onChange={(e) => setPreset(e.target.value as ExportPreset)}
              options={EXPORT_PRESETS.map((p) => ({ v: p.id, l: p.label }))}
            />
          </div>
        }
        primary={
          <div className="flex flex-wrap gap-2">
            <ExportMenu label="Summary" what={`the ${ref.label} month-end summary`} onExport={exportSummary} />
            <Btn variant="primary" icon={Icon.download} onClick={exportNow}>
              Export documents
            </Btn>
          </div>
        }
      />
      {/* Months by season (AENR-701), each with its state: closed, to close, in progress. */}
      <div className="space-y-2">
        {seasons.map((s) => (
          <div key={s.season} role="group" aria-label={`${s.season} season`} className="flex flex-col sm:flex-row sm:items-center gap-1.5">
            <span className="sm:w-24 shrink-0 text-[12px] font-semibold uppercase tracking-wide text-slate-500">{s.season} season</span>
            {/* One scrolling strip per season on phones; wraps on wider screens. */}
            <div className="flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-visible -mx-1 px-1 pb-1 sm:pb-0">
            {[...s.months].reverse().map((m) => { /* oldest → newest */
              const on = m.month === month;
              const closed = closedAtOf(m.month);
              const status = m.open ? "in progress" : closed ? "closed" : "to close";
              return (
                <button
                  key={m.month}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${m.label} · ${status}`}
                  onClick={() => setMonth(m.month)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 min-h-[40px] text-[13px] font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${on ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-400"}`}
                >
                  {m.label.split(" ")[0]}
                  {closed ? (
                    <Icon.lock size={12} className={on ? "text-white/80" : "text-emerald-600"} />
                  ) : m.open ? (
                    <span className={`text-[12px] font-normal ${on ? "text-white/75" : "text-slate-500"}`}>in progress</span>
                  ) : (
                    <span aria-hidden className={`w-2 h-2 rounded-full ${on ? "bg-amber-300" : "bg-amber-500"}`} />
                  )}
                </button>
              );
            })}
            </div>
          </div>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-navy-900 text-xl">{ref.label}</h2>
            <p className="text-[13px] text-slate-500">
              {ref.open ? `Month to date · up to ${fmtDateGB(ref.to)}` : "Complete month"} ·{" "}
              {EXPORT_PRESETS.find((p) => p.id === preset)?.note}
            </p>
          </div>
          {state.closedAt ? (
            <div className="flex items-center gap-2">
              <Badge tone="green">
                <Icon.lock size={12} /> Closed {fmtDateGB(state.closedAt.slice(0, 10))}
              </Badge>
              <Btn variant="outline" icon={Icon.refresh} onClick={() => setReopening(true)}>
                Reopen month
              </Btn>
            </div>
          ) : canClose ? (
            <Btn variant="primary" icon={Icon.lock} onClick={closeMonth}>
              Close {ref.label}
            </Btn>
          ) : ex.length === 0 ? (
            <Badge tone="green">
              <Icon.checkCircle size={12} /> Ready to close
            </Badge>
          ) : blocking ? (
            <Badge tone="red">
              <Icon.alert size={12} /> {blocking} blocking · {ex.length - blocking} to check
            </Badge>
          ) : (
            <Badge tone="amber">
              <Icon.alert size={12} /> {ex.length} to check
            </Badge>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Fact
            k="Documents issued"
            v={s.docs.count.toLocaleString("en-GB")}
            sub={`${eur(s.docs.total)} gross · ${eur(s.docs.vat)} VAT`}
          />
          <Fact
            k="Sent to myDATA"
            v={`${s.mydata.sent.toLocaleString("en-GB")} / ${s.docs.count.toLocaleString("en-GB")}`}
            sub={
              s.mydata.pending + s.mydata.failed
                ? `${s.mydata.pending} pending · ${s.mydata.failed} rejected`
                : "all transmitted"
            }
            tone={s.mydata.failed ? "red" : s.mydata.pending ? "amber" : "green"}
          />
          <Fact
            k="Card charges"
            v={eur(s.cards.amount)}
            sub={`${s.cards.count.toLocaleString("en-GB")} charges · fees ${eur(s.cards.fees)}`}
          />
          <Fact
            k="Payouts"
            v={eur(s.payouts.paidAmount)}
            sub={`paid · ${eur(s.payouts.inTransitAmount)} in transit · ${eur(s.payouts.scheduledAmount)} scheduled`}
            tone={s.payouts.inTransit ? "amber" : undefined}
          />
        </dl>
      </Card>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-navy-900 mb-1">Exceptions to clear</h3>
          <p className="text-[12.5px] text-slate-500 mb-3">
            {ref.open
              ? "The month is still running — it can be closed once it ends."
              : "Blocking items stop the month from being closed; the others need a check."}
          </p>
          {/* One step fixes what a machine can; only what needs a person stays below. */}
          {toFix > 0 && (
            <div className="mb-3 rounded-xl ring-1 ring-teal-200 bg-teal-50/60 px-3.5 py-3 flex flex-wrap items-center gap-3">
              <Icon.sparkles size={16} className="text-teal-700 shrink-0" />
              <div className="min-w-0 flex-1 basis-56 text-[13px] text-navy-900">
                <b>Prepare {ref.label}</b> —{" "}
                {[fx.resend ? `re-send ${fx.resend} document${fx.resend > 1 ? "s" : ""} to myDATA` : "", fx.creditNotes ? `draft ${fx.creditNotes} missing credit note${fx.creditNotes > 1 ? "s" : ""}` : ""].filter(Boolean).join(" and ")}
                . Only what needs you stays on the list.
              </div>
              <Btn variant="teal" size="sm" icon={Icon.sparkles} loading={preparing} onClick={prepare}>
                Prepare month
              </Btn>
            </div>
          )}
          {state.prepared && toFix === 0 && (
            <p role="status" className="mb-3 text-[12.5px] text-emerald-800 flex items-center gap-1.5">
              <Icon.checkCircle size={14} /> Prepared{" "}
              {new Date(state.prepared.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} —{" "}
              {state.prepared.resent} re-sent to myDATA, {state.prepared.creditNotes} credit note
              {state.prepared.creditNotes === 1 ? "" : "s"} drafted.
            </p>
          )}
          {ex.length === 0 ? (
            <EmptyState
              compact
              icon={Icon.checkCircle}
              title="Nothing to clear"
              body="Every document reached myDATA, every payout arrived and every refund has its credit note."
            />
          ) : (
            <ul className="space-y-2">
              {ex.map((e) => (
                <li
                  key={e.id}
                  className={`rounded-xl ring-1 px-3.5 py-3 flex flex-wrap items-center gap-3 ${e.severity === "blocking" ? "ring-rose-200 bg-rose-50/60" : "ring-amber-200 bg-amber-50/50"}`}
                >
                  <Icon.alert
                    size={16}
                    className={
                      e.severity === "blocking"
                        ? "text-rose-600 shrink-0"
                        : "text-amber-600 shrink-0"
                    }
                  />
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="font-semibold text-navy-900 text-[13.5px]">{e.title}</div>
                    <div className="text-[12.5px] text-slate-600">{e.detail}</div>
                  </div>
                  <Badge tone={e.severity === "blocking" ? "red" : "amber"}>
                    {e.severity === "blocking" ? "Blocking" : "Check"}
                  </Badge>
                  {e.id === "mydata-failed" ? (
                    <Btn size="sm" variant="primary" onClick={() => setReview(true)}>
                      Review {e.count}
                    </Btn>
                  ) : (
                    <Btn size="sm" variant="ghost" icon={Icon.arrowR} onClick={() => open(e.target)}>
                      {e.target.page === "commission" ? "Open payouts" : `Show ${e.count}`}
                    </Btn>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-navy-900 mb-2">VAT summary</h3>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="pb-1.5 font-semibold">Rate</th>
                  <th className="pb-1.5 font-semibold text-right">Net</th>
                  <th className="pb-1.5 font-semibold text-right">VAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tnum">
                {s.vat.map((v) => (
                  <tr key={v.rate}>
                    <td className="py-1.5">{Math.round(v.rate * 100)}%</td>
                    <td className="py-1.5 text-right">{eur(v.net)}</td>
                    <td className="py-1.5 text-right">{eur(v.vat)}</td>
                  </tr>
                ))}
                <tr className="font-semibold text-navy-900">
                  <td className="pt-2">Total</td>
                  <td className="pt-2 text-right">{eur(s.docs.net)}</td>
                  <td className="pt-2 text-right">{eur(s.docs.vat)}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[11.5px] text-slate-500 mt-2">
              From the document lines — use it for the periodic VAT return.
            </p>
          </Card>
          <SlaiceStatementCard month={ref.month} />
          <Card className="p-5">
            <h3 className="font-semibold text-navy-900 mb-2">Documents by type</h3>
            <ul className="space-y-1.5 text-[13px]">
              {s.docs.byType.map((t) => (
                <li key={t.type} className="flex justify-between gap-2">
                  <span className="text-slate-700">
                    {t.type}{" "}
                    <span className="text-slate-500">× {t.count.toLocaleString("en-GB")}</span>
                  </span>
                  <span className="tnum text-navy-900">{eur(t.total)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      <ConfirmModal
        open={reopening}
        onClose={() => setReopening(false)}
        onConfirm={reopen}
        danger={false}
        icon={Icon.refresh}
        title={`Reopen ${ref.label}?`}
        body="The month opens again for corrections: Prepare, re-sending to myDATA and exports work as before, and Close is offered once nothing blocks. Demo — nothing reaches your accounting package."
        confirmLabel="Reopen month"
      />
      {review && (
        <Modal
          open
          onClose={() => setReview(false)}
          title={`${rejected.length} rejected by myDATA · ${ref.label}`}
          wide
          footer={
            <>
              <Btn variant="ghost" onClick={() => setReview(false)}>
                Later
              </Btn>
              <Btn variant="primary" icon={Icon.send} onClick={resendCorrected}>
                Corrected — re-send {rejected.length}
              </Btn>
            </>
          }
        >
          <p className="text-[13px] text-slate-600 mb-3">
            Fix the reason on each document (in your e-invoicing provider or the guest&apos;s details), then re-send
            them together.
          </p>
          <ul className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
            {rejected.map((d) => (
              <li key={d.id} className="py-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[13px]">
                <span className="font-mono font-semibold text-navy-900">
                  {d.series}-{d.number}
                </span>
                <span className="text-slate-600">{fmtDateGB(d.date)}</span>
                <span className="text-slate-700 min-w-0 truncate">{d.counterparty}</span>
                <span className="tnum ml-auto">{eur(d.total)}</span>
                <span className="basis-full text-[12px] text-rose-700">{rejectionReason(d)}</span>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
}

/** The month's bill from Slaice (AENR-725 / 689) — commission settled at payment, the balance the
 *  month-end invoice asks for — one tap from the full statement. */
function SlaiceStatementCard({ month }: { month: string }) {
  const tenant = useSiteTenant();
  const st = useTenantStatement(tenant, month, DEMO_TODAY);
  if (!tenant || !st || !st.live) return null;
  const inv = statementInvoice(tenant, month);
  // An issued invoice is a snapshot — show its figures, not today's recalculation.
  const s = inv?.statement ?? st;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-navy-900">Slaice statement</h3>
        <StatementBadge st={st} inv={inv} />
      </div>
      <dl className="space-y-1 text-[13px]">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-600">Commission (settled at payment)</dt>
          <dd className="tnum text-slate-600">{eurE(s.totals.commission)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-600">Monthly charges</dt>
          <dd className="tnum text-navy-900">{eurE(s.totals.recurring)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-600">Corporate tax re-billed</dt>
          <dd className="tnum text-navy-900">{eurE(s.totals.corporateTax)}</dd>
        </div>
        <div className="flex justify-between gap-2 border-t border-slate-100 pt-1 font-semibold">
          <dt className="text-navy-900">{inv ? "Amount due" : st.open ? "Balance so far" : "Balance"}</dt>
          <dd className="tnum text-navy-900">{eurE(s.totals.due)}</dd>
        </div>
      </dl>
      <Btn
        size="sm"
        variant="ghost"
        icon={Icon.arrowR}
        className="mt-3"
        onClick={() => {
          window.location.hash = `#/accountant/payments?view=statement&month=${month}`;
        }}
      >
        Open the statement
      </Btn>
    </Card>
  );
}

function Fact({
  k,
  v,
  sub,
  tone,
}: {
  k: string;
  v: string;
  sub: string;
  tone?: "red" | "amber" | "green";
}) {
  const ring =
    tone === "red"
      ? "ring-rose-200"
      : tone === "amber"
        ? "ring-amber-200"
        : tone === "green"
          ? "ring-teal-200"
          : "ring-slate-200";
  return (
    <div className={`rounded-xl ring-1 ${ring} bg-white px-3.5 py-3`}>
      <dt className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{k}</dt>
      <dd className="font-display font-bold text-navy-900 text-xl tnum mt-0.5">{v}</dd>
      <dd className="text-[12px] text-slate-500 mt-0.5">{sub}</dd>
    </div>
  );
}
