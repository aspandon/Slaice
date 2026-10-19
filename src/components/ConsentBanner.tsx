import { useState } from "react";
import { Icon } from "../lib/icons";
import { Btn, Sheet, Toggle } from "./ui";
import { useApp, useT } from "../app/store";
import { CONSENT_PURPOSES } from "../data/gdpr";
import { consentVersion, currentPolicy, type Policy } from "../domain/gdpr";
import { DEFAULT_PRIVACY } from "../data/gdpr";
import { CUSTOMER_GUEST_ID, usePrivacy } from "../screens/privacy/usePrivacy";
import { PolicyModal } from "../screens/privacy/Consent";

/* GDPR cookie/consent banner (P4.1).
   Shown until the visitor makes a choice; "Manage preferences" opens a
   drag-to-dismiss Sheet with a per-purpose toggle. Choice is timestamped in
   the app store and reflected in the customer Privacy Centre + admin audit. */
const SEED_VERSION = consentVersion(DEFAULT_PRIVACY.policies);

export function ConsentBanner() {
  const { consent, setConsent, toast, signedIn, persona } = useApp();
  const { privacy, version, recordConsent } = usePrivacy();
  const t = useT();
  const [prefs, setPrefs] = useState(false);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [draft, setDraft] = useState<Record<string, boolean>>({ analytics: consent.analytics, marketing: consent.marketing });
  // A material change to the privacy policy asks returning visitors again (AENR-485).
  // Choices saved before versioning count as the seeded notice version; staff
  // personas aren't site visitors, so only the customer side is re-asked.
  const outdated = persona === "customer" && consent.decided && (consent.version ?? SEED_VERSION) !== version;
  const show = !consent.decided || outdated;

  if (!show && !prefs && !policy) return null;

  // Each choice is stored with the notice version and, for the signed-in
  // customer, appended to their consent log.
  const decide = (c: { analytics: boolean; marketing: boolean }, wording: string) => {
    setConsent({ ...c, version });
    if (signedIn) recordConsent(CUSTOMER_GUEST_ID, { analytics: c.analytics, marketing_cookies: c.marketing }, "Cookie banner", wording);
  };
  const acceptAll = () => { decide({ analytics: true, marketing: true }, "Accept all"); toast(t("Preferences saved — thanks!"), { tone: "success" }); };
  const rejectAll = () => { decide({ analytics: false, marketing: false }, "Reject non-essential"); setPrefs(false); toast(t("Only strictly-necessary cookies are on."), { tone: "success" }); };
  const saveDraft = () => { decide({ analytics: !!draft.analytics, marketing: !!draft.marketing }, "Saved preferences"); setPrefs(false); toast(t("Your cookie preferences are saved."), { tone: "success" }); };
  const open = (kind: Policy["kind"]) => setPolicy(currentPolicy(privacy.policies, kind) ?? null);

  return (
    <>
      {show && !prefs && (
        <div className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] animate-slide-up" role="region" aria-label="Cookie consent">
          <div className="mx-auto max-w-3xl glass rounded-3xl p-4 sm:p-5 shadow-float flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <span className="max-sm:hidden w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 grid place-items-center shrink-0"><Icon.shieldCheck size={22} /></span>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-navy-900">{outdated ? t("We've updated our privacy policy") : t("We value your privacy")}</div>
              <p className="text-[13px] text-slate-600 leading-snug mt-0.5">
                {outdated ? <>{t("Please review what changed and confirm your choices.")} </> : null}
                {/* Phones get the short version (AENR-757) so the banner doesn't cover the sign-in. */}
                <span className="sm:hidden">{t("Analytics and marketing cookies only with your consent.")} </span>
                <span className="max-sm:hidden">{t("We use strictly-necessary cookies to run the site, and — with your consent — analytics and marketing cookies. You can change this anytime in")} <b>{t("Account › Privacy & cookies")}</b>. </span><button type="button" className="underline font-semibold hover:text-navy-900" onClick={() => open("privacy")}>{t("Privacy Policy")}</button> · <button type="button" className="underline font-semibold hover:text-navy-900" onClick={() => open("cookie")}>{t("Cookie Policy")}</button>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Btn variant="outline" size="sm" onClick={() => { setDraft({ analytics: consent.analytics, marketing: consent.marketing }); setPrefs(true); }}>{t("Manage")}</Btn>
              <Btn variant="ghost" size="sm" onClick={rejectAll}>{t("Reject non-essential")}</Btn>
              <Btn variant="teal" size="sm" icon={Icon.check} onClick={acceptAll}>{t("Accept all")}</Btn>
            </div>
          </div>
        </div>
      )}

      <Sheet open={prefs} onClose={() => setPrefs(false)} title={t("Cookie preferences")}
        footer={<>
          <Btn variant="ghost" onClick={rejectAll}>{t("Reject all")}</Btn>
          <Btn variant="primary" icon={Icon.check} onClick={saveDraft}>{t("Save preferences")}</Btn>
        </>}>
        <div className="space-y-2.5">
          {CONSENT_PURPOSES.map((p) => {
            const on = p.required ? true : draft[p.key];
            return (
              <div key={p.key} className="flex items-start justify-between gap-3 rounded-2xl ring-1 ring-slate-200 bg-white/70 px-3.5 py-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-navy-900 flex items-center gap-1.5">
                    {t(p.label)}
                    {p.required && <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700 bg-teal-50 rounded px-1.5 py-0.5">{t("Always on")}</span>}
                  </div>
                  <div className="text-[12px] text-slate-600 leading-snug mt-0.5">{t(p.desc)}</div>
                  <details className="mt-1 text-[11.5px] text-slate-500">
                    <summary className="cursor-pointer font-semibold text-teal-700">{t("Cookies")} ({privacy.cookies.filter((c) => c.category === p.key).length})</summary>
                    <ul className="mt-1 space-y-0.5">{privacy.cookies.filter((c) => c.category === p.key).map((c) => <li key={c.name}><span className="font-mono text-navy-900">{c.name}</span> · {c.provider} · {c.duration} · {c.party === "First" ? t("first-party") : t("third-party")}</li>)}</ul>
                  </details>
                </div>
                <div className="pt-0.5 shrink-0">
                  {p.required
                    ? <Toggle on={true} onChange={() => {}} disabled ariaLabel={`${t(p.label)} · ${t("Always on")}`} />
                    : <Toggle on={on} onChange={(v) => setDraft((d) => ({ ...d, [p.key]: v }))} ariaLabel={t(p.label)} />}
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            {t("Read our")} <button type="button" onClick={() => open("privacy")} className="underline hover:text-navy-900">{t("Privacy Policy")}</button> {t("and")} <button type="button" onClick={() => open("cookie")} className="underline hover:text-navy-900">{t("Cookie Policy")}</button>. {t("Consent is recorded with a timestamp and can be withdrawn at any time.")}
          </p>
        </div>
      </Sheet>
      {policy && <PolicyModal p={policy} onClose={() => setPolicy(null)} />}
    </>
  );
}
