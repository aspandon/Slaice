import { useState, type ReactNode } from "react";
import { Icon } from "../../lib/icons";
import { Card, Btn, Table, EmptyState, ErrorState, TableSkeleton, Tabs, Modal, ExportMenu } from "../../components/ui";
import { downloadPDF, downloadZIP, buildPDFBytes, downloadReport, docToReport } from "../../lib/download";
import { listCustomerDocuments } from "../../api";
import { useAsync } from "../../lib/useAsync";
import type { CustomerDocument } from "../../domain/types";
import { useApp, useT } from "../../app/store";
import { useVisits } from "../../lib/useVisits";
import { invoiceForVisit } from "./VisitTicket";

/* ============ ALL RECEIPTS (AENR-573) ============
   Plain words for guests — Receipt, Invoice, Credit note — with the tax
   codes and myDATA marks kept inside the PDF. Invoices the guest requested
   from a visit are listed with the rest. */
export const docKind = (id: string) => (id.startsWith("ΑΠΥ") ? "Receipt" : id.startsWith("ΤΠΥ") ? "Invoice" : "Credit note");

export function CustomerDocs() {
  const { toast, account } = useApp();
  const t = useT();
  const docsQ = useAsync(listCustomerDocuments);
  const { visits } = useVisits();
  // Invoices the guest asked for replace that visit's receipt.
  const requested = account.invoices.flatMap((r) => {
    const v = visits.find((x) => x.key === r.visitKey);
    return v ? [invoiceForVisit(v, r)] : [];
  });
  const docs = [...requested, ...(docsQ.status === "success" ? docsQ.data : [])];
  const [view, setView] = useState<CustomerDocument | null>(null);
  const [filter, setFilter] = useState("all");
  const filtered = docs.filter((d) => filter === "all" || docKind(d.id) === filter);
  const downloadAll = () => {
    const files = filtered.map((d) => ({ name: `${d.id}.pdf`, content: buildReceiptBytes(d) }));
    if (!files.length) { toast(t("Nothing to bundle in this filter.")); return; }
    downloadZIP(`receipts-${new Date().toISOString().slice(0,10)}.zip`, files);
    toast(`${t("Bundled")} ${files.length} PDF${files.length === 1 ? "" : "s"} ${t("into ZIP.")}`, { tone: "success" });
  };
  const download = (d: CustomerDocument) => { downloadPDF(`${d.id}.pdf`, customerReceiptDoc(d)); toast(`${t("Downloaded")} ${d.id}.pdf`, { tone: "success" }); };
  return (
    <Card surface="raised" className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <Tabs tabs={[["all", t("All")], ["Receipt", t("Receipts")], ["Invoice", t("Invoices")], ["Credit note", t("Credit notes")]]} value={filter} onChange={setFilter} />
        <div className="flex flex-wrap gap-2">
          <ExportMenu size="sm" label={t("List")} what={t("receipts list")} onExport={(f) => {
            downloadReport("receipts", {
              title: t("Receipts"),
              subtitle: `${filtered.length} ${t("documents")}`,
              meta: ["Akti tou Iliou AE · VAT EL123456789 · Leof. Poseidonos 1, 174 55 Alimos"],
              sections: [{ table: { cols: [t("Document"), t("Number"), t("For"), t("Date"), t("Amount")], rows: filtered.map((d) => [t(docKind(d.id)), d.id, d.for, d.date, d.amt]) } }],
            }, f);
            toast(`${t("Downloaded")} receipts.${f}`, { tone: "success" });
          }} />
          <Btn size="sm" variant="outline" icon={Icon.download} onClick={downloadAll}>{t("All PDFs (ZIP)")}</Btn>
        </div>
      </div>
      {docsQ.status === "loading" ? (
        <TableSkeleton rows={3} cols={5} />
      ) : docsQ.status === "error" ? (
        <ErrorState compact body={t("We couldn't load your receipts.")} onRetry={docsQ.refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Icon.receipt} title={t("Nothing here yet")} body={t("Receipts appear after each visit you pay for.")} />
      ) : (
        <Table cols={[t("Document"), t("For"), t("Date"), t("Amount"), ""]} right={[3]}
          rows={filtered.map((d) => [
            <span><b className="text-navy-900">{t(docKind(d.id))}</b><span className="block text-[11.5px] text-slate-500 font-mono">{d.id}</span></span>,
            d.for, d.date, d.amt,
            <span className="flex gap-1 justify-end">
              <Btn size="sm" variant="ghost" icon={Icon.doc} onClick={() => setView(d)}>{t("View")}</Btn>
              <Btn size="sm" variant="ghost" icon={Icon.download} onClick={() => download(d)} aria-label={`${t("Download")} ${d.id} PDF`}>PDF</Btn>
            </span>])} />
      )}
      <ReceiptModal doc={view} onClose={() => setView(null)} />
    </Card>
  );
}

/* One receipt: view, download (AENR-563 — opened from each booking too). */
export function ReceiptModal({ doc: view, onClose, extra }: { doc: CustomerDocument | null; onClose: () => void; extra?: ReactNode }) {
  const { toast } = useApp();
  const t = useT();
  return (
    <Modal open={!!view} onClose={onClose} title={view ? t(docKind(view.id)) : t("Document")}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>{t("Close")}</Btn>
        {extra}
        {view && <ExportMenu variant="primary" label={t("Download")} what={view.id} onExport={(f) => { downloadReport(view.id, docToReport(customerReceiptDoc(view)), f); toast(`${t("Downloaded")} ${view.id}.${f}`, { tone: "success" }); }} />}
      </>}>
      {view && (
        <div className="text-sm">
          <div className="border-b border-slate-100 pb-3 mb-3">
            <div className="font-display font-bold text-navy-900">Akti tou Iliou AE</div>
            <div className="text-slate-500 text-[12px]">{view.for} · {view.date} · {t("No.")} {view.id.replace(/^\D+-/, "")}</div>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 pb-1">
            <span>{t("Item")}</span><span className="text-right">{t("VAT")}</span><span className="text-right">{t("Price")}</span>
          </div>
          <div className="space-y-1 text-[13px]">
            {view.lines.map(([l, , v, gross], i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-slate-700">
                <span>{l}</span><span className="tnum text-slate-500 text-right">{v}</span><span className="tnum font-semibold text-navy-900 text-right">{gross}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between font-semibold text-navy-900"><span>{t("Total paid")}</span><span className="tnum">{view.amt}</span></div>
          <p className="mt-2 text-[12px] text-slate-500">{t("Prices include VAT. The PDF carries the tax authority’s verification code.")}</p>
        </div>
      )}
    </Modal>
  );
}

function customerReceiptDoc(d: CustomerDocument) {
  const kind = d.id.startsWith("ΑΠΥ") ? "Receipt" : d.id.startsWith("ΤΠΥ") ? "Invoice" : "Credit note";
  // myDATA document type: retail receipt 11.1, service invoice 2.1, credit 11.4.
  const type = d.id.startsWith("ΑΠΥ") ? "11.1" : d.id.startsWith("ΤΠΥ") ? "2.1" : "11.4";
  return {
    brand: "Akti tou Iliou AE · VAT EL123456789 · Leof. Poseidonos 1, 174 55 Alimos",
    title: `${kind} ${d.id}`,
    subtitle: `${d.for} · ${d.date}`,
    meta: [`Issued ${d.date} · paid by card online (Stripe)`, `myDATA MARK ${d.mark} · document type ${type}`],
    table: {
      cols: ["Item", "Net", "VAT", "Total"],
      rightCols: [1, 2, 3],
      rows: d.lines.map(([l, net, vat, gross]) => [l, net, vat, gross]),
    },
    totals: [["Total paid", d.amt]],
    footer: ["Prices include VAT. Transmitted to the Greek tax authority (AADE · myDATA)."],
  };
}
function buildReceiptBytes(d: CustomerDocument) { return buildPDFBytes(customerReceiptDoc(d)); }
