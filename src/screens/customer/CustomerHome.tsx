import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGuestRecord } from "../../lib/useGuestRecord";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { Badge, Btn, NotMvpBadge } from "../../components/ui";
import { PassCard } from "../../components/PassCard";
import { gsap, motionOK, DUR, EASE, useMagnetic, useCardTilt } from "../../lib/fx";
import { useCountUp } from "../../lib/motion";
import { ZONES, zoneLayout, WEATHER_DEMO, TENANT, forecastFor, todayISO } from "../../data/beach";
import { QR } from "../../components/charts";
import { useVisits } from "../../lib/useVisits";
import { ARRIVAL_ENDS, ARRIVAL_WINDOW, homeMoment, usual, type MomentKind, type UsualBooking, type Visit } from "../../domain/visits";
import { fmtDay, fmtWeekday } from "../../domain/period";
import { VisitQR, receiptForVisit, visitPass } from "./VisitTicket";
import { ExtrasDialog } from "./CustomerBookings";
import { ReceiptModal } from "./CustomerDocs";
import { useDemoNow } from "../../lib/useLiveSlots";
import { appliesAtCheckout } from "../../domain/rewards";
import { readHashQuery } from "../../app/router";
import { WalletButtons } from "../../components/WalletPass";
import { SceneDemoPanel } from "../../components/SceneDemoPanel";
import { SEASON_END_LABEL } from "../../data/passes";
import { BUILTIN_SCHEMES, makeCustomScheme, schemeProgress, HOME_LOYALTY_STATS } from "../../data/loyalty";
import type { RewardState, LoyaltyState } from "../../data/loyalty";
import { BADGE_COLORS, statValue, metricFmt, HOME_GAME_STATS } from "../../data/gamification";
import { useApp, useT } from "../../app/store";

// Bare date from a validity label (e.g. "End of season · 30 Sep 2026").
const dateOf = (s: string) => s.split(/·|to/).pop()?.trim() ?? s;

// `.glass-flat`, not `.glass`: a frosted look with NO backdrop-filter, so these
// cards can't show the GPU backdrop-filter tile seams (shifting vertical lines)
// that appear over the fixed parallax beach. Over the smooth sky it reads the
// same; see index.css.
const CARD = "glass-flat rounded-3xl overflow-hidden relative";

/* The full hero choreography (word-by-word headline, chip/CTA pops) plays once
   per session; returning to Home repeats only a quick card stagger so the page
   never feels slow on the way back. */
let homeIntroPlayed = false;

export function CustomerHome() {
  const { dive, go, loyalty, beachLayout, weather, dayTime, sceneFx } = useApp();
  const { visits } = useVisits();
  const t = useT();
  // The hero chip mirrors the demo scene: weather icon/label/temp plus a
  // greeting that follows the scene clock (both fall back to a sunny noon
  // when the admin disables the effects).
  const wd = sceneFx.weather ? WEATHER_DEMO[weather] : WEATHER_DEMO.sunny;
  const hour = sceneFx.daytime ? dayTime : 10; // off → the classic morning chip
  const greeting = hour < 12 ? "Good morning, Elena" : hour < 18 ? "Good afternoon, Elena" : "Good evening, Elena";
  const WIcon = Icon[wd.icon] || Icon.sun;
  const chipBubble = wd.icon === "sun" ? "from-amber-300 to-amber-500" : wd.icon === "wind" ? "from-teal-300 to-teal-500" : "from-slate-400 to-slate-600";
  const [promoDismissed, setPromoDismissed] = useState(false);
  const rewards = activeRewards(loyalty);
  const ready = rewards.filter((a) => a.state.kind === "claim").length;
  const scope = useRef<HTMLDivElement>(null);
  const cta = useMagnetic<HTMLSpanElement>(0.22, 6);

  // Live availability for the hero — summed from the same per-zone layouts the
  // booking wizard sells from (admin-authored where present), so the number is
  // always consistent with what the guest will actually find inside.
  const freeToday = useMemo(
    () => ZONES.reduce((a, z) => a + (beachLayout[z.id] ?? zoneLayout(z)).filter((s) => s.state === "a").length, 0),
    [beachLayout],
  );
  const fromPrice = useMemo(() => Math.min(...ZONES.map((z) => z.from)), []);
  const { display: freeDisplay } = useCountUp(freeToday, { duration: 1100 });

  // Entrance choreography. Elements render in their final state; GSAP only adds
  // the motion, so reduced-motion users get the static layout untouched.
  useLayoutEffect(() => {
    if (!motionOK()) return;
    const replay = homeIntroPlayed;
    // Deferred so StrictMode's synthetic mount/unmount cycle (which cleans up
    // synchronously) doesn't burn the once-per-session full intro in dev.
    const mark = setTimeout(() => { homeIntroPlayed = true; }, 0);
    const ctx = gsap.context(() => {
      // Heal first: if a previous entrance was interrupted mid-tween (nav away,
      // tab switch, a competing CSS transition), a card could be left with a
      // stale inline opacity — clear everything before animating again.
      gsap.set("[data-home-card],[data-hero-chip],[data-hero-word],[data-hero-sub],[data-hero-live],[data-hero-cta]", { clearProps: "opacity" });
      if (replay) {
        gsap.from("[data-home-card]", { y: 16, opacity: 0, duration: 0.45, ease: EASE.out, stagger: 0.05, overwrite: "auto", clearProps: "opacity" });
        return;
      }
      gsap.timeline({ defaults: { ease: EASE.out, overwrite: "auto", clearProps: "opacity" } })
        .from("[data-home-card]", { y: 26, opacity: 0, duration: 0.7, stagger: 0.08 })
        .from("[data-hero-chip]", { y: 10, opacity: 0, duration: 0.45 }, 0.15)
        .from("[data-hero-word]", { y: "0.7em", opacity: 0, duration: DUR.md, stagger: 0.045 }, 0.25)
        .from("[data-hero-sub]", { y: 12, opacity: 0, duration: 0.5 }, "-=0.3")
        .from("[data-hero-live]", { y: 10, opacity: 0, duration: 0.45 }, "-=0.3")
        .from("[data-hero-cta]", { y: 12, opacity: 0, scale: 0.92, duration: 0.55, ease: EASE.spring }, "-=0.3");
    }, scope);
    return () => { clearTimeout(mark); ctx.revert(); };
  }, []);

  // Home follows the moment (AENR-610): the QR on the morning of a visit, extras while there,
  // the receipt and Book again afterwards, the opening date off-season — else the next visit.
  // `?moment=` previews one (demo menu › Preview Home); it follows the link while Home is open.
  const [force, setForce] = useState(() => readHashQuery().get("moment") ?? "");
  useEffect(() => {
    const on = () => setForce(readHashQuery().get("moment") ?? "");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const clock = new Date(useDemoNow()).toTimeString().slice(0, 5);
  const moment = homeMoment(visits, todayISO(), clock, (force || undefined) as MomentKind | undefined);
  const next = moment.kind === "morning" || moment.kind === "upcoming" ? moment.v : null;
  const mine = usual(visits);
  const hero = (
      <button onClick={() => dive()} className="text-left group block w-full" data-home-card>
        <div className={`${CARD} p-6 sm:p-9 pressable cursor-pointer transition duration-300 ease-spring hover:-translate-y-1 hover:bg-white/80`}>
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700" data-hero-chip>
              <span className={`w-6 h-6 rounded-full grid place-items-center bg-gradient-to-br ${chipBubble} text-white shadow-sm`}>
                <WIcon size={11} />
              </span>
              {t(greeting)} · {t(wd.label)} {wd.tempC}°
            </div>
            {/* Headline fits one line in English; longer translations (FR/EL/IT…)
                are wider, so on large screens we lift the width cap and ease the
                size a touch (32px) so the line uses the available space instead
                of wrapping. */}
            <h1 className="mt-3 font-display font-bold text-[28px] sm:text-[36px] lg:text-[32px] leading-[1.05] tracking-tight text-navy-900 max-w-2xl lg:max-w-none">
              <KineticWords text={t("Plan your full beach day")} />{" "}
              <span className="text-shimmer inline-block" data-hero-word>{t("in 60 seconds")}</span>
            </h1>
            <div className="text-[14px] text-slate-700 mt-3 max-w-xl" data-hero-sub>
              {t("Guests, dates, sunbeds, locker, parking — one guided flow with a live total.")}
            </div>
            <div className="mt-4 flex items-center gap-2.5 text-[13px] font-semibold text-navy-900" data-hero-live>
              <span aria-hidden="true" className="live-dot relative w-2 h-2 rounded-full bg-teal-500 text-teal-500 shrink-0" />
              <span><b className="tnum">{freeDisplay}</b> {t("sunbeds free today")} · {t("from")} €{fromPrice}</span>
            </div>
            <span ref={cta} className="cta-breathe mt-5 inline-flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-semibold bg-navy-900 text-white shadow-btn-primary" data-hero-cta>
              <Icon.sparkles size={16} /> {t("Start guided booking")} <Icon.arrowR size={16} />
            </span>
          </div>
        </div>
      </button>

  );

  return (
    <div ref={scope} className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
      {moment.kind !== "none" && <h1 className="sr-only">{t("Home")}</h1>}
      {next ? <NextVisitCard v={next} qrFirst={moment.kind === "morning"} />
        : moment.kind === "during" ? <AtBeachCard v={moment.v} />
        : moment.kind === "after" ? <AfterVisitCard v={moment.v} mine={mine} />
        : moment.kind === "offseason" ? <OffSeasonCard opens={moment.opens} />
        : hero}

      <div className="grid sm:grid-cols-2 gap-4 items-stretch">
        {/* Rebook your usual — from the guest's own visits (the after-visit card already offers it) */}
        {moment.kind !== "after" && <>
        {/* "Book again" opens Pay with the usual filled in (AENR-611); first-timers get the guided booking. */}
        <button onClick={() => (mine ? go("customer", "plan", { rebook: mine }) : dive())} className={`${CARD} p-5 flex flex-col gap-2.5 text-left hover:bg-white/80 transition-colors group`} data-home-card>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white grid place-items-center shrink-0"><Icon.umbrella size={18} /></span>
            <div className="min-w-0">
              <div className="font-semibold text-navy-900 text-[15px] leading-tight">{next ? t("Plan another visit") : t("Rebook your usual")}</div>
              <div className="text-[12.5px] text-slate-600 mt-0.5 leading-snug">
                {mine ? `${mine.zone} · ${mine.sets} ${mine.sets === 1 ? t("sunbed") : t("sunbeds")} — ${t("your usual")}` : `${freeDisplay} ${t("sunbeds free today")} · ${t("from")} €${fromPrice}`}
              </div>
            </div>
          </div>
          <div className="self-start flex items-center gap-1 text-teal-700 text-[13px] font-semibold px-3 py-1.5 -ml-3">{mine ? t("Book again") : t("Start guided booking")} <Icon.chevR size={14} className="group-hover:translate-x-0.5 transition" /></div>
        </button>
        </>}
        <div className="min-w-0">
          {!promoDismissed && (
            <div className={`${CARD} p-5 relative flex flex-col gap-2.5`} data-home-card>
              <button aria-label={t("Dismiss offer")} onClick={() => setPromoDismissed(true)} className="absolute top-3 right-3 w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-navy-900 hover:bg-white/50 transition"><Icon.x size={14} /></button>
              <div className="flex items-center gap-3 pr-7">
                <span className="w-10 h-10 rounded-xl grid place-items-center bg-gradient-to-br from-gold-400 to-gold-600 text-white shrink-0 shadow-sm"><Icon.bolt size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-navy-900 text-[15px] leading-tight"><b>{t("20% off")}</b> {t("front-row sunbeds")}</div>
                  <div className="text-[12.5px] text-slate-600 mt-0.5 leading-snug">{t("This weekend only · gates open 09:00–20:00")}</div>
                </div>
                <NotMvpBadge className="ml-auto self-start" />
              </div>
              <button onClick={() => dive()} className="self-start text-[13px] font-semibold text-teal-700 hover:text-teal-800 rounded-lg px-3 py-1.5 hover:bg-white/50 transition -ml-3">{t("Book this weekend")} →</button>
            </div>
          )}
        </div>

      </div>

      <RewardsStrip rewards={rewards} ready={ready} />

      {/* Demo scene controls (time-of-day + weather), bottom-left — the
          counterpart to the persona switcher's demo pill on the right. */}
      <SceneDemoPanel />
    </div>
  );
}

/* The next visit, first thing on Home (AENR-567): countdown, zone and sets,
   the day's weather, the QR in one tap and directions to the entrance. */
function NextVisitCard({ v, qrFirst = false }: { v: Visit; qrFirst?: boolean }) {
  const { go, weather } = useApp();
  const t = useT();
  const [qr, setQr] = useState(false);
  const today = todayISO();
  const days = Math.round((Date.parse(v.date) - Date.parse(today)) / 86400000);
  const fc = forecastFor(v.date, today, weather);
  const W = Icon[WEATHER_DEMO[fc.kind].icon] ?? Icon.sun;
  const extras = [...v.tickets.map((x) => `${t("Entry")} ${x}`), ...v.parking.map((x) => `${t("Parking")} ${x}`), ...v.lockers.map((x) => `${t("Locker")} ${x}`)];
  return (
    <section aria-labelledby="next-visit" className={`${CARD} p-5 sm:p-7`} data-home-card>
      <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
            <Icon.calendar size={13} /> {days <= 0 ? (qrFirst ? `${t("Today")} · ${t("arrive by")} ${ARRIVAL_ENDS}` : t("Today")) : days === 1 ? t("Tomorrow") : `${t("In")} ${days} ${t("days")}`}
          </div>
          <h2 id="next-visit" className="mt-1.5 font-display font-bold text-[26px] sm:text-[32px] leading-tight text-navy-900">
            {fmtWeekday(v.date)} {fmtDay(v.date)}{v.zone ? ` · ${v.zone}` : ""}
          </h2>
          <p className="mt-1 text-[14px] text-slate-700">
            {v.sets.length ? `${t("Sunbeds")} ${v.sets.join(", ")}` : t("Entry tickets")}
            {extras.length ? ` · ${extras.join(" · ")}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-slate-700">
            <span className="inline-flex items-center gap-1.5"><W size={16} className="text-teal-700" /> {t(WEATHER_DEMO[fc.kind].label)} · {fc.tempC}°C</span>
            <span className="inline-flex items-center gap-1.5"><Icon.clock size={15} className="text-teal-700" /> {t("Arrive")} {ARRIVAL_WINDOW}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn variant="primary" icon={Icon.qr} onClick={() => setQr(true)}>{t("Show QR")}</Btn>
            <WalletButtons compact pass={visitPass(v)} />
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${TENANT.name} ${TENANT.place}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[14px] px-4 min-h-[44px] text-sm font-semibold ring-1 ring-slate-200 bg-white/80 text-navy-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Icon.map size={16} /> {t("Directions")}
              <span className="sr-only">({t("opens in a new tab")})</span>
            </a>
            <Btn variant="ghost" onClick={() => go("customer", "mybookings")}>{t("Manage booking")}</Btn>
          </div>
        </div>
        {/* The morning of the visit the QR leads, also on phones. */}
        <button type="button" onClick={() => setQr(true)} aria-label={`${t("Show QR")} ${v.refs[0]}`} className={`${qrFirst ? "order-first sm:order-none" : ""} self-center shrink-0 rounded-2xl bg-white p-2.5 ring-1 ring-slate-200 shadow-soft hover:shadow-lift transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500`}>
          <QR size={qrFirst ? 168 : 132} seed={v.refs[0]} />
          <span className="block mt-1 font-mono text-[12px] font-semibold text-navy-900">{v.refs[0]}</span>
        </button>
      </div>
      {qr && <VisitQR v={v} onClose={() => setQr(false)} />}
    </section>
  );
}

/* At the beach (AENR-610): the day is on — extras first, the QR one tap away for re-entry. */
function AtBeachCard({ v }: { v: Visit }) {
  const { go } = useApp();
  const t = useT();
  const [qr, setQr] = useState(false);
  const [extras, setExtras] = useState(false);
  const has = [...v.parking.map((x) => `${t("Parking")} ${x}`), ...v.lockers.map((x) => `${t("Locker")} ${x}`)];
  return (
    <section aria-labelledby="at-beach" className={`${CARD} p-5 sm:p-7`} data-home-card>
      <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700"><Icon.umbrella size={13} /> {t("You're at the beach")}{v.zone ? ` · ${v.zone}` : ""}</div>
      <h2 id="at-beach" className="mt-1.5 font-display font-bold text-[26px] sm:text-[32px] leading-tight text-navy-900">{t("Enjoy your day")}</h2>
      <p className="mt-1 text-[14px] text-slate-700">
        {v.sets.length ? `${t("Sunbeds")} ${v.sets.join(", ")}` : t("Entry tickets")}{has.length ? ` · ${has.join(" · ")}` : ""}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Btn variant="primary" icon={Icon.plus} onClick={() => setExtras(true)}>{t("Add a locker or parking")}</Btn>
        <Btn variant="outline" icon={Icon.qr} onClick={() => setQr(true)}>{t("Show QR")}</Btn>
        <Btn variant="ghost" onClick={() => go("customer", "mybookings")}>{t("Manage booking")}</Btn>
      </div>
      {extras && <ExtrasDialog v={v} only="extras" onClose={() => setExtras(false)} />}
      {qr && <VisitQR v={v} onClose={() => setQr(false)} />}
    </section>
  );
}

/* After the visit (AENR-610): the receipt and the same day again, one tap each. */
function AfterVisitCard({ v, mine }: { v: Visit; mine: UsualBooking | null }) {
  const { go, dive } = useApp();
  const t = useT();
  const [doc, setDoc] = useState(false);
  const today = v.date === todayISO();
  return (
    <section aria-labelledby="after-visit" className={`${CARD} p-5 sm:p-7`} data-home-card>
      <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700"><Icon.checkCircle size={13} /> {t("Thanks for coming")}</div>
      <h2 id="after-visit" className="mt-1.5 font-display font-bold text-[26px] sm:text-[32px] leading-tight text-navy-900">{today ? t("How was today?") : `${t("How was")} ${fmtWeekday(v.date)}?`}</h2>
      <p className="mt-1 text-[14px] text-slate-700">
        {fmtWeekday(v.date)} {fmtDay(v.date)}{v.zone ? ` · ${v.zone}` : ""} · €{v.total} {t("paid")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Btn variant="primary" icon={Icon.refresh} onClick={() => (mine ? go("customer", "plan", { rebook: mine }) : dive())}>{t("Book again")}</Btn>
        <Btn variant="outline" icon={Icon.receipt} onClick={() => setDoc(true)}>{t("Receipt")}</Btn>
      </div>
      {doc && <ReceiptModal doc={receiptForVisit(v)} onClose={() => setDoc(false)} />}
    </section>
  );
}

/* Off-season (AENR-610): when the beach opens again, and a reminder. */
function OffSeasonCard({ opens }: { opens: string }) {
  const { toast } = useApp();
  const t = useT();
  const [asked, setAsked] = useState(false);
  return (
    <section aria-labelledby="off-season" className={`${CARD} p-5 sm:p-7`} data-home-card>
      <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700"><Icon.sun size={13} /> {t("See you next summer")}</div>
      <h2 id="off-season" className="mt-1.5 font-display font-bold text-[26px] sm:text-[32px] leading-tight text-navy-900">{t("The beach opens on")} {fmtWeekday(opens)} {fmtDay(opens)} {opens.slice(0, 4)}</h2>
      <p className="mt-1 text-[14px] text-slate-700">{t("Bookings for the new season open a few weeks before. We can tell you the day they do.")}</p>
      <div className="mt-4">
        <Btn variant="primary" icon={asked ? Icon.check : Icon.bell} disabled={asked} onClick={() => { setAsked(true); toast(t("We'll e-mail you when bookings open."), { tone: "success" }); }}>{asked ? t("We'll let you know") : t("Remind me")}</Btn>
      </div>
    </section>
  );
}

/* One rewards strip (AENR-577): progress to the next reward; everything else is in Wallet. */
function RewardsStrip({ rewards, ready }: { rewards: ReturnType<typeof activeRewards>; ready: number }) {
  const { go } = useApp();
  const t = useT();
  const top = rewards.find((r) => r.state.kind === "progress") ?? rewards[0];
  if (!top) return null;
  const st = top.state;
  const pct = st.kind === "progress" ? Math.min(100, Math.round((st.current / st.target) * 100)) : 100;
  return (
    <button type="button" onClick={() => go("customer", "wallet")} className={`${CARD} px-5 py-4 text-left flex flex-wrap items-center gap-x-4 gap-y-2 hover:bg-white/80 transition-colors group`} data-home-card>
      <span className="w-9 h-9 rounded-xl grid place-items-center bg-teal-600 text-white shrink-0"><Icon.gift size={17} /></span>
      <span className="min-w-0 flex-1 basis-[12rem]">
        <span className="flex flex-wrap items-center gap-2 font-semibold text-navy-900 text-[14px]">
          {st.kind === "progress" ? `${st.current}/${st.target} ${t(st.unit)} ${t("to")} ${st.reward}` : `${t(top.title)} · ${st.reward}`}
          {/* Loyalty rewards are a roadmap feature (AENR-679). */}
          <NotMvpBadge />
        </span>
        <span className="mt-1.5 block h-1.5 rounded-full bg-slate-200 overflow-hidden max-w-md" aria-hidden>
          <span className="block h-full rounded-full bg-gradient-to-r from-navy-700 to-teal-500" style={{ width: `${pct}%` }} />
        </span>
      </span>
      {ready > 0 && <Badge tone="green">{ready} {t("ready · applied for you")}</Badge>}
      <span className="text-[13px] font-semibold text-teal-700 inline-flex items-center gap-1">{t("Wallet")} <Icon.chevR size={14} className="group-hover:translate-x-0.5 transition" /></span>
    </button>
  );
}

/* VIP credit tile — the tenant membership card art + a buy/top-up footer.
   Tilts in 3D toward the cursor with a light sweep across the card art
   (useCardTilt owns the transform, so hover lift is shadow-only here). */
export function VipTile() {
  const { go, passes, passPricing, clearPass } = useApp();
  const me = useGuestRecord();
  const t = useT();
  const tilt = useCardTilt<HTMLDivElement>(6);
  const vip = passes.vip;
  const from = Math.min(...passPricing.vipTiers);
  const disc = Math.round(passPricing.vipDiscount * 100);
  return (
    <div ref={tilt} className={`${CARD} flex flex-col w-full transition-shadow duration-300 hover:shadow-lift`} data-home-card>
      <span aria-hidden="true" className="sheen-card" />
      <button onClick={() => go("customer", "vip")} aria-label={`${vip ? t("Top up VIP credit") : t("Get VIP Pass")} · ${t("FUTURE")}`} className="block w-full group">
        <PassCard kind="vip" holder={me.cardName} subtitle={vip ? `€${vip.balance.toLocaleString()} CREDIT` : `MEMBER · ${disc}% OFF`} validUntil={SEASON_END_LABEL} className="group-hover:brightness-[1.02] transition" />
      </button>
      <div className="mt-auto flex items-center justify-between gap-2 px-4 py-3">
        <button onClick={() => go("customer", "vip")} className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-800 text-[13px] font-semibold">
          {t("Get VIP pass")} — {t("from")} €{from.toLocaleString()} <Icon.chevR size={14} />
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {vip && <button onClick={() => clearPass("vip")} className="text-[11px] text-slate-400 hover:text-rose-600">{t("Reset")}</button>}
          <NotMvpBadge />
        </div>
      </div>
    </div>
  );
}

/* Season pass tile — the tenant membership card art + a buy/manage footer.
   Same 3D tilt + light sweep as the VIP tile. */
export function SeasonTile() {
  const { go, passes, passPricing, clearPass } = useApp();
  const me = useGuestRecord();
  const t = useT();
  const tilt = useCardTilt<HTMLDivElement>(6);
  const season = passes.season;
  const from = Math.min(passPricing.seasonMonthly, passPricing.seasonSummer);
  return (
    <div ref={tilt} className={`${CARD} flex flex-col w-full transition-shadow duration-300 hover:shadow-lift`} data-home-card>
      <span aria-hidden="true" className="sheen-card" />
      <button onClick={() => go("customer", "season")} aria-label={`${season ? t("Manage Season pass") : t("Get Season Pass")} · ${t("FUTURE")}`} className="block w-full group">
        <PassCard kind="season" holder={me.cardName} subtitle={season && season.plan === "monthly" ? "MONTHLY 2026" : "SUMMER 2026"} validUntil={season ? dateOf(season.validUntil) : SEASON_END_LABEL} className="group-hover:brightness-[1.02] transition" />
      </button>
      <div className="mt-auto flex items-center justify-between gap-2 px-4 py-3">
        <button onClick={() => go("customer", "season")} className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 text-[13px] font-semibold">
          {season ? t("Manage pass") : `${t("Get Season pass")} — ${t("from")} €${from.toLocaleString()}`} <Icon.chevR size={14} />
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {season && <button onClick={() => clearPass("season")} className="text-[11px] text-slate-400 hover:text-rose-600">{t("Reset")}</button>}
          <NotMvpBadge />
        </div>
      </div>
    </div>
  );
}

/* "Your badges" — gamification achievements; earned ones light up (summer
   gradients), locked ones dim with progress. Sits exactly under Rebook, same size. */
export function BadgesTile() {
  const { achievements } = useApp();
  const t = useT();
  if (achievements.length === 0) return null;
  const stats = HOME_GAME_STATS;
  const earnedCount = achievements.filter((a) => statValue(stats, a.metric) >= a.threshold).length;
  return (
    <div className={`${CARD} p-5 flex flex-col gap-3`} data-home-card>
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br from-amber-300 to-amber-500 text-white shrink-0 shadow-sm"><Icon.star size={17} /></span>
        <div className="font-semibold text-navy-900 text-[15px] flex-1 min-w-0">{t("Your badges")}</div>
        <Badge tone="amber">{earnedCount}/{achievements.length}</Badge>
        <NotMvpBadge />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-2.5">
        {achievements.map((a) => {
          const Glyph = Icon[a.icon] || Icon.star;
          const v = statValue(stats, a.metric);
          const earned = v >= a.threshold;
          return (
            <div key={a.id} title={earned ? `${a.name} — ${t("earned!")}` : `${a.name} — ${metricFmt(a.metric, v)} / ${metricFmt(a.metric, a.threshold)}`} className="flex flex-col items-center gap-1 w-[3.4rem]">
              <span className={`relative w-11 h-11 rounded-full grid place-items-center ring-2 ring-white shadow-sm transition ${earned ? `text-white bg-gradient-to-br ${BADGE_COLORS[a.color] || BADGE_COLORS.sun}` : "bg-slate-200/80 text-slate-400"}`}>
                <Glyph size={18} />
                {!earned && <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white ring-1 ring-slate-200 grid place-items-center"><Icon.lock size={8} className="text-slate-400" /></span>}
              </span>
              <span className={`text-[9px] text-center leading-tight w-full truncate ${earned ? "text-navy-900 font-semibold" : "text-slate-400"}`}>{a.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Splits a (translated) phrase into per-word spans the entrance timeline can
   stagger. NBSP inside each span keeps the natural word gap while the words
   rise independently; static rendering is identical to plain text. */
function KineticWords({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block" data-hero-word>
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

/* Active loyalty schemes for the guest, sorted (claimable first). Schemes + config
   come from the app store (written by the admin Loyalty screen). */
const REWARD_ORDER = { claim: 0, progress: 1, perk: 2 } as const;
export function activeRewards(loyalty: LoyaltyState) {
  return [...BUILTIN_SCHEMES, ...loyalty.customIds.map(makeCustomScheme)]
    .filter((s) => loyalty.config[s.id]?.enabled)
    .map((s) => {
      const values = loyalty.config[s.id]?.values ?? {};
      const title = s.custom ? String(values.title || s.title) : s.title;
      return { id: s.id, icon: s.icon, title, state: schemeProgress(s, values, HOME_LOYALTY_STATS) };
    })
    .sort((a, b) => REWARD_ORDER[a.state.kind] - REWARD_ORDER[b.state.kind]);
}

/* One reward as a compact row inside the tall "Your rewards" tile. */
export function RewardRow({ icon, title, state, used = false }: { icon: IconRenderer; title: string; state: RewardState; used?: boolean }) {
  const { dive } = useApp();
  const t = useT();
  const SIcon = icon;
  const claim = state.kind === "claim" && !used;
  return (
    <div className={`rounded-xl p-3 ring-1 transition ${claim ? "ring-teal-300 bg-teal-50/60" : "ring-slate-200 bg-white/60"}`}>
      <div className="flex items-center gap-2.5">
        <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${claim ? "bg-teal-600 text-white" : "bg-sky-50 text-sky-800"}`}><SIcon size={15} /></span>
        <div className="font-semibold text-navy-900 text-[13.5px] flex-1 min-w-0 truncate">{t(title)}</div>
        {claim && <Badge tone="green"><Icon.checkCircle size={10} /> {t("Ready")}</Badge>}
        {used && <Badge tone="neutral">{t("Used")}</Badge>}
      </div>
      <div className="text-[12.5px] text-navy-900 mt-1.5 leading-snug">{state.reward}</div>
      {state.kind === "progress" && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 gap-2">
            <span className="tnum shrink-0">{state.current}/{state.target} {t(state.unit)}</span>
            {state.note && <span className="truncate">{state.note}</span>}
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-navy-700 to-teal-500" style={{ width: `${Math.min(100, Math.round((state.current / state.target) * 100))}%` }} /></div>
        </div>
      )}
      {/* Nothing to claim (AENR-619): discounts come off at checkout, treats ride on the visit's QR. */}
      {claim && (
        <div className="mt-2 text-[11.5px] text-teal-800 leading-snug">
          {appliesAtCheckout(state.reward) ? t("Comes off your next booking automatically.") : t("On your next visit's QR — just ask at the bar.")}
          {state.note && <span className="block text-slate-500">{state.note}</span>}
        </div>
      )}
      {state.kind === "perk" && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {state.note && <span className="text-[11px] text-slate-500 truncate">{state.note}</span>}
          <button onClick={() => dive()} className="text-[12px] font-semibold text-teal-700 hover:text-teal-800 shrink-0 inline-flex items-center gap-1">{t("Use it")} <Icon.chevR size={13} /></button>
        </div>
      )}
    </div>
  );
}
