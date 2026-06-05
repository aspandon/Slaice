import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Card, Badge } from "../../components/ui";
import { Reveal } from "../../lib/motion";
import { useApp, useT } from "../../app/store";

/* ============ HOME ============
   Unified glass aesthetic over the beach backdrop: a slim promo pill, a
   hero card with soft gradient orbs (no heavy colored slab), and a single
   service grid where Sunbed Booking is the featured tile. */
export function CustomerHome() {
  const { go } = useApp();
  const tr = useT();
  const [promoDismissed, setPromoDismissed] = useState(false);
  const services = [
    { k: "book",    t: tr("home.tile.book.t"),    d: tr("home.tile.book.d"),    ic: Icon.umbrella, accent: "teal",   meta: tr("home.tile.book.meta"),    metaTone: "green", featured: true },
    { k: "ticket",  t: tr("home.tile.ticket.t"),  d: tr("home.tile.ticket.d"),  ic: Icon.ticket,   accent: "navy" },
    { k: "locker",  t: tr("home.tile.locker.t"),  d: tr("home.tile.locker.d"),  ic: Icon.lock,     accent: "amber",  meta: tr("home.tile.locker.meta"),  metaTone: "green" },
    { k: "parking", t: tr("home.tile.parking.t"), d: tr("home.tile.parking.d"), ic: Icon.car,      accent: "indigo", meta: tr("home.tile.parking.meta"), metaTone: "green" },
  ];
  const accents: Record<string, string> = {
    teal:   "from-teal-400 to-teal-600",
    navy:   "from-navy-700 to-navy-900",
    amber:  "from-amber-400 to-gold-600",
    indigo: "from-slaice-500 to-slaice-700",
  };

  return (
    <div className="animate-fade-up space-y-4">
      {/* Guided-booking hero — the primary entry point, so it sits first,
          directly under the nav; the promo bar and shortcuts follow below. */}
      <Reveal as="button" onClick={() => go("customer", "plan")} className="text-left group block w-full">
        <Card hover press className="glass-card-solid relative overflow-hidden p-6 sm:p-9">
          <div aria-hidden className="absolute -top-28 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-teal-300/45 via-teal-400/20 to-transparent blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-gradient-to-tr from-gold-300/35 via-amber-300/15 to-transparent blur-3xl" />
          <div aria-hidden className="absolute top-1/3 right-1/3 w-44 h-44 rounded-full bg-gradient-to-br from-coral-300/25 to-transparent blur-2xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              <span className="w-6 h-6 rounded-full grid place-items-center bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-sm"><Icon.sun size={11} /></span>
              {tr("home.greeting")} · {tr("home.sunny")} 28°
            </div>
            <h1 className="mt-3 font-display font-bold text-[28px] sm:text-[36px] leading-[1.05] tracking-tight text-navy-900 max-w-2xl">
              {tr("home.hero.title")} <span className="text-teal-700">{tr("home.hero.title2")}</span>
            </h1>
            <div className="text-[14px] text-slate-700 mt-3 max-w-xl">
              {tr("home.hero.sub")}
            </div>
            <span className="mt-6 inline-flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-semibold bg-navy-900 text-white shadow-btn-primary group-hover:translate-x-0.5 transition">
              <Icon.sparkles size={16} /> {tr("home.hero.cta")} <Icon.arrowR size={16} />
            </span>
          </div>
        </Card>
      </Reveal>

      {!promoDismissed && (
        <div className="glass rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg grid place-items-center bg-gradient-to-br from-gold-400 to-gold-600 text-white shrink-0 shadow-sm"><Icon.bolt size={14} /></span>
          <span className="flex-1 min-w-0 text-[13px] text-navy-900">
            <b className="font-semibold">{tr("home.promo.bold")}</b> {tr("home.promo.text")}
            <span className="text-slate-700 hidden sm:inline"> · {tr("home.promo.hours")}</span>
          </span>
          <button onClick={() => go("customer", "book")} className="text-[12.5px] font-semibold text-teal-700 hover:text-teal-800 rounded-md px-2 py-1 whitespace-nowrap">{tr("home.promo.claim")} →</button>
          <button aria-label="Dismiss offer" onClick={() => setPromoDismissed(true)} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:text-navy-900 hover:bg-white/60 shrink-0"><Icon.x size={14} /></button>
        </div>
      )}

      {/* Returning-guest shortcut — jump straight back to the favourite zone. */}
      <button onClick={() => go("customer", "book")} className="glass rounded-2xl px-3.5 py-2.5 w-full flex items-center gap-3 text-left hover:bg-white/70 transition group">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white grid place-items-center shrink-0"><Icon.umbrella size={17} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-semibold text-navy-900">{tr("home.rebook.title")}</span>
          <span className="block text-[12px] text-slate-600 truncate">{tr("home.rebook.sub")}</span>
        </span>
        <Icon.chevR size={16} className="text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition shrink-0" />
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {services.map((t, i) => (
          <Reveal as="button" key={t.k} delay={i * 60} onClick={() => go("customer", t.k)}
            className="text-left group">
            <Card hover press className="glass-card relative overflow-hidden p-4 h-full">
              {t.featured && (
                <div aria-hidden className="absolute -top-16 -right-10 w-44 h-44 rounded-full bg-gradient-to-br from-teal-300/35 to-transparent blur-2xl" />
              )}
              <div className="relative flex items-start justify-between gap-2">
                <div className={`w-10 h-10 rounded-xl grid place-items-center text-white shadow-sm bg-gradient-to-br ${accents[t.accent]} transition-transform duration-300 ease-spring group-hover:scale-110 group-hover:-rotate-3`}>
                  <t.ic size={18} />
                </div>
                {t.meta && <Badge tone={t.metaTone || "slate"}>{t.meta}</Badge>}
              </div>
              <div className="relative mt-2.5 font-display font-bold text-navy-900 flex items-center gap-1 text-[14px]">
                {t.t}<Icon.chevR size={14} className="transition-transform duration-200 group-hover:translate-x-1 text-teal-600" />
              </div>
              <div className="relative text-[12px] text-slate-600 mt-0.5 line-clamp-2">{t.d}</div>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
