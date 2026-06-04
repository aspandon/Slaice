import { useState } from "react";
import { Icon } from "../lib/icons";
import { Btn, Sheet, Toggle } from "./ui";
import { useApp } from "../app/store";
import { CONSENT_PURPOSES } from "../data/gdpr";

/* GDPR cookie/consent banner (P4.1).
   Shown until the visitor makes a choice; "Manage preferences" opens a
   drag-to-dismiss Sheet with a per-purpose toggle. Choice is timestamped in
   the app store and reflected in the customer Privacy Centre + admin audit. */
export function ConsentBanner() {
  const { consent, setConsent, toast } = useApp();
  const [prefs, setPrefs] = useState(false);
  const [draft, setDraft] = useState({ analytics: consent.analytics, marketing: consent.marketing });

  if (consent.decided && !prefs) return null;

  const acceptAll = () => { setConsent({ analytics: true, marketing: true }); toast("Preferences saved — thanks!", { tone: "success" }); };
  const rejectAll = () => { setConsent({ analytics: false, marketing: false }); toast("Only strictly-necessary cookies are on.", { tone: "success" }); };
  const saveDraft = () => { setConsent(draft); setPrefs(false); toast("Your cookie preferences are saved.", { tone: "success" }); };

  return (
    <>
      {!consent.decided && !prefs && (
        <div className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] animate-slide-up" role="region" aria-label="Cookie consent">
          <div className="mx-auto max-w-3xl glass-card-solid rounded-3xl p-4 sm:p-5 shadow-float flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 grid place-items-center shrink-0"><Icon.shieldCheck size={22} /></span>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-navy-900">We value your privacy</div>
              <p className="text-[13px] text-slate-600 leading-snug mt-0.5">
                We use strictly-necessary cookies to run the site, and — with your consent — analytics and marketing cookies.
                You can change this anytime in <b>Account → Privacy &amp; data</b>.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Btn variant="outline" size="sm" onClick={() => { setDraft({ analytics: consent.analytics, marketing: consent.marketing }); setPrefs(true); }}>Manage</Btn>
              <Btn variant="ghost" size="sm" onClick={rejectAll}>Reject non-essential</Btn>
              <Btn variant="teal" size="sm" icon={Icon.check} onClick={acceptAll}>Accept all</Btn>
            </div>
          </div>
        </div>
      )}

      <Sheet open={prefs} onClose={() => setPrefs(false)} title="Cookie preferences"
        footer={<>
          <Btn variant="ghost" onClick={rejectAll}>Reject all</Btn>
          <Btn variant="primary" icon={Icon.check} onClick={saveDraft}>Save preferences</Btn>
        </>}>
        <div className="space-y-2.5">
          {CONSENT_PURPOSES.map((p) => {
            const on = p.required ? true : draft[p.key];
            return (
              <div key={p.key} className="flex items-start justify-between gap-3 rounded-2xl ring-1 ring-slate-200 bg-white/70 px-3.5 py-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-navy-900 flex items-center gap-1.5">
                    {p.label}
                    {p.required && <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700 bg-teal-50 rounded px-1.5 py-0.5">Always on</span>}
                  </div>
                  <div className="text-[12px] text-slate-600 leading-snug mt-0.5">{p.desc}</div>
                </div>
                <div className="pt-0.5 shrink-0">
                  {p.required
                    ? <Toggle on={true} onChange={() => {}} />
                    : <Toggle on={on} onChange={(v) => setDraft((d) => ({ ...d, [p.key]: v }))} />}
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            Read our <button className="underline hover:text-navy-900">Privacy Policy</button> and <button className="underline hover:text-navy-900">Cookie Policy</button>. Consent is recorded with a timestamp and can be withdrawn at any time.
          </p>
        </div>
      </Sheet>
    </>
  );
}
