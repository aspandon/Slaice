import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Icon } from "../lib/icons";
import { Btn, Input } from "../components/ui";
import { QuickSignIn } from "../components/QuickSignIn";
import { SlaiceLogo, TenantLogo } from "../components/Brand";
import { BeachBackdrop } from "../components/Beach";
import { TENANT } from "../data/beach";
import { useApp, useT } from "../app/store";

// One Zod schema validates the form and could be reused server-side to validate
// the same request. This is the pattern every other form in the app follows.
const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

export function AuthGate() {
  const { setSignedIn, toast, setAccount, go, consent } = useApp();
  // Browse and fill a basket without an account; checkout asks to sign in (AENR-532).
  const browseAsGuest = () => {
    setAccount((a) => ({ ...a, guest: true }));
    setSignedIn(true);
    go("customer", "home");
  };
  // One tap in (AENR-622); the 18+ confirmation moved to the first booking (AENR-489 still holds there).
  const signInAs = () => { setAccount((a) => ({ ...a, guest: false })); setSignedIn(true); };
  const t = useT();
  const [sent, setSent] = useState(false);
  const [useEmail, setUseEmail] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "elena.vlachos@example.com" },
    mode: "onSubmit",
  });
  const email = watch("email");

  const onValid = () => {
    setSent(true);
    toast(t("Demo — magic link 'sent'. Click continue."));
  };

  return (
    <div className="min-h-full grid lg:grid-cols-2">
      {/* left: tenant-branded hero */}
      <div className="relative hidden lg:block">
        <BeachBackdrop pos="absolute" className="inset-0 rounded-none">
          <div className="absolute inset-0 bg-gradient-to-tr from-navy-950/75 via-navy-950/35 to-transparent" />
          <div className="absolute inset-0 p-12 flex flex-col justify-between text-white">
            <div className="flex items-center gap-3 animate-fade-down">
              <span className="animate-floaty"><TenantLogo size={44} /></span>
              <div>
                <div className="font-display font-bold text-lg">{TENANT.name}</div>
                <div className="text-[12px] text-white/70">{TENANT.subdomain}</div>
              </div>
            </div>
            <div className="animate-fade-up">
              <h1 className="font-display font-bold text-5xl leading-[1.04] drop-shadow-lg">{t("Relax.")}<br />{t("Reserve.")}<br />{t("Repeat.")}</h1>
              <p className="mt-4 text-white/80 max-w-sm">{t("Book your sunbed ahead, skip the queues, and enjoy a seamless beach day at")} {TENANT.place}.</p>
              <ul className="mt-6 space-y-2.5 text-[13px] text-white/85">
                {["Pick your exact spot on a live beach map", "Instant QR — straight to the gate", "Digital receipts, automatically"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5"><span className="w-5 h-5 rounded-full bg-teal-500/30 ring-1 ring-teal-300/50 grid place-items-center text-teal-200"><Icon.check size={12} /></span>{t(f)}</li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-white/70">
              {t("powered by")} <SlaiceLogo size={22} withText light />
            </div>
          </div>
        </BeachBackdrop>
      </div>

      {/* right: sign-in */}
      {/* While the cookie banner is up, room below so nothing stays hidden under it (AENR-622). */}
      <div className={`grid place-items-center p-6 sm:p-10 bg-slate-50 ${consent.decided ? "" : "pb-80 lg:pb-52"}`}>
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <TenantLogo size={40} />
            <div className="font-display font-bold text-navy-900 text-lg">{TENANT.name}</div>
          </div>
          <h2 className="font-display font-bold text-2xl text-navy-900">{t("Sign in")}</h2>
          <p className="text-sm text-slate-500 mt-1">{t("One tap with Apple, Google or a passkey. This is a demo — nothing is checked.")}</p>

          <div className="mt-6">
            <QuickSignIn onSignedIn={(how) => { toast(`${t("Signed in with")} ${how === "passkey" ? t("a passkey") : how}.`, { tone: "success" }); signInAs(); }} />
          </div>

          {/* E-mail stays for those who want it, out of the way. */}
          {!useEmail ? (
            <button type="button" onClick={() => setUseEmail(true)} aria-expanded={false} className="mt-3 w-full min-h-[44px] rounded-xl text-[13.5px] font-semibold text-teal-700 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              {t("Use e-mail instead")}
            </button>
          ) : !sent ? (
            <form className="mt-4 space-y-3" onSubmit={handleSubmit(onValid)} noValidate>
              <label className="block">
                <span className="text-[12px] font-semibold text-slate-500">{t("Email")}</span>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="you@example.com"
                  className="mt-1"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-err" : undefined}
                />
              </label>
              {errors.email && (
                <div id="email-err" role="alert" className="text-[12px] text-rose-600 flex items-center gap-1.5">
                  <Icon.alert size={13} /> {errors.email.message}
                </div>
              )}
              <Btn type="submit" variant="teal" full size="lg" icon={Icon.mail}>{t("Send magic link")}</Btn>
            </form>
          ) : (
            <div className="mt-4 rounded-2xl ring-1 ring-teal-600/20 bg-teal-50 p-5 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-teal-600 text-white grid place-items-center"><Icon.mail size={22} /></div>
              <div className="mt-2 font-semibold text-navy-900">{t("Check your inbox")}</div>
              <div className="text-[13px] text-slate-500">{t("We sent a sign-in link to")} <b>{email}</b>.</div>
              <Btn variant="teal" full size="lg" className="mt-4" icon={Icon.arrowR} onClick={signInAs}>{t("Continue (demo)")}</Btn>
            </div>
          )}

          <button type="button" onClick={browseAsGuest} className="mt-5 w-full rounded-xl min-h-[44px] text-[13.5px] font-semibold text-navy-900 ring-1 ring-slate-200 hover:ring-teal-400 hover:bg-white/70 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            {t("Browse as a guest")} <span className="font-normal text-slate-500">· {t("sign in at checkout")}</span>
          </button>

          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-slate-600">
            <Icon.shield size={13} /> {t("Secured demo · no real credentials processed")}
          </div>
        </div>
      </div>
    </div>
  );
}
