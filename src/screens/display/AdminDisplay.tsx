import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, Input, Select, Toggle } from "../../components/ui";
import { useApp } from "../../app/store";
import { ZONES } from "../../data/beach";
import { DEFAULT_DISPLAY, THEME_LABEL, displayUrl, effectiveTheme, openDisplay, type DisplayConfig } from "../../domain/display";
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
            <Field label="Languages">
              <Select
                value={cfg.langs.join("+")}
                onChange={(e) =>
                  set({ langs: e.target.value.split("+") as DisplayConfig["langs"] })
                }
                options={[
                  { v: "en+el", l: "English ↔ Greek (rotate)" },
                  { v: "en", l: "English" },
                  { v: "el", l: "Greek" },
                ]}
              />
            </Field>
          </section>
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

        <Card className="p-4">
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
