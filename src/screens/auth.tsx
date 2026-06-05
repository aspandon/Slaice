import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Icon } from "../lib/icons";
import { Btn, Input } from "../components/ui";
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
  const { setSignedIn, toast } = useApp();
  const t = useT();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "elena@example.com" },
    mode: "onSubmit",
  });
  const email = watch("email");

  const onValid = () => {
    setSent(true);
    toast(t("Demo — magic link 'sent'. Click continue."));
  };

  const sso = (p: string) => {
    toast(`${t("Demo —")} ${p} ${t("SSO. Signing you in…")}`);
    setTimeout(() => setSignedIn(true), 500);
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
      <div className="grid place-items-center p-6 sm:p-10 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <TenantLogo size={40} />
            <div className="font-display font-bold text-navy-900 text-lg">{TENANT.name}</div>
          </div>
          <h2 className="font-display font-bold text-2xl text-navy-900">{t("Sign in")}</h2>
          <p className="text-sm text-slate-500 mt-1">{t("Use a magic link or single sign-on. This is a demo — any input signs you in.")}</p>

          {!sent ? (
            <form className="mt-6 space-y-3" onSubmit={handleSubmit(onValid)} noValidate>
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
            <div className="mt-6 rounded-2xl ring-1 ring-teal-600/20 bg-teal-50 p-5 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-teal-600 text-white grid place-items-center"><Icon.mail size={22} /></div>
              <div className="mt-2 font-semibold text-navy-900">{t("Check your inbox")}</div>
              <div className="text-[13px] text-slate-500">{t("We sent a sign-in link to")} <b>{email}</b>.</div>
              <Btn variant="teal" full size="lg" className="mt-4" icon={Icon.arrowR} onClick={() => setSignedIn(true)}>{t("Continue (demo)")}</Btn>
            </div>
          )}

          <div className="flex items-center gap-3 my-6 text-[12px] text-slate-600">
            <div className="h-px bg-slate-200 flex-1" /> {t("or continue with")} <div className="h-px bg-slate-200 flex-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Btn variant="outline" onClick={() => sso("Google")}>
              <span className="font-bold text-[15px]"><span className="text-[#4285F4]">G</span><span className="text-[#EA4335]">o</span><span className="text-[#FBBC05]">o</span><span className="text-[#4285F4]">g</span><span className="text-[#34A853]">l</span><span className="text-[#EA4335]">e</span></span>
            </Btn>
            <Btn variant="outline" onClick={() => sso("Microsoft")}>
              <span className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5"><i className="bg-[#F25022]" /><i className="bg-[#7FBA00]" /><i className="bg-[#00A4EF]" /><i className="bg-[#FFB900]" /></span> Microsoft
            </Btn>
            <Btn variant="outline" onClick={() => sso("Apple")}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-4 h-4 text-navy-900">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple
            </Btn>
            <Btn variant="outline" onClick={() => sso("Facebook")}>
              <svg viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true" className="w-4 h-4">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Btn>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-slate-600">
            <Icon.shield size={13} /> {t("Secured demo · no real credentials processed")}
          </div>
        </div>
      </div>
    </div>
  );
}
