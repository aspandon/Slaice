import { useState } from "react";
import { Icon } from "../lib/icons";
import { useT } from "../app/store";
import { AppleLogo } from "./WalletPass";

/* One-tap sign-in (AENR-622): Sign in with Apple, Google, or a passkey (Face ID /
   Touch ID) — simulated. No form and no checkbox here: the 18+ confirmation is
   asked once, at the first booking, where it matters (AENR-489). The device
   stays signed in until the guest signs out. */
export type SignInMethod = "Apple" | "Google" | "passkey";

export function QuickSignIn({ onSignedIn }: { onSignedIn: (how: SignInMethod) => void }) {
  const t = useT();
  const [busy, setBusy] = useState<SignInMethod | null>(null);
  const go = (how: SignInMethod) => {
    if (busy) return;
    setBusy(how);
    window.setTimeout(() => onSignedIn(how), how === "passkey" ? 1100 : 700);
  };
  const base =
    "w-full min-h-[50px] rounded-[14px] font-semibold text-[15px] inline-flex items-center justify-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-70";
  return (
    <div className="grid gap-2.5" aria-busy={!!busy}>
      <button
        type="button"
        disabled={!!busy}
        onClick={() => go("Apple")}
        className={`${base} bg-black text-white hover:bg-neutral-800`}
      >
        <AppleLogo size={18} /> {busy === "Apple" ? t("Signing in…") : t("Continue with Apple")}
      </button>
      <button
        type="button"
        disabled={!!busy}
        onClick={() => go("Google")}
        className={`${base} bg-white text-navy-900 ring-1 ring-slate-300 hover:bg-slate-50`}
      >
        <span aria-hidden className="font-bold text-[17px] text-[#4285F4]">
          G
        </span>{" "}
        {busy === "Google" ? t("Signing in…") : t("Continue with Google")}
      </button>
      <button
        type="button"
        disabled={!!busy}
        onClick={() => go("passkey")}
        className={`${base} bg-white/80 text-navy-900 ring-1 ring-slate-300 hover:bg-white`}
      >
        <Icon.scan size={18} className="text-teal-700" />{" "}
        {busy === "passkey" ? t("Confirm with Face ID or Touch ID…") : t("Sign in with a passkey")}
      </button>
      <p role="status" className="text-center text-[12px] text-slate-600">
        {busy ? "" : t("No password. You stay signed in on this device.")}
      </p>
    </div>
  );
}
