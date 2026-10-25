import { useEffect } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "../../lib/icons";
import { useT } from "../../app/store";
import { Btn, Card, EmptyState } from "../../components/ui";
import { SlaiceLogo } from "../../components/Brand";
import { VerticalMenuGroup, useGoVertical } from "../VerticalMenu";

/* ============ PARKING VERTICAL (AENR-1138) ============
   The second vertical on the Slaice platform. It has its own address (#/parking/…), shell and
   — next, in the owner's follow-up stories under AENR-1137 — its own roles and capabilities.
   The sign-in, app store and Platform console are the beach's, shared. */

/** What a car park gets from the platform the beaches already run on. */
const SHARED = [
  {
    icon: "building",
    title: "Tenants & onboarding",
    body: "Each car park is a tenant, onboarded and managed in the Platform console.",
  },
  {
    icon: "card",
    title: "Payments",
    body: "Online payment, pay-by-link and the till, with the same payouts.",
  },
  {
    icon: "receipt",
    title: "e-Invoicing & MyDATA",
    body: "Receipts and invoices issued and sent to MyDATA as for the beaches.",
  },
  {
    icon: "qr",
    title: "QR validation",
    body: "A QR on the guest's phone, scanned at the barrier or by staff.",
  },
] as const;

export default function ParkingApp() {
  const t = useT();
  const goVertical = useGoVertical();
  // The tab says which vertical is open.
  useEffect(() => {
    const was = document.title;
    document.title = "Parking · Slaice";
    return () => {
      document.title = was;
    };
  }, []);
  return (
    <div className="w-full px-3 sm:px-5 pt-4 pb-8 min-h-dvh flex flex-col">
      <header className="glass bg-white/95 text-navy-900 rounded-2xl flex items-center gap-2 shadow-soft px-2 sm:px-3 py-1.5">
        <a
          href="#/parking/home"
          aria-label={t("Slaice Parking — home")}
          className="flex items-center gap-2.5 h-11 pr-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          <SlaiceLogo size={30} />
          <span className="font-display font-bold tracking-tight text-[17px] leading-none">
            Slaice
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-navy-900 text-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
            <Icon.car size={12} aria-hidden /> {t("Parking")}
          </span>
        </a>
        <div className="ml-auto">
          <ParkingDemoMenu />
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto pt-6 sm:pt-10">
        <section aria-labelledby="pk-title" className="animate-fade-up">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-teal-700">
            {t("Vertical · Preview")}
          </p>
          <h1
            id="pk-title"
            className="mt-1.5 font-display font-bold text-3xl sm:text-4xl tracking-tight text-navy-900"
          >
            {t("Slaice Parking")}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            {t(
              "Car parks run on the same Slaice platform as the beaches: one back end for tenants, payments, e-invoicing and QR entry. Parking has its own roles and what each of them can do — they come next.",
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Btn icon={Icon.umbrella} variant="outline" onClick={() => goVertical("beach")}>
              {t("Back to the beach")}
            </Btn>
            <Btn
              icon={Icon.building}
              variant="ghost"
              onClick={() => {
                window.location.hash = "#/platform";
              }}
            >
              {t("Open the Platform console")}
            </Btn>
          </div>
        </section>

        <div className="mt-8 sm:mt-10 grid lg:grid-cols-[1.4fr_1fr] gap-4 sm:gap-5 items-start">
          <section aria-labelledby="pk-shared">
            <h2
              id="pk-shared"
              className="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-3"
            >
              {t("Shared with the beach vertical")}
            </h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {SHARED.map((s) => {
                const I = Icon[s.icon];
                return (
                  <li key={s.title}>
                    <Card surface="raised" className="p-4 h-full flex gap-3">
                      <span
                        aria-hidden
                        className="w-10 h-10 shrink-0 rounded-xl bg-teal-100 text-teal-700 grid place-items-center"
                      >
                        {I && <I size={19} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-navy-900">{t(s.title)}</span>
                        <span className="block mt-0.5 text-[13px] leading-snug text-slate-600">
                          {t(s.body)}
                        </span>
                      </span>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
          <section aria-labelledby="pk-roles">
            <h2
              id="pk-roles"
              className="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-3"
            >
              {t("Parking roles")}
            </h2>
            <Card surface="raised">
              <EmptyState
                compact
                icon={Icon.users}
                title={t("Roles are being defined")}
                body={t(
                  "Who works a car park, and what each role can do, is the next step for this vertical.",
                )}
              />
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}

/* The Demo menu in Parking: cross back to the beach, or open the shared Platform console. */
function ParkingDemoMenu() {
  const t = useT();
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={t("Demo menu — switch vertical")}
          className="flex items-center gap-1.5 rounded-xl px-3 h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-600 hover:text-navy-900 hover:bg-slate-100 data-[state=open]:bg-slate-100 data-[state=open]:text-navy-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          <Icon.layers size={14} aria-hidden />
          <span>{t("Demo")}</span>
          <Icon.chevD size={12} aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className="glass w-72 max-w-[calc(100vw-16px)] text-ink rounded-xl p-1.5 z-[60] shadow-float origin-top-right data-[state=open]:animate-scale-in"
        >
          <VerticalMenuGroup />
          <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
          <DropdownMenu.Item
            onSelect={() => {
              window.location.hash = "#/platform";
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer select-none outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100"
          >
            <Icon.building size={15} aria-hidden className="text-slate-500" />
            <span className="font-semibold">{t("Platform / Slaice")}</span>
            <span className="ml-auto text-[11px] text-slate-500">{t("Shared")}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
