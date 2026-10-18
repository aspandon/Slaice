import { useEffect, useState } from "react";
import { Icon } from "../../lib/icons";
import {
  Badge,
  Btn,
  Card,
  PageHead,
  DensityToggle,
  EmptyState,
  FilterBar,
  PeriodPicker,
  StatusBadge,
  Table,
  TableSkeleton,
  Tabs,
  filterCount,
  ExportMenu,
  useMockLoad,
  CompactList,
  CompactRow,
} from "../../components/ui";
import type { TabEntry } from "../../components/ui";
import { ArrivalBadge } from "../../components/ArrivalBadge";
import { Pager, SortHeader, cmpVal, dateVal } from "../../components/TableTools";
import { useApp } from "../../app/store";
import { TENANT, ZONES } from "../../data/beach";
import { usePeriod } from "../../lib/usePeriod";
import { readHashQuery, writeHashQuery } from "../../app/router";
import {
  activeCount,
  filtersFromParams,
  filtersToParams,
  isAmount,
  matchAmount,
  type FilterDef,
  type FilterState,
} from "../../domain/filters";
import { DEMO_TODAY, inRange, rangeLabel, resolveRange } from "../../domain/period";
import { downloadReport } from "../../lib/download";
import { Masked } from "../tenant/ViewAs";
import { useBookingOps, zoneByName, type OpsBooking } from "../../lib/useBookingOps";
import { useBeachState } from "../../lib/useBeachState";
import { useEntry } from "../../lib/useEntry";
import { useLiveSlots } from "../../lib/useLiveSlots";
import { useListUrl } from "../../lib/useUrlState";
import { BookingDrawer } from "./BookingDrawer";

/* ============ BOOKINGS (AENR-579) ============
   Status tabs with counts on top of the period and filters; one Guest column;
   each row opens a drawer with items, payment, QR, the full timeline and the
   actions (resend QR, move set, refund, note). Shared by Manager / Admin and
   Call Center — agents request refunds, a manager decides. */

// One control for *when* and chips for *status* (AENR-634) — two questions, two controls.
type When = "today" | "upcoming" | "past" | "all";
const WHEN: { k: When; l: string; test: (b: OpsBooking) => boolean }[] = [
  { k: "today", l: "Today", test: (b) => b.visitIso === DEMO_TODAY && !["Cancelled", "Refunded", "Expired"].includes(b.status) },
  { k: "upcoming", l: "Upcoming", test: (b) => b.visitIso > DEMO_TODAY },
  { k: "past", l: "Past", test: (b) => b.visitIso < DEMO_TODAY },
  { k: "all", l: "All", test: () => true },
];
type Status = "unpaid" | "awaiting" | "expired" | "refunded" | "used";
const STATUS: { k: Status; l: string; test: (b: OpsBooking) => boolean }[] = [
  { k: "unpaid", l: "Unpaid", test: (b) => b.status === "Unpaid" },
  { k: "awaiting", l: "Awaiting payment", test: (b) => b.status === "Awaiting payment" },
  // Payment links that ran out unpaid (AENR-559 — tracking moved from Pay-by-link).
  { k: "expired", l: "Expired", test: (b) => b.status === "Expired" },
  { k: "refunded", l: "Refunded", test: (b) => b.status === "Refunded" },
  { k: "used", l: "Used", test: (b) => b.status === "Used" },
];

/* Structured filters (AENR-471); the date filter is the shared period control. */
const BOOKING_ITEM_TYPES = [
  { v: "Sunbed", l: "Sunbed" },
  { v: "Entry", l: "Entry ticket" },
  { v: "Day locker", l: "Locker" },
  { v: "Parking", l: "Parking" },
];
const BOOKING_FILTERS: FilterDef[] = [
  {
    key: "channel",
    label: "Channel",
    kind: "multi",
    options: ["Online", "Walk-in", "Phone", "Call Center", "Admin", "Support Agent", "Cashier", "Pay-by-link"].map((v) => ({ v, l: v })),
  },
  { key: "amount", label: "Amount", kind: "amount" },
  { key: "item", label: "Item type", kind: "multi", options: BOOKING_ITEM_TYPES },
  {
    key: "zone",
    label: "Zone",
    kind: "multi",
    options: ZONES.map((z) => ({ v: z.name, l: z.name })),
  },
];
const itemKind = (item: string) => item.split(" · ")[0];
const itemZone = (item: string) => (itemKind(item) === "Sunbed" ? item.split(" · ")[1] : null);
function matchFilters(b: OpsBooking, f: FilterState): boolean {
  const has = (k: string) => Array.isArray(f[k]) && (f[k] as string[]).length > 0;
  const inList = (k: string, v: string) => (f[k] as string[]).includes(v);
  if (has("channel") && !inList("channel", b.channel)) return false;
  if (isAmount(f.amount) && !matchAmount(b.amount, f.amount)) return false;
  if (has("item") && !b.items.some((i) => inList("item", itemKind(i)))) return false;
  if (
    has("zone") &&
    !b.items.some((i) => {
      const z = itemZone(i);
      return !!z && inList("zone", z);
    })
  )
    return false;
  return true;
}
const chan = (c: string) =>
  ({
    Online: "blue",
    "Walk-in": "amber",
    Phone: "indigo",
    "Call Center": "indigo",
    Admin: "indigo",
    "Support Agent": "indigo",
    Cashier: "green",
    "Pay-by-link": "coral",
  })[c] || "slate";

/* Items of one booking, stacked under the booking. */
/** One line per booking (AENR-634): "2 sets · Central CE-89, CE-90 · + parking, locker". */
export function itemSummary(items: readonly string[]): string {
  const sets = items.filter((i) => i.startsWith("Sunbed · ")).map((i) => i.split(" · "));
  const byZone = new Map<string, string[]>();
  sets.forEach(([, z, id]) => byZone.set(z, [...(byZone.get(z) ?? []), id]));
  const others = [...new Set(items.filter((i) => !i.startsWith("Sunbed · ")).map((i) => i.split(" · ")[0].replace(/^Day /, "").toLowerCase()))];
  const head = sets.length
    ? `${sets.length} set${sets.length === 1 ? "" : "s"} · ${[...byZone].map(([z, ids]) => `${z} ${ids.join(", ")}`).join("; ")}`
    : items[0] ?? "—";
  const rest = sets.length ? others : others.slice(1);
  return rest.length ? `${head} · + ${rest.join(", ")}` : head;
}

export function AdminBookings() {
  const { toast, persona, bookingNotes, go } = useApp();
  const agent = persona === "callcenter";
  const ops = useBookingOps();
  const beach = useBeachState(DEMO_TODAY);
  const entry = useEntry();
  const liveSlots = useLiveSlots("walkin");
  const [q, setQ] = useState("");
  // Tab, sort and page live in the URL (AENR-551).
  const { sort, setSort, page, setPage } = useListUrl();
  const loading = useMockLoad();
  const PAGE = 30;
  const params = readHashQuery();
  // Lists open where the work is (AENR-624): Today by default, then the last tab used;
  // a ?tab= link always wins.
  const TAB_KEY = `slaice.bookings.tab.${persona}`;
  // Old ?tab=unpaid links (a status) still work: they open All with that chip.
  const [tab, setTabRaw] = useState<When>(() => {
    const raw = params.get("tab");
    const fromUrl = WHEN.find((t) => t.k === raw)?.k ?? (STATUS.some((x) => x.k === raw) ? "all" : undefined);
    if (fromUrl) return fromUrl;
    try {
      const saved = WHEN.find((t) => t.k === localStorage.getItem(TAB_KEY))?.k;
      if (saved) return saved;
    } catch {
      /* storage blocked — fall back to Today */
    }
    return "today";
  });
  const [statusPick, setStatusRaw] = useState<Status | "">(
    () => STATUS.find((x) => x.k === (params.get("status") ?? params.get("tab")))?.k ?? "",
  );
  const setStatus = (v: Status | "") => {
    setStatusRaw(v);
    setPage(0);
    writeHashQuery(v ? { status: v } : {}, ["status"]);
  };
  const [openId, setOpenIdRaw] = useState<string | null>(() => params.get("booking"));
  const setTab = (t: When) => {
    setTabRaw(t);
    setPage(0);
    writeHashQuery({ tab: t }, ["tab"]);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* storage blocked — the URL still carries the tab */
    }
  };
  const setOpenId = (id: string | null) => {
    setOpenIdRaw(id);
    writeHashQuery(id ? { booking: id } : {}, ["booking"]);
  };
  // A deep link while already on this page (⌘K) opens that booking.
  useEffect(() => {
    const on = () => { const id = readHashQuery().get("booking"); if (id) setOpenIdRaw(id); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const [period, setPeriodRaw] = usePeriod({ kind: "all" });
  const setPeriod = (p: Parameters<typeof setPeriodRaw>[0]) => {
    setPeriodRaw(p);
    setPage(0);
  };
  const range = resolveRange(period);
  const [filters, setFiltersRaw] = useState<FilterState>(() =>
    filtersFromParams(BOOKING_FILTERS, params),
  );
  const setFilters = (f: FilterState) => {
    setFiltersRaw(f);
    setPage(0);
    writeHashQuery(
      filtersToParams(BOOKING_FILTERS, f),
      BOOKING_FILTERS.map((d) => d.key),
    );
  };

  // Period + filters + search first; the tabs then split that set by status (with counts).
  const base = ops.bookings.filter(
    (b) =>
      inRange(b.visitIso, range) &&
      matchFilters(b, filters) &&
      `${b.id} ${b.who} ${b.surname} ${b.phone} ${b.items.join(" ")}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const counts = Object.fromEntries(WHEN.map((t) => [t.k, base.filter(t.test).length])) as Record<When, number>;
  const inWhen = base.filter(WHEN.find((t) => t.k === tab)!.test);
  const statusCounts = Object.fromEntries(STATUS.map((x) => [x.k, inWhen.filter(x.test).length])) as Record<Status, number>;
  // A chip with no bookings is never shown, so it can't stay selected either.
  const status = statusPick && statusCounts[statusPick] > 0 ? statusPick : "";
  const filtered = status ? inWhen.filter(STATUS.find((x) => x.k === status)!.test) : inWhen;
  const anyFilter = !!range || !!q || activeCount(filters) > 0 || tab !== "all" || !!status;
  const sortVal = (b: OpsBooking): string | number => {
    switch (sort?.key) {
      case "id":
        return b.id;
      case "guest":
        return `${b.who} ${b.surname}`;
      case "amount":
        return b.amount;
      case "date":
        return dateVal(b.date);
      default:
        return 0;
    }
  };
  const sorted = sort
    ? [...filtered].sort((a, b) => cmpVal(sortVal(a), sortVal(b)) * sort.dir)
    : filtered;
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * PAGE, safePage * PAGE + PAGE);
  const onSort = (k: string) => {
    setSort((s) => (s?.key === k ? { key: k, dir: s.dir === 1 ? -1 : 1 } : { key: k, dir: 1 }));
    setPage(0);
  };
  const open = ops.bookings.find((b) => b.id === openId) ?? null;

  // One report, PDF or CSV (AENR-593): the bookings in view, with their headline numbers.
  const exportBookings = (format: "pdf" | "csv") => {
    const tabLabel = `${WHEN.find((t) => t.k === tab)!.l}${status ? ` · ${STATUS.find((x) => x.k === status)!.l}` : ""}`;
    const nf = Object.values(filters).filter((v) => (Array.isArray(v) ? v.length > 0 : !!v)).length;
    const revenue = sorted.filter((b) => b.status !== "Cancelled" && b.status !== "Refunded" && b.status !== "Expired").reduce((a, b) => a + b.amount, 0);
    const byStatus = [...new Set(sorted.map((b) => b.status))].map((st) => `${st} ${sorted.filter((b) => b.status === st).length}`).join(" · ");
    downloadReport(
      range ? `bookings-${range.from}_${range.to}` : "bookings",
      {
        title: "Bookings",
        subtitle: `${range ? rangeLabel(range) : "All dates"} · ${tabLabel}${nf ? ` · ${nf} filter${nf === 1 ? "" : "s"}` : ""}${q ? ` · search “${q}”` : ""}`,
        meta: [`${TENANT.name} · exported by ${persona === "callcenter" ? "Call Center" : "Manager / Admin"}`],
        sections: [
          {
            kpis: [
              { label: "Bookings", value: String(sorted.length) },
              { label: "Booked value", value: `€${revenue.toLocaleString("en-GB")}`, sub: "excl. cancelled / refunded" },
              { label: "Items", value: String(sorted.reduce((a, b) => a + b.items.length, 0)) },
              { label: "Confirmed", value: String(sorted.filter((b) => b.status === "Confirmed").length), sub: byStatus },
            ],
          },
          {
            title: "Bookings",
            table: {
              cols: ["Booking", "Guest", "Phone", "Items", "Visit", "Channel", "Status", "Amount (€)"],
              rows: sorted.map((b) => [b.id, `${b.who} ${b.surname}`.trim(), b.phone || "—", b.items.join(" · ") || "—", b.date, b.channel, b.status, b.amount]),
              total: ["Total", "", "", "", "", "", "", sorted.reduce((a, b) => a + b.amount, 0)],
            },
          },
        ],
      },
      format,
    );
    toast(`Exported ${sorted.length} bookings (${format.toUpperCase()}).`, { tone: "success" });
  };
  // Today: who is already on the sand (AENR-634), read like Live beach.
  const arrivalBadge = (b: OpsBooking) => {
    // A group comes through the gate in turns on one QR (AENR-715): In progress · 2 of 4 entries until everyone is.
    const g = entry.stateOf(b, DEMO_TODAY);
    if (g.arrivals.length) return <ArrivalBadge st={g} />;
    const ids = b.items.filter((i) => i.startsWith("Sunbed · ")).map((i) => i.split(" · "));
    if (!ids.length) return <span className="text-slate-400">—</span>;
    const states = ids.map(([, zName, id]) => {
      const z = zoneByName(zName);
      const slot = z ? liveSlots(z, [DEMO_TODAY]).find((x) => x.id === id) : undefined;
      return slot ? beach.statusOf(slot) : "booked";
    });
    const noShow = ids.some(([, zName, id]) => {
      const z = zoneByName(zName);
      const slot = z ? liveSlots(z, [DEMO_TODAY]).find((x) => x.id === id) : undefined;
      return slot ? beach.exOf(slot).includes("noshow") : false;
    });
    if (states.every((x) => x === "occupied" || x === "vacated")) return <Badge tone="green">Arrived</Badge>;
    if (noShow) return <Badge tone="red">No-show</Badge>;
    return <Badge tone="slate">Expected</Badge>;
  };
  const tabs: TabEntry[] = WHEN.map((t) => [t.k, `${t.l} ${counts[t.k]}`]);

  return (
    <div>
      <PageHead
        daily
        sub={agent ? "Find a caller’s booking, resend their QR, move them or ask a manager for a refund." : "Every booking from every channel — find it, open it, act on it."}
        primary={<Btn variant="primary" icon={Icon.plus} onClick={() => go(persona, "newbooking")}>New booking</Btn>}
        actions={agent ? undefined : <ExportMenu onExport={exportBookings} what="bookings" />}
      />
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-xl ring-1 ring-slate-200 px-3 py-2 max-w-sm flex-1 min-w-[200px] text-slate-600">
            <Icon.search size={16} />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
                // A search looks through every booking, not only today's.
                if (e.target.value.trim() && tab !== "all") setTabRaw("all");
              }}
              placeholder="Search bookings…"
              aria-label="Search bookings by ID, name, phone or item"
              className="text-sm outline-none w-full bg-transparent text-ink"
            />
          </div>
          {/* Dates and every filter live in one sheet; active ones show as chips (AENR-624). */}
          <FilterBar
            sheet
            defs={BOOKING_FILTERS}
            value={filters}
            onChange={setFilters}
            extraChips={range ? [{ key: "period", label: rangeLabel(range), remove: () => setPeriod({ kind: "all" }) }] : []}
            count={filterCount(sorted.length, ops.bookings.length, "bookings", filters, !!range || !!q || tab !== "all")}
          >
            <div>
              <div className="text-[12px] font-semibold text-slate-700 mb-1.5">Dates</div>
              <PeriodPicker value={period} onChange={setPeriod} allowAll presets={["day", "week", "month", "year", "season"]} resetTo={{ kind: "all" }} />
            </div>
          </FilterBar>
          <span className="ml-auto hidden lg:inline-flex"><DensityToggle /></span>
        </div>
        <Tabs
          scroll
          tabs={tabs}
          value={tab}
          onChange={(v) => setTab(v as When)}
          className="mb-2"
        />
        {STATUS.some((x) => statusCounts[x.k] > 0) && (
          <div role="radiogroup" aria-label="Status" className="flex flex-wrap gap-1.5 mb-3">
            {STATUS.filter((x) => statusCounts[x.k] > 0).map((x) => (
              <button
                key={x.k}
                type="button"
                role="radio"
                aria-checked={status === x.k}
                onClick={() => setStatus(status === x.k ? "" : x.k)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 min-h-[34px] [@media(pointer:coarse)]:min-h-[44px] text-[12.5px] font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${status === x.k ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-navy-900 ring-slate-200 hover:ring-teal-400"}`}
              >
                {x.l} <span className={`tnum ${status === x.k ? "text-white/75" : "text-slate-500"}`}>{statusCounts[x.k]}</span>
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <TableSkeleton rows={5} cols={8} />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Icon.search}
            title="No matching bookings"
            body={
              q
                ? `Nothing matches “${q}”${range ? ` in ${rangeLabel(range)}` : ""}. Try a different name, sunbed code or booking ID.`
                : `No ${tab === "all" ? "" : WHEN.find((t) => t.k === tab)!.l.toLowerCase() + " "}bookings${range ? ` in ${rangeLabel(range)}` : ""} with these filters.`
            }
            action={
              anyFilter ? (
                <Btn
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setQ("");
                    setFilters({});
                    setPeriod({ kind: "all" });
                    setTab("all");
                    setStatus("");
                  }}
                >
                  Clear filters
                </Btn>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Phones and portrait tablets (AENR-700): one compact, fully tappable row per booking instead of a tall
                key/value card — ref and guest, what was booked, status and amount. */}
            <div className="lg:hidden">
            <CompactList label="Bookings">
              {pageRows.map((b) => {
                const pending = ops.pendingRefund(b.id);
                const escalated = bookingNotes[b.id]?.some((n) => n.escalated);
                return (
                  <CompactRow
                    key={b.id}
                    onOpen={() => setOpenId(b.id)}
                    openLabel={`Open booking ${b.id} · ${b.who} ${b.surname}`}
                    title={`${b.who} ${b.surname}`}
                    reference={b.id}
                    sub={`${itemSummary(b.items)} · ${b.date}`}
                    badges={
                      <>
                        <StatusBadge status={b.status} />
                        {tab === "today" && arrivalBadge(b)}
                        <Badge tone={chan(b.channel)}>{b.channel}</Badge>
                        {pending && <Badge tone="amber"><Icon.refund size={10} /> Refund pending</Badge>}
                        {escalated && <Badge tone="red"><Icon.bell size={10} /> Escalated</Badge>}
                      </>
                    }
                    amount={`€${b.amount}`}
                  />
                );
              })}
            </CompactList>
            </div>
            <div className="hidden lg:block">
            <Table
              rowLink
              dense
              right={[tab === "today" ? 7 : 6]}
              cols={[
                <SortHeader label="Booking" k="id" sort={sort} onSort={onSort} />,
                <SortHeader label="Guest" k="guest" sort={sort} onSort={onSort} />,
                "Items",
                <SortHeader label="Date" k="date" sort={sort} onSort={onSort} />,
                "Channel",
                ...(tab === "today" ? ["Arrival"] : []),
                "Status",
                <SortHeader label="Amount" k="amount" sort={sort} onSort={onSort} align="right" />,
              ]}
              rows={pageRows.map((b) => {
                const pending = ops.pendingRefund(b.id);
                const escalated = bookingNotes[b.id]?.some((n) => n.escalated);
                return [
                  <button
                    type="button"
                    className="row-link whitespace-nowrap font-semibold text-navy-900 hover:text-teal-700"
                    onClick={() => setOpenId(b.id)}
                    aria-label={`Open booking ${b.id} · ${b.who} ${b.surname}`}
                  >
                    {b.id}
                  </button>,
                  <div className="leading-tight">
                    <div className="font-medium text-navy-900 whitespace-nowrap">
                      {b.who} {b.surname}
                    </div>
                    {b.phone && (
                      <div className="text-[11.5px] text-slate-500 tnum whitespace-nowrap">
                        <Masked value={b.phone} />
                      </div>
                    )}
                  </div>,
                  <span className="block max-w-[18rem] truncate" title={b.items.join("\n")}>{itemSummary(b.items)}</span>,
                  <span className="whitespace-nowrap">{b.date}</span>,
                  <Badge tone={chan(b.channel)}>{b.channel}</Badge>,
                  ...(tab === "today" ? [arrivalBadge(b)] : []),
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={b.status} />
                    {pending && (
                      <Badge tone="amber">
                        <Icon.refund size={10} /> Refund pending
                      </Badge>
                    )}
                    {escalated && (
                      <Badge tone="red">
                        <Icon.bell size={10} /> Escalated
                      </Badge>
                    )}
                  </div>,
                  `€${b.amount}`,
                ];
              })}
            />
            </div>
            {pageCount > 1 && (
              <Pager
                page={safePage}
                pageCount={pageCount}
                total={sorted.length}
                pageSize={PAGE}
                onPage={setPage}
              />
            )}
          </>
        )}
      </Card>
      <BookingDrawer booking={open} onClose={() => setOpenId(null)} agent={agent} />
    </div>
  );
}
