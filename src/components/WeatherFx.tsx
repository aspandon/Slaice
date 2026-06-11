import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../lib/motion";

/* ============================================================================
   WeatherFx — the canvas particle layer for the demo weather.

   Rain: two depth populations of streaking drops (far = thin/slow/faint,
   near = thicker/fast), slanted by the wind, each ending in a small splash
   ring that pops where the drop lands. Wind: occasional long gust streaks
   sweeping across the bay. A single rAF loop on a plain 2D canvas — a few
   hundred line draws per frame — paused while the tab is hidden and skipped
   entirely under reduced motion. Purely decorative (aria-hidden, behind the
   page content inside the fixed backdrop).
   ============================================================================ */

interface Drop { x: number; y: number; endY: number; len: number; sp: number; o: number; th: number }
interface Splash { x: number; y: number; r: number; o: number }
interface Gust { x: number; y: number; len: number; sp: number; o: number; t: number; dur: number; amp: number }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function WeatherFxCanvas({ rain, wind }: { rain: boolean; wind: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || prefersReducedMotion()) return;
    const g = cv.getContext("2d");
    if (!g) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0;
    let H = 0;
    const resize = () => {
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = Math.max(1, Math.round(W * dpr));
      cv.height = Math.max(1, Math.round(H * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.lineCap = "round";
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    // Horizontal drift per px of fall — the rain leans with the wind.
    const slant = 0.16 + 0.5 * wind;
    const drops: Drop[] = [];
    const splashes: Splash[] = [];
    const gusts: Gust[] = [];
    const spawnDrop = (d: Partial<Drop> = {}): Drop => {
      const near = Math.random() < 0.4;
      return Object.assign(
        {
          x: rnd(-0.15 * W, W * 1.05),
          y: rnd(-H * 0.3, -10),
          // Drops land anywhere from mid-sea to the bottom, so splashes pepper
          // the whole scene instead of lining up on one row.
          endY: rnd(H * 0.45, H * 1.02),
          len: near ? rnd(16, 26) : rnd(9, 15),
          sp: near ? rnd(900, 1250) : rnd(550, 780),
          o: near ? rnd(0.32, 0.5) : rnd(0.14, 0.26),
          th: near ? 1.6 : 1,
        },
        d,
      );
    };
    if (rain) {
      const n = Math.min(240, Math.max(70, Math.round((W * H) / 11000)));
      for (let i = 0; i < n; i++) drops.push(spawnDrop({ y: rnd(-H * 0.2, H) }));
    }
    let gustIn = rnd(0.3, 1.2);

    let raf = 0;
    let last = -1;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last < 0 ? 0.016 : Math.min(0.05, (now - last) / 1000);
      last = now;
      g.clearRect(0, 0, W, H);

      // ---- rain ----
      for (const d of drops) {
        d.y += d.sp * dt;
        d.x += d.sp * dt * slant;
        if (d.y >= d.endY) {
          splashes.push({ x: d.x, y: d.endY, r: 1.5, o: 0.4 * (d.th > 1 ? 1 : 0.6) });
          Object.assign(d, spawnDrop());
          continue;
        }
        g.strokeStyle = `rgba(255,255,255,${d.o})`;
        g.lineWidth = d.th;
        g.beginPath();
        g.moveTo(d.x, d.y);
        g.lineTo(d.x - d.len * slant, d.y - d.len);
        g.stroke();
      }
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.r += 26 * dt;
        s.o -= 1.6 * dt;
        if (s.o <= 0) {
          splashes.splice(i, 1);
          continue;
        }
        g.strokeStyle = `rgba(255,255,255,${s.o})`;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(s.x, s.y, s.r, s.r * 0.36, 0, 0, Math.PI * 2);
        g.stroke();
      }

      // ---- wind gusts ----
      if (wind > 0.5) {
        gustIn -= dt;
        if (gustIn <= 0) {
          gustIn = rnd(0.22, 0.85) / wind;
          gusts.push({ x: rnd(-0.2 * W, 0.2 * W), y: rnd(H * 0.06, H * 0.85), len: rnd(160, 380), sp: rnd(620, 980), o: rnd(0.2, 0.38), t: 0, dur: rnd(1.1, 1.9), amp: rnd(6, 16) });
        }
        for (let i = gusts.length - 1; i >= 0; i--) {
          const u = gusts[i];
          u.t += dt;
          u.x += u.sp * dt;
          if (u.t >= u.dur || u.x - u.len > W) {
            gusts.splice(i, 1);
            continue;
          }
          // Fade in/out across the gust's life; a gentle sine gives it a swoosh.
          const a = u.o * Math.sin(Math.min(1, u.t / u.dur) * Math.PI);
          g.strokeStyle = `rgba(255,255,255,${a})`;
          g.lineWidth = 2;
          g.beginPath();
          for (let s = 0; s <= 1; s += 0.2) {
            const px = u.x - u.len * s;
            const py = u.y + Math.sin(s * Math.PI * 2 + u.t * 3) * u.amp * s;
            if (s === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.stroke();
        }
      }
    };
    raf = requestAnimationFrame(tick);
    const onVis = () => {
      cancelAnimationFrame(raf);
      last = -1;
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
    };
  }, [rain, wind]);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 w-full h-full" />;
}
