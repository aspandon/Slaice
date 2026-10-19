import { useState } from "react";
import { Icon } from "../../lib/icons";
import { usePlatform, useTenantRoute } from "../../lib/usePlatform";
import { LIFECYCLE_LABEL, type TenantRecord } from "../../domain/tenants";
import { confirmLeave } from "./kit";

/* Platform sidebar › Tenants (AENR-500): every tenant with a status dot,
   pinned first, searchable and collapsible; tenants still onboarding sit in
   their own group and open the wizard at their step. Closed tenants drop out
   (they stay in the Tenants table under “Closed”). */

const DOT: Record<TenantRecord["lifecycle"], string> = {
  live: "bg-emerald-500",
  onboarding: "bg-amber-400",
  paused_by_tenant: "bg-sky-500",
  suspended_by_slaice: "bg-rose-500",
  offboarding: "bg-amber-600",
  closed: "bg-slate-400",
};

export function TenantNav({ onNavigate }: { onNavigate?: () => void }) {
  const { platform, setPlatform } = usePlatform();
  const { id: current } = useTenantRoute();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(true);
  const qq = q.trim().toLowerCase();
  const visible = platform.tenants.filter(
    (t) =>
      t.lifecycle !== "closed" && (!qq || t.name.toLowerCase().includes(qq) || t.id.includes(qq)),
  );
  const pinned = visible.filter((t) => platform.pinned.includes(t.id));
  const running = visible.filter(
    (t) => t.lifecycle !== "onboarding" && !platform.pinned.includes(t.id),
  );
  const onboarding = visible.filter(
    (t) => t.lifecycle === "onboarding" && !platform.pinned.includes(t.id),
  );
  const open_ = (t: TenantRecord) => {
    if (!confirmLeave()) return;
    window.location.hash =
      t.lifecycle === "onboarding"
        ? `#/platform/onboarding?tenant=${t.id}`
        : `#/platform/tenant/${t.id}/overview`;
    onNavigate?.();
  };
  const pin = (id: string) =>
    setPlatform((p) => ({
      ...p,
      pinned: p.pinned.includes(id) ? p.pinned.filter((x) => x !== id) : [...p.pinned, id],
    }));
  const Row = (t: TenantRecord) => (
    <li key={t.id} className="group flex items-center">
      <button
        type="button"
        onClick={() => open_(t)}
        aria-current={current === t.id ? "page" : undefined}
        title={`${t.name} · ${LIFECYCLE_LABEL[t.lifecycle]}`}
        className={`flex-1 min-w-0 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] ${current === t.id ? "bg-navy-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
      >
        <span
          className="w-5 h-5 rounded-md text-white text-[10px] font-bold grid place-items-center shrink-0"
          style={{ background: t.brand }}
          aria-hidden
        >
          {t.name[0]}
        </span>
        <span className="truncate flex-1 text-left">{t.name}</span>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${DOT[t.lifecycle]}`}
          aria-label={LIFECYCLE_LABEL[t.lifecycle]}
        />
      </button>
      <button
        type="button"
        onClick={() => pin(t.id)}
        aria-label={`${platform.pinned.includes(t.id) ? "Unpin" : "Pin"} ${t.name}`}
        aria-pressed={platform.pinned.includes(t.id)}
        className={`w-7 h-7 grid place-items-center rounded-md text-[12px] ${platform.pinned.includes(t.id) ? "text-amber-500" : "text-slate-300 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
      >
        ★
      </button>
    </li>
  );
  return (
    <div className="mt-3 pt-3 border-t border-slate-200/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
      >
        Tenants <Icon.chevD size={13} className={open ? "" : "-rotate-90"} />
      </button>
      {open && (
        <div className="mt-1.5 space-y-1">
          <label className="flex items-center gap-1.5 rounded-lg ring-1 ring-slate-200 px-2 py-1 mx-1 text-slate-500 bg-white/70">
            <Icon.search size={13} />
            <span className="sr-only">Search tenants</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search · ⌘K"
              className="w-full bg-transparent text-[12.5px] outline-none text-ink"
            />
          </label>
          <ul>
            {pinned.map(Row)}
            {running.map(Row)}
          </ul>
          {onboarding.length > 0 && (
            <>
              <div className="px-2 pt-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                In onboarding
              </div>
              <ul>{onboarding.map(Row)}</ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
