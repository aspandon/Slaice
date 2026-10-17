import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, Input, Modal, Select } from "../../components/ui";
import { useApp } from "../../app/store";
import { usePlatform } from "../../lib/usePlatform";
import { addDays, fmtDay } from "../../domain/period";
import { MODULES, moduleState, type ModuleSource } from "../../domain/plans";
import type { TenantRecord } from "../../domain/tenants";
import { SectionFrame, useTenantDraft, type SectionProps } from "./kit";

const SOURCE: Record<ModuleSource, { l: string; tone: string }> = {
  plan: { l: "Included in plan", tone: "green" },
  override: { l: "Override", tone: "indigo" },
  beta: { l: "Beta", tone: "roadmap" },
  blocked: { l: "Blocked by requirement", tone: "red" },
  off: { l: "Not in plan", tone: "slate" },
};
/** Modules a requirement switches off regardless of plan or override. */
export const blockersOf = (t: TenantRecord): Record<string, string> =>
  t.stripe.charges ? {} : { Payments: "Stripe charges_enabled is false" };

/* ---------- Modules (single source for the Super Admin matrix too) ---------- */
export function Modules({ t }: SectionProps) {
  const { plan, today, updateTenant, toast, actor } = usePlatform();
  const [edit, setEdit] = useState<{ module: string; on: boolean } | null>(null);
  const pv = plan(t);
  return (
    <SectionFrame
      title="Modules"
      sub="What the tenant can use and why — plan, override (with reason and expiry), beta or blocked."
    >
      <Card className="p-2">
        <ul className="divide-y divide-slate-100">
          {MODULES.map((m) => {
            const st = moduleState(m, pv, t.overrides, t.beta, blockersOf(t), today);
            return (
              <li key={m} className="px-2 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${st.on ? "bg-teal-500" : "bg-slate-300"}`}
                  aria-hidden
                />
                <span className="font-semibold text-navy-900 w-40">{m}</span>
                <Badge tone={st.on ? "green" : "slate"}>{st.on ? "On" : "Off"}</Badge>
                <Badge tone={SOURCE[st.source].tone}>{SOURCE[st.source].l}</Badge>
                <span className="flex-1 min-w-[12rem] text-[12px] text-slate-500">
                  {st.detail}
                  {st.reverted ? ` · override expired ${st.reverted.expires} — reverted` : ""}
                </span>
                <span className="flex gap-1">
                  {st.source === "override" ? (
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        updateTenant(
                          t.id,
                          (x) => ({ ...x, overrides: x.overrides.filter((o) => o.module !== m) }),
                          { section: "Modules", change: `Override removed: ${m}` },
                        );
                        toast(`${m}: back to the plan.`);
                      }}
                    >
                      Remove override
                    </Btn>
                  ) : st.source !== "blocked" ? (
                    <Btn
                      size="sm"
                      variant="outline"
                      onClick={() => setEdit({ module: m, on: !st.on })}
                    >
                      {st.on ? "Switch off" : "Grant"}
                    </Btn>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
      {edit && (
        <OverrideModal
          module={edit.module}
          on={edit.on}
          today={today}
          onClose={() => setEdit(null)}
          onSave={(reason, expires) => {
            updateTenant(
              t.id,
              (x) => ({
                ...x,
                overrides: [
                  ...x.overrides.filter((o) => o.module !== edit.module),
                  {
                    module: edit.module,
                    on: edit.on,
                    reason,
                    expires,
                    by: actor,
                    at: new Date().toISOString(),
                  },
                ],
              }),
              {
                section: "Modules",
                change: `Override: ${edit.module} ${edit.on ? "on" : "off"}${expires ? ` until ${expires}` : ""}`,
                reason,
              },
            );
            toast(
              `${edit.module} ${edit.on ? "granted" : "switched off"} for ${t.name}${expires ? ` until ${fmtDay(expires)}` : ""}.`,
              { tone: "success" },
            );
            setEdit(null);
          }}
        />
      )}
    </SectionFrame>
  );
}

export function OverrideModal({
  module,
  on,
  today,
  onClose,
  onSave,
}: {
  module: string;
  on: boolean;
  today: string;
  onClose: () => void;
  onSave: (reason: string, expires?: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("14");
  return (
    <Modal
      open
      onClose={onClose}
      title={`${on ? "Grant" : "Switch off"} ${module}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            disabled={reason.trim().length < 5}
            onClick={() => onSave(reason.trim(), days ? addDays(today, Number(days)) : undefined)}
          >
            Save override
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Reason (Audit log)">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Trial of lockers for the August peak"
          />
        </Field>
        <Field label="Expires">
          <Select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            options={[
              { v: "7", l: "In 7 days" },
              { v: "14", l: "In 14 days" },
              { v: "30", l: "In 30 days" },
              { v: "", l: "Never" },
            ]}
          />
        </Field>
        <p className="text-[12px] text-slate-500">
          An expired override reverts to the plan automatically and is logged.
        </p>
      </div>
    </Modal>
  );
}

/* ---------- Locations & capacity ---------- */
export function Locations({ t }: SectionProps) {
  const { go } = useApp();
  const { setPlatform } = usePlatform();
  const d = useTenantDraft(t, ["locations"] as const, "Locations & capacity");
  const l = d.draft.locations;
  const set = (k: keyof typeof l, v: string) =>
    d.set("locations", { ...l, [k]: typeof l[k] === "number" ? Number(v) : v });
  return (
    <SectionFrame
      title="Locations & capacity"
      sub="Sites, zones and what can be sold."
      actions={
        <Btn
          variant="outline"
          icon={Icon.map}
          onClick={() => {
            setPlatform((p) => ({ ...p, siteTenant: t.id }));
            go("admin", "layout");
          }}
        >
          Open the tenant's map
        </Btn>
      }
    >
      <Card className="p-4 grid sm:grid-cols-3 gap-3">
        {(["sites", "zones", "sets", "lockers", "parking"] as const).map((k) => (
          <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
            <Input type="number" min={0} value={l[k]} onChange={(e) => set(k, e.target.value)} />
          </Field>
        ))}
        <Field label="Season">
          <Input value={l.season} onChange={(e) => set("season", e.target.value)} />
        </Field>
        <Field label="Opening hours">
          <Input value={l.hours} onChange={(e) => set("hours", e.target.value)} />
        </Field>
      </Card>
      {d.bar}
    </SectionFrame>
  );
}

/* ---------- Branding & domain ---------- */
export function Branding({ t }: SectionProps) {
  const { updateTenant, toast } = usePlatform();
  const d = useTenantDraft(
    t,
    ["brand", "customDomain", "subdomain"] as const,
    "Branding & domain",
    ["subdomain"],
  );
  const [checking, setChecking] = useState(false);
  const verify = (ok: boolean) => {
    setChecking(true);
    window.setTimeout(() => {
      setChecking(false);
      if (!ok)
        return toast("DNS check failed — CNAME not found yet. It can take up to 24 h.", {
          tone: "warn",
        });
      updateTenant(t.id, (x) => ({ ...x, domainVerified: true }), {
        section: "Branding & domain",
        change: `Custom domain verified: ${t.customDomain}`,
        actorType: "System",
      });
      toast("Custom domain verified.", { tone: "success" });
    }, 900);
  };
  return (
    <SectionFrame title="Branding & domain" sub="Colours, logo, the customer site and its domain.">
      <div className="grid lg:grid-cols-2 gap-3">
        <Card className="p-4 space-y-3">
          <Field label="Brand colour">
            <div className="flex gap-1.5">
              {["#0D9488", "#0ea5e9", "#f59e0b", "#a855f7", "#ef4444"].map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Brand colour ${c}`}
                  aria-pressed={d.draft.brand === c}
                  onClick={() => d.set("brand", c)}
                  className={`w-8 h-8 rounded-lg ${d.draft.brand === c ? "ring-2 ring-offset-2 ring-navy-900" : "ring-2 ring-white"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Field>
          <Field label="Subdomain (changing it needs a reason — old links redirect)">
            <Input value={d.draft.subdomain} onChange={(e) => d.set("subdomain", e.target.value)} />
          </Field>
          <Field label="Custom domain">
            <Input
              value={d.draft.customDomain ?? ""}
              onChange={(e) => d.set("customDomain", e.target.value || undefined)}
              placeholder="book.example.gr"
            />
          </Field>
          {t.customDomain && (
            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
              {t.domainVerified ? (
                <Badge tone="green">
                  <Icon.check size={11} /> DNS verified
                </Badge>
              ) : (
                <Badge tone="amber">
                  <Icon.clock size={11} /> DNS not verified
                </Badge>
              )}
              {!t.domainVerified && (
                <>
                  <Btn size="sm" variant="outline" loading={checking} onClick={() => verify(true)}>
                    Verify DNS
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={() => verify(false)}>
                    Simulate failure
                  </Btn>
                </>
              )}
              <span className="text-slate-500">
                CNAME {t.customDomain} → {t.subdomain}
              </span>
            </div>
          )}
        </Card>
        <Card className="p-0 overflow-hidden">
          <div
            className="px-4 py-3 text-white font-display font-bold"
            style={{ background: d.draft.brand }}
          >
            {t.name}
          </div>
          <div className="p-4 text-[13px] text-slate-600">
            Customer-site preview ·{" "}
            {t.customDomain && t.domainVerified ? t.customDomain : t.subdomain}
            <div
              className="mt-2 inline-flex rounded-lg px-3 py-1.5 text-white text-[12px] font-semibold"
              style={{ background: d.draft.brand }}
            >
              Book a sunbed
            </div>
          </div>
        </Card>
      </div>
      {d.bar}
      {d.reasonModal}
    </SectionFrame>
  );
}

/* ---------- Localisation ---------- */
const LANGS = [
  ["el", "Greek"],
  ["en", "English"],
  ["de", "German"],
  ["fr", "French"],
  ["it", "Italian"],
  ["es", "Spanish"],
];
export function Localisation({ t }: SectionProps) {
  const d = useTenantDraft(t, ["languages", "language", "currency"] as const, "Localisation");
  return (
    <SectionFrame title="Localisation" sub="Customer languages, default language and formats.">
      <Card className="p-4 space-y-3">
        <fieldset>
          <legend className="text-[12px] font-semibold text-slate-700 mb-1">
            Customer languages
          </legend>
          <div className="flex flex-wrap gap-2">
            {LANGS.map(([c, l]) => (
              <label
                key={c}
                className="inline-flex items-center gap-2 rounded-lg ring-1 ring-slate-200 px-2.5 min-h-[40px] text-[13px]"
              >
                <input
                  type="checkbox"
                  className="accent-teal-600"
                  checked={d.draft.languages.includes(c)}
                  onChange={(e) =>
                    d.set(
                      "languages",
                      e.target.checked
                        ? [...d.draft.languages, c]
                        : d.draft.languages.filter((x) => x !== c),
                    )
                  }
                />{" "}
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Default language">
            <Select
              value={d.draft.language}
              onChange={(e) => d.set("language", e.target.value)}
              options={["Greek", "English"]}
            />
          </Field>
          <Field label="Currency">
            <Select
              value={d.draft.currency}
              onChange={(e) => d.set("currency", e.target.value)}
              options={["EUR"]}
            />
          </Field>
          <Field label="Date / number format">
            <Select
              value="el-GR"
              onChange={() => undefined}
              options={[
                { v: "el-GR", l: "19/07/2026 · 1.234,50" },
                { v: "en-GB", l: "19/07/2026 · 1,234.50" },
              ]}
            />
          </Field>
        </div>
      </Card>
      {d.bar}
    </SectionFrame>
  );
}

