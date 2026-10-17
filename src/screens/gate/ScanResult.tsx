import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconRenderer } from "../../lib/icons";
import { Btn } from "../../components/ui";

/* ============ Full-screen scan result (AENR-586) ============
   Readable from arm's length: the whole screen turns green, red or amber with
   a large icon + word (never colour alone) and the reason. Valid and invalid
   return to the scanner by themselves after ~2 s; "already entered" waits for
   the controller to override or deny. Sound and vibration follow the gate's
   toggles; reduced motion drops the pop-in and the countdown bar. */

export type ScanState = "valid" | "used" | "invalid";
export interface Validation {
  id: string;
  sub: string;
  state: ScanState;
  /** Already entered: when and where. */
  at?: string;
  gate?: string;
  /** Invalid: why. */
  reason?: string;
  /** The big word, when the state's own doesn't fit (e.g. "Admitted"). */
  word?: string;
  /** The sentence under it, instead of the state's default. */
  detail?: string;
  /** A real booking checked against its live allowance (AENR-715) — reopening it shows who is in. */
  live?: boolean;
}

const LOOK: Record<ScanState, { bg: string; ink: string; word: string; icon: IconRenderer }> = {
  valid: { bg: "bg-emerald-700", ink: "text-white", word: "Valid", icon: Icon.checkCircle },
  invalid: { bg: "bg-rose-700", ink: "text-white", word: "Invalid", icon: Icon.x },
  used: { bg: "bg-amber-400", ink: "text-navy-900", word: "Already entered", icon: Icon.alert },
};
export const AUTO_RETURN_MS = 2000;

export const detailOf = (v: Validation) =>
  v.detail ??
  (v.state === "valid"
    ? "Admit the guest."
    : v.state === "used"
      ? `Entered ${v.at ?? "earlier"}${v.gate ? ` · ${v.gate}` : ""} — override only if you're sure.`
      : `${v.reason ?? "Not recognised"} — do not admit.`);

/* ---- Sound + vibration ---- */
let ctx: AudioContext | null = null;
function beep(state: ScanState) {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = ctx ?? new AC();
    const tones =
      state === "valid"
        ? [[880, 0.12]]
        : state === "used"
          ? [
              [620, 0.1],
              [620, 0.1],
            ]
          : [
              [220, 0.18],
              [180, 0.22],
            ];
    let t = ctx.currentTime;
    for (const [f, d] of tones) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = state === "invalid" ? "square" : "sine";
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + d);
      t += d + 0.06;
    }
  } catch {
    /* no audio — the screen still says it */
  }
}
const VIBRATE: Record<ScanState, number[]> = {
  valid: [80],
  used: [80, 60, 80],
  invalid: [250, 80, 250],
};
/** The beep and buzz for a result, as the gate's toggles allow. */
export function scanFeedback(state: ScanState, fb: GateFeedback) {
  if (fb.sound) beep(state);
  if (fb.vibrate && "vibrate" in navigator) navigator.vibrate?.(VIBRATE[state]);
}

/** The entrances a gate device can stand at (AENR-715: every arrival records its gate). */
export const GATES = ["Gate 1", "Gate 2"] as const;
export interface GateFeedback {
  sound: boolean;
  vibrate: boolean;
  /** Which entrance this device scans at. */
  gate: string;
}
const FB_KEY = "slaice.gate.feedback";
const FB_DEFAULT: GateFeedback = { sound: true, vibrate: true, gate: GATES[0] };
/** Per-device preference (this gate's phone), remembered in the browser. */
export function useGateFeedback(): [GateFeedback, (f: GateFeedback) => void] {
  const [fb, setFb] = useState<GateFeedback>(() => {
    try {
      return { ...FB_DEFAULT, ...JSON.parse(localStorage.getItem(FB_KEY) ?? "{}") };
    } catch {
      return FB_DEFAULT;
    }
  });
  const set = (f: GateFeedback) => {
    setFb(f);
    try {
      localStorage.setItem(FB_KEY, JSON.stringify(f));
    } catch {
      /* not remembered — still applies now */
    }
  };
  return [fb, set];
}

export function ScanResult({
  v,
  feedback,
  onAdmit,
  onDeny,
  onDone,
  onUndo,
}: {
  v: Validation;
  feedback: GateFeedback;
  /** Override of "already entered". */
  onAdmit: (v: Validation) => void;
  onDeny: (v: Validation) => void;
  /** Back to the scanner. */
  onDone: () => void;
  /** Take back what was just recorded (an arrival, AENR-715) — right here, not in a toast. */
  onUndo?: () => void;
}) {
  const look = LOOK[v.state];
  const I = look.icon;
  const titleId = useId();
  const descId = useId();
  const actions = useRef<HTMLDivElement>(null);
  const auto = v.state !== "used";
  const [paused, setPaused] = useState(false);
  const live = useRef({ onAdmit, onDone, onDeny });
  live.current = { onAdmit, onDone, onDeny };

  // Feedback once per result (the scan itself is logged by the caller).
  useEffect(() => {
    scanFeedback(v.state, feedback);
    actions.current?.querySelector("button")?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  // Auto-return to the scanner (paused once the pointer rests on the buttons).
  useEffect(() => {
    if (!auto || paused) return;
    const id = window.setTimeout(() => live.current.onDone(), AUTO_RETURN_MS);
    return () => window.clearTimeout(id);
  }, [auto, paused, v]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && live.current.onDone();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className={`fixed inset-0 z-[70] ${look.bg} ${look.ink} flex flex-col items-center justify-center text-center px-6 pb-safe motion-safe:animate-fade-in`}
    >
      <div className="motion-safe:animate-[pop_220ms_ease-out] flex flex-col items-center">
        <span
          className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full grid place-items-center ${v.state === "used" ? "bg-navy-900/10" : "bg-white/15"}`}
        >
          <I size={96} sw={7} />
        </span>
        <h2
          id={titleId}
          className="mt-6 font-display font-bold uppercase tracking-tight text-5xl sm:text-7xl leading-none"
        >
          {v.word ?? look.word}
        </h2>
        <p id={descId} className="mt-4 text-xl sm:text-2xl font-semibold max-w-xl">
          {detailOf(v)}
        </p>
        <p className="mt-3 font-mono text-lg opacity-90">
          {v.id} · {v.sub}
        </p>
      </div>

      <div
        ref={actions}
        className="mt-10 flex flex-wrap justify-center gap-3"
        onPointerEnter={() => auto && setPaused(true)}
      >
        {v.state === "used" ? (
          <>
            <Btn size="lg" variant="primary" icon={Icon.x} onClick={() => onDeny(v)}>
              Deny entry
            </Btn>
            <Btn size="lg" variant="outline" icon={Icon.check} onClick={() => onAdmit(v)}>
              Override &amp; admit
            </Btn>
          </>
        ) : (
          <>
            <Btn size="lg" variant="light" icon={Icon.scan} onClick={onDone}>
              Next scan
            </Btn>
            {onUndo && (
              <Btn size="lg" variant="light" icon={Icon.refund} onClick={onUndo}>
                Undo
              </Btn>
            )}
          </>
        )}
      </div>
      {auto && (
        <div className="absolute bottom-0 inset-x-0 h-2 bg-black/15" aria-hidden>
          {!paused && (
            <div
              key={v.id + v.state}
              className="h-full bg-white/70 motion-safe:animate-[countdown_2s_linear_forwards] motion-reduce:hidden"
            />
          )}
        </div>
      )}
      {auto && (
        <p className="absolute bottom-5 inset-x-0 text-sm opacity-85">
          {paused ? "Paused — tap Next scan" : "Back to the scanner in 2 s"}
        </p>
      )}
      <style>{`@keyframes countdown{from{width:100%}to{width:0}}@keyframes pop{from{transform:scale(.85);opacity:.4}to{transform:none;opacity:1}}`}</style>
    </div>,
    document.body,
  );
}
