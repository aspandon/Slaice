// Live availability display for the entrance screen (AENR-519): what the
// manager configures, and the pure helpers the display renders from.

/** Night = the dark theme, Day = light; Auto follows the tenant's sunrise / sunset (AENR-594). */
export type DisplayTheme = "dark" | "light" | "auto" | "contrast";
export const THEME_LABEL: Record<DisplayTheme, string> = { light: "Day", dark: "Night", auto: "Auto", contrast: "High contrast" };
export interface DisplayConfig {
  /** Zones to show, in order; empty = every zone in the default order. */
  zones: string[];
  rotate: boolean;
  /** Seconds per view when rotating. */
  interval: number;
  showPrices: boolean;
  showQr: boolean;
  showWeather: boolean;
  /** Languages to rotate through (en / el). */
  langs: ("en" | "el")[];
  theme: DisplayTheme;
  /** Auto switches to Day at sunrise and to Night at sunset (HH:mm, local). */
  sunrise: string;
  sunset: string;
  orientation: "landscape" | "portrait";
  /** Screens paired with a code (AENR-602); a window that isn't one shows its pairing code. */
  screens?: PairedScreen[];
}
/** Codes shown on unpaired screens, waiting for the manager to type one. A display window
 *  never writes the app state, so the codes live under their own storage key. */
export interface PendingCode { code: string; device: string; at: number }
const PENDING_KEY = "slaice.display.pending";
export function readPending(): PendingCode[] {
  try {
    const all = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]") as PendingCode[];
    return all.filter((x) => Date.now() - x.at < PAIR_CODE_TTL);
  } catch {
    return [];
  }
}
export function writePending(list: PendingCode[]) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch {
    /* storage blocked — pairing needs it */
  }
}
export interface PairedScreen {
  device: string;
  name: string;
  pairedAt: string;
}
/** Codes older than this are ignored (the screen shows a fresh one). */
export const PAIR_CODE_TTL = 10 * 60 * 1000;
export const newPairCode = () => String(Math.floor(1000 + Math.random() * 9000));
export const DEFAULT_DISPLAY: DisplayConfig = {
  zones: [],
  rotate: true,
  interval: 10,
  showPrices: true,
  showQr: true,
  showWeather: true,
  langs: ["en", "el"],
  // Auto follows sunrise / sunset — the default for new screens (AENR-602).
  theme: "auto",
  sunrise: "07:00",
  sunset: "20:30",
  orientation: "landscape",
};

/** The theme a display shows right now: Auto resolves to Day or Night from the clock. */
export function effectiveTheme(cfg: Pick<DisplayConfig, "theme" | "sunrise" | "sunset">, hhmm: string): Exclude<DisplayTheme, "auto"> {
  if (cfg.theme !== "auto") return cfg.theme;
  return hhmm >= cfg.sunrise && hhmm < cfg.sunset ? "light" : "dark";
}

export type AvailLevel = "plenty" | "filling" | "almost" | "full" | "closed";
/** How full a zone is, from its free / total sets — shown with a text label, never colour alone. */
export function availLevel(free: number, total: number, closed = false): AvailLevel {
  if (closed) return "closed";
  if (free <= 0 || total <= 0) return "full";
  const r = free / total;
  return r >= 0.5 ? "plenty" : r >= 0.2 ? "filling" : "almost";
}

/** Signage copy — English and Greek (the display rotates between them). */
export const DISPLAY_TEXT = {
  en: {
    freeNow: (n: number) => `${n} sunbed set${n === 1 ? "" : "s"} free now`,
    from: (p: number) => `from €${p}`,
    free: "free",
    of: "of",
    level: {
      plenty: "Plenty free",
      filling: "Filling up",
      almost: "Almost full",
      full: "Full",
      closed: "Closed today",
    },
    legend: { a: "Free", h: "On hold", u: "Taken", b: "Out of service" },
    book: "Book your sunbed on your phone",
    updated: (t: string) => `Updated ${t}`,
    stale: (t: string) => `Offline — showing availability from ${t}`,
    overview: "All zones",
    prices: "Prices today",
  },
  el: {
    freeNow: (n: number) => `${n} ελεύθερ${n === 1 ? "ο σετ" : "α σετ"} ξαπλώστρας τώρα`,
    from: (p: number) => `από €${p}`,
    free: "ελεύθερα",
    of: "από",
    level: {
      plenty: "Πολλές θέσεις",
      filling: "Γεμίζει",
      almost: "Σχεδόν γεμάτο",
      full: "Γεμάτο",
      closed: "Κλειστό σήμερα",
    },
    legend: { a: "Ελεύθερο", h: "Σε αναμονή", u: "Κατειλημμένο", b: "Εκτός λειτουργίας" },
    book: "Κλείστε ξαπλώστρα από το κινητό σας",
    updated: (t: string) => `Ενημέρωση ${t}`,
    stale: (t: string) => `Εκτός σύνδεσης — διαθεσιμότητα από ${t}`,
    overview: "Όλα τα καταστήματα",
    prices: "Τιμές σήμερα",
  },
} as const;

export const displayUrl = () => `${window.location.pathname}#/display`;
/** Open the chrome-less display in its own window (for a second monitor). */
export function openDisplay(): void {
  window.open(displayUrl(), "slaice-display", "popup=yes,width=1280,height=720");
}
