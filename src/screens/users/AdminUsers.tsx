import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, ConfirmModal, EmptyState, ErrorState, Field, Input, Modal, Table, TableSkeleton, Toggle } from "../../components/ui";
import { useApp } from "../../app/store";
import { listCustomers } from "../../api";
import { useAsync } from "../../lib/useAsync";
import type { Customer } from "../../domain/types";
import { downloadCSV } from "../../lib/download";
import { guestFacts, type GuestFacts } from "../../data/guests";
import { SEGMENT_COLORS, fieldOf, segmentsFor, inSegment, ruleLabel, type Segment } from "../../domain/segments";
import { DEMO_TODAY } from "../../domain/period";
import { SegmentBuilder } from "./SegmentBuilder";
import { GuestProfile } from "./GuestProfile";
import { ImportModal, MergeModal, duplicateOf, mergeGuests, type ImportRow } from "./GuestTools";
import { FilterBar, Select } from "../../components/ui";
import { isAmount, matchAmount, type FilterDef, type FilterState } from "../../domain/filters";
import { Pager, SortHeader, cmpVal, type SortState } from "../../components/TableTools";
import { CHANNELS_CRM } from "../../data/guests";
import { ZONES } from "../../data/beach";
import { RFM_TONE, SCORE_FIELDS, STAGES, STAGE_HELP, STAGE_TONE, predictedNextVisit, rfmScores, stageOf, type LifecycleSettings, type Stage } from "../../domain/lifecycle";
import { fmtDay } from "../../domain/period";
import type { ReactNode } from "react";


/* ============ USERS & SEGMENTS ============
   Guests are grouped by segments: built-in ones (VIP, Season pass, and
   "Over N visits", whose threshold is editable) plus the tenant's own
   rule-based segments (AENR-474). Manual tags (VIP, Season pass, custom tags)
   live on the guest. The lifecycle stage (First visit → Active → Regular →
   At risk → Lapsed) is the one classification of a guest — the old automatic
   New / Regular tags are retired and stripped from saved tags (AENR-548). */
const AUTO = ["New", "Regular"];
// "Elena V." stands in for the signed-in customer, so a pass she buys shows here.
const DEMO_CUSTOMER_ID = 3;
const manualOf = (tags: string[]) => tags.filter((t) => !AUTO.includes(t));
const tagTone = (t: string) => ({ VIP: "amber", "Season pass": "blue" }[t] || "indigo");

type Guest = GuestFacts & { name: string; customer: Customer };

export function AdminUsers() {
  const { toast, passes, crm, setCrm, go } = useApp();
  const ra = crm.regularAfter;
  const [q, setQ] = useState("");
  const [segId, setSegId] = useState("all");
  const customersQ = useAsync(listCustomers);
  const [editId, setEditId] = useState<number | null>(null);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [builder, setBuilder] = useState<Segment | "new" | null>(null);
  const [tagModal, setTagModal] = useState(false);
  const [deleting, setDeleting] = useState<Segment | null>(null);

  // Seed roster + persisted edits (manual tags only — New/Regular are derived).
  const list: Customer[] = customersQ.status === "success"
    ? [...customersQ.data, ...crm.imported].filter((c) => !crm.mergedAway.includes(c.id)).map((c) => ({ ...c, tags: manualOf(c.tags), ...crm.edits[c.id] }))
    : [];
  // The signed-in customer reflects any pass she holds as an automatic tag
  // (marked with a wallet glyph so it reads as pass-derived, not hand-assigned).
  const passTags = [passes.vip ? "VIP" : null, passes.season ? "Season pass" : null].filter(Boolean) as string[];
  const tagsFor = (u: Customer): { t: string; pass: boolean }[] => {
    const base = manualOf(u.tags).map((t) => ({ t, pass: false }));
    if (u.id !== DEMO_CUSTOMER_ID || passTags.length === 0) return base;
    passTags.forEach((pt) => {
      const hit = base.find((b) => b.t === pt);
      if (hit) hit.pass = true;
      else base.push({ t: pt, pass: true });
    });
    return base;
  };
  const base = list.map((u) => {
    const tags = tagsFor(u).map((x) => x.t);
    const f = guestFacts({ ...u, tags }, tags.filter((t) => !AUTO.includes(t) && t !== "VIP" && t !== "Season pass"));
    return { ...f, name: `${u.first} ${u.last}`, customer: u };
  });
  // Lifecycle stage + RFM score per guest (AENR-475), usable in segments too.
  const rfm = rfmScores(base);
  const guests: Guest[] = base.map((g) => ({ ...g, lifecycle: stageOf(g, ra, crm.lifecycle), rfm: rfm.get(g.id)?.label }));
  const byId = new Map(guests.map((g) => [g.id, g]));
  const [stageF, setStageF] = useState<Stage | null>(null);
  const [lcModal, setLcModal] = useState(false);

  // Built-in segments (threshold from the CRM settings) + saved ones.
  const segments = segmentsFor(crm.segments, ra);
  const members = (sg: Segment) => guests.filter((g) => inSegment(g, sg, DEMO_TODAY, SCORE_FIELDS));
  const active = segments.find((sg) => sg.id === segId) ?? null;
  const inActive = active ? new Set(members(active).map((g) => g.id)) : null;
  // Ad-hoc filters, sorting, paging and bulk selection (AENR-476).
  const [filters, setFiltersRaw] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [bulkMsg, setBulkMsg] = useState(false);
  const [eraseAsk, setEraseAsk] = useState(false);
  const setFilters = (f: FilterState) => { setFiltersRaw(f); setPage(0); };
  const guestFilterDefs: FilterDef[] = [
    { key: "visits", label: "Visits", kind: "amount", unit: "" },
    { key: "spend", label: "Spend", kind: "amount" },
    { key: "days", label: "Days since last visit", kind: "amount", unit: "" },
    { key: "stage", label: "Lifecycle", kind: "multi", options: STAGES.map((x) => ({ v: x, l: x })) },
    { key: "channel", label: "Channel", kind: "multi", options: CHANNELS_CRM.map((x) => ({ v: x, l: x })) },
    { key: "zone", label: "Zone", kind: "multi", options: ZONES.map((z) => ({ v: z.name, l: z.name })) },
    { key: "pass", label: "Pass", kind: "multi", options: ["VIP", "Season pass", "None"].map((x) => ({ v: x, l: x })) },
    { key: "consent", label: "Consent", kind: "multi", options: [{ v: "email", l: "E-mail" }, { v: "sms", l: "SMS" }, { v: "viber", l: "Viber" }] },
    { key: "tag", label: "Tag", kind: "multi", options: crm.tagDefs.map((t) => ({ v: t.name, l: t.name })) },
  ];
  const fMulti = (k: string) => (Array.isArray(filters[k]) ? (filters[k] as string[]) : []);
  const matchFilters = (g: Guest) =>
    (!isAmount(filters.visits) || matchAmount(g.visits, filters.visits)) &&
    (!isAmount(filters.spend) || matchAmount(g.spend, filters.spend)) &&
    (!isAmount(filters.days) || matchAmount(g.daysSinceLast, filters.days)) &&
    (!fMulti("stage").length || fMulti("stage").includes(g.lifecycle ?? "")) &&
    (!fMulti("channel").length || fMulti("channel").includes(g.channel)) &&
    (!fMulti("zone").length || fMulti("zone").includes(g.zone)) &&
    (!fMulti("pass").length || fMulti("pass").includes(g.pass)) &&
    (!fMulti("consent").length || fMulti("consent").some((c) => g.consent.includes(c))) &&
    (!fMulti("tag").length || fMulti("tag").some((t) => g.tags.includes(t)));
  const filtered = list.filter((u) => { const g = byId.get(u.id)!; return (!inActive || inActive.has(u.id)) && (!stageF || g.lifecycle === stageF) && matchFilters(g) && (u.first + u.last + u.email + u.phone).toLowerCase().includes(q.toLowerCase()); });
  const sortVal = (u: Customer): string | number => { const g = byId.get(u.id)!; return sort?.key === "name" ? `${u.first} ${u.last}` : sort?.key === "surname" ? u.last : sort?.key === "visits" ? u.bookings : sort?.key === "spend" ? g.spend : sort?.key === "last" ? g.lastVisit : 0; };
  const sorted = sort ? [...filtered].sort((a, b) => cmpVal(sortVal(a), sortVal(b)) * sort.dir) : filtered;
  const PAGE = 25;
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = sorted.slice(safePage * PAGE, safePage * PAGE + PAGE);
  const onSort = (k: string) => setSort((x) => (x?.key === k ? { key: k, dir: x.dir === 1 ? -1 : 1 } : { key: k, dir: 1 }));
  const selected = list.filter((u) => sel.has(u.id));
  const toggleSel = (id: number) => setSel((x) => { const n = new Set(x); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allShownSelected = sorted.length > 0 && sorted.every((u) => sel.has(u.id));
  const dupPairs: [Customer, Customer][] = list.flatMap((a, i) => list.slice(i + 1).filter((b) => duplicateOf(b, [a])).map((b) => [a, b] as [Customer, Customer]));
  // Bulk actions
  const editTags = (ids: number[], fn: (tags: string[]) => string[]) => setCrm((c) => {
    const edits = { ...c.edits };
    ids.forEach((id) => { const u = list.find((x) => x.id === id); if (u) edits[id] = { ...edits[id], tags: fn(u.tags) }; });
    return { ...c, edits };
  });
  const bulkTag = (t: string, add: boolean) => {
    editTags([...sel], (tags) => (add ? [...new Set([...tags, t])] : tags.filter((x) => x !== t)));
    toast(`${add ? "Added" : "Removed"} “${t}” ${add ? "to" : "from"} ${sel.size} guest${sel.size === 1 ? "" : "s"}.`, { tone: "success" });
  };
  const bulkStatic = (segIdTo: string | null) => {
    const ids = [...sel];
    if (segIdTo) {
      setCrm((c) => ({ ...c, segments: c.segments.map((x) => (x.id === segIdTo ? { ...x, members: [...new Set([...(x.members ?? []), ...ids])], updatedAt: new Date().toISOString() } : x)) }));
      toast(`Added ${ids.length} guests to the segment.`, { tone: "success" });
    } else {
      const sg: Segment = { id: `seg-${Date.now().toString(36)}`, name: `Selection ${fmtDay(DEMO_TODAY)}`, color: SEGMENT_COLORS[5], kind: "static", match: "all", rules: [], members: ids, updatedAt: new Date().toISOString() };
      setCrm((c) => ({ ...c, segments: [...c.segments, sg] }));
      toast(`Static segment “${sg.name}” created with ${ids.length} guests — rename it from its menu.`, { tone: "success" });
    }
  };
  const importRows = (irs: ImportRow[], mergeDup: boolean) => {
    let next = 1000 + crm.imported.length;
    const added: Customer[] = [];
    let merged = 0;
    const edits = { ...crm.edits };
    irs.forEach((r) => {
      if (mergeDup && r.dupOf !== null) {
        const base = list.find((x) => x.id === r.dupOf);
        if (base) { edits[base.id] = { ...edits[base.id], phone: base.phone || r.phone, email: base.email || r.email }; merged++; return; }
      }
      added.push({ id: next++, name: `${r.first} ${r.last.charAt(0)}.`, first: r.first, last: r.last, email: r.email, phone: r.phone, bookings: 0, spend: 0, tags: [], lastVisit: fmtDay(DEMO_TODAY) });
    });
    setCrm((c) => ({ ...c, edits, imported: [...c.imported, ...added] }));
    setImportOpen(false);
    toast(`Imported ${added.length} new guest${added.length === 1 ? "" : "s"}${merged ? `, merged ${merged} into existing guests` : ""}.`, { tone: "success" });
  };
  const doMerge = (keep: Customer, drop: Customer) => {
    const m = mergeGuests(keep, drop);
    setCrm((c) => ({ ...c, mergedAway: [...c.mergedAway, drop.id], edits: { ...c.edits, [keep.id]: { ...c.edits[keep.id], phone: m.phone, email: m.email, bookings: m.bookings, spend: m.spend, tags: m.tags } } }));
    toast(`Merged ${drop.first} ${drop.last} into ${keep.first} ${keep.last}.`, { tone: "success" });
  };
  const cols = crm.columns;
  const OPTIONAL: { k: string; l: string; cell: (g: Guest) => ReactNode; right?: boolean }[] = [
    { k: "lifecycle", l: "Lifecycle", cell: (g) => <Badge tone={STAGE_TONE[g.lifecycle as Stage]}>{g.lifecycle}</Badge> },
    { k: "rfm", l: "RFM", cell: (g) => { const x = rfm.get(g.id)!; return <span className="whitespace-nowrap"><Badge tone={RFM_TONE[x.label]}>{x.label}</Badge> <span className="text-[11px] text-slate-500 tnum">{x.r}{x.f}{x.m}</span></span>; } },
    { k: "spend", l: "Lifetime spend", cell: (g) => `€${g.spend.toLocaleString("en-GB")}`, right: true },
    { k: "lastVisit", l: "Last visit", cell: (g) => <span className="whitespace-nowrap">{fmtDay(g.lastVisit)}</span> },
    { k: "nextVisit", l: "Next visit (predicted)", cell: (g) => { const n = predictedNextVisit(g); return <span className="whitespace-nowrap text-slate-600">{n ? fmtDay(n) : "—"}</span>; } },
  ];
  const shownOptional = OPTIONAL.filter((c) => cols.includes(c.k));
  const stageCounts = STAGES.map((st) => ({ st, n: guests.filter((g) => g.lifecycle === st).length }));
  const editUser = editId !== null ? list.find((u) => u.id === editId) ?? null : null;
  const profileUser = profileId !== null ? list.find((u) => u.id === profileId) ?? null : null;
  const loading = customersQ.status === "loading";
  const tagNames = ["VIP", "Season pass", ...crm.tagDefs.map((t) => t.name)];

  const saveUser = (patch: Customer) => {
    setCrm((c) => ({ ...c, edits: { ...c.edits, [patch.id]: { first: patch.first, last: patch.last, phone: patch.phone, email: patch.email, bookings: patch.bookings, tags: patch.tags, name: patch.name } } }));
    setEditId(null);
    toast(`Saved ${patch.first} ${patch.last}.`, { tone: "success" });
  };
  const saveSegment = (sg: Segment) => {
    if (builder !== "new" && builder?.system) {
      // Built-in: only the New → Regular threshold is editable.
      const r = sg.rules.find((x) => x.field === "visits");
      if (builder.id === "sys-regular" && r) setCrm((c) => ({ ...c, regularAfter: Math.max(1, Number(r.a)) }));
      toast("Rule updated — guests re-segmented.", { tone: "success" });
    } else {
      setCrm((c) => ({ ...c, segments: c.segments.some((x) => x.id === sg.id) ? c.segments.map((x) => (x.id === sg.id ? sg : x)) : [...c.segments, sg] }));
      setSegId(sg.id);
      toast(`Segment “${sg.name}” saved · ${members(sg).length} guests.`, { tone: "success" });
    }
    setBuilder(null);
  };
  const duplicate = (sg: Segment) => {
    const copy: Segment = { ...sg, id: `seg-${Date.now().toString(36)}`, name: `${sg.name} (copy)`, system: undefined, updatedAt: new Date().toISOString() };
    setCrm((c) => ({ ...c, segments: [...c.segments, copy] }));
    setSegId(copy.id);
  };
  const exportSegment = (sg: Segment | null) => {
    const ms = sg ? members(sg) : guests;
    downloadCSV(`guests-${(sg?.name ?? "all").toLowerCase().replace(/\W+/g, "-")}.csv`, ["Name", "Surname", "Email", "Phone", "Visits", "Spend (€)", "Last visit", "Tags"],
      ms.map((g) => [g.customer.first, g.customer.last, g.customer.email, g.customer.phone, g.visits, g.spend, g.lastVisit, tagsFor(g.customer).map((x) => x.t).join(" · ")]));
    toast(`Exported ${ms.length} guests.`, { tone: "success" });
  };

  const chip = (on: boolean) => `inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg text-[12px] font-semibold ring-1 transition ${on ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 text-slate-700 hover:ring-slate-300"}`;
  const menuItem = "flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm cursor-pointer select-none outline-none data-[highlighted]:bg-slate-100";

  return (
    <div className="animate-fade-up">
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <label className="flex items-center gap-2 rounded-xl ring-1 ring-slate-200 px-3 py-2 max-w-xs flex-1 min-w-[180px] text-slate-600">
            <Icon.search size={16} /><span className="sr-only">Search guests</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="text-sm outline-none w-full bg-transparent text-ink" />
          </label>
          <div className="flex gap-2 ml-auto flex-wrap">
            <Btn variant="outline" icon={Icon.upload} onClick={() => setImportOpen(true)}>Import CSV</Btn>
            <Btn variant="outline" icon={Icon.users} onClick={() => setMergeOpen(true)}>Duplicates{dupPairs.length ? ` (${dupPairs.length})` : ""}</Btn>
            <Btn variant="outline" icon={Icon.tag} onClick={() => setTagModal(true)}>New tag</Btn>
            <Btn variant="primary" icon={Icon.plus} onClick={() => setBuilder("new")}>New segment</Btn>
          </div>
        </div>

        {/* Segments: built-in + saved, with live counts. */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3" role="group" aria-label="Segments">
          <button type="button" onClick={() => setSegId("all")} aria-pressed={segId === "all"} className={chip(segId === "all")}>All guests <span className="tnum opacity-70">{guests.length}</span></button>
          {segments.map((sg) => (
            <span key={sg.id} className="inline-flex items-center">
              <button type="button" onClick={() => setSegId(sg.id)} aria-pressed={segId === sg.id} className={chip(segId === sg.id)}>
                <i className="w-2 h-2 rounded-full" style={{ background: sg.color }} />{sg.name}<span className="tnum opacity-70">{members(sg).length}</span>
                {sg.kind === "static" && <span className="text-[10px] uppercase opacity-70">static</span>}
              </button>
              <DropdownMenu.Root modal={false}>
                <DropdownMenu.Trigger asChild>
                  <button type="button" aria-label={`Actions for segment ${sg.name}`} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Icon.more size={14} /></button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content align="start" sideOffset={6} className="glass !bg-white/95 w-52 rounded-xl p-1.5 z-[60] shadow-float text-ink">
                    {(!sg.system || sg.id === "sys-regular") && <DropdownMenu.Item className={menuItem} onSelect={() => setBuilder(sg)}><Icon.edit size={14} /> {sg.system ? "Edit rule" : "Edit"}</DropdownMenu.Item>}
                    <DropdownMenu.Item className={menuItem} onSelect={() => duplicate(sg)}><Icon.layers size={14} /> Duplicate</DropdownMenu.Item>
                    <DropdownMenu.Item className={menuItem} onSelect={() => exportSegment(sg)}><Icon.download size={14} /> Export CSV</DropdownMenu.Item>
                    <DropdownMenu.Item className={menuItem} onSelect={() => go("admin", "communicate")}><Icon.mail size={14} /> Message segment</DropdownMenu.Item>
                    {!sg.system && <><DropdownMenu.Separator className="my-1 h-px bg-slate-200" /><DropdownMenu.Item className={`${menuItem} text-rose-700`} onSelect={() => setDeleting(sg)}><Icon.trash size={14} /> Delete</DropdownMenu.Item></>}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </span>
          ))}
        </div>
        {/* Lifecycle overview — click a stage to filter (AENR-475). */}
        <div className="mb-3 grid grid-cols-2 sm:grid-cols-5 gap-2" role="group" aria-label="Guests by lifecycle stage">
          {stageCounts.map(({ st, n }) => (
            <button key={st} type="button" aria-pressed={stageF === st} onClick={() => setStageF(stageF === st ? null : st)} title={STAGE_HELP[st]}
              className={`rounded-xl px-3 py-2 text-left ring-1 transition ${stageF === st ? "ring-2 ring-navy-900 bg-white" : "ring-slate-200 bg-white/70 hover:ring-slate-300"}`}>
              <div className="flex items-center justify-between gap-2"><Badge tone={STAGE_TONE[st]}>{st}</Badge><span className="text-[11px] text-slate-500 tnum">{guests.length ? Math.round((n / guests.length) * 100) : 0}%</span></div>
              <div className="mt-1 text-[20px] font-bold text-navy-900 tnum font-display leading-none">{n}</div>
            </button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
          <button type="button" onClick={() => setLcModal(true)} className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-navy-900"><Icon.cog size={13} /> Lifecycle rules: at risk after {crm.lifecycle.atRiskDays} days, lapsed after {crm.lifecycle.lapsedDays}</button>
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
              <button type="button" className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold ring-1 ring-slate-200 bg-white hover:ring-slate-300"><Icon.layers size={13} /> Columns</button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={6} className="glass !bg-white/95 w-56 rounded-xl p-1.5 z-[60] shadow-float text-ink">
                {OPTIONAL.map((c) => (
                  <DropdownMenu.CheckboxItem key={c.k} checked={cols.includes(c.k)} onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(on) => setCrm((x) => ({ ...x, columns: on ? [...x.columns, c.k] : x.columns.filter((k) => k !== c.k) }))}
                    className={menuItem}>
                    <span className={`w-4 h-4 rounded grid place-items-center ring-1 ${cols.includes(c.k) ? "bg-teal-600 ring-teal-600 text-white" : "ring-slate-300"}`}>{cols.includes(c.k) && <Icon.check size={11} />}</span>{c.l}
                  </DropdownMenu.CheckboxItem>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
        {active && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-[12px] text-slate-600">
            <i className="w-2.5 h-2.5 rounded-full" style={{ background: active.color }} />
            <b className="text-navy-900">{active.name}</b>
            <span>{active.kind === "static" ? `Fixed list of ${active.members?.length ?? 0} guests` : active.rules.map((r) => ruleLabel(r, fieldOf(r.field, SCORE_FIELDS))).join(active.match === "all" ? " AND " : " OR ")}</span>
            <span className="ml-auto flex gap-1.5">
              <Btn size="sm" variant="ghost" icon={Icon.download} onClick={() => exportSegment(active)}>Export</Btn>
              <Btn size="sm" variant="ghost" icon={Icon.mail} onClick={() => go("admin", "communicate")}>Message</Btn>
            </span>
          </div>
        )}
        {!active && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-slaice-100 ring-1 ring-slaice-600/20 px-3 py-2 text-[12px] text-slaice-700">
            <Icon.info size={14} className="shrink-0 mt-0.5 text-slaice-600" />
            <span>Each guest has one <b>lifecycle stage</b> — a guest is <b>Regular</b> after more than {ra} visits while they keep coming (edit the threshold from the <b>Over {ra} visits</b> segment). <b>VIP</b>, <b>Season pass</b> and custom tags are assigned on a guest. Build your own with <b>New segment</b>.</span>
          </div>
        )}
        <div className="mb-3"><FilterBar defs={guestFilterDefs} value={filters} onChange={setFilters} count={`${sorted.length} of ${list.length} guests`} /></div>
        {sel.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-navy-900 text-white px-3 py-2 text-[13px]" role="region" aria-label="Bulk actions">
            <b className="tnum">{sel.size} selected</b>
            {!allShownSelected && sorted.length > sel.size && <button type="button" className="underline underline-offset-2" onClick={() => setSel(new Set(sorted.map((u) => u.id)))}>Select all {sorted.length} matching</button>}
            <span className="flex-1" />
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild><button type="button" className="rounded-lg bg-white/15 hover:bg-white/25 px-2.5 py-1.5 font-semibold inline-flex items-center gap-1.5"><Icon.tag size={13} /> Tag</button></DropdownMenu.Trigger>
              <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={6} className="glass !bg-white/95 w-56 rounded-xl p-1.5 z-[60] shadow-float text-ink">
                {tagNames.map((t) => <DropdownMenu.Item key={`a${t}`} className={menuItem} onSelect={() => bulkTag(t, true)}><Icon.plus size={13} /> Add “{t}”</DropdownMenu.Item>)}
                <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
                {tagNames.map((t) => <DropdownMenu.Item key={`r${t}`} className={menuItem} onSelect={() => bulkTag(t, false)}><Icon.x size={13} /> Remove “{t}”</DropdownMenu.Item>)}
              </DropdownMenu.Content></DropdownMenu.Portal>
            </DropdownMenu.Root>
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild><button type="button" className="rounded-lg bg-white/15 hover:bg-white/25 px-2.5 py-1.5 font-semibold inline-flex items-center gap-1.5"><Icon.layers size={13} /> Add to segment</button></DropdownMenu.Trigger>
              <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={6} className="glass !bg-white/95 w-60 rounded-xl p-1.5 z-[60] shadow-float text-ink">
                <DropdownMenu.Item className={menuItem} onSelect={() => bulkStatic(null)}><Icon.plus size={13} /> New static segment</DropdownMenu.Item>
                {crm.segments.filter((x) => x.kind === "static").map((x) => <DropdownMenu.Item key={x.id} className={menuItem} onSelect={() => bulkStatic(x.id)}><i className="w-2 h-2 rounded-full" style={{ background: x.color }} /> {x.name}</DropdownMenu.Item>)}
              </DropdownMenu.Content></DropdownMenu.Portal>
            </DropdownMenu.Root>
            <button type="button" onClick={() => setBulkMsg(true)} className="rounded-lg bg-white/15 hover:bg-white/25 px-2.5 py-1.5 font-semibold inline-flex items-center gap-1.5"><Icon.mail size={13} /> Message</button>
            <button type="button" onClick={() => { downloadCSV(`guests-selection-${selected.length}.csv`, ["Name", "Surname", "Email", "Phone", "Visits", "Spend (€)"], selected.map((u) => [u.first, u.last, u.email, u.phone, u.bookings, byId.get(u.id)?.spend ?? 0])); toast(`Exported ${selected.length} guests.`, { tone: "success" }); }} className="rounded-lg bg-white/15 hover:bg-white/25 px-2.5 py-1.5 font-semibold inline-flex items-center gap-1.5"><Icon.download size={13} /> Export</button>
            <button type="button" onClick={() => setEraseAsk(true)} className="rounded-lg bg-white/15 hover:bg-rose-500/40 px-2.5 py-1.5 font-semibold inline-flex items-center gap-1.5"><Icon.shield size={13} /> Erasure request</button>
            <button type="button" onClick={() => setSel(new Set())} aria-label="Clear selection" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/15"><Icon.x size={14} /></button>
          </div>
        )}
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : customersQ.status === "error" ? (
          <ErrorState compact body="We couldn't load the customer list." onRetry={customersQ.refetch} />
        ) : rows.length === 0 ? (
          <EmptyState compact icon={Icon.users} title="No users match" body="Try a different search, segment or filter."
            action={<Btn size="sm" variant="outline" onClick={() => { setQ(""); setFilters({}); setStageF(null); setSegId("all"); }}>Clear filters</Btn>} />
        ) : (
          <>
          <Table dense={shownOptional.length > 1}
            cols={[<input type="checkbox" aria-label="Select all shown guests" checked={allShownSelected} onChange={(e) => setSel(e.target.checked ? new Set(sorted.map((u) => u.id)) : new Set())} className="w-4 h-4 accent-teal-600" />,
              <SortHeader label="Name" k="name" sort={sort} onSort={onSort} />, <SortHeader label="Surname" k="surname" sort={sort} onSort={onSort} />, "Phone", "Email",
              <SortHeader label="Visits" k="visits" sort={sort} onSort={onSort} align="right" />, ...shownOptional.map((c) => (c.k === "spend" ? <SortHeader key={c.k} label={c.l} k="spend" sort={sort} onSort={onSort} align="right" /> : c.k === "lastVisit" ? <SortHeader key={c.k} label={c.l} k="last" sort={sort} onSort={onSort} /> : c.l)), "Tags", ""]}
            right={[5, ...shownOptional.map((c, i) => (c.right ? 6 + i : -1)).filter((i) => i >= 0)]}
            rows={rows.map((u) => [<input type="checkbox" aria-label={`Select ${u.first} ${u.last}`} checked={sel.has(u.id)} onChange={() => toggleSel(u.id)} className="w-4 h-4 accent-teal-600" />,
              <span className="inline-flex items-center gap-1.5">{crm.profiles[u.id]?.important && <Icon.star size={12} className="text-amber-500" aria-label="Important guest" />}{u.first}{crm.eraseRequests.includes(u.id) && <Badge tone="red">Erasure requested</Badge>}{u.id >= 1000 && <Badge tone="slate">Imported</Badge>}</span>, u.last, <span className="tnum whitespace-nowrap">{u.phone}</span>, u.email, u.bookings, ...shownOptional.map((c) => c.cell(byId.get(u.id)!)),
              <span className="flex gap-1 flex-wrap">{tagsFor(u).map(({ t, pass }) => <Badge key={t} tone={tagTone(t)} className="whitespace-nowrap">{pass && <Icon.wallet size={9} />}{t}</Badge>)}</span>,
              <div className="flex items-center justify-end gap-1">
                <Btn size="sm" variant="ghost" icon={Icon.edit} onClick={() => setEditId(u.id)}>Edit</Btn>
                <Btn size="sm" variant="ghost" icon={Icon.eye} onClick={() => setProfileId(u.id)}>Profile</Btn>
              </div>])} />
          {pageCount > 1 && <Pager page={safePage} pageCount={pageCount} total={sorted.length} pageSize={PAGE} onPage={setPage} />}
          </>
        )}
      </Card>
      {editUser && <UserEditModal user={editUser} tagNames={tagNames} onClose={() => setEditId(null)} onSave={saveUser} />}
      {profileUser && byId.get(profileUser.id) && (
        <GuestProfile guest={byId.get(profileUser.id)!} customer={profileUser} rfm={rfm.get(profileUser.id)}
          segments={segments.filter((sg) => inSegment(byId.get(profileUser.id)!, sg, DEMO_TODAY, SCORE_FIELDS))}
          tags={tagsFor(profileUser).map((x) => ({ t: x.t, tone: tagTone(x.t) }))}
          onClose={() => setProfileId(null)} onEdit={() => setEditId(profileUser.id)}
          onAddTag={(t) => editTags([profileUser.id], (tags) => [...new Set([...tags, t])])} />
      )}
      {builder && <SegmentBuilder initial={builder === "new" ? null : builder} guests={guests} extraFields={SCORE_FIELDS} tagOptions={crm.tagDefs.map((t) => t.name)} onClose={() => setBuilder(null)} onSave={saveSegment} />}
      {importOpen && <ImportModal existing={list} onClose={() => setImportOpen(false)} onImport={importRows} />}
      {mergeOpen && <MergeModal pairs={dupPairs} onClose={() => setMergeOpen(false)} onMerge={doMerge} />}
      {bulkMsg && <BulkMessageModal guests={selected.map((u) => byId.get(u.id)!)} onClose={() => setBulkMsg(false)} onSend={(ch, n, skipped) => { setBulkMsg(false); toast(`Demo — ${ch} queued for ${n} guest${n === 1 ? "" : "s"}${skipped ? ` · ${skipped} skipped (no ${ch} consent)` : ""}.`, { tone: "success" }); }} />}
      <ConfirmModal open={eraseAsk} onClose={() => setEraseAsk(false)} title={`Raise an erasure request for ${sel.size} guest${sel.size === 1 ? "" : "s"}?`} confirmLabel="Raise request"
        body="Creates a GDPR erasure request for each selected guest in Privacy & GDPR. Their data is erased when the request is completed there (invoices are kept for the legal retention period)."
        onConfirm={() => { setCrm((c) => ({ ...c, eraseRequests: [...new Set([...c.eraseRequests, ...sel])] })); toast(`Erasure requested for ${sel.size} guest${sel.size === 1 ? "" : "s"} — handle them in Privacy & GDPR.`, { tone: "success" }); setEraseAsk(false); setSel(new Set()); }} />
      {lcModal && <LifecycleModal value={crm.lifecycle} onClose={() => setLcModal(false)} onSave={(v) => { setCrm((c) => ({ ...c, lifecycle: v })); setLcModal(false); toast("Lifecycle rules saved — guests re-labelled.", { tone: "success" }); }} />}
      {tagModal && <TagModal existing={tagNames} onClose={() => setTagModal(false)} onSave={(t) => { setCrm((c) => ({ ...c, tagDefs: [...c.tagDefs, t] })); setTagModal(false); toast(`Tag “${t.name}” created — assign it from a guest's Edit.`, { tone: "success" }); }} />}
      <ConfirmModal open={deleting !== null} onClose={() => setDeleting(null)} title={deleting ? `Delete “${deleting.name}”?` : "Delete segment"} confirmLabel="Delete segment"
        body="Guests are not affected — only the saved segment is removed."
        onConfirm={() => { if (deleting) { setCrm((c) => ({ ...c, segments: c.segments.filter((x) => x.id !== deleting.id) })); if (segId === deleting.id) setSegId("all"); } setDeleting(null); }} />
    </div>
  );
}

/* Bulk message: consent-aware — only guests who opted in to the channel get it. */
function BulkMessageModal({ guests, onClose, onSend }: { guests: GuestFacts[]; onClose: () => void; onSend: (channel: string, n: number, skipped: number) => void }) {
  const [ch, setCh] = useState("email");
  const ok = guests.filter((g) => g.consent.includes(ch)).length;
  const label = { email: "E-mail", sms: "SMS", viber: "Viber" }[ch] ?? ch;
  return (
    <Modal open onClose={onClose} title={`Message ${guests.length} guest${guests.length === 1 ? "" : "s"}`}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.mail} disabled={!ok} onClick={() => onSend(label, ok, guests.length - ok)}>Send to {ok}</Btn></>}>
      <div className="space-y-3">
        <Field label="Channel"><Select value={ch} onChange={(e) => setCh(e.target.value)} options={[{ v: "email", l: "E-mail" }, { v: "sms", l: "SMS" }, { v: "viber", l: "Viber" }]} /></Field>
        <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2.5 text-sm text-slate-700" aria-live="polite">
          <b className="text-navy-900">{ok}</b> of {guests.length} have {label} marketing consent and will get the message{guests.length - ok ? <>; <b className="text-rose-700">{guests.length - ok}</b> will be skipped</> : null}.
        </div>
        <p className="text-[12px] text-slate-500">Write and schedule the message itself in Communicate; this sends a quick promotional note (demo).</p>
      </div>
    </Modal>
  );
}

/* Lifecycle thresholds (at risk / lapsed after N days without a visit). */
function LifecycleModal({ value, onClose, onSave }: { value: LifecycleSettings; onClose: () => void; onSave: (v: LifecycleSettings) => void }) {
  const [atRisk, setAtRisk] = useState(String(value.atRiskDays));
  const [lapsed, setLapsed] = useState(String(value.lapsedDays));
  const a = Number(atRisk), l = Number(lapsed);
  const err = !(a >= 1) || !(l >= 1) ? "Enter whole numbers of days." : l <= a ? "Lapsed must be later than At risk." : "";
  return (
    <Modal open onClose={onClose} title="Lifecycle rules"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.check} disabled={!!err} onClick={() => onSave({ atRiskDays: Math.round(a), lapsedDays: Math.round(l) })}>Save rules</Btn></>}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Guests move through <b>First visit → Active → Regular</b> as they visit, and to <b>At risk</b> and <b>Lapsed</b> when they stop coming.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="At risk after (days without a visit)"><Input type="number" min={1} value={atRisk} onChange={(e) => setAtRisk(e.target.value)} /></Field>
          <Field label="Lapsed after (days)"><Input type="number" min={1} value={lapsed} onChange={(e) => setLapsed(e.target.value)} /></Field>
        </div>
        {err && <div role="alert" className="text-[12px] text-rose-700">{err}</div>}
      </div>
    </Modal>
  );
}

/* New manual tag: name + colour. */
function TagModal({ existing, onClose, onSave }: { existing: string[]; onClose: () => void; onSave: (t: { name: string; color: string }) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(SEGMENT_COLORS[2]);
  const [touched, setTouched] = useState(false);
  const err = !name.trim() ? "Enter a tag name." : existing.some((x) => x.toLowerCase() === name.trim().toLowerCase()) || AUTO.includes(name.trim()) ? "That tag already exists." : "";
  return (
    <Modal open onClose={onClose} title="New tag"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.check} onClick={() => { setTouched(true); if (!err) onSave({ name: name.trim(), color }); }}>Create tag</Btn></>}>
      <div className="space-y-3">
        <Field label="Tag name" hint={touched && err ? <span className="text-rose-700">{err}</span> : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wedding party" aria-invalid={touched && !!err} /></Field>
        <fieldset>
          <legend className="text-[12px] font-semibold text-slate-700 mb-1">Colour</legend>
          <div className="flex gap-1.5">{SEGMENT_COLORS.map((c) => <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Colour ${c}`} aria-pressed={color === c} className={`w-7 h-7 rounded-full ring-2 ${color === c ? "ring-navy-900 scale-110" : "ring-white"}`} style={{ background: c }} />)}</div>
        </fieldset>
      </div>
    </Modal>
  );
}

/* ---- Edit a user: contact details, visit count and the manual segment badges.
   Editing visits shows live whether the guest passes the visit threshold. ---- */
function UserEditModal({ user, tagNames, onClose, onSave }: { user: Customer; tagNames: string[]; onClose: () => void; onSave: (u: Customer) => void }) {
  const REGULAR_AFTER = useApp().crm.regularAfter;
  const [custom, setCustom] = useState<string[]>(user.tags.filter((t) => t !== "VIP" && t !== "Season pass" && !AUTO.includes(t)));
  const [first, setFirst] = useState(user.first);
  const [last, setLast] = useState(user.last);
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email);
  const [visits, setVisits] = useState(user.bookings);
  const [vip, setVip] = useState(user.tags.includes("VIP"));
  const [seasonPass, setSeasonPass] = useState(user.tags.includes("Season pass"));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nameOk = first.trim().length > 0 && last.trim().length > 0;
  const valid = emailOk && nameOk;
  const over = visits > REGULAR_AFTER;

  const save = () => {
    const f = first.trim(), l = last.trim();
    const tags = [...(vip ? ["VIP"] : []), ...(seasonPass ? ["Season pass"] : []), ...custom];
    onSave({ ...user, first: f, last: l, phone: phone.trim(), email: email.trim(), bookings: visits, tags, name: `${f} ${l.charAt(0)}.` });
  };

  return (
    <Modal open onClose={onClose} wide title="Edit user"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.check} disabled={!valid} onClick={save}>Save changes</Btn></>}>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name"><Input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name" /></Field>
          <Field label="Surname"><Input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Surname" /></Field>
          <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+30 694 …" className="tnum" /></Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={email && !emailOk ? "ring-2 ring-rose-400 focus:ring-rose-400" : ""} />
            {email && !emailOk && <div className="text-[11px] text-rose-600 mt-1">Enter a valid email address.</div>}
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 items-start">
          <Field label="Visits this season">
            <div className="flex items-center gap-2">
              <Input type="number" min={0} value={visits} onChange={(e) => setVisits(Math.max(0, Math.round(+e.target.value) || 0))} />
              <span className="text-[12px] text-slate-500 shrink-0">visits</span>
            </div>
          </Field>
          <div>
            <div className="text-[12px] font-semibold text-slate-700 mb-1">Visit threshold (automatic)</div>
            <div className="rounded-xl ring-1 ring-slate-200 bg-slate-50 px-3 py-2.5 flex items-center gap-2">
              <Badge tone={over ? "slate" : "green"}>{over ? `Over ${REGULAR_AFTER} visits` : `${REGULAR_AFTER + 1 - visits} to go`}</Badge>
              <span className="text-[11px] text-slate-500">{over ? "Counts as Regular while they keep visiting" : `more visit${REGULAR_AFTER + 1 - visits !== 1 ? "s" : ""} to reach the Regular stage`}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[12px] font-semibold text-slate-700 mb-1.5">Manual segments</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
              <span className="flex items-center gap-2"><Badge tone="amber">VIP</Badge><span className="text-[12px] text-slate-500">High-value guest perks</span></span>
              <Toggle on={vip} onChange={setVip} ariaLabel="VIP segment" />
            </div>
            <div className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
              <span className="flex items-center gap-2"><Badge tone="blue">Season pass</Badge><span className="text-[12px] text-slate-500">Unlimited entry this season</span></span>
              <Toggle on={seasonPass} onChange={setSeasonPass} ariaLabel="Season pass segment" />
            </div>
          </div>
        </div>
        {tagNames.length > 2 && (
          <fieldset>
            <legend className="text-[12px] font-semibold text-slate-700 mb-1.5">Tags</legend>
            <div className="flex flex-wrap gap-1.5">
              {tagNames.filter((t) => t !== "VIP" && t !== "Season pass").map((t) => {
                const on = custom.includes(t);
                return <button key={t} type="button" aria-pressed={on} onClick={() => setCustom((c) => (on ? c.filter((x) => x !== t) : [...c, t]))} className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold ring-1 transition ${on ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 text-navy-900 hover:ring-slate-300"}`}>{t}</button>;
              })}
            </div>
          </fieldset>
        )}
      </div>
    </Modal>
  );
}

