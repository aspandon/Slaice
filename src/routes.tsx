import { AdminToday } from "./screens/today/Today";
import { AdminBeachLayout, AdminPricing, AdminProducts } from "./screens/beach/BeachAdmin";
import { AdminLiveBeach } from "./screens/beach/LiveBeach";
import type { ReactElement } from "react";
import type { PersonaId } from "./domain/types";
import * as C from "./screens/customer";
import * as CW from "./screens/CustomerWizard";
import { AdminRbac } from "./screens/AdminRbac";
import { AdminUsers } from "./screens/users/AdminUsers";
import { AdminCommunicate } from "./screens/communicate/Communicate";
import { AdminPrivacy } from "./screens/privacy/AdminPrivacy";
import { MonthEnd } from "./screens/accountant/MonthEnd";
import * as CO from "./screens/Checkout";
import * as PP from "./screens/PassPurchase";
import * as A from "./screens/admin";
import * as CA from "./screens/cashier";
import * as CT from "./screens/controller";
import { ControllerBeach } from "./screens/ControllerBeach";
import { NewBooking } from "./screens/bookings/NewBooking";
import { CallCenterRefunds } from "./screens/bookings/CallCenterRefunds";
import { CallCenterIncidents } from "./screens/incidents/CallCenterIncidents";
import { PlatformIncidents } from "./screens/incidents/PlatformIncidents";
import { AdminBilling } from "./screens/AdminBilling";
import { AdminDisplay } from "./screens/display/AdminDisplay";
import { AccountantReports } from "./screens/reporting/FinanceTabs";
import { DocsPayments } from "./screens/accountant/DocsPayments";
import { AccountantPayments } from "./screens/accountant/Payments";
import { TenantPage } from "./screens/tenant/TenantPage";
import { PlatformRevenue } from "./screens/tenant/PlatformRevenue";
import * as PO from "./screens/tenant/PlatformOverviews";
import * as P from "./screens/platform";

const MAP: Record<string, () => ReactElement> = {
  // customer — all booking now flows through the "Plan my visit" wizard.
  "customer.home": () => <C.CustomerHome />,
  "customer.plan": () => <CW.CustomerWizard />,
  "customer.mybookings": () => <C.CustomerBookings />,
  "customer.wallet": () => <C.CustomerWallet />,
  "customer.account": () => <C.CustomerAccount />,
  "customer.checkout": () => <CO.Checkout />,
  "customer.confirm": () => <CO.Confirmation />,
  "customer.vip": () => <PP.PassPurchase kind="vip" />,
  "customer.season": () => <PP.PassPurchase kind="season" />,
  // admin
  // Today is the manager's home (AENR-560); the old Dashboard URL opens it too.
  "admin.today": () => <AdminToday />,
  // Beach area split by job (AENR-561); the old Availability URL opens Beach layout.
  "admin.layout": () => <AdminBeachLayout />,
  "admin.pricing": () => <AdminPricing />,
  "admin.products": () => <AdminProducts />,
  "admin.bookings": () => <A.AdminBookings />,
  "admin.live": () => <AdminLiveBeach />,
  // One New booking flow (AENR-559); old Manual / Pay-by-link links are aliased in the router.
  "admin.newbooking": () => <NewBooking />,
  "admin.users": () => <AdminUsers />,
  "admin.reporting": () => <A.AdminReporting />,
  "admin.refunds": () => <A.AdminRefunds />,
  "admin.privacy": () => <AdminPrivacy />,
  "admin.rbac": () => <AdminRbac />,
  "admin.communicate": () => <AdminCommunicate />,
  "admin.loyalty": () => <A.AdminLoyalty />,
  "admin.passes": () => <A.AdminPasses />,
  "admin.gamification": () => <A.AdminGamification />,
  "admin.billing": () => <AdminBilling />,
  // call center — the same screens as the admin's, scoped by persona
  "callcenter.newbooking": () => <NewBooking />,
  "callcenter.bookings": () => <A.AdminBookings />,
  "callcenter.refunds": () => <CallCenterRefunds />,
  "callcenter.incidents": () => <CallCenterIncidents />,
  // cashier
  "cashier.issue": () => <CA.CashierIssue />,
  "cashier.transactions": () => <CA.CashierTransactions />,
  "cashier.register": () => <CA.CashierRegister />,
  // controller
  "controller.scan": () => <CT.ControllerScan />,
  "controller.beach": () => <ControllerBeach />,
  // support agent — the Controller and Cashier screens plus pay-by-link (AENR-533)
  "support.scan": () => <CT.ControllerScan />,
  "support.beach": () => <ControllerBeach />,
  "support.issue": () => <CA.CashierIssue />,
  "support.transactions": () => <CA.CashierTransactions />,
  "support.register": () => <CA.CashierRegister />,
  "support.newbooking": () => <NewBooking />,
  "support.bookings": () => <A.AdminBookings />,
  "admin.display": () => <AdminDisplay />,
  // accountant
  "accountant.monthend": () => <MonthEnd />,
  "accountant.documents": () => <DocsPayments only="documents" />,
  "accountant.payments": () => <AccountantPayments />,
  "accountant.reports": () => <AccountantReports />,
  // platform
  "platform.tenants": () => <PO.PlatformTenants />,
  "platform.incidents": () => <PlatformIncidents />,
  "platform.tenant": () => <TenantPage />,
  "platform.revenue": () => <PlatformRevenue />,
  "platform.onboarding": () => <PO.PlatformOnboarding />,
  "platform.superadmin": () => <PO.PlatformSuperAdmin />,
  "platform.compliance": () => <P.PlatformCompliance />,
  "platform.verticals": () => <P.PlatformVerticals />,
  "platform.landing": () => <P.PlatformLanding />,
};

// Per-persona landing screen, used when a page key is unknown (e.g. a stale
// localStorage entry pointing at a since-removed page).
const FALLBACK: Record<PersonaId, () => ReactElement> = {
  customer: () => <C.CustomerHome />,
  admin: () => <AdminToday />,
  callcenter: () => <NewBooking />,
  cashier: () => <CA.CashierIssue />,
  controller: () => <CT.ControllerScan />,
  support: () => <CT.ControllerScan />,
  accountant: () => <DocsPayments />,
  platform: () => <PO.PlatformTenants />,
};

export function routeFor(persona: PersonaId, page: string): ReactElement {
  const fn = MAP[`${persona}.${page}`];
  return fn ? fn() : (FALLBACK[persona] || FALLBACK.admin)();
}
