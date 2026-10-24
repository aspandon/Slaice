import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, Input, Select, Toggle } from "../../components/ui";
import { useApp } from "../../app/store";
import { ZONES } from "../../data/beach";
import { DEFAULT_DISPLAY, DISPLAY_LANGS, THEME_LABEL, displayLangs, type DisplayLang, readPending, writePending, displayUrl, effectiveTheme, openDisplay, type DisplayConfig } from "../../domain/display";
import { useEffect, useRef, useState } from "react";
import { LANGUAGES } from "../../app/i18n";
import { useUndoToast } from "../../lib/useUndo";
import { useNow } from "../../lib/useLiveSlots";

/* ============ Admin › Live display (AENR-519) ============
   Configure the entrance screen and launch it on another monitor. The
   preview is the real display (`#/display?preview=1`) in a frame at the
   chosen orientation, so what you see is what the screen shows. */

export function AdminDisplay() {
  const { display: cfg, setDisplay, toast } = useApp();
  const nowHHMM = new Date(useNow(30000)).toTimeString().slice(0, 5);
  const set = (p: Partial<DisplayConfig>) => setDisplay((c) => ({ ...c, ...p }));
  // An empty list means "all zones in the default order"; edits work on the explicit list.
  const order = cfg.zones.length ? cfg.zones : ZONES.map((z) => z.id);
  const shown = new Set(order);
  const toggleZone = (id: string, on: boolean) => {
    const next = on ? [...order, id] : order.filter((x) => x !== id);
    if (next.length) set({ zones: next });
  };
  const move = (id: string, d: -1 | 1) => {
    const i = order.indexOf(id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    set({ zones: next });
  };
  const listed = [
    ...order.flatMap((id) => ZONES.filter((z) => z.id === id)),
    ...ZONES.filter((z) => !shown.has(z.id)),
  ];
  const portrait = cfg.orientation === "portrait";

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="primary" icon={Icon.globe} onClick={openDisplay}>
          Open on another screen
        </Btn>
        <Btn
          variant="outline"
          icon={Icon.copy}
          onClick={() => {
            void navigator.clipboard
              ?.writeText(new URL(displayUrl(), window.location.href).href)
              .catch(() => undefined);
            toast("Display link copied — bookmark it on the signage PC or smart TV.");
          }}
        >
          Copy display link
        </Btn>
        <span className="text-[12px] text-slate-500">
          In the display: double-click or the Full screen button; Esc exits.
        </span>
      </div>
      <PairScreens />

      <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-4 items-start">
        <Card className="p-4 space-y-4">
          <section>
            <h2 className="font-semibold text-navy-900 mb-1">Zones on the screen</h2>
            <p className="text-[12px] text-slate-500 mb-2">
              Tick the zones to show and set their order.
            </p>
            <ul className="space-y-1">
              {listed.map((z) => {
                const i = order.indexOf(z.id);
                return (
                  <li
                    key={z.id}
                    className="flex items-center gap-2 rounded-lg ring-1 ring-slate-200 px-2 py-1"
                  >
                    <label className="flex-1 flex items-center gap-2 min-h-[40px] text-sm">
                      <input
                        type="checkbox"
                        className="accent-teal-600 w-4 h-4"
                        checked={shown.has(z.id)}
                        onChange={(e) => toggleZone(z.id, e.target.checked)}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: z.color }}
                        aria-hidden
                      />{" "}
                      {z.name}
                    </label>
                    {i >= 0 && (
                      <>
                        <button
                          type="button"
                          aria-label={`Move ${z.name} up`}
                          disabled={i === 0}
                          onClick={() => move(z.id, -1)}
                          className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <Icon.chevD size={14} className="rotate-180" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${z.name} down`}
                          disabled={i === order.length - 1}
                          onClick={() => move(z.id, 1)}
                          className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <Icon.chevD size={14} />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="font-semibold text-navy-900">Rotation</h2>
            <Toggle
              on={cfg.rotate}
              onChange={(v) => set({ rotate: v })}
              label="Rotate overview → each zone"
            />
            <Field label="Seconds per view">
              <Select
                value={String(cfg.interval)}
                onChange={(e) => set({ interval: Number(e.target.value) })}
                options={[6, 10, 15, 20, 30].map((n) => ({ v: String(n), l: `${n} s` }))}
              />
            </Field>
          </section>
          <section className="space-y-2">
            <h2 className="font-semibold text-navy-900">Content</h2>
            <Toggle
              on={cfg.showPrices}
              onChange={(v) => set({ showPrices: v })}
              label="Prices (from €…, per zone)"
            />
            <Toggle
              on={cfg.showQr}
              onChange={(v) => set({ showQr: v })}
              label="QR — book on your phone"
            />
            <Toggle
              on={cfg.showWeather}
              onChange={(v) => set({ showWeather: v })}
              label="Weather"
            />
          </section>
          <DisplayLanguages />
          {/* Day / Night / Auto (AENR-594): applies to every open display window at once. */}
          <fieldset>
            <legend className="text-[12px] font-semibold text-slate-700 mb-1.5">Look</legend>
            <div role="radiogroup" aria-label="Display look" className="grid grid-cols-2 gap-1.5">
              {(["light", "dark", "auto", "contrast"] as const).map((k) => {
                const on = cfg.theme === k;
                const I = k === "light" ? Icon.sun : k === "dark" ? Icon.moon : k === "auto" ? Icon.clock : Icon.eye;
                return (
                  <button key={k} type="button" role="radio" aria-checked={on} onClick={() => set({ theme: k })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl min-h-[44px] px-2 text-[13px] font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${on ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-navy-900 ring-slate-200 hover:ring-slate-300"}`}>
                    <I size={15} /> {THEME_LABEL[k]}
                  </button>
                );
              })}
            </div>
            {cfg.theme === "auto" && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Day from (sunrise)">
                  <Input type="time" lang="en-GB" value={cfg.sunrise} onChange={(e) => e.target.value && set({ sunrise: e.target.value })} />
                </Field>
                <Field label="Night from (sunset)">
                  <Input type="time" lang="en-GB" value={cfg.sunset} onChange={(e) => e.target.value && set({ sunset: e.target.value })} />
                </Field>
              </div>
            )}
            <p className="mt-1.5 text-[12px] text-slate-600">
              {cfg.theme === "auto"
                ? `Showing ${effectiveTheme(cfg, nowHHMM) === "light" ? "Day" : "Night"} now — switches at ${cfg.sunrise} and ${cfg.sunset}.`
                : cfg.theme === "light"
                  ? "Day: dark text on white — best in bright sunlight."
                  : cfg.theme === "dark"
                    ? "Night: light text on navy — best at dusk and indoors."
                    : "High contrast: white and yellow on black."}
            </p>
          </fieldset>
          <section className="grid grid-cols-2 gap-2">
            <Field label="Screen">
              <Select
                value={cfg.orientation}
                onChange={(e) =>
                  set({ orientation: e.target.value as DisplayConfig["orientation"] })
                }
                options={[
                  { v: "landscape", l: "Landscape" },
                  { v: "portrait", l: "Portrait" },
                ]}
              />
            </Field>
          </section>
          <Btn variant="ghost" size="sm" onClick={() => set(DEFAULT_DISPLAY)}>
            Reset to defaults
          </Btn>
        </Card>

        {/* Pinned beside the settings (AENR-632); on phones it comes first. */}
        <Card className="p-4 order-first xl:order-none xl:sticky xl:top-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-navy-900">Live preview</h2>
            <Badge tone="green">Updates live</Badge>
          </div>
          <div
            className={`mx-auto rounded-xl overflow-hidden ring-1 ring-slate-300 bg-navy-900 ${portrait ? "aspect-[9/16] max-w-[360px]" : "aspect-video"}`}
          >
            <iframe
              title="Live display preview"
              src={`${displayUrl()}?preview=1`}
              className="w-full h-full border-0"
            />
          </div>
          <p className="mt-2 text-[12px] text-slate-500">
            Shows today’s walk-in availability — the same as the Cashier and Controller see. A sale
            or a status change updates the screen within seconds; no guest details are shown.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ============ Languages on the screen (AENR-678) ============
   Any combination of the app's languages, in the order the manager sets.
   The screen moves to the next one with every view change; one language =
   no language rotation. At least one stays ticked. */
const LANG_NAME = Object.fromEntries(LANGUAGES.map((l) => [l.code, l])) as Record<string, (typeof LANGUAGES)[number] | undefined>;
function DisplayLanguages() {
  const { display: cfg, setDisplay } = useApp();
  const langs = displayLangs(cfg.langs);
  const chosen = new Set<DisplayLang>(langs);
  const [note, setNote] = useState("");
  const [live, setLive] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const refocus = useRef<{ code: DisplayLang; dir: "up" | "down" } | null>(null);
  const native = (c: DisplayLang) => LANG_NAME[c]?.native ?? c.toUpperCase();
  const save = (next: DisplayLang[]) => setDisplay((c) => ({ ...c, langs: next }));
  const toggle = (code: DisplayLang, on: boolean) => {
    if (!on && langs.length === 1) {
      setNote(`Keep at least one language — the screen needs one to show. Tick another first to replace ${native(code)}.`);
      return;
    }
    setNote("");
    save(on ? [...langs, code] : langs.filter((x) => x !== code));
  };
  const move = (code: DisplayLang, d: -1 | 1) => {
    const i = langs.indexOf(code);
    const j = i + d;
    if (i < 0 || j < 0 || j >= langs.length) return;
    const next = [...langs];
    [next[i], next[j]] = [next[j], next[i]];
    refocus.current = { code, dir: d < 0 ? "up" : "down" };
    setLive(`${native(code)} moved to position ${j + 1} of ${next.length}.`);
    save(next);
  };
  // Reordering moves the row in the DOM; keep keyboard focus on the button that was pressed
  // (or its partner once the row reaches the top / bottom).
  useEffect(() => {
    const f = refocus.current;
    if (!f) return;
    refocus.current = null;
    const q = (dir: string) => listRef.current?.querySelector<HTMLButtonElement>(`[data-move="${f.code}-${dir}"]`);
    const btn = q(f.dir);
    (btn && !btn.disabled ? btn : q(f.dir === "up" ? "down" : "up"))?.focus();
  }, [cfg.langs]);
  const listed = [...langs, ...DISPLAY_LANGS.filter((c) => !chosen.has(c))];
  return (
    <section aria-labelledby="display-langs-h">
      <h2 id="display-langs-h" className="font-semibold text-navy-900 mb-1">Languages</h2>
      <p className="text-[12px] text-slate-500 mb-2">
        Tick the languages to show and set their order.{" "}
        {langs.length === 1
          ? `The screen stays in ${native(langs[0])}.`
          : `The screen rotates ${langs.map(native).join(" → ")}, changing with every view (${cfg.interval} s).`}
      </p>
      <ul ref={listRef} className="space-y-1">
        {listed.map((code) => {
          const i = langs.indexOf(code);
          const on = i >= 0;
          const l = LANG_NAME[code];
          return (
            <li key={code} className={`flex items-center gap-2 rounded-lg ring-1 px-2 py-1 ${on ? "ring-teal-300 bg-teal-50/60" : "ring-slate-200"}`}>
              <label className="flex-1 min-w-0 flex items-center gap-2 min-h-[40px] text-sm">
                <input
                  type="checkbox"
                  className="accent-teal-600 w-4 h-4"
                  checked={on}
                  aria-describedby={note && on ? "display-langs-note" : undefined}
                  onChange={(e) => toggle(code, e.target.checked)}
                />
                <span
                  aria-hidden
                  className={`w-5 h-5 shrink-0 grid place-items-center rounded-full text-[11px] font-bold tnum ${on ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  {on ? i + 1 : "–"}
                </span>
                <span lang={l?.html} className="font-semibold text-navy-900">{l?.native ?? code}</span>
                {l && l.native !== l.label && (
                  <span className="text-[12px] text-slate-500 truncate">{l.label}</span>
                )}
              </label>
              {on && langs.length > 1 && (
                <>
                  <button
                    type="button"
                    data-move={`${code}-up`}
                    aria-label={`Move ${l?.label ?? code} up`}
                    disabled={i === 0}
                    onClick={() => move(code, -1)}
                    className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    <Icon.chevD size={14} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    data-move={`${code}-down`}
                    aria-label={`Move ${l?.label ?? code} down`}
                    disabled={i === langs.length - 1}
                    onClick={() => move(code, 1)}
                    className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    <Icon.chevD size={14} />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {note && (
        <p id="display-langs-note" role="alert" className="mt-1.5 text-[12px] text-amber-800">
          {note}
        </p>
      )}
      <p aria-live="polite" className="sr-only">{live}</p>
    </section>
  );
}

/* ============ Pair a screen (AENR-602) ============
   A TV or signage PC shows a 4-digit code until it's paired; type it here.
   Paired screens follow these settings and can be renamed or removed (a
   removed screen goes back to showing a code). */
function PairScreens() {
  const { display: cfg, setDisplay, toast } = useApp();
  const undo = useUndoToast();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const screens = cfg.screens ?? [];
  // Once a screen is paired the card folds to one row (AENR-632).
  const [open, setOpen] = useState(false);
  const pair = () => {
    const hit = readPending().find((x) => x.code === code);
    if (!hit) return setErr("No screen shows that code — check the TV, or wait for a fresh code.");
    const name = `Screen ${screens.length + 1}`;
    setDisplay((c) => ({
      ...c,
      screens: [...(c.screens ?? []).filter((x) => x.device !== hit.device), { device: hit.device, name, pairedAt: new Date().toISOString() }],
    }));
    writePending(readPending().filter((x) => x.device !== hit.device));
    setCode("");
    setErr("");
    toast(`${name} paired — it shows the live display now.`, { tone: "success" });
  };
  const rename = (device: string, name: string) =>
    setDisplay((c) => ({ ...c, screens: (c.screens ?? []).map((x) => (x.device === device ? { ...x, name } : x)) }));
  const remove = (device: string) => {
    const prev = cfg.screens ?? [];
    const gone = prev.find((x) => x.device === device);
    setDisplay((c) => ({ ...c, screens: (c.screens ?? []).filter((x) => x.device !== device) }));
    undo(`${gone?.name ?? "Screen"} removed — it shows a pairing code again.`, () => setDisplay((c) => ({ ...c, screens: prev })));
  };
  if (screens.length > 0 && !open)
    return (
      <button
        type="button"
        aria-expanded={false}
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 rounded-2xl glass-card ring-1 ring-slate-200 px-4 py-3 text-left hover:ring-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        <Icon.monitor size={16} className="text-teal-700 shrink-0" />
        <span className="flex-1 min-w-0 text-[13.5px]">
          <b className="text-navy-900">Screens</b> · {screens.length} paired
          <span className="text-slate-500"> — {screens.map((x) => x.name).join(", ")}</span>
        </span>
        <span className="text-[12.5px] font-semibold text-teal-700">Manage · pair another</span>
        <Icon.chevD size={15} className="text-slate-500" />
      </button>
    );
  return (
    <Card className="p-4">
      {screens.length > 0 && (
        <div className="flex justify-end -mt-1 mb-1">
          <button type="button" aria-expanded onClick={() => setOpen(false)} className="text-[12px] font-semibold text-slate-500 hover:text-navy-900 rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">Fold</button>
        </div>
      )}
      <div className="flex flex-wrap items-start gap-4">
        <form
          className="min-w-0 flex-1 basis-64"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 4) pair();
          }}
        >
          <h2 className="font-semibold text-navy-900">Pair a screen</h2>
          <p className="text-[12.5px] text-slate-600 mb-2">Open the display on the TV (or use Open on another screen); it shows a 4-digit code. Type it here.</p>
          <div className="flex items-start gap-2">
            <div className="w-32">
              <Input inputMode="numeric" maxLength={4} aria-label="Pairing code shown on the screen" placeholder="0000" className="tnum tracking-[0.3em] text-center" value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(""); }} aria-invalid={!!err} />
            </div>
            <Btn type="submit" variant="primary" disabled={code.length !== 4}>Pair</Btn>
          </div>
          {err && <div role="alert" className="mt-1.5 text-[12px] text-rose-700">{err}</div>}
        </form>
        <div className="min-w-0 flex-1 basis-64">
          <h3 className="text-[13px] font-semibold text-navy-900 mb-1.5">Paired screens <span className="text-slate-500 tnum">{screens.length}</span></h3>
          {screens.length === 0 ? (
            <p className="text-[12.5px] text-slate-500">None yet — paired screens appear here and follow the settings below.</p>
          ) : (
            <ul className="space-y-1.5">
              {screens.map((x) => (
                <li key={x.device} className="flex items-center gap-2 rounded-lg ring-1 ring-slate-200 px-2 py-1.5">
                  <Icon.monitor size={15} className="text-teal-700 shrink-0" />
                  <input aria-label={`Name of ${x.name}`} value={x.name} onChange={(e) => rename(x.device, e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-navy-900 rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" />
                  <span className="text-[11.5px] text-slate-500 whitespace-nowrap">since {new Date(x.pairedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  <button type="button" aria-label={`Remove ${x.name}`} onClick={() => remove(x.device)} className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                    <Icon.trash size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
