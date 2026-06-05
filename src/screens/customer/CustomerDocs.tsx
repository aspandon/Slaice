import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Card, Btn, Badge, Table, EmptyState, ErrorState, StatusBadge, TableSkeleton, CardGridSkeleton, StatCard, Tabs, Modal } from "../../components/ui";
import { QR } from "../../components/charts";
import { downloadPDF, downloadZIP, buildPDFBytes } from "../../lib/download";
import { listCustomerDocuments } from "../../api";
import { useAsync } from "../../lib/useAsync";
import type { CustomerDocument } from "../../domain/types";
import { useApp } from "../../app/store";

/* ============ MY DOCUMENTS ============ */
export function CustomerDocs() {
  const { toast } = useApp();
  const docsQ = useAsync(listCustomerDocuments);
  const docs = docsQ.status === "success" ? docsQ.data : [];
  const [view, setView] = useState<CustomerDocument | null>(null);
  const download = (d: CustomerDocument) => { downloadPDF(`${d.id}.pdf`, customerReceiptDoc(d)); toast(`Downloaded ${d.id}.pdf`, { tone: "success" }); };
  const downloadAll = () => {
    const files = filtered.map((d) => ({ name: `${d.id}.pdf`, content: buildReceiptBytes(d) }));
    if (!files.length) { toast("Nothing to bundle in this filter."); return; }
    downloadZIP(`slaice-receipts-${new Date().toISOString().slice(0,10)}.zip`, files);
    toast(`Bundled ${files.length} PDF${files.length === 1 ? "" : "s"} into ZIP.`, { tone: "success" });
  };
  const [filter, setFilter] = useState("all");
  const tone = (id: string) => id.startsWith("ΑΠΥ") ? "apy" : id.startsWith("ΤΠΥ") ? "tpy" : "credit";
  const filtered = docs.filter((d) => filter === "all" || tone(d.id) === filter);
  const totalAmount = docs.reduce((a, b) => {
    const v = parseInt(b.amt.replace(/[^0-9-−]/g, "").replace("−", "-"), 10) || 0;
    return a + v;
  }, 0);
  return (
    <div className="space-y-4">
      {docsQ.status === "loading" ? (
        <CardGridSkeleton count={3} className="grid sm:grid-cols-3 gap-4" />
      ) : (
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Receipts this season" value={docs.length} sub={`${docs.filter((d) => tone(d.id) === "apy").length} ΑΠΥ`} tone="teal" />
          <StatCard label="Total spend" value={`€${totalAmount}`} sub="all paid · MyDATA ✓" />
          <StatCard label="MyDATA status" value="100%" sub="transmitted" tone="indigo" />
        </div>
      )}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <Tabs tabs={[["all", "All"], ["apy", "ΑΠΥ"], ["tpy", "ΤΠΥ"], ["credit", "Credit notes"]]} value={filter} onChange={setFilter} />
          <Btn size="sm" variant="outline" icon={Icon.download} onClick={downloadAll}>Download all (ZIP)</Btn>
        </div>
        {docsQ.status === "loading" ? (
          <TableSkeleton rows={2} cols={6} />
        ) : docsQ.status === "error" ? (
          <ErrorState compact body="We couldn't load your documents." onRetry={docsQ.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Icon.receipt} title="No documents in this filter" body="Try selecting another category." />
        ) : (
          <Table cols={["Document", "For", "Date", "Amount", "Status", ""]} right={[3]}
            rows={filtered.map((d) => [d.id, d.for, d.date, d.amt, <StatusBadge status="MyDATA ✓" />,
              <span className="flex gap-1 justify-end">
                <Btn size="sm" variant="ghost" icon={Icon.doc} onClick={() => setView(d)}>View</Btn>
                <Btn size="sm" variant="ghost" icon={Icon.download} onClick={() => download(d)}>PDF</Btn>
              </span>])} />
        )}
      </Card>
      <Modal open={!!view} onClose={() => setView(null)} title={view?.id ?? "Document"}
        footer={<>
          <Btn variant="ghost" onClick={() => setView(null)}>Close</Btn>
          <Btn variant="primary" icon={Icon.download} onClick={() => { if (!view) return; download(view); setView(null); }}>Download</Btn>
        </>}>
        {view && (
          <div className="text-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div><div className="font-display font-bold text-navy-900">Akti tou Iliou AE</div><div className="text-slate-500 text-[12px]">ΑΦΜ 123456789 · GR · {view.date}</div></div>
              <Badge tone="green">MyDATA ✓</Badge>
            </div>
            <div className="space-y-1 text-[13px]">
              {view.lines.map(([l, n, v, t], i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 text-slate-600">
                  <span>{l}</span><span className="tnum">{n}</span><span className="tnum text-slate-400">+{v}</span><span className="tnum font-semibold text-navy-900">{t}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between font-semibold text-navy-900"><span>Total gross</span><span className="tnum">{view.amt}</span></div>
            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-lg bg-white p-1.5 ring-1 ring-slate-200"><QR size={84} seed={view.id} /></div>
              <div className="text-[11px] text-slate-500 font-mono leading-snug break-all">MARK<br /><b>{view.mark}</b><br />invoiceType 2.1 · payment 7</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function customerReceiptDoc(d: CustomerDocument) {
  const kind = d.id.startsWith("ΑΠΥ") ? "Retail receipt (ΑΠΥ)"
            : d.id.startsWith("ΤΠΥ") ? "Service receipt (ΤΠΥ)"
            : "Credit note";
  return {
    title: "AKTI TOU ILIOU AE",
    subtitle: `${kind} · ${d.id}`,
    meta: [
      `ΑΦΜ 123456789 · GR · payment 7 (Stripe online)`,
      `Issued ${d.date} · for ${d.for}`,
      `MARK ${d.mark}`,
    ],
    table: {
      cols: ["Item", "Qty", "Net", "VAT", "Total"],
      rightCols: [1, 2, 3, 4],
      rows: d.lines.map(([l, n, v, t]) => [l, n, v, t]),
    },
    totals: [["Total gross", d.amt]],
    footer: [
      "Transmitted to AADE · MyDATA — invoiceType 2.1",
      "Slaice POS · cashier 7 · register 1",
    ],
  };
}
function buildReceiptBytes(d: CustomerDocument) { return buildPDFBytes(customerReceiptDoc(d)); }
