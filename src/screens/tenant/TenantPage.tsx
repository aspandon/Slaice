import { useEffect, useRef, useState, type ReactElement } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon, type IconRenderer } from "../../lib/icons";
import { Badge, Btn, Card, EmptyState, Select } from "../../components/ui";
import { usePlatform, useTenantRoute } from "../../lib/usePlatform";
import {
  LIFECYCLE_LABEL,
  LIFECYCLE_TONE,
  actionsRequired,
  type TenantRecord,
} from "../../domain/tenants";
import { SectionCtx, confirmLeave, type SectionProps } from "./kit";
import { Billing, Overview, Profile } from "./AccountSections";
import { Branding, Modules } from "./ProductSections";
import { EntryTickets } from "./TicketSection";
import { SecurityAndCompliance } from "./AccessSections";
import { Audit, DataExport, Support } from "./SupportSections";
import { UsersAndRoles } from "./RolesSection";
import { CommercialTerms } from "./CommercialTerms";
import { DangerZone } from "./Lifecycle";
import { ViewAsDialog } from "./ViewAs";

/* ============ Platform › Tenant page (AENR-500) ============
   `#/platform/tenant/<id>/<section>` — the single place for a tenant's
   settings. Sections come from a registry (id, label, icon, group, required
   permission, badge) so new ones are one entry; a grouped left rail on
   desktop, a select on phones. */

/** Sections merged into another (AENR-796…800, 818, 821): old links open the surviving section and
 *  scroll to the part that replaced the old page (`?at=<old id>`). */
export const SECTION_ALIASES: Record<string, string> = {
  contract: "profile",
  locations: "profile",
  localisation: "profile",
  features: "modules",
  integrations: "modules",
  usage: "overview",
  payments: "terms",
  invoicing: "terms",
  users: "roles",
  compliance: "security",
  health: "overview",
};
/** The path segment (+ part anchor) for a section id, old or current. */
export const sectionPath = (s: string) =>
  SECTION_ALIASES[s] ? `${SECTION_ALIASES[s]}?at=${s}` : s;

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
    // Includes the Health score (AENR-821) and the Usage & limits meters (AENR-798).
    id: "overview",
    label: "Overview",
    icon: Icon.chart,
    group: "Account",
    edit: "support",
    badge: (t, d) => actionsRequired(t, d).length,
    render: (p) => <Overview {...p} />,
  },
  {
    // Identity, contacts, contract, locations and localisation on one page (AENR-796);
    // Contract & account stays Admin-only inside it.
    id: "profile",
    label: "Profile",
    icon: Icon.building,
    group: "Account",
    edit: "support",
    render: (p) => <Profile {...p} />,
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
    // Modules, feature switches (AENR-677 / 721 — the permanent home for new ones) and
    // integrations on one page (AENR-797); Modules and Features stay Admin-only inside it.
    id: "modules",
    label: "Modules & features",
    icon: Icon.pkg,
    group: "Product",
    edit: "support",
    render: (p) => <Modules {...p} />,
  },
  {
    // Which entry-ticket categories the beach sells (AENR-711).
    id: "tickets",
    label: "Entry tickets",
    icon: Icon.ticket,
    group: "Product",
    edit: "admin",
    render: (p) => <EntryTickets {...p} />,
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
    // Commission, guest fees, VAT, corporate tax, support and subscription (AENR-725 / 689),
    // plus Payments and Invoicing & tax as parts (AENR-799).
    id: "terms",
    label: "Commercial terms",
    icon: Icon.tag,
    group: "Money",
    edit: "admin",
    render: (p) => <CommercialTerms {...p} />,
  },
  {
    // Users, the staff roles the tenant uses (AENR-716) and Slaice access on one page
    // (AENR-800). Kept the `roles` id the tenant app's "role off" page links to; Staff
    // roles stay Admin-only inside it.
    id: "roles",
    label: "Users & roles",
    icon: Icon.users,
    group: "Access & trust",
    edit: "support",
    render: (p) => <UsersAndRoles {...p} />,
  },
  {
    // Sign-in policies and security events, then DPA, DPO, region and sub-processors, on one
    // page (AENR-818). Kept the `security` id; old …/compliance links land on its part, and the
    // unsigned-DPA badge moved here with it.
    id: "security",
    label: "Security & compliance",
    icon: Icon.shieldCheck,
    group: "Access & trust",
    edit: "admin",
    badge: (t) => (t.dpa.status === "Signed" ? 0 : 1),
    render: (p) => <SecurityAndCompliance {...p} />,
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
  const merged = SECTION_ALIASES[section];
  const def = SECTIONS.find((s) => s.id === (merged ?? section)) ?? SECTIONS[0];
  // An old link to a merged section: rewrite it to the surviving one + its part (AENR-796…800).
  useEffect(() => {
    if (id && merged) window.location.replace(`#/platform/tenant/${id}/${merged}?at=${section}`);
  }, [id, merged, section]);
  const [viewAs, setViewAs] = useState(false);
  const [demoError, setDemoError] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  // No tenant in the URL (#/platform/tenant): open the last tenant viewed, or the
  // Tenants list — never a dead end (AENR-590). Replace, so Back still works.
  const fallback = !id
    ? platform.recent.find((r) => platform.tenants.some((x) => x.id === r))
    : undefined;
  useEffect(() => {
    if (id) return;
    window.location.replace(
      fallback ? `#/platform/tenant/${fallback}/overview` : "#/platform/tenants",
    );
  }, [id, fallback]);
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
  if (!id) return null; // redirecting (see above)
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
    if (confirmLeave()) go(t.id, sectionPath(s));
  };
  const can = (edit: SectionDef["edit"]) =>
    platform.role === "admin" || (platform.role === "support" && edit === "support");
  const canEdit = can(def.edit);
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
              <div className="px-2 pt-1.5 pb-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
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
          <SectionCtx.Provider value={{ canEdit, can, demoError }}>
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

