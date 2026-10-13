import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, EmptyState, PageHead, Select } from "../../components/ui";
import { useApp } from "../../app/store";
import { readHashQuery, writeHashQuery } from "../../app/router";
import { documents, transactions } from "../../data/ledger";
import { DEMO_TODAY } from "../../domain/period";
import { downloadText } from "../../lib/download";
import { useFinanceData } from "../reporting/FinanceTabs";
import {
  EXPORT_PRESETS,
  exceptions,
  exportMonth,
  seasonMonths,
  summarize,
  type ExceptionTarget,
  type ExportPreset,
} from "../../domain/monthEnd";

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
  const { till, account, payLinks, toast, go } = useApp();
  const months = useMemo(() => seasonMonths(DEMO_TODAY), []);
  // Default: the last complete month — the one an accountant is closing.
  const initial = readHashQuery().get("month");
  const [month, setMonthRaw] = useState(
    months.find((m) => m.month === initial)?.month ??
      (months.find((m) => !m.open) ?? months[0]).month,
  );
  const setMonth = (m: string) => {
    setMonthRaw(m);
    writeHashQuery({ month: m });
  };
  const ref = months.find((m) => m.month === month) ?? months[0];
  const range = useMemo(() => ({ from: ref.from, to: ref.to }), [ref.from, ref.to]);
  const fin = useFinanceData(range, null);
  const docs = useMemo(
    () => documents(range, null, { sales: till.sales, online: account.bookings, links: payLinks }),
    [range, till.sales, account.bookings, payLinks],
  );
  const txs = useMemo(
    () => transactions(range, null, till.sales, fin.flow.stripePct),
    [range, till.sales, fin.flow.stripePct],
  );
  const s = useMemo(() => summarize(docs, txs, fin.pay), [docs, txs, fin.pay]);
  const ex = exceptions(s, ref.open);
  const blocking = ex.filter((e) => e.severity === "blocking").length;
  const [preset, setPreset] = useState<ExportPreset>("generic");

  const open = (t: ExceptionTarget) => {
    if (t.page === "commission") return go("accountant", "commission");
    const q = new URLSearchParams({ tab: t.page, status: t.status, from: ref.from, to: ref.to });
    window.location.hash = `#/accountant/documents?${q.toString()}`;
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
          <Btn variant="primary" icon={Icon.download} onClick={exportNow}>
            Export month
          </Btn>
        }
      />
      <div role="group" aria-label="Month" className="flex flex-wrap gap-1.5">
        {months.map((m) => (
          <button
            key={m.month}
            type="button"
            aria-pressed={m.month === month}
            onClick={() => setMonth(m.month)}
            className={`rounded-xl px-3.5 py-2 text-[13px] font-semibold ring-1 transition ${m.month === month ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-400"}`}
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

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-navy-900 text-xl">{ref.label}</h2>
            <p className="text-[13px] text-slate-500">
              {ref.open ? `Month to date · up to ${ref.to}` : "Complete month"} ·{" "}
              {EXPORT_PRESETS.find((p) => p.id === preset)?.note}
            </p>
          </div>
          {ex.length === 0 ? (
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
            Blocking items stop the month from being closed; the others need a check.
          </p>
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
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-navy-900 text-[13.5px]">{e.title}</div>
                    <div className="text-[12.5px] text-slate-600">{e.detail}</div>
                  </div>
                  <Badge tone={e.severity === "blocking" ? "red" : "amber"}>
                    {e.severity === "blocking" ? "Blocking" : "Check"}
                  </Badge>
                  <Btn size="sm" variant="ghost" icon={Icon.arrowR} onClick={() => open(e.target)}>
                    {e.target.page === "commission" ? "Open payouts" : `Show ${e.count}`}
                  </Btn>
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
          <Card className="p-5">
            <h3 className="font-semibold text-navy-900 mb-2">Documents by type</h3>
            <ul className="space-y-1.5 text-[13px]">
              {s.docs.byType.map((t) => (
                <li key={t.type} className="flex justify-between gap-2">
                  <span className="text-slate-700">
                    {t.type}{" "}
                    <span className="text-slate-400">× {t.count.toLocaleString("en-GB")}</span>
                  </span>
                  <span className="tnum text-navy-900">{eur(t.total)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
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
