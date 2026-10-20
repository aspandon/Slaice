import { useMemo, useState } from "react";
import { useTenantFeatures } from "../../lib/useFeatures";
import { ADD_EXTRAS_LABEL, extrasPhrase } from "../../domain/features";
import { useGuestRecord } from "../../lib/useGuestRecord";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, EmptyState, ErrorState, Field, Modal, Stepper, Tabs, CardGridSkeleton, ActionsMenu, useLongPress, type MenuAction } from "../../components/ui";
import { DateInput } from "../../components/ui/DateInput";
import { WalletButtons, WalletSheetFor, otherWallets } from "../../components/WalletPass";
import { QR, Sparkline } from "../../components/charts";
import { qrCode } from "../../domain/entry";
import { useApp, useMoney, useT } from "../../app/store";
import { ZONES, todayISO } from "../../data/beach";
import { addDays, fmtDay, fmtWeekday } from "../../domain/period";
import { PARKING_PRICE } from "../../domain/pricing";
import { ARRIVAL_WINDOW, cancelDeadline, fmtDeadline, refundQuote, type Visit, type VisitLine, type VisitStatus } from "../../domain/visits";
import { PROFILE, type InvoiceRequest } from "../../domain/account";
import { emptyInvoice, invoiceAddress, invoiceErrors, normalVatNo, type InvoiceDetails } from "../../domain/invoiceDetails";
import { InvoiceFields } from "./InvoiceFields";
import type { CustomerDocument } from "../../domain/types";
import { useEntry } from "../../lib/useEntry";
import { ArrivalBadge } from "../../components/ArrivalBadge";
import { useVisits, guestNow } from "../../lib/useVisits";
import { useExtras } from "../../lib/useExtras";
import { useLiveSlots } from "../../lib/useLiveSlots";
import { ReceiptModal } from "./CustomerDocs";
import { FullscreenQR, downloadVisitIcs, invoiceForVisit, receiptForVisit, visitPass } from "./VisitTicket";
import { ShareSheet } from "./ShareBooking";
import { RevealLines } from "../../components/TextFx";

/* ============ MY BOOKINGS (AENR-572) ============
   One card per visit — date, zone, sets, tickets, parking, locker, total —
   with Today pinned first. Self-service on each upcoming visit: show the QR,
   move the date, add extras, cancel inside the window (refund to the card or
   as beach credit), resend the QR; every visit opens its receipt (AENR-573). */

const SEASON_END = "2026-09-30";
const CHIP: Record<VisitStatus, { tone: string; label: string }> = {
  today: { tone: "success", label: "Today" },
  upcoming: { tone: "info", label: "Upcoming" },
  used: { tone: "neutral", label: "Used" },
  cancelled: { tone: "critical", label: "Cancelled" },
};
type Dialog =
  | { kind: "qr"; v: Visit }
  | { kind: "full"; v: Visit }
  | { kind: "receipt"; v: Visit; doc: CustomerDocument; issued?: boolean }
  | { kind: "invoice"; v: Visit }
  | { kind: "move"; v: Visit }
  | { kind: "extras"; v: Visit }
  | { kind: "cancel"; v: Visit }
  | { kind: "share"; v: Visit };

export function CustomerBookings() {
  const money = useMoney();
  const { go, toast, account } = useApp();
  const t = useT();
  const { status, refetch, visits, policy } = useVisits();
  const [filter, setFilter] = useState("upcoming");
  const [dlg, setDlg] = useState<Dialog | null>(null);
  const close = () => setDlg(null);

  const shown = visits.filter((v) =>
    filter === "upcoming" ? v.status === "today" || v.status === "upcoming" : filter === "past" ? v.status === "used" : v.status === "cancelled",
  );
  const used = visits.filter((v) => v.status === "used");
  const spent = used.reduce((a, v) => a + v.total, 0);
  // The same favourite zone as Home and the admin profile (AENR-644).
  const fav = useGuestRecord().favouriteZone ?? "—";
  const count = (f: string) =>
    visits.filter((v) => (f === "upcoming" ? v.status === "today" || v.status === "upcoming" : f === "past" ? v.status === "used" : v.status === "cancelled")).length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h1 className="sr-only">{t("My bookings")}</h1>
      {/* Season in review — from the guest's own visits. Light glass like the rest of the
          guest app, not a dark band (AENR-688). Only once there is a visit to review (AENR-778). */}
      {used.length > 0 && <Card className="overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white grid place-items-center shrink-0"><Icon.sparkles size={18} /></span>
            <div className="min-w-0">
              <div className="text-guest-over font-semibold uppercase tracking-wider text-teal-700">{t("Your season in review")}</div>
              <RevealLines className="mt-0.5 font-display font-bold text-guest-head text-navy-900">{t("You've had a sunny summer, Elena ☀️")}</RevealLines>
              <div className="text-guest-meta text-slate-600 mt-0.5">{used.length} {t("visits")} · {t("favourite zone")} <b className="text-navy-900">{fav}</b></div>
            </div>
          </div>
          <div className="flex items-center gap-5 shrink-0 sm:pl-0 pl-[52px]">
            <div className="text-center"><div className="text-2xl font-bold font-display tnum text-navy-900">{used.length}</div><div className="text-guest-caption text-slate-500">{t("visits")}</div></div>
            <div className="text-center"><div className="text-2xl font-bold font-display tnum text-navy-900">{money(spent)}</div><div className="text-guest-caption text-slate-500">{t("spent")}</div></div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="w-28"><Sparkline data={[1, 2, 1, 3, 2, 4, 3, 5]} color="#0D9488" width={112} height={36} /><div className="text-guest-caption text-slate-500 text-center mt-1">{t("visits / month")}</div></div>
          </div>
        </div>
      </Card>}

      <div className="flex items-center justify-between gap-2 flex-wrap rounded-2xl glass-card-solid p-1.5">
        <Tabs tabs={[["upcoming", `${t("Upcoming")} ${count("upcoming")}`], ["past", `${t("Past")} ${count("past")}`], ["cancelled", `${t("Cancelled")} ${count("cancelled")}`]]} value={filter} onChange={setFilter} />
        {account.credit.balance > 0 && (
          <button type="button" onClick={() => go("customer", "wallet")} className="text-guest-meta font-semibold text-teal-700 hover:underline px-2">
            {t("Beach credit")} {money(account.credit.balance, true)} →
          </button>
        )}
      </div>

      {status === "loading" ? (
        <CardGridSkeleton count={2} className="grid gap-3" />
      ) : status === "error" ? (
        <ErrorState compact body={t("We couldn't load your bookings.")} onRetry={refetch} />
      ) : shown.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={Icon.grid}
            title={filter === "upcoming" ? t("No upcoming visits") : filter === "past" ? t("No past visits yet") : t("Nothing cancelled")}
            body={filter === "upcoming" ? t("Plan a visit for this weekend — your QR and receipt will be here.") : t("Visits move here once they are over.")}
            action={filter === "upcoming" ? <Btn variant="teal" icon={Icon.sparkles} onClick={() => go("customer", "plan")}>{t("Plan a visit")}</Btn> : undefined}
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {shown.map((v) => (
            <li key={v.key}>
              <VisitCard v={v} deadline={cancelDeadline(v.date, policy)} onOpen={setDlg} />
            </li>
          ))}
        </ul>
      )}

      {dlg?.kind === "qr" && (
        <Modal open onClose={close} title={`${t("Entry QR")} · ${dlg.v.refs[0]}`}>
          <div className="text-center">
            <button type="button" onClick={() => setDlg({ kind: "full", v: dlg.v })} className="mx-auto grid place-items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" aria-label={t("Show the QR full screen")}>
              <QR size={200} seed={qrCode(dlg.v.refs[0])} />
            </button>
            <div className="mt-2 text-guest-caption text-slate-600">{t("Tap the code to show it full screen at the gate.")}</div>
            <WalletButtons className="mt-4 pt-4 border-t border-slate-100" pass={visitPass(dlg.v)} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Btn variant="teal" icon={Icon.send} onClick={() => setDlg({ kind: "share", v: dlg.v })}>{t("Share")}</Btn>
              <Btn variant="outline" icon={Icon.mail} onClick={() => toast(t("QR re-sent to your e-mail."), { tone: "success" })}>{t("Resend by e-mail")}</Btn>
            </div>
          </div>
        </Modal>
      )}
      {dlg?.kind === "full" && <FullscreenQR code={dlg.v.refs[0]} caption={`${fmtWeekday(dlg.v.date)} ${fmtDay(dlg.v.date)}${dlg.v.sets.length ? ` · ${dlg.v.sets.join(", ")}` : ""}`} onClose={() => setDlg({ kind: "qr", v: dlg.v })} />}
      {dlg?.kind === "receipt" && (
        <ReceiptModal
          doc={dlg.doc}
          issued={dlg.issued}
          onClose={close}
          extra={!account.invoices.some((i) => i.visitKey === dlg.v.key) && dlg.v.status !== "cancelled" ? <Btn variant="outline" icon={Icon.building} onClick={() => setDlg({ kind: "invoice", v: dlg.v })}>{t("Request an invoice")}</Btn> : undefined}
        />
      )}
      {dlg?.kind === "invoice" && <InvoiceDialog v={dlg.v} onClose={close} onIssued={(doc) => setDlg({ kind: "receipt", v: dlg.v, doc, issued: true })} />}
      {dlg?.kind === "move" && <MoveDialog v={dlg.v} onClose={close} />}
      {dlg?.kind === "extras" && <ExtrasDialog v={dlg.v} onClose={close} />}
      {dlg?.kind === "cancel" && <CancelDialog v={dlg.v} onClose={close} />}
      {dlg?.kind === "share" && <ShareSheet v={dlg.v} onClose={close} />}
    </div>
  );
}

function VisitCard({ v, deadline, onOpen }: { v: Visit; deadline: string; onOpen: (d: Dialog) => void }) {
  const money = useMoney();
  const t = useT();
  const { account, toast } = useApp();
  const live = v.status === "today" || v.status === "upcoming";
  const inWindow = guestNow() < deadline;
  const chip = CHIP[v.status];
  const invoice = account.invoices.find((i) => i.visitKey === v.key);
  // Where the group stands at the gate today (follow-up to AENR-715): In progress while part of it is in.
  const entry = useEntry();
  const eb = v.status === "today" ? entry.find(v.refs[0]) : undefined;
  const gate = eb ? entry.stateOf(eb, v.date) : null;
  // One primary action on the card (Show QR, or the receipt once the day is over); the rest in "…" (AENR-617).
  const [menu, setMenu] = useState(false);
  const press = useLongPress(() => setMenu(true));
  const openDoc = () => onOpen({ kind: "receipt", v, doc: invoice ? invoiceForVisit(v, invoice) : receiptForVisit(v) });
  const [walletKind, setWalletKind] = useState<"apple" | "google" | null>(null);
  // One QR for the group (AENR-715): share it first — the people coming along get their own pass.
  const [sharing, setSharing] = useState(false);
  const actions: MenuAction[] = [
    ...(live ? [{ id: "share", label: t("Share with your group"), icon: Icon.send, onSelect: () => setSharing(true) }] : []),
    ...(live ? [{ id: "doc", label: invoice ? t("Invoice") : t("Receipt"), icon: Icon.receipt, onSelect: openDoc }] : []),
    ...(live && inWindow ? [{ id: "move", label: t("Move date"), icon: Icon.calendar, onSelect: () => onOpen({ kind: "move", v }) }] : []),
    ...(live ? [{ id: "extras", label: t("Add extras"), icon: Icon.plus, onSelect: () => onOpen({ kind: "extras", v }) }] : []),
    ...(live ? [{ id: "ics", label: t("Add to calendar"), icon: Icon.calendar, onSelect: () => { downloadVisitIcs(v); toast(t("Calendar invite downloaded (.ics)."), { tone: "success" }); } }] : []),
    ...otherWallets().map((k) => ({ id: `wallet-${k}`, label: `${t("Add to")} ${k === "apple" ? "Apple Wallet" : "Google Wallet"}`, icon: Icon.wallet, onSelect: () => setWalletKind(k) })),
    ...(live ? [{ id: "cancel", label: t("Cancel visit"), icon: Icon.x, destructive: true, hint: inWindow ? t("Free until") + " " + fmtDeadline(deadline) : t("No refund now"), onSelect: () => onOpen({ kind: "cancel", v }) }] : []),
  ];
  const what = [
    v.sets.length ? `${t("Sunbeds")} ${v.sets.join(", ")}` : "",
    ...v.tickets.map((x) => `${t("Entry")} ${x}`),
    ...v.parking.map((x) => `${t("Parking")} ${x}`),
    ...v.lockers.map((x) => `${t("Locker")} ${x}`),
  ].filter(Boolean);
  return (
    // Long-press anywhere on the card (touch) opens the same "…" menu.
    <div {...press} className="select-none sm:select-auto">
    <Card surface="raised" className={`p-4 sm:p-5 ${v.status === "today" ? "ring-2 ring-teal-500" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="w-14 shrink-0 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-center py-1.5" aria-hidden>
          <div className="text-guest-over font-semibold uppercase text-slate-500">{fmtWeekday(v.date)}</div>
          <div className="font-display font-bold text-xl text-navy-900 leading-none tnum">{Number(v.date.slice(8, 10))}</div>
          <div className="text-guest-caption text-slate-500">{fmtDay(v.date).split(" ")[1]}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display font-bold text-navy-900">
              {fmtWeekday(v.date)} {fmtDay(v.date)}{v.zone ? ` · ${v.zone}` : ""}
            </h2>
            <Badge tone={chip.tone}>{t(chip.label)}</Badge>
            {gate && gate.arrivals.length > 0 && <ArrivalBadge st={gate} t={t} />}
            {v.movedFrom && <span className="text-guest-caption text-slate-500">{t("moved from")} {fmtDay(v.movedFrom)}</span>}
          </div>
          <p className="mt-0.5 text-guest-meta text-slate-700">{what.join(" · ") || t("Beach day")}</p>
          <p className="mt-1 text-guest-meta text-slate-600">
            {v.status === "cancelled" && v.cancelled
              ? v.cancelled.refund > 0
                ? `${t("Cancelled")} · ${money(v.cancelled.refund, true)} ${v.cancelled.to === "credit" ? t("added to your beach credit") : t("refunded to your card")}`
                : t("Cancelled · no refund")
              : live
                ? `${t("Arrive")} ${ARRIVAL_WINDOW} · ${inWindow ? `${t("free cancellation until")} ${fmtDeadline(deadline)}` : t("the free-cancellation window has closed")}`
                : `${v.refs.join(" · ")}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display font-bold text-navy-900 text-lg tnum">{money(v.total)}</div>
          {invoice && <div className="text-guest-caption text-slate-500">{t("Invoice issued")}</div>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:pl-[68px]">
        {live ? (
          <Btn size="sm" variant="primary" icon={Icon.qr} onClick={() => onOpen({ kind: "qr", v })}>{t("Show QR")}</Btn>
        ) : (
          <Btn size="sm" variant="outline" icon={Icon.receipt} onClick={openDoc}>{invoice ? t("Invoice") : t("Receipt")}</Btn>
        )}
        <WalletButtons compact pass={visitPass(v)} />
        {walletKind && <WalletSheetFor pass={visitPass(v)} kind={walletKind} onClose={() => setWalletKind(null)} />}
        {sharing && <ShareSheet v={v} onClose={() => setSharing(false)} />}
        <ActionsMenu size="sm" className="ml-auto" open={menu} onOpenChange={setMenu} label={`${t("More actions for")} ${fmtWeekday(v.date)} ${fmtDay(v.date)}`} actions={actions} />
      </div>
    </Card>
    </div>
  );
}

/* Move to another day — the same sets if they are free that day. */
function MoveDialog({ v, onClose }: { v: Visit; onClose: () => void }) {
  const t = useT();
  const { toast } = useApp();
  const { move } = useVisits();
  const liveSlots = useLiveSlots("online");
  const [date, setDate] = useState("");
  const zone = ZONES.find((z) => z.name === v.zone);
  const taken = useMemo(() => {
    if (!date || !zone || v.source !== "placed") return [];
    const slots = liveSlots(zone, [date]);
    return v.sets.filter((s) => slots.find((x) => x.id === s)?.state !== "a");
  }, [date, zone, v, liveSlots]);
  const ok = !!date && date !== v.date && taken.length === 0;
  return (
    <Modal open onClose={onClose} title={t("Move to another day")}
      footer={<><Btn variant="ghost" onClick={onClose}>{t("Keep the date")}</Btn><Btn variant="primary" icon={Icon.calendar} disabled={!ok} onClick={() => { move(v, date); toast(`${t("Moved to")} ${fmtWeekday(date)} ${fmtDay(date)} — ${t("your QR stays the same.")}`, { tone: "success" }); onClose(); }}>{t("Move")}</Btn></>}>
      <div className="space-y-3">
        <p className="text-guest-meta text-slate-600">{v.sets.length ? `${t("Your sunbeds")} ${v.sets.join(", ")} ${t("move with you if they are free that day.")}` : t("Your tickets move with you.")} {t("No fee.")}</p>
        <Field label={t("New date")}>
          <DateInput aria-label={t("New date")} value={date} onChange={setDate} min={addDays(todayISO(), 1)} max={SEASON_END} required />
        </Field>
        {taken.length > 0 && <div role="alert" className="rounded-lg bg-amber-50 text-amber-900 ring-1 ring-amber-600/20 px-3 py-2 text-guest-meta">{taken.join(", ")} {t("is taken that day — try another date.")}</div>}
      </div>
    </Modal>
  );
}

/* Add tickets, parking or a locker to a booked visit — charged to the saved card. */
export function ExtrasDialog({ v, only, onClose }: { v: Visit; /** "extras" = locker and parking only (AENR-704). */ only?: "extras"; onClose: () => void }) {
  const money = useMoney();
  const t = useT();
  const { toast, account } = useApp();
  const { addExtra } = useVisits();
  const ex = useExtras();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [parking, setParking] = useState(0);
  const [locker, setLocker] = useState(0);
  const [busy, setBusy] = useState(false);
  // Only the extras the beach sells (AENR-696).
  const { module } = useTenantFeatures();
  const canParking = module("Parking");
  const kind = extrasPhrase(module("Day Locker"), canParking);
  const bank = module("Day Locker") ? ex.banks[0] : undefined;
  const lines: VisitLine[] = [
    ...ex.tickets.filter((c) => (qty[c.id] ?? 0) > 0).map((c) => ({ ref: v.refs[0], kind: "ticket" as const, label: `${ex.ticketLabel(c.id)} ×${qty[c.id]}`, amount: ex.ticketPrice(c.id, v.date) * qty[c.id] })),
    ...(parking ? [{ ref: v.refs[0], kind: "parking" as const, label: `${parking} spot${parking === 1 ? "" : "s"}`, amount: PARKING_PRICE * parking }] : []),
    ...(locker && bank ? [{ ref: v.refs[0], kind: "locker" as const, label: `${bank.name} ×${locker}`, amount: ex.lockerPrice(bank.id, v.date) * locker }] : []),
  ];
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const card = account.savedCard ? `${account.savedCard.brand} ···· ${account.savedCard.last4}` : "Visa ···· 4242";
  return (
    <Modal open onClose={onClose} title={only === "extras" && kind !== "none" ? `${t(ADD_EXTRAS_LABEL[kind])} · ${fmtWeekday(v.date)} ${fmtDay(v.date)}` : `${t("Add to")} ${fmtWeekday(v.date)} ${fmtDay(v.date)}`}
      footer={<><Btn variant="ghost" onClick={onClose}>{t("Cancel")}</Btn><Btn variant="primary" icon={Icon.card} loading={busy} disabled={!lines.length} onClick={() => { setBusy(true); window.setTimeout(() => { lines.forEach((l) => addExtra(v, l)); toast(`${t("Added")} · ${money(total)} ${t("charged to")} ${card}. ${t("Your QR now includes them.")}`, { tone: "success" }); onClose(); }, 900); }}>{`${t("Pay")} ${money(total)}`}</Btn></>}>
      <div className="space-y-2.5">
        {only !== "extras" && <>
        <div className="text-guest-over font-semibold uppercase tracking-wider text-slate-500">{t("Entry tickets")}</div>
        {ex.tickets.map((c) => (
          <div key={c.id} className="flex items-center justify-between text-guest-body">
            <span>{ex.ticketLabel(c.id)} <span className="text-slate-500">{money(ex.ticketPrice(c.id, v.date))}</span></span>
            <Stepper label={`${ex.ticketLabel(c.id)} ${t("tickets")}`} value={qty[c.id] ?? 0} onChange={(n) => setQty((q) => ({ ...q, [c.id]: n }))} />
          </div>
        ))}
        {kind !== "none" && <div className="pt-1 text-guest-over font-semibold uppercase tracking-wider text-slate-500">{t("Extras")}</div>}
        </>}
        {canParking && <div className="flex items-center justify-between text-guest-body"><span>{t("Parking")} <span className="text-slate-500">{money(PARKING_PRICE)}</span></span><Stepper label={t("Parking spots")} value={parking} onChange={setParking} /></div>}
        {bank && <div className="flex items-center justify-between text-guest-body"><span>{bank.name} <span className="text-slate-500">{money(ex.lockerPrice(bank.id, v.date))}</span></span><Stepper label={t("Lockers")} value={locker} onChange={setLocker} /></div>}
        <p className="text-guest-caption text-slate-500 pt-1">{t("Paid with")} {card}. {t("Free cancellation follows your booking.")}</p>
      </div>
    </Modal>
  );
}

/* Cancel inside the window: refund to the card or as beach credit. */
function CancelDialog({ v, onClose }: { v: Visit; onClose: () => void }) {
  const money = useMoney();
  const t = useT();
  const { toast } = useApp();
  const { cancel, policy } = useVisits();
  const q = refundQuote(v.total, v.date, guestNow(), policy);
  const [to, setTo] = useState<"card" | "credit">("card");
  return (
    <Modal open onClose={onClose} title={t("Cancel this visit?")}
      footer={<><Btn variant="ghost" onClick={onClose}>{t("Keep my booking")}</Btn><Btn variant="danger" icon={Icon.x} onClick={() => { cancel(v, to); toast(q.refund > 0 ? `${t("Cancelled")} — ${money(q.refund, true)} ${to === "card" ? t("back to your card in 5–10 days.") : t("added to your beach credit.")}` : t("Cancelled — your sunbeds are free for others."), { tone: "success" }); onClose(); }}>{q.refund > 0 ? `${t("Cancel and refund")} ${money(q.refund, true)}` : t("Cancel without refund")}</Btn></>}>
      <div className="space-y-3 text-guest-meta">
        <p className="text-slate-700"><b className="text-navy-900">{fmtWeekday(v.date)} {fmtDay(v.date)}{v.zone ? ` · ${v.zone}` : ""}</b> · {money(v.total)}</p>
        <div className={`rounded-xl px-3 py-2.5 ring-1 ${q.inWindow ? "bg-emerald-50 ring-emerald-600/20 text-emerald-900" : "bg-amber-50 ring-amber-600/20 text-amber-900"}`}>
          {q.inWindow
            ? `${t("Free cancellation until")} ${fmtDeadline(cancelDeadline(v.date, policy))} — ${t("you get")} ${money(q.refund, true)} (${q.pct}%).`
            : `${t("The free-cancellation window closed")} ${fmtDeadline(cancelDeadline(v.date, policy))}. ${q.refund > 0 ? `${t("You get")} ${money(q.refund, true)} (${q.pct}%).` : t("No refund — cancelling frees your sunbeds for other guests.")}`}
        </div>
        {q.refund > 0 && (
          <fieldset className="space-y-1.5">
            <legend className="text-guest-caption font-semibold text-slate-700 mb-1">{t("Refund to")}</legend>
            {(["card", "credit"] as const).map((k) => (
              <label key={k} className={`flex items-center gap-2.5 rounded-xl ring-1 px-3 min-h-[48px] cursor-pointer ${to === k ? "ring-navy-900 bg-slate-50" : "ring-slate-200"}`}>
                <input type="radio" name="refund-to" className="accent-teal-600 w-4 h-4" checked={to === k} onChange={() => setTo(k)} />
                <span>{k === "card" ? t("My card · 5–10 days") : t("Beach credit · instantly, for your next visit")}</span>
              </label>
            ))}
          </fieldset>
        )}
      </div>
    </Modal>
  );
}

/* An invoice with the company's details instead of the receipt (simulated ΤΠΥ) — the same fields as
   "I need an invoice" at Pay (AENR-714), pre-filled from the details the guest saved. */
function InvoiceDialog({ v, onClose, onIssued }: { v: Visit; onClose: () => void; onIssued: (d: CustomerDocument) => void }) {
  const t = useT();
  const { account, setAccount, toast } = useApp();
  const [inv, setInv] = useState<InvoiceDetails>(() => account.invoiceDetails ?? emptyInvoice(PROFILE.email));
  const [tried, setTried] = useState(false);
  const errors = invoiceErrors(inv);
  const ok = Object.keys(errors).length === 0;
  const issue = () => {
    if (!ok) return setTried(true);
    const vatNo = normalVatNo(inv);
    const req: InvoiceRequest = { id: `INV-${Date.now().toString().slice(-6)}`, visitKey: v.key, company: inv.company.trim(), vatNo, address: invoiceAddress(inv), amount: v.total, at: guestNow(), details: { ...inv, vatNo } };
    setAccount((a) => ({ ...a, invoices: [req, ...a.invoices], invoiceDetails: { ...inv, vatNo } }));
    toast(t("Invoice issued — download it as a PDF."), { tone: "success" });
    onIssued(invoiceForVisit(v, req));
  };
  return (
    <Modal open onClose={onClose} title={t("Request an invoice")}
      footer={<><Btn variant="ghost" onClick={onClose}>{t("Cancel")}</Btn><Btn variant="primary" icon={Icon.receipt} onClick={issue}>{t("Issue invoice")}</Btn></>}>
      <div className="space-y-3">
        <p className="text-guest-meta text-slate-600">{t("For a business trip? We issue an invoice with your company details instead of the receipt.")}</p>
        <InvoiceFields value={inv} onChange={setInv} errors={errors} showErrors={tried} />
      </div>
    </Modal>
  );
}
