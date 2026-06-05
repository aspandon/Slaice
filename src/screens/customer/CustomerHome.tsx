import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Reveal } from "../../lib/motion";
import { useApp, useT } from "../../app/store";

export function CustomerHome() {
  const { dive } = useApp();
  const t = useT();
  const [promoDismissed, setPromoDismissed] = useState(false);

  return (
    <div className="animate-fade-up flex flex-col sm:grid sm:grid-cols-[3fr_2fr] gap-4 sm:items-stretch">

      {/* ── Hero: guided-booking entry point ─────────────────────── */}
      <Reveal as="button" onClick={() => dive()} className="text-left group block w-full sm:h-full">
        <div className="glass rounded-3xl relative overflow-hidden p-6 sm:p-9 pressable cursor-pointer transition duration-300 ease-spring hover:-translate-y-1 hover:shadow-lift h-full">
          <div aria-hidden className="absolute -top-28 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-teal-300/45 via-teal-400/20 to-transparent blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-gradient-to-tr from-gold-300/35 via-amber-300/15 to-transparent blur-3xl" />
          <div aria-hidden className="absolute top-1/3 right-1/3 w-44 h-44 rounded-full bg-gradient-to-br from-coral-300/25 to-transparent blur-2xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              <span className="w-6 h-6 rounded-full grid place-items-center bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-sm"><Icon.sun size={11} /></span>
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

      {/* ── Right column: promo + rebook, each fills half the hero height ── */}
      <div className="flex flex-col gap-4 sm:h-full">

        {/* Weekend promo */}
        {!promoDismissed && (
          <div className="glass rounded-2xl p-4 sm:p-5 flex flex-col gap-3 flex-1">
            <div className="flex items-start justify-between gap-2">
              <span className="w-10 h-10 rounded-xl grid place-items-center bg-gradient-to-br from-gold-400 to-gold-600 text-white shrink-0 shadow-sm">
                <Icon.bolt size={18} />
              </span>
              <button aria-label={t("Dismiss offer")} onClick={() => setPromoDismissed(true)}
                className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-navy-900 hover:bg-white/60 shrink-0 -mt-0.5 -mr-0.5">
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
            <button onClick={() => dive()}
              className="mt-auto self-start text-[13px] font-semibold text-teal-700 hover:text-teal-800 rounded-lg px-3 py-1.5 hover:bg-teal-50 transition -ml-3">
              {t("Claim")} →
            </button>
          </div>
        )}

        {/* Returning-guest shortcut */}
        <button onClick={() => dive()}
          className={`glass rounded-2xl p-4 sm:p-5 flex flex-col gap-3 text-left hover:bg-white/70 transition group ${!promoDismissed ? "flex-1" : ""}`}>
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

      </div>
    </div>
  );
}
