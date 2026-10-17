import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Sheet } from "../../components/ui";
import { useApp, useT } from "../../app/store";
import { TENANT, ZONES } from "../../data/beach";
import { PROFILE } from "../../domain/account";
import { fmtDay, fmtWeekday } from "../../domain/period";
import { ARRIVAL_WINDOW, partyFromTickets, type Visit } from "../../domain/visits";
import { buildAllowance, qrCode, type Allowance, type EntryLine } from "../../domain/entry";
import { shareLink, shareTargets, sharedTotal, type SharedBooking } from "../../domain/sharePass";
import { useEntry } from "../../lib/useEntry";
import { guestNow } from "../../lib/useVisits";

/* ============ Share the booking with the group (AENR-715) ============
   The guest sends the people coming along one link — by e-mail, SMS, Viber,
   the phone's own share sheet or a copied link. It opens their entry pass
   (the same booking QR: the group shares one allowance and the gate counts who
   is in), which they can add to Apple or Google Wallet too. The message opens
   in the guest's own app; Slaice sends nothing (demo: nothing leaves the page). */

/** What a visit admits: what the gate will accept for its QR (the booking's allowance), else the visit's own lines. */
function useVisitAllowance(v: Visit): { allowance: Allowance; entered: number } {
  const e = useEntry();
  const { extras } = useApp();
  const b = e.find(v.refs[0]);
  const st = b ? e.stateOf(b, v.date) : null;
  if (st && st.total > 0)
    return { allowance: { sets: st.sets, tickets: st.tickets }, entered: st.entered };
  const zoneOf = (setId: string) => ZONES.find((z) => setId.startsWith(`${z.prefix}-`));
  const lines: EntryLine[] = [
    ...v.sets.map((id): EntryLine => ({ kind: "set", setId: id, zoneId: zoneOf(id)?.id ?? "" })),
    ...Object.entries(partyFromTickets(v.tickets, extras.tickets)).map(
      ([cat, qty]): EntryLine => ({ kind: "tickets", cat, qty }),
    ),
  ];
  const allowance = buildAllowance(lines, {
    zoneName: (id) => ZONES.find((z) => z.id === id)?.name ?? "",
    seatsOf: () => 2,
    ticketLabel: (cat) => extras.tickets.find((t) => t.id === cat)?.short ?? cat,
  });
  return { allowance, entered: 0 };
}

/** The visit as the guest link carries it, plus the message that goes with it. */
export function useShareVisit(v: Visit) {
  const t = useT();
  const { extras } = useApp();
  const { allowance, entered } = useVisitAllowance(v);
  const shared: SharedBooking = {
    ref: qrCode(v.refs[0]),
    date: v.date,
    from: `${PROFILE.first} ${PROFILE.last[0]}.`,
    sets: allowance.sets.map((s) => ({ id: s.setId, zone: s.zone, seats: s.seats })),
    tickets: allowance.tickets.map((x) => ({
      cat: x.cat,
      label: extras.tickets.find((c) => c.id === x.cat)?.name ?? x.label,
      qty: x.qty,
    })),
    entered,
    at: guestNow(),
  };
  const url = shareLink(window.location.href, shared);
  const day = `${fmtWeekday(v.date)} ${fmtDay(v.date)}`;
  const where = shared.sets.map((s) => `${s.zone} ${s.id}`).join(" · ");
  const subject = `${t("Beach day at")} ${TENANT.name} · ${day}`;
  const text = `${t("Beach day at")} ${TENANT.name} — ${day}${where ? `, ${where}` : ""}. ${t("Arrive")} ${ARRIVAL_WINDOW}. ${t("Your entry pass — the same QR for all of us; add it to your wallet:")} ${url}`;
  return { shared, url, subject, text, total: sharedTotal(shared) };
}

/** Copy text, with the old execCommand path where the Clipboard API is blocked. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const TILE =
  "flex items-center gap-3 rounded-2xl bg-white ring-1 ring-slate-200 px-3 min-h-[60px] text-left text-[15px] font-semibold text-navy-900 hover:ring-teal-400 active:scale-[.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500";

export function ShareSheet({ v, onClose }: { v: Visit; onClose: () => void }) {
  const t = useT();
  const { toast } = useApp();
  const s = useShareVisit(v);
  const to = shareTargets(s.text, s.subject);
  const [copied, setCopied] = useState(false);
  const nav = navigator as Navigator & {
    share?: (d: { title: string; text: string; url: string }) => Promise<void>;
  };
  const canShare = typeof nav.share === "function";
  const opened = (app: string) =>
    toast(
      `${t("Opening")} ${app} ${t("with the message and your link — you send it from there.")}`,
      { tone: "info" },
    );
  const copy = async () => {
    const ok = await copyText(s.url);
    setCopied(ok);
    toast(
      ok
        ? t("Link copied — paste it in any chat.")
        : t("Couldn’t copy — select the link and copy it."),
      { tone: ok ? "success" : "error" },
    );
  };
  const native = async () => {
    try {
      await nav.share?.({ title: s.subject, text: s.text, url: s.url });
      toast(t("Shared."), { tone: "success" });
    } catch {
      /* the guest closed the share sheet */
    }
  };
  const sets = s.shared.sets.length;
  return (
    <Sheet open onClose={onClose} title={t("Share with your group")}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl bg-teal-50 ring-1 ring-teal-600/15 p-3">
          <span className="w-10 h-10 rounded-xl bg-teal-600 text-white grid place-items-center shrink-0">
            <Icon.users size={18} />
          </span>
          <p className="text-[13.5px] text-slate-700 leading-snug">
            <b className="text-navy-900">{t("One QR for everyone")}</b> — {s.total}{" "}
            {s.total === 1 ? t("entry") : t("entries")}
            {sets ? ` · ${sets} ${sets === 1 ? t("set") : t("sets")}` : ""}.{" "}
            {t(
              "Each of you can show it at the gate and add it to a wallet; the gate counts who is in.",
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {canShare && (
            <button
              type="button"
              onClick={native}
              className={`${TILE} col-span-2 justify-center bg-navy-900 text-white ring-navy-900 hover:bg-navy-800`}
            >
              <Icon.send size={18} /> {t("Share via…")}
            </button>
          )}
          <a href={to.email} onClick={() => opened(t("your e-mail"))} className={TILE}>
            <span className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 grid place-items-center shrink-0">
              <Icon.mail size={17} />
            </span>
            {t("E-mail")}
          </a>
          <a href={to.sms} onClick={() => opened(t("Messages"))} className={TILE}>
            <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
              <Icon.chat size={17} />
            </span>
            SMS
          </a>
          <a href={to.viber} onClick={() => opened("Viber")} className={TILE}>
            {/* Viber's brand purple behind a phone glyph (no trademark artwork in the demo). */}
            <span className="w-9 h-9 rounded-xl bg-[#7360F2] text-white grid place-items-center shrink-0">
              <Icon.phone size={16} />
            </span>
            Viber
          </a>
          <button type="button" onClick={copy} className={TILE}>
            <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 grid place-items-center shrink-0">
              {copied ? <Icon.check size={17} /> : <Icon.link size={17} />}
            </span>
            {copied ? t("Copied") : t("Copy link")}
          </button>
        </div>

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t("Link to the pass")}
          </span>
          <input
            readOnly
            value={s.url}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 glass-input w-full rounded-xl px-3 py-2.5 text-[13px] font-mono text-slate-700 truncate outline-none focus:ring-2 focus:ring-teal-500/70"
          />
        </label>
        <p className="flex items-start gap-2 text-[12px] text-slate-500 leading-snug">
          <Icon.shield size={14} className="shrink-0 mt-0.5 text-teal-600" />
          {t(
            "The message opens in your own app — Slaice doesn't send it. Anyone with the link can show the QR, so share it only with the people coming.",
          )}
        </p>
      </div>
    </Sheet>
  );
}
