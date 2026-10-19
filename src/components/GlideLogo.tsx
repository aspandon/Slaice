import { useLayoutEffect, useRef } from "react";
import { gsap, motionOK } from "../lib/fx";

/* The beach logo glides between the Home header and its place over the sea in the
   booking wizard (AENR-672), in step with the shoreline tween in CustomerBackdrop
   (780 ms, ease-out cubic). The two logos are separate elements, so each one,
   when it leaves, notes where it was; the one that arrives plays from there. */
type Spot = "home" | "wizard";
let leftAt: { spot: Spot; rect: DOMRect; at: number } | null = null;

export function GlideLogo({ spot, className }: { spot: Spot; className: string }) {
  const ref = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const mountedAt = performance.now();
    const from = leftAt;
    if (
      el &&
      from &&
      from.spot !== spot &&
      performance.now() - from.at < 1500 &&
      motionOK() &&
      !gsap.isTweening(el) &&
      !el.style.transform
    ) {
      const to = el.getBoundingClientRect();
      if (to.width > 0 && from.rect.width > 0) {
        leftAt = null;
        // Start where the old logo was at once, and move once the new page has settled
        // (the wizard's first render is heavy), like the shoreline does.
        gsap.set(el, {
          x: from.rect.left - to.left,
          y: from.rect.top - to.top,
          scale: from.rect.height / to.height,
          transformOrigin: "0 0",
        });
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            gsap.to(el, {
              x: 0,
              y: 0,
              scale: 1,
              duration: 0.78,
              ease: "power3.out",
              clearProps: "transform",
            }),
          ),
        );
      }
    }
    return () => {
      // Development re-runs effects right after mounting; that isn't the logo leaving.
      if (!el || performance.now() - mountedAt < 50) return;
      gsap.killTweensOf(el);
      const r = el.getBoundingClientRect();
      if (r.width > 0) leftAt = { spot, rect: r, at: performance.now() };
    };
  }, [spot]);
  return (
    <img
      ref={ref}
      src={`${import.meta.env.BASE_URL}tenant-logo.png`}
      alt="Ακτή του Ηλίου"
      className={className}
    />
  );
}
