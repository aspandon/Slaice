import { useState } from "react";
import { Icon } from "../lib/icons";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  PageHead,
  Select,
  Table,
  ActionsMenu,
} from "../components/ui";
import { useApp } from "../app/store";
import { navFor } from "../data/personas";
import { useTenantFeatures } from "../lib/useFeatures";
import { STAFF_ROLES, hasRole, roleLabel } from "../data/staff";
import { RoleBadges } from "./team/RoleBadges";
import { StaffStatusCell, staffActions } from "./team/StaffCells";
import { useStaffDirectory } from "./team/useStaffDirectory";
import type { StaffRole, StaffStatus, StaffUser } from "../domain/types";

/* ============ RBAC — staff users & roles (AENR-503) ============
   The admin manages the tenant's staff accounts: add (invite), edit, change
   roles, suspend / reactivate, delete — and previews exactly what a role or a
   user sees ("View as"). A user can hold several roles (AENR-717) and switches
   between them from the account menu. Platform / Slaice is not a tenant role.
   Adding someone sends an invitation e-mail (simulated) with their username; the
   link walks them through a password and 2-step sign-in (AENR-718). */

const fmtWhen = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

export function AdminRbac() {
  const { staffAudit, startViewAs, toast } = useApp();
  // A role card lists the pages it can open on this beach (roadmap previews / modules, AENR-691 / 696).
  const { roadmap, module, role: roleOn, tenant } = useTenantFeatures();
  // Add, invite, edit, suspend… shared with Platform › tenant › Users & roles (AENR-718).
  const dir = useStaffDirectory(tenant, "tenant");
  const staffUsers = dir.users;
  const beach = dir.beach;
  // Roles Slaice turned off for this beach (AENR-716) aren't offered; people who hold one keep it.
  const usable = (u: StaffUser) => u.roles.filter((r) => roleOn(r));
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState<"all" | StaffRole>("all");
  const [statusF, setStatusF] = useState<"all" | StaffStatus>("all");

  const shown = staffUsers.filter(
    (u) =>
      (roleF === "all" || hasRole(u, roleF)) &&
      (statusF === "all" || u.status === statusF) &&
      `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(q.toLowerCase()),
  );

  /* "View as role": preview with the first active user holding that role. */
  const viewRole = (r: StaffRole) => {
    const u = staffUsers.find((x) => hasRole(x, r) && x.status === "active");
    if (!u) {
      toast(`No active ${roleLabel(r)} user to preview — add or reactivate one first.`, {
        tone: "error",
      });
      return;
    }
    startViewAs(u.id);
  };

  return (
    <div className="animate-fade-up">
      <PageHead
        title="Team & roles"
        sub="Staff accounts and what each role can see and do — invite, change roles, preview as a role." primary={<Btn variant="primary" icon={Icon.plus} onClick={dir.openAdd}>
            Add user
          </Btn>}
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <label className="flex items-center gap-2 rounded-xl ring-1 ring-slate-200 px-3 py-2 flex-1 min-w-[200px] max-w-sm text-slate-600">
            <Icon.search size={16} />
            <span className="sr-only">Search staff</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, e-mail or phone…"
              className="text-sm outline-none w-full bg-transparent text-ink"
            />
          </label>
          <div className="w-44">
            <Field label="Role">
              <Select
                value={roleF}
                onChange={(e) => setRoleF(e.target.value as "all" | StaffRole)}
                options={[
                  { v: "all", l: "All roles" },
                  ...STAFF_ROLES.map((r) => ({ v: r.id, l: roleOn(r.id) ? r.label : `${r.label} (off)` })),
                ]}
              />
            </Field>
          </div>
          <div className="w-40">
            <Field label="Status">
              <Select
                value={statusF}
                onChange={(e) => setStatusF(e.target.value as "all" | StaffStatus)}
                options={[
                  { v: "all", l: "All statuses" },
                  { v: "active", l: "Active" },
                  { v: "invited", l: "Invited" },
                  { v: "suspended", l: "Suspended" },
                ]}
              />
            </Field>
          </div>
          <div className="ml-auto text-[12px] text-slate-500 pb-2.5">
            {shown.length} of {staffUsers.length} users
          </div>
        </div>
        {shown.length === 0 ? (
          <EmptyState
            icon={Icon.users}
            title="No users match"
            body="Try another search, role or status."
            action={
              <Btn
                size="sm"
                variant="outline"
                onClick={() => {
                  setQ("");
                  setRoleF("all");
                  setStatusF("all");
                }}
              >
                Clear filters
              </Btn>
            }
          />
        ) : (
          <Table
            cols={["Name", "Phone", "Roles", "Status", "Last sign-in", ""]}
            rows={shown.map((u) => {
              return [
                <div className="leading-tight">
                  <div className="font-semibold text-navy-900">{u.name}</div>
                  <div className="text-[12px] text-slate-500">{u.email}</div>
                </div>,
                <span className="tnum whitespace-nowrap">{u.phone || "—"}</span>,
                <RoleBadges roles={u.roles} roleOn={roleOn} beach={beach} />,
                <StaffStatusCell u={u} dir={dir} />,
                <span className="text-[12.5px] text-slate-600 whitespace-nowrap">
                  {fmtWhen(u.lastSignIn)}
                </span>,
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    disabled={!dir.demo || u.status !== "active" || usable(u).length === 0}
                    onClick={() => startViewAs(u.id)}
                    aria-label={`View as ${u.name}`}
                    title={
                      u.status !== "active"
                        ? "Only active users can be previewed"
                        : usable(u).length === 0
                          ? `None of their roles is used at ${beach}`
                          : "View as this user"
                    }
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 h-9 text-[12.5px] font-semibold text-navy-900 hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent transition"
                  >
                    <Icon.eye size={15} className="text-slate-500" />
                    View as
                  </button>
                  <ActionsMenu
                    size="sm"
                    label={`More actions for ${u.name}`}
                    actions={staffActions(u, dir)}
                  />
                </div>,
              ];
            })}
          />
        )}
      </Card>

      <div className="grid lg:grid-cols-[1fr_22rem] gap-4 mt-4">
        <Card className="p-5">
          <div className="font-semibold text-navy-900">What each role can open</div>
          <p className="text-[12.5px] text-slate-600 mb-3">
            Roles are fixed sets of pages. <b>View as role</b> shows the app exactly as someone with
            that role sees it.
          </p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {STAFF_ROLES.filter((r) => roleOn(r.id)).map((r) => (
              <div
                key={r.id}
                className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-3.5 flex flex-col"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-navy-900 text-[14px]">{r.label}</div>
                  <span className="text-[11px] text-slate-500 tnum">
                    {(() => {
                      const n = staffUsers.filter((u) => hasRole(u, r.id)).length;
                      return `${n} user${n === 1 ? "" : "s"}`;
                    })()}
                  </span>
                </div>
                <div className="text-[12px] text-slate-500 mt-0.5 leading-snug">{r.blurb}</div>
                <ul className="mt-2 space-y-1 text-[12.5px] text-slate-700 flex-1">
                  {navFor(r.id, roadmap, module).map((n, i, all) => (
                    <li key={n.k} className="flex flex-wrap items-center gap-1.5">
                      {/* The role's pages under the same job groups as its sidebar (AENR-558). */}
                      {n.group && n.group !== all[i - 1]?.group && (
                        <span className="w-full pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                          {n.group}
                        </span>
                      )}
                      <Icon.check size={12} className="text-teal-600 shrink-0" />
                      {n.label}
                      {n.badge === "Future" && (
                        <Badge tone="future" className="!text-[10px] !px-1.5">
                          Future
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
                <Btn
                  size="sm"
                  variant="outline"
                  icon={Icon.eye}
                  className="mt-3 self-start"
                  onClick={() => viewRole(r.id)}
                >
                  View as {r.label}
                </Btn>
              </div>
            ))}
          </div>
          {STAFF_ROLES.some((r) => !roleOn(r.id)) && (
            <div className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-[12px] text-slate-600 flex items-start gap-1.5">
              <Icon.lock size={13} className="mt-px shrink-0" aria-hidden />
              <span>
                Not used at {beach}:{" "}
                <b className="font-semibold text-navy-900">
                  {STAFF_ROLES.filter((r) => !roleOn(r.id))
                    .map((r) => r.label)
                    .join(", ")}
                </b>
                . Slaice turns roles on or off for your beach — ask your account manager.
              </span>
            </div>
          )}
          <div className="mt-3 text-[11.5px] text-slate-500 flex items-center gap-1.5">
            <Icon.info size={12} /> Platform / Slaice is the platform back office, not a role you
            can assign here.
          </div>
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-2">Audit trail</div>
          <ul className="space-y-2.5">
            {staffAudit.slice(0, 12).map((a, i) => (
              <li key={i} className="text-[12.5px] leading-snug">
                <div className="text-navy-900">{a.action}</div>
                <div className="text-[11px] text-slate-500">
                  {a.by} · {fmtWhen(a.at)}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {dir.modals}
      {/* Support access moved to Privacy & GDPR › Processors & DPO (AENR-565); a link stays here. */}
      <p className="mt-4 text-[13px] text-slate-600 flex items-center gap-1.5">
        <Icon.shieldCheck size={15} className="text-teal-700" />
        Slaice support sessions on this account and the access grant are in{" "}
        <a className="font-semibold text-teal-700 hover:underline" href="#/admin/privacy?tab=processors">Privacy &amp; GDPR › Processors &amp; DPO</a>.
      </p>
    </div>
  );
}
