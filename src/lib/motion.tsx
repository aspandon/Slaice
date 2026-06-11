import { useEffect, useRef, useState } from "react";
import type { ElementType, ReactNode, Ref } from "react";

// Honour the OS "reduce motion" setting everywhere our JS-driven motion runs.
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* The full-screen beach backdrop only goes still for users who asked for
   reduced motion. Phones get the same live scene as desktop — WebGL sea,
   weather, ambient sky, the shoreline tween — since modern mobile GPUs handle
   one DPR-capped fullscreen shader comfortably and the canvas falls back to
   the static SVG wherever WebGL2 is missing. The one genuinely jank-prone
   piece on touch devices, scroll-driven parallax, stays desktop-only (see
   useParallax). */
export const staticBackdrop = (): boolean => prefersReducedMotion();

/* useReveal — scroll-driven entrance.
   Attach the returned ref to an element that has the `.reveal` class; when it
   scrolls into view we add `.is-in` (once). Optional stagger delay in ms. */
export function useReveal({ delay = 0, threshold = 0.12 }: { delay?: number; threshold?: number } = {}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.classList.add("is-in");
      return;
    }
    if (delay) el.style.transitionDelay = `${delay}ms`;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("is-in");
            io.unobserve(el);
          }
        });
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, threshold]);
  return ref;
}

/* <Reveal> — convenience wrapper around useReveal. Renders a div by default.
   Polymorphic via `as`; the concrete element type is only known at runtime. */
export function Reveal({
  as,
  delay = 0,
  className = "",
  children,
  ...rest
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children?: ReactNode;
} & Record<string, unknown>) {
  const ref = useReveal({ delay });
  const Tag = (as ?? "div") as ElementType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- polymorphic element + forwarded ref
  const Comp: any = Tag;
  return (
    <Comp ref={ref as Ref<HTMLElement>} className={`reveal ${className}`} {...rest}>
      {children}
    </Comp>
  );
}

/* useCountUp — animates from 0 → value once, on mount.
   Returns { ref, display } where display is the formatted current number.
   `format` receives the live numeric value. Pass `instant` to skip the
   animation entirely (ops screens where the real figure should appear now). */
export function useCountUp(
  value: number,
  {
    duration = 900,
    instant = false,
    format = (n: number) => Math.round(n).toLocaleString(),
  }: { duration?: number; instant?: boolean; format?: (n: number) => string } = {},
) {
  const ref = useRef<HTMLElement>(null);
  const skip = instant || prefersReducedMotion();
  const [display, setDisplay] = useState<string>(() => format(skip ? value : 0));
  const started = useRef(false);
  useEffect(() => {
    if (skip) {
      setDisplay(format(value));
      return;
    }
    // Only animate the very first time; later value changes jump straight there.
    if (started.current) {
      setDisplay(format(value));
      return;
    }
    started.current = true;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(format(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(format(value));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, skip]);
  return { ref, display };
}

/* useParallax — translates an element on scroll for a subtle depth effect.
   `speed` < 0 moves it against the scroll (background feel); `max` clamps the
   travel in px so layered backdrops never expose an edge. */
export function useParallax<T extends HTMLElement = HTMLElement>(speed = -0.12, max?: number) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    // Touch scrolling + per-scroll transforms is the one combination that
    // still janks on mobile Safari — coarse pointers keep the planes stacked
    // (visually identical at rest) while everything else stays live.
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY * speed;
        const clamped = max != null ? Math.max(-max, Math.min(max, y)) : y;
        el.style.transform = `translate3d(0, ${clamped}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [speed, max]);
  return ref;
}

/* usePointerGlow — a soft highlight that tracks the cursor across an element
   (the "lit glass" sheen on premium cards). Writes the pointer position into
   CSS custom properties (--gx/--gy) plus a 0/1 alpha (--ga) that the `.sheen`
   overlay reads. Pointer-only: a no-op on touch / coarse pointers and under
   reduced motion, so phones never get a stuck highlight. */
export function usePointerGlow<T extends HTMLElement = HTMLDivElement>(enabled = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || prefersReducedMotion()) return;
    // No cursor to follow on touch / coarse pointers — leave the sheen dormant.
    if (window.matchMedia && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--gx", `${e.clientX - r.left}px`);
        el.style.setProperty("--gy", `${e.clientY - r.top}px`);
        el.style.setProperty("--ga", "1");
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--ga", "0");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);
  return ref;
}
