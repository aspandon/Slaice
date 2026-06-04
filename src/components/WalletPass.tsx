import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import { Sheet } from "./ui";
import { QR } from "./charts";
import { TenantLogo } from "./Brand";
import { TENANT } from "../data/beach";
import { useApp } from "../app/store";
import { detectWalletPlatform, downloadPkpass, copyGoogleSaveLink } from "../lib/wallet";

export interface WalletPassData {
  ref: string;
  holder?: string;
  date?: string;
  zone?: string;
  seat?: string;
  guests?: number | string;
  total?: string;
}

/* ---------- Official-style badges ---------- */
function AppleLogo({ size = 18 }: { size?: number }) {
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

// A black pill that mirrors the official "Add to … Wallet" badges.
function WalletBadge({ onClick, logo, label }: { onClick?: () => void; logo?: ReactNode; label?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-black text-white pl-3 pr-4 h-12 min-w-[180px] shadow-btn-primary hover:bg-neutral-800 active:scale-[.97] transition">
      {logo}
      <span className="text-left leading-none">
        <span className="block text-[9px] text-white/70 -mb-0.5">Add to</span>
        <span className="block text-[15px] font-semibold">{label}</span>
      </span>
    </button>
  );
}

/* ---------- Public: the two badges + preview/confirm sheet ---------- */
export function WalletButtons({ pass, className = "" }: { pass: WalletPassData; className?: string }) {
  const [open, setOpen] = useState(false);
  const platform = detectWalletPlatform();
  // Lead with the badge that matches the user's device.
  const apple = <WalletBadge key="a" logo={<AppleLogo />} label="Apple Wallet" onClick={() => setOpen(true)} />;
  const google = <WalletBadge key="g" logo={<span className="bg-white rounded-full p-0.5 grid place-items-center"><GoogleG size={16} /></span>} label="Google Wallet" onClick={() => setOpen(true)} />;
  const order = platform === "android" ? [google, apple] : [apple, google];
  return (
    <div className={className}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Add your pass to</div>
      <div className="flex flex-wrap items-center justify-center gap-2">{order}</div>
      <WalletSheet open={open} onClose={() => setOpen(false)} pass={pass} platform={platform} />
    </div>
  );
}

/* ---------- The pass preview (looks like a real wallet pass) ---------- */
function PassPreview({ pass }: { pass: WalletPassData }) {
  return (
    <div className="rounded-3xl overflow-hidden shadow-float ring-1 ring-black/5 max-w-[340px] mx-auto">
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
      </div>

      <div className="bg-white px-5 py-4 flex items-center gap-4">
        <div className="rounded-lg ring-1 ring-slate-200 p-1.5 shrink-0"><QR size={92} seed={pass.ref} /></div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Booking</div>
          <div className="font-mono font-semibold text-navy-900 text-sm">#{pass.ref}</div>
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

function WalletSheet({ open, onClose, pass, platform }: { open: boolean; onClose: () => void; pass: WalletPassData; platform: string }) {
  const { toast } = useApp();
  const addApple = () => {
    downloadPkpass(pass);
    onClose();
    toast("Apple Wallet pass downloaded (.pkpass).", { tone: "success" });
  };
  const addGoogle = async () => {
    const ok = await copyGoogleSaveLink(pass);
    onClose();
    toast(ok ? "Google Wallet “Save” link copied to clipboard." : "Couldn’t copy — try again.", { tone: ok ? "success" : "error" });
  };
  return (
    <Sheet open={open} onClose={onClose} title="Add to Wallet">
      <div className="space-y-4">
        <PassPreview pass={pass} />

        <div className="flex flex-col gap-2">
          <WalletBadge logo={<AppleLogo />} label="Apple Wallet" onClick={addApple} />
          <WalletBadge logo={<span className="bg-white rounded-full p-0.5 grid place-items-center"><GoogleG size={16} /></span>} label="Google Wallet" onClick={addGoogle} />
        </div>

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
