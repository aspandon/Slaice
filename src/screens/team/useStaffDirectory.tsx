import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Btn, ConfirmModal, Field, Input, Modal } from "../../components/ui";
import { useApp } from "../../app/store";
import { usePlatform } from "../../lib/usePlatform";
import { useNow } from "../../lib/useLiveSlots";
import { DEMO_STAFF_TENANT, hasRole, rolesLabel, tenantStaff } from "../../data/staff";
import { tenantRoleOn } from "../../domain/features";
import {
  TWO_FACTOR_LABEL,
  inviteFor,
  newInvite,
  usernameFor,
  type StaffDraft,
} from "../../domain/staffInvite";
import type { TenantRecord } from "../../domain/tenants";
import type { StaffRole, StaffUser, TwoFactorMethod } from "../../domain/types";
import { UserFormModal } from "./UserForm";
import { InviteEmailModal } from "./InviteEmail";
import { FirstSignInModal } from "./FirstSignIn";
import { defaultRoles } from "./RolePicker";

/* ============ One staff directory, two doors (AENR-718) ============
   Team & roles (the tenant's manager) and Platform › tenant › Users & roles
   (Slaice) add, invite and edit the same people through this hook. The demo
   beach's staff live in the app store; any other tenant's on its tenant record.
   Every change lands in the audit trail — the tenant's Audit log too when Slaice
   makes it. The modals (add / edit, invitation e-mail, first sign-in) come with it. */

const EMPTY: StaffDraft = { name: "", email: "", phone: "", roles: [], tillPin: "" };

export function useStaffDirectory(t: TenantRecord | undefined, via: "tenant" | "platform") {
  const { staffUsers, updateStaff, toast } = useApp();
  const { updateTenant, actor } = usePlatform();
  const now = useNow(30000);
  const demo = !t || t.id === DEMO_STAFF_TENANT;
  const users = demo || !t ? staffUsers : tenantStaff(t, staffUsers);
  const roleOn = (r: StaffRole) => tenantRoleOn(t, r);
  const beach = t?.name ?? "this beach";
  const by = via === "platform" ? `Slaice · ${actor}` : "Manager / Admin";

  const commit = (next: StaffUser[], action: string) => {
    if (demo) updateStaff(next, action, by);
    if (t && (!demo || via === "platform"))
      updateTenant(t.id, (x) => (demo ? x : { ...x, staff: next }), {
        section: "Users & roles",
        change: action,
        ...(via === "tenant" ? { actorType: "Tenant staff" as const } : {}),
      });
  };
  const patch = (id: string, fn: (u: StaffUser) => StaffUser, action: string) =>
    commit(
      users.map((u) => (u.id === id ? fn(u) : u)),
      action,
    );

  const activeAdmins = users.filter((u) => hasRole(u, "admin") && u.status === "active");
  const isLastAdmin = (u: StaffUser) =>
    hasRole(u, "admin") && u.status === "active" && activeAdmins.length <= 1;

  /* ---- modal state: one at a time ---- */
  const [form, setForm] = useState<StaffDraft | null>(null);
  const [emailFor, setEmailFor] = useState<string | null>(null);
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [suspending, setSuspending] = useState<StaffUser | null>(null);
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState<StaffUser | null>(null);

  const openAdd = () => setForm({ ...EMPTY, roles: defaultRoles(roleOn) });
  const openEdit = (u: StaffUser) =>
    setForm({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      roles: u.roles,
      tillPin: u.tillPin ?? "",
    });

  const save = (d: StaffDraft) => {
    const editing = d.id ? users.find((u) => u.id === d.id) : undefined;
    const clean = {
      name: d.name,
      email: d.email,
      phone: d.phone,
      roles: d.roles,
      tillPin: d.tillPin || undefined,
    };
    if (editing) {
      const changes = [
        rolesLabel(editing) !== rolesLabel(clean)
          ? `roles ${rolesLabel(editing)} → ${rolesLabel(clean)}`
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
      patch(
        editing.id,
        (u) => ({ ...u, ...clean }),
        `Edited ${clean.name}${changes ? ` (${changes})` : ""}`,
      );
      toast(`Saved ${clean.name}.`, { tone: "success" });
      setForm(null);
      return;
    }
    const user: StaffUser = {
      id: `u-${Date.now().toString(36)}`,
      ...clean,
      status: "invited",
      lastSignIn: null,
      created: new Date().toISOString().slice(0, 10),
      username: usernameFor(
        clean.name,
        users.map((u) => u.username ?? ""),
      ),
      invite: newInvite(Date.now()),
    };
    commit(
      [...users, user],
      `Invited ${user.name} as ${rolesLabel(user)} (${user.email}, ${user.phone})`,
    );
    toast(`Invitation e-mailed to ${user.email} (demo).`, { tone: "success" });
    setForm(null);
    setEmailFor(user.id);
  };

  const resend = (u: StaffUser) => {
    const inv = { ...newInvite(Date.now(), inviteFor(u)), revokedAt: undefined };
    patch(
      u.id,
      (x) => ({ ...x, status: "invited", invite: inv }),
      `Resent the invitation to ${u.name}`,
    );
    toast(`New invitation sent to ${u.email} — the old link no longer works (demo).`, {
      tone: "success",
      action: { label: "View e-mail", onClick: () => setEmailFor(u.id) },
    });
  };
  const revoke = (u: StaffUser) => {
    const before = u.invite;
    patch(
      u.id,
      (x) => ({ ...x, invite: { ...inviteFor(x), revokedAt: new Date().toISOString() } }),
      `Revoked ${u.name}'s invitation`,
    );
    toast(`${u.name}'s invitation is revoked — the link no longer works.`, {
      action: {
        label: "Undo",
        onClick: () =>
          patch(u.id, (x) => ({ ...x, invite: before }), `Restored ${u.name}'s invitation`),
      },
    });
  };
  const complete = (u: StaffUser, method: TwoFactorMethod) => {
    const at = new Date().toISOString();
    patch(
      u.id,
      (x) => ({
        ...x,
        status: "active",
        lastSignIn: at,
        passwordSetAt: at,
        twoFactor: { method, enrolledAt: at },
        invite: undefined,
        username: x.username ?? usernameFor(x.name, []),
      }),
      `${u.name} accepted the invitation (password set · 2-step: ${TWO_FACTOR_LABEL[method]})`,
    );
    toast(`${u.name} is active.`, { tone: "success" });
    setLinkFor(null);
  };
  const reset2fa = (u: StaffUser) => {
    patch(u.id, (x) => ({ ...x, twoFactor: undefined }), `Reset 2-step verification for ${u.name}`);
    toast(`2-step verification reset — ${u.name} sets it up again at their next sign-in.`, {
      tone: "success",
    });
  };

  const confirmSuspend = () => {
    if (!suspending || !reason.trim()) return;
    patch(
      suspending.id,
      (x) => ({ ...x, status: "suspended", suspendReason: reason.trim() }),
      `Suspended ${suspending.name} (${reason.trim()})`,
    );
    toast(`${suspending.name} is suspended and can't sign in.`, { tone: "success" });
    setSuspending(null);
  };
  const reactivate = (u: StaffUser) => {
    patch(
      u.id,
      (x) => ({ ...x, status: "active", suspendReason: undefined }),
      `Reactivated ${u.name}`,
    );
    toast(`${u.name} can sign in again.`, { tone: "success" });
  };
  const confirmDelete = () => {
    if (!deleting) return;
    commit(
      users.filter((x) => x.id !== deleting.id),
      `Deleted ${deleting.name} (${rolesLabel(deleting)})`,
    );
    toast(`${deleting.name} was deleted.`, { tone: "success" });
    setDeleting(null);
  };

  const emailUser = emailFor ? users.find((u) => u.id === emailFor) : undefined;
  const linkUser = linkFor ? users.find((u) => u.id === linkFor) : undefined;
  const formUser = form?.id ? users.find((u) => u.id === form.id) : undefined;
  const modals = (
    <>
      {form && (
        <UserFormModal
          initial={form}
          users={users}
          roleOn={roleOn}
          beach={beach}
          lastAdmin={!!formUser && isLastAdmin(formUser)}
          onSave={save}
          onClose={() => setForm(null)}
        />
      )}
      {emailUser && (
        <InviteEmailModal
          user={emailUser}
          beach={beach}
          subdomain={t?.subdomain}
          now={now}
          onClose={() => setEmailFor(null)}
          onOpenLink={() => {
            setEmailFor(null);
            setLinkFor(emailUser.id);
          }}
        />
      )}
      {linkUser && (
        <FirstSignInModal
          user={linkUser}
          beach={beach}
          now={now}
          onResend={() => resend(linkUser)}
          onComplete={(m) => complete(linkUser, m)}
          onClose={() => setLinkFor(null)}
        />
      )}
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
          They won't be able to sign in until they're reactivated. Their history is kept.
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
    </>
  );

  return {
    users,
    commit,
    patch,
    now,
    roleOn,
    beach,
    demo,
    isLastAdmin,
    openAdd,
    openEdit,
    openEmail: (u: StaffUser) => setEmailFor(u.id),
    resend,
    revoke,
    reset2fa,
    reactivate,
    openSuspend: (u: StaffUser) => {
      setReason("");
      setSuspending(u);
    },
    openDelete: (u: StaffUser) => setDeleting(u),
    modals,
  };
}
