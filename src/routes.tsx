import { createElement, lazy, useState, type ComponentType, type ReactElement } from "react";
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

type Loaders = typeof LOADERS;
type ScreenKey = keyof Loaders;
type ScreenModule<K extends ScreenKey> = Awaited<ReturnType<Loaders[K]>>;
/** Screen modules already downloaded and run (by a prefetch or an earlier visit). */
const loaded: Partial<Record<ScreenKey, unknown>> = {};
/** Loads a screen module and remembers it once it has arrived. */
function load<K extends ScreenKey>(k: K): Promise<ScreenModule<K>> {
  return (LOADERS[k]() as Promise<ScreenModule<K>>).then((m) => {
    loaded[k] = m;
    return m;
  });
}

/* A screen that renders at once when its code is already here (AENR-851). React.lazy suspends on
   its first render even when the module was prefetched — it only starts its own load then — so
   the first visit to a screen flashed the loading skeleton and React held the real screen back
   (its reveal throttle): opening Plan a visit the first time took ≈ 600 ms on a slowed phone
   against ≈ 250 ms the second. Here a screen whose module has loaded renders directly; only a
   screen that really isn't here yet suspends. Decided once per mount, so a screen never swaps
   between the two (that would remount it and lose its state). */
function screen<K extends ScreenKey, C extends ComponentType<never>>(k: K, pick: (m: ScreenModule<K>) => C): C {
  // Inside, props only pass through; the screen keeps its own props type at the boundary (`C`).
  type Props = Record<string, unknown>;
  const as = (c: C) => c as unknown as ComponentType<Props>;
  const Lazy = lazy(() => load(k).then((m) => ({ default: as(pick(m)) })));
  function Screen(props: Props) {
    const [ready] = useState(() => (loaded[k] ? as(pick(loaded[k] as ScreenModule<K>)) : null));
    return createElement(ready ?? Lazy, props);
  }
  return Screen as unknown as C;
}

const A_AdminBookings = screen("admin", (m) => m.AdminBookings);
const A_AdminGamification = screen("admin", (m) => m.AdminGamification);
const A_AdminLoyalty = screen("admin", (m) => m.AdminLoyalty);
const A_AdminPasses = screen("admin", (m) => m.AdminPasses);
const A_AdminRefunds = screen("admin", (m) => m.AdminRefunds);
const A_AdminReporting = screen("admin", (m) => m.AdminReporting);
const AccountantPayments = screen("accountant_Payments", (m) => m.AccountantPayments);
const AccountantReports = screen("reporting_FinanceTabs", (m) => m.AccountantReports);
const AdminBeachLayout = screen("beach_BeachAdmin", (m) => m.AdminBeachLayout);
const AdminBilling = screen("AdminBilling", (m) => m.AdminBilling);
const AdminCommunicate = screen("communicate_Communicate", (m) => m.AdminCommunicate);
const AdminDisplay = screen("display_AdminDisplay", (m) => m.AdminDisplay);
const AdminLiveBeach = screen("beach_LiveBeach", (m) => m.AdminLiveBeach);
const AdminPricing = screen("beach_BeachAdmin", (m) => m.AdminPricing);
const AdminPrivacy = screen("privacy_AdminPrivacy", (m) => m.AdminPrivacy);
const AdminProducts = screen("beach_BeachAdmin", (m) => m.AdminProducts);
const AdminRbac = screen("AdminRbac", (m) => m.AdminRbac);
const AdminToday = screen("today_Today", (m) => m.AdminToday);
const AdminUsers = screen("users_AdminUsers", (m) => m.AdminUsers);
const CA_CashierIssue = screen("cashier", (m) => m.CashierIssue);
const CA_CashierRegister = screen("cashier", (m) => m.CashierRegister);
const CA_CashierTransactions = screen("cashier", (m) => m.CashierTransactions);
const CO_Checkout = screen("Checkout", (m) => m.Checkout);
const CO_Confirmation = screen("Checkout", (m) => m.Confirmation);
const CT_ControllerScan = screen("controller", (m) => m.ControllerScan);
const CW_CustomerWizard = screen("CustomerWizard", (m) => m.CustomerWizard);
const C_CustomerAccount = screen("customer", (m) => m.CustomerAccount);
const C_CustomerBookings = screen("customer", (m) => m.CustomerBookings);
const C_CustomerHome = screen("customer_CustomerHome", (m) => m.CustomerHome);
const C_CustomerWallet = screen("customer", (m) => m.CustomerWallet);
const CallCenterIncidents = screen("incidents_CallCenterIncidents", (m) => m.CallCenterIncidents);
const CallCenterRefunds = screen("bookings_CallCenterRefunds", (m) => m.CallCenterRefunds);
const ControllerBeach = screen("ControllerBeach", (m) => m.ControllerBeach);
const DocsPayments = screen("accountant_DocsPayments", (m) => m.DocsPayments);
const MonthEnd = screen("accountant_MonthEnd", (m) => m.MonthEnd);
const NewBooking = screen("bookings_NewBooking", (m) => m.NewBooking);
const PO_PlatformOnboarding = screen("tenant_PlatformOverviews", (m) => m.PlatformOnboarding);
const PO_PlatformSuperAdmin = screen("tenant_PlatformOverviews", (m) => m.PlatformSuperAdmin);
const PO_PlatformTenants = screen("tenant_PlatformOverviews", (m) => m.PlatformTenants);
const PP_PassPurchase = screen("PassPurchase", (m) => m.PassPurchase);
const P_PlatformCompliance = screen("platform", (m) => m.PlatformCompliance);
const P_PlatformLanding = screen("platform", (m) => m.PlatformLanding);
const P_PlatformVerticals = screen("platform", (m) => m.PlatformVerticals);
const PlatformIncidents = screen("incidents_PlatformIncidents", (m) => m.PlatformIncidents);
const PlatformRevenue = screen("tenant_PlatformRevenue", (m) => m.PlatformRevenue);
const TenantPage = screen("tenant_TenantPage", (m) => m.TenantPage);

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
  for (const k of PERSONA_MODULES[persona] ?? []) void load(k).catch(() => undefined);
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
  if (k) void load(k).catch(() => warmed.delete(key));
  else prefetchPersona(persona);
}
