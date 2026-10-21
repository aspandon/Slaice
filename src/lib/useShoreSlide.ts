import { useLayoutEffect, useRef, type RefObject } from "react";
import { prefersReducedMotion } from "./motion";
import { DUR } from "./fx";
import { EASING } from "./motionTokens";
import { markBusy } from "./busy";

/* The shoreline moving (Home ↔ Plan, AENR-823): the scene is drawn once at the new shoreline
   and its land layers slide there from the old one, instead of re-rendering and repainting the
   whole scene on each of ~45 frames. Each element is a full-scene layer (inset 0, the 1600 × 900
   scene cover-fitted in it). Interrupted mid-slide, the next slide starts from where the land is.
   Reduced motion: it simply jumps.

   A Web Animation on transform (AENR-864): the browser's compositor runs it, so the sand keeps
   sliding while the Plan screen is being built (a GSAP tween waited for the page's JavaScript).
   The layers stay on the GPU until the browser is idle after the slide, so the slide's last
   frame never carries a repaint (AENR-865). */
export function useShoreSlide(dy: number, refs: ReadonlyArray<RefObject<HTMLElement>>) {
  const prev = useRef(dy);
  const running = useRef<Animation[]>([]);
  useLayoutEffect(() => {
    const from = prev.current;
    prev.current = dy;
    const els = refs.map((r) => r.current).filter((e): e is HTMLElement => !!e);
    if (from === dy || !els.length || prefersReducedMotion()) return;
    const w = els[0].offsetWidth;
    const h = els[0].offsetHeight;
    const k = Math.max(w / 1600, h / 900) || 1; // px per scene unit (the SVG's "slice" fit)
    // Cut short: carry on from where the land is now (its animated offset, in scene units).
    const now = running.current.length ? new DOMMatrixReadOnly(getComputedStyle(els[0]).transform).m42 / k : 0;
    running.current.forEach((a) => a.cancel());
    const start = (from - dy + now) * k;
    markBusy(DUR.shore * 1000, true);
    const anims = els.map((el) => {
      el.style.willChange = "transform";
      return el.animate([{ transform: `translate3d(0, ${start.toFixed(1)}px, 0)` }, { transform: "translate3d(0, 0, 0)" }], {
        duration: DUR.shore * 1000,
        easing: EASING.out.css,
      });
    });
    running.current = anims;
    void Promise.all(anims.map((a) => a.finished))
      .then(() => {
        if (running.current !== anims) return;
        running.current = [];
        const release = () => {
          if (!running.current.length) els.forEach((el) => (el.style.willChange = ""));
        };
        if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(release, { timeout: 1500 });
        else setTimeout(release, 200);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable
  }, [dy]);
}
