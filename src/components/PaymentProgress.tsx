import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../lib/icons";
import { Btn } from "./ui";
import { useT } from "../app/store";
import { prefersReducedMotion } from "../lib/motion";

/* ============ The payment moment (AENR-734) ============
   What happens between "Pay" and the pass, shown the way payment sheets and
   travel apps do it: the system's status while it works, then one clear
   success message, then the ticket. Three steps run on one progress bar —
   the payment is authorised, the booking (the sets) is confirmed, the pass and
   its QR are issued — each turning from a spinner into a tick. Then a drawn
   check, the amount and the reference; the pass opens by itself after a short
   read, or at once with "View your pass". Nothing can be dismissed while it
   works, so a guest never wonders whether the payment went through. Demo: the
   timings are simulated; under reduced motion the steps still advance (status
   matters) but nothing animates. */

export interface PaymentMoment {
  amount: number;
  /** "Visa ···· 4242", "Apple Pay" … — empty when nothing is charged (pass / credit). */
  method: string;
  reference: string;
}

// The demo's simulated timings (AENR-853: were 1100 / 900 / 800 ms and an 1800 ms hold — with the
// pass printing after, ≈ 6 s from Pay to a usable pass; now ≈ 2.5 s). Long enough to read each step;
// the hold lets the drawn check finish (0.75 s, index.css .pp-check) before the pass opens.
const STEP_MS = [450, 400, 350];
const HOLD_MS = 1000;

export function PaymentProgress({ moment, onDone }: { moment: PaymentMoment; onDone: () => void }) {
  const t = useT();
  const charged = moment.amount > 0;
  const steps = [
    charged
      ? { label: t("Authorising your payment"), sub: moment.method }
      : { label: t("Applying your pass and credit"), sub: t("Nothing to charge") },
    { label: t("Confirming your booking"), sub: t("Holding your sets for the day") },
    { label: t("Issuing your pass"), sub: t("One QR for your whole group") },
  ];
  // 0..2 = working on that step; 3 = all done (success).
  const [at, setAt] = useState(0);
  const done = at >= steps.length;
  const finished = useRef(false);
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };
  useEffect(() => {
    const quick = prefersReducedMotion() ? 0.6 : 1;
    if (at < steps.length) {
      const id = window.setTimeout(() => setAt((x) => x + 1), STEP_MS[at] * quick);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(finish, HOLD_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advances on its own clock
  }, [at]);
  // Focus the dialog so screen readers announce it; the status line below is live.
  const box = useRef<HTMLDivElement>(null);
  const viewBtn = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.focus();
  }, []);
  useEffect(() => {
    if (done) viewBtn.current?.querySelector("button")?.focus();
  }, [done]);
  const pct = done ? 100 : Math.round(((at + 0.5) / steps.length) * 100);

  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center bg-navy-950/45 backdrop-blur-md px-4 animate-fade-in">
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pp-title"
        tabIndex={-1}
        className="w-full max-w-sm rounded-[28px] bg-white shadow-float ring-1 ring-slate-200 p-6 outline-none"
      >
        {!done ? (
          <>
            <h2 id="pp-title" className="font-display font-bold text-guest-head text-navy-900">
              {charged ? t("Processing your payment") : t("Confirming your booking")}
            </h2>
            <p className="mt-0.5 text-guest-meta text-slate-600">
              {t("Please keep this screen open — it takes a few seconds.")}
            </p>
            <div
              className="mt-4 h-1.5 rounded-full bg-slate-100 overflow-hidden"
              role="progressbar"
              aria-label={t("Progress")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div
                className="h-full rounded-full bg-teal-600 transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: `${pct}%` }}
              />
            </div>
            <ol className="mt-4 space-y-3">
              {steps.map((s, i) => {
                const state = i < at ? "done" : i === at ? "active" : "next";
                return (
                  <li key={s.label} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={`mt-0.5 w-6 h-6 rounded-full grid place-items-center shrink-0 transition-colors ${
                        state === "done"
                          ? "bg-teal-600 text-white"
                          : state === "active"
                            ? "ring-2 ring-teal-600"
                            : "ring-1 ring-slate-300"
                      }`}
                    >
                      {state === "done" ? (
                        <Icon.check size={14} />
                      ) : state === "active" ? (
                        <span className="w-3 h-3 rounded-full border-2 border-teal-600 border-t-transparent animate-spin motion-reduce:animate-none" />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-guest-body font-semibold ${state === "next" ? "text-slate-500" : "text-navy-900"}`}
                      >
                        {s.label}
                      </span>
                      {s.sub && (
                        <span
                          className={`block text-guest-caption ${state === "next" ? "text-slate-500" : "text-slate-500"}`}
                        >
                          {s.sub}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="sr-only" aria-live="polite">
              {steps[Math.min(at, steps.length - 1)].label}
            </p>
            <div className="mt-5 flex items-center justify-center gap-1.5 text-guest-caption text-slate-500">
              <Icon.lock size={12} /> {t("Secured by Stripe")}
            </div>
          </>
        ) : (
          <div className="text-center">
            <svg aria-hidden viewBox="0 0 52 52" className="pp-check mx-auto w-16 h-16">
              <circle
                cx="26"
                cy="26"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-teal-600"
              />
              <path
                d="M15 27 l7 7 l15 -15"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-teal-600"
              />
            </svg>
            <h2
              id="pp-title"
              className="mt-3 font-display font-bold text-guest-title text-navy-900"
              aria-live="assertive"
            >
              {charged ? t("Payment complete") : t("Booking confirmed")}
            </h2>
            {charged && (
              <p className="mt-1 font-display text-guest-head font-bold text-navy-900 tnum">
                €{moment.amount.toFixed(2)}
              </p>
            )}
            <p className="mt-1 text-guest-meta text-slate-600">
              {charged ? `${moment.method} · ` : ""}
              {t("Booking")}{" "}
              <span className="font-mono font-semibold text-navy-900">{moment.reference}</span>
            </p>
            <p className="mt-0.5 text-guest-caption text-slate-500">
              {t("Your receipt is on its way by e-mail.")}
            </p>
            <div ref={viewBtn} className="mt-5">
              <Btn variant="teal" size="lg" full icon={Icon.qr} onClick={finish}>
                {t("View your pass")}
              </Btn>
            </div>
            {/* The pass opens by itself after a short read — shown so it is never a surprise. */}
            <div className="mt-3 h-1 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
              <div
                className="h-full bg-teal-200 pp-countdown"
                style={{ animationDuration: `${HOLD_MS}ms` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
