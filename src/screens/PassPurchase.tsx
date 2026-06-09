import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import type { IconRenderer } from "../lib/icons";
import { Card, Btn } from "../components/ui";
import { WalletButtons } from "../components/WalletPass";
import { SlaiceLogo } from "../components/Brand";
import { TENANT } from "../data/beach";
import { seasonPlanLabel, seasonValidUntil, SEASON_END_LABEL, round2 } from "../data/passes";
import { useApp, useT } from "../app/store";
import type { SeasonPlan } from "../domain/types";

// Stable-ish pass reference sequence for the QR / wallet pass.
let PASS_SEQ = 4880;
const nextRef = (kind: "vip" | "season") => (kind === "vip" ? "VIP-" : "SEA-") + ++PASS_SEQ;

/* ============================================================================
   Buy a pass — VIP credit (prepay, spend with a discount) or a Season pass
   (covers entry). A focused select → Stripe → confirm flow that mirrors the
   booking checkout, ending with "add to wallet" and the pass marked active.
   ============================================================================ */
export function PassPurchase({ kind }: { kind: "vip" | "season" }) {
  const { go, toast, passPricing, passes, buyVipCredit, buySeasonPass } = useApp();
  const t = useT();
  const vip = kind === "vip";
  const discPct = Math.round(passPricing.vipDiscount * 100);
  const [phase, setPhase] = useState<"select" | "redirect" | "done">("select");
  const [tier, setTier] = useState<number>(passPricing.vipTiers[0] ?? 500);
  const [plan, setPlan] = useState<SeasonPlan>("summer");
  const [ref] = useState(() => nextRef(kind));

  const price = vip ? tier : plan === "monthly" ? passPricing.seasonMonthly : passPricing.seasonSummer;

  // On a simulated successful payment, activate (or top up) the pass.
  const complete = () => {
    if (vip) buyVipCredit(tier);
    else buySeasonPass(plan);
    setPhase("done");
    toast(vip ? t("VIP card activated — credit added to your wallet.") : t("Season pass activated."), { tone: "success" });
  };

  if (phase === "redirect") {
    return (
      <div className="animate-fade-in grid place-items-center min-h-[60dvh]">
        <Card className="p-10 max-w-md w-full text-center">
          <div className="flex items-center justify-center gap-2 text-[#635bff] font-bold text-lg"><Icon.stripe size={22} /> stripe</div>
          <div className="mt-4 text-sm text-slate-500">{t("Redirecting to")} {TENANT.name}{t("'s secure Stripe Checkout…")}</div>
          <div className="mt-5 mx-auto w-10 h-10 rounded-full border-2 border-slate-200 border-t-[#635bff] animate-spin" />
          <div className="mt-5 text-[12px] text-slate-600 flex items-center justify-center gap-1.5"><Icon.lock size={12} /> {t("Secure payment on")} {TENANT.name}{t("'s account · powered by Stripe")}</div>
          <Btn variant="indigo" full size="lg" className="mt-5" onClick={complete}>{t("Simulate successful payment")}</Btn>
        </Card>
      </div>
    );
  }

  if (phase === "done") {
    const fields = vip
      ? [
          { label: t("Holder"), value: "Elena M." },
          { label: t("Credit"), value: `€${(passes.vip?.balance ?? tier).toLocaleString()}` },
          { label: t("Discount"), value: `${discPct}% ${t("off")}` },
          { label: t("Valid"), value: `→ ${SEASON_END_LABEL}` },
        ]
      : [
          { label: t("Holder"), value: "Elena M." },
          { label: t("Plan"), value: t(seasonPlanLabel(plan)) },
          { label: t("Covers"), value: t("Entry tickets") },
          { label: t("Valid"), value: passes.season?.validUntil ?? seasonValidUntil(plan) },
        ];
    return (
      <div className="animate-fade-up max-w-xl mx-auto">
        <Card className="p-6 sm:p-8 text-center">
          <div className={`w-16 h-16 mx-auto rounded-2xl text-white grid place-items-center animate-pop ${vip ? "bg-slaice-600" : "bg-teal-600"}`}><Icon.check size={34} /></div>
          <h2 className="mt-4 font-display font-bold text-2xl text-navy-900">{t("Payment successful")}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {vip
              ? `${t("You're now a VIP member.")} ${t("Your credit is ready to spend at checkout with")} ${discPct}% ${t("off")}.`
              : `${t("You're now a Season-pass holder.")} ${t("Your entry is covered every visit.")}`}
          </p>

          <div className="my-6"><WalletButtons pass={{ ref, variant: kind, title: vip ? t("VIP credit pass") : t("Season pass"), total: `€${price.toLocaleString()}`, fields }} className="" /></div>

          <div className="grid sm:grid-cols-3 gap-2 text-[12px]">
            <Pill icon={Icon.checkCircle} t={t("Stripe paid")} />
            <Pill icon={vip ? Icon.wallet : Icon.ticket} t={vip ? t("Credit added") : t("Entry covered")} />
            <Pill icon={Icon.receipt} t={t("ΑΠΥ → MyDATA ✓")} />
          </div>

          <div className="mt-6 flex gap-2 justify-center flex-wrap">
            <Btn variant="teal" icon={Icon.home} onClick={() => go("customer", "home")}>{t("Back to home")}</Btn>
            <Btn variant="outline" icon={Icon.sparkles} onClick={() => go("customer", "plan")}>{t("Plan a visit")}</Btn>
          </div>
        </Card>
        <div className="text-center mt-3 text-[11px] text-slate-600 flex items-center justify-center gap-1.5">{t("powered by")} <SlaiceLogo size={18} withText /></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up max-w-2xl mx-auto">
      <button onClick={() => go("customer", "home")} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 hover:text-navy-900 mb-3"><Icon.arrowL size={15} /> {t("Home")}</button>

      <Card className={`overflow-hidden ${vip ? "" : ""}`}>
        <div className={`${vip ? "grad-slaice" : "grad-sea"} text-white p-6 sm:p-7`}>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
            <span className="w-6 h-6 rounded-full grid place-items-center bg-white/15">{vip ? <Icon.sparkles size={12} /> : <Icon.ticket size={12} />}</span>
            {vip ? t("VIP Pass") : t("Season Pass")}
          </div>
          <h1 className="mt-2 font-display font-bold text-2xl sm:text-3xl leading-tight">
            {vip ? t("Prepay credit, save on everything") : t("Free entry, all season long")}
          </h1>
          <p className="text-[13.5px] text-white/85 mt-2 max-w-md">
            {vip
              ? `${t("Top up once and spend it on sunbeds, tickets, lockers or parking with")} ${discPct}% ${t("off — valid to the end of the season.")}`
              : t("Your entry ticket is covered on every visit — pick a month or the whole summer.")}
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{vip ? t("Choose a credit pack") : t("Choose a plan")}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {vip
              ? passPricing.vipTiers.map((amt) => (
                  <SelectCard key={amt} on={tier === amt} onClick={() => setTier(amt)}
                    title={`€${amt.toLocaleString()} ${t("credit")}`}
                    sub={`${t("Spends like")} €${round2(amt / (1 - passPricing.vipDiscount)).toLocaleString()} · ${discPct}% ${t("off")}`}
                    foot={`${t("Valid to")} ${SEASON_END_LABEL}`} accent="slaice" />
                ))
              : ([
                  { p: "monthly" as SeasonPlan, price: passPricing.seasonMonthly, foot: seasonValidUntil("monthly") },
                  { p: "summer" as SeasonPlan, price: passPricing.seasonSummer, foot: seasonValidUntil("summer") },
                ]).map((o) => (
                  <SelectCard key={o.p} on={plan === o.p} onClick={() => setPlan(o.p)}
                    title={t(seasonPlanLabel(o.p))}
                    sub={`€${o.price.toLocaleString()} · ${t("covers your entry")}`}
                    foot={o.foot} accent="teal" />
                ))}
          </div>

          <div className="rounded-2xl ring-1 ring-slate-200 bg-slate-50/70 p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500">{t("Total")}</div>
              <div className="font-display text-2xl font-bold text-navy-900 tnum leading-none">€{price.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 mt-1">{vip ? `${t("One-off · credit never expires before")} ${SEASON_END_LABEL}` : t("One-off · auto-applies at checkout")}</div>
            </div>
            <Btn variant="indigo" size="lg" icon={Icon.stripe} onClick={() => setPhase("redirect")}>{t("Pay with Stripe")}</Btn>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500"><Icon.lock size={12} /> {t("Secured by Stripe · we never store card details")}</div>
        </div>
      </Card>

      <div className="mt-3 text-[12px] text-slate-600 flex items-start gap-1.5">
        <Icon.info size={13} className="shrink-0 mt-0.5 text-slate-400" />
        {vip
          ? t("At checkout, the VIP discount applies to whatever your credit pays for; anything left is paid as usual.")
          : t("At checkout, one entry ticket per visit is covered automatically while your pass is valid.")}
      </div>
    </div>
  );
}

function SelectCard({ on, onClick, title, sub, foot, accent }: { on: boolean; onClick: () => void; title: ReactNode; sub: ReactNode; foot: ReactNode; accent: "slaice" | "teal" }) {
  const ring = accent === "slaice" ? "ring-slaice-500" : "ring-teal-500";
  return (
    <button onClick={onClick} aria-pressed={on}
      className={`relative text-left rounded-2xl p-4 ring-1 transition ${on ? `ring-2 ${ring} bg-white shadow-lift` : "ring-slate-200 bg-white/70 hover:ring-slate-300"}`}>
      <div className="font-display font-bold text-navy-900 text-lg">{title}</div>
      <div className="text-[12.5px] text-slate-600 mt-0.5">{sub}</div>
      <div className="text-[11px] text-slate-400 mt-1.5">{foot}</div>
      {on && <span className={`absolute top-3 right-3 w-5 h-5 rounded-full text-white grid place-items-center ${accent === "slaice" ? "bg-slaice-600" : "bg-teal-600"}`}><Icon.check size={12} /></span>}
    </button>
  );
}

function Pill({ icon: IconC, t }: { icon: IconRenderer; t?: ReactNode }) {
  return <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15 py-1.5 font-semibold"><IconC size={14} /> {t}</div>;
}
