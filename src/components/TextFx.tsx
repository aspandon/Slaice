import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { motionOK, EASE } from "../lib/fx";

gsap.registerPlugin(SplitText, ScrambleTextPlugin);

/* ---------- Rolling numbers and type (AENR-793) ----------
   Three small text effects for the guest app, each rendering its final text for
   screen readers at once (the moving copy is aria-hidden) and doing nothing under
   reduced motion:
   - <Rolling>: digits roll like an odometer when the value changes (and once on
     mount, from zeros). Tabular digits, fixed column widths: no layout shift.
   - <RevealLines>: a headline revealed line by line from behind a mask (SplitText).
   - <Decode>: a booking reference decoding into place (ScrambleText). */

const DIGITS = "0123456789";

/** An odometer: each digit is a 0–9 strip moved to its value; everything else stays still. */
export function Rolling({ value, className = "" }: { value: string | number; className?: string }) {
  const text = String(value);
  const live = motionOK();
  // Mount at zeros, then roll to the value on the next frame.
  const [shown, setShown] = useState(live ? text.replace(/\d/g, "0") : text);
  useLayoutEffect(() => {
    if (!live) {
      setShown(text);
      return;
    }
    const id = requestAnimationFrame(() => setShown(text));
    return () => cancelAnimationFrame(id);
  }, [text, live]);
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

/** A code (booking reference) that decodes into place on mount. */
export function Decode({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!motionOK() || !el) return;
    const tween = gsap.fromTo(
      el,
      { scrambleText: { text: text.replace(/[A-Z0-9]/g, "·"), chars: "upperCase" } },
      {
        duration: 1,
        delay: 0.25,
        ease: "none",
        scrambleText: {
          text,
          chars: "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789",
          revealDelay: 0.25,
          speed: 0.6,
        },
      },
    );
    return () => {
      tween.kill();
      el.textContent = text;
    };
  }, [text]);
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden className="tnum">
        {text}
      </span>
    </span>
  );
}
