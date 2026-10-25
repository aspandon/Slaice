import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "../lib/icons";
import { useApp, useT } from "../app/store";
import { buildHash } from "../app/router";
import { PARKING_HOME, VERTICALS, useVertical, type VerticalId } from ".";

/** Leave for another vertical: Parking opens at its home, the beach where the viewer left it. */
export function useGoVertical() {
  const { persona, page } = useApp();
  return (v: VerticalId) => {
    window.location.hash = v === "parking" ? PARKING_HOME : buildHash(persona, page);
    window.scrollTo({ top: 0 });
  };
}

/* The Demo menu's Vertical group (AENR-1138) — the same in the beach's Demo menu and in Parking's,
   so the viewer can always cross between verticals. Radix gives arrow-key movement and the
   checked state to screen readers. */
export function VerticalMenuGroup() {
  const t = useT();
  const vertical = useVertical();
  const goVertical = useGoVertical();
  return (
    <>
      <DropdownMenu.Label className="px-2.5 py-1.5 text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
        {t("Vertical")}
      </DropdownMenu.Label>
      <DropdownMenu.RadioGroup
        value={vertical}
        onValueChange={(v) => v !== vertical && goVertical(v as VerticalId)}
      >
        {VERTICALS.map((v) => {
          const I = Icon[v.icon];
          const on = vertical === v.id;
          return (
            <DropdownMenu.RadioItem
              key={v.id}
              value={v.id}
              className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer select-none outline-none ${on ? "bg-slate-100" : ""} hover:bg-slate-100 data-[highlighted]:bg-slate-100`}
            >
              <span
                aria-hidden
                className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 mt-0.5 ${on ? "bg-navy-900 text-white" : "bg-slate-200/80 text-navy-900"}`}
              >
                {I && <I size={14} />}
              </span>
              <span className="text-left min-w-0">
                <span className="font-semibold flex items-center gap-1.5">
                  {t(v.label)}
                  {on && <Icon.check size={14} />}
                </span>
                <span className="block text-[11px] text-slate-500 leading-tight">{t(v.blurb)}</span>
              </span>
            </DropdownMenu.RadioItem>
          );
        })}
      </DropdownMenu.RadioGroup>
    </>
  );
}
