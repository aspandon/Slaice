import { useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Card, Btn, Badge, PageHead, Table, StatCard, Stepper, Field, Input, Select, FutureBanner, ContextPanel } from "../components/ui.jsx";
import { QR, StackedBar } from "../components/charts.jsx";
import { CASHIER_TX, CASHIER_SESSION, CASHIER_PAST_SESSIONS, CASHIER_LOCKER_BANKS } from "../data/mock.js";
import { useApp } from "../app/store.jsx";

const ZRow = ({ label, value }) => (
  <div className="flex items-center justify-between border-b border-slate-100 last:border-0 pb-1.5 last:pb-0">
    <span className="text-slate-600">{label}</span><span className="font-semibold text-navy-900 tnum">{value}</span>
  </div>
);

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
              <Stepper label={`${c.t} tickets`} value={qty[c.k]} onChange={(v) => setQty((q) => ({ ...q, [c.k]: v }))} />
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
          <div className="space-y-4">
            <Card className="p-6 grid place-items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 grid place-items-center"><Icon.cash size={24} /></div>
              <div className="mt-3 font-semibold text-navy-900 text-lg">No open session</div>
              <p className="text-sm text-slate-600 mt-1 max-w-sm">Open a session (duration, cashier) to group on-site cash activity into a single auditable ledger.</p>
              <Btn variant="primary" className="mt-4" icon={Icon.play} onClick={() => { setOpen(true); toast("Demo — session opened."); }}>Open session</Btn>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-display font-bold text-navy-900">Past sessions</div>
                <Badge tone="slate">last 5</Badge>
              </div>
              <Table cols={["Session", "Cashier", "Date", "Duration", "Cash", "Card", "Tx", "Status"]} right={[3,4,5,6]}
                rows={CASHIER_PAST_SESSIONS.map((s) => [
                  <span className="font-mono text-[12px] text-navy-900">{s.id}</span>,
                  s.cashier, s.date, s.duration,
                  <span className="tnum">{s.cash}</span>,
                  <span className="tnum">{s.card}</span>,
                  <span className="tnum">{s.tx}</span>,
                  <Badge tone="slate">{s.status}</Badge>,
                ])} />
            </Card>
          </div>
          <ContextPanel title="What a session covers" items={[
            { icon: Icon.clock, title: "Open + close", body: "A session brackets your shift from float to handover." },
            { icon: Icon.cash, title: "Cash + card", body: "Every sale lands in the session ledger, by tender." },
            { icon: Icon.download, title: "Audit-ready CSV", body: "Close the session to export the totals and movements." },
          ]} />
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-4 gap-4">
            <StatCard label="Session" value={CASHIER_SESSION.id} sub={`Cashier: ${CASHIER_SESSION.cashier}`} tone="teal" />
            <StatCard label="Open since" value={CASHIER_SESSION.openedAt} sub={CASHIER_SESSION.duration} />
            <StatCard label="Cash in" value={CASHIER_SESSION.cashIn} />
            <StatCard label="Card in" value={CASHIER_SESSION.cardIn} />
          </div>
          {/* Z-report — the end-of-shift summary every POS produces. */}
          <div className="grid lg:grid-cols-3 gap-4 mt-4">
            <Card className="p-5">
              <div className="font-semibold text-navy-900 mb-2">Tender mix</div>
              <StackedBar segments={[{ l: "Card", v: 3860, c: "#0ea5e9" }, { l: "Cash", v: 1240, c: "#f59e0b" }]} height={12} />
              <div className="flex items-center justify-between text-[12px] mt-2">
                <span className="inline-flex items-center gap-1.5 text-slate-600"><i className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> Card €3,860</span>
                <span className="inline-flex items-center gap-1.5 text-slate-600"><i className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Cash €1,240</span>
              </div>
            </Card>
            <Card className="p-5">
              <div className="font-semibold text-navy-900 mb-3">Shift stats</div>
              <div className="space-y-2 text-[13px]">
                <ZRow label="Transactions" value="312" />
                <ZRow label="Avg transaction" value="€16.34" />
                <ZRow label="Items / receipt" value="2.1" />
                <ZRow label="Voids / refunds" value="3 · €40" />
                <ZRow label="Busiest hour" value="12:00–13:00" />
              </div>
            </Card>
            <Card className="p-5">
              <div className="font-semibold text-navy-900 mb-3">Cash reconciliation</div>
              <div className="space-y-2 text-[13px]">
                <ZRow label="Opening float" value="€100" />
                <ZRow label="Expected drawer" value="€1,340" />
                <ZRow label="Counted" value="€1,335" />
                <ZRow label="Variance" value={<span className="text-rose-600 font-semibold">−€5</span>} />
              </div>
              <div className="mt-3 text-[11px] text-amber-700 bg-amber-50 ring-1 ring-amber-600/15 rounded-lg px-2.5 py-1.5">Small shortfall — recount before closing.</div>
            </Card>
          </div>
          <Card className="p-2 mt-4">
            <Table cols={["Time", "Type", "Item", "Method", "Amount"]} right={[4]}
              rows={CASHIER_TX.map((r) => [r[0], r[1], r[2],
                <Badge tone={r[3].tone}>{r[3].label}</Badge>,
                typeof r[4] === "string" ? r[4] : <span className="text-rose-600 font-medium tnum">{r[4].label}</span>,
              ])} />
          </Card>
          <div className="mt-4 flex gap-2">
            <Btn variant="outline" icon={Icon.print} onClick={() => toast("Demo — printed Z-report.")}>Print Z-report</Btn>
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
  const [bankId, setBankId] = useState(CASHIER_LOCKER_BANKS[0].id);
  const [pick, setPick] = useState(null);     // {bank, num}
  const [sold, setSold] = useState(null);     // last sold {bank, num}
  const bank = CASHIER_LOCKER_BANKS.find((b) => b.id === bankId);
  const taken = new Set(bank.taken);
  const lockerLabel = pick ? `${bank.id}${String(pick.num).padStart(2, "0")}` : null;
  const charge = () => {
    if (!pick) return;
    const label = lockerLabel;
    setSold({ bank: bank.id, num: pick.num, label, price: bank.price });
    toast(`Demo — sold locker ${label} for €${bank.price}.`, { tone: "success" });
    setPick(null);
  };
  return (
    <div className="animate-fade-up">
      <PageHead title="Sell Locker" sub="Sell a day locker on site; mark it in inventory. Customer redeems at entry." badge={<Badge tone="future">Future</Badge>} />
      <FutureBanner />
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
