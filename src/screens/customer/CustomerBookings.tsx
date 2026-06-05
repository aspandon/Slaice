import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Card, Btn, Table, EmptyState, ErrorState, StatusBadge, TableSkeleton, CardGridSkeleton, StatCard, Tabs, Modal } from "../../components/ui";
import { WalletButtons } from "../../components/WalletPass";
import { QR, Sparkline } from "../../components/charts";
import { listCustomerBookings } from "../../api";
import { useAsync } from "../../lib/useAsync";
import type { CustomerBooking } from "../../domain/types";
import { useApp } from "../../app/store";

/* ============ MY BOOKINGS ============ */
export function CustomerBookings() {
  const { go, toast } = useApp();
  const [qrFor, setQrFor] = useState<CustomerBooking | null>(null);
  const [filter, setFilter] = useState("all");
  const bookings = useAsync(listCustomerBookings);
  const data = bookings.status === "success" ? bookings.data : [];
  const filtered = data.filter((d) => filter === "all" || d.state === filter);
  const total = data.reduce((a, b) => a + b.price, 0);
  const active = data.filter((d) => d.state === "active").length;
  return (
    <div className="space-y-4">
      {bookings.status === "loading" ? (
        <CardGridSkeleton count={3} className="grid sm:grid-cols-3 gap-4" />
      ) : (
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Active bookings" value={active} sub="ready to redeem" tone="teal" />
          <StatCard label="This season" value={`€${total}`} sub={`${data.length} confirmed`} />
          <StatCard label="Next visit" value="Sun, 19 Jul" sub="Central zone · 2 sunbeds" tone="indigo" />
        </div>
      )}
      {/* Season in review (P5.6) */}
      <Card className="overflow-hidden">
        <div className="grad-sea text-white p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-200"><Icon.sparkles size={13} /> Your season in review</div>
            <div className="mt-1 font-display font-bold text-xl">You've had a sunny summer, Elena ☀️</div>
            <div className="text-[13px] text-white/80 mt-0.5">9 visits · favourite zone <b className="text-white">Central</b> · you saved <b className="text-white">€34</b> with offers.</div>
          </div>
          <div className="flex items-center gap-5 shrink-0">
            <div className="text-center"><div className="text-2xl font-bold font-display tnum">9</div><div className="text-[11px] text-white/70">visits</div></div>
            <div className="text-center"><div className="text-2xl font-bold font-display tnum">€{total}</div><div className="text-[11px] text-white/70">spent</div></div>
            <div className="w-px h-10 bg-white/20" />
            <div className="w-28"><Sparkline data={[1,2,1,3,2,4,3,5]} color="#5EEAD4" width={112} height={36} /><div className="text-[10px] text-white/70 text-center mt-1">visits / month</div></div>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <Tabs tabs={[["all", "All"], ["active", "Active"], ["past", "Past"]]} value={filter} onChange={setFilter} />
          <Btn size="sm" variant="outline" icon={Icon.download} onClick={() => toast("Demo — all QRs e-mailed.", { tone: "success" })}>E-mail all QRs</Btn>
        </div>
        {bookings.status === "loading" ? (
          <TableSkeleton rows={4} cols={6} />
        ) : bookings.status === "error" ? (
          <ErrorState compact body="We couldn't load your bookings." onRetry={bookings.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Icon.grid} title={filter === "active" ? "No active bookings" : "No past bookings yet"} body={filter === "active" ? "Plan a visit for this weekend — Central front-row spots are 20% off." : "Once a visit is over, it will move here."} action={<Btn variant="teal" icon={Icon.sparkles} onClick={() => go("customer", "plan")}>Plan my visit</Btn>} />
        ) : (
          <Table cols={["Booking", "Item", "Date", "Status", "Price", "QR"]} right={[4]}
            rows={filtered.map((r) => [r.id, r.item, r.date, <StatusBadge status={r.status} />, `€${r.price}`, <Btn size="sm" variant="ghost" icon={Icon.qr} onClick={() => setQrFor(r)}>QR</Btn>])} />
        )}
      </Card>
      <Modal open={!!qrFor} onClose={() => setQrFor(null)} title={`Entry QR · ${qrFor?.id ?? ""}`}>
        {qrFor && (
          <div className="text-center">
            <div className="grid place-items-center"><QR size={200} seed={qrFor.id} /></div>
            <div className="mt-3 text-[12px] text-slate-500">Show at the gate · the controller validates in real time.</div>
            <WalletButtons
              className="mt-4 pt-4 border-t border-slate-100"
              pass={{ ref: qrFor.id, holder: "Elena M.", zone: qrFor.item || "Akti tou Iliou", date: qrFor.date || "", seat: "—", guests: 1, total: `€${qrFor.price ?? ""}` }}
            />
            <Btn variant="outline" full className="mt-4" icon={Icon.mail} onClick={() => { toast("QR re-sent to your e-mail.", { tone: "success" }); }}>Resend by e-mail</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}
