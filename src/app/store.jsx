import { createContext, useContext } from "react";

// Global app context: toasts, cross-persona navigation, auth + tenant theme.
export const AppCtx = createContext({
  toast: () => {},
  go: () => {}, // go(persona, page) — navigate anywhere
  persona: "customer",
  signedIn: false,
  setSignedIn: () => {},
  lang: "EN",
  setLang: () => {},
});

export const useApp = () => useContext(AppCtx);

export const LANGS = [
  { code: "EN", label: "English" },
  { code: "ΕΛ", label: "Ελληνικά" },
  { code: "DE", label: "Deutsch" },
  { code: "FR", label: "Français" },
];
