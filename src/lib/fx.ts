import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { prefersReducedMotion } from "./motion";
import { DURATION, EASING, DISTANCE } from "./motionTokens";

/* ============================================================================
   fx — the GSAP layer for choreographed motion (hero entrance, the wizard's
   zone→sunbed zoom, fly-to-total, confirmation celebration).

   The hand-rolled helpers in motion.tsx stay for simple reveals/tweens; this
   module owns anything orchestrated (timelines, FLIP, physics). All motion
   here must be gated behind `motionOK()` — elements render in their final
   state and GSAP only *adds* movement, so reduced-motion users simply get the
   static layout.

   This module is on the eager path (the guest backdrop uses it), so it holds
   only GSAP's core. Flip, MotionPath and Physics2D — the FLIP hand-off, the
   fly-to-total and the confetti — live in fxFlip.ts, which the lazy screens
   import (AENR-839).
   ============================================================================ */

export { gsap };

export const motionOK = () => !prefersReducedMotion();

/* Motion tokens for GSAP — seconds and ease names from the shared token module
   (src/lib/motionTokens.ts, AENR-743), so GSAP and the Tailwind animations move
   alike. */
const s = (k: keyof typeof DURATION) => DURATION[k] / 1000;
export const DUR = { xs: s("fast"), page: s("page"), sm: s("base"), md: s("slow"), lg: s("slower"), camera: s("camera"), shore: s("shore") } as const;
export const EASE = {
  out: EASING.out.gsap,
  in: EASING.in.gsap,
  inOut: EASING.standard.gsap,
  spring: EASING.spring.gsap,
  pop: EASING.pop.gsap,
} as const;
export { DISTANCE };

/** A mouse or trackpad that can hover — the only pointers hover effects run for. */
export const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/* useMagnetic — the element leans toward the cursor while hovered and springs
   back on leave. Pointer-fine only; a no-op on touch and under reduced motion.
   Owns the element's transform — don't combine with CSS transform transitions. */
export function useMagnetic<T extends HTMLElement = HTMLElement>(strength = 0.25, max = 7) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !motionOK() || !window.matchMedia(FINE_POINTER).matches) return;
    const toX = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const toY = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * strength;
      const dy = (e.clientY - (r.top + r.height / 2)) * strength;
      toX(Math.max(-max, Math.min(max, dx)));
      toY(Math.max(-max, Math.min(max, dy)));
    };
    const onLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.45)" });
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(el);
    };
  }, [strength, max]);
  return ref;
}

