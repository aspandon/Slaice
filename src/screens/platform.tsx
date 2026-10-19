import { Icon } from "../lib/icons";
import { Card, Btn, Badge, PageHead, FutureBanner } from "../components/ui";
import { SlaiceLogo } from "../components/Brand";
import { useApp } from "../app/store";

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

export { PlatformCompliance } from "./privacy/PlatformCompliance";
