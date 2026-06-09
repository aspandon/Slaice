import { useState } from "react";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { Badge, Btn } from "../../components/ui";
import { PassCard } from "../../components/PassCard";
import { Reveal } from "../../lib/motion";
import { SEASON_END_LABEL } from "../../data/passes";
import { BUILTIN_SCHEMES, makeCustomScheme, schemeProgress, HOME_LOYALTY_STATS } from "../../data/loyalty";
import type { RewardState, LoyaltyState } from "../../data/loyalty";
import { useApp, useT } from "../../app/store";

// Bare date from a validity label (e.g. "End of season · 30 Sep 2026").
const dateOf = (s: string) => s.split(/·|to/).pop()?.trim() ?? s;

// `.glass-flat`, not `.glass`: a frosted look with NO backdrop-filter, so these
// cards can't show the GPU backdrop-filter tile seams (shifting vertical lines)
// that appear over the fixed parallax beach. Over the smooth sky it reads the
// same; see index.css.
const CARD = "glass-flat rounded-3xl overflow-hidden relative";

export function CustomerHome() {
  const { dive, loyalty } = useApp();
  const t = useT();
  const [promoDismissed, setPromoDismissed] = useState(false);
  const rewards = activeRewards(loyalty);
  const ready = rewards.filter((a) => a.state.kind === "claim").length;

  return (
    <div className="animate-fade-up flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_auto] gap-4 xl:items-start">

      {/* ── Left: hero + the two promos beneath it (narrower now) ──── */}
      <div className="flex flex-col gap-4 min-w-0">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <Reveal as="button" onClick={() => dive()} className="text-left group block w-full">
        <div className={`${CARD} p-6 sm:p-9 pressable cursor-pointer transition duration-300 ease-spring hover:-translate-y-1 hover:bg-white/80`}>
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              <span className="w-6 h-6 rounded-full grid place-items-center bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-sm">
                <Icon.sun size={11} />
              </span>
              {t("Good morning, Elena")} · {t("Sunny")} 28°
            </div>
            <h1 className="mt-3 font-display font-bold text-[28px] sm:text-[36px] leading-[1.05] tracking-tight text-navy-900 max-w-2xl">
              {t("Plan your full beach day")} <span className="text-teal-700">{t("in 60 seconds")}</span>
            </h1>
            <div className="text-[14px] text-slate-700 mt-3 max-w-xl">
              {t("Guests, dates, sunbeds, locker, parking — one guided flow with a live total.")}
            </div>
            <span className="mt-6 inline-flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-semibold bg-navy-900 text-white shadow-btn-primary group-hover:translate-x-0.5 transition">
              <Icon.sparkles size={16} /> {t("Start guided booking")} <Icon.arrowR size={16} />
            </span>
          </div>
        </div>
      </Reveal>

      {/* ── Promos beneath the hero — icon in front of the text ────── */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Weekend promo */}
        {!promoDismissed && (
          <div className={`${CARD} p-5 relative flex flex-col gap-2.5`}>
            <button aria-label={t("Dismiss offer")} onClick={() => setPromoDismissed(true)} className="absolute top-3 right-3 w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-navy-900 hover:bg-white/50 transition"><Icon.x size={14} /></button>
            <div className="flex items-center gap-3 pr-7">
              <span className="w-10 h-10 rounded-xl grid place-items-center bg-gradient-to-br from-gold-400 to-gold-600 text-white shrink-0 shadow-sm"><Icon.bolt size={18} /></span>
              <div className="min-w-0">
                <div className="font-semibold text-navy-900 text-[15px] leading-tight"><b>{t("20% off")}</b> {t("front-row sunbeds")}</div>
                <div className="text-[12.5px] text-slate-600 mt-0.5 leading-snug">{t("This weekend only · gates open 09:00–20:00")}</div>
              </div>
            </div>
            <button onClick={() => dive()} className="self-start text-[13px] font-semibold text-teal-700 hover:text-teal-800 rounded-lg px-3 py-1.5 hover:bg-white/50 transition -ml-3">{t("Claim")} →</button>
          </div>
        )}

        {/* Returning-guest shortcut */}
        <button onClick={() => dive()} className={`${CARD} p-5 flex flex-col gap-2.5 text-left hover:bg-white/80 transition group`}>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white grid place-items-center shrink-0"><Icon.umbrella size={18} /></span>
            <div className="min-w-0">
              <div className="font-semibold text-navy-900 text-[15px] leading-tight">{t("Rebook your usual")}</div>
              <div className="text-[12.5px] text-slate-600 mt-0.5 leading-snug">Central · {t("front row — your favourite zone last season")}</div>
            </div>
          </div>
          <div className="self-start flex items-center gap-1 text-teal-600 text-[13px] font-semibold px-3 py-1.5 -ml-3">{t("Book again")} <Icon.chevR size={14} className="group-hover:translate-x-0.5 transition" /></div>
        </button>

      </div>
      </div>

      {/* ── Right cluster: a tall "Your rewards" tile beside the cards ─ */}
      <div className={`grid gap-4 ${rewards.length ? "xl:grid-cols-[22rem_85.6mm]" : "xl:grid-cols-[85.6mm]"}`}>
        {rewards.length > 0 && (
          <div className={`${CARD} p-4 flex flex-col h-full min-w-0`}>
            <div className="flex items-center gap-2 mb-3 px-0.5">
              <Icon.gift size={15} className="text-teal-600 shrink-0" />
              <h2 className="font-display font-bold text-navy-900 text-[15px] flex-1 min-w-0">{t("Your rewards")}</h2>
              {ready > 0 && <Badge tone="green">{ready} {t("ready")}</Badge>}
            </div>
            <div className="flex-1 space-y-2.5 overflow-y-auto no-scrollbar -mr-1 pr-1">
              {rewards.map((a) => <RewardRow key={a.id} icon={a.icon} title={a.title} state={a.state} />)}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-4">
          <VipTile />
          <SeasonTile />
        </div>
      </div>
    </div>
  );
}

/* VIP credit tile — the tenant membership card art + a buy/top-up footer. */
function VipTile() {
  const { go, passes, passPricing, clearPass } = useApp();
  const t = useT();
  const vip = passes.vip;
  const from = Math.min(...passPricing.vipTiers);
  const disc = Math.round(passPricing.vipDiscount * 100);
  return (
    <div className={`${CARD} flex flex-col w-full transition duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-lift`}>
      <button onClick={() => go("customer", "vip")} aria-label={vip ? t("Top up VIP credit") : t("Get VIP Pass")} className="block w-full group">
        <PassCard kind="vip" holder="ELENA M." subtitle={vip ? `€${vip.balance.toLocaleString()} CREDIT` : `MEMBER · ${disc}% OFF`} validUntil={SEASON_END_LABEL} className="group-hover:brightness-[1.02] transition" />
      </button>
      <div className="mt-auto flex items-center justify-between gap-2 px-4 py-3">
        <button onClick={() => go("customer", "vip")} className="inline-flex items-center gap-1 text-slaice-600 hover:text-slaice-700 text-[13px] font-semibold">
          {t("Get VIP pass")} — {t("from")} €{from.toLocaleString()} <Icon.chevR size={14} />
        </button>
        {vip && <button onClick={() => clearPass("vip")} className="text-[11px] text-slate-400 hover:text-rose-600 shrink-0">{t("Reset")}</button>}
      </div>
    </div>
  );
}

/* Season pass tile — the tenant membership card art + a buy/manage footer. */
function SeasonTile() {
  const { go, passes, passPricing, clearPass } = useApp();
  const t = useT();
  const season = passes.season;
  const from = Math.min(passPricing.seasonMonthly, passPricing.seasonSummer);
  return (
    <div className={`${CARD} flex flex-col w-full transition duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-lift`}>
      <button onClick={() => go("customer", "season")} aria-label={season ? t("Manage Season pass") : t("Get Season Pass")} className="block w-full group">
        <PassCard kind="season" holder="ELENA M." subtitle={season && season.plan === "monthly" ? "MONTHLY 2026" : "SUMMER 2026"} validUntil={season ? dateOf(season.validUntil) : SEASON_END_LABEL} className="group-hover:brightness-[1.02] transition" />
      </button>
      <div className="mt-auto flex items-center justify-between gap-2 px-4 py-3">
        <button onClick={() => go("customer", "season")} className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 text-[13px] font-semibold">
          {season ? t("Manage pass") : `${t("Get Season pass")} — ${t("from")} €${from.toLocaleString()}`} <Icon.chevR size={14} />
        </button>
        {season && <button onClick={() => clearPass("season")} className="text-[11px] text-slate-400 hover:text-rose-600 shrink-0">{t("Reset")}</button>}
      </div>
    </div>
  );
}

/* Active loyalty schemes for the guest, sorted (claimable first). Schemes + config
   come from the app store (written by the admin Loyalty screen). */
const REWARD_ORDER = { claim: 0, progress: 1, perk: 2 } as const;
function activeRewards(loyalty: LoyaltyState) {
  return [...BUILTIN_SCHEMES, ...loyalty.customIds.map(makeCustomScheme)]
    .filter((s) => loyalty.config[s.id]?.enabled)
    .map((s) => {
      const values = loyalty.config[s.id]?.values ?? {};
      const title = s.custom ? String(values.title || s.title) : s.title;
      return { id: s.id, icon: s.icon, title, state: schemeProgress(s, values, HOME_LOYALTY_STATS) };
    })
    .sort((a, b) => REWARD_ORDER[a.state.kind] - REWARD_ORDER[b.state.kind]);
}

/* One reward as a compact row inside the tall "Your rewards" tile. */
function RewardRow({ icon, title, state }: { icon: IconRenderer; title: string; state: RewardState }) {
  const { dive, toast } = useApp();
  const t = useT();
  const SIcon = icon;
  const claim = state.kind === "claim";
  return (
    <div className={`rounded-xl p-3 ring-1 transition ${claim ? "ring-teal-300 bg-teal-50/60" : "ring-slate-200 bg-white/60"}`}>
      <div className="flex items-center gap-2.5">
        <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${claim ? "bg-teal-600 text-white" : "bg-slaice-100 text-slaice-700"}`}><SIcon size={15} /></span>
        <div className="font-semibold text-navy-900 text-[13.5px] flex-1 min-w-0 truncate">{t(title)}</div>
        {claim && <Badge tone="green"><Icon.checkCircle size={10} /> {t("Ready")}</Badge>}
      </div>
      <div className="text-[12.5px] text-navy-900 mt-1.5 leading-snug">{state.reward}</div>
      {state.kind === "progress" && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 gap-2">
            <span className="tnum shrink-0">{state.current}/{state.target} {t(state.unit)}</span>
            {state.note && <span className="truncate">{state.note}</span>}
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-slaice-500 to-teal-500" style={{ width: `${Math.min(100, Math.round((state.current / state.target) * 100))}%` }} /></div>
        </div>
      )}
      {claim && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {state.note && <span className="text-[11px] text-slate-500 truncate">{state.note}</span>}
          <Btn size="sm" variant="teal" icon={Icon.gift} onClick={() => toast(`${t("Reward ready")} — ${state.reward}. ${t("Show this at the gate to redeem.")}`, { tone: "success" })}>{t("Claim")}</Btn>
        </div>
      )}
      {state.kind === "perk" && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {state.note && <span className="text-[11px] text-slate-500 truncate">{state.note}</span>}
          <button onClick={() => dive()} className="text-[12px] font-semibold text-teal-700 hover:text-teal-800 shrink-0 inline-flex items-center gap-1">{t("Use it")} <Icon.chevR size={13} /></button>
        </div>
      )}
    </div>
  );
}
