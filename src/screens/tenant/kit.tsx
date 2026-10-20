import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconRenderer } from "../../lib/icons";
import { Btn, Card, ErrorState, Input, Modal, Skeleton } from "../../components/ui";
import { usePlatform } from "../../lib/usePlatform";
import { hashPath, readHashQuery } from "../../app/router";
import { prefersReducedMotion } from "../../lib/motion";
import type { TenantRecord } from "../../domain/tenants";

/* Building blocks for the tenant page sections (AENR-500): a section frame
   with loading / error / read-only states, a per-section draft with Save and
   a reason for sensitive fields (written to the Audit log), and the global
   unsaved-changes guard used when navigating between sections or tenants. */

/** Unsaved-changes guard; navigation asks before leaving a dirty section. A merged
 *  section has several drafts (AENR-796), so it tracks each owner, not one flag. */
const dirtyOwners = new Set<object>();
export const navGuard = {
  get dirty() {
    return dirtyOwners.size > 0;
  },
};
export const confirmLeave = () =>
  !navGuard.dirty ||
  window.confirm("You have unsaved changes on this section. Leave without saving?");
/** Register a draft with the guard while it has unsaved changes. */
export function useLeaveGuard(dirty: boolean) {
  const owner = useRef({});
  useEffect(() => {
    const o = owner.current;
    if (dirty) dirtyOwners.add(o);
    else dirtyOwners.delete(o);
    return () => {
      dirtyOwners.delete(o);
    };
  }, [dirty]);
}

type EditRight = "admin" | "support";
/** Per-section edit right (from the registry + Slaice role), the role check for a stricter
 *  part (AENR-796) and the demo error mode. */
export const SectionCtx = createContext<{
  canEdit: boolean;
  can: (edit: EditRight) => boolean;
  demoError: boolean;
}>({
  canEdit: true,
  can: () => true,
  demoError: false,
});

export interface SectionProps {
  t: TenantRecord;
  canEdit: boolean;
  go: (section: string) => void;
}

export function SectionFrame({
  title,
  sub,
  children,
  actions,
  parts,
}: {
  title: string;
  sub?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  /** The parts of a merged page, for its "On this page" links (AENR-796). */
  parts?: readonly { id: string; label: string }[];
}) {
  const { canEdit, demoError } = useContext(SectionCtx);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(demoError);
  useEffect(() => {
    const id = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(id);
  }, []);
  // `?at=<part>` scrolls to and focuses a part once it has rendered, so old links to the
  // pages merged into this one land on their part (AENR-796…800).
  useEffect(() => {
    if (loading || failed) return;
    const jump = () => {
      const at = readHashQuery().get("at");
      const el = at ? document.getElementById(`part-${at}`) : null;
      if (!el) return;
      el.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      el.focus({ preventScroll: true });
    };
    jump();
    window.addEventListener("hashchange", jump);
    return () => window.removeEventListener("hashchange", jump);
  }, [loading, failed]);
  return (
    <section aria-labelledby="tenant-section-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="tenant-section-title" className="font-display text-xl font-bold text-navy-900">
            {title}
          </h2>
          {sub && <p className="text-[13px] text-slate-600 max-w-3xl">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {parts && parts.length > 1 && (
        <nav aria-label="On this page" className="flex flex-wrap items-center gap-1.5">
          {parts.map((p) => (
            <a
              key={p.id}
              href={`${hashPath()}?at=${p.id}`}
              className="rounded-full bg-white/70 ring-1 ring-slate-200 px-3 py-1.5 text-[12.5px] font-medium text-slate-700 hover:bg-white hover:ring-slate-300 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              {p.label}
            </a>
          ))}
        </nav>
      )}
      {!canEdit && (
        <div
          role="note"
          className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-[12.5px] text-slate-600 flex items-center gap-2"
        >
          <Icon.lock size={14} /> Read-only — your Slaice role can see this section but not change
          it. Ask a Slaice Admin.
        </div>
      )}
      {loading ? (
        <Card className="p-4 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      ) : failed ? (
        <Card className="p-4">
          <ErrorState
            title="Couldn't load this section"
            body="The settings service didn't answer (demo)."
            onRetry={() => setFailed(false)}
          />
        </Card>
      ) : (
        <fieldset disabled={!canEdit} className="min-w-0 space-y-3 disabled:opacity-90">
          {children}
        </fieldset>
      )}
    </section>
  );
}

/** One former page inside a merged section (AENR-796…800): an h3, the anchor old links land
 *  on (`?at=<id>`), its own actions, and its own edit right when that is stricter than the
 *  page's (e.g. Contract & account stays Admin-only inside Profile). */
export function Part({
  id,
  title,
  sub,
  icon: I,
  actions,
  edit,
  children,
}: {
  id: string;
  title: string;
  sub?: ReactNode;
  icon?: IconRenderer;
  actions?: ReactNode;
  edit?: EditRight;
  children: ReactNode;
}) {
  const { canEdit, can } = useContext(SectionCtx);
  const locked = canEdit && !!edit && !can(edit);
  return (
    <section
      id={`part-${id}`}
      aria-labelledby={`part-${id}-title`}
      tabIndex={-1}
      className="scroll-mt-24 space-y-3 outline-none [&:not(:first-child)]:border-t [&:not(:first-child)]:border-slate-200 [&:not(:first-child)]:pt-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h3
            id={`part-${id}-title`}
            className="font-display text-[16.5px] font-bold text-navy-900 flex items-center gap-2"
          >
            {I && <I size={16} className="text-teal-700 shrink-0" aria-hidden />}
            {title}
          </h3>
          {sub && <p className="text-[12.5px] text-slate-600 leading-snug max-w-3xl">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {locked && (
        <div
          role="note"
          className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-[12.5px] text-slate-600 flex items-center gap-2"
        >
          <Icon.lock size={14} /> Read-only — only a Slaice Admin can change this part.
        </div>
      )}
      <fieldset disabled={locked} className="min-w-0 space-y-3">
        {children}
      </fieldset>
    </section>
  );
}

export function KV({ k, children }: { k: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-[13px] border-b border-slate-100 last:border-0">
      <span className="text-slate-500">{k}</span>
      <span className="text-right text-navy-900 font-medium min-w-0">{children}</span>
    </div>
  );
}

/** A section-local draft of some tenant fields with Save; sensitive keys need a reason (Audit log). */
export function useTenantDraft<K extends keyof TenantRecord>(
  t: TenantRecord,
  keys: readonly K[],
  section: string,
  sensitive: readonly K[] = [],
  /** Why the draft can't be saved yet (e.g. an invalid ΑΦΜ), or ""; disables Save. */
  validate?: (draft: Pick<TenantRecord, K>) => string,
) {
  const { updateTenant, toast } = usePlatform();
  const pick = () => Object.fromEntries(keys.map((k) => [k, t[k]])) as Pick<TenantRecord, K>;
  const [draft, setDraft] = useState(pick);
  const [askReason, setAskReason] = useState(false);
  useEffect(() => {
    setDraft(pick());
  }, [t.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const changed = keys.filter((k) => JSON.stringify(draft[k]) !== JSON.stringify(t[k]));
  const dirty = changed.length > 0;
  const problem = validate?.(draft) ?? "";
  useLeaveGuard(dirty);
  const fmt = (v: unknown) => (typeof v === "object" ? JSON.stringify(v) : String(v ?? "—"));
  const commit = (reason?: string) => {
    changed.forEach((k, i) =>
      updateTenant(t.id, (x) => (i === 0 ? { ...x, ...draft } : x), {
        section,
        change: `${String(k)} changed`,
        from: fmt(t[k]),
        to: fmt(draft[k]),
        reason,
      }),
    );
    toast(`Saved ${section.toLowerCase()} for ${t.name}${reason ? " — reason logged" : ""}.`, {
      tone: "success",
    });
    setAskReason(false);
  };
  const save = () => (changed.some((k) => sensitive.includes(k)) ? setAskReason(true) : commit());
  const set = <P extends K>(k: P, v: TenantRecord[P]) => setDraft((d) => ({ ...d, [k]: v }));
  const bar = dirty ? (
    <div
      role="status"
      className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-2 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-navy-900 text-white px-4 py-2.5 shadow-float"
    >
      <Icon.edit size={15} />
      {/* Names its part: a merged page has one bar per part (AENR-796). Clears the phone tab bar. */}
      <span className="text-sm">
        <b>Unsaved changes</b> · {section} · {changed.length} field
        {changed.length === 1 ? "" : "s"}
        {problem ? ` · ${problem}` : changed.some((k) => sensitive.includes(k)) ? " · needs a reason" : ""}
      </span>
      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={() => setDraft(pick())}
          className="rounded-[14px] px-3 py-1.5 text-[13px] font-semibold text-white ring-1 ring-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          Discard
        </button>
        <Btn size="sm" variant="teal" icon={Icon.check} onClick={save} disabled={!!problem}>
          Save
        </Btn>
      </div>
    </div>
  ) : null;
  const reasonModal = askReason ? (
    <ReasonModal
      title={`Reason for changing ${changed.filter((k) => sensitive.includes(k)).join(", ")}`}
      onCancel={() => setAskReason(false)}
      onConfirm={commit}
    />
  ) : null;
  return { draft, set, dirty, bar, reasonModal };
}

export function ReasonModal({
  title,
  onCancel,
  onConfirm,
  confirmLabel = "Save with reason",
  min = 5,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  confirmLabel?: string;
  min?: number;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      open
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Btn variant="ghost" onClick={onCancel}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            disabled={reason.trim().length < min}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmLabel}
          </Btn>
        </>
      }
    >
      <label className="block text-[12px] font-semibold text-slate-700">
        Reason (written to the Audit log)
        <Input
          className="mt-1"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Agreed in the renewal call on 12 Oct"
        />
      </label>
      {reason.trim().length > 0 && reason.trim().length < min && (
        <p className="mt-1 text-[12px] text-rose-700">At least {min} characters.</p>
      )}
    </Modal>
  );
}
