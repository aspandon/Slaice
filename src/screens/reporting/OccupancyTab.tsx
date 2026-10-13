import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, FilterBar, Select, StatCard, Table } from "../../components/ui";
import { HBarChart, LineChartMini } from "../../components/charts";
import { useApp } from "../../app/store";
import { ZONES } from "../../data/beach";
import { fmtEUR, fmtPct } from "../../data/analytics";
import {
  ALL_CHANNELS,
  forecast,
  occupancyReport,
  setHeatmap,
  type Asset,
  type OccFilters,
  type OccReport,
  type SetKind,
} from "../../data/occupancy";
import type { DateRange } from "../../domain/period";
import { DEMO_TODAY, fmtDay } from "../../domain/period";
import type { FilterDef, FilterState } from "../../domain/filters";
import type { CsvSection } from "../../lib/download";

/* ============ Reporting › Occupancy (AENR-478) ============
   Revenue-management style occupancy: KPIs with deltas, filters (zone, asset,
   sunbed type, channel, weekday/weekend), occupancy over time vs last year,
   time-of-day build-up, weekday × hour, zone × time heatmap (kept from the
   original tab), a beach-map heatmap per set, booked vs checked-in vs
   no-show, a 14-day on-the-books forecast and sold-out (lost demand) days. */

const HEAT = [
  { max: 0.2, color: "#dbeafe", label: "0–20%", tone: "Empty" },
  { max: 0.4, color: "#99f6e4", label: "20–40%", tone: "Low" },
  { max: 0.6, color: "#5eead4", label: "40–60%", tone: "Moderate" },
  { max: 0.8, color: "#fbbf24", label: "60–80%", tone: "Busy" },
  { max: 1.01, color: "#ef4444", label: "80–100%", tone: "Peak" },
];
export const heatColor = (v: number) =>
  (HEAT.find((b) => v <= b.max) || HEAT[HEAT.length - 1]).color;
export function HeatLegend() {
  return (
    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 flex-wrap text-[11.5px] text-slate-600">
      <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10.5px]">
        Occupancy
      </span>
      {HEAT.map((b) => (
        <span key={b.label} className="inline-flex items-center gap-1.5">
          <i
            className="w-4 h-4 rounded ring-1 ring-white/60 inline-block"
            style={{ background: b.color }}
          />
          <span className="tnum">{b.label}</span>
          <span className="text-slate-400">· {b.tone}</span>
        </span>
      ))}
    </div>
  );
}

const MULTI_DEFS: FilterDef[] = [
  {
    key: "zones",
    label: "Zone",
    kind: "multi",
    options: ZONES.map((z) => ({ v: z.id, l: z.name })),
  },
  {
    key: "kinds",
    label: "Sunbed type",
    kind: "multi",
    options: [
      { v: "standard", l: "Standard" },
      { v: "front", l: "Front row" },
      { v: "cabana", l: "Cabana" },
    ],
  },
  {
    key: "channels",
    label: "Channel",
    kind: "multi",
    options: ALL_CHANNELS.map((c) => ({ v: c, l: c })),
  },
];
const ASSET_LABEL: Record<Asset, string> = {
  sunbeds: "Sunbed sets",
  lockers: "Day lockers",
  parking: "Parking",
};

export function useOccupancy(
  range: DateRange,
  prevRange: DateRange,
  granularity: "day" | "week" | "month",
) {
  const [f, setF] = useState<OccFilters>({
    zones: [],
    asset: "sunbeds",
    kinds: [],
    channels: [],
    days: "all",
  });
  const report = useMemo(() => occupancyReport(range, f, granularity), [range, f, granularity]);
  const prev = useMemo(() => occupancyReport(prevRange, f, granularity), [prevRange, f, granularity]);
  return { f, setF, report, prev };
}

export function occupancyCsv(r: OccReport, f: OccFilters, label: string): CsvSection[] {
  const scope = `${ASSET_LABEL[f.asset]}${f.zones.length ? ` · ${f.zones.join(", ")}` : ""}${f.kinds.length ? ` · ${f.kinds.join(", ")}` : ""}${f.channels.length ? ` · ${f.channels.join(", ")}` : ""}${f.days !== "all" ? ` · ${f.days}s` : ""}`;
  return [
    {
      title: `Occupancy · ${label} · ${scope}`,
      header: ["Metric", "Value"],
      rows: [
        ["Avg occupancy", fmtPct(r.avg)],
        ["Peak", r.peak ? `${fmtPct(r.peak.v)} on ${fmtDay(r.peak.date)}` : "—"],
        ["Sold-out days", r.soldOutDays],
        ["RevPATB", `€${r.revpatb.toFixed(1)}`],
        ["ADR", `€${r.adr.toFixed(1)}`],
        ["No-show rate", fmtPct(r.noShowRate, 1)],
      ],
    },
    {
      title: "By zone",
      header: [
        "Zone",
        "Occupancy %",
        "Sold",
        "Capacity",
        "Checked in",
        "No-shows",
        "Revenue (€)",
        "Sold-out days",
      ],
      rows: r.byZone.map((z) => [
        z.name,
        Math.round(z.occ * 100),
        Math.round(z.sold),
        Math.round(z.capacity),
        Math.round(z.checkedIn),
        Math.round(z.noShows),
        Math.round(z.revenue),
        z.soldOut,
      ]),
    },
    {
      title: "Occupancy over time (% · vs last year)",
      header: ["Period", "This year", "Last year"],
      rows: r.overTime.map((x, i) => [x.l, x.v, r.overTimeLy[i]?.v ?? ""]),
    },
    {
      title: "Occupancy by hour (%)",
      header: ["Hour", "Occupancy %"],
      rows: r.byHour.map((h) => [h.l, h.v]),
    },
    {
      title: "Sold-out zones",
      header: ["Date", "Zone", "Sold out by"],
      rows: r.soldOut.map((s) => [fmtDay(s.date, true), s.zone, s.by]),
    },
  ];
}

export function OccupancyTab({
  occ,
  range,
  label,
  noun,
  vs,
  hasPrev,
  buckets,
}: {
  occ: ReturnType<typeof useOccupancy>;
  range: DateRange;
  label: string;
  noun: string;
  vs: string;
  hasPrev: boolean;
  /** Time columns for the zone × time heatmap. */
  buckets: { key: string; label: string; range: DateRange }[];
}) {
  const { go } = useApp();
  const { f, setF, report: r, prev: p } = occ;
  const [mapZone, setMapZone] = useState<string>(f.zones[0] ?? "macaw");
  const fs: FilterState = { zones: f.zones, kinds: f.kinds, channels: f.channels };
  const pp = (a: number, b: number, d = 0) =>
    hasPrev ? `${a - b >= 0 ? "+" : "−"}${Math.abs((a - b) * 100).toFixed(d)}pp` : undefined;
  const pct = (a: number, b: number) =>
    hasPrev && b
      ? `${a - b >= 0 ? "+" : "−"}${Math.abs(Math.round(((a - b) / b) * 100))}%`
      : undefined;
  const zoneMax = Math.max(...r.byZone.map((z) => z.occ));
  const set = setHeatmap(range, f, mapZone);
  // Zone × time heatmap honours the filters (asset, type, channel, days).
  const heatBuckets = useMemo(
    () => buckets.map((b) => ({ ...b, cells: occupancyReport(b.range, f, "day").byZone.map((z) => ({ zoneId: z.id, v: z.occ })) })),
    [buckets, f],
  );
  const fc = forecast(DEMO_TODAY, f);
  const kindsApply = f.asset === "sunbeds";

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <FilterBar
          defs={kindsApply ? MULTI_DEFS : MULTI_DEFS.filter((d) => d.key !== "kinds")}
          value={fs}
          onChange={(v) =>
            setF({
              ...f,
              zones: (v.zones as string[] | undefined) ?? [],
              kinds: (v.kinds as SetKind[] | undefined) ?? [],
              channels: (v.channels as OccFilters["channels"] | undefined) ?? [],
            })
          }
          count={`${ASSET_LABEL[f.asset]} · ${noun}`}
        >
          <div className="w-40">
            <Field label="Capacity">
              <Select
                value={f.asset}
                onChange={(e) =>
                  setF({
                    ...f,
                    asset: e.target.value as Asset,
                    kinds: e.target.value === "sunbeds" ? f.kinds : [],
                  })
                }
                options={(Object.keys(ASSET_LABEL) as Asset[]).map((a) => ({
                  v: a,
                  l: ASSET_LABEL[a],
                }))}
              />
            </Field>
          </div>
          <div className="w-40">
            <Field label="Days">
              <Select
                value={f.days}
                onChange={(e) => setF({ ...f, days: e.target.value as OccFilters["days"] })}
                options={[
                  { v: "all", l: "All days" },
                  { v: "weekday", l: "Weekdays" },
                  { v: "weekend", l: "Weekends" },
                ]}
              />
            </Field>
          </div>
        </FilterBar>
      </Card>

      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          instant
          label="Avg occupancy"
          value={fmtPct(r.avg)}
          sub={vs}
          trend={pp(r.avg, p.avg)}
          compare={vs}
          tone="teal"
        />
        <StatCard
          instant
          label="Peak"
          value={r.peak ? fmtPct(r.peak.v) : "—"}
          sub={r.peak ? fmtDay(r.peak.date) : "—"}
        />
        <StatCard
          instant
          label="Sold-out days"
          value={String(r.soldOutDays)}
          sub="a zone ≥ 95%"
          compare={vs}
          trend={
            hasPrev
              ? `${r.soldOutDays - p.soldOutDays >= 0 ? "+" : "−"}${Math.abs(r.soldOutDays - p.soldOutDays)}`
              : undefined
          }
        />
        <StatCard
          instant
          label="RevPATB"
          value={`€${r.revpatb.toFixed(1)}`}
          sub="per available unit"
          trend={pct(r.revpatb, p.revpatb)}
          compare={vs}
          tone="indigo"
        />
        <StatCard
          instant
          label="ADR"
          value={`€${r.adr.toFixed(1)}`}
          sub="per unit sold"
          trend={pct(r.adr, p.adr)}
          compare={vs}
        />
        <StatCard
          instant
          label="No-show rate"
          value={fmtPct(r.noShowRate, 1)}
          sub="booked, not checked in"
          trend={pp(r.noShowRate, p.noShowRate, 1)}
          compare={vs}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <div className="font-semibold text-navy-900">Occupancy over time (%) · {noun}</div>
            <div className="flex items-center gap-3 text-[11.5px] text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <i className="w-4 h-0.5 bg-teal-600 inline-block" /> This year
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="w-4 border-t-2 border-dashed border-slate-400 inline-block" /> Last
                year
              </span>
            </div>
          </div>
          <LineChartMini
            data={r.overTime}
            compare={r.overTimeLy}
            label={`Occupancy over time, ${label}, with last year`}
          />
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-1">Occupancy by zone (%)</div>
          <HBarChart
            color="#0ea5e9"
            unit="%"
            max={100}
            data={r.byZone.map((z) => ({
              l: z.name,
              v: Math.round(z.occ * 100),
              ...(z.occ === zoneMax ? { hi: 1 } : {}),
            }))}
            label={`Occupancy by zone, ${label}`}
          />
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="font-semibold text-navy-900">When the beach fills up</div>
          <div className="text-[12px] text-slate-500 mb-2">Average occupancy by hour, {noun}</div>
          <LineChartMini
            data={r.byHour}
            color="#13315c"
            height={180}
            label={`Occupancy by hour, ${label}`}
          />
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-3">Weekday × hour</div>
          <div className="overflow-x-auto no-scrollbar">
            <div className="space-y-1 w-max">
              {r.weekdayHour.map((w) => (
                <div key={w.day} className="flex items-center gap-2">
                  <div className="w-9 text-[12px] text-slate-500">{w.day}</div>
                  <div className="flex gap-1">
                    {w.cells.map((c, i) => (
                      <div
                        key={i}
                        className="w-6 h-5 rounded ring-1 ring-white/60"
                        style={{ background: heatColor(c / 100) }}
                        title={`${w.day} ${8 + i}:00 — ${c}%`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex gap-1 ml-[44px] pt-1 text-[10px] text-slate-600">
                {r.byHour.map((h) => (
                  <div key={h.l} className="w-6 text-center">
                    {h.l.replace("h", "")}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <HeatLegend />
        </Card>
      </div>

      <Card className="p-5">
        <div className="font-semibold text-navy-900 mb-3">Utilisation heatmap (zone × time)</div>
        <div className="overflow-x-auto no-scrollbar">
          <div className="space-y-1.5 w-max">
            {(f.zones.length ? ZONES.filter((z) => f.zones.includes(z.id)) : ZONES).map((z) => (
              <div key={z.id} className="flex items-center gap-2">
                <div className="w-16 text-[12px] text-slate-500 shrink-0">{z.name}</div>
                <div className="flex gap-1">
                  {heatBuckets.map((b) => {
                    const v = b.cells.find((c) => c.zoneId === z.id)?.v ?? 0;
                    return (
                      <div
                        key={b.key}
                        className="w-7 h-6 rounded ring-1 ring-white/60"
                        style={{ background: heatColor(v) }}
                        title={`${z.name} · ${b.label}: ${Math.round(v * 100)}%`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex gap-1 ml-[72px] pt-1 text-[10px] text-slate-600">
              {heatBuckets.map((b) => (
                <div key={b.key} className="w-7 text-center">
                  {b.label}
                </div>
              ))}
            </div>
          </div>
        </div>
        <HeatLegend />
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="font-semibold text-navy-900">Beach map · hot &amp; cold sets</div>
            <div className="w-36">
              <Select
                aria-label="Zone on the map"
                value={mapZone}
                onChange={(e) => setMapZone(e.target.value)}
                options={ZONES.map((z) => ({ v: z.id, l: z.name }))}
              />
            </div>
          </div>
          <div className="text-[10px] font-semibold tracking-wider text-sky-800/80 mb-1">
            SEA · FRONT ROW
          </div>
          <div
            className="relative rounded-2xl overflow-hidden ring-1 ring-slate-200"
            style={{
              aspectRatio: "16 / 9",
              background: "linear-gradient(180deg,#7dd3fc 0%,#bae6fd 6%,#f5e6c8 12%,#ecd9b0 100%)",
            }}
          >
            {set.map((s) => (
              <div
                key={s.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-[7%] aspect-square rounded-md ring-1 ring-white/80 shadow-sm grid place-items-center text-[9px] font-bold text-navy-900/80 tnum"
                style={{ left: `${s.x}%`, top: `${s.y}%`, background: heatColor(s.occ) }}
                title={`${s.id}: ${Math.round(s.occ * 100)}% occupied`}
              >
                {Math.round(s.occ * 100)}
              </div>
            ))}
          </div>
          <div className="text-[10px] font-semibold tracking-wider text-amber-900/60 mt-1">
            PROMENADE
          </div>
          <HeatLegend />
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-2">Booked vs checked in vs no-show</div>
          <Table
            cols={["Zone", "Booked", "Checked in", "No-shows", "No-show %"]}
            right={[1, 2, 3, 4]}
            rows={r.byZone.map((z) => [
              z.name,
              Math.round(z.sold).toLocaleString("en-GB"),
              Math.round(z.checkedIn).toLocaleString("en-GB"),
              Math.round(z.noShows).toLocaleString("en-GB"),
              fmtPct(z.sold ? z.noShows / z.sold : 0, 1),
            ])}
          />
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <div className="font-semibold text-navy-900">On the books · next 14 days</div>
            <Btn
              size="sm"
              variant="outline"
              icon={Icon.trend}
              onClick={() => go("admin", "availability")}
            >
              Set a pricing rule
            </Btn>
          </div>
          <div className="text-[12px] text-slate-500 mb-2">
            Occupancy already booked for each day vs the same point last year (from{" "}
            {fmtDay(DEMO_TODAY)}).
          </div>
          <LineChartMini
            data={fc.map((d) => ({ l: d.l, v: d.otb }))}
            compare={fc.map((d) => ({ l: d.l, v: d.ly }))}
            color="#0D9488"
            height={190}
            label="On-the-books occupancy for the next 14 days, with last year"
          />
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-2">Sold out · lost demand</div>
          {r.soldOut.length ? (
            <ul className="space-y-2">
              {r.soldOut.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-[13px]">
                  <span>
                    <b className="text-navy-900">{s.zone}</b>{" "}
                    <span className="text-slate-500">· {fmtDay(s.date)}</span>
                  </span>
                  <Badge tone="red">sold out by {s.by}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[13px] text-slate-500">No zone sold out {noun}.</div>
          )}
          <div className="mt-3 text-[11.5px] text-slate-500">
            Zones that sell out early turn guests away — candidates for higher prices or more sets.
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="font-semibold text-navy-900 mb-2">All metrics by zone · {label}</div>
        <Table
          cols={["Zone", "Occupancy", "Sold", "Capacity", "Revenue", "RevPATB", "Sold-out days"]}
          right={[1, 2, 3, 4, 5, 6]}
          rows={r.byZone.map((z) => [
            z.name,
            fmtPct(z.occ),
            Math.round(z.sold).toLocaleString("en-GB"),
            Math.round(z.capacity).toLocaleString("en-GB"),
            fmtEUR(z.revenue),
            `€${(z.capacity ? z.revenue / z.capacity : 0).toFixed(1)}`,
            z.soldOut,
          ])}
        />
      </Card>
    </div>
  );
}
