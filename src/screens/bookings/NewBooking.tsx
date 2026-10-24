import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ZoneChips, useZoneFree } from "../../components/ZoneChips";
import { bestSets } from "../../domain/bestSets";
import { Icon } from "../../lib/icons";
import { Btn, Card, Field, Input, PageHead, Select, Stepper } from "../../components/ui";
import { DateInput } from "../../components/ui/DateInput";
import { SunbedMap } from "../../components/SunbedMap";
import { useApp } from "../../app/store";
import { ZONES, todayISO } from "../../data/beach";
import { CUSTOMERS } from "../../data/mock";
import { useExtras } from "../../lib/useExtras";
import { addDays, fmtDay } from "../../domain/period";
import { resolvePrice } from "../../domain/pricing";
import { eur } from "../../domain/till";
import {
  DEADLINES,
  PAY_MODE_LABEL,
  deadlineFrom,
  payUrl,
  type PayLink,
  type PayLinkLine,
  type StaffChannel,
  type StaffPayMode,
} from "../../domain/payLink";
import { useDemoNow, useLiveSlots } from "../../lib/useLiveSlots";
import { CardPayModal } from "./CardPayModal";
import { useSiteTerms } from "../../lib/useEconomics";
import { emailOk as isEmail, phoneOk as isPhone } from "../../domain/validate";

/* ============ New booking (AENR-559) ============
   One flow for every booking staff take — by phone, at the call center or for
   a VIP — replacing the separate Manual booking and Pay-by-link pages:
   pick sets (and tickets) on the live map → the guest → how they pay:
   a card now (simulated terminal), a payment link with a deadline, or
   reserved unpaid (pays on arrival). The booking is real at once: it shows in
   Bookings with its channel, and its sets are taken on every map. Payment
   links are tracked in Bookings › Awaiting payment / Expired. */

const MODES: { k: StaffPayMode; icon: keyof typeof Icon; body: string }[] = [
  { k: "card", icon: "card", body: "Key the guest’s card on the phone — confirmed at once." },
  { k: "link", icon: "link", body: "Sets are held until the deadline; paying confirms them." },
  { k: "unpaid", icon: "clock", body: "Booked now, paid at the till on arrival (VIP, regulars)." },
];

const CHANNEL_DEFAULT: Record<string, StaffChannel> = {
  callcenter: "Call Center",
  support: "Support Agent",
  admin: "Phone",
};

export function NewBooking() {
  const { toast, viewAs, persona, payLinks, setPayLinks, beachPricing, priceRules, hint } =
    useApp();
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
  // Opened from a guest profile ("New booking"): start with that guest.
  const pre = hint?.page === "newbooking" || hint?.page === "manual" ? hint.prefill : undefined;
  // The agent's last choices come back (AENR-603): zone, payment mode, how it's sent, deadline.
  const PREFS_KEY = `slaice.newbooking.${persona}`;
  const prefs = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as Partial<{ zoneId: string; mode: StaffPayMode; via: { sms: boolean; email: boolean }; deadline: number }>;
    } catch {
      return {};
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [date, setDate] = useState(today);
  const zoneInfo = useZoneFree(date, "phone");

  // Opened from a free set on Live beach (AENR-651): start with that set picked.
  const [preZone] = useState(() => (hint?.setId ? ZONES.find((z) => liveSlots(z, [today]).some((x) => x.id === hint.setId)) : undefined));
  const [zoneId, setZoneId] = useState(preZone?.id ?? (ZONES.some((z) => z.id === prefs.zoneId) ? (prefs.zoneId as string) : "macaw"));
  // Sets start pre-picked (AENR-635, like the guest's "Choose for me"): the best free
  // sets for the party, side by side, cheapest, nearest the sea.
  const bestFor = (zId: string, d: string, n = 1) => {
    const z = ZONES.find((x) => x.id === zId);
    if (!z) return [];
    const all = liveSlots(z, [d]);
    return (bestSets(all.filter((x) => x.state === "a"), all, n)?.ids ?? []).map((id) => ({ id, zoneId: zId }));
  };
  const [sets, setSets] = useState<{ id: string; zoneId: string }[]>(() =>
    preZone && hint?.setId ? [{ id: hint.setId, zoneId: preZone.id }] : bestFor(zoneId, date),
  );
  const [autoPicked, setAutoPicked] = useState(() => !(preZone && hint?.setId));
  const [qty, setQty] = useState<Record<string, number>>({});
  const [guest, setGuest] = useState({
    name: pre?.name ?? "",
    phone: pre?.phone ?? "",
    email: pre?.email ?? "",
  });
  const [channel, setChannel] = useState<StaffChannel>(CHANNEL_DEFAULT[persona] ?? "Phone");
  const [mode, setMode] = useState<StaffPayMode>(prefs.mode ?? "link");
  const [deadline, setDeadline] = useState(prefs.deadline ?? 30);
  const [via, setVia] = useState(prefs.via ?? { sms: true, email: false });
  // Inline checks show once the field is left (AENR-772).
  const [left, setLeft] = useState({ phone: false, email: false });
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ zoneId, mode, via, deadline }));
    } catch {
      /* storage blocked — defaults next time */
    }
  }, [PREFS_KEY, zoneId, mode, via, deadline]);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<PayLink | null>(null);
  const [err, setErr] = useState("");
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  const slots = useMemo(() => liveSlots(zone, [date]), [liveSlots, zone, date]);
  const picked = new Set(sets.map((s) => s.id));

  const goods: PayLinkLine[] = [
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
    ...ex.tickets
      .filter((tc) => (qty[tc.id] ?? 0) > 0)
      .map(({ id: c }) => ({
        label: ex.ticketLabel(c),
        qty: qty[c],
        unit: ex.ticketPrice(c, date),
      })),
  ];
  // Phone bookings follow the online rules when the tenant's terms say so (AENR-728): the guest service fee
  // per set and per entry ticket — when paid now by card or link; a booking paid at the beach has none.
  const terms = useSiteTerms();
  const feeOn = terms.channels.phone && mode !== "unpaid";
  const fee = feeOn
    ? Math.round(
        goods.reduce((a, l) => a + l.qty * (l.setId ? terms.services.sunbeds.fee : terms.services.tickets.fee), 0) * 100,
      ) / 100
    : 0;
  const lines: PayLinkLine[] = fee > 0 ? [...goods, { label: "Service fee", qty: 1, unit: fee, fee: true }] : goods;
  const total = lines.reduce((a, l) => a + l.qty * l.unit, 0);
  const phoneOk = isPhone(guest.phone);
  const emailOk = isEmail(guest.email);
  const phoneErr = left.phone && guest.phone.trim() && !phoneOk ? "Check the number — 8 to 15 digits, with + and the country code for abroad." : undefined;
  const emailErr = left.email && guest.email.trim() && !emailOk ? "Check the e-mail — it needs a name, @ and a domain, e.g. name@example.com." : undefined;
  const problem =
    sets.length === 0
      ? "Pick one or more free sets on the map."
      : guest.name.trim().length < 2
        ? "Add the guest’s name."
        : !via.sms && !via.email
          ? `Choose how to send the ${mode === "link" ? "payment link" : "gate QR"}.`
          : via.sms && !phoneOk
            ? "Enter a valid mobile for the SMS."
            : via.email && !emailOk
              ? "Enter a valid e-mail."
              : "";

  const toggle = (id: string, state: string) => {
    setErr("");
    setAutoPicked(false);
    if (picked.has(id)) return setSets((x) => x.filter((s) => s.id !== id));
    if (state !== "a") return setErr(`${id} isn’t free on ${fmtDay(date)}.`);
    setSets((x) => [...x, { id, zoneId }]);
  };
  const partySets = Math.max(1, Math.ceil(Object.values(qty).reduce((a, n) => a + n, 0) / 2));
  const pickDate = (d: string) => {
    setDate(d);
    setSets(bestFor(zoneId, d, partySets));
    setAutoPicked(true);
    setErr("");
  };
  const pickZone = (zId: string) => {
    setZoneId(zId);
    if (sets.length === 0 || autoPicked) {
      setSets(bestFor(zId, date, partySets));
      setAutoPicked(true);
    }
  };
  const [ticketsOpen, setTicketsOpen] = useState(false);
  // Start from the caller's number: a known guest fills in the rest (AENR-603).
  const digits = (x: string) => x.replace(/\D/g, "").replace(/^30/, "");
  const known = guest.phone.trim().length >= 8 ? CUSTOMERS.find((c) => digits(c.phone) === digits(guest.phone)) : undefined;
  const onPhone = (v: string) => {
    const c = v.trim().length >= 8 ? CUSTOMERS.find((x) => digits(x.phone) === digits(v)) : undefined;
    setGuest((g) => (c ? { name: `${c.first} ${c.last}`, phone: v, email: c.email } : { ...g, phone: v }));
  };
  const findGuest = (v: string) => {
    const c = CUSTOMERS.find((x) => `${x.first} ${x.last}` === v || x.phone === v);
    setGuest(
      c ? { name: `${c.first} ${c.last}`, phone: c.phone, email: c.email } : { ...guest, name: v },
    );
  };
  const reset = () => {
    setSets(bestFor(zoneId, date));
    setAutoPicked(true);
    setQty({});
    setGuest({ name: "", phone: "", email: "" });
    setDone(null);
  };

  const create = () => {
    const sentVia = [
      ...(via.sms ? (["sms"] as const) : []),
      ...(via.email ? (["email"] as const) : []),
    ];
    const n = payLinks.length;
    const at = new Date(now).toISOString();
    const to = [via.sms && guest.phone, via.email && guest.email].filter(Boolean).join(" and ");
    const ids = sets.map((s) => s.id).join(", ");
    const b: PayLink = {
      id: mode === "link" ? `PL-${4801 + n}` : `BK-${20501 + n}`,
      mode,
      channel,
      date,
      lines,
      total,
      guest: {
        name: guest.name.trim(),
        phone: guest.phone.trim() || undefined,
        email: guest.email.trim() || undefined,
      },
      deadline: mode === "link" ? deadlineFrom(now, deadline) : at,
      ...(mode === "card" ? { closed: "paid" as const, paidAt: at } : {}),
      sentVia,
      by: who,
      created: at,
      log: [
        {
          at,
          text:
            mode === "card"
              ? `Booked ${ids} · card charged · gate QR and ΑΠΥ sent to ${to} · ${who}`
              : mode === "unpaid"
                ? `Reserved ${ids} unpaid (pays on arrival) · gate QR sent to ${to} · ${who}`
                : `Reserved ${ids} · payment link sent to ${to} · ${who}`,
        },
      ],
    };
    setPayLinks((ls) => [b, ...ls]);
    setDone(b);
    setPaying(false);
    toast(
      mode === "card"
        ? `${b.id} confirmed — ${eur(total)} charged, QR sent to ${to}.`
        : mode === "unpaid"
          ? `${b.id} reserved unpaid — QR sent to ${to}; ${b.guest.name} pays on arrival.`
          : `Demo — link sent to ${to}: ${payUrl(b)}`,
      { tone: "success" },
    );
  };

  const hhmm = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  // One column in the order of a phone call (AENR-635): caller, when, zone and sets,
  // tickets, payment — the total and the main button pinned at the bottom.
  const step = (n: number, title: string, aside?: ReactNode) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="w-6 h-6 rounded-full bg-navy-900 text-white text-[12px] font-bold grid place-items-center shrink-0">{n}</span>
      <h2 className="font-display font-bold text-navy-900">{title}</h2>
      {aside && <span className="ml-auto text-[12px] text-slate-500">{aside}</span>}
    </div>
  );
  const ticketCount = Object.values(qty).reduce((a, n) => a + n, 0);
  return (
    <div className="animate-fade-up max-w-3xl space-y-4">
      <PageHead
        sub="Book sets and tickets for a guest by phone or in person — pay now by card, send a payment link, or reserve unpaid."
        actions={
          <a
            href={`#/${persona}/bookings?tab=awaiting`}
            className="inline-flex items-center min-h-[44px] px-1 text-[13px] font-semibold text-teal-700 hover:underline rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            Track payment links in Bookings →
          </a>
        }
      />
      {done ? (
          <Card surface="raised" className="p-5 space-y-3 ">
            <div role="status" className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 grid place-items-center shrink-0">
                <Icon.checkCircle size={22} />
              </span>
              <div>
                <h2 className="font-display font-bold text-navy-900">
                  {done.mode === "card"
                    ? "Booked and paid"
                    : done.mode === "unpaid"
                      ? "Reserved — pays on arrival"
                      : "Reserved — link sent"}
                </h2>
                <p className="text-[13px] text-slate-600">
                  <span className="font-mono font-semibold text-navy-900">{done.id}</span> ·{" "}
                  {done.guest.name} · {fmtDay(done.date)} · {eur(done.total)}
                </p>
              </div>
            </div>
            <p className="text-[12.5px] text-slate-600">
              {done.mode === "link"
                ? `The sets show “Reserved — awaiting payment” everywhere until ${hhmm(done.deadline)}. Paying confirms the booking; otherwise they are released.`
                : done.mode === "unpaid"
                  ? "The sets are booked on every map and flagged Unpaid for the controller and the till."
                  : "Confirmed on every map. The guest has the gate QR and the receipt (ΑΠΥ)."}
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`#/${persona}/bookings?booking=${encodeURIComponent(`#${done.id}`)}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 text-white px-4 min-h-[44px] text-sm font-semibold hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                Open in Bookings
              </a>
              <Btn variant="outline" icon={Icon.plus} onClick={reset}>
                New booking
              </Btn>
            </div>
          </Card>
      ) : (
        <>
          <Card className="p-4 space-y-3">
            {step(1, "Caller")}
            <div className="grid sm:grid-cols-2 gap-3 items-start">
            <Field
              label="Caller’s mobile"
              error={phoneErr}
              hint={
                known ? (
                  <span className="text-emerald-700 font-semibold">Known guest · {known.first} {known.last} — details filled in</span>
                ) : phoneOk ? (
                  "New guest — just add a name."
                ) : (
                  "Start with the number — a known guest fills in the rest."
                )
              }
            >
              <Input type="tel" inputMode="tel" value={guest.phone} onChange={(e) => onPhone(e.target.value)} onBlur={() => setLeft((l) => ({ ...l, phone: true }))} aria-invalid={!!phoneErr} autoComplete="off" />
            </Field>
            <Field label="Guest name" hint={known ? undefined : "Or type a name to pick an existing guest."}>
              <Input
                list="newbooking-guests"
                value={guest.name}
                onChange={(e) => findGuest(e.target.value)}
                autoComplete="off"
              />
            </Field>
            <datalist id="newbooking-guests">
              {CUSTOMERS.map((c) => (
                <option key={c.id} value={`${c.first} ${c.last}`}>
                  {c.phone}
                </option>
              ))}
            </datalist>
            <div>
              <Field label={via.email ? "E-mail" : "E-mail (optional)"} error={emailErr}>
                <Input
                  type="email"
                  value={guest.email}
                  onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))}
                  onBlur={() => setLeft((l) => ({ ...l, email: true }))}
                  aria-invalid={!!emailErr}
                />
              </Field>
            </div>
            {persona === "admin" && (
              <Field label="Booked via">
                <Select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as StaffChannel)}
                  options={[
                    { v: "Phone", l: "Phone" },
                    { v: "Admin", l: "In person / VIP (Admin)" },
                  ]}
                />
              </Field>
            )}

            </div>
          </Card>

          <Card className="p-4">
            {step(2, "When")}
            <div className="flex flex-wrap items-end gap-2">
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
                  onClick={() => pickDate(d)}
                  className={`px-3.5 min-h-[44px] text-sm font-semibold ${date === d ? "bg-navy-900 text-white" : "bg-white text-navy-900"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="w-44">
              <DateInput
                aria-label="Visit date"
                value={date}
                min={today}
                required
                onChange={(d) => d && pickDate(d)}
              />
            </div>
            </div>
          </Card>

          <Card className="p-4 min-w-0 space-y-3">
            {step(3, "Zone and sets", sets.length ? `${sets.length} set${sets.length === 1 ? "" : "s"} · ${sets.map((x) => x.id).join(", ")}${autoPicked ? " · picked for you" : ""}` : "Tap free sets to book")}
            <ZoneChips info={zoneInfo} value={zoneId} onChange={pickZone} className="w-full" />
          <SunbedMap staff
            showCodes
            label={`${zone.name} map for ${fmtDay(date)}`}
            slots={slots}
            selected={picked}
            onToggle={(s) => toggle(s.id, s.state)}
            priceOf={(s) => resolvePrice(s, zone.id, date, beachPricing, priceRules).price}
          />
            <p className="text-[11.5px] text-slate-500">Outline = free · solid = booked · striped = held · teal = picked. {autoPicked ? "The best free set is picked for you — tap to change." : ""}</p>
          {err && (
            <div
              role="alert"
              className="mt-2 rounded-lg bg-rose-50 text-rose-800 ring-1 ring-rose-600/20 px-3 py-2 text-[12.5px]"
            >
              {err}
            </div>
          )}
          </Card>

          <Card className="p-4">
            {step(4, "Entry tickets", ticketCount ? `${ticketCount} ticket${ticketCount === 1 ? "" : "s"}` : "optional")}
            {ticketsOpen || ticketCount > 0 ? (
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {ex.tickets.map(({ id: c }) => (
              <div key={c} className="flex items-center justify-between text-sm">
                <span>
                  {ex.ticketLabel(c)}{" "}
                  <span className="text-slate-500">€{ex.ticketPrice(c, date)}</span>
                </span>
                <Stepper
                  label={`${ex.ticketLabel(c)} tickets`}
                  value={qty[c] ?? 0}
                  onChange={(v) => setQty((q) => ({ ...q, [c]: v }))}
                />
              </div>
            ))}
              </div>
            ) : (
              <button type="button" onClick={() => { setTicketsOpen(true); setQty((q) => ({ ...q, [ex.tickets[0]?.id ?? "adult"]: sets.length * 2 || 2 })); }}
                className="w-full flex items-center gap-2 rounded-xl ring-1 ring-dashed ring-slate-300 px-3 py-2.5 text-left text-[13px] text-slate-700 hover:ring-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                <Icon.plus size={14} className="text-teal-700" /> Add entry tickets <span className="text-slate-500">· {sets.length * 2 || 2} for {sets.length || 1} set{sets.length === 1 ? "" : "s"}, change after</span>
              </button>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            {step(5, "Payment")}
            <fieldset>
              <legend className="text-[12px] font-semibold text-slate-700 mb-1.5">Payment</legend>
              <div className="space-y-1.5">
                {MODES.map((m) => {
                  const I = Icon[m.icon];
                  const on = mode === m.k;
                  return (
                    <label
                      key={m.k}
                      className={`flex items-start gap-2.5 rounded-xl px-3 py-2 cursor-pointer ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-500 ${on ? "ring-navy-900 bg-slate-50" : "ring-slate-200 hover:bg-slate-50"}`}
                    >
                      <input
                        type="radio"
                        name="newbooking-pay"
                        className="sr-only"
                        checked={on}
                        onChange={() => setMode(m.k)}
                      />
                      <I
                        size={16}
                        className={`mt-0.5 shrink-0 ${on ? "text-navy-900" : "text-slate-500"}`}
                      />
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-navy-900">
                          {PAY_MODE_LABEL[m.k]}
                        </span>
                        <span className="block text-[12px] text-slate-600 leading-snug">
                          {m.body}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className={`ml-auto mt-1 w-4 h-4 rounded-full ring-2 shrink-0 ${on ? "ring-navy-900 bg-navy-900 shadow-[inset_0_0_0_3px_white]" : "ring-slate-300"}`}
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="flex flex-wrap items-center gap-x-4 text-sm">
              <legend className="text-[12px] font-semibold text-slate-700">
                {mode === "link" ? "Send the payment link by" : "Send the gate QR by"}
              </legend>
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
            {mode === "link" && (
              <Field label="Pay within">
                <Select
                  value={String(deadline)}
                  onChange={(e) => setDeadline(Number(e.target.value))}
                  options={DEADLINES.map((d) => ({ v: String(d.v), l: d.l }))}
                />
              </Field>
            )}
          </Card>

          {/* Pinned: what it costs and the one button (AENR-635). */}
          {/* On a scrim down to the screen edge (AENR-738): the map no longer shows below or through it. */}
          <div className="scrim-bottom sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] md:bottom-0 z-20 pt-4 pb-3 pointer-events-none">
            <div className="glass-card-solid bg-white pointer-events-auto rounded-2xl shadow-float p-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-navy-900 text-xl tnum leading-tight">
                  {eur(total)}
                  {fee > 0 && <span className="ml-2 font-sans text-[12px] font-medium text-slate-500">incl. service fee {eur(fee)}</span>}
                </div>
                <div className="text-[12px] text-slate-600 truncate">
                  {problem || `${lines.map((l) => `${l.qty > 1 ? `${l.qty} × ` : ""}${l.label}`).join(" · ")} · ${fmtDay(date)}`}
                </div>
              </div>
              <div className="w-full sm:w-auto">
            <Btn
              variant="primary"
              size="lg"
              full
              icon={mode === "card" ? Icon.card : mode === "link" ? Icon.send : Icon.lock}
              disabled={!!problem}
              onClick={() => (mode === "card" ? setPaying(true) : create())}
            >
              {mode === "card"
                ? `Charge card · ${eur(total)}`
                : mode === "link"
                  ? `Reserve & send link · ${eur(total)}`
                  : `Reserve unpaid · ${eur(total)}`}
            </Btn>
              </div>
            </div>
          </div>
        </>
      )}

      {paying && (
        <CardPayModal
          title="Card payment (demo terminal)"
          note={`Card taken by ${who} for ${guest.name.trim()} · ${channel}`}
          lines={lines}
          total={total}
          date={date}
          onClose={() => setPaying(false)}
          onPaid={create}
        />
      )}
    </div>
  );
}
