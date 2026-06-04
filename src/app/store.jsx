import { createContext, useContext, useEffect } from "react";
import { translate } from "./i18n";

// Global app context: toasts, cross-persona navigation, auth + tenant theme.
// `hint` is an optional spotlight set by go(...,{spotlight,tip}) so the
// landing page can highlight the section a journey points at.
export const AppCtx = createContext({
  toast: () => {},
  go: () => {}, // go(persona, page, hint?) — navigate, optionally with a spotlight
  persona: "customer",
  signedIn: false,
  setSignedIn: () => {},
  lang: "EN",
  setLang: () => {},
  hint: null,
  clearHint: () => {},
  consent: { necessary: true, analytics: false, marketing: false, decided: false, ts: null },
  setConsent: () => {},
  reopenConsent: () => {},
});

export const useApp = () => useContext(AppCtx);

// Translation helper bound to the active language: t(key, fallback).
export function useT() {
  const { lang } = useContext(AppCtx);
  return (key, fallback) => translate(lang, key, fallback);
}

// When the active hint matches the current persona+page, find the element
// with data-spotlight="<name>", scroll it into view and add a teal pulse
// ring for ~3s. The hint is cleared after firing so it only triggers once.
export function useSpotlight(persona, page) {
  const { hint, clearHint, toast } = useContext(AppCtx);
  useEffect(() => {
    if (!hint || hint.persona !== persona || (hint.page && hint.page !== page)) return;
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-spotlight="${hint.spotlight}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("spotlight-ring");
        setTimeout(() => el.classList.remove("spotlight-ring"), 3200);
      }
      if (hint.tip) toast(hint.tip, { tone: "success", duration: 4500 });
      clearHint();
    }, 350); // give the page a tick to mount
    return () => clearTimeout(t);
  }, [hint, persona, page]);
}

export const LANGS = [
  { code: "EN", label: "English" },
  { code: "ΕΛ", label: "Ελληνικά" },
  { code: "DE", label: "Deutsch" },
  { code: "FR", label: "Français" },
];
