import { useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { LifeRing } from "./LifeRing";
import { Modal } from "./ui";
import { Icon } from "../lib/icons";
import type { IconRenderer } from "../lib/icons";
import { useApp, useT } from "../app/store";
import { OPERATOR, TENANT, ZONES } from "../data/beach";

/* ============ "Need a hand?" — the life ring's help sheet (AENR-781) ============
   The life ring in the sea opens a small sheet (a bottom sheet on phones, via
   Modal — focus moves in, Tab stays inside, focus returns to the ring on close):
   call / message / e-mail the beach, today's opening hours, where the lifeguard
   station is and a few FAQs. Contact details and hours come from the site
   tenant's record (the Platform's Locations & hours); the demo beach keeps its
   public help line (OPERATOR). Front-end demo only: the links hand over to the
   phone's dialler / messages / mail app. */

/** Opening state now — real time of day against the tenant's "08:00–20:00". */
function openNow(hours: string): { open: boolean; opens: string; closes: string } | null {
  const m = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/.exec(hours);
  if (!m) return null;
  const d = new Date();
  const now = d.getHours() * 60 + d.getMinutes();
  const from = +m[1] * 60 + +m[2];
  const to = +m[3] * 60 + +m[4];
  return {
    open: now >= from && now < to,
    opens: `${m[1].padStart(2, "0")}:${m[2]}`,
    closes: `${m[3].padStart(2, "0")}:${m[4]}`,
  };
}

const dial = (n: string) => n.replace(/[^\d+]/g, "");

/** The ring, placed by the caller in a slot content never uses, plus the sheet it opens.
 *  Portalled to the end of <body>: the backdrop renders first in the app, and the ring
 *  should come after the page in the tab order, not before the logo and the nav. */
export function HelpRing({ className = "" }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return createPortal(
    <>
      <LifeRing className={className} label={t("Need a hand?")} onClick={() => setOpen(true)} />
      {open && <NeedAHand onClose={() => setOpen(false)} />}
    </>,
    document.body,
  );
}

function NeedAHand({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { platform, beachPricing, zoneMap, page, go } = useApp();
  const tenant = platform.tenants.find((x) => x.id === platform.siteTenant);
  const ops = tenant?.contacts.find((c) => c.role === "operations");
  // The demo beach has a public help line; another previewed tenant answers on its operations contact.
  const own = !tenant || tenant.id === "akti";
  const name = tenant?.name ?? TENANT.name;
  const phone = own ? OPERATOR.phone : (ops?.phone ?? OPERATOR.phone);
  const mobile = ops?.phone ?? OPERATOR.phone;
  const email = own ? OPERATOR.email : (ops?.email ?? OPERATOR.email);
  const hours = tenant?.locations.hours ?? "08:00–20:00";
  const state = openNow(hours);
  // The lifeguard station is a landmark on the beach layout (Beach, Availability & Pricing).
  const guard = beachPricing.landmarks.find((l) => l.kind === "lifeguard");
  const guardZone =
    guard &&
    (zoneMap.find((z) => z.id === guard.zoneId)?.name ??
      ZONES.find((z) => z.id === guard.zoneId)?.name);
  // Inside the booking flow the guest is already on the beach map — and a jump to
  // another page would skip the flow's "Leave?" check — so no page links there.
  const inFlow = page === "plan";
  const leaveFor = (to: string, tip?: string) => {
    onClose();
    go("customer", to, to === "plan" ? { step: "beach", tip } : null);
  };

  return (
    <Modal open onClose={onClose} title={t("Need a hand?")}>
      <div className="space-y-5">
        <p className="text-guest-meta text-slate-600">
          {t("The team at")} <b className="text-navy-900">{name}</b>{" "}
          {t("is on the beach — reach us any way you like.")}
        </p>

        <section aria-label={t("Contact the beach")} className="grid grid-cols-2 gap-2.5">
          <ContactTile
            href={`tel:${dial(phone)}`}
            icon={Icon.phone}
            label={t("Call the beach")}
            sub={phone}
          />
          <ContactTile
            href={`sms:${dial(mobile)}`}
            icon={Icon.chat}
            label={t("Send a message")}
            sub={mobile}
          />
          <a
            href={`mailto:${email}`}
            className="col-span-2 inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl text-guest-meta font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition"
          >
            <Icon.mail size={16} /> {email}
          </a>
        </section>

        <div className="divide-y divide-slate-200/70 rounded-2xl bg-white/70 ring-1 ring-slate-200/70">
          <Row icon={Icon.clock} title={t("Open today")}>
            <span className="tnum">{hours}</span>
            {state && (
              <span
                className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-guest-caption font-semibold ${state.open ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-700"}`}
              >
                <span
                  aria-hidden="true"
                  className={`w-1.5 h-1.5 rounded-full ${state.open ? "bg-teal-500" : "bg-slate-400"}`}
                />
                {state.open
                  ? `${t("Open now")} · ${t("until")} ${state.closes}`
                  : `${t("Closed now")} · ${t("opens")} ${state.opens}`}
              </span>
            )}
          </Row>
          <Row icon={Icon.lifebuoy} title={t("Lifeguard station")}>
            {guardZone
              ? `${t("At the water's edge by the")} ${guardZone} ${t("zone — on duty while the beach is open.")}`
              : t("At the water's edge — on duty while the beach is open.")}
            {!inFlow && (
              <button
                type="button"
                onClick={() =>
                  leaveFor(
                    "plan",
                    guardZone
                      ? `${t("Lifeguard station")}: ${t("by the")} ${guardZone} ${t("zone")}`
                      : undefined,
                  )
                }
                className="mt-1 flex w-fit items-center gap-1 min-h-[36px] rounded-lg -ml-1 px-1 text-guest-meta font-semibold text-teal-800 hover:text-teal-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <Icon.map size={15} /> {t("Show it on the beach map")}
              </button>
            )}
          </Row>
        </div>

        <section aria-labelledby="nah-faq">
          <h3
            id="nah-faq"
            className="text-guest-over font-bold uppercase tracking-wide text-slate-500"
          >
            {t("Quick answers")}
          </h3>
          <div className="mt-2 divide-y divide-slate-200/70">
            <Faq
              q={t("How do I get in?")}
              a={t(
                "Open My bookings and show your QR at the gate — one code covers your whole group.",
              )}
            />
            <Faq
              q={t("Can I move or cancel my visit?")}
              a={t(
                "Yes, in My bookings. Moving to another free day costs nothing; a refund follows your booking's free-cancellation window.",
              )}
            />
            <Faq
              q={t("Lost something on the beach?")}
              a={t(
                "Call or message us with where you were sitting — the team checks the lost-property box at the entrance.",
              )}
            />
          </div>
          {!inFlow && (
            <button
              type="button"
              onClick={() => leaveFor("mybookings")}
              className="mt-2 inline-flex items-center gap-1 min-h-[36px] rounded-lg -ml-1 px-1 text-guest-meta font-semibold text-teal-800 hover:text-teal-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              {t("Go to My bookings")} <Icon.chevR size={15} />
            </button>
          )}
        </section>
      </div>
    </Modal>
  );
}

function ContactTile({
  href,
  icon: I,
  label,
  sub,
}: {
  href: string;
  icon: IconRenderer;
  label: string;
  sub: string;
}) {
  return (
    <a
      href={href}
      className="group flex flex-col items-center gap-1 rounded-2xl bg-white ring-1 ring-slate-200 px-3 py-3 min-h-[88px] text-center hover:ring-teal-400 hover:shadow-soft active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition"
    >
      <span className="w-9 h-9 grid place-items-center rounded-full bg-teal-50 text-teal-700 group-hover:bg-teal-100 transition">
        <I size={18} />
      </span>
      <span className="text-guest-meta font-semibold text-navy-900">{label}</span>
      <span className="text-guest-caption text-slate-500 tnum">{sub}</span>
    </a>
  );
}

function Row({
  icon: I,
  title,
  children,
}: {
  icon: IconRenderer;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 w-8 h-8 shrink-0 grid place-items-center rounded-xl bg-sky-50 text-sky-700">
        <I size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-guest-meta font-semibold text-navy-900">{title}</div>
        <div className="text-guest-meta text-slate-600">{children}</div>
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group py-1">
      <summary className="flex items-center justify-between gap-3 min-h-[44px] cursor-pointer list-none rounded-lg text-guest-meta font-semibold text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 [&::-webkit-details-marker]:hidden">
        {q}
        <Icon.chevD
          size={16}
          className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
        />
      </summary>
      <p className="pb-2 text-guest-meta text-slate-600">{a}</p>
    </details>
  );
}
