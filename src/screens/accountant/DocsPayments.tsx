import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  Modal,
  PeriodPicker,
  Select,
  Table, DensityToggle,
  Tabs,
} from "../../components/ui";
import { Pager } from "../../components/TableTools";
import { useListUrl } from "../../lib/useUrlState";
import { useApp } from "../../app/store";
import { sectionName } from "../../data/finance";
import {
  DOC_CODE,
  documents,
  transactions,
  type DocType,
  type FiscalDoc,
  type Txn,
} from "../../data/ledger";
import { fmtDay, rangeLabel, resolveRange } from "../../domain/period";
import { usePeriod } from "../../lib/usePeriod";
import { readHashQuery } from "../../app/router";
import { downloadCSV, downloadPDF } from "../../lib/download";
import { SectionChips, useFinanceData, useSection } from "../reporting/FinanceTabs";

/* ============ Accountant › Documents & Payments (AENR-526) ============
   Every fiscal document (ΑΠΥ, ΤΠΥ, ΠΑΠΥ, ΠΤΠΥ, cancellations — credits linked
   to their originals) and every card transaction for the period, with the
   shared period and section controls, filters, search and an accounting CSV
   of exactly what's on screen. Read-only. Totals reconcile with Reporting ›
   Payments because both are built from the same daily figures. */

const PAGE = 25;
const TYPES: DocType[] = ["ΑΠΥ", "ΤΠΥ", "ΠΑΠΥ", "ΠΤΠΥ", "Cancellation"];
const STATUS_TONE = { sent: "green", pending: "amber", failed: "red" } as const;
const TX_TONE = {
  captured: "blue",
  refunded: "red",
  "in payout": "amber",
  "paid out": "green",
} as const;
const eur = (n: number) =>
  `${n < 0 ? "−" : ""}€${Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const docNo = (d: FiscalDoc) => `${d.series}-${d.number}`;

export function DocsPayments() {
  const { toast, till, account, payLinks } = useApp();
  // Month-end exceptions deep-link here with ?tab=…&status=… (AENR-588).
  const [tab, setTab] = useState<"documents" | "payments">(() =>
    readHashQuery().get("tab") === "payments" ? "payments" : "documents",
  );
  const [period, setPeriod] = usePeriod({ kind: "preset", preset: "week", offset: 0 });
  const range = useMemo(
    () => resolveRange(period) ?? resolveRange({ kind: "preset", preset: "week", offset: 0 })!,
    [period],
  );
  const [section, setSection] = useSection();
  const [type, setType] = useState("");
  const [status, setStatus] = useState(() => readHashQuery().get("status") ?? "");
  const [channel, setChannel] = useState("");
  const [q, setQ] = useState("");
  const { page, setPage } = useListUrl();
  const [view, setView] = useState<FiscalDoc | null>(null);
  const fin = useFinanceData(range, section);
  const docs = useMemo(
    () =>
      documents(range, section, { sales: till.sales, online: account.bookings, links: payLinks }),
    [range, section, till.sales, account.bookings, payLinks],
  );
  const txs = useMemo(
    () => transactions(range, section, till.sales, fin.flow.stripePct),
    [range, section, till.sales, fin.flow.stripePct],
  );
  const qq = q.trim().toLowerCase().replace(",", ".");
  const docRows = docs.filter(
    (d) =>
      (!type || d.type === type) &&
      (!status || d.status === status) &&
      (!channel || d.channel === channel) &&
      (!qq ||
        [
          docNo(d),
          d.mark,
          d.total.toFixed(2),
          String(Math.abs(d.total)),
          d.counterparty,
          d.original ?? "",
          d.ref ?? "",
        ].some((v) => v.toLowerCase().includes(qq))),
  );
  const txRows = txs.filter(
    (t) =>
      (!status || t.status === status) &&
      (!channel || t.channel === channel) &&
      (!qq ||
        [t.id, t.ref, t.method, t.amount.toFixed(2)].some((v) => v.toLowerCase().includes(qq))),
  );
  const rows = tab === "documents" ? docRows : txRows;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE));
  const safe = Math.min(page, pageCount - 1);
  const reset = () => setPage(0);
  const label = rangeLabel(range);
  // ASCII file names (Greek type names become their myDATA codes).
  const slug = `${tab}_${range.from}_${range.to}${section ? `_${section}` : ""}${type ? `_type-${DOC_CODE[type as DocType]}` : ""}${status ? `_${status}` : ""}${channel ? `_${channel}` : ""}`;
  const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0);
  const txTotal = sum(txRows.map((t) => t.amount));
  const byId = new Map(docs.map((d) => [docNo(d), d]));

  const exportCsv = (perLine = false) => {
    if (tab === "documents") {
      const head = [
        "Date",
        "Time",
        "Type code",
        "Type",
        "Series",
        "Number",
        "Counterparty",
        "Counterparty VAT no.",
        "Net",
        "VAT rate",
        "VAT",
        "Total",
        "Payment method",
        "MARK",
        "Original document",
        "Zone",
        "Channel",
        "myDATA status",
      ];
      const body = perLine
        ? docRows.flatMap((d) =>
            d.lines.map((l) => [
              d.date,
              d.time,
              DOC_CODE[d.type],
              d.type,
              d.series,
              d.number,
              d.counterparty,
              d.vatNo ?? "",
              l.net.toFixed(2),
              `${Math.round(l.rate * 100)}%`,
              l.vat.toFixed(2),
              (l.net + l.vat).toFixed(2),
              d.method,
              d.mark,
              d.original ?? "",
              sectionName(d.section),
              d.channel,
              d.status,
            ]),
          )
        : docRows.map((d) => [
            d.date,
            d.time,
            DOC_CODE[d.type],
            d.type,
            d.series,
            d.number,
            d.counterparty,
            d.vatNo ?? "",
            d.net.toFixed(2),
            [...new Set(d.lines.map((l) => `${Math.round(l.rate * 100)}%`))].join("/"),
            d.vat.toFixed(2),
            d.total.toFixed(2),
            d.method,
            d.mark,
            d.original ?? "",
            sectionName(d.section),
            d.channel,
            d.status,
          ]);
      downloadCSV(`${slug}${perLine ? "_lines" : ""}.csv`, head, body);
    } else {
      downloadCSV(
        `${slug}.csv`,
        [
          "Date",
          "Time",
          "Transaction",
          "Booking / receipt",
          "Zone",
          "Channel",
          "Method",
          "POS terminal",
          "Amount",
          "Fee",
          "Net",
          "Payout date",
          "Status",
        ],
        txRows.map((t) => [
          t.date,
          t.time,
          t.id,
          t.ref,
          sectionName(t.section),
          t.channel,
          t.method,
          t.terminal ?? "",
          t.amount.toFixed(2),
          t.fee.toFixed(2),
          t.net.toFixed(2),
          t.payout,
          t.status,
        ]),
      );
    }
    toast(
      `Exported ${perLine ? "document lines" : `${rows.length} ${tab}`} · ${label} (CSV, UTF-8).`,
      { tone: "success" },
    );
  };

  return (
    <div className="animate-fade-up space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          tabs={[
            ["documents", "Documents", Icon.receipt],
            ["payments", "Payments", Icon.card],
          ]}
          value={tab}
          onChange={(v) => {
            setTab(v as typeof tab);
            setStatus("");
            setChannel("");
            reset();
          }}
        />
        <span className="ml-auto"><DensityToggle /></span>
        <Badge tone="slate">Read-only</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          {tab === "documents" && (
            <Btn variant="outline" icon={Icon.download} onClick={() => exportCsv(true)}>
              CSV per line
            </Btn>
          )}
          <Btn variant="primary" icon={Icon.download} onClick={() => exportCsv()}>
            Accounting CSV
          </Btn>
        </div>
      </div>
      <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/70 ring-1 ring-amber-600/15 px-3.5 py-2.5 text-[12px] text-amber-800">
        <Icon.shieldAlert size={15} className="shrink-0 mt-0.5 text-amber-600" />
        <span className="leading-snug">
          <b>GDPR &amp; tax law:</b> issued documents and their myDATA records are kept for{" "}
          <b>5 years</b> and are exempt from erasure requests (legal obligation).
        </span>
      </div>
      <PeriodPicker
        value={period}
        onChange={(p) => {
          setPeriod(p);
          reset();
        }}
        presets={["day", "week", "month", "season"]}
        resetTo={{ kind: "preset", preset: "week", offset: 0 }}
      />
      <SectionChips
        value={section}
        onChange={(s) => {
          setSection(s);
          reset();
        }}
      />
      <div className="flex flex-wrap items-end gap-2">
        {tab === "documents" && (
          <div className="w-40">
            <Select
              aria-label="Document type"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                reset();
              }}
              options={[{ v: "", l: "All types" }, ...TYPES.map((t) => ({ v: t, l: t }))]}
            />
          </div>
        )}
        <div className="w-40">
          <Select
            aria-label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              reset();
            }}
            options={
              tab === "documents"
                ? [
                    { v: "", l: "Any status" },
                    { v: "sent", l: "Sent (MARK)" },
                    { v: "pending", l: "Pending" },
                    { v: "failed", l: "Failed" },
                  ]
                : [{ v: "", l: "Any status" }, ...Object.keys(TX_TONE).map((s) => ({ v: s, l: s }))]
            }
          />
        </div>
        <div className="w-36">
          <Select
            aria-label="Channel"
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              reset();
            }}
            options={[
              { v: "", l: "All channels" },
              { v: "Online", l: "Online" },
              { v: "Cashier", l: "Cashier" },
              { v: "Phone", l: "Phone" },
              ...(tab === "payments" ? [{ v: "Walk-in", l: "Walk-in" }] : []),
            ]}
          />
        </div>
        <label className="flex items-center gap-2 rounded-xl ring-1 ring-slate-200 px-3 py-2 flex-1 min-w-[200px] max-w-sm text-slate-600 bg-white/70">
          <Icon.search size={16} />
          <span className="sr-only">Search</span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              reset();
            }}
            placeholder={
              tab === "documents"
                ? "Number, MARK, receipt or amount…"
                : "Transaction, booking or amount…"
            }
            className="text-sm outline-none w-full bg-transparent"
          />
        </label>
      </div>

      {tab === "documents" ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[12.5px]">
          {TYPES.map((t) => (
            <div key={t} className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2">
              <div className="text-slate-500">{t}</div>
              <div className="font-display text-lg font-bold text-navy-900 tnum">
                {docRows.filter((d) => d.type === t).length.toLocaleString("en-GB")}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12.5px]">
          {[
            ["Transactions", txRows.length.toLocaleString("en-GB")],
            ["Amount", eur(txTotal)],
            ["Fees", eur(sum(txRows.map((t) => t.fee)))],
            ["Net", eur(sum(txRows.map((t) => t.net)))],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2">
              <div className="text-slate-500">{l}</div>
              <div className="font-display text-lg font-bold text-navy-900 tnum">{v}</div>
            </div>
          ))}
          {!status && !channel && !qq && (
            <div className="col-span-2 sm:col-span-4 text-[11.5px] text-slate-500 flex items-center gap-1.5">
              <Icon.checkCircle size={12} className="text-teal-600" /> Matches Reporting › Payments
              for {label}: {fin.rep.total.tx.toLocaleString("en-GB")} transactions ·{" "}
              {eur(fin.rep.total.captured)} captured.
            </div>
          )}
        </div>
      )}

      <Card className="p-2">
        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={Icon.receipt}
            title="Nothing matches"
            body="Try another period, type or status."
          />
        ) : tab === "documents" ? (
          <Table
            rowLink
            dense
            cols={[
              "Date",
              "Document",
              "Counterparty",
              "Zone · channel",
              "Net",
              "VAT",
              "Total",
              "Method",
              "MARK",
              "Status",
              "",
            ]}
            right={[4, 5, 6]}
            rows={docRows.slice(safe * PAGE, safe * PAGE + PAGE).map((d) => [
              <span className="whitespace-nowrap">
                {fmtDay(d.date)} <span className="text-slate-400">{d.time}</span>
              </span>,
              <span className="whitespace-nowrap">
                <b className="text-navy-900">{d.type}</b> {docNo(d)}
                {d.live && (
                  <Badge tone="indigo" className="ml-1">
                    Live
                  </Badge>
                )}
                {d.ref && <span className="block text-[11px] text-slate-500">{d.ref}</span>}
                {d.original && (
                  <span className="block text-[11px] text-slate-500">on {d.original}</span>
                )}
                {d.credits?.length ? (
                  <span className="block text-[11px] text-rose-600">
                    credited: {d.credits.join(", ")}
                  </span>
                ) : null}
              </span>,
              <span>
                {d.counterparty}
                {d.vatNo && <span className="block text-[11px] text-slate-500">{d.vatNo}</span>}
              </span>,
              <span className="whitespace-nowrap">
                {sectionName(d.section)} · {d.channel}
              </span>,
              <span className="tnum">{eur(d.net)}</span>,
              <span className="tnum">{eur(d.vat)}</span>,
              <b className={`tnum ${d.total < 0 ? "text-rose-600" : "text-navy-900"}`}>
                {eur(d.total)}
              </b>,
              <span className="whitespace-nowrap text-[12px]">{d.method}</span>,
              <span className="font-mono text-[11.5px]">
                {d.mark ? `${d.mark.slice(0, 6)}…${d.mark.slice(-4)}` : "—"}
              </span>,
              <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>,
              <button
                type="button"
                className="row-link inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-semibold text-navy-900 hover:text-teal-700"
                onClick={() => setView(d)}
                aria-label={`View ${docNo(d)}`}
              >
                <Icon.eye size={14} /> View
              </button>,
            ])}
          />
        ) : (
          <Table
            dense
            cols={[
              "Date",
              "Transaction",
              "Booking",
              "Zone · channel",
              "Method",
              "Amount",
              "Fee",
              "Net",
              "Payout",
              "Status",
            ]}
            right={[5, 6, 7]}
            rows={(txRows.slice(safe * PAGE, safe * PAGE + PAGE) as Txn[]).map((t) => [
              <span className="whitespace-nowrap">
                {fmtDay(t.date)} <span className="text-slate-400">{t.time}</span>
              </span>,
              <span className="font-mono text-[11.5px]">
                {t.id}
                {t.live && (
                  <Badge tone="indigo" className="ml-1">
                    Live
                  </Badge>
                )}
              </span>,
              t.ref,
              <span className="whitespace-nowrap">
                {sectionName(t.section)} · {t.channel}
              </span>,
              <span className="whitespace-nowrap text-[12px]">
                {t.method}
                {t.terminal ? ` · ${t.terminal}` : ""}
              </span>,
              <b className="tnum text-navy-900">{eur(t.amount)}</b>,
              <span className="tnum">{eur(t.fee)}</span>,
              <span className="tnum">{eur(t.net)}</span>,
              <span className="whitespace-nowrap">{fmtDay(t.payout)}</span>,
              <Badge tone={TX_TONE[t.status]}>{t.status}</Badge>,
            ])}
          />
        )}
        {pageCount > 1 && (
          <Pager
            page={safe}
            pageCount={pageCount}
            total={rows.length}
            pageSize={PAGE}
            onPage={setPage}
          />
        )}
      </Card>

      {view && (
        <Modal
          open
          onClose={() => setView(null)}
          title={`${view.type} ${docNo(view)}`}
          wide
          footer={
            <>
              <Btn variant="ghost" onClick={() => setView(null)}>
                Close
              </Btn>
              <Btn
                variant="primary"
                icon={Icon.download}
                onClick={() => {
                  downloadPDF(`${docNo(view)}.pdf`, {
                    title: `${view.type} ${docNo(view)}`,
                    subtitle: `${fmtDay(view.date)} ${view.time} · ${view.counterparty}${view.vatNo ? ` · ${view.vatNo}` : ""}`,
                    table: {
                      cols: ["Line", "Net", "VAT rate", "VAT", "Total"],
                      rows: view.lines.map((l) => [
                        l.label,
                        eur(l.net),
                        `${Math.round(l.rate * 100)}%`,
                        eur(l.vat),
                        eur(l.net + l.vat),
                      ]),
                      rightCols: [1, 2, 3, 4],
                    },
                    totals: [
                      ["Net", eur(view.net)],
                      ["VAT", eur(view.vat)],
                      ["Total", eur(view.total)],
                      ["MARK", view.mark || "pending"],
                      ...(view.original ? [["Corrects", view.original]] : []),
                    ],
                  });
                  toast(`Downloaded ${docNo(view)}.pdf`);
                }}
              >
                PDF
              </Btn>
            </>
          }
        >
          <div className="text-sm space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[view.status]}>myDATA {view.status}</Badge>
              <span className="text-slate-600">
                {sectionName(view.section)} · {view.channel} · {view.method}
              </span>
            </div>
            <Table
              dense
              cols={["Line", "Net", "VAT rate", "VAT", "Total"]}
              right={[1, 2, 3, 4]}
              rows={view.lines.map((l) => [
                l.label,
                eur(l.net),
                `${Math.round(l.rate * 100)}%`,
                eur(l.vat),
                eur(l.net + l.vat),
              ])}
            />
            <div className="flex justify-between font-semibold text-navy-900">
              <span>Total</span>
              <span className="tnum">{eur(view.total)}</span>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] font-mono text-slate-600">
              MARK {view.mark || "— (pending)"} · invoiceType {DOC_CODE[view.type]}
            </div>
            {view.original && (
              <div className="text-[13px]">
                Corrects{" "}
                <button
                  type="button"
                  className="font-semibold text-teal-700 underline"
                  onClick={() => {
                    const o = byId.get(view.original ?? "");
                    if (o) setView(o);
                  }}
                >
                  {view.original}
                </button>
              </div>
            )}
            {view.credits?.length ? (
              <div className="text-[13px]">
                Credited by{" "}
                {view.credits.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="font-semibold text-rose-700 underline mr-2"
                    onClick={() => {
                      const o = byId.get(c);
                      if (o) setView(o);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Modal>
      )}
    </div>
  );
}
