import type { ReactElement } from "react";
import type { PersonaId } from "./domain/types";
import * as C from "./screens/customer";
import * as CW from "./screens/CustomerWizard";
import { AdminRbac } from "./screens/AdminRbac";
import { AdminUsers } from "./screens/users/AdminUsers";
import * as CO from "./screens/Checkout";
import * as PP from "./screens/PassPurchase";
import * as A from "./screens/admin";
import * as CA from "./screens/cashier";
import * as CT from "./screens/controller";
import { ControllerBeach } from "./screens/ControllerBeach";
import { ControllerWalkin } from "./screens/ControllerWalkin";
import { PayLinks } from "./screens/PayLinks";
import { AdminDisplay } from "./screens/display/AdminDisplay";
import * as AC from "./screens/accountant";
import { AccountantReports } from "./screens/reporting/FinanceTabs";
import { DocsPayments } from "./screens/accountant/DocsPayments";
import * as P from "./screens/platform";

const MAP: Record<string, () => ReactElement> = {
  // customer — all booking now flows through the "Plan my visit" wizard.
  "customer.home": () => <C.CustomerHome />,
  "customer.plan": () => <CW.CustomerWizard />,
  "customer.mybookings": () => <C.CustomerBookings />,
  "customer.mydocs": () => <C.CustomerDocs />,
  "customer.checkout": () => <CO.Checkout />,
  "customer.confirm": () => <CO.Confirmation />,
  "customer.vip": () => <PP.PassPurchase kind="vip" />,
  "customer.season": () => <PP.PassPurchase kind="season" />,
  // admin
  "admin.dashboard": () => <A.AdminDashboard />,
  "admin.availability": () => <A.AdminAvailability />,
  "admin.bookings": () => <A.AdminBookings />,
  "admin.manual": () => <A.AdminManual />,
  "admin.users": () => <AdminUsers />,
  "admin.reporting": () => <A.AdminReporting />,
  "admin.refunds": () => <A.AdminRefunds />,
  "admin.privacy": () => <A.AdminPrivacy />,
  "admin.rbac": () => <AdminRbac />,
  "admin.communicate": () => <A.AdminCommunicate />,
  "admin.loyalty": () => <A.AdminLoyalty />,
  "admin.passes": () => <A.AdminPasses />,
  "admin.gamification": () => <A.AdminGamification />,
  // call center — the same screens as the admin's, scoped by persona
  "callcenter.manual": () => <A.AdminManual />,
  "callcenter.bookings": () => <A.AdminBookings />,
  // cashier
  "cashier.issue": () => <CA.CashierIssue />,
  "cashier.transactions": () => <CA.CashierTransactions />,
  "cashier.redeem": () => <CA.CashierRedeem />,
  "cashier.register": () => <CA.CashierRegister />,
  "cashier.locker": () => <CA.CashierLocker />,
  // controller
  "controller.scan": () => <CT.ControllerScan />,
  "controller.beach": () => <ControllerBeach />,
  "controller.walkin": () => <ControllerWalkin />,
  // support agent — the Controller and Cashier screens plus pay-by-link (AENR-533)
  "support.scan": () => <CT.ControllerScan />,
  "support.beach": () => <ControllerBeach />,
  "support.walkin": () => <ControllerWalkin channel="support" />,
  "support.issue": () => <CA.CashierIssue />,
  "support.transactions": () => <CA.CashierTransactions />,
  "support.register": () => <CA.CashierRegister />,
  "support.redeem": () => <CA.CashierRedeem />,
  "support.locker": () => <CA.CashierLocker />,
  "support.paylinks": () => <PayLinks />,
  "callcenter.paylinks": () => <PayLinks />,
  "admin.paylinks": () => <PayLinks />,
  "admin.display": () => <AdminDisplay />,
  // accountant
  "accountant.documents": () => <DocsPayments />,
  "accountant.commission": () => <AC.AccountantCommission />,
  "accountant.reports": () => <AccountantReports />,
  // platform
  "platform.tenants": () => <P.PlatformTenants />,
  "platform.onboarding": () => <P.PlatformOnboarding />,
  "platform.superadmin": () => <P.PlatformSuperAdmin />,
  "platform.compliance": () => <P.PlatformCompliance />,
  "platform.verticals": () => <P.PlatformVerticals />,
  "platform.landing": () => <P.PlatformLanding />,
};

// Per-persona landing screen, used when a page key is unknown (e.g. a stale
// localStorage entry pointing at a since-removed page).
const FALLBACK: Record<PersonaId, () => ReactElement> = {
  customer: () => <C.CustomerHome />,
  admin: () => <A.AdminDashboard />,
  callcenter: () => <A.AdminManual />,
  cashier: () => <CA.CashierIssue />,
  controller: () => <CT.ControllerScan />,
  support: () => <CT.ControllerScan />,
  accountant: () => <DocsPayments />,
  platform: () => <P.PlatformTenants />,
};

export function routeFor(persona: PersonaId, page: string): ReactElement {
  const fn = MAP[`${persona}.${page}`];
  return fn ? fn() : (FALLBACK[persona] || FALLBACK.admin)();
}
