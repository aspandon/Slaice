import { Fragment, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { Badge, Sheet } from "../ui";
import { PERSONAS, NAV } from "../../data/personas";
import { useNav } from "../../lib/useNav";
import type { NavItem } from "../../domain/types";
import type { NavProps } from "./types";
import { useT } from "../../app/store";
import { TenantNav } from "../../screens/tenant/TenantNav";

/* ---------- Mobile page-nav sheet ----------
   The single source of truth for "where can I go" on a phone — opened from the
   TopBar title and from the bottom tab bar's "More". Lists every page for the
   active persona with icons, active state and roadmap (Future) badges. */
export function NavSheet({ open, onClose, persona, page, setPage }: NavProps & { open: boolean; onClose: () => void }) {
  const t = useT();
  const all = useNav(persona);
  const items = all.filter((it) => it.area !== "account");
  const account = all.filter((it) => it.area === "account");
  const p = PERSONAS.find((x) => x.id === persona) ?? PERSONAS[0];
  const Row = (it: NavItem) => {
    const IconC = Icon[it.icon];
    const active = page === it.k;
    return (
      <button key={it.k} onClick={() => { setPage(it.k); onClose(); }}
        className={`flex items-center gap-3 px-3 min-h-[52px] rounded-xl text-[15px] font-semibold transition ${active ? "bg-navy-900 text-white shadow-btn-primary" : "text-slate-700 hover:bg-slate-100"}`}>
        {IconC && <IconC size={19} className={active ? "" : "text-slate-500"} />}
        <span className="flex-1 text-left">{t(it.label)}</span>
        {it.badge === "Future" && <Badge tone="future">{t("Future")}</Badge>}
        {active && <Icon.check size={17} />}
      </button>
    );
  };
  return (
    <Sheet open={open} onClose={onClose} title={p ? t(p.label) : t("Menu")}>
      <div className="grid grid-cols-1 gap-1.5">
        {items.map((it, i) => (
          <Fragment key={it.k}>
            {it.group && it.group !== items[i - 1]?.group && <div className="px-3 pt-2 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t(it.group)}</div>}
            {Row(it)}
          </Fragment>
        ))}
        {persona === "platform" && <TenantNav onNavigate={onClose} />}
        {account.length > 0 && (
          <>
            <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t("Account")}</div>
            {account.map(Row)}
          </>
        )}
      </div>
    </Sheet>
  );
}

/* ---------- Sidebar ----------
   The Cashier works on a tablet (AENR-584): below xl its sidebar folds to an
   icon rail so the till gets the width; labels stay as accessible names and
   tooltips, and the full sidebar returns at xl. */
export function Sidebar({ persona, page, setPage }: NavProps) {
  const t = useT();
  const items = useNav(persona);
  const p = PERSONAS.find((x) => x.id === persona) ?? PERSONAS[0];
  const rail = persona === "cashier";
  const label = rail ? "sr-only xl:not-sr-only xl:flex-1 xl:text-left" : "flex-1 text-left";
  return (
    <aside className={`${rail ? "w-[76px] xl:w-60 p-2 xl:p-3" : "w-60 p-3"} shrink-0 glass rounded-2xl h-max max-h-[calc(100dvh-100px)] overflow-y-auto no-scrollbar sticky top-[86px] hidden md:block z-20`}>
      <div className={`py-2 flex items-center gap-2 ${rail ? "justify-center xl:justify-start xl:px-2" : "px-2"}`}>
        <span className="w-6 h-6 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: p.color }}>{(() => { const I = Icon[p.icon]; return I ? <I size={13} /> : null; })()}</span>
        <span className={`text-[12px] font-semibold uppercase tracking-wider text-slate-500 ${rail ? "sr-only xl:not-sr-only" : ""}`}>{t(p.label)}</span>
      </div>
      <nav className="space-y-0.5 mt-1">
        {items.map((it, i) => {
          const IconC = Icon[it.icon];
          const active = page === it.k;
          return (
            <Fragment key={it.k}>
            {it.group && it.group !== items[i - 1]?.group && <div className={`px-4 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 ${rail ? "hidden xl:block" : ""}`}>{t(it.group)}</div>}
            <button onClick={() => setPage(it.k)} title={rail ? t(it.label) : undefined} aria-current={active ? "page" : undefined}
              className={`group relative w-full flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${rail ? "justify-center min-h-[52px] xl:min-h-0 xl:justify-start xl:pl-4 xl:pr-3 xl:py-2" : "pl-4 pr-3 py-2"} ${active ? "bg-navy-900 text-white shadow-btn-primary" : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"}`}>
              <span className={`absolute left-1.5 top-2 bottom-2 w-1 rounded-full transition-all duration-200 ${active ? "bg-teal-400 opacity-100" : "bg-transparent opacity-0 group-hover:bg-teal-300 group-hover:opacity-100"}`} />
              {IconC && <IconC size={rail ? 19 : 17} className={`${active ? "" : "text-slate-500 group-hover:text-teal-600 transition-colors"} ${rail ? "xl:w-[17px] xl:h-[17px]" : ""}`} />}
              <span className={label}>{t(it.label)}</span>
              {it.badge === "Future" && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${rail ? "absolute top-2 right-2 xl:static" : ""} ${active ? "bg-orange-300" : "bg-orange-400"}`} title="Roadmap (Future)" />}
            </button>
            </Fragment>
          );
        })}
      </nav>
      {persona === "platform" && <TenantNav />}
      <div className={`mt-3 px-2 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-[11px] text-slate-500 leading-relaxed ${rail ? "hidden xl:block" : ""}`}>
        {t("Non-functional mockup. No payments or backend — actions show a demo note.")}
      </div>
    </aside>
  );
}

/* ---------- Horizontal page nav (used for the Customer persona on every viewport)
   sticky just below the TopBar (top-2 + ~56px header height = ~68px), with a
   near-opaque glass-card background so the "powered by SLAiCE" badge in the
   TopBar above doesn't read through when the user scrolls. ---------- */
export function PageTopNav({ persona, page, setPage }: NavProps) {
  const t = useT();
  const items = useNav(persona);
  return (
    <div className="sticky top-[68px] z-20 glass-card-solid rounded-2xl p-1.5 mb-4 flex gap-1.5 overflow-x-auto no-scrollbar">
      {items.map((it) => {
        const IconC = Icon[it.icon];
        const active = page === it.k;
        return (
          <button key={it.k} onClick={() => setPage(it.k)}
            className={`group flex items-center gap-2 h-10 px-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150 ${active ? "bg-navy-900 text-white shadow-btn-primary" : "text-slate-700 hover:bg-white/70 hover:text-navy-900"}`}>
            {IconC && <IconC size={16} className={active ? "" : "text-slate-500 group-hover:text-teal-600 transition-colors"} />}
            <span>{t(it.label)}</span>
            {it.badge === "Future" && <Badge tone="future">{t("Future")}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Customer top nav (desktop, AENR-563) ----------
   Home · Plan a visit · My bookings · Wallet · Account, centred under the
   tenant logo from md up — phones use the bottom tab bar with the same five. */
export function CustomerNav({ page, setPage }: Pick<NavProps, "page" | "setPage">) {
  const t = useT();
  return (
    <nav aria-label={t("Main")} className="hidden md:flex justify-center -mt-1 mb-4">
      <div className="glass-card-solid rounded-2xl p-1 flex gap-1 shadow-soft">
        {NAV.customer.map((it) => {
          const IconC = Icon[it.icon];
          const active = page === it.k;
          return (
            <button key={it.k} type="button" onClick={() => setPage(it.k)} aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 h-10 px-3.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${active ? "bg-navy-900 text-white shadow-btn-primary" : "text-slate-700 hover:bg-white/80 hover:text-navy-900"}`}>
              {IconC && <IconC size={16} className={active ? "" : "text-slate-500"} />}
              {t(it.label)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ---------- Bottom tab bar (mobile) ----------
   Replaces the two stacked horizontal scroll-strips (persona tabs + page
   pills). Shows the first few destinations for the active persona as fixed
   tabs and folds the rest behind "More" (the NavSheet). Fixed to the bottom
   with safe-area padding so it clears the iOS home indicator. md:hidden —
   desktop uses the sidebar / inline nav. */
/** `away`: the bar slides off screen and leaves the tab order — the customer
 *  booking flow is a focused flow on phones (AENR-752). */
export function BottomTabBar({ persona, page, setPage, away = false }: NavProps & { away?: boolean }) {
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (navRef.current) navRef.current.inert = away;
  }, [away]);
  const items = useNav(persona);
  // Account destinations always live behind "More" (the nav sheet), never as a
  // fixed tab. Primary tabs are drawn from the main destinations.
  const mainItems = items.filter((it) => it.area !== "account");
  // Up to 4 primary tabs; if there are more, the 5th slot becomes "More".
  const primary = mainItems.length > 5 ? mainItems.slice(0, 4) : mainItems.slice(0, 5);
  const hasMore = items.length > primary.length;
  const moreActive = !primary.some((it) => it.k === page);
  const Tab = ({ icon, label, active, onClick, badge }: { icon: string | IconRenderer; label: ReactNode; active: boolean; onClick: () => void; badge?: string }) => {
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
      <nav ref={navRef} aria-hidden={away || undefined} className={`md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-white/40 pb-safe shadow-[0_-8px_24px_-16px_rgba(15,23,42,0.35)] transition-transform duration-base ${away ? "translate-y-full ease-exit" : "translate-y-0 ease-ios"}`}>
        <div className="flex items-stretch px-1">
          {primary.map((it) => (
            <Tab key={it.k} icon={it.icon} label={t(it.short || it.label.split(" ")[0])} badge={it.badge} active={page === it.k} onClick={() => setPage(it.k)} />
          ))}
          {hasMore && <Tab icon={Icon.layers} label={t("More")} active={moreActive} onClick={() => setMoreOpen(true)} />}
        </div>
      </nav>
      <NavSheet open={moreOpen} onClose={() => setMoreOpen(false)} persona={persona} page={page} setPage={setPage} />
    </>
  );
}

/* The till uses the whole screen (AENR-654): no sidebar — Sell · Sales · Register as
   tabs across the top, on every width (they replace the phone tab bar too). */
export function TillTabs({ persona, page, setPage }: NavProps) {
  const t = useT();
  const items = useNav(persona).filter((it) => it.area !== "account");
  // Cash Register module off (AENR-696): no till pages, no tab bar.
  if (!items.length) return null;
  return (
    <nav aria-label={t("Till")} className="mb-3 grid gap-1 rounded-2xl glass-card p-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => {
        const IconC = Icon[it.icon];
        const on = it.k === page;
        return (
          <button key={it.k} type="button" aria-current={on ? "page" : undefined} onClick={() => setPage(it.k)}
            className={`min-h-[44px] rounded-xl inline-flex items-center justify-center gap-2 text-[14px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${on ? "bg-navy-900 text-white shadow-sm" : "text-slate-600 hover:bg-white/70 hover:text-navy-900"}`}>
            {IconC && <IconC size={16} />} {t(it.short ?? it.label)}
          </button>
        );
      })}
    </nav>
  );
}
