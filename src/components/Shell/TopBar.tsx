import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { Badge, Btn, Modal, Field, Input, Select, Toggle, EmptyState } from "../ui";
import { PrivacyCenter } from "../PrivacyCenter";
import { ChangePasswordModal, Enable2FAModal } from "../Security";
import { PERSONAS, NAV } from "../../data/personas";
import { LANGUAGES, useApp, useT } from "../../app/store";
import type { CartItem, LangCode, PersonaId } from "../../domain/types";
import { NavSheet } from "./Nav";
import type { NavProps } from "./types";

interface FeedItem { ic: string; tone: string; t: string; b: string; time: string }

function cartGlyph(kind: string) {
  const m: Record<string, IconRenderer> = { sunbed: Icon.umbrella, ticket: Icon.ticket, locker: Icon.lock, parking: Icon.car };
  const I = m[kind] || Icon.card;
  return <I size={13} />;
}

/* ---------- Per-persona notification feeds (mocked) ---------- */
const FEEDS: Record<string, FeedItem[]> = {
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
export function TopBar({ persona, setPersona, page, setPage }: NavProps & { setPersona: (p: PersonaId) => void }) {
  const { lang, setLang, setSignedIn, go, toast, cart, removeFromCart, addToCart, clearCart } = useApp();
  const t = useT();
  const cartCount = (cart || []).length;
  const cartTotal = (cart || []).reduce((a, b) => a + b.price, 0);
  // Basket + notifications are controlled Popovers so their in-panel CTAs can
  // close them on navigation; the account + persona menus are uncontrolled
  // Radix DropdownMenus that close themselves on select.
  const [basketOpen, setBasketOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // mobile page-nav sheet
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifSettingsOpen, setNotifSettingsOpen] = useState(false);
  const cur = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];
  const baseFeed = FEEDS[persona] || FEEDS.customer;
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const feed = useMemo(() => baseFeed.map((n, i) => ({ ...n, id: `${persona}-${i}`, read: readIds.has(`${persona}-${i}`) })), [baseFeed, persona, readIds]);
  const unread = feed.filter((n) => !n.read).length;
  const markAll = () => setReadIds(new Set(feed.map((n) => n.id)));
  const removeBasketItem = (it: CartItem) => {
    if (!removeFromCart) return;
    removeFromCart(it.kind, it.id);
    toast(`${t("Removed")} ${t(it.label)}.`, { action: { label: t("Undo"), onClick: () => addToCart && addToCart(it) } });
  };
  const emptyBasket = () => {
    if (!clearCart) return;
    const snapshot = [...(cart || [])];
    clearCart();
    setBasketOpen(false);
    toast(t("Basket emptied."), { action: { label: t("Undo"), onClick: () => snapshot.forEach((it) => addToCart && addToCart(it)) } });
  };

  // On staff personas the page title slot shows the current page name (sidebar
  // is the primary nav). On the customer surface, the logo acts as the home
  // link and the bar is a compact action cluster — no inline nav here.
  const navItems = NAV[persona] || [];
  const currentItem = navItems.find((it) => it.k === page);
  const CurrentIcon = currentItem && Icon[currentItem.icon];
  return (
    <header className={`glass text-navy-900 rounded-2xl mb-4 flex items-center relative z-30 shadow-soft sticky top-2 ${persona === "customer" ? "px-1.5 py-1 gap-1 w-fit mx-auto" : "px-2 py-1.5 gap-2"}`}>
      {/* Staff personas: current page title — tapping opens the full nav sheet
          on mobile; non-interactive on desktop where the sidebar is primary. */}
      {persona !== "customer" && (
        <button
          onClick={() => setNavOpen(true)}
          className="md:pointer-events-none flex items-center gap-2 pl-1.5 pr-2 h-11 rounded-xl min-w-0 flex-1 hover:bg-white/60 md:hover:bg-transparent transition"
          aria-label={t("Open navigation")}>
          {CurrentIcon && <CurrentIcon size={17} className="text-slate-500 shrink-0" />}
          <span className="font-display font-bold truncate text-[15px]">
            <span className="md:hidden">{currentItem ? t(currentItem.short || currentItem.label) : ""}</span>
            <span className="hidden md:inline">{currentItem ? t(currentItem.label) : ""}</span>
          </span>
          <Icon.chevD size={15} className="text-slate-400 shrink-0 md:hidden" />
        </button>
      )}

      <div className={`flex items-center shrink-0 ${persona === "customer" ? "gap-0.5" : "gap-2"}`}>
        {/* basket popup — only on the customer persona */}
        {persona === "customer" && (
        <Popover.Root open={basketOpen} onOpenChange={setBasketOpen}>
          <Popover.Trigger asChild>
            <button className="text-slate-500 hover:text-navy-900 w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-100 data-[state=open]:bg-slate-100 data-[state=open]:text-navy-900 relative transition" aria-label={t("Basket")} title={t("Basket")}>
              <Icon.card size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-bold bg-teal-500 text-white rounded-full ring-2 ring-white">{cartCount}</span>
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="end" sideOffset={8} aria-label={t("Basket")} className="glass w-[320px] max-w-[calc(100vw-1.5rem)] text-ink rounded-xl p-2 z-[60] shadow-float origin-top-right data-[state=open]:animate-scale-in">
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="font-semibold text-navy-900 text-sm flex items-center gap-2">
                  <Icon.card size={14} /> {t("Your basket")}
                  {cartCount > 0 && <Badge tone="green">{cartCount} {cartCount === 1 ? t("item") : t("items")}</Badge>}
                </div>
                {cartCount > 0 && <span className="text-[12px] font-bold text-navy-900 tnum">€{cartTotal}</span>}
              </div>
              {cartCount === 0 ? (
                <div className="px-2 pb-2">
                  <EmptyState compact icon={Icon.card} title={t("Cart is empty")} body={t("Plan a visit to add sunbeds, tickets, a locker or parking.")} className="rounded-xl bg-slate-50" />
                  <Btn variant="teal" full size="sm" icon={Icon.sparkles} className="mt-2" onClick={() => { setBasketOpen(false); go("customer", "plan"); }}>{t("Plan my visit")}</Btn>
                </div>
              ) : (
                <>
                  <div className="max-h-[300px] overflow-y-auto space-y-1 pr-0.5">
                    {(cart || []).map((it) => (
                      <div key={it.kind + it.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-100 transition">
                        <span className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center text-slate-600 shrink-0">{cartGlyph(it.kind)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-[13px] text-navy-900 truncate">{t(it.label)}</span>
                          <span className="block text-[11px] text-slate-500 truncate">{t(it.sub)}</span>
                        </span>
                        <span className="text-[12px] font-semibold text-navy-900 tnum shrink-0">€{it.price}</span>
                        <button aria-label={`${t("Remove")} ${t(it.label)}`} onClick={() => removeBasketItem(it)} className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 shrink-0"><Icon.trash size={13} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="px-2 pt-2 mt-1 border-t border-slate-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{t("Subtotal")}</span>
                      <span className="font-bold text-navy-900 tnum">€{cartTotal}</span>
                    </div>
                    <Btn variant="teal" full size="sm" icon={Icon.card} onClick={() => { setBasketOpen(false); go("customer", "checkout"); }}>{t("Checkout")}</Btn>
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={emptyBasket} className="text-[11px] text-slate-500 hover:text-rose-600 py-1 inline-flex items-center gap-1"><Icon.trash size={12} /> {t("Empty basket")}</button>
                      <button onClick={() => { setBasketOpen(false); go("customer", "plan"); }} className="text-[11px] text-slate-500 hover:text-navy-900 py-1">{t("Continue planning")}</button>
                    </div>
                  </div>
                </>
              )}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        )}

        {/* Global search / command palette (⌘K). On staff personas it's a
            labelled field; on the customer surface it's a compact icon so it
            doesn't crowd the basket + persona cluster. */}
        {persona === "customer" ? (
          <button onClick={() => window.dispatchEvent(new Event("slaice:cmdk"))} aria-label={t("Search (⌘K)")} title={t("Search ⌘K")}
            className="text-slate-500 hover:text-navy-900 w-10 h-10 hidden sm:grid place-items-center rounded-xl hover:bg-slate-100 transition">
            <Icon.search size={18} />
          </button>
        ) : (
          <button onClick={() => window.dispatchEvent(new Event("slaice:cmdk"))} aria-label={t("Search (⌘K)")}
            className="hidden sm:flex items-center gap-2 h-10 pl-2.5 pr-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-500 hover:text-navy-900 transition">
            <Icon.search size={15} />
            <span className="text-[12.5px] font-medium">{t("Search…")}</span>
            <kbd className="text-[10px] font-semibold text-slate-400 bg-white ring-1 ring-slate-200 rounded px-1 py-0.5">⌘K</kbd>
          </button>
        )}

        <Popover.Root open={notifOpen} onOpenChange={setNotifOpen}>
          <Popover.Trigger asChild>
            <button className="text-slate-500 hover:text-navy-900 w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-100 data-[state=open]:bg-slate-100 data-[state=open]:text-navy-900 relative transition" aria-label={t("Notifications")}>
              <Icon.bell size={18} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-bold bg-gold-500 text-white rounded-full ring-2 ring-white">{unread}</span>
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="end" sideOffset={8} aria-label={t("Notifications")} className="glass w-[340px] max-w-[calc(100vw-1.5rem)] text-ink rounded-xl p-2 z-[60] shadow-float origin-top-right data-[state=open]:animate-scale-in">
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="font-semibold text-navy-900 text-sm flex items-center gap-2">
                  <Icon.bell size={14} /> {t("Notifications")}
                  {unread > 0 && <Badge tone="amber">{unread} {t("new")}</Badge>}
                </div>
                <button onClick={markAll} className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 disabled:text-slate-300" disabled={unread === 0}>{t("Mark all read")}</button>
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
                <span>{t("Showing")} {feed.length} {t("for")} {t(cur.label)}</span>
                <button onClick={() => { setNotifOpen(false); setNotifSettingsOpen(true); }} className="hover:text-navy-900 inline-flex items-center gap-1"><Icon.cog size={12} /> {t("Settings")}</button>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* avatar menu */}
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger asChild>
            <button aria-label={t("Account menu")} className="flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-200/80 data-[state=open]:bg-slate-200/80 rounded-xl pl-1 pr-1.5 py-1 transition">
              <span className="w-7 h-7 rounded-lg grid place-items-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>EM</span>
              <Icon.chevD size={14} className="text-slate-500" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className="glass w-60 text-ink rounded-xl p-1.5 z-[60] shadow-float origin-top-right data-[state=open]:animate-scale-in">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <div className="font-semibold text-sm text-navy-900">Elena M.</div>
                <div className="text-[12px] text-slate-500">elena@example.com</div>
              </div>
              <DropdownMenu.Item onSelect={() => go("customer", "mybookings")} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer select-none outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100"><Icon.grid size={15} /> {t("My bookings")}</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => go("customer", "mydocs")} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer select-none outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100"><Icon.receipt size={15} /> {t("My documents")}</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => setSettingsOpen(true)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer select-none outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100"><Icon.cog size={15} /> {t("Account settings")}</DropdownMenu.Item>
              <DropdownMenu.Label className="px-3 pt-2 pb-1 mt-1 border-t border-slate-100 text-[10px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5"><Icon.globe size={11} /> {t("Language")}</DropdownMenu.Label>
              <DropdownMenu.RadioGroup value={lang} onValueChange={(v) => setLang(v as LangCode)} className="px-1.5 pb-1 grid grid-cols-2 gap-1">
                {LANGUAGES.map((l) => (
                  <DropdownMenu.RadioItem key={l.code} value={l.code} onSelect={(e) => e.preventDefault()}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[12px] cursor-pointer select-none outline-none ${lang === l.code ? "bg-slate-100 font-semibold text-navy-900" : "text-slate-700 hover:bg-slate-100 data-[highlighted]:bg-slate-100"}`}>
                    <span><span className="font-semibold mr-1.5 uppercase">{l.code}</span><span className="text-slate-500">{l.native}</span></span>
                    {lang === l.code && <Icon.check size={12} className="text-teal-600" />}
                  </DropdownMenu.RadioItem>
                ))}
              </DropdownMenu.RadioGroup>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <DropdownMenu.Item onSelect={() => { setSignedIn(false); toast(t("Signed out (demo).")); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-rose-600 cursor-pointer select-none outline-none hover:bg-rose-50 data-[highlighted]:bg-rose-50"><Icon.arrowL size={15} /> {t("Sign out")}</DropdownMenu.Item>
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Persona switcher. On the customer surface it's a quiet "Demo" chip
            so it doesn't read as a real account control; on staff personas it
            keeps the accent-tinted treatment that signals "you are in role X". */}
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger asChild>
            {persona === "customer" ? (
              <button
                title={t("Demo — view as another persona")} aria-label={t("Switch persona (demo)")}
                className="flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-200/80 data-[state=open]:bg-slate-200/80 rounded-xl px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-navy-900 data-[state=open]:text-navy-900 transition">
                <Icon.layers size={13} />
                <span className="hidden md:inline">{t("Demo")}</span>
                <Icon.chevD size={12} />
              </button>
            ) : (
              <button
                aria-label={`${t("Switch persona — currently")} ${t(cur.label)}`}
                style={{ background: cur.color + "14", borderColor: cur.color + "55" }}
                className="flex items-center gap-2 ring-1 rounded-xl pl-1.5 pr-3 py-1.5 text-sm font-semibold hover:brightness-[.98] transition">
                <span className="w-6 h-6 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: cur.color }}>{(() => { const I = Icon[cur.icon]; return I ? <I size={13} /> : null; })()}</span>
                <span className="hidden md:inline text-navy-900">{t(cur.label)}</span>
                <Icon.chevD size={14} className="text-slate-400" />
              </button>
            )}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className="glass w-72 text-ink rounded-xl p-1.5 z-[60] shadow-float origin-top-right data-[state=open]:animate-scale-in">
              <DropdownMenu.Label className="px-2.5 py-1.5 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{t("View as persona")}</DropdownMenu.Label>
              {PERSONAS.map((p) => (
                <DropdownMenu.Item key={p.id} onSelect={() => setPersona(p.id)}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer select-none outline-none ${persona === p.id ? "bg-slate-100" : ""} hover:bg-slate-100 data-[highlighted]:bg-slate-100`}>
                  <span className="w-7 h-7 rounded-lg grid place-items-center text-white shrink-0 mt-0.5" style={{ background: p.color }}>{(() => { const I = Icon[p.icon]; return I ? <I size={14} /> : null; })()}</span>
                  <span className="text-left">
                    <span className="font-semibold flex items-center gap-1.5">{t(p.label)}{persona === p.id && <Icon.check size={14} />}</span>
                    <span className="block text-[11px] text-slate-500 leading-tight">{t(p.blurb)}</span>
                  </span>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <NotificationSettingsModal open={notifSettingsOpen} onClose={() => setNotifSettingsOpen(false)} />
      <NavSheet open={navOpen} onClose={() => setNavOpen(false)} persona={persona} page={page} setPage={setPage} />
    </header>
  );
}

function toneBg(tone: string) {
  return {
    green: "bg-teal-100 text-teal-700 ring-1 ring-teal-200",
    amber: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    indigo: "bg-slaice-100 text-slaice-700 ring-1 ring-slaice-100",
    slate: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
    blue: "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
  }[tone] || "bg-slate-200 text-slate-700 ring-1 ring-slate-300";
}

/* ---------- Account Settings (modal) ---------- */
function NotificationSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useApp();
  const t = useT();
  const [chan, setChan] = useState({ push: true, email: true, sms: false });
  const [cats, setCats] = useState({ bookings: true, weather: true, offers: true, receipts: true });
  const done = () => { onClose(); toast(t("Notification preferences saved."), { tone: "success" }); };
  return (
    <Modal open={open} onClose={onClose} title={t("Notification settings")}
      footer={<Btn variant="primary" icon={Icon.check} onClick={done}>{t("Done")}</Btn>}>
      <div className="space-y-5">
        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">{t("Channels")}</div>
          <div className="space-y-2">
            <PrefRow label={t("Push")} sub={t("In-app and device alerts.")} on={chan.push} set={(v) => setChan((c) => ({ ...c, push: v }))} />
            <PrefRow label={t("E-mail")} sub={t("A copy to elena@example.com.")} on={chan.email} set={(v) => setChan((c) => ({ ...c, email: v }))} />
            <PrefRow label={t("SMS")} sub={t("Critical alerts only.")} on={chan.sms} set={(v) => setChan((c) => ({ ...c, sms: v }))} />
          </div>
        </section>
        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">{t("What to notify me about")}</div>
          <div className="space-y-2">
            <PrefRow label={t("Booking updates")} sub={t("Confirmations, gate scans, refunds.")} on={cats.bookings} set={(v) => setCats((c) => ({ ...c, bookings: v }))} />
            <PrefRow label={t("Weather alerts")} sub={t("Wind or conditions affecting your visit.")} on={cats.weather} set={(v) => setCats((c) => ({ ...c, weather: v }))} />
            <PrefRow label={t("Offers & promotions")} sub={t("Weekend deals and seasonal perks.")} on={cats.offers} set={(v) => setCats((c) => ({ ...c, offers: v }))} />
            <PrefRow label={t("Receipts & documents")} sub={t("myDATA receipts and invoices.")} on={cats.receipts} set={(v) => setCats((c) => ({ ...c, receipts: v }))} />
          </div>
        </section>
      </div>
    </Modal>
  );
}

function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast, lang, setLang } = useApp();
  const t = useT();
  const [name, setName] = useState("Elena Manoli");
  const [email, setEmail] = useState("elena@example.com");
  const [phone, setPhone] = useState("+30 694 000 0000");
  const [prefs, setPrefs] = useState({ push: true, email: true, sms: false, offers: true });
  const [cards, setCards] = useState<{ brand: string; last4: string; exp: string }[]>([
    { brand: "Visa", last4: "4242", exp: "08/27" },
    { brand: "Mastercard", last4: "5210", exp: "11/26" },
  ]);
  const [privacy, setPrivacy] = useState(false);
  const [changePw, setChangePw] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const save = () => { onClose(); toast(t("Account settings saved."), { tone: "success" }); };
  const removeCard = (card: { brand: string; last4: string; exp: string }) => {
    setCards((cs) => cs.filter((c) => c.last4 !== card.last4));
    toast(`${t("Removed card ending")} ${card.last4}.`, { action: { label: t("Undo"), onClick: () => setCards((cs) => (cs.find((c) => c.last4 === card.last4) ? cs : [...cs, card])) } });
  };
  return (
    <Modal open={open} onClose={onClose} title={t("Account settings")} wide
      footer={<><Btn variant="ghost" onClick={onClose}>{t("Cancel")}</Btn><Btn variant="primary" icon={Icon.check} onClick={save}>{t("Save changes")}</Btn></>}>
      <div className="space-y-5">
        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">{t("Profile")}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("Full name")}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label={t("E-mail")}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label={t("Phone")}><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <Field label={t("Language")}>
              <Select value={lang} onChange={(e) => setLang(e.target.value as LangCode)} options={LANGUAGES.map((l) => ({ v: l.code, l: `${l.code.toUpperCase()} — ${l.native}` }))} />
            </Field>
          </div>
        </section>

        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">{t("Notifications")}</div>
          <div className="space-y-2">
            <PrefRow label={t("Push notifications")} sub={t("Booking updates, gate scans, refunds.")} on={prefs.push} set={(v) => setPrefs((p) => ({ ...p, push: v }))} />
            <PrefRow label={t("E-mail")} sub={t("Receipts, invoices, weekly summaries.")} on={prefs.email} set={(v) => setPrefs((p) => ({ ...p, email: v }))} />
            <PrefRow label={t("SMS")} sub={t("Critical alerts only.")} on={prefs.sms} set={(v) => setPrefs((p) => ({ ...p, sms: v }))} />
            <PrefRow label={t("Marketing offers")} sub={t("Weekend deals & seasonal promotions.")} on={prefs.offers} set={(v) => setPrefs((p) => ({ ...p, offers: v }))} />
          </div>
        </section>

        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center justify-between">
            <span>{t("Saved payment methods")}</span>
            <button onClick={() => toast(t("Demo — Stripe SetupIntent flow."))} className="text-teal-700 text-[12px] font-semibold normal-case tracking-normal inline-flex items-center gap-1"><Icon.plus size={12} /> {t("Add card")}</button>
          </div>
          <div className="space-y-2">
            {cards.length === 0 ? (
              <div className="text-[13px] text-slate-500 rounded-xl bg-slate-50 px-3 py-4 text-center">{t("No saved cards. Add one for faster checkout.")}</div>
            ) : cards.map((c) => (
              <div key={c.last4} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-7 rounded-md bg-gradient-to-br from-navy-800 to-navy-950 text-white text-[10px] font-bold grid place-items-center">{c.brand.slice(0, 4).toUpperCase()}</span>
                  <div><div className="font-semibold text-sm text-navy-900">•••• {c.last4}</div><div className="text-[11px] text-slate-500">{t("Exp")} {c.exp}</div></div>
                </div>
                <button aria-label={`${t("Remove card ending")} ${c.last4}`} onClick={() => removeCard(c)} className="w-9 h-9 grid place-items-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"><Icon.trash size={15} /></button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">{t("Privacy & data")}</div>
          <button onClick={() => setPrivacy(true)} className="w-full text-left flex items-center gap-3 rounded-2xl ring-1 ring-slate-200 bg-white/70 px-3.5 py-3 hover:ring-teal-400 hover:bg-slate-50 transition group">
            <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 grid place-items-center shrink-0"><Icon.shieldCheck size={20} /></span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-navy-900">{t("Privacy Centre")}</div>
              <div className="text-[12px] text-slate-600 leading-snug">{t("Export your data, manage consents, see who processes it, or delete your account.")}</div>
            </div>
            <Icon.chevR size={18} className="text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition" />
          </button>
        </section>

        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">{t("Security")}</div>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="outline" size="sm" icon={Icon.lock} onClick={() => setChangePw(true)}>{t("Change password")}</Btn>
            <Btn variant="outline" size="sm" icon={Icon.phone} onClick={() => setTwoFA(true)}>{t("Enable 2FA")}</Btn>
          </div>
        </section>
      </div>
      <PrivacyCenter open={privacy} onClose={() => setPrivacy(false)} />
      <ChangePasswordModal open={changePw} onClose={() => setChangePw(false)} />
      <Enable2FAModal open={twoFA} onClose={() => setTwoFA(false)} />
    </Modal>
  );
}

function PrefRow({ label, sub, on, set }: { label: ReactNode; sub: ReactNode; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
      <div><div className="font-semibold text-sm text-navy-900">{label}</div><div className="text-[11px] text-slate-500">{sub}</div></div>
      <Toggle on={on} onChange={set} />
    </div>
  );
}
