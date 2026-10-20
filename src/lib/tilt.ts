import { useEffect } from "react";
import { gsap, motionOK } from "./fx";

/* ---------- Tilt the phone (AENR-792) ----------
   One listener for the customer surface writes two custom properties on <html>:
   --tilt-x / --tilt-y, each −1..1. CSS does the rest (index.css: .tilt-sea,
   .tilt-logo, .tilt-card, .foil), so a tilt never re-renders React.

   - Phones / coarse pointers: the device orientation, relative to how the guest
     held the phone when it started (beta/gamma, ±RANGE° = full scale).
   - Fine pointers: the cursor across the window — only the pass-card foil reads
     it there; the desktop backdrop keeps its own pointer parallax.

   iOS asks permission for motion sensors, and only from a tap: we ask once, on
   the guest's first tap, and a "no" simply leaves everything still. Off under
   reduced motion (CSS gates every rule too). */

const FINE = "(hover: hover) and (pointer: fine)";
/** Degrees away from the starting pose that reach the full ±1. */
const RANGE = 22;
/** Share of the gap the resting pose closes per reading: a new grip re-centres over ~8 s. */
const DRIFT = 0.002;
const clamp = gsap.utils.clamp(-1, 1);

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState | "granted" | "denied">;
};
// Once per page load: a remount (persona switch) never asks again.
let permission: "unknown" | "asking" | "granted" | "denied" = "unknown";

export function useTilt(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !motionOK()) return;
    const root = document.documentElement;
    const fine = window.matchMedia(FINE).matches;
    const v = { x: 0, y: 0 };
    const write = () => {
      root.style.setProperty("--tilt-x", v.x.toFixed(3));
      root.style.setProperty("--tilt-y", v.y.toFixed(3));
    };
    const ease = { duration: fine ? 0.6 : 0.4, ease: "power3.out", onUpdate: write };
    const toX = gsap.quickTo(v, "x", ease);
    const toY = gsap.quickTo(v, "y", ease);
    let last = { x: 0, y: 0 };
    const aim = (x: number, y: number) => {
      // Sensor noise below this would keep the ticker busy for nothing.
      if (Math.abs(x - last.x) < 0.004 && Math.abs(y - last.y) < 0.004) return;
      last = { x, y };
      toX(x);
      toY(y);
    };
    const offs: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(
      type: K,
      fn: (e: WindowEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      window.addEventListener(type, fn, opts);
      offs.push(() => window.removeEventListener(type, fn, opts));
    };

    if (fine) {
      on("pointermove", (e) => {
        if (e.pointerType === "mouse")
          aim(
            clamp((e.clientX / window.innerWidth) * 2 - 1),
            clamp((e.clientY / window.innerHeight) * 2 - 1),
          );
      });
      // The cursor left the window: the foil settles back to its resting place.
      on("pointerout", (e) => {
        if (!e.relatedTarget) aim(0, 0);
      });
    } else {
      let base: { g: number; b: number } | null = null;
      let angle = screen.orientation?.angle ?? 0;
      const onTilt = (e: DeviceOrientationEvent) => {
        if (e.beta == null || e.gamma == null) return;
        const a = screen.orientation?.angle ?? 0;
        if (a !== angle) {
          angle = a;
          base = null; // turned to landscape (or back): a new starting pose
        }
        // Screen axes, whichever way the phone is turned.
        const [g, b] =
          a === 90
            ? [e.beta, -e.gamma]
            : a === 270
              ? [-e.beta, e.gamma]
              : a === 180
                ? [-e.gamma, -e.beta]
                : [e.gamma, e.beta];
        if (!base) base = { g, b };
        base.g += (g - base.g) * DRIFT;
        base.b += (b - base.b) * DRIFT;
        aim(clamp((g - base.g) / RANGE), clamp((b - base.b) / RANGE));
      };
      const listen = () => on("deviceorientation", onTilt);
      const DOE = window.DeviceOrientationEvent as OrientationCtor | undefined;
      const ask = DOE?.requestPermission?.bind(DOE);
      if (!DOE) {
        // No sensor API: stay still.
      } else if (!ask || permission === "granted") {
        listen();
      } else if (permission === "unknown") {
        let alive = true;
        offs.push(() => (alive = false));
        // iOS: the prompt may only follow a tap — the guest's first one.
        on(
          "pointerup",
          () => {
            permission = "asking";
            ask()
              .then((r) => {
                permission = r === "granted" ? "granted" : "denied";
                if (alive && permission === "granted") listen();
              })
              .catch(() => (permission = "denied"));
          },
          { once: true },
        );
      }
    }

    return () => {
      offs.forEach((off) => off());
      gsap.killTweensOf(v);
      root.style.removeProperty("--tilt-x");
      root.style.removeProperty("--tilt-y");
    };
  }, [enabled]);
}
