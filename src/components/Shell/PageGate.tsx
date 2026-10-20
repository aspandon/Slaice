import type { ReactNode } from "react";
import { Icon } from "../../lib/icons";
import { Btn, EmptyState } from "../ui";
import { useApp, useT } from "../../app/store";
import { DEFAULT_PAGE, PERSONAS } from "../../data/personas";
import { useNav, usePageAccess } from "../../lib/useNav";
import { useTenantFeatures } from "../../lib/useFeatures";
import type { PersonaId } from "../../domain/types";

/* ============ Page gate (AENR-691 / 696) ============
   A direct link to a page the tenant can't see — a roadmap preview with
   previews off, or a page of a module that is off — lands on a calm "not
   available" card with a way back to the persona's first page, instead of the
   page itself. The nav never offers these pages. A role the tenant doesn't use
   (AENR-716) gets its own card: none of its pages open. */
export function PageGate({
  persona,
  page,
  children,
}: {
  persona: PersonaId;
  page: string;
  children: ReactNode;
}) {
  const access = usePageAccess(persona, page);
  const nav = useNav(persona);
  const { go } = useApp();
  const { tenant } = useTenantFeatures();
  const t = useT();
  if (access.ok) return <>{children}</>;
  // A role the tenant doesn't use (AENR-716): every page of it is off, so there is
  // no start page to offer — explain, and (demo) point at where Slaice turns it on.
  if (access.why === "role") {
    const label = PERSONAS.find((p) => p.id === persona)?.label ?? persona;
    const beach = tenant?.name ?? t("this beach");
    return (
      <div className="glass-card rounded-3xl max-w-lg mx-auto mt-6">
        <EmptyState
          icon={Icon.lock}
          title={`${label} ${t("isn't used at")} ${beach}`}
          body={`${t("Slaice turned the")} ${label} ${t("role off for this beach, so its pages aren't available. People who hold it keep it — their access comes back as soon as the role is on again. Your other roles are in the account menu.")}`}
          action={
            tenant ? (
              <Btn
                variant="outline"
                icon={Icon.building}
                onClick={() => {
                  window.location.hash = `#/platform/tenant/${tenant.id}/roles`;
                }}
              >
                {t("Manage roles in Platform (demo)")}
              </Btn>
            ) : undefined
          }
        />
      </div>
    );
  }
  const home = nav.find((it) => it.area !== "account")?.k ?? DEFAULT_PAGE[persona];
  const homeLabel = nav.find((it) => it.k === home)?.label;
  const canGoHome = home !== page && nav.some((it) => it.k === home);
  const staff = persona !== "customer";
  return (
    <div className="glass-card rounded-3xl max-w-lg mx-auto mt-6">
      <EmptyState
        icon={access.why === "roadmap" ? Icon.sparkles : Icon.lock}
        title={t("This page isn't available")}
        body={
          access.why === "roadmap"
            ? staff
              ? t(
                  "It's a roadmap preview. Turn on “Show roadmap previews” in the persona menu to see it.",
                )
              : t("This isn't offered at this beach yet.")
            : staff
              ? `${t("This beach doesn't have the")} ${access.module} ${t("module. Slaice can switch it on in Platform › Tenants › Modules & features.")}`
              : t("This isn't offered at this beach.")
        }
        action={
          canGoHome ? (
            <Btn variant="primary" icon={Icon.arrowR} onClick={() => go(persona, home)}>
              {homeLabel ? `${t("Go to")} ${t(homeLabel)}` : t("Go to my start page")}
            </Btn>
          ) : undefined
        }
      />
    </div>
  );
}
