import { useEffect, useRef, useState } from "react";
import { BeachBackdrop } from "./Beach";
import { LifeRing } from "./LifeRing";
import { prefersReducedMotion } from "../lib/motion";

/* Sand-top fraction (0–1). Higher = thinner sand strip / ocean vista; lower lifts
   the shoreline so the sand fills the view. */
const REST = 0.8; // home + browsing
const IMMERSIVE = 0.46; // inside the booking wizard — the beach you tap on

/* ---------- Customer page backdrop ----------
   The beach scene behind the whole customer surface. Entering the guided-booking
   wizard animates the shoreline upward so far more sand is revealed (the beach the
   guest then taps zones / sunbeds on); leaving eases it back to the ocean vista.
   Owning the shoreline tween *here* — rather than in App — keeps its ~45 frames
   from re-rendering the entire app tree each frame. */
export function CustomerBackdrop({ immersive }: { immersive: boolean }) {
  const [shoreline, setShoreline] = useState(immersive ? IMMERSIVE : REST);
  // Mirror the latest value so the tween can read its start point without
  // re-subscribing the effect on every frame.
  const ref = useRef(shoreline);
  ref.current = shoreline;

  useEffect(() => {
    const target = immersive ? IMMERSIVE : REST;
    if (prefersReducedMotion()) {
      setShoreline(target);
      return;
    }
    const from = ref.current;
    if (Math.abs(from - target) < 0.001) return;
    const dur = 780;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setShoreline(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [immersive]);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none">
      <BeachBackdrop pos="absolute" className="inset-0 rounded-none" parallax shoreline={shoreline} />
      {/* The life-buoy bobs in the open water. As the booking flow lifts the
          shoreline, it rides up with the sea to a spot in the top-left, clear of
          the menu and the tappable sand. */}
      <LifeRing className={`hidden sm:block absolute left-[8%] w-[60px] h-[60px] transition-[top] duration-700 ease-out ${immersive ? "top-[20%]" : "top-[72%]"}`} />
    </div>
  );
}
