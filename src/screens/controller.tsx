import { useState } from "react";
import { Icon } from "../lib/icons";
import { Card, Btn, Badge, PageHead, StatCard } from "../components/ui";
import { BarChart } from "../components/charts";
import { RECENT_VALIDATIONS } from "../data/mock";
import { useApp, useSpotlight } from "../app/store";

export function ControllerScan() {
  const { toast } = useApp();
  useSpotlight("controller", "scan");
  const [scanning, setScanning] = useState(false);
  const [recent, setRecent] = useState(RECENT_VALIDATIONS);
  const stateTone: Record<string, string> = { valid: "green", used: "amber", invalid: "red" };

  const doScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const pool = [
        { id: "#BK-" + (10430 + Math.floor(Math.random() * 50)), sub: "Bestbuy · BE-" + (10 + Math.floor(Math.random() * 20)), state: "valid" },
        { id: "#TK-" + (55121 + Math.floor(Math.random() * 30)), sub: "Entry · Resident", state: "valid" },
        { id: "#BK-10402", sub: "Central · CE-92", state: "used" },
      ];
      const r = pool[Math.floor(Math.random() * pool.length)];
      setRecent((x) => [r, ...x].slice(0, 12));
      toast(r.state === "valid" ? "✓ Valid — admit the guest." : "⚠ Already used.");
    }, 1100);
  };

  return (
    <div className="animate-fade-up max-w-4xl">
      <PageHead title="Gate Validation" sub="Scan booking & ticket QR codes from the browser — real-time verification. Also handle walk-ins and on-the-spot tickets." badge={<Badge tone="mvp">MVP</Badge>} />
      <div className="grid md:grid-cols-2 gap-4">
        <Card data-spotlight="scanner" className="p-5 grid place-items-center text-center">
          <div className={`w-44 h-44 rounded-2xl ring-2 ring-dashed grid place-items-center relative overflow-hidden ${scanning ? "ring-teal-500 bg-teal-50" : "ring-teal-400/60 bg-teal-50/40"} text-teal-600`}>
            <Icon.scan size={60} />
            {scanning && <div className="absolute left-0 right-0 h-0.5 bg-teal-500 shadow-[0_0_8px_#14b8a6] animate-[scanline_1.1s_linear_infinite]" style={{ animation: "scanline 1.1s linear infinite" }} />}
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
              <div key={i} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2 animate-fade-in">
                <div><div className="font-semibold text-navy-900">{r.id}</div><div className="text-[12px] text-slate-600">{r.sub}</div></div>
                <Badge tone={stateTone[r.state]}>{r.state}</Badge>
              </div>
            ))}
          </div>
          <div data-spotlight="walkins" className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 gap-2 rounded-xl p-2 -mx-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-0.5">Walk-ins & on-the-spot</div>
            <Btn variant="outline" size="sm" icon={Icon.umbrella} onClick={() => toast("Demo — create a walk-in booking & block a sunbed.")}>Walk-in booking</Btn>
            <Btn variant="outline" size="sm" icon={Icon.ticket} onClick={() => toast("Demo — add ticket + take on-site payment via Stripe.")}>Add ticket (pay on site)</Btn>
            <Btn variant="outline" size="sm" icon={Icon.bolt} onClick={() => toast("Demo — opened same-day availability online.")}>Open same-day availability</Btn>
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
    </div>
  );
}
