import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, Input, Modal, SaveBar, Select, Toggle, DateInput, ExportMenu } from "../../components/ui";
import { useApp } from "../../app/store";
import { downloadReport, csvSectionsToReport, type CsvSection } from "../../lib/download";
import {
  ART30_FIELDS,
  BASES,
  DPIA_CRITERIA,
  activityErrors,
  dpiaRequired,
  fmtDate,
  retentionLabel,
  type Activity,
  type Dpia,
  type Lia,
  type RetentionRow,
} from "../../domain/gdpr";
import { STAFF_NAME, usePrivacy } from "./usePrivacy";

/* ============ Register (AENR-486) ============
   The Art. 30 record of processing — editable, every mandatory field
   validated, an LIA required for legitimate-interest activities, profiling
   flagged — plus the DPIA register with EDPB screening, and the retention
   schedule with change history and logged anonymisation runs. */

const blankActivity = (): Activity => ({
  id: `ra-${Date.now().toString(36)}`,
  name: "",
  purpose: "",
  basis: "Contract",
  subjects: "",
  dataCats: "",
  recipients: "",
  transfers: "None",
  safeguard: "",
  retention: "",
  security: "",
  profiling: false,
});
const blankLia = (): Lia => ({
  purpose: "",
  necessity: "",
  balancing: "",
  outcome: "Proceed with safeguards",
  review: "",
});

export function RegisterTab() {
  const { privacy, setPrivacy } = usePrivacy();
  const { toast } = useApp();
  const [edit, setEdit] = useState<Activity | null>(null);
  const [dpia, setDpia] = useState<Dpia | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const acts = privacy.activities.filter((a) => !!a.archived === showArchived);
  const controller = "Akti tou Iliou AE · Poseidonos Ave 32, Alimos";
  // One register, PDF or CSV — the same columns in both (AENR-593).
  const exportRegister = (format: "pdf" | "csv") => {
    const secs: CsvSection[] = [
      {
        title: `Record of processing activities (GDPR Art. 30) · ${controller} · DPO ${privacy.dpo.email}`,
        header: [
          "Activity",
          "Purpose",
          "Lawful basis",
          "Data subjects",
          "Personal data",
          "Recipients",
          "Transfers",
          "Safeguard",
          "Retention",
          "Security",
          "Profiling",
          "LIA outcome",
        ],
        rows: privacy.activities
          .filter((a) => !a.archived)
          .map((a) => [
            a.name,
            a.purpose,
            a.basis,
            a.subjects,
            a.dataCats,
            a.recipients,
            a.transfers,
            a.safeguard || "—",
            a.retention,
            a.security,
            a.profiling ? "Yes" : "No",
            a.lia?.outcome ?? "—",
          ]),
      },
      {
        title: "DPIA register (Art. 35)",
        header: ["Activity", "Screening criteria", "Status", "Owner", "Review"],
        rows: privacy.dpias.map((d) => [
          d.activity,
          d.criteria.join("; "),
          d.status,
          d.owner,
          d.review,
        ]),
      },
    ];
    secs[0] = { ...secs[0], title: "Processing activities" };
    downloadReport("record-of-processing", csvSectionsToReport({
      title: "Record of processing activities",
      subtitle: "GDPR Art. 30(1) · for the Hellenic Data Protection Authority",
      meta: [`Controller: ${controller}`, `DPO: ${privacy.dpo.name} · ${privacy.dpo.email}`, "Kept under Art. 30(4) — available to the authority on request."],
    }, secs), format);
    toast(`Register exported (${format.toUpperCase()}).`, { tone: "success" });
  };
  const save = (a: Activity) => {
    setPrivacy((s) => ({
      ...s,
      activities: s.activities.some((x) => x.id === a.id)
        ? s.activities.map((x) => (x.id === a.id ? a : x))
        : [...s.activities, a],
    }));
    setEdit(null);
    toast(`“${a.name}” saved to the register.`, { tone: "success" });
  };
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex flex-wrap items-center gap-2">
          <div className="font-semibold text-navy-900">Record of processing (Art. 30)</div>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="text-[12px] font-semibold text-slate-500 hover:text-navy-900"
          >
            {showArchived
              ? "Show active"
              : `Archived · ${privacy.activities.filter((a) => a.archived).length}`}
          </button>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <ExportMenu size="sm" variant="ghost" what="the record of processing" onExport={exportRegister} />
            <Btn
              size="sm"
              variant="primary"
              icon={Icon.plus}
              onClick={() => setEdit(blankActivity())}
            >
              Add activity
            </Btn>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2 font-semibold">Activity</th>
                <th className="px-2 font-semibold">Basis</th>
                <th className="px-2 font-semibold">Data</th>
                <th className="px-2 font-semibold">Transfers</th>
                <th className="px-2 font-semibold">Retention</th>
                <th className="px-2 font-semibold">Checks</th>
                <th className="px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {acts.map((a) => {
                const errs = activityErrors(a);
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-navy-900">{a.name}</div>
                      <div className="text-[11.5px] text-slate-500">{a.purpose}</div>
                    </td>
                    <td className="px-2">
                      <Badge tone="slate">{a.basis}</Badge>
                    </td>
                    <td className="px-2 text-slate-600 max-w-[220px]">{a.dataCats}</td>
                    <td className="px-2 text-slate-600">
                      {a.transfers}
                      {a.safeguard && (
                        <div className="text-[11px] text-teal-700">{a.safeguard}</div>
                      )}
                    </td>
                    <td className="px-2 text-slate-600">{a.retention}</td>
                    <td className="px-2">
                      <div className="flex flex-wrap gap-1">
                        {a.basis === "Legitimate interest" && (
                          <Badge tone={a.lia ? "green" : "red"}>
                            {a.lia ? `LIA · ${a.lia.outcome}` : "LIA missing"}
                          </Badge>
                        )}
                        {a.profiling && <Badge tone="amber">Profiling · objectable</Badge>}
                        {errs.length > 0 && (
                          <Badge tone="red">
                            {errs.length} issue{errs.length > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 text-right whitespace-nowrap">
                      <Btn
                        size="sm"
                        variant="ghost"
                        icon={Icon.edit}
                        aria-label={`Edit ${a.name}`}
                        onClick={() => setEdit(a)}
                      >
                        Edit
                      </Btn>
                      <Btn
                        size="sm"
                        variant="ghost"
                        aria-label={`${a.archived ? "Restore" : "Archive"} ${a.name}`}
                        onClick={() =>
                          setPrivacy((s) => ({
                            ...s,
                            activities: s.activities.map((x) =>
                              x.id === a.id ? { ...x, archived: !x.archived } : x,
                            ),
                          }))
                        }
                      >
                        {a.archived ? "Restore" : "Archive"}
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <div className="font-semibold text-navy-900">DPIA register (Art. 35)</div>
          <span className="text-[12px] text-slate-500">
            Two or more EDPB criteria → a DPIA is likely required
          </span>
          <Btn
            size="sm"
            variant="ghost"
            icon={Icon.plus}
            className="ml-auto"
            onClick={() =>
              setDpia({
                id: `dpia-${Date.now().toString(36)}`,
                activity: privacy.activities[0]?.name ?? "",
                criteria: [],
                status: "Not required",
                owner: STAFF_NAME,
                review: "",
              })
            }
          >
            Screen an activity
          </Btn>
        </div>
        <ul className="divide-y divide-slate-100">
          {privacy.dpias.map((d) => (
            <li key={d.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-[13px]">
              <div className="min-w-0 flex-1 basis-64">
                <div className="font-semibold text-navy-900">{d.activity}</div>
                <div className="text-[12px] text-slate-500">
                  {d.criteria.join(" · ") || "No criteria met"}
                  {d.outcome ? ` — ${d.outcome}` : ""}
                </div>
              </div>
              <Badge
                tone={
                  d.status === "Done"
                    ? "green"
                    : d.status === "In progress"
                      ? "amber"
                      : d.status === "Review due"
                        ? "red"
                        : "slate"
                }
              >
                {d.status}
              </Badge>
              <span className="text-[12px] text-slate-500">
                {d.owner} · review {d.review ? fmtDate(d.review) : "—"}
              </span>
              <Btn
                size="sm"
                variant="ghost"
                icon={Icon.edit}
                aria-label={`Edit DPIA ${d.activity}`}
                onClick={() => setDpia(d)}
              >
                Edit
              </Btn>
            </li>
          ))}
        </ul>
      </Card>
      {edit && <ActivityModal initial={edit} onClose={() => setEdit(null)} onSave={save} />}
      {dpia && (
        <Modal
          open
          wide
          onClose={() => setDpia(null)}
          title="DPIA screening"
          footer={
            <>
              <Btn variant="ghost" onClick={() => setDpia(null)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                icon={Icon.check}
                onClick={() => {
                  setPrivacy((s) => ({
                    ...s,
                    dpias: s.dpias.some((x) => x.id === dpia.id)
                      ? s.dpias.map((x) => (x.id === dpia.id ? dpia : x))
                      : [...s.dpias, dpia],
                  }));
                  setDpia(null);
                  toast("DPIA register updated.", { tone: "success" });
                }}
              >
                Save
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <Field label="Activity">
              <Select
                value={dpia.activity}
                onChange={(e) => setDpia({ ...dpia, activity: e.target.value })}
                options={privacy.activities.map((a) => a.name)}
              />
            </Field>
            <fieldset>
              <legend className="text-[12px] font-semibold text-slate-700 mb-1">
                EDPB screening criteria
              </legend>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {DPIA_CRITERIA.map((c) => (
                  <label
                    key={c}
                    className="flex items-start gap-2 text-[12.5px] rounded-lg ring-1 ring-slate-200 px-2.5 py-1.5"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={dpia.criteria.includes(c)}
                      onChange={(e) => {
                        const criteria = e.target.checked
                          ? [...dpia.criteria, c]
                          : dpia.criteria.filter((x) => x !== c);
                        setDpia({
                          ...dpia,
                          criteria,
                          status: dpiaRequired(criteria)
                            ? dpia.status === "Not required"
                              ? "In progress"
                              : dpia.status
                            : "Not required",
                        });
                      }}
                    />{" "}
                    {c}
                  </label>
                ))}
              </div>
            </fieldset>
            <div
              className={`rounded-xl px-3 py-2 text-[12.5px] ${dpiaRequired(dpia.criteria) ? "bg-amber-50 ring-1 ring-amber-200 text-amber-900" : "bg-slate-50 ring-1 ring-slate-200 text-slate-700"}`}
            >
              {dpiaRequired(dpia.criteria)
                ? `${dpia.criteria.length} criteria met — a DPIA is likely required before processing.`
                : "Fewer than two criteria — a DPIA is usually not required; keep this screening on file."}
            </div>
            <div className="grid sm:grid-cols-3 gap-2.5">
              <Field label="Status">
                <Select
                  value={dpia.status}
                  onChange={(e) => setDpia({ ...dpia, status: e.target.value as Dpia["status"] })}
                  options={["Not required", "In progress", "Done", "Review due"]}
                />
              </Field>
              <Field label="Owner">
                <Input
                  value={dpia.owner}
                  onChange={(e) => setDpia({ ...dpia, owner: e.target.value })}
                />
              </Field>
              <Field label="Review date">
                <DateInput
                  
                  value={dpia.review}
                  onChange={(v) => setDpia({ ...dpia, review: v })}
                />
              </Field>
            </div>
            <Field label="Outcome (optional)">
              <Input
                value={dpia.outcome ?? ""}
                onChange={(e) => setDpia({ ...dpia, outcome: e.target.value || undefined })}
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ActivityModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Activity;
  onClose: () => void;
  onSave: (a: Activity) => void;
}) {
  const { privacy } = usePrivacy();
  const [a, setA] = useState(initial);
  const [tried, setTried] = useState(false);
  const errs = activityErrors(a);
  const lia = a.lia ?? blankLia();
  const setLia = (p: Partial<Lia>) => setA({ ...a, lia: { ...lia, ...p } });
  const txt = (k: keyof Activity, label: string, ph?: string) => (
    <Field label={`${label} *`}>
      <Input
        value={String(a[k] ?? "")}
        onChange={(e) => setA({ ...a, [k]: e.target.value })}
        placeholder={ph}
        aria-invalid={tried && !String(a[k] ?? "").trim()}
        className={tried && !String(a[k] ?? "").trim() ? "ring-2 ring-rose-400" : ""}
      />
    </Field>
  );
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={initial.name ? `Edit “${initial.name}”` : "Add processing activity"}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            icon={Icon.check}
            onClick={() => {
              setTried(true);
              if (!errs.length) onSave(a);
            }}
          >
            Save activity
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {tried && errs.length > 0 && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-[12.5px] text-rose-800"
          >
            <div className="font-semibold">Can't save yet</div>
            <ul className="list-disc pl-4">
              {errs.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-2.5">
          {txt("name", ART30_FIELDS[0][1])}
          {txt("purpose", "Purpose")}
          <Field label="Lawful basis *">
            <Select
              value={a.basis}
              onChange={(e) => setA({ ...a, basis: e.target.value as Activity["basis"] })}
              options={[...BASES]}
            />
          </Field>
          {txt("subjects", "Categories of data subjects", "e.g. Customers, staff")}
          {txt("dataCats", "Categories of personal data", "e.g. Identity, contact, booking")}
          {txt("recipients", "Recipients", "e.g. Slaice, Stripe")}
          {txt("transfers", "International transfers", "None, or the country")}
          <Field label="Transfer safeguard">
            <Select
              value={a.safeguard}
              onChange={(e) => setA({ ...a, safeguard: e.target.value })}
              options={[
                { v: "", l: "— none needed —" },
                "Adequacy decision",
                "EU-US Data Privacy Framework",
                "SCCs (2021/914)",
              ]}
            />
          </Field>
          <Field label="Retention * (from the Retention tab)">
            <Select
              value={a.retention}
              onChange={(e) => setA({ ...a, retention: e.target.value })}
              options={[
                { v: "", l: "Pick a retention rule" },
                ...privacy.retention.map((r) => ({
                  v: r.data,
                  l: `${r.data} · ${retentionLabel(r)}`,
                })),
              ]}
            />
          </Field>
          {txt("security", "Security measures (summary)")}
        </div>
        <Toggle
          label="Involves profiling or automated decisions (Art. 22) — disclosed in the privacy notice, customers can object"
          on={a.profiling}
          onChange={(profiling) => setA({ ...a, profiling })}
        />
        {a.basis === "Legitimate interest" && (
          <fieldset className="rounded-2xl ring-1 ring-amber-200 bg-amber-50/50 p-3 space-y-2.5">
            <legend className="px-1 text-[12.5px] font-semibold text-navy-900">
              Legitimate interest assessment (required)
            </legend>
            <Field label="Purpose test — what interest, and is it legitimate? *">
              <Input value={lia.purpose} onChange={(e) => setLia({ purpose: e.target.value })} />
            </Field>
            <Field label="Necessity test — is this the least data that achieves it? *">
              <Input
                value={lia.necessity}
                onChange={(e) => setLia({ necessity: e.target.value })}
              />
            </Field>
            <Field label="Balancing test — expectations, impact, safeguards *">
              <Input
                value={lia.balancing}
                onChange={(e) => setLia({ balancing: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Outcome">
                <Select
                  value={lia.outcome}
                  onChange={(e) => setLia({ outcome: e.target.value as Lia["outcome"] })}
                  options={["Proceed", "Proceed with safeguards", "Do not proceed"]}
                />
              </Field>
              <Field label="Review date *">
                <DateInput
                  
                  value={lia.review}
                  onChange={(v) => setLia({ review: v })}
                />
              </Field>
            </div>
          </fieldset>
        )}
      </div>
    </Modal>
  );
}

export function RetentionTab() {
  const { privacy, setPrivacy } = usePrivacy();
  const { toast } = useApp();
  const [rows, setRows] = useState<RetentionRow[]>(privacy.retention);
  const dirty = JSON.stringify(rows) !== JSON.stringify(privacy.retention);
  const save = () => {
    const at = new Date().toISOString().slice(0, 16);
    const changes = rows.flatMap((r) => {
      const old = privacy.retention.find((x) => x.id === r.id);
      return old && retentionLabel(old) !== retentionLabel(r)
        ? [{ at, by: STAFF_NAME, data: r.data, from: retentionLabel(old), to: retentionLabel(r) }]
        : [];
    });
    setPrivacy((s) => ({
      ...s,
      retention: rows,
      retentionHistory: [...changes, ...s.retentionHistory],
    }));
    toast(`Retention saved · ${changes.length} change${changes.length === 1 ? "" : "s"} logged.`, {
      tone: "success",
    });
  };
  const run = () => {
    // Sample counts: records past each numeric term on this demo day.
    const counts = rows
      .filter((r) => r.num !== null && !r.legal)
      .map((r, i) => ({ data: r.data, n: (((r.num ?? 1) * 7 + i * 13) % 41) + 2 }));
    setPrivacy((s) => ({
      ...s,
      anonRuns: [
        { at: new Date().toISOString().slice(0, 16), by: STAFF_NAME, auto: false, counts },
        ...s.anonRuns,
      ],
    }));
    toast(`Anonymisation run · ${counts.reduce((a, c) => a + c.n, 0)} records anonymised.`, {
      tone: "success",
    });
  };
  return (
    <>
    <SaveBar dirty={dirty} onSave={save} onDiscard={() => setRows(privacy.retention)} note="Unsaved retention changes — the current policy still applies until you save." />
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      <Card className="p-2">
        <div className="px-3 pt-2 pb-1.5 text-[12px] text-slate-500">
          How long each category is kept before it is anonymised or deleted (storage limitation,
          Art. 5(1)(e)). Tax-mandated and open-ended terms are fixed.
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <div key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-navy-900">{r.data}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  {r.legal && <Icon.lock size={11} className="text-amber-600" />}
                  {r.basis}
                </div>
              </div>
              {r.num !== null ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-[4.5rem]">
                    <Input
                      type="number"
                      min={1}
                      aria-label={`${r.data} — amount`}
                      value={r.num}
                      disabled={r.legal}
                      onChange={(e) =>
                        setRows((rs) =>
                          rs.map((x, j) =>
                            j === i
                              ? { ...x, num: Math.max(1, Math.round(+e.target.value) || 1) }
                              : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="w-28">
                    <Select
                      aria-label={`${r.data} — unit`}
                      value={r.unit}
                      disabled={r.legal}
                      onChange={(e) =>
                        setRows((rs) =>
                          rs.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)),
                        )
                      }
                      options={["hours", "days", "months", "years"]}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-slate-500 italic">{r.text}</div>
              )}
            </div>
          ))}
        </div>
        <div className="px-3 py-3 flex justify-between items-center gap-2 flex-wrap">
          <Btn size="sm" variant="outline" icon={Icon.database} onClick={run}>
            Run anonymisation now
          </Btn>
          <Btn size="sm" variant="primary" icon={Icon.check} disabled={!dirty} onClick={save}>
            Save retention policy
          </Btn>
        </div>
      </Card>
      <div className="space-y-4">
        <Card className="p-4">
          <div className="font-semibold text-navy-900 mb-1">Anonymisation runs</div>
          <div className="text-[12px] text-slate-500 mb-2">
            Runs automatically every night at 03:00.
          </div>
          <ul className="space-y-2">
            {privacy.anonRuns.slice(0, 5).map((r) => (
              <li key={r.at} className="rounded-lg ring-1 ring-slate-200 px-2.5 py-2 text-[12px]">
                <div className="flex justify-between">
                  <b className="text-navy-900">{r.at.replace("T", " ")}</b>
                  <Badge tone={r.auto ? "slate" : "blue"}>
                    {r.auto ? "Scheduled" : `Manual · ${r.by}`}
                  </Badge>
                </div>
                <ul className="mt-1 text-slate-600">
                  {r.counts.map((c) => (
                    <li key={c.data} className="flex justify-between">
                      <span>{c.data}</span>
                      <span className="tnum">{c.n}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <div className="font-semibold text-navy-900 mb-2">Change history</div>
          <ul className="space-y-1.5 text-[12px]">
            {privacy.retentionHistory.map((h, i) => (
              <li key={i} className="rounded-lg ring-1 ring-slate-100 px-2.5 py-1.5">
                <b className="text-navy-900">{h.data}</b>: {h.from} → {h.to}
                <div className="text-slate-500">
                  {h.by} · {h.at.replace("T", " ")}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
    </>
  );
}
