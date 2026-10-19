import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { Badge, Btn, EmptyState, ErrorState, NotMvpBadge, Skeleton } from "../../components/ui";
import { QR } from "../../components/charts";
import { qrCode } from "../../domain/entry";
import { useApp, useT } from "../../app/store";
import { TENANT, ZONES, todayISO, zoneLayout } from "../../data/beach";
import { SEASON_ZONE, seasonSetIn } from "../../data/passes";
import { layoutFor } from "../../domain/layoutVersions";
import { resolvePrice } from "../../domain/pricing";
import { addDays, fmtDay, fmtWeekday } from "../../domain/period";
import { ARRIVAL_WINDOW, fmtDeadline, releaseDeadline, type Visit } from "../../domain/visits";
import { guestNow, useVisits } from "../../lib/useVisits";
import { BadgesTile, RewardRow, SeasonTile, VipTile, activeRewards } from "./CustomerHome";
import { VisitQR } from "./VisitTicket";
import { useTenantFeatures } from "../../lib/useFeatures";

/* ============ Wallet (AENR-577 / 578, order AENR-686) ============
   Everything the guest holds, in one centred column under the top nav (the same
   max-w-4xl as My bookings):
     1. the passes they own (VIP credit / Season) and their beach credit,
     2. their upcoming entries — one ticket per visit with its gate QR,
     3. rewards (a roadmap feature, marked FUTURE),
     4. "Release my day" for season holders,
     5. passes they could buy (slim offers, never a card with their name and a QR),
     6. badges (gamification, FUTURE). */

/** Entries shown on the Wallet; the rest live in My bookings. */
const ENTRY_LIMIT = 4;

/* One heading style for every Wallet section: a solid pill that stays legible over the
   beach photo, with an optional aside (a count, a FUTURE badge, a link) on the right. */
function SectionHead({
  id,
  icon: I,
  children,
  aside,
}: {
  id: string;
  icon: IconRenderer;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2
        id={id}
        className="inline-flex items-center gap-2 rounded-xl glass-card-solid px-3 py-1.5 font-display font-bold text-navy-900"
      >
        <I size={17} className="text-teal-700" /> {children}
      </h2>
      {aside && <div className="flex items-center gap-2">{aside}</div>}
    </div>
  );
}

export function CustomerWallet() {
  const { loyalty, go, account, passes, passPricing } = useApp();
  const t = useT();
  const rewards = activeRewards(loyalty);
  const ready = rewards.filter((a) => a.state.kind === "claim").length;
  // VIP / Season passes and rewards are roadmap features (AENR-691); rewards need Loyalty too (AENR-696).
  // With previews off the Wallet holds only what works today: credit and entries.
  const { roadmap, allows } = useTenantFeatures();
  const showRewards = allows({ future: true, module: "Loyalty" });
  const owned = roadmap ? [passes.vip && "vip", passes.season && "season"].filter(Boolean) : [];
  const hasCredit = account.credit.balance > 0 || account.credit.log.length > 0;
  return (
    <div className="animate-fade-up w-full max-w-4xl mx-auto space-y-8">
      <h1 className="sr-only">{t("Wallet")}</h1>

      {owned.length > 0 && (
        <section aria-labelledby="wallet-passes">
          <SectionHead id="wallet-passes" icon={Icon.wallet}>
            {t("Your passes")}
          </SectionHead>
          <div
            className={`grid gap-4 ${owned.length > 1 ? "sm:grid-cols-2" : "max-w-[26rem] mx-auto"}`}
          >
            {owned.includes("vip") && <VipTile />}
            {owned.includes("season") && <SeasonTile />}
          </div>
          <p className="mt-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-lg glass-card-solid px-2.5 py-1 text-guest-meta text-slate-700">
              <Icon.qr size={13} className="text-teal-700" />
              {t("Each pass card carries your gate QR — show it at the entrance.")}
            </span>
          </p>
        </section>
      )}

      {hasCredit && <BeachCredit />}

      <UpcomingEntries />

      {showRewards && (
      <section aria-labelledby="wallet-rewards">
        <SectionHead
          id="wallet-rewards"
          icon={Icon.gift}
        >
          {t("Rewards")}
          {/* Loyalty rewards are a roadmap feature (AENR-679 / 686). */}
          <NotMvpBadge />
          {ready > 0 && (
            <Badge tone="green">
              {ready} {t("ready")}
            </Badge>
          )}
        </SectionHead>
        <div className="glass-flat rounded-3xl p-3 sm:p-4">
          {rewards.length ? (
            <div className="grid gap-2.5 md:grid-cols-2">
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
        </div>
      </section>
      )}

      {owned.includes("season") && <ReleaseMyDay />}

      {roadmap && owned.length < 2 && (
        <section aria-labelledby="wallet-offers">
          <SectionHead id="wallet-offers" icon={Icon.sparkles}>
            {t("Passes you can get")}
          </SectionHead>
          <div className={`grid gap-3 ${owned.length === 0 ? "md:grid-cols-2" : ""}`}>
            {!passes.vip && (
              <PassOffer
                tone="vip"
                title={`${t("Become VIP")} — ${Math.round(passPricing.vipDiscount * 100)}% ${t("off every visit")}`}
                sub={`${t("from")} €${Math.min(...passPricing.vipTiers).toLocaleString()} ${t("of credit")}`}
                onClick={() => go("customer", "vip")}
              />
            )}
            {!passes.season && (
              <PassOffer
                tone="season"
                title={`${t("Season pass")} — ${t("your own set all summer")}`}
                sub={`${t("from")} €${Math.min(passPricing.seasonMonthly, passPricing.seasonSummer).toLocaleString()}`}
                onClick={() => go("customer", "season")}
              />
            )}
          </div>
        </section>
      )}

      <BadgesTile />
    </div>
  );
}

/* Beach credit: the balance (used at checkout by itself) and its latest movements. */
function BeachCredit() {
  const { account } = useApp();
  const t = useT();
  return (
    <section aria-labelledby="wallet-credit">
      <SectionHead id="wallet-credit" icon={Icon.cash}>
        {t("Beach credit")}
      </SectionHead>
      <div className="glass-flat rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="sm:w-48 shrink-0">
          <div className="font-display font-bold text-3xl text-navy-900 tnum">
            €{account.credit.balance.toFixed(2)}
          </div>
          <div className="text-guest-meta text-slate-600">{t("Used automatically at checkout.")}</div>
        </div>
        {account.credit.log.length > 0 && (
          <ul className="flex-1 min-w-0 divide-y divide-slate-100 text-guest-meta">
            {account.credit.log.slice(0, 5).map((e, i) => (
              <li key={i} className="py-1.5 flex justify-between gap-3">
                <span className="text-slate-700 min-w-0">
                  {e.text} <span className="text-slate-500">· {fmtDay(e.at.slice(0, 10))}</span>
                </span>
                <span
                  className={`tnum font-semibold shrink-0 ${e.amount >= 0 ? "text-emerald-700" : "text-navy-900"}`}
                >
                  {e.amount >= 0 ? "+" : "−"}€{Math.abs(e.amount).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
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
  const more = ahead.length - shown.length;
  return (
    <section aria-labelledby="wallet-entries" aria-busy={status === "loading"}>
      <SectionHead
        id="wallet-entries"
        icon={Icon.ticket}
        aside={
          ahead.length > 0 && (
            <button
              type="button"
              onClick={() => go("customer", "mybookings")}
              className="inline-flex items-center gap-1 rounded-lg glass-card-solid px-2.5 py-1 text-guest-meta font-semibold text-teal-700 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              {more > 0 ? `${t("All")} ${ahead.length} ${t("in My bookings")}` : t("My bookings")}
              <Icon.chevR size={13} />
            </button>
          )
        }
      >
        {t("Upcoming entries")}
        {ahead.length > 0 && <Badge tone="info">{ahead.length}</Badge>}
      </SectionHead>
      {status === "loading" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-[164px] !rounded-3xl" />
          ))}
        </div>
      ) : status === "error" ? (
        <div className="glass-flat rounded-3xl">
          <ErrorState compact body={t("We couldn't load your bookings.")} onRetry={refetch} />
        </div>
      ) : shown.length === 0 ? (
        <div className="glass-flat rounded-3xl">
          <EmptyState
            compact
            icon={Icon.ticket}
            title={t("No upcoming visits")}
            body={t("Book a day at the beach — its entry QR will be here, ready for the gate.")}
            action={
              <Btn variant="teal" icon={Icon.sparkles} onClick={() => go("customer", "plan")}>
                {t("Plan a visit")}
              </Btn>
            }
          />
        </div>
      ) : (
        <PassStack visits={shown} onShow={setOpen} />
      )}
      {open && <VisitQR v={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

/* ============ Pass stack (AENR-759) ============
   Upcoming entries as a stack of pass cards, like a phone wallet: the next one
   is open with its gate QR; later ones show only their top strip, tucked under
   the card above. Tapping a strip opens that pass and tucks the other away.
   It's a list of disclosure buttons, so keyboard and screen readers get the
   same: each strip says which visit it is and whether it is open. Managing a
   visit (move, extras, cancel, receipts) stays in My bookings. */
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
    <section aria-labelledby="wallet-release">
      <SectionHead id="wallet-release" icon={Icon.umbrella}>
        {t("Your season set")} · {zone.name} {setId}
      </SectionHead>
      <div className="glass-flat rounded-3xl p-4">
        <p className="text-guest-meta text-slate-700 mb-3">
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
                      ? `${t("Resold")} · +€${r.resold.credit.toFixed(2)} ${t("credit")}`
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
      </div>
    </section>
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
