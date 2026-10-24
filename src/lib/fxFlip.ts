import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";
import { motionOK } from "./fx";

/* ============================================================================
   fxFlip — the choreography plugins of the fx layer (Flip, MotionPath, Physics2D).

   Split from fx.ts (AENR-839) so the eager guest shell — the backdrop, the
   magnetic and tilt hovers — pulls only GSAP's core. The screens that zoom, fly
   or hand an element over (the booking wizard, checkout, the live beach) import
   this module, so the plugins download with their lazy chunks; importing it
   registers them before any of those screens can run a tween.
   ============================================================================ */

gsap.registerPlugin(Flip, MotionPathPlugin, Physics2DPlugin);

export { Flip };

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
