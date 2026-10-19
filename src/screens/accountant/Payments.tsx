import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Tabs } from "../../components/ui";
import { readHashQuery, writeHashQuery } from "../../app/router";
import { DocsPayments } from "./DocsPayments";
import { AccountantCommission } from "../accountant";
import { SlaiceStatement } from "./SlaiceStatement";

/* ============ Accountant › Payments & payouts (AENR-642) ============
   Money in and money out in one home: card charges with their fees, the
   Stripe payouts and the Slaice commission, and the monthly Slaice statement
   with its invoice (AENR-725 / 689). (`?view=payouts` / `?view=statement`.) */
type View = "charges" | "payouts" | "statement";

export function AccountantPayments() {
  const [view, setView] = useState<View>(() => {
    const v = readHashQuery().get("view");
    return v === "payouts" || v === "statement" ? v : "charges";
  });
  const pick = (v: View) => {
    setView(v);
    writeHashQuery(v === "charges" ? {} : { view: v }, v === "charges" ? ["view", "month"] : v === "payouts" ? ["month"] : []);
  };
  // The view tabs share a row with the view's own actions (AENR-701) — no row with one lonely button.
  const tabs = (
    <Tabs
      scroll
      tabs={[
        ["charges", "Card charges", Icon.card],
        ["payouts", "Payouts & commission", Icon.trend],
        ["statement", "Slaice statement", Icon.receipt],
      ]}
      value={view}
      onChange={(v) => pick(v as View)}
    />
  );
  return (
    <div className="space-y-3">
      {view === "charges" ? (
        <DocsPayments only="payments" lead={tabs} />
      ) : view === "payouts" ? (
        <AccountantCommission lead={tabs} />
      ) : (
        <>
          {tabs}
          <SlaiceStatement />
        </>
      )}
    </div>
  );
}
