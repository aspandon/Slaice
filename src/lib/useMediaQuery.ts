import { useEffect, useState } from "react";

/** Track a CSS media query, kept current on resize / rotation. Used where only one of two layouts
 *  should be in the DOM at all — e.g. the phone list vs the desktop table (AENR-730). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}
