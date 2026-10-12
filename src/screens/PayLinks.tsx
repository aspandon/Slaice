import { useMemo, useState } from "react";
import { Icon } from "../lib/icons";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Stepper,
  Tabs,
} from "../components/ui";
import { SunbedMap } from "../components/SunbedMap";
import { useApp } from "../app/store";
import { ZONES, todayISO } from "../data/beach";
import { CUSTOMERS } from "../data/mock";
import { useExtras } from "../lib/useExtras";
import { addDays, fmtDay } from "../domain/period";
import { resolvePrice } from "../domain/pricing";
import { eur } from "../domain/till";
import {
  DEADLINES,
  PAY_LINK_LABEL,
  deadlineFrom,
  payLinkStatus,
  payUrl,
  type PayLink,
  type PayLinkLine,
  type PayLinkStatus,
} from "../domain/payLink";
import { useDemoNow, useLiveSlots } from "../lib/useLiveSlots";

/* ============ Pay-by-link reservations (AENR-534) ============
   For a guest who isn't at the beach yet: pick sets (and tickets) on the live
   map, reserve them for the guest with a payment deadline and send a Stripe
   payment link by SMS / e-mail. Paying confirms the booking automatically;
   an unpaid reservation releases its sets at the deadline. Stripe, SMS and
   e-mail are simulated — "Open link" shows the guest's payment page. */

const TONE: Record<PayLinkStatus, string> = {
  awaiting: "amber",
  paid: "green",
  expired: "slate",
  cancelled: "red",
};
const hhmm = (iso: string | number) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export function PayLinks() {
  const {
    toast,
    viewAs,
    persona,
    payLinks,
    setPayLinks,
    beachPricing,
    priceRules,
    inventory,
    setInventory,
  } = useApp();
  const ex = useExtras();
  const who =
    viewAs?.name ??
    (persona === "support"
      ? "Support Agent"
      : persona === "callcenter"
        ? "Maria Kontou"
        : "Eleni Markou");
  const now = useDemoNow(5000);
  const liveSlots = useLiveSlots("phone");
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [zoneId, setZoneId] = useState("macaw");
  const [sets, setSets] = useState<{ id: string; zoneId: string }[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [guest, setGuest] = useState({ name: "", phone: "", email: "" });
  const [deadline, setDeadline] = useState(30);
  const [via, setVia] = useState({ sms: true, email: false });
  const [tab, setTab] = useState<"all" | PayLinkStatus>("all");
  const [open, setOpen] = useState<PayLink | null>(null);
  const [err, setErr] = useState("");
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  const slots = useMemo(() => liveSlots(zone, [date]), [liveSlots, zone, date]);
  const picked = new Set(sets.map((s) => s.id));

  const lines: PayLinkLine[] = [
    ...sets.map((s) => {
      const z = ZONES.find((x) => x.id === s.zoneId) ?? zone;
      const slot = liveSlots(z, [date]).find((x) => x.id === s.id) ?? { id: s.id, price: z.from };
      return {
        label: `Sunbed set ${s.id} · ${z.name}`,
        qty: 1,
        unit: resolvePrice(slot, z.id, date, beachPricing, priceRules).price,
        setId: s.id,
        zoneId: z.id,
      };
    }),
    ...ex.tickets.filter((tc) => (qty[tc.id] ?? 0) > 0).map(({ id: c }) => ({
      label: ex.ticketLabel(c),
      qty: qty[c],
      unit: ex.ticketPrice(c, date),
    })),
  ];
  const total = lines.reduce((a, l) => a + l.qty * l.unit, 0);
  const phoneOk = /^\+?[\d\s]{8,}$/.test(guest.phone.trim());
  const emailOk = /^\S+@\S+\.\S+$/.test(guest.email.trim());
  const canSend =
    sets.length > 0 &&
    guest.name.trim().length > 1 &&
    (via.sms || via.email) &&
    (!via.sms || phoneOk) &&
    (!via.email || emailOk);

  const toggle = (id: string, state: string) => {
    setErr("");
    if (picked.has(id)) return setSets((x) => x.filter((s) => s.id !== id));
    if (state !== "a") return setErr(`${id} isn't free on ${fmtDay(date)}.`);
    setSets((x) => [...x, { id, zoneId }]);
  };
  const findGuest = (v: string) => {
    const c = CUSTOMERS.find((x) => `${x.first} ${x.last}` === v || x.phone === v);
    setGuest(
      c ? { name: `${c.first} ${c.last}`, phone: c.phone, email: c.email } : { ...guest, name: v },
    );
  };
  const patch = (id: string, fn: (l: PayLink) => PayLink) =>
    setPayLinks((ls) => ls.map((l) => (l.id === id ? fn(l) : l)));
  const logged = (l: PayLink, text: string): PayLink => ({
    ...l,
    log: [{ at: new Date(now).toISOString(), text }, ...l.log],
  });

  const send = () => {
    const sentVia = [
      ...(via.sms ? (["sms"] as const) : []),
      ...(via.email ? (["email"] as const) : []),
    ];
    const link: PayLink = {
      id: `PL-${4801 + payLinks.length}`,
      date,
      lines,
      total,
      guest: {
        name: guest.name.trim(),
        phone: guest.phone.trim() || undefined,
        email: guest.email.trim() || undefined,
      },
      deadline: deadlineFrom(now, deadline),
      sentVia,
      by: who,
      created: new Date(now).toISOString(),
      log: [],
    };
    const to = [via.sms && guest.phone, via.email && guest.email].filter(Boolean).join(" and ");
    setPayLinks((ls) => [
      logged(link, `Reserved ${sets.map((s) => s.id).join(", ")} · link sent to ${to} · ${who}`),
      ...ls,
    ]);
    toast(
      `Demo — ${sets.map((s) => s.id).join(", ")} reserved for ${link.guest.name} until ${hhmm(link.deadline)}. Link sent to ${to}: ${payUrl(link)}`,
      { tone: "success" },
    );
    setSets([]);
    setQty({});
    setGuest({ name: "", phone: "", email: "" });
  };
  const clock = (mins: number) =>
    setInventory((i) => ({ ...i, clockOffset: mins ? i.clockOffset + mins : 0 }));

  const shown = payLinks.filter((l) => tab === "all" || payLinkStatus(l, now) === tab);
  const count = (s: PayLinkStatus) => payLinks.filter((l) => payLinkStatus(l, now) === s).length;

  return (
    <div className="animate-fade-up max-w-6xl space-y-4">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <Card className="p-4 min-w-0">
          <div className="flex flex-wrap items-end gap-2 mb-3">
            <div
              role="radiogroup"
              aria-label="Date"
              className="flex rounded-xl ring-1 ring-slate-200 overflow-hidden"
            >
              {[
                [today, "Today"],
                [addDays(today, 1), "Tomorrow"],
              ].map(([d, l]) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={date === d}
                  onClick={() => {
                    setDate(d);
                    setSets([]);
                  }}
                  className={`px-3.5 min-h-[44px] text-sm font-semibold ${date === d ? "bg-navy-900 text-white" : "bg-white text-navy-900"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="w-40">
              <Select
                aria-label="Store"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                options={ZONES.map((z) => ({ v: z.id, l: z.name }))}
              />
            </div>
            <span className="ml-auto text-[12px] text-slate-500">
              {sets.length
                ? `${sets.length} set${sets.length === 1 ? "" : "s"} picked`
                : "Tap free sets to reserve"}
            </span>
          </div>
          <SunbedMap
            label={`${zone.name} map for ${fmtDay(date)}`}
            slots={slots}
            selected={picked}
            onToggle={(s) => toggle(s.id, s.state)}
            priceOf={(s) => resolvePrice(s, zone.id, date, beachPricing, priceRules).price}
            landmarks={beachPricing.landmarks.filter((l) => l.zoneId === zone.id)}
          />
          {err && (
            <div
              role="alert"
              className="mt-2 rounded-lg bg-rose-50 text-rose-800 ring-1 ring-rose-600/20 px-3 py-2 text-[12.5px]"
            >
              {err}
            </div>
          )}
          <div className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="sm:col-span-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Entry tickets (optional)
            </div>
            {ex.tickets.map(({ id: c }) => (
              <div key={c} className="flex items-center justify-between text-sm">
                <span>
                  {ex.ticketLabel(c)} <span className="text-slate-500">€{ex.ticketPrice(c, date)}</span>
                </span>
                <Stepper
                  label={`${ex.ticketLabel(c)} tickets`}
                  value={qty[c] ?? 0}
                  onChange={(v) => setQty((q) => ({ ...q, [c]: v }))}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 space-y-3 lg:sticky lg:top-4">
          <h2 className="font-display font-bold text-navy-900">Reserve & send a payment link</h2>
          {lines.length === 0 ? (
            <div className="rounded-xl bg-slate-50 ring-1 ring-dashed ring-slate-300 px-3 py-4 text-center text-[13px] text-slate-600">
              Pick one or more free sets on the map.
            </div>
          ) : (
            <ul className="text-sm divide-y divide-slate-100">
              {lines.map((l) => (
                <li key={l.label} className="py-1.5 flex justify-between gap-2">
                  <span>
                    {l.qty > 1 ? `${l.qty} × ` : ""}
                    {l.label}
                  </span>
                  <span className="tnum font-semibold">{eur(l.qty * l.unit)}</span>
                </li>
              ))}
              <li className="pt-2 flex justify-between font-bold text-navy-900">
                <span>Total · {fmtDay(date)}</span>
                <span className="tnum">{eur(total)}</span>
              </li>
            </ul>
          )}
          <Field label="Guest name" hint="Start typing to pick an existing guest.">
            <Input
              list="paylink-guests"
              value={guest.name}
              onChange={(e) => findGuest(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <datalist id="paylink-guests">
            {CUSTOMERS.map((c) => (
              <option key={c.id} value={`${c.first} ${c.last}`}>
                {c.phone}
              </option>
            ))}
          </datalist>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Mobile">
              <Input
                type="tel"
                value={guest.phone}
                onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))}
                aria-invalid={via.sms && !!guest.phone && !phoneOk}
              />
            </Field>
            <Field label="E-mail">
              <Input
                type="email"
                value={guest.email}
                onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))}
                aria-invalid={via.email && !!guest.email && !emailOk}
              />
            </Field>
          </div>
          <fieldset className="flex flex-wrap gap-4 text-sm">
            <legend className="sr-only">Send the link by</legend>
            <label className="inline-flex items-center gap-2 min-h-[44px]">
              <input
                type="checkbox"
                className="accent-teal-600 w-4 h-4"
                checked={via.sms}
                onChange={(e) => setVia((v) => ({ ...v, sms: e.target.checked }))}
              />{" "}
              SMS
            </label>
            <label className="inline-flex items-center gap-2 min-h-[44px]">
              <input
                type="checkbox"
                className="accent-teal-600 w-4 h-4"
                checked={via.email}
                onChange={(e) => setVia((v) => ({ ...v, email: e.target.checked }))}
              />{" "}
              E-mail
            </label>
          </fieldset>
          <Field label="Pay within">
            <Select
              value={String(deadline)}
              onChange={(e) => setDeadline(Number(e.target.value))}
              options={DEADLINES.map((d) => ({ v: String(d.v), l: d.l }))}
            />
          </Field>
          {sets.length > 0 && !canSend && (
            <div className="text-[12px] text-slate-600">
              {guest.name.trim().length < 2
                ? "Add the guest’s name."
                : !via.sms && !via.email
                  ? "Choose SMS or e-mail."
                  : via.sms && !phoneOk
                    ? "Enter a valid mobile for the SMS."
                    : "Enter a valid e-mail."}
            </div>
          )}
          <Btn variant="primary" size="lg" full icon={Icon.send} disabled={!canSend} onClick={send}>
            Reserve & send link · {eur(total)}
          </Btn>
          <p className="text-[11.5px] text-slate-500">
            The sets show <b>Reserved — awaiting payment</b> everywhere until the guest pays or the
            deadline passes.
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2 justify-between mb-3">
          <h2 className="font-display font-bold text-navy-900">Pay-by-link reservations</h2>
          <div className="flex items-center gap-1.5 text-[12px] text-slate-600">
            <Icon.clock size={13} /> Demo clock <b className="text-navy-900 tnum">{hhmm(now)}</b>
            <Btn size="sm" variant="ghost" onClick={() => clock(30)}>
              +30 min
            </Btn>
            {inventory.clockOffset !== 0 && (
              <Btn size="sm" variant="ghost" onClick={() => clock(0)}>
                Reset
              </Btn>
            )}
          </div>
        </div>
        <Tabs
          scroll
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          tabs={[
            ["all", `All · ${payLinks.length}`],
            ...(["awaiting", "paid", "expired", "cancelled"] as const).map(
              (s): [string, string] => [s, `${PAY_LINK_LABEL[s]} · ${count(s)}`],
            ),
          ]}
        />
        {shown.length === 0 ? (
          <EmptyState
            compact
            icon={Icon.link}
            title={payLinks.length ? "Nothing in this view" : "No payment links yet"}
            body={
              payLinks.length
                ? "Try another status."
                : "Reserve sets for a guest above — the link and its status show here."
            }
          />
        ) : (
          <ul className="mt-3 space-y-2">
            {shown.map((l) => {
              const st = payLinkStatus(l, now);
              const left = new Date(l.deadline).getTime() - now;
              return (
                <li
                  key={l.id}
                  className="rounded-xl ring-1 ring-slate-200 bg-white/70 p-3 flex flex-wrap items-center gap-x-4 gap-y-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold text-navy-900">{l.id}</span>
                      <Badge tone={TONE[st]}>{PAY_LINK_LABEL[st]}</Badge>
                      <span className="text-sm font-semibold text-navy-900">{l.guest.name}</span>
                    </div>
                    <div className="text-[12px] text-slate-600">
                      {l.lines
                        .filter((x) => x.setId)
                        .map((x) => x.setId)
                        .join(", ")}{" "}
                      · {fmtDay(l.date)} · <b className="tnum">{eur(l.total)}</b> ·{" "}
                      {l.sentVia
                        .map((v) => (v === "sms" ? l.guest.phone : l.guest.email))
                        .join(", ")}
                    </div>
                    <div className="text-[11.5px] text-slate-500">
                      {st === "awaiting"
                        ? `Pay by ${hhmm(l.deadline)} · ${Math.max(1, Math.round(left / 60000))} min left`
                        : st === "paid"
                          ? `Paid ${hhmm(l.paidAt ?? l.created)} — booking confirmed, QR & ΑΠΥ sent`
                          : st === "expired"
                            ? `Expired ${hhmm(l.deadline)} — sets released automatically`
                            : "Cancelled — sets released"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {st === "awaiting" && (
                      <Btn size="sm" variant="teal" icon={Icon.globe} onClick={() => setOpen(l)}>
                        Open link
                      </Btn>
                    )}
                    {st === "awaiting" && (
                      <Btn
                        size="sm"
                        variant="outline"
                        icon={Icon.copy}
                        onClick={() => {
                          void navigator.clipboard?.writeText(payUrl(l)).catch(() => undefined);
                          toast(`Copied ${payUrl(l)}`);
                        }}
                      >
                        Copy
                      </Btn>
                    )}
                    {st === "awaiting" && (
                      <Btn
                        size="sm"
                        variant="outline"
                        icon={Icon.send}
                        onClick={() => {
                          patch(l.id, (x) => logged(x, `Link resent · ${who}`));
                          toast(`Demo — link resent to ${l.guest.phone ?? l.guest.email}.`, {
                            tone: "success",
                          });
                        }}
                      >
                        Resend
                      </Btn>
                    )}
                    {(st === "awaiting" || st === "expired") && (
                      <Btn
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          patch(l.id, (x) =>
                            logged(
                              {
                                ...x,
                                deadline: new Date(
                                  Math.max(now, new Date(x.deadline).getTime()) + 30 * 60000,
                                ).toISOString(),
                              },
                              `Deadline extended 30 min · ${who}`,
                            ),
                          );
                          toast(`${l.id}: deadline extended by 30 minutes.`);
                        }}
                      >
                        +30 min
                      </Btn>
                    )}
                    {st === "awaiting" && (
                      <Btn
                        size="sm"
                        variant="ghost"
                        className="text-rose-600"
                        onClick={() => {
                          patch(l.id, (x) =>
                            logged({ ...x, closed: "cancelled" }, `Cancelled · ${who}`),
                          );
                          toast(`${l.id} cancelled — sets released.`);
                        }}
                      >
                        Cancel
                      </Btn>
                    )}
                  </div>
                  {l.log.length > 0 && (
                    <details className="w-full text-[11.5px] text-slate-500">
                      <summary className="cursor-pointer select-none">
                        History ({l.log.length})
                      </summary>
                      <ul className="mt-1 space-y-0.5">
                        {l.log.map((e, i) => (
                          <li key={i}>
                            {hhmm(e.at)} · {e.text}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {open && (
        <GuestPayModal
          link={open}
          onClose={() => setOpen(null)}
          onPaid={() => {
            patch(open.id, (x) =>
              logged(
                { ...x, closed: "paid", paidAt: new Date(now).toISOString() },
                "Guest paid by card — booking confirmed automatically",
              ),
            );
            toast(
              `${open.id} paid — booking confirmed, ${open.guest.name} got the QR and the ΑΠΥ.`,
              { tone: "success" },
            );
            setOpen(null);
          }}
          onDeclined={() => patch(open.id, (x) => logged(x, "Card declined on the payment page"))}
        />
      )}
    </div>
  );
}

/* The guest's side of the link — a simulated Stripe checkout page. */
function GuestPayModal({
  link,
  onClose,
  onPaid,
  onDeclined,
}: {
  link: PayLink;
  onClose: () => void;
  onPaid: () => void;
  onDeclined: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "paying" | "declined">("idle");
  const pay = (ok: boolean) => {
    setPhase("paying");
    window.setTimeout(() => {
      if (ok) return onPaid();
      setPhase("declined");
      onDeclined();
    }, 1200);
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Guest’s payment page (demo)"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Close
          </Btn>
          <Btn variant="outline" disabled={phase === "paying"} onClick={() => pay(false)}>
            Simulate decline
          </Btn>
          <Btn
            variant="primary"
            icon={Icon.card}
            loading={phase === "paying"}
            onClick={() => pay(true)}
          >
            Pay {eur(link.total)}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-lg bg-slate-50 ring-1 ring-slate-200 px-3 py-1.5 font-mono text-[12px] text-slate-600 truncate">
          {payUrl(link)}
        </div>
        <div>
          <div className="text-[12px] text-slate-500">
            Reserved for {link.guest.name} · pay by {hhmm(link.deadline)}
          </div>
          <ul className="mt-1 text-sm divide-y divide-slate-100">
            {link.lines.map((l) => (
              <li key={l.label} className="py-1.5 flex justify-between">
                <span>
                  {l.qty > 1 ? `${l.qty} × ` : ""}
                  {l.label}
                </span>
                <span className="tnum">{eur(l.qty * l.unit)}</span>
              </li>
            ))}
            <li className="pt-2 flex justify-between font-bold text-navy-900">
              <span>Total · {fmtDay(link.date)}</span>
              <span className="tnum">{eur(link.total)}</span>
            </li>
          </ul>
        </div>
        <div className="rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-sm flex items-center gap-2">
          <Icon.card size={16} className="text-slate-400" />{" "}
          <span className="font-mono">4242 4242 4242 4242</span>
          <span className="ml-auto text-slate-500">12/28</span>
        </div>
        {phase === "declined" && (
          <div
            role="alert"
            className="rounded-lg bg-rose-50 text-rose-800 ring-1 ring-rose-600/20 px-3 py-2 text-[12.5px]"
          >
            Card declined — the guest can try another card. The sets stay reserved until the
            deadline.
          </div>
        )}
      </div>
    </Modal>
  );
}
