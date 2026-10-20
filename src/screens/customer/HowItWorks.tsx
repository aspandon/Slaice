import { useLayoutEffect, useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap, motionOK, EASE } from "../../lib/fx";
import { Icon } from "../../lib/icons";
import { Btn } from "../../components/ui";
import { qrCells } from "../../components/charts";
import { BEDS, CANOPY, CANOPY_WEDGES, FIN, sunbedPalette } from "../../components/sunbedGlyph";
import { todayISO } from "../../data/beach";
import { localeFor } from "../../app/i18n";
import { useApp, useT } from "../../app/store";
import { useMediaQuery } from "../../lib/useMediaQuery";
import type { SunbedState } from "../../domain/types";

/* ============ How it works — a scroll story for first-time guests (AENR-789) ============
   Three beats under the Home hero — pick your day, pick your spot, walk in with
   your phone — told by one pinned card whose illustration plays as the guest
   scrolls (ScrollTrigger pin + scrub, native window scroll). Reduced motion, or
   a viewport too short to pin a card in (landscape phones), gets the same three
   beats as static cards. Every illustration renders in its final state; the
   timeline only adds the journey to it. */

// Registered here, not in fx.ts: with its vite.config chunk rule, ScrollTrigger only ships with Home.
gsap.registerPlugin(ScrollTrigger);

const BEATS = [
  {
    title: "Pick your day",
    body: "Choose any day of the season — free sunbeds and prices show up straight away.",
  },
  {
    title: "Pick your spot",
    body: "Tap an umbrella on the live beach map. The coral one is yours.",
  },
  {
    title: "Walk in with your phone",
    body: "Your QR code is your ticket — scan it at the gate and head for the sand.",
  },
] as const;

// One story per page, so the scenes' fixed SVG ids (hiw-*) are safe.
const SCENES = [DayScene, SpotScene, GateScene];

const ART =
  "relative rounded-2xl overflow-hidden bg-gradient-to-b from-white/80 to-teal-100/60 ring-1 ring-white/70";

export function HowItWorks() {
  const { dive } = useApp();
  const t = useT();
  const root = useRef<HTMLElement>(null);
  // Pinning needs room for the whole card between the top bar and the tab bar.
  const reduce = useMediaQuery("(prefers-reduced-motion: reduce)");
  const tall = useMediaQuery("(min-height: 540px)");
  const story = !reduce && tall;

  useLayoutEffect(() => {
    const el = root.current;
    if (!story || !el || !motionOK()) return;
    const card = el.querySelector<HTMLElement>("[data-hiw-card]");
    if (!card) return;
    const pick = gsap.utils.selector(el);
    const ctx = gsap.context(() => {
      const q = (k: string): Element[] => pick(`[data-hiw="${k}"]`);
      const [sel] = q("sel");
      const selX = Number(sel?.getAttribute("x") ?? 0);
      const shift = Number(sel?.getAttribute("data-shift") ?? 0);
      const [b1, b2, b3] = q("beat");
      const [s1, s2, s3] = q("scene");
      const seg = q("seg");

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: card,
          pin: true,
          start: "center center",
          end: () => `+=${Math.round(window.innerHeight * 2.4)}`,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          // Come to rest on a whole beat, never between two half-faded ones; no inertia, so a
          // phone fling moves one beat instead of skipping the story.
          snap: {
            snapTo: "labelsDirectional",
            inertia: false,
            duration: { min: 0.2, max: 0.6 },
            delay: 0.12,
            ease: "power1.inOut",
          },
        },
      });
      tl.addLabel("start", 0)
        // 1 · the selector walks from today to Saturday, which gets tapped.
        .fromTo(seg[0], { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0)
        .fromTo(
          sel,
          { attr: { x: selX - shift } },
          { attr: { x: selX }, duration: 0.6, ease: EASE.inOut },
          0.1,
        )
        .fromTo(q("todayNum"), { fill: "#ffffff" }, { fill: "#0B2545", duration: 0.2 }, 0.2)
        .fromTo(q("todayWk"), { fill: "#ccfbf1" }, { fill: "#64748b", duration: 0.2 }, 0.2)
        .fromTo(q("pickNum"), { fill: "#0B2545" }, { fill: "#ffffff", duration: 0.2 }, 0.5)
        .fromTo(q("pickWk"), { fill: "#64748b" }, { fill: "#ccfbf1", duration: 0.2 }, 0.5)
        .fromTo(
          q("tap"),
          { scale: 0.4, opacity: 0, transformOrigin: "50% 50%" },
          { scale: 1.1, opacity: 0.9, duration: 0.12 },
          0.6,
        )
        .to(q("tap"), { scale: 1.8, opacity: 0, duration: 0.25 }, 0.72)
        .fromTo(
          q("chip"),
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.25, ease: EASE.out },
          0.72,
        )
        .addLabel("one", 1)
        // 1 → 2
        .to(b1, { opacity: 0, y: -18, duration: 0.3 }, 1.1)
        .to(s1, { opacity: 0, scale: 0.97, duration: 0.3 }, 1.1)
        .fromTo(s2, { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: 0.35 }, 1.15)
        .fromTo(b2, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.3 }, 1.25)
        .fromTo(seg[1], { scaleX: 0 }, { scaleX: 1, duration: 1.2 }, 1.1)
        // 2 · the beach eases in and one umbrella unfolds — coral, yours.
        .fromTo(
          q("beach"),
          { scale: 0.94, transformOrigin: "50% 50%" },
          { scale: 1, duration: 1.1 },
          1.15,
        )
        .fromTo(
          q("canopy"),
          { scale: 0.25, rotation: -150, transformOrigin: "50% 50%" },
          { scale: 1, rotation: 0, duration: 0.5, ease: EASE.out },
          1.45,
        )
        .fromTo(q("coral"), { opacity: 0 }, { opacity: 1, duration: 0.25 }, 1.7)
        .fromTo(
          q("ring"),
          { scale: 0.4, opacity: 0, transformOrigin: "50% 50%" },
          { scale: 1, opacity: 1, duration: 0.3, ease: EASE.out },
          1.75,
        )
        .fromTo(
          q("pin"),
          { opacity: 0, y: -12 },
          { opacity: 1, y: 0, duration: 0.3, ease: EASE.spring },
          1.9,
        )
        .addLabel("two", 2.3)
        // 2 → 3
        .to(b2, { opacity: 0, y: -18, duration: 0.3 }, 2.4)
        .to(s2, { opacity: 0, scale: 0.97, duration: 0.3 }, 2.4)
        .fromTo(s3, { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: 0.35 }, 2.45)
        .fromTo(b3, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.3 }, 2.55)
        .fromTo(seg[2], { scaleX: 0 }, { scaleX: 1, duration: 1.4 }, 2.4)
        // 3 · the phone meets the scanner, the screen goes teal, the gate opens.
        .fromTo(
          q("phone"),
          { x: -70, rotation: 8, transformOrigin: "50% 50%" },
          { x: 0, rotation: 0, duration: 0.5, ease: EASE.out },
          2.6,
        )
        .fromTo(q("beam"), { y: 0, opacity: 0 }, { y: 40, opacity: 1, duration: 0.3 }, 3.05)
        .to(q("beam"), { opacity: 0, duration: 0.08 }, 3.35)
        .fromTo(q("ok"), { opacity: 0 }, { opacity: 1, duration: 0.08 }, 3.35)
        .fromTo(
          q("flapL"),
          { attr: { width: 55 } },
          { attr: { width: 4 }, duration: 0.3, ease: EASE.inOut },
          3.42,
        )
        .fromTo(
          q("flapR"),
          { attr: { x: 238, width: 55 } },
          { attr: { x: 289, width: 4 }, duration: 0.3, ease: EASE.inOut },
          3.42,
        )
        .fromTo(
          q("welcome"),
          { scale: 0, opacity: 0, transformOrigin: "50% 50%" },
          { scale: 1, opacity: 1, duration: 0.25, ease: EASE.spring },
          3.6,
        )
        .fromTo(
          q("go"),
          { opacity: 0, x: -8 },
          { opacity: 1, x: 0, duration: 0.15, stagger: 0.05, ease: EASE.out },
          3.62,
        )
        .set({}, {}, 3.9)
        .addLabel("three", 3.9);
    }, el);

    // Webfonts and anything above the story (the hero's height follows its copy and
    // language) move the pin's start, so re-measure when they settle.
    let live = true;
    document.fonts.ready.then(() => live && ScrollTrigger.refresh());
    const prev = el.previousElementSibling;
    const ro = prev ? new ResizeObserver(() => ScrollTrigger.refresh()) : null;
    if (prev) ro?.observe(prev);
    return () => {
      live = false;
      ro?.disconnect();
      ctx.revert();
    };
  }, [story]);

  const heading = (
    <div>
      <div className="text-guest-over font-semibold uppercase tracking-[0.14em] text-teal-700">
        {t("New here?")}
      </div>
      <h2
        id="how-it-works"
        className="mt-1 font-display font-bold text-guest-title leading-tight tracking-tight text-navy-900"
      >
        {t("How it works")}
      </h2>
      <p className="mt-1 text-guest-meta text-slate-600">
        {t("Three steps from your sofa to your sunbed.")}
      </p>
    </div>
  );
  const cta = (
    <Btn variant="primary" size="lg" icon={Icon.sparkles} onClick={() => dive()}>
      {t("Start guided booking")} <Icon.arrowR size={16} />
    </Btn>
  );

  if (!story)
    return (
      <section
        ref={root}
        aria-labelledby="how-it-works"
        className="glass-flat rounded-3xl p-5 sm:p-7 flex flex-col gap-5"
      >
        {heading}
        <ol className="grid gap-6 sm:gap-5 sm:grid-cols-3">
          {BEATS.map((b, i) => {
            const Scene = SCENES[i];
            return (
              <li key={b.title} className="flex flex-col gap-3">
                <div className={`${ART} aspect-[16/11]`} aria-hidden="true">
                  <Scene />
                </div>
                <BeatText i={i} />
              </li>
            );
          })}
        </ol>
        <div>{cta}</div>
      </section>
    );

  return (
    <section ref={root} aria-labelledby="how-it-works">
      {/* Height fits between the phone's top bar and the fixed tab bar (~72 px) so
          the CTA stays clear of it while pinned; desktop caps at a calm 560 px. */}
      <div
        data-hiw-card
        className="glass-flat rounded-3xl p-5 sm:p-7 h-[min(620px,calc(100svh_-_176px))] md:h-[min(560px,calc(100svh_-_140px))] grid gap-4 md:gap-x-10 grid-rows-[auto_minmax(0,1fr)_auto_auto] md:grid-rows-[auto_minmax(0,1fr)_auto] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      >
        <div className="md:col-start-1 md:row-start-1">{heading}</div>
        <div className={`${ART} md:col-start-2 md:row-start-1 md:row-span-3`} aria-hidden="true">
          {SCENES.map((Scene, i) => (
            <div key={i} data-hiw="scene" className="absolute inset-0">
              <Scene />
            </div>
          ))}
        </div>
        {/* The three beats share one cell, so it is as tall as the longest translation. */}
        <ol className="grid md:col-start-1 md:row-start-2 md:self-center">
          {BEATS.map((b, i) => (
            <li key={b.title} data-hiw="beat" className="[grid-area:1/1]">
              <BeatText i={i} />
            </li>
          ))}
        </ol>
        <div className="md:col-start-1 md:row-start-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {BEATS.map((b) => (
              <span key={b.title} className="w-8 h-1.5 rounded-full bg-navy-900/10 overflow-hidden">
                <span
                  data-hiw="seg"
                  className="block h-full w-full rounded-full bg-teal-600 origin-left"
                />
              </span>
            ))}
          </div>
          {cta}
        </div>
      </div>
    </section>
  );
}

function BeatText({ i }: { i: number }) {
  const t = useT();
  const b = BEATS[i];
  return (
    <div>
      <div className="text-guest-over font-semibold uppercase tracking-[0.14em] text-slate-500">
        {t("Step")} {i + 1}
      </div>
      <h3 className="mt-1 font-display font-bold text-guest-head md:text-[22px] leading-tight text-navy-900">
        {t(b.title)}
      </h3>
      <p className="mt-1.5 text-guest-body text-slate-700 max-w-md">{t(b.body)}</p>
    </div>
  );
}

/* ---------- Beat 1: a week strip where Saturday gets picked ---------- */
const DAY = { x0: 22, w: 36, step: 40 } as const;

function DayScene() {
  const { lang } = useApp();
  const loc = localeFor(lang);
  const [y, m, d] = todayISO().split("-").map(Number);
  const days = Array.from({ length: 7 }, (_, i) => new Date(y, m - 1, d + i));
  const sat = days.findIndex((x, i) => i > 0 && x.getDay() === 6);
  const pick = sat > 0 ? sat : 6;
  const wk = new Intl.DateTimeFormat(loc, { weekday: "short" });
  const month = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }).format(days[pick]);
  const chip = new Intl.DateTimeFormat(loc, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(days[pick]);
  const chipW = Math.min(280, chip.length * 6.6 + 50);
  const cx = (i: number) => DAY.x0 + i * DAY.step + DAY.w / 2;
  return (
    <svg viewBox="0 0 320 220" className="w-full h-full" focusable="false">
      <defs>
        <filter id="hiw-shadow" x="-20%" y="-30%" width="140%" height="170%">
          <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#0B2545" floodOpacity="0.13" />
        </filter>
      </defs>
      <rect x="12" y="28" width="296" height="128" rx="20" fill="#fff" filter="url(#hiw-shadow)" />
      <text x="28" y="56" fontSize="13" fontWeight="700" fill="#0B2545">
        {month}
      </text>
      <path
        d="M268 47 l-4 4 4 4 M286 47 l4 4 -4 4"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        data-hiw="sel"
        data-shift={pick * DAY.step}
        x={DAY.x0 + pick * DAY.step}
        y="68"
        width={DAY.w}
        height="74"
        rx="12"
        fill="#0B2545"
      />
      {days.map((x, i) => {
        const role = i === pick ? "pick" : i === 0 ? "today" : "";
        return (
          <g key={i}>
            <text
              data-hiw={role ? `${role}Wk` : undefined}
              x={cx(i)}
              y="92"
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill={i === pick ? "#ccfbf1" : "#64748b"}
            >
              {wk.format(x)}
            </text>
            <text
              data-hiw={role ? `${role}Num` : undefined}
              x={cx(i)}
              y="118"
              textAnchor="middle"
              fontSize="17"
              fontWeight="700"
              fill={i === pick ? "#ffffff" : "#0B2545"}
            >
              {x.getDate()}
            </text>
          </g>
        );
      })}
      <circle cx={cx(0)} cy="131" r="2.5" fill="#14b8a6" />
      <circle
        data-hiw="tap"
        cx={cx(pick)}
        cy="105"
        r="20"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="2"
        opacity="0"
      />
      <g data-hiw="chip">
        <rect
          x={160 - chipW / 2}
          y="170"
          width={chipW}
          height="32"
          rx="16"
          fill="#fff"
          filter="url(#hiw-shadow)"
        />
        <circle cx={160 - chipW / 2 + 20} cy="186" r="9" fill="#0D9488" />
        <path
          d={`M${160 - chipW / 2 + 15.5} 186 l3 3 5.5 -6`}
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x={160 - chipW / 2 + 36} y="190.5" fontSize="12" fontWeight="600" fill="#0B2545">
          {chip}
        </text>
      </g>
    </svg>
  );
}

/* ---------- Beat 2: a small beach where one umbrella opens (coral = yours) ----------
   Drawn with the booking map's own sunbed glyph (sunbedGlyph.ts), so the guest
   meets the same umbrellas inside the wizard. */
const GLYPH_S = 0.74;
const ROWS: SunbedState[][] = [
  ["a", "u", "u", "a", "u"],
  ["u", "a", "a", "u", "a"],
  ["a", "a", "u", "a", "a"],
];
const PICK = { r: 1, c: 2 } as const;
const COL_X = [40, 100, 160, 220, 280];
const ROW_Y = [92, 140, 188];

function SpotScene() {
  const t = useT();
  const yours = t("Yours");
  const pinW = Math.max(48, yours.length * 7 + 22);
  const px = COL_X[PICK.c];
  const py = ROW_Y[PICK.r] - (37.5 - CANOPY.cy) * GLYPH_S; // canopy centre
  return (
    // Sea and sand run past the viewBox, so a tall or wide panel shows more beach instead of
    // cropping the umbrellas.
    <svg viewBox="0 0 320 220" overflow="visible" className="w-full h-full" focusable="false">
      <defs>
        <linearGradient id="hiw-sea" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="72">
          <stop offset="0" stopColor="#0c6e8e" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="hiw-sand" gradientUnits="userSpaceOnUse" x1="0" y1="56" x2="0" y2="230">
          <stop offset="0" stopColor="#f7e4c4" />
          <stop offset="0.55" stopColor="#f0d4a3" />
          <stop offset="1" stopColor="#e6c08a" />
        </linearGradient>
      </defs>
      <rect x="-400" y="-400" width="1120" height="472" fill="url(#hiw-sea)" />
      <path
        d="M-410 26 h400 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 h400"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <path
        d="M-400 60 H-10 Q30 50 70 58 T150 58 T230 58 T330 56 H720 V620 H-400 Z"
        fill="url(#hiw-sand)"
      />
      <path
        d="M-400 60 H-10 Q30 50 70 58 T150 58 T230 58 T330 56 H720"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.85"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g data-hiw="beach">
        <circle
          data-hiw="ring"
          cx={px}
          cy={py}
          r="23"
          fill="#ef6a4f"
          fillOpacity="0.14"
          stroke="#ef6a4f"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        {ROWS.map((row, r) =>
          row.map((s, c) => (
            <Glyph
              key={`${r}-${c}`}
              cx={COL_X[c]}
              cy={ROW_Y[r]}
              state={s}
              pick={r === PICK.r && c === PICK.c}
            />
          )),
        )}
        <g data-hiw="pin">
          <rect x={px - pinW / 2} y={py - 50} width={pinW} height="21" rx="10.5" fill="#e2552f" />
          <path
            d={`M${px - 5} ${py - 29.5} L${px} ${py - 24} L${px + 5} ${py - 29.5} Z`}
            fill="#e2552f"
          />
          <text x={px} y={py - 35.5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
            {yours}
          </text>
        </g>
      </g>
    </svg>
  );
}

function Glyph({
  cx,
  cy,
  state,
  pick,
}: {
  cx: number;
  cy: number;
  state: SunbedState;
  pick: boolean;
}) {
  const p = sunbedPalette(state);
  const sel = sunbedPalette(state, true);
  const canopy = (c: typeof p) => (
    <>
      <circle cx={CANOPY.cx} cy={CANOPY.cy} r={CANOPY.r + 0.8} fill={c.edge} />
      {CANOPY_WEDGES.map((w) => (
        <path key={w.d} d={w.d} fill={w.lite ? c.lite : c.c} />
      ))}
      <circle cx={FIN.cx} cy={FIN.cy} r={FIN.r} fill={c.fin} />
    </>
  );
  return (
    <g
      transform={`translate(${cx - 36 * GLYPH_S} ${cy - 37.5 * GLYPH_S}) scale(${GLYPH_S})`}
      opacity={p.dim ? 0.55 : 1}
    >
      {BEDS.map((b) => (
        <g key={b.frame.x}>
          <rect {...b.frame} rx={b.frame.r} fill={p.bed} />
          <rect {...b.cushion} rx={b.cushion.r} fill={p.cushion} />
          <path d={b.slats} stroke={p.slat} strokeWidth="1.4" strokeLinecap="round" />
        </g>
      ))}
      <g data-hiw={pick ? "canopy" : undefined}>
        {canopy(p)}
        {pick && <g data-hiw="coral">{canopy(sel)}</g>}
      </g>
    </g>
  );
}

/* ---------- Beat 3: the phone's QR opens the gate ---------- */
const QR = qrCells("SLAICE-FIRST-VISIT");

function GateScene() {
  return (
    <svg viewBox="0 0 320 220" className="w-full h-full" focusable="false">
      <g transform="translate(-36 0)">
        <ellipse cx="200" cy="196" rx="134" ry="9" fill="#0B2545" opacity="0.07" />
        {[226, 240, 254].map((x) => (
          <path
            key={x}
            data-hiw="go"
            d={`M${x} 175 l6 5 -6 5`}
            fill="none"
            stroke="#0D9488"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {/* Speed gate: glass flaps (shown open) retract into the two posts. */}
        <rect
          data-hiw="flapL"
          x="183"
          y="118"
          width="4"
          height="40"
          rx="6"
          fill="#5EEAD4"
          fillOpacity="0.6"
          stroke="#fff"
          strokeOpacity="0.9"
        />
        <rect
          data-hiw="flapR"
          x="289"
          y="118"
          width="4"
          height="40"
          rx="6"
          fill="#5EEAD4"
          fillOpacity="0.6"
          stroke="#fff"
          strokeOpacity="0.9"
        />
        <rect x="172" y="84" width="22" height="110" rx="7" fill="#13315c" />
        <rect x="282" y="84" width="22" height="110" rx="7" fill="#13315c" />
        <rect x="190" y="100" width="2.5" height="62" rx="1.25" fill="#1d4172" />
        <rect x="283.5" y="100" width="2.5" height="62" rx="1.25" fill="#1d4172" />
        <rect x="160" y="62" width="44" height="28" rx="9" fill="#0B2545" />
        <rect x="166" y="67" width="32" height="18" rx="4" fill="#1d4172" />
        <g data-hiw="ok">
          <rect x="190" y="100" width="2.5" height="62" rx="1.25" fill="#2dd4bf" />
          <rect x="283.5" y="100" width="2.5" height="62" rx="1.25" fill="#2dd4bf" />
          <rect x="166" y="67" width="32" height="18" rx="4" fill="#14b8a6" />
          <path
            d="M176 76 l4 4 8 -8"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <g data-hiw="welcome">
          <circle cx="238" cy="97" r="14" fill="#0D9488" />
          <path
            d="M231.5 97 l4.5 4.5 8.5 -9.5"
            fill="none"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        {/* Phone at the scanner (final pose); the timeline walks it in from the left. */}
        <g transform="translate(96 64) rotate(-8 28 51)">
          <g data-hiw="phone">
            <rect width="56" height="102" rx="12" fill="#0B2545" />
            <rect x="4" y="9" width="48" height="86" rx="8" fill="#fff" />
            <rect x="22" y="4" width="12" height="3" rx="1.5" fill="#1d4172" />
            <g transform={`translate(8 22) scale(${40 / 21})`}>
              {QR.map(([x, y]) => (
                <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0B2545" />
              ))}
            </g>
            <rect x="14" y="70" width="28" height="4" rx="2" fill="#cbd5e1" />
            <rect x="18" y="78" width="20" height="4" rx="2" fill="#e2e8f0" />
            <rect
              data-hiw="beam"
              x="6"
              y="21"
              width="44"
              height="2.5"
              rx="1.25"
              fill="#14b8a6"
              opacity="0"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
