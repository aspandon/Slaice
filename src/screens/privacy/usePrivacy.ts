import { useCallback } from "react";
import { useApp } from "../../app/store";
import { DEMO_TODAY } from "../../domain/period";
import {
  consentVersion,
  type ConsentPurpose,
  type ConsentSource,
  type DsarRequest,
} from "../../domain/gdpr";

/* Privacy actions shared by the admin workspace, the customer Privacy Centre
   and the cookie banner (AENR-484 / 485). Every consent change appends to the
   append-only log — the single source of truth that Communicate, the guest
   profile and the Privacy Centre all read. */

/** The signed-in demo customer (Elena) is CRM guest #3. */
export const CUSTOMER_GUEST_ID = 3;
export const STAFF_NAME = "Eleni Markou";
const nowStamp = () => new Date().toISOString().slice(0, 16);

export function usePrivacy() {
  const { privacy, setPrivacy } = useApp();
  const version = consentVersion(privacy.policies);

  const recordConsent = useCallback(
    (
      guestId: number,
      changes: Partial<Record<ConsentPurpose, boolean>>,
      source: ConsentSource,
      wording: string,
    ) => {
      const at = nowStamp();
      const entries = (Object.entries(changes) as [ConsentPurpose, boolean][]).map(
        ([purpose, granted], i) => ({
          id: `c-${guestId}-${purpose}-${at}-${i}`,
          guestId,
          purpose,
          granted,
          at,
          source,
          version,
          wording,
        }),
      );
      setPrivacy((s) => ({ ...s, consentLog: [...s.consentLog, ...entries] }));
    },
    [setPrivacy, version],
  );

  const submitRequest = useCallback(
    (r: Omit<DsarRequest, "id" | "received" | "status" | "stepsDone" | "audit">, by: string) => {
      let id = "";
      setPrivacy((s) => {
        const n = Math.max(0, ...s.requests.map((x) => Number(x.id.replace(/\D/g, "")) || 0)) + 1;
        id = `DSAR-${n}`;
        const verified = r.channel === "Privacy Centre";
        const req: DsarRequest = {
          ...r,
          id,
          received: DEMO_TODAY,
          // Requests from a signed-in account are verified by the login itself.
          status: verified ? "In progress" : "Received",
          verification: verified
            ? { method: "Account login", by: "System", at: DEMO_TODAY }
            : undefined,
          stepsDone: 0,
          audit: [
            {
              at: nowStamp(),
              by,
              what: `${r.type} request received · ${r.channel}${verified ? " · verified by account login" : ""}`,
            },
          ],
        };
        return { ...s, requests: [req, ...s.requests] };
      });
      return id;
    },
    [setPrivacy],
  );

  return { privacy, setPrivacy, version, recordConsent, submitRequest, today: DEMO_TODAY };
}
