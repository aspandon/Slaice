import { useEffect, useRef } from "react";
import { Icon } from "../../lib/icons";
import { QR } from "../../components/charts";
import { useT } from "../../app/store";
import { TENANT } from "../../data/beach";
import { addDays, fmtDay } from "../../domain/period";
import { downloadICS } from "../../lib/download";
import { ARRIVAL_WINDOW, type Visit } from "../../domain/visits";
import type { CustomerDocument } from "../../domain/types";
import type { InvoiceRequest } from "../../domain/account";

/* The guest's ticket for a visit (AENR-571 / 572 / 573): the gate QR full
   screen, the calendar file, sharing, and the visit's receipt or invoice. */

/** The QR on a white full screen — the phone's brightest surface — for the gate scanner. */
export function FullscreenQR({
  code,
  caption,
  onClose,
}: {
  code: string;
  caption: string;
  onClose: () => void;
}) {
  const t = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${t("Entry QR")} ${code}`}
      className="fixed inset-0 z-[95] bg-white grid place-items-center p-6"
    >
      <div className="text-center">
        <div className="mx-auto grid place-items-center">
          <QR size={Math.min(420, Math.round(window.innerWidth * 0.82))} seed={code} />
        </div>
        <div className="mt-4 font-mono text-2xl font-bold text-navy-900">{code}</div>
        <div className="mt-1 text-[15px] text-slate-600">{caption}</div>
        <div className="mt-1 text-[13px] text-slate-500">
          {t("Turn your screen brightness up at the gate.")}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-navy-900 text-white px-5 min-h-[48px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          <Icon.x size={16} /> {t("Close")}
        </button>
      </div>
    </div>
  );
}

/** A calendar event for the visit (all day, with the arrival window and the booking ref). */
export function downloadVisitIcs(v: Visit) {
  const sets = v.sets.length ? `Sunbeds ${v.sets.join(", ")}` : "Entry";
  downloadICS(`beach-day-${v.refs[0].replace("#", "")}.ics`, {
    uid: `${v.key}@slaice`,
    title: `Beach day · ${v.zone || TENANT.name}`,
    start: v.date,
    end: addDays(v.date, 1),
    location: `${TENANT.name}, ${TENANT.place}`,
    description: `Booking ${v.refs.join(", ")} · ${sets} · arrive ${ARRIVAL_WINDOW}. Show your QR at the gate.`,
  });
}

/** Share the visit with the people coming along (Web Share, or copy a summary). */
export async function shareVisit(v: Visit): Promise<"shared" | "copied" | "none"> {
  const text = `Beach day at ${TENANT.name} · ${fmtDay(v.date)}${v.zone ? ` · ${v.zone}` : ""}${v.sets.length ? ` · sunbeds ${v.sets.join(", ")}` : ""} · arrive ${ARRIVAL_WINDOW}. Booking ${v.refs[0]}.`;
  const nav = navigator as Navigator & {
    share?: (d: { title: string; text: string }) => Promise<void>;
  };
  try {
    if (nav.share) {
      await nav.share({ title: "Beach day", text });
      return "shared";
    }
    await navigator.clipboard?.writeText(text);
    return "copied";
  } catch {
    return "none";
  }
}

const money = (n: number) => `€${n.toFixed(2)}`;
const num = (ref: string) => ref.replace(/\D/g, "").padStart(6, "0").slice(-6);

/** The visit's receipt (ΑΠΥ under the hood — the guest just sees "Receipt"). Prices include 24% VAT. */
export function receiptForVisit(v: Visit): CustomerDocument {
  const n = num(v.refs[0]);
  return {
    id: `ΑΠΥ-2026-${n}`,
    for: visitTitle(v),
    date: fmtDay(v.date, true),
    amt: `€${v.total}`,
    mark: `4000010203040${n.slice(-5)}`,
    lines: v.lines.map((l) => {
      const net = Math.round((l.amount / 1.24) * 100) / 100;
      return [l.label, money(net), money(l.amount - net), money(l.amount)];
    }),
  };
}
/** The invoice issued instead of the receipt when the guest asks with VAT details (ΤΠΥ). */
export function invoiceForVisit(v: Visit, r: InvoiceRequest): CustomerDocument {
  const base = receiptForVisit(v);
  return { ...base, id: `ΤΠΥ-2026-${num(r.id)}`, for: `${r.company} · VAT ${r.vatNo}` };
}
export const visitTitle = (v: Visit) =>
  [
    v.sets.length ? `${v.sets.length} sunbed${v.sets.length === 1 ? "" : "s"}` : "",
    v.tickets.length ? "entry" : "",
    v.parking.length ? "parking" : "",
    v.lockers.length ? "locker" : "",
  ]
    .filter(Boolean)
    .join(" + ")
    .replace(/^./, (c) => c.toUpperCase()) || "Beach day";
