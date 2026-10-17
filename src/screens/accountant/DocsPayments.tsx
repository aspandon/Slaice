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
  Tabs, ExportMenu, CompactList, CompactRow } from "../../components/ui";
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
import { downloadCSV, downloadReport } from "../../lib/download";
import { SectionChips, useFinanceData, useSection } from "../reporting/FinanceTabs";

import { TENANT } from "../../data/beach";
/* ============ Accountant › Documents & Payments (AENR-526) ============
   Every fiscal document (ΑΠΥ, ΤΠΥ, ΠΑΠΥ, ΠΤΠΥ, cancellations — credits linked
   to their originals) and every card transaction for the period, with the
   shared period and section controls, filters, search and an accounting CSV
   of exactly what's on screen. Read-only. Totals reconcile with Reporting ›
   Payments because both are built from the same daily figures. */

const PAGE = 25;
const TYPES: DocType[] = ["ΑΠΥ", "ΤΠΥ", "ΠΑΠΥ", "ΠΤΠΥ", "Cancellation"];
// What each myDATA code means, under the count tiles (AENR-701).
const TYPE_HINT: Record<DocType, string> = {
  ΑΠΥ: "Receipts (B2C)",
  ΤΠΥ: "Invoices (B2B)",
  ΠΑΠΥ: "Credit notes on receipts",
  ΠΤΠΥ: "Credit notes on invoices",
  Cancellation: "Cancelled documents",
};
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

export function DocsPayments({ only }: { only?: "documents" | "payments" } = {}) {
  const { toast, till, account, payLinks } = useApp();
  // Month-end exceptions deep-link here with ?tab=…&status=… (AENR-588).
  const [tab, setTab] = useState<"documents" | "payments">(() =>
    only ?? (readHashQuery().get("tab") === "payments" ? "payments" : "documents"),
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
  // Everything but the type filter — the type tiles count from this (AENR-701).
  const docBase = docs.filter(
    (d) =>
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
  const docRows = type ? docBase.filter((d) => d.type === type) : docBase;
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

  // A readable PDF of the list in view (AENR-593); the CSVs keep the full accounting layout.
  const exportPdf = () => {
    const filt = [type && `type ${DOC_CODE[type as DocType]}`, status && `status ${status}`, channel && `channel ${channel}`, q && `search “${q}”`].filter(Boolean).join(" · ");
    const sub = `${label} · zone: ${section ? sectionName(section) : "all"}${filt ? ` · ${filt}` : ""}`;
    if (tab === "documents") {
      const net = sum(docRows.map((d) => d.net));
      const vat = sum(docRows.map((d) => d.vat));
      downloadReport(slug, {
        title: "Fiscal documents",
        subtitle: sub,
        meta: [`${TENANT.name} · issued via the e-invoicing provider, transmitted to myDATA (AADE)`],
        sections: [
          { kpis: [
            { label: "Documents", value: String(docRows.length) },
            { label: "Net", value: `€${net.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: "VAT", value: `€${vat.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: "Not transmitted", value: String(docRows.filter((d) => d.status !== "sent").length), sub: "pending or failed" },
          ] },
          { title: "Documents", table: {
            cols: ["Date", "Document", "Type", "Counterparty", "Net (€)", "VAT (€)", "Total (€)", "Method", "MARK", "myDATA"],
            rows: docRows.map((d) => [`${d.date} ${d.time}`, docNo(d), DOC_CODE[d.type], d.counterparty, d.net, d.vat, d.total, d.method, d.mark || "—", d.status]),
            total: ["Total", "", "", "", net, vat, sum(docRows.map((d) => d.total)), "", "", ""],
          } },
        ],
      }, "pdf");
    } else {
      downloadReport(slug, {
        title: "Payments",
        subtitle: sub,
        meta: [`${TENANT.name} · card captures and Stripe payouts`],
        sections: [
          { kpis: [
            { label: "Transactions", value: String(txRows.length) },
            { label: "Captured", value: `€${txTotal.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: "Fees", value: `€${sum(txRows.map((t) => t.fee)).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: "Net", value: `€${sum(txRows.map((t) => t.net)).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          ] },
          { title: "Transactions", table: {
            cols: ["Date", "Transaction", "Booking / receipt", "Zone", "Channel", "Method", "Amount (€)", "Fee (€)", "Net (€)", "Payout", "Status"],
            rows: txRows.map((t) => [`${t.date} ${t.time}`, t.id, t.ref, sectionName(t.section), t.channel, t.method, t.amount, t.fee, t.net, t.payout, t.status]),
            total: ["Total", "", "", "", "", "", txTotal, sum(txRows.map((t) => t.fee)), sum(txRows.map((t) => t.net)), "", ""],
          } },
        ],
      }, "pdf");
    }
    toast(`Exported ${rows.length} ${tab} · ${label} (PDF).`, { tone: "success" });
  };

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
        {!only && <Tabs
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
        />}
        {/* One toolbar (AENR-701): read-only state, density and every export sit together on the right. */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 min-h-[32px] text-[12.5px] font-semibold text-slate-600"
            title="The accountant sees and exports; changes are made by the manager or the till."
          >
            <Icon.lock size={13} /> Read-only
          </span>
          <DensityToggle />
          <ExportMenu
            variant="primary"
            what={tab}
            onExport={(f) => (f === "pdf" ? exportPdf() : exportCsv())}
            extra={tab === "documents" ? [{ label: "CSV per line", hint: "One row per document line, with its VAT rate", onSelect: () => exportCsv(true) }] : []}
          />
        </div>
      </div>
      <p className="flex items-center gap-2 text-[12.5px] text-slate-600">
        <Icon.shieldAlert size={14} className="shrink-0 text-amber-600" />
        <span>
          <b className="text-navy-900">Kept 5 years.</b> Issued documents and their myDATA records are a legal
          obligation (GDPR &amp; tax law) and are exempt from erasure requests.
        </span>
      </p>
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* Each tile is also the quickest type filter: tap to show only that type, tap again for all. */}
          {TYPES.map((t) => {
            const on = type === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setType(on ? "" : t);
                  reset();
                }}
                className={`text-left rounded-xl px-3 py-2.5 ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  on ? "bg-navy-900 ring-navy-900 text-white" : "bg-white/80 ring-slate-200 hover:ring-slate-300"
                } ${t === "Cancellation" ? "col-span-2 sm:col-span-1" : ""}`}
              >
                <span className={`block text-[12.5px] font-semibold ${on ? "text-white" : "text-navy-900"}`}>{t === "Cancellation" ? "Cancellations" : t}</span>
                <span className={`block text-[12px] ${on ? "text-white/75" : "text-slate-500"}`}>{TYPE_HINT[t]}</span>
                <span className={`mt-1 block font-display text-xl font-bold tnum ${on ? "text-white" : "text-navy-900"}`}>
                  {docBase.filter((d) => d.type === t).length.toLocaleString("en-GB")}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[13px]">
          {[
            ["Transactions", txRows.length.toLocaleString("en-GB")],
            ["Amount", eur(txTotal)],
            ["Fees", eur(sum(txRows.map((t) => t.fee)))],
            ["Net", eur(sum(txRows.map((t) => t.net)))],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2">
              <div className="text-slate-500">{l}</div>
              <div className="font-display text-xl font-bold text-navy-900 tnum">{v}</div>
            </div>
          ))}
          {!status && !channel && !qq && (
            <div className="col-span-2 sm:col-span-4 text-[12.5px] text-slate-500 flex items-center gap-1.5">
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
          <>
          <div className="xl:hidden">
            <CompactList label="Documents">
              {docRows.slice(safe * PAGE, safe * PAGE + PAGE).map((d) => (
                <CompactRow
                  key={d.id}
                  onOpen={() => setView(d)}
                  openLabel={`Open ${d.type} ${docNo(d)}`}
                  title={`${d.type} ${docNo(d)}`}
                  reference={d.time}
                  sub={`${fmtDay(d.date)} · ${d.counterparty} · ${sectionName(d.section)} · ${d.channel}`}
                  badges={
                    <>
                      <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
                      {d.live && <Badge tone="indigo">Live</Badge>}
                      <span className="text-[12.5px] text-slate-500">{d.method}</span>
                    </>
                  }
                  amount={<span className={d.total < 0 ? "text-rose-600" : undefined}>{eur(d.total)}</span>}
                />
              ))}
            </CompactList>
          </div>
          <div className="hidden xl:block">
          <Table
            rowLink
            dense
            cols={[
              "Date",
              "Document",
              "Counterparty · zone",
              "Net",
              "VAT",
              "Total",
              "Method",
              "MARK",
              "Status",
              "",
            ]}
            right={[3, 4, 5]}
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
                {d.ref && <span className="block text-[12px] text-slate-500">{d.ref}</span>}
                {d.original && (
                  <span className="block text-[12px] text-slate-500">on {d.original}</span>
                )}
                {d.credits?.length ? (
                  <span className="block text-[12px] text-rose-600">
                    credited: {d.credits.join(", ")}
                  </span>
                ) : null}
              </span>,
              <span className="whitespace-nowrap">
                {d.counterparty}
                {d.vatNo && <span className="text-[12px] text-slate-500"> · {d.vatNo}</span>}
                <span className="block text-[12px] text-slate-500">
                  {sectionName(d.section)} · {d.channel}
                </span>
              </span>,
              <span className="tnum">{eur(d.net)}</span>,
              <span className="tnum">{eur(d.vat)}</span>,
              <b className={`tnum ${d.total < 0 ? "text-rose-600" : "text-navy-900"}`}>
                {eur(d.total)}
              </b>,
              <span className="text-[13px]">{d.method}</span>,
              <span className="font-mono text-[12px] whitespace-nowrap" title={d.mark || undefined}>
                {d.mark ? `${d.mark.slice(0, 6)}…${d.mark.slice(-4)}` : "—"}
              </span>,
              <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>,
              <button
                type="button"
                className="row-link grid place-items-center w-8 h-8 rounded-lg text-slate-500 ring-1 ring-slate-200 bg-white hover:text-navy-900 hover:bg-slate-50 hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                onClick={() => setView(d)}
                aria-label={`Open ${docNo(d)}`}
                title="Open"
              >
                <Icon.chevR size={15} />
              </button>,
            ])}
          />
          </div>
          </>
        ) : (
          <>
          <div className="xl:hidden">
            <CompactList label="Card charges">
              {(txRows.slice(safe * PAGE, safe * PAGE + PAGE) as Txn[]).map((t) => (
                <CompactRow
                  key={t.id}
                  title={t.ref}
                  reference={t.time}
                  sub={`${fmtDay(t.date)} · ${sectionName(t.section)} · ${t.channel} · ${t.method}`}
                  badges={
                    <>
                      <Badge tone={TX_TONE[t.status]}>{t.status}</Badge>
                      <span className="text-[12.5px] text-slate-500 tnum">
                        fee {eur(t.fee)} · payout {fmtDay(t.payout)}
                      </span>
                    </>
                  }
                  amount={eur(t.amount)}
                />
              ))}
            </CompactList>
          </div>
          <div className="hidden xl:block">
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
              <span className="whitespace-nowrap text-[13px]">
                {t.method}
                {t.terminal && <span className="block text-[12px] text-slate-500">{t.terminal}</span>}
              </span>,
              <b className="tnum text-navy-900">{eur(t.amount)}</b>,
              <span className="tnum">{eur(t.fee)}</span>,
              <span className="tnum">{eur(t.net)}</span>,
              <span className="whitespace-nowrap">{fmtDay(t.payout)}</span>,
              <Badge tone={TX_TONE[t.status]}>{t.status}</Badge>,
            ])}
          />
          </div>
          </>
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
              <ExportMenu
                variant="primary"
                label="Download"
                what={docNo(view)}
                onExport={(f) => {
                  downloadReport(docNo(view), {
                    brand: "Akti tou Iliou AE · VAT EL123456789 · Leof. Poseidonos 1, 174 55 Alimos",
                    title: `${view.type} ${docNo(view)}`,
                    subtitle: `${fmtDay(view.date)} ${view.time} · ${view.counterparty}${view.vatNo ? ` · VAT ${view.vatNo}` : ""}`,
                    meta: [`Payment: ${view.method} · Zone: ${sectionName(view.section)} · Channel: ${view.channel}`, `myDATA MARK: ${view.mark || "pending"} · invoiceType ${DOC_CODE[view.type]}${view.original ? ` · corrects ${view.original}` : ""}`],
                    sections: [{
                      table: {
                        cols: ["Line", "Net (€)", "VAT rate", "VAT (€)", "Total (€)"],
                        rows: view.lines.map((l) => [l.label, l.net, `${Math.round(l.rate * 100)}%`, l.vat, l.net + l.vat]),
                        total: ["Total", view.net, "", view.vat, view.total],
                      },
                    }],
                    footer: ["Issued through the certified e-invoicing provider and transmitted to AADE myDATA."],
                  }, f);
                  toast(`Downloaded ${docNo(view)}.${f}`);
                }}
              />
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
