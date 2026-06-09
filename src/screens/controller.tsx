import { useEffect, useState } from "react";
import { Icon, type IconRenderer } from "../lib/icons";
import { Card, Btn, Badge, PageHead, StatCard, Modal, Field, Input, Select, Stepper } from "../components/ui";
import { BarChart } from "../components/charts";
import { RECENT_VALIDATIONS } from "../data/mock";
import { ZONES } from "../data/beach";
import { useApp, useSpotlight } from "../app/store";

type Validation = { id: string; sub: string; state: string };

const TICKETS = [
  { k: "Adult (13+)", price: 10 },
  { k: "Alimos resident", price: 6 },
  { k: "Child (6–12)", price: 5 },
  { k: "Senior", price: 7 },
];

const RESULT_STYLE: Record<string, { wrap: string; badge: string; label: string; msg: string; icon: IconRenderer }> = {
  valid: { wrap: "bg-emerald-50 text-emerald-600 ring-emerald-600/20", badge: "green", label: "Valid", msg: "This QR is valid — admit the guest.", icon: Icon.checkCircle },
  used: { wrap: "bg-amber-50 text-amber-600 ring-amber-600/20", badge: "amber", label: "Already used", msg: "This QR was validated earlier today. Override only if you're sure.", icon: Icon.clock },
  invalid: { wrap: "bg-rose-50 text-rose-600 ring-rose-600/20", badge: "red", label: "Invalid", msg: "This QR is not recognised — do not admit.", icon: Icon.alert },
};

export function ControllerScan() {
  const { toast } = useApp();
  useSpotlight("controller", "scan");
  const [scanning, setScanning] = useState(false);
  const [recent, setRecent] = useState<Validation[]>(RECENT_VALIDATIONS);
  const [inspect, setInspect] = useState<{ v: Validation; fresh: boolean } | null>(null);
  const [walkin, setWalkin] = useState(false);
  const [tickets, setTickets] = useState(false);
  const [sameday, setSameday] = useState(false);
  const stateTone: Record<string, string> = { valid: "green", used: "amber", invalid: "red" };

  const doScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const pool: Validation[] = [
        { id: "#BK-" + (10430 + Math.floor(Math.random() * 50)), sub: "Bestbuy · BE-" + (10 + Math.floor(Math.random() * 20)), state: "valid" },
        { id: "#TK-" + (55121 + Math.floor(Math.random() * 30)), sub: "Entry · Resident", state: "valid" },
        { id: "#BK-10402", sub: "Central · CE-92", state: "used" },
      ];
      setInspect({ v: pool[Math.floor(Math.random() * pool.length)], fresh: true });
    }, 1100);
  };
  const admit = (v: Validation) => {
    setRecent((x) => [{ ...v, state: "valid" }, ...x].slice(0, 12));
    setInspect(null);
    toast("✓ Admitted — gate opened.", { tone: "success" });
  };
  const addRecent = (v: Validation) => setRecent((x) => [v, ...x].slice(0, 12));

  return (
    <div className="animate-fade-up max-w-4xl">
      <PageHead title="Gate Validation" sub="Scan booking & ticket QR codes from the browser — real-time verification. Also handle walk-ins and on-the-spot tickets." badge={<Badge tone="mvp">MVP</Badge>} />
      <div className="grid md:grid-cols-2 gap-4">
        <Card data-spotlight="scanner" className="p-5 grid place-items-center text-center">
          <div className={`w-44 h-44 rounded-2xl ring-2 ring-dashed grid place-items-center relative overflow-hidden ${scanning ? "ring-teal-500 bg-teal-50" : "ring-teal-400/60 bg-teal-50/40"} text-teal-600`}>
            <Icon.scan size={60} />
            {scanning && <div className="absolute left-0 right-0 h-0.5 bg-teal-500 shadow-[0_0_8px_#14b8a6]" style={{ animation: "scanline 1.1s linear infinite" }} />}
          </div>
          <Btn variant="teal" className="mt-4" icon={Icon.scan} onClick={doScan} disabled={scanning}>{scanning ? "Scanning…" : "Scan QR"}</Btn>
          <div className="mt-4 grid grid-cols-3 gap-1.5 w-full text-[11px]">
            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15 px-2 py-1.5"><Icon.checkCircle size={12} /> valid</div>
            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-600/15 px-2 py-1.5"><Icon.clock size={12} /> used</div>
            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-50 text-rose-700 ring-1 ring-rose-600/15 px-2 py-1.5"><Icon.alert size={12} /> invalid</div>
          </div>
          <style>{`@keyframes scanline{0%{top:8px}50%{top:160px}100%{top:8px}}`}</style>
        </Card>

        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-3">Recent validations</div>
          <div className="space-y-2 text-sm max-h-56 overflow-y-auto">
            {recent.map((r, i) => (
              <button key={i} type="button" onClick={() => setInspect({ v: r, fresh: false })}
                className="w-full flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2 hover:ring-teal-400 transition text-left animate-fade-in">
                <div><div className="font-semibold text-navy-900">{r.id}</div><div className="text-[12px] text-slate-600">{r.sub}</div></div>
                <Badge tone={stateTone[r.state]}>{r.state}</Badge>
              </button>
            ))}
          </div>
          <div data-spotlight="walkins" className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 gap-2 rounded-xl p-2 -mx-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-0.5">Walk-ins & on-the-spot</div>
            <Btn variant="outline" size="sm" icon={Icon.umbrella} onClick={() => setWalkin(true)}>Walk-in booking</Btn>
            <Btn variant="outline" size="sm" icon={Icon.ticket} onClick={() => setTickets(true)}>Add ticket (pay on site)</Btn>
            <Btn variant="outline" size="sm" icon={Icon.bolt} onClick={() => setSameday(true)}>Open same-day availability</Btn>
          </div>
        </Card>
      </div>

      {/* Gate throughput analytics (P5.3) */}
      <div className="grid sm:grid-cols-4 gap-4 mt-4">
        <StatCard instant label="Scanned today" value="1,284" sub="entries validated" tone="teal" trend="+6%" />
        <StatCard instant label="Throughput" value="312/hr" sub="peak 11:00–13:00" />
        <StatCard instant label="No-shows" value="2.8%" sub="booked, not arrived" tone="amber" />
        <StatCard instant label="Duplicate scans" value="4" sub="flagged today" tone="rose" />
      </div>
      <Card className="p-5 mt-4">
        <div className="font-semibold text-navy-900 mb-1">Gate throughput by hour</div>
        <BarChart label="Gate throughput by hour" color="#f59e0b" data={[
          { l: "9h", v: 90 }, { l: "10h", v: 180 }, { l: "11h", v: 280, hi: 1 }, { l: "12h", v: 312, hi: 1 },
          { l: "13h", v: 240 }, { l: "14h", v: 150 }, { l: "15h", v: 120 }, { l: "16h", v: 80 },
        ]} />
      </Card>

      <ScanResultModal data={inspect} onClose={() => setInspect(null)} onAdmit={admit} />
      <WalkinModal open={walkin} onClose={() => setWalkin(false)} onDone={(v) => { addRecent(v); setWalkin(false); }} />
      <AddTicketModal open={tickets} onClose={() => setTickets(false)} />
      <SameDayModal open={sameday} onClose={() => setSameday(false)} />
    </div>
  );
}

function ScanResultModal({ data, onClose, onAdmit }: { data: { v: Validation; fresh: boolean } | null; onClose: () => void; onAdmit: (v: Validation) => void }) {
  const v = data?.v;
  const s = RESULT_STYLE[v?.state ?? "valid"] ?? RESULT_STYLE.valid;
  const SIcon = s.icon;
  const canAdmit = !!data?.fresh && v?.state !== "invalid";
  return (
    <Modal open={data !== null} onClose={onClose} title={data?.fresh ? "Scan result" : "Validation detail"}
      footer={!v ? undefined : canAdmit
        ? <><Btn variant="ghost" onClick={onClose}>Close</Btn><Btn variant="primary" icon={Icon.check} onClick={() => onAdmit(v)}>{v.state === "used" ? "Override & admit" : "Admit guest"}</Btn></>
        : <Btn variant="primary" icon={Icon.check} onClick={onClose}>Close</Btn>}>
      {v && (
        <div className="text-center py-2 space-y-2">
          <span className={`mx-auto w-14 h-14 rounded-2xl grid place-items-center ring-1 ${s.wrap}`}><SIcon size={28} /></span>
          <div className="font-display font-bold text-navy-900 text-lg">{s.label}</div>
          <div className="text-[13px] text-slate-600 max-w-xs mx-auto">{s.msg}</div>
          <div className="mx-auto inline-flex items-center gap-2 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2 mt-1">
            <span className="font-mono text-[13px] font-semibold text-navy-900">{v.id}</span>
            <span className="text-slate-300">·</span>
            <span className="text-[12.5px] text-slate-600">{v.sub}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}

function WalkinModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (v: Validation) => void }) {
  const { toast } = useApp();
  const [zoneName, setZoneName] = useState(ZONES[0].name);
  const [code, setCode] = useState("");
  const [guests, setGuests] = useState(2);
  const [pay, setPay] = useState("Card (Stripe)");
  useEffect(() => { if (open) { setCode(""); setGuests(2); setPay("Card (Stripe)"); } }, [open]);
  const zone = ZONES.find((z) => z.name === zoneName) ?? ZONES[0];
  const confirm = () => {
    const id = "#BK-" + (10440 + Math.floor(Math.random() * 60));
    onDone({ id, sub: `${zone.name} · ${code || "walk-in"}`, state: "valid" });
    toast(`Walk-in reserved · ${zone.name} ${code} · charged €${zone.from} (${pay}). QR printed.`, { tone: "success" });
  };
  return (
    <Modal open={open} onClose={onClose} title="Walk-in booking"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.lock} onClick={confirm}>Reserve &amp; charge €{zone.from}</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Zone"><Select value={zoneName} onChange={(e) => setZoneName(e.target.value)} options={ZONES.map((z) => z.name)} /></Field>
          <Field label="Sunbed code"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. CE-12" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Guests"><Stepper label="Guests" value={guests} onChange={(v) => setGuests(Math.max(1, v))} min={1} /></Field>
          <Field label="Payment"><Select value={pay} onChange={(e) => setPay(e.target.value)} options={["Card (Stripe)", "Cash"]} /></Field>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600 flex items-center justify-between"><span>{zone.name} · {guests} guest{guests !== 1 ? "s" : ""} · {pay}</span><b className="text-navy-900 tnum">€{zone.from}</b></div>
      </div>
    </Modal>
  );
}

function AddTicketModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useApp();
  const [qty, setQty] = useState<Record<string, number>>({});
  useEffect(() => { if (open) setQty({}); }, [open]);
  const total = TICKETS.reduce((a, t) => a + (qty[t.k] || 0) * t.price, 0);
  const count = TICKETS.reduce((a, t) => a + (qty[t.k] || 0), 0);
  const charge = () => { toast(`Charged €${total} via Stripe · ${count} ticket${count !== 1 ? "s" : ""} issued (QR e-mailed).`, { tone: "success" }); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Add ticket · pay on site"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.stripe} disabled={total === 0} onClick={charge}>Charge €{total} via Stripe</Btn></>}>
      <div className="space-y-2">
        {TICKETS.map((t) => (
          <div key={t.k} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
            <div><div className="text-[13px] font-semibold text-navy-900">{t.k}</div><div className="text-[11px] text-slate-500">€{t.price} entry</div></div>
            <Stepper label={t.k} value={qty[t.k] || 0} onChange={(v) => setQty((q) => ({ ...q, [t.k]: Math.max(0, v) }))} min={0} />
          </div>
        ))}
        <div className="flex items-center justify-between pt-1 text-[13px]"><span className="text-slate-600">{count} ticket{count !== 1 ? "s" : ""}</span><b className="text-navy-900 tnum">€{total}</b></div>
      </div>
    </Modal>
  );
}

function SameDayModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useApp();
  const [rel, setRel] = useState<Record<string, number>>({});
  useEffect(() => { if (open) setRel({}); }, [open]);
  const total = Object.values(rel).reduce((a, b) => a + b, 0);
  const zones = Object.values(rel).filter(Boolean).length;
  const publish = () => { toast(`Opened ${total} same-day set${total !== 1 ? "s" : ""} online across ${zones} zone${zones !== 1 ? "s" : ""}.`, { tone: "success" }); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Open same-day availability"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.bolt} disabled={total === 0} onClick={publish}>Publish {total} set{total !== 1 ? "s" : ""}</Btn></>}>
      <p className="text-[13px] text-slate-600 -mt-1 mb-2">Release unsold sunbeds for instant online booking today.</p>
      <div className="space-y-2">
        {ZONES.map((z) => (
          <div key={z.id} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: z.color }} /><span className="text-[13px] font-semibold text-navy-900">{z.name}</span></div>
            <Stepper label={z.name} value={rel[z.id] || 0} onChange={(v) => setRel((r) => ({ ...r, [z.id]: Math.max(0, Math.min(24, v)) }))} min={0} />
          </div>
        ))}
      </div>
    </Modal>
  );
}
