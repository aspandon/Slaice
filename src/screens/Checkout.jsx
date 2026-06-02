import { useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Card, Btn, Badge, PageHead } from "../components/ui.jsx";
import { QR } from "../components/charts.jsx";
import { SlaiceLogo, TenantLogo } from "../components/Brand.jsx";
import { TENANT } from "../data/beach.js";
import { useApp } from "../app/store.jsx";

const FEE = 0.05; // Slaice application fee (5%)
const STRIPE = 0.015; // ~1.5% Stripe processing

export function Checkout() {
  const { cart, removeFromCart, go, toast } = useApp();
  const [phase, setPhase] = useState("cart"); // cart | redirect | done
  const total = cart.reduce((a, b) => a + b.price, 0);
  const fee = +(total * FEE).toFixed(2);
  const stripeFee = +(total * STRIPE).toFixed(2);

  if (cart.length === 0 && phase === "cart") {
    return (
      <div className="animate-fade-up max-w-xl">
        <PageHead title="Checkout" />
        <Card className="p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 grid place-items-center"><Icon.card size={26} /></div>
          <div className="mt-3 font-semibold text-navy-900">Your cart is empty</div>
          <p className="text-sm text-slate-500 mt-1">Add sunbeds, tickets or extras to continue.</p>
          <Btn variant="teal" className="mt-4" icon={Icon.umbrella} onClick={() => go("customer", "book")}>Book a sunbed</Btn>
        </Card>
      </div>
    );
  }

  if (phase === "redirect") {
    return (
      <div className="animate-fade-in grid place-items-center min-h-[60vh]">
        <Card className="p-10 max-w-md w-full text-center">
          <div className="flex items-center justify-center gap-2 text-[#635bff] font-bold text-lg"><Icon.stripe size={22} /> stripe</div>
          <div className="mt-4 text-sm text-slate-500">Redirecting to {TENANT.name}'s secure Stripe Checkout…</div>
          <div className="mt-5 mx-auto w-10 h-10 rounded-full border-2 border-slate-200 border-t-[#635bff] animate-spin" />
          <div className="mt-5 text-[12px] text-slate-400">Direct charge on the tenant's connected account · application_fee €{fee}</div>
          <Btn variant="indigo" full size="lg" className="mt-5" onClick={() => setPhase("done")}>Simulate successful payment</Btn>
        </Card>
      </div>
    );
  }

  if (phase === "done") return <Confirmation inline />;

  return (
    <div className="animate-fade-up grid lg:grid-cols-[1fr_360px] gap-5">
      <div>
        <PageHead title="Checkout" sub="Review your order, then pay via Stripe (hosted, tenant-branded)." badge={<Badge tone="mvp">MVP</Badge>} />
        <Card className="p-2">
          <div className="divide-y divide-slate-100">
            {cart.map((it) => (
              <div key={it.kind + it.id} className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-slate-100 grid place-items-center text-slate-500">{kindIcon(it.kind)}</span>
                  <div><div className="font-semibold text-sm text-navy-900">{it.label}</div><div className="text-[12px] text-slate-400">{it.sub}</div></div>
                </div>
                <div className="flex items-center gap-3"><span className="font-semibold tnum">€{it.price}</span><button onClick={() => removeFromCart(it.kind, it.id)} className="text-slate-300 hover:text-rose-500"><Icon.trash size={16} /></button></div>
              </div>
            ))}
          </div>
        </Card>
        <div className="mt-3 text-[12px] text-slate-400 flex items-center gap-1.5"><Icon.shield size={13} /> On success: booking confirmed via webhook, QR e-mailed, and an ΑΠΥ auto-issued to MyDATA.</div>
      </div>

      <div className="lg:sticky lg:top-4 h-max">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><TenantLogo size={30} /><div className="text-sm font-semibold text-navy-900">{TENANT.name}</div></div>
          <Row l="Subtotal" v={`€${total.toFixed(2)}`} />
          <Row l="Stripe processing (~1.5%)" v={`€${stripeFee.toFixed(2)}`} muted />
          <Row l="Slaice commission (5%)" v={`€${fee.toFixed(2)}`} muted />
          <div className="h-px bg-slate-100 my-2" />
          <Row l="You pay" v={`€${total.toFixed(2)}`} bold />
          <div className="text-[11px] text-slate-400 mt-1">Tenant receives €{(total - stripeFee - fee).toFixed(2)} · Slaice receives €{fee.toFixed(2)}</div>
          <Btn variant="indigo" full size="lg" className="mt-4" icon={Icon.stripe} onClick={() => setPhase("redirect")}>Pay with Stripe</Btn>
          <button onClick={() => go("customer", "book")} className="mt-2 w-full text-center text-[12px] text-slate-400 hover:text-slate-600">← Back to booking</button>
        </Card>
      </div>
    </div>
  );
}

function Row({ l, v, bold, muted }) {
  return <div className={`flex items-center justify-between text-sm py-0.5 ${bold ? "font-bold text-navy-900 text-base" : muted ? "text-slate-400" : "text-slate-600"}`}><span>{l}</span><span className="tnum">{v}</span></div>;
}

function kindIcon(kind) {
  const m = { sunbed: Icon.umbrella, ticket: Icon.ticket, locker: Icon.lock, parking: Icon.car };
  const I = m[kind] || Icon.card;
  return <I size={17} />;
}

export function Confirmation({ inline }) {
  const { cart, clearCart, go, toast } = useApp();
  const ref = "BK-" + (10400 + Math.floor(Math.random() * 99));
  const Wrapper = inline ? "div" : "div";
  return (
    <Wrapper className="animate-fade-up max-w-xl mx-auto">
      <Card className="p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-600 text-white grid place-items-center animate-pop"><Icon.check size={34} /></div>
        <h2 className="mt-4 font-display font-bold text-2xl text-navy-900">Payment successful</h2>
        <p className="text-sm text-slate-500 mt-1">Your booking is confirmed. The QR below has been e-mailed to you, and a MyDATA receipt (ΑΠΥ) was issued.</p>

        <div className="my-5 grid place-items-center"><QR size={180} seed={ref} /></div>
        <div className="font-mono text-sm text-navy-900 font-semibold">#{ref}</div>

        <div className="mt-5 grid sm:grid-cols-3 gap-2 text-[12px]">
          <Pill icon={Icon.checkCircle} t="Stripe paid" tone="green" />
          <Pill icon={Icon.mail} t="QR e-mailed" tone="green" />
          <Pill icon={Icon.receipt} t="ΑΠΥ → MyDATA ✓" tone="green" />
        </div>

        <div className="mt-6 flex gap-2 justify-center flex-wrap">
          <Btn variant="teal" icon={Icon.grid} onClick={() => { clearCart(); go("customer", "mybookings"); }}>View my bookings</Btn>
          <Btn variant="outline" icon={Icon.receipt} onClick={() => { clearCart(); go("customer", "mydocs"); }}>View receipt</Btn>
        </div>
      </Card>
      <div className="text-center mt-3 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">powered by <SlaiceLogo size={18} withText /></div>
    </Wrapper>
  );
}

function Pill({ icon: IconC, t, tone }) {
  return <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15 py-1.5 font-semibold"><IconC size={14} /> {t}</div>;
}
