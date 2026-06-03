import { useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Btn, Input } from "../components/ui.jsx";
import { SlaiceLogo, TenantLogo } from "../components/Brand.jsx";
import { BeachBackdrop } from "../components/Beach.jsx";
import { TENANT } from "../data/beach.js";
import { useApp } from "../app/store.jsx";

export function AuthGate() {
  const { setSignedIn, toast } = useApp();
  const [email, setEmail] = useState("elena@example.com");
  const [sent, setSent] = useState(false);

  const sso = (p) => { toast(`Demo — ${p} SSO. Signing you in…`); setTimeout(() => setSignedIn(true), 500); };

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
              <h1 className="font-display font-bold text-5xl leading-[1.04] drop-shadow-lg">Relax.<br />Reserve.<br />Repeat.</h1>
              <p className="mt-4 text-white/80 max-w-sm">Book your sunbed ahead, skip the queues, and enjoy a seamless beach day at {TENANT.place}.</p>
              <ul className="mt-6 space-y-2.5 text-[13px] text-white/85">
                {["Pick your exact spot on a live beach map", "Instant QR — straight to the gate", "Digital receipts, automatically"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5"><span className="w-5 h-5 rounded-full bg-teal-500/30 ring-1 ring-teal-300/50 grid place-items-center text-teal-200"><Icon.check size={12} /></span>{f}</li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-white/70">
              powered by <SlaiceLogo size={22} withText light />
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
          <h2 className="font-display font-bold text-2xl text-navy-900">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1">Use a magic link or single sign-on. This is a demo — any input signs you in.</p>

          {!sent ? (
            <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); setSent(true); toast("Demo — magic link 'sent'. Click continue."); }}>
              <label className="block">
                <span className="text-[12px] font-semibold text-slate-500">Email</span>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="mt-1" />
              </label>
              <Btn type="submit" variant="teal" full size="lg" icon={Icon.mail}>Send magic link</Btn>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl ring-1 ring-teal-600/20 bg-teal-50 p-5 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-teal-600 text-white grid place-items-center"><Icon.mail size={22} /></div>
              <div className="mt-2 font-semibold text-navy-900">Check your inbox</div>
              <div className="text-[13px] text-slate-500">We sent a sign-in link to <b>{email}</b>.</div>
              <Btn variant="teal" full size="lg" className="mt-4" icon={Icon.arrowR} onClick={() => setSignedIn(true)}>Continue (demo)</Btn>
            </div>
          )}

          <div className="flex items-center gap-3 my-6 text-[12px] text-slate-600">
            <div className="h-px bg-slate-200 flex-1" /> or continue with <div className="h-px bg-slate-200 flex-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Btn variant="outline" onClick={() => sso("Google")}>
              <span className="font-bold text-[15px]"><span className="text-[#4285F4]">G</span><span className="text-[#EA4335]">o</span><span className="text-[#FBBC05]">o</span><span className="text-[#4285F4]">g</span><span className="text-[#34A853]">l</span><span className="text-[#EA4335]">e</span></span>
            </Btn>
            <Btn variant="outline" onClick={() => sso("Microsoft")}>
              <span className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5"><i className="bg-[#F25022]" /><i className="bg-[#7FBA00]" /><i className="bg-[#00A4EF]" /><i className="bg-[#FFB900]" /></span> Microsoft
            </Btn>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-slate-600">
            <Icon.shield size={13} /> Secured demo · no real credentials processed
          </div>
        </div>
      </div>
    </div>
  );
}
