import { useEffect, useId, useRef, useState } from "react";
import type { ClipboardEvent as ReactClipboardEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Icon } from "../lib/icons";
import { Modal, Btn, Input } from "./ui";
import { QR } from "./charts";
import { useApp } from "../app/store";

/* Security flows opened from Account settings. Both are mockup simulations —
   no real backend: they validate input, surface realistic pending/success and
   error states, and toast on completion. */

/* ============ Change password ============ */

// Five-stop scale indexed by the password score (0 = empty/too short … 4).
const STRENGTH = [
  { label: "Too short", bar: "bg-slate-300", text: "text-slate-400" },
  { label: "Weak", bar: "bg-rose-500", text: "text-rose-600" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-600" },
  { label: "Good", bar: "bg-teal-500", text: "text-teal-600" },
  { label: "Strong", bar: "bg-teal-600", text: "text-teal-700" },
];

function PasswordField({ label, value, onChange, autoComplete }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-semibold text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <Input id={id} type={show ? "text" : "password"} value={value} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)} className="pr-11" />
        <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}
          aria-label={show ? "Hide password" : "Show password"}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-lg transition ${show ? "text-teal-600 bg-teal-50" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}>
          <Icon.eye size={16} />
        </button>
      </div>
    </div>
  );
}

function Req({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 text-[12px] transition-colors ${ok ? "text-teal-700" : "text-slate-500"}`}>
      <span className={`w-4 h-4 rounded-full grid place-items-center shrink-0 transition-colors ${ok ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-400"}`}>
        {ok ? <Icon.check size={11} /> : <span className="w-1 h-1 rounded-full bg-current" />}
      </span>
      {children}
    </li>
  );
}

export function ChangePasswordModal({ open, onClose }: { open?: boolean; onClose: () => void }) {
  const { toast } = useApp();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const checks = {
    len: next.length >= 8,
    mixed: /[a-z]/.test(next) && /[A-Z]/.test(next),
    num: /\d/.test(next),
    sym: /[^A-Za-z0-9]/.test(next),
  };
  const score = Number(checks.len) + Number(checks.mixed) + Number(checks.num) + Number(checks.sym);
  const match = confirm.length > 0 && confirm === next;
  const reuse = next.length > 0 && next === current;
  const valid = current.length > 0 && score >= 3 && match && !reuse;

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); setSaving(false); };
  const close = () => { reset(); onClose(); };
  const submit = () => {
    if (!valid) return;
    setSaving(true);
    // Simulate the round-trip, then confirm.
    setTimeout(() => { reset(); onClose(); toast("Password updated.", { tone: "success" }); }, 750);
  };

  return (
    <Modal open={open} onClose={close} title="Change password"
      footer={<>
        <Btn variant="ghost" onClick={close}>Cancel</Btn>
        <Btn variant="primary" icon={Icon.lock} onClick={submit} disabled={!valid} loading={saving}>Update password</Btn>
      </>}>
      <div className="space-y-4">
        <PasswordField label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />

        <div>
          <PasswordField label="New password" value={next} onChange={setNext} autoComplete="new-password" />
          {next.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-1" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? STRENGTH[score].bar : "bg-slate-200"}`} />
                ))}
              </div>
              <div className={`text-[11px] font-semibold ${STRENGTH[score].text}`}>{STRENGTH[score].label} password</div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                <Req ok={checks.len}>8+ characters</Req>
                <Req ok={checks.mixed}>Upper &amp; lowercase</Req>
                <Req ok={checks.num}>A number</Req>
                <Req ok={checks.sym}>A symbol</Req>
              </ul>
              {reuse && (
                <div className="text-[12px] text-rose-600 flex items-center gap-1.5">
                  <Icon.alert size={13} /> New password must differ from the current one.
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {confirm.length > 0 && (
            <div className={`text-[12px] mt-1.5 flex items-center gap-1.5 ${match ? "text-teal-700" : "text-rose-600"}`}>
              {match ? <Icon.check size={13} /> : <Icon.x size={13} />}
              {match ? "Passwords match." : "Passwords don't match yet."}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ============ Enable two-factor (TOTP) ============ */

const SECRET = "JBSWY3DPEHPK3PXP";
const OTPAUTH = `otpauth://totp/Slaice:elena@example.com?secret=${SECRET}&issuer=Slaice`;

// Tiny clipboard helper that flips to a "copied" confirmation for ~1.6s.
function useCopy() {
  const [done, setDone] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    }).catch(() => { /* clipboard blocked — no-op for the mock */ });
  };
  return { done, copy };
}

// Six single-digit boxes with auto-advance, backspace-to-previous, arrow nav
// and paste support.
function OtpInput({ value, onChange, length = 6 }: { value: string; onChange: (v: string) => void; length?: number }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);

  const setAt = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, "").slice(-1);
    const arr = value.split("");
    arr[i] = d;
    onChange(arr.join("").slice(0, length));
    if (d && i < length - 1) refs.current[i + 1]?.focus();
  };
  const onKey = (i: number, e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = value.split("");
      if (arr[i]) { arr[i] = ""; onChange(arr.join("")); }
      else if (i > 0) { arr[i - 1] = ""; onChange(arr.join("")); refs.current[i - 1]?.focus(); }
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };
  const onPaste = (e: ReactClipboardEvent) => {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!txt) return;
    e.preventDefault();
    onChange(txt);
    refs.current[Math.min(txt.length, length - 1)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={onPaste}>
      {Array.from({ length }).map((_, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} value={value[i] || ""}
          onChange={(e) => setAt(i, e.target.value)} onKeyDown={(e) => onKey(i, e)}
          inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={1}
          aria-label={`Digit ${i + 1}`}
          className="glass-input w-11 h-14 sm:w-12 rounded-xl text-center text-2xl font-bold tnum text-navy-900 outline-none transition focus:ring-2 focus:ring-teal-500/70 focus:shadow-glow" />
      ))}
    </div>
  );
}

const rnd4 = () => Math.random().toString(36).slice(2, 6).padEnd(4, "0");

export function Enable2FAModal({ open, onClose }: { open?: boolean; onClose: () => void }) {
  const { toast } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recovery, setRecovery] = useState<string[]>([]);
  const keyCopy = useCopy();
  const codesCopy = useCopy();

  // Mint a fresh set of recovery codes each time the dialog opens.
  useEffect(() => {
    if (open) setRecovery(Array.from({ length: 8 }, () => `${rnd4()}-${rnd4()}`));
  }, [open]);

  const reset = () => { setStep(1); setCode(""); setVerifying(false); setSaved(false); };
  const close = () => { reset(); onClose(); };
  const verify = () => {
    if (code.length < 6) return;
    setVerifying(true);
    setTimeout(() => { setVerifying(false); setStep(3); }, 750);
  };
  const finish = () => { close(); toast("Two-factor authentication enabled.", { tone: "success" }); };
  const downloadCodes = () => {
    const blob = new Blob([recovery.join("\n") + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "slaice-recovery-codes.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const footer = step === 1 ? (
    <>
      <Btn variant="ghost" onClick={close}>Cancel</Btn>
      <Btn variant="primary" icon={Icon.arrowR} onClick={() => setStep(2)}>I&rsquo;ve scanned it</Btn>
    </>
  ) : step === 2 ? (
    <>
      <Btn variant="ghost" onClick={() => { setStep(1); setCode(""); }}>Back</Btn>
      <Btn variant="primary" icon={Icon.check} onClick={verify} disabled={code.length < 6} loading={verifying}>Verify code</Btn>
    </>
  ) : (
    <Btn variant="primary" full icon={Icon.shieldCheck} onClick={finish} disabled={!saved}>Finish setup</Btn>
  );

  return (
    <Modal open={open} onClose={close} title="Enable two-factor authentication" footer={footer}>
      {/* Step indicator */}
      <div className="flex items-center mb-5">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex items-center ${s < 3 ? "flex-1" : ""}`}>
            <span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold transition-colors ${
              s < step ? "bg-teal-600 text-white" : s === step ? "bg-navy-900 text-white" : "bg-slate-200 text-slate-500"
            }`}>{s < step ? <Icon.check size={13} /> : s}</span>
            {s < 3 && <span className={`h-0.5 flex-1 mx-2 rounded-full transition-colors ${s < step ? "bg-teal-600" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Scan this code with an authenticator app — Google Authenticator, Authy, 1Password. Can&rsquo;t scan? Enter the setup key by hand.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="p-3 rounded-2xl ring-1 ring-slate-200 bg-white shrink-0"><QR size={148} seed={OTPAUTH} /></div>
            <div className="min-w-0 flex-1 w-full">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Setup key</div>
              <div className="flex items-center gap-2 rounded-xl ring-1 ring-slate-200 bg-slate-50 px-3 py-2">
                <code className="font-mono text-[13px] tracking-wider text-navy-900 flex-1 break-all">{SECRET.replace(/(.{4})/g, "$1 ").trim()}</code>
                <button type="button" onClick={() => keyCopy.copy(SECRET)} aria-label="Copy setup key"
                  className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold text-teal-700 hover:text-teal-800 transition">
                  {keyCopy.done ? <><Icon.check size={13} /> Copied</> : "Copy"}
                </button>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">Issuer Slaice · elena@example.com</div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed text-center">Enter the 6-digit code from your authenticator app.</p>
          <OtpInput value={code} onChange={setCode} />
          <div className="text-[12px] text-slate-500 text-center">The code refreshes every 30 seconds.</div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2.5 text-[12.5px] text-amber-800">
            <Icon.alert size={16} className="shrink-0 mt-0.5" />
            <span>Save these recovery codes somewhere safe. Each works once and lets you sign in if you lose your device.</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {recovery.map((rc) => (
              <code key={rc} className="font-mono text-[13px] text-navy-900 bg-slate-50 ring-1 ring-slate-200 rounded-lg px-3 py-2 text-center tracking-wider">{rc}</code>
            ))}
          </div>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" icon={codesCopy.done ? Icon.check : Icon.doc} onClick={() => codesCopy.copy(recovery.join("\n"))}>{codesCopy.done ? "Copied" : "Copy codes"}</Btn>
            <Btn variant="outline" size="sm" icon={Icon.download} onClick={downloadCodes}>Download</Btn>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="w-4 h-4 accent-teal-600" />
            <span className="text-[13px] text-slate-700">I&rsquo;ve saved my recovery codes</span>
          </label>
        </div>
      )}
    </Modal>
  );
}
