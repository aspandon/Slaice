import type { ReactElement } from "react";
import type { PersonaId } from "./domain/types";
import * as C from "./screens/customer";
import * as CW from "./screens/CustomerWizard";
import * as CO from "./screens/Checkout";
import * as A from "./screens/admin";
import * as CA from "./screens/cashier";
import * as CT from "./screens/controller";
import * as AC from "./screens/accountant";
import * as P from "./screens/platform";

const MAP: Record<string, () => ReactElement> = {
  // customer
  "customer.home": () => <C.CustomerHome />,
  "customer.plan": () => <CW.CustomerWizard />,
  "customer.book": () => <C.CustomerBooking />,
  "customer.ticket": () => <C.CustomerTicket />,
  "customer.locker": () => <C.CustomerLocker />,
  "customer.parking": () => <C.CustomerParking />,
  "customer.mybookings": () => <C.CustomerBookings />,
  "customer.mydocs": () => <C.CustomerDocs />,
  "customer.checkout": () => <CO.Checkout />,
  "customer.confirm": () => <CO.Confirmation />,
  // admin
  "admin.dashboard": () => <A.AdminDashboard />,
  "admin.availability": () => <A.AdminAvailability />,
  "admin.map": () => <A.AdminMapEditor />,
  "admin.bookings": () => <A.AdminBookings />,
  "admin.manual": () => <A.AdminManual />,
  "admin.users": () => <A.AdminUsers />,
  "admin.reporting": () => <A.AdminReporting />,
  "admin.refunds": () => <A.AdminRefunds />,
  "admin.privacy": () => <A.AdminPrivacy />,
  "admin.communicate": () => <A.AdminCommunicate />,
  // cashier
  "cashier.issue": () => <CA.CashierIssue />,
  "cashier.redeem": () => <CA.CashierRedeem />,
  "cashier.register": () => <CA.CashierRegister />,
  "cashier.locker": () => <CA.CashierLocker />,
  // controller
  "controller.scan": () => <CT.ControllerScan />,
  // accountant
  "accountant.invoicing": () => <AC.AccountantInvoicing />,
  "accountant.commission": () => <AC.AccountantCommission />,
  // platform
  "platform.tenants": () => <P.PlatformTenants />,
  "platform.onboarding": () => <P.PlatformOnboarding />,
  "platform.superadmin": () => <P.PlatformSuperAdmin />,
  "platform.compliance": () => <P.PlatformCompliance />,
  "platform.verticals": () => <P.PlatformVerticals />,
  "platform.landing": () => <P.PlatformLanding />,
};

export function routeFor(persona: PersonaId, page: string): ReactElement {
  const fn = MAP[`${persona}.${page}`];
  return fn ? fn() : <A.AdminDashboard />;
}
