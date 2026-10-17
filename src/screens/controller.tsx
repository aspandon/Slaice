import { useEffect, useRef, useState } from "react";
import { Icon, type IconRenderer } from "../lib/icons";
import { Card, Btn, Input, StatCard, Modal, Toggle } from "../components/ui";
import { BarChart } from "../components/charts";
import { RECENT_VALIDATIONS } from "../data/mock";
import { useApp, useSpotlight } from "../app/store";
import { GATES, ScanResult, detailOf, useGateFeedback, type ScanState, type Validation } from "./gate/ScanResult";
import { CheckInSheet, type CheckInOutcome } from "./gate/CheckIn";
import type { OpsBooking } from "../lib/useBookingOps";
import { useEntry } from "../lib/useEntry";
import { todayISO } from "../data/beach";
import { arrivalPhrase, normRef } from "../domain/entry";

/* Demo scans cycle through every outcome so each result screen can be shown. Codes of real
   bookings (AENR-715) are checked against their live allowance: #BK-10437 is a group with
   two sets in two zones and four tickets; #BK-10436 is booked for another day. */
const DEMO_SCANS: Validation[] = [
  { id: "#BK-10437", sub: "Akanthus AK-10 · Central CE-21 · 4 Normal", state: "valid" },
  { id: "#TK-55127", sub: "Entry · Resident ×2", state: "valid" },
  { id: "#BK-10388", sub: "Central · CE-92", state: "used", at: "10:42", gate: "Gate 2" },
  { id: "#TK-55133", sub: "Entry · Adult", state: "valid" },
  { id: "#BK-10436", sub: "Central · CE-05, CE-06", state: "valid" },
  { id: "#BK-09871", sub: "Macaw · MC-06", state: "invalid", reason: "Booking was refunded on 12 Jul" },
  { id: "#XX-00000", sub: "Unknown code", state: "invalid", reason: "Not a Slaice ticket" },
];

const RESULT_STYLE: Record<string, { wrap: string; badge: string; label: string; icon: IconRenderer }> = {
  valid: { wrap: "bg-emerald-50 text-emerald-600 ring-emerald-600/20", badge: "green", label: "Valid", icon: Icon.checkCircle },
  used: { wrap: "bg-amber-50 text-amber-600 ring-amber-600/20", badge: "amber", label: "Already entered", icon: Icon.clock },
  invalid: { wrap: "bg-rose-50 text-rose-600 ring-rose-600/20", badge: "red", label: "Invalid", icon: Icon.alert },
};

export function ControllerScan() {
  const { toast, account, hint, clearHint } = useApp();
  useSpotlight("controller", "scan");
  const [recent, setRecent] = useState<Validation[]>(RECENT_VALIDATIONS as Validation[]);
  const [inspect, setInspect] = useState<{ v: Validation; fresh: boolean } | null>(null);
  const [result, setResult] = useState<Validation | null>(null);
  const [n, setN] = useState(0);
  const [fb, setFb] = useGateFeedback();
  const entry = useEntry();
  const today = todayISO();
  // A real booking's check-in (AENR-715): who of the group is coming in now, and where they sit.
  const [checkin, setCheckin] = useState<OpsBooking | null>(null);
  // The arrival the "Admitted" screen can take back.
  const [justIn, setJustIn] = useState<{ b: OpsBooking; arrivalId: string } | null>(null);

  /** "AK-10 · CE-21 · 4 tickets" — what a booking holds today, for the result and Last scans. */
  const subOf = (b: OpsBooking) => {
    const al = entry.allowanceOf(b, today);
    const tickets = al.tickets.reduce((a, t) => a + t.qty, 0);
    const own = [al.sets.map((s) => s.setId).join(" · "), tickets ? `${tickets} ticket${tickets === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ");
    return own || b.items.map((i) => i.split(" · ").slice(1).join(" · ")).filter(Boolean).join(", ");
  };
  /** A real booking: refused outright (cancelled, another day…) or opened for check-in. */
  const openBooking = (b: OpsBooking, quiet = false) => {
    const v = entry.verdictOf(b, today);
    if (v.kind === "refused") {
      const r: Validation = { id: b.id, sub: subOf(b), state: "invalid", reason: v.text, live: true };
      setResult(r);
      if (!quiet) log(r, "invalid");
      return;
    }
    setCheckin(b);
  };

  // A booking QR scanned elsewhere (Beach status) opens its check-in here.
  useEffect(() => {
    if (!hint?.code || hint.page !== "scan") return;
    const b = entry.find(hint.code);
    clearHint();
    if (b) openBooking(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint]);

  /* Continuous scanning (AENR-609): the camera stays live and every code it reads is
     checked at once — no button per guest. The same code seen again within 5 s (the
     guest still holding up the phone) is ignored. Valid admits and invalid refuses at
     once; "already entered" waits for a decision; a real booking opens its check-in. */
  const lastRead = useRef<{ id: string; at: number } | null>(null);
  const read = (v: Validation) => {
    const now = Date.now();
    if (lastRead.current && lastRead.current.id === v.id && now - lastRead.current.at < 5000) return;
    lastRead.current = { id: v.id, at: now };
    const b = entry.find(v.id);
    if (b) return openBooking(b);
    setResult(v);
    if (v.state !== "used") log(v, v.state);
  };
  // The guest's own bookings for today on this device lead the demo camera (book → scan, AENR-715).
  const cycle: Validation[] = [
    ...account.bookings
      .filter((b) => b.items.some((i) => i.date === today))
      .map((b) => ({ id: `#${b.ref}`, sub: "Booked online", state: "valid" as const })),
    ...DEMO_SCANS,
  ];
  const nextDemo = () => {
    const v = cycle[n % cycle.length];
    setN((x) => x + 1);
    read(v);
  };
  // Demo: guests keep arriving — a code every few seconds while the scanner is idle.
  const [arrivals, setArrivals] = useState(true);
  const [typing, setTyping] = useState(false);
  const idle = !result && !inspect && !typing && !checkin;
  useEffect(() => {
    if (!arrivals || !idle) return;
    const id = window.setTimeout(nextDemo, 3500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivals, idle, n]);
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

  // Manual code entry: a booking ref or ticket code typed from the guest's screen. A real
  // booking (a guest's ticket, AENR-571) is checked against its live allowance first.
  const [code, setCode] = useState("");
  const checkCode = () => {
    if (!code.trim()) return;
    const c = normRef(code);
    setCode("");
    const b = entry.find(c);
    if (b) return openBooking(b);
    const known = [...recent, ...DEMO_SCANS].find((v) => !v.live && v.id.toUpperCase() === c);
    const v: Validation = known ?? { id: c, sub: "Typed code", state: "invalid", reason: "Not a Slaice ticket" };
    setResult(v);
    if (v.state !== "used") log(v, v.state);
  };

  // What the check-in decided: a short full-screen "Admitted" (with Undo right on it — a toast
  // would sit over the next group's check-in), a denial or a re-entry.
  const onCheckIn = (o: CheckInOutcome) => {
    const b = checkin;
    setCheckin(null);
    if (!b) return;
    if (o.kind === "admitted") {
      const what = arrivalPhrase(o.arrival, o.allowance);
      const v: Validation = {
        id: b.id,
        sub: what,
        state: "valid",
        word: "Admitted",
        live: true,
        detail: o.after.usedUp ? "Everyone is in — the QR is now used up." : `${o.after.left} of ${o.after.total} still expected on this QR.`,
      };
      setResult(v);
      setJustIn({ b, arrivalId: o.arrival.id });
      log({ ...v, sub: `${what} · ${o.after.entered}/${o.after.total} in` }, "valid");
    } else if (o.kind === "denied") {
      log({ id: b.id, sub: "QR used up · denied", state: "used", live: true }, "used");
    } else {
      log({ id: b.id, sub: "Re-entry · let back in", state: "valid", live: true }, "valid");
      toast(`${b.id}: let back in — logged on the booking.`, { tone: "warn" });
    }
  };
  // A mistake at the gate: take the arrival back and record it again on the booking's sheet.
  const undoJustIn = () => {
    if (!justIn) return;
    entry.undo(justIn.b, today, justIn.arrivalId);
    log({ id: justIn.b.id, sub: "Arrival undone", state: "valid", live: true }, "valid");
    setResult(null);
    setJustIn(null);
    setCheckin(justIn.b);
  };
  // Tapping a past scan: a live booking reopens with who is in now; a sample shows its detail.
  const reopen = (r: Validation) => {
    const b = r.live ? entry.find(r.id) : undefined;
    if (b) openBooking(b, true);
    else setInspect({ v: r, fresh: false });
  };

  /* Full-screen scanner (AENR-564): the camera area, manual entry and the last
     scans — nothing else. Gate KPIs and hourly throughput live in Reports ›
     Operations; Beach status and Walk-in are in the bottom bar / sidebar. */
  return (
    <div className="animate-fade-up flex flex-col gap-3 min-h-[calc(100dvh-170px)] md:min-h-[calc(100dvh-140px)]">
      <div data-spotlight="scanner" className="relative flex-1 min-h-[300px] rounded-3xl bg-navy-950 text-white overflow-hidden grid place-items-center">
        {/* Tapping the frame reads a code now (a guest stepping up) — the scanner never needs a button. */}
        <button type="button" onClick={nextDemo} aria-label="Read the next guest's code now (demo)" className={`relative w-[min(64vw,300px)] aspect-square rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 ${idle ? "ring-4 ring-teal-400/70" : "ring-2 ring-white/40"}`}>
          {["top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl", "top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"].map((c) => (
            <span key={c} aria-hidden className={`absolute w-10 h-10 border-teal-300 ${c}`} />
          ))}
          <Icon.scan size={72} className="absolute inset-0 m-auto text-white/25" />
          {idle && <div aria-hidden className="absolute left-3 right-3 h-0.5 bg-teal-300 shadow-[0_0_10px_#5eead4] motion-safe:animate-[scanline_1.6s_linear_infinite]" />}
        </button>
        <p className="absolute top-4 inset-x-0 text-center text-[13px] text-white/85" aria-live="polite">
          <span className="inline-flex items-center gap-1.5 font-semibold"><span className="w-2 h-2 rounded-full bg-teal-300 motion-safe:animate-pulse" /> Scanning</span> — hold the guest’s QR in the frame
        </p>
        <div className="absolute bottom-4 inset-x-4 flex flex-wrap items-center justify-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-xl bg-white/10 px-3 py-1.5 text-[13px] [&_*]:!text-white [&_option]:!text-navy-900">
            {/* Which entrance this phone scans at — every arrival records it (AENR-715). */}
            <label className="inline-flex items-center gap-1.5 text-sm">
              <Icon.scan size={14} />
              <span className="sr-only">Gate</span>
              <select value={fb.gate} onChange={(e) => setFb({ ...fb, gate: e.target.value })} className="rounded-lg bg-white/15 font-semibold px-2 py-1 min-h-[32px] outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
                {GATES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <Toggle label="Demo arrivals" on={arrivals} onChange={setArrivals} />
            <Toggle label="Sound" on={fb.sound} onChange={(v) => setFb({ ...fb, sound: v })} />
            <Toggle label="Vibrate" on={fb.vibrate} onChange={(v) => setFb({ ...fb, vibrate: v })} />
          </div>
        </div>
        <style>{`@keyframes scanline{0%{top:8%}50%{top:90%}100%{top:8%}}`}</style>
      </div>

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); checkCode(); }}>
        <div className="flex-1"><Input aria-label="Type a booking or ticket code" placeholder="Or type the code — e.g. BK-10436" value={code} onChange={(e) => setCode(e.target.value)} onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} className="!min-h-[52px] text-base" /></div>
        <Btn type="submit" size="lg" variant="primary" disabled={!code.trim()}>Check</Btn>
      </form>

      <section aria-label="Last scans">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Last scans</div>
        <ul className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {recent.map((r, i) => (
            <li key={i} className="shrink-0">
              <button type="button" onClick={() => reopen(r)}
                className="min-h-[52px] rounded-xl ring-1 ring-slate-200 bg-white px-3 py-1.5 text-left hover:ring-teal-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                <div className="flex items-center gap-1.5 font-semibold text-navy-900 text-[13px]">
                  {r.state === "valid" ? <Icon.checkCircle size={13} className="text-emerald-600" /> : r.state === "used" ? <Icon.clock size={13} className="text-amber-600" /> : <Icon.alert size={13} className="text-rose-600" />}
                  {r.id}
                </div>
                {/* A live booking's line already says what happened (AENR-715); samples get the state word. */}
                <div className="text-[11.5px] text-slate-600 whitespace-nowrap">{r.sub}{r.live && r.state !== "invalid" ? "" : ` · ${r.state === "valid" ? "Admitted" : r.state === "used" ? "Already entered" : "Refused"}`}</div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <ScanResultModal data={inspect} onClose={() => setInspect(null)} onAdmit={(v) => { admit(v); setInspect(null); }} />
      {checkin && <CheckInSheet booking={checkin} date={today} gate={fb.gate} feedback={fb} onClose={() => setCheckin(null)} onDone={onCheckIn} />}
      {result && (
        <ScanResult
          v={result}
          feedback={fb}
          onAdmit={admit}
          onDeny={deny}
          onDone={() => { setResult(null); setJustIn(null); }}
          onUndo={justIn && result.word === "Admitted" ? undoJustIn : undefined}
        />
      )}
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
