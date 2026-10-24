import { useState } from "react";
import { Icon } from "../../lib/icons";
import { ActionsMenu, Badge, Btn, Card, Field, Input, Select, Table, Toggle } from "../../components/ui";
import { useApp } from "../../app/store";
import { usePlatform } from "../../lib/usePlatform";
import { isEu } from "../../domain/gdpr";
import { addDays, fmtDay } from "../../domain/period";
import { RoleBadges } from "../team/RoleBadges";
import { StaffStatusCell, staffActions } from "../team/StaffCells";
import { useStaffDirectory } from "../team/useStaffDirectory";
import { FinanceSettingsModal } from "../PlatformFinance";
import { KV, Part, SectionFrame, useTenantDraft, type SectionProps } from "./kit";

const Flag = ({ on, label }: { on: boolean; label: string }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[12px] ring-1 ${on ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15" : "bg-amber-50 text-amber-800 ring-amber-600/20"}`}
  >
    {on ? <Icon.check size={12} /> : <Icon.alert size={12} />} {label}
  </span>
);

/* ---------- Payments — a part of Commercial terms (AENR-799) ---------- */
export function Payments({ t }: SectionProps) {
  const { updateTenant, toast } = usePlatform();
  const [fees, setFees] = useState(false);
  const d = useTenantDraft(t, ["stripe"] as const, "Payments", ["stripe"]);
  return (
    <Part
      id="payments"
      icon={Icon.card}
      title="Payments"
      sub="Stripe Connect account, terminals and payout schedule."
      actions={
        <>
          <Btn size="sm" variant="outline" icon={Icon.cash} onClick={() => setFees(true)}>
            Terminals & e-invoicing
          </Btn>
          <Btn
            size="sm"
            variant="indigo"
            icon={Icon.stripe}
            onClick={() => toast(`Demo — Stripe onboarding link sent to ${t.contacts[0].email}.`)}
          >
            Send onboarding link
          </Btn>
        </>
      }
    >
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Flag on={t.stripe.details} label="details_submitted" />
          <Flag on={t.stripe.charges} label="charges_enabled" />
          <Flag on={t.stripe.payouts} label="payouts_enabled" />
        </div>
        {t.stripe.reqs.length > 0 && (
          <ul className="text-[13px] space-y-1">
            {t.stripe.reqs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={
                    r.due === "past_due" ? "red" : r.due === "currently_due" ? "amber" : "slate"
                  }
                >
                  {r.due.replace("_", " ")}
                </Badge>{" "}
                {r.label} · due {fmtDay(r.dueDate)} · {r.capability}
                <Btn
                  size="sm"
                  variant="tint"
                  onClick={() => {
                    updateTenant(
                      t.id,
                      (x) => ({
                        ...x,
                        stripe: {
                          ...x.stripe,
                          payouts: true,
                          reqs: x.stripe.reqs.filter((y) => y.id !== r.id),
                        },
                      }),
                      {
                        section: "Payments",
                        change: `Stripe requirement completed: ${r.label}`,
                        actorType: "System",
                      },
                    );
                    toast("Stripe: requirement completed — payouts enabled.", { tone: "success" });
                  }}
                >
                  Simulate completed
                </Btn>
              </li>
            ))}
          </ul>
        )}
        <Field label="Payout schedule (sensitive)">
          <Select
            value={d.draft.stripe.schedule}
            onChange={(e) => d.set("stripe", { ...d.draft.stripe, schedule: e.target.value })}
            options={["Daily (T+2)", "Every 3 days (T+2)", "Weekly · Monday", "Monthly · 1st"]}
          />
        </Field>
      </Card>
      {d.bar}
      {d.reasonModal}
      {fees && (
        <FinanceSettingsModal
          tenant={t.name}
          tenantId={t.id}
          subdomain={t.subdomain}
          onClose={() => setFees(false)}
        />
      )}
    </Part>
  );
}

/* ---------- Invoicing & tax — a part of Commercial terms (AENR-799) ---------- */
export function Invoicing({ t }: SectionProps) {
  const { updateTenant, toast } = usePlatform();
  const d = useTenantDraft(t, ["invoicing"] as const, "Invoicing & tax");
  const inv = d.draft.invoicing;
  return (
    <Part
      id="invoicing"
      icon={Icon.receipt}
      title="Invoicing & tax"
      sub="myDATA / AADE, document series, VAT and the tenant's accountant."
    >
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          myDATA / AADE:{" "}
          <Badge
            tone={t.mydata === "connected" ? "green" : t.mydata === "failing" ? "red" : "amber"}
          >
            {t.mydata}
          </Badge>
          {t.mydata !== "connected" && (
            <Btn
              size="sm"
              variant="outline"
              onClick={() => {
                updateTenant(t.id, (x) => ({ ...x, mydata: "connected" }), {
                  section: "Invoicing & tax",
                  change: "myDATA credentials connected",
                });
                toast("myDATA connected — test transmission OK.", { tone: "success" });
              }}
            >
              Connect (demo)
            </Btn>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="ΑΠΥ / ΤΠΥ series">
            <Input
              value={inv.series}
              onChange={(e) => d.set("invoicing", { ...inv, series: e.target.value })}
            />
          </Field>
          <Field label="Standard VAT %">
            <Input
              type="number"
              value={inv.vatRate}
              onChange={(e) => d.set("invoicing", { ...inv, vatRate: Number(e.target.value) })}
            />
          </Field>
          <Field label="Accountant">
            <Input
              value={inv.accountant}
              onChange={(e) => d.set("invoicing", { ...inv, accountant: e.target.value })}
            />
          </Field>
          <Field label="e-Invoice provider">
            <Select
              value={inv.provider}
              onChange={(e) => d.set("invoicing", { ...inv, provider: e.target.value })}
              options={["Elorus", "Epsilon Digital", "SoftOne", "Direct myDATA (no provider)"]}
            />
          </Field>
        </div>
      </Card>
      {d.bar}
    </Part>
  );
}

/* ---------- Users — a part of Users & roles (AENR-718 / 800) ---------- */
export function Users({ t }: SectionProps) {
  const { plan } = usePlatform();
  // The same people, invitations and actions as the tenant's Team & roles (AENR-718).
  const dir = useStaffDirectory(t, "platform");
  const users = dir.users;
  const seats = plan(t)?.limits.seats.included ?? 0;
  const invited = users.filter((u) => u.status === "invited").length;
  return (
    <Part
      id="users"
      icon={Icon.users}
      title="Users"
      sub={`Tenant staff · ${users.length} of ${seats} seats used${invited ? ` · ${invited} invited` : ""}. Which roles can be given is set in Staff roles below.`}
      actions={
        <Btn size="sm" variant="primary" icon={Icon.plus} onClick={dir.openAdd}>
          Add user
        </Btn>
      }
    >
      <Card className="p-2">
        <Table
          dense
          cols={["Name", "Mobile", "Roles", "Status", ""]}
          rows={users.map((u) => [
            <div className="leading-tight min-w-0">
              <div className="font-semibold text-navy-900">{u.name}</div>
              <div className="text-[12px] text-slate-500 break-all">{u.email}</div>
            </div>,
            <span className="tnum whitespace-nowrap">{u.phone || "—"}</span>,
            <RoleBadges roles={u.roles} roleOn={dir.roleOn} beach={dir.beach} />,
            <StaffStatusCell u={u} dir={dir} />,
            <span className="flex justify-end">
              <ActionsMenu size="sm" label={`More actions for ${u.name}`} actions={staffActions(u, dir)} />
            </span>,
          ])}
        />
      </Card>
      {dir.modals}
    </Part>
  );
}

/* ---------- Slaice access to the tenant (AENR-515) — a part of Users & roles (AENR-800) ---------- */
export function SlaiceAccess({ t }: SectionProps) {
  const { platform, updateTenant, today } = usePlatform();
  const sessions = platform.sessions.filter((s) => s.tenantId === t.id);
  return (
    <Part
      id="access"
      icon={Icon.headset}
      title="Slaice access"
      sub="Who at Slaice looks after this tenant, the support access the tenant grants, and View-as sessions."
    >
      <Card className="p-4 space-y-2">
        <KV k="Assigned">
          {[t.accountManager + " (account manager)", ...t.slaiceTeam].join(" · ")}
        </KV>
        <KV k="Support access granted by tenant">
          {t.supportGrant && t.supportGrant.until >= today ? (
            <Badge tone="green">Until {fmtDay(t.supportGrant.until)}</Badge>
          ) : (
            <Badge tone="slate">Not granted</Badge>
          )}
        </KV>
        <div className="flex gap-2">
          <Btn
            size="sm"
            variant="outline"
            onClick={() =>
              updateTenant(t.id, (x) => ({ ...x, supportGrant: { until: addDays(today, 30) } }), {
                section: "Users & roles",
                change: "Support access granted for 30 days",
                actorType: "Tenant staff",
              })
            }
          >
            Simulate tenant grants access
          </Btn>
          {t.supportGrant && (
            <Btn
              size="sm"
              variant="ghost"
              onClick={() =>
                updateTenant(t.id, (x) => ({ ...x, supportGrant: undefined }), {
                  section: "Users & roles",
                  change: "Support access revoked",
                  actorType: "Tenant staff",
                })
              }
            >
              Simulate revoke
            </Btn>
          )}
        </div>
        <h4 className="pt-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">
          View-as sessions
        </h4>
        {sessions.length === 0 ? (
          <p className="text-[13px] text-slate-500">None yet.</p>
        ) : (
          <ul className="text-[12.5px] space-y-1">
            {sessions.map((s) => (
              <li key={s.id}>
                {new Date(s.startedAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · <b>{s.by}</b> · {s.scope === "read" ? "Read-only" : "Read & write"} as {s.role} ·{" "}
                {s.changes.length} changes{s.emergency ? " · EMERGENCY" : ""} · “{s.reason}”
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Part>
  );
}

/* ============ Platform › tenant › Security & compliance (AENR-818) ============
   One page for how the tenant is protected: the sign-in policies Slaice
   enforces and the security events they produce first (the controls an Admin
   edits), then the data-protection position — DPA, DPO, data region and
   sub-processors. Each part keeps its own save / simulate actions and its
   Audit-log section ("Security", "Compliance"); old …/compliance links land
   on the Compliance part. */

const TRUST_PARTS = [
  { id: "security", label: "Security" },
  { id: "compliance", label: "Compliance" },
] as const;
export function SecurityAndCompliance(p: SectionProps) {
  return (
    <SectionFrame
      title="Security & compliance"
      sub={`How ${p.t.name}'s accounts and data are protected: sign-in policies and security events, then the DPA, data region and sub-processors.`}
      parts={TRUST_PARTS}
    >
      <Security {...p} />
      <Compliance {...p} />
    </SectionFrame>
  );
}

/* ---------- Security — a part of Security & compliance (AENR-818) ---------- */
function Security({ t }: SectionProps) {
  const d = useTenantDraft(t, ["security"] as const, "Security", ["security"]);
  const s = d.draft.security;
  return (
    <Part
      id="security"
      icon={Icon.lock}
      title="Security"
      sub="Tenant-wide sign-in policies and recent security events."
    >
      <Card className="p-4 space-y-3">
        <Toggle
          on={s.require2fa}
          onChange={(v) => d.set("security", { ...s, require2fa: v })}
          label="Require 2FA for Admin and Accountant roles"
        />
        <Field label="Session timeout">
          <Select
            value={String(s.sessionMins)}
            onChange={(e) => d.set("security", { ...s, sessionMins: Number(e.target.value) })}
            options={["15", "30", "60", "240"].map((m) => ({ v: m, l: `${m} minutes` }))}
          />
        </Field>
        <fieldset>
          <legend className="text-[12px] font-semibold text-slate-700 mb-1">
            Allowed sign-in methods
          </legend>
          <div className="flex flex-wrap gap-2">
            {["Password", "Magic link", "Google"].map((m) => (
              <label
                key={m}
                className="inline-flex items-center gap-2 rounded-lg ring-1 ring-slate-200 px-2.5 min-h-[40px] text-[13px]"
              >
                <input
                  type="checkbox"
                  className="accent-teal-600"
                  checked={s.methods.includes(m)}
                  onChange={(e) =>
                    d.set("security", {
                      ...s,
                      methods: e.target.checked
                        ? [...s.methods, m]
                        : s.methods.filter((x) => x !== m),
                    })
                  }
                />{" "}
                {m}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>
      <Card className="p-4">
        <h4 className="font-semibold text-navy-900 mb-1">Recent security events</h4>
        <ul className="text-[13px] space-y-1">
          {t.security.events.map((e) => (
            <li key={e.at}>
              {new Date(e.at).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {e.text}
            </li>
          ))}
        </ul>
      </Card>
      {d.bar}
      {d.reasonModal}
    </Part>
  );
}

/* ---------- Compliance — a part of Security & compliance (AENR-818) ---------- */
function Compliance({ t }: SectionProps) {
  const { go, privacy } = useApp();
  const nonEu = privacy.subprocessors.filter((s) => !isEu(s));
  const incidents = privacy.breaches.filter((b) => !b.closedAt && b.tenantIds?.includes(t.id)).length;
  const { updateTenant, toast, today } = usePlatform();
  return (
    <Part
      id="compliance"
      icon={Icon.shieldCheck}
      title="Compliance"
      sub="DPA, DPO, data region and sub-processors."
    >
      <Card className="p-4 grid sm:grid-cols-2 gap-x-6">
        <div>
          <KV k="DPA">
            {t.dpa.status === "Signed" ? (
              <Badge tone="green">
                Signed {t.dpa.version} · {t.dpa.signed}
              </Badge>
            ) : (
              <span className="inline-flex gap-2 items-center">
                <Badge tone="amber">Pending {t.dpa.version}</Badge>
                <Btn
                  size="sm"
                  variant="tint"
                  onClick={() => {
                    updateTenant(
                      t.id,
                      (x) => ({ ...x, dpa: { ...x.dpa, status: "Signed", signed: today } }),
                      { section: "Compliance", change: "DPA signed", actorType: "Tenant staff" },
                    );
                    toast("DPA signed (simulated).", { tone: "success" });
                  }}
                >
                  Simulate signed
                </Btn>
              </span>
            )}
          </KV>
          <KV k="DPO">{t.contacts.find((c) => c.role === "dpo")?.name}</KV>
          <KV k="Last review">{t.dpa.signed ?? "—"}</KV>
        </div>
        <div>
          <KV k="Data region">
            <Badge tone="indigo">{t.region}</Badge>
          </KV>
          <p className="text-[12px] text-slate-500 py-1.5">
            Set when the tenant was created. Changing region is a migration handled by Slaice.
          </p>
          <KV k="Open incidents">{incidents}</KV>
        </div>
      </Card>
      <Card className="p-4">
        <h4 className="font-semibold text-navy-900 mb-1">
          Sub-processors that may process data outside the region
        </h4>
        {nonEu.length ? (
          <ul className="text-[13px] space-y-1">
            {nonEu.map((s) => (
              <li key={s.name}>
                {s.name} · {s.purpose} · {s.location} · <b>{s.safeguard}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-slate-600">
            None — every sub-processor processes data in the EU.
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <Btn size="sm" variant="ghost" onClick={() => go("platform", "compliance")}>
            Platform breach register & controller/processor details
          </Btn>
        </div>
      </Card>
    </Part>
  );
}
