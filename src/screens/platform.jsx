import { useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Card, Btn, Badge, PageHead, Table, StatCard, Field, Input, Select, Toggle, FutureBanner } from "../components/ui.jsx";
import { SlaiceLogo } from "../components/Brand.jsx";
import { useApp } from "../app/store.jsx";

function ModuleList({ modules }) {
  return (
    <span className="flex flex-wrap gap-1">
      {modules.map((m) => (
        <span key={m} className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 ring-1 ring-teal-600/15">{m}</span>
      ))}
    </span>
  );
}

/* ============ TENANTS ============ */
export function PlatformTenants() {
  const { go, toast } = useApp();
  return (
    <div className="animate-fade-up">
      <PageHead title="Tenants" sub="Slaice platform console — connected beaches & verticals." badge={<Badge tone="mvp">MVP</Badge>}
        actions={<Btn variant="indigo" icon={Icon.bolt} onClick={() => go("platform", "onboarding")}>Onboard tenant</Btn>} />
      <div className="grid sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Active tenants" value="1" sub="anchor beach" tone="indigo" icon={Icon.building} />
        <StatCard label="Pipeline" value="3" sub="small beaches" icon={Icon.trend} />
        <StatCard label="Platform GMV" value="€704k" icon={Icon.chart} />
        <StatCard label="Slaice fees" value="€35.2k" tone="indigo" icon={Icon.cash} />
      </div>
      <Card className="p-2">
        <Table cols={["Tenant", "Subdomain", "Stripe", "Modules", "Status"]}
          rows={[
            ["Akti tou Iliou", "aktitouiliou.slaice.app", <Badge tone="green">charges ✓</Badge>, <ModuleList modules={["Booking", "Ticket", "Invoice", "Pay"]} />, <Badge tone="green">Live</Badge>],
            ["Demo Beach #2", "beach2.slaice.app", <Badge tone="amber">onboarding</Badge>, <ModuleList modules={["Booking"]} />, <Badge tone="amber">Setup</Badge>],
            ["Paralia Sun", "paraliasun.slaice.app", <Badge tone="slate">pending</Badge>, <span className="text-slate-500">—</span>, <Badge tone="slate">Lead</Badge>],
          ]} />
      </Card>
      <Card className="p-5 mt-4">
        <div className="font-semibold text-navy-900 mb-3">Capability flags · Akti tou Iliou</div>
        <div className="mb-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 mb-1.5 flex items-center gap-1.5"><Icon.checkCircle size={11} /> Enabled · MVP</div>
          <div className="flex flex-wrap gap-2">
            {["Sunbed Booking", "Entry Ticket", "e-Invoice/MyDATA", "Payments", "Reporting"].map((m) => (
              <span key={m} className="px-3 py-1.5 rounded-lg text-[13px] bg-teal-50 text-teal-700 ring-1 ring-teal-600/20">{m}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5"><Icon.clock size={11} /> Roadmap · disabled</div>
          <div className="flex flex-wrap gap-2">
            {["Day Locker", "Parking", "Cash Register", "Loyalty"].map((m) => (
              <span key={m} className="px-3 py-1.5 rounded-lg text-[13px] bg-slate-50 text-slate-500 ring-1 ring-slate-200">{m}</span>
            ))}
          </div>
        </div>
        <Btn variant="ghost" size="sm" className="mt-4" icon={Icon.cog} onClick={() => go("platform", "superadmin")}>Manage in Super Admin</Btn>
      </Card>
    </div>
  );
}

/* ============ TENANT ONBOARDING WIZARD (Stripe Connect) ============ */
export function PlatformOnboarding() {
  const { toast, go } = useApp();
  const [step, setStep] = useState(0);
  const steps = ["Tenant details", "Branding & modules", "Stripe Connect", "Map & go-live"];
  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));
  return (
    <div className="animate-fade-up max-w-3xl">
      <PageHead title="Tenant Onboarding" sub="Create a tenant, configure branding & modules, connect Stripe (Connect Standard), and go live." badge={<Badge tone="mvp">MVP</Badge>} />
      {/* stepper */}
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">Step {step + 1} of {steps.length}</div>
      <div className="flex items-center mb-6">
        {steps.map((s, i) => {
          const done = i < step, active = i === step;
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5">
                <span className={`w-10 h-10 rounded-full grid place-items-center text-sm font-bold ring-4 transition ${done ? "bg-teal-600 text-white ring-teal-100" : active ? "bg-slaice-600 text-white ring-slaice-100 shadow-lift" : "bg-white text-slate-500 ring-slate-100"}`}>{done ? <Icon.check size={18} /> : i + 1}</span>
                <span className={`text-[13px] font-semibold hidden sm:block ${active ? "text-navy-900" : done ? "text-teal-700" : "text-slate-500"}`}>{s}</span>
              </div>
              {i < steps.length - 1 && <div className={`h-1 flex-1 mx-3 rounded-full ${done ? "bg-teal-500" : "bg-slate-200"}`} />}
            </div>
          );
        })}
      </div>

      <Card className="p-6">
        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-3 animate-fade-in">
            <Field label="Tenant name"><Input defaultValue="Demo Beach #2" /></Field>
            <Field label="Subdomain" hint="{tenant}.slaice.app"><Input defaultValue="beach2" /></Field>
            <Field label="Country"><Select options={["Greece (GR)", "Cyprus (CY)"]} /></Field>
            <Field label="Contact e-mail"><Input defaultValue="owner@beach2.gr" /></Field>
            <Field label="VAT number (ΑΦΜ)"><Input placeholder="123456789" /></Field>
            <Field label="Default language"><Select options={["Greek", "English", "German", "French"]} /></Field>
          </div>
        )}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Brand colour"><div className="flex gap-1.5">{["#0D9488", "#0ea5e9", "#f59e0b", "#a855f7", "#ef4444"].map((c) => <span key={c} className="w-7 h-7 rounded-lg ring-2 ring-white shadow cursor-pointer" style={{ background: c }} />)}</div></Field>
              <Field label="Logo"><Btn variant="outline" size="sm" icon={Icon.download} onClick={() => toast("Demo — upload logo.")}>Upload</Btn></Field>
            </div>
            <div className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-slate-600 mb-2">Enable modules</div>
            <div className="space-y-2">
              {[["Sunbed Booking", true], ["Entry Ticket", true], ["e-Invoice / MyDATA", true], ["Payments (Stripe)", true], ["Day Locker", false], ["Parking", false], ["Cash Register", false]].map(([m, on]) => (
                <ModuleToggle key={m} label={m} def={on} />
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="animate-fade-in text-center py-2">
            <div className="flex items-center justify-center gap-2 text-[#635bff] font-bold text-lg"><Icon.stripe size={22} /> Stripe Connect Standard</div>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">Create a connected account and send the tenant through Stripe onboarding (KYC). We verify <span className="font-mono text-[12px]">charges_enabled</span> before going live.</p>
            <div className="mt-4 grid sm:grid-cols-3 gap-2 max-w-lg mx-auto text-[12px]">
              <Flag t="details_submitted" ok /><Flag t="charges_enabled" ok /><Flag t="payouts_enabled" ok />
            </div>
            <Btn variant="indigo" className="mt-4" icon={Icon.stripe} onClick={() => toast("Demo — generated account_link; tenant completes KYC on Stripe.")}>Create onboarding link</Btn>
          </div>
        )}
        {step === 3 && (
          <div className="animate-fade-in text-center py-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-600 text-white grid place-items-center"><Icon.check size={28} /></div>
            <div className="mt-3 font-semibold text-navy-900">Ready to go live</div>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Configure the beach map/zones, then publish. The tenant resolves at <span className="font-mono text-[12px]">beach2.slaice.app</span>.</p>
            <div className="flex gap-2 justify-center mt-4 flex-wrap">
              <Btn variant="outline" icon={Icon.map} onClick={() => go("admin", "map")}>Configure map</Btn>
              <Btn variant="teal" icon={Icon.bolt} onClick={() => { toast("Demo — tenant is live!"); go("platform", "tenants"); }}>Go live</Btn>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
          <Btn variant="ghost" icon={Icon.arrowL} onClick={prev} disabled={step === 0}>Back</Btn>
          {step < steps.length - 1 && <Btn variant="primary" icon={Icon.arrowR} onClick={next}>Continue</Btn>}
        </div>
      </Card>
    </div>
  );
}
function ModuleToggle({ label, def }) {
  const [on, setOn] = useState(def);
  return (
    <div className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 px-4 py-2.5">
      <span className="text-sm font-medium text-navy-900">{label}</span>
      <Toggle on={on} onChange={setOn} />
    </div>
  );
}
function Flag({ t, ok }) {
  return <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-mono ${ok ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15" : "bg-slate-50 text-slate-600"}`}><Icon.check size={13} /> {t}</div>;
}

/* ============ SUPER ADMIN ============ */
export function PlatformSuperAdmin() {
  const { toast } = useApp();
  const modules = ["Sunbed Booking", "Entry Ticket", "e-Invoice/MyDATA", "Payments", "Reporting", "Day Locker", "Parking", "Cash Register", "Loyalty", "Reviews", "Catalogue", "Geo Map"];
  const tenants = [
    { n: "Akti tou Iliou", flags: [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0] },
    { n: "Demo Beach #2", flags: [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0] },
  ];
  const webhooks = ["checkout.session.completed", "payment_intent.succeeded", "payment_intent.payment_failed", "charge.refunded", "account.updated"];
  return (
    <div className="animate-fade-up">
      <PageHead title="Super Admin" sub="Internal Slaice console — enable/disable capability modules per tenant (feature flags) and monitor platform webhooks." badge={<Badge tone="future">Future</Badge>} />
      <FutureBanner />
      <Card className="p-5 overflow-x-auto">
        <div className="font-semibold text-navy-900 mb-3">Capability flags per tenant</div>
        <table className="text-sm">
          <thead><tr className="text-[11px] uppercase text-slate-600"><th className="text-left py-2 pr-4">Module</th>{tenants.map((t) => <th key={t.n} className="px-3 py-2 font-semibold">{t.n}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {modules.map((m, mi) => (
              <tr key={m}>
                <td className="py-2 pr-4 font-medium text-navy-900 whitespace-nowrap">{m}</td>
                {tenants.map((t) => <td key={t.n} className="px-3 py-2 text-center"><FlagToggle def={!!t.flags[mi]} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="p-5 mt-4">
        <div className="font-semibold text-navy-900 mb-3 flex items-center gap-2"><Icon.stripe size={18} /> Stripe webhooks</div>
        <div className="space-y-1.5">
          {webhooks.map((w) => (
            <div key={w} className="flex items-center justify-between rounded-lg ring-1 ring-slate-100 px-3 py-2 text-sm">
              <span className="font-mono text-[12px] text-navy-900">{w}</span><Badge tone="green"><Icon.check size={11} /> healthy</Badge>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[12px] text-slate-600">Signed endpoint verifies Stripe-Signature with the webhook secret before processing.</div>
      </Card>
    </div>
  );
}
function FlagToggle({ def }) {
  const [on, setOn] = useState(def);
  return <button onClick={() => setOn((o) => !o)} className={`w-9 h-5 rounded-full transition relative inline-block ${on ? "bg-teal-600" : "bg-slate-300"}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${on ? "left-[18px]" : "left-0.5"}`} /></button>;
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
