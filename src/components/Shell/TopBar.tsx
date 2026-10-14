import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { usePageHelp } from "../../lib/pageHelp";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { Badge, Btn, EmptyState, NotMvpBadge } from "../ui";
import { PROFILE } from "../../domain/account";
import { PERSONAS, NAV } from "../../data/personas";
import { LANGUAGES, useApp, useT } from "../../app/store";
import { deviceLang } from "../../app/i18n";
import { useInbox } from "../../lib/useInbox";
import type { CartItem, LangCode, PersonaId } from "../../domain/types";
import { NavSheet } from "./Nav";
import { PersonaSwitcher } from "./PersonaSwitcher";
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
  callcenter: [
    { ic: "phone", tone: "green", t: "Phone booking sent", b: "Macaw · MC-04 blocked · QR sent by SMS to +30 694 …0011.", time: "5m" },
    { ic: "refund", tone: "amber", t: "Escalation answered", b: "Manager approved the refund for #BK-10410.", time: "40m" },
    { ic: "bell", tone: "indigo", t: "Busy line", b: "Calls peak 10:00–12:00 on weekends — 2 agents scheduled.", time: "2h" },
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
  support: [
    { ic: "link", tone: "amber", t: "Pay-by-link awaiting", b: "MC-04, MC-05 reserved for Eleni — link expires in 25 min.", time: "5m" },
    { ic: "scan", tone: "green", t: "Gate validated · 124", b: "All scans clear so far this morning.", time: "now" },
    { ic: "cash", tone: "slate", t: "Till shift open", b: "SH-0205 at the main entrance — you can sell from the till too.", time: "1h" },
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
export function TopBar({ persona, setPersona, page, setPage, previewing = false }: NavProps & { setPersona: (p: PersonaId) => void; previewing?: boolean }) {
  const { setSignedIn, go, toast, cart, removeFromCart, addToCart, clearCart } = useApp();
  const t = useT();
  // Who is signed in: the guest on the customer side, the demo staff member elsewhere.
  const me = persona === "customer"
    ? { initials: `${PROFILE.first[0]}${PROFILE.last[0]}`, name: `${PROFILE.first} ${PROFILE.last}`, email: PROFILE.email }
    : { initials: "EM", name: "Elena M.", email: "elena@example.com" };
  const cartCount = (cart || []).length;
  const cartTotal = (cart || []).reduce((a, b) => a + b.price, 0);
  // Basket + notifications are controlled Popovers so their in-panel CTAs can
  // close them on navigation; the account + persona menus are uncontrolled
  // Radix DropdownMenus that close themselves on select.
  const [basketOpen, setBasketOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // mobile page-nav sheet
  const cur = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];
  const baseFeed = FEEDS[persona] || FEEDS.customer;
  // Inbox (AENR-554): live "Needs action" items first, then the FYI feed; read
  // state is remembered on this device.
  const live = useInbox(persona);
  const [readIds, setReadIdsRaw] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("slaice.inbox.read") ?? "[]")); } catch { return new Set(); }
  });
  const setReadIds = (f: (s: Set<string>) => Set<string>) => setReadIdsRaw((s) => {
    const n = f(s);
    try { localStorage.setItem("slaice.inbox.read", JSON.stringify([...n])); } catch { /* not remembered */ }
    return n;
  });
  const feed = useMemo(() => [
    ...live.map((n) => ({ ic: n.icon, tone: n.tone, t: n.title, b: n.body, time: n.time, id: n.id, kind: n.kind, href: n.href, read: readIds.has(n.id) })),
    ...baseFeed.map((n, i) => ({ ...n, id: `${persona}-${i}`, kind: "fyi" as const, href: undefined as string | undefined, read: readIds.has(`${persona}-${i}`) })),
  ], [live, baseFeed, persona, readIds]);
  const unread = feed.filter((n) => !n.read).length;
  const markAll = () => setReadIds(() => new Set([...readIds, ...feed.map((n) => n.id)]));
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
  const pageHelp = usePageHelp();
  // Pages outside the nav (e.g. a tenant page, AENR-500) get a plain title.
  const currentItem = navItems.find((it) => it.k === page) ?? (page === "tenant" ? { k: "tenant", label: "Tenant", short: "Tenant", icon: "building" } : undefined);
  const CurrentIcon = currentItem && Icon[currentItem.icon];
  return (
    <header
      className={
        persona === "customer"
          ? // Customer: a compact action cluster. Phones: part of the layout (sticky,
            // content starts below it — AENR-575); md+: pinned to the top-right corner.
            "glass text-navy-900 rounded-2xl flex items-center z-40 shadow-soft order-first md:order-none sticky top-2 self-end w-max mb-2 md:mb-0 md:fixed md:top-3 md:right-5 px-1.5 py-1 gap-0.5"
          : "glass text-navy-900 rounded-2xl mb-4 flex items-center relative z-30 shadow-soft sticky top-2 px-1.5 sm:px-2 py-1.5 gap-1 sm:gap-2"
      }
    >
      {/* Staff personas: current page title — tapping opens the full nav sheet
          on mobile; non-interactive on desktop where the sidebar is primary. */}
      {persona !== "customer" && (
        <button
          onClick={() => setNavOpen(true)}
          className="md:pointer-events-none flex items-center gap-2 pl-1.5 pr-2 h-11 rounded-xl min-w-0 flex-1 hover:bg-white/60 md:hover:bg-transparent transition"
          aria-label={t("Open navigation")}>
          {CurrentIcon && <CurrentIcon size={17} className="text-slate-500 shrink-0 hidden sm:block" />}
          <span className="font-display font-bold truncate text-[15px]">
            <span className="md:hidden">{currentItem ? t(currentItem.short || currentItem.label) : ""}</span>
            <span className="hidden md:inline">{currentItem ? t(currentItem.label) : ""}</span>
          </span>
          <Icon.chevD size={15} className="text-slate-400 shrink-0 md:hidden" />
        </button>
      )}
      {persona !== "customer" && pageHelp && (
        <Popover.Root>
          <Popover.Trigger asChild>
            <button type="button" aria-label="About this page" className="-ml-1 w-8 h-8 shrink-0 grid place-items-center rounded-full text-slate-500 hover:text-navy-900 hover:bg-slate-100 data-[state=open]:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              <Icon.help size={16} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="start" sideOffset={6} className="z-[60] max-w-xs rounded-xl bg-white p-3 text-[13px] text-slate-700 leading-snug shadow-overlay ring-1 ring-slate-200">
              {pageHelp}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}

      {/* Tight on phones so the staff page title keeps room (AENR defect: it showed one letter at 390px). */}
      <div className={`flex items-center shrink-0 ${persona === "customer" ? "gap-0.5" : "gap-0.5 sm:gap-2"}`}>
        {/* basket popup — only on the customer persona */}
        {/* A bag with a count, only when something is in it (AENR-649). */}
        {persona === "customer" && (cartCount > 0 || basketOpen) && (
        <Popover.Root open={basketOpen} onOpenChange={setBasketOpen}>
          <Popover.Trigger asChild>
            <button className="text-slate-500 hover:text-navy-900 w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-100 data-[state=open]:bg-slate-100 data-[state=open]:text-navy-900 relative transition" aria-label={`${t("Basket")} · ${cartCount}`} title={t("Basket")}>
              <Icon.bag size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-bold bg-teal-500 text-white rounded-full ring-2 ring-white">{cartCount}</span>
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="end" sideOffset={8} aria-label={t("Basket")} className="glass w-[320px] max-w-[calc(100vw-1.5rem)] text-ink rounded-xl p-2 z-[60] shadow-float origin-top-right data-[state=open]:animate-scale-in">
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="font-semibold text-navy-900 text-sm flex items-center gap-2">
                  <Icon.bag size={14} /> {t("Your basket")}
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
                    <Btn variant="teal" full size="sm" icon={Icon.bag} onClick={() => { setBasketOpen(false); go("customer", "checkout"); }}>{t("Checkout")}</Btn>
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

        {["admin", "callcenter", "cashier", "controller", "accountant", "support"].includes(persona) && (
          <button type="button" onClick={() => window.dispatchEvent(new Event("slaice:command"))} aria-label="Search and commands (⌘K)" title="Search and commands (⌘K)"
            className="text-slate-500 hover:text-navy-900 w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-100 transition">
            <Icon.search size={18} />
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
              <div className="max-h-[420px] overflow-y-auto pr-0.5">
                {(["action", "fyi"] as const).map((k) => {
                  const list = feed.filter((n) => n.kind === k);
                  if (!list.length) return k === "action" && persona !== "customer" ? (
                    <div key={k} className="px-2 py-2 text-[12px] text-slate-500 flex items-center gap-1.5"><Icon.checkCircle size={13} className="text-emerald-600" /> {t("Nothing needs action")}</div>
                  ) : null;
                  return (
                    <section key={k} aria-label={k === "action" ? t("Needs action") : "FYI"} className="mb-1">
                      {persona !== "customer" && <div className="px-2 pt-1.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{k === "action" ? `${t("Needs action")} · ${list.length}` : "FYI"}</div>}
                      <div className="space-y-1">
                        {list.map((n) => {
                          const IC = Icon[n.ic] || Icon.bell;
                          return (
                            <button key={n.id} onClick={() => { setReadIds((s) => new Set([...s, n.id])); if (n.href) { setNotifOpen(false); window.location.hash = n.href; } }}
                              className={`w-full text-left flex gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-100 transition ${n.read ? "opacity-60" : ""}`}>
                              <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 mt-0.5 ${toneBg(n.tone)}`}><IC size={15} /></span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-[13px] text-navy-900 truncate">{n.t}</span>
                                  <span className="text-[10px] text-slate-500 shrink-0">{n.time}</span>
                                </span>
                                <span className="block text-[12px] text-slate-500 leading-snug mt-0.5">{n.b}</span>
                                {n.href && <span className="block text-[11px] font-semibold text-teal-700 mt-0.5">{t("Open")} →</span>}
                              </span>
                              {!n.read && <span className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0" aria-label={t("Unread")} />}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
              <div className="px-2 py-1.5 border-t border-slate-200/70 mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                <span>{t("Showing")} {feed.length} {t("for")} {t(cur.label)}</span>
                <button onClick={() => { setNotifOpen(false); window.location.hash = "#/customer/account?section=notifications"; }} className="hover:text-navy-900 inline-flex items-center gap-1"><Icon.cog size={12} /> {t("Settings")}</button>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Language picker — its own globe menu, to the right of notifications. */}
        <LanguageMenu />

        {/* avatar menu */}
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger asChild>
            <button aria-label={t("Account menu")} className="flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-200/80 data-[state=open]:bg-slate-200/80 rounded-xl p-1 sm:pr-1.5 transition">
              <span className="w-7 h-7 rounded-lg grid place-items-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#f7b535,#e8920e)" }}>{me.initials}</span>
              <Icon.chevD size={14} className="text-slate-500 hidden sm:block" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className="glass w-60 text-ink rounded-xl p-1.5 z-[60] shadow-float origin-top-right data-[state=open]:animate-scale-in">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <div className="font-semibold text-sm text-navy-900">{me.name}</div>
                <div className="text-[12px] text-slate-500">{me.email}</div>
              </div>
              {persona === "customer" && <>
              <DropdownMenu.Item onSelect={() => go("customer", "mybookings")} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer select-none outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100"><Icon.grid size={15} /> {t("My bookings")}</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => go("customer", "account")} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer select-none outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100"><Icon.cog size={15} /> {t("Account")}</DropdownMenu.Item>
              </>}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <DropdownMenu.Item onSelect={() => { setSignedIn(false); toast(t("Signed out (demo).")); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-rose-600 cursor-pointer select-none outline-none hover:bg-rose-50 data-[highlighted]:bg-rose-50"><Icon.arrowL size={15} /> {t("Sign out")}</DropdownMenu.Item>
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Persona switcher — staff only here, as the accent-tinted role chip
            ("you are in role X"). On the customer surface the quiet "Demo"
            variant lives in the bottom-right corner instead (see App.tsx), so
            it doesn't crowd this compact action cluster. */}
        {/* While previewing a staff user (RBAC) the role is fixed — exit via the banner. */}
        {persona !== "customer" && !previewing && (
          <PersonaSwitcher persona={persona} setPersona={setPersona} variant="role" />
        )}
        {/* Phones: the customer's Demo menu (persona + scene) docks here instead of floating (AENR-575). */}
        {persona === "customer" && !previewing && (
          <span className="md:hidden"><PersonaSwitcher persona={persona} setPersona={setPersona} variant="demo" compact /></span>
        )}
      </div>
      <NavSheet open={navOpen} onClose={() => setNavOpen(false)} persona={persona} page={page} setPage={setPage} />
    </header>
  );
}

/* ---------- Language picker (own globe menu) ---------- */
function LanguageMenu() {
  const { lang, setLang, langAuto, setLangAuto } = useApp();
  const t = useT();
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button aria-label={t("Language")} title={t("Language")} className="text-slate-500 hover:text-navy-900 w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-100 data-[state=open]:bg-slate-100 data-[state=open]:text-navy-900 transition">
          <Icon.globe size={18} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} aria-label={t("Language")} className="glass w-60 text-ink rounded-xl p-1.5 z-[60] shadow-float origin-top-right data-[state=open]:animate-scale-in">
          <DropdownMenu.Label className="px-3 pt-1.5 pb-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5"><Icon.globe size={11} /> {t("Language")}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={langAuto ? "auto" : lang} onValueChange={(v) => (v === "auto" ? setLangAuto() : setLang(v as LangCode))} className="px-0.5 pb-0.5 grid gap-0.5">
            {/* Follows the device until a language is picked (AENR-626). */}
            <DropdownMenu.RadioItem value="auto"
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] cursor-pointer select-none outline-none ${langAuto ? "bg-slate-100 font-semibold text-navy-900" : "text-slate-700 hover:bg-slate-100 data-[highlighted]:bg-slate-100"}`}>
              <span className="flex-1 min-w-0 truncate">{t("Automatic")} <span className="text-slate-500 font-normal">· {LANGUAGES.find((l) => l.code === deviceLang())?.native}</span></span>
              <Icon.check size={12} className={`text-teal-600 shrink-0 ${langAuto ? "" : "invisible"}`} />
            </DropdownMenu.RadioItem>
            {LANGUAGES.map((l) => (
              <DropdownMenu.RadioItem key={l.code} value={l.code}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] cursor-pointer select-none outline-none ${!langAuto && lang === l.code ? "bg-slate-100 font-semibold text-navy-900" : "text-slate-700 hover:bg-slate-100 data-[highlighted]:bg-slate-100"}`}>
                <span className="flex-1 min-w-0 truncate"><span className="font-semibold mr-1.5 uppercase">{l.code}</span><span className="text-slate-500">{l.native}</span></span>
                {!l.mvp && <NotMvpBadge className="!text-[10px] !px-1.5" />}
                <Icon.check size={12} className={`text-teal-600 shrink-0 ${!langAuto && lang === l.code ? "" : "invisible"}`} />
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function toneBg(tone: string) {
  return {
    green: "bg-teal-100 text-teal-700 ring-1 ring-teal-200",
    amber: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    red: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
    indigo: "bg-slaice-100 text-slaice-700 ring-1 ring-slaice-100",
    slate: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
    blue: "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
  }[tone] || "bg-slate-200 text-slate-700 ring-1 ring-slate-300";
}

/* ---------- Account Settings (modal) ---------- */
