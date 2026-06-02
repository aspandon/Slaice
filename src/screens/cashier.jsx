import { useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Card, Btn, Badge, PageHead, Table, StatCard, Stepper, Field, Input, Select } from "../components/ui.jsx";
import { QR } from "../components/charts.jsx";
import { useApp } from "../app/store.jsx";

/* ============ ISSUE ON-SITE TICKET ============ */
export function CashierIssue() {
  const { toast } = useApp();
  const cats = [{ k: "adult", t: "Adult", p: 10 }, { k: "resident", t: "Resident", p: 6 }, { k: "child", t: "Child", p: 5 }];
  const [qty, setQty] = useState({ adult: 2, resident: 0, child: 0 });
  const [issued, setIssued] = useState(false);
  const total = cats.reduce((a, c) => a + c.p * qty[c.k], 0);
  const n = Object.values(qty).reduce((a, b) => a + b, 0);
  return (
    <div className="animate-fade-up max-w-2xl">
      <PageHead title="Issue On-site Ticket" sub="Anonymous ticket issuing with on-the-spot printing & payment (Stripe terminal or cash)." badge={<Badge tone="mvp">MVP</Badge>} />
      <Card className="p-5 space-y-3">
        {cats.map((c) => (
          <div key={c.k} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 px-4 py-3">
            <div><div className="font-semibold text-navy-900">{c.t}</div><div className="text-[12px] text-slate-400">€{c.p} per person</div></div>
            <Stepper value={qty[c.k]} onChange={(v) => setQty((q) => ({ ...q, [c.k]: v }))} />
          </div>
        ))}
        <div className="flex items-center justify-between pt-1"><div className="text-slate-500 text-sm">{n} ticket(s) · anonymous</div><div className="text-2xl font-bold font-display text-navy-900 tnum">€{total}</div></div>
        <div className="flex gap-2 pt-1 flex-wrap">
          <Btn variant="teal" icon={Icon.card} disabled={!n} onClick={() => { setIssued(true); toast("Demo — card payment via Stripe terminal."); }}>Charge €{total} (card)</Btn>
          <Btn variant="outline" icon={Icon.cash} disabled={!n} onClick={() => { setIssued(true); toast("Demo — cash payment recorded."); }}>Cash</Btn>
          <Btn variant="ghost" icon={Icon.print} disabled={!issued} onClick={() => toast("Demo — printed on the receipt printer (ESC/POS).")}>Print ticket</Btn>
        </div>
      </Card>
      {issued && (
        <Card className="p-5 mt-4 flex items-center gap-4 animate-fade-up">
          <QR size={88} seed={"ANON-" + total} />
          <div><div className="font-semibold text-navy-900 flex items-center gap-2">Ticket issued <Badge tone="green">Paid</Badge></div>
            <div className="text-sm text-slate-500">{n} anonymous ticket(s) · €{total}. ΑΠΥ auto-issued to MyDATA. Ready to print.</div></div>
        </Card>
      )}
    </div>
  );
}

/* ============ REDEEM TICKET ============ */
export function CashierRedeem() {
  const { toast } = useApp();
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const redeem = () => { const ok = !/used/i.test(code); setResult(ok ? "valid" : "used"); toast(ok ? "Demo — ticket redeemed (marked used)." : "Demo — already redeemed."); };
  return (
    <div className="animate-fade-up max-w-xl">
      <PageHead title="Redeem Ticket" sub="Validate a ticket at the entrance (mark as used). For cashier-issued on-site tickets, QR scanning is not required." badge={<Badge tone="mvp">MVP</Badge>} />
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
  );
}

/* ============ CASH REGISTER (Future) ============ */
export function CashierRegister() {
  const { toast } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <div className="animate-fade-up">
      <PageHead title="Cash Register" sub="Cashier sessions, cash handover/receipt with automatic logging, and per-session statistics." badge={<Badge tone="future">Future</Badge>} />
      {!open ? (
        <Card className="p-8 text-center max-w-lg">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 text-orange-500 grid place-items-center"><Icon.cash size={26} /></div>
          <div className="mt-3 font-semibold text-navy-900">No open session</div>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Open a session (duration, cashier) to group on-site cash activity. Roadmap module 2027–2029.</p>
          <Btn variant="primary" className="mt-4" icon={Icon.play} onClick={() => { setOpen(true); toast("Demo — session opened."); }}>Open session</Btn>
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-4 gap-4">
            <StatCard label="Session" value="#CS-204" sub="Cashier: Kostas" tone="teal" />
            <StatCard label="Open since" value="09:14" sub="4h 22m" />
            <StatCard label="Cash in" value="€1,240" />
            <StatCard label="Card in" value="€3,860" />
          </div>
          <Card className="p-2 mt-4"><Table cols={["Time", "Type", "Item", "Method", "Amount"]} right={[4]} rows={[
            ["12:30", "Sale", "Adult ×2", <Badge tone="amber">Cash</Badge>, "€20"],
            ["12:41", "Sale", "Resident", <Badge tone="blue">Card</Badge>, "€6"],
            ["13:02", "Handover", "Shift change", <Badge tone="slate">—</Badge>, "−€500"],
          ]} /></Card>
          <div className="mt-4 flex gap-2">
            <Btn variant="outline" icon={Icon.arrowR} onClick={() => toast("Demo — cash handover logged.")}>Record handover</Btn>
            <Btn variant="primary" icon={Icon.check} onClick={() => { setOpen(false); toast("Demo — session closed; statistics + CSV ready."); }}>Close session</Btn>
          </div>
        </>
      )}
    </div>
  );
}

/* ============ SELL LOCKER (Future) ============ */
export function CashierLocker() {
  const { toast } = useApp();
  const [sold, setSold] = useState(false);
  return (
    <div className="animate-fade-up max-w-xl">
      <PageHead title="Sell Locker" sub="Sell a day locker on site; mark it in inventory. Customer redeems at entry." badge={<Badge tone="future">Future</Badge>} />
      <Card className="p-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Locker bank"><Select options={["Bank A", "Bank B", "Bank C", "Bank D", "Bank E"]} /></Field>
          <Field label="Locker number"><Input placeholder="A07" defaultValue="A07" /></Field>
        </div>
        <div className="flex items-center justify-between mt-4"><div className="text-slate-500 text-sm">1 locker · €5/day</div><div className="text-2xl font-bold font-display text-navy-900 tnum">€5</div></div>
        <div className="flex gap-2 mt-3">
          <Btn variant="teal" icon={Icon.card} onClick={() => { setSold(true); toast("Demo — locker sold & marked in inventory."); }}>Charge €5</Btn>
          <Btn variant="ghost" icon={Icon.print} disabled={!sold} onClick={() => toast("Demo — printed locker slip with QR.")}>Print</Btn>
        </div>
      </Card>
    </div>
  );
}
