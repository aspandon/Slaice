import { useState } from "react";
import { ArrivalBadge } from "../../components/ArrivalBadge";
import { Icon } from "../../lib/icons";
import { EntryTicketIcon } from "../../components/productIcons";
import { Btn } from "../../components/ui";
import { QR } from "../../components/charts";
import { BeachBackdrop } from "../../components/Beach";
import { WalletOptions, type WalletPassData } from "../../components/WalletPass";
import { useApp, useT } from "../../app/store";
import { readHashQuery } from "../../app/router";
import { OPERATOR, TENANT, ZONES, todayISO } from "../../data/beach";
import { addDays, fmtDay, fmtWeekday } from "../../domain/period";
import { ARRIVAL_WINDOW } from "../../domain/visits";
import { readShared, sharedTotal, type SharedBooking } from "../../domain/sharePass";
import { downloadICS } from "../../lib/download";
import { useEntry } from "../../lib/useEntry";
import { FullscreenQR } from "./VisitTicket";

/* ============ A shared booking — the guest view (AENR-715) ============
   What a friend sees when the booker shares the visit: the beach day, the
   zones and sets, the arrival window, the booking's QR (the same one — the
   group shares its entries) and how many entries are left, with Add to Apple
   / Google Wallet and the calendar. Public: no sign-in, no app chrome. It
   reads the live arrivals when this browser has the booking; otherwise it
   shows the booking as it was shared — the gate always checks the live one. */

type Phase = "ok" | "cancelled" | "used" | "over";

export function GuestPass() {
  const t = useT();
  const [read] = useState(() => readShared(readHashQuery()));
  return (
    <div className="relative min-h-dvh">
      <BeachBackdrop pos="fixed" className="inset-0 rounded-none" />
      <div
        aria-hidden
        className="fixed inset-0 bg-gradient-to-b from-navy-950/10 via-transparent to-navy-950/25"
      />
      <main className="relative z-10 mx-auto max-w-md px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10 space-y-4">
        <header className="flex justify-center">
          <img
            src={`${import.meta.env.BASE_URL}tenant-logo.png`}
            alt={TENANT.name}
            className="h-14 w-auto drop-shadow-[0_2px_8px_rgba(0,40,80,0.25)]"
          />
        </header>
        {read.ok ? <SharedPass b={read.booking} /> : <BrokenLink why={read.why} />}
        <footer className="text-center space-y-2 pt-2">
          <a
            href="#/customer/home"
            onClick={(e) => {
              // The guest view is its own page — load the app proper.
              e.preventDefault();
              window.location.hash = "#/customer/home";
              window.location.reload();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl glass-card-solid px-4 min-h-[44px] text-guest-body font-semibold text-navy-900 hover:shadow-lift transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Icon.sparkles size={16} className="text-teal-600" /> {t("Book your own visit")}
          </a>
          <p className="mx-auto w-fit flex items-center gap-1.5 rounded-full glass-card-solid px-3 py-1 text-guest-caption text-slate-700">
            {t("powered by")}{" "}
            <span className="font-bold text-navy-900">
              SLA<span className="text-gold-600">i</span>CE
            </span>
          </p>
        </footer>
      </main>
    </div>
  );
}

function BrokenLink({ why }: { why: "missing" | "changed" | "unreadable" }) {
  const t = useT();
  return (
    <section role="alert" className="glass-card-solid rounded-3xl p-6 text-center">
      <span className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 grid place-items-center">
        <Icon.alert size={26} />
      </span>
      <h1 className="mt-3 font-display font-bold text-guest-head text-navy-900">
        {t("This link doesn't open a pass")}
      </h1>
      <p className="mt-1.5 text-guest-body text-slate-600 leading-relaxed">
        {why === "changed"
          ? t(
              "It was changed after it was shared, so it can't be trusted. Ask the person who booked to send it again.",
            )
          : t(
              "It looks incomplete. Ask the person who booked to send the link again — or to show you the QR.",
            )}
      </p>
      <p className="mt-3 text-guest-meta text-slate-500">
        {t("Help")}:{" "}
        <a
          className="underline hover:text-navy-900"
          href={`tel:${OPERATOR.phone.replace(/\s/g, "")}`}
        >
          {OPERATOR.phone}
        </a>
      </p>
    </section>
  );
}

function SharedPass({ b }: { b: SharedBooking }) {
  const t = useT();
  const { toast } = useApp();
  const e = useEntry();
  const [full, setFull] = useState(false);
  const today = todayISO();
  // Live when this browser knows the booking (the gate's arrivals, a cancellation); else as shared.
  const known = e.find(b.ref);
  const live = known ? e.stateOf(known, b.date) : null;
  const status = known ? e.statusOn(known, b.date) : "Confirmed";
  const total = live?.total || sharedTotal(b);
  const entered = live ? live.entered : Math.min(b.entered, total);
  const left = Math.max(0, total - entered);
  const phase: Phase =
    status === "Cancelled" || status === "Refunded" || status === "Expired"
      ? "cancelled"
      : left === 0 && total > 0
        ? "used"
        : b.date < today
          ? "over"
          : "ok";
  const day = `${fmtWeekday(b.date)} ${fmtDay(b.date)}`;
  const days = Math.round((Date.parse(b.date) - Date.parse(today)) / 86400000);
  const zones = [...new Set(b.sets.map((s) => s.zone))];
  const pass: WalletPassData = {
    ref: b.ref,
    holder: `${t("Guest of")} ${b.from}`,
    zone: zones.join(" · ") || TENANT.name,
    date: fmtDay(b.date),
    seat: b.sets.map((s) => s.id).join(", ") || "—",
    guests: total,
    voided: phase === "cancelled",
  };
  const calendar = () => {
    downloadICS(`beach-day-${b.ref}.ics`, {
      uid: `${b.ref}@${b.date}.shared@slaice`,
      title: `${t("Beach day")} · ${zones.join(" · ") || TENANT.name}`,
      start: b.date,
      end: addDays(b.date, 1),
      location: `${TENANT.name}, ${TENANT.place}`,
      description: `${t("Booking")} #${b.ref} · ${b.sets.map((s) => `${s.zone} ${s.id}`).join(", ")} · ${t("arrive")} ${ARRIVAL_WINDOW}. ${t("Show the QR at the gate.")}`,
    });
    toast(t("Calendar invite downloaded (.ics)."), { tone: "success" });
  };
  const color = (zone: string) => ZONES.find((z) => z.name === zone)?.color ?? "#94a3b8";
  const setHere = (id: string) => live?.sets.find((s) => s.setId === id);
  const ticketLeft = (cat: string) => live?.tickets.find((x) => x.cat === cat);
  const banner: Record<Exclude<Phase, "ok">, { tone: string; icon: string; text: string }> = {
    cancelled: {
      tone: "bg-rose-50 ring-rose-200 text-rose-900",
      icon: "x",
      text: t("This booking was cancelled — the QR no longer opens the gate."),
    },
    used: {
      tone: "bg-amber-50 ring-amber-300 text-amber-900",
      icon: "checkCircle",
      text: `${t("Everyone's in — all")} ${total} ${t("entries on this QR have been used.")}`,
    },
    over: {
      tone: "bg-slate-50 ring-slate-200 text-slate-700",
      icon: "clock",
      text: t("This beach day is over."),
    },
  };
  const B = phase !== "ok" ? banner[phase] : null;
  const BIcon = B ? Icon[B.icon] : null;

  return (
    <>
      <p className="text-center text-guest-body font-semibold text-white drop-shadow-[0_1px_4px_rgba(0,30,60,0.45)]">
        {b.from} {t("shared a beach day with you")}
      </p>

      <article
        aria-label={t("Your entry pass")}
        className="rounded-[28px] bg-white shadow-lift ring-1 ring-slate-200 overflow-hidden"
      >
        <div className="grad-sea text-white px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-guest-over font-semibold uppercase tracking-[0.14em] text-teal-100">
              {TENANT.name}
            </div>
            <div className="text-guest-over font-semibold uppercase tracking-[0.12em] text-teal-100">
              {days === 0
                ? t("Today")
                : days === 1
                  ? t("Tomorrow")
                  : days > 1
                    ? `${t("In")} ${days} ${t("days")}`
                    : ""}
            </div>
          </div>
          <h1 className="mt-1 font-display font-bold text-guest-title leading-tight">{day}</h1>
          <div className="text-guest-body text-white/90">
            {b.sets.length ? b.sets.map((s) => `${s.zone} ${s.id}`).join(" · ") : t("Entry")}
          </div>
        </div>
        <div className="relative px-6 py-5 text-center">
          <span aria-hidden className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-slate-100" />
          <span
            aria-hidden
            className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-slate-100"
          />
          {B && BIcon && (
            <div
              role="status"
              className={`mb-4 flex items-start gap-2 rounded-xl ring-1 px-3 py-2.5 text-left text-guest-meta font-semibold ${B.tone}`}
            >
              <BIcon size={17} className="shrink-0 mt-0.5" /> {B.text}
            </div>
          )}
          {phase === "cancelled" ? (
            <div className="mx-auto w-[208px] h-[208px] rounded-2xl bg-slate-100 grid place-items-center text-slate-500">
              <Icon.x size={56} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFull(true)}
              disabled={phase !== "ok"}
              className={`relative mx-auto grid place-items-center rounded-2xl p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${phase === "ok" ? "hover:bg-slate-50" : "opacity-35"}`}
              aria-label={t("Show the QR full screen")}
            >
              <QR size={208} seed={b.ref} />
            </button>
          )}
          <div className="mt-1 font-mono text-guest-body font-bold text-navy-900">#{b.ref}</div>
          {phase === "ok" && (
            <div className="text-guest-meta text-slate-500">
              {t("Show it at the gate — tap for full screen.")}
            </div>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-left text-guest-meta">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <dt className="text-slate-500 text-guest-caption">{t("Arrive")}</dt>
              <dd className="font-semibold text-navy-900">{ARRIVAL_WINDOW}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <dt className="text-slate-500 text-guest-caption">{t("Booked by")}</dt>
              <dd className="font-semibold text-navy-900">{b.from}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 col-span-2">
              <dt className="text-slate-500 text-guest-caption">{t("Entrance")}</dt>
              <dd className="font-semibold text-navy-900 flex items-center justify-between gap-2">
                <span>
                  {t("Main gate")} · {OPERATOR.address}
                </span>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${TENANT.name} ${TENANT.place}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-teal-700 hover:underline shrink-0"
                >
                  <Icon.map size={14} /> {t("Map")}
                  <span className="sr-only"> ({t("opens in a new tab")})</span>
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </article>

      {/* Who it admits and what's left — the group shares one allowance (moot once cancelled or over). */}
      {(phase === "ok" || phase === "used") && (
        <section
          aria-labelledby="pass-entries"
          className="glass-card-solid rounded-3xl p-5 space-y-3"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="pass-entries" className="flex flex-wrap items-center gap-2 font-display font-bold text-navy-900 text-guest-head">
              {t("Entries")}
              {live && live.arrivals.length > 0 && <ArrivalBadge st={live} t={t} />}
            </h2>
            <span className="text-guest-body font-bold text-navy-900 tnum">
              {left} {t("of")} {total} {t("left")}
            </span>
          </div>
          <div
            className="h-2.5 rounded-full bg-slate-100 overflow-hidden"
            role="progressbar"
            aria-label={t("Entries used")}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={entered}
          >
            <div
              className="h-full rounded-full bg-teal-600"
              style={{ width: `${total ? Math.round((entered / total) * 100) : 0}%` }}
            />
          </div>
          <ul className="divide-y divide-slate-100">
            {b.sets.map((s) => {
              const u = setHere(s.id);
              return (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <span
                    aria-hidden
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: color(s.zone) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-guest-body font-semibold text-navy-900">
                      {s.zone} · <span className="font-mono">{s.id}</span>
                    </div>
                    <div className="text-guest-meta text-slate-500">
                      {t("Sunbed set")} · {s.seats} {t("seats")}
                    </div>
                  </div>
                  {u && (
                    <span className="text-guest-meta font-semibold text-slate-700 tnum">
                      {u.taken ? `${u.taken} ${t("of")} ${u.seats} ${t("here")}` : t("Nobody yet")}
                    </span>
                  )}
                </li>
              );
            })}
            {b.tickets.map((x) => {
              const u = ticketLeft(x.cat);
              return (
                <li key={x.cat} className="flex items-center gap-3 py-2.5">
                  <EntryTicketIcon size={16} className="text-teal-600 shrink-0" />
                  <div className="min-w-0 flex-1 text-guest-body font-semibold text-navy-900">
                    {t(x.label)}
                  </div>
                  <span className="text-guest-meta font-semibold text-slate-700 tnum">
                    {u ? `${u.left} ${t("of")} ${x.qty} ${t("left")}` : `× ${x.qty}`}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="flex items-start gap-2 text-guest-caption text-slate-500 leading-snug">
            <Icon.info size={14} className="shrink-0 mt-0.5" />
            {live
              ? t(
                  "Live — it updates as your group comes through the gate. Everyone uses this same QR.",
                )
              : `${t("As shared")} ${fmtDay(b.at.slice(0, 10))}, ${b.at.slice(11, 16)}. ${t("Everyone uses this same QR — the gate checks what is left when you arrive.")}`}
          </p>
        </section>
      )}

      {phase === "ok" && (
        <section
          aria-label={t("Keep it handy")}
          className="glass-card-solid rounded-3xl p-5 space-y-3"
        >
          <WalletOptions pass={pass} />
          <Btn variant="outline" full icon={Icon.calendar} onClick={calendar}>
            {t("Add to calendar")}
          </Btn>
        </section>
      )}
      {full && (
        <FullscreenQR
          code={`#${b.ref}`}
          caption={`${day}${b.sets.length ? ` · ${b.sets.map((s) => s.id).join(", ")}` : ""}`}
          onClose={() => setFull(false)}
        />
      )}
    </>
  );
}
