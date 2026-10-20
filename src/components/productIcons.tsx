import type { ReactElement, ReactNode, SVGProps } from "react";

/* ============ Product icons (AENR-831) ============
   One family for what the beach sells — a sunbed set, a cabana / VIP bed, a day locker, a
   parking spot and an entry ticket — drawn in the new parasol style of the booking map: the
   umbrella's scalloped hem and alternating gores, the same round caps and joins, 2-unit corner
   radii on a 24-unit grid, and one accent surface per icon (the centre gore, the cabana roof,
   the locker door, the parking sign, the ticket).

   - Line work is `currentColor` at the app's icon weight (1.75 px, kept absolute across sizes
     like the lucide set in lib/icons.tsx), so a product icon sits beside any other icon.
   - The accent surface is `currentColor` at a light tint by default, or `accent` at full
     strength when given (e.g. a zone's colour, or white on a coloured chip).
   - Legible from 16 to 48 px: nothing closer than ~2.5 units apart, no detail under 1.5 units.
   - Decorative by default (aria-hidden): the control or text beside it carries the meaning.
     Pass `title` (or aria-label) when the icon stands alone.
   Each component accepts the same props as an `Icon.x` renderer, so it drops into any
   `icon={…}` prop (Btn, ReviewRow, WalletSection, EmptyState…). */

export type ProductIconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  size?: number | string;
  /** Stroke width in px — the app's 1.75 by default. */
  sw?: number;
  /** Fill for the accent surface; omit for a light tint of the line colour. */
  accent?: string;
  /** Accessible name — only when the icon stands alone. */
  title?: string;
  /** Accepted for parity with `Icon.x` renderers (strokes are always absolute here). */
  absoluteStrokeWidth?: boolean;
};

const ACCENT_TINT = 0.2;

function frame(props: ProductIconProps, accentShape: ReactNode, lines: ReactNode): ReactElement {
  const {
    size = 18,
    sw = 1.75,
    accent,
    title,
    absoluteStrokeWidth: _abs,
    className = "",
    ...rest
  } = props;
  const px = typeof size === "number" ? size : parseFloat(size) || 18;
  const named = !!title || !!rest["aria-label"];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={(sw * 24) / px}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={named ? "img" : undefined}
      aria-hidden={named ? undefined : true}
      {...rest}
    >
      {title && <title>{title}</title>}
      <g fill={accent ?? "currentColor"} fillOpacity={accent ? 1 : ACCENT_TINT} stroke="none">
        {accentShape}
      </g>
      {lines}
    </svg>
  );
}

/* The parasol: a dome over a hem of four scallops, ribs splitting it into three gores — the
   wide centre one is the accent. (The cabana's valance repeats the scallop.) */
const HEM = "q-2.25 1.8-4.5 0q-2.25 1.8-4.5 0q-2.25 1.8-4.5 0q-2.25 1.8-4.5 0";
/** The parasol canopy on its own — the phone set tile morphs its umbrella to it (SetTile). */
export const PARASOL_CANOPY = `M3 10.5a9 7.5 0 0 1 18 0${HEM}Z`;
const CANOPY = PARASOL_CANOPY;
const CENTRE_GORE =
  "M12 3c-2.4 2-4 4.6-4.5 7.5q2.25 1.8 4.5 0q2.25 1.8 4.5 0c-.5-2.9-2.1-5.5-4.5-7.5Z";

/** A sunbed set: the parasol over two loungers. */
export function SunbedSetIcon(props: ProductIconProps) {
  return frame(
    props,
    <path d={CENTRE_GORE} />,
    <>
      <path d={CANOPY} />
      <path d="M12 3c-2.4 2-4 4.6-4.5 7.5M12 3c2.4 2 4 4.6 4.5 7.5" />
      <path d="M12 12v9" />
      {/* Loungers either side of the pole, backs raised outward. */}
      <path d="M2.5 15.5l2 3.5H9M5.2 19v2" />
      <path d="M21.5 15.5l-2 3.5H15M18.8 19v2" />
    </>,
  );
}

/** A cabana / VIP bed: a pavilion with the parasol's scalloped valance over a daybed. */
export function CabanaIcon(props: ProductIconProps) {
  const roof =
    "M2.5 9L12 3.2 21.5 9q-1.58 1.4-3.17 0q-1.58 1.4-3.17 0q-1.58 1.4-3.16 0q-1.58 1.4-3.17 0q-1.58 1.4-3.17 0q-1.58 1.4-3.16 0Z";
  return frame(
    props,
    <path d={roof} />,
    <>
      <path d={roof} />
      <path d="M4 10.6V21M20 10.6V21" />
      <rect x={6.5} y={15} width={11} height={3.5} rx={1.5} />
      <rect x={8} y={12.2} width={4} height={2.8} rx={1.2} />
      <path d="M8 18.5V21M16 18.5V21" />
    </>,
  );
}

/** A day locker: a locker door with vents and a round lock. */
export function LockerIcon(props: ProductIconProps) {
  return frame(
    props,
    <rect x={5} y={2.5} width={14} height={19} rx={2.5} />,
    <>
      <rect x={5} y={2.5} width={14} height={19} rx={2.5} />
      <path d="M8.5 6.5h7M8.5 9h7" />
      <circle cx={15} cy={14.2} r={1.6} />
      <path d="M15 15.8v1.7" />
    </>,
  );
}

/** A parking spot: the P sign. */
export function ParkingIcon(props: ProductIconProps) {
  return frame(
    props,
    <rect x={3} y={3} width={18} height={18} rx={4} />,
    <>
      <rect x={3} y={3} width={18} height={18} rx={4} />
      <path d="M9.5 17V7h3.75a3.25 3.25 0 0 1 0 6.5H9.5" />
    </>,
  );
}

/** An entry ticket: notched sides, a perforated stub and a wave across the face. */
export function EntryTicketIcon(props: ProductIconProps) {
  const ticket =
    "M3.5 6h17a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4V7a1 1 0 0 1 1-1Z";
  return frame(
    props,
    <path d={ticket} />,
    <>
      <path d={ticket} />
      <path d="M15.5 7.5v9" strokeDasharray="1.4 2.2" />
      <path d="M6 12.5c1-1.1 2-1.1 3 0s2 1.1 3 0" />
    </>,
  );
}

/** The family by product, for lookups from data (a visit's lines, a price list…). */
export const PRODUCT_ICON = {
  sunbed: SunbedSetIcon,
  cabana: CabanaIcon,
  locker: LockerIcon,
  parking: ParkingIcon,
  ticket: EntryTicketIcon,
} as const;
export type ProductKind = keyof typeof PRODUCT_ICON;
