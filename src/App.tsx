import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { AppCtx } from "./app/store";
import type { AppContextValue, SpotlightHint, ToastOptions } from "./app/store";
import { DEFAULT_PAGE } from "./data/personas";
import { TopBar, Sidebar, BottomTabBar, SiteFooter, Toasts } from "./components/Shell";
import { AuthGate } from "./screens/auth";
import { ConsentBanner } from "./components/ConsentBanner";
import { CommandPalette } from "./components/CommandPalette";
import { BeachBackdrop } from "./components/Beach";
import { routeFor } from "./routes";
import { parseHash, buildHash } from "./app/router";
import { HTML_LANG } from "./app/i18n";
import type { CartItem, Consent, LangCode, PersonaId } from "./domain/types";

interface ToastItem {
  id: number;
  msg: ReactNode;
  action?: { label: string; onClick: () => void };
  tone?: string;
  duration: number;
}

const DEFAULT_CONSENT: Consent = { necessary: true, analytics: false, marketing: false, decided: false, ts: null };

const LS_KEY = "slaice.v1";
const loadLS = (): Record<string, unknown> => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
};
const saved = loadLS() as {
  persona?: PersonaId;
  pageByPersona?: Record<string, string>;
  signedIn?: boolean;
  lang?: LangCode;
  cart?: CartItem[];
  consent?: Consent;
};
// A deep link in the URL wins over the last saved location.
const initialRoute = parseHash();

export default function App() {
  const [persona, setPersona] = useState<PersonaId>(initialRoute.persona || saved.persona || "customer");
  const [pageByPersona, setPageByPersona] = useState<Record<string, string>>(() => {
    const base = saved.pageByPersona || DEFAULT_PAGE;
    return initialRoute.persona && initialRoute.page
      ? { ...base, [initialRoute.persona]: initialRoute.page }
      : base;
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [signedIn, setSignedIn] = useState(!!saved.signedIn);
  const [lang, setLang] = useState<LangCode>(saved.lang || "EN");
  const [cart, setCart] = useState<CartItem[]>(saved.cart || []);
  const [consent, setConsentState] = useState<Consent>(saved.consent || DEFAULT_CONSENT);

  useEffect(() => {
    // Guard the write: Safari Private Mode and a full quota throw on setItem.
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ persona, pageByPersona, signedIn, lang, cart, consent }));
    } catch {
      /* storage unavailable (private mode / quota) — ignore */
    }
  }, [persona, pageByPersona, signedIn, lang, cart, consent]);

  // Keep <html lang> in sync with the chosen language (a11y / SEO correctness).
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang] || "en";
  }, [lang]);

  const setConsent = useCallback((patch: Partial<Consent>) => {
    setConsentState((c) => ({ ...c, ...patch, decided: true, ts: new Date().toISOString() }));
  }, []);
  const reopenConsent = useCallback(() => setConsentState((c) => ({ ...c, decided: false })), []);

  const page = pageByPersona[persona];
  const setPage = useCallback((k: string) => setPageByPersona((s) => ({ ...s, [persona]: k })), [persona]);

  // ---- URL routing: mirror persona+page into the location hash. ----
  const firstRoute = useRef(true);
  useEffect(() => {
    const target = buildHash(persona, page);
    if (window.location.hash !== target) {
      if (firstRoute.current) window.history.replaceState(null, "", target);
      else window.history.pushState(null, "", target);
    }
    firstRoute.current = false;
  }, [persona, page]);

  // Browser Back/Forward (and manual hash edits) -> app state.
  useEffect(() => {
    const onPop = () => {
      const r = parseHash();
      if (!r.persona) return;
      setPersona(r.persona);
      if (r.page) setPageByPersona((s) => ({ ...s, [r.persona as PersonaId]: r.page as string }));
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onPop);
    };
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback((msg: ReactNode, opts: ToastOptions = {}) => {
    const id = Date.now() + Math.random();
    const duration = opts.duration ?? (opts.action ? 6500 : 4200);
    setToasts((t) => [...t, { id, msg, action: opts.action, tone: opts.tone, duration }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const [hint, setHint] = useState<SpotlightHint | null>(null);
  const clearHint = useCallback(() => setHint(null), []);
  const go = useCallback((p: PersonaId, k?: string, h?: Partial<SpotlightHint> | null) => {
    setPersona(p);
    if (k) setPageByPersona((s) => ({ ...s, [p]: k }));
    setHint(h ? { ...h, persona: p, page: k, ts: Date.now() } : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const addToCart = useCallback((item: CartItem) => setCart((c) => (c.find((x) => x.kind === item.kind && x.id === item.id) ? c : [...c, item])), []);
  const removeFromCart = useCallback((kind: CartItem["kind"], id: string) => setCart((c) => c.filter((x) => !(x.kind === kind && x.id === id))), []);
  const clearCart = useCallback(() => setCart([]), []);

  // Memoised so the provider value keeps a stable identity across renders.
  const ctx = useMemo<AppContextValue>(
    () => ({ toast, go, persona, signedIn, setSignedIn, lang, setLang, cart, addToCart, removeFromCart, clearCart, hint, clearHint, consent, setConsent, reopenConsent }),
    [toast, go, persona, signedIn, setSignedIn, lang, setLang, cart, addToCart, removeFromCart, clearCart, hint, clearHint, consent, setConsent, reopenConsent],
  );

  return (
    <AppCtx.Provider value={ctx}>
      {!signedIn ? (
        <AuthGate />
      ) : (
        // Sunbed Booking takes over the whole viewport, so the footer + bottom
        // tab bar are skipped there; navigation stays reachable from the TopBar.
        (() => {
          const immersive = persona === "customer" && page === "book";
          return (
            <div className={`w-full px-3 sm:px-5 pt-4 relative min-h-dvh flex flex-col ${immersive ? "pb-4" : "pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-4"}`}>
              {persona === "customer" && (
                <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none">
                  <BeachBackdrop pos="absolute" className="inset-0 rounded-none" />
                </div>
              )}
              <TopBar persona={persona} setPersona={setPersona} page={page} setPage={setPage} />
              {persona === "customer" ? (
                <div className={page === "book" ? "flex-1 lg:pr-[360px]" : ""}>
                  <main className="min-w-0">{routeFor(persona, page)}</main>
                </div>
              ) : (
                <div className="flex gap-5">
                  <Sidebar persona={persona} page={page} setPage={setPage} />
                  <main className="flex-1 min-w-0">{routeFor(persona, page)}</main>
                </div>
              )}
              {!immersive && <SiteFooter />}
              {!immersive && <BottomTabBar persona={persona} page={page} setPage={setPage} />}
            </div>
          );
        })()
      )}
      <ConsentBanner />
      {signedIn && <CommandPalette />}
      <Toasts items={toasts} onDismiss={dismissToast} />
    </AppCtx.Provider>
  );
}
