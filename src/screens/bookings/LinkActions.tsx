import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Btn } from "../../components/ui";
import { useApp } from "../../app/store";
import { useDemoNow } from "../../lib/useLiveSlots";
import { payLinkStatus, payUrl, type PayLink } from "../../domain/payLink";
import { CardPayModal } from "./CardPayModal";

/* Payment actions on a staff booking (AENR-559) — what the Pay-by-link page
   used to do, now in the booking drawer: open the guest's payment page, copy /
   resend the link, give more time, cancel, or take an unpaid booking's
   payment. Renders nothing for bookings that didn't come from New booking. */

const hhmm = (iso: string | number) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export function LinkActions({ bookingId }: { bookingId: string }) {
  const { payLinks, setPayLinks, toast, viewAs, persona } = useApp();
  const now = useDemoNow(5000);
  const [paying, setPaying] = useState(false);
  const l = payLinks.find((x) => `#${x.id}` === bookingId);
  if (!l) return null;
  const who =
    viewAs?.name ??
    (persona === "callcenter"
      ? "Maria Kontou"
      : persona === "support"
        ? "Support Agent"
        : "Eleni Markou");
  const st = payLinkStatus(l, now);
  if (st !== "awaiting" && st !== "expired" && st !== "unpaid") return null;
  const patch = (fn: (x: PayLink) => PayLink, text: string) =>
    setPayLinks((ls) =>
      ls.map((x) =>
        x.id === l.id
          ? { ...fn(x), log: [{ at: new Date(now).toISOString(), text }, ...x.log] }
          : x,
      ),
    );
  const left = Math.max(1, Math.round((new Date(l.deadline).getTime() - now) / 60000));
  const extend = () => {
    patch(
      (x) => ({
        ...x,
        deadline: new Date(
          Math.max(now, new Date(x.deadline).getTime()) + 30 * 60000,
        ).toISOString(),
      }),
      `Deadline extended 30 min · ${who}`,
    );
    toast(
      st === "expired"
        ? `${l.id}: reopened for 30 minutes — the sets are held again if still free.`
        : `${l.id}: deadline extended by 30 minutes.`,
    );
  };

  return (
    <div className="rounded-2xl ring-1 ring-amber-300 bg-amber-50/70 p-3.5 space-y-2.5">
      <div className="flex items-start gap-2 text-[13px] text-amber-900">
        <Icon.clock size={16} className="mt-0.5 shrink-0" />
        <span>
          {st === "awaiting" ? (
            <>
              <b>Payment link sent</b> — pay by {hhmm(l.deadline)} · {left} min left. The sets are
              held until then.
            </>
          ) : st === "expired" ? (
            <>
              <b>Link expired at {hhmm(l.deadline)}</b> — not paid, the sets were released.
            </>
          ) : (
            <>
              <b>Unpaid</b> — the guest pays on arrival. Take the payment here or at the till.
            </>
          )}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {st === "awaiting" && (
          <Btn size="sm" variant="teal" icon={Icon.globe} onClick={() => setPaying(true)}>
            Open guest’s page
          </Btn>
        )}
        {st === "awaiting" && (
          <Btn
            size="sm"
            variant="outline"
            icon={Icon.copy}
            onClick={() => {
              void navigator.clipboard?.writeText(payUrl(l)).catch(() => undefined);
              toast(`Copied ${payUrl(l)}`);
            }}
          >
            Copy link
          </Btn>
        )}
        {st === "awaiting" && (
          <Btn
            size="sm"
            variant="outline"
            icon={Icon.send}
            onClick={() => {
              patch((x) => x, `Link resent · ${who}`);
              toast(`Demo — link resent to ${l.guest.phone ?? l.guest.email}.`, {
                tone: "success",
              });
            }}
          >
            Resend
          </Btn>
        )}
        {(st === "awaiting" || st === "expired") && (
          <Btn size="sm" variant="outline" icon={Icon.clock} onClick={extend}>
            {st === "expired" ? "Reopen 30 min" : "+30 min"}
          </Btn>
        )}
        {st === "unpaid" && (
          <Btn size="sm" variant="primary" icon={Icon.card} onClick={() => setPaying(true)}>
            Take payment
          </Btn>
        )}
        {(st === "awaiting" || st === "unpaid") && (
          <Btn
            size="sm"
            variant="ghost"
            className="text-rose-700"
            onClick={() => {
              patch((x) => ({ ...x, closed: "cancelled" }), `Cancelled · ${who}`);
              toast(`${l.id} cancelled — sets released.`);
            }}
          >
            Cancel booking
          </Btn>
        )}
      </div>
      {paying && (
        <CardPayModal
          title={st === "unpaid" ? "Card payment (demo terminal)" : "Guest’s payment page (demo)"}
          url={st === "awaiting" ? payUrl(l) : undefined}
          note={
            st === "unpaid"
              ? `Paid by ${l.guest.name} · taken by ${who}`
              : `Reserved for ${l.guest.name} · pay by ${hhmm(l.deadline)}`
          }
          lines={l.lines}
          total={l.total}
          date={l.date}
          declined={
            st === "unpaid"
              ? "Card declined — try another card or take cash at the till."
              : "Card declined — the guest can try another card. The sets stay reserved until the deadline."
          }
          onClose={() => setPaying(false)}
          onDeclined={() => patch((x) => x, "Card declined")}
          onPaid={() => {
            patch(
              (x) => ({ ...x, closed: "paid", paidAt: new Date(now).toISOString() }),
              st === "unpaid"
                ? `Paid by card · ${who}`
                : "Guest paid by card — booking confirmed automatically",
            );
            toast(`${l.id} paid — booking confirmed, ${l.guest.name} got the QR and the ΑΠΥ.`, {
              tone: "success",
            });
            setPaying(false);
          }}
        />
      )}
    </div>
  );
}
