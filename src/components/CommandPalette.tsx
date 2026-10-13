import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon, type IconRenderer } from "../lib/icons";
import { useApp } from "../app/store";
import { NAV } from "../data/personas";
import { CUSTOMERS } from "../data/mock";
import { ZONES, zoneLayout } from "../data/beach";
import { useBookingOps } from "../lib/useBookingOps";
import { openDisplay } from "../domain/display";
import type { PersonaId } from "../domain/types";

/* ============ ⌘K command palette (AENR-553) ============
   Jump to anything — a booking ref, a guest, a set code, a staff member, a
   page — or start an action, from the keyboard. Results and actions follow
   the persona's own pages (its permissions) and the View-as guard. "?" opens
   the shortcut sheet; G then a letter goes to a page (G B = Bookings). */

interface Item {
  id: string;
  group: "Actions" | "Bookings" | "Guests" | "Sets" | "Staff" | "Pages";
  label: string;
  hint?: string;
  icon: IconRenderer;
  run: () => void;
}
/** G + letter → page key, where the persona has that page. */
const G_KEYS: Record<string, string[]> = {
  d: ["dashboard"],
  b: ["bookings"],
  l: ["live"],
  u: ["users"],
  r: ["reporting"],
  f: ["refunds"],
  p: ["paylinks"],
  m: ["manual", "monthend"],
  i: ["issue"],
  t: ["transactions"],
  s: ["scan"],
  e: ["beach"],
  w: ["walkin"],
  o: ["documents"],
};
const STAFF_PERSONAS: PersonaId[] = [
  "admin",
  "callcenter",
  "cashier",
  "controller",
  "accountant",
  "support",
];
const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export function CommandPalette() {
  const { persona, go, staffUsers, viewAs } = useApp();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const gAt = useRef(0);
  const ops = useBookingOps();
  const nav = NAV[persona] ?? [];
  const has = (k: string) => nav.some((n) => n.k === k);
  const readOnly = !!viewAs; // previewing a role: look, don't act
  const active = STAFF_PERSONAS.includes(persona);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        isTyping(e.target) ||
        document.querySelector("[role=dialog]")
      )
        return;
      if (e.key === "?") {
        e.preventDefault();
        setHelp(true);
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "g") {
        gAt.current = Date.now();
        return;
      }
      if (Date.now() - gAt.current < 1200 && G_KEYS[k]) {
        const target = G_KEYS[k].find((p) => NAV[persona]?.some((n) => n.k === p));
        gAt.current = 0;
        if (target) {
          e.preventDefault();
          go(persona, target);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const ev = () => setOpen(true);
    window.addEventListener("slaice:command", ev);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("slaice:command", ev);
    };
  }, [active, persona, go]);

  const close = () => {
    setOpen(false);
    setQ("");
    setI(0);
  };
  const hash = (h: string) => {
    window.location.hash = h;
  };

  const items = useMemo<Item[]>(() => {
    if (!open) return [];
    const qq = q.trim().toLowerCase();
    const out: Item[] = [];
    // Actions — only what this role can do, and nothing that changes data while previewing a role.
    const actions: (Item & { need: string; mutates?: boolean })[] = [
      {
        id: "a-new",
        group: "Actions",
        label: "New phone booking",
        icon: Icon.phone,
        need: "manual",
        mutates: true,
        run: () => go(persona, "manual"),
      },
      {
        id: "a-link",
        group: "Actions",
        label: "Send a pay link",
        icon: Icon.link,
        need: "paylinks",
        mutates: true,
        run: () => go(persona, "paylinks"),
      },
      {
        id: "a-issue",
        group: "Actions",
        label: "Issue ticket",
        icon: Icon.ticket,
        need: "issue",
        mutates: true,
        run: () => go(persona, "issue"),
      },
      {
        id: "a-scan",
        group: "Actions",
        label: "Scan at the gate",
        icon: Icon.scan,
        need: "scan",
        run: () => go(persona, "scan"),
      },
      {
        id: "a-walkin",
        group: "Actions",
        label: "Walk-in sale",
        icon: Icon.cash,
        need: "walkin",
        mutates: true,
        run: () => go(persona, "walkin"),
      },
      {
        id: "a-display",
        group: "Actions",
        label: "Open live display",
        icon: Icon.monitor,
        need: has("display") ? "display" : has("issue") ? "issue" : "scan",
        run: openDisplay,
      },
      {
        id: "a-export",
        group: "Actions",
        label: "Export month for the accounting package",
        icon: Icon.download,
        need: "monthend",
        run: () => go(persona, "monthend"),
      },
    ];
    for (const a of actions)
      if (has(a.need) && !(readOnly && a.mutates) && (!qq || a.label.toLowerCase().includes(qq)))
        out.push(a);
    if (qq.length >= 2) {
      if (has("bookings"))
        for (const b of ops.bookings)
          if (
            `${b.id} ${b.who} ${b.surname} ${b.items.join(" ")}`.toLowerCase().includes(qq) &&
            out.filter((x) => x.group === "Bookings").length < 6
          )
            out.push({
              id: `b-${b.id}`,
              group: "Bookings",
              label: `${b.id} · ${b.who} ${b.surname}`.trim(),
              hint: `${b.date} · ${b.status}`,
              icon: Icon.grid,
              run: () => hash(`#/${persona}/bookings?booking=${encodeURIComponent(b.id)}`),
            });
      if (has("users"))
        for (const c of CUSTOMERS)
          if (
            `${c.first} ${c.last} ${c.email} ${c.phone.replace(/\s/g, "")}`
              .toLowerCase()
              .includes(qq.replace(/\s/g, "")) &&
            out.filter((x) => x.group === "Guests").length < 5
          )
            out.push({
              id: `g-${c.id}`,
              group: "Guests",
              label: `${c.first} ${c.last}`,
              hint: `${c.bookings} visits`,
              icon: Icon.users,
              run: () => hash(`#/${persona}/users?guest=${c.id}`),
            });
      const setPage = has("live") ? "live" : has("beach") ? "beach" : null;
      if (setPage && /^[a-z]{2}-?\d{1,2}$/i.test(qq)) {
        const code = qq
          .toUpperCase()
          .replace(/^([A-Z]{2})-?(\d+)$/, (_m, p, n) => `${p}-${n.padStart(2, "0")}`);
        const z = ZONES.find((x) => code.startsWith(`${x.prefix}-`));
        if (z && zoneLayout(z).some((s) => s.id === code))
          out.push({
            id: `s-${code}`,
            group: "Sets",
            label: `Set ${code}`,
            hint: z.name,
            icon: Icon.umbrella,
            run: () =>
              setPage === "live"
                ? hash(`#/${persona}/live?zone=${z.id}&set=${code}`)
                : go(persona, "beach", { setId: code }),
          });
      }
      if (has("rbac"))
        for (const u of staffUsers)
          if (
            `${u.name} ${u.email}`.toLowerCase().includes(qq) &&
            out.filter((x) => x.group === "Staff").length < 4
          )
            out.push({
              id: `u-${u.id}`,
              group: "Staff",
              label: u.name,
              hint: u.role,
              icon: Icon.lock,
              run: () => go(persona, "rbac"),
            });
    }
    for (const n of nav)
      if (!qq || n.label.toLowerCase().includes(qq))
        out.push({
          id: `p-${n.k}`,
          group: "Pages",
          label: n.label,
          icon: Icon[n.icon] ?? Icon.arrowR,
          run: () => go(persona, n.k),
        });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, q, persona, ops.bookings, staffUsers, readOnly]);

  const pick = (it: Item | undefined) => {
    if (!it) return;
    close();
    it.run();
  };
  const groups = [...new Set(items.map((x) => x.group))];
  if (!active) return null;
  return (
    <>
      <Dialog.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-navy-950/40 backdrop-blur-sm animate-fade-in" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed z-[71] left-1/2 top-[12vh] -translate-x-1/2 w-[min(640px,calc(100vw-2rem))] rounded-2xl bg-white shadow-overlay ring-1 ring-slate-200 overflow-hidden"
          >
            <Dialog.Title className="sr-only">Search and commands</Dialog.Title>
            <div className="flex items-center gap-2 px-4 border-b border-slate-200">
              <Icon.search size={18} className="text-slate-500" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setI(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setI((x) => Math.min(items.length - 1, x + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setI((x) => Math.max(0, x - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    pick(items[i]);
                  }
                }}
                placeholder="Search bookings, guests, set codes, staff, pages… or type an action"
                aria-label="Search and commands"
                role="combobox"
                aria-expanded="true"
                aria-controls="cmd-list"
                aria-activedescendant={items[i] ? `cmd-${items[i].id}` : undefined}
                className="flex-1 h-14 text-[15px] outline-none bg-transparent"
              />
              <kbd className="text-[11px] text-slate-500 ring-1 ring-slate-200 rounded px-1.5 py-0.5">
                Esc
              </kbd>
            </div>
            <div
              id="cmd-list"
              role="listbox"
              aria-label="Results"
              className="max-h-[60vh] overflow-y-auto p-2"
            >
              {items.length === 0 && (
                <p className="px-3 py-6 text-center text-[13.5px] text-slate-500">
                  Nothing found for “{q}”. Try a booking ref (#BK-10419), a name or a set code
                  (CE-12).
                </p>
              )}
              {groups.map((g) => (
                <div key={g} role="group" aria-label={g}>
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {g}
                  </div>
                  {items.map((it, idx) =>
                    it.group !== g ? null : (
                      <div
                        key={it.id}
                        id={`cmd-${it.id}`}
                        role="option"
                        aria-selected={idx === i}
                        tabIndex={-1}
                        onMouseEnter={() => setI(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pick(it);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && pick(it)}
                        className={`flex items-center gap-3 rounded-xl px-3 min-h-[44px] cursor-pointer ${idx === i ? "bg-navy-900 text-white" : "text-navy-900"}`}
                      >
                        <it.icon
                          size={16}
                          className={idx === i ? "text-teal-300" : "text-slate-500"}
                        />
                        <span className="flex-1 min-w-0 truncate text-[14px] font-medium">
                          {it.label}
                        </span>
                        {it.hint && (
                          <span
                            className={`text-[12px] truncate ${idx === i ? "text-white/75" : "text-slate-500"}`}
                          >
                            {it.hint}
                          </span>
                        )}
                      </div>
                    ),
                  )}
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-slate-100 text-[11.5px] text-slate-500 flex flex-wrap gap-x-4">
              <span>↑↓ to move · Enter to open</span>
              <span>? shortcuts</span>
              <span>G then a letter to jump</span>
              {readOnly && (
                <span className="text-amber-700">
                  Previewing a role — actions that change data are hidden
                </span>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={help} onOpenChange={setHelp}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-navy-950/40 backdrop-blur-sm" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed z-[71] left-1/2 top-[14vh] -translate-x-1/2 w-[min(460px,calc(100vw-2rem))] rounded-2xl bg-white shadow-overlay ring-1 ring-slate-200 p-5"
          >
            <Dialog.Title className="font-display font-bold text-navy-900 text-lg mb-3">
              Keyboard shortcuts
            </Dialog.Title>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13.5px]">
              <dt>
                <kbd className="kbd">⌘K</kbd> / <kbd className="kbd">Ctrl K</kbd>
              </dt>
              <dd>Search and commands</dd>
              <dt>
                <kbd className="kbd">?</kbd>
              </dt>
              <dd>This sheet</dd>
              {Object.entries(G_KEYS).map(([k, pages]) => {
                const n = nav.find((x) => pages.includes(x.k));
                return n ? (
                  <Fragment key={k}>
                    <dt>
                      <kbd className="kbd">G</kbd> <kbd className="kbd">{k.toUpperCase()}</kbd>
                    </dt>
                    <dd>{n.label}</dd>
                  </Fragment>
                ) : null;
              })}
            </dl>
            <Dialog.Close className="mt-4 rounded-[14px] px-4 min-h-[44px] bg-navy-900 text-white font-semibold text-sm">
              Close
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
