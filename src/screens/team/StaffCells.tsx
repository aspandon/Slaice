import { Icon } from "../../lib/icons";
import { Badge, type MenuAction } from "../../components/ui";
import { TWO_FACTOR_LABEL } from "../../domain/staffInvite";
import type { StaffUser } from "../../domain/types";
import { InviteStatus } from "./InviteEmail";
import type { useStaffDirectory } from "./useStaffDirectory";

/* Table cells shared by Team & roles and Platform › Users & roles (AENR-718). */

type Dir = ReturnType<typeof useStaffDirectory>;

/** Active (with its 2-step method), Suspended (with the reason) or the invitation's state. */
export function StaffStatusCell({ u, dir }: { u: StaffUser; dir: Dir }) {
  if (u.status === "invited")
    return (
      <InviteStatus
        user={u}
        now={dir.now}
        onResend={() => dir.resend(u)}
        onRevoke={() => dir.revoke(u)}
        onOpen={() => dir.openEmail(u)}
      />
    );
  if (u.status === "suspended")
    return (
      <div className="leading-tight">
        <Badge tone="critical">
          <Icon.lock size={10} aria-hidden /> Suspended
        </Badge>
        {u.suspendReason && (
          <div className="text-[11px] text-slate-500 mt-0.5">{u.suspendReason}</div>
        )}
      </div>
    );
  return (
    <div className="leading-tight">
      <Badge tone="success">
        <Icon.checkCircle size={10} aria-hidden /> Active
      </Badge>
      {u.twoFactor && (
        <div className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
          <Icon.shieldCheck size={10} aria-hidden /> 2-step · {TWO_FACTOR_LABEL[u.twoFactor.method]}
        </div>
      )}
    </div>
  );
}

/** The ⋯ menu of a staff row. */
export function staffActions(u: StaffUser, dir: Dir): (MenuAction | false)[] {
  const last = dir.isLastAdmin(u);
  return [
    { id: "edit", label: "Edit details & roles", icon: Icon.edit, onSelect: () => dir.openEdit(u) },
    u.status === "invited" && {
      id: "email",
      label: "Open invitation e-mail (demo)",
      icon: Icon.mail,
      onSelect: () => dir.openEmail(u),
    },
    u.status === "active" &&
      !!u.twoFactor && {
        id: "reset2fa",
        label: "Reset 2-step verification",
        icon: Icon.shieldCheck,
        hint: "They set it up again at next sign-in",
        onSelect: () => dir.reset2fa(u),
      },
    u.status === "active" && {
      id: "suspend",
      label: "Suspend",
      icon: Icon.lock,
      disabled: last,
      hint: last ? "The last active admin" : undefined,
      onSelect: () => dir.openSuspend(u),
    },
    u.status === "suspended" && {
      id: "reactivate",
      label: "Reactivate",
      icon: Icon.refund,
      onSelect: () => dir.reactivate(u),
    },
    {
      id: "delete",
      label: "Delete",
      icon: Icon.trash,
      destructive: true,
      disabled: last,
      hint: last ? "The last active admin" : undefined,
      onSelect: () => dir.openDelete(u),
    },
  ];
}
