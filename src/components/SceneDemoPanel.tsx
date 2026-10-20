import { useState, type KeyboardEvent } from "react";
import { Icon } from "../lib/icons";
import { DAY_MAX, DAY_MIN, fmtHour, WEATHER_DEMO, WEATHER_KINDS } from "../data/beach";
import { useApp, useT } from "../app/store";
import { NotMvpBadge } from "./ui";
import { useGuestScene } from "../lib/useGuestScene";
import { useTenantFeatures } from "../lib/useFeatures";
import { BLENDER_RES, blenderResOf, SEA_DEVICES, SEA_STYLES, seaStyleOf, type SeaDevice } from "../domain/features";

/* ============================================================================
   Scene demo controls — the bottom-left counterpart to the persona switcher's
   "demo" pill on the right: a collapsed chip that opens a small panel with the
   scene clock (a slider scrubbing dawn → dusk) and the four weather presets.
   Pure demo affordances — there is no real forecast; both sections follow the
   admin's Atmosphere switches and the whole pill disappears when both are off.
   ============================================================================ */
export function SceneDemoPanel() {
  const { weather, dayTime, sceneFx, showPreviews } = useApp();
  const { live } = useGuestScene();
  const t = useT();
  const [open, setOpen] = useState(false);
  // The atmosphere is a roadmap feature (FUTURE): its demo pill goes with previews off (AENR-691),
  // and with the tenant's live weather and time of day off (AENR-737) — the scene is a fixed sunny 11:00.
  if (!live || !showPreviews || (!sceneFx.weather && !sceneFx.daytime)) return null;
  const wd = WEATHER_DEMO[weather];
  const WIcon = (sceneFx.weather ? Icon[wd.icon] : Icon.sun) || Icon.sun;

  return (
    // Phones get these controls inside the Demo menu in the top bar (AENR-575) — nothing floats over content.
    <div className="hidden md:block fixed left-5 z-40 bottom-4">
      {/* Click-away backdrop while open. */}
      {open && <button aria-label={t("Close")} tabIndex={-1} className="fixed inset-0 cursor-default" onClick={() => setOpen(false)} />}

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-64 glass-card rounded-2xl shadow-float p-3 animate-pop space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("Live sea & weather")}</span>
            <NotMvpBadge />
          </div>
          <SceneControls />

        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="relative glass rounded-xl pl-2.5 pr-3 py-2 flex items-center gap-2 text-[12px] font-semibold text-navy-900 shadow-float hover:bg-white/80 transition"
      >
        <WIcon size={14} className="text-teal-700" />
        <span className="tnum">{sceneFx.daytime ? fmtHour(dayTime) : t(wd.label)}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{t("Demo")}</span>
        <Icon.chevD size={13} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}

/** The scene clock and weather presets — in the floating panel (desktop) and the Demo menu (phones). */
export function SceneControls() {
  const { weather, setWeather, dayTime, setDayTime, sceneFx } = useApp();
  const t = useT();
  return (
    <div className="space-y-3">
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
          <div className="flex justify-between text-[9.5px] text-slate-500 mt-0.5">
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
  );
}

/** Two demo sliders for the guest Demo menu (AENR-825): the weather and the time of day, so a
 *  demonstration can walk the beach through a day — the sea, its light and the weather layer follow
 *  at once (they glide). Keys stay with the sliders, not the menu's own arrow-key navigation. */
export function DemoSceneSliders() {
  const { weather, setWeather, dayTime, setDayTime } = useApp();
  const t = useT();
  const wi = Math.max(0, WEATHER_KINDS.indexOf(weather));
  const W = WEATHER_DEMO[weather];
  const WI = Icon[W.icon] || Icon.sun;
  const keep = (e: KeyboardEvent) => e.stopPropagation();
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="demo-weather" className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <Icon.cloud size={12} aria-hidden /> {t("Weather")}
          </label>
          <span className="flex items-center gap-1 text-[12px] font-bold text-navy-900">
            <WI size={13} aria-hidden className="text-teal-600" /> {t(W.label)}
          </span>
        </div>
        <input
          id="demo-weather"
          type="range"
          min={0}
          max={WEATHER_KINDS.length - 1}
          step={1}
          value={wi}
          onChange={(e) => setWeather(WEATHER_KINDS[Number(e.target.value)])}
          onKeyDown={keep}
          aria-valuetext={t(W.label)}
          className="demo-range w-full"
        />
        <div aria-hidden className="mt-0.5 flex justify-between text-[9.5px] text-slate-500">
          {WEATHER_KINDS.map((k) => (
            <span key={k}>{t(WEATHER_DEMO[k].label)}</span>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="demo-daytime" className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <Icon.clock size={12} aria-hidden /> {t("Time of day")}
          </label>
          <span className="text-[12px] font-bold text-navy-900 tnum">{fmtHour(dayTime)}</span>
        </div>
        <input
          id="demo-daytime"
          type="range"
          min={DAY_MIN}
          max={DAY_MAX}
          step={0.25}
          value={dayTime}
          onChange={(e) => setDayTime(parseFloat(e.target.value))}
          onKeyDown={keep}
          aria-valuetext={fmtHour(dayTime)}
          className="demo-range w-full"
        />
        <div aria-hidden className="mt-0.5 flex justify-between text-[9.5px] text-slate-500">
          <span className="tnum">{fmtHour(DAY_MIN)}</span>
          <span>{t("sunrise")} ≈ 06:15</span>
          <span>{t("sunset")} ≈ 20:50</span>
          <span className="tnum">{fmtHour(DAY_MAX)}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Guest sea sliders (AENR-855) ----------
   The Platform › tenant › Guest sea choice, at the end of the guest Demo menu: a slider per
   device through the four seas, and under a Blender sea a slider through its published
   resolutions. They write the site tenant's own setting, so the Platform page always agrees. */
const RES_READY = BLENDER_RES.filter((r) => r.ready);

export function DemoSeaSliders() {
  const { setPlatform } = useApp();
  const { tenant } = useTenantFeatures();
  const t = useT();
  const keep = (e: KeyboardEvent) => e.stopPropagation();
  // The device this screen is (the guest backdrop's own line, 1024 px).
  const here: SeaDevice = window.matchMedia("(min-width: 1024px)").matches ? "desktop" : "mobile";
  const edit = (fn: (sea: NonNullable<NonNullable<typeof tenant>["sea"]>) => NonNullable<typeof tenant>["sea"]) =>
    setPlatform((p) => ({ ...p, tenants: p.tenants.map((x) => (x.id === p.siteTenant ? { ...x, sea: fn(x.sea ?? {}) } : x)) }));
  return (
    <div className="space-y-3">
      {SEA_DEVICES.map((d) => {
        const style = seaStyleOf(tenant, d.id);
        const si = Math.max(0, SEA_STYLES.findIndex((x) => x.id === style));
        const res = blenderResOf(tenant, d.id);
        const ri = Math.max(0, RES_READY.findIndex((x) => x.id === res));
        const sea = SEA_STYLES[si];
        const id = `demo-sea-${d.id}`;
        return (
          <div key={d.id}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor={id} className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {d.id === "desktop" ? <Icon.monitor size={12} aria-hidden /> : <Icon.phone size={12} aria-hidden />} {t(d.label)}
                {d.id === here && <span className="whitespace-nowrap rounded bg-teal-50 px-1 py-px text-[9.5px] normal-case tracking-normal text-teal-700">{t("this screen")}</span>}
              </label>
              <span className="text-[12px] font-bold text-navy-900">{t(sea.label)}</span>
            </div>
            <input
              id={id}
              type="range"
              min={0}
              max={SEA_STYLES.length - 1}
              step={1}
              value={si}
              onChange={(e) => {
                const next = SEA_STYLES[Number(e.target.value)].id;
                edit((s) => ({ ...s, [d.id]: next }));
              }}
              onKeyDown={keep}
              aria-valuetext={t(sea.label)}
              className="demo-range demo-range-plain w-full"
            />
            <div aria-hidden className="mt-0.5 flex justify-between text-[9.5px] text-slate-500">
              {SEA_STYLES.map((x) => (
                <span key={x.id}>{t(x.label)}</span>
              ))}
            </div>
            {style === "blender" && RES_READY.length > 1 && (
              <div className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label htmlFor={`${id}-res`} className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
                    {t("Resolution")}
                  </label>
                  <span className="text-[11.5px] font-bold text-navy-900 tnum">
                    {t(RES_READY[ri].label)} · {RES_READY[ri][d.id].px}
                  </span>
                </div>
                <input
                  id={`${id}-res`}
                  type="range"
                  min={0}
                  max={RES_READY.length - 1}
                  step={1}
                  value={ri}
                  onChange={(e) => {
                    const next = RES_READY[Number(e.target.value)].id;
                    edit((s) => ({ ...s, blenderRes: { ...s.blenderRes, [d.id]: next } }));
                  }}
                  onKeyDown={keep}
                  aria-valuetext={`${t(RES_READY[ri].label)}, ${RES_READY[ri][d.id].px} px, ${RES_READY[ri][d.id].mb}`}
                  className="demo-range demo-range-plain w-full"
                />
                <div aria-hidden className="mt-0.5 flex justify-between text-[9.5px] text-slate-500">
                  {RES_READY.map((r) => (
                    <span key={r.id}>{t(r.label)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
