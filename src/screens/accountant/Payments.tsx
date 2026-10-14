import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Tabs } from "../../components/ui";
import { readHashQuery, writeHashQuery } from "../../app/router";
import { DocsPayments } from "./DocsPayments";
import { AccountantCommission } from "../accountant";

/* ============ Accountant › Payments & payouts (AENR-642) ============
   Money in and money out in one home: card charges with their fees, then the
   Stripe payouts and the Slaice commission. (`?view=payouts` opens the second.) */
type View = "charges" | "payouts";

export function AccountantPayments() {
  const [view, setView] = useState<View>(() => (readHashQuery().get("view") === "payouts" ? "payouts" : "charges"));
  const pick = (v: View) => {
    setView(v);
    writeHashQuery(v === "payouts" ? { view: v } : {}, v === "payouts" ? [] : ["view"]);
  };
  return (
    <div className="space-y-3">
      <Tabs
        tabs={[
          ["charges", "Card charges", Icon.card],
          ["payouts", "Payouts & commission", Icon.trend],
        ]}
        value={view}
        onChange={(v) => pick(v as View)}
      />
      {view === "charges" ? <DocsPayments only="payments" /> : <AccountantCommission />}
    </div>
  );
}
