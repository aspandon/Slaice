import { Icon } from "../../lib/icons";
import { Badge, Btn, EmptyState } from "../../components/ui";
import { useApp, useT } from "../../app/store";
import { ZONES, todayISO, zoneLayout } from "../../data/beach";
import { SEASON_ZONE, seasonSetIn } from "../../data/passes";
import { layoutFor } from "../../domain/layoutVersions";
import { resolvePrice } from "../../domain/pricing";
import { addDays, fmtDay, fmtWeekday } from "../../domain/period";
import { fmtDeadline, releaseDeadline } from "../../domain/visits";
import { guestNow } from "../../lib/useVisits";
import { BadgesTile, RewardRow, SeasonTile, VipTile, activeRewards } from "./CustomerHome";

/* ============ Wallet (AENR-577 / 578) ============
   Everything the guest holds in one place: beach credit, passes (each card
   carries its gate QR), the season set with "Release my day", rewards (applied by
   themselves, AENR-619) and badges. Home keeps one rewards strip that links here. */

const pill =
  "inline-flex items-center gap-2 mb-2 rounded-xl glass-card-solid px-3 py-1.5 font-display font-bold text-navy-900";

export function CustomerWallet() {
  const { loyalty, go, account, passes } = useApp();
  const t = useT();
  const rewards = activeRewards(loyalty);
  const ready = rewards.filter((a) => a.state.kind === "claim").length;
  return (
    <div className="animate-fade-up space-y-5 max-w-5xl mx-auto">
      <h1 className="sr-only">{t("Wallet")}</h1>

      {(account.credit.balance > 0 || account.credit.log.length > 0) && (
        <section aria-labelledby="wallet-credit">
          <h2 id="wallet-credit" className={pill}>
            <Icon.cash size={17} className="text-teal-700" /> {t("Beach credit")}
          </h2>
          <div className="glass-flat rounded-3xl p-4 sm:p-5 flex flex-wrap items-start gap-4">
            <div>
              <div className="font-display font-bold text-3xl text-navy-900 tnum">
                €{account.credit.balance.toFixed(2)}
              </div>
              <div className="text-[12.5px] text-slate-600">
                {t("Used automatically at checkout.")}
              </div>
            </div>
            <ul className="flex-1 min-w-[220px] divide-y divide-slate-100 text-[13px]">
              {account.credit.log.slice(0, 5).map((e, i) => (
                <li key={i} className="py-1.5 flex justify-between gap-3">
                  <span className="text-slate-700">
                    {e.text} <span className="text-slate-500">· {fmtDay(e.at.slice(0, 10))}</span>
                  </span>
                  <span
                    className={`tnum font-semibold ${e.amount >= 0 ? "text-emerald-700" : "text-navy-900"}`}
                  >
                    {e.amount >= 0 ? "+" : "−"}€{Math.abs(e.amount).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section aria-labelledby="wallet-passes">
        <h2 id="wallet-passes" className={pill}>
          <Icon.wallet size={17} className="text-teal-700" /> {t("Passes")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 max-w-[calc(2*85.6mm+1rem)]">
          <VipTile />
          <SeasonTile />
        </div>
        <p className="mt-2 text-[12.5px] text-slate-600 glass-card-solid inline-block rounded-lg px-2.5 py-1">
          {t("Each pass card carries your gate QR — show it at the entrance.")}
        </p>
      </section>

      {passes.season && <ReleaseMyDay />}

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <section aria-labelledby="wallet-rewards" className="glass-flat rounded-3xl p-4">
          <h2
            id="wallet-rewards"
            className="font-display font-bold text-navy-900 mb-3 flex items-center gap-2"
          >
            <Icon.gift size={16} className="text-teal-700" /> {t("Rewards")}
            {ready > 0 && (
              <Badge tone="green">
                {ready} {t("ready")}
              </Badge>
            )}
          </h2>
          {rewards.length ? (
            <div className="space-y-2.5">
              {rewards.map((a) => (
                <RewardRow
                  key={a.id}
                  icon={a.icon}
                  title={a.title}
                  state={a.state}
                  used={a.id !== "tiers" && (account.rewardsUsed ?? []).includes(a.id)}
                />
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
        </section>
        <BadgesTile />
      </div>

    </div>
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
      <h2 id="wallet-release" className={pill}>
        <Icon.umbrella size={17} className="text-teal-700" /> {t("Your season set")} · {zone.name}{" "}
        {setId}
      </h2>
      <div className="glass-flat rounded-3xl p-4">
        <p className="text-[13px] text-slate-700 mb-3">
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
                  <div className="font-semibold text-navy-900 text-[13.5px]">
                    {fmtWeekday(d)} {fmtDay(d)}
                  </div>
                  <div className="text-[12px] text-slate-600">
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
