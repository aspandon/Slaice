import { useState } from "react";
import { useGuestRecord } from "../../lib/useGuestRecord";
import { Icon, type IconRenderer } from "../../lib/icons";
import { Badge, Btn, Drawer, Field, Input, Select, Table, Tabs, Toggle, ExportMenu, ActionsMenu } from "../../components/ui";
import { useApp } from "../../app/store";
import { ADMIN_BOOKINGS, ADMIN_REFUNDS } from "../../data/mock";
import { ZONES, TENANT } from "../../data/beach";
import type { GuestFacts } from "../../data/guests";
import type { Customer, GuestProfileData } from "../../domain/types";
import { RFM_TONE, STAGE_TONE, predictedNextVisit, type Rfm, type Stage } from "../../domain/lifecycle";
import { fmtDay } from "../../domain/period";
import type { Segment } from "../../domain/segments";
import { CH_LABEL, fmtAt } from "../../domain/comms";
import { latest, type ConsentPurpose } from "../../domain/gdpr";
import { usePrivacy } from "../privacy/usePrivacy";
import { downloadReport } from "../../lib/download";

/* ============ 360° guest profile (AENR-477) ============
   One drawer per guest with tabs: Overview · Bookings · Payments & refunds ·
   Passes & loyalty · Messages · Notes · Preferences · Privacy. Notes,
   preferences, consent, custom fields and the important-guest flag persist in
   the CRM state. */

const TABS: [string, string, IconRenderer][] = [
  ["overview", "Overview", Icon.users], ["bookings", "Bookings", Icon.grid], ["payments", "Payments", Icon.card],
  ["loyalty", "Passes & loyalty", Icon.gift], ["messages", "Messages", Icon.mail], ["notes", "Notes", Icon.doc],
  ["prefs", "Preferences", Icon.star], ["privacy", "Privacy", Icon.shield],
];
const CHANNEL_LABEL: Record<string, string> = { email: "E-mail", sms: "SMS", viber: "Viber" };

export function GuestProfile({ guest: facts, customer, rfm, segments, tags, onClose, onEdit, onAddTag }: {
  guest: GuestFacts;
  customer: Customer;
  rfm: Rfm | undefined;
  segments: Segment[];
  tags: { t: string; tone: string }[];
  onClose: () => void;
  onEdit: () => void;
  onAddTag: (tag: string) => void;
}) {
  const { crm, setCrm, toast, go, bookingNotes, comms, showPreviews } = useApp();
  // The demo guest is one record everywhere (AENR-644): her own visits decide these.
  const me = useGuestRecord();
  const guest: GuestFacts =
    customer.email === me.email
      ? { ...facts, zone: me.favouriteZone ?? facts.zone, partySize: me.partySize, channel: me.channel }
      : facts;
  const [tab, setTab] = useState("overview");
  const prof: GuestProfileData = crm.profiles[customer.id] ?? {};
  const patch = (p: Partial<GuestProfileData>) => setCrm((c) => ({ ...c, profiles: { ...c.profiles, [customer.id]: { ...c.profiles[customer.id], ...p } } }));
  const name = `${customer.first} ${customer.last}`;
  const bookings = ADMIN_BOOKINGS.filter((b) => b.who === customer.first);
  const refunds = ADMIN_REFUNDS.filter((r) => r.who === customer.first);
  const next = predictedNextVisit(guest);
  // The consent log is the single source of truth (AENR-485).
  const { privacy, recordConsent } = usePrivacy();
  const consent = (k: string) => {
    const r = latest(privacy.consentLog, customer.id, k as ConsentPurpose);
    return r ? { on: r.granted, at: r.at, source: r.source } : { on: guest.consent.includes(k), at: guest.firstVisit, source: "Sign-up" };
  };
  const [noteText, setNoteText] = useState("");
  const [prefs, setPrefs] = useState(prof.prefs ?? {});
  const [custom, setCustom] = useState<Record<string, string>>(prof.custom ?? {});

  const addNote = () => {
    if (!noteText.trim()) return;
    patch({ notes: [{ text: noteText.trim(), at: new Date().toISOString(), by: "Manager / Admin" }, ...(prof.notes ?? [])] });
    setNoteText("");
    toast("Note added.", { tone: "success" });
  };
  const setConsent = (k: string, on: boolean) => {
    recordConsent(customer.id, { [k]: on }, "Staff", `${CHANNEL_LABEL[k]} ${on ? "recorded" : "withdrawn"} by staff`);
    toast(`${CHANNEL_LABEL[k]} marketing consent ${on ? "recorded" : "withdrawn"} for ${customer.first}.`, { tone: "success" });
  };
  // The guest's data (access / portability request), in PDF or CSV (AENR-593).
  const exportData = (format: "pdf" | "csv") => {
    const fields: [string, string | number][] = [
      ["Name", name], ["E-mail", customer.email], ["Phone", customer.phone], ["Visits", guest.visits], ["Lifetime spend (€)", guest.spend],
      ["First visit", guest.firstVisit], ["Last visit", guest.lastVisit], ["Language", guest.language], ["City", guest.city],
      ...Object.keys(CHANNEL_LABEL).map((k) => [`${CHANNEL_LABEL[k]} consent`, consent(k).on ? "Yes" : "No"] as [string, string]),
      ...(prof.notes ?? []).map((n) => [`Note (${n.at.slice(0, 10)})`, n.text] as [string, string]),
    ];
    downloadReport(`guest-${customer.id}-data`, {
      title: `Personal data · ${name}`,
      subtitle: "Access / portability request (GDPR Art. 15 / 20)",
      meta: [`${TENANT.name} · controller · exported by Manager / Admin`],
      sections: [{ title: "Data we hold", table: { cols: ["Field", "Value"], rows: fields } }],
    }, format);
    toast(`Guest data exported (${format.toUpperCase()}) — access / portability request.`, { tone: "success" });
  };
  const sent = comms.log.filter((e) => e.guestId === customer.id && e.at <= comms.clock).sort((a, b) => b.at.localeCompare(a.at));
  const messages = [
    { ch: "E-mail", t: "Booking confirmed · QR attached", when: fmtDay(guest.lastVisit) },
    ...(guest.consent.includes("sms") ? [{ ch: "SMS", t: "Weather alert — re-confirm your visit", when: "3 weeks ago" }] : []),
    ...Object.entries(bookingNotes).filter(([id]) => bookings.some((b) => b.id === id)).flatMap(([id, ns]) => ns.map((n) => ({ ch: "Note", t: `${id}: ${n.text}`, when: new Date(n.at).toLocaleDateString("en-GB") }))),
  ];
  const kpis = [
    { l: "Visits", v: String(guest.visits) }, { l: "Lifetime spend", v: `€${guest.spend.toLocaleString("en-GB")}` },
    { l: "Avg basket", v: `€${guest.avgSpend}` }, { l: "Last visit", v: fmtDay(guest.lastVisit) },
  ];

  return (
    <Drawer open onClose={onClose} label={`Guest profile · ${name}`}
      title={
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-navy-800 to-teal-600 text-white grid place-items-center font-display font-bold text-lg shrink-0">{customer.first.charAt(0)}{customer.last.charAt(0)}</span>
          <div className="min-w-0">
            <div className="font-display font-bold text-navy-900 text-lg truncate flex items-center gap-2">{name}{(prof.important || tags.some((x) => x.t === "VIP")) && <Badge tone="amber"><Icon.star size={10} /> VIP</Badge>}{prof.restricted && <Badge tone="red"><Icon.lock size={10} /> Processing restricted</Badge>}</div>
            <div className="text-[12px] text-slate-500 truncate">{customer.email} · <span className="tnum">{customer.phone}</span></div>
          </div>
        </div>
      }
      footer={<>
        {/* One primary action; the rest in "…" (AENR-653, AENR-617). */}
        <ActionsMenu label={`More actions for ${name}`} align="end" actions={[
          { id: "edit", label: "Edit details", icon: Icon.edit, onSelect: onEdit },
          // Communicate is a roadmap page (AENR-691).
          showPreviews && { id: "message", label: "Message", icon: Icon.mail, onSelect: () => go("admin", "communicate") },
          { id: "qr", label: "Resend QR", icon: Icon.qr, disabled: !bookings[0], hint: bookings[0] ? undefined : "No bookings yet", onSelect: () => toast(`Demo — QR for ${bookings[0].id} re-sent to ${customer.email}.`, { tone: "success" }) },
        ]} />
        <Btn variant="primary" icon={Icon.plus} onClick={() => go("admin", "newbooking", { prefill: { name: `${customer.first} ${customer.last}`, email: customer.email, phone: customer.phone } })}>New booking</Btn>
      </>}>
      <Tabs scroll tabs={TABS} value={tab} onChange={setTab} className="mb-4" />

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {kpis.map((k) => <div key={k.l} className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5"><div className="text-[11px] text-slate-500">{k.l}</div><div className="font-display text-lg font-bold text-navy-900 tnum leading-tight">{k.v}</div></div>)}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            {guest.lifecycle && <Badge tone={STAGE_TONE[guest.lifecycle as Stage]}>{guest.lifecycle}</Badge>}
            {rfm && <Badge tone={RFM_TONE[rfm.label]}>{rfm.label} · RFM {rfm.r}{rfm.f}{rfm.m}</Badge>}
            <span className="text-slate-500">Next visit (predicted): <b className="text-navy-900">{next ? fmtDay(next) : "—"}</b></span>
          </div>
          {/* “Important guest” folded into the VIP tag (AENR-653): tag a guest VIP to flag them for staff. */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Tags</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((t) => <Badge key={t.t} tone={t.tone}>{t.t}</Badge>)}
              <Select aria-label="Add a tag" value="" onChange={(e) => e.target.value && onAddTag(e.target.value)} className="!w-auto !py-1.5 !text-[12px]"
                options={[{ v: "", l: "+ Add tag" }, ...crm.tagDefs.filter((d) => !tags.some((t) => t.t === d.name)).map((d) => ({ v: d.name, l: d.name }))]} />
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Segments</div>
            <div className="flex flex-wrap gap-1.5">{segments.length ? segments.map((s) => <span key={s.id} className="inline-flex items-center gap-1.5 rounded-lg ring-1 ring-slate-200 px-2 py-1 text-[12px] font-semibold"><i className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.name}</span>) : <span className="text-[12px] text-slate-500">None</span>}</div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-[13px]">
            {[["Language", guest.language.toUpperCase()], ["City", guest.city], ["Usual channel", guest.channel], ["Favourite zone", guest.zone], ["Party size", String(guest.partySize)], ["Customer since", fmtDay(guest.firstVisit, true)]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-slate-100 py-1.5"><span className="text-slate-500">{k}</span><span className="font-semibold text-navy-900">{v}</span></div>
            ))}
          </div>
          {crm.customFields.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Custom fields</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {crm.customFields.map((f) => (
                  <Field key={f.id} label={f.label}>
                    {f.type === "select"
                      ? <Select value={custom[f.id] ?? ""} onChange={(e) => setCustom({ ...custom, [f.id]: e.target.value })} options={[{ v: "", l: "—" }, ...(f.options ?? []).map((o) => ({ v: o, l: o }))]} />
                      : <Input type={f.type} value={custom[f.id] ?? ""} onChange={(e) => setCustom({ ...custom, [f.id]: e.target.value })} />}
                  </Field>
                ))}
              </div>
              <Btn size="sm" variant="outline" className="mt-2" icon={Icon.check} onClick={() => { patch({ custom }); toast("Custom fields saved.", { tone: "success" }); }}>Save fields</Btn>
            </div>
          )}
        </div>
      )}

      {tab === "bookings" && (bookings.length
        ? <Table dense cols={["Booking", "Date", "Items", "Channel", "Status", "Amount"]} right={[5]} rows={bookings.map((b) => [b.id, b.date, b.items.join(", "), b.channel, b.status, `€${b.amount}`])} />
        : <div className="text-sm text-slate-500">No bookings in the sample data for {customer.first}.</div>)}

      {tab === "payments" && (
        <div className="space-y-3">
          <Table dense cols={["Booking", "Date", "Method", "Amount"]} right={[3]} rows={bookings.filter((b) => b.status !== "Unpaid").map((b) => [b.id, b.date, b.channel === "Online" ? "Card · Stripe" : b.channel === "Cashier" ? "Card / cash at till" : "Card terminal", `€${b.amount}`])} />
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Refunds</div>
          {refunds.length ? <Table dense cols={["Transaction", "Date", "Reason", "Status", "Amount"]} right={[4]} rows={refunds.map((r) => [r.tx, r.date, r.reason || "—", r.status ?? "Pending", `€${r.refundAmount ?? r.amount}`])} /> : <div className="text-sm text-slate-500">No refunds.</div>}
        </div>
      )}

      {tab === "loyalty" && (
        <div className="grid sm:grid-cols-2 gap-3 text-[13px]">
          {[["Pass", guest.pass], ["Loyalty tier", guest.loyaltyTier], ["Points", `${guest.visits * 10}`], ["Stamps", `${guest.visits % 10}/10 toward a free sunbed`]].map(([k, v]) => (
            <div key={k} className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5"><div className="text-[11px] text-slate-500">{k}</div><div className="font-semibold text-navy-900">{v}</div></div>
          ))}
        </div>
      )}

      {tab === "messages" && (
        <div className="space-y-4">
          {/* Campaign + automation sends and skips from Communicate (AENR-492). */}
          {sent.length > 0 && (
            <section aria-label="Marketing messages">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Campaigns &amp; automations</div>
              <ul className="space-y-2">{sent.map((e) => <li key={e.id} className="flex items-start gap-3 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2"><Badge tone={e.outcome === "Delivered" ? "green" : "amber"}>{e.channel ? CH_LABEL[e.channel] : "—"}</Badge><div className="min-w-0 flex-1 text-[13px] text-navy-900">{e.title}<div className="text-[11.5px] text-slate-500">{e.source} · {e.kind}{e.outcome !== "Delivered" ? ` · ${e.outcome}` : ""}</div></div><span className="text-[11px] text-slate-500 shrink-0 tnum">{fmtAt(e.at)}</span></li>)}</ul>
            </section>
          )}
          <section aria-label="Service messages">
            {sent.length > 0 && <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Service &amp; notes</div>}
            <ul className="space-y-2">{messages.map((m, i) => <li key={i} className="flex items-start gap-3 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2"><Badge tone="slate">{m.ch}</Badge><div className="min-w-0 flex-1 text-[13px] text-navy-900">{m.t}</div><span className="text-[11px] text-slate-500 shrink-0">{m.when}</span></li>)}</ul>
          </section>
        </div>
      )}

      {tab === "notes" && (
        <div className="space-y-3">
          <Field label="Internal note (staff only)"><textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} placeholder="e.g. Prefers the same front-row set; celebrating an anniversary on Saturday." className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/70" /></Field>
          <Btn size="sm" variant="primary" icon={Icon.plus} disabled={!noteText.trim()} onClick={addNote}>Add note</Btn>
          <ul className="space-y-2">
            {(prof.notes ?? []).map((n, i) => <li key={i} className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2"><div className="text-[11px] text-slate-500">{n.by} · {new Date(n.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div><div className="text-sm text-navy-900 whitespace-pre-wrap">{n.text}</div></li>)}
            {!(prof.notes ?? []).length && <li className="text-sm text-slate-500">No notes yet.</li>}
          </ul>
        </div>
      )}

      {tab === "prefs" && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Favourite zone"><Select value={prefs.zone ?? guest.zone} onChange={(e) => setPrefs({ ...prefs, zone: e.target.value })} options={ZONES.map((z) => z.name)} /></Field>
            <Field label="Favourite sunbed"><Input value={prefs.sunbed ?? ""} onChange={(e) => setPrefs({ ...prefs, sunbed: e.target.value })} placeholder="e.g. CE-12" /></Field>
            <Field label="Usual party size"><Input type="number" min={1} value={prefs.party ?? String(guest.partySize)} onChange={(e) => setPrefs({ ...prefs, party: e.target.value })} /></Field>
            <Field label="Typical arrival"><Input type="time" value={prefs.arrival ?? "10:00"} onChange={(e) => setPrefs({ ...prefs, arrival: e.target.value })} /></Field>
            <Field label="Preferred contact channel"><Select value={prefs.contact ?? "email"} onChange={(e) => setPrefs({ ...prefs, contact: e.target.value })} options={[{ v: "email", l: "E-mail" }, { v: "sms", l: "SMS" }, { v: "viber", l: "Viber" }, { v: "phone", l: "Phone call" }]} /></Field>
          </div>
          <Field label="Dietary / accessibility notes"><textarea value={prefs.needs ?? ""} onChange={(e) => setPrefs({ ...prefs, needs: e.target.value })} rows={2} placeholder="e.g. Needs step-free access to the sunbed." className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/70" /></Field>
          <Btn size="sm" variant="primary" icon={Icon.check} onClick={() => { patch({ prefs }); toast("Preferences saved.", { tone: "success" }); }}>Save preferences</Btn>
        </div>
      )}

      {tab === "privacy" && (
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Marketing consent</div>
          {Object.keys(CHANNEL_LABEL).map((k) => {
            const c = consent(k);
            return (
              <div key={k} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                <div><div className="font-semibold text-sm text-navy-900">{CHANNEL_LABEL[k]}</div><div className="text-[12px] text-slate-500">{c.on ? "Given" : "Not given"} · {c.source} · {fmtDay(c.at.slice(0, 10), true)}</div></div>
                <Toggle on={c.on} onChange={(v) => setConsent(k, v)} ariaLabel={`${CHANNEL_LABEL[k]} marketing consent`} />
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2 pt-1">
            <ExportMenu size="sm" label="Export guest data" onExport={exportData} />
            <Btn size="sm" variant="outline" icon={Icon.shield} onClick={() => { setCrm((c) => ({ ...c, eraseRequests: [...new Set([...c.eraseRequests, customer.id])] })); toast(`Erasure request raised for ${customer.first} — handle it in Privacy & GDPR.`, { tone: "success" }); }}>Request erasure</Btn>
            <Btn size="sm" variant="ghost" icon={Icon.arrowR} onClick={() => go("admin", "privacy")}>Privacy & GDPR</Btn>
          </div>
          {crm.eraseRequests.includes(customer.id) && <div className="text-[12px] text-rose-700">An erasure request is open for this guest.</div>}
        </div>
      )}
    </Drawer>
  );
}
