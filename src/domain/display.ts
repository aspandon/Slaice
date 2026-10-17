// Live availability display for the entrance screen (AENR-519): what the
// manager configures, and the pure helpers the display renders from.

/** Night = the dark theme, Day = light; Auto follows the tenant's sunrise / sunset (AENR-594). */
export type DisplayTheme = "dark" | "light" | "auto" | "contrast";
export const THEME_LABEL: Record<DisplayTheme, string> = { light: "Day", dark: "Night", auto: "Auto", contrast: "High contrast" };
/** Languages the signage is written in — every language the app offers (AENR-678). */
export const DISPLAY_LANGS = ["en", "el", "de", "fr", "es", "it"] as const;
export type DisplayLang = (typeof DISPLAY_LANGS)[number];
const isDisplayLang = (x: unknown): x is DisplayLang => DISPLAY_LANGS.some((l) => l === x);
/** A saved language list made safe to render: known codes only, no repeats, never empty. */
export function displayLangs(saved: unknown): DisplayLang[] {
  const list = Array.isArray(saved) ? saved.filter(isDisplayLang) : [];
  const unique = [...new Set(list)];
  return unique.length ? unique : ["en"];
}
export interface DisplayConfig {
  /** Zones to show, in order; empty = every zone in the default order. */
  zones: string[];
  rotate: boolean;
  /** Seconds per view when rotating. */
  interval: number;
  showPrices: boolean;
  showQr: boolean;
  showWeather: boolean;
  /** Languages the screen rotates through, in this order (AENR-678); one = no rotation. */
  langs: DisplayLang[];
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

/** Signage copy, one entry per display language (the screen rotates through the chosen ones). */
export interface DisplayText {
  freeNow: (n: number) => string;
  from: (p: number) => string;
  free: string;
  of: string;
  level: Record<AvailLevel, string>;
  legend: { a: string; h: string; u: string; b: string };
  book: string;
  updated: (t: string) => string;
  stale: (t: string) => string;
  overview: string;
  prices: string;
}
export const DISPLAY_TEXT: Record<DisplayLang, DisplayText> = {
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
  de: {
    freeNow: (n: number) => `${n} Liegen-Set${n === 1 ? "" : "s"} jetzt frei`,
    from: (p: number) => `ab ${p} €`,
    free: "frei",
    of: "von",
    level: {
      plenty: "Viel frei",
      filling: "Füllt sich",
      almost: "Fast voll",
      full: "Voll",
      closed: "Heute geschlossen",
    },
    legend: { a: "Frei", h: "Reserviert", u: "Belegt", b: "Außer Betrieb" },
    book: "Liege bequem per Handy buchen",
    updated: (t: string) => `Aktualisiert ${t}`,
    stale: (t: string) => `Offline — Verfügbarkeit von ${t}`,
    overview: "Alle Zonen",
    prices: "Preise heute",
  },
  fr: {
    freeNow: (n: number) =>
      n === 1 ? `${n} ensemble de transats libre maintenant` : `${n} ensembles de transats libres maintenant`,
    from: (p: number) => `dès ${p} €`,
    free: "libres",
    of: "sur",
    level: {
      plenty: "Beaucoup de places",
      filling: "Se remplit",
      almost: "Presque complet",
      full: "Complet",
      closed: "Fermé aujourd’hui",
    },
    legend: { a: "Libre", h: "En attente", u: "Occupé", b: "Hors service" },
    book: "Réservez votre transat sur votre téléphone",
    updated: (t: string) => `Mis à jour ${t}`,
    stale: (t: string) => `Hors ligne — disponibilité de ${t}`,
    overview: "Toutes les zones",
    prices: "Prix du jour",
  },
  es: {
    freeNow: (n: number) =>
      n === 1 ? `${n} set de tumbonas libre ahora` : `${n} sets de tumbonas libres ahora`,
    from: (p: number) => `desde ${p} €`,
    free: "libres",
    of: "de",
    level: {
      plenty: "Muchas libres",
      filling: "Se está llenando",
      almost: "Casi lleno",
      full: "Lleno",
      closed: "Cerrado hoy",
    },
    legend: { a: "Libre", h: "En espera", u: "Ocupado", b: "Fuera de servicio" },
    book: "Reserva tu tumbona desde el móvil",
    updated: (t: string) => `Actualizado ${t}`,
    stale: (t: string) => `Sin conexión — disponibilidad de las ${t}`,
    overview: "Todas las zonas",
    prices: "Precios de hoy",
  },
  it: {
    freeNow: (n: number) => `${n} set di lettini liber${n === 1 ? "o" : "i"} ora`,
    from: (p: number) => `da ${p} €`,
    free: "liberi",
    of: "su",
    level: {
      plenty: "Molti liberi",
      filling: "Si sta riempiendo",
      almost: "Quasi pieno",
      full: "Pieno",
      closed: "Chiuso oggi",
    },
    legend: { a: "Libero", h: "In attesa", u: "Occupato", b: "Fuori servizio" },
    book: "Prenota il tuo lettino dal telefono",
    updated: (t: string) => `Aggiornato ${t}`,
    stale: (t: string) => `Offline — disponibilità delle ${t}`,
    overview: "Tutte le zone",
    prices: "Prezzi di oggi",
  },
};

export const displayUrl = () => `${window.location.pathname}#/display`;
/** Open the chrome-less display in its own window (for a second monitor). */
export function openDisplay(): void {
  window.open(displayUrl(), "slaice-display", "popup=yes,width=1280,height=720");
}
