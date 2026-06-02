import { useMemo, useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Badge, Btn, Modal, Field, Input, Select, Toggle } from "./ui.jsx";
import { SlaiceLogo, TenantLogo } from "./Brand.jsx";
import { PERSONAS, NAV } from "../data/personas.js";
import { TENANT } from "../data/beach.js";
import { LANGS, useApp } from "../app/store.jsx";

/* ---------- Per-persona notification feeds (mocked) ---------- */
const FEEDS = {
  customer: [
    { ic: "checkCircle", tone: "green", t: "Booking confirmed", b: "Central · CE-89, Sun 19 Jul · QR ready in My Bookings.", time: "2m" },
    { ic: "bolt", tone: "amber", t: "Weather alert — Sat", b: "Light winds expected. We'll re-confirm 24h before.", time: "1h" },
    { ic: "gift", tone: "indigo", t: "Weekend offer · 20% off", b: "Front-row sunbeds at Akti tou Iliou — this Saturday only.", time: "3h" },
    { ic: "receipt", tone: "slate", t: "Receipt ready", b: "ΑΠΥ-2026-004281 transmitted to MyDATA. View in My Documents.", time: "Yesterday" },
  ],
  admin: [
    { ic: "umbrella", tone: "green", t: "New booking · #BK-10428", b: "Elena M. · Central CE-89 · €30 (online).", time: "just now" },
    { ic: "refund", tone: "amber", t: "Refund request", b: "Maria K. · #BK-10410 — awaiting your decision.", time: "12m" },
    { ic: "bell", tone: "indigo", t: "Capacity at 87%", b: "Macaw zone is nearly full for tomorrow.", time: "1h" },
    { ic: "users", tone: "slate", t: "5 new accounts", b: "From the Saturday push campaign.", time: "3h" },
  ],
  cashier: [
    { ic: "ticket", tone: "green", t: "Session opened", b: "Float €100 logged at 09:02. Have a great shift!", time: "now" },
    { ic: "cash", tone: "amber", t: "Cash handover due", b: "Drawer threshold reached: €500 — record a handover.", time: "20m" },
    { ic: "print", tone: "slate", t: "Printer low on paper", b: "Receipt printer #2 — replace the roll soon.", time: "1h" },
  ],
  controller: [
    { ic: "scan", tone: "green", t: "Gate validated · 124", b: "All scans clear so far this morning.", time: "now" },
    { ic: "bell", tone: "amber", t: "Walk-in spike", b: "5 walk-ins waiting at gate A — bring a teammate?", time: "8m" },
    { ic: "umbrella", tone: "indigo", t: "Same-day map opened", b: "12 sunbeds released for late arrivals.", time: "1h" },
  ],
  accountant: [
    { ic: "receipt", tone: "green", t: "MyDATA: 38 docs ok", b: "All ΑΠΥ from yesterday transmitted with a MARK.", time: "now" },
    { ic: "stripe", tone: "indigo", t: "Payout scheduled", b: "€4,210 net — arriving in your bank Friday.", time: "1h" },
    { ic: "refund", tone: "amber", t: "Credit note 5.1 issued", b: "Auto-issued for refund #RF-22 (#BK-10410).", time: "2h" },
  ],
  platform: [
    { ic: "building", tone: "green", t: "New tenant onboarded", b: "Sun & Sea Paros · Stripe Connect KYC passed.", time: "now" },
    { ic: "bolt", tone: "indigo", t: "Webhook anomaly", b: "checkout.session.completed re-tried (auto-resolved).", time: "20m" },
    { ic: "trend", tone: "amber", t: "MRR +6.4% w/w", b: "Driven by new beach onboardings.", time: "1h" },
  ],
};

/* ---------- Top bar ---------- */
export function TopBar({ persona, setPersona, page, setPage }) {
  const { lang, setLang, signedIn, setSignedIn, go, toast, cart } = useApp();
  const cartCount = (cart || []).length;
  const [pOpen, setPOpen] = useState(false);
  const [lOpen, setLOpen] = useState(false);
  const [aOpen, setAOpen] = useState(false);
  const [nOpen, setNOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cur = PERSONAS.find((p) => p.id === persona);
  const close = () => { setPOpen(false); setLOpen(false); setAOpen(false); setNOpen(false); };
  const baseFeed = FEEDS[persona] || FEEDS.customer;
  const [readIds, setReadIds] = useState(new Set());
  const feed = useMemo(() => baseFeed.map((n, i) => ({ ...n, id: `${persona}-${i}`, read: readIds.has(`${persona}-${i}`) })), [baseFeed, persona, readIds]);
  const unread = feed.filter((n) => !n.read).length;
  const markAll = () => setReadIds(new Set(feed.map((n) => n.id)));

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
        {/* inventory & journeys quick-links */}
        {setPage && (
          <div className="hidden md:flex items-center gap-1.5 mr-1">
            <button onClick={() => setPage("__features")}
              className={`flex items-center gap-1.5 text-[13px] px-2.5 py-1.5 rounded-lg ring-1 ring-white/15 transition ${page === "__features" ? "bg-slaice-600 text-white" : "bg-white/10 text-white/85 hover:bg-white/20 hover:text-white"}`}
              title="Feature Inventory">
              <Icon.layers size={14} /> <span className="hidden lg:inline">Features</span>
            </button>
            <button onClick={() => setPage("__journeys")}
              className={`flex items-center gap-1.5 text-[13px] px-2.5 py-1.5 rounded-lg ring-1 ring-white/15 transition ${page === "__journeys" ? "bg-slaice-600 text-white" : "bg-white/10 text-white/85 hover:bg-white/20 hover:text-white"}`}
              title="User Journeys">
              <Icon.list size={14} /> <span className="hidden lg:inline">Journeys</span>
            </button>
          </div>
        )}

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

        <div className="relative">
          <button onClick={() => { close(); setNOpen((o) => !o); }} className="text-white/85 hover:text-white p-2 rounded-lg hover:bg-white/10 relative" aria-label="Notifications">
            <Icon.bell size={17} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-bold bg-gold-400 text-navy-950 rounded-full ring-2 ring-navy-900">{unread}</span>
            )}
          </button>
          {nOpen && (
            <div className="glass-card absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-1.5rem)] text-ink rounded-xl p-2 z-40">
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="font-semibold text-navy-900 text-sm flex items-center gap-2">
                  <Icon.bell size={14} /> Notifications
                  {unread > 0 && <Badge tone="amber">{unread} new</Badge>}
                </div>
                <button onClick={markAll} className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 disabled:text-slate-300" disabled={unread === 0}>Mark all read</button>
              </div>
              <div className="max-h-[420px] overflow-y-auto space-y-1 pr-0.5">
                {feed.map((n) => {
                  const IC = Icon[n.ic] || Icon.bell;
                  return (
                    <button key={n.id} onClick={() => setReadIds((s) => new Set([...s, n.id]))} className={`w-full text-left flex gap-2.5 px-2 py-2 rounded-lg hover:bg-white/60 transition ${n.read ? "opacity-60" : ""}`}>
                      <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 mt-0.5 ${toneBg(n.tone)}`}><IC size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[13px] text-navy-900 truncate">{n.t}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                        </span>
                        <span className="block text-[12px] text-slate-500 leading-snug mt-0.5">{n.b}</span>
                      </span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="px-2 py-1.5 border-t border-white/40 mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Showing {feed.length} for {cur.label}</span>
                <button onClick={() => { setNOpen(false); toast("Demo — notification settings."); }} className="hover:text-navy-900 inline-flex items-center gap-1"><Icon.cog size={12} /> Settings</button>
              </div>
            </div>
          )}
        </div>

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
              <button onClick={() => { setAOpen(false); setSettingsOpen(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-slate-100"><Icon.cog size={15} /> Account settings</button>
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
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}

function toneBg(tone) {
  return {
    green: "bg-teal-100 text-teal-700",
    amber: "bg-amber-100 text-amber-700",
    indigo: "bg-slaice-100 text-slaice-700",
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-sky-100 text-sky-700",
  }[tone] || "bg-slate-100 text-slate-600";
}

/* ---------- Account Settings (modal) ---------- */
function SettingsModal({ open, onClose }) {
  const { toast, lang, setLang } = useApp();
  const [name, setName] = useState("Elena Manoli");
  const [email, setEmail] = useState("elena@example.com");
  const [phone, setPhone] = useState("+30 694 000 0000");
  const [prefs, setPrefs] = useState({ push: true, email: true, sms: false, offers: true });
  const cards = [
    { brand: "Visa", last4: "4242", exp: "08/27" },
    { brand: "Mastercard", last4: "5210", exp: "11/26" },
  ];
  const save = () => { onClose(); toast("Demo — account settings saved."); };
  return (
    <Modal open={open} onClose={onClose} title="Account settings" wide
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.check} onClick={save}>Save changes</Btn></>}>
      <div className="space-y-5">
        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Profile</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="E-mail"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <Field label="Language">
              <Select value={lang} onChange={(e) => setLang(e.target.value)} options={LANGS.map((l) => ({ v: l.code, l: `${l.code} — ${l.label}` }))} />
            </Field>
          </div>
        </section>

        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Notifications</div>
          <div className="space-y-2">
            <PrefRow label="Push notifications" sub="Booking updates, gate scans, refunds." on={prefs.push} set={(v) => setPrefs((p) => ({ ...p, push: v }))} />
            <PrefRow label="E-mail" sub="Receipts, invoices, weekly summaries." on={prefs.email} set={(v) => setPrefs((p) => ({ ...p, email: v }))} />
            <PrefRow label="SMS" sub="Critical alerts only." on={prefs.sms} set={(v) => setPrefs((p) => ({ ...p, sms: v }))} />
            <PrefRow label="Marketing offers" sub="Weekend deals & seasonal promotions." on={prefs.offers} set={(v) => setPrefs((p) => ({ ...p, offers: v }))} />
          </div>
        </section>

        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center justify-between">
            <span>Saved payment methods</span>
            <button onClick={() => toast("Demo — Stripe SetupIntent flow.")} className="text-teal-700 text-[12px] font-semibold normal-case tracking-normal inline-flex items-center gap-1"><Icon.plus size={12} /> Add card</button>
          </div>
          <div className="space-y-2">
            {cards.map((c) => (
              <div key={c.last4} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-7 rounded-md bg-gradient-to-br from-navy-800 to-navy-950 text-white text-[10px] font-bold grid place-items-center">{c.brand.slice(0, 4).toUpperCase()}</span>
                  <div><div className="font-semibold text-sm text-navy-900">•••• {c.last4}</div><div className="text-[11px] text-slate-400">Exp {c.exp}</div></div>
                </div>
                <button onClick={() => toast(`Demo — removed card ending ${c.last4}.`)} className="text-slate-300 hover:text-rose-500"><Icon.trash size={15} /></button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Security</div>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="outline" size="sm" icon={Icon.lock} onClick={() => toast("Demo — password reset e-mail sent.")}>Change password</Btn>
            <Btn variant="outline" size="sm" icon={Icon.phone} onClick={() => toast("Demo — 2FA setup started.")}>Enable 2FA</Btn>
            <Btn variant="ghost" size="sm" icon={Icon.trash} className="text-rose-600 hover:bg-rose-50" onClick={() => toast("Demo — account deletion requested.")}>Delete account</Btn>
          </div>
        </section>
      </div>
    </Modal>
  );
}

function PrefRow({ label, sub, on, set }) {
  return (
    <div className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
      <div><div className="font-semibold text-sm text-navy-900">{label}</div><div className="text-[11px] text-slate-400">{sub}</div></div>
      <Toggle on={on} onChange={set} />
    </div>
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
      <div className="mt-3 px-2 py-2 rounded-xl bg-white/40 ring-1 ring-white/40 text-[11px] text-slate-500 leading-relaxed">
        Non-functional mockup. No payments or backend — actions show a demo note.
      </div>
    </aside>
  );
}

/* ---------- Horizontal page nav (used for the Customer persona on every viewport) ---------- */
export function PageTopNav({ persona, page, setPage }) {
  const items = NAV[persona];
  return (
    <div className="glass rounded-2xl p-1.5 mb-4 flex gap-1.5 overflow-x-auto no-scrollbar">
      {items.map((it) => {
        const IconC = Icon[it.icon];
        const active = page === it.k;
        return (
          <button key={it.k} onClick={() => setPage(it.k)}
            className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150 ${active ? "bg-navy-900 text-white shadow-btn-primary" : "text-slate-600 hover:bg-white/70 hover:text-navy-900"}`}>
            {IconC && <IconC size={16} className={active ? "" : "text-slate-400 group-hover:text-teal-600 transition-colors"} />}
            <span>{it.label}</span>
            {it.badge === "Future" && <Badge tone="future">Future</Badge>}
          </button>
        );
      })}
    </div>
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
