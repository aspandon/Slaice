import { TenantLogo } from "../Brand";
import { TENANT } from "../../data/beach";
import { useT } from "../../app/store";

/* ---------- Site footer ----------
   Tenant identity + Slaice credit, centered. Lives at the bottom of every
   page on every persona — replaces the old top-bar branding block and the
   per-persona footer note. */
export function SiteFooter() {
  const t = useT();
  return (
    <footer className="mt-6 md:mt-10 pt-4 md:pt-6 pb-4 flex justify-center relative z-10">
      <div className="glass rounded-2xl px-5 py-3 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2.5">
          <TenantLogo size={30} />
          <div className="leading-tight text-left">
            <div className="font-display font-bold text-[14.5px] text-navy-900">{TENANT.name}</div>
            <div className="text-[11px] text-slate-700">{TENANT.subdomain}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-slate-700">
          <span>{t("powered by")}</span>
          <span className="font-bold text-navy-900">SLA<span className="text-gold-600">i</span>CE</span>
        </div>
      </div>
    </footer>
  );
}
