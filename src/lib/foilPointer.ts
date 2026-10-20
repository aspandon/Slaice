import { useEffect } from "react";
import { gsap, motionOK } from "./fx";

/* ---------- The pass card foil follows the pointer (AENR-792, AENR-848) ----------
   On computers the VIP / Season cards' foil shimmer (index.css: .foil) slides with the cursor
   across the window. One listener writes --pointer-x / --pointer-y (−1..1) on the .foil elements
   only (registered, not inherited — a move restyles the foil alone), eased by GSAP, so it never
   re-renders React. Phones and touch screens: nothing — the phone tilt that used to move the
   beach, the logo and the cards was removed (AENR-848). Off under reduced motion. */
const FINE = "(hover: hover) and (pointer: fine)";
const clamp = gsap.utils.clamp(-1, 1);

export function useFoilPointer(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !motionOK() || !window.matchMedia(FINE).matches) return;
    const v = { x: 0, y: 0 };
    const write = () => {
      for (const el of document.querySelectorAll<HTMLElement>(".foil")) {
        el.style.setProperty("--pointer-x", v.x.toFixed(3));
        el.style.setProperty("--pointer-y", v.y.toFixed(3));
      }
    };
    const ease = { duration: 0.6, ease: "power3.out", onUpdate: write };
    const toX = gsap.quickTo(v, "x", ease);
    const toY = gsap.quickTo(v, "y", ease);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      toX(clamp((e.clientX / window.innerWidth) * 2 - 1));
      toY(clamp((e.clientY / window.innerHeight) * 2 - 1));
    };
    // The cursor left the window: the foil settles back to its resting place.
    const onOut = (e: PointerEvent) => {
      if (e.relatedTarget) return;
      toX(0);
      toY(0);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onOut);
      gsap.killTweensOf(v);
      for (const el of document.querySelectorAll<HTMLElement>(".foil")) {
        el.style.removeProperty("--pointer-x");
        el.style.removeProperty("--pointer-y");
      }
    };
  }, [enabled]);
}
