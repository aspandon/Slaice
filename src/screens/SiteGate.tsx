import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Icon } from "../lib/icons";
import { Btn, Input } from "../components/ui";
import { SlaiceLogo } from "../components/Brand";

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
   (below) so the literal password never appears in the deployed source — but
   for genuine protection use hosting-level auth (HTTP Basic Auth / Cloudflare
   Access / a password-protected host).
   ========================================================================== */

// SHA-256 (hex) of the accepted email (lower-cased) and password. To change the
// credentials, regenerate with:  printf '%s' '<value>' | sha256sum
const EMAIL_HASH = "3fe4db2ea1d30276acee67f335574297c608cc4b415d372c1e4d359646873ccb";
const PW_HASH = "f8e597fe5248b97dce5ac3c383b11d5862bd516139dcad97d857016c95cc0267";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function verify(email: string, password: string): Promise<boolean> {
  const [e, p] = await Promise.all([sha256Hex(email.trim().toLowerCase()), sha256Hex(password.trim())]);
  return e === EMAIL_HASH && p === PW_HASH;
}

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

/** Wraps the app: shows the login until the device is unlocked, then the app. */
export function SiteGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(readUnlocked);
  if (unlocked) return <>{children}</>;
  return (
    <SiteLogin
      onUnlock={() => {
        persistUnlocked();
        setUnlocked(true);
      }}
    />
  );
}

// Shape validation only (presence + email format). The credential check itself
// happens in onValid against the hashes above — a mismatch is surfaced as a
// post-submit error, the way a real login reports "wrong password".
const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type GateForm = z.infer<typeof schema>;

function SiteLogin({ onUnlock }: { onUnlock: () => void }) {
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setFocus,
    resetField,
    watch,
    formState: { errors },
  } = useForm<GateForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  // Land focus on the email field — this gate is the whole page, so it's the
  // expected first action (done programmatically to satisfy jsx-a11y/no-autofocus).
  useEffect(() => setFocus("email"), [setFocus]);

  // Clear the "wrong credentials" banner as soon as the user edits either field.
  useEffect(() => {
    const sub = watch(() => setAuthError((e) => (e ? null : e)));
    return () => sub.unsubscribe();
  }, [watch]);

  const onValid = async (data: GateForm) => {
    setChecking(true);
    const ok = await verify(data.email, data.password).catch(() => false);
    if (ok) {
      onUnlock(); // parent swaps this screen out for the app
      return; // leave `checking` true — we're unmounting
    }
    setAuthError("That email and password don't match. Please try again.");
    resetField("password");
    setChecking(false);
    setFocus("password");
  };

  return (
    <div className="grad-slaice min-h-dvh w-full grid place-items-center p-5 sm:p-8">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex justify-center mb-6">
          <SlaiceLogo size={40} withText light />
        </div>

        <div className="glass-card-solid rounded-3xl p-6 sm:p-7 shadow-float">
          <h1 className="font-display font-bold text-xl text-navy-900 text-center">Sign in to continue</h1>
          <p className="mt-1.5 text-[13px] text-slate-500 text-center text-balance">
            This preview is private. Enter your credentials to view the Slaice demo.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onValid)} noValidate>
            <div>
              <label htmlFor="gate-email" className="text-[12px] font-semibold text-slate-600">
                Email
              </label>
              <Input
                id="gate-email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                className="mt-1"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "gate-email-err" : undefined}
                {...register("email")}
              />
              {errors.email && (
                <div id="gate-email-err" role="alert" className="mt-1.5 text-[12px] text-rose-600 flex items-center gap-1.5">
                  <Icon.alert size={13} /> {errors.email.message}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="gate-password" className="text-[12px] font-semibold text-slate-600">
                Password
              </label>
              <div className="relative mt-1">
                <Input
                  id="gate-password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-12"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "gate-password-err" : undefined}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  aria-pressed={show}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-lg text-slate-500 hover:text-navy-900 transition-colors"
                >
                  {show ? <Icon.eyeOff size={17} /> : <Icon.eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <div id="gate-password-err" role="alert" className="mt-1.5 text-[12px] text-rose-600 flex items-center gap-1.5">
                  <Icon.alert size={13} /> {errors.password.message}
                </div>
              )}
            </div>

            {authError && (
              <div role="alert" className="rounded-xl bg-rose-50 ring-1 ring-rose-500/20 px-3 py-2.5 text-[13px] text-rose-700 flex items-center gap-2">
                <Icon.alert size={15} className="shrink-0" /> {authError}
              </div>
            )}

            <Btn type="submit" variant="indigo" full size="lg" loading={checking} icon={Icon.arrowR}>
              Sign in
            </Btn>
          </form>
        </div>

        <p className="mt-5 text-center text-[12px] text-white/80 flex items-center justify-center gap-1.5">
          <Icon.lock size={13} /> Private preview · authorized access only
        </p>
      </div>
    </div>
  );
}
