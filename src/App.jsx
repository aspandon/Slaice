import { useState, useCallback, useEffect } from "react";
import { AppCtx } from "./app/store.jsx";
import { DEFAULT_PAGE } from "./data/personas.js";
import { TopBar, Sidebar, MobilePersona, MobileNav, Toasts } from "./components/Shell.jsx";
import { AuthGate } from "./screens/auth.jsx";
import { routeFor } from "./routes.jsx";

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

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ persona, pageByPersona, signedIn, lang, cart }));
  }, [persona, pageByPersona, signedIn, lang, cart]);

  const page = pageByPersona[persona];
  const setPage = useCallback((k) => setPageByPersona((s) => ({ ...s, [persona]: k })), [persona]);

  const toast = useCallback((msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const go = useCallback((p, k) => {
    setPersona(p);
    if (k) setPageByPersona((s) => ({ ...s, [p]: k }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const addToCart = useCallback((item) => setCart((c) => (c.find((x) => x.kind === item.kind && x.id === item.id) ? c : [...c, item])), []);
  const removeFromCart = useCallback((kind, id) => setCart((c) => c.filter((x) => !(x.kind === kind && x.id === id))), []);
  const clearCart = useCallback(() => setCart([]), []);

  const ctx = { toast, go, persona, signedIn, setSignedIn, lang, setLang, cart, addToCart, removeFromCart, clearCart };

  return (
    <AppCtx.Provider value={ctx}>
      {!signedIn ? (
        <AuthGate />
      ) : (
        <div className="w-full px-3 sm:px-5 py-4">
          <TopBar persona={persona} setPersona={setPersona} />
          <MobilePersona persona={persona} setPersona={setPersona} />
          <MobileNav persona={persona} page={page} setPage={setPage} />
          <div className="flex gap-5">
            <Sidebar persona={persona} page={page} setPage={setPage} />
            <main className="flex-1 min-w-0">{routeFor(persona, page, { go, setPage })}</main>
          </div>
          <footer className="text-center text-[11px] text-slate-400 mt-8 pb-4">
            Slaice — non-functional clickable mockup · sample data only · built to navigate every persona, feature & user journey.
          </footer>
        </div>
      )}
      <Toasts items={toasts} />
    </AppCtx.Provider>
  );
}
