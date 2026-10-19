import { useId, useState, type ReactNode } from "react";
import { Icon } from "../../lib/icons";
import { Btn, Field, Input, Modal } from "../../components/ui";
import {
  formatPhone,
  sellsAtTill,
  validateStaffDraft,
  type StaffDraft,
} from "../../domain/staffInvite";
import type { StaffRole, StaffUser } from "../../domain/types";
import { RolePicker } from "./RolePicker";

/* ============ Add / edit a staff member (AENR-503 / 717 / 718) ============
   Shared by Team & roles (the tenant's manager) and Platform › tenant › Users &
   roles (Slaice). A new person needs a name, an e-mail (the invitation goes
   there) and a mobile number (it receives sign-in codes by SMS), plus at least
   one role the beach uses. Errors show after the first Save attempt and then
   update as they type. */

const Err = ({ id, children }: { id: string; children?: ReactNode }) =>
  children ? (
    <span id={id} className="text-rose-700 inline-flex items-start gap-1">
      <Icon.alert size={11} className="mt-[3px] shrink-0" aria-hidden />
      {children}
    </span>
  ) : null;

export function UserFormModal({
  initial,
  users,
  roleOn,
  beach,
  lastAdmin,
  onSave,
  onClose,
}: {
  initial: StaffDraft;
  /** Everyone on the tenant — for the unique e-mail, phone and PIN checks. */
  users: readonly StaffUser[];
  roleOn: (r: StaffRole) => boolean;
  beach: string;
  /** Editing the tenant's only active Manager / Admin. */
  lastAdmin: boolean;
  onSave: (d: StaffDraft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<StaffDraft>(initial);
  const [tried, setTried] = useState(false);
  const editing = !!initial.id;
  const errors = validateStaffDraft(draft, users);
  const shown = tried ? errors : {};
  const demotingLastAdmin = editing && lastAdmin && !draft.roles.includes("admin");
  const ids = { name: useId(), email: useId(), phone: useId(), pin: useId(), form: useId() };
  const save = () => {
    setTried(true);
    if (Object.keys(errors).length || demotingLastAdmin) return;
    onSave({
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: formatPhone(draft.phone),
      tillPin: sellsAtTill(draft.roles) ? draft.tillPin : "",
    });
  };
  const nErr = Object.keys(errors).length;
  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Edit ${initial.name}` : "Add user"}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            icon={editing ? Icon.check : Icon.mail}
            type="submit"
            form={ids.form}
          >
            {editing ? "Save" : "Send invitation"}
          </Btn>
        </>
      }
    >
      <form
        id={ids.form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-3"
      >
        {tried && nErr > 0 && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 ring-1 ring-rose-600/20 px-3 py-2 text-[12.5px] text-rose-800 flex items-center gap-2"
          >
            <Icon.alert size={14} aria-hidden /> Check{" "}
            {nErr === 1 ? "the highlighted field" : `the ${nErr} highlighted fields`} before saving.
          </div>
        )}
        <Field label="Full name" hint={<Err id={ids.name}>{shown.name}</Err>}>
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            aria-invalid={!!shown.name}
            aria-describedby={shown.name ? ids.name : undefined}
            autoComplete="off"
            placeholder="e.g. Sofia Lambrou"
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field
            label="E-mail"
            hint={
              shown.email ? (
                <Err id={ids.email}>{shown.email}</Err>
              ) : editing ? undefined : (
                "The invitation and their username go here."
              )
            }
          >
            <Input
              type="email"
              inputMode="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              aria-invalid={!!shown.email}
              aria-describedby={shown.email ? ids.email : undefined}
              autoComplete="off"
              placeholder="name@beach.gr"
            />
          </Field>
          <Field
            label="Mobile phone"
            hint={
              shown.phone ? (
                <Err id={ids.phone}>{shown.phone}</Err>
              ) : (
                "For sign-in codes by SMS. With country code."
              )
            }
          >
            <Input
              type="tel"
              inputMode="tel"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              onBlur={() =>
                !validateStaffDraft(draft, users).phone &&
                setDraft((d) => ({ ...d, phone: formatPhone(d.phone) }))
              }
              aria-invalid={!!shown.phone}
              aria-describedby={shown.phone ? ids.phone : undefined}
              autoComplete="off"
              placeholder="+30 694 200 0110"
            />
          </Field>
        </div>
        <RolePicker
          value={draft.roles}
          onChange={(roles) => setDraft({ ...draft, roles })}
          roleOn={roleOn}
          beach={beach}
        />
        {sellsAtTill(draft.roles) && (
          <Field
            label="Till PIN (4 digits)"
            hint={
              shown.tillPin ? (
                <Err id={ids.pin}>{shown.tillPin}</Err>
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
              onChange={(e) =>
                setDraft({ ...draft, tillPin: e.target.value.replace(/\D/g, "").slice(0, 4) })
              }
              aria-invalid={!!shown.tillPin}
              aria-describedby={shown.tillPin ? ids.pin : undefined}
              autoComplete="off"
            />
          </Field>
        )}
        {demotingLastAdmin && (
          <div role="alert" className="text-[12px] text-rose-700">
            This is the only active Manager / Admin — keep that role, or make someone else an admin
            first.
          </div>
        )}
        {!editing && (
          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-[12px] text-slate-600 flex items-start gap-2">
            <Icon.mail size={14} className="mt-px shrink-0 text-slate-500" aria-hidden />
            <span>
              They get an e-mail from Slaice with their username and a link to set a password and a
              2-step sign-in method (SMS, e-mail or an authenticator app). The link works for 72
              hours. Demo — nothing is really sent; you'll see the e-mail next.
            </span>
          </div>
        )}
      </form>
    </Modal>
  );
}
