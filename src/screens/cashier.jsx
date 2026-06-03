import { useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Card, Btn, Badge, PageHead, Table, StatCard, Stepper, Field, Input, Select, FutureBanner, ContextPanel } from "../components/ui.jsx";
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
    <div className="animate-fade-up grid lg:grid-cols-[1fr_320px] gap-5">
      <div>
        <PageHead title="Issue On-site Ticket" sub="Anonymous ticket issuing with on-the-spot printing & payment (Stripe terminal or cash)." badge={<Badge tone="mvp">MVP</Badge>} />
        <Card className="p-5 space-y-3">
          {cats.map((c) => (
            <div key={c.k} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-4 py-3">
              <div><div className="font-semibold text-navy-900">{c.t}</div><div className="text-[12px] text-slate-600">€{c.p} per person</div></div>
              <Stepper value={qty[c.k]} onChange={(v) => setQty((q) => ({ ...q, [c.k]: v }))} />
            </div>
          ))}
          <div className="flex items-center justify-between pt-1"><div className="text-slate-600 text-sm">{n} ticket(s) · anonymous</div><div className="text-2xl font-bold font-display text-navy-900 tnum">€{total}</div></div>
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
              <div className="text-sm text-slate-600">{n} anonymous ticket(s) · €{total}. ΑΠΥ auto-issued to MyDATA. Ready to print.</div></div>
          </Card>
        )}
      </div>
      <ContextPanel title="How it works" items={[
        { icon: Icon.users, title: "Pick categories", body: "Adult / Resident / Child — set quantities for the people in front of you." },
        { icon: Icon.card, title: "Take payment", body: "Card via Stripe Terminal, or record a cash sale." },
        { icon: Icon.print, title: "Print the QR", body: "ESC/POS receipt with the QR + ΑΠΥ — auto-issued to MyDATA." },
      ]} footer="Tickets are anonymous and validate at the gate scanner." />
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
    <div className="animate-fade-up grid lg:grid-cols-[1fr_320px] gap-5">
      <div>
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
      <ContextPanel title="Recent redemptions" items={[
        { icon: Icon.checkCircle, title: "#TK-55120 · valid", body: "Adult — admitted 2 minutes ago." },
        { icon: Icon.checkCircle, title: "#TK-55119 · valid", body: "Resident — admitted 8 minutes ago." },
        { icon: Icon.refund, title: "#TK-55104 · used", body: "Already redeemed earlier today." },
      ]} footer="Online QR tickets are scanned at the gate by the Controller." />
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
      <FutureBanner />
      {!open ? (
        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          <Card className="p-10 text-center grid place-items-center min-h-[320px]">
            <div>
              <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 text-orange-500 grid place-items-center"><Icon.cash size={28} /></div>
              <div className="mt-3 font-semibold text-navy-900 text-lg">No open session</div>
              <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto">Open a session (duration, cashier) to group on-site cash activity into a single auditable ledger.</p>
              <Btn variant="primary" className="mt-5" icon={Icon.play} onClick={() => { setOpen(true); toast("Demo — session opened."); }}>Open session</Btn>
            </div>
          </Card>
          <ContextPanel title="What a session covers" items={[
            { icon: Icon.clock, title: "Open + close", body: "A session brackets your shift from float to handover." },
            { icon: Icon.cash, title: "Cash + card", body: "Every sale lands in the session ledger, by tender." },
            { icon: Icon.download, title: "Audit-ready CSV", body: "Close the session to export the totals and movements." },
          ]} />
        </div>
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
            ["13:02", "Handover", "Shift change", <Badge tone="slate">—</Badge>, <span className="text-rose-600 tnum">−€500</span>],
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
    <div className="animate-fade-up">
      <PageHead title="Sell Locker" sub="Sell a day locker on site; mark it in inventory. Customer redeems at entry." badge={<Badge tone="future">Future</Badge>} />
      <FutureBanner />
      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <Card className="p-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Locker bank"><Select options={["Bank A", "Bank B", "Bank C", "Bank D", "Bank E"]} /></Field>
            <Field label="Locker number"><Input placeholder="A07" defaultValue="A07" /></Field>
          </div>
          <div className="flex items-center justify-between mt-4"><div className="text-slate-600 text-sm">1 locker · €5/day</div><div className="text-2xl font-bold font-display text-navy-900 tnum">€5</div></div>
          <div className="flex gap-2 mt-3">
            <Btn variant="teal" icon={Icon.card} onClick={() => { setSold(true); toast("Demo — locker sold & marked in inventory."); }}>Charge €5</Btn>
            <Btn variant="ghost" icon={Icon.print} disabled={!sold} onClick={() => toast("Demo — printed locker slip with QR.")}>Print</Btn>
          </div>
          {sold && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 ring-1 ring-emerald-600/15 px-3 py-3">
              <QR size={64} seed="LK-A07" />
              <div>
                <div className="font-semibold text-emerald-700 flex items-center gap-1.5"><Icon.checkCircle size={16} /> Locker sold</div>
                <div className="text-[12px] text-emerald-700/80">Bank A · A07 — slip ready to print and hand to the guest.</div>
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
