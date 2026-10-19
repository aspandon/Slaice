import { useEffect, useState } from "react";

/* A demo-only switch kept in localStorage and shared live between components
   (e.g. "Simulate a first-time guest" in the Demo menu — AENR-702). */
const EVT = "slaice-demo-flag";
const keyOf = (name: string) => `slaice.demo.${name}`;
const read = (name: string, fallback = false) => {
  try {
    const v = localStorage.getItem(keyOf(name));
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
};

/** `fallback` is the value until the switch is first touched (e.g. a new feature that starts on). */
export function useDemoFlag(name: string, fallback = false): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(() => read(name, fallback));
  useEffect(() => {
    const sync = () => setOn(read(name, fallback));
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, [name, fallback]);
  const set = (v: boolean) => {
    try {
      localStorage.setItem(keyOf(name), v ? "1" : "0");
    } catch {
      /* private mode: the switch just won't persist */
    }
    window.dispatchEvent(new Event(EVT));
  };
  return [on, set];
}
