import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Input, Modal, Select, Spinner, DateInput } from "../../components/ui";
import { SunbedMap } from "../../components/SunbedMap";
import { useApp } from "../../app/store";
import { ZONES, todayISO, zoneLayout } from "../../data/beach";
import { FUTURE_BOOKINGS } from "../../data/futureBookings";
import { addDays, fmtDay } from "../../domain/period";
import { payLinkStatus } from "../../domain/payLink";
import {
  bookedSet,
  diffCount,
  diffText,
  diffZone,
  layoutFor,
  versionOn,
  type KeptSet,
  type LayoutVersion,
  type Reassignment,
  type SavedDraft,
} from "../../domain/layoutVersions";
import type { BeachPricing, SunbedSlot } from "../../domain/types";

/* ============ Layout drafts, versions & scheduling (AENR-514) ============
   Publishing a draft shows what changed per zone, blocks on bookings that a
   removed or moved set would break (reassign each to a similar set — the
   guest is notified — or keep the set until the booking's date), then
   publishes now or from a date through validate → apply → notify. Every
   publish is a version: view it read-only or restore it as a draft. */

export interface WorkDraft {
  layouts: Record<string, SunbedSlot[]>;
  pricing: BeachPricing;
}
type Conflict = {
  id: string;
  zoneId: string;
  setId: string;
  date: string;
  guest: string;
  moved: boolean;
};
type Fix = { kind: "reassign"; to: string } | { kind: "keep" };
const fy = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const dist = (a: SunbedSlot, b: SunbedSlot) => Math.hypot(a.x - b.x, a.y - b.y);

export function PublishModal({
  draft,
  name,
  onClose,
  onDone,
}: {
  draft: WorkDraft;
  name: string;
  onClose: () => void;
  onDone: (scheduled: boolean) => void;
}) {
  const {
    toast,
    beachLayout,
    setZoneLayout,
    beachPricing,
    setBeachPricing,
    layouts,
    setLayouts,
    payLinks,
    viewAs,
  } = useApp();
  const who = viewAs?.name ?? "Eleni Markou";
  const today = todayISO();
  const [title, setTitle] = useState(name);
  const [when, setWhen] = useState<"now" | "date">("now");
  const [from, setFrom] = useState(addDays(today, 1));
  const [fixes, setFixes] = useState<Record<string, Fix>>({});
  const [phase, setPhase] = useState<"form" | "validate" | "apply" | "notify" | "failed">("form");
  const [failDemo, setFailDemo] = useState(false);
  const eff = when === "now" ? today : from;

  // Compare with the layout in force on the effective date; sets already kept for a booking aren't part of it.
  const before = (zid: string) =>
    layoutFor(
      ZONES.find((z) => z.id === zid) ?? ZONES[0],
      eff,
      beachLayout,
      layouts.versions,
      today,
      zoneLayout,
      false,
    );
  const diffs = ZONES.map((z) => ({
    z,
    d: diffZone(before(z.id), draft.layouts[z.id] ?? zoneLayout(z)),
  }));
  const priceChanges = (["categories", "overrides", "landmarks"] as const).filter(
    (k) => JSON.stringify(draft.pricing[k]) !== JSON.stringify(beachPricing[k]),
  );

  // Bookings on or after the effective date whose set is removed or moved.
  const conflicts: Conflict[] = (() => {
    const all = [
      ...FUTURE_BOOKINGS.map((b) => ({
        id: b.id,
        zoneId: b.zoneId,
        setId: bookedSet(b.id, b.setId, layouts.versions),
        date: b.date,
        guest: b.guest,
      })),
      ...payLinks
        .filter((l) => ["awaiting", "paid"].includes(payLinkStatus(l, Date.now())))
        .flatMap((l) =>
          l.lines
            .filter((x) => x.setId && x.zoneId)
            .map((x) => ({
              id: l.id,
              zoneId: x.zoneId as string,
              setId: x.setId as string,
              date: l.date,
              guest: l.guest.name,
            })),
        ),
    ];
    return all.flatMap((b) => {
      if (b.date < eff) return [];
      const d = diffs.find((x) => x.z.id === b.zoneId)?.d;
      if (!d) return [];
      const removed = d.removed.includes(b.setId);
      return removed || d.moved.includes(b.setId) ? [{ ...b, moved: !removed }] : [];
    });
  })();

  /** Nearest set in the draft with the same category that's free that day. */
  const similar = (c: Conflict): string | undefined => {
    const old = before(c.zoneId).find((s) => s.id === c.setId);
    const taken = new Set([
      ...conflicts.filter((x) => x.date === c.date).map((x) => x.setId),
      ...FUTURE_BOOKINGS.filter((x) => x.date === c.date).map((x) => x.setId),
      ...Object.values(fixes).flatMap((f) => (f.kind === "reassign" ? [f.to] : [])),
    ]);
    const pool = (draft.layouts[c.zoneId] ?? []).filter(
      (s) =>
        s.id !== c.setId &&
        !taken.has(s.id) &&
        s.state === "a" &&
        (!old || (s.cat ?? "") === (old.cat ?? "")),
    );
    return old ? [...pool].sort((a, b) => dist(a, old) - dist(b, old))[0]?.id : pool[0]?.id;
  };
  const unresolved = conflicts.filter((c) => !fixes[c.id + c.setId]).length;
  const total = diffs.reduce((a, x) => a + diffCount(x.d), 0) + priceChanges.length;
  const canPublish =
    !!title.trim() && unresolved === 0 && total > 0 && (when === "now" || from > today);

  const publish = () => {
    const steps: ("validate" | "apply" | "notify")[] = ["validate", "apply", "notify"];
    let i = 0;
    const next = () => {
      const st = steps[i];
      if (!st) return finish();
      setPhase(st);
      window.setTimeout(() => {
        if (st === "apply" && failDemo) return setPhase("failed");
        i++;
        next();
      }, 600);
    };
    next();
  };
  const finish = () => {
    const kept: KeptSet[] = [];
    const reassigned: Reassignment[] = [];
    for (const c of conflicts) {
      const f = fixes[c.id + c.setId];
      const old = before(c.zoneId).find((s) => s.id === c.setId);
      if (f?.kind === "keep" && old) kept.push({ zoneId: c.zoneId, slot: old, until: c.date });
      if (f?.kind === "reassign") reassigned.push({ bookingId: c.id, from: c.setId, to: f.to });
    }
    const summary = [
      ...diffs.filter((x) => diffCount(x.d)).map((x) => `${x.z.name}: ${diffText(x.d)}`),
      priceChanges.length ? `Pricing: ${priceChanges.join(", ")} changed` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const v: LayoutVersion = {
      id: `lv-${Date.now().toString(36)}`,
      no: Math.max(0, ...layouts.versions.map((x) => x.no)) + 1,
      name: title.trim(),
      layouts: Object.fromEntries(ZONES.map((z) => [z.id, draft.layouts[z.id] ?? zoneLayout(z)])),
      effectiveFrom: eff,
      publishedAt: new Date().toISOString(),
      by: who,
      summary: summary || "No layout changes",
      kept,
      reassigned,
    };
    setLayouts((s) => ({
      ...s,
      versions: [...s.versions, v],
      drafts: s.drafts.filter((d) => d.name !== title.trim()),
    }));
    if (when === "now")
      ZONES.forEach((z) => {
        if (
          JSON.stringify(draft.layouts[z.id]) !== JSON.stringify(beachLayout[z.id] ?? zoneLayout(z))
        )
          setZoneLayout(z.id, draft.layouts[z.id]);
      });
    setBeachPricing(draft.pricing);
    toast(
      `${when === "now" ? "Published" : `Scheduled from ${fmtDay(eff)}`} — v${v.no} “${v.name}”.${reassigned.length ? ` Demo — ${reassigned.length} guest${reassigned.length === 1 ? "" : "s"} notified of the new set.` : ""}`,
      { tone: "success" },
    );
    onDone(when === "date");
  };
  const busy = phase === "validate" || phase === "apply" || phase === "notify";

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title="Publish layout"
      wide
      footer={
        <>
          <Btn variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            icon={Icon.check}
            disabled={!canPublish || busy}
            loading={busy}
            onClick={publish}
          >
            {when === "now" ? "Publish now" : `Schedule from ${fmtDay(from)}`}
          </Btn>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="block">
            <span className="block text-[12px] font-semibold text-slate-700 mb-1">
              Version name
            </span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div
            role="radiogroup"
            aria-label="When"
            className="flex rounded-xl ring-1 ring-slate-200 overflow-hidden"
          >
            {(["now", "date"] as const).map((w) => (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={when === w}
                onClick={() => setWhen(w)}
                className={`px-3 min-h-[44px] text-[13px] font-semibold ${when === w ? "bg-navy-900 text-white" : "bg-white text-navy-900"}`}
              >
                {w === "now" ? "Publish now" : "Schedule"}
              </button>
            ))}
          </div>
        </div>
        {when === "date" && (
          <div className="block text-[12px] font-semibold text-slate-700">
            Effective from
            <DateInput aria-label="Effective from"
              
              min={addDays(today, 1)}
              value={from}
              onChange={(v) => v && setFrom(v)}
              className="block mt-1 rounded-lg ring-1 ring-slate-200 px-2 py-1.5 text-[13px]"
            />
            <span className="block mt-1 font-normal text-slate-500">
              Until then guests and staff keep today’s layout; price changes publish now.
            </span>
          </div>
        )}

        <section>
          <h3 className="font-semibold text-navy-900 mb-1">What changes</h3>
          {total === 0 ? (
            <p className="text-slate-600">
              Nothing differs from the layout in force on {fmtDay(eff)}.
            </p>
          ) : (
            <ul className="space-y-1">
              {diffs
                .filter((x) => diffCount(x.d))
                .map(({ z, d }) => (
                  <li key={z.id} className="flex flex-wrap gap-x-2">
                    <span className="w-24 font-semibold text-navy-900">{z.name}</span>
                    <span className="text-slate-700">{diffText(d)}</span>
                    <span className="text-[11.5px] text-slate-500">
                      {[...d.removed.map((x) => `−${x}`), ...d.added.map((x) => `+${x}`)]
                        .slice(0, 8)
                        .join(" ")}
                    </span>
                  </li>
                ))}
              {priceChanges.length > 0 && (
                <li className="flex gap-2">
                  <span className="w-24 font-semibold text-navy-900">Pricing</span>
                  <span className="text-slate-700">{priceChanges.join(", ")} changed</span>
                </li>
              )}
            </ul>
          )}
        </section>

        {conflicts.length > 0 && (
          <section className="rounded-xl bg-amber-50 ring-1 ring-amber-600/20 p-3">
            <h3 className="font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
              <Icon.alert size={15} /> {conflicts.length} booking{conflicts.length === 1 ? "" : "s"}{" "}
              affected — resolve each to publish
            </h3>
            <ul className="divide-y divide-amber-600/15">
              {conflicts.map((c) => {
                const k = c.id + c.setId;
                const f = fixes[k];
                const alt = f?.kind === "reassign" ? f.to : similar(c);
                return (
                  <li key={k} className="py-2 flex flex-wrap items-center gap-2">
                    <span className="flex-1 min-w-[14rem]">
                      <b className="text-navy-900">{c.id}</b> · {c.guest} · {fmtDay(c.date)} ·{" "}
                      {c.setId} {c.moved ? "moves" : "is removed"}
                    </span>
                    <Btn
                      size="sm"
                      variant={f?.kind === "reassign" ? "primary" : "outline"}
                      disabled={!alt}
                      aria-pressed={f?.kind === "reassign"}
                      onClick={() =>
                        alt && setFixes((x) => ({ ...x, [k]: { kind: "reassign", to: alt } }))
                      }
                    >
                      {alt ? `Reassign to ${alt}` : "No similar set free"}
                    </Btn>
                    <Btn
                      size="sm"
                      variant={f?.kind === "keep" ? "primary" : "outline"}
                      aria-pressed={f?.kind === "keep"}
                      onClick={() => setFixes((x) => ({ ...x, [k]: { kind: "keep" } }))}
                    >
                      Keep {c.setId} until {fmtDay(c.date)}
                    </Btn>
                  </li>
                );
              })}
            </ul>
            {unresolved > 0 && (
              <p className="mt-1 text-[12px] text-amber-900">{unresolved} still to resolve.</p>
            )}
          </section>
        )}

        {phase !== "form" && (
          <div
            role="status"
            className={`rounded-xl px-3 py-2 flex items-center gap-2 ${phase === "failed" ? "bg-rose-50 text-rose-800 ring-1 ring-rose-600/20" : "bg-slate-50 ring-1 ring-slate-200"}`}
          >
            {phase === "failed" ? (
              <>
                <Icon.alert size={15} /> Apply failed — nothing was changed. Try again.
              </>
            ) : (
              <>
                <Spinner size={15} className="text-teal-600" />{" "}
                {phase === "validate"
                  ? "Validating the layout…"
                  : phase === "apply"
                    ? "Applying to every map…"
                    : "Notifying affected guests…"}
              </>
            )}
          </div>
        )}
        <label className="flex items-center gap-2 text-[12px] text-slate-500">
          <input
            type="checkbox"
            className="accent-teal-600"
            checked={failDemo}
            onChange={(e) => {
              setFailDemo(e.target.checked);
              if (phase === "failed") setPhase("form");
            }}
          />{" "}
          Demo: make the apply step fail
        </label>
      </div>
    </Modal>
  );
}

/* Saved drafts and the version history, under the canvas. */
export function VersionsPanel({
  zoneId,
  draft,
  draftName,
  setDraftName,
  onLoad,
}: {
  zoneId: string;
  draft: WorkDraft;
  draftName: string;
  setDraftName: (n: string) => void;
  onLoad: (d: WorkDraft, name: string) => void;
}) {
  const { toast, layouts, setLayouts, viewAs } = useApp();
  const who = viewAs?.name ?? "Eleni Markou";
  const today = todayISO();
  const [view, setView] = useState<LayoutVersion | null>(null);
  const live = versionOn(layouts.versions, today, today);
  const save = () => {
    const name = draftName.trim() || "Untitled draft";
    const d: SavedDraft = {
      id: `dr-${Date.now().toString(36)}`,
      name,
      layouts: draft.layouts,
      pricing: draft.pricing,
      updated: new Date().toISOString(),
      by: who,
    };
    setLayouts((s) => ({ ...s, drafts: [d, ...s.drafts.filter((x) => x.name !== name)] }));
    toast(`Draft “${name}” saved — not visible to customers.`);
  };
  const versions = [...layouts.versions].sort((a, b) => b.no - a.no);

  return (
    <Card className="p-4 space-y-4">
      <section>
        <div className="flex flex-wrap items-end gap-2">
          <h2 className="font-display font-bold text-navy-900 mr-auto">Drafts</h2>
          <label className="text-[12px] font-semibold text-slate-700">
            Draft name
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="mt-1 !py-1.5 w-56"
            />
          </label>
          <Btn size="sm" variant="outline" icon={Icon.download} onClick={save}>
            Save draft
          </Btn>
        </div>
        {layouts.drafts.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-slate-500">
            Save the canvas as a named draft (e.g. “Summer 2027”) to work on several layouts side by
            side.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {layouts.drafts.map((d) => (
              <li key={d.id} className="py-1.5 flex flex-wrap items-center gap-2">
                <span className="flex-1 min-w-[10rem]">
                  <b className="text-navy-900">{d.name}</b>{" "}
                  <span className="text-[12px] text-slate-500">
                    · {d.by} ·{" "}
                    {new Date(d.updated).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <Btn
                  size="sm"
                  variant="teal"
                  onClick={() => onLoad({ layouts: d.layouts, pricing: d.pricing }, d.name)}
                >
                  Open
                </Btn>
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setLayouts((s) => ({
                      ...s,
                      drafts: [
                        {
                          ...d,
                          id: `dr-${Date.now().toString(36)}`,
                          name: `${d.name} (copy)`,
                          updated: new Date().toISOString(),
                        },
                        ...s.drafts,
                      ],
                    }))
                  }
                >
                  Duplicate
                </Btn>
                <Btn
                  size="sm"
                  variant="ghost"
                  className="text-rose-600"
                  onClick={() => {
                    setLayouts((s) => ({ ...s, drafts: s.drafts.filter((x) => x.id !== d.id) }));
                    toast(`Draft “${d.name}” deleted.`);
                  }}
                >
                  Delete
                </Btn>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display font-bold text-navy-900 mb-1">Version history</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {versions.map((v) => (
            <li key={v.id} className="py-2 flex flex-wrap items-center gap-2">
              <span className="w-9 font-mono font-semibold text-navy-900">v{v.no}</span>
              <span className="flex-1 min-w-[14rem]">
                <b className="text-navy-900">{v.name}</b>{" "}
                {v.id === live?.id ? (
                  <Badge tone="green">Live</Badge>
                ) : v.effectiveFrom > today ? (
                  <Badge tone="indigo">Scheduled · {fy(v.effectiveFrom)}</Badge>
                ) : null}
                <span className="block text-[12px] text-slate-500">
                  From {fy(v.effectiveFrom)} · published{" "}
                  {new Date(v.publishedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  by {v.by} · {v.summary}
                </span>
              </span>
              <Btn size="sm" variant="ghost" icon={Icon.eye} onClick={() => setView(v)}>
                View
              </Btn>
              <Btn
                size="sm"
                variant="outline"
                onClick={() =>
                  onLoad(
                    {
                      layouts: Object.fromEntries(
                        ZONES.map((z) => [z.id, v.layouts[z.id] ?? zoneLayout(z)]),
                      ),
                      pricing: draft.pricing,
                    },
                    `Restore of v${v.no} · ${v.name}`,
                  )
                }
              >
                Restore as draft
              </Btn>
            </li>
          ))}
        </ul>
      </section>
      {view && <VersionView v={view} zoneId={zoneId} onClose={() => setView(null)} />}
    </Card>
  );
}

function VersionView({
  v,
  zoneId,
  onClose,
}: {
  v: LayoutVersion;
  zoneId: string;
  onClose: () => void;
}) {
  const [zid, setZid] = useState(zoneId);
  const zone = ZONES.find((z) => z.id === zid) ?? ZONES[0];
  return (
    <Modal
      open
      onClose={onClose}
      title={`v${v.no} · ${v.name} (read-only)`}
      wide
      footer={
        <Btn variant="primary" onClick={onClose}>
          Close
        </Btn>
      }
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-44">
          <Select
            aria-label="Zone"
            value={zid}
            onChange={(e) => setZid(e.target.value)}
            options={ZONES.map((z) => ({ v: z.id, l: z.name }))}
          />
        </div>
        <span className="text-[12px] text-slate-500">
          Effective from {fy(v.effectiveFrom)} · {v.summary}
        </span>
      </div>
      <SunbedMap
        readOnly
        label={`${zone.name} in v${v.no}`}
        slots={(v.layouts[zid] ?? zoneLayout(zone)).map((s) => ({ ...s, state: "a" as const }))}
      />
    </Modal>
  );
}
