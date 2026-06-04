import { useState } from "react";
import { Icon } from "../lib/icons";
import { Card, Btn, Badge, PageHead, EmptyState } from "../components/ui";
import { QR } from "../components/charts";
import { SlaiceLogo, TenantLogo } from "../components/Brand";
import { WalletButtons } from "../components/WalletPass";
import { TENANT } from "../data/beach";
import { todayISO, toISO } from "../data/beach";
import { downloadICS } from "../lib/download";
import { useApp } from "../app/store";
import { SLAICE_FEE_RATE, STRIPE_FEE_RATE } from "../domain/pricing";

// Stable booking-reference sequence — avoids the collisions/irreproducibility of
// Math.random() and keeps the confirmation QR consistent within a session.
let BOOKING_SEQ = 10428;
const nextBookingRef = () => "BK-" + ++BOOKING_SEQ;

export function Checkout() {
  const { cart, removeFromCart, addToCart, go, toast } = useApp();
  const [phase, setPhase] = useState("cart"); // cart | redirect | done
  // The buyer never needs the marketplace split — it's hidden by default and
  // revealed only via an explicit demo toggle (real customers see Subtotal →
  // Total; the commission/payout breakdown lives in the Accountant views).
  const [showEconomics, setShowEconomics] = useState(false);
  const total = cart.reduce((a, b) => a + b.price, 0);
  const fee = +(total * SLAICE_FEE_RATE).toFixed(2);
  const stripeFee = +(total * STRIPE_FEE_RATE).toFixed(2);
  const removeItem = (it) => { removeFromCart(it.kind, it.id); toast(`Removed ${it.label}.`, { action: { label: "Undo", onClick: () => addToCart(it) } }); };

  if (cart.length === 0 && phase === "cart") {
    return (
      <div className="animate-fade-up max-w-xl">
        <Card className="p-6">
          <EmptyState
            icon={Icon.card}
            title="Your cart is empty"
            body="Add sunbeds, tickets or extras to continue to checkout."
            action={<Btn variant="teal" icon={Icon.umbrella} onClick={() => go("customer", "book")}>Book a sunbed</Btn>}
          />
        </Card>
      </div>
    );
  }

  if (phase === "redirect") {
    return (
      <div className="animate-fade-in grid place-items-center min-h-[60dvh]">
        <Card className="p-10 max-w-md w-full text-center">
          <div className="flex items-center justify-center gap-2 text-[#635bff] font-bold text-lg"><Icon.stripe size={22} /> stripe</div>
          <div className="mt-4 text-sm text-slate-500">Redirecting to {TENANT.name}'s secure Stripe Checkout…</div>
          <div className="mt-5 mx-auto w-10 h-10 rounded-full border-2 border-slate-200 border-t-[#635bff] animate-spin" />
          <div className="mt-5 text-[12px] text-slate-600 flex items-center justify-center gap-1.5"><Icon.lock size={12} /> Secure payment on {TENANT.name}'s account · powered by Stripe</div>
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
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
            <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.card size={16} /> Your basket · {cart.length} item{cart.length !== 1 ? "s" : ""}</div>
            <div className="text-[12px] text-slate-600">Subtotal <b className="text-navy-900 tnum">€{total.toFixed(2)}</b></div>
          </div>
          <div className="divide-y divide-slate-100">
            {cart.map((it) => (
              <div key={it.kind + it.id} className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-slate-100 grid place-items-center text-slate-500">{kindIcon(it.kind)}</span>
                  <div><div className="font-semibold text-sm text-navy-900">{it.label}</div><div className="text-[12px] text-slate-600">{it.sub}</div></div>
                </div>
                <div className="flex items-center gap-2"><span className="font-semibold tnum">€{it.price}</span><button aria-label={`Remove ${it.label}`} onClick={() => removeItem(it)} className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Icon.trash size={16} /></button></div>
              </div>
            ))}
          </div>
        </Card>
        <div className="mt-3 text-[12px] text-slate-600 flex items-center gap-1.5"><Icon.shield size={13} /> On success: booking confirmed via webhook, QR e-mailed, and an ΑΠΥ auto-issued to MyDATA.</div>
      </div>

      <div className="lg:sticky lg:top-4 h-max">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><TenantLogo size={30} /><div className="text-sm font-semibold text-navy-900">{TENANT.name}</div></div>
          {/* Customer-facing summary: Subtotal → Total only. */}
          <Row l="Subtotal" v={`€${total.toFixed(2)}`} />
          <div className="h-px bg-slate-100 my-2" />
          <Row l="Total" v={`€${total.toFixed(2)}`} bold />
          <div className="text-[11px] text-slate-500 mt-1">VAT included where applicable.</div>

          {/* Demo-only: reveal the marketplace split. Never shown to a real buyer. */}
          {showEconomics && (
            <div className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 animate-fade-in">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1"><Icon.layers size={11} /> Platform economics · demo</div>
              <Row l="Stripe processing (~1.5%)" v={`€${stripeFee.toFixed(2)}`} muted />
              <Row l="Slaice commission (5%)" v={`€${fee.toFixed(2)}`} muted />
              <div className="text-[11px] text-slate-600 mt-1.5 pt-1.5 border-t border-slate-200">Tenant receives €{(total - stripeFee - fee).toFixed(2)} · Slaice receives €{fee.toFixed(2)} (Stripe Connect direct charge + application fee).</div>
            </div>
          )}

          <Btn variant="indigo" full size="lg" className="mt-4" icon={Icon.stripe} onClick={() => setPhase("redirect")}>Pay with Stripe</Btn>

          {/* Trust / reassurance (Baymard): payment security, accepted cards,
              and an at-a-glance cancellation policy before the buyer commits. */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500"><Icon.lock size={12} /> Secured by Stripe · we never store card details</div>
          <div className="mt-2 flex items-center justify-center gap-1.5 opacity-90">
            {["VISA", "MC", "AMEX", "APPLE"].map((b) => (
              <span key={b} className="text-[9px] font-bold tracking-wide text-slate-500 bg-slate-100 rounded px-1.5 py-1 ring-1 ring-slate-200">{b}</span>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-snug">
            <Icon.shield size={13} className="shrink-0 mt-0.5 text-teal-600" />
            <span>Free cancellation up to 24h before your visit. <button onClick={() => toast("Demo — cancellation & refund policy.")} className="underline hover:text-navy-900">Refund policy</button> · <button onClick={() => toast("Demo — terms of service.")} className="underline hover:text-navy-900">Terms</button></span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button onClick={() => go("customer", "book")} className="text-[12px] text-slate-600 hover:text-navy-900">← Back to booking</button>
            <button onClick={() => setShowEconomics((s) => !s)} className="text-[11px] text-slate-400 hover:text-slate-600 inline-flex items-center gap-1" title="Demo affordance — not shown to real customers"><Icon.layers size={11} /> {showEconomics ? "Hide" : "Show"} platform economics</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ l, v, bold, muted }) {
  return <div className={`flex items-center justify-between text-sm py-0.5 ${bold ? "font-bold text-navy-900 text-base" : muted ? "text-slate-600" : "text-slate-600"}`}><span>{l}</span><span className="tnum">{v}</span></div>;
}

function kindIcon(kind) {
  const m = { sunbed: Icon.umbrella, ticket: Icon.ticket, locker: Icon.lock, parking: Icon.car };
  const I = m[kind] || Icon.card;
  return <I size={17} />;
}

export function Confirmation({ inline }) {
  const { cart, clearCart, go, toast } = useApp();
  // Stable across re-renders so the QR and wallet pass don't change.
  const [ref] = useState(nextBookingRef);
  // Derive a representative wallet pass from the basket.
  const sunbeds = cart.filter((i) => i.kind === "sunbed");
  const total = cart.reduce((a, b) => a + b.price, 0);
  const first = sunbeds[0] || cart[0];
  const [zone, date] = (first?.sub || "Akti tou Iliou · Today").split(" · ");
  const pass = {
    ref,
    holder: "Elena M.",
    zone: zone || "Akti tou Iliou",
    date: date || "Today",
    seat: sunbeds.map((s) => s.label.replace(/^Sunbed\s+/, "")).join(", ") || "—",
    guests: sunbeds.length || cart.filter((i) => i.kind === "ticket").length || 1,
    total: `€${total}`,
  };
  const Wrapper = inline ? "div" : "div";
  return (
    <Wrapper className="animate-fade-up max-w-xl mx-auto">
      <Card className="p-6 sm:p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-600 text-white grid place-items-center animate-pop"><Icon.check size={34} /></div>
        <h2 className="mt-4 font-display font-bold text-2xl text-navy-900">Payment successful</h2>
        <p className="text-sm text-slate-500 mt-1">Your booking is confirmed. The QR below has been e-mailed to you, and a MyDATA receipt (ΑΠΥ) was issued.</p>

        <div className="my-5 grid place-items-center"><QR size={180} seed={ref} /></div>
        <div className="font-mono text-sm text-navy-900 font-semibold">#{ref}</div>

        {/* Add to Apple / Google Wallet */}
        <WalletButtons pass={pass} className="mt-6 pt-5 border-t border-slate-100" />

        <div className="mt-6 grid sm:grid-cols-3 gap-2 text-[12px]">
          <Pill icon={Icon.checkCircle} t="Stripe paid" tone="green" />
          <Pill icon={Icon.mail} t="QR e-mailed" tone="green" />
          <Pill icon={Icon.receipt} t="ΑΠΥ → MyDATA ✓" tone="green" />
        </div>

        <div className="mt-6 flex gap-2 justify-center flex-wrap">
          <Btn variant="teal" icon={Icon.grid} onClick={() => { clearCart(); go("customer", "mybookings"); }}>View my bookings</Btn>
          <Btn variant="outline" icon={Icon.calendar} onClick={() => {
            const start = todayISO();
            const end = toISO(new Date(Date.now() + 86400000));
            downloadICS(`beach-day-${ref}.ics`, {
              uid: `${ref}@slaice`, title: `Beach day · ${pass.zone}`, start, end,
              location: `${TENANT.name}, ${TENANT.place}`,
              description: `Booking ${ref} · ${pass.seat !== "—" ? "Sunbeds " + pass.seat : "Entry"} · ${pass.total}. Show your QR at the gate.`,
            });
            toast("Calendar invite downloaded (.ics).", { tone: "success" });
          }}>Add to calendar</Btn>
          <Btn variant="outline" icon={Icon.receipt} onClick={() => { clearCart(); go("customer", "mydocs"); }}>View receipt</Btn>
        </div>
      </Card>
      <div className="text-center mt-3 text-[11px] text-slate-600 flex items-center justify-center gap-1.5">powered by <SlaiceLogo size={18} withText /></div>
    </Wrapper>
  );
}

function Pill({ icon: IconC, t, tone }) {
  return <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15 py-1.5 font-semibold"><IconC size={14} /> {t}</div>;
}
