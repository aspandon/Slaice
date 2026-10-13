import { useEffect, useRef, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Field, Input, Modal, Select } from "../../components/ui";
import { useApp } from "../../app/store";
import { DEFAULT_CASHIER, MANAGER_PINS, TILLS } from "../../data/till";
import { DEFAULT_STAFF } from "../../data/staff";
import { OFFLINE_CARD_CAP, OFFLINE_CARD_TOTAL, eur, shiftTotals } from "../../domain/till";
import { useTill } from "./useTill";

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/* ============ Till status strip ============
   Which shift is selling, and whether the till is online. Going offline (the
   demo toggle or the browser losing its connection) raises the offline banner,
   which owns reconnecting (AENR-585). */
export function TillStatus() {
  const { toast, viewAs } = useApp();
  const t = useTill();
  const [switching, setSwitching] = useState(false);
  const queued = t.till.sales.filter((s) => s.offline).length;
  const shift = t.till.shift;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 text-[12.5px]">
      {shift ? (
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full bg-white/70 ring-1 ring-slate-200 pl-3 pr-1 py-1 text-slate-700">
          <Icon.cash size={13} className="text-teal-600" /> <span className="whitespace-nowrap">Shift <b className="text-navy-900">{shift.id}</b></span> · <b className="text-navy-900">{t.cashier}</b> · {shift.till} · <span className="whitespace-nowrap">since {hhmm(shift.openedAt)}</span>
          {!viewAs && (
            <button
              type="button"
              onClick={() => setSwitching(true)}
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-navy-900 text-white px-2.5 py-1 text-[12px] font-semibold hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
            >
              <Icon.users size={12} /> Switch cashier
            </button>
          )}
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
      {switching && <SwitchCashierModal onClose={() => setSwitching(false)} />}
    </div>
  );
}

/* ============ Switch cashier (AENR-608) ============
   On a shared till the next person types their own 4-digit PIN (set in Team &
   roles) — no signing out. Sales from then on carry their name; the shift and
   drawer carry on, and the hand-over can record a drawer count. Five wrong
   PINs lock the switch until a manager PIN unlocks it. */
const MAX_TRIES = 5;
function SwitchCashierModal({ onClose }: { onClose: () => void }) {
  const { staffUsers, toast } = useApp();
  const t = useTill();
  const shift = t.till.shift;
  // A PIN set in Team & roles wins; older saved data falls back to the demo seed.
  const pinOf = (id: string, pin?: string) => pin ?? DEFAULT_STAFF.find((u) => u.id === id)?.tillPin;
  const people = staffUsers.filter((u) => u.status === "active" && (u.role === "cashier" || u.role === "support") && u.name !== t.cashier);
  const [who, setWho] = useState(people[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [count, setCount] = useState("");
  const [fails, setFails] = useState(0);
  const [mgr, setMgr] = useState("");
  const [error, setError] = useState("");
  if (!shift) return null;
  const expected = shiftTotals(shift, t.till.sales).expectedCash;
  const person = people.find((u) => u.id === who);
  const locked = fails >= MAX_TRIES;
  const submit = () => {
    if (!person) return;
    if (pinOf(person.id, person.tillPin) !== pin) {
      const n = fails + 1;
      setFails(n);
      setPin("");
      setError(n >= MAX_TRIES ? "" : `Wrong PIN — ${MAX_TRIES - n} ${MAX_TRIES - n === 1 ? "try" : "tries"} left.`);
      return;
    }
    const counted = count.trim() === "" ? undefined : Number(count);
    t.switchCashier(person.name, expected, counted);
    const diff = counted === undefined ? null : Math.round((counted - expected) * 100) / 100;
    toast(
      `${person.name} is selling now${diff === null ? "" : diff === 0 ? " · drawer counted, no difference" : ` · drawer ${diff > 0 ? "over" : "short"} by ${eur(Math.abs(diff))}`}.`,
      { tone: diff ? "warn" : "success" },
    );
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Switch cashier"
      footer={
        locked ? (
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
        ) : (
          <>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" type="submit" form="switch-cashier" disabled={!person || pin.length !== 4}>
              {person ? `Switch to ${person.name.split(" ")[0]}` : "Switch"}
            </Btn>
          </>
        )
      }
    >
      {locked ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const m = MANAGER_PINS[mgr];
            if (m) {
              setFails(0);
              setMgr("");
              setError("");
              toast(`Unlocked by ${m}.`, { tone: "success" });
            } else {
              setMgr("");
              setError("That is not a manager PIN.");
            }
          }}
        >
          <p role="alert" className="text-[13px] text-rose-700 font-medium">
            Too many wrong PINs. A manager unlocks the switch with their PIN.
          </p>
          <Field label="Manager PIN" hint={error ? <span className="text-rose-700">{error}</span> : "Demo manager PINs: 1234, 5678"}>
            <Input type="password" inputMode="numeric" maxLength={4} className="w-32 tnum tracking-[0.3em]" value={mgr} onChange={(e) => setMgr(e.target.value.replace(/\D/g, "").slice(0, 4))} autoComplete="off" />
          </Field>
          <Btn type="submit" variant="outline" disabled={mgr.length !== 4}>Unlock</Btn>
        </form>
      ) : people.length === 0 ? (
        <p className="text-[13px] text-slate-600">No one else can take this till. Add a Cashier or Support Agent with a till PIN in Team &amp; roles.</p>
      ) : (
        <form id="switch-cashier" className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (pin.length === 4) submit(); }}>
          <p className="text-[13px] text-slate-600">
            <b className="text-navy-900">{t.cashier}</b> is selling on {shift.till}. The shift and the drawer carry on; sales from now on are recorded under the next person.
          </p>
          <fieldset>
            <legend className="text-[12px] font-semibold text-slate-700 mb-1.5">Who is taking over?</legend>
            <div className="flex flex-wrap gap-2">
              {people.map((u) => (
                <label key={u.id} className={`inline-flex items-center gap-2 rounded-xl ring-1 px-3 py-2 cursor-pointer text-[13px] font-semibold ${who === u.id ? "ring-2 ring-teal-500 bg-teal-50/50 text-navy-900" : "ring-slate-200 text-slate-700 hover:ring-slate-300"}`}>
                  <input type="radio" name="switch-to" className="accent-teal-600" checked={who === u.id} onChange={() => { setWho(u.id); setError(""); }} />
                  {u.name}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label={`${person?.name.split(" ")[0] ?? "Their"}’s PIN`} hint={error ? <span className="text-rose-700" role="alert">{error}</span> : "Demo PINs: Kostas 1111 · Eleni 2222 · Dimitris 3333"}>
            <Input type="password" inputMode="numeric" maxLength={4} className="w-32 tnum tracking-[0.3em]" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }} autoComplete="off" aria-invalid={!!error} />
          </Field>
          <Field label="Count the drawer for the hand-over (optional)" hint={`Expected cash now: ${eur(expected)}`}>
            <Input type="number" inputMode="decimal" min={0} className="w-40 tnum" value={count} onChange={(e) => setCount(e.target.value)} placeholder="€" />
          </Field>
        </form>
      )}
    </Modal>
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
