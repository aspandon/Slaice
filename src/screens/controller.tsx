import { useState } from "react";
import { Icon, type IconRenderer } from "../lib/icons";
import { Card, Btn, Input, StatCard, Modal, Toggle } from "../components/ui";
import { BarChart } from "../components/charts";
import { RECENT_VALIDATIONS } from "../data/mock";
import { useApp, useSpotlight } from "../app/store";
import { ScanResult, detailOf, useGateFeedback, type ScanState, type Validation } from "./gate/ScanResult";
import { useBookingOps } from "../lib/useBookingOps";
import { DEMO_TODAY } from "../domain/period";
import { fmtDateGB } from "../components/ui/DateInput";

/* Demo scans cycle through every outcome so each result screen can be shown. */
const DEMO_SCANS: Validation[] = [
  { id: "#BK-10436", sub: "Bestbuy · BE-14", state: "valid" },
  { id: "#TK-55127", sub: "Entry · Resident ×2", state: "valid" },
  { id: "#BK-10402", sub: "Central · CE-92", state: "used", at: "10:42", gate: "Gate 2" },
  { id: "#TK-55133", sub: "Entry · Adult", state: "valid" },
  { id: "#BK-09871", sub: "Macaw · MC-06", state: "invalid", reason: "Booking was refunded on 12 Jul" },
  { id: "#XX-00000", sub: "Unknown code", state: "invalid", reason: "Not a Slaice ticket" },
];

const RESULT_STYLE: Record<string, { wrap: string; badge: string; label: string; icon: IconRenderer }> = {
  valid: { wrap: "bg-emerald-50 text-emerald-600 ring-emerald-600/20", badge: "green", label: "Valid", icon: Icon.checkCircle },
  used: { wrap: "bg-amber-50 text-amber-600 ring-amber-600/20", badge: "amber", label: "Already entered", icon: Icon.clock },
  invalid: { wrap: "bg-rose-50 text-rose-600 ring-rose-600/20", badge: "red", label: "Invalid", icon: Icon.alert },
};

export function ControllerScan() {
  const { toast } = useApp();
  useSpotlight("controller", "scan");
  const [scanning, setScanning] = useState(false);
  const [recent, setRecent] = useState<Validation[]>(RECENT_VALIDATIONS as Validation[]);
  const [inspect, setInspect] = useState<{ v: Validation; fresh: boolean } | null>(null);
  const [result, setResult] = useState<Validation | null>(null);
  const [n, setN] = useState(0);
  const [fb, setFb] = useGateFeedback();

  const doScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const v = DEMO_SCANS[n % DEMO_SCANS.length];
      setResult(v);
      setN((x) => x + 1);
      // Valid admits at once and invalid is refused at once; "already entered" waits for a decision.
      if (v.state !== "used") log(v, v.state);
    }, 900);
  };
  const log = (v: Validation, state: ScanState) => setRecent((x) => [{ ...v, state }, ...x].slice(0, 12));
  const admit = (v: Validation) => {
    log(v, "valid");
    setResult(null);
    toast(`Override — ${v.id} admitted (logged).`, { tone: "warn" });
  };
  const deny = (v: Validation) => {
    log(v, v.state);
    setResult(null);
  };

  // Any real booking (a guest's ticket, AENR-571) is checked against its live state.
  const ops = useBookingOps();
  const fromBooking = (c: string): Validation | undefined => {
    const b = ops.bookings.find((x) => x.id.toUpperCase() === c);
    if (!b) return undefined;
    const sub = b.items.map((i) => i.split(" · ").slice(1).join(" · ")).join(", ");
    if (b.status === "Cancelled" || b.status === "Refunded" || b.status === "Expired")
      return { id: b.id, sub, state: "invalid", reason: `Booking ${b.status.toLowerCase()}` };
    if (b.visitIso !== DEMO_TODAY) return { id: b.id, sub, state: "invalid", reason: `Valid on ${fmtDateGB(b.visitIso)}, not today` };
    if (b.status === "Used") return { id: b.id, sub, state: "used", at: "09:58", gate: "Gate 1" };
    return { id: b.id, sub, state: "valid" };
  };
  // Manual code entry: a booking ref or ticket code typed from the guest's screen.
  const [code, setCode] = useState("");
  const checkCode = () => {
    const c = code.trim().toUpperCase().replace(/^([A-Z]{2})-?(\d+)$/, "#$1-$2").replace(/^(?!#)/, "#");
    if (!c || c === "#") return;
    const known = [...recent, ...DEMO_SCANS].find((v) => v.id.toUpperCase() === c);
    const v: Validation = known ?? fromBooking(c) ?? { id: c, sub: "Typed code", state: "invalid", reason: "Not a Slaice ticket" };
    setResult(v);
    if (v.state !== "used") log(v, v.state);
    setCode("");
  };

  /* Full-screen scanner (AENR-564): the camera area, manual entry and the last
     scans — nothing else. Gate KPIs and hourly throughput live in Reports ›
     Operations; Beach status and Walk-in are in the bottom bar / sidebar. */
  return (
    <div className="animate-fade-up flex flex-col gap-3 min-h-[calc(100dvh-170px)] md:min-h-[calc(100dvh-140px)]">
      <div data-spotlight="scanner" className="relative flex-1 min-h-[300px] rounded-3xl bg-navy-950 text-white overflow-hidden grid place-items-center">
        <div className={`relative w-[min(64vw,300px)] aspect-square rounded-3xl ${scanning ? "ring-4 ring-teal-400" : "ring-2 ring-white/40"}`}>
          {["top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl", "top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"].map((c) => (
            <span key={c} aria-hidden className={`absolute w-10 h-10 border-teal-300 ${c}`} />
          ))}
          <Icon.scan size={72} className="absolute inset-0 m-auto text-white/25" />
          {scanning && <div aria-hidden className="absolute left-3 right-3 h-0.5 bg-teal-300 shadow-[0_0_10px_#5eead4] motion-safe:animate-[scanline_1.1s_linear_infinite]" />}
        </div>
        <p className="absolute top-4 inset-x-0 text-center text-[13px] text-white/80" aria-live="polite">{scanning ? "Reading the code…" : "Point the camera at the guest’s QR code"}</p>
        <div className="absolute bottom-4 inset-x-4 flex flex-wrap items-center justify-center gap-3">
          <Btn variant="teal" size="lg" icon={Icon.scan} onClick={doScan} disabled={scanning}>{scanning ? "Scanning…" : "Scan QR"}</Btn>
          <div className="flex gap-4 rounded-xl bg-white/10 px-3 py-1.5 text-[13px] [&_*]:!text-white">
            <Toggle label="Sound" on={fb.sound} onChange={(v) => setFb({ ...fb, sound: v })} />
            <Toggle label="Vibrate" on={fb.vibrate} onChange={(v) => setFb({ ...fb, vibrate: v })} />
          </div>
        </div>
        <style>{`@keyframes scanline{0%{top:8%}50%{top:90%}100%{top:8%}}`}</style>
      </div>

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); checkCode(); }}>
        <div className="flex-1"><Input aria-label="Type a booking or ticket code" placeholder="Or type the code — e.g. BK-10436" value={code} onChange={(e) => setCode(e.target.value)} className="!min-h-[52px] text-base" /></div>
        <Btn type="submit" size="lg" variant="primary" disabled={!code.trim()}>Check</Btn>
      </form>

      <section aria-label="Last scans">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Last scans</div>
        <ul className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {recent.map((r, i) => (
            <li key={i} className="shrink-0">
              <button type="button" onClick={() => setInspect({ v: r, fresh: false })}
                className="min-h-[52px] rounded-xl ring-1 ring-slate-200 bg-white px-3 py-1.5 text-left hover:ring-teal-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                <div className="flex items-center gap-1.5 font-semibold text-navy-900 text-[13px]">
                  {r.state === "valid" ? <Icon.checkCircle size={13} className="text-emerald-600" /> : r.state === "used" ? <Icon.clock size={13} className="text-amber-600" /> : <Icon.alert size={13} className="text-rose-600" />}
                  {r.id}
                </div>
                <div className="text-[11.5px] text-slate-600 whitespace-nowrap">{r.sub} · {r.state === "valid" ? "Admitted" : r.state === "used" ? "Already entered" : "Refused"}</div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <ScanResultModal data={inspect} onClose={() => setInspect(null)} onAdmit={(v) => { admit(v); setInspect(null); }} />
      {result && <ScanResult v={result} feedback={fb} onAdmit={admit} onDeny={deny} onDone={() => setResult(null)} />}
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
          <div className="text-[13px] text-slate-600 max-w-xs mx-auto">{detailOf(v)}</div>
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


/* Gate throughput for managers (AENR-564) — shown in Reports › Operations. */
export function GateThroughputCard() {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard instant label="Scanned today" value="1,284" sub="entries validated" tone="teal" trend="+6%" compare="vs same day last week" />
        <StatCard instant label="Throughput" value="312/hr" sub="peak 11:00–13:00" />
        <StatCard instant label="No-shows" value="2.8%" sub="booked, not arrived" tone="amber" />
        <StatCard instant label="Duplicate scans" value="4" sub="flagged today" tone="rose" />
      </div>
      <Card className="p-5">
        <div className="font-semibold text-navy-900 mb-1">Gate throughput by hour · today (entries)</div>
        <BarChart label="Gate throughput by hour" color="#f59e0b" data={[
          { l: "9h", v: 90 }, { l: "10h", v: 180 }, { l: "11h", v: 280, hi: 1 }, { l: "12h", v: 312, hi: 1 },
          { l: "13h", v: 240 }, { l: "14h", v: 150 }, { l: "15h", v: 120 }, { l: "16h", v: 80 },
        ]} />
      </Card>
    </div>
  );
}
