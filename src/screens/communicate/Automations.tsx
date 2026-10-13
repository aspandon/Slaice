import { useState } from "react";
import { Icon } from "../../lib/icons";
import {
  Badge,
  Btn,
  Card,
  Drawer,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  DateInput,
} from "../../components/ui";
import { useApp } from "../../app/store";
import { ZONES } from "../../data/beach";
import { LANGUAGES_CRM } from "../../data/guests";
import {
  CH_LABEL,
  CH_ORDER,
  TRIGGERS,
  WEEKDAYS,
  automationErrors,
  fmtAt,
  triggerDef,
  triggerSummary,
  type Automation,
  type Ch,
  type TriggerId,
} from "../../domain/comms";
import { segName, useCommsEngine } from "./engine";

/* ============ Automations (AENR-492 B) ============
   Messages sent when a condition is met: trigger → extra conditions →
   delay → message steps (from the library) → channel with fallback. The same
   guardrails as campaigns apply. Triggers are simulated with “Simulate
   trigger”; the low-occupancy check also runs on its own when the demo clock
   passes its check time. */

const STATUS_TONE = { Active: "green", Paused: "amber", Draft: "slate" } as const;

const TEMPLATES: {
  name: string;
  trigger: TriggerId;
  messageId: string;
  channels: Ch[];
  extra?: Partial<Automation>;
}[] = [
  {
    name: "Low occupancy · last-minute offer",
    trigger: "low_occupancy",
    messageId: "msg-lastminute",
    channels: ["push", "viber", "sms"],
    extra: { zoneId: "bolivar", targetWeekday: 6, check: { weekday: 4, time: "10:00" } },
  },
  {
    name: "Day-before reminder + upsell",
    trigger: "before_visit",
    messageId: "msg-reminder",
    channels: ["push", "email", "sms"],
  },
  {
    name: "Thank you + review request",
    trigger: "after_visit",
    messageId: "msg-thanks",
    channels: ["email", "push"],
  },
  {
    name: "Win-back",
    trigger: "no_visit",
    messageId: "msg-winback",
    channels: ["email", "viber", "sms"],
  },
  {
    name: "Birthday treat",
    trigger: "birthday",
    messageId: "msg-winback",
    channels: ["email", "push"],
  },
  {
    name: "Sunny weekend nudge",
    trigger: "sunny_weekend",
    messageId: "msg-august",
    channels: ["push", "viber"],
  },
];

const blank = (clock: string, t?: (typeof TEMPLATES)[number]): Automation => ({
  id: `auto-${Date.now().toString(36)}`,
  name: t?.name ?? "",
  status: "Draft",
  trigger: t?.trigger ?? "booking_confirmed",
  param: triggerDef(t?.trigger ?? "booking_confirmed").param?.default ?? 0,
  conditions: {},
  delayHours: 0,
  steps: [{ messageId: t?.messageId ?? "", waitDays: 0 }],
  channels: t?.channels ?? ["push", "email"],
  window: { from: clock.slice(0, 10), to: "2026-09-30" },
  stats: { sent: 0, skipped: 0, conversions: 0 },
  fired: [],
  createdAt: clock,
  ...t?.extra,
});

export function AutomationsTab() {
  const { toast } = useApp();
  const { comms, setComms, audience, fire, occupancyCheck } = useCommsEngine();
  const [editing, setEditing] = useState<Automation | null>(null);
  const [pick, setPick] = useState(false);
  const [sim, setSim] = useState<Automation | null>(null);
  const [log, setLog] = useState<Automation | null>(null);
  const zoneName = (id?: string) => ZONES.find((z) => z.id === id)?.name;
  const save = (a: Automation) => {
    setComms((s) => ({
      ...s,
      automations: s.automations.some((x) => x.id === a.id)
        ? s.automations.map((x) => (x.id === a.id ? a : x))
        : [a, ...s.automations],
    }));
    toast(`“${a.name}” saved · ${a.status}.`, { tone: "success" });
    setEditing(null);
  };
  const setStatus = (a: Automation, status: Automation["status"]) => {
    setComms((s) => ({
      ...s,
      automations: s.automations.map((x) => (x.id === a.id ? { ...x, status } : x)),
    }));
    toast(
      status === "Paused"
        ? `“${a.name}” paused — no new sends from now on.`
        : `“${a.name}” is active.`,
      { tone: status === "Paused" ? undefined : "success" },
    );
  };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="text-[12.5px] text-slate-600">
          Sent automatically when the trigger fires — consent, quiet hours and the frequency cap
          apply.
        </div>
        <Btn variant="primary" icon={Icon.plus} className="ml-auto" onClick={() => setPick(true)}>
          New automation
        </Btn>
      </div>
      {comms.automations.length === 0 ? (
        <EmptyState
          icon={Icon.bolt}
          title="No automations yet"
          body="Start from a template — reminders, win-back, low-occupancy offers — or build one from scratch."
          action={
            <Btn variant="primary" icon={Icon.plus} onClick={() => setPick(true)}>
              New automation
            </Btn>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {comms.automations.map((a) => (
              <li key={a.id} className="p-3.5 sm:px-4 flex flex-wrap items-center gap-3">
                <span
                  className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${a.status === "Active" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  <Icon.bolt size={16} />
                </span>
                <div className="min-w-0 flex-1 basis-60">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-navy-900">{a.name}</span>
                    <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                  </div>
                  <div className="text-[12px] text-slate-500 mt-0.5">
                    {triggerSummary(a, zoneName(a.zoneId))} ·{" "}
                    {a.conditions.segmentId
                      ? segName(audience.segments, a.conditions.segmentId)
                      : "All guests"}{" "}
                    · {a.channels.map((c) => CH_LABEL[c]).join(" → ")}
                    {a.steps.length > 1 && ` · ${a.steps.length} steps`}
                  </div>
                </div>
                <div className="text-[12px] text-slate-600 tnum min-w-[150px]">
                  <b className="text-navy-900">{a.stats.sent}</b> sent · {a.stats.skipped} skipped
                  <div className="text-slate-500">{a.stats.conversions} conversions</div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <Btn size="sm" variant="ghost" icon={Icon.bolt} onClick={() => setSim(a)}>
                    Simulate trigger
                  </Btn>
                  <Btn size="sm" variant="ghost" icon={Icon.list} onClick={() => setLog(a)}>
                    Activity
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    icon={Icon.edit}
                    aria-label={`Edit ${a.name}`}
                    onClick={() => setEditing(a)}
                  >
                    Edit
                  </Btn>
                  {a.status === "Active" ? (
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon={Icon.pause}
                      onClick={() => setStatus(a, "Paused")}
                    >
                      Pause
                    </Btn>
                  ) : (
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon={Icon.play}
                      disabled={automationErrors(a).length > 0}
                      title={automationErrors(a)[0]}
                      onClick={() => setStatus(a, "Active")}
                    >
                      {a.status === "Draft" ? "Activate" : "Resume"}
                    </Btn>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Modal open={pick} onClose={() => setPick(false)} title="New automation" wide>
        <ul className="grid sm:grid-cols-2 gap-2.5">
          {TEMPLATES.map((t) => (
            <li key={t.name}>
              <button
                type="button"
                onClick={() => {
                  setPick(false);
                  setEditing(blank(comms.clock, t));
                }}
                className="w-full text-left rounded-xl ring-1 ring-slate-200 bg-white p-3 hover:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <div className="font-semibold text-navy-900 text-[13.5px]">{t.name}</div>
                <div className="text-[12px] text-slate-500 mt-0.5">
                  {triggerDef(t.trigger).help}
                </div>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                setPick(false);
                setEditing(blank(comms.clock));
              }}
              className="w-full h-full text-left rounded-xl ring-1 ring-dashed ring-slate-300 bg-slate-50 p-3 hover:ring-teal-500"
            >
              <div className="font-semibold text-navy-900 text-[13.5px] inline-flex items-center gap-1.5">
                <Icon.plus size={13} /> From scratch
              </div>
              <div className="text-[12px] text-slate-500 mt-0.5">
                Pick any trigger, conditions and steps.
              </div>
            </button>
          </li>
        </ul>
      </Modal>
      {editing && (
        <AutomationBuilder initial={editing} onClose={() => setEditing(null)} onSave={save} />
      )}
      {sim && (
        <SimulateModal
          a={comms.automations.find((x) => x.id === sim.id) ?? sim}
          forecast={
            sim.trigger === "low_occupancy"
              ? occupancyCheck(sim, comms.clock.slice(0, 10))
              : undefined
          }
          onClose={() => setSim(null)}
          onRun={(assume) => {
            const cur = comms.automations.find((x) => x.id === sim.id) ?? sim;
            const r = fire(comms, cur, { assume });
            setComms(() => r.next);
            return r.outcome;
          }}
        />
      )}
      {log && (
        <ActivityDrawer
          a={comms.automations.find((x) => x.id === log.id) ?? log}
          onClose={() => setLog(null)}
        />
      )}
    </div>
  );
}

function AutomationBuilder({
  initial,
  onClose,
  onSave,
}: {
  initial: Automation;
  onClose: () => void;
  onSave: (a: Automation) => void;
}) {
  const { comms, audience } = useCommsEngine();
  const [a, setA] = useState(initial);
  const [tried, setTried] = useState(false);
  const errors = automationErrors(a);
  const def = triggerDef(a.trigger);
  const msgs = comms.messages.filter((m) => !m.archived);
  const toggleCh = (c: Ch) =>
    setA({
      ...a,
      channels: a.channels.includes(c) ? a.channels.filter((x) => x !== c) : [...a.channels, c],
    });
  const move = (i: number, d: -1 | 1) => {
    const ch = [...a.channels];
    [ch[i], ch[i + d]] = [ch[i + d], ch[i]];
    setA({ ...a, channels: ch });
  };
  const submit = (status: Automation["status"]) => {
    setTried(true);
    if (status !== "Draft" && errors.length) return;
    if (!a.name.trim()) return;
    onSave({ ...a, status });
  };
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={
        comms.automations.some((x) => x.id === a.id) ? `Edit “${initial.name}”` : "Build automation"
      }
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="ghost" onClick={() => submit("Draft")}>
            Save as draft
          </Btn>
          <Btn
            variant="primary"
            icon={Icon.check}
            onClick={() => submit(a.status === "Paused" ? "Paused" : "Active")}
          >
            {a.status === "Paused" ? "Save (paused)" : "Save & activate"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {tried && errors.length > 0 && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-[12.5px] text-rose-800"
          >
            <ul className="list-disc pl-4">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        <Field label="Name">
          <Input
            value={a.name}
            onChange={(e) => setA({ ...a, name: e.target.value })}
            placeholder="e.g. Low occupancy · Bolivar Saturday"
          />
        </Field>
        <ol className="space-y-3">
          <Step n={1} title="Trigger">
            <div className="grid sm:grid-cols-2 gap-2.5">
              <Field label="When">
                <Select
                  value={a.trigger}
                  onChange={(e) => {
                    const t = e.target.value as TriggerId;
                    setA({
                      ...a,
                      trigger: t,
                      param: triggerDef(t).param?.default ?? 0,
                      ...(t === "low_occupancy"
                        ? {
                            zoneId: a.zoneId ?? "bolivar",
                            targetWeekday: a.targetWeekday ?? 6,
                            check: a.check ?? { weekday: 4, time: "10:00" },
                          }
                        : {}),
                    });
                  }}
                  options={TRIGGERS.map((t) => ({ v: t.id, l: t.label }))}
                />
              </Field>
              {def.param && (
                <Field label={`${def.param.label} (${def.param.unit})`}>
                  <Input
                    type="number"
                    min={0}
                    value={a.param}
                    onChange={(e) =>
                      setA({ ...a, param: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </Field>
              )}
            </div>
            <div className="text-[12px] text-slate-500 mt-1">{def.help}</div>
            {a.trigger === "low_occupancy" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
                <Field label="Zone">
                  <Select
                    value={a.zoneId ?? ""}
                    onChange={(e) => setA({ ...a, zoneId: e.target.value })}
                    options={ZONES.map((z) => ({ v: z.id, l: z.name }))}
                  />
                </Field>
                <Field label="Day forecast">
                  <Select
                    value={String(a.targetWeekday ?? 6)}
                    onChange={(e) => setA({ ...a, targetWeekday: Number(e.target.value) })}
                    options={WEEKDAYS.map((d, i) => ({ v: String(i), l: d }))}
                  />
                </Field>
                <Field label="Check on">
                  <Select
                    value={String(a.check?.weekday ?? 4)}
                    onChange={(e) =>
                      setA({
                        ...a,
                        check: { time: a.check?.time ?? "10:00", weekday: Number(e.target.value) },
                      })
                    }
                    options={WEEKDAYS.map((d, i) => ({ v: String(i), l: d }))}
                  />
                </Field>
                <Field label="At">
                  <Input
                    type="time"
                    value={a.check?.time ?? "10:00"}
                    onChange={(e) =>
                      setA({
                        ...a,
                        check: { weekday: a.check?.weekday ?? 4, time: e.target.value },
                      })
                    }
                  />
                </Field>
              </div>
            )}
          </Step>
          <Step n={2} title="Only for guests who…">
            <div className="grid sm:grid-cols-3 gap-2.5">
              <Field label="Are in segment">
                <Select
                  value={a.conditions.segmentId ?? ""}
                  onChange={(e) =>
                    setA({
                      ...a,
                      conditions: { ...a.conditions, segmentId: e.target.value || undefined },
                    })
                  }
                  options={[
                    { v: "", l: "Any guest" },
                    ...audience.segments.map((s) => ({ v: s.id, l: s.name })),
                  ]}
                />
              </Field>
              <Field label="Speak">
                <Select
                  value={a.conditions.language ?? ""}
                  onChange={(e) =>
                    setA({
                      ...a,
                      conditions: { ...a.conditions, language: e.target.value || undefined },
                    })
                  }
                  options={[
                    { v: "", l: "Any language" },
                    ...LANGUAGES_CRM.map((l) => ({ v: l, l: l.toUpperCase() })),
                  ]}
                />
              </Field>
              <Field label="Favour zone">
                <Select
                  value={a.conditions.zone ?? ""}
                  onChange={(e) =>
                    setA({
                      ...a,
                      conditions: { ...a.conditions, zone: e.target.value || undefined },
                    })
                  }
                  options={[
                    { v: "", l: "Any zone" },
                    ...ZONES.map((z) => ({ v: z.name, l: z.name })),
                  ]}
                />
              </Field>
            </div>
            <div className="text-[12px] text-slate-500 mt-1">
              Channel consent is always checked; guests with an open refund are skipped when that
              rule is on.
            </div>
          </Step>
          <Step n={3} title="Wait">
            <div className="max-w-[200px]">
              <Field label="Delay after trigger (hours)">
                <Input
                  type="number"
                  min={0}
                  value={a.delayHours}
                  onChange={(e) =>
                    setA({ ...a, delayHours: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </Field>
            </div>
          </Step>
          <Step n={4} title="Send">
            <ul className="space-y-2">
              {a.steps.map((s, i) => (
                <li key={i} className="grid sm:grid-cols-[1fr_140px_auto] gap-2 items-end">
                  <Field label={i === 0 ? "Message" : `Then, message ${i + 1}`}>
                    <Select
                      value={s.messageId}
                      onChange={(e) =>
                        setA({
                          ...a,
                          steps: a.steps.map((x, j) =>
                            j === i ? { ...x, messageId: e.target.value } : x,
                          ),
                        })
                      }
                      options={[
                        { v: "", l: "Pick a saved message" },
                        ...msgs.map((m) => ({
                          v: m.id,
                          l: `${m.name}${m.status === "Draft" ? " (draft)" : ""}`,
                        })),
                      ]}
                    />
                  </Field>
                  {i > 0 ? (
                    <Field label="Days later">
                      <Input
                        type="number"
                        min={1}
                        value={s.waitDays}
                        onChange={(e) =>
                          setA({
                            ...a,
                            steps: a.steps.map((x, j) =>
                              j === i
                                ? { ...x, waitDays: Math.max(1, Number(e.target.value) || 1) }
                                : x,
                            ),
                          })
                        }
                      />
                    </Field>
                  ) : (
                    <span />
                  )}
                  {i > 0 ? (
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon={Icon.trash}
                      aria-label={`Remove step ${i + 1}`}
                      onClick={() => setA({ ...a, steps: a.steps.filter((_, j) => j !== i) })}
                    />
                  ) : (
                    <span />
                  )}
                </li>
              ))}
            </ul>
            {a.steps.length < 3 && (
              <button
                type="button"
                onClick={() => setA({ ...a, steps: [...a.steps, { messageId: "", waitDays: 3 }] })}
                className="mt-2 text-[12.5px] font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
              >
                <Icon.plus size={12} /> Add a follow-up step
              </button>
            )}
            <div className="mt-3">
              <div className="text-[12px] font-semibold text-slate-700 mb-1">
                Channel, in fallback order
              </div>
              <ol className="flex flex-wrap gap-1.5">
                {a.channels.map((c, i) => (
                  <li
                    key={c}
                    className="inline-flex items-center gap-1 rounded-xl ring-1 ring-teal-500 bg-teal-50 pl-2.5 pr-1 py-1 text-[12.5px] font-semibold text-teal-800"
                  >
                    {i + 1}. {CH_LABEL[c]}
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={`Move ${CH_LABEL[c]} earlier`}
                      className="w-6 h-6 grid place-items-center rounded-md hover:bg-teal-100 disabled:opacity-30"
                    >
                      <Icon.chevL size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCh(c)}
                      aria-label={`Remove ${CH_LABEL[c]}`}
                      className="w-6 h-6 grid place-items-center rounded-md hover:bg-teal-100"
                    >
                      <Icon.x size={12} />
                    </button>
                  </li>
                ))}
                {CH_ORDER.filter((c) => !a.channels.includes(c)).map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => toggleCh(c)}
                      className="rounded-xl ring-1 ring-slate-200 bg-white px-2.5 py-1 text-[12.5px] font-semibold text-slate-500 hover:ring-slate-400"
                    >
                      + {CH_LABEL[c]}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="text-[12px] text-slate-500 mt-1">
                Each guest gets the first channel they consented to (e.g. Push, else Viber, else
                SMS).
              </div>
            </div>
          </Step>
          <Step n={5} title="Active window">
            <div className="grid grid-cols-2 gap-2.5 max-w-sm">
              <Field label="From">
                <DateInput
                  
                  value={a.window.from}
                  onChange={(v) => setA({ ...a, window: { ...a.window, from: v } })}
                />
              </Field>
              <Field label="Until">
                <DateInput
                  
                  value={a.window.to}
                  onChange={(v) => setA({ ...a, window: { ...a.window, to: v } })}
                />
              </Field>
            </div>
          </Step>
        </ol>
      </div>
    </Modal>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-navy-900 text-white text-[11px] font-bold grid place-items-center">
          {n}
        </span>
        <span className="font-semibold text-navy-900 text-[13.5px]">{title}</span>
      </div>
      {children}
    </li>
  );
}

function SimulateModal({
  a,
  forecast,
  onClose,
  onRun,
}: {
  a: Automation;
  forecast?: { target: string; value: number; zone: string };
  onClose: () => void;
  onRun: (assume?: number) => string;
}) {
  const { comms } = useApp();
  const [mode, setMode] = useState<"live" | "assume">("live");
  const [assume, setAssume] = useState(42);
  const [out, setOut] = useState<string | null>(null);
  return (
    <Modal
      open
      onClose={onClose}
      title={`Simulate · ${a.name}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Close
          </Btn>
          <Btn
            variant="primary"
            icon={Icon.bolt}
            onClick={() => setOut(onRun(forecast && mode === "assume" ? assume : undefined))}
          >
            Fire trigger now
          </Btn>
        </>
      }
    >
      <div className="space-y-3 text-[13px]">
        <div className="text-slate-600">
          Demo clock <b className="text-navy-900">{fmtAt(comms.clock)}</b> ·{" "}
          {triggerSummary(a, forecast?.zone)}
          {a.status !== "Active" && (
            <>
              {" "}
              · <Badge tone="amber">{a.status}</Badge>
            </>
          )}
        </div>
        {forecast && (
          <fieldset className="rounded-xl ring-1 ring-slate-200 p-3 space-y-2">
            <legend className="px-1 text-[12px] font-semibold text-slate-700">Forecast used</legend>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "live"} onChange={() => setMode("live")} /> Live
              forecast: {forecast.zone} on {forecast.target} is <b>{forecast.value}%</b>{" "}
              {forecast.value < a.param ? "(below the threshold)" : `(not below ${a.param}%)`}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "assume"} onChange={() => setMode("assume")} />{" "}
              Demo: assume{" "}
              <input
                type="number"
                aria-label="Assumed forecast %"
                min={0}
                max={100}
                value={assume}
                onChange={(e) => setAssume(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="w-16 rounded-md ring-1 ring-slate-300 px-1.5 py-0.5"
              />
              %
            </label>
          </fieldset>
        )}
        {out && (
          <div
            role="status"
            className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-navy-900"
          >
            {out}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ActivityDrawer({ a, onClose }: { a: Automation; onClose: () => void }) {
  const { comms, audience } = useCommsEngine();
  const entries = comms.log
    .filter((e) => e.sourceId === a.id)
    .sort((x, y) => y.at.localeCompare(x.at));
  const name = (id: number) => audience.guests.find((g) => g.id === id)?.name ?? `Guest #${id}`;
  return (
    <Drawer
      open
      onClose={onClose}
      label={`Activity · ${a.name}`}
      title={
        <div>
          <div className="font-display font-bold text-navy-900 text-lg">{a.name}</div>
          <div className="text-[12px] text-slate-500">
            {a.stats.sent} sent · {a.stats.skipped} skipped · {a.stats.conversions} conversions
          </div>
        </div>
      }
    >
      {(a.checks ?? []).length > 0 && (
        <section className="mb-4">
          <h3 className="font-semibold text-navy-900 mb-1.5">Condition checks</h3>
          <ul className="space-y-1 text-[12.5px]">
            {[...(a.checks ?? [])].reverse().map((c, i) => (
              <li key={i} className="rounded-lg ring-1 ring-slate-200 px-2.5 py-1.5">
                <span className="text-slate-500">{fmtAt(c.at)}</span> · {c.note}
                {c.sent ? ` · ${c.sent} sent` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
      <h3 className="font-semibold text-navy-900 mb-1.5">Messages</h3>
      {entries.length === 0 ? (
        <EmptyState
          compact
          icon={Icon.inbox}
          title="Nothing sent yet"
          body="Use “Simulate trigger” to fire it with sample events."
        />
      ) : (
        <ul className="space-y-1.5">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-2 rounded-lg ring-1 ring-slate-200 px-2.5 py-1.5 text-[12.5px]"
            >
              <Badge
                tone={e.outcome === "Delivered" ? (e.at > comms.clock ? "blue" : "green") : "amber"}
              >
                {e.outcome === "Delivered" && e.at > comms.clock ? "Queued" : e.outcome}
              </Badge>
              <div className="min-w-0 flex-1">
                <b className="text-navy-900">{name(e.guestId)}</b>
                {e.channel && <> · {CH_LABEL[e.channel]}</>}
                <div className="text-slate-500 truncate">{e.title}</div>
              </div>
              <span className="text-[11px] text-slate-500 shrink-0 tnum">{fmtAt(e.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
