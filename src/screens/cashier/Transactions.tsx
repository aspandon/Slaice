import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Drawer, EmptyState, Field, Input, Modal, PageHead, Select, Spinner, Stepper, Table, Toggle } from "../../components/ui";
import { useApp } from "../../app/store";
import { ZONES } from "../../data/beach";
import { REFUND_PERMISSION, REFUND_PIN_THRESHOLD, REFUND_REASONS } from "../../data/till";
import { eur, refundMode, refundValue, refundedQty, saleStatus, type TillSale } from "../../domain/till";
import { useLiveSlots } from "../../lib/useLiveSlots";
import { useTill } from "./useTill";
import { ManagerPinModal, RECEIPT_LABEL, ReceiptView, SaleStatusBadge, TENDER_LABEL } from "./TillParts";
import { TillStatus } from "./TillStatus";

/* ============ TODAY'S TRANSACTIONS (AENR-509) ============
   Every till sale of the day: find it by receipt no., card digits, amount or
   phone; open it to reprint (marked COPY), resend, retry myDATA, or start a
   void / refund (AENR-506). Offline-sync conflicts are resolved here (AENR-510). */

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const summary = (s: TillSale) => s.lines.map((l) => (l.setId ? l.setId : `${l.qty} ${l.label}`)).join(" · ");

export function CashierTransactions() {
  const { toast } = useApp();
  const t = useTill();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [copy, setCopy] = useState(false);
  const [refundFor, setRefundFor] = useState<TillSale | null>(null);
  const [resend, setResend] = useState<{ sale: TillSale; ch: "email" | "sms" } | null>(null);
  const today = t.till.sales.filter((s) => s.day === t.day);
  const qq = q.trim().toLowerCase().replace(/[€\s]/g, "");
  const rows = today.filter((s) => !qq || [s.id, s.apy, String(s.total), s.customer?.phone ?? "", ...s.tenders.map((x) => x.ref ?? "")].some((v) => v.toLowerCase().replace(/\s/g, "").includes(qq)));
  const open = t.till.sales.find((s) => s.id === openId) ?? null;
  const conflicts = today.filter((s) => s.conflict);
  const failed = today.filter((s) => s.mydata === "failed").length;

  return (
    <div className="touch-ui animate-fade-up">
      <PageHead title="Transactions" actions={<Toggle label="Demo: fail next myDATA transmission" on={t.till.failNextMydata} onChange={t.setFailNext} />} />
      <TillStatus />
      {conflicts.map((s) => <ConflictCard key={s.id} sale={s} />)}
      <div className="grid sm:grid-cols-4 gap-3 mb-4">
        {[["Sales today", String(today.length)], ["Takings", eur(today.reduce((a, s) => a + s.total, 0))], ["Refunded", eur(today.reduce((a, s) => a + s.refunds.reduce((x, r) => x + r.amount, 0), 0))], ["myDATA issues", String(failed + today.filter((s) => s.mydata === "pending").length)]].map(([l, v]) => (
          <div key={l} className="rounded-2xl bg-white/70 ring-1 ring-slate-200 px-4 py-3"><div className="text-[11.5px] text-slate-500">{l}</div><div className="font-display text-xl font-bold text-navy-900 tnum">{v}</div></div>
        ))}
      </div>
      <Card className="p-4">
        <div className="mb-3 max-w-md">
          <Input aria-label="Search transactions" placeholder="Search receipt no., last 4 card digits, amount or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Icon.receipt} title={today.length ? "No sale matches" : "No sales yet today"} body={today.length ? "Try the receipt number (R-1004), the last 4 card digits or the amount." : "Sales from Sell appear here as they happen."} />
        ) : (
          <Table dense cols={["Time", "Receipt", "Items", "Total", "Tender", "Receipt sent", "Status", "myDATA", ""]} right={[3]}
            rows={rows.map((s) => [
              <span className="tnum">{hhmm(s.at)}</span>,
              <span className="font-mono text-[12px] text-navy-900 whitespace-nowrap">{s.id}</span>,
              <span className="text-[12.5px] text-slate-600 line-clamp-1 max-w-[220px] inline-block" title={summary(s)}>{summary(s)}</span>,
              <span className="tnum font-semibold">{eur(s.total)}</span>,
              <span className="whitespace-nowrap">{s.tenders.map((x) => TENDER_LABEL[x.kind] + (x.terminal ? ` · ${x.terminal.split(" · ")[0].replace("Terminal ", "T")}` : "")).join(" + ")}{s.channel && s.channel !== "cashier" ? <span className="ml-1 text-[11px] text-slate-500">({s.channel === "support" ? "Support" : "Controller"})</span> : null}</span>,
              RECEIPT_LABEL[s.receipt],
              <SaleStatusBadge sale={s} />,
              <MyDataBadge s={s} />,
              <Btn variant="ghost" icon={Icon.eye} onClick={() => { setOpenId(s.id); setCopy(false); }}>Open</Btn>,
            ])} />
        )}
      </Card>

      {open && (
        <Drawer open onClose={() => setOpenId(null)} label={`Sale ${open.id}`}
          title={<div><div className="font-display font-bold text-navy-900 text-lg">Sale {open.id}</div><div className="text-[12px] text-slate-500">{hhmm(open.at)} · {open.cashier} · {open.apy}</div></div>}
          footer={<>
            <Btn variant="outline" icon={Icon.print} onClick={() => { t.reprint(open.id); setCopy(true); toast("Demo — copy printed (marked COPY, same ΑΠΥ and MARK).", { tone: "success" }); }}>Reprint</Btn>
            <Btn variant="outline" icon={Icon.mail} onClick={() => setResend({ sale: open, ch: "email" })}>Email</Btn>
            <Btn variant="outline" icon={Icon.chat} onClick={() => setResend({ sale: open, ch: "sms" })}>SMS</Btn>
            {saleStatus(open) !== "Refunded" && saleStatus(open) !== "Voided" && <Btn variant="primary" icon={Icon.refund} onClick={() => setRefundFor(open)}>{refundMode(open, t.till.shift) === "void" ? "Void / refund" : "Refund"}</Btn>}
          </>}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2"><SaleStatusBadge sale={open} /><MyDataBadge s={open} />{open.customer && <Badge tone="slate">{open.customer.name} · {open.customer.phone}</Badge>}</div>
            {(open.mydata === "failed" || (open.mydata === "pending" && !t.till.offline)) && (
              <div className="rounded-xl bg-rose-50 ring-1 ring-rose-600/20 px-3 py-2 text-[12.5px] text-rose-800 flex items-center gap-2" role="alert">
                <Icon.alert size={14} /> {open.mydata === "failed" ? "myDATA rejected the transmission (timeout)." : "Not yet sent to myDATA."}
                <Btn variant="outline" className="ml-auto" onClick={() => { t.retryMydata(open.id); toast(`${open.apy} transmitted — MARK received.`, { tone: "success" }); }}>Retry</Btn>
              </div>
            )}
            {open.refunds.length > 0 && (
              <ul className="space-y-1 text-[12.5px]">
                {open.refunds.map((r) => (
                  <li key={r.id} className="rounded-lg bg-slate-50 ring-1 ring-slate-200 px-3 py-2">
                    <b className="text-navy-900">{r.kind === "void" ? "Voided" : "Refunded"} {eur(r.amount)}</b> to {r.tender} · {r.reason}{r.note ? ` (${r.note})` : ""} · {hhmm(r.at)}{r.approver ? ` · approved by ${r.approver}` : ""} · {r.doc}
                  </li>
                ))}
              </ul>
            )}
            <ReceiptView sale={open} copy={copy} />
          </div>
        </Drawer>
      )}
      {refundFor && <RefundModal sale={refundFor} onClose={() => setRefundFor(null)} />}
      {resend && <ResendModal {...resend} onClose={() => setResend(null)} />}
    </div>
  );
}

function MyDataBadge({ s }: { s: TillSale }) {
  return s.mydata === "sent" ? <Badge tone="green">Sent</Badge> : s.mydata === "pending" ? <Badge tone="slate"><Icon.clock size={10} /> Pending</Badge> : <Badge tone="red"><Icon.alert size={10} /> Failed</Badge>;
}

function ResendModal({ sale, ch, onClose }: { sale: TillSale; ch: "email" | "sms"; onClose: () => void }) {
  const { toast } = useApp();
  const t = useTill();
  const [to, setTo] = useState(ch === "sms" ? sale.customer?.phone ?? "" : "");
  return (
    <Modal open onClose={onClose} title={`Send receipt ${sale.id} by ${ch === "email" ? "e-mail" : "SMS"}`}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!to.trim()} onClick={() => { t.setDelivery(sale.id, ch); toast(`Demo — receipt ${sale.id} sent to ${to.trim()}.`, { tone: "success" }); onClose(); }}>Send</Btn></>}>
      <Field label={ch === "email" ? "E-mail" : "Mobile"}><Input type={ch === "email" ? "email" : "tel"} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
    </Modal>
  );
}

/* ============ VOID / REFUND (AENR-506) ============
   Whole sale or single lines. Same open shift → void; otherwise refund with a
   credit document linked to the original ΑΠΥ. Money goes back to the original
   tender. A manager PIN is needed without permission, for cash, or above the
   threshold. Refunded sets go back to Free for today. */
function RefundModal({ sale, onClose }: { sale: TillSale; onClose: () => void }) {
  const { toast } = useApp();
  const t = useTill();
  const mode = refundMode(sale, t.till.shift);
  const remaining = (id: string) => (sale.lines.find((l) => l.id === id)?.qty ?? 0) - refundedQty(sale, id);
  const [pick, setPick] = useState<Record<string, number>>(() => Object.fromEntries(sale.lines.map((l) => [l.id, remaining(l.id)])));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const amount = refundValue(sale, pick);
  const card = sale.tenders.find((x) => x.kind === "card");
  const tender: "card" | "cash" = card ? "card" : "cash";
  const permitted = !!REFUND_PERMISSION[t.cashier];
  const needsPin = !permitted || tender === "cash" || amount > REFUND_PIN_THRESHOLD;
  const usedTickets = sale.lines.some((l) => l.kind === "ticket" && (pick[l.id] ?? 0) > 0) && Date.now() - new Date(sale.at).getTime() > 30 * 60000;
  const ok = amount > 0 && reason && (reason !== "Other" || note.trim());

  const run = (approver?: string) => {
    setBusy(true);
    window.setTimeout(() => {
      const r = t.refund(sale.id, { kind: mode, lines: Object.fromEntries(Object.entries(pick).filter(([, n]) => n > 0)), amount, tender, reason, note: note.trim() || undefined, approver });
      setBusy(false);
      toast(`${mode === "void" ? "Voided" : "Refunded"} ${eur(amount)} ${tender === "card" ? `to card ···· ${card?.ref}` : "in cash from the drawer"} · ${r.doc} sent to myDATA.`, { tone: "success" });
      onClose();
    }, tender === "card" ? 1400 : 600);
  };
  const confirm = () => (needsPin ? setPin(true) : run());

  return (
    <>
      <Modal open={!pin} onClose={() => !busy && onClose()} title={`${mode === "void" ? "Void" : "Refund"} · ${sale.id}`}
        footer={<><Btn variant="ghost" disabled={busy} onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={needsPin ? Icon.lock : Icon.refund} disabled={!ok || busy} onClick={confirm}>{busy ? "Processing…" : `${mode === "void" ? "Void" : "Refund"} ${eur(amount)}`}</Btn></>}>
        {busy ? (
          <div className="py-6 text-center" role="status"><Spinner size={28} className="text-teal-600" /><div className="mt-2 font-semibold text-navy-900">{tender === "card" ? "Refunding on the terminal…" : "Opening the drawer…"}</div><div className="text-[12px] text-slate-500">Then the {mode === "void" ? "cancellation" : "credit"} document goes to myDATA.</div></div>
        ) : (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-600">
              {mode === "void"
                ? <>Same shift — the sale is <b>voided</b> and a cancellation document is issued against {sale.apy}.</>
                : <>The sale is from an earlier shift — the money is <b>refunded</b> and a credit note (πιστωτικό) linked to {sale.apy} is sent to myDATA.</>}
            </p>
            <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200 bg-white/70">
              {sale.lines.map((l) => {
                const rem = remaining(l.id);
                return (
                  <li key={l.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-semibold text-navy-900">{l.kind === "ticket" ? `${l.qty} × ${l.label}` : l.label}</div>
                      <div className="text-[11.5px] text-slate-500">{rem < l.qty ? `${l.qty - rem} already refunded · ` : ""}€{l.unit} each</div>
                    </div>
                    {rem === 0 ? <Badge tone="slate">Refunded</Badge> : l.qty === 1 ? (
                      <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer"><input type="checkbox" className="w-5 h-5 accent-teal-600" checked={(pick[l.id] ?? 0) > 0} onChange={(e) => setPick((p) => ({ ...p, [l.id]: e.target.checked ? 1 : 0 }))} />Refund</label>
                    ) : (
                      <Stepper label={`${l.label} to refund`} value={pick[l.id] ?? 0} onChange={(v) => setPick((p) => ({ ...p, [l.id]: Math.min(rem, v) }))} />
                    )}
                  </li>
                );
              })}
            </ul>
            {usedTickets && <div className="rounded-xl bg-amber-50 ring-1 ring-amber-600/20 text-amber-800 text-[12.5px] px-3 py-2 flex gap-2"><Icon.alert size={14} className="shrink-0 mt-0.5" /> These entry tickets were likely already scanned at the gate — check before refunding them.</div>}
            <div className="grid sm:grid-cols-2 gap-2">
              <Field label="Reason"><Select value={reason} onChange={(e) => setReason(e.target.value)} options={[{ v: "", l: "Choose a reason…" }, ...REFUND_REASONS.map((r) => ({ v: r, l: r }))]} /></Field>
              <Field label={reason === "Other" ? "Note (required)" : "Note (optional)"}><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            </div>
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2.5 text-[13px] flex flex-wrap items-center justify-between gap-2">
              <span>Back to <b className="text-navy-900">{tender === "card" ? `the same card ···· ${card?.ref}` : "cash from the drawer"}</b></span>
              <span className="font-display text-xl font-bold text-navy-900 tnum">{eur(amount)}</span>
            </div>
            <div className="text-[12px] text-slate-500 flex items-center gap-1.5">
              <Icon.lock size={12} />
              {needsPin ? `Needs a manager PIN — ${!permitted ? `${t.cashier} has no refund permission` : tender === "cash" ? "cash refunds always do" : `above €${REFUND_PIN_THRESHOLD}`}.` : `${t.cashier} may refund up to €${REFUND_PIN_THRESHOLD} to card.`}
            </div>
          </div>
        )}
      </Modal>
      {pin && <ManagerPinModal reason={`${mode === "void" ? "Void" : "Refund"} ${eur(amount)} on ${sale.id} — ${reason}.`} onClose={() => setPin(false)} onApproved={(m) => { setPin(false); run(m); }} />}
    </>
  );
}

/* Offline-sync conflict: a set sold at the till while offline was booked
   online meanwhile. Move the guest to another free set, or refund the set. */
function ConflictCard({ sale }: { sale: TillSale }) {
  const { toast } = useApp();
  const t = useTill();
  const liveSlots = useLiveSlots();
  const line = sale.lines.find((l) => l.id === sale.conflict);
  const [refunding, setRefunding] = useState(false);
  if (!line) return null;
  const zone = ZONES.find((z) => z.id === line.zoneId) ?? ZONES[0];
  const alt = liveSlots(zone, [t.day]).filter((s) => s.state === "a").sort((a, b) => a.y - b.y)[0];
  return (
    <div className="mb-4 rounded-2xl bg-amber-50 ring-1 ring-amber-600/25 px-4 py-3 flex flex-wrap items-center gap-3" role="alert">
      <Icon.alert size={18} className="text-amber-600 shrink-0" />
      <div className="flex-1 min-w-[220px] text-[13px] text-amber-900">
        <b>Sync conflict · {sale.id}</b> — {line.setId} in {zone.name} was booked online while the till was offline.
      </div>
      {alt && <Btn variant="primary" onClick={() => { t.moveLine(sale.id, line.id, alt.id, `Sunbed set ${alt.id} · ${zone.name}`); toast(`Moved to ${alt.id} — tell the guest their new set.`, { tone: "success" }); }}>Move to {alt.id}</Btn>}
      <Btn variant="outline" onClick={() => setRefunding(true)}>Refund the set</Btn>
      {refunding && (
        <ManagerPinModal reason={`Refund ${line.setId} (${eur(line.unit)}) — booked online while offline.`} onClose={() => setRefunding(false)}
          onApproved={(m) => { setRefunding(false); const card = sale.tenders.some((x) => x.kind === "card"); t.refund(sale.id, { kind: "refund", lines: { [line.id]: 1 }, amount: refundValue(sale, { [line.id]: 1 }), tender: card ? "card" : "cash", reason: "Duplicate charge", note: "Booked online while offline", approver: m }); t.clearConflict(sale.id); toast(`${line.setId} refunded.`, { tone: "success" }); }} />
      )}
    </div>
  );
}
