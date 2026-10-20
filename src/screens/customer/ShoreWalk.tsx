import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { Icon } from "../../lib/icons";
import { EASE, motionOK } from "../../lib/fx";
import { useMoney, useT } from "../../app/store";
import type { SunbedSlot } from "../../domain/types";

gsap.registerPlugin(Draggable, InertiaPlugin);

/* ---------- Walk along the shore (AENR-788) ----------
   Choosing a zone by walking the beach: the zones stand along a track the guest drags
   sideways with momentum; it settles with one zone in the middle — bigger, its sets and
   free count in full — and the planes around it move at their own speed (the far sea
   slowest, the foam line, the near sand fastest), so the walk has depth. ← / → buttons and
   the arrow keys walk one zone; tapping a zone opens it. The tenant switch (Platform ›
   tenant › Guest site › "Walk along the shore") turns it on; off, the wizard keeps its
   zone cards. Reduced motion: no momentum or parallax, the same walk in steps. */

export interface ShoreZone {
  id: string;
  name: string;
  color: string;
  slots: SunbedSlot[];
  picked: number;
}

const DOT: Record<string, string> = { a: "bg-teal-500", h: "bg-amber-400", u: "bg-slate-300" };
// Each plane's speed relative to the zones (1): far behind moves less, the near sand more.
const DEPTH = { sea: 0.25, foam: 0.6, near: 1.35 } as const;

export function ShoreWalk({
  zones,
  selectedId,
  onPick,
  wide,
}: {
  zones: ShoreZone[];
  selectedId: string;
  onPick: (id: string) => void;
  /** Desktop: bigger plots, and the panel on the right leaves the left part of the beach. */
  wide: boolean;
}) {
  const t = useT();
  const money = useMoney();
  const box = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const sea = useRef<HTMLDivElement>(null);
  const foam = useRef<HTMLDivElement>(null);
  const near = useRef<HTMLDivElement>(null);
  const drag = useRef<Draggable | null>(null);
  const start = Math.max(
    0,
    zones.findIndex((z) => z.id === selectedId),
  );
  const [at, setAt] = useState(start);
  const atRef = useRef(at);
  atRef.current = at;
  const W = wide ? 230 : 172; // a plot
  const GAP = wide ? 28 : 18;
  const STEP = W + GAP;

  // Where the track sits for zone i to be centred in the box.
  const xFor = (i: number) => {
    const bw = box.current?.offsetWidth ?? 0;
    return bw / 2 - W / 2 - i * STEP;
  };
  // Planes and plot emphasis follow the track's x on every frame of a drag or a throw.
  const follow = () => {
    const el = track.current;
    if (!el) return;
    const x = Number(gsap.getProperty(el, "x"));
    const rel = x - xFor(0);
    if (motionOK()) {
      gsap.set(sea.current, { x: rel * DEPTH.sea });
      gsap.set(foam.current, { x: rel * DEPTH.foam });
      gsap.set(near.current, { x: rel * DEPTH.near });
    }
    const centre = -rel / STEP;
    el.querySelectorAll<HTMLElement>("[data-plot]").forEach((p, i) => {
      const d = Math.min(1, Math.abs(i - centre));
      gsap.set(p, { scale: 1 - d * 0.14, opacity: 1 - d * 0.35 });
    });
  };
  const settle = () => {
    const el = track.current;
    if (!el) return;
    const i = Math.round((xFor(0) - Number(gsap.getProperty(el, "x"))) / STEP);
    setAt(Math.max(0, Math.min(zones.length - 1, i)));
  };
  const walkTo = (i: number) => {
    const j = Math.max(0, Math.min(zones.length - 1, i));
    setAt(j);
    const el = track.current;
    if (!el) return;
    if (motionOK())
      gsap.to(el, {
        x: xFor(j),
        duration: 0.55,
        ease: EASE.out,
        overwrite: "auto",
        onUpdate: follow,
      });
    else {
      gsap.set(el, { x: xFor(j) });
      follow();
    }
  };

  useLayoutEffect(() => {
    const el = track.current;
    const b = box.current;
    if (!el || !b) return;
    gsap.set(el, { x: xFor(start) });
    follow();
    const [d] = Draggable.create(el, {
      type: "x",
      inertia: motionOK(),
      edgeResistance: 0.8,
      dragClickables: true,
      minimumMovement: 6,
      allowNativeTouchScrolling: true, // vertical swipes still scroll the page
      bounds: { minX: xFor(zones.length - 1), maxX: xFor(0) },
      snap: {
        x: (v: number) =>
          xFor(Math.max(0, Math.min(zones.length - 1, Math.round((xFor(0) - v) / STEP)))),
      },
      onDrag: follow,
      onThrowUpdate: follow,
      onDragEnd: settle,
      onThrowComplete: settle,
    });
    drag.current = d;
    // Keep the centred zone in the middle when the box resizes.
    const ro = new ResizeObserver(() => {
      d.applyBounds({ minX: xFor(zones.length - 1), maxX: xFor(0) });
      gsap.set(el, { x: xFor(atRef.current) });
      follow();
    });
    ro.observe(b);
    return () => {
      ro.disconnect();
      d.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set up once per zone list
  }, [zones.length, wide]);

  const cur = zones[at];
  const curFree = cur ? cur.slots.filter((s) => s.state === "a").length : 0;
  return (
    <section
      aria-roledescription={t("zone picker")}
      aria-label={t("Walk along the shore to choose a zone")}
      className="relative pointer-events-auto select-none animate-fade-up"
    >
      <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
        <span className="text-guest-caption font-semibold text-navy-900/80 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
          {t("Walk along the shore · tap a zone")}
        </span>
        <span className="flex gap-1.5">
          <button
            type="button"
            onClick={() => walkTo(at - 1)}
            disabled={at === 0}
            aria-label={t("Previous zone")}
            className="w-9 h-9 rounded-full glass-card grid place-items-center text-navy-900 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Icon.arrowL size={15} />
          </button>
          <button
            type="button"
            onClick={() => walkTo(at + 1)}
            disabled={at === zones.length - 1}
            aria-label={t("Next zone")}
            className="w-9 h-9 rounded-full glass-card grid place-items-center text-navy-900 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Icon.arrowR size={15} />
          </button>
        </span>
      </div>

      <div
        ref={box}
        className={`relative overflow-hidden rounded-3xl ${wide ? "h-[300px]" : "h-[248px]"} -mx-1`}
      >
        {/* Far plane: the sea with its crests. */}
        <div
          aria-hidden
          className="absolute inset-x-[-60%] top-0 h-[34%] bg-gradient-to-b from-sky-300/70 to-cyan-200/60"
        >
          <div ref={sea} className="absolute inset-0">
            {Array.from({ length: 28 }, (_, i) => (
              <span
                key={i}
                className="absolute h-[2px] w-10 rounded-full bg-white/70"
                style={{ left: `${(i * 37) % 100}%`, top: `${18 + ((i * 23) % 60)}%` }}
              />
            ))}
          </div>
        </div>
        {/* Middle plane: the foam line where the sea meets the sand. */}
        <div aria-hidden className="absolute inset-x-[-60%] top-[30%] h-[10%]">
          <div
            ref={foam}
            className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_20px_0,rgba(255,255,255,0.85)_0_10px,transparent_11px_40px)] opacity-80"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-x-0 top-[36%] bottom-0 bg-gradient-to-b from-[#f2e2c2] to-[#ecd5a9]"
        />

        {/* The zones, walking with the drag. */}
        <div
          ref={track}
          className="absolute top-[14%] left-0 flex items-start touch-pan-y cursor-grab active:cursor-grabbing"
          style={{ gap: GAP }}
        >
          {zones.map((z, i) => {
            const free = z.slots.filter((s) => s.state === "a");
            const from = free.length ? Math.min(...free.map((s) => s.price)) : null;
            const centred = i === at;
            return (
              <button
                key={z.id}
                type="button"
                data-plot=""
                onClick={() => (centred ? onPick(z.id) : walkTo(i))}
                // ← / → walk one zone and keep the focus on the zone now in the middle.
                onKeyDown={(e) => {
                  const k = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                  if (!k) return;
                  e.preventDefault();
                  const j = Math.max(0, Math.min(zones.length - 1, i + k));
                  walkTo(j);
                  track.current
                    ?.querySelectorAll<HTMLElement>("[data-plot]")
                    [j]?.focus({ preventScroll: true });
                }}
                aria-label={`${z.name} — ${free.length} ${t("free")}${from !== null ? `, ${t("from")} ${money(from)}` : ""}${z.picked ? `, ${z.picked} ${t("picked")}` : ""}${centred ? `. ${t("Open this zone")}` : ""}`}
                aria-current={centred ? "true" : undefined}
                className={`relative shrink-0 rounded-3xl p-3 text-left origin-bottom focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${centred ? "bg-white/90 ring-2 ring-teal-600 shadow-lift" : "bg-white/65 ring-1 ring-white/70 shadow-soft"}`}
                style={{ width: W }}
              >
                <span
                  aria-hidden
                  className={`relative block rounded-2xl bg-[#f3e3c4] ${wide ? "h-[118px]" : "h-[92px]"}`}
                >
                  {z.slots.map((s) => (
                    <span
                      key={s.id}
                      className={`absolute w-[8px] h-[8px] rounded-[3px] -translate-x-1/2 -translate-y-1/2 ${DOT[s.state] ?? DOT.u}`}
                      style={{ left: `${s.x}%`, top: `${s.y}%` }}
                    />
                  ))}
                </span>
                <span className="mt-2 flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: z.color }}
                  />
                  <span className="font-display font-bold text-guest-body text-navy-900 truncate">
                    {z.name}
                  </span>
                </span>
                <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-guest-caption font-semibold text-navy-900 ring-1 ring-slate-200 tnum">
                  {free.length
                    ? `${free.length} ${t("free")}${from !== null ? ` · ${t("from")} ${money(from)}` : ""}`
                    : t("Full")}
                </span>
                {z.picked > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-6 h-6 px-1.5 rounded-full bg-coral-700 text-white text-guest-caption font-bold grid place-items-center ring-2 ring-white">
                    {z.picked}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Near plane: sand ripples passing in front, fastest of all. */}
        <div aria-hidden className="absolute inset-x-[-80%] bottom-0 h-[14%] pointer-events-none">
          <div ref={near} className="absolute inset-0">
            {Array.from({ length: 24 }, (_, i) => (
              <span
                key={i}
                className="absolute h-[3px] w-14 rounded-full bg-[#d9bd8a]/60"
                style={{ left: `${(i * 29) % 100}%`, top: `${30 + ((i * 41) % 50)}%` }}
              />
            ))}
          </div>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {cur ? `${cur.name}, ${curFree} ${t("free")}` : ""}
      </p>
    </section>
  );
}
