import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import { AgeCheck } from "../components/AgeCheck";
import { PaymentProgress } from "../components/PaymentProgress";
import { QuickSignIn } from "../components/QuickSignIn";
import type { IconRenderer } from "../lib/icons";
import { gsap, motionOK, EASE, DUR } from "../lib/fx";
import { takeFlip, Flip } from "../lib/fxFlip";
import { pocketDrag, type PocketDrag } from "../lib/pocketDrag";
import { Card, Btn, EmptyState, NotMvpBadge, SwipeRow, Toggle } from "../components/ui";
import { QR } from "../components/charts";
import { qrCode } from "../domain/entry";
import { TenantLogo } from "../components/Brand";
import { AppleLogo, WalletPocket, WalletSheetFor, deviceWallets } from "../components/WalletPass";
import { ShareSheet } from "./customer/ShareBooking";
import { useEntry } from "../lib/useEntry";
import { OPERATOR, TENANT, ZONES, todayISO } from "../data/beach";
import { round2 } from "../data/passes";
import { useApp, useMoney, useT } from "../app/store";
import type { CartItem } from "../domain/types";
import { PROFILE, allCards, cardBrand, cardKey, cartKey, serviceFees, settleCheckout, withCard, type InvoiceRequest, type PlacedBooking, type SavedCard, type WalletKind } from "../domain/account";
import { emptyInvoice, invoiceAddress, invoiceErrors, normalVatNo, type InvoiceDetails } from "../domain/invoiceDetails";
import { InvoiceFields } from "./customer/InvoiceFields";
import { SERVICE_NOUN, vatRates } from "../domain/economics";
import { ARRIVAL_WINDOW, cancelDeadline, fmtDeadline, placedVisits, usual } from "../domain/visits";
import type { GuestPolicy } from "../domain/visits";
import { fmtDay, fmtWeekday } from "../domain/period";
import { FullscreenQR, downloadVisitIcs } from "./customer/VisitTicket";
import { useVisits, guestNow } from "../lib/useVisits";
import { useSiteTerms } from "../lib/useEconomics";
import { useExtras } from "../lib/useExtras";
import { bestReward, usableRewards } from "../domain/rewards";
import { FIRST_TIME_LOYALTY, activeRewards } from "./customer/CustomerHome";
import { useDemoFlag } from "../lib/useDemoFlag";
import { useTenantFeatures } from "../lib/useFeatures";
import { ActionsMenu } from "../components/ui/ActionsMenu";
import { Decode } from "../components/DecodeText";

// Online booking refs follow the account's bookings (BK-30001, BK-30002…) so they
// never collide with sample or staff bookings, and survive a reload (AENR-597).
const bookingRefFor = (n: number) => `BK-${30001 + n}`;
/** The operator behind the beach — shown at checkout (AENR-574). */

/* `embedded` (AENR-640): the booking wizard's Pay step shows only the summary and the
   payment buttons, and a paid booking goes straight to the confirmation. */
export function Checkout({ embedded = false }: { embedded?: boolean } = {}) {
  const money = useMoney();
  const { cart, removeFromCart, addToCart, clearCart, go, toast, passes, spendVipCredit, passPricing, account, setAccount, loyalty } = useApp();
  const t = useT();
  const mine = usual(useVisits().visits);
  // The beach's commercial terms (AENR-725): the guest sees the service fee and the VAT rate — never the commission.
  const terms = useSiteTerms();
  const ex = useExtras();
  const [phase, setPhase] = useState<"cart" | "signin" | "redirect" | "done">("cart");
  const [adult, setAdult] = useState(false);
  const [ageTried, setAgeTried] = useState(false);
  const [placed, setPlaced] = useState<PlacedBooking | null>(null);
  // The service fee per set / entry ticket from the tenant's commercial terms (AENR-725), per item and in total.
  const goods = round2(cart.reduce((a, b) => a + b.price, 0));
  const sf = serviceFees(cart, terms);
  const total = round2(goods + sf.total);
  // The amounts the guest reads (AENR-714): sunbeds, entry tickets, (lockers / parking when added), service fee, total.
  const subOf = (kinds: readonly string[]) => round2(cart.filter((i) => kinds.includes(i.kind)).reduce((a, b) => a + b.price, 0));
  const sunbedSub = subOf(["sunbed"]);
  const ticketSub = subOf(["ticket"]);
  const extrasSub = subOf(["locker", "parking"]);
  const extrasLabel = cart.some((i) => i.kind === "locker") && cart.some((i) => i.kind === "parking") ? "Lockers & parking" : cart.some((i) => i.kind === "locker") ? "Day lockers" : "Parking";
  // "I need an invoice" (AENR-714): the company's details instead of the receipt, kept for next time if asked.
  const [wantInvoice, setWantInvoice] = useState(false);
  const [inv, setInv] = useState<InvoiceDetails>(() => account.invoiceDetails ?? emptyInvoice(PROFILE.email));
  const [saveInv, setSaveInv] = useState(true);
  const [invTried, setInvTried] = useState(false);
  const invErr = invoiceErrors(inv);
  const invOk = Object.keys(invErr).length === 0;
  const invRef = useRef<HTMLDivElement>(null);
  // "Prices include VAT (24%)" — or the rate per service when they differ.
  const vat = vatRates(cart, terms);
  const vatNote = vat.single !== null ? `${t("Prices include VAT")} (${vat.single}%)` : `${t("Prices include VAT")}: ${vat.byService.map(([s, r]) => `${t(SERVICE_NOUN[s])} ${r}%`).join(", ")}`;
  // The best reward the guest has earned comes off by itself (AENR-619) — removable, nothing to claim.
  // Rewards, passes and wallet payments are roadmap features (AENR-691); rewards need Loyalty (AENR-696).
  const { roadmap, allows } = useTenantFeatures();
  const [firstTimer] = useDemoFlag("newGuest");
  const best = allows({ future: true, module: "Loyalty" }) ? bestReward(usableRewards(activeRewards(loyalty, firstTimer ? FIRST_TIME_LOYALTY : undefined), account.rewardsUsed ?? []), cart) : null;
  const [skipReward, setSkipReward] = useState(false);
  const rewardOff = best && !skipReward ? Math.min(best.amount, total) : 0;

  // ---- Passes ----
  // A guest can apply a Season pass (covers one entry ticket per visit) and/or
  // VIP credit (pays the order at a discount, billed against the balance). The
  // VIP discount only ever applies to the share the card actually pays for.
  const hasVip = roadmap && !!passes.vip;
  const hasSeason = roadmap && !!passes.season;
  const [applyVip, setApplyVip] = useState(true);
  const [applySeason, setApplySeason] = useState(true);
  const disc = passPricing.vipDiscount;
  const entryTotal = cart.filter((i) => i.kind === "ticket").reduce((a, b) => a + b.price, 0);
  // Season pass: one entry covered per visit (the holder's), valued at a standard adult entry.
  const seasonCovered = hasSeason && applySeason && entryTotal > 0 ? Math.min(ex.ticketPrice("adult", todayISO()), entryTotal) : 0;
  const vipBalance = passes.vip?.balance ?? 0;
  // Reward → season entry → VIP credit at its discount → beach credit (shared with Home's rebook tile, AENR-705).
  const { vipCover, vipDebit, vipSaved, creditUsed, fullDue } = settleCheckout(total, {
    rewardOff,
    seasonCovered,
    vip: hasVip && applyVip ? { balance: vipBalance, discount: disc } : null,
    credit: account.credit.balance,
  });
  // Always paid in full online — no deposit option (AENR-681, retiring AENR-574's deposit).
  const policy = ex.extras.policy;
  const cashDue = fullDue;
  const passApplied = rewardOff > 0 || seasonCovered > 0 || vipCover > 0 || creditUsed > 0;
  // The exact free-cancellation line for the earliest day in the basket (AENR-569).
  const firstDay = cart.map((i) => i.date).filter(Boolean).sort()[0] ?? todayISO();
  const cancel = cancelTerms(firstDay, guestNow(), policy, t);
  const cancelBy = cancel.text;

  // Pay → the payment moment (AENR-734): the progress steps and the success message run first, and
  // the booking is settled when they finish, so the pass appears only once everything is confirmed.
  const [processing, setProcessing] = useState<{ card: { save: boolean; last4: string; brand?: string } | null; method: "card" | "apple" | "google" } | null>(null);
  const finish = (card?: { save: boolean; last4: string; brand?: string } | null, method: "card" | "apple" | "google" = "card") =>
    setProcessing({ card: card ?? null, method });
  // Settle the order: debit VIP credit (if any), save the booking (and the card
  // if asked), clear the basket and land on the confirmation.
  const commit = (card?: { save: boolean; last4: string; brand?: string } | null, method: "card" | "apple" | "google" = "card") => {
    if (vipDebit > 0) spendVipCredit(vipDebit);
    const vatNo = wantInvoice ? normalVatNo(inv) : "";
    const booking: PlacedBooking = { ref: bookingRefFor(account.bookings.length), at: new Date().toISOString(), items: [...cart], fees: sf.lines, total: fullDue, guest: PROFILE, method, 
      card: method === "apple" ? "Apple Pay" : method === "google" ? "Google Pay" : card ? `${card.brand ?? "Visa"} ···· ${card.last4}` : undefined,
      invoiceTo: wantInvoice ? { company: inv.company.trim(), vatNo, email: inv.email.trim() } : undefined };
    // One invoice (ΤΠΥ) per visit day, as My bookings › Request an invoice makes them.
    const invoiceReqs: InvoiceRequest[] = wantInvoice
      ? placedVisits([booking], (id) => ZONES.find((z) => z.id === id)?.name ?? "").map((v, n) => ({
          id: `INV-${Date.now().toString().slice(-6)}${n ? `-${n}` : ""}`, visitKey: v.key, company: inv.company.trim(), vatNo,
          address: invoiceAddress(inv), amount: v.total, at: guestNow(), details: { ...inv, vatNo },
        }))
      : [];
    setAccount((a) => ({
      ...a,
      bookings: [booking, ...a.bookings],
      adultConfirmed: true,
      invoices: invoiceReqs.length ? [...invoiceReqs, ...a.invoices] : a.invoices,
      invoiceDetails: wantInvoice && saveInv ? { ...inv, vatNo: normalVatNo(inv) } : a.invoiceDetails ?? null,
      // A card saved at payment joins the saved cards and becomes the default (AENR-736).
      ...(card?.save ? (({ cards, savedCard }) => ({ cards, savedCard }))(withCard(a, { brand: card.brand ?? "Visa", last4: card.last4, exp: "12/28" }, true)) : {}),
      rewardsUsed: rewardOff > 0 && best && !best.reward.reusable ? [...(a.rewardsUsed ?? []), best.reward.id] : a.rewardsUsed ?? [],
      credit: creditUsed > 0 ? { balance: round2(a.credit.balance - creditUsed), log: [{ at: guestNow(), text: `Used at checkout · ${booking.ref}`, amount: -creditUsed }, ...a.credit.log] } : a.credit,
    }));
    setPlaced(booking);
    clearCart();
    setProcessing(null);
    setPhase("done");
    // Embedded in the wizard (AENR-640): the paid booking opens its confirmation page.
    if (embedded) go("customer", "confirm");
  };
  // Guests browsing without an account sign in first; the basket stays as it is.
  // The 18+ confirmation is asked once, at the first booking (AENR-622) — not at sign-in.
  const needAge = () => { if (account.adultConfirmed || adult) return false; setAgeTried(true); return true; };
  const pay = () => {
    if (account.guest) return setPhase("signin");
    if (wantInvoice && !invOk) {
      setInvTried(true);
      // The errors render on the next frame; then focus the first field to fix.
      requestAnimationFrame(() => invRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
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
    window.setTimeout(() => { setWallet(null); finish(null, w); }, 700);
  };
  // Arriving from the wizard: its glass menu hands over its rect and the
  // summary panel morphs out of it while the basket rows stagger in — checkout
  // reads as the journey's last scene, not a different app. Direct visits
  // (cart icon, deep link) find no stash and keep the plain fade-up.
  useLayoutEffect(() => {
    if (embedded) return;
    const state = takeFlip("checkout-panel");
    if (!state) return;
    const ctx = gsap.context(() => {
      Flip.from(state, { targets: '[data-flip-id="checkout-panel"]', scale: true, duration: 0.8, ease: EASE.inOut });
      gsap.from("[data-cart-row]", { y: 16, opacity: 0, stagger: 0.06, duration: 0.5, ease: EASE.out, delay: 0.15 });
    });
    return () => ctx.revert();
  }, [embedded]);

  // Basket by visit (AENR-659): every line of one beach day is one card. Lines that
  // carry no date (rare) share a card of their own.
  const dayOf = (it: CartItem) => it.date ?? it.id.split("@")[1] ?? "";
  const visits = [...new Set(cart.map(dayOf))].sort().map((d) => {
    const items = cart.filter((it) => dayOf(it) === d);
    const sets = items.filter((it) => it.kind === "sunbed");
    const zones = [...new Set(sets.map((it) => ZONES.find((z) => z.id === it.zoneId)?.name).filter(Boolean))];
    const title = [d ? `${fmtWeekday(d)} ${fmtDay(d)}` : t("Other items"), ...zones, sets.map((it) => it.setId).filter(Boolean).join(", ")].filter(Boolean).join(" · ");
    return { key: d || "other", title, items, total: items.reduce((a, it) => a + it.price, 0), fees: items.reduce((a, it) => a + (sf.perItem[cartKey(it)] ?? 0), 0) };
  });
  const plateOf = (it: CartItem) => { const p = it.sub.split(" · ")[0]; return !p || p === "—" ? t("Plate: add on arrival") : `${t("Plate")} ${p}`; };
  const removeVisit = (items: CartItem[]) => {
    items.forEach((it) => removeFromCart(it.kind, it.id));
    toast(t("Visit removed from your basket."), { action: { label: t("Undo"), onClick: () => items.forEach(addToCart) } });
  };
  const emptyBasket = () => {
    const snapshot = [...cart];
    clearCart();
    toast(t("Basket emptied."), { action: { label: t("Undo"), onClick: () => snapshot.forEach(addToCart) } });
  };

  if (processing)
    return (
      <PaymentProgress
        moment={{
          amount: cashDue,
          method: cashDue <= 0 ? "" : processing.method === "apple" ? "Apple Pay" : processing.method === "google" ? "Google Pay" : `${processing.card?.brand ?? "Visa"} ···· ${processing.card?.last4 ?? "4242"}`,
          reference: bookingRefFor(account.bookings.length),
        }}
        onDone={() => commit(processing.card, processing.method)}
      />
    );
  // Embedded in the wizard, a paid booking opens its confirmation page.
  if (embedded && (phase === "done" || cart.length === 0)) return null;
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
          <h2 className="mt-3 font-display font-bold text-guest-head text-navy-900">{t("Sign in to finish your booking")}</h2>
          <p className="mt-1 text-guest-body text-slate-600">{t("Your basket is saved —")} {cart.length} {cart.length === 1 ? t("item") : t("items")} · {money(total, true)}. {t("We need an account to send your QR and receipt.")}</p>
          <div className="mt-5 grid gap-2">
            <QuickSignIn onSignedIn={(how) => signIn(how === "passkey" ? t("passkey") : how)} />
            <Btn variant="ghost" full icon={Icon.mail} onClick={() => signIn(t("e-mail link"))}>{t("Use e-mail instead")}</Btn>
          </div>
          <button type="button" onClick={() => setPhase("cart")} className="mt-4 text-guest-caption text-slate-600 hover:text-navy-900">← {t("Back to the basket")}</button>
        </Card>
      </div>
    );
  }

  if (phase === "redirect") return <StripeStep amount={cashDue} cards={(() => { const all = allCards(account); const d = account.savedCard; return d ? [d, ...all.filter((c) => cardKey(c) !== cardKey(d))] : all; })()} onBack={() => setPhase("cart")} onPaid={finish} />;

  if (phase === "done") return <Confirmation inline booking={placed} />;

  return (
    <div className={embedded ? "" : "animate-fade-up grid lg:grid-cols-[1fr_360px] gap-5"}>
      {!embedded && <div className="min-w-0">
        <h1 className="sr-only">{t("Checkout")}</h1>
        <Card className="p-2">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100">
            <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.card size={16} /> {t("Your basket")} · {visits.length} {visits.length === 1 ? t("visit") : t("visits")}</div>
            <ActionsMenu size="sm" label={t("Basket actions")} actions={[{ id: "empty", label: t("Empty basket"), icon: Icon.trash, destructive: true, onSelect: emptyBasket }]} />
          </div>
          {/* One card per visit (AENR-659): the day, the zone and sets, then what it includes. Swipe left or Remove takes the whole visit. */}
          <div className="divide-y divide-slate-100">
            {visits.map((v) => (
              <div key={v.key} data-cart-row>
              <SwipeRow onDelete={() => removeVisit(v.items)} rounded="">
                <section aria-label={v.title} className="px-3 py-3 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-lg bg-teal-50 grid place-items-center text-teal-700 shrink-0"><Icon.calendar size={16} /></span>
                      <div className="min-w-0">
                        <div className="font-semibold text-guest-body text-navy-900">{v.title}</div>
                        <ul className="mt-1 space-y-0.5 text-guest-meta text-slate-600">
                          {v.items.map((it) => (
                            <li key={it.kind + it.id} className="flex items-center gap-1.5 min-w-0">
                              <span className="text-slate-500 shrink-0">{kindIcon(it.kind)}</span>
                              <span className="truncate">{it.label}{it.kind === "parking" ? ` · ${plateOf(it)}` : ""}</span>
                              <span className="ml-auto pl-2 tnum shrink-0">{money(it.price)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold tnum text-navy-900">{money(v.total, true)}</div>
                      {v.fees > 0 && <div className="text-guest-caption text-slate-500 tnum">+{money(v.fees, true)} {t("service fee")}</div>}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end gap-1">
                    <Btn size="sm" variant="ghost" icon={Icon.edit} onClick={() => go("customer", "plan")}>{t("Edit")}</Btn>
                    <Btn size="sm" variant="ghost" icon={Icon.trash} onClick={() => removeVisit(v.items)} aria-label={`${t("Remove")} ${v.title}`}>{t("Remove")}</Btn>
                  </div>
                </section>
              </SwipeRow>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 pt-2 pb-1 border-t border-slate-100 text-guest-caption text-slate-600">
            <span className="inline-flex items-center gap-1.5"><Icon.check size={13} className="text-teal-700" aria-hidden /> {t("Saved on this device — it waits here until you pay or empty it.")}</span>
            <button type="button" onClick={emptyBasket} className="font-semibold text-slate-600 hover:text-rose-700 rounded px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{t("Empty basket")}</button>
          </div>
        </Card>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg glass-card-solid px-2.5 py-1 text-guest-caption text-slate-700"><Icon.shield size={13} /> {t("Your ticket and receipt arrive by e-mail the moment you pay.")}</div>
      </div>}

      <div className={embedded ? "" : "lg:sticky lg:top-4 h-max"} data-flip-id={embedded ? undefined : "checkout-panel"}>
        <Card className={embedded ? "p-4" : "p-5"}>
          <div className="flex items-center gap-2 mb-3"><TenantLogo size={30} /><div className="text-guest-body font-semibold text-navy-900">{TENANT.name}</div></div>
          {/* Customer-facing summary: subtotal, any pass deductions, then what's due now. */}
          {sunbedSub > 0 && <Row l={t("Sunbeds")} v={`${money(sunbedSub, true)}`} />}
          {ticketSub > 0 && <Row l={t("Entry tickets")} v={`${money(ticketSub, true)}`} />}
          {extrasSub > 0 && <Row l={t(extrasLabel)} v={`${money(extrasSub, true)}`} />}
          {sf.total > 0 && <Row l={t("Service fee")} v={`${money(sf.total, true)}`} />}
          {best && (rewardOff > 0 ? (
            <div className="flex items-center justify-between gap-2 text-guest-body py-0.5 text-teal-700 font-medium">
              <span className="min-w-0"><Icon.gift size={13} className="inline align-[-2px] mr-1" />{t(best.reward.title)} · {best.reward.reward} <button type="button" aria-label={t("Remove reward")} onClick={() => setSkipReward(true)} className="ml-1 text-guest-caption font-semibold text-slate-500 underline-offset-2 hover:underline hover:text-navy-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{t("Remove")}</button></span>
              <span className="tnum shrink-0">−{money(rewardOff, true)}</span>
            </div>
          ) : (
            <button type="button" onClick={() => setSkipReward(false)} className="block text-left text-guest-meta font-semibold text-teal-700 hover:underline py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              <Icon.gift size={13} className="inline align-[-2px] mr-1" />{t("Use your reward")} · {best.reward.reward} (−{money(Math.min(best.amount, total), true)})
            </button>
          ))}
          {seasonCovered > 0 && <Row l={`${t("Season pass")} · ${t("1 entry")}`} v={`−${money(seasonCovered, true)}`} discount />}
          {vipCover > 0 && <Row l={t("Paid with VIP credit")} v={`−${money(vipCover, true)}`} discount />}
          {creditUsed > 0 && <Row l={t("Beach credit")} v={`−${money(creditUsed, true)}`} discount />}
          <div className="h-px bg-slate-100 my-2" />
          <Row l={passApplied ? t("To pay") : t("Total")} v={`${money(fullDue, true)}`} bold />
          <div className="text-guest-caption text-slate-500 mt-1" data-vat-note>{vatNote}</div>
          {vipCover > 0 && (
            <div className="mt-2 rounded-xl bg-sky-50 ring-1 ring-sky-600/15 px-3 py-2 text-guest-caption text-sky-800 leading-snug">
              <Icon.sparkles size={12} className="inline align-[-1px] mr-1" />{t("VIP credit used")} {money(vipDebit, true)} · {t("you saved")} {money(vipSaved, true)} ({Math.round(disc * 100)}%). {t("Balance")} {money(vipBalance, true)} → {money(round2(vipBalance - vipDebit), true)}.
            </div>
          )}

          {/* Apply a held pass. */}
          {(hasVip || hasSeason) && (
            <div className="mt-3 rounded-xl ring-1 ring-slate-200 bg-white/70 p-3 space-y-2.5">
              <div className="text-guest-over font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><Icon.wallet size={12} /> {t("Use a pass")}</div>
              {hasVip && (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-guest-meta font-semibold text-navy-900 flex items-center gap-1.5"><Icon.sparkles size={13} className="text-sky-700" /> {t("VIP credit")}</div>
                    <div className="text-guest-caption text-slate-500 tnum">{t("Balance")} {money(vipBalance, true)} · {Math.round(disc * 100)}% {t("off")}</div>
                  </div>
                  <Toggle on={applyVip} onChange={setApplyVip} ariaLabel={t("VIP credit")} />
                </div>
              )}
              {hasSeason && (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-guest-meta font-semibold text-navy-900 flex items-center gap-1.5"><Icon.ticket size={13} className="text-teal-600" /> {t("Season pass")}</div>
                    <div className="text-guest-caption text-slate-500">{entryTotal > 0 ? `${t("Covers 1 entry")} · ${passes.season?.validUntil ?? ""}` : t("No entry tickets in this order")}</div>
                  </div>
                  <Toggle on={applySeason} onChange={setApplySeason} ariaLabel={t("Season pass")} />
                </div>
              )}
            </div>
          )}

          {/* How to pay (AENR-714): an invoice for a business instead of the receipt, then the pay buttons. */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <h3 className="text-guest-over font-semibold uppercase tracking-wide text-slate-500">{t("How to pay")}</h3>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div id="inv-toggle-label" className="text-guest-meta font-semibold text-navy-900 flex items-center gap-1.5"><Icon.building size={14} className="text-slate-500" /> {t("I need an invoice")}</div>
                <div className="text-guest-caption text-slate-500">{t("For a business — company details instead of a receipt")}</div>
              </div>
              <Toggle on={wantInvoice} onChange={(v) => { setWantInvoice(v); if (!v) setInvTried(false); }} ariaLabel={t("I need an invoice")} />
            </div>
            {wantInvoice && (
              <div ref={invRef} className="mt-3 rounded-xl ring-1 ring-slate-200 bg-white/70 p-3 space-y-3">
                <InvoiceFields value={inv} onChange={setInv} errors={invErr} showErrors={invTried} />
                <label className="flex items-center gap-2 text-guest-caption text-slate-700 min-h-[32px]">
                  <input type="checkbox" checked={saveInv} onChange={(e) => setSaveInv(e.target.checked)} className="w-4 h-4 accent-teal-600" />
                  {t("Save these details for next time")}
                </label>
                {invTried && !invOk && <p role="alert" className="text-guest-caption font-medium text-rose-700">{t("Fill in the invoice details to pay.")}</p>}
              </div>
            )}
          </div>
          {!account.adultConfirmed && <div className="mt-4"><AgeCheck checked={adult} onChange={(v) => { setAdult(v); if (v) setAgeTried(false); }} invalid={ageTried && !adult} /></div>}
          {cashDue > 0 ? (
            <div className="mt-4 space-y-2">
              {/* Card is the way to pay today; Apple Pay, Google Pay (AENR-683) and Klarna (AENR-684)
                  are roadmap — shown with the FUTURE badge. */}
              <Btn variant="indigo" full size="lg" icon={Icon.card} onClick={pay}>{`${t("Pay by card")} · ${money(cashDue, true)}`}</Btn>
              {roadmap && <>
              <div className="flex items-center gap-2 text-guest-caption text-slate-500"><span className="h-px flex-1 bg-slate-200" />{t("or")}<span className="h-px flex-1 bg-slate-200" /></div>
              <button type="button" onClick={() => walletPay("apple")} disabled={!!wallet} className="relative w-full min-h-[48px] rounded-[14px] bg-black text-white font-semibold text-guest-body inline-flex items-center justify-center gap-1.5 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-70" aria-label={`${t("Pay with Apple Pay")} ${money(cashDue, true)} · ${t("coming soon")}`}>
                {wallet === "apple" ? t("Confirming…") : <><AppleLogo size={17} /> Pay</>}
                <NotMvpBadge className="absolute right-2.5 top-1/2 -translate-y-1/2" />
              </button>
              <button type="button" onClick={() => walletPay("google")} disabled={!!wallet} className="relative w-full min-h-[48px] rounded-[14px] bg-white ring-1 ring-slate-300 text-navy-900 font-semibold text-guest-body inline-flex items-center justify-center gap-1.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-70" aria-label={`${t("Pay with Google Pay")} ${money(cashDue, true)} · ${t("coming soon")}`}>
                {wallet === "google" ? t("Confirming…") : <><b className="text-[#4285F4]">G</b> Pay</>}
                <NotMvpBadge className="absolute right-2.5 top-1/2 -translate-y-1/2" />
              </button>
              <button type="button" onClick={() => toast(t("Klarna — pay in 3 interest-free instalments — is coming soon."), { tone: "info" })} className="relative w-full min-h-[48px] rounded-[14px] bg-[#FFA8CD] text-black font-bold text-guest-body inline-flex items-center justify-center gap-1.5 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2" aria-label={`${t("Pay with Klarna in 3 instalments")} · ${t("coming soon")}`}>
                Klarna. <span className="font-semibold text-guest-meta">{t("Pay in 3")}</span>
                <NotMvpBadge className="absolute right-2.5 top-1/2 -translate-y-1/2" />
              </button>
              </>}
            </div>
          ) : (
            <Btn variant="indigo" full size="lg" className="mt-4" icon={Icon.check} onClick={pay}>{t("Confirm · nothing to pay")}</Btn>
          )}

          <div className="mt-3 flex items-center justify-center gap-1.5 text-guest-caption text-slate-500"><Icon.lock size={12} /> {cashDue > 0 ? t("Secured by Stripe · we never store card details") : t("Settled from your pass · no card charged")}</div>
          <div className="mt-2 flex items-center justify-center gap-1.5 opacity-90">
            {["VISA", "MC", "AMEX", "APPLE"].map((b) => (
              <span key={b} className="text-guest-caption font-bold tracking-wide text-slate-500 bg-slate-100 rounded px-1.5 py-1 ring-1 ring-slate-200">{b}</span>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-guest-caption text-slate-500 leading-snug">
            <Icon.shield size={13} className="shrink-0 mt-0.5 text-teal-600" />
            <span><b className="text-navy-900">{cancelBy}</b>{cancel.free ? ` — ${policy.refundPct}% ${t("back, from My bookings in two taps.")}` : "."} <button onClick={() => toast(t("Demo — terms of service."))} className="underline hover:text-navy-900">{t("Terms")}</button></span>
          </div>
          <div className="mt-2 text-guest-caption text-slate-500 leading-snug">
            {OPERATOR.legal} · {t("VAT")} {OPERATOR.vat} · {OPERATOR.address}<br />
            {t("Help")}: <a className="underline hover:text-navy-900" href={`tel:${OPERATOR.phone.replace(/\s/g, "")}`}>{OPERATOR.phone}</a> · <a className="underline hover:text-navy-900" href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button onClick={() => go("customer", "plan")} className="text-guest-caption text-slate-600 hover:text-navy-900">← {t("Back to planning")}</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* The tenant's Stripe Checkout (simulated): saved card or a new one, with
   "save card for faster checkout"; Pay → processing → back to Slaice. */
function StripeStep({ amount, cards, onBack, onPaid }: { amount: number; cards: SavedCard[]; onBack: () => void; onPaid: (card: { save: boolean; last4: string; brand?: string }) => void }) {
  const money = useMoney();
  const t = useT();
  // Every saved card (AENR-736), the default first; or a new one.
  const [pick, setPick] = useState(cards.length ? 0 : -1);
  const useSaved = pick >= 0;
  const saved = useSaved ? cards[pick] : null;
  const [num, setNum] = useState("4242 4242 4242 4242");
  const [exp, setExp] = useState("12/28");
  const [cvc, setCvc] = useState("123");
  const [save, setSave] = useState(false);
  const [busy, setBusy] = useState(false);
  const digits = num.replace(/\D/g, "");
  const valid = useSaved || (digits.length >= 15 && /^\d{2}\/\d{2}$/.test(exp) && /^\d{3,4}$/.test(cvc));
  // The payment moment (AENR-734) shows the processing, so the form hands over at once.
  const submit = () => { setBusy(true); onPaid(saved ? { save: false, last4: saved.last4, brand: saved.brand } : { save, last4: digits.slice(-4), brand: cardBrand(digits) ?? "Visa" }); };
  return (
    <div className="animate-fade-in grid place-items-center min-h-[60dvh]">
      <Card className="p-8 max-w-md w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#635bff] font-bold text-guest-head"><Icon.stripe size={22} /> stripe</div>
          <div className="text-guest-body font-semibold text-navy-900">{TENANT.name}</div>
        </div>
        <div className="mt-4 text-guest-caption text-slate-500">{t("Total")}</div>
        <div className="font-display text-3xl font-bold text-navy-900 tnum">{money(amount, true)}</div>
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); if (valid && !busy) submit(); }}>
          {cards.length > 0 && (
            <fieldset className="space-y-1.5">
              <legend className="sr-only">{t("Card")}</legend>
              {cards.map((c, i) => (
                <label key={`${c.brand}-${c.last4}-${c.exp}`} className={`flex items-center gap-2 rounded-xl ring-1 px-3 min-h-[48px] cursor-pointer ${pick === i ? "ring-[#635bff] bg-indigo-50/50" : "ring-slate-200"}`}>
                  <input type="radio" name="card" className="accent-[#635bff]" checked={pick === i} onChange={() => setPick(i)} /> <Icon.card size={16} /> {t("Pay with")} {c.brand} ···· {c.last4} <span className="ml-auto text-guest-caption text-slate-500">{c.exp}</span>
                </label>
              ))}
              <label className={`flex items-center gap-2 rounded-xl ring-1 px-3 min-h-[48px] cursor-pointer ${pick < 0 ? "ring-[#635bff] bg-indigo-50/50" : "ring-slate-200"}`}>
                <input type="radio" name="card" className="accent-[#635bff]" checked={pick < 0} onChange={() => setPick(-1)} /> {t("Use another card")}
              </label>
            </fieldset>
          )}
          {!useSaved && (
            <>
              <label className="block text-guest-caption font-semibold text-slate-700">{t("Card number")}<input inputMode="numeric" autoComplete="cc-number" value={num} onChange={(e) => setNum(e.target.value)} className="mt-1 block w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-guest-body font-mono" /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-guest-caption font-semibold text-slate-700">{t("Expiry")}<input autoComplete="cc-exp" value={exp} onChange={(e) => setExp(e.target.value)} className="mt-1 block w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-guest-body font-mono" /></label>
                <label className="block text-guest-caption font-semibold text-slate-700">CVC<input inputMode="numeric" autoComplete="cc-csc" value={cvc} onChange={(e) => setCvc(e.target.value)} className="mt-1 block w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-guest-body font-mono" /></label>
              </div>
              <label className="flex items-center gap-2 text-guest-meta text-slate-700 min-h-[40px]"><input type="checkbox" className="accent-[#635bff] w-4 h-4" checked={save} onChange={(e) => setSave(e.target.checked)} /> {t("Save card for faster checkout")}</label>
            </>
          )}
          <Btn type="submit" variant="indigo" full size="lg" disabled={!valid} loading={busy}>{busy ? t("Processing…") : `${t("Pay")} ${money(amount, true)}`}</Btn>
        </form>
        <div className="mt-3 text-guest-caption text-slate-500 flex items-center gap-1.5"><Icon.lock size={12} /> {t("Demo — no real card is charged. Saved cards are stored by Stripe as a token; Slaice only keeps the last 4 digits.")}</div>
        <button type="button" onClick={onBack} disabled={busy} className="mt-3 text-guest-caption text-slate-600 hover:text-navy-900">← {t("Back to the basket")}</button>
      </Card>
    </div>
  );
}

function Row({ l, v, bold, muted, discount }: { l?: ReactNode; v?: ReactNode; bold?: boolean; muted?: boolean; discount?: boolean }) {
  return <div className={`flex items-center justify-between text-guest-body py-0.5 ${bold ? "font-bold text-navy-900 text-base" : discount ? "text-teal-700 font-medium" : muted ? "text-slate-600" : "text-slate-600"}`}><span>{l}</span><span className="tnum">{v}</span></div>;
}

function kindIcon(kind: string) {
  const m: Record<string, IconRenderer> = { sunbed: Icon.umbrella, ticket: Icon.ticket, locker: Icon.lock, parking: Icon.car };
  const I = m[kind] || Icon.card;
  return <I size={17} />;
}

export function Confirmation({ inline, booking: given }: { inline?: boolean; booking?: PlacedBooking | null }) {
  const money = useMoney();
  const { clearCart, go, toast, extras, account } = useApp();
  // Opened directly (#/customer/confirm): the guest's latest booking.
  const booking = given ?? account.bookings[0] ?? null;
  const t = useT();
  const [ref] = useState(() => booking?.ref ?? "BK-30000");
  const [full, setFull] = useState(false);
  const [share, setShare] = useState(false);
  const scope = useRef<HTMLDivElement>(null);
  // The booking's first day as a visit — one ticket per beach day (AENR-571).
  const visit = booking ? placedVisits([booking], (id) => ZONES.find((z) => z.id === id)?.name ?? "")[0] : undefined;
  // What the QR admits (AENR-715): the whole group shares it — sets by zone and the entry tickets.
  const entry = useEntry();
  const ob = booking ? entry.find(booking.ref) : undefined;
  const group = ob && visit ? entry.stateOf(ob, visit.date) : null;

  // The pass prints out and can be dragged into a wallet (AENR-791) — only with motion. Under reduced
  // motion the pass renders as it always has and the wallet badges below do the job.
  const [live] = useState(motionOK);
  const drag = useRef<PocketDrag | null>(null);
  const [dropped, setDropped] = useState<WalletKind | null>(null);
  // A pocket tapped instead (AENR-805): the same sheet, with no pass to lift back out.
  const [tapped, setTapped] = useState<WalletKind | null>(null);
  // The success message is shown by the payment moment (AENR-734); here the pass feeds out of a slot
  // like a receipt, its QR lands, and the actions follow. Elements render in their final state.
  useLayoutEffect(() => {
    const root = scope.current;
    const ticket = root?.querySelector<HTMLElement>("[data-confirm-qr]");
    const grip = root?.querySelector<HTMLElement>("[data-pass-grip]");
    if (!live || !root || !ticket || !grip) return;
    // A mouse drags the whole pass; a finger drags its header strip, so the rest of the page still scrolls.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const d = pocketDrag({
      pass: ticket,
      trigger: fine ? ticket : grip,
      area: root,
      onDrop: (p) => { const k = p.dataset.pocket; if (k === "apple" || k === "google") setDropped(k); },
    });
    drag.current = d;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: EASE.out }, onComplete: d.enable })
        .from("[data-confirm-head]", { y: 10, opacity: 0, duration: 0.35 })
        .from("[data-pass-slot]", { scaleX: 0.4, opacity: 0, duration: DUR.sm }, "-=0.2")
        // Fed out in four short pushes with a hair of side-to-side, like a receipt printer.
        .fromTo(ticket, { yPercent: -100 }, {
          keyframes: [
            { yPercent: -73, x: 0.8, duration: 0.15, ease: "power3.out" },
            { yPercent: -47, x: -0.8, duration: 0.15, delay: 0.06, ease: "power3.out" },
            { yPercent: -21, x: 0.5, duration: 0.15, delay: 0.06, ease: "power3.out" },
            { yPercent: 0, x: 0, duration: 0.2, delay: 0.06, ease: "back.out(1.6)" },
          ],
          clearProps: "transform",
        }, "-=0.05")
        // Torn off: the slot fades, the pass is free to move, the QR lands.
        .set("[data-pass-feed]", { overflow: "visible" })
        .to("[data-pass-slot]", { opacity: 0, duration: DUR.sm })
        .from("[data-pass-qr]", { scale: 0.85, autoAlpha: 0, duration: 0.4 }, "<")
        .from("[data-confirm-item]", { y: 14, opacity: 0, stagger: 0.08, duration: 0.45, clearProps: "transform,opacity" }, "-=0.25");
    }, root);
    return () => {
      d.kill();
      drag.current = null;
      ctx.revert();
    };
  }, [live]);
  const date = visit?.date ?? todayISO();
  const caption = `${fmtWeekday(date)} ${fmtDay(date)}${visit?.sets.length ? ` · ${visit.sets.join(", ")}` : ""}`;
  const pass = {
    ref,
    holder: booking ? `${booking.guest.first} ${booking.guest.last[0]}.` : "Elena M.",
    zone: visit?.zone || "Akti tou Iliou",
    date: fmtDay(date),
    seat: visit?.sets.join(", ") || "—",
    guests: group?.total || Math.max(1, (visit?.sets.length ?? 1) * 2),
    total: `${money(booking?.total ?? 0)}`,
    // Remembered as "In Wallet" on My bookings and Home too (AENR-620).
    visitKey: visit?.key,
  };
  const inWallet = visit ? account.wallet?.[visit.key] : undefined;
  // The ref decodes once the pass has printed (AENR-791).
  const decodeAt = live ? 1.3 : undefined;
  const onSite = booking?.deposit != null ? round2(booking.total - booking.deposit) : 0;
  // Fade in only (AENR-791): a transform on this column (fade-up) trapped the full-screen QR inside it.
  return (
    <div ref={scope} className="animate-fade-in max-w-xl mx-auto" data-inline={inline ? "" : undefined}>
      {/* A quiet confirmation line above the pass (AENR-734) — the big success moment came with the payment. */}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl glass-card-solid px-4 py-2.5" data-confirm-head>
        <h1 className="flex items-center gap-2 text-guest-body font-semibold text-navy-900">
          <span aria-hidden className="w-5 h-5 rounded-full bg-teal-600 text-white grid place-items-center"><Icon.check size={12} /></span>
          {t("Booking confirmed")}
        </h1>
        <Decode text={ref} delay={decodeAt} className="font-mono text-guest-meta text-slate-600" />
      </div>

      {/* The ticket — what the guest shows at the gate. With motion it feeds out of a printer slot
          (clipped by the feed until it's out) and can then be dragged into a wallet (AENR-791). */}
      <div className="relative">
      {live && <span aria-hidden data-pass-slot className="absolute -left-1 -right-1 top-0 z-10 h-2.5 rounded-full bg-navy-950 shadow-[inset_0_1px_3px_rgba(0,0,0,.6)]" />}
      <div data-pass-feed className={live ? "-mx-3 -mb-4 overflow-hidden px-3 pb-4 pt-1" : undefined}>
      <article aria-label={t("Your beach-day ticket")} className="relative rounded-[28px] bg-white shadow-lift ring-1 ring-slate-200 overflow-hidden" data-confirm-qr>
        <div className="relative grad-sea text-white px-6 py-5" data-pass-grip>
          {/* The grip — this strip is where a finger picks the pass up. */}
          {live && <span aria-hidden className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/45" />}
          <div className="text-guest-over font-semibold uppercase tracking-[0.14em] text-teal-100">{TENANT.name}</div>
          <div className="mt-1 font-display font-bold text-guest-title leading-tight">{fmtWeekday(date)} {fmtDay(date)}</div>
          {/* Each set with its own zone, so a booking across zones reads right (AENR-715). */}
          <div className="text-guest-body text-white/90">{group?.sets.length ? group.sets.map((s) => `${s.zone} ${s.setId}`).join(" · ") : `${visit?.zone ? `${visit.zone} · ` : ""}${visit?.sets.length ? `${t("Sunbeds")} ${visit.sets.join(", ")}` : t("Entry")}`}</div>
        </div>
        <div className="relative px-6 py-5 text-center">
          <span aria-hidden className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-slate-100" />
          <span aria-hidden className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-slate-100" />
          {/* The perforation between the stub and the QR part (AENR-791). */}
          <span aria-hidden className="absolute left-5 right-5 top-0 border-t-2 border-dashed border-slate-200" />
          <button type="button" onClick={() => setFull(true)} className="mx-auto grid place-items-center rounded-2xl p-2 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" aria-label={t("Show the QR full screen")} data-pass-qr>
            <QR size={208} seed={qrCode(ref)} />
          </button>
          <div className="mt-1 font-mono text-guest-body font-bold text-navy-900"><Decode text={ref} delay={decodeAt} /></div>
          <div className="text-guest-meta text-slate-500">{t("Tap the code to show it full screen at the gate.")}</div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-left text-guest-meta">
            <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-500 text-guest-caption">{t("Arrive")}</dt><dd className="font-semibold text-navy-900">{ARRIVAL_WINDOW}</dd></div>
            <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-500 text-guest-caption">{t("Paid")}</dt><dd className="font-semibold text-navy-900">{money((booking?.deposit ?? booking?.total ?? 0), true)}{booking?.card ? ` · ${booking.card}` : ""}</dd></div>
            {onSite > 0 && <div className="rounded-xl bg-amber-50 px-3 py-2 col-span-2"><dt className="text-amber-800 text-guest-caption">{t("To pay on site")}</dt><dd className="font-semibold text-amber-900">{money(onSite, true)} · {t("cash or card at the gate")}</dd></div>}
            {group && group.total > 0 && (
              <div className="rounded-xl bg-teal-50 px-3 py-2 col-span-2 flex items-center gap-2.5">
                <Icon.users size={16} className="text-teal-700 shrink-0" />
                <div className="min-w-0"><dt className="text-teal-800 text-guest-caption">{t("Your group")}</dt>
                  <dd className="font-semibold text-navy-900">{group.total} {group.total === 1 ? t("entry") : t("entries")}{group.sets.length ? ` · ${group.sets.length} ${group.sets.length === 1 ? t("set") : t("sets")}` : ""} — {t("one QR for everyone")}</dd></div>
              </div>
            )}
            <div className="rounded-xl bg-slate-50 px-3 py-2 col-span-2"><dt className="text-slate-500 text-guest-caption">{t("Entrance")}</dt><dd className="font-semibold text-navy-900 flex items-center justify-between gap-2"><span>{t("Main gate")} · {OPERATOR.address}</span>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${TENANT.name} ${TENANT.place}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal-700 hover:underline shrink-0"><Icon.map size={14} /> {t("Map")}<span className="sr-only"> ({t("opens in a new tab")})</span></a></dd></div>
          </dl>
          <p className="mt-3 text-guest-caption text-slate-600">{cancelTerms(date, guestNow(), extras.policy, t).text} · {booking?.invoiceTo ? `${t("invoice to")} ${booking.invoiceTo.company} (${booking.invoiceTo.vatNo}) ${t("e-mailed to")} ${booking.invoiceTo.email}` : t("receipt e-mailed")}</p>
        </div>
      </article>
      </div>
      </div>

      {/* The wallets as pockets (AENR-791 / 805) — the device's own, or both on a computer. Drag the pass
          into one, or tap it: each opens that wallet's add sheet. They are the page's only wallet buttons. */}
      <div className={`mt-5 ${live ? "data-[docked]:sticky data-[docked]:z-20 data-[docked]:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:data-[docked]:bottom-4" : ""}`} data-confirm-item data-pocket-dock>
        <p data-pocket-hint className="mx-auto mb-2 flex w-max max-w-full items-center gap-1.5 rounded-full glass-card-solid px-3 py-1 text-guest-meta font-semibold text-slate-700">
          <Icon.wallet size={15} aria-hidden className="text-teal-700 shrink-0" /> {inWallet ? t("Your pass is in your wallet") : live ? t("Drag your pass into a wallet, or tap one") : t("Add your pass to your wallet")}
        </p>
        <div className="flex gap-3">{deviceWallets().map((k) => <WalletPocket key={k} kind={k} added={inWallet === k} drag={live} onPick={() => setTapped(k)} />)}</div>
      </div>
      <div className="mt-4 space-y-2" data-confirm-item>
        {visit && <Btn variant="teal" size="lg" full icon={Icon.send} onClick={() => setShare(true)}>{t("Share with your group")}</Btn>}
        <div className="grid grid-cols-3 gap-2">
          <Btn variant="outline" icon={Icon.calendar} onClick={() => { if (visit) downloadVisitIcs(visit); toast(t("Calendar invite downloaded (.ics)."), { tone: "success" }); }}>{t("Calendar")}</Btn>
          <Btn variant="outline" icon={Icon.receipt} onClick={() => { clearCart(); go("customer", "mybookings"); }}>{t("Receipt")}</Btn>
          <Btn variant="outline" icon={Icon.grid} onClick={() => { clearCart(); go("customer", "mybookings"); }}>{t("Bookings")}</Btn>
        </div>
      </div>
      {share && visit && <ShareSheet v={visit} onClose={() => setShare(false)} />}
      {full && <FullscreenQR code={ref} caption={caption} onClose={() => setFull(false)} />}
      {/* Dropped into a pocket: that wallet's add sheet, as its badge opens it; closing it lifts the pass back out. */}
      {dropped && <WalletSheetFor pass={pass} kind={dropped} onClose={() => { setDropped(null); drag.current?.putBack(); }} />}
      {tapped && <WalletSheetFor pass={pass} kind={tapped} onClose={() => setTapped(null)} />}
    </div>
  );
}

/** The cancellation terms for a visit day, built from translated pieces (the deadline varies, so the
 *  whole sentence can't be one dictionary key) — and whether it is still free to cancel. */
function cancelTerms(visitIso: string, now: string, p: GuestPolicy, t: (s: string) => string) {
  const d = cancelDeadline(visitIso, p);
  if (now < d) return { free: true, text: `${t("Free cancellation until")} ${fmtDeadline(d)}` };
  return { free: false, text: p.lateRefundPct > 0 ? `${p.lateRefundPct}% ${t("refund if you cancel")}` : t("This booking can’t be refunded") };
}
