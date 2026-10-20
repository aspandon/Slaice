import { useLayoutEffect, useRef, type RefObject } from "react";
import { prefersReducedMotion } from "./motion";
import { DUR, gsap } from "./fx";

/* The shoreline moving (Home ↔ Plan, AENR-823): the scene is drawn once at the new shoreline
   and its land layers slide there from the old one — a GSAP transform the compositor runs,
   instead of re-rendering and repainting the whole scene on each of ~45 frames. Each element is a
   full-scene layer (inset 0, the 1600 × 900 scene cover-fitted in it). Interrupted
   mid-slide, the next slide starts from where the land is. Reduced motion: it simply jumps. */
export function useShoreSlide(dy: number, refs: ReadonlyArray<RefObject<HTMLElement>>) {
  const prev = useRef(dy);
  const rest = useRef(0); // scene units still to travel when a slide was cut short
  useLayoutEffect(() => {
    const from = prev.current;
    prev.current = dy;
    const els = refs.map((r) => r.current).filter((e): e is HTMLElement => !!e);
    if (from === dy || !els.length || prefersReducedMotion()) return;
    const w = els[0].offsetWidth;
    const h = els[0].offsetHeight;
    const k = Math.max(w / 1600, h / 900) || 1; // px per scene unit (the SVG's "slice" fit)
    const start = from - dy + rest.current;
    rest.current = 0;
    const tw = gsap.fromTo(
      els,
      { y: start * k },
      {
        y: 0,
        duration: DUR.shore,
        ease: "power3.out",
        force3D: true,
        overwrite: true,
        clearProps: "transform",
      },
    );
    return () => {
      rest.current = Number(gsap.getProperty(els[0], "y")) / k;
      tw.kill();
      gsap.set(els, { clearProps: "transform" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable
  }, [dy]);
}
