/**
 * Beach background catalog — the tenant-selectable scenes a Manager/Admin can
 * apply to the customer Sunbed Booking map (and the wider customer surface).
 *
 * Each preset is pure palette + decor *data*; the dependency-free SVG that turns
 * it into a scene lives in `components/Beach.tsx`. This keeps the source of truth
 * for "what backgrounds exist" here in `data/`, next to the rest of the sample
 * data, and lets the picker render every option as a live preview.
 */
import type { BeachBackground } from "../domain/types";

/** Composable scene props layered over the gradients to make a preset feel
 *  richer. Simple presets use none; elaborate ones combine a few. */
export type DecorKind = "sun" | "clouds" | "palms" | "sailboat" | "birds" | "rocks";

export interface BeachPreset {
  id: string;
  name: string;
  /** Grouping in the picker: clean gradient scenes vs. illustrated ones. */
  tier: "simple" | "elaborate";
  /** One-line descriptor shown under the preview. */
  blurb: string;
  /** Sea gradient stops at 0 / 35 / 70 / 100%. */
  sea: [string, string, string, string];
  /** Sand gradient stops at 0 / 55 / 100%. */
  sand: [string, string, string];
  /** Vegetation belt [top, bottom]; `null` omits the green foreground band. */
  veg: [string, string] | null;
  /** Crest colour of the shoreline foam gradient. */
  foam: string;
  /** Sun glint sheen on the water. */
  glint: boolean;
  /** Number of horizontal wave bands to draw (0–4). */
  waves: number;
  /** Film-grain texture over the sand. */
  grain: boolean;
  decor: DecorKind[];
}

/* ---- Simple: clean, gradient-forward, minimal or no decoration ---- */
const SIMPLE: BeachPreset[] = [
  {
    id: "azure",
    name: "Azure Bay",
    tier: "simple",
    blurb: "Bright, clean blue",
    sea: ["#1b6fa6", "#2a92cf", "#5ec3f2", "#bfe8fb"],
    sand: ["#fbe7cb", "#f3d6a6", "#e9c896"],
    veg: null,
    foam: "rgba(255,255,255,0.85)",
    glint: true,
    waves: 2,
    grain: false,
    decor: [],
  },
  {
    id: "turquoise",
    name: "Turquoise",
    tier: "simple",
    blurb: "Tropical lagoon teal",
    sea: ["#0d7d74", "#13a99b", "#2dd4bf", "#9af3e6"],
    sand: ["#fdeccb", "#f6d9a8", "#ecc690"],
    veg: null,
    foam: "rgba(255,255,255,0.85)",
    glint: true,
    waves: 2,
    grain: false,
    decor: [],
  },
  {
    id: "sunset",
    name: "Sunset",
    tier: "simple",
    blurb: "Warm dusk glow",
    sea: ["#2b3a78", "#6f5aa6", "#dd8a63", "#f6c79a"],
    sand: ["#f6dcc0", "#e8c2a0", "#d6a982"],
    veg: null,
    foam: "rgba(255,240,225,0.8)",
    glint: false,
    waves: 2,
    grain: false,
    decor: ["sun"],
  },
  {
    id: "slate",
    name: "Slate Minimal",
    tier: "simple",
    blurb: "Muted, architectural",
    sea: ["#3f5566", "#5b7384", "#9fb3c0", "#d7e2e9"],
    sand: ["#eef1f3", "#dde3e7", "#cbd4da"],
    veg: null,
    foam: "rgba(255,255,255,0.7)",
    glint: false,
    waves: 1,
    grain: false,
    decor: [],
  },
];

/* ---- Elaborate: illustrated scenes with layered decor ---- */
const ELABORATE: BeachPreset[] = [
  {
    id: "akti",
    name: "Akti tou Iliou",
    tier: "elaborate",
    blurb: "The signature house scene",
    // Exact palette of the original beach illustration — the default.
    sea: ["#0c4a6e", "#0e7490", "#22d3ee", "#a5f3fc"],
    sand: ["#fde8c8", "#f5d3a3", "#e9bd86"],
    veg: ["#86b85a", "#4f7a3a"],
    foam: "rgba(255,255,255,0.85)",
    glint: true,
    waves: 4,
    grain: true,
    decor: [],
  },
  {
    id: "palms",
    name: "Palm Cove",
    tier: "elaborate",
    blurb: "Lush, tropical, sun-soaked",
    sea: ["#0c6e8e", "#0fa3b8", "#34d7d0", "#a7f3e6"],
    sand: ["#fdeaca", "#f5d29c", "#e7bd84"],
    veg: ["#5fa844", "#356a2c"],
    foam: "rgba(255,255,255,0.85)",
    glint: true,
    waves: 3,
    grain: true,
    decor: ["sun", "palms", "birds"],
  },
  {
    id: "golden",
    name: "Golden Hour",
    tier: "elaborate",
    blurb: "Sunset sail & gulls",
    sea: ["#243b6e", "#6a5aa0", "#d98a5a", "#f3c98f"],
    sand: ["#f3d6b0", "#e3b88c", "#cf9d72"],
    veg: ["#6b7a4a", "#43502f"],
    foam: "rgba(255,243,225,0.8)",
    glint: false,
    waves: 3,
    grain: true,
    decor: ["sun", "clouds", "sailboat", "birds"],
  },
  {
    id: "cove",
    name: "Hidden Cove",
    tier: "elaborate",
    blurb: "Secluded rocks & palms",
    sea: ["#073b54", "#0c6e7e", "#1aa6a0", "#7fe0d4"],
    sand: ["#f0e0c0", "#e1c79a", "#caa775"],
    veg: ["#4f7a3a", "#2f5226"],
    foam: "rgba(255,255,255,0.82)",
    glint: true,
    waves: 3,
    grain: true,
    decor: ["rocks", "palms"],
  },
];

export const BACKGROUNDS: BeachPreset[] = [...SIMPLE, ...ELABORATE];

export const DEFAULT_BACKGROUND_ID = "akti";

/** The app's default tenant background (the original house scene). */
export const DEFAULT_BACKGROUND: BeachBackground = { kind: "preset", id: DEFAULT_BACKGROUND_ID };

/** Resolve a preset id to its definition, falling back to the default scene so a
 *  stale/unknown id (e.g. from an older saved layout) never renders a blank. */
export function presetById(id: string): BeachPreset {
  return (
    BACKGROUNDS.find((p) => p.id === id) ??
    BACKGROUNDS.find((p) => p.id === DEFAULT_BACKGROUND_ID) ??
    BACKGROUNDS[0]
  );
}
