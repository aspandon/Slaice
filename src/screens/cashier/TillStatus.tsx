import { useEffect, useRef, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Field, Input, Modal, Select } from "../../components/ui";
import { useApp } from "../../app/store";
import { DEFAULT_CASHIER, TILLS } from "../../data/till";
import { OFFLINE_CARD_CAP, OFFLINE_CARD_TOTAL } from "../../domain/till";
import { useTill } from "./useTill";

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/* ============ Till status strip ============
   Which shift is selling, and whether the till is online. Going offline (the
   demo toggle or the browser losing its connection) raises the offline banner,
   which owns reconnecting (AENR-585). */
export function TillStatus() {
  const { toast } = useApp();
  const t = useTill();
  const queued = t.till.sales.filter((s) => s.offline).length;
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
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ${t.till.offline ? "bg-amber-50 text-amber-800 ring-amber-600/20" : "bg-emerald-50 text-emerald-800 ring-emerald-600/20"}`}>
        <span className={`w-2 h-2 rounded-full ${t.till.offline ? "bg-amber-500" : "bg-emerald-500"}`} />
        {t.till.offline ? `Offline${queued ? ` · ${queued} queued` : ""}` : "Online"}
      </span>
      {!t.till.offline && (
        <Btn size="sm" variant="ghost" icon={Icon.globe} onClick={() => { t.setOffline(true); toast("Demo — connection lost. Keep selling: see what still works in the banner.", { tone: "warn" }); }}>
          Simulate offline
        </Btn>
      )}
    </div>
  );
}

/* ============ Offline banner (AENR-585) ============
   On every Cashier page while the till is offline: what's queued, Reconnect,
   and "What still works". The first time the till goes offline the sheet
   opens by itself. Also follows the browser's own offline / online events. */
export function OfflineBanner() {
  const { toast, go, persona } = useApp();
  const t = useTill();
  const [syncing, setSyncing] = useState(0);
  const [help, setHelp] = useState(false);
  const queued = t.till.sales.filter((s) => s.offline);
  const queuedTotal = queued.reduce((a, s) => a + s.total, 0);
  const reconnect = () => {
    if (syncing) return;
    setSyncing(Math.max(1, queued.length));
    window.setTimeout(() => {
      const r = t.syncOffline();
      setSyncing(0);
      toast(
        r.synced ? `Back online — ${r.synced} sale${r.synced === 1 ? "" : "s"} synced and sent to myDATA${r.conflicts ? ` · ${r.conflicts} sunbed conflict${r.conflicts === 1 ? "" : "s"} to resolve` : ""}.` : "Back online.",
        { tone: r.conflicts ? "warn" : "success", action: r.conflicts ? { label: "Resolve", onClick: () => go(persona, "transactions") } : undefined },
      );
    }, 1500);
  };
  // First time offline → explain what still works (once per till).
  useEffect(() => {
    if (t.till.offline && !t.till.offlineHelpSeen) {
      setHelp(true);
      t.markOfflineHelpSeen();
    }
  }, [t]);
  // The browser's own connection events drive the same states.
  const live = useRef({ setOffline: t.setOffline, reconnect });
  live.current = { setOffline: t.setOffline, reconnect };
  useEffect(() => {
    const off = () => live.current.setOffline(true);
    const on = () => live.current.reconnect();
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => { window.removeEventListener("offline", off); window.removeEventListener("online", on); };
  }, []);

  if (!t.till.offline && !syncing) return <OfflineHelp open={help} onClose={() => setHelp(false)} />;
  return (
    <>
      <div role="status" aria-live="polite"
        className={`sticky top-[86px] z-20 mb-4 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 shadow-soft ring-1 ${syncing ? "bg-sky-50 text-sky-900 ring-sky-600/25" : "bg-amber-100 text-amber-950 ring-amber-600/30"}`}>
        <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${syncing ? "bg-sky-600 text-white" : "bg-amber-500 text-white"}`}>
          {syncing ? <Icon.refresh size={19} className="motion-safe:animate-spin" /> : <Icon.wifiOff size={19} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-[15px] leading-tight">
            {syncing ? `Syncing ${syncing} sale${syncing === 1 ? "" : "s"}…` : "Offline — sales are saved on this till"}
          </div>
          <div className="text-[12.5px] opacity-90">
            {syncing
              ? "Sending queued sales and their ΑΠΥ to myDATA."
              : queued.length
                ? `${queued.length} sale${queued.length === 1 ? "" : "s"} (€${queuedTotal.toLocaleString("en-GB", { maximumFractionDigits: 2 })}) queued — synced and sent to myDATA when the connection is back.`
                : "No sales queued yet. Keep selling — card is capped and sunbeds come from the cached map."}
          </div>
        </div>
        {!syncing && (
          <div className="flex gap-2">
            <Btn size="sm" variant="ghost" icon={Icon.info} onClick={() => setHelp(true)}>What still works</Btn>
            <Btn size="sm" variant="primary" icon={Icon.refresh} onClick={reconnect}>Reconnect</Btn>
          </div>
        )}
      </div>
      <OfflineHelp open={help} onClose={() => setHelp(false)} />
    </>
  );
}

function OfflineHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const works = [
    ["Entry tickets, lockers and parking", "Sold and printed as usual."],
    ["Sunbeds", "From the map cached on this till — a set booked online meanwhile is flagged as a conflict when you reconnect."],
    ["Cash and vouchers", "No limits."],
    [`Card up to €${OFFLINE_CARD_CAP} a sale`, `Store-and-forward on the terminal, up to €${OFFLINE_CARD_TOTAL} in total until the till reconnects.`],
    ["Printed receipt and receipt QR", "The ΑΠΥ is issued on the till and sent to myDATA on reconnect."],
  ];
  const waits = [
    [`Card above €${OFFLINE_CARD_CAP} (or past €${OFFLINE_CARD_TOTAL} in total)`, "Take cash, or wait for the connection."],
    ["E-mail and SMS receipts", "Queued and sent on reconnect — print or show the QR now."],
    ["myDATA transmission and refunds of synced sales", "Wait for the connection."],
  ];
  return (
    <Modal open={open} onClose={onClose} title="Offline — what still works" footer={<Btn variant="primary" onClick={onClose}>Got it</Btn>}>
      <div className="space-y-4 text-[13.5px]">
        <section>
          <h3 className="font-semibold text-navy-900 mb-1.5 flex items-center gap-1.5"><Icon.checkCircle size={15} className="text-emerald-600" /> Keeps working</h3>
          <ul className="space-y-1.5">{works.map(([a, b]) => <li key={a}><b className="text-navy-900">{a}</b> — <span className="text-slate-600">{b}</span></li>)}</ul>
        </section>
        <section>
          <h3 className="font-semibold text-navy-900 mb-1.5 flex items-center gap-1.5"><Icon.clock size={15} className="text-amber-600" /> Waits for the connection</h3>
          <ul className="space-y-1.5">{waits.map(([a, b]) => <li key={a}><b className="text-navy-900">{a}</b> — <span className="text-slate-600">{b}</span></li>)}</ul>
        </section>
      </div>
    </Modal>
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
