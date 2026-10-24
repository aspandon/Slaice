import { useLayoutEffect, useState, type ReactNode } from "react";
import { motionOK } from "../lib/fx";
import { DURATION } from "../lib/motionTokens";

/* ---------- Rolling numbers and type (AENR-793) ----------
   Three small text effects for the guest app, each rendering its final text for
   screen readers at once (the moving copy is aria-hidden) and doing nothing under
   reduced motion:
   - <Rolling>: digits roll like an odometer when the value changes (and once on
     mount, from zeros). Tabular digits, fixed column widths: no layout shift.
   - <RevealLines>: a headline rising into view from behind a mask (CSS, AENR-854).
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

/** A headline that rises into view from behind its own bottom edge, once, when it mounts.
 *  CSS only (AENR-854): it used to split into lines with SplitText, whose measuring forced a
 *  layout of the whole new page in the first frame of every first visit (~85 ms on a phone).
 *  The headlines are a line or two, so the block rises as one. The clip reaches past the box
 *  on every side but the bottom, so descenders and emoji are never cut, and it is dropped once
 *  the rise lands. Reduced motion: no animation (index.css), the clip goes at once. */
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
  const [risen, setRisen] = useState(() => !motionOK());
  return (
    <Tag
      id={id}
      className={className}
      style={risen ? undefined : { clipPath: "inset(-50% -10% -0.2em -10%)" }}
    >
      <span
        className={risen ? "block" : "block animate-mask-rise"}
        onAnimationEnd={() => setRisen(true)}
      >
        {children}
      </span>
    </Tag>
  );
}
