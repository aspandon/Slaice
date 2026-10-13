import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon, type IconRenderer } from "../../lib/icons";

/* ============ "…" actions menu (AENR-617) ============
   One primary action stays visible on a card or row; everything else lives
   here — the same menu everywhere. Destructive actions always come last, in
   red, after a separator. Built on Radix (keyboard, focus return, screen
   readers); on touch a long-press on the card opens the same menu
   (useLongPress below). */

export interface MenuAction {
  id: string;
  label: string;
  icon?: IconRenderer;
  onSelect: () => void;
  /** Cancels, deletes or refunds — red, last, after a separator. */
  destructive?: boolean;
  disabled?: boolean;
  /** Short reason or detail on a second line (e.g. why it's disabled). */
  hint?: string;
}

const item =
  "flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer select-none outline-none data-[highlighted]:bg-slate-100 data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed";

export function ActionsMenu({
  actions,
  label,
  size = "md",
  align = "end",
  open,
  onOpenChange,
  className = "",
}: {
  actions: (MenuAction | false | null | undefined)[];
  /** Accessible name, e.g. "More actions for Sun 19 Jul". */
  label: string;
  size?: "sm" | "md";
  align?: "start" | "end";
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  className?: string;
}) {
  const list = actions.filter(Boolean) as MenuAction[];
  if (!list.length) return null;
  const safe = list.filter((a) => !a.destructive);
  const danger = list.filter((a) => a.destructive);
  const row = (a: MenuAction) => {
    const I = a.icon;
    return (
      <DropdownMenu.Item
        key={a.id}
        className={`${item} ${a.destructive ? "text-rose-700" : "text-navy-900"}`}
        disabled={a.disabled}
        onSelect={a.onSelect}
      >
        {I && <I size={15} className={`mt-0.5 shrink-0 ${a.destructive ? "" : "text-slate-500"}`} />}
        <span className="min-w-0">
          <span className="block font-medium">{a.label}</span>
          {a.hint && <span className="block text-[11.5px] text-slate-500 leading-snug">{a.hint}</span>}
        </span>
      </DropdownMenu.Item>
    );
  };
  return (
    <DropdownMenu.Root modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={`grid place-items-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-navy-900 data-[state=open]:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${size === "sm" ? "w-9 h-9" : "w-11 h-11"} ${className}`}
        >
          <Icon.more size={size === "sm" ? 16 : 18} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className={`glass !bg-white/95 w-60 rounded-xl p-1.5 z-[70] shadow-float text-ink data-[state=open]:animate-scale-in ${align === "end" ? "origin-top-right" : "origin-top-left"}`}
        >
          {safe.map(row)}
          {danger.length > 0 && safe.length > 0 && <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />}
          {danger.map(row)}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Long-press (touch only) to open a card's "…" menu. Taps on buttons and links inside are left alone. */
export function useLongPress(onLongPress: () => void, ms = 500) {
  const timer = useRef<number | null>(null);
  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.pointerType !== "touch") return;
      if ((e.target as HTMLElement).closest("button, a, input, select, textarea, [role=menuitem]")) return;
      clear();
      timer.current = window.setTimeout(() => {
        timer.current = null;
        if ("vibrate" in navigator) navigator.vibrate?.(10);
        onLongPress();
      }, ms);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onPointerMove: (e: ReactPointerEvent) => {
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) clear();
    },
  };
}
