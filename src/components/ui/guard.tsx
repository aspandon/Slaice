import { createContext, isValidElement, useContext, type ReactNode } from "react";
import { MUTATING, VIEW_AS_BLOCKED } from "../../domain/tenants";

/* ---------- View-as guard (AENR-515) ----------
   While Slaice staff view a tenant, a read-only session disables every
   mutating control and some actions are blocked in any session (payout /
   bank details, exports, plan, refunds). Buttons and switches read this
   context and explain why they're off. */
export interface Guard {
  viewAs: boolean;
  readOnly: boolean;
}
export const GuardCtx = createContext<Guard>({ viewAs: false, readOnly: false });

/** Plain text of a React node (for matching a button's label). */
export function textOf(n: ReactNode): string {
  if (n == null || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(n)) return textOf(n.props.children);
  return "";
}
/** Why a control with this label is off in the current session, or "". */
export function useGuardReason(label: string): string {
  const g = useContext(GuardCtx);
  if (!g.viewAs) return "";
  const l = label.trim();
  if (VIEW_AS_BLOCKED.test(l))
    return "Blocked in every View-as session (payouts, bank, exports, plan, refunds).";
  if (g.readOnly && MUTATING.test(l)) return "Read-only View-as session — changes are disabled.";
  return "";
}
export function useGuard(): Guard {
  return useContext(GuardCtx);
}
