import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import { Modal, Btn, Badge, Tabs, Toggle, Table, ConfirmModal } from "./ui";
import type { TabEntry } from "./ui";
import { useApp, useT } from "../app/store";
import { localeFor } from "../app/i18n";
import { PROCESSORS, DATA_RIGHTS } from "../data/gdpr";
import { currentPolicy, latest, retentionLabel, type ConsentPurpose, type DsarType } from "../domain/gdpr";
import { CUSTOMER_GUEST_ID, usePrivacy } from "../screens/privacy/usePrivacy";
import { PolicyModal } from "../screens/privacy/Consent";
import { downloadZIP, buildPDFBytes, csvText } from "../lib/download";
import { CUSTOMER_BOOKINGS, CUSTOMER_DOCS } from "../data/mock";

/* Customer Privacy Centre (P4.2) — access/portability, consent management,
   transparency on processors, and a proper erasure flow with the legal
   retention caveat. Opened from Account settings. */
export function PrivacyCenter({ open, onClose }: { open?: boolean; onClose: () => void }) {
  const { consent, setConsent, reopenConsent, toast, crm, lang } = useApp();
  const { privacy, recordConsent, submitRequest } = usePrivacy();
  // Guest-facing: every string goes through t() (AENR-768).
  const t = useT();
  // Request kinds and statuses as literal t() calls, so `npm run i18n` finds them.
  const REQUEST: Record<DsarType, string> = {
    Access: t("Access request"), Portability: t("Portability request"), Rectification: t("Rectification request"),
    Erasure: t("Erasure request"), Restriction: t("Restriction request"), Objection: t("Objection request"),
  };
  const STATUS: Record<string, string> = {
    Received: t("Received"), "Verifying identity": t("Verifying identity"), "In progress": t("In progress"),
    Extended: t("Extended"), Completed: t("Completed"), Refused: t("Refused"),
  };
  const [tab, setTab] = useState("data");
  const [confirmErase, setConfirmErase] = useState(false);
  const [ask, setAsk] = useState<DsarType | null>(null);
  const [askText, setAskText] = useState("");
  const [policy, setPolicy] = useState<"privacy" | "cookie" | null>(null);
  const me = { first: "Elena", last: "Vlachos", email: "elena.vlachos@example.com", phone: "+30 694 100 0003" };
  const shownPolicy = policy ? currentPolicy(privacy.policies, policy) : undefined;
  const restricted = !!crm.profiles[CUSTOMER_GUEST_ID]?.restricted;
  const myOpen = privacy.requests.filter((r) => r.guestId === CUSTOMER_GUEST_ID && r.status !== "Completed" && r.status !== "Refused");
  const has = (p: ConsentPurpose) => latest(privacy.consentLog, CUSTOMER_GUEST_ID, p)?.granted ?? false;
  const setChannel = (p: ConsentPurpose, label: string, v: boolean) => {
    recordConsent(CUSTOMER_GUEST_ID, { [p]: v }, "Privacy Centre", `${label} ${v ? "on" : "off"}`);
    toast(`${label} ${v ? t("on") : t("off")} — ${t("saved.")}`);
  };
  const request = (type: DsarType, detail?: string) => {
    const id = submitRequest({ type, guestId: CUSTOMER_GUEST_ID, ...me, channel: "Privacy Centre", detail }, "Elena Vlachos");
    toast(`${REQUEST[type]} ${t("sent")}${id ? ` (${id})` : ""} — ${t("we'll reply within one month.")}`, { tone: "success" });
  };
  const [exporting, setExporting] = useState(false);

  const exportData = () => {
    setExporting(true);
    // Assemble the data subject's bundle from the mock zones.
    const profile = { name: "Elena Manoli", email: "elena@example.com", phone: "+30 694 000 0000", language: "EN", created: "2025-06-12" };
    const json = JSON.stringify({
      exportedAt: new Date().toISOString(),
      subject: profile,
      consents: { analytics: consent.analytics, marketing: consent.marketing, recordedAt: consent.ts },
      bookings: CUSTOMER_BOOKINGS,
      documents: CUSTOMER_DOCS.map((d) => ({ id: d.id, date: d.date, for: d.for, amount: d.amt, mark: d.mark })),
      processors: PROCESSORS,
    }, null, 2);
    const summary = buildPDFBytes({
      title: "Your personal data",
      subtitle: "Akti tou Iliou · access and portability request (GDPR Art. 15 & 20)",
      meta: [`${profile.name} · ${profile.email} · ${profile.phone}`, "This ZIP: my-data.json (everything), bookings.csv, receipts.csv and this summary"],
      sections: [
        { kpis: [{ label: "Bookings", value: String(CUSTOMER_BOOKINGS.length) }, { label: "Receipts", value: String(CUSTOMER_DOCS.length) }, { label: "Marketing consent", value: consent.marketing ? "Granted" : "Not granted" }, { label: "Analytics consent", value: consent.analytics ? "Granted" : "Not granted" }] },
        { title: "Profile", table: { cols: ["Field", "Value"], rows: Object.entries(profile).map(([k, v]) => [k[0].toUpperCase() + k.slice(1), v]) } },
        { title: "Bookings", table: { cols: ["Booking", "Item", "Date", "Status", "Price (€)"], rows: CUSTOMER_BOOKINGS.map((b) => [b.id, b.item, b.date, b.status, b.price]) } },
        { title: "Receipts", table: { cols: ["Document", "For", "Date", "Amount"], rows: CUSTOMER_DOCS.map((d) => [d.id, d.for, d.date, d.amt]) } },
        { title: "Who processes your data", table: { cols: ["Processor", "Purpose"], rows: PROCESSORS.map((x) => [String((x as { name?: string }).name ?? x), String((x as { purpose?: string }).purpose ?? "")]) } },
      ],
      footer: ["Questions or corrections: privacy@aktitouiliou.gr"],
    });
    const bookingsCsv = csvText(["Booking", "Item", "Date", "Status", "Price (€)"], CUSTOMER_BOOKINGS.map((b) => [b.id, b.item, b.date, b.status, b.price]));
    const receiptsCsv = csvText(["Document", "For", "Date", "Amount", "MARK"], CUSTOMER_DOCS.map((d) => [d.id, d.for, d.date, d.amt, d.mark]));
    setTimeout(() => {
      downloadZIP(`my-data-${new Date().toISOString().slice(0, 10)}.zip`, [
        { name: "my-data.json", content: json },
        { name: "bookings.csv", content: bookingsCsv },
        { name: "receipts.csv", content: receiptsCsv },
        { name: "summary.pdf", content: summary },
      ]);
      setExporting(false);
      toast(t("Your data export is ready (ZIP: JSON, CSV and PDF)."), { tone: "success" });
    }, 600);
  };

  const tabs: TabEntry[] = [
    ["data", t("Your data"), Icon.fileDown],
    ["consent", t("Consents"), Icon.sliders],
    ["who", t("Who sees it"), Icon.users],
    ["delete", t("Delete"), Icon.trash],
  ];

  return (
    <Modal open={open} onClose={onClose} title={t("Privacy & data")} wide
      footer={<Btn variant="ghost" onClick={onClose}>{t("Close")}</Btn>}>
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" scroll />

      {tab === "data" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-teal-50/70 ring-1 ring-teal-600/15 p-4 flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-white text-teal-700 grid place-items-center shrink-0 shadow-sm"><Icon.download size={20} /></span>
            <div className="flex-1">
              <div className="font-semibold text-navy-900">{t("Download your data")}</div>
              <p className="text-[13px] text-slate-600 leading-snug mt-0.5">{t("Get a machine-readable copy of everything we hold — profile, bookings, documents and consents (GDPR Art. 15 & 20).")}</p>
              <Btn variant="teal" size="sm" className="mt-3" icon={Icon.fileDown} loading={exporting} onClick={exportData}>{exporting ? t("Preparing…") : t("Export my data (ZIP)")}</Btn>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {DATA_RIGHTS.filter((r) => r.key !== "erase").map((r) => {
              const I = Icon[r.icon] || Icon.shield;
              const actions: [DsarType, string][] = r.key === "access" ? [["Access", t("Ask for a full copy")]] : r.key === "rectify" ? [["Rectification", t("Ask for a correction")]] : [["Restriction", t("Restrict")], ["Objection", t("Object to profiling")]];
              return (
                <div key={r.key} className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-sm text-navy-900"><I size={15} className="text-slate-500" />{t(r.title)}</div>
                  <div className="text-[12px] text-slate-600 leading-snug mt-1">{t(r.desc)}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">{actions.map(([kind, l]) => <button key={kind} type="button" onClick={() => { setAsk(kind); setAskText(""); }} className="text-[12px] font-semibold text-teal-700 hover:underline">{l} →</button>)}</div>
                </div>
              );
            })}
          </div>
          {myOpen.length > 0 && (
            <div className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-3.5">
              <div className="font-semibold text-sm text-navy-900 mb-1">{t("Your open requests")}</div>
              <ul className="text-[12.5px] text-slate-700 space-y-0.5">{myOpen.map((r) => <li key={r.id}>{r.id} · {REQUEST[r.type]} · {STATUS[r.status] ?? r.status} · {t("sent")} {r.received}</li>)}</ul>
            </div>
          )}
          <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-3.5 text-[12.5px] text-slate-700">
            <div className="font-semibold text-navy-900">{t("Questions about your data?")}</div>
            <div>{privacy.dpo.name} · <a className="underline font-semibold" href={`mailto:${privacy.dpo.email}`}>{privacy.dpo.email}</a> · {privacy.dpo.address}</div>
            <div className="mt-1.5 flex flex-wrap gap-3"><button type="button" className="font-semibold text-teal-700 hover:underline" onClick={() => setPolicy("privacy")}>{t("Privacy policy")} v{currentPolicy(privacy.policies, "privacy")?.version}</button><button type="button" className="font-semibold text-teal-700 hover:underline" onClick={() => setPolicy("cookie")}>{t("Cookie policy")}</button></div>
          </div>
        </div>
      )}

      {tab === "consent" && (
        <div className="space-y-3">
          <ConsentToggle label={t("Analytics cookies")} desc={t("Anonymous usage stats to improve the experience.")} on={consent.analytics} set={(v) => { setConsent({ analytics: v }); recordConsent(CUSTOMER_GUEST_ID, { analytics: v }, "Privacy Centre", `Analytics cookies ${v ? "on" : "off"}`); toast(v ? t("Analytics enabled.") : t("Analytics disabled.")); }} />
          <div className="rounded-2xl ring-1 ring-slate-200 bg-white/70 px-3.5 pt-3 pb-1">
            <div className="font-semibold text-sm text-navy-900">{t("Offers & news")}</div>
            <div className="text-[12px] text-slate-600 leading-snug mt-0.5">{t("Choose each channel separately. Switching one off takes effect immediately — every message also has an unsubscribe link.")}</div>
            {restricted && <div className="mt-2 text-[12px] text-amber-800 bg-amber-50 rounded-lg px-2 py-1">{t("Processing of your data is restricted at your request — we won't send offers until it's lifted.")}</div>}
            <ul className="divide-y divide-slate-100 mt-1">
              {([["email", t("E-mail")], ["sms", "SMS"], ["viber", "Viber"], ["push", t("Push notifications")]] as [ConsentPurpose, string][]).map(([p, l]) => (
                <li key={p} className="flex items-center justify-between py-2.5"><span className="text-[13px] text-navy-900">{l}</span><Toggle on={has(p)} onChange={(v) => setChannel(p, l, v)} ariaLabel={`${t("Offers by")} ${l}`} /></li>
              ))}
            </ul>
          </div>
          <ConsentToggle label={t("Marketing cookies")} desc={t("Cookies that measure our ads on other sites.")} on={consent.marketing} set={(v) => { setConsent({ marketing: v }); recordConsent(CUSTOMER_GUEST_ID, { marketing_cookies: v }, "Privacy Centre", `Marketing cookies ${v ? "on" : "off"}`); toast(v ? t("Marketing cookies enabled.") : t("Marketing cookies disabled.")); }} />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-3.5 py-3 text-[12px] text-slate-600">
            <span>{consent.ts ? `${t("Last updated")} ${new Date(consent.ts).toLocaleString(localeFor(lang))}` : t("No decision recorded yet.")} · {t("privacy notice")} v{consent.version ?? currentPolicy(privacy.policies, "privacy")?.version}</span>
            <button onClick={reopenConsent} className="font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"><Icon.refund size={12} /> {t("Re-open cookie banner")}</button>
          </div>
        </div>
      )}

      {tab === "who" && (
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">{t("Who processes your data")}</div>
            <Table cols={[t("Party"), t("Role"), t("Location"), t("Legal basis")]} rows={PROCESSORS.map((p) => [
              <div><div className="font-semibold text-navy-900 text-[13px]">{p.name}</div><div className="text-[11px] text-slate-500">{t(p.purpose)}</div></div>,
              <Badge tone={p.role.includes("controller") ? "indigo" : p.role.includes("Recipient") ? "amber" : "slate"}>{t(p.role)}</Badge>,
              t(p.location), t(p.basis),
            ])} />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">{t("How long we keep it")}</div>
            <Table cols={[t("Data"), t("Retention"), t("Basis")]} rows={privacy.retention.map((r) => [
              t(r.data),
              <span className={r.legal ? "font-semibold text-navy-900" : ""}>{retentionLabel(r)}</span>,
              r.legal ? <Badge tone="amber">{t(r.basis)}</Badge> : t(r.basis),
            ])} />
          </div>
          <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-3.5 text-[12.5px] text-slate-700">
            <div className="font-semibold text-navy-900">{t("Children")}</div>
            {t("Accounts are for adults (18+). Child entry tickets record only the ticket type and how many — never a child's name or date of birth — and we never ask a minor for marketing consent.")}
          </div>
        </div>
      )}

      {tab === "delete" && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-rose-50/70 ring-1 ring-rose-600/15 p-4">
            <div className="flex items-center gap-2 font-semibold text-rose-700"><Icon.trash size={16} /> {t("Delete your account & data")}</div>
            <p className="text-[13px] text-slate-600 leading-snug mt-1.5">
              {t("We'll erase your profile, bookings, saved cards and marketing data after a 30-day grace period (in case you change your mind).")}
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50/70 ring-1 ring-amber-600/15 p-3.5 flex items-start gap-2.5">
            <Icon.shieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-800 leading-snug">
              <b>{t("What we must keep:")}</b> {t("issued invoices and their tax-authority records are kept for 5 years under Greek tax law — this overrides erasure for those documents.")}
            </p>
          </div>
          <Btn variant="danger" icon={Icon.trash} onClick={() => setConfirmErase(true)}>{t("Request erasure")}</Btn>
        </div>
      )}

      <ConfirmModal
        open={confirmErase}
        onClose={() => setConfirmErase(false)}
        onConfirm={() => { request("Erasure", "Delete my account and data (30-day grace period)."); setConfirmErase(false); }}
        title={t("Request account erasure?")}
        body={t("Your account is scheduled for deletion in 30 days. Invoices retained for tax law are excluded. You can cancel anytime before then.")}
        confirmLabel={t("Request erasure")}
        icon={Icon.trash}
      />
      <Modal open={ask !== null} onClose={() => setAsk(null)} title={ask ? REQUEST[ask] : ""}
        footer={<><Btn variant="ghost" onClick={() => setAsk(null)}>{t("Cancel")}</Btn><Btn variant="teal" icon={Icon.send} disabled={(ask === "Rectification" || ask === "Restriction") && askText.trim().length < 5} onClick={() => { if (ask) request(ask, askText.trim() || undefined); setAsk(null); }}>{t("Send request")}</Btn></>}>
        <div className="space-y-2 text-[13px] text-slate-600">
          <p>{t(ask === "Access" ? "We'll send a copy of all your data plus how we use it, who receives it and how long we keep it." : ask === "Rectification" ? "Tell us what is wrong and what it should be." : ask === "Restriction" ? "We'll keep your data but stop using it — no offers, no profiling, no changes — while the issue is checked." : "We'll stop profiling you (segments, visit scoring) and stop offers, unless we have compelling grounds.")}</p>
          <label className="block"><span className="text-[12px] font-semibold text-slate-700">{ask === "Rectification" || ask === "Restriction" ? t("Details (required)") : t("Anything to add (optional)")}</span><textarea rows={3} value={askText} onChange={(e) => setAskText(e.target.value)} className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/70" /></label>
          <p className="text-[12px]">{t("You're signed in, so no extra ID is needed. We reply within one month.")}</p>
        </div>
      </Modal>
      {shownPolicy && <PolicyModal p={shownPolicy} onClose={() => setPolicy(null)} />}
    </Modal>
  );
}

function ConsentToggle({ label, desc, on, set }: { label: string; desc?: ReactNode; on?: boolean; set: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl ring-1 ring-slate-200 bg-white/70 px-3.5 py-3">
      <div className="min-w-0 pr-3">
        <div className="font-semibold text-sm text-navy-900">{label}</div>
        <div className="text-[12px] text-slate-600 leading-snug mt-0.5">{desc}</div>
      </div>
      <Toggle on={on} onChange={set} ariaLabel={label} />
    </div>
  );
}
