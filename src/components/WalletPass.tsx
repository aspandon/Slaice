import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import { Sheet } from "./ui";
import { QR } from "./charts";
import { TenantLogo } from "./Brand";
import { PassCard } from "./PassCard";
import { TENANT } from "../data/beach";
import { useApp, useT } from "../app/store";
import { detectWalletPlatform, downloadPkpass, copyGoogleSaveLink } from "../lib/wallet";
import type { WalletKind } from "../domain/account";

export interface WalletPassData {
  ref: string;
  holder?: string;
  date?: string;
  zone?: string;
  seat?: string;
  guests?: number | string;
  total?: string;
  /** "booking" (default) renders the beach booking; "vip"/"season" render a pass. */
  variant?: "booking" | "vip" | "season";
  /** Pass title shown on the card header (e.g. "VIP credit pass"). */
  title?: string;
  /** Valid-until date shown on the membership card (vip/season variants). */
  validUntil?: string;
  /** Pass detail fields, rendered in the card body for vip/season variants. */
  fields?: { label: string; value: string }[];
  /** A visit's pass (AENR-620): remembered as "In Wallet" under this key, and voided when cancelled. */
  visitKey?: string;
  voided?: boolean;
  /** Shown on the pass when the visit moved. */
  movedFrom?: string;
}
const WALLET_NAME: Record<WalletKind, string> = { apple: "Apple Wallet", google: "Google Wallet" };

/* ---------- Official-style badges ---------- */
export function AppleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

// A black pill that mirrors the official "Add to … Wallet" badges (compact on visit cards).
function WalletBadge({ onClick, logo, label, compact = false }: { onClick?: () => void; logo?: ReactNode; label?: ReactNode; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2.5 rounded-xl bg-black text-white shadow-btn-primary hover:bg-neutral-800 active:scale-[.97] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${compact ? "pl-2.5 pr-3 h-9" : "pl-3 pr-4 h-12 min-w-[180px]"}`}>
      {logo}
      <span className="text-left leading-none">
        <span className="block text-[9px] text-white/70 -mb-0.5">Add to</span>
        <span className={`block font-semibold ${compact ? "text-[12.5px]" : "text-[15px]"}`}>{label}</span>
      </span>
    </button>
  );
}

/* ---------- Public: the badges + preview/confirm sheet ----------
   The badge matching the device (iPhone → Apple, Android → Google; desktop shows
   both). A visit's pass is remembered (AENR-620): once added the badge becomes
   "In Apple Wallet ✓", a cancelled visit's pass shows as voided. */
export function WalletButtons({ pass, className = "", compact = false }: { pass: WalletPassData; className?: string; compact?: boolean }) {
  const t = useT();
  const { account } = useApp();
  const [open, setOpen] = useState<WalletKind | null>(null);
  const platform = detectWalletPlatform();
  const added = pass.visitKey ? account.wallet?.[pass.visitKey] : undefined;
  if (pass.voided && !added) return null;
  const apple = <WalletBadge key="a" compact={compact} logo={<AppleLogo size={compact ? 15 : 18} />} label="Apple Wallet" onClick={() => setOpen("apple")} />;
  const google = <WalletBadge key="g" compact={compact} logo={<span className="bg-white rounded-full p-0.5 grid place-items-center"><GoogleG size={compact ? 13 : 16} /></span>} label="Google Wallet" onClick={() => setOpen("google")} />;
  const order = platform === "ios" ? [apple] : platform === "android" ? [google] : [apple, google];
  return (
    <div className={className}>
      {added ? (
        <button
          type="button"
          onClick={() => setOpen(added)}
          className={`inline-flex items-center gap-2 rounded-xl ring-1 ring-slate-200 bg-white/80 text-navy-900 font-semibold hover:ring-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${compact ? "px-3 h-9 text-[12.5px]" : "px-4 h-12 text-sm"}`}
        >
          {added === "apple" ? <AppleLogo size={15} /> : <GoogleG size={14} />}
          {pass.voided ? t("Pass voided") : `${t("In")} ${WALLET_NAME[added]}`}
          {!pass.voided && <Icon.checkCircle size={14} className="text-emerald-600" />}
        </button>
      ) : (
        <>
          {!compact && <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{t("Add your pass to")}</div>}
          <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-center"}`}>{order}</div>
        </>
      )}
      {open && <WalletSheet open onClose={() => setOpen(null)} pass={pass} kind={open} platform={platform} />}
    </div>
  );
}

/* ---------- The pass preview (looks like a real wallet pass) ---------- */
function PassPreview({ pass }: { pass: WalletPassData }) {
  // VIP / Season passes render the tenant membership card art + a scan strip.
  if (pass.variant === "vip" || pass.variant === "season") {
    const no = "NO. " + (pass.ref.match(/\d+/)?.[0] ?? "0042");
    return (
      <div className="rounded-3xl overflow-hidden shadow-float ring-1 ring-black/5 max-w-[85.6mm] mx-auto bg-white">
        <PassCard kind={pass.variant} holder={(pass.holder ?? "Elena M.").toUpperCase()} number={no} validUntil={pass.validUntil} />
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="rounded-lg ring-1 ring-slate-200 p-1.5 shrink-0"><QR size={84} seed={pass.ref} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{pass.title || "Pass"}</div>
            <div className="font-mono font-semibold text-navy-900 text-sm">#{pass.ref.replace(/^#/, "")}</div>
            <div className="mt-1.5 space-y-0.5">
              {(pass.fields || []).map((f, i) => (
                <div key={i} className="text-[11px] flex justify-between gap-3"><span className="text-slate-500">{f.label}</span><b className="text-navy-900">{f.value}</b></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative rounded-3xl overflow-hidden shadow-float ring-1 ring-black/5 max-w-[340px] mx-auto">
      {pass.voided && (
        <div className="absolute inset-0 z-[1] grid place-items-center bg-navy-950/70">
          <span className="rounded-xl bg-white text-rose-700 font-bold px-4 py-2 text-[14px] ring-2 ring-rose-300">Cancelled — pass voided</span>
        </div>
      )}
      <div className="grad-sea text-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TenantLogo size={28} />
            <div className="leading-tight">
              <div className="font-display font-bold text-[15px]">{TENANT.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-teal-200">Beach entry pass</div>
            </div>
          </div>
          <Icon.umbrella size={20} className="text-teal-200" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-2">
          <PassField label="Beach zone" value={pass.zone || "Akti tou Iliou"} />
          <PassField label="Date" value={pass.date || "—"} />
          <PassField label="Sunbed" value={pass.seat || "—"} />
          <PassField label="Guests" value={String(pass.guests ?? "—")} />
        </div>
        {pass.movedFrom && <div className="mt-3 text-[11px] text-teal-100">Updated — moved from {pass.movedFrom}</div>}
      </div>

      <div className="bg-white px-5 py-4 flex items-center gap-4">
        <div className="rounded-lg ring-1 ring-slate-200 p-1.5 shrink-0"><QR size={92} seed={pass.ref} /></div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Booking</div>
          <div className="font-mono font-semibold text-navy-900 text-sm">#{pass.ref.replace(/^#/, "")}</div>
          {pass.total && <div className="text-[12px] text-slate-500 mt-1">{pass.total} · paid</div>}
          <div className="text-[11px] text-slate-500 mt-1.5">Scan at the gate</div>
        </div>
      </div>
    </div>
  );
}
function PassField({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-wider text-teal-200/90 font-semibold">{label}</div>
      <div className="font-semibold text-[13.5px] truncate">{value}</div>
    </div>
  );
}

function WalletSheet({ open, onClose, pass, kind, platform }: { open: boolean; onClose: () => void; pass: WalletPassData; kind: WalletKind; platform: string }) {
  const t = useT();
  const { toast, account, setAccount } = useApp();
  const added = !!pass.visitKey && account.wallet?.[pass.visitKey] === kind;
  const remember = () => {
    if (pass.visitKey) setAccount((a) => ({ ...a, wallet: { ...(a.wallet ?? {}), [pass.visitKey as string]: kind } }));
  };
  const addApple = () => {
    downloadPkpass(pass);
    remember();
    onClose();
    toast(`${t("Added to Apple Wallet")} — ${t("demo .pkpass downloaded.")}`, { tone: "success" });
  };
  const addGoogle = async () => {
    const ok = await copyGoogleSaveLink(pass);
    if (ok) remember();
    onClose();
    toast(ok ? `${t("Added to Google Wallet")} — ${t("demo Save link copied.")}` : t("Couldn’t copy — try again."), { tone: ok ? "success" : "error" });
  };
  const remove = () => {
    setAccount((a) => {
      const w = { ...(a.wallet ?? {}) };
      if (pass.visitKey) delete w[pass.visitKey];
      return { ...a, wallet: w };
    });
    onClose();
    toast(`${t("Removed from")} ${WALLET_NAME[kind]}.`);
  };
  return (
    <Sheet open={open} onClose={onClose} title={added ? WALLET_NAME[kind] : t("Add to Wallet")}>
      <div className="space-y-4">
        <PassPreview pass={pass} />

        {added ? (
          <button type="button" onClick={remove} className="w-full rounded-xl ring-1 ring-slate-200 bg-white h-11 text-[13px] font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            {t("Remove pass")}
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {kind === "apple" ? (
              <WalletBadge logo={<AppleLogo />} label="Apple Wallet" onClick={addApple} />
            ) : (
              <WalletBadge logo={<span className="bg-white rounded-full p-0.5 grid place-items-center"><GoogleG size={16} /></span>} label="Google Wallet" onClick={addGoogle} />
            )}
          </div>
        )}

        {pass.visitKey && (
          <ul className="text-[12px] text-slate-600 space-y-1.5">
            <li className="flex gap-2"><Icon.bell size={14} className="text-teal-600 mt-0.5 shrink-0" />{t("On the day it shows on your lock screen at arrival time.")}</li>
            <li className="flex gap-2"><Icon.calendar size={14} className="text-teal-600 mt-0.5 shrink-0" />{t("Move the visit and the pass updates; cancel it and the pass is voided.")}</li>
          </ul>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2.5 text-[11.5px] text-slate-500 leading-snug">
          <Icon.info size={14} className="shrink-0 mt-0.5 text-slate-400" />
          <span>
            Demo — Apple downloads a real <b>.pkpass</b> and Google copies a <b>Save</b> link.
            In production the pass is signed server-side so your phone adds it in one tap
            {platform === "ios" ? " (your device looks like iOS — Apple Wallet recommended)." : platform === "android" ? " (your device looks like Android — Google Wallet recommended)." : "."}
          </span>
        </div>
      </div>
    </Sheet>
  );
}
