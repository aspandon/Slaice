import { Icon } from "../../lib/icons";
import { Badge, Btn, Modal } from "../../components/ui";
import { SlaiceLogo } from "../../components/Brand";
import { ago, fmtWhen, inviteFor, inviteState, usernameOf } from "../../domain/staffInvite";
import type { StaffUser } from "../../domain/types";

/* ============ The invitation e-mail and its status (AENR-718) ============
   Front-end demo: no e-mail leaves the browser. The preview shows what the
   person receives — from Slaice, with their username and a "Set your password"
   button that opens the first sign-in flow. */

export function InviteEmailModal({
  user,
  beach,
  subdomain,
  now,
  onOpenLink,
  onClose,
}: {
  user: StaffUser;
  beach: string;
  subdomain?: string;
  now: number;
  onOpenLink: () => void;
  onClose: () => void;
}) {
  const inv = inviteFor(user);
  const state = inviteState(inv, now);
  const site = subdomain?.includes(".") ? subdomain : `${subdomain ?? "beach"}.slaice.app`;
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title="Invitation e-mail"
      footer={
        <Btn variant="ghost" onClick={onClose}>
          Close
        </Btn>
      }
    >
      <div className="space-y-3">
        <p className="text-[12.5px] text-slate-600 flex items-start gap-1.5">
          <Icon.info size={13} className="mt-px shrink-0" aria-hidden />
          Demo — this is the e-mail {user.name} receives. Nothing was sent; click the button in it
          to walk through their first sign-in.
        </p>
        {/* The e-mail as a mail client shows it */}
        <article
          aria-label={`E-mail to ${user.email}`}
          className="rounded-2xl ring-1 ring-slate-200 bg-white overflow-hidden shadow-soft"
        >
          <header className="px-4 py-3 border-b border-slate-100 text-[12.5px] text-slate-600 space-y-0.5">
            <div>
              <span className="text-slate-500 inline-block w-14">From</span>
              <b className="text-navy-900">Slaice</b> &lt;no-reply@slaice.app&gt;
            </div>
            <div>
              <span className="text-slate-500 inline-block w-14">To</span>
              {user.name} &lt;{user.email}&gt;
            </div>
            <div>
              <span className="text-slate-500 inline-block w-14">Subject</span>
              <b className="text-navy-900">You're invited to {beach} on Slaice</b>
            </div>
            <div>
              <span className="text-slate-500 inline-block w-14">Sent</span>
              {fmtWhen(inv.sentAt)}
              {inv.sends > 1 && ` · resent (${inv.sends}×)`}
            </div>
          </header>
          <div className="px-5 sm:px-8 py-6 bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-md mx-auto text-[14px] text-slate-700 space-y-4">
              <div className="flex items-center gap-2 text-navy-900">
                <SlaiceLogo size={28} withText />
              </div>
              <h3 className="font-display text-xl font-bold text-navy-900">
                Welcome to {beach}, {user.name.split(/\s+/)[0]}
              </h3>
              <p>
                {beach} added you to their team on Slaice. Set your password and a 2-step sign-in
                method to get started.
              </p>
              <dl className="rounded-xl ring-1 ring-slate-200 bg-white px-4 py-3 text-[13px] grid grid-cols-[6rem_1fr] gap-y-1">
                <dt className="text-slate-500">Username</dt>
                <dd className="font-mono font-semibold text-navy-900 break-all">
                  {usernameOf(user)}
                </dd>
                <dt className="text-slate-500">Sign in at</dt>
                <dd className="font-mono text-navy-900 break-all">{site}</dd>
              </dl>
              <div>
                <Btn variant="teal" icon={Icon.lock} onClick={onOpenLink}>
                  Set your password
                </Btn>
              </div>
              <p className="text-[12px] text-slate-500">
                {state === "pending"
                  ? `This link works until ${fmtWhen(inv.expiresAt)} (72 hours). `
                  : state === "expired"
                    ? `This link expired on ${fmtWhen(inv.expiresAt)}. `
                    : "This invitation was cancelled. "}
                You'll choose how to receive sign-in codes: by SMS, by e-mail or with an
                authenticator app. If you weren't expecting this, ignore this e-mail.
              </p>
            </div>
          </div>
        </article>
      </div>
    </Modal>
  );
}

/** The status cell of an Invited user: when it was sent, and Resend / Revoke. */
export function InviteStatus({
  user,
  now,
  onResend,
  onRevoke,
  onOpen,
}: {
  user: StaffUser;
  now: number;
  onResend: () => void;
  onRevoke: () => void;
  onOpen: () => void;
}) {
  const inv = inviteFor(user);
  const state = inviteState(inv, now);
  const link =
    "inline-flex items-center gap-1 min-h-[32px] rounded-lg px-1.5 -mx-0.5 text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition";
  return (
    <div className="leading-tight space-y-0.5">
      {state === "pending" ? (
        <Badge tone="warning">
          <Icon.clock size={10} aria-hidden /> Invited
        </Badge>
      ) : state === "expired" ? (
        <Badge tone="critical">
          <Icon.alert size={10} aria-hidden /> Invite expired
        </Badge>
      ) : (
        <Badge tone="neutral">
          <Icon.x size={10} aria-hidden /> Invite revoked
        </Badge>
      )}
      <div className="text-[11px] text-slate-500">
        {state === "pending"
          ? `Sent ${ago(inv.sentAt, now)}${inv.sends > 1 ? ` · ${inv.sends}× ` : ""}`
          : state === "expired"
            ? `Expired ${ago(inv.expiresAt, now)}`
            : `Revoked ${ago(inv.revokedAt ?? inv.sentAt, now)}`}
      </div>
      <div className="flex flex-wrap items-center gap-x-1">
        <button
          type="button"
          onClick={onResend}
          className={`${link} text-teal-700 hover:bg-teal-50`}
        >
          <Icon.send size={11} aria-hidden /> {state === "revoked" ? "Re-invite" : "Resend"}
        </button>
        {state !== "revoked" && (
          <button
            type="button"
            onClick={onRevoke}
            className={`${link} text-rose-700 hover:bg-rose-50`}
          >
            Revoke
          </button>
        )}
        {state !== "revoked" && (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Open ${user.name}'s invitation e-mail (demo)`}
            className={`${link} text-slate-600 hover:bg-slate-100`}
          >
            <Icon.mail size={11} aria-hidden /> E-mail
          </button>
        )}
      </div>
    </div>
  );
}
