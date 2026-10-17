import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "../../lib/icons";
import { PERSONAS } from "../../data/personas";
import { useApp, useT } from "../../app/store";
import type { PersonaId } from "../../domain/types";
import { SceneControls } from "../SceneDemoPanel";
import { readHashQuery } from "../../app/router";
import { useDemoFlag } from "../../lib/useDemoFlag";

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
  compact = false,
}: {
  persona: PersonaId;
  setPersona: (p: PersonaId) => void;
  variant: "role" | "demo";
  side?: "top" | "bottom";
  /** Icon-only trigger for the phone top bar (AENR-575). */
  compact?: boolean;
}) {
  const t = useT();
  const [economics, setEconomics] = useDemoFlag("economics");
  const [newGuest, setNewGuest] = useDemoFlag("newGuest");
  const { inventory, setInventory, sceneFx, showPreviews, setShowPreviews, till } = useApp();
  const cur = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];
  const momentPreview = readHashQuery().get("moment") ?? "";
  const origin = side === "top" ? "origin-bottom-right" : "origin-top-right";
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        {variant === "demo" ? (
          <button
            title={t("Demo — view as another persona")}
            aria-label={t("Switch persona (demo)")}
            className={compact ? "w-10 h-10 grid place-items-center rounded-xl text-slate-500 hover:text-navy-900 hover:bg-slate-100 data-[state=open]:bg-slate-100" : "flex items-center gap-1.5 glass rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600 hover:text-navy-900 data-[state=open]:text-navy-900 shadow-soft transition"}
          >
            <Icon.layers size={compact ? 18 : 13} />
            {!compact && <span>{t("Demo")}</span>}
            {!compact && <Icon.chevD size={12} />}
          </button>
        ) : (
          <button
            aria-label={`${t("Switch persona — currently")} ${t(cur.label)}`}
            style={{ background: cur.color + "14", borderColor: cur.color + "55" }}
            className="flex items-center gap-2 ring-1 rounded-xl p-1.5 sm:pr-3 text-sm font-semibold hover:brightness-[.98] transition"
          >
            <span className="w-6 h-6 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: cur.color }}>
              {(() => { const I = Icon[cur.icon]; return I ? <I size={13} /> : null; })()}
            </span>
            <span className="hidden md:inline text-navy-900">{t(cur.label)}</span>
            <Icon.chevD size={14} className="text-slate-400 hidden sm:block" />
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
          {/* Roadmap previews (AENR-618): off by default so the menus show only what works today. */}
          {persona !== "customer" && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
              <DropdownMenu.CheckboxItem
                checked={showPreviews}
                onCheckedChange={(v) => setShowPreviews(v === true)}
                onSelect={(e) => e.preventDefault()}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer select-none outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100"
              >
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold">{t("Show roadmap previews")}</span>
                  <span className="block text-[11px] text-slate-500 leading-tight">{t("Future pages appear under “Coming next” in the menu.")}</span>
                </span>
                <span aria-hidden className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${showPreviews ? "bg-teal-600" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${showPreviews ? "left-[18px]" : "left-0.5"}`} />
                </span>
              </DropdownMenu.CheckboxItem>
            </>
          )}
          {/* Demo: preview Home at each moment of a beach day (AENR-610); Live follows the clock. */}
          {persona === "customer" && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
              <DropdownMenu.Label className="px-2.5 pt-1 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{t("Preview Home")}</DropdownMenu.Label>
              <DropdownMenu.RadioGroup value={momentPreview} onValueChange={(m) => { window.location.hash = `#/customer/home${m ? `?moment=${m}` : ""}`; }}>
                {([["", "Live (by the clock)"], ["morning", "Morning of a visit"], ["during", "At the beach"], ["after", "After the visit"], ["offseason", "Off-season"]] as const).map(([k, l]) => (
                  <DropdownMenu.RadioItem key={k || "live"} value={k} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm cursor-pointer select-none outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100">
                    <span aria-hidden className={`w-3.5 h-3.5 rounded-full ring-1 shrink-0 grid place-items-center ${momentPreview === k ? "ring-teal-600" : "ring-slate-300"}`}>{momentPreview === k && <span className="w-2 h-2 rounded-full bg-teal-600" />}</span>
                    {t(l)}
                  </DropdownMenu.RadioItem>
                ))}
              </DropdownMenu.RadioGroup>
            </>
          )}
          {/* Demo: what the platform earns on this basket (AENR-659 — moved out of the guest's checkout). */}
          {persona === "customer" && (
            <DropdownMenu.CheckboxItem
              checked={economics}
              onCheckedChange={(v) => setEconomics(v === true)}
              onSelect={(e) => e.preventDefault()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer select-none outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100"
            >
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{t("Show platform economics")}</span>
                <span className="block text-[11px] text-slate-500 leading-tight">{t("Checkout shows what the beach and Slaice earn.")}</span>
              </span>
              <span aria-hidden className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${economics ? "bg-teal-600" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${economics ? "left-[18px]" : "left-0.5"}`} />
              </span>
            </DropdownMenu.CheckboxItem>
          )}
          {/* Demo: a guest who has never booked (AENR-702) — Home, My bookings, Wallet and the
              wizard behave as for a first visit. */}
          {persona === "customer" && (
            <DropdownMenu.CheckboxItem
              checked={newGuest}
              onCheckedChange={(v) => setNewGuest(v === true)}
              onSelect={(e) => e.preventDefault()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer select-none outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100"
            >
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{t("Simulate a first-time guest")}</span>
                <span className="block text-[11px] text-slate-500 leading-tight">{t("No previous bookings — see the app as a new guest does.")}</span>
              </span>
              <span aria-hidden className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${newGuest ? "bg-teal-600" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${newGuest ? "left-[18px]" : "left-0.5"}`} />
              </span>
            </DropdownMenu.CheckboxItem>
          )}
          {/* Demo: the till losing its connection (AENR-607). It raises the browser's own offline /
              online events, so the till reacts exactly as to a real drop: queue, then sync on return. */}
          {persona === "cashier" && (
            <DropdownMenu.CheckboxItem
              checked={till.offline}
              onCheckedChange={(v) => window.dispatchEvent(new Event(v === true ? "offline" : "online"))}
              onSelect={(e) => e.preventDefault()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer select-none outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100"
            >
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{t("Simulate till offline")}</span>
                <span className="block text-[11px] text-slate-500 leading-tight">{t("Sales queue on the till and sync when you switch it back.")}</span>
              </span>
              <span aria-hidden className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${till.offline ? "bg-amber-500" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${till.offline ? "left-[18px]" : "left-0.5"}`} />
              </span>
            </DropdownMenu.CheckboxItem>
          )}
          {/* Phones: the scene demo controls live here instead of floating over content (AENR-575). */}
          {compact && persona === "customer" && showPreviews && (sceneFx.weather || sceneFx.daytime) && (
            <div className="border-t border-slate-200 mt-1 px-2.5 pt-2 pb-1.5">
              <SceneControls />
            </div>
          )}
          {/* Demo clock for holds / allocation releases (AENR-561 — moved out of the Beach pages). */}
          {persona === "admin" && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
              <DropdownMenu.Label className="px-2.5 pt-1 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
                {t("Demo clock")} · {new Date(Date.now() + inventory.clockOffset * 60000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{inventory.clockOffset ? ` (+${Math.round(inventory.clockOffset / 60)}h)` : ""}
              </DropdownMenu.Label>
              <div className="flex gap-1.5 px-2 pb-1.5">
                {[[60, "+1 h"], [180, "+3 h"]].map(([m, l]) => (
                  <DropdownMenu.Item key={l} onSelect={(e) => { e.preventDefault(); setInventory((i) => ({ ...i, clockOffset: i.clockOffset + (m as number), log: [{ at: new Date().toISOString(), text: `Demo clock ${l}` }, ...i.log] })); }}
                    className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold ring-1 ring-slate-200 bg-white cursor-pointer outline-none data-[highlighted]:ring-teal-400">{l}</DropdownMenu.Item>
                ))}
                {inventory.clockOffset !== 0 && (
                  <DropdownMenu.Item onSelect={(e) => { e.preventDefault(); setInventory((i) => ({ ...i, clockOffset: 0 })); }}
                    className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-slate-600 cursor-pointer outline-none data-[highlighted]:bg-slate-100">{t("Reset")}</DropdownMenu.Item>
                )}
              </div>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
