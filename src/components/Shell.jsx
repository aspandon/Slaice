import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Badge, Btn, Modal, Sheet, Field, Input, Select, Toggle, EmptyState } from "./ui.jsx";
import { PrivacyCenter } from "./PrivacyCenter.jsx";
import { SlaiceLogo, TenantLogo } from "./Brand.jsx";
import { PERSONAS, NAV } from "../data/personas.js";
import { TENANT } from "../data/beach.js";
import { LANGS, useApp } from "../app/store.jsx";

/* Close on click outside + Escape. Returns a ref to attach to the popover root. */
function useOutsideClose(open, setOpen) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);
  return ref;
}

function cartGlyph(kind) {
  const m = { sunbed: Icon.umbrella, ticket: Icon.ticket, locker: Icon.lock, parking: Icon.car };
  const I = m[kind] || Icon.card;
  return <I size={13} />;
}

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
  const { lang, setLang, signedIn, setSignedIn, go, toast, cart, removeFromCart, addToCart } = useApp();
  const cartCount = (cart || []).length;
  const cartTotal = (cart || []).reduce((a, b) => a + b.price, 0);
  const [pOpen, setPOpen] = useState(false);
  const [aOpen, setAOpen] = useState(false);
  const [nOpen, setNOpen] = useState(false);
  const [bOpen, setBOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // mobile page-nav sheet
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cur = PERSONAS.find((p) => p.id === persona);
  const close = () => { setPOpen(false); setAOpen(false); setNOpen(false); setBOpen(false); };
  const nRef = useOutsideClose(nOpen, setNOpen);
  const aRef = useOutsideClose(aOpen, setAOpen);
  const pRef = useOutsideClose(pOpen, setPOpen);
  const bRef = useOutsideClose(bOpen, setBOpen);
  const baseFeed = FEEDS[persona] || FEEDS.customer;
  const [readIds, setReadIds] = useState(new Set());
  const feed = useMemo(() => baseFeed.map((n, i) => ({ ...n, id: `${persona}-${i}`, read: readIds.has(`${persona}-${i}`) })), [baseFeed, persona, readIds]);
  const unread = feed.filter((n) => !n.read).length;
  const markAll = () => setReadIds(new Set(feed.map((n) => n.id)));
  const removeBasketItem = (it) => {
    if (!removeFromCart) return;
    removeFromCart(it.kind, it.id);
    toast(`Removed ${it.label}.`, { action: { label: "Undo", onClick: () => addToCart && addToCart(it) } });
  };

  // Inline navigation lives in the header on the customer surface — one bar
  // instead of two. On staff personas the same slot shows the current page
  // title (sidebar remains the primary nav). Tenant identity + Slaice credit
  // now live in the SiteFooter below the page content.
  const navItems = NAV[persona] || [];
  // Account destinations (My Bookings / Documents) live in the avatar menu +
  // mobile nav sheet — keep them out of the desktop inline primary nav.
  const primaryNav = navItems.filter((it) => it.area !== "account");
  const currentItem = navItems.find((it) => it.k === page);
  const CurrentIcon = currentItem && Icon[currentItem.icon];
  return (
    <header className={`${persona === "customer" ? "glass-card" : "glass"} text-navy-900 rounded-2xl px-2 py-1.5 mb-4 flex items-center gap-2 relative z-30 shadow-soft sticky top-2`}>
      {/* Customer keeps its inline nav on desktop only — on phones it would
          crowd the action cluster, so page nav moves to the bottom tab bar and
          a tappable title here opens the full page-nav sheet. */}
      {persona === "customer" && (
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1">
          {primaryNav.map((it) => {
            const IconC = Icon[it.icon];
            const active = page === it.k;
            return (
              <button key={it.k} onClick={() => setPage(it.k)}
                className={`group flex items-center gap-1.5 h-9 px-2.5 rounded-xl text-[12.5px] font-semibold whitespace-nowrap transition shrink-0 ${active ? "bg-navy-900 text-white shadow-btn-primary" : "text-slate-700 hover:bg-white/70 hover:text-navy-900"}`}>
                {IconC && <IconC size={14} className={active ? "" : "text-slate-500 group-hover:text-teal-600 transition-colors"} />}
                <span>{it.label}</span>
              </button>
            );
          })}
        </nav>
      )}
      {/* Mobile (all personas): current page title — tap to open the nav sheet.
          On staff personas this also shows on desktop (sidebar is the real nav,
          this is just a heading), so it's non-interactive from md up there. */}
      <button
        onClick={() => setNavOpen(true)}
        className={`${persona === "customer" ? "md:hidden" : "md:pointer-events-none"} flex items-center gap-2 pl-1.5 pr-2 h-11 rounded-xl min-w-0 flex-1 hover:bg-white/60 md:hover:bg-transparent transition`}
        aria-label="Open navigation">
        {CurrentIcon && <CurrentIcon size={17} className="text-slate-500 shrink-0" />}
        {/* Mobile shows the concise label (matches the highlighted bottom tab and
            avoids truncation behind the action cluster); desktop staff headings
            keep the full page name. */}
        <span className="font-display font-bold truncate text-[15px]">
          <span className="md:hidden">{currentItem ? (currentItem.short || currentItem.label) : ""}</span>
          <span className="hidden md:inline">{currentItem ? currentItem.label : ""}</span>
        </span>
        <Icon.chevD size={15} className="text-slate-400 shrink-0 md:hidden" />
      </button>

      <div className="flex items-center gap-2 shrink-0">
        {/* basket popup — only on the customer persona */}
        {persona === "customer" && (
        <div className="relative" ref={bRef}>
          <button onClick={() => { close(); setBOpen((o) => !o); }} className="text-slate-500 hover:text-navy-900 w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-100 relative transition" aria-label="Basket" title="Basket">
            <Icon.card size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-bold bg-teal-500 text-white rounded-full ring-2 ring-white">{cartCount}</span>
            )}
          </button>
          {bOpen && (
            <div className="glass-card-solid absolute right-0 mt-2 w-[320px] max-w-[calc(100vw-1.5rem)] text-ink rounded-xl p-2 z-[60] shadow-float">
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="font-semibold text-navy-900 text-sm flex items-center gap-2">
                  <Icon.card size={14} /> Your basket
                  {cartCount > 0 && <Badge tone="green">{cartCount} item{cartCount > 1 ? "s" : ""}</Badge>}
                </div>
                {cartCount > 0 && <span className="text-[12px] font-bold text-navy-900 tnum">€{cartTotal}</span>}
              </div>
              {cartCount === 0 ? (
                <div className="px-2 pb-2">
                  <EmptyState compact icon={Icon.card} title="Cart is empty" body="Add a sunbed, ticket or locker to get started." className="rounded-xl bg-slate-50" />
                  <Btn variant="teal" full size="sm" icon={Icon.umbrella} className="mt-2" onClick={() => { setBOpen(false); go("customer", "book"); }}>Book a sunbed</Btn>
                </div>
              ) : (
                <>
                  <div className="max-h-[300px] overflow-y-auto space-y-1 pr-0.5">
                    {(cart || []).map((it) => (
                      <div key={it.kind + it.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-100 transition">
                        <span className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center text-slate-600 shrink-0">{cartGlyph(it.kind)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-[13px] text-navy-900 truncate">{it.label}</span>
                          <span className="block text-[11px] text-slate-500 truncate">{it.sub}</span>
                        </span>
                        <span className="text-[12px] font-semibold text-navy-900 tnum shrink-0">€{it.price}</span>
                        <button aria-label={`Remove ${it.label}`} onClick={() => removeBasketItem(it)} className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 shrink-0"><Icon.trash size={13} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="px-2 pt-2 mt-1 border-t border-slate-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-bold text-navy-900 tnum">€{cartTotal}</span>
                    </div>
                    <Btn variant="teal" full size="sm" icon={Icon.card} onClick={() => { setBOpen(false); go("customer", "checkout"); }}>Checkout</Btn>
                    <button onClick={() => { setBOpen(false); go("customer", "book"); }} className="w-full text-center text-[11px] text-slate-500 hover:text-navy-900 py-1">Continue shopping</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        )}

        {/* Global search / command palette (⌘K). On staff personas it's a
            labelled field; on the customer surface it's a compact icon so it
            doesn't crowd the basket + persona cluster. */}
        {persona === "customer" ? (
          <button onClick={() => window.dispatchEvent(new Event("slaice:cmdk"))} aria-label="Search (⌘K)" title="Search ⌘K"
            className="text-slate-500 hover:text-navy-900 w-10 h-10 hidden sm:grid place-items-center rounded-xl hover:bg-slate-100 transition">
            <Icon.search size={18} />
          </button>
        ) : (
          <button onClick={() => window.dispatchEvent(new Event("slaice:cmdk"))} aria-label="Search (⌘K)"
            className="hidden sm:flex items-center gap-2 h-10 pl-2.5 pr-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-500 hover:text-navy-900 transition">
            <Icon.search size={15} />
            <span className="text-[12.5px] font-medium">Search…</span>
            <kbd className="text-[10px] font-semibold text-slate-400 bg-white ring-1 ring-slate-200 rounded px-1 py-0.5">⌘K</kbd>
          </button>
        )}

        <div className="relative" ref={nRef}>
          <button onClick={() => { close(); setNOpen((o) => !o); }} className="text-slate-500 hover:text-navy-900 w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-100 relative transition" aria-label="Notifications">
            <Icon.bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-bold bg-gold-500 text-white rounded-full ring-2 ring-white">{unread}</span>
            )}
          </button>
          {nOpen && (
            <div className="glass-card-solid absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-1.5rem)] text-ink rounded-xl p-2 z-[60] shadow-float">
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
                    <button key={n.id} onClick={() => setReadIds((s) => new Set([...s, n.id]))} className={`w-full text-left flex gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-100 transition ${n.read ? "opacity-60" : ""}`}>
                      <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 mt-0.5 ${toneBg(n.tone)}`}><IC size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[13px] text-navy-900 truncate">{n.t}</span>
                          <span className="text-[10px] text-slate-500 shrink-0">{n.time}</span>
                        </span>
                        <span className="block text-[12px] text-slate-500 leading-snug mt-0.5">{n.b}</span>
                      </span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="px-2 py-1.5 border-t border-slate-200/70 mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Showing {feed.length} for {cur.label}</span>
                <button onClick={() => { setNOpen(false); toast("Demo — notification settings."); }} className="hover:text-navy-900 inline-flex items-center gap-1"><Icon.cog size={12} /> Settings</button>
              </div>
            </div>
          )}
        </div>

        {/* avatar menu */}
        <div className="relative" ref={aRef}>
          <button onClick={() => { close(); setAOpen((o) => !o); }} className="flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl pl-1 pr-1.5 py-1 transition">
            <span className="w-7 h-7 rounded-lg grid place-items-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>EM</span>
            <Icon.chevD size={14} className="text-slate-500" />
          </button>
          {aOpen && (
            <div className="glass-card-solid absolute right-0 mt-2 w-60 text-ink rounded-xl p-1.5 z-[60] shadow-float">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <div className="font-semibold text-sm text-navy-900">Elena M.</div>
                <div className="text-[12px] text-slate-500">elena@example.com</div>
              </div>
              <button onClick={() => { setAOpen(false); go("customer", "mybookings"); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-slate-100"><Icon.grid size={15} /> My bookings</button>
              <button onClick={() => { setAOpen(false); go("customer", "mydocs"); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-slate-100"><Icon.receipt size={15} /> My documents</button>
              <button onClick={() => { setAOpen(false); setSettingsOpen(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-slate-100"><Icon.cog size={15} /> Account settings</button>
              <div className="px-3 pt-2 pb-1 mt-1 border-t border-slate-100 text-[10px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5"><Icon.globe size={11} /> Language</div>
              <div className="px-1.5 pb-1 grid grid-cols-2 gap-1">
                {LANGS.map((l) => (
                  <button key={l.code} onClick={() => setLang(l.code)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[12px] ${lang === l.code ? "bg-slate-100 font-semibold text-navy-900" : "text-slate-700 hover:bg-slate-100"}`}>
                    <span><span className="font-semibold mr-1.5">{l.code}</span><span className="text-slate-500">{l.label}</span></span>
                    {lang === l.code && <Icon.check size={12} className="text-teal-600" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button onClick={() => { setAOpen(false); setSignedIn(false); toast("Signed out (demo)."); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50"><Icon.arrowL size={15} /> Sign out</button>
              </div>
            </div>
          )}
        </div>

        {/* Persona switcher. On the customer surface it's a quiet "Demo" chip
            so it doesn't read as a real account control; on staff personas it
            keeps the accent-tinted treatment that signals "you are in role X". */}
        <div className="relative" ref={pRef}>
          {persona === "customer" ? (
            <button onClick={() => { close(); setPOpen((o) => !o); }}
              title="Demo — view as another persona"
              className="flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-navy-900 transition">
              <Icon.layers size={13} />
              <span className="hidden md:inline">Demo</span>
              <Icon.chevD size={12} />
            </button>
          ) : (
            <button onClick={() => { close(); setPOpen((o) => !o); }}
              style={{ background: cur.color + "14", borderColor: cur.color + "55" }}
              className="flex items-center gap-2 ring-1 rounded-xl pl-1.5 pr-3 py-1.5 text-sm font-semibold hover:brightness-[.98] transition">
              <span className="w-6 h-6 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: cur.color }}>{Icon[cur.icon]({ size: 13 })}</span>
              <span className="hidden md:inline text-navy-900">{cur.label}</span>
              <Icon.chevD size={14} className="text-slate-400" />
            </button>
          )}
          {pOpen && (
            <div className="glass-card-solid absolute right-0 mt-2 w-72 text-ink rounded-xl p-1.5 z-[60] shadow-float">
              <div className="px-2.5 py-1.5 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">View as persona</div>
              {PERSONAS.map((p) => (
                <button key={p.id} onClick={() => { setPersona(p.id); setPOpen(false); }}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-sm ${persona === p.id ? "bg-slate-100" : ""} hover:bg-slate-100`}>
                  <span className="w-7 h-7 rounded-lg grid place-items-center text-white shrink-0 mt-0.5" style={{ background: p.color }}>{Icon[p.icon]({ size: 14 })}</span>
                  <span className="text-left">
                    <span className="font-semibold flex items-center gap-1.5">{p.label}{persona === p.id && <Icon.check size={14} />}</span>
                    <span className="block text-[11px] text-slate-500 leading-tight">{p.blurb}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <NavSheet open={navOpen} onClose={() => setNavOpen(false)} persona={persona} page={page} setPage={setPage} />
    </header>
  );
}

/* ---------- Mobile page-nav sheet ----------
   The single source of truth for "where can I go" on a phone — opened from the
   TopBar title and from the bottom tab bar's "More". Lists every page for the
   active persona with icons, active state and roadmap (Future) badges. */
export function NavSheet({ open, onClose, persona, page, setPage }) {
  const all = NAV[persona] || [];
  const items = all.filter((it) => it.area !== "account");
  const account = all.filter((it) => it.area === "account");
  const p = PERSONAS.find((x) => x.id === persona);
  const Row = (it) => {
    const IconC = Icon[it.icon];
    const active = page === it.k;
    return (
      <button key={it.k} onClick={() => { setPage(it.k); onClose(); }}
        className={`flex items-center gap-3 px-3 min-h-[52px] rounded-xl text-[15px] font-semibold transition ${active ? "bg-navy-900 text-white shadow-btn-primary" : "text-slate-700 hover:bg-slate-100"}`}>
        {IconC && <IconC size={19} className={active ? "" : "text-slate-500"} />}
        <span className="flex-1 text-left">{it.label}</span>
        {it.badge === "Future" && <Badge tone="future">Future</Badge>}
        {active && <Icon.check size={17} />}
      </button>
    );
  };
  return (
    <Sheet open={open} onClose={onClose} title={p ? p.label : "Menu"}>
      <div className="grid grid-cols-1 gap-1.5">
        {items.map(Row)}
        {account.length > 0 && (
          <>
            <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Account</div>
            {account.map(Row)}
          </>
        )}
      </div>
    </Sheet>
  );
}

function toneBg(tone) {
  return {
    green: "bg-teal-100 text-teal-700 ring-1 ring-teal-200",
    amber: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    indigo: "bg-slaice-100 text-slaice-700 ring-1 ring-slaice-100",
    slate: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
    blue: "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
  }[tone] || "bg-slate-200 text-slate-700 ring-1 ring-slate-300";
}

/* ---------- Account Settings (modal) ---------- */
function SettingsModal({ open, onClose }) {
  const { toast, lang, setLang } = useApp();
  const [name, setName] = useState("Elena Manoli");
  const [email, setEmail] = useState("elena@example.com");
  const [phone, setPhone] = useState("+30 694 000 0000");
  const [prefs, setPrefs] = useState({ push: true, email: true, sms: false, offers: true });
  const [cards, setCards] = useState([
    { brand: "Visa", last4: "4242", exp: "08/27" },
    { brand: "Mastercard", last4: "5210", exp: "11/26" },
  ]);
  const [privacy, setPrivacy] = useState(false);
  const save = () => { onClose(); toast("Account settings saved.", { tone: "success" }); };
  const removeCard = (card) => {
    setCards((cs) => cs.filter((c) => c.last4 !== card.last4));
    toast(`Removed card ending ${card.last4}.`, { action: { label: "Undo", onClick: () => setCards((cs) => (cs.find((c) => c.last4 === card.last4) ? cs : [...cs, card])) } });
  };
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
            {cards.length === 0 ? (
              <div className="text-[13px] text-slate-500 rounded-xl bg-slate-50 px-3 py-4 text-center">No saved cards. Add one for faster checkout.</div>
            ) : cards.map((c) => (
              <div key={c.last4} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-7 rounded-md bg-gradient-to-br from-navy-800 to-navy-950 text-white text-[10px] font-bold grid place-items-center">{c.brand.slice(0, 4).toUpperCase()}</span>
                  <div><div className="font-semibold text-sm text-navy-900">•••• {c.last4}</div><div className="text-[11px] text-slate-500">Exp {c.exp}</div></div>
                </div>
                <button aria-label={`Remove card ending ${c.last4}`} onClick={() => removeCard(c)} className="w-9 h-9 grid place-items-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"><Icon.trash size={15} /></button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Privacy &amp; data</div>
          <button onClick={() => setPrivacy(true)} className="w-full text-left flex items-center gap-3 rounded-2xl ring-1 ring-slate-200 bg-white/70 px-3.5 py-3 hover:ring-teal-400 hover:bg-slate-50 transition group">
            <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 grid place-items-center shrink-0"><Icon.shieldCheck size={20} /></span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-navy-900">Privacy Centre</div>
              <div className="text-[12px] text-slate-600 leading-snug">Export your data, manage consents, see who processes it, or delete your account.</div>
            </div>
            <Icon.chevR size={18} className="text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition" />
          </button>
        </section>

        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Security</div>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="outline" size="sm" icon={Icon.lock} onClick={() => toast("Password reset e-mail sent.", { tone: "info" })}>Change password</Btn>
            <Btn variant="outline" size="sm" icon={Icon.phone} onClick={() => toast("2FA setup started.", { tone: "info" })}>Enable 2FA</Btn>
          </div>
        </section>
      </div>
      <PrivacyCenter open={privacy} onClose={() => setPrivacy(false)} />
    </Modal>
  );
}

function PrefRow({ label, sub, on, set }) {
  return (
    <div className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
      <div><div className="font-semibold text-sm text-navy-900">{label}</div><div className="text-[11px] text-slate-500">{sub}</div></div>
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
              className={`group relative w-full flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${active ? "bg-navy-900 text-white shadow-btn-primary" : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"}`}>
              <span className={`absolute left-1.5 top-2 bottom-2 w-1 rounded-full transition-all duration-200 ${active ? "bg-teal-400 opacity-100" : "bg-transparent opacity-0 group-hover:bg-teal-300 group-hover:opacity-100"}`} />
              {IconC && <IconC size={17} className={active ? "" : "text-slate-500 group-hover:text-teal-600 transition-colors"} />}
              <span className="flex-1 text-left">{it.label}</span>
              {it.badge === "Future" && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-orange-300" : "bg-orange-400"}`} title="Roadmap (Future)" />}
            </button>
          );
        })}
      </nav>
      <div className="mt-3 px-2 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-[11px] text-slate-500 leading-relaxed">
        Non-functional mockup. No payments or backend — actions show a demo note.
      </div>
    </aside>
  );
}

/* ---------- Horizontal page nav (used for the Customer persona on every viewport)
   sticky just below the TopBar (top-2 + ~56px header height = ~68px), with a
   near-opaque glass-card background so the "powered by SLAiCE" badge in the
   TopBar above doesn't read through when the user scrolls. ---------- */
export function PageTopNav({ persona, page, setPage }) {
  const items = NAV[persona];
  return (
    <div className="sticky top-[68px] z-20 glass-card-solid rounded-2xl p-1.5 mb-4 flex gap-1.5 overflow-x-auto no-scrollbar">
      {items.map((it) => {
        const IconC = Icon[it.icon];
        const active = page === it.k;
        return (
          <button key={it.k} onClick={() => setPage(it.k)}
            className={`group flex items-center gap-2 h-10 px-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150 ${active ? "bg-navy-900 text-white shadow-btn-primary" : "text-slate-700 hover:bg-white/70 hover:text-navy-900"}`}>
            {IconC && <IconC size={16} className={active ? "" : "text-slate-500 group-hover:text-teal-600 transition-colors"} />}
            <span>{it.label}</span>
            {it.badge === "Future" && <Badge tone="future">Future</Badge>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Bottom tab bar (mobile) ----------
   Replaces the two stacked horizontal scroll-strips (persona tabs + page
   pills). Shows the first few destinations for the active persona as fixed
   tabs and folds the rest behind "More" (the NavSheet). Fixed to the bottom
   with safe-area padding so it clears the iOS home indicator. md:hidden —
   desktop uses the sidebar / inline nav. */
export function BottomTabBar({ persona, page, setPage }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const items = NAV[persona] || [];
  // Account destinations always live behind "More" (the nav sheet), never as a
  // fixed tab. Primary tabs are drawn from the main destinations.
  const mainItems = items.filter((it) => it.area !== "account");
  // Up to 4 primary tabs; if there are more, the 5th slot becomes "More".
  const primary = mainItems.length > 5 ? mainItems.slice(0, 4) : mainItems.slice(0, 5);
  const hasMore = items.length > primary.length;
  const moreActive = !primary.some((it) => it.k === page);
  const Tab = ({ icon, label, active, onClick, badge }) => {
    const IconC = typeof icon === "string" ? Icon[icon] : icon;
    return (
      <button onClick={onClick}
        className={`relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 h-14 px-1 transition ${active ? "text-teal-700" : "text-slate-600"}`}>
        {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-teal-500" />}
        {IconC && <IconC size={21} />}
        <span className="text-[11px] font-semibold leading-none truncate max-w-full">{label}</span>
        {badge === "Future" && <span className="absolute top-1.5 right-1/2 translate-x-3 w-1.5 h-1.5 rounded-full bg-orange-400" />}
      </button>
    );
  };
  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-white/40 pb-safe shadow-[0_-8px_24px_-16px_rgba(15,23,42,0.35)]">
        <div className="flex items-stretch px-1">
          {primary.map((it) => (
            <Tab key={it.k} icon={it.icon} label={it.short || it.label.split(" ")[0]} badge={it.badge} active={page === it.k} onClick={() => setPage(it.k)} />
          ))}
          {hasMore && <Tab icon={Icon.layers} label="More" active={moreActive} onClick={() => setMoreOpen(true)} />}
        </div>
      </nav>
      <NavSheet open={moreOpen} onClose={() => setMoreOpen(false)} persona={persona} page={page} setPage={setPage} />
    </>
  );
}

/* ---------- Site footer ----------
   Tenant identity + Slaice credit, centered. Lives at the bottom of every
   page on every persona — replaces the old top-bar branding block and the
   per-persona footer note. */
export function SiteFooter() {
  return (
    <footer className="mt-10 pt-6 pb-4 flex justify-center relative z-10">
      <div className="glass rounded-2xl px-5 py-3 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2.5">
          <TenantLogo size={30} />
          <div className="leading-tight text-left">
            <div className="font-display font-bold text-[14.5px] text-navy-900">{TENANT.name}</div>
            <div className="text-[11px] text-slate-700">{TENANT.subdomain}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-slate-700">
          <span>powered by</span>
          <span className="font-bold text-navy-900">SLA<span className="text-gold-600">i</span>CE</span>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Toasts ---------- */
export function Toasts({ items, onDismiss }) {
  const tones = {
    success: { ic: "checkCircle", chip: "bg-teal-500/20 text-teal-300", bar: "bg-teal-400/70" },
    error: { ic: "alert", chip: "bg-rose-500/20 text-rose-300", bar: "bg-rose-400/70" },
    info: { ic: "info", chip: "bg-sky-500/20 text-sky-300", bar: "bg-sky-400/70" },
    default: { ic: "bolt", chip: "bg-gold-500/20 text-gold-400", bar: "bg-gold-400/70" },
  };
  return (
    <div className="fixed right-4 z-[80] space-y-2.5 w-[340px] max-w-[calc(100vw-2rem)] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4">
      {items.map((t) => {
        const tn = tones[t.tone] || tones.default;
        const IC = Icon[tn.ic];
        return (
          <div key={t.id} role="status" className="glass-dark text-white rounded-xl pl-3 pr-3 py-3 text-sm shadow-float ring-1 ring-white/15 animate-slide-in-right flex items-start gap-2.5 overflow-hidden relative">
            <span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${tn.chip}`}><IC size={15} /></span>
            <span className="flex-1 leading-snug pt-0.5">{t.msg}</span>
            {t.action && (
              <button onClick={() => { t.action.onClick?.(); onDismiss?.(t.id); }}
                className="shrink-0 self-center text-[12px] font-bold text-gold-300 hover:text-gold-200 underline underline-offset-2 px-1">
                {t.action.label}
              </button>
            )}
            <button aria-label="Dismiss" onClick={() => onDismiss?.(t.id)} className="shrink-0 self-start text-white/50 hover:text-white p-0.5 -mr-1"><Icon.x size={14} /></button>
            <span className={`absolute bottom-0 left-0 h-0.5 w-full ${tn.bar}`} style={{ animation: `toastprogress ${(t.duration || 4200) / 1000}s linear forwards`, transformOrigin: "left" }} />
          </div>
        );
      })}
    </div>
  );
}
