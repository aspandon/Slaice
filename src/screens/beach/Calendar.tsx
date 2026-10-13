import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, Input, Select, Toggle, DateInput } from "../../components/ui";
import { useApp } from "../../app/store";
import { ZONES, zoneLayout } from "../../data/beach";
import { dayStats } from "../../data/analytics";
import { DemandPanel } from "./Demand";
import {
  RESTRICTION_LABEL,
  RULE_KIND_LABEL,
  resolvePrice,
  restrictionApplies,
  restrictionBadge,
  ruleEffectLabel,
} from "../../domain/pricing";
import { addDays } from "../../domain/period";
import type {
  CalendarState,
  PriceRule,
  PriceRuleMode,
  Restriction,
  RestrictionKind,
} from "../../domain/types";

/* ============ Pricing calendar & restrictions (AENR-511) ============
   A month per zone: each day shows the effective price per price category,
   expected occupancy and restriction badges. Click a day to see how its price
   is built; drag (or Shift+arrows) to select days and change prices, add
   restrictions, apply a seasonal template or copy a week forward. Every change
   is a rule or restriction stored for the tenant, with one-step Undo. */

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MON = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const dow = (s: string) => new Date(`${s}T12:00:00`).getDay();
let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}${++seq}`;
type Snapshot = { rules: PriceRule[]; cal: CalendarState };

const fmtDay = (d: string) =>
  `${WD[(dow(d) + 6) % 7]} ${Number(d.slice(8))} ${MON[Number(d.slice(5, 7)) - 1].slice(0, 3)}`;
/** Occupancy tint — paired with the % label, so colour is never the only signal. */
const heat = (o: number | null) =>
  o === null ? "bg-white/80" : o >= 85 ? "bg-rose-50" : o >= 60 ? "bg-amber-50" : "bg-white/80";

/* AENR-601: the calendar is for changing a price — tap a day (or drag over
   several), type the price, Enter. Rules, templates, demand pricing and the
   rule list live in the Advanced tab (PricingAdvanced below). */
export function PricingCalendar({
  zoneId,
  setZoneId,
}: {
  zoneId: string;
  setZoneId: (z: string) => void;
}) {
  const { toast, priceRules, setPriceRules, calendar, setCalendar, beachPricing, beachLayout } =
    useApp();
  const [month, setMonth] = useState({ y: 2026, m: 7 });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState(iso(2026, 7, 1));
  const [history, setHistory] = useState<Snapshot[]>([]);
  const drag = useRef<string | null>(null);
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  const cats = beachPricing.categories.filter((c) => c.zoneId === zoneId);
  const slots = beachLayout[zoneId] ?? zoneLayout(zone);
  const sample = (catId: string) =>
    slots.find((s) => s.cat === catId) ?? { id: "_", price: zone.from, cat: catId };

  /* ---- Days of the month (Mon-first grid) ---- */
  const days = useMemo(() => {
    const n = new Date(month.y, month.m + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => iso(month.y, month.m, i + 1));
  }, [month]);
  const lead = (dow(days[0]) + 6) % 7;

  /* ---- Edits with undo ---- */
  const snap = () => setHistory((h) => [...h.slice(-29), { rules: priceRules, cal: calendar }]);
  const undoable = (msg: string) => {
    const prev = { rules: priceRules, cal: calendar };
    toast(msg, {
      tone: "success",
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          setPriceRules(prev.rules);
          setCalendar(prev.cal);
          setHistory((h) => h.slice(0, -1));
        },
      },
    });
  };
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setPriceRules(last.rules);
    setCalendar(last.cal);
    setHistory((h) => h.slice(0, -1));
    toast("Undone.");
  };
  const addRule = (r: PriceRule) => {
    snap();
    setPriceRules([...priceRules, r]);
  };
  const addRestriction = (r: Restriction) => {
    snap();
    setCalendar({ ...calendar, restrictions: [...calendar.restrictions, r] });
  };

  const priceFor = (catId: string, d: string) =>
    resolvePrice(sample(catId), zoneId, d, beachPricing, priceRules).price;
  const occ = (d: string) => {
    const s = dayStats(d);
    return s.open ? Math.round(((s.setsSold[zoneId] ?? 0) / zone.total) * 100) : null;
  };
  // Booking windows are relative to the booking day, so they're listed once, not on every date.
  const restr = (d: string) =>
    calendar.restrictions.filter(
      (r) => restrictionApplies(r, zoneId, d) && (r.kind !== "window" || !!r.dates?.length),
    );
  const selDays = days
    .filter((d) => sel.has(d))
    .concat([...sel].filter((d) => !days.includes(d)))
    .sort();

  /* ---- Selection: drag, click, shift-click, keyboard ---- */
  const range = (a: string, b: string) => {
    const [f, t] = a < b ? [a, b] : [b, a];
    const out: string[] = [];
    for (let d = f; d <= t; d = addDays(d, 1)) out.push(d);
    return out;
  };
  const onDown = (d: string, e: React.MouseEvent) => {
    if (e.shiftKey && focus) setSel(new Set(range(focus, d)));
    else if (e.metaKey || e.ctrlKey)
      setSel((s) => {
        const n = new Set(s);
        if (n.has(d)) n.delete(d);
        else n.add(d);
        return n;
      });
    else {
      drag.current = d;
      setSel(new Set([d]));
    }
    setFocus(d);
  };
  const onEnter = (d: string) => {
    if (drag.current) setSel(new Set(range(drag.current, d)));
  };
  useEffect(() => {
    const up = () => (drag.current = null);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);
  const onKey = (d: string, e: React.KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) {
      e.preventDefault();
      const n = addDays(d, step);
      if (!days.includes(n)) return;
      setFocus(n);
      cells.current.get(n)?.focus();
      if (e.shiftKey) setSel((s) => new Set([...s, ...range(d, n)]));
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setSel((s) => {
        const x = new Set(s);
        if (x.has(d)) x.delete(d);
        else x.add(d);
        return x;
      });
    } else if (e.key === "Escape") setSel(new Set());
  };

  /* ---- Bulk actions ---- */
  const [pc, setPc] = useState({
    mode: "addPct" as PriceRuleMode,
    amount: "20",
    label: "",
    cats: [] as string[],
  });
  const [rs, setRs] = useState({
    kind: "minDays" as RestrictionKind,
    value: "2",
    time: "11:00",
    label: "",
  });
  const [copyUntil, setCopyUntil] = useState(iso(2026, 7, 31));
  const applyPrice = () => {
    const amount = Number(pc.amount);
    addRule({
      id: uid("r"),
      label:
        pc.label.trim() ||
        `${pc.mode === "set" ? `€${amount}` : pc.mode === "addPct" ? `${amount > 0 ? "+" : ""}${amount}%` : `${amount > 0 ? "+" : ""}€${amount}`} · ${selDays.length} days`,
      zone: zoneId,
      from: selDays[0],
      to: selDays[selDays.length - 1],
      days: "all",
      dates: selDays,
      mode: pc.mode,
      amount,
      enabled: true,
      cats: pc.cats.length ? pc.cats : undefined,
    });
    toast(
      `Price change applied to ${selDays.length} day${selDays.length === 1 ? "" : "s"} in ${zone.name}.`,
      { tone: "success" },
    );
  };
  const applyRestriction = () => {
    const value = Number(rs.value);
    addRestriction({
      id: uid("rs"),
      label:
        rs.label.trim() ||
        (rs.kind === "closed"
          ? "Beach closed"
          : `${RESTRICTION_LABEL[rs.kind]}${rs.kind === "cutoff" ? ` ${rs.time}` : ` ${value}`}`),
      zone: zoneId,
      from: selDays[0],
      to: selDays[selDays.length - 1],
      days: "all",
      dates: selDays,
      kind: rs.kind,
      value: rs.kind === "cutoff" || rs.kind === "closed" ? undefined : value,
      time: rs.kind === "cutoff" ? rs.time : undefined,
      enabled: true,
    });
    toast(
      `${RESTRICTION_LABEL[rs.kind]} added to ${selDays.length} day${selDays.length === 1 ? "" : "s"}.`,
      { tone: "success" },
    );
  };
  const applyTemplate = (id: string) => {
    const t = calendar.templates.find((x) => x.id === id);
    if (!t) return;
    addRule({
      id: uid("r"),
      label: `${t.name} season (${t.pct > 0 ? "+" : ""}${t.pct}%)`,
      zone: zoneId,
      from: selDays[0],
      to: selDays[selDays.length - 1],
      days: "all",
      dates: selDays,
      mode: "addPct",
      amount: t.pct,
      enabled: true,
    });
    toast(`${t.name} template applied to ${selDays.length} days.`, { tone: "success" });
  };
  /** Copy everything set on the selected week (date-list rules and restrictions) to each following week. */
  const copyWeek = () => {
    const week = new Set(selDays);
    const weeks: number[] = [];
    for (let k = 1; addDays(selDays[0], 7 * k) <= copyUntil; k++) weeks.push(k);
    if (!weeks.length) return;
    const shift = (list: string[]) =>
      weeks
        .flatMap((k) => list.filter((d) => week.has(d)).map((d) => addDays(d, 7 * k)))
        .filter((d) => d <= copyUntil);
    const newRules = priceRules
      .filter((r) => r.zone === zoneId && r.dates?.length && r.dates.every((d) => week.has(d)))
      .map((r) => {
        const ds = shift(r.dates!);
        return {
          ...r,
          id: uid("r"),
          label: `${r.label} (copied)`,
          dates: ds,
          from: ds[0],
          to: ds[ds.length - 1],
        };
      })
      .filter((r) => r.dates.length);
    const newRs = calendar.restrictions
      .filter((r) => r.zone === zoneId && r.dates?.length && r.dates.every((d) => week.has(d)))
      .map((r) => {
        const ds = shift(r.dates!);
        return {
          ...r,
          id: uid("rs"),
          label: `${r.label} (copied)`,
          dates: ds,
          from: ds[0],
          to: ds[ds.length - 1],
        };
      })
      .filter((r) => r.dates.length);
    snap();
    setPriceRules([...priceRules, ...newRules]);
    setCalendar({ ...calendar, restrictions: [...calendar.restrictions, ...newRs] });
    toast(
      `Copied ${newRules.length} price change${newRules.length === 1 ? "" : "s"} and ${newRs.length} restriction${newRs.length === 1 ? "" : "s"} to ${weeks.length} week${weeks.length === 1 ? "" : "s"}.`,
      { tone: "success" },
    );
  };

  /* ---- Quick price edit (AENR-601): one "set" rule per changed category ---- */
  const quickId = (catId: string) => `q-${zoneId}-${catId}-${selDays.join(",")}`;
  const applyQuick = (vals: Record<string, string>) => {
    const changed = cats.filter((c) => {
      const n = Number(vals[c.id]);
      return n > 0 && selDays.some((d) => priceFor(c.id, d) !== n);
    });
    if (!changed.length || !selDays.length) return;
    const what = selDays.length === 1 ? fmtDay(selDays[0]) : `${selDays.length} days`;
    const ids = new Set(changed.map((c) => quickId(c.id)));
    const next: PriceRule[] = changed.map((c) => ({
      id: quickId(c.id),
      label: `${c.code} €${Number(vals[c.id])} · ${what}`,
      zone: zoneId,
      from: selDays[0],
      to: selDays[selDays.length - 1],
      days: "all",
      dates: selDays,
      mode: "set",
      amount: Number(vals[c.id]),
      enabled: true,
      cats: [c.id],
    }));
    undoable(`Price changed for ${what} in ${zone.name}.`);
    snap();
    // Editing the same days again replaces the earlier quick edit instead of stacking rules.
    setPriceRules([...priceRules.filter((r) => !ids.has(r.id)), ...next]);
  };

  /* ---- Explanation for the focused day ---- */
  const conditional = priceRules.filter(
    (r) =>
      r.enabled && (r.kind ?? "standard") !== "standard" && (r.zone === "all" || r.zone === zoneId),
  );
  const fromPrice = (d: string) => Math.min(...cats.map((c) => priceFor(c.id, d)));

  const explain = (
    <div>
      <div className="text-[12px] text-slate-500 mb-2">How the price is built (highest precedence last).</div>
      <ul className="space-y-2">
        {cats.map((c) => {
          const t = resolvePrice(sample(c.id), zoneId, focus, beachPricing, priceRules);
          return (
            <li key={c.id} className="rounded-lg ring-1 ring-slate-200 px-2.5 py-2 text-[12px]">
              <div className="flex items-center gap-1.5 font-semibold text-navy-900">
                <i className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                {c.code} · {c.name}
                <span className="ml-auto tnum">€{t.price}</span>
              </div>
              <ol className="mt-1 space-y-0.5 text-slate-600">
                {t.steps.map((st, i) => (
                  <li key={i}>
                    {i + 1}. {st}
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ul>
      {conditional.length > 0 && (
        <div className="mt-2 text-[12px] text-slate-600">
          <b className="text-navy-900">At booking time</b> also:{" "}
          {conditional
            .map(
              (r) =>
                `${RULE_KIND_LABEL[r.kind ?? "standard"]} ${ruleEffectLabel(r)} (${r.kind === "earlybird" ? `≥${r.lead} days ahead` : r.kind === "lastminute" ? `same day from ${r.after}` : `≥${r.minDays} days`})`,
            )
            .join(" · ")}
        </div>
      )}
      {restr(focus).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {restr(focus).map((r) => (
            <Badge key={r.id} tone="amber">
              {r.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  const moreTools = (
    <details className="group border-t border-slate-100 pt-3">
      <summary className="cursor-pointer text-[12.5px] font-semibold text-teal-700 hover:text-teal-800 list-none flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
        <Icon.chevR size={13} className="transition group-open:rotate-90" /> More for{" "}
        {sel.size === 1 ? "this day" : "these days"}: % change, restriction, template, copy week
      </summary>
      <div className="space-y-4 mt-3">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(pc.amount) || pc.mode !== "addPct") applyPrice();
          }}
        >
          <div className="text-[12.5px] font-semibold text-navy-900">Price change</div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Change">
              <Select
                value={pc.mode}
                onChange={(e) => setPc((x) => ({ ...x, mode: e.target.value as PriceRuleMode }))}
                options={[
                  { v: "addPct", l: "± %" },
                  { v: "addAbs", l: "± €" },
                  { v: "set", l: "Set to €" },
                ]}
              />
            </Field>
            <Field label="Amount">
              <Input
                type="number"
                value={pc.amount}
                onChange={(e) => setPc((x) => ({ ...x, amount: e.target.value }))}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2 text-[12px]">
            {cats.map((c) => (
              <label key={c.id} className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-teal-600"
                  checked={pc.cats.includes(c.id)}
                  onChange={(e) =>
                    setPc((x) => ({
                      ...x,
                      cats: e.target.checked ? [...x.cats, c.id] : x.cats.filter((y) => y !== c.id),
                    }))
                  }
                />
                {c.code} {c.name}
              </label>
            ))}
            <span className="text-slate-500">{pc.cats.length ? "" : "(all categories)"}</span>
          </div>
          <Field label="Name (optional)">
            <Input
              value={pc.label}
              onChange={(e) => setPc((x) => ({ ...x, label: e.target.value }))}
              placeholder="e.g. August peak"
            />
          </Field>
          <Btn
            type="submit"
            size="sm"
            variant="outline"
            disabled={pc.mode === "set" ? !(Number(pc.amount) > 0) : !Number(pc.amount)}
          >
            Apply to {sel.size} day{sel.size === 1 ? "" : "s"}
          </Btn>
        </form>
        <form
          className="space-y-2 border-t border-slate-100 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            applyRestriction();
          }}
        >
          <div className="text-[12.5px] font-semibold text-navy-900">Restriction</div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type">
              <Select
                value={rs.kind}
                onChange={(e) => setRs((x) => ({ ...x, kind: e.target.value as RestrictionKind }))}
                options={(Object.keys(RESTRICTION_LABEL) as RestrictionKind[]).map((k) => ({
                  v: k,
                  l: RESTRICTION_LABEL[k],
                }))}
              />
            </Field>
            {rs.kind === "cutoff" ? (
              <Field label="Closes at">
                <Input
                  type="time"
                  value={rs.time}
                  onChange={(e) => setRs((x) => ({ ...x, time: e.target.value }))}
                />
              </Field>
            ) : rs.kind !== "closed" ? (
              <Field label={rs.kind === "window" ? "Days ahead" : "Days"}>
                <Input
                  type="number"
                  min={1}
                  value={rs.value}
                  onChange={(e) => setRs((x) => ({ ...x, value: e.target.value }))}
                />
              </Field>
            ) : (
              <div />
            )}
          </div>
          <Field label="Reason / name (optional)">
            <Input
              value={rs.label}
              onChange={(e) => setRs((x) => ({ ...x, label: e.target.value }))}
              placeholder={rs.kind === "closed" ? "e.g. Weather — beach closed" : "Shown to guests"}
            />
          </Field>
          <Btn type="submit" size="sm" variant="outline">
            Add to {sel.size} day{sel.size === 1 ? "" : "s"}
          </Btn>
        </form>
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <div className="text-[12.5px] font-semibold text-navy-900">Seasonal template</div>
          <div className="flex flex-wrap gap-1.5">
            {calendar.templates.map((t) => (
              <Btn key={t.id} size="sm" variant="ghost" onClick={() => applyTemplate(t.id)}>
                {t.name} {t.pct > 0 ? "+" : ""}
                {t.pct}%
              </Btn>
            ))}
          </div>
        </div>
        <form
          className="space-y-2 border-t border-slate-100 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            copyWeek();
          }}
        >
          <div className="text-[12.5px] font-semibold text-navy-900">Copy this week forward</div>
          <div className="text-[11.5px] text-slate-500">
            Copies the price changes and restrictions set only within the selected days to the same
            weekdays every week until:
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Field label="Until">
                <DateInput value={copyUntil} onChange={(v) => setCopyUntil(v)} />
              </Field>
            </div>
            <Btn type="submit" size="sm" variant="outline" disabled={sel.size > 7}>
              Copy
            </Btn>
          </div>
          {sel.size > 7 && <div className="text-[11.5px] text-amber-700">Select up to 7 days (one week).</div>}
        </form>
      </div>
    </details>
  );

  // The editor for the selected day(s): tap, type, Enter.
  const panel =
    sel.size > 0 ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold text-navy-900">
            {sel.size === 1 ? `${fmtDay(selDays[0])} · ${zone.name}` : `${sel.size} days · ${zone.name}`}
          </div>
          <Btn size="sm" variant="ghost" onClick={() => setSel(new Set())}>
            Done
          </Btn>
        </div>
        <QuickPrice
          key={`${zoneId}|${selDays.join(",")}|${priceRules.length}`}
          cats={cats}
          current={(catId) => {
            const ps = [...new Set(selDays.map((d) => priceFor(catId, d)))];
            return ps.length === 1 ? ps[0] : null;
          }}
          onApply={applyQuick}
        />
        {sel.size === 1 && (
          <details className="group">
            <summary className="cursor-pointer text-[12.5px] font-semibold text-slate-600 hover:text-navy-900 list-none flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              <Icon.chevR size={13} className="transition group-open:rotate-90" /> How this price is built
            </summary>
            <div className="mt-2">{explain}</div>
          </details>
        )}
        {moreTools}
      </div>
    ) : (
      <div>
        <div className="font-semibold text-navy-900 mb-1">
          {fmtDay(focus)} · {zone.name}
        </div>
        <p className="text-[12.5px] text-slate-600 mb-3">
          Tap a day to change its price. Drag across days to change several at once.
        </p>
        {explain}
      </div>
    );

  // Phones: the month as a list of weeks, with the editor opening under the tapped day.
  const weeks: string[][] = [];
  days.forEach((d) => {
    if (!weeks.length || dow(d) === 1) weeks.push([]);
    weeks[weeks.length - 1].push(d);
  });

  return (
    <div className="grid md:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
      <Card className="p-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="w-40">
            <Select
              aria-label="Zone"
              value={zoneId}
              onChange={(e) => {
                setZoneId(e.target.value);
                setSel(new Set());
              }}
              options={ZONES.map((z) => ({ v: z.id, l: z.name }))}
            />
          </div>
          <div className="flex items-center gap-1">
            <Btn
              size="sm"
              variant="ghost"
              icon={Icon.chevL}
              aria-label="Previous month"
              onClick={() => setMonth((m) => (m.m === 0 ? { y: m.y - 1, m: 11 } : { y: m.y, m: m.m - 1 }))}
            />
            <div className="font-display font-bold text-navy-900 w-32 text-center" aria-live="polite">
              {MON[month.m]} {month.y}
            </div>
            <Btn
              size="sm"
              variant="ghost"
              icon={Icon.chevR}
              aria-label="Next month"
              onClick={() => setMonth((m) => (m.m === 11 ? { y: m.y + 1, m: 0 } : { y: m.y, m: m.m + 1 }))}
            />
          </div>
          <Btn size="sm" variant="ghost" icon={Icon.arrowL} className="ml-auto" disabled={!history.length} onClick={undo}>
            Undo
          </Btn>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-[12px] text-slate-600">
          <span>
            Each day shows the lowest price (<b className="text-navy-900">from</b>) and how full it is.
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="w-2.5 h-2.5 rounded-sm bg-amber-100 ring-1 ring-amber-200" /> 60%+
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="w-2.5 h-2.5 rounded-sm bg-rose-100 ring-1 ring-rose-200" /> 85%+
          </span>
        </div>
        <div
          role="grid"
          aria-label={`${zone.name} pricing calendar, ${MON[month.m]} ${month.y}`}
          className="hidden md:grid grid-cols-7 gap-1 select-none"
        >
          {WD.map((w) => (
            <div key={w} role="columnheader" className="text-[11px] font-semibold text-slate-500 text-center py-1">
              {w}
            </div>
          ))}
          {Array.from({ length: lead }).map((_, i) => (
            <div key={`pad${i}`} />
          ))}
          {days.map((d) => {
            const r = restr(d);
            const closed = r.some((x) => x.kind === "closed");
            const o = occ(d);
            const on = sel.has(d);
            const prices = cats.map((c) => `${c.code} €${priceFor(c.id, d)}`).join(", ");
            return (
              <button
                key={d}
                ref={(el) => {
                  if (el) cells.current.set(d, el);
                }}
                type="button"
                role="gridcell"
                aria-selected={on}
                tabIndex={d === focus ? 0 : -1}
                aria-label={`${Number(d.slice(8))} ${MON[month.m]}: ${closed ? "closed" : prices}${o !== null ? `, ${o}% booked` : ""}${r.length ? `, ${r.map(restrictionBadge).join(", ")}` : ""}`}
                onMouseDown={(e) => onDown(d, e)}
                onMouseEnter={() => onEnter(d)}
                onKeyDown={(e) => onKey(d, e)}
                onFocus={() => setFocus(d)}
                className={`min-h-[76px] rounded-lg p-1.5 text-left ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${on ? "bg-teal-50 ring-teal-600" : closed ? "bg-slate-100 ring-slate-200" : `${heat(o)} ring-slate-200 hover:ring-teal-400`} ${d === focus ? "ring-2" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[12px] font-bold ${dow(d) === 0 || dow(d) === 6 ? "text-sky-700" : "text-navy-900"}`}>
                    {Number(d.slice(8))}
                  </span>
                  {o !== null && (
                    <span className={`text-[10.5px] font-semibold tnum ${o >= 85 ? "text-rose-700" : o >= 60 ? "text-amber-800" : "text-slate-500"}`}>
                      {o}%
                    </span>
                  )}
                </div>
                {closed ? (
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">Closed</div>
                ) : (
                  <div className="mt-1.5 leading-none">
                    <span className="text-[10.5px] text-slate-500">from </span>
                    <span className="text-[15px] font-bold text-navy-900 tnum">€{fromPrice(d)}</span>
                  </div>
                )}
                {r.filter((x) => x.kind !== "closed").length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {r
                      .filter((x) => x.kind !== "closed")
                      .map((x) => (
                        <span key={x.id} className="rounded px-1 text-[9.5px] font-semibold bg-amber-100 text-amber-800">
                          {restrictionBadge(x)}
                        </span>
                      ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="md:hidden space-y-4">
          {weeks.map((wk) => (
            <section key={wk[0]} aria-label={`Week of ${fmtDay(wk[0])}`}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Week of {fmtDay(wk[0])}
              </h3>
              <ul className="space-y-1.5">
                {wk.map((d) => {
                  const r = restr(d);
                  const closed = r.some((x) => x.kind === "closed");
                  const o = occ(d);
                  const on = sel.size === 1 && sel.has(d);
                  return (
                    <li key={d}>
                      <button
                        type="button"
                        aria-expanded={on}
                        onClick={() => {
                          setSel(on ? new Set() : new Set([d]));
                          setFocus(d);
                        }}
                        className={`w-full min-h-[48px] rounded-xl px-3 py-2 ring-1 flex items-center gap-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${on ? "bg-teal-50 ring-teal-600" : closed ? "bg-slate-100 ring-slate-200" : `${heat(o)} ring-slate-200`}`}
                      >
                        <span className={`w-20 text-[13px] font-semibold ${dow(d) === 0 || dow(d) === 6 ? "text-sky-700" : "text-navy-900"}`}>
                          {fmtDay(d)}
                        </span>
                        <span className="flex-1 min-w-0 text-[12px] text-slate-600 truncate">
                          {closed ? "Closed" : o !== null ? `${o}% booked` : ""}
                          {r.filter((x) => x.kind !== "closed").map((x) => ` · ${restrictionBadge(x)}`).join("")}
                        </span>
                        {!closed && (
                          <span className="text-[14px] font-bold text-navy-900 tnum">
                            <span className="text-[11px] font-normal text-slate-500">from </span>€{fromPrice(d)}
                          </span>
                        )}
                        <Icon.chevR size={14} className={`text-slate-400 transition ${on ? "rotate-90" : ""}`} />
                      </button>
                      {on && <div className="mt-2 mb-1 rounded-xl ring-1 ring-teal-200 bg-white p-3">{panel}</div>}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Card>

      <Card className="p-4 hidden md:block md:sticky md:top-4">{panel}</Card>
    </div>
  );
}

/** One price per category for the selected day(s); Enter applies. Empty = leave as is. */
function QuickPrice({
  cats,
  current,
  onApply,
}: {
  cats: { id: string; code: string; name: string; color: string }[];
  current: (catId: string) => number | null;
  onApply: (vals: Record<string, string>) => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(cats.map((c) => [c.id, current(c.id)?.toString() ?? ""])),
  );
  const dirty = cats.some((c) => vals[c.id] !== "" && Number(vals[c.id]) !== current(c.id));
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) onApply(vals);
      }}
    >
      {cats.map((c) => (
        <label key={c.id} className="flex items-center gap-2">
          <i className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
          <span className="flex-1 text-[13px] text-navy-900">
            <b>{c.code}</b> {c.name}
          </span>
          <span className="w-28 relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[13px] pointer-events-none">€</span>
            <Input
              type="number"
              inputMode="decimal"
              min={1}
              className="pl-6 tnum"
              aria-label={`${c.name} price`}
              placeholder={current(c.id) === null ? "Mixed" : undefined}
              value={vals[c.id]}
              onChange={(e) => setVals((v) => ({ ...v, [c.id]: e.target.value }))}
            />
          </span>
        </label>
      ))}
      <Btn type="submit" size="sm" variant="primary" full disabled={!dirty}>
        Apply price
      </Btn>
    </form>
  );
}

/* ---- Advanced tab (AENR-601): restrictions, templates, rule order, demand pricing ---- */
export function PricingAdvanced({
  zoneId,
  setZoneId,
  onEditRule,
  children,
}: {
  zoneId: string;
  setZoneId: (z: string) => void;
  onEditRule: (r: PriceRule) => void;
  children?: React.ReactNode;
}) {
  const { toast, priceRules, setPriceRules, calendar, setCalendar, beachPricing } = useApp();
  const cats = beachPricing.categories.filter((c) => c.zoneId === zoneId);
  const withUndo = (msg: string, next: CalendarState) => {
    const prev = calendar;
    setCalendar(next);
    toast(msg, { tone: "success", duration: 6000, action: { label: "Undo", onClick: () => setCalendar(prev) } });
  };
  return (
    <div className="space-y-4">
      <div className="w-40">
        <Select
          aria-label="Zone"
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          options={ZONES.map((z) => ({ v: z.id, l: z.name }))}
        />
      </div>
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <Card className="p-4">
          <div className="font-semibold text-navy-900 mb-2">Restrictions</div>
          {calendar.restrictions.length === 0 ? (
            <div className="text-[12.5px] text-slate-500">None. Add one from a day in the Calendar tab.</div>
          ) : (
            <ul className="space-y-1.5 text-[12.5px]">
              {calendar.restrictions.map((r) => (
                <li key={r.id} className="flex items-center gap-2 rounded-lg ring-1 ring-slate-200 px-2.5 py-1.5">
                  <div className="min-w-0 flex-1">
                    <b className="text-navy-900">{r.label}</b>
                    <div className="text-[11.5px] text-slate-500">
                      {RESTRICTION_LABEL[r.kind]} · {r.zone === "all" ? "All zones" : ZONES.find((z) => z.id === r.zone)?.name} ·{" "}
                      {r.dates?.length ? `${r.dates.length} days` : `${r.from} → ${r.to}`}
                    </div>
                  </div>
                  <Toggle
                    on={r.enabled}
                    onChange={(v) =>
                      setCalendar({
                        ...calendar,
                        restrictions: calendar.restrictions.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)),
                      })
                    }
                    ariaLabel={`Enable ${r.label}`}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${r.label}`}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    onClick={() =>
                      withUndo(`Removed “${r.label}”.`, {
                        ...calendar,
                        restrictions: calendar.restrictions.filter((x) => x.id !== r.id),
                      })
                    }
                  >
                    <Icon.trash size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <div className="font-semibold text-navy-900 mb-2">Seasonal templates</div>
          <div className="space-y-1.5">
            {calendar.templates.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-[12.5px]">
                <Input
                  aria-label="Template name"
                  value={t.name}
                  onChange={(e) =>
                    setCalendar({
                      ...calendar,
                      templates: calendar.templates.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)),
                    })
                  }
                />
                <div className="w-24 shrink-0">
                  <Input
                    aria-label={`${t.name} %`}
                    type="number"
                    value={t.pct}
                    onChange={(e) =>
                      setCalendar({
                        ...calendar,
                        templates: calendar.templates.map((x) =>
                          x.id === t.id ? { ...x, pct: Number(e.target.value) || 0 } : x,
                        ),
                      })
                    }
                  />
                </div>
                <span className="text-slate-500">%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="font-semibold text-navy-900 mb-2">Price rules · precedence</div>
          <ol className="space-y-1 text-[12.5px] list-decimal pl-5">
            {priceRules
              .filter((r) => r.zone === "all" || r.zone === zoneId)
              .map((r) => (
                <li key={r.id} className={r.enabled ? "" : "text-slate-400"}>
                  <button type="button" className="text-left hover:underline" onClick={() => onEditRule(r)}>
                    <b>{r.label}</b> · {ruleEffectLabel(r)}
                    {r.kind && r.kind !== "standard" ? ` · ${RULE_KIND_LABEL[r.kind]}` : ""}
                    {r.cats?.length ? ` · ${r.cats.map((c) => cats.find((x) => x.id === c)?.code ?? c).join("/")}` : ""}
                  </button>
                </li>
              ))}
          </ol>
          <div className="mt-2 text-[11.5px] text-slate-500">
            Applied top to bottom on the category price; a sunbed date override (Sunbeds &amp; pricing) wins over
            all of them.
          </div>
          {priceRules.some((r) => r.id.startsWith("q-")) && (
            <Btn
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => {
                const prev = priceRules;
                setPriceRules(priceRules.filter((r) => !r.id.startsWith("q-")));
                toast("Day prices cleared — the rules apply again.", {
                  tone: "success",
                  duration: 6000,
                  action: { label: "Undo", onClick: () => setPriceRules(prev) },
                });
              }}
            >
              Clear day prices set in the calendar
            </Btn>
          )}
        </Card>
      </div>
      <DemandPanel zoneId={zoneId} />
      {children}
    </div>
  );
}
