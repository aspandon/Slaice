import { useApp } from "../app/store";
import { PROFILE } from "../domain/account";
import { usual } from "../domain/visits";
import { useVisits } from "./useVisits";

/* One guest record (AENR-644): the signed-in guest's name, favourite zone, usual
   party and usual channel come from one place — the account and the same visit
   history — so My bookings, Home, the Wallet cards and the admin's guest profile
   never describe her differently. */
export interface GuestRecord {
  name: string;
  /** As printed on pass cards. */
  cardName: string;
  email: string;
  favouriteZone: string | null;
  /** Guests on her usual visit. */
  partySize: number;
  /** Where she books: the guest app. */
  channel: "Online";
}

export function useGuestRecord(): GuestRecord {
  const { account } = useApp();
  const { visits } = useVisits();
  const u = usual(visits);
  const party = account.party ? Object.values(account.party).reduce((a, n) => a + n, 0) : 0;
  return {
    name: `${PROFILE.first} ${PROFILE.last}`,
    cardName: `${PROFILE.first} ${PROFILE.last}`.toUpperCase(),
    email: PROFILE.email,
    favouriteZone: u?.zone ?? null,
    partySize: party || (u ? u.sets * 2 : 2),
    channel: "Online",
  };
}
