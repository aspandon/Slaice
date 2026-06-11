import { useState } from "react";
import { Icon } from "../lib/icons";
import { DAY_MAX, DAY_MIN, fmtHour, WEATHER_DEMO, WEATHER_KINDS } from "../data/beach";
import { useApp, useT } from "../app/store";

/* ============================================================================
   Scene demo controls — the bottom-left counterpart to the persona switcher's
   "demo" pill on the right: a collapsed chip that opens a small panel with the
   scene clock (a slider scrubbing dawn → dusk) and the four weather presets.
   Pure demo affordances — there is no real forecast; both sections follow the
   admin's Atmosphere switches and the whole pill disappears when both are off.
   ============================================================================ */
export function SceneDemoPanel() {
  const { weather, setWeather, dayTime, setDayTime, sceneFx } = useApp();
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!sceneFx.weather && !sceneFx.daytime) return null;
  const wd = WEATHER_DEMO[weather];
  const WIcon = (sceneFx.weather ? Icon[wd.icon] : Icon.sun) || Icon.sun;

  return (
    <div className="fixed left-3 sm:left-5 z-40 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4">
      {/* Click-away backdrop while open. */}
      {open && <button aria-label={t("Close")} tabIndex={-1} className="fixed inset-0 cursor-default" onClick={() => setOpen(false)} />}

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-64 glass-card rounded-2xl shadow-float p-3 animate-pop space-y-3">
          {sceneFx.daytime && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                  <Icon.clock size={12} /> {t("Time of day")}
                </span>
                <span className="text-[12px] font-bold text-navy-900 tnum">{fmtHour(dayTime)}</span>
              </div>
              <input
                type="range"
                min={DAY_MIN}
                max={DAY_MAX}
                step={0.25}
                value={dayTime}
                onChange={(e) => setDayTime(parseFloat(e.target.value))}
                aria-label={t("Time of day")}
                className="demo-range w-full"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400 mt-0.5">
                <span className="tnum">{fmtHour(DAY_MIN)}</span>
                <span>{t("golden hour")} ≈ 19:30</span>
                <span className="tnum">{fmtHour(DAY_MAX)}</span>
              </div>
            </div>
          )}

          {sceneFx.weather && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Icon.cloud size={12} /> {t("Weather")}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {WEATHER_KINDS.map((k) => {
                  const P = WEATHER_DEMO[k];
                  const PI = Icon[P.icon] || Icon.sun;
                  const active = k === weather;
                  return (
                    <button
                      key={k}
                      onClick={() => setWeather(k)}
                      aria-pressed={active}
                      className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-semibold ring-1 transition ${
                        active ? "bg-navy-900 text-white ring-navy-900" : "bg-white/70 text-navy-900 ring-slate-200 hover:ring-teal-400"
                      }`}
                    >
                      <PI size={14} className={active ? "" : "text-teal-600"} />
                      <span className="flex-1 leading-tight">{t(P.label)}</span>
                      <span className={`tnum text-[10.5px] ${active ? "text-white/70" : "text-slate-500"}`}>{P.tempC}°</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-500 leading-snug border-t border-slate-200/70 pt-2">
            {t("Demo only — drives the scene and hero, not a real forecast.")}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="relative glass rounded-xl pl-2.5 pr-3 py-2 flex items-center gap-2 text-[12px] font-semibold text-navy-900 shadow-float hover:bg-white/80 transition"
      >
        <WIcon size={14} className="text-teal-700" />
        <span className="tnum">{sceneFx.daytime ? fmtHour(dayTime) : t(wd.label)}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t("Demo")}</span>
        <Icon.chevD size={13} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}
