import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import {
  Badge,
  Btn,
  Card,
  Field,
  Input,
  Modal,
  Select,
  StatCard,
  Toggle,
  DateInput,
} from "../../components/ui";
import { useApp } from "../../app/store";
import { CUSTOMERS } from "../../data/mock";
import { addDays } from "../../domain/period";
import {
  PURPOSE_LABEL,
  consentRates,
  currentPolicy,
  fmtDate,
  latest,
  nextVersion,
  withdrawals,
  type ConsentPurpose,
  type CookieItem,
  type Policy,
} from "../../domain/gdpr";
import { STAFF_NAME, usePrivacy } from "./usePrivacy";

/* ============ Consent audit + policies & cookies (AENR-485) ============
   Rates and withdrawals are computed from the per-person consent log (the
   log is append-only: every change is a new record with source, wording and
   the notice version). Policies are versioned — publishing a material change
   re-asks returning visitors for consent. */

const PURPOSES: ConsentPurpose[] = ["analytics", "email", "sms", "viber", "push"];

export function ConsentTab() {
  const { privacy, today } = usePrivacy();
  const ids = CUSTOMERS.map((c) => c.id);
  const rates = consentRates(privacy.consentLog, ids);
  const since = `${addDays(today, -30)}T00:00`;
  const anyMarketing = ids.filter((g) =>
    (["email", "sms", "viber", "push"] as ConsentPurpose[]).some(
      (p) => latest(privacy.consentLog, g, p)?.granted,
    ),
  ).length;
  const [guest, setGuest] = useState(3);
  const history = privacy.consentLog
    .filter((r) => r.guestId === guest)
    .sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Marketing consent"
          value={`${Math.round((anyMarketing / ids.length) * 100)}%`}
          sub="any channel · from the log"
          tone="teal"
        />
        <StatCard
          label="Withdrawals"
          value={String(withdrawals(privacy.consentLog, since))}
          sub="last 30 days"
          tone="rose"
        />
        <StatCard label="Records" value={String(privacy.consentLog.length)} sub="append-only log" />
        <StatCard
          label="Notice version"
          value={`v${currentPolicy(privacy.policies, "privacy")?.version ?? "—"}`}
          sub="privacy policy in force"
          tone="indigo"
        />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-3">Opt-in by purpose</div>
          <ul className="space-y-3">
            {rates.map((r) => (
              <li key={r.purpose}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="text-slate-600">{PURPOSE_LABEL[r.purpose]}</span>
                  <b className="text-navy-900 tnum">
                    {r.rate}%{" "}
                    <span className="font-normal text-slate-500">
                      · {r.granted} of {ids.length}
                    </span>
                  </b>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="presentation">
                  <div
                    className="h-full rounded-full bg-teal-600"
                    style={{ width: `${r.rate}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="text-[11.5px] text-slate-500 mt-3">
            Campaigns only reach guests whose latest record for that channel is “granted”.
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="font-semibold text-navy-900">Consent history</div>
            <div className="w-52">
              <Select
                aria-label="Guest"
                value={String(guest)}
                onChange={(e) => setGuest(Number(e.target.value))}
                options={CUSTOMERS.map((c) => ({ v: String(c.id), l: `${c.first} ${c.last}` }))}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PURPOSES.map((p) => {
              const r = latest(privacy.consentLog, guest, p);
              return (
                <Badge key={p} tone={r?.granted ? "green" : "slate"}>
                  {PURPOSE_LABEL[p].replace("Marketing · ", "")}: {r?.granted ? "yes" : "no"}
                </Badge>
              );
            })}
          </div>
          <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {history.map((r) => (
              <li
                key={r.id}
                className="rounded-lg ring-1 ring-slate-100 px-2.5 py-1.5 text-[12px] flex flex-wrap gap-x-2"
              >
                <b className={r.granted ? "text-teal-700" : "text-rose-700"}>
                  {r.granted ? "Granted" : "Withdrawn"}
                </b>
                <span className="text-navy-900">{PURPOSE_LABEL[r.purpose]}</span>
                <span className="text-slate-500">
                  · {r.source} · notice v{r.version} · “{r.wording}”
                </span>
                <span className="ml-auto text-slate-500 tnum">{r.at.replace("T", " ")}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export function PoliciesTab() {
  const { privacy, setPrivacy, today } = usePrivacy();
  const { toast } = useApp();
  const [edit, setEdit] = useState<Policy | null>(null);
  const [view, setView] = useState<Policy | null>(null);
  const [cookie, setCookie] = useState<CookieItem | null>(null);
  const sorted = useMemo(
    () =>
      [...privacy.policies].sort(
        (a, b) => a.kind.localeCompare(b.kind) || Number(b.version) - Number(a.version),
      ),
    [privacy.policies],
  );
  const publish = (p: Policy) => {
    setPrivacy((s) => ({
      ...s,
      policies: s.policies.map((x) =>
        x.id === p.id
          ? { ...x, status: "Published", effective: x.effective < today ? today : x.effective }
          : x.kind === p.kind && x.status === "Published"
            ? { ...x, status: "Superseded" }
            : x,
      ),
    }));
    toast(
      `${p.kind === "privacy" ? "Privacy" : "Cookie"} policy v${p.version} published${p.material && p.kind === "privacy" ? " — returning visitors will be asked for consent again" : ""}.`,
      { tone: "success" },
    );
  };
  const draft = (kind: Policy["kind"]) => {
    const cur = currentPolicy(privacy.policies, kind);
    setEdit({
      id: `${kind}-${Date.now().toString(36)}`,
      kind,
      version: nextVersion(privacy.policies, kind),
      status: "Draft",
      effective: today,
      material: kind === "privacy",
      changelog: "",
      body: cur?.body ?? "",
    });
  };
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex flex-wrap items-center gap-2">
          <div className="font-semibold text-navy-900">Policies</div>
          <div className="ml-auto flex gap-2">
            <Btn size="sm" variant="ghost" icon={Icon.plus} onClick={() => draft("cookie")}>
              New cookie policy version
            </Btn>
            <Btn size="sm" variant="primary" icon={Icon.plus} onClick={() => draft("privacy")}>
              New privacy policy version
            </Btn>
          </div>
        </div>
        <ul className="divide-y divide-slate-100">
          {sorted.map((p) => (
            <li key={p.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-[13px]">
              <div className="min-w-0 flex-1 basis-64">
                <div className="font-semibold text-navy-900">
                  {p.kind === "privacy" ? "Privacy policy" : "Cookie policy"} v{p.version}{" "}
                  {p.material && <Badge tone="amber">Material</Badge>}
                </div>
                <div className="text-[12px] text-slate-500">
                  {p.changelog || "No changelog"} · effective {fmtDate(p.effective)}
                </div>
              </div>
              <Badge
                tone={p.status === "Published" ? "green" : p.status === "Draft" ? "blue" : "slate"}
              >
                {p.status}
              </Badge>
              <div className="flex gap-1.5">
                <Btn size="sm" variant="ghost" icon={Icon.eye} onClick={() => setView(p)}>
                  View
                </Btn>
                {p.status === "Draft" && (
                  <Btn size="sm" variant="ghost" icon={Icon.edit} onClick={() => setEdit(p)}>
                    Edit
                  </Btn>
                )}
                {p.status === "Draft" && (
                  <Btn size="sm" variant="primary" icon={Icon.check} onClick={() => publish(p)}>
                    Publish
                  </Btn>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <div className="font-semibold text-navy-900">Cookie inventory</div>
          <span className="text-[12px] text-slate-500">
            Shown in the banner's Manage view and the cookie policy
          </span>
          <Btn
            size="sm"
            variant="ghost"
            icon={Icon.plus}
            className="ml-auto"
            onClick={() =>
              setCookie({
                name: "",
                provider: "",
                category: "analytics",
                purpose: "",
                duration: "",
                party: "First",
              })
            }
          >
            Add cookie
          </Btn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2 font-semibold">Name</th>
                <th className="px-2 font-semibold">Provider</th>
                <th className="px-2 font-semibold">Category</th>
                <th className="px-2 font-semibold">Purpose</th>
                <th className="px-2 font-semibold">Duration</th>
                <th className="px-2 font-semibold">Party</th>
                <th className="px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {privacy.cookies.map((c) => (
                <tr key={c.name}>
                  <td className="px-4 py-2 font-mono text-[12px]">{c.name}</td>
                  <td className="px-2">{c.provider}</td>
                  <td className="px-2">
                    <Badge
                      tone={
                        c.category === "necessary"
                          ? "slate"
                          : c.category === "analytics"
                            ? "blue"
                            : "amber"
                      }
                    >
                      {c.category}
                    </Badge>
                  </td>
                  <td className="px-2 text-slate-600">{c.purpose}</td>
                  <td className="px-2">{c.duration}</td>
                  <td className="px-2">{c.party}</td>
                  <td className="px-4 text-right">
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon={Icon.trash}
                      aria-label={`Remove ${c.name}`}
                      onClick={() =>
                        setPrivacy((s) => ({
                          ...s,
                          cookies: s.cookies.filter((x) => x.name !== c.name),
                        }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {edit && (
        <Modal
          open
          wide
          onClose={() => setEdit(null)}
          title={`${edit.kind === "privacy" ? "Privacy" : "Cookie"} policy v${edit.version} · draft`}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setEdit(null)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                icon={Icon.check}
                disabled={!edit.body.trim() || !edit.changelog.trim()}
                onClick={() => {
                  setPrivacy((s) => ({
                    ...s,
                    policies: s.policies.some((x) => x.id === edit.id)
                      ? s.policies.map((x) => (x.id === edit.id ? edit : x))
                      : [...s.policies, edit],
                  }));
                  setEdit(null);
                  toast(`Draft v${edit.version} saved — publish it when ready.`, {
                    tone: "success",
                  });
                }}
              >
                Save draft
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <div className="grid sm:grid-cols-[1fr_180px] gap-3">
              <Field label="What changed (changelog)">
                <Input
                  value={edit.changelog}
                  onChange={(e) => setEdit({ ...edit, changelog: e.target.value })}
                  placeholder="e.g. Added Viber as a marketing channel"
                />
              </Field>
              <Field label="Effective from">
                <DateInput
                  
                  value={edit.effective}
                  onChange={(v) => setEdit({ ...edit, effective: v })}
                />
              </Field>
            </div>
            <Toggle
              label="Material change — ask returning visitors for consent again"
              on={edit.material}
              onChange={(material) => setEdit({ ...edit, material })}
            />
            <Field label="Text">
              <textarea
                aria-label="Policy text"
                rows={12}
                value={edit.body}
                onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                className="glass-input w-full rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/70 outline-none"
              />
            </Field>
          </div>
        </Modal>
      )}
      {view && <PolicyModal p={view} onClose={() => setView(null)} />}
      {cookie && (
        <Modal
          open
          onClose={() => setCookie(null)}
          title="Add cookie"
          footer={
            <>
              <Btn variant="ghost" onClick={() => setCookie(null)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                disabled={!cookie.name.trim() || !cookie.provider.trim() || !cookie.duration.trim()}
                onClick={() => {
                  setPrivacy((s) => ({ ...s, cookies: [...s.cookies, cookie] }));
                  setCookie(null);
                  toast(`Cookie ${cookie.name} added — by ${STAFF_NAME}.`, { tone: "success" });
                }}
              >
                Add
              </Btn>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Name">
              <Input
                value={cookie.name}
                onChange={(e) => setCookie({ ...cookie, name: e.target.value })}
              />
            </Field>
            <Field label="Provider">
              <Input
                value={cookie.provider}
                onChange={(e) => setCookie({ ...cookie, provider: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <Select
                value={cookie.category}
                onChange={(e) =>
                  setCookie({ ...cookie, category: e.target.value as CookieItem["category"] })
                }
                options={["necessary", "analytics", "marketing"]}
              />
            </Field>
            <Field label="Party">
              <Select
                value={cookie.party}
                onChange={(e) =>
                  setCookie({ ...cookie, party: e.target.value as CookieItem["party"] })
                }
                options={["First", "Third"]}
              />
            </Field>
            <Field label="Purpose">
              <Input
                value={cookie.purpose}
                onChange={(e) => setCookie({ ...cookie, purpose: e.target.value })}
              />
            </Field>
            <Field label="Duration">
              <Input
                value={cookie.duration}
                onChange={(e) => setCookie({ ...cookie, duration: e.target.value })}
                placeholder="e.g. 13 months"
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** A policy as visitors read it — used by the admin, the banner and the Privacy Centre. */
export function PolicyModal({ p, onClose }: { p: Policy; onClose: () => void }) {
  const { privacy } = useApp();
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`${p.kind === "privacy" ? "Privacy policy" : "Cookie policy"} · v${p.version}`}
    >
      <div className="text-[12px] text-slate-500 mb-3">
        Effective {fmtDate(p.effective)}
        {p.status !== "Published" ? ` · ${p.status}` : ""} · {p.changelog}
      </div>
      <div className="text-[13.5px] text-slate-700 leading-relaxed whitespace-pre-wrap">
        {p.body}
      </div>
      {p.kind === "privacy" && (
        <div className="mt-4 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2.5 text-[12.5px] text-slate-700">
          <b className="text-navy-900">Data Protection Officer:</b> {privacy.dpo.name} ·{" "}
          <a className="underline" href={`mailto:${privacy.dpo.email}`}>
            {privacy.dpo.email}
          </a>{" "}
          · {privacy.dpo.address}
        </div>
      )}
      {p.kind === "cookie" && (
        <ul className="mt-4 space-y-1.5">
          {privacy.cookies.map((c) => (
            <li key={c.name} className="rounded-lg ring-1 ring-slate-200 px-3 py-2 text-[12.5px]">
              <b className="font-mono text-navy-900">{c.name}</b> · {c.provider} · {c.category} ·{" "}
              {c.duration} · {c.party}-party<div className="text-slate-500">{c.purpose}</div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
