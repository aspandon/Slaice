import { useState, type ReactNode } from "react";
import { Icon } from "../../lib/icons";
import { Card, Btn, Table, EmptyState, ErrorState, TableSkeleton, Tabs, Modal } from "../../components/ui";
import { downloadPDF, downloadZIP } from "../../lib/download";
import { listCustomerDocuments } from "../../api";
import { useAsync } from "../../lib/useAsync";
import type { CustomerDocument } from "../../domain/types";
import { useApp, useT } from "../../app/store";
import { useVisits } from "../../lib/useVisits";
import { OPERATOR } from "../../data/beach";
import { invoiceForVisit } from "./VisitTicket";
import { customerDocBytes, docKind, downloadCustomerDoc } from "./receiptPdf";

/* ============ ALL RECEIPTS (AENR-573) ============
   Plain words for guests — Receipt, Invoice, Credit note — with the tax
   codes and myDATA marks kept inside the PDF. Invoices the guest requested
   from a visit are listed with the rest. Every guest download is a PDF
   (AENR-685 / 687) — no CSV on the guest side. */
export { docKind };

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
    const files = filtered.map((d) => ({ name: `${d.id}.pdf`, content: customerDocBytes(d) }));
    if (!files.length) { toast(t("Nothing to bundle in this filter.")); return; }
    downloadZIP(`receipts-${new Date().toISOString().slice(0,10)}.zip`, files);
    toast(`${t("Bundled")} ${files.length} PDF${files.length === 1 ? "" : "s"} ${t("into ZIP.")}`, { tone: "success" });
  };
  const download = (d: CustomerDocument) => { downloadCustomerDoc(d); toast(`${t("Downloaded")} ${d.id}.pdf`, { tone: "success" }); };
  return (
    <Card surface="raised" className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <Tabs tabs={[["all", t("All")], ["Receipt", t("Receipts")], ["Invoice", t("Invoices")], ["Credit note", t("Credit notes")]]} value={filter} onChange={setFilter} />
        <div className="flex flex-wrap gap-2">
          <Btn size="sm" variant="outline" icon={Icon.download} onClick={() => {
            downloadPDF("receipts.pdf", {
              brand: `${OPERATOR.legal} · VAT ${OPERATOR.vat} · ${OPERATOR.address}`,
              title: t("Receipts"),
              subtitle: `${filtered.length} ${t("documents")}`,
              sections: [{ table: { cols: [t("Document"), t("Number"), t("For"), t("Date"), t("Amount")], rows: filtered.map((d) => [t(docKind(d.id)), d.id, d.billTo ? `${d.for} · ${d.billTo.company}` : d.for, d.date, d.amt]) } }],
            });
            toast(`${t("Downloaded")} receipts.pdf`, { tone: "success" });
          }}>{t("List (PDF)")}</Btn>
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
            <span>{d.for}{d.billTo && <span className="block text-[11.5px] text-slate-500">{d.billTo.company}</span>}</span>, d.date, d.amt,
            <span className="flex gap-1 justify-end">
              <Btn size="sm" variant="ghost" icon={Icon.doc} onClick={() => setView(d)}>{t("View")}</Btn>
              <Btn size="sm" variant="ghost" icon={Icon.download} onClick={() => download(d)} aria-label={`${t("Download")} ${d.id} PDF`}>PDF</Btn>
            </span>])} />
      )}
      <ReceiptModal doc={view} onClose={() => setView(null)} />
    </Card>
  );
}

/* One receipt: view, download (AENR-563 — opened from each booking too). The
   download is the PDF tax document only (AENR-687); right after the guest
   issues an invoice it opens here with "Download invoice (PDF)" (AENR-685). */
export function ReceiptModal({ doc: view, onClose, extra, issued }: { doc: CustomerDocument | null; onClose: () => void; extra?: ReactNode; issued?: boolean }) {
  const { toast } = useApp();
  const t = useT();
  const kind = view ? docKind(view.id) : "Receipt";
  const dlLabel = kind === "Invoice" ? t("Download invoice (PDF)") : kind === "Credit note" ? t("Download credit note (PDF)") : t("Download receipt (PDF)");
  return (
    <Modal open={!!view} onClose={onClose} title={view ? t(kind) : t("Document")}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>{t("Close")}</Btn>
        {extra}
        {view && <Btn variant="primary" icon={Icon.download} onClick={() => { downloadCustomerDoc(view); toast(`${t("Downloaded")} ${view.id}.pdf`, { tone: "success" }); }}>{dlLabel}</Btn>}
      </>}>
      {view && (
        <div className="text-sm">
          {issued && (
            <div role="status" className="mb-3 flex items-start gap-2 rounded-xl bg-emerald-50 ring-1 ring-emerald-600/20 px-3 py-2.5 text-[13px] text-emerald-900">
              <Icon.check size={16} className="mt-0.5 shrink-0" />
              <span>{t("Your invoice is ready. It replaces the receipt for this visit — download the PDF for your records.")}</span>
            </div>
          )}
          <div className="border-b border-slate-100 pb-3 mb-3">
            <div className="font-display font-bold text-navy-900">{OPERATOR.legal}</div>
            <div className="text-slate-500 text-[12px]">{view.for} · {view.date} · {t("No.")} {view.id.replace(/^\D+-/, "")}</div>
          </div>
          {view.billTo && (
            <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[13px]">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("Billed to")}</div>
              <div className="font-semibold text-navy-900">{view.billTo.company}</div>
              <div className="text-slate-600">{t("VAT")} {view.billTo.vatNo} · {view.billTo.address}</div>
            </div>
          )}
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
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between font-semibold text-navy-900"><span>{kind === "Credit note" ? t("Total refunded") : t("Total paid")}</span><span className="tnum">{view.amt}</span></div>
          <p className="mt-2 text-[12px] text-slate-500">{t("Prices include VAT. The PDF carries the tax authority’s verification code.")}</p>
        </div>
      )}
    </Modal>
  );
}
