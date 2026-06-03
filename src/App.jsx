import { useState, useCallback, useEffect } from "react";
import { AppCtx } from "./app/store.jsx";
import { DEFAULT_PAGE } from "./data/personas.js";
import { TopBar, Sidebar, MobilePersona, MobileNav, PageTopNav, Toasts } from "./components/Shell.jsx";
import { AuthGate } from "./screens/auth.jsx";
import { ConsentBanner } from "./components/ConsentBanner.jsx";
import { routeFor } from "./routes.jsx";

const DEFAULT_CONSENT = { necessary: true, analytics: false, marketing: false, decided: false, ts: null };

const LS_KEY = "slaice.v1";
const loadLS = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; } };
const saved = loadLS();

export default function App() {
  const [persona, setPersona] = useState(saved.persona || "customer");
  const [pageByPersona, setPageByPersona] = useState(saved.pageByPersona || DEFAULT_PAGE);
  const [toasts, setToasts] = useState([]);
  const [signedIn, setSignedIn] = useState(!!saved.signedIn);
  const [lang, setLang] = useState(saved.lang || "EN");
  const [cart, setCart] = useState(saved.cart || []); // { kind, id, label, sub, price }
  const [consent, setConsentState] = useState(saved.consent || DEFAULT_CONSENT);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ persona, pageByPersona, signedIn, lang, cart, consent }));
  }, [persona, pageByPersona, signedIn, lang, cart, consent]);

  // Record a consent decision with a timestamp (used by the cookie banner and
  // the customer Privacy Centre; surfaced in the admin consent audit).
  const setConsent = useCallback((patch) => {
    setConsentState((c) => ({ ...c, ...patch, decided: true, ts: new Date().toISOString() }));
  }, []);
  const reopenConsent = useCallback(() => setConsentState((c) => ({ ...c, decided: false })), []);

  const page = pageByPersona[persona];
  const setPage = useCallback((k) => setPageByPersona((s) => ({ ...s, [persona]: k })), [persona]);

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
        <div className="w-full px-3 sm:px-5 py-4 relative min-h-screen flex flex-col">
          {persona === "customer" && (
            <>
              <div
                aria-hidden="true"
                className="fixed inset-0 -z-10 pointer-events-none bg-cover bg-center"
                style={{ backgroundImage: `url(${import.meta.env.BASE_URL}beach.jpeg)` }}
              />
              {page !== "book" && (
                <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none bg-white/55 backdrop-blur-sm" />
              )}
            </>
          )}
          <TopBar persona={persona} setPersona={setPersona} page={page} setPage={setPage} />
          <MobilePersona persona={persona} setPersona={setPersona} />
          {persona === "customer" ? (
            <div className={`flex-1 ${page === "book" ? "lg:pr-[352px]" : ""}`}>
              <PageTopNav persona={persona} page={page} setPage={setPage} />
              <main className="min-w-0">{routeFor(persona, page, { go, setPage })}</main>
            </div>
          ) : (
            <>
              <MobileNav persona={persona} page={page} setPage={setPage} />
              <div className="flex gap-5 flex-1">
                <Sidebar persona={persona} page={page} setPage={setPage} />
                <main className="flex-1 min-w-0">{routeFor(persona, page, { go, setPage })}</main>
              </div>
            </>
          )}
          {persona !== "customer" && (
            <footer className="text-center text-[11px] mt-8 pb-2 text-slate-500">
              Slaice — non-functional clickable mockup · sample data only · built to navigate every persona, feature & user journey.
            </footer>
          )}
        </div>
      )}
      <ConsentBanner />
      <Toasts items={toasts} onDismiss={dismissToast} />
    </AppCtx.Provider>
  );
}
