import { useEffect, useState } from "react";
import { Icon, type IconRenderer } from "../lib/icons";
import { Card, Btn, Badge, PageHead, Table, StatCard, Modal, FutureBanner } from "../components/ui";
import { SlaiceLogo } from "../components/Brand";
import { SUBPROCESSORS, BREACHES } from "../data/gdpr";
import { useApp } from "../app/store";
import { TenantPostureTable } from "./tenant/PlatformOverviews";

/* ---- 72-hour breach-notification workflow ---- */
const BREACH_STEPS: { label: string; detail: string; icon: IconRenderer; action: string }[] = [
  { label: "Assess severity & scope", detail: "Identify the data, systems and number of subjects affected.", icon: Icon.search, action: "Scope assessed" },
  { label: "Contain & remediate", detail: "Stop the exposure, rotate credentials, patch the vector.", icon: Icon.shield, action: "Contained" },
  { label: "Assess notifiability (Art. 33/34)", detail: "Decide whether the breach is likely to risk subjects' rights.", icon: Icon.sliders, action: "Risk assessed" },
  { label: "Notify the supervisory authority", detail: "File with the DPA within 72 hours of becoming aware.", icon: Icon.shieldAlert, action: "DPA notified" },
  { label: "Notify affected tenants & subjects", detail: "Inform the controllers (tenants) and, if high-risk, the data subjects.", icon: Icon.mail, action: "Tenants notified" },
  { label: "Log to the breach register", detail: "Record the facts, effects and remedial action for the audit trail.", icon: Icon.database, action: "Logged" },
];

function BreachWorkflowModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useApp();
  const [stage, setStage] = useState<"work" | "done">("work");
  const [step, setStep] = useState(0);
  useEffect(() => { if (open) { setStage("work"); setStep(0); } }, [open]);
  const allDone = step >= BREACH_STEPS.length;
  return (
    <Modal open={open} onClose={onClose} title={stage === "done" ? "Workflow complete" : "Breach notification · 72h workflow"}
      footer={stage === "done"
        ? <Btn variant="primary" icon={Icon.check} onClick={onClose}>Close</Btn>
        : <><Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" icon={Icon.shieldCheck} disabled={!allDone} onClick={() => { setStage("done"); toast("Breach workflow logged · DPA + tenants notified within SLA.", { tone: "success" }); }}>File &amp; close</Btn></>}>
      {stage === "done" ? (
        <div className="py-2 text-center space-y-2 animate-pop">
          <span className="mx-auto w-12 h-12 rounded-full bg-teal-600 text-white grid place-items-center shadow"><Icon.check size={22} /></span>
          <div className="font-semibold text-navy-900">Notification filed</div>
          <div className="text-[13px] text-slate-600 max-w-sm mx-auto">The supervisory authority and affected tenants were notified within the 72-hour SLA, and the incident is recorded in the breach register.</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-[12px] text-slate-500">Work each step — GDPR Art. 33 requires notifying the authority within 72 hours of awareness.</div>
          <ol className="space-y-1.5">
            {BREACH_STEPS.map((s, i) => {
              const st = i < step ? "done" : i === step ? "active" : "todo";
              const SIcon = s.icon;
              return (
                <li key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition ${st === "done" ? "ring-teal-200 bg-teal-50/60" : st === "active" ? "ring-slaice-300 bg-white shadow-soft" : "ring-slate-100 bg-slate-50/50 opacity-60"}`}>
                  <span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${st === "done" ? "bg-teal-600 text-white" : st === "active" ? "bg-navy-900 text-white" : "bg-slate-200 text-slate-400"}`}>
                    {st === "done" ? <Icon.check size={14} /> : <SIcon size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-navy-900">{s.label}</div>
                    <div className="text-[11px] text-slate-500 leading-snug">{s.detail}</div>
                  </div>
                  {st === "active" && <Btn size="sm" variant="tint" onClick={() => setStep((x) => x + 1)}>{s.action}</Btn>}
                  {st === "done" && <span className="text-[11px] font-semibold text-teal-700 shrink-0 inline-flex items-center gap-1"><Icon.check size={11} /> {s.action}</span>}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Modal>
  );
}

/* ============ VERTICALS ============ */
export function PlatformVerticals() {
  const rows = [
    ["Calendar & Inventory", "Sunbeds/day", "Seats/show", "Seats/event", "Stock units"],
    ["Payments", "Stripe", "Stripe", "Stripe", "Stripe + POS"],
    ["Catalogue / Pricing", "Zone/sunbed", "Seat class", "Tier/zone", "Products"],
    ["QR & Validation", "Beach entry", "Theatre entry", "Venue entry", "—"],
    ["e-Invoice / MyDATA", "ΑΠΥ", "ΑΠΥ/ΤΠΥ", "ΑΠΥ/ΤΠΥ", "ΑΠΥ/ΤΠΥ"],
    ["Geo Map / Layout", "Beach layout", "Seat map", "Venue map", "Store map"],
    ["Loyalty / Reviews", "Roadmap", "Points/NPS", "Points/NPS", "Loyalty"],
  ];
  const cols = ["Capability module", "Beach (MVP)", "Theatre / Cinema", "Events", "Retail"];
  const verts = [
    { t: "Theatre / Cinema", ic: Icon.seat, d: "Seats per show, showtimes, seat-class pricing." },
    { t: "Events / Concerts", ic: Icon.ticket, d: "Tiered/zone seating, timed entry, QR validation." },
    { t: "Retail Market", ic: Icon.pkg, d: "Product catalogue, cash register, e-invoice & accounting." },
  ];
  return (
    <div className="animate-fade-up pt-1">
      <PageHead title="Verticals" sub="Reuse the generic inventory, payments, e-invoice & catalogue across new markets — minimal code change." badge={<Badge tone="future">Future</Badge>} />
      <FutureBanner />
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        {verts.map((v) => (
          <Card key={v.t} className="p-5">
            <div className="w-11 h-11 rounded-xl bg-slaice-100 text-slaice-700 grid place-items-center"><v.ic size={22} /></div>
            <div className="mt-3 font-semibold text-navy-900">{v.t}</div>
            <div className="text-[13px] text-slate-500 mt-0.5">{v.d}</div>
          </Card>
        ))}
      </div>
      <Card className="p-5 overflow-x-auto">
        <div className="font-semibold text-navy-900 mb-2">Cross-business capability reuse</div>
        <div className="sm:hidden mb-2 text-[11px] text-slate-500 flex items-center gap-1"><Icon.chevR size={12} /> Scroll sideways to see all verticals</div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-600 border-b border-slate-200">{cols.map((c, i) => <th key={i} className="py-2.5 px-3 font-semibold">{c}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, ri) => <tr key={ri} className="hover:bg-slate-50/70">{r.map((c, ci) => <td key={ci} className={`py-2.5 px-3 ${ci === 0 ? "font-medium text-navy-900" : "text-slate-600"}`}>{c}</td>)}</tr>)}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ============ LANDING PAGE (slaice.app) ============ */
export function PlatformLanding() {
  const { toast } = useApp();
  return (
    <div className="animate-fade-up">
      <PageHead title="Landing Page · slaice.app" sub="Public marketing page at the root domain — brand, capabilities & use cases. SEO-friendly and responsive." badge={<Badge tone="future">Future</Badge>} />
      <FutureBanner />
      <Card className="overflow-hidden">
        <div className="grad-slaice text-white p-10 md:p-14 relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <div className="relative">
            <SlaiceLogo size={40} withText light />
            <h1 className="mt-8 font-display font-bold text-4xl md:text-5xl max-w-2xl leading-tight">Digital Multi-Product Platform</h1>
            <p className="mt-3 text-white/80 max-w-xl">From a single offering to a digital ecosystem — a scalable product & services platform for growth.</p>
            <div className="mt-3 text-gold-400 font-display font-bold text-xl">Digital Business Capability as-a-service</div>
            <div className="mt-6 flex gap-3 flex-wrap">
              <Btn variant="light" size="lg" onClick={() => toast("Demo — request a demo.")}>Request a demo</Btn>
              <Btn size="lg" className="bg-gold-500 text-navy-950 hover:bg-gold-400" onClick={() => toast("Demo — explore capabilities.")}>Explore capabilities</Btn>
            </div>
          </div>
        </div>
        <div className="p-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { ic: Icon.umbrella, t: "Beach", d: "Sunbed booking, tickets, QR entry" },
            { ic: Icon.seat, t: "Theatre & Events", d: "Seat maps, showtimes, ticketing" },
            { ic: Icon.pkg, t: "Retail", d: "Catalogue, cash register, e-invoice" },
            { ic: Icon.shield, t: "Compliant", d: "Stripe payments + MyDATA e-invoicing" },
          ].map((c) => (
            <div key={c.t} className="rounded-xl ring-1 ring-slate-100 p-5">
              <div className="w-10 h-10 rounded-lg bg-slaice-100 text-slaice-700 grid place-items-center"><c.ic size={20} /></div>
              <div className="mt-2 font-semibold text-navy-900">{c.t}</div>
              <div className="text-[13px] text-slate-500">{c.d}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============ COMPLIANCE & DPA (Platform / Slaice) ============ */
export function PlatformCompliance() {
  const { toast } = useApp();
  const [workflow, setWorkflow] = useState(false);
  return (
    <div className="animate-fade-up">
      <PageHead actions={<><Btn variant="outline" icon={Icon.download} onClick={() => toast("Demo — downloaded the GDPR/DPA pack (PDF).")}>DPA pack</Btn><Btn variant="primary" icon={Icon.shieldCheck} onClick={() => toast("Demo — compliance posture saved.")}>Save</Btn></>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Data residency" value="EU" sub="Frankfurt region" tone="indigo" />
        <StatCard label="Sub-processors" value={String(SUBPROCESSORS.length)} sub="all DPA-signed" tone="teal" />
        <StatCard label="Open incidents" value="0" sub="last 12 months" tone="teal" />
        <StatCard label="Breach SLA" value="72h" sub="DPA notification" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-2">
          <div className="px-3 pt-2 pb-1 font-semibold text-navy-900">Sub-processors</div>
          <Table cols={["Provider", "Purpose", "Region", "DPA"]}
            rows={SUBPROCESSORS.map((s) => [<b className="text-navy-900">{s.name}</b>, s.purpose, s.region, <Badge tone={s.dpa === "Signed" ? "green" : "slate"}>{s.dpa}</Badge>])} />
        </Card>
        <Card className="p-2">
          <div className="px-3 pt-2 pb-1 font-semibold text-navy-900">Per-tenant DPA &amp; posture</div>
          <TenantPostureTable />
        </Card>
      </div>
      <Card className="p-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.shieldAlert size={16} className="text-teal-600" /> Breach notification register</div>
          <Btn size="sm" variant="outline" icon={Icon.bolt} onClick={() => setWorkflow(true)}>Start workflow</Btn>
        </div>
        <div className="rounded-2xl bg-teal-50/70 ring-1 ring-teal-600/15 p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-white text-teal-700 grid place-items-center shrink-0 shadow-sm"><Icon.shieldCheck size={20} /></span>
          <div>
            <div className="font-semibold text-navy-900">All clear</div>
            <div className="text-[13px] text-slate-600">{BREACHES[0].note} If an incident occurs, affected tenants and supervisory authorities are notified within 72 hours.</div>
          </div>
        </div>
      </Card>
      <BreachWorkflowModal open={workflow} onClose={() => setWorkflow(false)} />
    </div>
  );
}
