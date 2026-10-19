import { useEffect, useState } from "react";

/* A demo-only switch kept in localStorage and shared live between components
   (e.g. "Simulate a first-time guest" in the Demo menu — AENR-702). */
const EVT = "slaice-demo-flag";
const keyOf = (name: string) => `slaice.demo.${name}`;
const read = (name: string) => {
  try {
    return localStorage.getItem(keyOf(name)) === "1";
  } catch {
    return false;
  }
};

export function useDemoFlag(name: string): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(() => read(name));
  useEffect(() => {
    const sync = () => setOn(read(name));
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, [name]);
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
