import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Btn, Modal } from "../../components/ui";
import { fmtDay } from "../../domain/period";
import { eur } from "../../domain/till";
import type { PayLinkLine } from "../../domain/payLink";

/* A simulated card payment (AENR-534 / 559): the guest's Stripe page behind a
   payment link, or the card terminal staff key a card into over the phone.
   Approve confirms after a short wait; decline keeps everything as it was. */

export function CardPayModal({
  title,
  url,
  note,
  lines,
  total,
  date,
  onClose,
  onPaid,
  onDeclined,
  declined = "Card declined — try another card. Nothing was booked or charged.",
}: {
  title: string;
  /** The payment-link URL (guest page); omitted for a card taken by staff. */
  url?: string;
  note: string;
  lines: readonly PayLinkLine[];
  total: number;
  date: string;
  onClose: () => void;
  onPaid: () => void;
  onDeclined?: () => void;
  declined?: string;
}) {
  const [phase, setPhase] = useState<"idle" | "paying" | "declined">("idle");
  const pay = (ok: boolean) => {
    setPhase("paying");
    window.setTimeout(() => {
      if (ok) return onPaid();
      setPhase("declined");
      onDeclined?.();
    }, 1200);
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Close
          </Btn>
          <Btn variant="outline" disabled={phase === "paying"} onClick={() => pay(false)}>
            Simulate decline
          </Btn>
          <Btn
            variant="primary"
            icon={Icon.card}
            loading={phase === "paying"}
            onClick={() => pay(true)}
          >
            Pay {eur(total)}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {url && (
          <div className="rounded-lg bg-slate-50 ring-1 ring-slate-200 px-3 py-1.5 font-mono text-[12px] text-slate-600 truncate">
            {url}
          </div>
        )}
        <div>
          <div className="text-[12px] text-slate-500">{note}</div>
          <ul className="mt-1 text-sm divide-y divide-slate-100">
            {lines.map((l) => (
              <li key={l.label} className="py-1.5 flex justify-between">
                <span>
                  {l.qty > 1 ? `${l.qty} × ` : ""}
                  {l.label}
                </span>
                <span className="tnum">{eur(l.qty * l.unit)}</span>
              </li>
            ))}
            <li className="pt-2 flex justify-between font-bold text-navy-900">
              <span>Total · {fmtDay(date)}</span>
              <span className="tnum">{eur(total)}</span>
            </li>
          </ul>
        </div>
        <div className="rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-sm flex items-center gap-2">
          <Icon.card size={16} className="text-slate-500" />{" "}
          <span className="font-mono">4242 4242 4242 4242</span>
          <span className="ml-auto text-slate-500">12/28</span>
        </div>
        {phase === "declined" && (
          <div
            role="alert"
            className="rounded-lg bg-rose-50 text-rose-800 ring-1 ring-rose-600/20 px-3 py-2 text-[12.5px]"
          >
            {declined}
          </div>
        )}
      </div>
    </Modal>
  );
}
