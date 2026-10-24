import { DEFAULT_ACCOUNT, type AccountState } from "../domain/account";
import { DEFAULT_PASSES } from "../data/passes";
import type { CartItem, CustomerPasses } from "../domain/types";

/* Demo › "Simulate a first-time guest" (AENR-702 / AENR-778). Two guests share the browser:
   - the demo's returning guest (sample history plus whatever was done with the switch off);
   - the simulated first-time guest, who starts with nothing — no bookings, passes, credit or
     basket — and keeps what they do (book, buy a pass…), so they become a returning guest too.
   Turning the switch on puts the returning guest aside and brings the simulated one in (fresh the
   first time); turning it off swaps them back. **Reset** starts the simulated guest over. */

/** Window event the Demo menu fires to start the simulated guest over. */
export const FIRST_TIME_RESET = "slaice:first-time-reset";

const REAL_KEY = "slaice.demo.newGuest.saved";
const SIM_KEY = "slaice.demo.newGuest.sim";

export interface GuestSnapshot {
  account: AccountState;
  passes: CustomerPasses;
  cart: CartItem[];
}

const FRESH = (): GuestSnapshot => ({ account: { ...DEFAULT_ACCOUNT }, passes: DEFAULT_PASSES, cart: [] });

function read(key: string): GuestSnapshot | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as GuestSnapshot) : null;
  } catch {
    return null;
  }
}
function write(key: string, v: GuestSnapshot | null) {
  try {
    if (v) localStorage.setItem(key, JSON.stringify(v));
    else localStorage.removeItem(key);
  } catch {
    /* private mode: the swap still happens for this visit */
  }
}

/** Switch on: keep the returning guest aside, return the simulated one (null when already swapped). */
export function enterFirstTime(current: GuestSnapshot): GuestSnapshot | null {
  if (read(REAL_KEY)) return null;
  write(REAL_KEY, current);
  return read(SIM_KEY) ?? FRESH();
}

/** Switch off: keep the simulated guest for next time, return the returning one (null when not swapped). */
export function leaveFirstTime(current: GuestSnapshot): GuestSnapshot | null {
  const real = read(REAL_KEY);
  if (!real) return null;
  write(SIM_KEY, current);
  write(REAL_KEY, null);
  return {
    account: { ...DEFAULT_ACCOUNT, ...real.account, selfService: { ...DEFAULT_ACCOUNT.selfService, ...real.account.selfService } },
    passes: real.passes ?? DEFAULT_PASSES,
    cart: real.cart ?? [],
  };
}

/** Reset: the simulated guest starts over, as on their very first visit. */
export function resetFirstTime(): GuestSnapshot {
  write(SIM_KEY, null);
  return FRESH();
}
