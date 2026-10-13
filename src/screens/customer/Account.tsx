import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Btn } from "../../components/ui";
import { useApp, useT } from "../../app/store";
import { SettingsModal } from "../../components/Shell/TopBar";
import { CustomerDocs } from "./CustomerDocs";

/* ============ Account (AENR-563) ============
   The guest's profile, settings, privacy and every receipt in one place —
   reachable from the tab bar / top nav, not only the avatar menu. Each
   booking also opens its own receipt (My bookings). */

export function CustomerAccount() {
  const { setSignedIn, toast, reopenConsent } = useApp();
  const t = useT();
  const [settings, setSettings] = useState(false);
  return (
    <div className="animate-fade-up space-y-5 max-w-5xl mx-auto">
      <h1 className="sr-only">{t("Account")}</h1>
      <section className="glass-flat rounded-3xl p-4 sm:p-5 flex flex-wrap items-center gap-4">
        <span
          aria-hidden
          className="w-12 h-12 rounded-2xl grid place-items-center text-white font-bold"
          style={{ background: "linear-gradient(135deg,#f7b535,#e8920e)" }}
        >
          EM
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-navy-900">Elena M.</div>
          <div className="text-[13px] text-slate-600">elena@example.com · +30 694 000 0000</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" icon={Icon.cog} onClick={() => setSettings(true)}>
            {t("Account settings")}
          </Btn>
          <Btn variant="ghost" icon={Icon.shield} onClick={reopenConsent}>
            {t("Cookie choices")}
          </Btn>
          <Btn
            variant="ghost"
            icon={Icon.logout}
            className="text-rose-700"
            onClick={() => {
              setSignedIn(false);
              toast(t("Signed out (demo)."));
            }}
          >
            {t("Sign out")}
          </Btn>
        </div>
      </section>
      <section aria-labelledby="acct-receipts">
        <h2
          id="acct-receipts"
          className="inline-flex items-center gap-2 mb-2 rounded-xl glass-card-solid px-3 py-1.5 font-display font-bold text-navy-900"
        >
          <Icon.receipt size={17} className="text-teal-700" /> {t("All receipts")}
        </h2>
        <CustomerDocs />
      </section>
      <SettingsModal open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}
