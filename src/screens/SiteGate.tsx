import { Suspense, useState } from "react";
import type { ReactNode } from "react";
import { lazyWithReload } from "../lib/staleChunk";
import { GATE_KEY, type SiteAccess } from "../lib/siteAccess";

/* ============================================================================
   Site access gate
   ----------------------------------------------------------------------------
   A single fixed-credential wall in front of the whole demo, so the public URL
   isn't wide open. It sits OUTSIDE the app (wraps <App/> in main.tsx), separate
   from the product's own magic-link sign-in (screens/auth.tsx) which runs after
   it. Unlock is remembered in localStorage so it's a one-time prompt per device.

   ⚠️ This is a deterrent, not real security. The site is static (no server), so
   the demo still ships in the JS bundle and a determined visitor could bypass
   the React check. We therefore store only SHA-256 *hashes* of the credentials
   (SiteLogin.tsx) so the literal password never appears in the deployed source — but
   for genuine protection use hosting-level auth (HTTP Basic Auth / Cloudflare
   Access / a password-protected host).
   ========================================================================== */

// The form (and react-hook-form + zod with it) is fetched only while the gate is up (AENR-839).
const SiteLogin = lazyWithReload(() => import("./SiteLogin").then((m) => ({ default: m.SiteLogin })));

// Unlock is per-device, with the account's access level (lib/siteAccess.ts, AENR-1200): "1" = full,
// "tenant" = every role but Platform / Slaice. Bump the key's version suffix to force everyone to re-enter.
const readUnlocked = (): boolean => {
  try {
    const v = localStorage.getItem(GATE_KEY);
    return v === "1" || v === "tenant";
  } catch {
    return false; // private mode / storage disabled — gate stays up
  }
};
const persistUnlocked = (access: SiteAccess) => {
  try {
    localStorage.setItem(GATE_KEY, access === "full" ? "1" : "tenant");
  } catch {
    /* storage unavailable — they'll just re-enter next visit */
  }
};

/** A booking shared with the group (AENR-715) opens for anyone with the link: the guest view
 *  shows only what the link carries, like a real pass link would. Everything else stays walled. */
const isSharedPass = () => window.location.hash.startsWith("#/pass");

/** Wraps the app: shows the login until the device is unlocked, then the app. */
export function SiteGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(readUnlocked);
  if (unlocked || isSharedPass()) return <>{children}</>;
  return (
    <Suspense fallback={<div className="grad-slaice min-h-dvh w-full" />}>
      <SiteLogin
        onUnlock={(access) => {
          persistUnlocked(access);
          setUnlocked(true);
        }}
      />
    </Suspense>
  );
}
