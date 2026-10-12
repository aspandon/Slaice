import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import { Modal, Btn, Badge, Tabs, Toggle, Table, ConfirmModal } from "./ui";
import type { TabEntry } from "./ui";
import { useApp } from "../app/store";
import { PROCESSORS, DATA_RIGHTS } from "../data/gdpr";
import { currentPolicy, latest, retentionLabel, type ConsentPurpose, type DsarType } from "../domain/gdpr";
import { CUSTOMER_GUEST_ID, usePrivacy } from "../screens/privacy/usePrivacy";
import { PolicyModal } from "../screens/privacy/Consent";
import { downloadZIP, buildPDFBytes } from "../lib/download";
import { CUSTOMER_BOOKINGS, CUSTOMER_DOCS } from "../data/mock";

/* Customer Privacy Centre (P4.2) — access/portability, consent management,
   transparency on processors, and a proper erasure flow with the legal
   retention caveat. Opened from Account settings. */
export function PrivacyCenter({ open, onClose }: { open?: boolean; onClose: () => void }) {
  const { consent, setConsent, reopenConsent, toast, crm } = useApp();
  const { privacy, recordConsent, submitRequest } = usePrivacy();
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
    toast(`${label} ${v ? "on" : "off"} — saved.`);
  };
  const request = (type: DsarType, detail?: string) => {
    const id = submitRequest({ type, guestId: CUSTOMER_GUEST_ID, ...me, channel: "Privacy Centre", detail }, "Elena Vlachos");
    toast(`${type} request sent${id ? ` (${id})` : ""} — we'll reply within one month.`, { tone: "success" });
  };
  const [exporting, setExporting] = useState(false);

  const exportData = () => {
    setExporting(true);
    // Assemble the data subject's bundle from the mock stores.
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
      title: "Your personal data export",
      subtitle: "Akti tou Iliou · data subject access request",
      meta: [`Subject: ${profile.name} · ${profile.email}`, `Generated ${new Date().toLocaleString("en-GB")}`, "Format: JSON (full) + this PDF summary"],
      table: {
        cols: ["Category", "Records"],
        rightCols: [1],
        rows: [
          ["Profile fields", "5"],
          ["Bookings", String(CUSTOMER_BOOKINGS.length)],
          ["Documents (ΑΠΥ/ΤΠΥ)", String(CUSTOMER_DOCS.length)],
          ["Marketing consent", consent.marketing ? "Granted" : "Not granted"],
        ],
      },
      footer: ["Provided under GDPR Art. 15 & 20.", "Questions? privacy@aktitouiliou.example"],
    });
    setTimeout(() => {
      downloadZIP(`my-data-${new Date().toISOString().slice(0, 10)}.zip`, [
        { name: "my-data.json", content: json },
        { name: "summary.pdf", content: summary },
      ]);
      setExporting(false);
      toast("Your data export is ready (ZIP: JSON + PDF).", { tone: "success" });
    }, 600);
  };

  const tabs: TabEntry[] = [
    ["data", "Your data", Icon.fileDown],
    ["consent", "Consents", Icon.sliders],
    ["who", "Who sees it", Icon.users],
    ["delete", "Delete", Icon.trash],
  ];

  return (
    <Modal open={open} onClose={onClose} title="Privacy & data" wide
      footer={<Btn variant="ghost" onClick={onClose}>Close</Btn>}>
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" scroll />

      {tab === "data" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-teal-50/70 ring-1 ring-teal-600/15 p-4 flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-white text-teal-700 grid place-items-center shrink-0 shadow-sm"><Icon.download size={20} /></span>
            <div className="flex-1">
              <div className="font-semibold text-navy-900">Download your data</div>
              <p className="text-[13px] text-slate-600 leading-snug mt-0.5">Get a machine-readable copy of everything we hold — profile, bookings, documents and consents (GDPR Art. 15 & 20).</p>
              <Btn variant="teal" size="sm" className="mt-3" icon={Icon.fileDown} loading={exporting} onClick={exportData}>{exporting ? "Preparing…" : "Export my data (ZIP)"}</Btn>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {DATA_RIGHTS.filter((r) => r.key !== "erase").map((r) => {
              const I = Icon[r.icon] || Icon.shield;
              const actions: [DsarType, string][] = r.key === "access" ? [["Access", "Ask for a full copy"]] : r.key === "rectify" ? [["Rectification", "Ask for a correction"]] : [["Restriction", "Restrict"], ["Objection", "Object to profiling"]];
              return (
                <div key={r.key} className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-sm text-navy-900"><I size={15} className="text-slate-500" />{r.title}</div>
                  <div className="text-[12px] text-slate-600 leading-snug mt-1">{r.desc}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">{actions.map(([t, l]) => <button key={t} type="button" onClick={() => { setAsk(t); setAskText(""); }} className="text-[12px] font-semibold text-teal-700 hover:underline">{l} →</button>)}</div>
                </div>
              );
            })}
          </div>
          {myOpen.length > 0 && (
            <div className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-3.5">
              <div className="font-semibold text-sm text-navy-900 mb-1">Your open requests</div>
              <ul className="text-[12.5px] text-slate-700 space-y-0.5">{myOpen.map((r) => <li key={r.id}>{r.id} · {r.type} · {r.status} · sent {r.received}</li>)}</ul>
            </div>
          )}
          <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-3.5 text-[12.5px] text-slate-700">
            <div className="font-semibold text-navy-900">Questions about your data?</div>
            <div>{privacy.dpo.name} · <a className="underline font-semibold" href={`mailto:${privacy.dpo.email}`}>{privacy.dpo.email}</a> · {privacy.dpo.address}</div>
            <div className="mt-1.5 flex flex-wrap gap-3"><button type="button" className="font-semibold text-teal-700 hover:underline" onClick={() => setPolicy("privacy")}>Privacy policy v{currentPolicy(privacy.policies, "privacy")?.version}</button><button type="button" className="font-semibold text-teal-700 hover:underline" onClick={() => setPolicy("cookie")}>Cookie policy</button></div>
          </div>
        </div>
      )}

      {tab === "consent" && (
        <div className="space-y-3">
          <ConsentToggle label="Analytics cookies" desc="Anonymous usage stats to improve the experience." on={consent.analytics} set={(v) => { setConsent({ analytics: v }); recordConsent(CUSTOMER_GUEST_ID, { analytics: v }, "Privacy Centre", `Analytics cookies ${v ? "on" : "off"}`); toast(`Analytics ${v ? "enabled" : "disabled"}.`); }} />
          <div className="rounded-2xl ring-1 ring-slate-200 bg-white/70 px-3.5 pt-3 pb-1">
            <div className="font-semibold text-sm text-navy-900">Offers &amp; news</div>
            <div className="text-[12px] text-slate-600 leading-snug mt-0.5">Choose each channel separately. Switching one off takes effect immediately — every message also has an unsubscribe link.</div>
            {restricted && <div className="mt-2 text-[12px] text-amber-800 bg-amber-50 rounded-lg px-2 py-1">Processing of your data is restricted at your request — we won't send offers until it's lifted.</div>}
            <ul className="divide-y divide-slate-100 mt-1">
              {([["email", "E-mail"], ["sms", "SMS"], ["viber", "Viber"], ["push", "Push notifications"]] as [ConsentPurpose, string][]).map(([p, l]) => (
                <li key={p} className="flex items-center justify-between py-2.5"><span className="text-[13px] text-navy-900">{l}</span><Toggle on={has(p)} onChange={(v) => setChannel(p, l, v)} ariaLabel={`Offers by ${l}`} /></li>
              ))}
            </ul>
          </div>
          <ConsentToggle label="Marketing cookies" desc="Cookies that measure our ads on other sites." on={consent.marketing} set={(v) => { setConsent({ marketing: v }); recordConsent(CUSTOMER_GUEST_ID, { marketing_cookies: v }, "Privacy Centre", `Marketing cookies ${v ? "on" : "off"}`); toast(`Marketing cookies ${v ? "enabled" : "disabled"}.`); }} />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-3.5 py-3 text-[12px] text-slate-600">
            <span>{consent.ts ? `Last updated ${new Date(consent.ts).toLocaleString("en-GB")}` : "No decision recorded yet."} · privacy notice v{consent.version ?? currentPolicy(privacy.policies, "privacy")?.version}</span>
            <button onClick={reopenConsent} className="font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"><Icon.refund size={12} /> Re-open cookie banner</button>
          </div>
        </div>
      )}

      {tab === "who" && (
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Who processes your data</div>
            <Table cols={["Party", "Role", "Location", "Legal basis"]} rows={PROCESSORS.map((p) => [
              <div><div className="font-semibold text-navy-900 text-[13px]">{p.name}</div><div className="text-[11px] text-slate-500">{p.purpose}</div></div>,
              <Badge tone={p.role.includes("controller") ? "indigo" : p.role.includes("Recipient") ? "amber" : "slate"}>{p.role}</Badge>,
              p.location, p.basis,
            ])} />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">How long we keep it</div>
            <Table cols={["Data", "Retention", "Basis"]} rows={privacy.retention.map((r) => [
              r.data,
              <span className={r.legal ? "font-semibold text-navy-900" : ""}>{retentionLabel(r)}</span>,
              r.legal ? <Badge tone="amber">{r.basis}</Badge> : r.basis,
            ])} />
          </div>
          <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-3.5 text-[12.5px] text-slate-700">
            <div className="font-semibold text-navy-900">Children</div>
            Accounts are for adults (18+). Child entry tickets record only the ticket type and how many — never a child's name or date of birth — and we never ask a minor for marketing consent.
          </div>
        </div>
      )}

      {tab === "delete" && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-rose-50/70 ring-1 ring-rose-600/15 p-4">
            <div className="flex items-center gap-2 font-semibold text-rose-700"><Icon.trash size={16} /> Delete your account &amp; data</div>
            <p className="text-[13px] text-slate-600 leading-snug mt-1.5">
              We'll erase your profile, bookings, saved cards and marketing data after a <b>30-day grace period</b> (in case you change your mind).
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50/70 ring-1 ring-amber-600/15 p-3.5 flex items-start gap-2.5">
            <Icon.shieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-800 leading-snug">
              <b>What we must keep:</b> issued invoices (ΑΠΥ/ΤΠΥ) and their myDATA records are retained for <b>5 years</b> under Greek tax law — this overrides erasure for those specific documents.
            </p>
          </div>
          <Btn variant="danger" icon={Icon.trash} onClick={() => setConfirmErase(true)}>Request erasure</Btn>
        </div>
      )}

      <ConfirmModal
        open={confirmErase}
        onClose={() => setConfirmErase(false)}
        onConfirm={() => { request("Erasure", "Delete my account and data (30-day grace period)."); setConfirmErase(false); }}
        title="Request account erasure?"
        body="Your account is scheduled for deletion in 30 days. Invoices retained for tax law are excluded. You can cancel anytime before then."
        confirmLabel="Request erasure"
        icon={Icon.trash}
      />
      <Modal open={ask !== null} onClose={() => setAsk(null)} title={ask ? `${ask} request` : ""}
        footer={<><Btn variant="ghost" onClick={() => setAsk(null)}>Cancel</Btn><Btn variant="teal" icon={Icon.send} disabled={(ask === "Rectification" || ask === "Restriction") && askText.trim().length < 5} onClick={() => { if (ask) request(ask, askText.trim() || undefined); setAsk(null); }}>Send request</Btn></>}>
        <div className="space-y-2 text-[13px] text-slate-600">
          <p>{ask === "Access" ? "We'll send a copy of all your data plus how we use it, who receives it and how long we keep it." : ask === "Rectification" ? "Tell us what is wrong and what it should be." : ask === "Restriction" ? "We'll keep your data but stop using it — no offers, no profiling, no changes — while the issue is checked." : "We'll stop profiling you (segments, visit scoring) and stop offers, unless we have compelling grounds."}</p>
          <label className="block"><span className="text-[12px] font-semibold text-slate-700">{ask === "Rectification" || ask === "Restriction" ? "Details (required)" : "Anything to add (optional)"}</span><textarea rows={3} value={askText} onChange={(e) => setAskText(e.target.value)} className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/70" /></label>
          <p className="text-[12px]">You're signed in, so no extra ID is needed. We reply within one month.</p>
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
