import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { QR } from "../../components/charts";
import { useApp } from "../../app/store";
import { readHashQuery } from "../../app/router";
import { TENANT, WEATHER_DEMO, ZONES, todayISO } from "../../data/beach";
import { DISPLAY_TEXT, displayLangs, type DisplayText, PAIR_CODE_TTL, newPairCode, readPending, writePending, type PendingCode, availLevel, effectiveTheme, type AvailLevel, type DisplayTheme } from "../../domain/display";
import type { SunbedSlot, Zone } from "../../domain/types";
import { useClosure, useLiveSlots, useNow } from "../../lib/useLiveSlots";

/* ============ Entrance live display (AENR-519) ============
   `#/display` — a chrome-less, read-only signage screen: how many sets are
   free now, where, and from what price. It reads the same live availability
   as the wizard, the till and the Controller (walk-in view, today) and picks
   up changes from the other windows through the shared store. Sizes are in
   vmin so it scales from the admin preview to a TV read from 3–5 m. */

const THEME: Record<
  Exclude<DisplayTheme, "auto">,
  { root: string; card: string; muted: string; beach: string; ring: string; accent: string; track: string; sea: string }
> = {
  dark: {
    root: "bg-navy-900 text-white",
    card: "bg-white/[.08] ring-1 ring-white/15",
    muted: "text-white/75",
    beach: "bg-gradient-to-b from-sky-800/70 via-navy-900 to-amber-900/40",
    ring: "ring-white/20",
    accent: "text-teal-300",
    track: "bg-white/20",
    sea: "bg-sky-400/30",
  },
  // Day (AENR-594): readable in direct sun — near-black text on white cards (≥ 7:1),
  // muted text slate-700 (≥ 7:1 on white), accent teal-800.
  light: {
    root: "bg-sky-50 text-navy-950",
    card: "bg-white ring-1 ring-slate-300 shadow-sm",
    muted: "text-slate-700",
    beach: "bg-gradient-to-b from-sky-100 via-amber-50 to-amber-100",
    ring: "ring-slate-400",
    accent: "text-teal-800",
    track: "bg-slate-200",
    sea: "bg-sky-300/60",
  },
  contrast: {
    root: "bg-black text-white",
    card: "bg-black ring-2 ring-white",
    muted: "text-white",
    beach: "bg-black ring-2 ring-white",
    ring: "ring-white",
    accent: "text-yellow-300",
    track: "bg-white/30",
    sea: "bg-white/20",
  },
};
const LEVEL: Record<AvailLevel, string> = {
  plenty: "bg-emerald-500",
  filling: "bg-amber-400",
  almost: "bg-orange-500",
  full: "bg-rose-500",
  closed: "bg-slate-500",
};
const hhmm = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

type ZoneStat = {
  zone: Zone;
  slots: SunbedSlot[];
  free: number;
  total: number;
  from?: number;
  level: AvailLevel;
};
const setKind = (s: SunbedSlot): "a" | "h" | "u" | "b" =>
  s.state === "u" && s.inv?.startsWith("Out of service") ? "b" : s.state;

function DisplayBoard() {
  const {
    display: cfg,
    zoneMap,
    zoneLogos,
    weather,
    till,
    sunbedOps,
    inventory,
    payLinks,
    closedStores,
    calendar,
  } = useApp();
  const preview = readHashQuery().get("preview") === "1";
  const live = useLiveSlots("walkin");
  const closure = useClosure();
  const now = useNow(1000);
  const day = todayISO();
  // Auto follows the clock, so an open display flips at sunrise / sunset without a reload.
  const th = THEME[effectiveTheme(cfg, hhmm(now))];

  const zones = cfg.zones.length
    ? cfg.zones.flatMap((id) => ZONES.filter((z) => z.id === id))
    : ZONES;
  const stats: ZoneStat[] = zones.map((zone) => {
    const closed = !!closure(zone.id, day);
    const slots = live(zone, [day]);
    const free = closed ? [] : slots.filter((s) => s.state === "a");
    return {
      zone,
      slots,
      free: free.length,
      total: slots.length,
      from: free.length ? Math.min(...free.map((s) => s.price)) : undefined,
      level: availLevel(free.length, slots.length, closed),
    };
  });
  const totalFree = stats.reduce((a, s) => a + s.free, 0);
  const froms = stats.flatMap((s) => (s.from !== undefined ? [s.from] : []));
  const lowest = froms.length ? Math.min(...froms) : undefined;

  // Rotation: overview → each zone; a single zone is shown on its own (no rotation).
  const views =
    zones.length === 1
      ? [zones[0].id]
      : cfg.rotate
        ? ["overview", ...zones.map((z) => z.id)]
        : ["overview"];
  const [step, setStep] = useState(0);
  // Exactly the chosen languages, in the manager's order (AENR-678); one = no rotation.
  const langs = displayLangs(cfg.langs);
  const cycles = views.length > 1 || langs.length > 1;
  useEffect(() => {
    if (!cycles) return;
    const id = window.setInterval(() => setStep((s) => s + 1), Math.max(4, cfg.interval) * 1000);
    return () => window.clearInterval(id);
  }, [cycles, cfg.interval]);
  const view = views[step % views.length];
  const lang = langs[step % langs.length];
  const T = DISPLAY_TEXT[lang];

  // "Updated" heartbeat: any change to availability, or a successful 30 s tick while online.
  const [updated, setUpdated] = useState(() => Date.now());
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(
    () => setUpdated(Date.now()),
    [till, sunbedOps, inventory, payLinks, closedStores, calendar],
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const beat = window.setInterval(() => navigator.onLine && setUpdated(Date.now()), 30000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.clearInterval(beat);
    };
  }, []);
  const stale = !online && now - updated > 120000;

  // Full screen (double-click or the button, which hides when the mouse rests).
  const [controls, setControls] = useState(true);
  useEffect(() => {
    if (!controls) return;
    const id = window.setTimeout(() => setControls(false), 3000);
    return () => window.clearTimeout(id);
  }, [controls]);
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };
  useEffect(() => {
    document.title = `${TENANT.name} · Live availability`;
    // Double-click anywhere toggles full screen (the button is the keyboard path).
    const dbl = () => toggleFull();
    const move = () => setControls(true);
    document.addEventListener("dblclick", dbl);
    document.addEventListener("mousemove", move);
    return () => {
      document.removeEventListener("dblclick", dbl);
      document.removeEventListener("mousemove", move);
    };
  }, []);

  const w = WEATHER_DEMO[weather];
  const WIcon = Icon[w.icon] ?? Icon.sun;
  const zoneStat = stats.find((s) => s.zone.id === view);

  return (
    <div
      lang={lang}
      className={`fixed inset-0 overflow-hidden flex flex-col select-none ${th.root}`}
    >
      <style>{`@keyframes displaygrow{from{width:0}to{width:100%}}`}</style>
      {/* Header: tenant, clock, weather */}
      <header className="flex items-center gap-[2vmin] px-[3vmin] pt-[2.4vmin]">
        <img
          src={`${import.meta.env.BASE_URL}tenant-logo.png`}
          alt=""
          className="h-[7vmin] w-auto rounded-[1vmin] bg-white/90 p-[0.4vmin]"
        />
        <div className="font-display font-bold text-[3.4vmin] leading-tight">
          {TENANT.name}
          <div className={`text-[2vmin] font-medium ${th.muted}`}>{TENANT.place}</div>
        </div>
        <div className="ml-auto flex items-center gap-[2.4vmin] text-[3.2vmin] font-semibold tnum">
          {cfg.showWeather && (
            <span className="flex items-center gap-[1vmin]">
              <WIcon size={24} className="w-[3.6vmin] h-[3.6vmin]" /> {w.tempC}°C
            </span>
          )}
          <span>{hhmm(now)}</span>
        </div>
      </header>

      <main className="flex-1 min-h-0 grid landscape:grid-cols-[minmax(0,1fr)_30vmin] portrait:grid-rows-[auto_minmax(0,1fr)_auto] gap-[2.4vmin] p-[3vmin]">
        <section className="min-h-0 flex flex-col gap-[2vmin] portrait:row-span-2">
          <div aria-live="polite">
            <div className="font-display font-extrabold leading-none text-[8vmin] tnum">
              {T.freeNow(totalFree)}
            </div>
            {cfg.showPrices && lowest !== undefined && (
              <div className={`mt-[0.8vmin] text-[3.6vmin] font-semibold ${th.accent}`}>
                {T.from(lowest)}
              </div>
            )}
          </div>
          <div key={`${view}-${lang}`} className="flex-1 min-h-0 motion-safe:animate-fade-in">
            {view === "overview" || !zoneStat ? (
              <Overview
                stats={stats}
                zoneMap={zoneMap}
                logos={zoneLogos}
                th={th}
                T={T}
                title={T.overview}
              />
            ) : (
              <ZoneView s={zoneStat} th={th} T={T} />
            )}
          </div>
        </section>

        <aside className="min-h-0 flex landscape:flex-col portrait:flex-row gap-[2vmin]">
          {cfg.showQr && (
            <div
              className={`rounded-[2vmin] p-[2vmin] flex flex-col items-center text-center ${th.card}`}
            >
              <div className="bg-white rounded-[1.2vmin] p-[1vmin] w-[20vmin] h-[20vmin] [&_svg]:!w-full [&_svg]:!h-full">
                <QR seed={`https://${TENANT.subdomain}/book`} size={160} />
              </div>
              <div className="mt-[1.2vmin] text-[2.4vmin] font-bold leading-tight">{T.book}</div>
              <div className={`text-[1.8vmin] ${th.muted}`}>{TENANT.subdomain}</div>
            </div>
          )}
          {cfg.showPrices && (
            <div className={`rounded-[2vmin] p-[2vmin] flex-1 min-h-0 ${th.card}`}>
              <div className={`text-[1.8vmin] font-semibold uppercase tracking-wider ${th.muted}`}>
                {T.prices}
              </div>
              <ul className="mt-[1vmin] space-y-[0.8vmin] text-[2.4vmin]">
                {stats.map((s) => (
                  <li key={s.zone.id} className="flex justify-between gap-[1vmin]">
                    <span>{s.zone.name}</span>
                    <span className="font-semibold tnum">
                      {s.from !== undefined ? T.from(s.from) : T.level[s.level]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </main>

      {/* Footer: update heartbeat, rotation progress */}
      <footer
        className={`flex items-center gap-[2vmin] px-[3vmin] pb-[2vmin] text-[2vmin] ${th.muted}`}
      >
        {stale ? (
          <span
            role="status"
            className="rounded-[1vmin] bg-amber-400 text-navy-900 font-semibold px-[1.4vmin] py-[0.4vmin]"
          >
            {T.stale(hhmm(updated))}
          </span>
        ) : (
          <span className="flex items-center gap-[1vmin]">
            <span
              className="w-[1.4vmin] h-[1.4vmin] rounded-full bg-emerald-400 motion-safe:animate-pulse"
              aria-hidden
            />{" "}
            {T.updated(hhmm(updated))}
          </span>
        )}
        {views.length > 1 && (
          <div className="ml-auto flex items-center gap-[1.2vmin]">
            <span className="tnum">
              {(step % views.length) + 1} / {views.length}
            </span>
            <div
              className={`w-[18vmin] h-[0.8vmin] rounded-full overflow-hidden ring-1 ${th.ring}`}
            >
              <div
                key={step}
                className="h-full bg-teal-400 motion-reduce:w-full"
                style={{ animation: `displaygrow ${Math.max(4, cfg.interval)}s linear` }}
              />
            </div>
          </div>
        )}
      </footer>

      {!preview && (
        <button
          type="button"
          onClick={toggleFull}
          aria-label="Full screen (double-click anywhere; Esc to exit)"
          className={`absolute bottom-[6vmin] right-[3vmin] rounded-xl bg-white/90 text-navy-900 px-3 py-2 text-sm font-semibold shadow-lift transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${controls ? "opacity-100" : "opacity-0"}`}
        >
          <Icon.layers size={14} className="inline -mt-0.5 mr-1" /> Full screen
        </button>
      )}
    </div>
  );
}

type Txt = DisplayText;
type Th = (typeof THEME)["dark"];

/* Every zone in its place on the beach (portrait: a list), with free / total and a labelled fill bar. */
function Overview({
  stats,
  zoneMap,
  logos,
  th,
  T,
  title,
}: {
  stats: ZoneStat[];
  zoneMap: { id: string; x: number; y: number }[];
  logos: Record<string, string>;
  th: Th;
  T: Txt;
  title: string;
}) {
  return (
    <div
      className={`relative h-full rounded-[2vmin] overflow-hidden ${th.beach}`}
      role="img"
      aria-label={`${title}: ${stats.map((s) => `${s.zone.name} ${s.free} ${T.free}`).join(", ")}`}
    >
      <div className={`absolute inset-x-0 top-0 h-[12%] ${th.sea}`} aria-hidden />
      <div className="landscape:contents portrait:grid portrait:grid-cols-2 portrait:gap-[1.6vmin] portrait:p-[2vmin] portrait:pt-[8vmin]">
        {stats.map((s, i) => {
          const pos = zoneMap.find((z) => z.id === s.zone.id) ?? {
            x: 6 + (i % 3) * 32,
            y: 30 + Math.floor(i / 3) * 30,
          };
          return (
            <div
              key={s.zone.id}
              className={`landscape:absolute landscape:w-[28%] rounded-[1.6vmin] p-[1.6vmin] ${th.card}`}
              style={{ left: `${pos.x}%`, top: `${Math.min(72, 15 + (pos.y - 30) * 1.3)}%` }}
            >
              <div className="flex items-center gap-[1vmin]">
                {logos[s.zone.id] ? (
                  <img
                    src={logos[s.zone.id]}
                    alt=""
                    className="w-[4vmin] h-[4vmin] rounded-[0.8vmin] bg-white object-contain"
                  />
                ) : (
                  <span
                    className="w-[1.6vmin] h-[1.6vmin] rounded-full"
                    style={{ background: s.zone.color }}
                    aria-hidden
                  />
                )}
                <span className="font-display font-bold text-[3vmin] truncate">{s.zone.name}</span>
              </div>
              <div className="mt-[0.6vmin] flex items-baseline gap-[0.8vmin] tnum">
                <span className="text-[5vmin] font-extrabold leading-none">{s.free}</span>
                <span className={`text-[2vmin] ${th.muted}`}>
                  {T.free} · {T.of} {s.total}
                </span>
              </div>
              <div
                className={`mt-[0.8vmin] h-[1.2vmin] rounded-full overflow-hidden ${th.track} ring-1 ${th.ring}`}
              >
                <div
                  className={`h-full ${LEVEL[s.level]}`}
                  style={{ width: `${s.total ? Math.round((s.free / s.total) * 100) : 0}%` }}
                />
              </div>
              <div className="mt-[0.6vmin] text-[2vmin] font-semibold">{T.level[s.level]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* One zone's sets — free / on hold / taken / out of service, each with its own mark, plus a text legend. */
function ZoneView({ s, th, T }: { s: ZoneStat; th: Th; T: Txt }) {
  const SWATCH: Record<"a" | "h" | "u" | "b", string> = {
    a: "bg-emerald-500 text-white",
    h: "bg-amber-300 text-navy-900 ring-[0.3vmin] ring-dashed ring-amber-700",
    u: "bg-slate-500/70 text-white/80 bg-[repeating-linear-gradient(45deg,transparent_0_0.6vmin,rgba(0,0,0,.25)_0.6vmin_1.2vmin)]",
    b: "bg-rose-600 text-white",
  };
  const MARK = { a: "✓", h: "…", u: "", b: "✕" };
  return (
    <div className="h-full flex flex-col gap-[1.4vmin]">
      <div className="flex flex-wrap items-baseline gap-x-[2vmin]">
        <span className="font-display font-bold text-[4.4vmin]">{s.zone.name}</span>
        <span className="text-[3vmin] font-semibold tnum">
          {s.free} {T.free} · {T.of} {s.total}
        </span>
        <span className={`text-[2.4vmin] ${th.muted}`}>{T.level[s.level]}</span>
      </div>
      <div
        className={`relative flex-1 min-h-0 rounded-[2vmin] ${th.beach}`}
        role="img"
        aria-label={`${s.zone.name}: ${s.free} ${T.free}`}
      >
        <div
          className={`absolute inset-x-0 top-0 h-[8%] ${th.sea} rounded-t-[2vmin]`}
          aria-hidden
        />
        {s.slots.map((x) => {
          const k = s.level === "closed" ? "b" : setKind(x);
          return (
            <span
              key={x.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-[3.6vmin] h-[3.6vmin] rounded-[0.8vmin] grid place-items-center text-[1.6vmin] font-bold ${SWATCH[k]}`}
              style={{ left: `${x.x}%`, top: `${x.y}%` }}
              aria-hidden
            >
              {MARK[k]}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-[2.4vmin] gap-y-[0.6vmin] text-[2.2vmin]">
        {(["a", "h", "u", "b"] as const).map((k) => (
          <span key={k} className="flex items-center gap-[0.8vmin]">
            <span
              className={`w-[2.4vmin] h-[2.4vmin] rounded-[0.5vmin] grid place-items-center text-[1.3vmin] font-bold ${SWATCH[k]}`}
              aria-hidden
            >
              {MARK[k]}
            </span>
            {T.legend[k]}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============ Pair a screen with a code (AENR-602) ============
   A TV or signage PC that isn't paired shows a 4-digit code; the manager types
   it under Live display › Pair a screen and this window becomes the display.
   Each window is its own device (sessionStorage). The admin preview skips it. */
function deviceId() {
  try {
    let id = sessionStorage.getItem("slaice.display.device");
    if (!id) {
      id = `scr-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("slaice.display.device", id);
    }
    return id;
  } catch {
    return "scr-local";
  }
}

export function LiveDisplay() {
  const { display: cfg } = useApp();
  const preview = readHashQuery().get("preview") === "1";
  const device = useMemo(deviceId, []);
  const paired = (cfg.screens ?? []).some((x) => x.device === device);
  if (preview || paired) return <DisplayBoard />;
  return <PairingScreen device={device} />;
}

function PairingScreen({ device }: { device: string }) {
  const now = useNow(30000);
  const [mine, setMine] = useState<PendingCode | null>(null);
  // Post a fresh code when there is none or it expired (every 10 minutes).
  useEffect(() => {
    if (mine && now - mine.at < PAIR_CODE_TTL) return;
    const others = readPending().filter((x) => x.device !== device);
    let code = newPairCode();
    while (others.some((x) => x.code === code)) code = newPairCode();
    const next = { code, device, at: Date.now() };
    writePending([...others, next]);
    setMine(next);
  }, [mine, now, device]);
  return (
    <div className="min-h-dvh bg-navy-950 text-white grid place-items-center p-8 text-center">
      <div>
        <div className="text-[2.4vmin] uppercase tracking-[0.3em] text-teal-300 font-semibold">{TENANT.name} · Live display</div>
        <h1 className="mt-[3vmin] font-display font-bold text-[5vmin]">Pair this screen</h1>
        <div aria-live="polite" aria-label={mine ? `Pairing code ${mine.code.split("").join(" ")}` : "Getting a code"} className="mt-[4vmin] font-mono font-bold tracking-[0.25em] text-[16vmin] leading-none tnum">
          {mine ? mine.code : "····"}
        </div>
        <p className="mt-[4vmin] text-[2.8vmin] text-white/80 max-w-[70vmin] mx-auto">
          In Slaice, open <b>Live display</b> and type this code under <b>Pair a screen</b>. The code changes every 10 minutes.
        </p>
      </div>
    </div>
  );
}
