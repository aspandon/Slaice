import { Suspense, useState } from "react";
import type { ReactNode } from "react";
import { lazyWithReload } from "../lib/staleChunk";

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

// Unlock is per-device; bump the version suffix to force everyone to re-enter.
const GATE_KEY = "slaice.gate.v1";
const readUnlocked = (): boolean => {
  try {
    return localStorage.getItem(GATE_KEY) === "1";
  } catch {
    return false; // private mode / storage disabled — gate stays up
  }
};
const persistUnlocked = () => {
  try {
    localStorage.setItem(GATE_KEY, "1");
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
        onUnlock={() => {
          persistUnlocked();
          setUnlocked(true);
        }}
      />
    </Suspense>
  );
}
