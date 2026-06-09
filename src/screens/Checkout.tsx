import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import type { IconRenderer } from "../lib/icons";
import { Card, Btn, Badge, PageHead, EmptyState, SwipeRow, Toggle } from "../components/ui";
import { QR } from "../components/charts";
import { SlaiceLogo, TenantLogo } from "../components/Brand";
import { WalletButtons } from "../components/WalletPass";
import { TENANT, todayISO, toISO } from "../data/beach";
import { downloadICS } from "../lib/download";
import { round2 } from "../data/passes";
import { useApp, useT } from "../app/store";
import type { CartItem } from "../domain/types";
import { SLAICE_FEE_RATE, STRIPE_FEE_RATE, TICKET_PRICES } from "../domain/pricing";

// Stable booking-reference sequence — avoids the collisions/irreproducibility of
// Math.random() and keeps the confirmation QR consistent within a session.
let BOOKING_SEQ = 10428;
const nextBookingRef = () => "BK-" + ++BOOKING_SEQ;

export function Checkout() {
  const { cart, removeFromCart, addToCart, clearCart, go, toast, passes, spendVipCredit, passPricing } = useApp();
  const t = useT();
  const [phase, setPhase] = useState<"cart" | "redirect" | "done">("cart");
  // The buyer never needs the marketplace split — it's hidden by default and
  // revealed only via an explicit demo toggle.
  const [showEconomics, setShowEconomics] = useState(false);
  const total = cart.reduce((a, b) => a + b.price, 0);
  const fee = +(total * SLAICE_FEE_RATE).toFixed(2);
  const stripeFee = +(total * STRIPE_FEE_RATE).toFixed(2);

  // ---- Passes ----
  // A guest can apply a Season pass (covers one entry ticket per visit) and/or
  // VIP credit (pays the order at a discount, billed against the balance). The
  // VIP discount only ever applies to the share the card actually pays for.
  const hasVip = !!passes.vip;
  const hasSeason = !!passes.season;
  const [applyVip, setApplyVip] = useState(true);
  const [applySeason, setApplySeason] = useState(true);
  const disc = passPricing.vipDiscount;
  const entryTotal = cart.filter((i) => i.kind === "ticket").reduce((a, b) => a + b.price, 0);
  // Season pass: one entry covered per visit (the holder's), valued at a standard adult entry.
  const seasonCovered = hasSeason && applySeason && entryTotal > 0 ? Math.min(TICKET_PRICES.adult, entryTotal) : 0;
  const afterSeason = round2(total - seasonCovered);
  const vipBalance = passes.vip?.balance ?? 0;
  // €B of credit, at a `disc` discount, settles B/(1−disc) of the order.
  const vipMaxCover = round2(vipBalance / (1 - disc));
  const vipCover = hasVip && applyVip ? Math.min(afterSeason, vipMaxCover) : 0; // order value the card settles
  const vipDebit = round2(vipCover * (1 - disc)); // charged to the balance
  const vipSaved = round2(vipCover - vipDebit); // the 20% the guest didn't pay
  const cashDue = round2(afterSeason - vipCover); // paid via Stripe at full price
  const passApplied = seasonCovered > 0 || vipCover > 0;

  // Settle the order: debit VIP credit (if any), then land on the confirmation.
  const finish = () => {
    if (vipDebit > 0) spendVipCredit(vipDebit);
    setPhase("done");
  };
  const removeItem = (it: CartItem) => { removeFromCart(it.kind, it.id); toast(`${t("Removed")} ${it.label}.`, { action: { label: t("Undo"), onClick: () => addToCart(it) } }); };
  const emptyBasket = () => {
    const snapshot = [...cart];
    clearCart();
    toast(t("Basket emptied."), { action: { label: t("Undo"), onClick: () => snapshot.forEach(addToCart) } });
  };

  if (cart.length === 0 && phase === "cart") {
    return (
      <div className="animate-fade-up max-w-xl">
        <Card className="p-6">
          <EmptyState
            icon={Icon.card}
            title={t("Your cart is empty")}
            body={t("Plan a visit to add sunbeds, tickets or extras, then check out here.")}
            action={<Btn variant="teal" icon={Icon.sparkles} onClick={() => go("customer", "plan")}>{t("Plan my visit")}</Btn>}
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
          <div className="mt-4 text-sm text-slate-500">{t("Redirecting to")} {TENANT.name}{t("'s secure Stripe Checkout…")}</div>
          <div className="mt-5 mx-auto w-10 h-10 rounded-full border-2 border-slate-200 border-t-[#635bff] animate-spin" />
          <div className="mt-5 text-[12px] text-slate-600 flex items-center justify-center gap-1.5"><Icon.lock size={12} /> {t("Secure payment on")} {TENANT.name}{t("'s account · powered by Stripe")}</div>
          <Btn variant="indigo" full size="lg" className="mt-5" onClick={finish}>{t("Simulate successful payment")}</Btn>
        </Card>
      </div>
    );
  }

  if (phase === "done") return <Confirmation inline />;

  return (
    <div className="animate-fade-up grid lg:grid-cols-[1fr_360px] gap-5">
      <div>
        <PageHead title={t("Checkout")} sub={t("Review your order, then pay via Stripe (hosted, tenant-branded).")} badge={<Badge tone="mvp">{t("MVP")}</Badge>} />
        <Card className="p-2">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
            <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.card size={16} /> {t("Your basket")} · {cart.length} {cart.length === 1 ? t("item") : t("items")}</div>
            <button onClick={emptyBasket} className="text-[11.5px] font-semibold text-slate-500 hover:text-rose-600 inline-flex items-center gap-1"><Icon.trash size={13} /> {t("Empty basket")}</button>
          </div>
          {/* Swipe a row left (or tap the trash) to remove it. */}
          <div className="divide-y divide-slate-100">
            {cart.map((it) => (
              <SwipeRow key={it.kind + it.id} onDelete={() => removeItem(it)} rounded="">
                <div className="flex items-center justify-between px-3 py-3 bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-slate-100 grid place-items-center text-slate-500 shrink-0">{kindIcon(it.kind)}</span>
                    <div className="min-w-0"><div className="font-semibold text-sm text-navy-900 truncate">{it.label}</div><div className="text-[12px] text-slate-600 truncate">{it.sub}</div></div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0"><span className="font-semibold tnum">€{it.price}</span><button aria-label={`${t("Remove")} ${it.label}`} onClick={() => removeItem(it)} className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Icon.trash size={16} /></button></div>
                </div>
              </SwipeRow>
            ))}
          </div>
        </Card>
        <div className="mt-3 text-[12px] text-slate-600 flex items-center gap-1.5"><Icon.shield size={13} /> {t("On success: booking confirmed via webhook, QR e-mailed, and an ΑΠΥ auto-issued to MyDATA.")}</div>
      </div>

      <div className="lg:sticky lg:top-4 h-max">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><TenantLogo size={30} /><div className="text-sm font-semibold text-navy-900">{TENANT.name}</div></div>
          {/* Customer-facing summary: subtotal, any pass deductions, then what's due now. */}
          <Row l={t("Subtotal")} v={`€${total.toFixed(2)}`} />
          {seasonCovered > 0 && <Row l={`${t("Season pass")} · ${t("1 entry")}`} v={`−€${seasonCovered.toFixed(2)}`} discount />}
          {vipCover > 0 && <Row l={t("Paid with VIP credit")} v={`−€${vipCover.toFixed(2)}`} discount />}
          <div className="h-px bg-slate-100 my-2" />
          <Row l={passApplied ? t("Pay now") : t("Total")} v={`€${cashDue.toFixed(2)}`} bold />
          <div className="text-[11px] text-slate-500 mt-1">{t("VAT included where applicable.")}</div>
          {vipCover > 0 && (
            <div className="mt-2 rounded-xl bg-slaice-50 ring-1 ring-slaice-600/15 px-3 py-2 text-[11.5px] text-slaice-700 leading-snug">
              <Icon.sparkles size={12} className="inline align-[-1px] mr-1" />{t("VIP credit used")} €{vipDebit.toFixed(2)} · {t("you saved")} €{vipSaved.toFixed(2)} ({Math.round(disc * 100)}%). {t("Balance")} €{vipBalance.toFixed(2)} → €{round2(vipBalance - vipDebit).toFixed(2)}.
            </div>
          )}

          {/* Apply a held pass. */}
          {(hasVip || hasSeason) && (
            <div className="mt-3 rounded-xl ring-1 ring-slate-200 bg-white/70 p-3 space-y-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><Icon.wallet size={12} /> {t("Use a pass")}</div>
              {hasVip && (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-navy-900 flex items-center gap-1.5"><Icon.sparkles size={13} className="text-slaice-600" /> {t("VIP credit")}</div>
                    <div className="text-[11px] text-slate-500 tnum">{t("Balance")} €{vipBalance.toFixed(2)} · {Math.round(disc * 100)}% {t("off")}</div>
                  </div>
                  <Toggle on={applyVip} onChange={setApplyVip} />
                </div>
              )}
              {hasSeason && (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-navy-900 flex items-center gap-1.5"><Icon.ticket size={13} className="text-teal-600" /> {t("Season pass")}</div>
                    <div className="text-[11px] text-slate-500">{entryTotal > 0 ? `${t("Covers 1 entry")} · ${passes.season?.validUntil ?? ""}` : t("No entry tickets in this order")}</div>
                  </div>
                  <Toggle on={applySeason} onChange={setApplySeason} />
                </div>
              )}
            </div>
          )}

          {/* Demo-only: reveal the marketplace split. Never shown to a real buyer. */}
          {showEconomics && (
            <div className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 animate-fade-in">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1"><Icon.layers size={11} /> Platform economics · demo</div>
              <Row l="Stripe processing (~1.5%)" v={`€${stripeFee.toFixed(2)}`} muted />
              <Row l="Slaice commission (5%)" v={`€${fee.toFixed(2)}`} muted />
              <div className="text-[11px] text-slate-600 mt-1.5 pt-1.5 border-t border-slate-200">Tenant receives €{(total - stripeFee - fee).toFixed(2)} · Slaice receives €{fee.toFixed(2)} (Stripe Connect direct charge + application fee).</div>
            </div>
          )}

          <Btn variant="indigo" full size="lg" className="mt-4" icon={cashDue > 0 ? Icon.stripe : Icon.check} onClick={() => (cashDue > 0 ? setPhase("redirect") : finish())}>
            {cashDue > 0 ? `${t("Pay")} €${cashDue.toFixed(2)}` : t("Confirm · paid with pass")}
          </Btn>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500"><Icon.lock size={12} /> {cashDue > 0 ? t("Secured by Stripe · we never store card details") : t("Settled from your pass · no card charged")}</div>
          <div className="mt-2 flex items-center justify-center gap-1.5 opacity-90">
            {["VISA", "MC", "AMEX", "APPLE"].map((b) => (
              <span key={b} className="text-[9px] font-bold tracking-wide text-slate-500 bg-slate-100 rounded px-1.5 py-1 ring-1 ring-slate-200">{b}</span>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-snug">
            <Icon.shield size={13} className="shrink-0 mt-0.5 text-teal-600" />
            <span>{t("Free cancellation up to 24h before your visit.")} <button onClick={() => toast(t("Demo — cancellation & refund policy."))} className="underline hover:text-navy-900">{t("Refund policy")}</button> · <button onClick={() => toast(t("Demo — terms of service."))} className="underline hover:text-navy-900">{t("Terms")}</button></span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button onClick={() => go("customer", "plan")} className="text-[12px] text-slate-600 hover:text-navy-900">← {t("Back to planning")}</button>
            <button onClick={emptyBasket} className="text-[12px] font-semibold text-slate-500 hover:text-rose-600 inline-flex items-center gap-1"><Icon.trash size={13} /> {t("Empty basket")}</button>
          </div>
          <div className="mt-2 text-center">
            <button onClick={() => setShowEconomics((s) => !s)} className="text-[11px] text-slate-400 hover:text-slate-600 inline-flex items-center gap-1" title={t("Demo affordance — not shown to real customers")}><Icon.layers size={11} /> {showEconomics ? t("Hide") : t("Show")} {t("platform economics")}</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ l, v, bold, muted, discount }: { l?: ReactNode; v?: ReactNode; bold?: boolean; muted?: boolean; discount?: boolean }) {
  return <div className={`flex items-center justify-between text-sm py-0.5 ${bold ? "font-bold text-navy-900 text-base" : discount ? "text-teal-700 font-medium" : muted ? "text-slate-600" : "text-slate-600"}`}><span>{l}</span><span className="tnum">{v}</span></div>;
}

function kindIcon(kind: string) {
  const m: Record<string, IconRenderer> = { sunbed: Icon.umbrella, ticket: Icon.ticket, locker: Icon.lock, parking: Icon.car };
  const I = m[kind] || Icon.card;
  return <I size={17} />;
}

export function Confirmation({ inline }: { inline?: boolean }) {
  const { cart, clearCart, go, toast } = useApp();
  const t = useT();
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
        <h2 className="mt-4 font-display font-bold text-2xl text-navy-900">{t("Payment successful")}</h2>
        <p className="text-sm text-slate-500 mt-1">{t("Your booking is confirmed. The QR below has been e-mailed to you, and a MyDATA receipt (ΑΠΥ) was issued.")}</p>

        <div className="my-5 grid place-items-center"><QR size={180} seed={ref} /></div>
        <div className="font-mono text-sm text-navy-900 font-semibold">#{ref}</div>

        {/* Add to Apple / Google Wallet */}
        <WalletButtons pass={pass} className="mt-6 pt-5 border-t border-slate-100" />

        <div className="mt-6 grid sm:grid-cols-3 gap-2 text-[12px]">
          <Pill icon={Icon.checkCircle} t={t("Stripe paid")} />
          <Pill icon={Icon.mail} t={t("QR e-mailed")} />
          <Pill icon={Icon.receipt} t={t("ΑΠΥ → MyDATA ✓")} />
        </div>

        <div className="mt-6 flex gap-2 justify-center flex-wrap">
          <Btn variant="teal" icon={Icon.grid} onClick={() => { clearCart(); go("customer", "mybookings"); }}>{t("View my bookings")}</Btn>
          <Btn variant="outline" icon={Icon.calendar} onClick={() => {
            const start = todayISO();
            const end = toISO(new Date(Date.now() + 86400000));
            downloadICS(`beach-day-${ref}.ics`, {
              uid: `${ref}@slaice`, title: `Beach day · ${pass.zone}`, start, end,
              location: `${TENANT.name}, ${TENANT.place}`,
              description: `Booking ${ref} · ${pass.seat !== "—" ? "Sunbeds " + pass.seat : "Entry"} · ${pass.total}. Show your QR at the gate.`,
            });
            toast(t("Calendar invite downloaded (.ics)."), { tone: "success" });
          }}>{t("Add to calendar")}</Btn>
          <Btn variant="outline" icon={Icon.receipt} onClick={() => { clearCart(); go("customer", "mydocs"); }}>{t("View receipt")}</Btn>
        </div>
      </Card>
      <div className="text-center mt-3 text-[11px] text-slate-600 flex items-center justify-center gap-1.5">powered by <SlaiceLogo size={18} withText /></div>
    </Wrapper>
  );
}

function Pill({ icon: IconC, t }: { icon: IconRenderer; t?: ReactNode }) {
  return <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15 py-1.5 font-semibold"><IconC size={14} /> {t}</div>;
}
