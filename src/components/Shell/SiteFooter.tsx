import { useT } from "../../app/store";

/* ---------- Site footer ----------
   A single, centered "powered by Slaice" credit. The tenant-identity card was
   retired — tenant branding now lives in the wordmark above the top bar. */
export function SiteFooter() {
  const t = useT();
  return (
    <footer className="mt-6 md:mt-10 pt-4 md:pt-6 pb-4 flex justify-center relative z-10">
      <div className="flex items-center gap-1.5 text-[11.5px] text-slate-700">
        <span>{t("powered by")}</span>
        <span className="font-bold text-navy-900">SLA<span className="text-gold-600">i</span>CE</span>
      </div>
    </footer>
  );
}
