import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";
import { prefersReducedMotion } from "./motion";

/* ============================================================================
   fx — the GSAP layer for choreographed motion (hero entrance, the wizard's
   zone→sunbed zoom, fly-to-total, confirmation celebration).

   The hand-rolled helpers in motion.tsx stay for simple reveals/tweens; this
   module owns anything orchestrated (timelines, FLIP, physics). All motion
   here must be gated behind `motionOK()` — elements render in their final
   state and GSAP only *adds* movement, so reduced-motion users simply get the
   static layout.
   ============================================================================ */

gsap.registerPlugin(Flip, MotionPathPlugin, Physics2DPlugin);

export { gsap, Flip };

export const motionOK = () => !prefersReducedMotion();

/* Motion tokens — durations (s) and eases shared by every GSAP sequence. */
export const DUR = { xs: 0.18, sm: 0.3, md: 0.55, lg: 0.85 } as const;
export const EASE = {
  out: "power3.out",
  inOut: "power3.inOut",
  spring: "back.out(1.7)",
  pop: "back.out(2.2)",
} as const;

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

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

/* useCardTilt — Apple-Wallet-style 3D tilt: the card leans toward the cursor
   (max `maxDeg`) with a light sweep driven through the same --gx/--gy/--ga
   custom properties the .sheen overlays read. Pointer-fine only; the card
   renders flat for everyone else. Owns the element's transform. */
export function useCardTilt<T extends HTMLElement = HTMLElement>(maxDeg = 7) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !motionOK() || !window.matchMedia(FINE_POINTER).matches) return;
    gsap.set(el, { transformPerspective: 750 });
    const toRX = gsap.quickTo(el, "rotationX", { duration: 0.45, ease: "power2.out" });
    const toRY = gsap.quickTo(el, "rotationY", { duration: 0.45, ease: "power2.out" });
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      toRY((px - 0.5) * 2 * maxDeg);
      toRX(-(py - 0.5) * 2 * maxDeg);
      el.style.setProperty("--gx", `${e.clientX - r.left}px`);
      el.style.setProperty("--gy", `${e.clientY - r.top}px`);
      el.style.setProperty("--ga", "1");
    };
    const onLeave = () => {
      gsap.to(el, { rotationX: 0, rotationY: 0, duration: 0.7, ease: "elastic.out(1, 0.5)" });
      el.style.setProperty("--ga", "0");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(el);
    };
  }, [maxDeg]);
  return ref;
}

/* ---- Cross-screen FLIP hand-off ----
   Lets one screen capture an element's rect as it navigates away (stash) and
   the next screen morph its own counterpart from that rect (take) — e.g. the
   wizard's glass menu flying into the checkout summary panel. Entries expire
   quickly so an aborted navigation can never morph something much later. */
const flipStash = new Map<string, { state: ReturnType<typeof Flip.getState>; t: number }>();
export function stashFlip(key: string, selector: string) {
  if (!motionOK()) return;
  const els = document.querySelectorAll(selector);
  if (els.length) flipStash.set(key, { state: Flip.getState(els), t: Date.now() });
}
export function takeFlip(key: string) {
  const hit = flipStash.get(key);
  if (!hit) return null;
  // Deleted on a micro-delay, not synchronously: StrictMode's dev-only
  // mount→unmount→mount cycle re-runs the consuming effect immediately and
  // must still find the entry.
  setTimeout(() => flipStash.delete(key), 50);
  return Date.now() - hit.t < 1500 ? hit.state : null;
}

/* burstConfetti — a one-shot celebration burst (gold / teal / coral / white)
   launched from the centre of `from`, thrown with Physics2D and cleaned up
   automatically. Used by the booking confirmation. */
const CONFETTI_COLORS = ["#f2b705", "#ffc933", "#0d9488", "#2dd4bf", "#f1683c", "#ffffff"];
export function burstConfetti(from: HTMLElement, count = 26) {
  if (!motionOK()) return;
  const r = from.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const layer = document.createElement("div");
  layer.className = "fixed inset-0 z-[80] pointer-events-none";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    const sz = 5 + Math.random() * 6;
    s.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;border-radius:${Math.random() < 0.4 ? "50%" : "2px"};background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};`;
    layer.appendChild(s);
    gsap.to(s, {
      physics2D: {
        velocity: 260 + Math.random() * 320,
        angle: -90 + (Math.random() - 0.5) * 110,
        gravity: 820,
      },
      rotation: (Math.random() - 0.5) * 540,
      duration: 1.5 + Math.random() * 0.5,
      ease: "none",
    });
    gsap.to(s, { opacity: 0, duration: 0.45, delay: 1.15 + Math.random() * 0.5 });
  }
  gsap.delayedCall(2.3, () => layer.remove());
}
