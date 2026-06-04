import { useState, useCallback, useEffect, useRef } from "react";
import { AppCtx } from "./app/store.jsx";
import { DEFAULT_PAGE } from "./data/personas.js";
import { TopBar, Sidebar, BottomTabBar, SiteFooter, Toasts } from "./components/Shell.jsx";
import { AuthGate } from "./screens/auth.jsx";
import { ConsentBanner } from "./components/ConsentBanner.jsx";
import { CommandPalette } from "./components/CommandPalette.jsx";
import { BeachBackdrop } from "./components/Beach.jsx";
import { routeFor } from "./routes.jsx";
import { parseHash, buildHash } from "./app/router.js";

const DEFAULT_CONSENT = { necessary: true, analytics: false, marketing: false, decided: false, ts: null };

const LS_KEY = "slaice.v1";
const loadLS = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; } };
const saved = loadLS();
// A deep link in the URL wins over the last saved location.
const initialRoute = parseHash();

export default function App() {
  const [persona, setPersona] = useState(initialRoute.persona || saved.persona || "customer");
  const [pageByPersona, setPageByPersona] = useState(() => {
    const base = saved.pageByPersona || DEFAULT_PAGE;
    return initialRoute.persona && initialRoute.page
      ? { ...base, [initialRoute.persona]: initialRoute.page }
      : base;
  });
  const [toasts, setToasts] = useState([]);
  const [signedIn, setSignedIn] = useState(!!saved.signedIn);
  const [lang, setLang] = useState(saved.lang || "EN");
  const [cart, setCart] = useState(saved.cart || []); // { kind, id, label, sub, price }
  const [consent, setConsentState] = useState(saved.consent || DEFAULT_CONSENT);

  useEffect(() => {
    // Guard the write: Safari Private Mode (older) and a full quota throw
    // QuotaExceededError on setItem — without this the whole app would crash
    // in private browsing.
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ persona, pageByPersona, signedIn, lang, cart, consent }));
    } catch { /* storage unavailable (private mode / quota) — ignore */ }
  }, [persona, pageByPersona, signedIn, lang, cart, consent]);

  // Record a consent decision with a timestamp (used by the cookie banner and
  // the customer Privacy Centre; surfaced in the admin consent audit).
  const setConsent = useCallback((patch) => {
    setConsentState((c) => ({ ...c, ...patch, decided: true, ts: new Date().toISOString() }));
  }, []);
  const reopenConsent = useCallback(() => setConsentState((c) => ({ ...c, decided: false })), []);

  const page = pageByPersona[persona];
  const setPage = useCallback((k) => setPageByPersona((s) => ({ ...s, [persona]: k })), [persona]);

  // ---- URL routing -------------------------------------------------------
  // Mirror persona+page into the location hash so the app is deep-linkable and
  // refresh-stable. The equality guard alone prevents feedback loops with the
  // Back/Forward handler below (on a pop the URL already matches the new state).
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
      if (r.page) setPageByPersona((s) => ({ ...s, [r.persona]: r.page }));
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onPop);
    };
  }, []);

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // toast(message) — or toast(message, { action: { label, onClick }, tone, duration })
  const toast = useCallback((msg, opts = {}) => {
    const id = Date.now() + Math.random();
    const duration = opts.duration ?? (opts.action ? 6500 : 4200);
    setToasts((t) => [...t, { id, msg, action: opts.action, tone: opts.tone, duration }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  // `hint` carries an optional spotlight ("data-spotlight" attribute) and a
  // short tip, so journeys can land a user on the exact section they were
  // asked to look at. Pages call useSpotlight() to react to it.
  const [hint, setHint] = useState(null);
  const clearHint = useCallback(() => setHint(null), []);
  const go = useCallback((p, k, h) => {
    setPersona(p);
    if (k) setPageByPersona((s) => ({ ...s, [p]: k }));
    setHint(h ? { ...h, persona: p, page: k, ts: Date.now() } : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const addToCart = useCallback((item) => setCart((c) => (c.find((x) => x.kind === item.kind && x.id === item.id) ? c : [...c, item])), []);
  const removeFromCart = useCallback((kind, id) => setCart((c) => c.filter((x) => !(x.kind === kind && x.id === id))), []);
  const clearCart = useCallback(() => setCart([]), []);

  const ctx = { toast, go, persona, signedIn, setSignedIn, lang, setLang, cart, addToCart, removeFromCart, clearCart, hint, clearHint, consent, setConsent, reopenConsent };

  return (
    <AppCtx.Provider value={ctx}>
      {!signedIn ? (
        <AuthGate />
      ) : (
        // Sunbed Booking takes over the whole viewport (fixed beach + its own
        // floating basket bar), so the global footer and bottom tab bar are
        // skipped there — navigation stays reachable from the TopBar title.
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
            // Only the immersive book page stretches to fill; other short pages
            // let the footer hug the content instead of stranding it at the
            // bottom of the viewport with a dead gap above it.
            <div className={page === "book" ? "flex-1 lg:pr-[352px]" : ""}>
              <main className="min-w-0">{routeFor(persona, page, { go, setPage })}</main>
            </div>
          ) : (
            <div className="flex gap-5">
              <Sidebar persona={persona} page={page} setPage={setPage} />
              <main className="flex-1 min-w-0">{routeFor(persona, page, { go, setPage })}</main>
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
