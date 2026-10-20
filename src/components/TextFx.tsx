import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { motionOK, EASE } from "../lib/fx";
import { DURATION } from "../lib/motionTokens";

gsap.registerPlugin(SplitText);

/* ---------- Rolling numbers and type (AENR-793) ----------
   Three small text effects for the guest app, each rendering its final text for
   screen readers at once (the moving copy is aria-hidden) and doing nothing under
   reduced motion:
   - <Rolling>: digits roll like an odometer when the value changes (and once on
     mount, from zeros). Tabular digits, fixed column widths: no layout shift.
   - <RevealLines>: a headline revealed line by line from behind a mask (SplitText).
   - <Decode>: a booking reference decoding into place (ScrambleText) — in DecodeText.tsx, so
     the ScrambleText plugin loads with the checkout alone, not with Home (AENR-839). */

const DIGITS = "0123456789";

/** An odometer: each digit is a 0–9 strip moved to its value; everything else stays still.
 *  Once the roll lands it shows plain text again (AENR-822): a strip shifted by a fraction
 *  of a pixel (3 × 1.2em) sat a hair off the baseline of its neighbours at rest. */
export function Rolling({ value, className = "" }: { value: string | number; className?: string }) {
  const text = String(value);
  const live = motionOK();
  // Mount at zeros, then roll to the value on the next frame.
  const [shown, setShown] = useState(live ? text.replace(/\d/g, "0") : text);
  const [rolling, setRolling] = useState(live);
  useLayoutEffect(() => {
    if (!live) {
      setShown(text);
      setRolling(false);
      return;
    }
    setRolling(true);
    const id = requestAnimationFrame(() => setShown(text));
    // A safety net for a roll with nothing to move (e.g. to "0"), which fires no transitionend.
    const done = window.setTimeout(() => setRolling(false), DURATION.slow + 150);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(done);
    };
  }, [text, live]);
  if (!rolling) return <span className={`relative inline-flex tnum ${className}`}>{text}</span>;
  // Columns are keyed from the right, so a value growing a digit (95 → 100) rolls in place.
  const chars = shown.split("");
  return (
    <span className={`relative inline-flex tnum ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex">
        {chars.map((c, i) => {
          const key = chars.length - i;
          if (!DIGITS.includes(c)) return <span key={`s${key}`}>{c}</span>;
          return (
            <span
              key={`d${key}`}
              className="relative inline-block overflow-hidden h-[1.2em] leading-[1.2em] align-bottom"
            >
              <span className="invisible">0</span>
              <span
                className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-slow ease-ios"
                style={{ transform: `translateY(-${Number(c) * 1.2}em)` }}
                // The roll has landed on the final value: back to plain, pixel-aligned text.
                onTransitionEnd={() => shown === text && setRolling(false)}
              >
                {DIGITS.split("").map((d) => (
                  <span key={d} className="h-[1.2em] leading-[1.2em] text-center">
                    {d}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

/** A headline whose lines rise into view from behind a mask, once, when it mounts. */
export function RevealLines({
  as: Tag = "div",
  className = "",
  children,
  id,
}: {
  as?: "h1" | "h2" | "div" | "p";
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    if (!motionOK() || !ref.current) return;
    const split = SplitText.create(ref.current, {
      type: "lines",
      mask: "lines",
      autoSplit: true, // re-splits after fonts load or the width changes
      aria: "auto",
      onSplit: (self) =>
        gsap.from(self.lines, { yPercent: 110, duration: 0.6, ease: EASE.out, stagger: 0.08 }),
    });
    return () => split.revert();
  }, []);
  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
