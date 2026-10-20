import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { Badge, Btn, EmptyState, ErrorState, NotMvpBadge, Skeleton } from "../../components/ui";
import { QR } from "../../components/charts";
import { qrCode } from "../../domain/entry";
import { useApp, useMoney, useT } from "../../app/store";
import { TENANT, ZONES, todayISO, zoneLayout } from "../../data/beach";
import { SEASON_ZONE, seasonSetIn } from "../../data/passes";
import { layoutFor } from "../../domain/layoutVersions";
import { resolvePrice } from "../../domain/pricing";
import { addDays, fmtDay, fmtWeekday } from "../../domain/period";
import { ARRIVAL_WINDOW, fmtDeadline, releaseDeadline, type Visit } from "../../domain/visits";
import { guestNow, useVisits } from "../../lib/useVisits";
import { useDemoFlag } from "../../lib/useDemoFlag";
import { BadgeGrid, FIRST_TIME_LOYALTY, RewardRow, SeasonTile, VipTile, activeRewards, useBadges } from "./CustomerHome";
import { VisitQR, visitPass } from "./VisitTicket";
import { WalletRow } from "../../components/WalletPass";
import { useTenantFeatures } from "../../lib/useFeatures";

/* ============ Wallet (AENR-577 / 578, order AENR-686, layout AENR-780) ============
   Everything the guest holds, under the top nav, in the order they need it:
     1. upcoming entries — one pass per visit with its gate QR, the page's hero,
     2. the passes they own (VIP credit / Season) and, for season holders, "Release my day",
     3. their beach credit, beside the passes they could buy (slim offers, never a card
        with their name and a QR),
     4. rewards, then badges (roadmap features, marked FUTURE).
   Every section is one translucent panel with the same heading (WalletSection), on one
   rhythm: 24px between panels, 16px / 24px inside, 16px under the heading. Every panel,
   the entries tile included, spans the same column (owner: AENR-812, replacing AENR-794's
   menu-bar width) — on a computer two passes side by side, credit beside the offers,
   rewards in two columns, so it never reads as a stretched phone column; the ticket stays
   centred at its own width inside its tile. A first-time guest gets each section's guided
   empty state; passes they don't own collapse into the offers. */

/** Entries shown on the Wallet; the rest live in My bookings. */
const ENTRY_LIMIT = 4;

/* One section of the Wallet: a translucent panel with the Wallet's one heading style
   (icon + title, then any count / FUTURE badges). */
function WalletSection({
  id,
  icon: I,
  title,
  children,
  busy,
}: {
  id: string;
  icon: IconRenderer;
  title: ReactNode;
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <section
      aria-labelledby={id}
      aria-busy={busy}
      className="glass-flat rounded-3xl p-4 sm:p-6 mx-auto w-full"
    >
      <h2 id={id} className="mb-4 flex flex-wrap items-center gap-2 font-display font-bold text-navy-900">
        <I size={17} className="text-teal-700" /> {title}
      </h2>
      {children}
    </section>
  );
}

export function CustomerWallet() {
  const money = useMoney();
  const { loyalty, go, account, passes, passPricing } = useApp();
  const t = useT();
  const [firstTimer] = useDemoFlag("newGuest");
  const rewards = activeRewards(loyalty, firstTimer ? FIRST_TIME_LOYALTY : undefined);
  const ready = rewards.filter((a) => a.state.kind === "claim").length;
  const badges = useBadges();
  // VIP / Season passes and rewards are roadmap features (AENR-691); rewards need Loyalty too (AENR-696).
  // With previews off the Wallet holds only what works today: entries and credit.
  const { roadmap, allows } = useTenantFeatures();
  const showRewards = allows({ future: true, module: "Loyalty" });
  const owned = roadmap ? [passes.vip && "vip", passes.season && "season"].filter(Boolean) : [];
  const offers = roadmap && owned.length < 2;
  return (
    <div className="animate-fade-up w-full max-w-4xl mx-auto space-y-6">
      <h1 className="sr-only">{t("Wallet")}</h1>

      <UpcomingEntries />

      {owned.length > 0 && (
        <WalletSection
          id="wallet-passes"
          icon={Icon.wallet}
          title={t("Your passes")}
        >
          <div className={`grid gap-4 ${owned.length > 1 ? "sm:grid-cols-2" : "max-w-[26rem] mx-auto"}`}>
            {owned.includes("vip") && <VipTile />}
            {owned.includes("season") && <SeasonTile />}
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-guest-meta text-slate-700">
            <Icon.qr size={13} className="shrink-0 text-teal-700" />
            {t("Each pass card carries your gate QR — show it at the entrance.")}
          </p>
        </WalletSection>
      )}

      {owned.includes("season") && <ReleaseMyDay />}

      {/* Money: the credit they hold, and beside it on a computer the passes they could buy. */}
      <div className={offers ? "grid gap-6 md:grid-cols-2" : ""}>
        <BeachCredit wide={roadmap && !offers} />
        {offers && (
          <WalletSection id="wallet-offers" icon={Icon.sparkles} title={t("Passes you can get")}>
            <div className="grid gap-3">
              {!passes.vip && (
                <PassOffer
                  tone="vip"
                  title={`${t("Become VIP")} — ${Math.round(passPricing.vipDiscount * 100)}% ${t("off every visit")}`}
                  sub={`${t("from")} ${money(Math.min(...passPricing.vipTiers))} ${t("of credit")}`}
                  onClick={() => go("customer", "vip")}
                />
              )}
              {!passes.season && (
                <PassOffer
                  tone="season"
                  title={`${t("Season pass")} — ${t("your own set all summer")}`}
                  sub={`${t("from")} ${money(Math.min(passPricing.seasonMonthly, passPricing.seasonSummer))}`}
                  onClick={() => go("customer", "season")}
                />
              )}
            </div>
          </WalletSection>
        )}
      </div>

      {showRewards && (
        <WalletSection
          id="wallet-rewards"
          icon={Icon.gift}
          title={
            <>
              {t("Rewards")}
              {/* Loyalty rewards are a roadmap feature (AENR-679 / 686). */}
              <NotMvpBadge />
              {ready > 0 && (
                <Badge tone="green">
                  {ready} {t("ready")}
                </Badge>
              )}
            </>
          }
        >
          {rewards.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {rewards.map((a, i) => (
                // An odd count lets the first (usually the tier) span the row — no orphan tile.
                <div key={a.id} className={rewards.length % 2 && i === 0 ? "md:col-span-2" : ""}>
                  <RewardRow
                    icon={a.icon}
                    title={a.title}
                    state={a.state}
                    used={a.id !== "tiers" && (account.rewardsUsed ?? []).includes(a.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={Icon.gift}
              title={t("No rewards running")}
              body={t("Your beach hasn’t started a rewards scheme yet.")}
              action={
                <Btn variant="teal" icon={Icon.sparkles} onClick={() => go("customer", "plan")}>
                  {t("Plan a visit")}
                </Btn>
              }
            />
          )}
        </WalletSection>
      )}

      {badges && (
        <WalletSection
          id="wallet-badges"
          icon={Icon.star}
          title={
            <>
              {t("Your badges")}
              <Badge tone="amber">
                {badges.earned}/{badges.achievements.length}
              </Badge>
              <NotMvpBadge />
            </>
          }
        >
          <BadgeGrid badges={badges} />
        </WalletSection>
      )}
    </div>
  );
}

/* Beach credit: the balance (used at checkout by itself) and its latest movements. With
   nothing yet the panel keeps its shape — the €0.00 balance, and where credit comes from.
   `wide` (the full column to itself): the balance beside the movements from tablet up. */
function BeachCredit({ wide = false }: { wide?: boolean }) {
  const money = useMoney();
  const { account } = useApp();
  const t = useT();
  const log = account.credit.log;
  return (
    <WalletSection id="wallet-credit" icon={Icon.cash} title={t("Beach credit")}>
      <div className={wide ? "md:flex md:items-start md:gap-6" : ""}>
        <div
          className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 ${wide ? "md:block md:w-56 md:shrink-0" : ""}`}
        >
          <div className="font-display font-bold text-3xl text-navy-900 tnum">
            {money(account.credit.balance, true)}
          </div>
          <div className="text-guest-meta text-slate-600">{t("Used automatically at checkout.")}</div>
        </div>
        {log.length > 0 ? (
          <ul
            className={`mt-4 divide-y divide-slate-200/70 border-t border-slate-200/70 text-guest-meta ${wide ? "md:-mt-2 md:min-w-0 md:flex-1 md:border-t-0" : ""}`}
          >
            {log.slice(0, 5).map((e, i) => (
              <li key={i} className="py-2 flex justify-between gap-3">
                <span className="text-slate-700 min-w-0">
                  {e.text} <span className="text-slate-500">· {fmtDay(e.at.slice(0, 10))}</span>
                </span>
                <span
                  className={`tnum font-semibold shrink-0 ${e.amount >= 0 ? "text-emerald-700" : "text-navy-900"}`}
                >
                  {e.amount >= 0 ? "+" : "−"}{money(Math.abs(e.amount), true)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p
            className={`mt-4 flex items-start gap-2 rounded-2xl bg-white/60 ring-1 ring-slate-200 px-3 py-2.5 text-guest-meta text-slate-700 ${wide ? "md:mt-0 md:min-w-0 md:flex-1" : ""}`}
          >
            <Icon.info size={15} className="mt-0.5 shrink-0 text-teal-700" />
            {t("Nothing here yet. Take a refund as beach credit and it lands here — it comes off your next booking by itself.")}
          </p>
        )}
      </div>
    </WalletSection>
  );
}

/* Upcoming entries (AENR-686): every visit still ahead (today included, cancelled ones
   left out) as a ticket with its gate QR — tap to enlarge (modal on desktop, white full
   screen on phones, the same VisitQR as Home). */
function UpcomingEntries() {
  const { go } = useApp();
  const t = useT();
  const { status, refetch, visits } = useVisits();
  const [open, setOpen] = useState<Visit | null>(null);
  const ahead = visits.filter((v) => v.status === "today" || v.status === "upcoming");
  const shown = ahead.slice(0, ENTRY_LIMIT);
  // One translucent tile, as wide as the sections below it (owner, AENR-812); managing a visit
  // stays in My bookings, a tab away — so no separate link here.
  return (
    <WalletSection
      id="wallet-entries"
      icon={Icon.ticket}
      busy={status === "loading"}
      title={
        <>
          {t("Upcoming entries")}
          {ahead.length > 0 && <Badge tone="info">{ahead.length}</Badge>}
        </>
      }
    >
      {status === "loading" ? (
        <Skeleton className="h-[164px] !rounded-3xl max-w-md mx-auto" />
      ) : status === "error" ? (
        <ErrorState compact body={t("We couldn't load your bookings.")} onRetry={refetch} />
      ) : shown.length === 0 ? (
        // A guest who has never booked is told what this place is for; a returning one, what to do next.
        <EmptyState
          compact
          icon={Icon.ticket}
          title={visits.length === 0 ? t("Your beach days will be here") : t("No upcoming visits")}
          body={
            visits.length === 0
              ? t("Book a sunbed or an entry ticket — its gate QR lands here, ready to scan, and you can add it to Apple or Google Wallet.")
              : t("Book a day at the beach — its entry QR will be here, ready for the gate.")
          }
          action={
            <Btn variant="teal" icon={Icon.sparkles} onClick={() => go("customer", "plan")}>
              {t("Plan a visit")}
            </Btn>
          }
        />
      ) : (
        <PassStack visits={shown} onShow={setOpen} />
      )}
      {open && <VisitQR v={open} onClose={() => setOpen(null)} />}
    </WalletSection>
  );
}

/* ============ Pass stack (AENR-759) ============
   Upcoming entries as a stack of pass cards, like a phone wallet: the next one
   is open with its gate QR; later ones show only their top strip, tucked under
   the card above. Tapping a strip opens that pass and tucks the other away.
   It's a list of disclosure buttons, so keyboard and screen readers get the
   same: each strip says which visit it is and whether it is open. The open pass
   can go into Apple / Google Wallet from its footer (AENR-779); managing a visit
   (move, extras, cancel, receipts) stays in My bookings. */
function PassStack({ visits, onShow }: { visits: Visit[]; onShow: (v: Visit) => void }) {
  const [openKey, setOpenKey] = useState(visits[0]?.key);
  const open = visits.some((v) => v.key === openKey) ? openKey : visits[0]?.key;
  return (
    <ul className="max-w-md mx-auto">
      {visits.map((v, i) => (
        <li key={v.key} className={i > 0 ? "-mt-4" : undefined} style={{ position: "relative", zIndex: i + 1 }}>
          <PassCard v={v} open={v.key === open} onToggle={() => setOpenKey(v.key)} onShow={() => onShow(v)} />
        </li>
      ))}
    </ul>
  );
}

function PassCard({ v, open, onToggle, onShow }: { v: Visit; open: boolean; onToggle: () => void; onShow: () => void }) {
  const t = useT();
  const { go } = useApp();
  const days = Math.round((Date.parse(v.date) - Date.parse(todayISO())) / 86400000);
  const when = days <= 0 ? t("Today") : days === 1 ? t("Tomorrow") : `${t("In")} ${days} ${t("days")}`;
  const zone = ZONES.find((z) => z.name === v.zone);
  const extras = [
    ...v.tickets.map((x) => `${t("Entry")} ${x}`),
    ...v.parking.map((x) => `${t("Parking")} ${x}`),
    ...v.lockers.map((x) => `${t("Locker")} ${x}`),
  ];
  const bodyId = `pass-${v.key}`;
  return (
    <article
      className="rounded-3xl overflow-hidden text-white shadow-[0_-6px_18px_-10px_rgba(11,37,69,0.45),0_18px_36px_-22px_rgba(11,37,69,0.6)]"
      style={{ background: `linear-gradient(150deg, #0B2545 0%, #13315c 55%, ${zone?.color ?? "#0A8276"} 160%)` }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="w-full flex items-center gap-3 px-5 pt-4 pb-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80"
      >
        <img src={`${import.meta.env.BASE_URL}tenant-logo-mark.png`} alt="" className="h-8 w-auto shrink-0" />
        <span className="min-w-0 flex-1">
          <span className={`block text-guest-over font-semibold uppercase tracking-[0.14em] ${days <= 0 ? "text-gold-300" : "text-teal-300"}`}>{when}</span>
          <span className="block font-display font-bold text-guest-head leading-tight truncate">
            {fmtWeekday(v.date)} {fmtDay(v.date)} · {v.zone || TENANT.name}
          </span>
        </span>
        <span className="font-mono text-guest-caption text-white/70 shrink-0">{v.refs[0]}</span>
      </button>
      {/* Opens and closes by height (grid 0fr ↔ 1fr), on the motion tokens. */}
      <div id={bodyId} className={`grid transition-[grid-template-rows] duration-base ease-ios ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden" aria-hidden={!open} ref={(el) => { if (el) el.inert = !open; }}>
          <div className="px-5 pb-5 grid gap-4">
            <div className="text-guest-meta text-white/85">
              {v.sets.length ? `${t("Sunbeds")} ${v.sets.join(", ")}` : t("Entry tickets")}
              {extras.length > 0 && <span className="block mt-1 text-white/70">{extras.join(" · ")}</span>}
              <span className="mt-1.5 flex items-center gap-1.5 text-white/85"><Icon.clock size={13} /> {t("Arrive")} {ARRIVAL_WINDOW}</span>
            </div>
            <button
              type="button"
              onClick={onShow}
              data-wallet-qr
              aria-label={`${t("Show QR")} ${v.refs[0]}`}
              className="group justify-self-center rounded-2xl bg-white p-3 text-navy-900 shadow-lift active:scale-[.98] transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
            >
              <QR size={148} seed={qrCode(v.refs[0])} />
              <span className="mt-1.5 flex items-center justify-center gap-1 text-guest-caption font-semibold text-teal-700">
                <Icon.qr size={12} /> {t("Tap to enlarge")}
              </span>
            </button>
            {/* Add this visit's pass to the phone's wallet (AENR-779): a quiet footer under the QR. */}
            <WalletRow pass={visitPass(v)} className="border-t border-white/10 pt-4" />
            <button
              type="button"
              onClick={() => go("customer", "mybookings")}
              className="justify-self-center inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-guest-meta font-semibold text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              {t("Change or cancel in My bookings")} <Icon.chevR size={13} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* Release my day (AENR-578): the season set goes back on sale for a day the
   holder won't use; when it sells again they earn credit. */
function ReleaseMyDay() {
  const money = useMoney();
  const { account, setAccount, toast, beachLayout, layouts, beachPricing, priceRules, extras } =
    useApp();
  const t = useT();
  const policy = extras.policy;
  const zone = ZONES.find((z) => z.id === SEASON_ZONE) ?? ZONES[0];
  const today = todayISO();
  const setId = seasonSetIn(
    layoutFor(zone, today, beachLayout, layouts.versions, today, zoneLayout),
  );
  if (!setId) return null;
  const slot = (beachLayout[zone.id] ?? zoneLayout(zone)).find((s) => s.id === setId) ?? {
    id: setId,
    price: zone.from,
  };
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const now = guestNow();
  const release = (date: string) => {
    const price = resolvePrice(slot, zone.id, date, beachPricing, priceRules).price;
    setAccount((a) => ({
      ...a,
      released: [...a.released, { date, setId, zoneId: zone.id, price, at: now }],
    }));
    toast(
      `${setId} ${t("is on sale for")} ${fmtWeekday(date)} ${fmtDay(date)} — ${t("you earn")} ${policy.releaseCreditPct}% ${t("if it sells.")}`,
      { tone: "success" },
    );
  };
  const resell = (date: string) =>
    setAccount((a) => {
      const r = a.released.find((x) => x.date === date && x.setId === setId);
      if (!r || r.resold) return a;
      const credit = Math.round(r.price * policy.releaseCreditPct) / 100;
      return {
        ...a,
        released: a.released.map((x) => (x === r ? { ...x, resold: { at: now, credit } } : x)),
        credit: {
          balance: Math.round((a.credit.balance + credit) * 100) / 100,
          log: [
            { at: now, text: `${setId} resold · ${fmtDay(date)}`, amount: credit },
            ...a.credit.log,
          ],
        },
      };
    });
  return (
    <WalletSection
      id="wallet-release"
      icon={Icon.umbrella}
      title={`${t("Your season set")} · ${zone.name} ${setId}`}
    >
      <p className="text-guest-meta text-slate-700 mb-4">
        {t(
          "Not coming one day? Release it and the set goes on sale for that day. When it sells, you get",
        )}{" "}
        <b>{policy.releaseCreditPct}%</b> {t("of the price as beach credit. Release until")}{" "}
        {policy.releaseHours} {t("hours before the beach opens.")}
      </p>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {days.map((d) => {
          const r = account.released.find((x) => x.date === d && x.setId === setId);
          const deadline = releaseDeadline(d, policy);
          const open = now < deadline;
          return (
            <li
              key={d}
              className="rounded-xl bg-white/80 ring-1 ring-slate-200 px-3 py-2.5 flex items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-navy-900 text-guest-meta">
                  {fmtWeekday(d)} {fmtDay(d)}
                </div>
                <div className="text-guest-caption text-slate-600">
                  {r?.resold
                    ? `${t("Resold")} · +${money(r.resold.credit, true)} ${t("credit")}`
                    : r
                      ? t("Released — on sale")
                      : open
                        ? `${t("Reserved for you")} · ${t("release by")} ${fmtDeadline(deadline)}`
                        : t("Reserved for you")}
                </div>
              </div>
              {!r && open && (
                <Btn size="sm" variant="outline" onClick={() => release(d)}>
                  {t("Release")}
                </Btn>
              )}
              {r && !r.resold && (
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => resell(d)}
                  title={t("Demo — another guest books the set")}
                >
                  {t("Simulate sale")}
                </Btn>
              )}
              {r?.resold && <Icon.checkCircle size={18} className="text-emerald-600" />}
            </li>
          );
        })}
      </ul>
    </WalletSection>
  );
}

/* A pass the guest doesn't hold yet, as an offer row (AENR-648) — no name, number or QR. */
function PassOffer({
  tone,
  title,
  sub,
  onClick,
}: {
  tone: "vip" | "season";
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl glass-card-solid ring-1 ring-slate-200 px-3.5 py-3 text-left hover:ring-teal-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
    >
      <span
        className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 text-white ${tone === "vip" ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-sky-500 to-teal-600"}`}
      >
        {tone === "vip" ? <Icon.star size={16} /> : <Icon.umbrella size={16} />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-guest-body font-semibold text-navy-900">{title}</span>
        <span className="block text-guest-meta text-slate-600">{sub}</span>
      </span>
      <NotMvpBadge />
      <Icon.chevR size={15} className="text-slate-500 shrink-0" />
    </button>
  );
}
