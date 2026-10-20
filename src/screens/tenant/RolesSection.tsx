import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Modal, Toggle } from "../../components/ui";
import { useApp } from "../../app/store";
import { usePlatform } from "../../lib/usePlatform";
import { NAV, PERSONAS, navFor } from "../../data/personas";
import { STAFF_ROLES, hasRole, tenantStaff } from "../../data/staff";
import { ALWAYS_ON_ROLE, tenantHasModule, tenantRoleOn, usableRoles } from "../../domain/features";
import type { StaffRole, StaffUser } from "../../domain/types";
import { SectionFrame, type SectionProps } from "./kit";

/* ============ Platform › tenant › Roles (AENR-716) ============
   Slaice decides which staff roles a tenant uses. A role that is off
   disappears for the tenant — role pickers, "Your roles", "View as" and its
   pages — while the people who hold it keep it, so switching it back on
   restores their access. Manager / Admin can't be turned off. */

const DESCR: Partial<Record<StaffRole, string>> = {
  support:
    "Includes the Gate, Beach and till pages — it follows its own switch, not the Cashier's or Controller's.",
};

export function Roles({ t }: SectionProps) {
  const { staffUsers } = useApp();
  const { platform, today, updateTenant, toast, canEdit } = usePlatform();
  const [confirm, setConfirm] = useState<StaffRole | null>(null);
  const staff = tenantStaff(t, staffUsers);
  const holders = (r: StaffRole) => staff.filter((u) => hasRole(u, r) && u.status !== "suspended");
  const hasModule = (m: Parameters<typeof tenantHasModule>[2]) =>
    tenantHasModule(t, platform.plans, m, today);
  const onCount = STAFF_ROLES.filter((r) => tenantRoleOn(t, r.id)).length;

  const set = (r: StaffRole, on: boolean) => {
    const label = STAFF_ROLES.find((x) => x.id === r)?.label ?? r;
    updateTenant(t.id, (x) => ({ ...x, roles: { ...x.roles, [r]: on } }), {
      section: "Roles",
      change: `${label} role ${on ? "turned on" : "turned off"}`,
    });
    toast(
      on
        ? `${label} is back for ${t.name} — its people can open their pages again.`
        : `${label} is off for ${t.name}.`,
      { tone: "success" },
    );
    setConfirm(null);
  };
  /** People who'd have no role left to sign in with if `r` went off. */
  const stranded = (r: StaffRole): StaffUser[] =>
    holders(r).filter(
      (u) => usableRoles({ roles: { ...t.roles, [r]: false } }, u.roles).length === 0,
    );

  const pending = confirm ? STAFF_ROLES.find((x) => x.id === confirm) : undefined;
  const pendingHolders = confirm ? holders(confirm) : [];
  const pendingStranded = confirm ? stranded(confirm) : [];

  return (
    <SectionFrame
      title="Roles"
      sub={`Which staff roles ${t.name} uses · ${onCount} of ${STAFF_ROLES.length} on. A role that's off disappears for the whole tenant.`}
    >
      <Card className="p-2">
        <ul className="divide-y divide-slate-100">
          {STAFF_ROLES.map((r) => {
            const p = PERSONAS.find((x) => x.id === r.id);
            const I = p ? Icon[p.icon] : undefined;
            const locked = r.id === ALWAYS_ON_ROLE;
            const on = tenantRoleOn(t, r.id);
            const people = holders(r.id);
            const pages = navFor(r.id, false, hasModule);
            const all = NAV[r.id] ?? [];
            return (
              <li key={r.id} className="px-2 py-3 flex items-start gap-3">
                <span
                  aria-hidden
                  className={`w-9 h-9 rounded-xl grid place-items-center text-white shrink-0 transition ${on ? "" : "grayscale opacity-40"}`}
                  style={{ background: p?.color ?? "#64748b" }}
                >
                  {I ? <I size={17} /> : null}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-semibold text-[14px] ${on ? "text-navy-900" : "text-slate-500"}`}
                    >
                      {r.label}
                    </span>
                    {locked ? (
                      <Badge tone="neutral">
                        <Icon.lock size={10} aria-hidden /> Always on
                      </Badge>
                    ) : on ? (
                      <Badge tone="success">
                        <Icon.check size={10} aria-hidden /> In use
                      </Badge>
                    ) : (
                      <Badge tone="neutral">
                        <Icon.x size={10} aria-hidden /> Off
                      </Badge>
                    )}
                    <span className="text-[12px] text-slate-500 tnum">
                      {people.length} {people.length === 1 ? "person" : "people"}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-slate-600 leading-snug mt-0.5">
                    {r.blurb}
                    {DESCR[r.id] && <> {DESCR[r.id]}</>}
                  </p>
                  <p className="text-[12px] text-slate-500 leading-snug mt-1">
                    {locked
                      ? "Every beach needs a Manager / Admin — they own the configuration, the staff and refund decisions — so this role can't be turned off."
                      : on
                        ? `Opens ${pages.length ? pages.map((n) => n.label).join(" · ") : "no pages with this tenant's modules"}.`
                        : people.length
                          ? `${people.map((u) => u.name).join(", ")} keep${people.length === 1 ? "s" : ""} the role, shown as “disabled for this beach”. ${all.length} page${all.length === 1 ? "" : "s"} hidden.`
                          : `Not offered when adding people. ${all.length} page${all.length === 1 ? "" : "s"} hidden.`}
                  </p>
                </div>
                <div className="pt-0.5">
                  <Toggle
                    ariaLabel={`${r.label} role for ${t.name}`}
                    on={on}
                    disabled={!canEdit || locked}
                    onChange={(v) =>
                      v || holders(r.id).length === 0 ? set(r.id, v) : setConfirm(r.id)
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      <p className="text-[12px] text-slate-500 flex items-start gap-1.5">
        <Icon.info size={13} className="mt-px shrink-0" aria-hidden />
        <span>
          Roles are what a person can do; modules (Product › Modules & features) are what the tenant buys. A
          role can be on while some of its pages stay hidden by a module that's off.
        </span>
      </p>
      <Modal
        open={!!pending}
        onClose={() => setConfirm(null)}
        title={pending ? `Turn off ${pending.label} for ${t.name}?` : "Turn off role"}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Btn>
            <Btn variant="danger" icon={Icon.lock} onClick={() => confirm && set(confirm, false)}>
              Turn off
            </Btn>
          </>
        }
      >
        {pending && (
          <div className="space-y-3 text-[13.5px] text-slate-700">
            <p>
              {pendingHolders.length} {pendingHolders.length === 1 ? "person holds" : "people hold"}{" "}
              this role. They keep it, but can't open its pages and it leaves their role switcher
              until you turn it back on.
            </p>
            <ul className="rounded-xl ring-1 ring-slate-200 divide-y divide-slate-100 bg-white/70">
              {pendingHolders.map((u) => (
                <li
                  key={u.id}
                  className="px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="font-semibold text-navy-900">{u.name}</span>
                  {pendingStranded.some((x) => x.id === u.id) ? (
                    <Badge tone="warning">
                      <Icon.alert size={10} aria-hidden /> No other role
                    </Badge>
                  ) : (
                    <span className="text-[12px] text-slate-500">keeps their other roles</span>
                  )}
                </li>
              ))}
            </ul>
            {pendingStranded.length > 0 && (
              <p
                role="note"
                className="text-[12.5px] text-amber-800 bg-amber-50 ring-1 ring-amber-600/20 rounded-xl px-3 py-2"
              >
                People with no other role will see “not used at this beach” after signing in. Give
                them another role in Users &amp; roles if they should keep working.
              </p>
            )}
          </div>
        )}
      </Modal>
    </SectionFrame>
  );
}
