import { useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Badge } from "./ui.jsx";
import { SlaiceLogo, TenantLogo } from "./Brand.jsx";
import { PERSONAS, NAV } from "../data/personas.js";
import { TENANT } from "../data/beach.js";
import { LANGS, useApp } from "../app/store.jsx";

/* ---------- Top bar ---------- */
export function TopBar({ persona, setPersona }) {
  const { lang, setLang, signedIn, setSignedIn, go, toast, cart } = useApp();
  const cartCount = (cart || []).length;
  const [pOpen, setPOpen] = useState(false);
  const [lOpen, setLOpen] = useState(false);
  const [aOpen, setAOpen] = useState(false);
  const cur = PERSONAS.find((p) => p.id === persona);
  const close = () => { setPOpen(false); setLOpen(false); setAOpen(false); };

  return (
    <header className="glass-dark text-white rounded-2xl px-4 py-3 mb-4 flex items-center justify-between relative z-30 ring-1 ring-white/10 shadow-lift sticky top-2">
      <div className="flex items-center gap-3">
        <TenantLogo size={38} />
        <div>
          <div className="font-display font-bold leading-tight">{TENANT.name}</div>
          <div className="text-[11px] text-white/60 -mt-0.5">{TENANT.subdomain}</div>
        </div>
        <span className="hidden lg:flex items-center gap-1 ml-2 text-[10px] text-white/50 border-l border-white/15 pl-3">
          powered by <span className="font-semibold text-white/80">SLA<span className="text-gold-400">i</span>CE</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* language */}
        <div className="relative">
          <button onClick={() => { close(); setLOpen((o) => !o); }} className="hidden sm:flex items-center gap-1.5 text-[13px] text-white/85 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 ring-1 ring-white/15">
            <Icon.globe size={15} /> {lang} <Icon.chevD size={13} />
          </button>
          {lOpen && (
            <div className="glass-card absolute right-0 mt-2 w-44 text-ink rounded-xl p-1.5 z-40">
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => { setLang(l.code); setLOpen(false); }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm hover:bg-slate-100 ${lang === l.code ? "bg-slate-50" : ""}`}>
                  <span><span className="font-semibold mr-2">{l.code}</span>{l.label}</span>
                  {lang === l.code && <Icon.check size={15} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => go("customer", "checkout")} className="text-white/85 hover:text-white p-2 rounded-lg hover:bg-white/10 relative" title="Basket">
          <Icon.card size={17} />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-bold bg-gold-400 text-navy-950 rounded-full ring-2 ring-navy-900">{cartCount}</span>
          )}
        </button>

        <button onClick={() => toast("Demo — 3 new notifications.")} className="text-white/85 hover:text-white p-2 rounded-lg hover:bg-white/10 relative">
          <Icon.bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold-400 rounded-full" />
        </button>

        {/* avatar menu */}
        <div className="relative">
          <button onClick={() => { close(); setAOpen((o) => !o); }} className="flex items-center gap-2 bg-white/10 ring-1 ring-white/15 hover:bg-white/20 rounded-xl pl-1 pr-2 py-1">
            <span className="w-7 h-7 rounded-lg grid place-items-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>EM</span>
            <Icon.chevD size={14} />
          </button>
          {aOpen && (
            <div className="glass-card absolute right-0 mt-2 w-56 text-ink rounded-xl p-1.5 z-40">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <div className="font-semibold text-sm text-navy-900">Elena M.</div>
                <div className="text-[12px] text-slate-400">elena@example.com</div>
              </div>
              <button onClick={() => { setAOpen(false); go("customer", "mybookings"); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-slate-100"><Icon.grid size={15} /> My bookings</button>
              <button onClick={() => { setAOpen(false); toast("Demo — account settings."); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-slate-100"><Icon.cog size={15} /> Account settings</button>
              <button onClick={() => { setAOpen(false); setSignedIn(false); toast("Signed out (demo)."); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50"><Icon.arrowL size={15} /> Sign out</button>
            </div>
          )}
        </div>

        {/* persona switcher */}
        <div className="relative">
          <button onClick={() => { close(); setPOpen((o) => !o); }} className="flex items-center gap-2 bg-white/15 ring-1 ring-white/25 hover:bg-white/25 rounded-xl pl-2 pr-3 py-1.5 text-sm font-semibold">
            <span className="w-6 h-6 rounded-lg grid place-items-center" style={{ background: cur.color }}>{Icon[cur.icon]({ size: 13 })}</span>
            <span className="hidden md:inline">{cur.label}</span>
            <Icon.chevD size={14} />
          </button>
          {pOpen && (
            <div className="glass-card absolute right-0 mt-2 w-72 text-ink rounded-xl p-1.5 z-40">
              <div className="px-2.5 py-1.5 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">View as persona</div>
              {PERSONAS.map((p) => (
                <button key={p.id} onClick={() => { setPersona(p.id); setPOpen(false); }}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-sm ${persona === p.id ? "bg-slate-100" : ""} hover:bg-slate-100`}>
                  <span className="w-7 h-7 rounded-lg grid place-items-center text-white shrink-0 mt-0.5" style={{ background: p.color }}>{Icon[p.icon]({ size: 14 })}</span>
                  <span className="text-left">
                    <span className="font-semibold flex items-center gap-1.5">{p.label}{persona === p.id && <Icon.check size={14} />}</span>
                    <span className="block text-[11px] text-slate-400 leading-tight">{p.blurb}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ---------- Sidebar ---------- */
export function Sidebar({ persona, page, setPage }) {
  const items = NAV[persona];
  const p = PERSONAS.find((x) => x.id === persona);
  return (
    <aside className="w-60 shrink-0 glass rounded-2xl p-3 h-max sticky top-[86px] hidden md:block z-20">
      <div className="px-2 py-2 flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: p.color }}>{Icon[p.icon]({ size: 13 })}</span>
        <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">{p.label}</span>
      </div>
      <nav className="space-y-0.5 mt-1">
        {items.map((it) => {
          const IconC = Icon[it.icon];
          const active = page === it.k;
          return (
            <button key={it.k} onClick={() => setPage(it.k)}
              className={`group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${active ? "bg-navy-900 text-white shadow-btn-primary" : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"}`}>
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full bg-teal-400 transition-all duration-200 ${active ? "h-5 opacity-100" : "h-0 opacity-0"}`} />
              {IconC && <IconC size={17} className={active ? "" : "text-slate-400 group-hover:text-teal-600 transition-colors"} />}
              <span className="flex-1 text-left">{it.label}</span>
              {it.badge === "Future" && <Badge tone="future">Future</Badge>}
            </button>
          );
        })}
      </nav>
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
        <NavExtra page={page} setPage={setPage} k="__features" icon="layers" label="Feature Inventory" />
        <NavExtra page={page} setPage={setPage} k="__journeys" icon="list" label="User Journeys" />
      </div>
      <div className="mt-3 px-2 py-2 rounded-xl bg-white/40 ring-1 ring-white/40 text-[11px] text-slate-500 leading-relaxed">
        Non-functional mockup. No payments or backend — actions show a demo note.
      </div>
    </aside>
  );
}

function NavExtra({ page, setPage, k, icon, label }) {
  const IconC = Icon[icon];
  const active = page === k;
  return (
    <button onClick={() => setPage(k)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${active ? "bg-slaice-600 text-white shadow-lift" : "text-slate-600 hover:bg-slate-100 hover:text-slaice-700"}`}>
      <IconC size={17} className={active ? "" : "text-slate-400"} /><span className="flex-1 text-left">{label}</span>
    </button>
  );
}

/* ---------- Mobile persona tabs ---------- */
export function MobilePersona({ persona, setPersona }) {
  return (
    <div className="md:hidden flex gap-1.5 overflow-x-auto mb-4 pb-1 no-scrollbar">
      {PERSONAS.map((p) => (
        <button key={p.id} onClick={() => setPersona(p.id)}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap ring-1 ${persona === p.id ? "bg-navy-900 text-white ring-navy-900" : "glass text-slate-700"}`}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Mobile page nav ---------- */
export function MobileNav({ persona, page, setPage }) {
  return (
    <div className="md:hidden flex gap-1.5 overflow-x-auto mb-4 pb-1 no-scrollbar">
      {NAV[persona].map((it) => (
        <button key={it.k} onClick={() => setPage(it.k)}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap ring-1 ${page === it.k ? "bg-teal-600 text-white ring-teal-600" : "glass text-slate-700"}`}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Toasts ---------- */
export function Toasts({ items }) {
  return (
    <div className="fixed bottom-4 right-4 z-[70] space-y-2.5 w-[340px] max-w-[calc(100vw-2rem)]">
      {items.map((t) => (
        <div key={t.id} role="status" className="glass-dark text-white rounded-xl pl-3 pr-4 py-3 text-sm shadow-float ring-1 ring-white/15 animate-slide-in-right flex items-start gap-2.5 overflow-hidden relative">
          <span className="w-7 h-7 rounded-lg bg-gold-500/20 text-gold-400 grid place-items-center shrink-0">{Icon.bolt({ size: 15 })}</span>
          <span className="flex-1 leading-snug pt-0.5">{t.msg}</span>
          <span className="absolute bottom-0 left-0 h-0.5 w-full bg-gold-400/70" style={{ animation: "toastprogress 4.2s linear forwards", transformOrigin: "left" }} />
        </div>
      ))}
    </div>
  );
}
