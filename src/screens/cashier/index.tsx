import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Card, Btn, Badge, PageHead, Field, Input, FutureBanner, ContextPanel } from "../../components/ui";
import { QR } from "../../components/charts";
import { CASHIER_LOCKER_BANKS } from "../../data/mock";
import { useApp } from "../../app/store";

export { CashierIssue } from "./Issue";

/* ============ REDEEM TICKET ============ */
export function CashierRedeem() {
  const { toast } = useApp();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<"valid" | "used" | null>(null);
  const redeem = () => { const ok = !/used/i.test(code); setResult(ok ? "valid" : "used"); toast(ok ? "Demo — ticket redeemed (marked used)." : "Demo — already redeemed."); };
  return (
    <div className="animate-fade-up grid lg:grid-cols-[1fr_320px] gap-5">
      <div>
        <PageHead title="Redeem Ticket" sub="Validate a ticket at the entrance (mark as used). For cashier-issued on-site tickets, QR scanning is not required." badge={<Badge tone="future">Future</Badge>} />
        <FutureBanner />
        <Card className="p-5">
          <Field label="Ticket code or number"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. TK-55119" /></Field>
          <Btn variant="primary" className="mt-3" full icon={Icon.check} disabled={!code} onClick={redeem}>Redeem ticket</Btn>
          {result && (
            <div className={`mt-4 rounded-xl px-4 py-3 flex items-center gap-3 ${result === "valid" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" : "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"}`}>
              {result === "valid" ? <Icon.checkCircle size={22} /> : <Icon.refund size={22} />}
              <div className="font-semibold">{result === "valid" ? "Valid — admitted ✓" : "Already used — cannot reuse"}</div>
            </div>
          )}
        </Card>
      </div>
      <ContextPanel title="Recent redemptions" items={[
        { icon: Icon.checkCircle, title: "#TK-55120 · valid", body: "Adult — admitted 2 minutes ago." },
        { icon: Icon.checkCircle, title: "#TK-55119 · valid", body: "Resident — admitted 8 minutes ago." },
        { icon: Icon.refund, title: "#TK-55104 · used", body: "Already redeemed earlier today." },
      ]} footer="Online QR tickets are scanned at the gate by the Controller." />
    </div>
  );
}

export { CashierRegister } from "./Register";
export { CashierTransactions } from "./Transactions";

/* ============ SELL LOCKER (Future) ============ */
export function CashierLocker() {
  const { toast, go, persona } = useApp();
  const [bankId, setBankId] = useState(CASHIER_LOCKER_BANKS[0].id);
  const [pick, setPick] = useState<{ bank: string; num: number } | null>(null);
  const [sold, setSold] = useState<{ bank: string; num: number; label: string; price: number } | null>(null);
  const bank = CASHIER_LOCKER_BANKS.find((b) => b.id === bankId) ?? CASHIER_LOCKER_BANKS[0];
  const taken = new Set(bank.taken);
  const lockerLabel = pick ? `${bank.id}${String(pick.num).padStart(2, "0")}` : null;
  const charge = () => {
    if (!pick) return;
    const label = `${bank.id}${String(pick.num).padStart(2, "0")}`;
    setSold({ bank: bank.id, num: pick.num, label, price: bank.price });
    toast(`Demo — sold locker ${label} for €${bank.price}.`, { tone: "success" });
    setPick(null);
  };
  return (
    <div className="animate-fade-up">
      <PageHead title="Sell Locker" sub="Sell a day locker on site; mark it in inventory. Customer redeems at entry." badge={<Badge tone="future">Future</Badge>} />
      <FutureBanner />
      <div className="mb-4 rounded-2xl bg-teal-50 ring-1 ring-teal-600/20 px-4 py-3 flex flex-wrap items-center gap-3 text-[13px] text-teal-900">
        <Icon.lock size={16} className="text-teal-700" />
        <span className="flex-1 min-w-[14rem]"><b>Lockers are now sold in Issue Ticket</b> — with tickets in one payment or on their own, priced and counted from Admin › Lockers. This page shows the planned locker-by-number picker.</span>
        <Btn size="sm" variant="teal" onClick={() => go(persona, "issue")}>Open Issue Ticket</Btn>
      </div>
      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <Card className="p-5">
          <Field label="Locker bank">
            <div className="flex flex-wrap gap-1.5">
              {CASHIER_LOCKER_BANKS.map((b) => {
                const active = b.id === bankId;
                const free = b.size - b.taken.length;
                return (
                  <button key={b.id} onClick={() => { setBankId(b.id); setPick(null); }}
                    className={`rounded-xl px-3 py-2 ring-1 text-left transition ${active ? "bg-navy-900 text-white ring-navy-900 shadow-sm" : "bg-white/60 ring-slate-200 text-navy-900 hover:bg-white"}`}>
                    <div className="text-[12px] font-bold leading-none">{b.label}</div>
                    <div className={`text-[10px] mt-1 tnum ${active ? "text-white/70" : "text-slate-500"}`}>{free}/{b.size} free · €{b.price}/day</div>
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pick a locker — {bank.label}</div>
              <div className="text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 mr-2"><span className="w-2.5 h-2.5 rounded bg-teal-500/95 ring-1 ring-white" /> free</span>
                <span className="inline-flex items-center gap-1 mr-2"><span className="w-2.5 h-2.5 rounded bg-slate-300 ring-1 ring-white" /> taken</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-navy-900 ring-1 ring-white" /> selected</span>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-2">
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(10,1fr)" }}>
                {Array.from({ length: bank.size }).map((_, i) => {
                  const num = i + 1;
                  const isTaken = taken.has(num);
                  const isSel = pick && pick.num === num;
                  const cl = isTaken ? "bg-slate-300 text-slate-500 cursor-not-allowed" : isSel ? "bg-navy-900 text-white ring-2 ring-teal-400 shadow" : "bg-teal-500/95 text-white hover:bg-teal-600 shadow-sm";
                  return (
                    <button key={num} disabled={isTaken} onClick={() => setPick({ bank: bank.id, num })}
                      className={`relative aspect-square rounded-md grid place-items-center transition ring-1 ring-white/60 ${cl} pb-3.5`}
                      title={isTaken ? `${bank.id}${String(num).padStart(2,"0")} — taken` : `${bank.id}${String(num).padStart(2,"0")} — €${bank.price}`}>
                      <Icon.lock size={16} />
                      <span className="absolute bottom-0.5 left-0 right-0 text-center text-[10px] font-bold leading-none tnum">{bank.id}{String(num).padStart(2,"0")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-slate-600 text-sm">{pick ? `Locker ${lockerLabel}` : "No locker selected"} · €{bank.price}/day</div>
            <div className="text-2xl font-bold font-display text-navy-900 tnum">€{pick ? bank.price : 0}</div>
          </div>
          <div className="flex gap-2 mt-3">
            <Btn variant="teal" icon={Icon.card} disabled={!pick} onClick={charge}>Charge €{pick ? bank.price : 0}</Btn>
            <Btn variant="ghost" icon={Icon.print} disabled={!sold} onClick={() => toast("Demo — printed locker slip with QR.")}>Print slip</Btn>
          </div>
          {sold && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 ring-1 ring-emerald-600/15 px-3 py-3 animate-fade-up">
              <QR size={64} seed={`LK-${sold.label}`} />
              <div>
                <div className="font-semibold text-emerald-700 flex items-center gap-1.5"><Icon.checkCircle size={16} /> Locker sold · {sold.label}</div>
                <div className="text-[12px] text-emerald-700/80">{bank.label} · €{sold.price} — slip ready to print and hand to the guest.</div>
              </div>
            </div>
          )}
        </Card>
        <ContextPanel title="On-site locker sales" items={[
          { icon: Icon.lock, title: "Inventory tracked", body: "Each sold locker is flagged as taken until the day closes." },
          { icon: Icon.qr, title: "QR on the slip", body: "Guest redeems at the locker entrance — no app needed." },
          { icon: Icon.receipt, title: "ΑΠΥ auto-issued", body: "Transmitted to MyDATA along with the daily takings." },
        ]} />
      </div>
    </div>
  );
}
