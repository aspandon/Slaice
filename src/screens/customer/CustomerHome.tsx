import { useState } from "react";
import { Icon } from "../../lib/icons";
import { PassCard } from "../../components/PassCard";
import { Reveal } from "../../lib/motion";
import { useApp, useT } from "../../app/store";

// `.glass-flat`, not `.glass`: a frosted look with NO backdrop-filter, so these
// cards can't show the GPU backdrop-filter tile seams (shifting vertical lines)
// that appear over the fixed parallax beach. Over the smooth sky it reads the
// same; see index.css.
const CARD = "glass-flat rounded-3xl overflow-hidden relative";

export function CustomerHome() {
  const { dive } = useApp();
  const t = useT();
  const [promoDismissed, setPromoDismissed] = useState(false);

  return (
    <div className="animate-fade-up flex flex-col sm:grid sm:grid-cols-[3fr_2fr] gap-4 sm:items-start">

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

      {/* ── Right: promo · rebook · VIP · Season, as a 2×2 ────────── */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Weekend promo */}
        {!promoDismissed && (
          <div className={`${CARD} p-5 sm:p-6 flex flex-col gap-3`}>
            <div className="flex items-start justify-between gap-2">
              <span className="w-10 h-10 rounded-xl grid place-items-center bg-gradient-to-br from-gold-400 to-gold-600 text-white shrink-0 shadow-sm">
                <Icon.bolt size={18} />
              </span>
              <button
                aria-label={t("Dismiss offer")}
                onClick={() => setPromoDismissed(true)}
                className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-navy-900 hover:bg-white/50 shrink-0 -mt-0.5 -mr-0.5">
                <Icon.x size={14} />
              </button>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-navy-900 text-[15px]">
                <b>{t("20% off")}</b> {t("front-row sunbeds")}
              </div>
              <div className="text-[12.5px] text-slate-600 mt-1 leading-snug">
                {t("This weekend only · gates open 09:00–20:00")}
              </div>
            </div>
            <button
              onClick={() => dive()}
              className="mt-auto self-start text-[13px] font-semibold text-teal-700 hover:text-teal-800 rounded-lg px-3 py-1.5 hover:bg-white/50 transition -ml-3">
              {t("Claim")} →
            </button>
          </div>
        )}

        {/* Returning-guest shortcut */}
        <button
          onClick={() => dive()}
          className={`${CARD} p-5 sm:p-6 flex flex-col gap-3 text-left hover:bg-white/80 transition group`}>
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white grid place-items-center shrink-0">
            <Icon.umbrella size={18} />
          </span>
          <div className="flex-1">
            <div className="font-semibold text-navy-900 text-[15px]">{t("Rebook your usual")}</div>
            <div className="text-[12.5px] text-slate-600 mt-1 leading-snug">
              Central · {t("front row — your favourite zone last season")}
            </div>
          </div>
          <div className="mt-auto flex items-center gap-1 text-teal-600 text-[13px] font-semibold">
            {t("Book again")} <Icon.chevR size={14} className="group-hover:translate-x-0.5 transition" />
          </div>
        </button>

        {/* Passes — grouped beside the promo + rebook tiles */}
        <VipTile />
        <SeasonTile />

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
    <div className={`${CARD} flex flex-col transition duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-lift`}>
      <button onClick={() => go("customer", "vip")} aria-label={vip ? t("Top up VIP credit") : t("Get VIP Pass")} className="block w-full group">
        <PassCard kind="vip" holder="ELENA M." subtitle={vip ? `€${vip.balance.toLocaleString()} CREDIT` : `MEMBER · ${disc}% OFF`} className="group-hover:brightness-[1.02] transition" />
      </button>
      <div className="mt-auto flex items-center justify-between gap-2 px-4 py-3">
        <button onClick={() => go("customer", "vip")} className="inline-flex items-center gap-1 text-slaice-600 hover:text-slaice-700 text-[13px] font-semibold">
          {vip ? t("Top up credit") : `${t("Get VIP")} — ${t("from")} €${from.toLocaleString()}`} <Icon.chevR size={14} />
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
    <div className={`${CARD} flex flex-col transition duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-lift`}>
      <button onClick={() => go("customer", "season")} aria-label={season ? t("Manage Season pass") : t("Get Season Pass")} className="block w-full group">
        <PassCard kind="season" holder="ELENA M." subtitle={season && season.plan === "monthly" ? "MONTHLY 2026" : "SUMMER 2026"} className="group-hover:brightness-[1.02] transition" />
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
