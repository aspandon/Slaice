import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "../../lib/icons";
import { PERSONAS } from "../../data/personas";
import { useT } from "../../app/store";
import type { PersonaId } from "../../domain/types";

/* ---------- Persona switcher ----------
   The "view as another persona" control, shared by two surfaces:
     • role — accent-tinted chip in the staff TopBar ("you are in role X").
     • demo — a quiet floating "Demo" pill on the customer surface, anchored to a
       screen corner (see App.tsx), so it doesn't read as a real account control.
   `side` flips the menu (and its scale-in origin) so a bottom-corner trigger
   opens upward. */
export function PersonaSwitcher({
  persona,
  setPersona,
  variant,
  side = "bottom",
}: {
  persona: PersonaId;
  setPersona: (p: PersonaId) => void;
  variant: "role" | "demo";
  side?: "top" | "bottom";
}) {
  const t = useT();
  const cur = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];
  const origin = side === "top" ? "origin-bottom-right" : "origin-top-right";
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        {variant === "demo" ? (
          <button
            title={t("Demo — view as another persona")}
            aria-label={t("Switch persona (demo)")}
            className="flex items-center gap-1.5 glass rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600 hover:text-navy-900 data-[state=open]:text-navy-900 shadow-soft transition"
          >
            <Icon.layers size={13} />
            <span>{t("Demo")}</span>
            <Icon.chevD size={12} />
          </button>
        ) : (
          <button
            aria-label={`${t("Switch persona — currently")} ${t(cur.label)}`}
            style={{ background: cur.color + "14", borderColor: cur.color + "55" }}
            className="flex items-center gap-2 ring-1 rounded-xl pl-1.5 pr-3 py-1.5 text-sm font-semibold hover:brightness-[.98] transition"
          >
            <span className="w-6 h-6 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: cur.color }}>
              {(() => { const I = Icon[cur.icon]; return I ? <I size={13} /> : null; })()}
            </span>
            <span className="hidden md:inline text-navy-900">{t(cur.label)}</span>
            <Icon.chevD size={14} className="text-slate-400" />
          </button>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side={side} align="end" sideOffset={8} className={`glass w-72 text-ink rounded-xl p-1.5 z-[60] shadow-float ${origin} data-[state=open]:animate-scale-in`}>
          <DropdownMenu.Label className="px-2.5 py-1.5 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{t("View as persona")}</DropdownMenu.Label>
          {PERSONAS.map((p) => (
            <DropdownMenu.Item
              key={p.id}
              onSelect={() => setPersona(p.id)}
              className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer select-none outline-none ${persona === p.id ? "bg-slate-100" : ""} hover:bg-slate-100 data-[highlighted]:bg-slate-100`}
            >
              <span className="w-7 h-7 rounded-lg grid place-items-center text-white shrink-0 mt-0.5" style={{ background: p.color }}>
                {(() => { const I = Icon[p.icon]; return I ? <I size={14} /> : null; })()}
              </span>
              <span className="text-left">
                <span className="font-semibold flex items-center gap-1.5">{t(p.label)}{persona === p.id && <Icon.check size={14} />}</span>
                <span className="block text-[11px] text-slate-500 leading-tight">{t(p.blurb)}</span>
              </span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
