import { useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Badge } from "./ui.jsx";
import { SlaiceLogo, TenantLogo } from "./Brand.jsx";
import { PERSONAS, NAV } from "../data/personas.js";
import { TENANT } from "../data/beach.js";
import { LANGS, useApp } from "../app/store.jsx";

/* ---------- Top bar ---------- */
export function TopBar({ persona, setPersona }) {
  const { lang, setLang, signedIn, setSignedIn, go, toast } = useApp();
  const [pOpen, setPOpen] = useState(false);
  const [lOpen, setLOpen] = useState(false);
  const [aOpen, setAOpen] = useState(false);
  const cur = PERSONAS.find((p) => p.id === persona);
  const close = () => { setPOpen(false); setLOpen(false); setAOpen(false); };

  return (
    <header className="grad-sea text-white rounded-2xl px-4 py-3 mb-4 flex items-center justify-between relative z-30">
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
            <div className="absolute right-0 mt-2 w-44 bg-white text-ink rounded-xl ring-1 ring-slate-200 shadow-float p-1.5 z-40">
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
            <div className="absolute right-0 mt-2 w-56 bg-white text-ink rounded-xl ring-1 ring-slate-200 shadow-float p-1.5 z-40">
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
            <div className="absolute right-0 mt-2 w-72 bg-white text-ink rounded-xl ring-1 ring-slate-200 shadow-float p-1.5 z-40">
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
    <aside className="w-60 shrink-0 bg-white ring-1 ring-slate-200 rounded-2xl p-3 h-max sticky top-4 hidden md:block">
      <div className="px-2 py-2 flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg grid place-items-center text-white" style={{ background: p.color }}>{Icon[p.icon]({ size: 13 })}</span>
        <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">{p.label}</span>
      </div>
      <nav className="space-y-1 mt-1">
        {items.map((it) => {
          const IconC = Icon[it.icon];
          const active = page === it.k;
          return (
            <button key={it.k} onClick={() => setPage(it.k)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition ${active ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {IconC && <IconC size={17} />}
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
      <div className="mt-3 px-2 py-2 rounded-xl bg-slate-50 text-[11px] text-slate-400 leading-relaxed">
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
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition ${active ? "bg-slaice-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
      <IconC size={17} /><span className="flex-1 text-left">{label}</span>
    </button>
  );
}

/* ---------- Mobile persona tabs ---------- */
export function MobilePersona({ persona, setPersona }) {
  return (
    <div className="md:hidden flex gap-1.5 overflow-x-auto mb-4 pb-1 no-scrollbar">
      {PERSONAS.map((p) => (
        <button key={p.id} onClick={() => setPersona(p.id)}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap ring-1 ${persona === p.id ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 text-slate-600"}`}>
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
          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap ring-1 ${page === it.k ? "bg-teal-600 text-white ring-teal-600" : "bg-white ring-slate-200 text-slate-600"}`}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Toasts ---------- */
export function Toasts({ items }) {
  return (
    <div className="fixed bottom-4 right-4 z-[70] space-y-2 w-[330px]">
      {items.map((t) => (
        <div key={t.id} className="bg-navy-900 text-white rounded-xl px-4 py-3 text-sm shadow-float ring-1 ring-white/10 animate-fade-up flex items-start gap-2">
          <span className="text-gold-400 shrink-0 mt-0.5">{Icon.bolt({ size: 16 })}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
