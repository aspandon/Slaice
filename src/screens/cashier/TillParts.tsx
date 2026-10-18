import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Field, Input, Modal } from "../../components/ui";
import { QR } from "../../components/charts";
import { TENANT, ZONES } from "../../data/beach";
import { MANAGER_PINS } from "../../data/till";
import type { TenderKind } from "../../domain/till";
import { basketTotals, changeDue, discountAmount, eur, lineGross, saleStatus, type ReceiptChoice, type TillSale, vatBreakdown, vatFromTerms } from "../../domain/till";
import { useSiteTerms } from "../../lib/useEconomics";

/* ============ Manager approval ============
   A cashier without the permission enters a manager PIN (RBAC: Manager /
   Admin). Wrong PIN → inline error; nothing happens until it's right. */
export function ManagerPinModal({ reason, onClose, onApproved }: { reason: string; onClose: () => void; onApproved: (manager: string) => void }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    const who = MANAGER_PINS[pin];
    if (!who) {
      setErr("Wrong PIN — ask a manager to enter theirs.");
      setPin("");
      return;
    }
    onApproved(who);
  };
  return (
    <Modal open onClose={onClose} title="Manager approval"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.lock} disabled={pin.length < 4} onClick={submit}>Approve</Btn></>}>
      <form onSubmit={(e) => { e.preventDefault(); if (pin.length >= 4) submit(); }} className="space-y-3">
        <p className="text-sm text-slate-600">{reason}</p>
        <Field label="Manager PIN">
          <Input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setErr(""); }} aria-invalid={!!err} />
        </Field>
        {err && <div role="alert" className="text-[12.5px] text-rose-700 flex items-center gap-1.5"><Icon.alert size={13} /> {err}</div>}
        <div className="text-[11.5px] text-slate-500">Demo PINs: 1234 (Eleni Markou) · 5678 (Giorgos Antoniou)</div>
      </form>
    </Modal>
  );
}

/* ============ Receipt (ΑΠΥ) ============ */
const zoneName = (id?: string) => ZONES.find((z) => z.id === id)?.name ?? "";
const time = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
export const TENDER_LABEL: Record<string, string> = { card: "Card", cash: "Cash", voucher: "Voucher" };

export function ReceiptView({ sale, copy = false }: { sale: TillSale; copy?: boolean }) {
  // As charged (AENR-728): the rates kept on the sale; older sales take the tenant's current ones.
  const siteVat = vatFromTerms(useSiteTerms());
  const rates = sale.vat ?? siteVat;
  const t = basketTotals(sale.lines, sale.discounts, rates);
  const sets = sale.lines.filter((l) => l.setId);
  const people = sale.lines.filter((l) => l.kind === "ticket").reduce((a, l) => a + l.qty, 0);
  const lockers = sale.lines.flatMap((l) => (l.kind === "locker" ? l.codes ?? [] : []));
  const parking = sale.lines.flatMap((l) => (l.kind === "parking" ? l.codes ?? [] : []));
  const change = changeDue(sale.tenders);
  const status = saleStatus(sale);
  return (
    <div className="relative mx-auto max-w-[340px] bg-white text-navy-900 rounded-lg ring-1 ring-slate-200 shadow-soft px-5 py-4 font-mono text-[11.5px] leading-relaxed">
      {copy && <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center text-[44px] font-black text-slate-200/80 -rotate-12">COPY</div>}
      <div className="relative">
        <div className="text-center">
          <div className="font-bold text-[13px]">{TENANT.name}</div>
          <div>Beach services · {TENANT.place}</div>
          <div>VAT no. EL 801234567 · Tax office Glyfadas</div>
        </div>
        <div className="border-t border-dashed border-slate-300 my-2" />
        <div className="flex justify-between"><span>{sale.apy}</span><span>{time(sale.at)}</span></div>
        <div className="flex justify-between"><span>Receipt {sale.id}{copy ? " · COPY" : ""}</span><span>{sale.cashier.split(" ")[0]}</span></div>
        {status !== "Completed" && <div className="text-center font-bold mt-1">*** {status.toUpperCase()} ***</div>}
        <div className="border-t border-dashed border-slate-300 my-2" />
        {sale.lines.map((l) => (
          <div key={l.id} className="flex justify-between gap-2">
            <span className="min-w-0">{l.qty > 1 ? `${l.qty} × ` : ""}{l.label}{l.bundle ? ` (${l.bundle})` : ""}</span>
            <span className="tnum shrink-0">{eur(lineGross(l))}</span>
          </div>
        ))}
        {sale.discounts.map((d) => (
          <div key={d.id} className="flex justify-between gap-2"><span>{d.label}</span><span className="tnum">−{eur(discountAmount(d, sale.lines))}</span></div>
        ))}
        <div className="border-t border-dashed border-slate-300 my-2" />
        <div className="flex justify-between font-bold text-[13px]"><span>TOTAL</span><span className="tnum">{eur(t.total)}</span></div>
        {vatBreakdown(sale.lines, t.discount, rates).map((r) => (
          <div key={r.rate} className="flex justify-between"><span>Net {Math.round(r.rate * 100)}% · VAT</span><span className="tnum">{eur(r.net)} · {eur(r.vat)}</span></div>
        ))}
        {sale.tenders.map((td, i) => (
          <div key={i} className="flex justify-between"><span>{TENDER_LABEL[td.kind]}{td.ref ? ` ${td.kind === "card" ? "···· " : ""}${td.ref}` : ""}{td.terminal ? ` · ${td.terminal.split(" · ")[0]}` : ""}</span><span className="tnum">{eur(td.given ?? td.amount)}</span></div>
        ))}
        {change > 0 && <div className="flex justify-between"><span>Change</span><span className="tnum">{eur(change)}</span></div>}
        {sets.length > 0 && (
          <>
            <div className="border-t border-dashed border-slate-300 my-2" />
            <div>Sunbed sets: <b>{sets.map((l) => l.setId).join(", ")}</b> · {[...new Set(sets.map((l) => zoneName(l.zoneId)))].join(", ")}</div>
          </>
        )}
        <div className="border-t border-dashed border-slate-300 my-2" />
        <div className="flex items-start gap-3">
          <QR size={72} seed={`ENTRY-${sale.id}`} />
          <div className="min-w-0">
            <div className="font-bold">Entry pass{people > 0 ? ` · ${people} ${people === 1 ? "person" : "people"}` : ""}</div>
            <div>{people > 0 ? "One QR for everyone on this sale" : "Scan at the gate"}</div>
            {lockers.length > 0 && <div>Locker{lockers.length > 1 ? "s" : ""}: <b>{lockers.join(", ")}</b></div>}
            {parking.length > 0 && <div>Parking spot{parking.length > 1 ? "s" : ""}: <b>{parking.join(", ")}</b></div>}
            <div className="mt-1">{sale.mydata === "sent" ? <>MARK {sale.mark}</> : <>myDATA: pending transmission</>}</div>
          </div>
        </div>
        {sale.mydata === "sent" && <div className="mt-2 flex items-center gap-2"><QR size={44} seed={`MYDATA-${sale.mark}`} /><span>Verify at myDATA (AADE)</span></div>}
      </div>
    </div>
  );
}

export function ReceiptModal({ sale, copy, onClose }: { sale: TillSale; copy?: boolean; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={`Receipt ${sale.id}${copy ? " · copy" : ""}`}
      footer={<Btn variant="primary" onClick={onClose}>Done</Btn>}>
      <ReceiptView sale={sale} copy={copy} />
    </Modal>
  );
}

/* ============ After payment ============
   Paid ✓, change due, document numbers and how the customer wants the receipt.
   The ΑΠΥ is issued to myDATA whatever the choice. */
export const RECEIPT_CHOICES: { v: ReceiptChoice; l: string; icon: typeof Icon.print }[] = [
  { v: "print", l: "Print", icon: Icon.print },
  { v: "email", l: "Email", icon: Icon.mail },
  { v: "sms", l: "SMS", icon: Icon.chat },
  { v: "qr", l: "Show QR", icon: Icon.qr },
  { v: "none", l: "No receipt", icon: Icon.x },
];
export const RECEIPT_LABEL: Record<ReceiptChoice, string> = { print: "Printed", email: "Email", sms: "SMS", qr: "QR on screen", none: "No receipt" };

export function SaleDone({ sale, onDeliver, onNew }: { sale: TillSale; onDeliver: (c: ReceiptChoice, to?: string) => void; onNew: () => void }) {
  const change = changeDue(sale.tenders);
  const [ask, setAsk] = useState<"email" | "sms" | null>(null);
  const [to, setTo] = useState("");
  const [chosen, setChosen] = useState<ReceiptChoice | null>(null);
  const [showQr, setShowQr] = useState(false);
  const pick = (c: ReceiptChoice) => {
    if (c === "email" || c === "sms") {
      setAsk(c);
      setTo(c === "sms" ? sale.customer?.phone ?? "" : "");
      return;
    }
    setChosen(c);
    setShowQr(c === "qr");
    onDeliver(c);
  };
  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-emerald-500 text-white grid place-items-center shrink-0"><Icon.check size={22} /></span>
        <div className="min-w-0">
          <div className="font-display font-bold text-navy-900 text-lg leading-tight">Paid · {eur(sale.total)}</div>
          <div className="text-[12px] text-slate-500">{sale.id} · {sale.apy} · {sale.tenders.map((t) => TENDER_LABEL[t.kind] + (t.terminal ? ` (${t.terminal.split(" · ")[0]})` : "")).join(" + ")}</div>
        </div>
      </div>
      {change > 0 && (
        <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-600/20 px-4 py-3 flex items-center justify-between" role="status">
          <span className="font-semibold text-amber-800">Change due</span>
          <span className="font-display text-3xl font-bold text-amber-800 tnum">{eur(change)}</span>
        </div>
      )}
      <div className={`rounded-xl px-3 py-2 text-[12.5px] flex items-center gap-2 ${sale.mydata === "sent" ? "bg-emerald-50 text-emerald-800" : sale.mydata === "pending" ? "bg-slate-100 text-slate-700" : "bg-rose-50 text-rose-800"}`}>
        {sale.mydata === "sent" ? <><Icon.checkCircle size={14} /> ΑΠΥ transmitted to myDATA · MARK {sale.mark}</> : sale.mydata === "pending" ? <><Icon.clock size={14} /> Offline — ΑΠΥ issued locally, sent to myDATA on reconnect</> : <><Icon.alert size={14} /> myDATA transmission failed — retry from Transactions</>}
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Receipt</div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {RECEIPT_CHOICES.map((c) => (
            <button key={c.v} type="button" onClick={() => pick(c.v)} aria-pressed={chosen === c.v}
              className={`min-h-[56px] rounded-xl ring-1 px-2 py-2 text-[12px] font-semibold flex flex-col items-center justify-center gap-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${chosen === c.v ? "bg-navy-900 text-white ring-navy-900" : "bg-white/70 ring-slate-200 text-navy-900 hover:bg-white"}`}>
              <c.icon size={16} />{c.l}
            </button>
          ))}
        </div>
        {ask && (
          <form className="mt-2 flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); if (!to.trim()) return; setChosen(ask); onDeliver(ask, to.trim()); setAsk(null); }}>
            <div className="flex-1"><Field label={ask === "email" ? "Customer e-mail" : "Customer mobile"}>
              <Input type={ask === "email" ? "email" : "tel"} value={to} onChange={(e) => setTo(e.target.value)} placeholder={ask === "email" ? "name@example.com" : "+30 69…"} />
            </Field></div>
            <Btn type="submit" variant="primary" disabled={!to.trim()}>Send</Btn>
          </form>
        )}
        {showQr && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-white ring-1 ring-slate-200 p-3">
            <QR size={120} seed={`RCPT-${sale.id}`} />
            <div className="text-[12.5px] text-slate-600">The customer scans this to get the digital receipt and entry pass on their phone.</div>
          </div>
        )}
      </div>
      <Btn variant="primary" size="lg" full icon={Icon.plus} onClick={onNew}>New sale</Btn>
    </div>
  );
}

export const SaleStatusBadge = ({ sale }: { sale: TillSale }) => {
  const s = saleStatus(sale);
  return <Badge tone={s === "Completed" ? "green" : s === "Part refunded" ? "amber" : "slate"}>{s}</Badge>;
};

/* One Charge button (AENR-606), shared by the till and the controller's walk-in
   (AENR-665): it opens on the tender used last; card, cash, voucher or split are
   chosen in the tender sheet. */
export function ChargeButton({ total, last, onCharge }: { total: number; last?: TenderKind; onCharge: (k: TenderKind) => void }) {
  const k = last ?? "card";
  return (
    <div>
      <Btn variant="teal" size="lg" full icon={k === "cash" ? Icon.cash : k === "voucher" ? Icon.layers : Icon.card} onClick={() => onCharge(k)}>
        Charge {eur(total)}
      </Btn>
      <div className="mt-1.5 text-center text-[11.5px] text-slate-500">Opens on {k} — switch to card, cash, voucher or split there.</div>
    </div>
  );
}
