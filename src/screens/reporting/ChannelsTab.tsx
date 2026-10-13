import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Table } from "../../components/ui";
import { Donut, MultiLineChart } from "../../components/charts";
import { SortHeader, cmpVal, type SortState } from "../../components/TableTools";
import { CHANNELS, fmtEUR, fmtInt, fmtPct, type Channel } from "../../data/analytics";
import {
  CHANNEL_COLORS,
  CHANNEL_ROLE,
  channelPatterns,
  channelStats,
  channelTrend,
  onlineFunnel,
  type ChannelStats,
} from "../../data/channelReport";
import type { DateRange, Period } from "../../domain/period";
import { periodToParams } from "../../domain/period";
import type { CsvSection } from "../../lib/download";

/* ============ Reporting › Channels (AENR-479) ============
   Every channel side by side — Online, Walk-in, Phone (call centre), Cashier —
   with scorecards, a sortable comparison, revenue trend, product mix, staff,
   when each channel sells, the online funnel, and a drill-down into Bookings. */

const pctDelta = (a: number, b: number) =>
  b ? `${a - b >= 0 ? "+" : "−"}${Math.abs(Math.round(((a - b) / b) * 100))}%` : undefined;

export function useChannels(range: DateRange, prevRange: DateRange, g: "day" | "week" | "month") {
  const now = useMemo(() => channelStats(range), [range]);
  const prev = useMemo(() => channelStats(prevRange), [prevRange]);
  const trend = useMemo(() => channelTrend(range, g), [range, g]);
  const patterns = useMemo(() => channelPatterns(range), [range]);
  const funnel = useMemo(() => onlineFunnel(range), [range]);
  return { now, prev, trend, patterns, funnel };
}

export function channelsCsv(c: ReturnType<typeof useChannels>, label: string): CsvSection[] {
  return [
    {
      title: `Channels · ${label}`,
      header: [
        "Channel",
        "Role",
        "Revenue (€)",
        "Share %",
        "Bookings",
        "Avg basket (€)",
        "Items / booking",
        "Lead time (d)",
        "Cancellation %",
        "Refund %",
        "No-show %",
        "New guests %",
        "Fees (€)",
        "Net (€)",
      ],
      rows: c.now.map((s) => [
        s.channel,
        CHANNEL_ROLE[s.channel],
        Math.round(s.revenue),
        Math.round(s.share * 100),
        s.bookings,
        s.avgBasket.toFixed(1),
        s.itemsPerBooking,
        s.leadDays,
        (s.cancelRate * 100).toFixed(1),
        (s.refundRate * 100).toFixed(1),
        (s.noShowRate * 100).toFixed(1),
        Math.round(s.newShare * 100),
        Math.round(s.fees),
        Math.round(s.net),
      ]),
    },
    {
      title: "Revenue by channel over time (€)",
      header: ["Period", ...CHANNELS],
      rows: c.trend.labels.map((l, i) => [l, ...CHANNELS.map((ch) => c.trend.series[ch][i])]),
    },
    {
      title: "Product mix by channel (%)",
      header: ["Channel", "Sunbeds", "Tickets", "Lockers", "Parking"],
      rows: c.now.map((s) => [s.channel, ...s.mix.map((m) => m.v)]),
    },
    {
      title: "Sales by staff member",
      header: ["Channel", "Staff", "Bookings", "Revenue (€)"],
      rows: c.now.flatMap((s) => s.staff.map((p) => [s.channel, p.name, p.bookings, p.revenue])),
    },
    { title: "Online funnel", header: ["Step", "Count"], rows: c.funnel.map((f) => [f.l, f.v]) },
  ];
}

export function ChannelsTab({
  ch,
  period,
  label,
  noun,
  vs,
  hasPrev,
}: {
  ch: ReturnType<typeof useChannels>;
  period: Period;
  label: string;
  noun: string;
  vs: string;
  hasPrev: boolean;
}) {
  const [sort, setSort] = useState<SortState>({ key: "revenue", dir: -1 });
  const prevOf = (c: Channel) => ch.prev.find((p) => p.channel === c)!;
  // Drill-down: open Bookings filtered by this channel and the same dates.
  const drill = (c: Channel) => {
    const q = new URLSearchParams({ channel: c, ...periodToParams(period) });
    window.location.hash = `#/admin/bookings?${q.toString()}`;
  };
  const cols: { k: keyof ChannelStats; l: string; fmt: (s: ChannelStats) => string }[] = [
    { k: "revenue", l: "Revenue", fmt: (s) => fmtEUR(s.revenue) },
    { k: "share", l: "Share", fmt: (s) => fmtPct(s.share) },
    { k: "bookings", l: "Bookings", fmt: (s) => fmtInt(s.bookings) },
    { k: "avgBasket", l: "Avg basket", fmt: (s) => `€${s.avgBasket.toFixed(1)}` },
    { k: "cancelRate", l: "Cancel", fmt: (s) => fmtPct(s.cancelRate, 1) },
    { k: "noShowRate", l: "No-show", fmt: (s) => fmtPct(s.noShowRate, 1) },
    { k: "fees", l: "Fees", fmt: (s) => fmtEUR(s.fees) },
    { k: "net", l: "Net", fmt: (s) => fmtEUR(s.net) },
  ];
  const rows = sort
    ? [...ch.now].sort(
        (a, b) =>
          cmpVal(
            a[sort.key as keyof ChannelStats] as number,
            b[sort.key as keyof ChannelStats] as number,
          ) * sort.dir,
      )
    : ch.now;
  const onSort = (k: string) =>
    setSort((s) => (s?.key === k ? { key: k, dir: s.dir === 1 ? -1 : 1 } : { key: k, dir: -1 }));
  const funnelMax = ch.funnel[0]?.v || 1;

  return (
    <div className="space-y-4">
      {/* Per-channel scorecards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {ch.now.map((s) => {
          const p = prevOf(s.channel);
          return (
            <Card key={s.channel} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <i
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: CHANNEL_COLORS[s.channel] }}
                  />
                  <div className="font-semibold text-navy-900 truncate">{s.channel}</div>
                </div>
                <span className="text-[11px] text-slate-500 truncate">
                  {CHANNEL_ROLE[s.channel]}
                </span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <div className="text-[24px] leading-none font-bold text-navy-900 tnum font-display">
                  {fmtEUR(s.revenue)}
                </div>
                {hasPrev && pctDelta(s.revenue, p.revenue) && (
                  <Badge tone={pctDelta(s.revenue, p.revenue)!.startsWith("+") ? "green" : "red"}>
                    {pctDelta(s.revenue, p.revenue)}
                  </Badge>
                )}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-0.5">
                {fmtPct(s.share)} of revenue · {vs}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
                {[
                  ["Bookings", fmtInt(s.bookings)],
                  ["Avg basket", `€${s.avgBasket.toFixed(1)}`],
                  ["Items / booking", s.itemsPerBooking.toFixed(1)],
                  ["Lead time", s.leadDays ? `${s.leadDays.toFixed(1)}d` : "same day"],
                  ["Cancel / refund", `${fmtPct(s.cancelRate, 1)} / ${fmtPct(s.refundRate, 1)}`],
                  ["No-show", fmtPct(s.noShowRate, 1)],
                  ["New guests", fmtPct(s.newShare)],
                  ["Fees · net", `${fmtEUR(s.fees)} · ${fmtEUR(s.net)}`],
                ].map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-slate-500 truncate">{k}</dt>
                    <dd className="font-semibold text-navy-900 tnum truncate">{v}</dd>
                  </div>
                ))}
              </dl>
              <Btn
                size="sm"
                variant="ghost"
                icon={Icon.arrowR}
                className="mt-2 -ml-2"
                onClick={() => drill(s.channel)}
              >
                View bookings
              </Btn>
            </Card>
          );
        })}
      </div>

      {/* Comparison table (sortable) */}
      <Card className="p-5">
        <div className="font-semibold text-navy-900 mb-2">Channel comparison · {label}</div>
        <Table
          dense
          right={cols.map((_, i) => i + 1)}
          cols={[
            "Channel",
            ...cols.map((c) => (
              <SortHeader key={c.k} label={c.l} k={c.k} sort={sort} onSort={onSort} align="right" />
            )),
          ]}
          rows={rows.map((s) => [
            <span className="inline-flex items-center gap-2 font-semibold text-navy-900">
              <i
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: CHANNEL_COLORS[s.channel] }}
              />
              {s.channel}
            </span>,
            ...cols.map((c) => c.fmt(s)),
          ])}
        />
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="font-semibold text-navy-900 mb-1">Revenue by channel · {noun}</div>
          <MultiLineChart
            labels={ch.trend.labels}
            series={CHANNELS.map((c) => ({
              name: c,
              color: CHANNEL_COLORS[c],
              values: ch.trend.series[c],
            }))}
            label={`Revenue by channel over time, ${label}`}
          />
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-3">Sales by channel</div>
          <div className="flex items-center gap-4">
            <Donut
              segments={ch.now.map((s) => ({
                v: Math.round(s.share * 100),
                c: CHANNEL_COLORS[s.channel],
              }))}
              total={fmtEUR(ch.now.reduce((a, s) => a + s.revenue, 0))}
              totalLabel="revenue"
              label={`Revenue by channel, ${fmtEUR(ch.now.reduce((a, s) => a + s.revenue, 0))}: ${ch.now.map((s) => `${s.channel} ${fmtEUR(s.revenue)} (${Math.round(s.share * 100)}%)`).join(", ")}`}
            />
            <div className="text-[13px] space-y-1.5">
              {ch.now.map((s) => (
                <div key={s.channel} className="flex items-center gap-2">
                  <i
                    className="w-3 h-3 rounded-sm inline-block"
                    style={{ background: CHANNEL_COLORS[s.channel] }}
                  />
                  {s.channel} · {fmtEUR(s.revenue)} · {Math.round(s.share * 100)}%
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-2">Product mix by channel</div>
          <div className="space-y-2.5">
            {ch.now.map((s) => (
              <div key={s.channel}>
                <div className="flex justify-between text-[12px] text-slate-600 mb-1">
                  <span className="font-semibold text-navy-900">{s.channel}</span>
                  <span>{s.mix.map((m) => `${m.l} ${m.v}%`).join(" · ")}</span>
                </div>
                <div
                  className="flex h-3 rounded-full overflow-hidden ring-1 ring-slate-200"
                  role="img"
                  aria-label={`${s.channel} product mix: ${s.mix.map((m) => `${m.l} ${m.v}%`).join(", ")}`}
                >
                  {s.mix.map((m, i) => (
                    <div
                      key={m.l}
                      style={{
                        width: `${m.v}%`,
                        background: ["#0D9488", "#0ea5e9", "#13315c", "#f59e0b"][i],
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-[11.5px] text-slate-600">
            {["Sunbeds", "Tickets", "Lockers", "Parking"].map((l, i) => (
              <span key={l} className="inline-flex items-center gap-1.5">
                <i
                  className="w-3 h-3 rounded-sm inline-block"
                  style={{ background: ["#0D9488", "#0ea5e9", "#13315c", "#f59e0b"][i] }}
                />
                {l}
              </span>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-2">Sales by staff member</div>
          <Table
            cols={["Staff", "Channel", "Bookings", "Revenue"]}
            right={[2, 3]}
            rows={ch.now.flatMap((s) =>
              s.staff.map((p) => [p.name, s.channel, fmtInt(p.bookings), fmtEUR(p.revenue)]),
            )}
          />
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-1">When each channel sells · by hour</div>
          <MultiLineChart
            height={180}
            labels={ch.patterns.hours}
            series={CHANNELS.map((c) => ({
              name: c,
              color: CHANNEL_COLORS[c],
              values: ch.patterns.byHour[c],
            }))}
            label="Bookings by hour per channel"
          />
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-1">By weekday</div>
          <MultiLineChart
            height={180}
            labels={ch.patterns.weekdays}
            series={CHANNELS.map((c) => ({
              name: c,
              color: CHANNEL_COLORS[c],
              values: ch.patterns.byWeekday[c],
            }))}
            label="Bookings by weekday per channel"
          />
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-2">Online funnel</div>
          <div className="space-y-2">
            {ch.funnel.map((f, i) => (
              <div key={f.l}>
                <div className="flex justify-between text-[12.5px]">
                  <span className="text-slate-700">{f.l}</span>
                  <span className="tnum font-semibold text-navy-900">
                    {fmtInt(f.v)}
                    {i > 0 && (
                      <span className="text-slate-500 font-normal">
                        {" "}
                        · {fmtPct(f.v / ch.funnel[i - 1].v)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: `${(f.v / funnelMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11.5px] text-slate-500">
            Visit → paid conversion {fmtPct(ch.funnel[3].v / funnelMax, 1)} (sample data).
          </div>
        </Card>
      </div>
    </div>
  );
}
