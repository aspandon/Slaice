import { useEffect, useState } from "react";
import { useT } from "../app/store";
import { seaStyleOf } from "../domain/features";
import { isBusy } from "../lib/busy";
import { Icon } from "../lib/icons";
import { useLiteScene } from "../lib/motion";
import { useDemoFlag } from "../lib/useDemoFlag";
import { useTenantFeatures } from "../lib/useFeatures";

/* ============ Performance overlay (AENR-842) ============
   Demo menu › Performance overlay: a small live readout in the corner, so the owner can see what a
   page change costs on their own device — frames per second, how long the last and the slowest
   tap took to show a result (the browser's Event Timing, the same measure as INP), the long tasks
   that blocked the page in the last 10 s, and which sea is running (and whether it is holding still
   for a page change). Its own lazy chunk; switched off it loads and costs nothing. */

interface Stats {
  fps: number;
  lastTap: number | null;
  worstTap: number | null;
  longTasks: number;
  blocked: number;
  heap: number | null;
  held: boolean;
}

const WINDOW_MS = 10_000;

export default function PerfOverlay() {
  const t = useT();
  const [, setOn] = useDemoFlag("perf");
  const { tenant } = useTenantFeatures();
  const lite = useLiteScene();
  const sea = seaStyleOf(tenant, lite ? "mobile" : "desktop");
  const [s, setS] = useState<Stats>({
    fps: 0,
    lastTap: null,
    worstTap: null,
    longTasks: 0,
    blocked: 0,
    heap: null,
    held: false,
  });

  useEffect(() => {
    let frames = 0;
    let raf = 0;
    const count = () => {
      frames++;
      raf = requestAnimationFrame(count);
    };
    raf = requestAnimationFrame(count);

    // Taps: one entry per event; an interaction's time is its longest event (as INP counts it).
    let lastTap: number | null = null;
    let worstTap: number | null = null;
    const taps = new Map<number, number>();
    const obs: PerformanceObserver[] = [];
    const watch = (
      type: string,
      cb: (list: PerformanceObserverEntryList) => void,
      opts: Record<string, unknown> = {},
    ) => {
      if (!PerformanceObserver.supportedEntryTypes?.includes(type)) return;
      const o = new PerformanceObserver(cb);
      o.observe({ type, buffered: true, ...opts } as PerformanceObserverInit);
      obs.push(o);
    };
    watch(
      "event",
      (list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { interactionId?: number })[]) {
          if (!e.interactionId) continue;
          const d = Math.max(taps.get(e.interactionId) ?? 0, e.duration);
          taps.set(e.interactionId, d);
          lastTap = d;
          worstTap = Math.max(worstTap ?? 0, d);
        }
      },
      { durationThreshold: 16 },
    );
    const longs: { at: number; d: number }[] = [];
    watch("longtask", (list) => {
      for (const e of list.getEntries()) longs.push({ at: e.startTime, d: e.duration });
    });

    let t0 = performance.now();
    const tick = window.setInterval(() => {
      const now = performance.now();
      const fps = Math.round((frames * 1000) / (now - t0));
      frames = 0;
      t0 = now;
      while (longs.length && longs[0].at < now - WINDOW_MS) longs.shift();
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      setS({
        fps,
        lastTap,
        worstTap,
        longTasks: longs.length,
        blocked: Math.round(longs.reduce((a, l) => a + Math.max(0, l.d - 50), 0)),
        heap: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
        held: isBusy(now),
      });
    }, 500);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(tick);
      obs.forEach((o) => o.disconnect());
    };
  }, []);

  // Google's Web Vitals bands for a tap: good ≤ 200 ms, poor > 500 ms.
  const tone = (ms: number | null) =>
    ms == null
      ? "text-white/60"
      : ms <= 200
        ? "text-emerald-300"
        : ms <= 500
          ? "text-amber-300"
          : "text-rose-300";
  const ms = (v: number | null) => (v == null ? "—" : `${Math.round(v)} ms`);
  const row = (label: string, value: string, cls = "text-white") => (
    <div className="flex justify-between gap-4">
      <dt className="text-white/70">{label}</dt>
      <dd className={`tabular-nums font-semibold ${cls}`}>{value}</dd>
    </div>
  );
  return (
    <section
      aria-label={t("Performance overlay")}
      className="fixed left-2 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-3 z-[70] w-52 rounded-xl bg-navy-900/90 text-white text-[11px] font-mono shadow-float p-2.5 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="font-semibold uppercase tracking-wider text-[10px] text-teal-300">
          {t("Performance")}
        </h2>
        <button
          type="button"
          onClick={() => setOn(false)}
          aria-label={t("Close the performance overlay")}
          className="-m-1 w-7 h-7 grid place-items-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          <Icon.x size={13} />
        </button>
      </div>
      <dl className="grid gap-0.5">
        {row(
          t("Frames / s"),
          String(s.fps),
          s.fps >= 50 ? "text-emerald-300" : s.fps >= 30 ? "text-amber-300" : "text-rose-300",
        )}
        {row(t("Last tap"), ms(s.lastTap), tone(s.lastTap))}
        {row(t("Slowest tap"), ms(s.worstTap), tone(s.worstTap))}
        {row(
          t("Long tasks (10 s)"),
          `${s.longTasks} · ${s.blocked} ms`,
          s.blocked > 300 ? "text-amber-300" : "text-white",
        )}
        {s.heap != null && row(t("JS memory"), `${s.heap} MB`)}
        {row(t("Sea"), `${sea}${s.held ? ` · ${t("held")}` : ""}`)}
      </dl>
    </section>
  );
}
