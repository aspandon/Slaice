import { useEffect, useRef } from "react";
import { useApp } from "../../app/store";
import { WEEKDAYS, weekdayOf } from "../../domain/comms";
import { useCommsEngine } from "./engine";

/* Keeps the Communicate demo clock moving with real time and sends whatever
   falls due while the app is open: scheduled campaign occurrences, and the
   low-occupancy checks of active automations (AENR-492). */
export function CommsJanitor() {
  const { toast } = useApp();
  const { comms, setComms, runDue, fire } = useCommsEngine();
  const last = useRef(Date.now());
  // Advance the demo clock by the real minutes that passed.
  useEffect(() => {
    const t = setInterval(() => {
      const mins = Math.floor((Date.now() - last.current) / 60000);
      if (mins < 1) return;
      last.current += mins * 60000;
      setComms((s) => {
        const d = new Date(`${s.clock}:00Z`);
        d.setUTCMinutes(d.getUTCMinutes() + mins);
        return { ...s, clock: d.toISOString().slice(0, 16) };
      });
    }, 20000);
    return () => clearInterval(t);
  }, [setComms]);
  // Send everything due at the current clock.
  useEffect(() => {
    let next = comms;
    const notes: string[] = [];
    const due = runDue(next);
    next = due.next;
    due.sent.forEach((x) => notes.push(`“${x.name}” sent — ${x.results.delivered} delivered`));
    const day = comms.clock.slice(0, 10);
    for (const a of comms.automations) {
      if (a.status !== "Active" || a.trigger !== "low_occupancy" || !a.check) continue;
      const checked = (a.checks ?? []).some((c) => c.at.slice(0, 10) === day);
      if (weekdayOf(day) !== a.check.weekday || comms.clock.slice(11, 16) < a.check.time || checked)
        continue;
      const cur = next.automations.find((x) => x.id === a.id) ?? a;
      const r = fire(next, cur);
      next = r.next;
      notes.push(`${a.name} · ${WEEKDAYS[a.check.weekday]} ${a.check.time} check: ${r.outcome}`);
    }
    if (next !== comms) {
      setComms(() => next);
      notes.forEach((n) => toast(n, { tone: "success" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comms.clock, comms.campaigns, comms.automations]);
  return null;
}
