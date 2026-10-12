import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Field, Input, Modal, Select } from "../../components/ui";
import type { GuestFacts } from "../../data/guests";
import type { FieldDef, Op, Rule, Segment } from "../../domain/segments";
import {
  OPS,
  SEGMENT_COLORS,
  SEGMENT_FIELDS,
  fieldOf,
  inSegment,
  ruleError,
} from "../../domain/segments";
import { DEMO_TODAY } from "../../domain/period";

type Guest = GuestFacts & { name: string };

/* ---------- Segment builder (AENR-474) ----------
   Name + colour, dynamic or static, AND / OR over field · operator · value
   rows, with a live preview of who matches. */
export function SegmentBuilder({
  initial,
  guests,
  extraFields = [],
  tagOptions,
  onClose,
  onSave,
}: {
  initial: Segment | null;
  guests: Guest[];
  extraFields?: FieldDef[];
  tagOptions: string[];
  onClose: () => void;
  onSave: (s: Segment) => void;
}) {
  const fields = [
    ...SEGMENT_FIELDS.map((f) => (f.key === "tags" ? { ...f, options: tagOptions } : f)),
    ...extraFields,
  ];
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? SEGMENT_COLORS[0]);
  const [kind, setKind] = useState<Segment["kind"]>(
    initial?.kind === "static" ? "static" : "dynamic",
  );
  const [match, setMatch] = useState<Segment["match"]>(initial?.match ?? "all");
  const [rules, setRules] = useState<Rule[]>(
    initial?.rules.length ? initial.rules : [{ field: "spend", op: "gt", a: 300 }],
  );
  const [touched, setTouched] = useState(false);

  const draft: Segment = {
    id: initial?.id ?? "draft",
    name,
    color,
    kind: "dynamic",
    match,
    rules,
    updatedAt: "",
  };
  const matching = guests.filter((g) => inSegment(g, draft, DEMO_TODAY, extraFields));
  const errors = rules.map((r) => ruleError(r, fieldOf(r.field, extraFields)));
  const nameErr = !name.trim() ? "Give the segment a name." : "";
  const valid = !nameErr && rules.length > 0 && errors.every((e) => !e);

  const setRule = (i: number, patch: Partial<Rule>) =>
    setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const changeField = (i: number, key: string) => {
    const f = fieldOf(key, extraFields)!;
    setRule(i, { field: key, op: OPS[f.type][0].v, a: undefined, b: undefined, values: [] });
  };
  const save = () => {
    setTouched(true);
    if (!valid) return;
    onSave({
      id: initial?.id && !initial.system ? initial.id : `seg-${Date.now().toString(36)}`,
      name: name.trim(),
      color,
      kind,
      match,
      rules,
      members: kind === "static" ? matching.map((g) => g.id) : undefined,
      updatedAt: new Date().toISOString(),
    });
  };
  const groups = [...new Set(fields.map((f) => f.group))];

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={initial ? `Edit segment · ${initial.name}` : "New segment"}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" icon={Icon.check} onClick={save}>
            Save segment
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <Field
            label="Name"
            hint={touched && nameErr ? <span className="text-rose-700">{nameErr}</span> : undefined}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lapsed high-spenders"
              aria-invalid={touched && !!nameErr}
            />
          </Field>
          <fieldset>
            <legend className="text-[12px] font-semibold text-slate-700 mb-1">Colour</legend>
            <div className="flex gap-1.5">
              {SEGMENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Colour ${c}`}
                  aria-pressed={color === c}
                  className={`w-7 h-7 rounded-full ring-2 transition ${color === c ? "ring-navy-900 scale-110" : "ring-white"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <fieldset className="rounded-xl ring-1 ring-slate-200 p-3">
            <legend className="text-[12px] font-semibold text-slate-700 px-1">Membership</legend>
            {(["dynamic", "static"] as const).map((k) => (
              <label key={k} className="flex items-start gap-2 text-sm py-1 cursor-pointer">
                <input
                  type="radio"
                  name="seg-kind"
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="mt-1 accent-teal-600"
                />
                <span className="font-semibold text-navy-900">
                  {k === "dynamic" ? "Dynamic" : "Static"}
                  <span className="block font-normal text-[12px] text-slate-500">
                    {k === "dynamic"
                      ? "Guests join and leave automatically as they match the rules."
                      : "A fixed list: the guests matching right now."}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset className="rounded-xl ring-1 ring-slate-200 p-3">
            <legend className="text-[12px] font-semibold text-slate-700 px-1">Match</legend>
            {(["all", "any"] as const).map((m) => (
              <label key={m} className="flex items-start gap-2 text-sm py-1 cursor-pointer">
                <input
                  type="radio"
                  name="seg-match"
                  checked={match === m}
                  onChange={() => setMatch(m)}
                  className="mt-1 accent-teal-600"
                />
                <span className="font-semibold text-navy-900">
                  {m === "all" ? "All conditions (AND)" : "Any condition (OR)"}
                </span>
              </label>
            ))}
          </fieldset>
        </div>

        <div>
          <div className="text-[12px] font-semibold text-slate-700 mb-1.5">Conditions</div>
          <div className="space-y-2">
            {rules.map((r, i) => {
              const f = fieldOf(r.field, extraFields)!;
              const err = touched ? errors[i] : null;
              return (
                <div key={i} className="rounded-xl ring-1 ring-slate-200 bg-white/70 p-2.5">
                  <div className="flex flex-wrap items-end gap-2">
                    {i > 0 && <Badge tone="slate">{match === "all" ? "AND" : "OR"}</Badge>}
                    <div className="w-48">
                      <Select
                        aria-label={`Condition ${i + 1} field`}
                        value={r.field}
                        onChange={(e) => changeField(i, e.target.value)}
                      >
                        {groups.map((gname) => (
                          <optgroup key={gname} label={gname}>
                            {fields
                              .filter((x) => x.group === gname)
                              .map((x) => (
                                <option key={x.key} value={x.key}>
                                  {x.label}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </Select>
                    </div>
                    <div className="w-44">
                      <Select
                        aria-label={`Condition ${i + 1} operator`}
                        value={r.op}
                        onChange={(e) => setRule(i, { op: e.target.value as Op })}
                        options={OPS[f.type].map((o) => ({ v: o.v, l: o.l }))}
                      />
                    </div>
                    {(f.type === "number" || (f.type === "date" && r.op === "withinDays")) && (
                      <>
                        <div className="w-28">
                          <Input
                            type="number"
                            aria-label={`Condition ${i + 1} value`}
                            value={r.a ?? ""}
                            onChange={(e) => setRule(i, { a: e.target.value })}
                            placeholder={f.unit ?? ""}
                          />
                        </div>
                        {r.op === "between" && (
                          <div className="w-28">
                            <Input
                              type="number"
                              aria-label={`Condition ${i + 1} maximum`}
                              value={r.b ?? ""}
                              onChange={(e) => setRule(i, { b: e.target.value })}
                            />
                          </div>
                        )}
                      </>
                    )}
                    {f.type === "date" && r.op !== "withinDays" && (
                      <div className="w-44">
                        <Input
                          type="date"
                          aria-label={`Condition ${i + 1} date`}
                          value={String(r.a ?? "")}
                          onChange={(e) => setRule(i, { a: e.target.value })}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setRules((rs) => rs.filter((_, j) => j !== i))}
                      aria-label={`Remove condition ${i + 1}`}
                      className="ml-auto w-9 h-9 grid place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
                    >
                      <Icon.trash size={15} />
                    </button>
                  </div>
                  {(f.type === "enum" || f.type === "multi") && (
                    <div
                      className="flex flex-wrap gap-1.5 mt-2"
                      role="group"
                      aria-label={`${f.label} values`}
                    >
                      {(f.options ?? []).map((o) => {
                        const on = (r.values ?? []).includes(o);
                        return (
                          <button
                            key={o}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setRule(i, {
                                values: on
                                  ? (r.values ?? []).filter((x) => x !== o)
                                  : [...(r.values ?? []), o],
                              })
                            }
                            className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold ring-1 transition ${on ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 text-navy-900 hover:ring-slate-300"}`}
                          >
                            {o}
                          </button>
                        );
                      })}
                      {!(f.options ?? []).length && (
                        <span className="text-[12px] text-slate-500">
                          No values yet — create tags first.
                        </span>
                      )}
                    </div>
                  )}
                  {err && (
                    <div role="alert" className="text-[12px] text-rose-700 mt-1">
                      {err}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Btn
            size="sm"
            variant="outline"
            icon={Icon.plus}
            className="mt-2"
            onClick={() => setRules((rs) => [...rs, { field: "visits", op: "gt", a: 5 }])}
          >
            Add condition
          </Btn>
          {touched && rules.length === 0 && (
            <div role="alert" className="text-[12px] text-rose-700 mt-1">
              Add at least one condition.
            </div>
          )}
        </div>

        <div
          className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2.5"
          aria-live="polite"
        >
          <div className="text-sm">
            <b className="text-navy-900 tnum">{matching.length}</b> of {guests.length} guests match
            {kind === "static" ? " — they'll be saved as a fixed list" : ""}.
          </div>
          {matching.length > 0 && (
            <div className="text-[12px] text-slate-500 mt-0.5 truncate">
              {matching
                .slice(0, 6)
                .map((g) => g.name)
                .join(", ")}
              {matching.length > 6 ? "…" : ""}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
