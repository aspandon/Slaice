import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { Badge, Sheet } from "../ui";
import { PERSONAS, NAV } from "../../data/personas";
import type { NavItem } from "../../domain/types";
import type { NavProps } from "./types";
import { useT } from "../../app/store";

/* ---------- Mobile page-nav sheet ----------
   The single source of truth for "where can I go" on a phone — opened from the
   TopBar title and from the bottom tab bar's "More". Lists every page for the
   active persona with icons, active state and roadmap (Future) badges. */
export function NavSheet({ open, onClose, persona, page, setPage }: NavProps & { open: boolean; onClose: () => void }) {
  const t = useT();
  const all = NAV[persona] || [];
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
        {items.map(Row)}
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

/* ---------- Sidebar ---------- */
export function Sidebar({ persona, page, setPage }: NavProps) {
  const t = useT();
  const items = NAV[persona];
  const p = PERSONAS.find((x) => x.id === persona) ?? PERSONAS[0];
  return (
    <aside className="w-60 shrink-0 glass rounded-2xl p-3 h-max sticky top-[86px] hidden md:block z-20">
      <div className="px-2 py-2 flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: p.color }}>{(() => { const I = Icon[p.icon]; return I ? <I size={13} /> : null; })()}</span>
        <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">{t(p.label)}</span>
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
              <span className="flex-1 text-left">{t(it.label)}</span>
              {it.badge === "Future" && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-orange-300" : "bg-orange-400"}`} title="Roadmap (Future)" />}
            </button>
          );
        })}
      </nav>
      <div className="mt-3 px-2 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-[11px] text-slate-500 leading-relaxed">
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
            <span>{t(it.label)}</span>
            {it.badge === "Future" && <Badge tone="future">{t("Future")}</Badge>}
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
export function BottomTabBar({ persona, page, setPage }: NavProps) {
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = NAV[persona] || [];
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
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-white/40 pb-safe shadow-[0_-8px_24px_-16px_rgba(15,23,42,0.35)]">
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
