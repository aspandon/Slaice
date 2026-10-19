import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Icon } from "../../lib/icons";
import { Btn, Card, ErrorState, Input, Modal, Skeleton } from "../../components/ui";
import { usePlatform } from "../../lib/usePlatform";
import type { TenantRecord } from "../../domain/tenants";

/* Building blocks for the tenant page sections (AENR-500): a section frame
   with loading / error / read-only states, a per-section draft with Save and
   a reason for sensitive fields (written to the Audit log), and the global
   unsaved-changes guard used when navigating between sections or tenants. */

/** Module-level unsaved-changes flag; navigation asks before leaving a dirty section. */
export const navGuard = { dirty: false };
export const confirmLeave = () =>
  !navGuard.dirty ||
  window.confirm("You have unsaved changes on this section. Leave without saving?");

/** Per-section edit right (from the registry + Slaice role) and the demo error mode. */
export const SectionCtx = createContext<{ canEdit: boolean; demoError: boolean }>({
  canEdit: true,
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
}: {
  title: string;
  sub?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { canEdit, demoError } = useContext(SectionCtx);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(demoError);
  useEffect(() => {
    const id = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <section aria-labelledby="tenant-section-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="tenant-section-title" className="font-display text-xl font-bold text-navy-900">
            {title}
          </h2>
          {sub && <p className="text-[13px] text-slate-600">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
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
  useEffect(() => {
    navGuard.dirty = dirty;
    return () => {
      navGuard.dirty = false;
    };
  }, [dirty]);
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
      className="sticky bottom-2 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-navy-900 text-white px-4 py-2.5 shadow-float"
    >
      <Icon.edit size={15} />
      <span className="text-sm">
        <b>Unsaved changes</b> · {changed.length} field{changed.length === 1 ? "" : "s"}
        {changed.some((k) => sensitive.includes(k)) ? " · needs a reason" : ""}
      </span>
      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={() => setDraft(pick())}
          className="rounded-[14px] px-3 py-1.5 text-[13px] font-semibold text-white ring-1 ring-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          Discard
        </button>
        <Btn size="sm" variant="teal" icon={Icon.check} onClick={save}>
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
