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

      {/* The locker cabin up by the promenade. */}
      {showCabin && (
        <div className="absolute -translate-x-1/2 animate-pop" style={{ left: "88%", top: "16%", width: "clamp(76px, 7.5vw, 112px)", animationFillMode: "both" }}>
          <LockerCabin qty={lockerQty} />
          <div className="mt-1 text-center text-[10px] font-semibold text-navy-800/80 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">{t("Day locker")}</div>
        </div>
      )}

      {/* The car on its reserved pad at the edge of the sand. */}
      {showCar && (
        <div className="absolute -translate-x-1/2 animate-pop" style={{ left: "9%", top: "66%", width: "clamp(84px, 8vw, 124px)", animationFillMode: "both" }}>
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

/* The reserved parking bay: painted lines on asphalt, the guest's car parked. */
function ParkingSpot({ plate }: { plate?: string }) {
  return (
    <div className="relative w-full">
      <svg viewBox="0 0 120 92" className="w-full h-auto drop-shadow-md">
        <rect x="2" y="4" width="116" height="84" rx="10" fill="#3c4452" />
        <rect x="10" y="12" width="100" height="68" rx="6" fill="none" stroke="#f1c84b" strokeWidth="2.5" strokeDasharray="10 7" />
        {/* the car, top view */}
        <rect x="36" y="16" width="48" height="62" rx="13" fill="#e2552f" />
        <rect x="42" y="28" width="36" height="11" rx="4.5" fill="#9fd8ef" opacity="0.9" />
        <rect x="42" y="56" width="36" height="9" rx="4" fill="#9fd8ef" opacity="0.7" />
        <rect x="31" y="30" width="6" height="11" rx="2.5" fill="#33271f" opacity="0.7" />
        <rect x="83" y="30" width="6" height="11" rx="2.5" fill="#33271f" opacity="0.7" />
      </svg>
      {plate && (
        <span className="absolute left-1/2 -translate-x-1/2 -bottom-2 rounded-md bg-white px-1.5 py-0.5 text-[9px] font-bold tnum text-navy-900 ring-1 ring-slate-300 shadow-sm whitespace-nowrap">{plate}</span>
      )}
    </div>
  );
}
