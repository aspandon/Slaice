import { Icon } from "../../lib/icons";
import { Badge, Btn, EmptyState } from "../../components/ui";
import { useApp, useT } from "../../app/store";
import { BadgesTile, RewardRow, SeasonTile, VipTile, activeRewards } from "./CustomerHome";

/* ============ Wallet (AENR-563) ============
   Everything the guest holds, one tap from every page: passes (VIP credit,
   Season), rewards and badges. Home keeps the same tiles for now; the full
   Wallet (pass QR, claim / use, released-day credit) is AENR-577. */

export function CustomerWallet() {
  const { loyalty, go } = useApp();
  const t = useT();
  const rewards = activeRewards(loyalty);
  const ready = rewards.filter((a) => a.state.kind === "claim").length;
  return (
    <div className="animate-fade-up space-y-5 max-w-5xl mx-auto">
      <h1 className="sr-only">{t("Wallet")}</h1>
      <section aria-labelledby="wallet-passes">
        <h2
          id="wallet-passes"
          className="inline-flex items-center gap-2 mb-2 rounded-xl glass-card-solid px-3 py-1.5 font-display font-bold text-navy-900"
        >
          <Icon.wallet size={17} className="text-teal-700" /> {t("Passes")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 max-w-[calc(2*85.6mm+1rem)]">
          <VipTile />
          <SeasonTile />
        </div>
      </section>
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
                <RewardRow key={a.id} icon={a.icon} title={a.title} state={a.state} />
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
