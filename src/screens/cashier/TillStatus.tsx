import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Field, Input, Select } from "../../components/ui";
import { useApp } from "../../app/store";
import { DEFAULT_CASHIER, TILLS } from "../../data/till";
import { useTill } from "./useTill";

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/* ============ Till status strip ============
   Which shift is selling, and whether the till is online. Offline is a demo
   toggle; reconnecting syncs the queued sales (and surfaces conflicts). */
export function TillStatus() {
  const { toast, go, persona } = useApp();
  const t = useTill();
  const [syncing, setSyncing] = useState(0);
  const queued = t.till.sales.filter((s) => s.offline).length;
  const reconnect = () => {
    setSyncing(Math.max(1, queued));
    window.setTimeout(() => {
      const r = t.syncOffline();
      setSyncing(0);
      toast(
        r.synced ? `Back online — ${r.synced} sale${r.synced === 1 ? "" : "s"} synced and sent to myDATA${r.conflicts ? ` · ${r.conflicts} sunbed conflict${r.conflicts === 1 ? "" : "s"} to resolve` : ""}.` : "Back online.",
        { tone: r.conflicts ? "warn" : "success", action: r.conflicts ? { label: "Resolve", onClick: () => go(persona, "transactions") } : undefined },
      );
    }, 1500);
  };
  const shift = t.till.shift;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 text-[12.5px]">
      {shift ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 ring-1 ring-slate-200 px-3 py-1.5 text-slate-700">
          <Icon.cash size={13} className="text-teal-600" /> <span className="whitespace-nowrap">Shift <b className="text-navy-900">{shift.id}</b></span> · {shift.cashier} · {shift.till} · <span className="whitespace-nowrap">since {hhmm(shift.openedAt)}</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 ring-1 ring-amber-600/20 px-3 py-1.5 text-amber-800"><Icon.alert size={13} /> No open shift</span>
      )}
      <span role="status" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ${syncing ? "bg-sky-50 text-sky-800 ring-sky-600/20" : t.till.offline ? "bg-amber-50 text-amber-800 ring-amber-600/20" : "bg-emerald-50 text-emerald-800 ring-emerald-600/20"}`}>
        <span className={`w-2 h-2 rounded-full ${syncing ? "bg-sky-500 animate-pulse" : t.till.offline ? "bg-amber-500" : "bg-emerald-500"}`} />
        {syncing ? `Syncing ${syncing} sale${syncing === 1 ? "" : "s"}…` : t.till.offline ? `Offline${queued ? ` · ${queued} sale${queued === 1 ? "" : "s"} queued` : ""}` : "Online"}
      </span>
      <Btn size="sm" variant="ghost" icon={t.till.offline ? Icon.refund : Icon.globe} disabled={!!syncing} onClick={() => (t.till.offline ? reconnect() : (t.setOffline(true), toast("Demo — connection lost. Keep selling: card is capped, sunbeds come from the cached map.", { tone: "warn" })))}>
        {t.till.offline ? "Reconnect" : "Simulate offline"}
      </Btn>
    </div>
  );
}

/** Opening a shift: cashier, till and the opening float. Selling needs one. */
export function OpenShiftCard({ compact = false }: { compact?: boolean }) {
  const { toast, viewAs } = useApp();
  const t = useTill();
  const [cashier, setCashier] = useState(viewAs?.role === "cashier" ? viewAs.name : DEFAULT_CASHIER);
  const [tillName, setTillName] = useState(TILLS[0]);
  const [float, setFloat] = useState("100");
  const ok = cashier.trim() && Number(float) >= 0 && float !== "";
  return (
    <form className={`rounded-2xl bg-white/80 ring-1 ring-slate-200 shadow-soft ${compact ? "p-4" : "p-6"} space-y-3`}
      onSubmit={(e) => { e.preventDefault(); if (!ok) return; t.openShift({ cashier: cashier.trim(), till: tillName, float: Number(float) }); toast(`Shift opened with a €${Number(float)} float — drawer kicked open (demo).`, { tone: "success" }); }}>
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-500 grid place-items-center shrink-0"><Icon.cash size={20} /></span>
        <div>
          <div className="font-display font-bold text-navy-900">Open a shift to start selling</div>
          <div className="text-[12.5px] text-slate-600">Count the opening float into the drawer. Every sale, refund and cash movement is tracked against this shift.</div>
        </div>
        <Badge tone="slate" className="ml-auto hidden sm:inline-flex">Required</Badge>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        <Field label="Cashier"><Input value={cashier} onChange={(e) => setCashier(e.target.value)} /></Field>
        <Field label="Till"><Select value={tillName} onChange={(e) => setTillName(e.target.value)} options={TILLS.map((x) => ({ v: x, l: x }))} /></Field>
        <Field label="Opening float (€)"><Input type="number" inputMode="decimal" min={0} value={float} onChange={(e) => setFloat(e.target.value)} /></Field>
      </div>
      <Btn type="submit" variant="teal" icon={Icon.play} disabled={!ok}>Open shift</Btn>
    </form>
  );
}
