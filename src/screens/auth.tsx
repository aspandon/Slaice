import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Icon } from "../lib/icons";
import { Btn, Input } from "../components/ui";
import { QuickSignIn } from "../components/QuickSignIn";
import { SlaiceLogo } from "../components/Brand";
import { CustomerBackdrop } from "../components/CustomerBackdrop";
import { GlideLogo } from "../components/GlideLogo";
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
    // Sign-in on the live beach (AENR-757): the same scene, weather and tenant logo
    // as Home, with the form on a glass card — the first screen already looks like
    // the product. After sign-in the logo glides to its place on Home.
    <div className={`relative min-h-full flex flex-col lg:flex-row ${consent.decided ? "" : "pb-48 sm:pb-40"}`}>
      <CustomerBackdrop immersive={false} ring={false} />
      {/* desktop: the promise over the sea, on a soft scrim for legibility */}
      <div className="relative hidden lg:flex flex-1 flex-col justify-between p-12 text-white">
        <div aria-hidden className="absolute inset-0 -z-[1] bg-gradient-to-r from-navy-950/60 via-navy-950/25 to-transparent" />
        <GlideLogo spot="auth" className="h-24 w-auto self-start drop-shadow-lg" />
        <div className="animate-fade-up">
          <h1 className="font-display font-bold text-5xl leading-[1.04] drop-shadow-lg">{t("Relax.")}<br />{t("Reserve.")}<br />{t("Repeat.")}</h1>
          <p className="mt-4 text-white/90 max-w-sm drop-shadow">{t("Book your sunbed ahead, skip the queues, and enjoy a seamless beach day at")} {TENANT.place}.</p>
          <ul className="mt-6 space-y-2.5 text-[13px] text-white/90">
            {["Pick your exact spot on a live beach map", "Instant QR — straight to the gate", "Digital receipts, automatically"].map((f) => (
              <li key={f} className="flex items-center gap-2.5"><span className="w-5 h-5 rounded-full bg-teal-500/40 ring-1 ring-teal-200/60 grid place-items-center text-white"><Icon.check size={12} /></span>{t(f)}</li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-white/80">
          {t("powered by")} <SlaiceLogo size={22} withText light />
        </div>
      </div>

      {/* the sign-in card */}
      <div className="relative flex-1 lg:flex-none lg:w-[500px] flex flex-col items-center justify-center gap-5 p-5 sm:p-10">
        <GlideLogo spot="auth" className="lg:hidden h-16 sm:h-20 w-auto drop-shadow-lg" />
        <div className="w-full max-w-sm glass-card-solid rounded-3xl p-6 sm:p-7 animate-fade-up">
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

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-600">
            <Icon.shield size={13} /> {t("Secured demo · no real credentials processed")}
          </div>
        </div>
        <div className="lg:hidden flex items-center gap-2 text-[12px] text-white/90 drop-shadow">
          {t("powered by")} <SlaiceLogo size={20} withText light />
        </div>
      </div>
    </div>
  );
}
