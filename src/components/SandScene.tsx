import { useId } from "react";
import type { SunbedSlot } from "../domain/types";
import { Sunbed } from "./Beach";
import { useT } from "../app/store";

/* ============================================================================
   SandScene — the beach during the wizard's later steps.

   After the Beach step the sand no longer clears: the guest's picked umbrella
   sets stay where they chose them (read-only), and each step composes its
   vignette into the scene — beach towels appear as guests are added, the
   locker cabin arrives with a locker, the car parks on its pad once parking
   is on. By Review the whole day is laid out on the sand. Purely decorative
   (aria-hidden, no pointer events); pieces pop in via the existing CSS
   animation, which the global reduced-motion rules already neutralise.
   ============================================================================ */

const TOWEL_COLORS = [
  { base: "#2dd4bf", stripe: "#ffffff" },
  { base: "#fb8a63", stripe: "#fff3e8" },
  { base: "#ffc933", stripe: "#fff8df" },
  { base: "#7cc4e8", stripe: "#eef8ff" },
];
/* Where towels land around their umbrella set (Δx/Δy in % of the sand box),
   filled in this order as the headcount grows. */
const TOWEL_OFFS: [number, number][] = [[-2.6, 4.8], [2.6, 5], [0, 7.4], [-4.8, 1.8]];

export function SandScene({ slots, picked, stepId, guests, lockerOn, lockerQty, parkingOn, plate }: {
  slots: SunbedSlot[];
  picked: Set<string>;
  stepId: string;
  guests: number;
  lockerOn: boolean;
  lockerQty: number;
  parkingOn: boolean;
  plate?: string;
}) {
  const t = useT();
  const sets = slots.filter((s) => picked.has(s.id));
  if (sets.length === 0) return null;
  const showCabin = lockerOn && (stepId === "locker" || stepId === "parking" || stepId === "review");
  const showCar = parkingOn && (stepId === "parking" || stepId === "review");

  // The amenities compose with the picks rather than floating in corners: the
  // parking bay sits directly beneath the sets (their centroid x) and the
  // locker cabin shares its baseline beside it — one tidy row under your spot.
  const clampPct = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const setsX = clampPct(sets.reduce((a, s) => a + s.x, 0) / sets.length, 12, 88);
  const rowY = clampPct(Math.max(...sets.map((s) => s.y)) + 26, 34, 74);
  const sideStep = setsX > 68 ? -17 : 17; // cabin flips left when the sets sit far right
  const carX = setsX;
  const cabinX = showCar ? setsX + sideStep : setsX;
  const towels = guests > 0
    ? Array.from({ length: Math.min(guests, 12) }).map((_, i) => {
        const s = sets[i % sets.length];
        const o = TOWEL_OFFS[Math.floor(i / sets.length) % TOWEL_OFFS.length];
        return {
          key: i,
          x: s.x + o[0] + ((i * 7) % 3) * 0.4,
          y: s.y + o[1] + ((i * 5) % 3) * 0.5,
          rot: ((i * 53) % 22) - 11,
          hue: i % TOWEL_COLORS.length,
        };
      })
    : [];

  return (
    <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
      {/* Your picked sets, exactly where you chose them. */}
      {sets.map((s, i) => (
        <div
          key={s.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 animate-pop"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: "clamp(34px, 4.5vw, 54px)", height: "clamp(34px, 4.5vw, 54px)", animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
        >
          <Sunbed state={s.state} sel readOnly fill />
        </div>
      ))}

      {/* Guests' towels, laid out beside the sets as the headcount grows. */}
      {towels.map((tw) => (
        <div
          key={tw.key}
          className="absolute -translate-x-1/2 -translate-y-1/2 animate-pop"
          style={{ left: `${tw.x}%`, top: `${tw.y}%`, width: "clamp(15px, 1.6vw, 23px)", rotate: `${tw.rot}deg`, animationDelay: `${120 + tw.key * 50}ms`, animationFillMode: "both" }}
        >
          <Towel hue={tw.hue} />
        </div>
      ))}

      {/* The locker cabin, on the amenities row beside the parking bay. */}
      {showCabin && (
        <div className="absolute -translate-x-1/2 animate-pop" style={{ left: `${cabinX}%`, top: `${rowY}%`, width: "clamp(80px, 7.5vw, 116px)", animationFillMode: "both" }}>
          <LockerCabin qty={lockerQty} />
          <div className="mt-1 text-center text-[10px] font-semibold text-navy-800/80 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">{t("Day locker")}</div>
        </div>
      )}

      {/* The reserved bay with the guest's car, directly under their sets. */}
      {showCar && (
        <div className="absolute -translate-x-1/2 animate-pop" style={{ left: `${carX}%`, top: `${rowY}%`, width: "clamp(80px, 7.5vw, 116px)", animationFillMode: "both" }}>
          <ParkingSpot plate={plate} />
          <div className="mt-2.5 text-center text-[10px] font-semibold text-navy-800/80 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">{t("Parking Spot")}</div>
        </div>
      )}
    </div>
  );
}

/* A striped beach towel, flat-laid (aerial view to match the sand). */
function Towel({ hue }: { hue: number }) {
  const c = TOWEL_COLORS[hue];
  return (
    <svg viewBox="0 0 40 58" className="w-full h-auto drop-shadow-sm">
      <rect x="2" y="2" width="36" height="54" rx="7" fill={c.base} />
      <rect x="2" y="2" width="36" height="54" rx="7" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" />
      <rect x="4" y="15" width="32" height="6" rx="2" fill={c.stripe} opacity="0.85" />
      <rect x="4" y="38" width="32" height="6" rx="2" fill={c.stripe} opacity="0.85" />
    </svg>
  );
}

/* The day-locker cabin: striped awning over a row of locker doors. */
function LockerCabin({ qty }: { qty: number }) {
  return (
    <div className="relative w-full">
      <svg viewBox="0 0 120 100" className="w-full h-auto drop-shadow-md">
        <rect x="6" y="34" width="108" height="60" rx="7" fill="#fdf3dd" stroke="#d9b98a" strokeWidth="2" />
        {/* awning */}
        <rect x="2" y="18" width="116" height="18" rx="6" fill="#ffffff" stroke="#c9d8de" strokeWidth="1.5" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={9 + i * 29} y="18" width="14" height="18" rx="4" fill="#14b8a6" />
        ))}
        {/* locker doors */}
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={14 + i * 25} y="44" width="20" height="42" rx="3.5" fill="#7cc4e8" stroke="#4f9cc4" strokeWidth="1.5" />
            <circle cx={29.5 + i * 25} cy="65" r="2" fill="#1d4172" />
          </g>
        ))}
      </svg>
      <span className="absolute -top-1.5 -right-1.5 rounded-full bg-navy-900 text-white text-[10px] font-bold px-1.5 py-0.5 ring-2 ring-white shadow tnum">×{qty}</span>
    </div>
  );
}

/* The reserved parking bay: a painted U-bay and "P" on asphalt, with the
   guest's car (top view — glass, roof, mirrors, lights) parked inside. */
function ParkingSpot({ plate }: { plate?: string }) {
  const grad = `ps-body-${useId().replace(/:/g, "")}`;
  return (
    <div className="relative w-full">
      <svg viewBox="0 0 120 96" className="w-full h-auto drop-shadow-md">
        <defs>
          <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb8a63" />
            <stop offset="55%" stopColor="#f1683c" />
            <stop offset="100%" stopColor="#e2552f" />
          </linearGradient>
        </defs>
        {/* asphalt pad */}
        <rect x="2" y="4" width="116" height="88" rx="10" fill="#4a5362" />
        <rect x="2" y="4" width="116" height="88" rx="10" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        {/* painted bay — open at the top, where the car drove in */}
        <path d="M 28 14 L 28 82 L 92 82 L 92 14" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        {/* painted P beside the bay */}
        <text x="105" y="32" textAnchor="middle" fontSize="19" fontWeight="800" fill="#ffffff" opacity="0.85" fontFamily="system-ui, sans-serif">P</text>
        {/* ground shadow */}
        <ellipse cx="60" cy="79" rx="27" ry="5.5" fill="rgba(0,0,0,0.28)" />
        {/* the car, nose up: body, mirrors, glass, roof, lights */}
        <rect x="38" y="14" width="44" height="64" rx="15" fill={`url(#${grad})`} stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
        <rect x="32.5" y="28" width="7" height="9" rx="3" fill="#c9472a" />
        <rect x="80.5" y="28" width="7" height="9" rx="3" fill="#c9472a" />
        <path d="M 45 25 q 15 -5 30 0 l -2.5 9 q -12.5 -4 -25 0 Z" fill="#bfe3f2" opacity="0.95" />
        <rect x="44" y="38" width="32" height="22" rx="6" fill="#ef7a50" />
        <rect x="47" y="40" width="11" height="18" rx="4" fill="rgba(255,255,255,0.25)" />
        <path d="M 46 68 q 14 5 28 0 l 2 6 q -16 5 -32 0 Z" fill="#9fd0e6" opacity="0.85" />
        <circle cx="45" cy="17.5" r="2.4" fill="#fff7d6" />
        <circle cx="75" cy="17.5" r="2.4" fill="#fff7d6" />
      </svg>
      {plate && (
        <span className="absolute left-1/2 -translate-x-1/2 -bottom-2 rounded-md bg-white px-1.5 py-0.5 text-[9px] font-bold tnum text-navy-900 ring-1 ring-slate-300 shadow-sm whitespace-nowrap">{plate}</span>
      )}
    </div>
  );
}
