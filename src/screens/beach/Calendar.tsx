import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, Input, Select, Toggle } from "../../components/ui";
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

export function PricingCalendar({ onEditRule }: { onEditRule: (r: PriceRule) => void }) {
  const { toast, priceRules, setPriceRules, calendar, setCalendar, beachPricing, beachLayout } =
    useApp();
  const [zoneId, setZoneId] = useState("macaw");
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

  /* ---- Explanation for the focused day ---- */
  const conditional = priceRules.filter(
    (r) =>
      r.enabled && (r.kind ?? "standard") !== "standard" && (r.zone === "all" || r.zone === zoneId),
  );

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
      <Card className="p-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="w-44">
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
              onClick={() =>
                setMonth((m) => (m.m === 0 ? { y: m.y - 1, m: 11 } : { y: m.y, m: m.m - 1 }))
              }
            >
              Prev
            </Btn>
            <div
              className="font-display font-bold text-navy-900 w-36 text-center"
              aria-live="polite"
            >
              {MON[month.m]} {month.y}
            </div>
            <Btn
              size="sm"
              variant="ghost"
              icon={Icon.chevR}
              onClick={() =>
                setMonth((m) => (m.m === 11 ? { y: m.y + 1, m: 0 } : { y: m.y, m: m.m + 1 }))
              }
            >
              Next
            </Btn>
          </div>
          <span className="text-[12px] text-slate-500 hidden md:inline">
            Drag or Shift-click to select days · arrows to move · Space to select · Shift+arrows to
            extend
          </span>
          <Btn
            size="sm"
            variant="ghost"
            icon={Icon.arrowL}
            className="ml-auto"
            disabled={!history.length}
            onClick={undo}
          >
            Undo
          </Btn>
        </div>
        <div className="flex flex-wrap gap-3 mb-2 text-[11.5px] text-slate-600">
          {cats.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1">
              <i className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
              <b className="text-navy-900">{c.code}</b> {c.name}
            </span>
          ))}
          <span>· % = expected occupancy</span>
        </div>
        <div
          role="grid"
          aria-label={`${zone.name} pricing calendar, ${MON[month.m]} ${month.y}`}
          className="grid grid-cols-7 gap-1 select-none"
        >
          {WD.map((w) => (
            <div
              key={w}
              role="columnheader"
              className="text-[11px] font-semibold text-slate-500 text-center py-1"
            >
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
                className={`min-h-[92px] rounded-lg p-1.5 text-left ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${on ? "bg-teal-50 ring-teal-600" : closed ? "bg-slate-100 ring-slate-200" : "bg-white/80 ring-slate-200 hover:ring-teal-400"} ${d === focus ? "ring-2" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[12px] font-bold ${dow(d) === 0 || dow(d) === 6 ? "text-slaice-600" : "text-navy-900"}`}
                  >
                    {Number(d.slice(8))}
                  </span>
                  {o !== null && (
                    <span
                      className={`text-[10px] font-semibold tnum ${o >= 85 ? "text-rose-600" : o >= 60 ? "text-amber-700" : "text-slate-500"}`}
                    >
                      {o}%
                    </span>
                  )}
                </div>
                {closed ? (
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">Closed</div>
                ) : (
                  <div className="mt-0.5 space-y-px">
                    {cats.map((c) => (
                      <div key={c.id} className="flex items-center gap-1 text-[10.5px] tnum">
                        <i className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                        <span className="text-slate-500">{c.code}</span>
                        <span className="font-semibold text-navy-900 ml-auto">
                          €{priceFor(c.id, d)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {r.filter((x) => x.kind !== "closed").length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {r
                      .filter((x) => x.kind !== "closed")
                      .map((x) => (
                        <span
                          key={x.id}
                          className="rounded px-1 text-[9.5px] font-semibold bg-amber-100 text-amber-800"
                        >
                          {restrictionBadge(x)}
                        </span>
                      ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="space-y-4">
        {sel.size > 0 ? (
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-navy-900">
                {sel.size} day{sel.size === 1 ? "" : "s"} selected
              </div>
              <Btn size="sm" variant="ghost" onClick={() => setSel(new Set())}>
                Clear
              </Btn>
            </div>
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
                    onChange={(e) =>
                      setPc((x) => ({ ...x, mode: e.target.value as PriceRuleMode }))
                    }
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
                          cats: e.target.checked
                            ? [...x.cats, c.id]
                            : x.cats.filter((y) => y !== c.id),
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
                variant="primary"
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
                    onChange={(e) =>
                      setRs((x) => ({ ...x, kind: e.target.value as RestrictionKind }))
                    }
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
                  placeholder={
                    rs.kind === "closed" ? "e.g. Weather — beach closed" : "Shown to guests"
                  }
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
              <div className="text-[12.5px] font-semibold text-navy-900">
                Copy this week forward
              </div>
              <div className="text-[11.5px] text-slate-500">
                Copies the price changes and restrictions set only within the selected days to the
                same weekdays every week until:
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Field label="Until">
                    <Input
                      type="date"
                      value={copyUntil}
                      onChange={(e) => setCopyUntil(e.target.value)}
                    />
                  </Field>
                </div>
                <Btn type="submit" size="sm" variant="outline" disabled={sel.size > 7}>
                  Copy
                </Btn>
              </div>
              {sel.size > 7 && (
                <div className="text-[11.5px] text-amber-700">Select up to 7 days (one week).</div>
              )}
            </form>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="font-semibold text-navy-900 mb-1">
              {Number(focus.slice(8))} {MON[Number(focus.slice(5, 7)) - 1]} · {zone.name}
            </div>
            <div className="text-[12px] text-slate-500 mb-2">
              How the price is built (highest precedence last).
            </div>
            <ul className="space-y-2">
              {cats.map((c) => {
                const t = resolvePrice(sample(c.id), zoneId, focus, beachPricing, priceRules);
                return (
                  <li
                    key={c.id}
                    className="rounded-lg ring-1 ring-slate-200 px-2.5 py-2 text-[12px]"
                  >
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
          </Card>
        )}

        <Card className="p-4">
          <div className="font-semibold text-navy-900 mb-2">Restrictions</div>
          {calendar.restrictions.length === 0 ? (
            <div className="text-[12.5px] text-slate-500">None.</div>
          ) : (
            <ul className="space-y-1.5 text-[12.5px]">
              {calendar.restrictions.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg ring-1 ring-slate-200 px-2.5 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <b className="text-navy-900">{r.label}</b>
                    <div className="text-[11.5px] text-slate-500">
                      {RESTRICTION_LABEL[r.kind]} ·{" "}
                      {r.zone === "all" ? "All zones" : ZONES.find((z) => z.id === r.zone)?.name} ·{" "}
                      {r.dates?.length ? `${r.dates.length} days` : `${r.from} → ${r.to}`}
                    </div>
                  </div>
                  <Toggle
                    on={r.enabled}
                    onChange={(v) => {
                      snap();
                      setCalendar({
                        ...calendar,
                        restrictions: calendar.restrictions.map((x) =>
                          x.id === r.id ? { ...x, enabled: v } : x,
                        ),
                      });
                    }}
                    ariaLabel={`Enable ${r.label}`}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${r.label}`}
                    className="text-slate-400 hover:text-rose-600"
                    onClick={() => {
                      snap();
                      setCalendar({
                        ...calendar,
                        restrictions: calendar.restrictions.filter((x) => x.id !== r.id),
                      });
                    }}
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
                      templates: calendar.templates.map((x) =>
                        x.id === t.id ? { ...x, name: e.target.value } : x,
                      ),
                    })
                  }
                />
                <div className="w-28 shrink-0">
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
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => onEditRule(r)}
                  >
                    <b>{r.label}</b> · {ruleEffectLabel(r)}
                    {r.kind && r.kind !== "standard" ? ` · ${RULE_KIND_LABEL[r.kind]}` : ""}
                    {r.cats?.length
                      ? ` · ${r.cats.map((c) => cats.find((x) => x.id === c)?.code ?? c).join("/")}`
                      : ""}
                  </button>
                </li>
              ))}
          </ol>
          <div className="mt-2 text-[11.5px] text-slate-500">
            Applied top to bottom on the category price; a sunbed date override (Sunbeds & pricing)
            wins over all of them.
          </div>
        </Card>
      </div>
      <div className="mt-4">
        <DemandPanel zoneId={zoneId} />
      </div>
    </div>
  );
}
