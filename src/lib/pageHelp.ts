import { useSyncExternalStore } from "react";

/* Page help (AENR-661): daily screens drop their description sentence; it moves
   behind a small "?" next to the page title in the top bar. PageHead (with
   `daily`) publishes the sentence here and the top bar reads it. */
let help: string | null = null;
const subs = new Set<() => void>();
export function setPageHelp(text: string | null) {
  if (help === text) return;
  help = text;
  subs.forEach((f) => f());
}
export function usePageHelp(): string | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => help,
  );
}
