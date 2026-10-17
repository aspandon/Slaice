import { useId, useState, type ReactNode } from "react";
import { Icon, type IconRenderer } from "../../lib/icons";
import { Btn, Field, Input, Modal } from "../../components/ui";
import { QR } from "../../components/charts";
import { useApp } from "../../app/store";
import {
  DEMO_CODE,
  MAX_CODE_TRIES,
  TWO_FACTOR_LABEL,
  authenticatorKey,
  demoCode,
  fmtWhen,
  inviteFor,
  inviteState,
  maskEmail,
  maskPhone,
  passwordRules,
  passwordStrength,
  usernameOf,
  type Strength,
} from "../../domain/staffInvite";
import type { StaffUser, TwoFactorMethod } from "../../domain/types";

/* ============ First sign-in from the invitation link (AENR-718) ============
   What the invited person sees after "Set your password": a password with
   visible rules and a confirmation, a 2-step method (SMS to their phone, an
   e-mail code, or an authenticator app with a QR and a manual key), and a
   6-digit code to prove it works. Then their account is Active.
   Front-end demo: the "sent" code appears in a notification, and 123456 also
   verifies — there is no SMS gateway or TOTP check behind it. */

type Step =
  | { k: "expired" }
  | { k: "revoked" }
  | { k: "password" }
  | { k: "method" }
  | { k: "verify"; method: TwoFactorMethod; code: string; tries: number }
  | { k: "done"; method: TwoFactorMethod };

const STRENGTH: Record<Strength, { label: string; bar: string; w: string }> = {
  empty: { label: "", bar: "bg-slate-200", w: "w-0" },
  weak: { label: "Weak", bar: "bg-rose-500", w: "w-1/3" },
  fair: { label: "Fair", bar: "bg-amber-500", w: "w-2/3" },
  strong: { label: "Strong", bar: "bg-emerald-500", w: "w-full" },
};
const METHOD_ICON: Record<TwoFactorMethod, IconRenderer> = {
  sms: Icon.phone,
  email: Icon.mail,
  app: Icon.shieldCheck,
};

export function FirstSignInModal({
  user,
  beach,
  now,
  onResend,
  onComplete,
  onClose,
}: {
  user: StaffUser;
  beach: string;
  now: number;
  /** Demo: act as the manager and send a fresh link (expired invitation). */
  onResend: () => void;
  onComplete: (method: TwoFactorMethod) => void;
  onClose: () => void;
}) {
  const { toast } = useApp();
  const inv = inviteFor(user);
  const st = inviteState(inv, now);
  const [step, setStep] = useState<Step>(
    st === "expired" ? { k: "expired" } : st === "revoked" ? { k: "revoked" } : { k: "password" },
  );
  const username = usernameOf(user);
  const first = user.name.split(/\s+/)[0];

  /** "Send" a code: a notification stands in for the SMS / e-mail. */
  const send = (method: TwoFactorMethod) => {
    const code = method === "app" ? DEMO_CODE : demoCode();
    if (method === "sms")
      toast(`Demo SMS to ${maskPhone(user.phone)}: ${code} is your Slaice sign-in code.`, {
        tone: "info",
        duration: 15000,
      });
    if (method === "email")
      toast(`Demo e-mail to ${maskEmail(user.email)}: your Slaice code is ${code}.`, {
        tone: "info",
        duration: 15000,
      });
    setStep({ k: "verify", method, code, tries: 0 });
  };

  const stepNo = step.k === "password" ? 1 : step.k === "method" ? 2 : step.k === "verify" ? 3 : 0;
  return (
    <Modal
      open
      onClose={onClose}
      title={step.k === "done" ? "You're all set" : `Welcome, ${first}`}
    >
      {stepNo > 0 && (
        <ol
          aria-label="Steps"
          className="flex items-center gap-1.5 mb-4 text-[11.5px] font-semibold"
        >
          {["Password", "2-step method", "Verify"].map((l, i) => {
            const n = i + 1;
            const cur = n === stepNo;
            const done = n < stepNo;
            return (
              <li
                key={l}
                aria-current={cur ? "step" : undefined}
                className="flex items-center gap-1.5 min-w-0"
              >
                <span
                  className={`w-5 h-5 rounded-full grid place-items-center shrink-0 text-[10.5px] ${done ? "bg-teal-600 text-white" : cur ? "bg-navy-900 text-white" : "bg-slate-200 text-slate-500"}`}
                >
                  {done ? <Icon.check size={11} aria-hidden /> : n}
                </span>
                <span className={`truncate ${cur ? "text-navy-900" : "text-slate-500"}`}>{l}</span>
                {n < 3 && <span aria-hidden className="w-4 sm:w-6 h-px bg-slate-300 shrink-0" />}
              </li>
            );
          })}
        </ol>
      )}
      {step.k === "expired" && (
        <Blocked
          icon={Icon.clock}
          title="This invitation has expired"
          body={`Links work for 72 hours — this one ended on ${fmtWhen(inv.expiresAt)}. Ask your manager at ${beach} to send a new one.`}
          action={
            <Btn
              variant="primary"
              icon={Icon.send}
              onClick={() => {
                onResend();
                setStep({ k: "password" });
              }}
            >
              Resend as the manager (demo)
            </Btn>
          }
          onClose={onClose}
        />
      )}
      {step.k === "revoked" && (
        <Blocked
          icon={Icon.x}
          title="This invitation was cancelled"
          body={`${beach} revoked it, so the link no longer works. If you think this is a mistake, ask your manager to invite you again.`}
          onClose={onClose}
        />
      )}
      {step.k === "password" && (
        <PasswordStep user={user} username={username} onNext={() => setStep({ k: "method" })} />
      )}
      {step.k === "method" && (
        <MethodStep user={user} onBack={() => setStep({ k: "password" })} onNext={send} />
      )}
      {step.k === "verify" && (
        <VerifyStep
          key={step.code}
          user={user}
          username={username}
          step={step}
          onTry={(ok) =>
            ok
              ? setStep({ k: "done", method: step.method })
              : setStep({ ...step, tries: step.tries + 1 })
          }
          onResend={() => send(step.method)}
          onRestart={() => setStep({ ...step, tries: 0 })}
          onBack={() => setStep({ k: "method" })}
        />
      )}
      {step.k === "done" && (
        <div className="text-center py-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center">
            <Icon.checkCircle size={28} aria-hidden />
          </div>
          <p className="mt-3 text-[14px] text-slate-700">
            {first} can now sign in to <b>{beach}</b> as{" "}
            <span className="font-mono font-semibold text-navy-900">{username}</span>, with{" "}
            {TWO_FACTOR_LABEL[step.method].toLowerCase()} as the second step.
          </p>
          <p className="mt-1 text-[12.5px] text-slate-500">
            Their account is now Active in Users &amp; roles.
          </p>
          <Btn variant="primary" className="mt-4" onClick={() => onComplete(step.method)}>
            Done
          </Btn>
        </div>
      )}
    </Modal>
  );
}

function Blocked({
  icon: I,
  title,
  body,
  action,
  onClose,
}: {
  icon: IconRenderer;
  title: string;
  body: string;
  action?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div role="alert" className="text-center py-2">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-600 grid place-items-center">
        <I size={22} aria-hidden />
      </div>
      <h3 className="mt-3 font-display font-bold text-navy-900 text-lg">{title}</h3>
      <p className="mt-1 text-[13.5px] text-slate-600">{body}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {action}
        <Btn variant="ghost" onClick={onClose}>
          Close
        </Btn>
      </div>
    </div>
  );
}

function PasswordStep({
  user,
  username,
  onNext,
}: {
  user: StaffUser;
  username: string;
  onNext: () => void;
}) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [tried, setTried] = useState(false);
  const rules = passwordRules(pw, { name: user.name, username });
  const strength = passwordStrength(rules, pw);
  const allOk = rules.every((r) => r.ok);
  const mismatch = pw2.length > 0 && pw2 !== pw;
  const ids = { rules: useId(), pw2: useId(), form: useId() };
  const s = STRENGTH[strength];
  return (
    <form
      id={ids.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (allOk && pw2 === pw) onNext();
      }}
      className="space-y-3"
    >
      <p className="text-[13px] text-slate-600">
        Your username is <span className="font-mono font-semibold text-navy-900">{username}</span>.
        Choose a password only you know.
      </p>
      {/* A hidden username field lets password managers save the pair. */}
      <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
      <Field label="New password">
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="new-password"
            aria-describedby={ids.rules}
            aria-invalid={tried && !allOk}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-lg text-slate-500 hover:text-navy-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            {show ? <Icon.eyeOff size={17} /> : <Icon.eye size={17} />}
          </button>
        </div>
      </Field>
      <div>
        <div className="flex items-center gap-2" aria-hidden={strength === "empty"}>
          <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 motion-reduce:transition-none ${s.bar} ${s.w}`}
            />
          </div>
          <span className="text-[11.5px] font-semibold text-slate-600 w-12 text-right">
            {s.label}
          </span>
        </div>
        <ul id={ids.rules} className="mt-2 grid sm:grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
          {rules.map((r) => (
            <li
              key={r.id}
              className={`flex items-center gap-1.5 ${r.ok ? "text-emerald-700" : tried ? "text-rose-700" : "text-slate-500"}`}
            >
              {r.ok ? (
                <Icon.checkCircle size={13} aria-hidden />
              ) : (
                <span
                  aria-hidden
                  className="w-[13px] h-[13px] rounded-full ring-1 ring-current shrink-0"
                />
              )}
              {r.label}
              <span className="sr-only">{r.ok ? "— done" : "— not yet"}</span>
            </li>
          ))}
        </ul>
      </div>
      <Field
        label="Confirm password"
        hint={
          (tried || mismatch) && pw2 !== pw ? (
            <span id={ids.pw2} className="text-rose-700">
              {pw2 ? "The passwords don't match." : "Type the password again."}
            </span>
          ) : undefined
        }
      >
        <Input
          type={show ? "text" : "password"}
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
          aria-invalid={(tried || mismatch) && pw2 !== pw}
          aria-describedby={(tried || mismatch) && pw2 !== pw ? ids.pw2 : undefined}
        />
      </Field>
      {tried && !allOk && (
        <p role="alert" className="text-[12.5px] text-rose-700">
          The password doesn't meet every rule yet.
        </p>
      )}
      <div className="flex justify-end pt-1">
        <Btn variant="primary" type="submit" icon={Icon.arrowR}>
          Continue
        </Btn>
      </div>
    </form>
  );
}

function MethodStep({
  user,
  onBack,
  onNext,
}: {
  user: StaffUser;
  onBack: () => void;
  onNext: (m: TwoFactorMethod) => void;
}) {
  const [m, setM] = useState<TwoFactorMethod>("sms");
  const detail: Record<TwoFactorMethod, string> = {
    sms: `A code by text message to ${maskPhone(user.phone)}.`,
    email: `A code by e-mail to ${maskEmail(user.email)}.`,
    app: "Google Authenticator, Microsoft Authenticator, 1Password… Works offline — the most secure.",
  };
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onNext(m);
      }}
      className="space-y-3"
    >
      <fieldset>
        <legend className="text-[13px] text-slate-600 mb-2">
          Each time you sign in, you'll confirm it's you with a 6-digit code. How should it reach
          you?
        </legend>
        <div className="grid gap-2">
          {(["sms", "email", "app"] as const).map((k) => {
            const I = METHOD_ICON[k];
            const on = m === k;
            return (
              <label
                key={k}
                className={`flex items-start gap-3 rounded-xl px-3.5 py-3 cursor-pointer ring-1 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-500 ${on ? "ring-2 ring-teal-500 bg-teal-50/50" : "ring-slate-200 hover:ring-slate-300"}`}
              >
                <input
                  type="radio"
                  name="tfa"
                  value={k}
                  checked={on}
                  onChange={() => setM(k)}
                  className="mt-1 w-4 h-4 accent-teal-600"
                />
                <span
                  className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${on ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  <I size={16} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="font-semibold text-navy-900 text-[14px] flex flex-wrap items-center gap-1.5">
                    {TWO_FACTOR_LABEL[k]}
                    {k === "app" && (
                      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-teal-700">
                        Recommended
                      </span>
                    )}
                  </span>
                  <span className="block text-[12.5px] text-slate-600 leading-snug">
                    {detail[k]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="flex justify-between gap-2 pt-1">
        <Btn variant="ghost" icon={Icon.arrowL} onClick={onBack}>
          Back
        </Btn>
        <Btn variant="primary" type="submit" icon={m === "app" ? Icon.qr : Icon.send}>
          {m === "app" ? "Set up the app" : "Send the code"}
        </Btn>
      </div>
    </form>
  );
}

function VerifyStep({
  user,
  username,
  step,
  onTry,
  onResend,
  onRestart,
  onBack,
}: {
  user: StaffUser;
  username: string;
  step: Extract<Step, { k: "verify" }>;
  onTry: (ok: boolean) => void;
  onResend: () => void;
  onRestart: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const ids = { code: useId(), err: useId() };
  const locked = step.tries >= MAX_CODE_TRIES;
  const left = MAX_CODE_TRIES - step.tries;
  const key = authenticatorKey(`${username}@${user.id}`);
  const submit = () => {
    if (!/^\d{6}$/.test(code)) {
      setErr("Enter the 6 digits.");
      return;
    }
    const ok = code === step.code || code === DEMO_CODE;
    if (!ok) {
      setErr(
        left - 1 > 0
          ? `That code doesn't match. ${left - 1} ${left - 1 === 1 ? "try" : "tries"} left.`
          : "That code doesn't match.",
      );
      setCode("");
    }
    onTry(ok);
  };
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!locked) submit();
      }}
      className="space-y-3"
    >
      {step.method === "app" ? (
        <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-center">
          <div className="justify-self-center rounded-xl ring-1 ring-slate-200 p-2 bg-white">
            <QR size={132} seed={`otpauth://totp/Slaice:${username}`} />
          </div>
          <div className="text-[13px] text-slate-600 space-y-2 min-w-0">
            <p>Scan the code with your authenticator app, or type this key:</p>
            <p className="font-mono text-[14px] font-semibold text-navy-900 tracking-wide break-all bg-slate-50 rounded-lg px-2.5 py-1.5 ring-1 ring-slate-200">
              {key}
            </p>
            <p className="text-[12px] text-slate-500">Account: Slaice · {username}</p>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-slate-600">
          We sent a 6-digit code to{" "}
          <b className="text-navy-900">
            {step.method === "sms" ? maskPhone(user.phone) : maskEmail(user.email)}
          </b>
          . It works for 10 minutes.
        </p>
      )}
      <Field
        label={step.method === "app" ? "Code from the app" : "6-digit code"}
        hint={
          err ? (
            <span id={ids.err} className="text-rose-700">
              {err}
            </span>
          ) : step.method === "app" ? (
            `Demo: there's no real authenticator behind this — enter ${DEMO_CODE}.`
          ) : (
            `Demo: the code is in the notification; ${DEMO_CODE} also works.`
          )
        }
      >
        <Input
          id={ids.code}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setErr("");
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          disabled={locked}
          aria-invalid={!!err}
          aria-describedby={err ? ids.err : undefined}
          className="tnum text-center text-xl tracking-[0.5em] font-semibold max-w-[14rem]"
          placeholder="••••••"
        />
      </Field>
      {locked && (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 ring-1 ring-rose-600/20 px-3 py-2 text-[12.5px] text-rose-800"
        >
          Too many wrong codes.{" "}
          {step.method === "app"
            ? "Check the time on your phone, then try again."
            : "Send a new code to try again."}
        </div>
      )}
      {(step.method !== "app" || locked) && (
        <p className="text-[12.5px] text-slate-600">
          {step.method !== "app" ? "Didn't get it? " : ""}
          <button
            type="button"
            onClick={step.method !== "app" ? onResend : onRestart}
            className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Icon.refresh size={12} aria-hidden />{" "}
            {step.method !== "app" ? "Send a new code" : "Try again"}
          </button>
        </p>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <Btn variant="ghost" icon={Icon.arrowL} onClick={onBack}>
          Other method
        </Btn>
        <Btn variant="primary" type="submit" icon={Icon.check} disabled={locked}>
          Verify
        </Btn>
      </div>
    </form>
  );
}
