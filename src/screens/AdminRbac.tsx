import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "../lib/icons";
import {
  Badge,
  Btn,
  Card,
  ConfirmModal,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHead,
  Select,
  Table,
} from "../components/ui";
import { useApp } from "../app/store";
import { NAV } from "../data/personas";
import { STAFF_ROLES, roleLabel } from "../data/staff";
import type { StaffRole, StaffStatus, StaffUser } from "../domain/types";

/* ============ RBAC — staff users & roles (AENR-503) ============
   The admin manages the tenant's staff accounts: add (invite), edit, change
   role, suspend / reactivate, delete — and previews exactly what a role or a
   user sees ("View as"). Platform / Slaice is not a tenant role. */

const STATUS_BADGE: Record<StaffStatus, { tone: string; label: string; icon: keyof typeof Icon }> =
  {
    active: { tone: "green", label: "Active", icon: "checkCircle" },
    invited: { tone: "amber", label: "Invited", icon: "clock" },
    suspended: { tone: "red", label: "Suspended", icon: "lock" },
  };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fmtWhen = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

type Draft = { id?: string; name: string; email: string; phone: string; role: StaffRole; tillPin: string };
const EMPTY: Draft = { name: "", email: "", phone: "", role: "cashier", tillPin: "" };
/** Roles that sell at a shared till and switch in with a PIN (AENR-608). */
const TILL_ROLES: StaffRole[] = ["cashier", "support"];

export function AdminRbac() {
  const { staffUsers, updateStaff, staffAudit, startViewAs, toast } = useApp();
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState<"all" | StaffRole>("all");
  const [statusF, setStatusF] = useState<"all" | StaffStatus>("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [touched, setTouched] = useState(false);
  const [suspending, setSuspending] = useState<StaffUser | null>(null);
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState<StaffUser | null>(null);

  const activeAdmins = staffUsers.filter((u) => u.role === "admin" && u.status === "active");
  // Guard: the tenant must always keep at least one active Manager/Admin.
  const isLastAdmin = (u: StaffUser) =>
    u.role === "admin" && u.status === "active" && activeAdmins.length <= 1;

  const shown = staffUsers.filter(
    (u) =>
      (roleF === "all" || u.role === roleF) &&
      (statusF === "all" || u.status === statusF) &&
      `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(q.toLowerCase()),
  );

  /* ---- Add / edit ---- */
  const emailTaken =
    !!draft &&
    staffUsers.some(
      (u) => u.email.toLowerCase() === draft.email.trim().toLowerCase() && u.id !== draft.id,
    );
  const errors = draft
    ? {
        name: !draft.name.trim() ? "Enter the person's name." : "",
        email: !EMAIL_RE.test(draft.email.trim())
          ? "Enter a valid e-mail."
          : emailTaken
            ? "Someone already uses this e-mail."
            : "",
        tillPin:
          !TILL_ROLES.includes(draft.role) || !draft.tillPin
            ? ""
            : !/^\d{4}$/.test(draft.tillPin)
              ? "Use exactly 4 digits."
              : staffUsers.some((u) => u.id !== draft.id && u.tillPin === draft.tillPin)
                ? "Someone else uses this PIN — pick another."
                : "",
      }
    : { name: "", email: "", tillPin: "" };
  const editing = draft?.id ? staffUsers.find((u) => u.id === draft.id) : undefined;
  const demotingLastAdmin = !!editing && isLastAdmin(editing) && draft?.role !== "admin";
  const saveDraft = () => {
    setTouched(true);
    if (!draft || errors.name || errors.email || errors.tillPin || demotingLastAdmin) return;
    const clean = {
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      role: draft.role,
      tillPin: TILL_ROLES.includes(draft.role) && draft.tillPin ? draft.tillPin : undefined,
    };
    if (editing) {
      const changes = [
        editing.role !== clean.role
          ? `role ${roleLabel(editing.role)} → ${roleLabel(clean.role)}`
          : "",
        editing.name !== clean.name ||
        editing.email !== clean.email ||
        editing.phone !== clean.phone
          ? "details"
          : "",
        (editing.tillPin ?? "") !== (clean.tillPin ?? "") ? "till PIN" : "",
      ]
        .filter(Boolean)
        .join(", ");
      updateStaff(
        staffUsers.map((u) => (u.id === editing.id ? { ...u, ...clean } : u)),
        `Edited ${clean.name}${changes ? ` (${changes})` : ""}`,
      );
      toast(`Saved ${clean.name}.`, { tone: "success" });
    } else {
      const user: StaffUser = {
        id: `u-${Date.now().toString(36)}`,
        ...clean,
        status: "invited",
        lastSignIn: null,
        created: new Date().toISOString().slice(0, 10),
      };
      updateStaff([...staffUsers, user], `Invited ${user.name} as ${roleLabel(user.role)}`);
      toast(`Invitation sent to ${user.email} (demo).`, { tone: "success" });
    }
    setDraft(null);
  };
  const openDraft = (d: Draft) => {
    setTouched(false);
    setDraft(d);
  };

  /* ---- Status changes ---- */
  const accept = (u: StaffUser) => {
    updateStaff(
      staffUsers.map((x) =>
        x.id === u.id ? { ...x, status: "active", lastSignIn: new Date().toISOString() } : x,
      ),
      `${u.name} accepted the invitation`,
    );
    toast(`${u.name} accepted the invitation and is now active.`, { tone: "success" });
  };
  const confirmSuspend = () => {
    if (!suspending || !reason.trim()) return;
    updateStaff(
      staffUsers.map((x) =>
        x.id === suspending.id ? { ...x, status: "suspended", suspendReason: reason.trim() } : x,
      ),
      `Suspended ${suspending.name} (${reason.trim()})`,
    );
    toast(`${suspending.name} is suspended and can't sign in.`, { tone: "success" });
    setSuspending(null);
  };
  const reactivate = (u: StaffUser) => {
    updateStaff(
      staffUsers.map((x) =>
        x.id === u.id ? { ...x, status: "active", suspendReason: undefined } : x,
      ),
      `Reactivated ${u.name}`,
    );
    toast(`${u.name} can sign in again.`, { tone: "success" });
  };
  const confirmDelete = () => {
    if (!deleting) return;
    updateStaff(
      staffUsers.filter((x) => x.id !== deleting.id),
      `Deleted ${deleting.name} (${roleLabel(deleting.role)})`,
    );
    toast(`${deleting.name} was deleted.`, { tone: "success" });
    setDeleting(null);
  };
  /* "View as role": preview with the first active user holding that role. */
  const viewRole = (r: StaffRole) => {
    const u = staffUsers.find((x) => x.role === r && x.status === "active");
    if (!u) {
      toast(`No active ${roleLabel(r)} user to preview — add or reactivate one first.`, {
        tone: "error",
      });
      return;
    }
    startViewAs(u.id);
  };

  const menuItem =
    "flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm cursor-pointer select-none outline-none data-[highlighted]:bg-slate-100 data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed";

  return (
    <div className="animate-fade-up">
      <PageHead
        title="Team & roles"
        sub="Staff accounts and what each role can see and do — invite, change roles, preview as a role." primary={<Btn variant="primary" icon={Icon.plus} onClick={() => openDraft(EMPTY)}>
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
                  ...STAFF_ROLES.map((r) => ({ v: r.id, l: r.label })),
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
            cols={["Name", "Phone", "Role", "Status", "Last sign-in", ""]}
            rows={shown.map((u) => {
              const st = STATUS_BADGE[u.status];
              const StIcon = Icon[st.icon];
              return [
                <div className="leading-tight">
                  <div className="font-semibold text-navy-900">{u.name}</div>
                  <div className="text-[12px] text-slate-500">{u.email}</div>
                </div>,
                <span className="tnum whitespace-nowrap">{u.phone || "—"}</span>,
                <Badge tone={u.role === "admin" ? "indigo" : "slate"}>{roleLabel(u.role)}</Badge>,
                <div className="leading-tight">
                  <Badge tone={st.tone}>
                    <StIcon size={10} /> {st.label}
                  </Badge>
                  {u.status === "suspended" && u.suspendReason && (
                    <div className="text-[11px] text-slate-500 mt-0.5">{u.suspendReason}</div>
                  )}
                </div>,
                <span className="text-[12.5px] text-slate-600 whitespace-nowrap">
                  {fmtWhen(u.lastSignIn)}
                </span>,
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    disabled={u.status !== "active"}
                    onClick={() => startViewAs(u.id)}
                    aria-label={`View as ${u.name}`}
                    title={
                      u.status === "active"
                        ? "View as this user"
                        : "Only active users can be previewed"
                    }
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 h-9 text-[12.5px] font-semibold text-navy-900 hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent transition"
                  >
                    <Icon.eye size={15} className="text-slate-500" />
                    View as
                  </button>
                  <DropdownMenu.Root modal={false}>
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        aria-label={`More actions for ${u.name}`}
                        className="w-9 h-9 grid place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-navy-900 transition"
                      >
                        <Icon.more size={16} />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        align="end"
                        sideOffset={6}
                        className="glass !bg-white/95 w-52 rounded-xl p-1.5 z-[60] shadow-float text-ink"
                      >
                        <DropdownMenu.Item
                          className={menuItem}
                          onSelect={() =>
                            openDraft({
                              id: u.id,
                              name: u.name,
                              email: u.email,
                              phone: u.phone,
                              role: u.role,
                              tillPin: u.tillPin ?? "",
                            })
                          }
                        >
                          <Icon.edit size={14} /> Edit details & role
                        </DropdownMenu.Item>
                        {u.status === "invited" && (
                          <DropdownMenu.Item className={menuItem} onSelect={() => accept(u)}>
                            <Icon.check size={14} /> Simulate acceptance
                          </DropdownMenu.Item>
                        )}
                        {u.status === "active" && (
                          <DropdownMenu.Item
                            className={menuItem}
                            disabled={isLastAdmin(u)}
                            onSelect={() => {
                              setReason("");
                              setSuspending(u);
                            }}
                          >
                            <Icon.lock size={14} /> Suspend{isLastAdmin(u) ? " (last admin)" : ""}
                          </DropdownMenu.Item>
                        )}
                        {u.status === "suspended" && (
                          <DropdownMenu.Item className={menuItem} onSelect={() => reactivate(u)}>
                            <Icon.refund size={14} /> Reactivate
                          </DropdownMenu.Item>
                        )}
                        <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
                        <DropdownMenu.Item
                          className={`${menuItem} text-rose-700`}
                          disabled={isLastAdmin(u)}
                          onSelect={() => setDeleting(u)}
                        >
                          <Icon.trash size={14} /> Delete{isLastAdmin(u) ? " (last admin)" : ""}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
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
            {STAFF_ROLES.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-3.5 flex flex-col"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-navy-900 text-[14px]">{r.label}</div>
                  <span className="text-[11px] text-slate-500 tnum">
                    {(() => {
                      const n = staffUsers.filter((u) => u.role === r.id).length;
                      return `${n} user${n === 1 ? "" : "s"}`;
                    })()}
                  </span>
                </div>
                <div className="text-[12px] text-slate-500 mt-0.5 leading-snug">{r.blurb}</div>
                <ul className="mt-2 space-y-1 text-[12.5px] text-slate-700 flex-1">
                  {NAV[r.id].map((n, i, all) => (
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

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={editing ? `Edit ${editing.name}` : "Add user"}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Btn>
            <Btn variant="primary" icon={editing ? Icon.check : Icon.mail} onClick={saveDraft}>
              {editing ? "Save" : "Send invitation"}
            </Btn>
          </>
        }
      >
        {draft && (
          <div className="space-y-3">
            <Field
              label="Full name"
              hint={
                touched && errors.name ? (
                  <span className="text-rose-700">{errors.name}</span>
                ) : undefined
              }
            >
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                aria-invalid={touched && !!errors.name}
                autoComplete="off"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label="E-mail"
                hint={
                  touched && errors.email ? (
                    <span className="text-rose-700">{errors.email}</span>
                  ) : undefined
                }
              >
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  aria-invalid={touched && !!errors.email}
                  autoComplete="off"
                />
              </Field>
              <Field label="Phone (optional)">
                <Input
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  autoComplete="off"
                />
              </Field>
            </div>
            <fieldset>
              <legend className="text-[12px] font-semibold text-slate-700 mb-1.5">Role</legend>
              <div className="grid sm:grid-cols-2 gap-2">
                {STAFF_ROLES.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-start gap-2.5 rounded-xl ring-1 px-3 py-2.5 cursor-pointer transition ${draft.role === r.id ? "ring-2 ring-teal-500 bg-teal-50/40" : "ring-slate-200 hover:ring-slate-300"}`}
                  >
                    <input
                      type="radio"
                      name="staff-role"
                      value={r.id}
                      checked={draft.role === r.id}
                      onChange={() => setDraft({ ...draft, role: r.id })}
                      className="mt-0.5 accent-teal-600"
                    />
                    <span className="text-[13px] font-semibold text-navy-900">
                      {r.label}
                      <span className="block font-normal text-[11.5px] text-slate-500 leading-snug">
                        {r.blurb}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {TILL_ROLES.includes(draft.role) && (
              <Field
                label="Till PIN (4 digits)"
                hint={
                  touched && errors.tillPin ? (
                    <span className="text-rose-700">{errors.tillPin}</span>
                  ) : (
                    "Used to switch in on a shared till. Leave empty to set it later."
                  )
                }
              >
                <Input
                  className="w-32 tnum tracking-[0.3em]"
                  inputMode="numeric"
                  maxLength={4}
                  value={draft.tillPin}
                  onChange={(e) => setDraft({ ...draft, tillPin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  aria-invalid={touched && !!errors.tillPin}
                  autoComplete="off"
                />
              </Field>
            )}
            {demotingLastAdmin && (
              <div role="alert" className="text-[12px] text-rose-700">
                This is the only active Manager / Admin — keep the role, or make someone else an
                admin first.
              </div>
            )}
            {!editing && (
              <div className="text-[12px] text-slate-500">
                They'll get an invitation e-mail (simulated) and appear as <b>Invited</b> until they
                accept.
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={suspending !== null}
        onClose={() => setSuspending(null)}
        title={suspending ? `Suspend ${suspending.name}?` : "Suspend"}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setSuspending(null)}>
              Cancel
            </Btn>
            <Btn
              variant="danger"
              icon={Icon.lock}
              disabled={!reason.trim()}
              onClick={confirmSuspend}
            >
              Suspend
            </Btn>
          </>
        }
      >
        <p className="text-sm text-slate-600 mb-3">
          They won't be able to sign in until you reactivate them. Their history is kept.
        </p>
        <Field label="Reason">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Seasonal contract paused"
          />
        </Field>
      </Modal>

      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={deleting ? `Delete ${deleting.name}?` : "Delete user"}
        confirmLabel="Delete user"
        body="This removes their account and access. It can't be undone — suspend instead if they may come back."
      />
      {/* Support access moved to Privacy & GDPR › Processors & DPO (AENR-565); a link stays here. */}
      <p className="mt-4 text-[13px] text-slate-600 flex items-center gap-1.5">
        <Icon.shieldCheck size={15} className="text-teal-700" />
        Slaice support sessions on this account and the access grant are in{" "}
        <a className="font-semibold text-teal-700 hover:underline" href="#/admin/privacy?tab=processors">Privacy &amp; GDPR › Processors &amp; DPO</a>.
      </p>
    </div>
  );
}
