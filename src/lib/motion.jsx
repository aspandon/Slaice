import { useEffect, useRef, useState } from "react";

// Honour the OS "reduce motion" setting everywhere our JS-driven motion runs.
export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* useReveal — scroll-driven entrance.
   Attach the returned ref to an element that has the `.reveal` class; when it
   scrolls into view we add `.is-in` (once). Optional stagger delay in ms. */
export function useReveal({ delay = 0, threshold = 0.12 } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) { el.classList.add("is-in"); return; }
    if (delay) el.style.transitionDelay = `${delay}ms`;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { el.classList.add("is-in"); io.unobserve(el); }
        });
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, threshold]);
  return ref;
}

/* <Reveal> — convenience wrapper around useReveal. Renders a div by default. */
export function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const ref = useReveal({ delay });
  return (
    <Tag ref={ref} className={`reveal ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/* useCountUp — animates from 0 → value when the element enters the viewport.
   Returns { ref, display } where display is the formatted current number.
   `format` receives the live numeric value. */
export function useCountUp(value, { duration = 900, format = (n) => Math.round(n).toLocaleString() } = {}) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(() => format(prefersReducedMotion() ? value : 0));
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) { setDisplay(format(value)); return; }
    const run = () => {
      if (started.current) return;
      started.current = true;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / duration);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(format(value * eased));
        if (p < 1) requestAnimationFrame(tick);
        else setDisplay(format(value));
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);
  return { ref, display };
}

/* useParallax — translates an element on scroll for a subtle depth effect.
   `speed` < 0 moves slower than scroll (background feel). */
export function useParallax(speed = -0.12) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(0, ${window.scrollY * speed}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [speed]);
  return ref;
}
