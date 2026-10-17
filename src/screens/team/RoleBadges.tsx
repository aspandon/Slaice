import { Icon } from "../../lib/icons";
import { Badge } from "../../components/ui";
import { roleLabel } from "../../data/staff";
import type { StaffRole } from "../../domain/types";

/** A user's roles as chips (Team & roles, Platform › Users & roles). A role the
 *  beach doesn't use (AENR-716) stays visible — dashed, with a lock and "off for
 *  this beach" — so nobody wonders where it went. */
export function RoleBadges({
  roles,
  roleOn,
  beach,
}: {
  roles: readonly StaffRole[];
  roleOn: (r: StaffRole) => boolean;
  beach: string;
}) {
  return (
    <div className="flex flex-wrap gap-1 min-w-[7rem]">
      {roles.map((r) =>
        roleOn(r) ? (
          <Badge key={r} tone={r === "admin" ? "indigo" : "slate"}>
            {roleLabel(r)}
          </Badge>
        ) : (
          <span
            key={r}
            title={`Slaice turned the ${roleLabel(r)} role off for ${beach}`}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-slate-500 border border-dashed border-slate-300"
          >
            <Icon.lock size={10} aria-hidden /> {roleLabel(r)}
            <span className="font-normal">· disabled for this beach</span>
          </span>
        ),
      )}
    </div>
  );
}
