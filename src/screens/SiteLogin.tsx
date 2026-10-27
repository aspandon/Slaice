import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Icon } from "../lib/icons";
import { Btn, Input } from "../components/ui";
import { SlaiceLogo } from "../components/Brand";
import type { SiteAccess } from "../lib/siteAccess";

/* The site access gate's sign-in form (see SiteGate.tsx). Its own module so the form stack
   (react-hook-form + zod) loads only on a device that hasn't unlocked yet (AENR-839). */

// The accepted accounts: SHA-256 (hex) of the email (lower-cased) and the password, and what the
// account may open (lib/siteAccess.ts, AENR-1200). To add or change one, regenerate with:
//   printf '%s' '<value>' | sha256sum
const ACCOUNTS: readonly { email: string; password: string; access: SiteAccess }[] = [
  // The owner: every role.
  { email: "3fe4db2ea1d30276acee67f335574297c608cc4b415d372c1e4d359646873ccb", password: "0362b44a44d4a875bce9bb5d27f41264f95cea6fe5dbf40260f0a090ff8b0a0c", access: "full" },
  // ichadji@aktitouiliou.gr: every role but Platform / Slaice.
  { email: "c4a5a71e260345d6a9cb41d9fbfda1f03c584718c092c903c544b604b1f570a3", password: "f20a49ad4336cc21f449aa4e30f3fb225b01fad305ae371a8129954f6f4748c6", access: "tenant" },
];

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The account's access level, or null when the email and password don't match one. */
async function verify(email: string, password: string): Promise<SiteAccess | null> {
  const [e, p] = await Promise.all([
    sha256Hex(email.trim().toLowerCase()),
    sha256Hex(password.trim()),
  ]);
  return ACCOUNTS.find((a) => a.email === e && a.password === p)?.access ?? null;
}

// Shape validation only (presence + email format). The credential check itself
// happens in onValid against the hashes above — a mismatch is surfaced as a
// post-submit error, the way a real login reports "wrong password".
const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type GateForm = z.infer<typeof schema>;

export function SiteLogin({ onUnlock }: { onUnlock: (access: SiteAccess) => void }) {
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
    const access = await verify(data.email, data.password).catch(() => null);
    if (access) {
      onUnlock(access); // parent swaps this screen out for the app
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
          <h1 className="font-display font-bold text-xl text-navy-900 text-center">
            Sign in to continue
          </h1>
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
                <div
                  id="gate-email-err"
                  role="alert"
                  className="mt-1.5 text-[12px] text-rose-600 flex items-center gap-1.5"
                >
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
                <div
                  id="gate-password-err"
                  role="alert"
                  className="mt-1.5 text-[12px] text-rose-600 flex items-center gap-1.5"
                >
                  <Icon.alert size={13} /> {errors.password.message}
                </div>
              )}
            </div>

            {authError && (
              <div
                role="alert"
                className="rounded-xl bg-rose-50 ring-1 ring-rose-500/20 px-3 py-2.5 text-[13px] text-rose-700 flex items-center gap-2"
              >
                <Icon.alert size={15} className="shrink-0" /> {authError}
              </div>
            )}

            <Btn
              type="submit"
              variant="indigo"
              full
              size="lg"
              loading={checking}
              icon={Icon.arrowR}
            >
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
