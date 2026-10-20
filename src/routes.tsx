import { lazy, type ReactElement } from "react";
import type { PersonaId } from "./domain/types";

/* Every screen loads on demand (AENR-730): a phone opening the guest pages
   downloads the customer screens only, not the back office. Each screen
   module is its own chunk (shared code is split out by the bundler), and
   `prefetchPersona` warms the current role's screens once the browser is
   idle, so moving between pages stays instant. */
const LOADERS = {
  AdminBilling: () => import("./screens/AdminBilling"),
  AdminRbac: () => import("./screens/AdminRbac"),
  Checkout: () => import("./screens/Checkout"),
  ControllerBeach: () => import("./screens/ControllerBeach"),
  CustomerWizard: () => import("./screens/CustomerWizard"),
  PassPurchase: () => import("./screens/PassPurchase"),
  accountant_DocsPayments: () => import("./screens/accountant/DocsPayments"),
  accountant_MonthEnd: () => import("./screens/accountant/MonthEnd"),
  accountant_Payments: () => import("./screens/accountant/Payments"),
  admin: () => import("./screens/admin"),
  beach_BeachAdmin: () => import("./screens/beach/BeachAdmin"),
  beach_LiveBeach: () => import("./screens/beach/LiveBeach"),
  bookings_CallCenterRefunds: () => import("./screens/bookings/CallCenterRefunds"),
  bookings_NewBooking: () => import("./screens/bookings/NewBooking"),
  cashier: () => import("./screens/cashier"),
  communicate_Communicate: () => import("./screens/communicate/Communicate"),
  controller: () => import("./screens/controller"),
  customer: () => import("./screens/customer"),
  // Home on its own (AENR-839): the first guest screen must not wait for Wallet, Account and the
  // privacy centre that share the customer barrel; those warm in the background with it.
  customer_CustomerHome: () => import("./screens/customer/CustomerHome"),
  display_AdminDisplay: () => import("./screens/display/AdminDisplay"),
  incidents_CallCenterIncidents: () => import("./screens/incidents/CallCenterIncidents"),
  incidents_PlatformIncidents: () => import("./screens/incidents/PlatformIncidents"),
  platform: () => import("./screens/platform"),
  privacy_AdminPrivacy: () => import("./screens/privacy/AdminPrivacy"),
  reporting_FinanceTabs: () => import("./screens/reporting/FinanceTabs"),
  tenant_PlatformOverviews: () => import("./screens/tenant/PlatformOverviews"),
  tenant_PlatformRevenue: () => import("./screens/tenant/PlatformRevenue"),
  tenant_TenantPage: () => import("./screens/tenant/TenantPage"),
  today_Today: () => import("./screens/today/Today"),
  users_AdminUsers: () => import("./screens/users/AdminUsers"),
} as const;

const A_AdminBookings = lazy(() => LOADERS.admin().then((m) => ({ default: m.AdminBookings })));
const A_AdminGamification = lazy(() => LOADERS.admin().then((m) => ({ default: m.AdminGamification })));
const A_AdminLoyalty = lazy(() => LOADERS.admin().then((m) => ({ default: m.AdminLoyalty })));
const A_AdminPasses = lazy(() => LOADERS.admin().then((m) => ({ default: m.AdminPasses })));
const A_AdminRefunds = lazy(() => LOADERS.admin().then((m) => ({ default: m.AdminRefunds })));
const A_AdminReporting = lazy(() => LOADERS.admin().then((m) => ({ default: m.AdminReporting })));
const AccountantPayments = lazy(() => LOADERS.accountant_Payments().then((m) => ({ default: m.AccountantPayments })));
const AccountantReports = lazy(() => LOADERS.reporting_FinanceTabs().then((m) => ({ default: m.AccountantReports })));
const AdminBeachLayout = lazy(() => LOADERS.beach_BeachAdmin().then((m) => ({ default: m.AdminBeachLayout })));
const AdminBilling = lazy(() => LOADERS.AdminBilling().then((m) => ({ default: m.AdminBilling })));
const AdminCommunicate = lazy(() => LOADERS.communicate_Communicate().then((m) => ({ default: m.AdminCommunicate })));
const AdminDisplay = lazy(() => LOADERS.display_AdminDisplay().then((m) => ({ default: m.AdminDisplay })));
const AdminLiveBeach = lazy(() => LOADERS.beach_LiveBeach().then((m) => ({ default: m.AdminLiveBeach })));
const AdminPricing = lazy(() => LOADERS.beach_BeachAdmin().then((m) => ({ default: m.AdminPricing })));
const AdminPrivacy = lazy(() => LOADERS.privacy_AdminPrivacy().then((m) => ({ default: m.AdminPrivacy })));
const AdminProducts = lazy(() => LOADERS.beach_BeachAdmin().then((m) => ({ default: m.AdminProducts })));
const AdminRbac = lazy(() => LOADERS.AdminRbac().then((m) => ({ default: m.AdminRbac })));
const AdminToday = lazy(() => LOADERS.today_Today().then((m) => ({ default: m.AdminToday })));
const AdminUsers = lazy(() => LOADERS.users_AdminUsers().then((m) => ({ default: m.AdminUsers })));
const CA_CashierIssue = lazy(() => LOADERS.cashier().then((m) => ({ default: m.CashierIssue })));
const CA_CashierRegister = lazy(() => LOADERS.cashier().then((m) => ({ default: m.CashierRegister })));
const CA_CashierTransactions = lazy(() => LOADERS.cashier().then((m) => ({ default: m.CashierTransactions })));
const CO_Checkout = lazy(() => LOADERS.Checkout().then((m) => ({ default: m.Checkout })));
const CO_Confirmation = lazy(() => LOADERS.Checkout().then((m) => ({ default: m.Confirmation })));
const CT_ControllerScan = lazy(() => LOADERS.controller().then((m) => ({ default: m.ControllerScan })));
const CW_CustomerWizard = lazy(() => LOADERS.CustomerWizard().then((m) => ({ default: m.CustomerWizard })));
const C_CustomerAccount = lazy(() => LOADERS.customer().then((m) => ({ default: m.CustomerAccount })));
const C_CustomerBookings = lazy(() => LOADERS.customer().then((m) => ({ default: m.CustomerBookings })));
const C_CustomerHome = lazy(() => LOADERS.customer_CustomerHome().then((m) => ({ default: m.CustomerHome })));
const C_CustomerWallet = lazy(() => LOADERS.customer().then((m) => ({ default: m.CustomerWallet })));
const CallCenterIncidents = lazy(() => LOADERS.incidents_CallCenterIncidents().then((m) => ({ default: m.CallCenterIncidents })));
const CallCenterRefunds = lazy(() => LOADERS.bookings_CallCenterRefunds().then((m) => ({ default: m.CallCenterRefunds })));
const ControllerBeach = lazy(() => LOADERS.ControllerBeach().then((m) => ({ default: m.ControllerBeach })));
const DocsPayments = lazy(() => LOADERS.accountant_DocsPayments().then((m) => ({ default: m.DocsPayments })));
const MonthEnd = lazy(() => LOADERS.accountant_MonthEnd().then((m) => ({ default: m.MonthEnd })));
const NewBooking = lazy(() => LOADERS.bookings_NewBooking().then((m) => ({ default: m.NewBooking })));
const PO_PlatformOnboarding = lazy(() => LOADERS.tenant_PlatformOverviews().then((m) => ({ default: m.PlatformOnboarding })));
const PO_PlatformSuperAdmin = lazy(() => LOADERS.tenant_PlatformOverviews().then((m) => ({ default: m.PlatformSuperAdmin })));
const PO_PlatformTenants = lazy(() => LOADERS.tenant_PlatformOverviews().then((m) => ({ default: m.PlatformTenants })));
const PP_PassPurchase = lazy(() => LOADERS.PassPurchase().then((m) => ({ default: m.PassPurchase })));
const P_PlatformCompliance = lazy(() => LOADERS.platform().then((m) => ({ default: m.PlatformCompliance })));
const P_PlatformLanding = lazy(() => LOADERS.platform().then((m) => ({ default: m.PlatformLanding })));
const P_PlatformVerticals = lazy(() => LOADERS.platform().then((m) => ({ default: m.PlatformVerticals })));
const PlatformIncidents = lazy(() => LOADERS.incidents_PlatformIncidents().then((m) => ({ default: m.PlatformIncidents })));
const PlatformRevenue = lazy(() => LOADERS.tenant_PlatformRevenue().then((m) => ({ default: m.PlatformRevenue })));
const TenantPage = lazy(() => LOADERS.tenant_TenantPage().then((m) => ({ default: m.TenantPage })));

const MAP: Record<string, () => ReactElement> = {
  // customer — all booking now flows through the "Plan my visit" wizard.
  "customer.home": () => <C_CustomerHome />,
  "customer.plan": () => <CW_CustomerWizard />,
  "customer.mybookings": () => <C_CustomerBookings />,
  "customer.wallet": () => <C_CustomerWallet />,
  "customer.account": () => <C_CustomerAccount />,
  "customer.checkout": () => <CO_Checkout />,
  "customer.confirm": () => <CO_Confirmation />,
  "customer.vip": () => <PP_PassPurchase kind="vip" />,
  "customer.season": () => <PP_PassPurchase kind="season" />,
  // admin
  // Today is the manager's home (AENR-560); the old Dashboard URL opens it too.
  "admin.today": () => <AdminToday />,
  // Beach area split by job (AENR-561); the old Availability URL opens Beach layout.
  "admin.layout": () => <AdminBeachLayout />,
  "admin.pricing": () => <AdminPricing />,
  "admin.products": () => <AdminProducts />,
  "admin.bookings": () => <A_AdminBookings />,
  "admin.live": () => <AdminLiveBeach />,
  // One New booking flow (AENR-559); old Manual / Pay-by-link links are aliased in the router.
  "admin.newbooking": () => <NewBooking />,
  "admin.users": () => <AdminUsers />,
  "admin.reporting": () => <A_AdminReporting />,
  "admin.refunds": () => <A_AdminRefunds />,
  "admin.privacy": () => <AdminPrivacy />,
  "admin.rbac": () => <AdminRbac />,
  "admin.communicate": () => <AdminCommunicate />,
  "admin.loyalty": () => <A_AdminLoyalty />,
  "admin.passes": () => <A_AdminPasses />,
  "admin.gamification": () => <A_AdminGamification />,
  "admin.billing": () => <AdminBilling />,
  // call center — the same screens as the admin's, scoped by persona
  "callcenter.newbooking": () => <NewBooking />,
  "callcenter.bookings": () => <A_AdminBookings />,
  "callcenter.refunds": () => <CallCenterRefunds />,
  "callcenter.incidents": () => <CallCenterIncidents />,
  // cashier
  "cashier.issue": () => <CA_CashierIssue />,
  "cashier.transactions": () => <CA_CashierTransactions />,
  "cashier.register": () => <CA_CashierRegister />,
  // controller
  "controller.scan": () => <CT_ControllerScan />,
  "controller.beach": () => <ControllerBeach />,
  // support agent — the Controller and Cashier screens plus pay-by-link (AENR-533)
  "support.scan": () => <CT_ControllerScan />,
  "support.beach": () => <ControllerBeach />,
  "support.issue": () => <CA_CashierIssue />,
  "support.transactions": () => <CA_CashierTransactions />,
  "support.register": () => <CA_CashierRegister />,
  "support.newbooking": () => <NewBooking />,
  "support.bookings": () => <A_AdminBookings />,
  "admin.display": () => <AdminDisplay />,
  // accountant
  "accountant.monthend": () => <MonthEnd />,
  "accountant.documents": () => <DocsPayments only="documents" />,
  "accountant.payments": () => <AccountantPayments />,
  "accountant.reports": () => <AccountantReports />,
  // platform
  "platform.tenants": () => <PO_PlatformTenants />,
  "platform.incidents": () => <PlatformIncidents />,
  "platform.tenant": () => <TenantPage />,
  "platform.revenue": () => <PlatformRevenue />,
  "platform.onboarding": () => <PO_PlatformOnboarding />,
  "platform.superadmin": () => <PO_PlatformSuperAdmin />,
  "platform.compliance": () => <P_PlatformCompliance />,
  "platform.verticals": () => <P_PlatformVerticals />,
  "platform.landing": () => <P_PlatformLanding />,
};

// Per-persona landing screen, used when a page key is unknown (e.g. a stale
// localStorage entry pointing at a since-removed page).
const FALLBACK: Record<PersonaId, () => ReactElement> = {
  customer: () => <C_CustomerHome />,
  admin: () => <AdminToday />,
  callcenter: () => <NewBooking />,
  cashier: () => <CA_CashierIssue />,
  controller: () => <CT_ControllerScan />,
  support: () => <CT_ControllerScan />,
  accountant: () => <DocsPayments />,
  platform: () => <PO_PlatformTenants />,
};

export function routeFor(persona: PersonaId, page: string): ReactElement {
  const fn = MAP[`${persona}.${page}`];
  return fn ? fn() : (FALLBACK[persona] || FALLBACK.admin)();
}

/** The screens a role uses, warmed in the background after the first page shows. */
const PERSONA_MODULES: Record<PersonaId, (keyof typeof LOADERS)[]> = {
  customer: ["Checkout", "CustomerWizard", "PassPurchase", "customer"],
  admin: ["AdminBilling", "AdminRbac", "admin", "beach_BeachAdmin", "beach_LiveBeach", "bookings_NewBooking", "communicate_Communicate", "display_AdminDisplay", "privacy_AdminPrivacy", "today_Today", "users_AdminUsers"],
  callcenter: ["admin", "bookings_CallCenterRefunds", "bookings_NewBooking", "incidents_CallCenterIncidents"],
  cashier: ["cashier"],
  controller: ["ControllerBeach", "controller"],
  support: ["ControllerBeach", "admin", "bookings_NewBooking", "cashier", "controller"],
  accountant: ["accountant_DocsPayments", "accountant_MonthEnd", "accountant_Payments", "reporting_FinanceTabs"],
  platform: ["incidents_PlatformIncidents", "platform", "tenant_PlatformOverviews", "tenant_PlatformRevenue", "tenant_TenantPage"],
};
export function prefetchPersona(persona: PersonaId) {
  for (const k of PERSONA_MODULES[persona] ?? []) void LOADERS[k]().catch(() => undefined);
}

/** The guest pages' own chunks — what a tap on that tab is about to need (AENR-837). */
const CUSTOMER_PAGE: Record<string, keyof typeof LOADERS> = {
  home: "customer_CustomerHome",
  mybookings: "customer",
  wallet: "customer",
  account: "customer",
  plan: "CustomerWizard",
  checkout: "Checkout",
  confirm: "Checkout",
  vip: "PassPurchase",
  season: "PassPurchase",
};
const warmed = new Set<string>();
/** Preload on intent (AENR-837): a pointer resting on, pressing or focusing a nav item starts that
 *  page's download before the click lands. A guest page fetches just its own chunk; a back-office
 *  role warms its screens (they are few and small next to the guest's sea). Once per page. */
export function prefetchPage(persona: PersonaId, page: string) {
  const key = `${persona}.${page}`;
  if (warmed.has(key)) return;
  warmed.add(key);
  const k = persona === "customer" ? CUSTOMER_PAGE[page] : undefined;
  if (k) void LOADERS[k]().catch(() => warmed.delete(key));
  else prefetchPersona(persona);
}
