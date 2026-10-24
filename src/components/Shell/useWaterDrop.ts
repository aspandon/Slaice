import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { gsap, motionOK, DUR, EASE } from "../../lib/fx";

/* ---------- Water-drop tab marker (AENR-TAB) ----------
   The customer's phone tab bar marks the active tab with a teal drop that
   flows to the next tab like liquid: it stretches toward the new tab (the
   leading edge races ahead, the tail stays behind and thins), lands squashed
   and settles round, while a small droplet trails behind and merges in.

   One absolutely-positioned marker per bar; GSAP owns its transform only
   (x / scaleX / scaleY — no layout properties). Its resting place is measured
   from the tab carrying `data-tab-on` (offsetLeft, so the bar's own slide-away
   transform doesn't skew it). First render, resize and reduced motion place it
   instantly; a new change interrupts a drop in flight from wherever it is.
   The active tab keeps its colour and aria-current — the drop only adds. */

/** Drop width in px — must match the marker's `w-7`. */
const W = 28;
/** Trailing droplet size in px — must match its `w-1.5`. */
const T = 6;

export function useWaterDrop(row: RefObject<HTMLElement>, active: string | null) {
  const drop = useRef<HTMLSpanElement>(null);
  const trail = useRef<HTMLSpanElement>(null);
  const ctx = useRef<gsap.Context | null>(null);
  const flow = useRef<gsap.core.Timeline | null>(null);
  // The marker element last placed — a freshly mounted one (persona switch)
  // has no position yet, so it is placed rather than flowed.
  const placed = useRef<HTMLSpanElement | null>(null);

  // The drop's resting x (its left edge in the row) under the active tab, or
  // null when no tab is active (a page outside the bar).
  const restX = () => {
    const tab = row.current?.querySelector<HTMLElement>("[data-tab-on]");
    return tab ? tab.offsetLeft + tab.offsetWidth / 2 - W / 2 : null;
  };

  // Jump straight to the resting state — no motion.
  const snap = () => {
    flow.current?.kill();
    flow.current = null;
    const x = restX();
    placed.current = drop.current;
    ctx.current?.add(() => {
      if (drop.current) gsap.set(drop.current, { x: x ?? 0, scaleX: 1, scaleY: 1, autoAlpha: x === null ? 0 : 1 });
      if (trail.current) gsap.set(trail.current, { autoAlpha: 0 });
    });
  };

  // One context for the bar's lifetime (reverted on unmount), so an
  // interrupted flow continues from the drop's live transform.
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    ctx.current = gsap.context(() => {}, el);
    snap();
    const ro = new ResizeObserver(() => snap());
    ro.observe(el);
    return () => {
      ro.disconnect();
      flow.current = null;
      ctx.current?.revert();
      ctx.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flow to the new tab. Skipped on mount (the effect above placed it).
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = drop.current;
    const x = restX();
    const visible = el !== null && el === placed.current && Number(gsap.getProperty(el, "autoAlpha")) > 0;
    if (!el || !ctx.current || x === null || !visible || !motionOK()) { snap(); return; }
    const from = Number(gsap.getProperty(el, "x"));
    const d = x - from;
    if (Math.abs(d) < 1) return;
    flow.current?.kill();
    // Stretch (~130ms) → arrive squashed (~110ms) → settle round (180ms): ~420ms.
    const stretch = DUR.page * 0.55;
    const travel = DUR.page * 0.45;
    ctx.current.add(() => {
      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      // Centre at the midpoint, length W + 0.7·|d|: the leading edge reaches
      // ~85% of the way while the tail still clings to the old tab.
      tl.to(el, { x: from + d / 2, scaleX: 1 + (Math.abs(d) / W) * 0.7, scaleY: 0.6, duration: stretch, ease: EASE.in })
        .to(el, { x, scaleX: 1.25, scaleY: 0.75, duration: travel, ease: EASE.out })
        .to(el, { scaleX: 1, scaleY: 1, duration: DUR.xs, ease: EASE.spring });
      if (trail.current) {
        tl.fromTo(trail.current,
          { x: from + W / 2 - T / 2, scale: 1, autoAlpha: 1 },
          { x: x + W / 2 - T / 2, scale: 0.3, autoAlpha: 0, duration: stretch + travel + DUR.xs * 0.4, ease: EASE.inOut },
          DUR.xs * 0.25);
      }
      flow.current = tl;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return { drop, trail };
}
