import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, FutureBanner, Field, Input, Modal, PageHead, Select, StatCard, Table, Toggle } from "../../components/ui";
import { StackedBar } from "../../components/charts";
import { useApp } from "../../app/store";
import { ZONES } from "../../data/beach";
import { MOVE_REASONS } from "../../data/till";
import { CASHIER_PAST_SESSIONS } from "../../data/mock";
import { VARIANCE_TOLERANCE, eur, r2, shiftTotals, type DrawerMove, type ShiftTotals, type TillSale, type TillShift } from "../../domain/till";
import { useTill } from "./useTill";
import { ManagerPinModal } from "./TillParts";
import { OpenShiftCard, TillStatus } from "./TillStatus";

/* ============ CASH REGISTER — shift & drawer (AENR-507) ============
   Open with a float → every sale, refund and drawer movement lands on the
   shift → X report any time (read-only) → Z close with a counted amount
   (optionally blind), variance and a note above tolerance. Closed shifts are
   locked and listed for the manager. */

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const zoneName = (id: string) => ZONES.find((z) => z.id === id)?.name ?? id;
const MOVE_LABEL: Record<DrawerMove["kind"], string> = { in: "Paid in", out: "Paid out", nosale: "No sale" };

export function CashierRegister() {
  const t = useTill();
  const [move, setMove] = useState<DrawerMove["kind"] | null>(null);
  const [report, setReport] = useState<{ shift: TillShift; kind: "X" | "Z" } | null>(null);
  const [closing, setClosing] = useState(false);
  const shift = t.till.shift;
  const tot = shift ? shiftTotals(shift, t.till.sales) : null;

  return (
    <div className="animate-fade-up">
      <PageHead title="Cash Register" badge={<Badge tone="future">Future</Badge>} />
      <FutureBanner />
      <TillStatus />
      {!shift || !tot ? (
        <div className="space-y-4">
          <OpenShiftCard />
          <ShiftHistory onOpen={(s) => setReport({ shift: s, kind: "Z" })} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Expected cash in drawer" value={eur(tot.expectedCash)} sub={`Float ${eur(shift.float)} + cash ${eur(tot.cash)}`} tone="teal" />
            <StatCard label="Card" value={eur(tot.card)} sub="Terminal batch" />
            <StatCard label="Sales" value={eur(tot.sales)} sub={`${tot.tx} transaction${tot.tx === 1 ? "" : "s"}`} />
            <StatCard label="Refunds · voids" value={eur(tot.refunds + tot.voids)} sub={`Discounts ${eur(tot.discounts)}`} />
          </div>
          <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-2 justify-between mb-3">
                <h2 className="font-display font-bold text-navy-900">Shift {shift.id} · {shift.cashier}</h2>
                <div className="flex flex-wrap gap-2">
                  <Btn size="sm" variant="outline" icon={Icon.plus} onClick={() => setMove("in")}>Paid in</Btn>
                  <Btn size="sm" variant="outline" icon={Icon.minus} onClick={() => setMove("out")}>Paid out</Btn>
                  <Btn size="sm" variant="outline" icon={Icon.lock} onClick={() => setMove("nosale")}>No sale</Btn>
                </div>
              </div>
              <TenderMix tot={tot} />
              <ShiftLedger shift={shift} sales={t.till.sales} />
            </Card>
            <Card className="p-4 space-y-2">
              <h2 className="font-display font-bold text-navy-900">Reports</h2>
              <p className="text-[12.5px] text-slate-600">The X report is a snapshot and changes nothing. Closing the shift counts the drawer, prints the Z report and locks the shift.</p>
              <Btn full variant="outline" icon={Icon.doc} onClick={() => setReport({ shift, kind: "X" })}>X report</Btn>
              <Btn full variant="primary" icon={Icon.check} onClick={() => setClosing(true)}>Close shift (Z)</Btn>
            </Card>
          </div>
          <ShiftHistory onOpen={(s) => setReport({ shift: s, kind: "Z" })} />
        </div>
      )}
      {move && <MoveModal kind={move} onClose={() => setMove(null)} />}
      {closing && shift && tot && <CloseModal shift={shift} tot={tot} onClose={() => setClosing(false)} onClosed={(s) => { setClosing(false); setReport({ shift: s, kind: "Z" }); }} />}
      {report && <ReportModal {...report} onClose={() => setReport(null)} />}
    </div>
  );
}

function TenderMix({ tot }: { tot: ShiftTotals }) {
  const total = tot.cash + tot.card + tot.voucher;
  return (
    <div className="mb-4">
      <StackedBar segments={[{ l: "Card", v: tot.card || 0.0001, c: "#0ea5e9" }, { l: "Cash", v: tot.cash || 0.0001, c: "#f59e0b" }, { l: "Voucher", v: tot.voucher || 0.0001, c: "#a855f7" }]} height={10} />
      <div className="flex flex-wrap gap-4 text-[12px] mt-2 text-slate-600">
        <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> Card {eur(tot.card)}</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Cash {eur(tot.cash)}</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-purple-500" /> Voucher {eur(tot.voucher)}</span>
        <span className="ml-auto">{total ? "" : "No takings yet"}</span>
      </div>
    </div>
  );
}

function ShiftLedger({ shift, sales }: { shift: TillShift; sales: TillSale[] }) {
  const rows: { at: string; type: string; detail: string; method: string; amount: number }[] = [
    { at: shift.openedAt, type: "Float in", detail: "Opening cash", method: "Cash", amount: shift.float },
    ...sales.filter((s) => s.shiftId === shift.id).map((s) => ({ at: s.at, type: "Sale", detail: `${s.id} · ${s.lines.map((l) => (l.setId ? l.setId : `${l.qty} ${l.label}`)).join(", ")}`, method: s.tenders.map((x) => x.kind).join(" + "), amount: s.total })),
    ...sales.flatMap((s) => s.refunds.filter((r) => r.shiftId === shift.id).map((r) => ({ at: r.at, type: r.kind === "void" ? "Void" : "Refund", detail: `${s.id} · ${r.reason}`, method: r.tender, amount: -r.amount }))),
    ...shift.moves.map((m) => ({ at: m.at, type: MOVE_LABEL[m.kind], detail: m.reason + (m.approver ? ` · ${m.approver}` : ""), method: "Cash", amount: m.kind === "out" ? -m.amount : m.amount })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <Table dense cols={["Time", "Type", "Detail", "Method", "Amount"]} right={[4]}
      rows={rows.map((r) => [
        <span className="tnum">{hhmm(r.at)}</span>, r.type, <span className="text-[12.5px] text-slate-600">{r.detail}</span>, <span className="capitalize">{r.method}</span>,
        r.type === "No sale" ? "—" : <span className={`tnum font-medium ${r.amount < 0 ? "text-rose-600" : ""}`}>{r.amount < 0 ? `−${eur(-r.amount)}` : eur(r.amount)}</span>,
      ])} />
  );
}

function MoveModal({ kind, onClose }: { kind: DrawerMove["kind"]; onClose: () => void }) {
  const { toast } = useApp();
  const t = useTill();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState(MOVE_REASONS[kind][0]);
  const [pin, setPin] = useState(false);
  const ok = kind === "nosale" || Number(amount) > 0;
  const save = (approver?: string) => {
    t.addMove({ kind, amount: kind === "nosale" ? 0 : r2(Number(amount)), reason, approver });
    toast(kind === "nosale" ? "Demo — drawer opened (logged)." : `${MOVE_LABEL[kind]} ${eur(Number(amount))} recorded — drawer opened (demo).`, { tone: "success" });
    onClose();
  };
  return (
    <>
      <Modal open={!pin} onClose={onClose} title={MOVE_LABEL[kind]}
        footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={kind === "nosale" ? Icon.lock : Icon.check} disabled={!ok} onClick={() => (kind === "nosale" ? setPin(true) : save())}>{kind === "nosale" ? "Open drawer" : "Record"}</Btn></>}>
        <div className="space-y-3">
          {kind !== "nosale" && <Field label="Amount (€)"><Input type="number" inputMode="decimal" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>}
          <Field label="Reason"><Select value={reason} onChange={(e) => setReason(e.target.value)} options={MOVE_REASONS[kind].map((r) => ({ v: r, l: r }))} /></Field>
          {kind === "nosale" && <p className="text-[12.5px] text-slate-500">Opening the drawer outside a sale needs a manager and is logged.</p>}
        </div>
      </Modal>
      {pin && <ManagerPinModal reason="Open the drawer outside a sale." onClose={() => setPin(false)} onApproved={(m) => { setPin(false); save(m); }} />}
    </>
  );
}

function CloseModal({ shift, tot, onClose, onClosed }: { shift: TillShift; tot: ShiftTotals; onClose: () => void; onClosed: (s: TillShift) => void }) {
  const { toast } = useApp();
  const t = useTill();
  const [blind, setBlind] = useState(true);
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [revealed, setRevealed] = useState(false);
  const c = Number(counted);
  const variance = r2(c - tot.expectedCash);
  const showExpected = !blind || revealed;
  const needNote = showExpected && counted !== "" && Math.abs(variance) > VARIANCE_TOLERANCE;
  const ok = counted !== "" && c >= 0 && (!needNote || note.trim());
  const submit = () => {
    if (blind && !revealed) return setRevealed(true);
    const s = t.closeShift({ counted: c, note: note.trim(), blind });
    if (s) {
      toast(`Shift ${s.id} closed — Z report printed, card batch closed (demo).`, { tone: "success" });
      onClosed(s);
    }
  };
  return (
    <Modal open onClose={onClose} title={`Close shift ${shift.id}`}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.check} disabled={!ok} onClick={submit}>{blind && !revealed ? "Submit count" : "Close shift & print Z"}</Btn></>}>
      <div className="space-y-3">
        <Toggle label="Blind count (count before seeing the expected amount)" on={blind} disabled={revealed} onChange={setBlind} />
        <Field label="Counted cash in the drawer (€)"><Input type="number" inputMode="decimal" min={0} value={counted} disabled={revealed} onChange={(e) => setCounted(e.target.value)} /></Field>
        {showExpected && (
          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2.5 text-[13px] space-y-1">
            <div className="flex justify-between"><span className="text-slate-600">Expected</span><b className="tnum text-navy-900">{eur(tot.expectedCash)}</b></div>
            {counted !== "" && <div className="flex justify-between"><span className="text-slate-600">Counted</span><b className="tnum text-navy-900">{eur(c)}</b></div>}
            {counted !== "" && (
              <div className="flex justify-between" role="status"><span className="text-slate-600">Variance</span>
                <b className={`tnum ${variance === 0 ? "text-emerald-700" : Math.abs(variance) > VARIANCE_TOLERANCE ? "text-rose-700" : "text-amber-700"}`}>{variance > 0 ? "+" : variance < 0 ? "−" : ""}{eur(Math.abs(variance))}</b>
              </div>
            )}
            <div className="flex justify-between"><span className="text-slate-600">Card (terminal batch)</span><b className="tnum text-navy-900">{eur(tot.card)} ✓ matches</b></div>
          </div>
        )}
        {needNote && <Field label={`Note (required — variance above €${VARIANCE_TOLERANCE})`}><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Change given wrongly at 14:10" /></Field>}
      </div>
    </Modal>
  );
}

function ReportModal({ shift, kind, onClose }: { shift: TillShift; kind: "X" | "Z"; onClose: () => void }) {
  const { toast } = useApp();
  const t = useTill();
  const tot = shiftTotals(shift, t.till.sales);
  const variance = shift.counted !== undefined ? r2(shift.counted - tot.expectedCash) : null;
  const Row = ({ l, v, strong }: { l: string; v: string; strong?: boolean }) => <div className={`flex justify-between ${strong ? "font-bold" : ""}`}><span>{l}</span><span className="tnum">{v}</span></div>;
  return (
    <Modal open onClose={onClose} title={`${kind} report · ${shift.id}`}
      footer={<><Btn variant="outline" icon={Icon.print} onClick={() => toast(`Demo — ${kind} report printed.`)}>Print</Btn><Btn variant="primary" onClick={onClose}>Done</Btn></>}>
      <div className="mx-auto max-w-[360px] bg-white rounded-lg ring-1 ring-slate-200 px-5 py-4 font-mono text-[12px] text-navy-900 space-y-0.5">
        <div className="text-center font-bold">{kind === "X" ? "X REPORT — SNAPSHOT" : "Z REPORT — SHIFT CLOSED"}</div>
        <div className="text-center">{shift.till} · {shift.cashier}</div>
        <div className="text-center">{hhmm(shift.openedAt)} → {shift.closedAt ? hhmm(shift.closedAt) : "now"}</div>
        <div className="border-t border-dashed border-slate-300 my-2" />
        <Row l="Transactions" v={String(tot.tx)} />
        <Row l="Gross sales" v={eur(tot.sales + tot.discounts)} />
        <Row l="Discounts" v={`−${eur(tot.discounts)}`} />
        <Row l="Net sales" v={eur(tot.sales)} strong />
        <Row l="Voids" v={`−${eur(tot.voids)}`} />
        <Row l="Refunds" v={`−${eur(tot.refunds)}`} />
        <div className="border-t border-dashed border-slate-300 my-2" />
        <Row l="Card" v={eur(tot.card)} />
        {Object.entries(tot.terminals).map(([k, v]) => <Row key={k} l={`  ↳ ${k}`} v={eur(v)} />)}
        <Row l="Cash" v={eur(tot.cash)} />
        <Row l="Voucher" v={eur(tot.voucher)} />
        <div className="border-t border-dashed border-slate-300 my-2" />
        <div className="font-bold">Tickets</div>
        {Object.keys(tot.tickets).length ? Object.entries(tot.tickets).map(([k, n]) => <Row key={k} l={k} v={`× ${n}`} />) : <div>—</div>}
        <div className="font-bold mt-1">Sunbed sets by store</div>
        {Object.keys(tot.sunbeds).length ? Object.entries(tot.sunbeds).map(([k, n]) => <Row key={k} l={zoneName(k)} v={`× ${n}`} />) : <div>—</div>}
        <div className="border-t border-dashed border-slate-300 my-2" />
        <Row l="Opening float" v={eur(shift.float)} />
        <Row l="Paid in" v={eur(tot.paidIn)} />
        <Row l="Paid out" v={`−${eur(tot.paidOut)}`} />
        <Row l="Cash refunds" v={`−${eur(tot.refundsCash)}`} />
        <Row l="Expected cash" v={eur(tot.expectedCash)} strong />
        {shift.counted !== undefined && <Row l={`Counted${shift.blind ? " (blind)" : ""}`} v={eur(shift.counted)} />}
        {variance !== null && <Row l="Variance" v={`${variance > 0 ? "+" : variance < 0 ? "−" : ""}${eur(Math.abs(variance))}`} strong />}
        {shift.note && <div className="mt-1">Note: {shift.note}</div>}
        <Row l="No-sale drawer opens" v={String(tot.noSales)} />
        <div className="border-t border-dashed border-slate-300 my-2" />
        <div>ΑΠΥ issued: {t.till.sales.filter((s) => s.shiftId === shift.id).length} · myDATA totals match</div>
      </div>
    </Modal>
  );
}

function ShiftHistory({ onOpen }: { onOpen: (s: TillShift) => void }) {
  const t = useTill();
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display font-bold text-navy-900">Past shifts</h2>
        <Badge tone="slate">Visible to managers</Badge>
      </div>
      <Table dense cols={["Shift", "Cashier", "Till", "Time", "Cash", "Card", "Variance", ""]} right={[4, 5, 6]}
        rows={[
          ...t.till.shifts.map((s) => {
            const tot = shiftTotals(s, t.till.sales);
            const v = s.counted !== undefined ? r2(s.counted - tot.expectedCash) : 0;
            return [
              <span className="font-mono text-[12px] text-navy-900">{s.id}</span>, s.cashier, s.till, `${hhmm(s.openedAt)}–${s.closedAt ? hhmm(s.closedAt) : ""}`,
              <span className="tnum">{eur(tot.cash)}</span>, <span className="tnum">{eur(tot.card)}</span>,
              <span className={`tnum ${Math.abs(v) > VARIANCE_TOLERANCE ? "text-rose-600 font-semibold" : ""}`}>{v > 0 ? "+" : v < 0 ? "−" : ""}{eur(Math.abs(v))}</span>,
              <Btn size="sm" variant="ghost" icon={Icon.doc} onClick={() => onOpen(s)}>Z report</Btn>,
            ];
          }),
          ...CASHIER_PAST_SESSIONS.slice(0, 4).map((s) => [<span className="font-mono text-[12px] text-slate-500">{s.id.replace("#CS-", "SH-0")}</span>, s.cashier, "Main entrance", s.date, <span className="tnum">{s.cash}</span>, <span className="tnum">{s.card}</span>, <span className="tnum">€0</span>, <Badge tone="slate">Archived</Badge>]),
        ]} />
    </Card>
  );
}
