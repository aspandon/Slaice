import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon, type IconRenderer } from "../../lib/icons";
import { Badge, Btn, Card, EmptyState, Modal, Select } from "../../components/ui";
import { usePlatform, useTenantRoute } from "../../lib/usePlatform";
import {
  LIFECYCLE_LABEL,
  LIFECYCLE_TONE,
  actionsRequired,
  type TenantRecord,
} from "../../domain/tenants";
import { SectionCtx, confirmLeave, type SectionProps } from "./kit";
import { Billing, Contract, Overview, Profile, Usage } from "./AccountSections";
import { Branding, Localisation, Locations, Modules, Release } from "./ProductSections";
import { Compliance, Integrations, Invoicing, Payments, Security, Users } from "./AccessSections";
import { Audit, DataExport, Health, Support } from "./SupportSections";
import { DangerZone } from "./Lifecycle";
import { ViewAsDialog } from "./ViewAs";

/* ============ Platform › Tenant page (AENR-500) ============
   `#/platform/tenant/<id>/<section>` — the single place for a tenant's
   settings. Sections come from a registry (id, label, icon, group, required
   permission, badge) so new ones are one entry; a grouped left rail on
   desktop, a select on phones. */

type Group = "Account" | "Product" | "Money" | "Access & trust" | "Support";
interface SectionDef {
  id: string;
  label: string;
  icon: IconRenderer;
  group: Group;
  /** Slaice permission needed to edit (hook for RBAC, AENR-503). */
  edit: "admin" | "support";
  badge?: (t: TenantRecord, today: string) => number;
  render: (p: SectionProps) => ReactElement;
}
export const SECTIONS: SectionDef[] = [
  {
    id: "overview",
    label: "Overview",
    icon: Icon.chart,
    group: "Account",
    edit: "support",
    badge: (t, d) => actionsRequired(t, d).length,
    render: (p) => <Overview {...p} />,
  },
  {
    id: "profile",
    label: "Profile",
    icon: Icon.building,
    group: "Account",
    edit: "support",
    render: (p) => <Profile {...p} />,
  },
  {
    id: "contract",
    label: "Contract & account",
    icon: Icon.doc,
    group: "Account",
    edit: "admin",
    render: (p) => <Contract {...p} />,
  },
  {
    id: "billing",
    label: "Subscription & billing",
    icon: Icon.wallet,
    group: "Account",
    edit: "admin",
    badge: (t) => t.invoices.filter((i) => i.status === "Overdue").length,
    render: (p) => <Billing {...p} />,
  },
  {
    id: "usage",
    label: "Usage & limits",
    icon: Icon.trend,
    group: "Account",
    edit: "admin",
    render: (p) => <Usage {...p} />,
  },
  {
    id: "modules",
    label: "Modules",
    icon: Icon.pkg,
    group: "Product",
    edit: "admin",
    render: (p) => <Modules {...p} />,
  },
  {
    id: "locations",
    label: "Locations & capacity",
    icon: Icon.map,
    group: "Product",
    edit: "support",
    render: (p) => <Locations {...p} />,
  },
  {
    id: "branding",
    label: "Branding & domain",
    icon: Icon.sparkles,
    group: "Product",
    edit: "support",
    render: (p) => <Branding {...p} />,
  },
  {
    id: "localisation",
    label: "Localisation",
    icon: Icon.globe,
    group: "Product",
    edit: "support",
    render: (p) => <Localisation {...p} />,
  },
  {
    id: "release",
    label: "Release channel",
    icon: Icon.bolt,
    group: "Product",
    edit: "admin",
    render: (p) => <Release {...p} />,
  },
  {
    id: "payments",
    label: "Payments",
    icon: Icon.card,
    group: "Money",
    edit: "admin",
    render: (p) => <Payments {...p} />,
  },
  {
    id: "invoicing",
    label: "Invoicing & tax",
    icon: Icon.receipt,
    group: "Money",
    edit: "admin",
    render: (p) => <Invoicing {...p} />,
  },
  {
    id: "users",
    label: "Users & roles",
    icon: Icon.users,
    group: "Access & trust",
    edit: "support",
    render: (p) => <Users {...p} />,
  },
  {
    id: "security",
    label: "Security",
    icon: Icon.lock,
    group: "Access & trust",
    edit: "admin",
    render: (p) => <Security {...p} />,
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: Icon.shieldCheck,
    group: "Access & trust",
    edit: "admin",
    badge: (t) => (t.dpa.status === "Signed" ? 0 : 1),
    render: (p) => <Compliance {...p} />,
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Icon.layers,
    group: "Access & trust",
    edit: "support",
    render: (p) => <Integrations {...p} />,
  },
  {
    id: "support",
    label: "Support",
    icon: Icon.help,
    group: "Support",
    edit: "support",
    render: (p) => <Support {...p} />,
  },
  {
    id: "health",
    label: "Health score",
    icon: Icon.checkCircle,
    group: "Support",
    edit: "support",
    render: (p) => <Health {...p} />,
  },
  {
    id: "audit",
    label: "Audit log",
    icon: Icon.list,
    group: "Support",
    edit: "support",
    render: (p) => <Audit {...p} />,
  },
  {
    id: "export",
    label: "Data export",
    icon: Icon.database,
    group: "Support",
    edit: "admin",
    render: (p) => <DataExport {...p} />,
  },
  {
    id: "danger",
    label: "Danger zone",
    icon: Icon.alert,
    group: "Support",
    edit: "admin",
    render: (p) => <DangerZone {...p} />,
  },
];
const GROUPS: Group[] = ["Account", "Product", "Money", "Access & trust", "Support"];

export function TenantPage() {
  const { id, section, go } = useTenantRoute();
  const { platform, setPlatform, today, planName, toast } = usePlatform();
  const t = platform.tenants.find((x) => x.id === id);
  const def = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
  const [viewAs, setViewAs] = useState(false);
  const [demoError, setDemoError] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  // Remember recent tenants; return focus to ⋯ after a View-as session ends.
  useEffect(() => {
    if (!t) return;
    setPlatform((p) =>
      p.recent[0] === t.id
        ? p
        : { ...p, recent: [t.id, ...p.recent.filter((x) => x !== t.id)].slice(0, 6) },
    );
    try {
      if (sessionStorage.getItem("slaice.focusTenantMenu")) {
        sessionStorage.removeItem("slaice.focusTenantMenu");
        window.setTimeout(() => menuBtn.current?.focus(), 400);
      }
    } catch {
      /* storage unavailable */
    }
  }, [t?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // A scheduled suspension takes effect when its date arrives on the demo clock.
  useEffect(() => {
    if (t?.suspension?.from && t.suspension.from <= today && t.lifecycle === "live") {
      setPlatform((p) => ({
        ...p,
        tenants: p.tenants.map((x) =>
          x.id === t.id
            ? {
                ...x,
                lifecycle: "suspended_by_slaice",
                history: [
                  ...x.history,
                  {
                    from: "live",
                    to: "suspended_by_slaice",
                    reason: `Scheduled: ${x.suspension?.category}`,
                    actor: "System",
                    at: new Date().toISOString(),
                  },
                ],
              }
            : x,
        ),
      }));
    }
  }, [t, today, setPlatform]);
  if (!t)
    return (
      <Card className="p-6 max-w-lg">
        <EmptyState
          icon={Icon.building}
          title="Tenant not found"
          body={`No tenant with the id “${id || "—"}”.`}
          action={
            <Btn
              variant="primary"
              onClick={() => {
                window.location.hash = "#/platform/tenants";
              }}
            >
              Back to Tenants
            </Btn>
          }
        />
      </Card>
    );
  const nav = (s: string) => {
    if (confirmLeave()) go(t.id, s);
  };
  const canEdit =
    platform.role === "admin" || (platform.role === "support" && def.edit === "support");
  const last = t.history[t.history.length - 1];
  const owner = t.contacts.find((c) => c.role === "owner");
  return (
    <div className="animate-fade-up space-y-4">
      {/* Identity strip */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <span
          className="w-12 h-12 rounded-xl grid place-items-center text-white font-display font-bold text-lg shrink-0"
          style={{ background: t.brand }}
          aria-hidden
        >
          {t.name[0]}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-navy-900">{t.name}</h1>
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-600">
            <button
              type="button"
              className="font-mono hover:text-teal-700"
              title="Copy tenant ID"
              onClick={() => {
                void navigator.clipboard?.writeText(t.id).catch(() => undefined);
                toast(`Copied tenant ID ${t.id}`);
              }}
            >
              {t.id} <Icon.copy size={11} className="inline" />
            </button>
            <span
              title={
                last
                  ? `${LIFECYCLE_LABEL[last.to]} · ${last.reason} · ${new Date(last.at).toLocaleDateString("en-GB")} · ${last.actor}`
                  : LIFECYCLE_LABEL[t.lifecycle]
              }
            >
              <Badge tone={LIFECYCLE_TONE[t.lifecycle]}>{LIFECYCLE_LABEL[t.lifecycle]}</Badge>
            </span>
            <Badge tone="indigo">{planName(t)}</Badge>
            {t.env !== "live" && (
              <Badge tone="amber">{t.env === "sandbox" ? "Sandbox" : "Demo"}</Badge>
            )}
            <Badge tone="slate">{t.region}</Badge>
            <span className="inline-flex items-center gap-1">
              <span
                className="w-5 h-5 rounded-full bg-navy-900 text-white text-[9px] font-bold grid place-items-center"
                aria-hidden
              >
                {t.accountManager
                  .split(" ")
                  .map((x) => x[0])
                  .join("")}
              </span>
              {t.accountManager}
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 relative">
          <Btn
            size="sm"
            variant="ghost"
            icon={Icon.search}
            onClick={() => window.dispatchEvent(new CustomEvent("slaice:tenant-switcher"))}
          >
            Switch <kbd className="ml-1 text-[10px] text-slate-500">⌘K</kbd>
          </Btn>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                ref={menuBtn}
                type="button"
                aria-label="Tenant actions"
                className="w-10 h-10 rounded-xl ring-1 ring-slate-200 grid place-items-center hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <Icon.more size={18} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="glass w-64 rounded-xl p-1 z-[60] shadow-float"
              >
                {(
                  [
                    ["View as tenant user…", () => setViewAs(true)],
                    [
                      "Preview customer site",
                      () => {
                        setPlatform((p) => ({ ...p, siteTenant: t.id }));
                        window.location.hash = "#/customer/plan";
                      },
                    ],
                    [
                      "Send onboarding / remediation link",
                      () => toast(`Demo — link sent to ${owner?.email}.`),
                    ],
                    [
                      "Copy tenant ID",
                      () => {
                        void navigator.clipboard?.writeText(t.id).catch(() => undefined);
                        toast(`Copied ${t.id}`);
                      },
                    ],
                    ["Export tenant data", () => nav("export")],
                    [
                      t.lifecycle === "suspended_by_slaice" ? "Reactivate…" : "Suspend…",
                      () => nav("danger"),
                    ],
                    [
                      demoError ? "Demo: stop section errors" : "Demo: make sections fail to load",
                      () => setDemoError((x) => !x),
                    ],
                  ] as [string, () => void][]
                ).map(([l, fn]) => (
                  <DropdownMenu.Item
                    key={l}
                    onSelect={fn}
                    className="rounded-lg px-3 py-2 text-[13px] outline-none cursor-pointer data-[highlighted]:bg-slate-100"
                  >
                    {l}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </Card>

      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-4 items-start">
        {/* Section rail (desktop) / select (phones) */}
        <div className="lg:hidden">
          <Select
            aria-label="Section"
            value={def.id}
            onChange={(e) => nav(e.target.value)}
            options={SECTIONS.map((s) => ({ v: s.id, l: `${s.group} · ${s.label}` }))}
          />
        </div>
        <nav
          aria-label={`${t.name} sections`}
          className="hidden lg:block glass rounded-2xl p-2 sticky top-[86px]"
        >
          {GROUPS.map((g) => (
            <div key={g} className="mb-1.5">
              <div className="px-2 pt-1.5 pb-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                {g}
              </div>
              {SECTIONS.filter((s) => s.group === g).map((s) => {
                const n = s.badge?.(t, today) ?? 0;
                const active = s.id === def.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => nav(s.id)}
                    className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium ${active ? "bg-navy-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                  >
                    <s.icon size={15} /> <span className="flex-1 text-left">{s.label}</span>
                    {n > 0 && (
                      <span
                        className={`min-w-5 h-5 px-1 rounded-full text-[10.5px] font-bold grid place-items-center ${active ? "bg-white text-navy-900" : "bg-rose-600 text-white"}`}
                        aria-label={`${n} open`}
                      >
                        {n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div key={`${t.id}-${def.id}-${demoError}`} className="min-w-0">
          <SectionCtx.Provider value={{ canEdit, demoError }}>
            {def.render({ t, canEdit, go: nav })}
          </SectionCtx.Provider>
        </div>
      </div>
      {viewAs && (
        <ViewAsDialog
          t={t}
          onClose={() => {
            setViewAs(false);
            menuBtn.current?.focus();
          }}
        />
      )}
    </div>
  );
}

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
