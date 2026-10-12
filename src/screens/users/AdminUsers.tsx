import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon, type IconRenderer } from "../../lib/icons";
import { Badge, Btn, Card, ConfirmModal, EmptyState, ErrorState, Field, Input, Modal, Table, TableSkeleton, Toggle } from "../../components/ui";
import { useApp } from "../../app/store";
import { listCustomers } from "../../api";
import { useAsync } from "../../lib/useAsync";
import type { Customer } from "../../domain/types";
import { downloadCSV } from "../../lib/download";
import { guestFacts, type GuestFacts } from "../../data/guests";
import { SEGMENT_COLORS, SYSTEM_SEGMENTS, fieldOf, inSegment, ruleLabel, type Segment } from "../../domain/segments";
import { DEMO_TODAY } from "../../domain/period";
import { SegmentBuilder } from "./SegmentBuilder";

/* ============ USERS & SEGMENTS ============
   Guests are grouped by segments: built-in ones (VIP, Season pass, and the
   automatic New → Regular rule, whose threshold is editable) plus the tenant's
   own rule-based segments (AENR-474). Manual tags (VIP, Season pass, custom
   tags) live on the guest; New / Regular are always derived from visits. */
const AUTO = ["New", "Regular"];
// "Elena V." stands in for the signed-in customer, so a pass she buys shows here.
const DEMO_CUSTOMER_ID = 3;
const autoSegment = (visits: number, after: number): "New" | "Regular" => (visits > after ? "Regular" : "New");
const manualOf = (tags: string[]) => tags.filter((t) => !AUTO.includes(t));
const displayTags = (u: Customer, after: number) => [autoSegment(u.bookings, after), ...manualOf(u.tags)];
const tagTone = (t: string) => ({ VIP: "amber", "Season pass": "blue", Regular: "slate", New: "green" }[t] || "indigo");

type Guest = GuestFacts & { name: string; customer: Customer };

export function AdminUsers() {
  const { toast, passes, crm, setCrm, go } = useApp();
  const ra = crm.regularAfter;
  const [q, setQ] = useState("");
  const [segId, setSegId] = useState("all");
  const customersQ = useAsync(listCustomers);
  const [editId, setEditId] = useState<number | null>(null);
  const [activityId, setActivityId] = useState<number | null>(null);
  const [builder, setBuilder] = useState<Segment | "new" | null>(null);
  const [tagModal, setTagModal] = useState(false);
  const [deleting, setDeleting] = useState<Segment | null>(null);

  // Seed roster + persisted edits (manual tags only — New/Regular are derived).
  const list: Customer[] = customersQ.status === "success"
    ? customersQ.data.map((c) => ({ ...c, tags: manualOf(c.tags), ...crm.edits[c.id] }))
    : [];
  // The signed-in customer reflects any pass she holds as an automatic tag
  // (marked with a wallet glyph so it reads as pass-derived, not hand-assigned).
  const passTags = [passes.vip ? "VIP" : null, passes.season ? "Season pass" : null].filter(Boolean) as string[];
  const tagsFor = (u: Customer): { t: string; pass: boolean }[] => {
    const base = displayTags(u, ra).map((t) => ({ t, pass: false }));
    if (u.id !== DEMO_CUSTOMER_ID || passTags.length === 0) return base;
    passTags.forEach((pt) => {
      const hit = base.find((b) => b.t === pt);
      if (hit) hit.pass = true;
      else base.push({ t: pt, pass: true });
    });
    return base;
  };
  const guests: Guest[] = list.map((u) => {
    const tags = tagsFor(u).map((x) => x.t);
    const f = guestFacts({ ...u, tags }, tags.filter((t) => !AUTO.includes(t) && t !== "VIP" && t !== "Season pass"));
    return { ...f, name: `${u.first} ${u.last}`, customer: u };
  });

  // Built-in segments (threshold from the CRM settings) + saved ones.
  const system = SYSTEM_SEGMENTS.map((sg) => (sg.id === "sys-regular" ? { ...sg, rules: [{ field: "visits", op: "gt" as const, a: ra }] } : sg.id === "sys-new" ? { ...sg, rules: [{ field: "visits", op: "lt" as const, a: ra + 1 }] } : sg));
  const segments = [...system, ...crm.segments];
  const members = (sg: Segment) => guests.filter((g) => inSegment(g, sg, DEMO_TODAY));
  const active = segments.find((sg) => sg.id === segId) ?? null;
  const inActive = active ? new Set(members(active).map((g) => g.id)) : null;
  const rows = list.filter((u) => (!inActive || inActive.has(u.id)) && (u.first + u.last + u.email + u.phone).toLowerCase().includes(q.toLowerCase()));
  const editUser = editId !== null ? list.find((u) => u.id === editId) ?? null : null;
  const activityUser = activityId !== null ? list.find((u) => u.id === activityId) ?? null : null;
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
      if (builder.id === "sys-new" && r) setCrm((c) => ({ ...c, regularAfter: Math.max(1, Number(r.a) - 1) }));
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
          <div className="flex gap-2 ml-auto">
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
                    {(!sg.system || sg.id === "sys-regular" || sg.id === "sys-new") && <DropdownMenu.Item className={menuItem} onSelect={() => setBuilder(sg)}><Icon.edit size={14} /> {sg.system ? "Edit rule" : "Edit"}</DropdownMenu.Item>}
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
        {active && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-[12px] text-slate-600">
            <i className="w-2.5 h-2.5 rounded-full" style={{ background: active.color }} />
            <b className="text-navy-900">{active.name}</b>
            <span>{active.kind === "static" ? `Fixed list of ${active.members?.length ?? 0} guests` : active.rules.map((r) => ruleLabel(r, fieldOf(r.field))).join(active.match === "all" ? " AND " : " OR ")}</span>
            <span className="ml-auto flex gap-1.5">
              <Btn size="sm" variant="ghost" icon={Icon.download} onClick={() => exportSegment(active)}>Export</Btn>
              <Btn size="sm" variant="ghost" icon={Icon.mail} onClick={() => go("admin", "communicate")}>Message</Btn>
            </span>
          </div>
        )}
        {!active && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-slaice-100 ring-1 ring-slaice-600/20 px-3 py-2 text-[12px] text-slaice-700">
            <Icon.info size={14} className="shrink-0 mt-0.5 text-slaice-600" />
            <span>Segments update automatically: every guest starts <b>New</b> and becomes <b>Regular</b> after {ra} visits (edit the rule from the Regular segment). <b>VIP</b>, <b>Season pass</b> and custom tags are assigned on a guest. Build your own with <b>New segment</b>.</span>
          </div>
        )}
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : customersQ.status === "error" ? (
          <ErrorState compact body="We couldn't load the customer list." onRetry={customersQ.refetch} />
        ) : rows.length === 0 ? (
          <EmptyState compact icon={Icon.users} title="No users match" body="Try a different search or segment." />
        ) : (
          <Table cols={["Name", "Surname", "Phone", "Email", "Visits", "Tags", ""]} right={[4]}
            rows={rows.map((u) => [u.first, u.last, <span className="tnum whitespace-nowrap">{u.phone}</span>, u.email, u.bookings,
              <span className="flex gap-1 flex-wrap">{tagsFor(u).map(({ t, pass }) => <Badge key={t} tone={tagTone(t)}>{pass && <Icon.wallet size={9} />}{t}</Badge>)}</span>,
              <div className="flex items-center justify-end gap-1">
                <Btn size="sm" variant="ghost" icon={Icon.edit} onClick={() => setEditId(u.id)}>Edit</Btn>
                <Btn size="sm" variant="ghost" icon={Icon.eye} onClick={() => setActivityId(u.id)}>Activity</Btn>
              </div>])} />
        )}
      </Card>
      {editUser && <UserEditModal user={editUser} tagNames={tagNames} onClose={() => setEditId(null)} onSave={saveUser} />}
      {activityUser && <UserActivityModal user={activityUser} onClose={() => setActivityId(null)} onEdit={(id) => { setActivityId(null); setEditId(id); }} />}
      {builder && <SegmentBuilder initial={builder === "new" ? null : builder} guests={guests} tagOptions={crm.tagDefs.map((t) => t.name)} onClose={() => setBuilder(null)} onSave={saveSegment} />}
      {tagModal && <TagModal existing={tagNames} onClose={() => setTagModal(false)} onSave={(t) => { setCrm((c) => ({ ...c, tagDefs: [...c.tagDefs, t] })); setTagModal(false); toast(`Tag “${t.name}” created — assign it from a guest's Edit.`, { tone: "success" }); }} />}
      <ConfirmModal open={deleting !== null} onClose={() => setDeleting(null)} title={deleting ? `Delete “${deleting.name}”?` : "Delete segment"} confirmLabel="Delete segment"
        body="Guests are not affected — only the saved segment is removed."
        onConfirm={() => { if (deleting) { setCrm((c) => ({ ...c, segments: c.segments.filter((x) => x.id !== deleting.id) })); if (segId === deleting.id) setSegId("all"); } setDeleting(null); }} />
    </div>
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
   Editing visits re-derives New/Regular live, demonstrating the auto-rule. ---- */
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
  const seg = autoSegment(visits, REGULAR_AFTER);

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
            <div className="text-[12px] font-semibold text-slate-700 mb-1">Segment (automatic)</div>
            <div className="rounded-xl ring-1 ring-slate-200 bg-slate-50 px-3 py-2.5 flex items-center gap-2">
              <Badge tone={tagTone(seg)}>{seg}</Badge>
              <span className="text-[11px] text-slate-500">{seg === "New" ? `${REGULAR_AFTER + 1 - visits} more visit${REGULAR_AFTER + 1 - visits !== 1 ? "s" : ""} → Regular` : `Over ${REGULAR_AFTER} visits`}</span>
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

/* ---- Activity: a CRM-style customer-360 — segment progress, key stats and a
   synthesized recent-activity timeline. A demo of what "Activity" opens. ---- */
const ACT_BG: Record<string, string> = { teal: "bg-teal-600", slate: "bg-slate-400", indigo: "bg-slaice-600", amber: "bg-amber-500" };
function userActivity(u: Customer): { icon: IconRenderer; tone: string; title: string; detail: string; when: string }[] {
  const each = Math.max(10, Math.round(u.spend / Math.max(1, u.bookings)));
  const ev = [
    { icon: Icon.scan, tone: "teal", title: "Checked in at the gate", detail: "QR validated · Central", when: u.lastVisit },
    { icon: Icon.umbrella, tone: "teal", title: "Sunbed booking", detail: `Central · 2 sets · €${each}`, when: u.lastVisit },
    { icon: Icon.card, tone: "slate", title: "Payment received", detail: `€${each} · Visa ···· 4242`, when: u.lastVisit },
    { icon: Icon.ticket, tone: "slate", title: "Entry tickets", detail: "Adult ×2", when: u.lastVisit },
    { icon: Icon.mail, tone: "indigo", title: "Opened a campaign", detail: "“Weekend offer” · E-mail", when: "2 weeks ago" },
  ];
  if (u.bookings >= 10) ev.push({ icon: Icon.gift, tone: "amber", title: "Loyalty stamp earned", detail: `${Math.min(10, u.bookings)}/10 toward a free sunbed`, when: "3 weeks ago" });
  ev.push({ icon: Icon.users, tone: "slate", title: "Account created", detail: "Tagged New by default", when: `Joined ${["Apr", "May", "Jun"][u.id % 3]} 2026` });
  return ev;
}

function UserActivityModal({ user, onClose, onEdit }: { user: Customer; onClose: () => void; onEdit: (id: number) => void }) {
  const { toast, crm } = useApp();
  const REGULAR_AFTER = crm.regularAfter;
  const seg = autoSegment(user.bookings, REGULAR_AFTER);
  const avg = Math.round(user.spend / Math.max(1, user.bookings));
  const toRegular = Math.max(0, REGULAR_AFTER + 1 - user.bookings);
  const pct = Math.min(100, Math.round((user.bookings / (REGULAR_AFTER + 1)) * 100));
  const events = userActivity(user);
  const stats = [
    { label: "Visits", value: String(user.bookings) },
    { label: "Total spend", value: `€${user.spend.toLocaleString()}` },
    { label: "Avg / visit", value: `€${avg}` },
    { label: "Last visit", value: user.lastVisit },
  ];
  return (
    <Modal open onClose={onClose} wide title="Customer activity"
      footer={<><Btn variant="ghost" onClick={onClose}>Close</Btn>
        <Btn variant="outline" icon={Icon.mail} onClick={() => toast(`Demo — message ${user.first} ${user.last} (opens Communicate).`)}>Message</Btn>
        <Btn variant="primary" icon={Icon.edit} onClick={() => onEdit(user.id)}>Edit profile</Btn></>}>
      <div className="space-y-4">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slaice-600 to-teal-600 text-white grid place-items-center font-display font-bold text-lg shrink-0">{user.first.charAt(0)}{user.last.charAt(0)}</span>
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold text-navy-900 text-[15px] truncate">{user.first} {user.last}</div>
            <div className="text-[12px] text-slate-500 truncate">{user.email} · <span className="tnum">{user.phone}</span></div>
          </div>
          <div className="flex gap-1 flex-wrap justify-end shrink-0">{displayTags(user, REGULAR_AFTER).map((t) => <Badge key={t} tone={tagTone(t)}>{t}</Badge>)}</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
              <div className="text-[11px] text-slate-500">{s.label}</div>
              <div className="font-display text-lg font-bold text-navy-900 tnum leading-tight">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Segment progress — ties back to the auto-rule */}
        <div className="rounded-xl ring-1 ring-slate-200 bg-slate-50/70 px-3 py-2.5">
          {seg === "Regular" ? (
            <div className="flex items-center gap-2 text-[13px] text-navy-900"><Icon.checkCircle size={15} className="text-teal-600" /> <b>Regular</b> — past {REGULAR_AFTER} visits this season.</div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[12px] mb-1.5">
                <span className="text-slate-600"><b className="text-navy-900">{toRegular}</b> more visit{toRegular !== 1 ? "s" : ""} to <b className="text-navy-900">Regular</b></span>
                <span className="text-slate-500 tnum">{user.bookings}/{REGULAR_AFTER + 1}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-slaice-500 to-teal-500" style={{ width: `${pct}%` }} /></div>
            </>
          )}
        </div>

        {/* Timeline */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Recent activity</div>
          <ol className="space-y-1">
            {events.map((e, i) => {
              const EIcon = e.icon;
              return (
                <li key={i} className="flex items-start gap-3 rounded-xl px-2.5 py-2 hover:bg-slate-50 transition">
                  <span className={`w-8 h-8 rounded-lg grid place-items-center text-white shrink-0 ${ACT_BG[e.tone] || ACT_BG.slate}`}><EIcon size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-navy-900 leading-tight">{e.title}</div>
                    <div className="text-[11.5px] text-slate-500 leading-snug">{e.detail}</div>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap pt-0.5">{e.when}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Modal>
  );
}
