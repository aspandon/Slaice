import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { motionOK } from "../lib/fx";

gsap.registerPlugin(ScrambleTextPlugin);

/* <Decode> — one of the guest app's text effects (AENR-793, see TextFx.tsx). Its own module so
   the ScrambleText plugin downloads with the checkout that shows it, not with Home (AENR-839). */

/** A code (booking reference) that decodes into place on mount — after `delay` seconds, so a
 *  choreography can decode it once its card has landed (AENR-791). */
export function Decode({
  text,
  className = "",
  delay = 0.25,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!motionOK() || !el) return;
    const tween = gsap.fromTo(
      el,
      { scrambleText: { text: text.replace(/[A-Z0-9]/g, "·"), chars: "upperCase" } },
      {
        duration: 1,
        delay,
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
  }, [text, delay]);
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden className="tnum">
        {text}
      </span>
    </span>
  );
}
