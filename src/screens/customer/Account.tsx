import { useEffect, useState } from "react";
import type { ChangeEvent, Dispatch, ReactNode, SetStateAction } from "react";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { Btn, Field, Input, Stepper, Toggle } from "../../components/ui";
import { LANGUAGES, useApp, useT } from "../../app/store";
import { readHashQuery } from "../../app/router";
import { PrivacyCenter } from "../../components/PrivacyCenter";
import { ChangePasswordModal, Enable2FAModal } from "../../components/Security";
import { PROFILE, partyLabel } from "../../domain/account";
import { useExtras } from "../../lib/useExtras";
import { CustomerDocs } from "./CustomerDocs";
import { AppleLogo } from "../../components/WalletPass";

/* ============ Account (AENR-563 · one list, AENR-621) ============
   Everything about the guest's account in one list, like iOS Settings: each
   row says what it holds and opens one focused page (`?section=`, so the
   browser's Back returns to the list). Switches apply at once — no Save. */

type Section = "profile" | "companions" | "payment" | "receipts" | "notifications" | "language" | "privacy" | "security";
const TITLES: Record<Section, string> = {
  profile: "Profile",
  companions: "Companions",
  payment: "Payment methods",
  receipts: "Receipts & invoices",
  notifications: "Notifications",
  language: "Language",
  privacy: "Privacy & cookies",
  security: "Sign-in & security",
};
const isSection = (s: string | null): s is Section => !!s && s in TITLES;
const open = (s: Section | "") => {
  window.location.hash = `#/customer/account${s ? `?section=${s}` : ""}`;
};

export function CustomerAccount() {
  const { account, setSignedIn, toast, lang } = useApp();
  const t = useT();
  const ex = useExtras();
  const [section, setSection] = useState<Section | "">(() => { const s = readHashQuery().get("section"); return isSection(s) ? s : ""; });
  useEffect(() => {
    const on = () => { const s = readHashQuery().get("section"); setSection(isSection(s) ? s : ""); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  // Preferences live here so they hold while moving between the list and a page.
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ push: true, email: true, sms: false, bookings: true, weather: true, offers: true, receipts: true });

  const names = Object.fromEntries(ex.tickets.map((c) => [c.id, ex.ticketLabel(c.id).toLowerCase()]));
  const card = account.savedCard ? `${account.savedCard.brand} ···· ${account.savedCard.last4}` : t("None saved");
  const langName = LANGUAGES.find((l) => l.code === lang)?.native ?? "English";
  const onCount = [prefs.push, prefs.email, prefs.sms].filter(Boolean).length;

  if (section) {
    return (
      <div className="animate-fade-up max-w-2xl mx-auto">
        <button type="button" onClick={() => open("")} className="mb-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 -ml-2 text-[14px] font-semibold text-teal-700 hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
          <Icon.chevL size={18} /> {t("Account")}
        </button>
        <h1 className="font-display font-bold text-[26px] text-navy-900 mb-4">{t(TITLES[section])}</h1>
        {section === "profile" && <ProfilePage />}
        {section === "companions" && <CompanionsPage />}
        {section === "payment" && <PaymentPage />}
        {section === "receipts" && <CustomerDocs />}
        {section === "notifications" && <NotificationsPage prefs={prefs} setPrefs={setPrefs} />}
        {section === "language" && <LanguagePage />}
        {section === "privacy" && <PrivacyPage />}
        {section === "security" && <SecurityPage />}
      </div>
    );
  }

  return (
    <div className="animate-fade-up max-w-2xl mx-auto space-y-5">
      <h1 className="sr-only">{t("Account")}</h1>
      <button type="button" onClick={() => open("profile")} className="w-full glass-flat rounded-3xl p-4 sm:p-5 flex items-center gap-4 text-left hover:bg-white/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
        <span aria-hidden className="w-14 h-14 rounded-2xl grid place-items-center text-white text-lg font-bold shrink-0" style={{ background: "linear-gradient(135deg,#f7b535,#e8920e)" }}>
          {PROFILE.first[0]}{PROFILE.last[0]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-bold text-[19px] text-navy-900">{PROFILE.first} {PROFILE.last}</span>
          <span className="block text-[13px] text-slate-600 truncate">{PROFILE.email} · {PROFILE.phone}</span>
        </span>
        <Icon.chevR size={18} className="text-slate-400 shrink-0" />
      </button>

      <Group>
        <Row icon={Icon.group} tone="bg-teal-600" label={t("Companions")} value={account.party ? partyLabel(account.party, names, t) : t("Not set")} onClick={() => open("companions")} />
        <Row icon={Icon.card} tone="bg-navy-800" label={t("Payment methods")} value={card} onClick={() => open("payment")} />
        <Row icon={Icon.receipt} tone="bg-sky-600" label={t("Receipts & invoices")} onClick={() => open("receipts")} />
      </Group>
      <Group>
        <Row icon={Icon.bell} tone="bg-rose-500" label={t("Notifications")} value={onCount ? `${onCount} ${onCount === 1 ? t("channel on") : t("channels on")}` : t("Off")} onClick={() => open("notifications")} />
        <Row icon={Icon.globe} tone="bg-indigo-500" label={t("Language")} value={langName} onClick={() => open("language")} />
      </Group>
      <Group>
        <Row icon={Icon.shieldCheck} tone="bg-emerald-600" label={t("Privacy & cookies")} onClick={() => open("privacy")} />
        <Row icon={Icon.lock} tone="bg-slate-600" label={t("Sign-in & security")} onClick={() => open("security")} />
      </Group>
      <Group>
        <button type="button" onClick={() => { setSignedIn(false); toast(t("Signed out (demo).")); }} className="w-full min-h-[52px] px-4 text-left text-[15px] font-semibold text-rose-700 hover:bg-rose-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500">
          {t("Sign out")}
        </button>
      </Group>
    </div>
  );
}

/* An inset group of rows, divided by hairlines. */
function Group({ children }: { children: ReactNode }) {
  return <div className="glass-flat rounded-2xl overflow-hidden divide-y divide-slate-200/70">{children}</div>;
}
function Row({ icon: I, tone, label, value, onClick }: { icon: IconRenderer; tone: string; label: string; value?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full min-h-[52px] px-4 py-2.5 flex items-center gap-3 text-left hover:bg-white/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500">
      <span aria-hidden className={`w-8 h-8 rounded-lg grid place-items-center text-white shrink-0 ${tone}`}><I size={16} /></span>
      <span className="flex-1 min-w-0 text-[15px] font-medium text-navy-900">{label}</span>
      {value && <span className="text-[13.5px] text-slate-500 truncate max-w-[45%] text-right">{value}</span>}
      <Icon.chevR size={16} className="text-slate-400 shrink-0" />
    </button>
  );
}
const PAGE = "glass-flat rounded-2xl p-4 sm:p-5";

function ProfilePage() {
  const { toast } = useApp();
  const t = useT();
  const [f, setF] = useState({ first: PROFILE.first, last: PROFILE.last, email: PROFILE.email, phone: PROFILE.phone });
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form className={`${PAGE} space-y-3`} onSubmit={(e) => { e.preventDefault(); toast(t("Profile saved."), { tone: "success" }); open(""); }}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t("First name")}><Input value={f.first} onChange={set("first")} autoComplete="given-name" /></Field>
        <Field label={t("Last name")}><Input value={f.last} onChange={set("last")} autoComplete="family-name" /></Field>
        <Field label={t("E-mail")}><Input type="email" value={f.email} onChange={set("email")} autoComplete="email" /></Field>
        <Field label={t("Mobile")}><Input type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" /></Field>
      </div>
      <div className="flex justify-end"><Btn type="submit" variant="primary" icon={Icon.check}>{t("Done")}</Btn></div>
    </form>
  );
}

/* Who usually comes (AENR-613): bookings start with these people. Changes apply at once. */
function CompanionsPage() {
  const { account, setAccount, toast } = useApp();
  const t = useT();
  const ex = useExtras();
  const party = account.party ?? {};
  const setN = (id: string, n: number) => setAccount((a) => ({ ...a, party: { ...(a.party ?? {}), [id]: n } }));
  return (
    <div className="space-y-3">
      <p className="text-[14px] text-slate-700">{t("Every booking starts with these people — change them for one visit in the booking itself.")}</p>
      <div className={`${PAGE} space-y-2.5`}>
        {ex.tickets.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 min-h-[44px]">
            <span className="text-[14.5px] text-navy-900">{ex.ticketLabel(c.id)}{c.id === "adult" && <span className="block text-[12px] text-slate-500">{t("Including you")}</span>}</span>
            <Stepper label={ex.ticketLabel(c.id)} value={party[c.id] ?? 0} onChange={(n) => setN(c.id, n)} />
          </div>
        ))}
      </div>
      {account.party && (
        <Btn variant="ghost" className="text-rose-700" onClick={() => { const before = account.party; setAccount((a) => ({ ...a, party: null })); toast(t("Usual party forgotten."), { action: { label: t("Undo"), onClick: () => setAccount((a) => ({ ...a, party: before })) } }); }}>
          {t("Forget my usual party")}
        </Btn>
      )}
    </div>
  );
}

function PaymentPage() {
  const { account, setAccount, toast } = useApp();
  const t = useT();
  const c = account.savedCard;
  return (
    <div className="space-y-3">
      <div className={`${PAGE} space-y-2`}>
        <div className="flex items-center gap-3 min-h-[44px]">
          <span aria-hidden className="w-10 h-7 rounded-md bg-black text-white grid place-items-center"><AppleLogo size={14} /></span>
          <span className="flex-1 text-[14.5px] text-navy-900">Apple Pay · Google Pay<span className="block text-[12px] text-slate-500">{t("Offered first at checkout on this device")}</span></span>
        </div>
        {c ? (
          <div className="flex items-center gap-3 min-h-[44px] border-t border-slate-200/70 pt-2">
            <span aria-hidden className="w-10 h-7 rounded-md bg-gradient-to-br from-navy-800 to-navy-950 text-white text-[10px] font-bold grid place-items-center">{c.brand.slice(0, 4).toUpperCase()}</span>
            <span className="flex-1 text-[14.5px] text-navy-900">•••• {c.last4}<span className="block text-[12px] text-slate-500">{t("Exp")} {c.exp}</span></span>
            <Btn variant="ghost" size="sm" className="text-rose-700" onClick={() => { setAccount((a) => ({ ...a, savedCard: null })); toast(`${t("Removed card ending")} ${c.last4}.`, { action: { label: t("Undo"), onClick: () => setAccount((a) => ({ ...a, savedCard: c })) } }); }}>{t("Remove")}</Btn>
          </div>
        ) : (
          <p className="text-[13px] text-slate-600 border-t border-slate-200/70 pt-2">{t("No saved card. Tick “Save this card” when you pay and it appears here.")}</p>
        )}
      </div>
      <Btn variant="outline" icon={Icon.plus} onClick={() => toast(t("Demo — Stripe SetupIntent flow."))}>{t("Add card")}</Btn>
    </div>
  );
}

function NotificationsPage({ prefs, setPrefs }: { prefs: Record<string, boolean>; setPrefs: Dispatch<SetStateAction<Record<string, boolean>>> }) {
  const t = useT();
  const row = (k: string, label: string, sub: string) => (
    <div key={k} className="flex items-center justify-between gap-3 min-h-[52px] py-1.5">
      <span className="min-w-0"><span className="block text-[14.5px] text-navy-900">{label}</span><span className="block text-[12px] text-slate-500">{sub}</span></span>
      <Toggle on={prefs[k]} onChange={(v) => setPrefs((p) => ({ ...p, [k]: v }))} ariaLabel={label} />
    </div>
  );
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 px-1">{t("How")}</h2>
        <div className={`${PAGE} py-1 divide-y divide-slate-200/70`}>
          {row("push", t("Push"), t("Alerts on this device."))}
          {row("email", t("E-mail"), `${t("A copy to")} ${PROFILE.email}.`)}
          {row("sms", t("SMS"), t("Critical alerts only."))}
        </div>
      </div>
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 px-1">{t("About")}</h2>
        <div className={`${PAGE} py-1 divide-y divide-slate-200/70`}>
          {row("bookings", t("Booking updates"), t("Confirmations, gate scans, refunds."))}
          {row("weather", t("Weather alerts"), t("Wind or conditions affecting your visit."))}
          {row("offers", t("Offers & promotions"), t("Weekend deals and seasonal perks."))}
          {row("receipts", t("Receipts & documents"), t("myDATA receipts and invoices."))}
        </div>
      </div>
    </div>
  );
}

function LanguagePage() {
  const { lang, setLang } = useApp();
  const t = useT();
  return (
    <fieldset className={`${PAGE} py-1 divide-y divide-slate-200/70`}>
      <legend className="sr-only">{t("Language")}</legend>
      {LANGUAGES.map((l) => (
        <label key={l.code} className="flex items-center gap-3 min-h-[52px] cursor-pointer">
          <input type="radio" name="account-lang" className="sr-only peer" checked={lang === l.code} onChange={() => setLang(l.code)} />
          <span className="flex-1 text-[14.5px] text-navy-900 rounded peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500">{l.native}<span className="block text-[12px] text-slate-500">{l.label}{l.mvp ? "" : ` · ${t("FUTURE")}`}</span></span>
          {lang === l.code && <Icon.check size={18} className="text-teal-600" />}
        </label>
      ))}
    </fieldset>
  );
}

function PrivacyPage() {
  const { reopenConsent } = useApp();
  const t = useT();
  const [privacy, setPrivacy] = useState(false);
  return (
    <>
      <Group>
        <Row icon={Icon.shieldCheck} tone="bg-emerald-600" label={t("Privacy Centre")} value={t("Your data")} onClick={() => setPrivacy(true)} />
        <Row icon={Icon.shield} tone="bg-slate-600" label={t("Cookie choices")} onClick={reopenConsent} />
      </Group>
      <p className="mt-2 px-1 text-[12.5px] text-slate-600">{t("Export your data, manage consents, see who processes it, or delete your account.")}</p>
      <PrivacyCenter open={privacy} onClose={() => setPrivacy(false)} />
    </>
  );
}

function SecurityPage() {
  const t = useT();
  const [pw, setPw] = useState(false);
  const [fa, setFa] = useState(false);
  return (
    <>
      <Group>
        <Row icon={Icon.lock} tone="bg-slate-600" label={t("Change password")} onClick={() => setPw(true)} />
        <Row icon={Icon.phone} tone="bg-teal-600" label={t("Two-step verification")} onClick={() => setFa(true)} />
      </Group>
      <ChangePasswordModal open={pw} onClose={() => setPw(false)} />
      <Enable2FAModal open={fa} onClose={() => setFa(false)} />
    </>
  );
}
