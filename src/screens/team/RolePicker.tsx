import { useId, useState } from "react";
import { Icon } from "../../lib/icons";
import { STAFF_ROLES } from "../../data/staff";
import type { StaffRole } from "../../domain/types";

/** The roles a new person starts with: the first one the beach uses (Manager / Admin is always on). */
export const DEFAULT_ROLE_ORDER: readonly StaffRole[] = [
  "cashier",
  "controller",
  "callcenter",
  "support",
  "accountant",
  "admin",
];
export const defaultRoles = (roleOn: (r: StaffRole) => boolean): StaffRole[] => [
  DEFAULT_ROLE_ORDER.find(roleOn) ?? "admin",
];

/** Tick one or more roles (AENR-717). Only roles the beach uses are offered
 *  (AENR-716); one the person already holds but the beach turned off shows
 *  greyed, ticked, and can only be removed. A person keeps at least one role. */
export function RolePicker({
  value,
  onChange,
  roleOn,
  beach,
}: {
  value: readonly StaffRole[];
  onChange: (roles: StaffRole[]) => void;
  roleOn: (r: StaffRole) => boolean;
  beach: string;
}) {
  const [lastRoleWarn, setLastRoleWarn] = useState(false);
  const hint = useId();
  const offered = STAFF_ROLES.filter((r) => roleOn(r.id) || value.includes(r.id));
  const hidden = STAFF_ROLES.filter((r) => !roleOn(r.id) && !value.includes(r.id));
  return (
    <fieldset aria-describedby={hint}>
      <legend className="text-[12px] font-semibold text-slate-700 mb-0.5">Roles</legend>
      <p id={hint} className="text-[11.5px] text-slate-500 mb-1.5">
        Pick one or more. Someone with several roles switches between them from their account menu
        (top right).
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        {offered.map((r) => {
          const on = value.includes(r.id);
          const off = !roleOn(r.id);
          return (
            <label
              key={r.id}
              className={`flex items-start gap-2.5 rounded-xl ring-1 px-3 py-2.5 cursor-pointer transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-500 ${off ? "ring-slate-200 border border-dashed border-slate-300 bg-slate-50/60" : on ? "ring-2 ring-teal-500 bg-teal-50/40" : "ring-slate-200 hover:ring-slate-300"}`}
            >
              <input
                type="checkbox"
                name="staff-roles"
                value={r.id}
                checked={on}
                onChange={() => {
                  if (on && value.length === 1) {
                    setLastRoleWarn(true);
                    return;
                  }
                  setLastRoleWarn(false);
                  onChange(on ? value.filter((x) => x !== r.id) : [...value, r.id]);
                }}
                className="mt-0.5 w-4 h-4 accent-teal-600"
              />
              <span
                className={`text-[13px] font-semibold ${off ? "text-slate-500" : "text-navy-900"}`}
              >
                {r.label}
                <span className="block font-normal text-[11.5px] text-slate-500 leading-snug">
                  {off ? (
                    <span className="inline-flex items-center gap-1">
                      <Icon.lock size={11} aria-hidden /> Disabled for {beach} — untick to remove
                      it.
                    </span>
                  ) : (
                    r.blurb
                  )}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {hidden.length > 0 && (
        <p className="mt-1.5 text-[11.5px] text-slate-500 flex items-center gap-1.5">
          <Icon.lock size={11} aria-hidden /> Not used at {beach}:{" "}
          {hidden.map((r) => r.label).join(", ")}.
        </p>
      )}
      {lastRoleWarn && (
        <div role="alert" className="mt-1.5 text-[12px] text-rose-700 flex items-center gap-1.5">
          <Icon.info size={12} /> A user needs at least one role — tick another role before removing
          this one.
        </div>
      )}
    </fieldset>
  );
}
