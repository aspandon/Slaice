import { useMemo, useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Card, Btn, Badge, PageHead, StatCard, Modal, FeatureChip } from "../components/ui.jsx";
import { FEATURES, CAPABILITIES, featureCounts } from "../data/features.js";
import { JOURNEYS, journeyCounts } from "../data/journeys.js";
import { PERSONAS } from "../data/personas.js";
import { useApp } from "../app/store.jsx";

/* ============ FEATURE INVENTORY ============ */
export function FeatureInventory() {
  const { go, toast } = useApp();
  const [q, setQ] = useState("");
  const [cap, setCap] = useState("All");
  const [status, setStatus] = useState("All");
  const [open, setOpen] = useState(null);

  const list = useMemo(() => FEATURES.filter((f) =>
    (cap === "All" || f.cap === cap) &&
    (status === "All" || f.status === status) &&
    (f.feature + f.cap + f.desc).toLowerCase().includes(q.toLowerCase())
  ), [q, cap, status]);

  // group by capability
  const groups = useMemo(() => {
    const m = {};
    list.forEach((f) => { (m[f.cap] = m[f.cap] || []).push(f); });
    return m;
  }, [list]);

  return (
    <div className="animate-fade-up">
      <PageHead title="Feature Inventory" sub={`All ${featureCounts.total} platform features from the RFP — MVP and Future. Search, filter, and open any feature to see its description and jump to where it's demonstrated.`}
        badge={<Badge tone="indigo">{FEATURES.length} features</Badge>} />

      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total features" value={featureCounts.total} icon={Icon.layers} tone="indigo" />
        <StatCard label="MVP" value={featureCounts.mvp} sub="Season 2027" icon={Icon.check} tone="teal" />
        <StatCard label="Future" value={featureCounts.future} sub="Roadmap 2027–2029" icon={Icon.pkg} />
      </div>

      <div className="sticky top-[86px] z-20 mb-4">
        <Card className="p-4 shadow-lift">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 rounded-xl ring-1 ring-slate-200 bg-white px-3 py-2 flex-1 min-w-[200px] text-slate-600">
              <Icon.search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search features…" className="text-sm outline-none w-full bg-transparent text-ink" />
            </div>
            <div className="flex gap-1.5">
              {["All", "MVP", "Future"].map((s) => <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ring-1 ${status === s ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 text-slate-600 hover:ring-teal-400"}`}>{s}</button>)}
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-3">
            {["All", ...CAPABILITIES].map((c) => <button key={c} onClick={() => setCap(c)} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ring-1 ${cap === c ? "bg-slaice-600 text-white ring-slaice-600" : "bg-white ring-slate-200 text-slate-500 hover:ring-slaice-400"}`}>{c}</button>)}
          </div>
        </Card>
      </div>

      <div className="text-[12px] text-slate-600 mb-2">{list.length} feature{list.length !== 1 ? "s" : ""} shown</div>

      <div className="space-y-4">
        {Object.entries(groups).map(([capName, items]) => (
          <Card key={capName} className="p-4">
            <div className="font-semibold text-navy-900 mb-2 flex items-center gap-2">{capName}<span className="text-[11px] text-slate-600 font-normal">· {items.length}</span></div>
            <div className="grid md:grid-cols-2 gap-2">
              {items.map((f) => (
                <button key={f.id} onClick={() => setOpen(f)} className="text-left flex items-start gap-3 rounded-xl ring-1 ring-slate-100 hover:ring-teal-400 hover:bg-slate-50/60 px-3 py-2.5 transition">
                  <span className="text-[11px] font-mono text-slate-300 mt-0.5 w-6 shrink-0">{String(f.id).padStart(2, "0")}</span>
                  <span className="flex-1">
                    <span className="text-[13px] font-medium text-navy-900 leading-snug block">{f.feature}</span>
                    <span className="flex items-center gap-1.5 mt-1"><FeatureChip status={f.status} /><span className="text-[10px] text-slate-600">{f.src}</span></span>
                  </span>
                  <Icon.chevR size={15} className="text-slate-300 mt-1" />
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.feature} wide
        footer={<>
          <Btn variant="ghost" onClick={() => setOpen(null)}>Close</Btn>
          {open?.route ? <Btn variant="teal" icon={Icon.arrowR} onClick={() => { const r = open.route; setOpen(null); go(r[0], r[1]); }}>Demonstrate</Btn>
            : <Btn variant="outline" onClick={() => toast("This feature is shown across the platform.")}>No single screen</Btn>}
        </>}>
        {open && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <FeatureChip status={open.status} />
              <Badge tone="slate">{open.cap}</Badge>
              <span className="text-[11px] text-slate-600">Source: {open.src}</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{open.desc}</p>
            {open.route && (
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] text-slate-500 flex items-center gap-2">
                <Icon.eye size={14} /> Demonstrated on: <b className="text-navy-900">{PERSONAS.find((p) => p.id === open.route[0])?.label} → {open.route[1]}</b>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============ USER JOURNEY EXPLORER ============ */
export function JourneyExplorer() {
  const { go } = useApp();
  const [pf, setPf] = useState("all");
  const [active, setActive] = useState(null); // journey being "played"
  const [stepIdx, setStepIdx] = useState(0);

  const list = JOURNEYS.filter((j) => pf === "all" || j.persona === pf);
  const personaTabs = [["all", "All"], ...PERSONAS.map((p) => [p.id, p.label])];

  const play = (j) => { setActive(j); setStepIdx(0); };
  const personaColor = (id) => PERSONAS.find((p) => p.id === id)?.color || "#64748b";

  return (
    <div className="animate-fade-up">
      <PageHead title="User Journeys" sub={`All ${journeyCounts.total} end-to-end journeys across personas. Play any journey to walk its steps and jump into the live screens.`}
        badge={<Badge tone="indigo">{journeyCounts.total} journeys</Badge>} />

      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total journeys" value={journeyCounts.total} icon={Icon.list} tone="indigo" />
        <StatCard label="MVP" value={journeyCounts.mvp} icon={Icon.check} tone="teal" />
        <StatCard label="Future" value={journeyCounts.future} icon={Icon.pkg} />
      </div>

      <div className="sticky top-[86px] z-20 mb-4">
        <Card className="p-3 shadow-lift">
          <div className="flex gap-1.5 flex-wrap">
            {personaTabs.map(([k, t]) => <button key={k} onClick={() => setPf(k)} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ring-1 ${pf === k ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 text-slate-600 hover:ring-teal-400"}`}>{t}</button>)}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {list.map((j) => {
          const p = PERSONAS.find((x) => x.id === j.persona);
          return (
            <Card key={j.id} className="p-4 hover:shadow-float transition">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl grid place-items-center text-white shrink-0" style={{ background: p.color }}>{Icon[p.icon]({ size: 17 })}</span>
                  <div>
                    <div className="font-semibold text-navy-900 leading-tight">{j.title}</div>
                    <div className="text-[11px] text-slate-600">{p.label} · {j.steps.length} steps</div>
                  </div>
                </div>
                <FeatureChip status={j.status} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-600">{j.source}</span>
                <Btn size="sm" variant="teal" icon={Icon.play} onClick={() => play(j)}>Play journey</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Journey player */}
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.title} wide
        footer={active && (
          <div className="flex items-center justify-between w-full">
            <span className="text-[12px] text-slate-600">Step {stepIdx + 1} of {active.steps.length}</span>
            <div className="flex gap-2">
              <Btn variant="ghost" icon={Icon.arrowL} disabled={stepIdx === 0} onClick={() => setStepIdx((s) => s - 1)}>Prev</Btn>
              {active.steps[stepIdx].go && <Btn variant="outline" icon={Icon.eye} onClick={() => { const s = active.steps[stepIdx]; const g = s.go; setActive(null); go(g[0], g[1], s.spotlight ? { spotlight: s.spotlight, tip: s.tip || s.t } : null); }}>Open screen</Btn>}
              {stepIdx < active.steps.length - 1
                ? <Btn variant="primary" icon={Icon.arrowR} onClick={() => setStepIdx((s) => s + 1)}>Next</Btn>
                : <Btn variant="teal" icon={Icon.check} onClick={() => setActive(null)}>Done</Btn>}
            </div>
          </div>
        )}>
        {active && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg grid place-items-center text-white" style={{ background: personaColor(active.persona) }}>{Icon[PERSONAS.find((p) => p.id === active.persona).icon]({ size: 15 })}</span>
              <FeatureChip status={active.status} />
              <span className="text-[12px] text-slate-600">{active.source}</span>
            </div>
            <ol className="space-y-2">
              {active.steps.map((s, i) => (
                <li key={i} onClick={() => setStepIdx(i)}
                  className={`flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition ${i === stepIdx ? "bg-teal-50 ring-1 ring-teal-500/40" : "hover:bg-slate-50"}`}>
                  <span className={`w-6 h-6 rounded-full grid place-items-center text-[12px] font-bold shrink-0 ${i < stepIdx ? "bg-teal-600 text-white" : i === stepIdx ? "bg-navy-900 text-white" : "bg-slate-200 text-slate-500"}`}>{i < stepIdx ? <Icon.check size={13} /> : i + 1}</span>
                  <span className="flex-1 text-sm text-navy-900">{s.t}</span>
                  {s.go && <Icon.chevR size={15} className="text-slate-300 mt-0.5" />}
                </li>
              ))}
            </ol>
            {active.keyFeatures?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1.5">Key features used</div>
                <div className="flex flex-wrap gap-1.5">
                  {active.keyFeatures.map((id) => { const f = FEATURES.find((x) => x.id === id); return f ? <Badge key={id} tone="slate">#{id} {f.feature.length > 30 ? f.feature.slice(0, 28) + "…" : f.feature}</Badge> : null; })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
