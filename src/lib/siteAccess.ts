import type { PersonaId } from "../domain/types";

/* ============ What a signed-in demo account may open (AENR-1200) ============
   The site access gate (screens/SiteGate.tsx) accepts more than one account. Each carries an access
   level, remembered per device with the unlock itself:
   - "full": every role, Platform / Slaice included (the owner's account);
   - "tenant": every role except Platform / Slaice — it is left out of every role menu, and any way
     into it (a saved state, a deep link, a hash edit, Back) lands on Manager / Admin instead.
   Like the gate, this is a deterrent in a static demo, not security: the check runs in the browser. */
export type SiteAccess = "full" | "tenant";

/** localStorage key of the unlock: "1" = full access (the original value), "tenant" = no Platform. */
export const GATE_KEY = "slaice.gate.v1";

export function siteAccess(): SiteAccess {
  try {
    return localStorage.getItem(GATE_KEY) === "tenant" ? "tenant" : "full";
  } catch {
    return "full";
  }
}

/** Can this device's account open the role? */
export const personaAllowed = (p: PersonaId, access: SiteAccess = siteAccess()) =>
  access === "full" || p !== "platform";

/** Where a role the account can't open lands instead. */
export const FALLBACK_PERSONA: PersonaId = "admin";
