import { useEffect, useMemo, useState } from "react";
import { Badge, Modal } from "../../components/ui";
import { usePlatform, useTenantRoute } from "../../lib/usePlatform";
import { LIFECYCLE_LABEL, LIFECYCLE_TONE, type TenantRecord } from "../../domain/tenants";
import { confirmLeave } from "./kit";

/* ============ ⌘K tenant switcher ============ */
export function TenantSwitcher() {
  const { platform } = usePlatform();
  const { section } = useTenantRoute();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    const ev = () => setOpen(true);
    window.addEventListener("keydown", key);
    window.addEventListener("slaice:tenant-switcher", ev);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("slaice:tenant-switcher", ev);
    };
  }, []);
  const list = useMemo(() => {
    const all = platform.tenants.filter((t) => t.lifecycle !== "closed");
    const qq = q.trim().toLowerCase();
    const hits = qq
      ? all.filter((t) =>
          [t.name, t.subdomain, t.id, t.vatNo].some((v) => v.toLowerCase().includes(qq)),
        )
      : all;
    const recent = platform.recent
      .map((id) => hits.find((t) => t.id === id))
      .filter(Boolean) as TenantRecord[];
    return [...recent, ...hits.filter((t) => !platform.recent.includes(t.id))];
  }, [platform.tenants, platform.recent, q]);
  const pick = (t: TenantRecord) => {
    if (!confirmLeave()) return;
    setOpen(false);
    setQ("");
    const keep = window.location.hash.includes("/platform/tenant/") ? section : "overview";
    window.location.hash = `#/platform/tenant/${t.id}/${keep}`;
  };
  if (!open) return null;
  return (
    <Modal open onClose={() => setOpen(false)} title="Switch tenant">
      <input
        autoComplete="off"
        aria-label="Search tenants by name, subdomain, ID or ΑΦΜ"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setI(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setI((x) => Math.min(list.length - 1, x + 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setI((x) => Math.max(0, x - 1));
          }
          if (e.key === "Enter" && list[i]) pick(list[i]);
        }}
        placeholder="Name, subdomain, tenant ID or ΑΦΜ…"
        className="glass-input w-full rounded-xl px-3.5 py-2.5 text-base sm:text-sm outline-none focus:ring-2 focus:ring-teal-500/70"
      />
      <ul role="listbox" aria-label="Tenants" className="mt-2 max-h-80 overflow-y-auto">
        {list.map((t, k) => (
          <li key={t.id} role="option" aria-selected={k === i}>
            <button
              type="button"
              onClick={() => pick(t)}
              onMouseEnter={() => setI(k)}
              className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] ${k === i ? "bg-slate-100" : ""}`}
            >
              <span
                className="w-6 h-6 rounded-md text-white text-[11px] font-bold grid place-items-center"
                style={{ background: t.brand }}
                aria-hidden
              >
                {t.name[0]}
              </span>
              <span className="flex-1">
                <b className="text-navy-900">{t.name}</b>{" "}
                <span className="text-slate-500">
                  · {t.subdomain} · {t.vatNo}
                </span>
              </span>
              {platform.recent.includes(t.id) && <Badge tone="slate">Recent</Badge>}
              <Badge tone={LIFECYCLE_TONE[t.lifecycle]}>{LIFECYCLE_LABEL[t.lifecycle]}</Badge>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
