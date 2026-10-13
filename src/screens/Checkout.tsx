import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import { AgeCheck } from "../components/AgeCheck";
import { QuickSignIn } from "../components/QuickSignIn";
import type { IconRenderer } from "../lib/icons";
import { gsap, motionOK, takeFlip, Flip, EASE, burstConfetti } from "../lib/fx";
import { Card, Btn, EmptyState, SwipeRow, Toggle } from "../components/ui";
import { QR } from "../components/charts";
import { TenantLogo } from "../components/Brand";
import { AppleLogo, WalletButtons } from "../components/WalletPass";
import { TENANT, ZONES, todayISO } from "../data/beach";
import { round2 } from "../data/passes";
import { useApp, useT } from "../app/store";
import type { CartItem } from "../domain/types";
import { SLAICE_FEE_RATE, STRIPE_FEE_RATE } from "../domain/pricing";
import { PROFILE, cartKey, serviceFees, type PlacedBooking } from "../domain/account";
import { ARRIVAL_WINDOW, cancelLine, placedVisits, usual } from "../domain/visits";
import { fmtDay, fmtWeekday } from "../domain/period";
import { FullscreenQR, downloadVisitIcs, shareVisit } from "./customer/VisitTicket";
import { useVisits, guestNow } from "../lib/useVisits";
import { useFinance } from "../lib/useFinance";
import { useExtras } from "../lib/useExtras";
import { bestReward, usableRewards } from "../domain/rewards";
import { activeRewards } from "./customer/CustomerHome";

// Online booking refs follow the account's bookings (BK-30001, BK-30002…) so they
// never collide with sample or staff bookings, and survive a reload (AENR-597).
const bookingRefFor = (n: number) => `BK-${30001 + n}`;
/** The operator behind the beach — shown at checkout (AENR-574). */
export const OPERATOR = { legal: "Akti tou Iliou AE", vat: "EL123456789", address: "Leof. Poseidonos 1, 174 55 Alimos", phone: "+30 210 980 0000", email: "help@aktitouiliou.gr" };

export function Checkout() {
  const { cart, removeFromCart, addToCart, clearCart, go, toast, passes, spendVipCredit, passPricing, account, setAccount, loyalty } = useApp();
  const t = useT();
  const mine = usual(useVisits().visits);
  const [finance] = useFinance();
  const ex = useExtras();
  const [phase, setPhase] = useState<"cart" | "signin" | "redirect" | "done">("cart");
  const [adult, setAdult] = useState(false);
  const [ageTried, setAgeTried] = useState(false);
  const [placed, setPlaced] = useState<PlacedBooking | null>(null);
  // The buyer never needs the marketplace split — it's hidden by default and
  // revealed only via an explicit demo toggle.
  const [showEconomics, setShowEconomics] = useState(false);
  // Service fees from the tenant's customer fee lines (AENR-521 / 532), per item and in total.
  const goods = round2(cart.reduce((a, b) => a + b.price, 0));
  const sf = serviceFees(cart, finance.fees, todayISO());
  const total = round2(goods + sf.total);
  // The best reward the guest has earned comes off by itself (AENR-619) — removable, nothing to claim.
  const best = bestReward(usableRewards(activeRewards(loyalty), account.rewardsUsed ?? []), cart);
  const [skipReward, setSkipReward] = useState(false);
  const rewardOff = best && !skipReward ? Math.min(best.amount, total) : 0;
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
  const seasonCovered = hasSeason && applySeason && entryTotal > 0 ? Math.min(ex.ticketPrice("adult", todayISO()), entryTotal) : 0;
  const afterSeason = round2(Math.max(0, total - rewardOff - seasonCovered));
  const vipBalance = passes.vip?.balance ?? 0;
  // €B of credit, at a `disc` discount, settles B/(1−disc) of the order.
  const vipMaxCover = round2(vipBalance / (1 - disc));
  const vipCover = hasVip && applyVip ? Math.min(afterSeason, vipMaxCover) : 0; // order value the card settles
  const vipDebit = round2(vipCover * (1 - disc)); // charged to the balance
  const vipSaved = round2(vipCover - vipDebit); // the 20% the guest didn't pay
  const afterPasses = round2(afterSeason - vipCover);
  // Beach credit (refunds as credit, released days) is used first, automatically (AENR-577/578).
  const creditUsed = round2(Math.min(account.credit.balance, afterPasses));
  const fullDue = round2(afterPasses - creditUsed); // paid via Stripe at full price
  // Pay in full, or a deposit now and the rest on site (AENR-574).
  const policy = ex.extras.policy;
  const [plan, setPlan] = useState<"full" | "deposit">("full");
  const depositAmt = round2((fullDue * policy.depositPct) / 100);
  const cashDue = plan === "deposit" && policy.depositPct > 0 ? depositAmt : fullDue;
  const onSite = round2(fullDue - cashDue);
  const passApplied = rewardOff > 0 || seasonCovered > 0 || vipCover > 0 || creditUsed > 0;
  // The exact free-cancellation line for the earliest day in the basket (AENR-569).
  const firstDay = cart.map((i) => i.date).filter(Boolean).sort()[0] ?? todayISO();
  const cancelBy = t(cancelLine(firstDay, guestNow(), policy));

  // Settle the order: debit VIP credit (if any), save the booking (and the card
  // if asked), clear the basket and land on the confirmation.
  const finish = (card?: { save: boolean; last4: string } | null, method: "card" | "apple" | "google" = "card") => {
    if (vipDebit > 0) spendVipCredit(vipDebit);
    const booking: PlacedBooking = { ref: bookingRefFor(account.bookings.length), at: new Date().toISOString(), items: [...cart], fees: sf.lines, total: fullDue, guest: PROFILE, method, deposit: onSite > 0 ? cashDue : undefined,
      card: method === "apple" ? "Apple Pay" : method === "google" ? "Google Pay" : card ? `Visa ···· ${card.last4}` : undefined };
    setAccount((a) => ({
      ...a,
      bookings: [booking, ...a.bookings],
      adultConfirmed: true,
      savedCard: card?.save ? { brand: "Visa", last4: card.last4, exp: "12/28" } : a.savedCard,
      rewardsUsed: rewardOff > 0 && best && !best.reward.reusable ? [...(a.rewardsUsed ?? []), best.reward.id] : a.rewardsUsed ?? [],
      credit: creditUsed > 0 ? { balance: round2(a.credit.balance - creditUsed), log: [{ at: guestNow(), text: `Used at checkout · ${booking.ref}`, amount: -creditUsed }, ...a.credit.log] } : a.credit,
    }));
    setPlaced(booking);
    clearCart();
    setPhase("done");
  };
  // Guests browsing without an account sign in first; the basket stays as it is.
  // The 18+ confirmation is asked once, at the first booking (AENR-622) — not at sign-in.
  const needAge = () => { if (account.adultConfirmed || adult) return false; setAgeTried(true); return true; };
  const pay = () => {
    if (account.guest) return setPhase("signin");
    if (needAge()) return;
    if (cashDue > 0) setPhase("redirect");
    else finish(null);
  };
  // Apple Pay / Google Pay (simulated sheet): confirm with Face ID / fingerprint, then done.
  const [wallet, setWallet] = useState<"apple" | "google" | null>(null);
  const walletPay = (w: "apple" | "google") => {
    if (account.guest) return setPhase("signin");
    if (needAge()) return;
    setWallet(w);
    window.setTimeout(() => { setWallet(null); finish(null, w); }, 1300);
  };
  // Arriving from the wizard: its glass menu hands over its rect and the
  // summary panel morphs out of it while the basket rows stagger in — checkout
  // reads as the journey's last scene, not a different app. Direct visits
  // (cart icon, deep link) find no stash and keep the plain fade-up.
  useLayoutEffect(() => {
    const state = takeFlip("checkout-panel");
    if (!state) return;
    const ctx = gsap.context(() => {
      Flip.from(state, { targets: '[data-flip-id="checkout-panel"]', scale: true, duration: 0.8, ease: EASE.inOut });
      gsap.from("[data-cart-row]", { y: 16, opacity: 0, stagger: 0.06, duration: 0.5, ease: EASE.out, delay: 0.15 });
    });
    return () => ctx.revert();
  }, []);

  const removeItem = (it: CartItem) => { removeFromCart(it.kind, it.id); toast(`${t("Removed")} ${it.label}.`, { action: { label: t("Undo"), onClick: () => addToCart(it) } }); };
  const emptyBasket = () => {
    const snapshot = [...cart];
    clearCart();
    toast(t("Basket emptied."), { action: { label: t("Undo"), onClick: () => snapshot.forEach(addToCart) } });
  };

  if (cart.length === 0 && phase !== "done") {
    return (
      <div className="animate-fade-up max-w-xl mx-auto min-h-[50dvh] grid place-items-center">
        <Card surface="raised" className="p-6 w-full">
          <EmptyState
            icon={Icon.card}
            title={t("Your basket is empty")}
            body={mine ? `${t("Your usual is")} ${mine.zone} · ${mine.sets} ${mine.sets === 1 ? t("sunbed") : t("sunbeds")}. ${t("Book it again in a few taps.")}` : t("Plan a visit to add sunbeds, tickets or extras, then check out here.")}
            action={<Btn variant="teal" icon={Icon.sparkles} onClick={() => go("customer", "plan")}>{mine ? t("Rebook your usual") : t("Plan a visit")}</Btn>}
          />
        </Card>
      </div>
    );
  }

  if (phase === "signin") {
    const signIn = (how: string) => {
      setAccount((a) => ({ ...a, guest: false }));
      toast(`${t("Signed in")} (${how}) — ${t("your basket is right where you left it.")}`, { tone: "success" });
      setPhase("cart");
    };
    return (
      <div className="animate-fade-in grid place-items-center min-h-[60dvh]">
        <Card className="p-8 max-w-md w-full">
          <div className="w-12 h-12 rounded-xl bg-teal-600 text-white grid place-items-center"><Icon.lock size={22} /></div>
          <h2 className="mt-3 font-display font-bold text-xl text-navy-900">{t("Sign in to finish your booking")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("Your basket is saved —")} {cart.length} {cart.length === 1 ? t("item") : t("items")} · €{total.toFixed(2)}. {t("We need an account to send your QR and receipt.")}</p>
          <div className="mt-5 grid gap-2">
            <QuickSignIn onSignedIn={(how) => signIn(how === "passkey" ? t("passkey") : how)} />
            <Btn variant="ghost" full icon={Icon.mail} onClick={() => signIn(t("e-mail link"))}>{t("Use e-mail instead")}</Btn>
          </div>
          <button type="button" onClick={() => setPhase("cart")} className="mt-4 text-[12px] text-slate-600 hover:text-navy-900">← {t("Back to the basket")}</button>
        </Card>
      </div>
    );
  }

  if (phase === "redirect") return <StripeStep amount={cashDue} saved={account.savedCard} onBack={() => setPhase("cart")} onPaid={finish} />;

  if (phase === "done") return <Confirmation inline booking={placed} />;

  return (
    <div className="animate-fade-up grid lg:grid-cols-[1fr_360px] gap-5">
      <div>
        <h1 className="sr-only">{t("Checkout")}</h1>
        <Card className="p-2">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
            <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.card size={16} /> {t("Your basket")} · {cart.length} {cart.length === 1 ? t("item") : t("items")}</div>
            <button onClick={emptyBasket} className="text-[11.5px] font-semibold text-slate-500 hover:text-rose-600 inline-flex items-center gap-1"><Icon.trash size={13} /> {t("Empty basket")}</button>
          </div>
          {/* Swipe a row left (or tap the trash) to remove it. */}
          <div className="divide-y divide-slate-100">
            {cart.map((it) => (
              <div key={it.kind + it.id} data-cart-row>
              <SwipeRow onDelete={() => removeItem(it)} rounded="">
                <div className="flex items-center justify-between px-3 py-3 bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-slate-100 grid place-items-center text-slate-500 shrink-0">{kindIcon(it.kind)}</span>
                    <div className="min-w-0"><div className="font-semibold text-sm text-navy-900 truncate">{it.label}</div><div className="text-[12px] text-slate-600 truncate">{it.sub}</div></div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0"><span className="text-right"><span className="block font-semibold tnum">€{it.price}</span>{sf.perItem[cartKey(it)] ? <span className="block text-[11px] text-slate-500 tnum">+€{sf.perItem[cartKey(it)].toFixed(2)} {t("fee")}</span> : null}</span><button aria-label={`${t("Remove")} ${it.label}`} onClick={() => removeItem(it)} className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Icon.trash size={16} /></button></div>
                </div>
              </SwipeRow>
              </div>
            ))}
          </div>
        </Card>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg glass-card-solid px-2.5 py-1 text-[12px] text-slate-700"><Icon.shield size={13} /> {t("Your ticket and receipt arrive by e-mail the moment you pay.")}</div>
      </div>

      <div className="lg:sticky lg:top-4 h-max" data-flip-id="checkout-panel">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><TenantLogo size={30} /><div className="text-sm font-semibold text-navy-900">{TENANT.name}</div></div>
          {/* Customer-facing summary: subtotal, any pass deductions, then what's due now. */}
          <Row l={t("Subtotal")} v={`€${goods.toFixed(2)}`} />
          {sf.lines.map((f) => <Row key={f.label} l={t(f.label)} v={`€${f.amount.toFixed(2)}`} />)}
          {best && (rewardOff > 0 ? (
            <div className="flex items-center justify-between gap-2 text-sm py-0.5 text-teal-700 font-medium">
              <span className="min-w-0"><Icon.gift size={13} className="inline align-[-2px] mr-1" />{t(best.reward.title)} · {best.reward.reward} <button type="button" aria-label={t("Remove reward")} onClick={() => setSkipReward(true)} className="ml-1 text-[12px] font-semibold text-slate-500 underline-offset-2 hover:underline hover:text-navy-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{t("Remove")}</button></span>
              <span className="tnum shrink-0">−€{rewardOff.toFixed(2)}</span>
            </div>
          ) : (
            <button type="button" onClick={() => setSkipReward(false)} className="block text-left text-[12.5px] font-semibold text-teal-700 hover:underline py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              <Icon.gift size={13} className="inline align-[-2px] mr-1" />{t("Use your reward")} · {best.reward.reward} (−€{Math.min(best.amount, total).toFixed(2)})
            </button>
          ))}
          {seasonCovered > 0 && <Row l={`${t("Season pass")} · ${t("1 entry")}`} v={`−€${seasonCovered.toFixed(2)}`} discount />}
          {vipCover > 0 && <Row l={t("Paid with VIP credit")} v={`−€${vipCover.toFixed(2)}`} discount />}
          {creditUsed > 0 && <Row l={t("Beach credit")} v={`−€${creditUsed.toFixed(2)}`} discount />}
          <div className="h-px bg-slate-100 my-2" />
          <Row l={passApplied ? t("To pay") : t("Total")} v={`€${fullDue.toFixed(2)}`} bold />
          <div className="text-[11px] text-slate-500 mt-1">{t("All-in: VAT and fees included.")}</div>
          {policy.depositPct > 0 && fullDue > 0 && (
            <fieldset className="mt-3 space-y-1.5">
              <legend className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{t("How to pay")}</legend>
              {(["full", "deposit"] as const).map((k) => (
                <label key={k} className={`flex items-center gap-2.5 rounded-xl ring-1 px-3 min-h-[48px] cursor-pointer text-[13.5px] ${plan === k ? "ring-navy-900 bg-slate-50" : "ring-slate-200"}`}>
                  <input type="radio" name="pay-plan" className="accent-teal-600 w-4 h-4" checked={plan === k} onChange={() => setPlan(k)} />
                  <span className="flex-1">{k === "full" ? t("Pay in full now") : `${t("Pay a")} ${policy.depositPct}% ${t("deposit now")}`}</span>
                  <span className="tnum font-semibold text-navy-900">€{(k === "full" ? fullDue : depositAmt).toFixed(2)}</span>
                </label>
              ))}
              {plan === "deposit" && <div className="text-[12px] text-slate-600 px-1">{t("Now")} <b className="text-navy-900">€{cashDue.toFixed(2)}</b> · {t("on site")} <b className="text-navy-900">€{onSite.toFixed(2)}</b> {t("(cash or card at the gate)")}</div>}
            </fieldset>
          )}
          {vipCover > 0 && (
            <div className="mt-2 rounded-xl bg-sky-50 ring-1 ring-sky-600/15 px-3 py-2 text-[11.5px] text-sky-800 leading-snug">
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
                    <div className="text-[13px] font-semibold text-navy-900 flex items-center gap-1.5"><Icon.sparkles size={13} className="text-sky-700" /> {t("VIP credit")}</div>
                    <div className="text-[11px] text-slate-500 tnum">{t("Balance")} €{vipBalance.toFixed(2)} · {Math.round(disc * 100)}% {t("off")}</div>
                  </div>
                  <Toggle on={applyVip} onChange={setApplyVip} ariaLabel={t("VIP credit")} />
                </div>
              )}
              {hasSeason && (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-navy-900 flex items-center gap-1.5"><Icon.ticket size={13} className="text-teal-600" /> {t("Season pass")}</div>
                    <div className="text-[11px] text-slate-500">{entryTotal > 0 ? `${t("Covers 1 entry")} · ${passes.season?.validUntil ?? ""}` : t("No entry tickets in this order")}</div>
                  </div>
                  <Toggle on={applySeason} onChange={setApplySeason} ariaLabel={t("Season pass")} />
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

          {!account.adultConfirmed && <div className="mt-4"><AgeCheck checked={adult} onChange={(v) => { setAdult(v); if (v) setAgeTried(false); }} invalid={ageTried && !adult} /></div>}
          {cashDue > 0 ? (
            <div className="mt-4 space-y-2">
              <button type="button" onClick={() => walletPay("apple")} disabled={!!wallet} className="w-full min-h-[48px] rounded-[14px] bg-black text-white font-semibold text-[15px] inline-flex items-center justify-center gap-1.5 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-70" aria-label={`${t("Pay with Apple Pay")} €${cashDue.toFixed(2)}`}>
                {wallet === "apple" ? t("Confirming…") : <><AppleLogo size={17} /> Pay</>}
              </button>
              <button type="button" onClick={() => walletPay("google")} disabled={!!wallet} className="w-full min-h-[48px] rounded-[14px] bg-white ring-1 ring-slate-300 text-navy-900 font-semibold text-[15px] inline-flex items-center justify-center gap-1.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-70" aria-label={`${t("Pay with Google Pay")} €${cashDue.toFixed(2)}`}>
                {wallet === "google" ? t("Confirming…") : <><b className="text-[#4285F4]">G</b> Pay</>}
              </button>
              <div className="flex items-center gap-2 text-[11px] text-slate-500"><span className="h-px flex-1 bg-slate-200" />{t("or")}<span className="h-px flex-1 bg-slate-200" /></div>
              <Btn variant="indigo" full size="lg" icon={Icon.card} onClick={pay}>{`${t("Pay by card")} · €${cashDue.toFixed(2)}`}</Btn>
            </div>
          ) : (
            <Btn variant="indigo" full size="lg" className="mt-4" icon={Icon.check} onClick={pay}>{t("Confirm · nothing to pay")}</Btn>
          )}

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500"><Icon.lock size={12} /> {cashDue > 0 ? t("Secured by Stripe · we never store card details") : t("Settled from your pass · no card charged")}</div>
          <div className="mt-2 flex items-center justify-center gap-1.5 opacity-90">
            {["VISA", "MC", "AMEX", "APPLE"].map((b) => (
              <span key={b} className="text-[9px] font-bold tracking-wide text-slate-500 bg-slate-100 rounded px-1.5 py-1 ring-1 ring-slate-200">{b}</span>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-snug">
            <Icon.shield size={13} className="shrink-0 mt-0.5 text-teal-600" />
            <span><b className="text-navy-900">{cancelBy}</b>{cancelBy.startsWith(t("Free")) ? ` — ${policy.refundPct}% ${t("back, from My bookings in two taps.")}` : "."} <button onClick={() => toast(t("Demo — terms of service."))} className="underline hover:text-navy-900">{t("Terms")}</button></span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 leading-snug">
            {OPERATOR.legal} · {t("VAT")} {OPERATOR.vat} · {OPERATOR.address}<br />
            {t("Help")}: <a className="underline hover:text-navy-900" href={`tel:${OPERATOR.phone.replace(/\s/g, "")}`}>{OPERATOR.phone}</a> · <a className="underline hover:text-navy-900" href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
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

/* The tenant's Stripe Checkout (simulated): saved card or a new one, with
   "save card for faster checkout"; Pay → processing → back to Slaice. */
function StripeStep({ amount, saved, onBack, onPaid }: { amount: number; saved: { brand: string; last4: string; exp: string } | null; onBack: () => void; onPaid: (card: { save: boolean; last4: string }) => void }) {
  const t = useT();
  const [useSaved, setUseSaved] = useState(!!saved);
  const [num, setNum] = useState("4242 4242 4242 4242");
  const [exp, setExp] = useState("12/28");
  const [cvc, setCvc] = useState("123");
  const [save, setSave] = useState(false);
  const [busy, setBusy] = useState(false);
  const digits = num.replace(/\D/g, "");
  const valid = useSaved || (digits.length >= 15 && /^\d{2}\/\d{2}$/.test(exp) && /^\d{3,4}$/.test(cvc));
  const submit = () => { setBusy(true); window.setTimeout(() => onPaid(useSaved && saved ? { save: false, last4: saved.last4 } : { save, last4: digits.slice(-4) }), 1200); };
  return (
    <div className="animate-fade-in grid place-items-center min-h-[60dvh]">
      <Card className="p-8 max-w-md w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#635bff] font-bold text-lg"><Icon.stripe size={22} /> stripe</div>
          <div className="text-sm font-semibold text-navy-900">{TENANT.name}</div>
        </div>
        <div className="mt-4 text-[12px] text-slate-500">{t("Total")}</div>
        <div className="font-display text-3xl font-bold text-navy-900 tnum">€{amount.toFixed(2)}</div>
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); if (valid && !busy) submit(); }}>
          {saved && (
            <fieldset className="space-y-1.5">
              <legend className="sr-only">{t("Card")}</legend>
              <label className={`flex items-center gap-2 rounded-xl ring-1 px-3 min-h-[48px] cursor-pointer ${useSaved ? "ring-[#635bff] bg-indigo-50/50" : "ring-slate-200"}`}>
                <input type="radio" name="card" className="accent-[#635bff]" checked={useSaved} onChange={() => setUseSaved(true)} /> <Icon.card size={16} /> {t("Pay with")} {saved.brand} ···· {saved.last4} <span className="ml-auto text-[12px] text-slate-500">{saved.exp}</span>
              </label>
              <label className={`flex items-center gap-2 rounded-xl ring-1 px-3 min-h-[48px] cursor-pointer ${!useSaved ? "ring-[#635bff] bg-indigo-50/50" : "ring-slate-200"}`}>
                <input type="radio" name="card" className="accent-[#635bff]" checked={!useSaved} onChange={() => setUseSaved(false)} /> {t("Use another card")}
              </label>
            </fieldset>
          )}
          {!useSaved && (
            <>
              <label className="block text-[12px] font-semibold text-slate-700">{t("Card number")}<input inputMode="numeric" autoComplete="cc-number" value={num} onChange={(e) => setNum(e.target.value)} className="mt-1 block w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-[15px] font-mono" /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[12px] font-semibold text-slate-700">{t("Expiry")}<input autoComplete="cc-exp" value={exp} onChange={(e) => setExp(e.target.value)} className="mt-1 block w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-[15px] font-mono" /></label>
                <label className="block text-[12px] font-semibold text-slate-700">CVC<input inputMode="numeric" autoComplete="cc-csc" value={cvc} onChange={(e) => setCvc(e.target.value)} className="mt-1 block w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-[15px] font-mono" /></label>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-slate-700 min-h-[40px]"><input type="checkbox" className="accent-[#635bff] w-4 h-4" checked={save} onChange={(e) => setSave(e.target.checked)} /> {t("Save card for faster checkout")}</label>
            </>
          )}
          <Btn type="submit" variant="indigo" full size="lg" disabled={!valid} loading={busy}>{busy ? t("Processing…") : `${t("Pay")} €${amount.toFixed(2)}`}</Btn>
        </form>
        <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5"><Icon.lock size={12} /> {t("Demo — no real card is charged. Saved cards are stored by Stripe as a token; Slaice only keeps the last 4 digits.")}</div>
        <button type="button" onClick={onBack} disabled={busy} className="mt-3 text-[12px] text-slate-600 hover:text-navy-900">← {t("Back to the basket")}</button>
      </Card>
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

export function Confirmation({ inline, booking: given }: { inline?: boolean; booking?: PlacedBooking | null }) {
  const { clearCart, go, toast, extras, account } = useApp();
  // Opened directly (#/customer/confirm): the guest's latest booking.
  const booking = given ?? account.bookings[0] ?? null;
  const t = useT();
  const [ref] = useState(() => booking?.ref ?? "BK-30000");
  const [full, setFull] = useState(false);
  const scope = useRef<HTMLDivElement>(null);
  // The booking's first day as a visit — one ticket per beach day (AENR-571).
  const visit = booking ? placedVisits([booking], (id) => ZONES.find((z) => z.id === id)?.name ?? "")[0] : undefined;

  // Celebration: the check springs in and throws confetti, the ticket flips up
  // in 3D, then the actions stagger in. Elements render in their final state —
  // under reduced motion none of this runs.
  useLayoutEffect(() => {
    if (!motionOK()) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: EASE.out } })
        .from("[data-confirm-check]", { scale: 0, rotation: -100, duration: 0.7, ease: EASE.pop })
        .add(() => {
          const el = scope.current?.querySelector<HTMLElement>("[data-confirm-check]");
          if (el) burstConfetti(el);
        }, "-=0.25")
        .from("[data-confirm-head]", { y: 14, opacity: 0, duration: 0.45 }, "-=0.4")
        .fromTo("[data-confirm-qr]",
          { transformPerspective: 900, rotationY: 95, opacity: 0 },
          { rotationY: 0, opacity: 1, duration: 0.85, clearProps: "transform" }, "-=0.2")
        .from("[data-confirm-item]", { y: 14, opacity: 0, stagger: 0.08, duration: 0.45 }, "-=0.45");
    }, scope);
    return () => ctx.revert();
  }, []);
  const date = visit?.date ?? todayISO();
  const caption = `${fmtWeekday(date)} ${fmtDay(date)}${visit?.sets.length ? ` · ${visit.sets.join(", ")}` : ""}`;
  const pass = {
    ref,
    holder: booking ? `${booking.guest.first} ${booking.guest.last[0]}.` : "Elena M.",
    zone: visit?.zone || "Akti tou Iliou",
    date: fmtDay(date),
    seat: visit?.sets.join(", ") || "—",
    guests: Math.max(1, (visit?.sets.length ?? 1) * 2),
    total: `€${booking?.total ?? 0}`,
    // Remembered as "In Wallet" on My bookings and Home too (AENR-620).
    visitKey: visit?.key,
  };
  const onSite = booking?.deposit != null ? round2(booking.total - booking.deposit) : 0;
  return (
    <div ref={scope} className="animate-fade-up max-w-xl mx-auto" data-inline={inline ? "" : undefined}>
      <div className="text-center mb-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-600 text-white grid place-items-center" data-confirm-check><Icon.check size={30} /></div>
        <h1 className="mt-3 font-display font-bold text-2xl text-navy-900 glass-card-solid inline-block rounded-xl px-3 py-1" data-confirm-head>{t("You're booked")}</h1>
      </div>

      {/* The ticket — what the guest shows at the gate */}
      <article aria-label={t("Your beach-day ticket")} className="rounded-[28px] bg-white shadow-lift ring-1 ring-slate-200 overflow-hidden" data-confirm-qr>
        <div className="grad-sea text-white px-6 py-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-100">{TENANT.name}</div>
          <div className="mt-1 font-display font-bold text-[26px] leading-tight">{fmtWeekday(date)} {fmtDay(date)}</div>
          <div className="text-[14px] text-white/90">{visit?.zone ? `${visit.zone} · ` : ""}{visit?.sets.length ? `${t("Sunbeds")} ${visit.sets.join(", ")}` : t("Entry")}</div>
        </div>
        <div className="relative px-6 py-5 text-center">
          <span aria-hidden className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-slate-100" />
          <span aria-hidden className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-slate-100" />
          <button type="button" onClick={() => setFull(true)} className="mx-auto grid place-items-center rounded-2xl p-2 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" aria-label={t("Show the QR full screen")}>
            <QR size={208} seed={ref} />
          </button>
          <div className="mt-1 font-mono text-[15px] font-bold text-navy-900">{ref}</div>
          <div className="text-[12.5px] text-slate-500">{t("Tap the code to show it full screen at the gate.")}</div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-left text-[13px]">
            <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-500 text-[11.5px]">{t("Arrive")}</dt><dd className="font-semibold text-navy-900">{ARRIVAL_WINDOW}</dd></div>
            <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-500 text-[11.5px]">{t("Paid")}</dt><dd className="font-semibold text-navy-900">€{(booking?.deposit ?? booking?.total ?? 0).toFixed(2)}{booking?.card ? ` · ${booking.card}` : ""}</dd></div>
            {onSite > 0 && <div className="rounded-xl bg-amber-50 px-3 py-2 col-span-2"><dt className="text-amber-800 text-[11.5px]">{t("To pay on site")}</dt><dd className="font-semibold text-amber-900">€{onSite.toFixed(2)} · {t("cash or card at the gate")}</dd></div>}
            <div className="rounded-xl bg-slate-50 px-3 py-2 col-span-2"><dt className="text-slate-500 text-[11.5px]">{t("Entrance")}</dt><dd className="font-semibold text-navy-900 flex items-center justify-between gap-2"><span>{t("Main gate")} · {OPERATOR.address}</span>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${TENANT.name} ${TENANT.place}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal-700 hover:underline shrink-0"><Icon.map size={14} /> {t("Map")}<span className="sr-only"> ({t("opens in a new tab")})</span></a></dd></div>
          </dl>
          <p className="mt-3 text-[12px] text-slate-600">{t(cancelLine(date, guestNow(), extras.policy))} · {t("receipt e-mailed")}</p>
        </div>
      </article>

      <div data-confirm-item><WalletButtons pass={pass} className="mt-5" /></div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2" data-confirm-item>
        <Btn variant="outline" icon={Icon.calendar} onClick={() => { if (visit) downloadVisitIcs(visit); toast(t("Calendar invite downloaded (.ics)."), { tone: "success" }); }}>{t("Calendar")}</Btn>
        <Btn variant="outline" icon={Icon.send} onClick={async () => { if (!visit) return; const r = await shareVisit(visit); if (r === "copied") toast(t("Visit details copied — paste them to your friends."), { tone: "success" }); }}>{t("Share")}</Btn>
        <Btn variant="outline" icon={Icon.receipt} onClick={() => { clearCart(); go("customer", "mybookings"); }}>{t("Receipt")}</Btn>
        <Btn variant="teal" icon={Icon.grid} onClick={() => { clearCart(); go("customer", "mybookings"); }}>{t("My bookings")}</Btn>
      </div>
      {full && <FullscreenQR code={ref} caption={caption} onClose={() => setFull(false)} />}
    </div>
  );
}

