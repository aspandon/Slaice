// Lightweight i18n layer with English as the source of truth.
//
// Strings are wrapped at the call site with t("English text"). For any non-English
// language we look that English text up in a generated dictionary
// (src/locales/<code>.json) and fall back to the English text when a translation
// is missing — so wrapping a string is always safe and partial coverage degrades
// gracefully.
//
// The per-language dictionaries are produced by `npm run i18n`, which extracts
// every t("…") string and machine-translates it (Google Translate) into one JSON
// file per language. Adding a language = add it to LANGUAGES below and rerun the
// script; no strings are hand-translated.

import type { LangCode } from "../domain/types";

export interface Language {
  code: LangCode;
  /** English name (for menus / accessibility). */
  label: string;
  /** Endonym shown in the switcher. */
  native: string;
  /** Value for <html lang>. */
  html: string;
  /** Part of the MVP scope. Non-MVP languages carry a "FUTURE" badge in the pickers. */
  mvp: boolean;
}

// Offered languages. `en` is the reference; the rest are auto-translated.
export const LANGUAGES: Language[] = [
  { code: "en", label: "English", native: "English",  html: "en", mvp: true },
  { code: "el", label: "Greek",   native: "Ελληνικά", html: "el", mvp: true },
  { code: "de", label: "German",  native: "Deutsch",  html: "de", mvp: false },
  { code: "fr", label: "French",  native: "Français", html: "fr", mvp: false },
  { code: "es", label: "Spanish", native: "Español",  html: "es", mvp: false },
  { code: "it", label: "Italian", native: "Italiano", html: "it", mvp: false },
];

// Each generated dictionary is its own chunk, loaded on demand (AENR-751): a
// visitor downloads only the language they read — main.tsx loads it before the
// first render, and a later switch loads the new one before the UI changes
// language. Missing files (a language added to LANGUAGES before the script has
// run) simply leave that language falling back to English.
const loaders = import.meta.glob<{ default: Record<string, string> }>("../locales/*.json");
const DICTS: Record<string, Record<string, string>> = {};

/** True once `lang`'s dictionary is in memory (English needs none). */
export function isLangLoaded(lang: LangCode): boolean {
  return lang === "en" || !!DICTS[lang] || !loaders[`../locales/${lang}.json`];
}

/** Load `lang`'s dictionary; resolves at once when it is already loaded. */
export async function loadLang(lang: LangCode): Promise<void> {
  if (isLangLoaded(lang)) return;
  try {
    DICTS[lang] = (await loaders[`../locales/${lang}.json`]()).default;
  } catch {
    DICTS[lang] = {}; // offline / stale chunk: show English rather than nothing
  }
}

export const HTML_LANG: Record<string, string> = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.html]));

const ALIASES: Record<string, LangCode> = { EN: "en", "ΕΛ": "el", DE: "de", FR: "fr" };

/** Normalise a stored/legacy code (e.g. "ΕΛ") to an offered language, else "en". */
export function normalizeLang(code: string | undefined): LangCode {
  if (!code) return "en";
  const c = ALIASES[code] || code;
  return LANGUAGES.some((l) => l.code === c) ? c : "en";
}

/** The device's language when we offer it, else English (AENR-626) — like an iOS app following the phone. */
export function deviceLang(): LangCode {
  const prefs = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const p of prefs) {
    const code = (p || "").toLowerCase().split("-")[0];
    if (LANGUAGES.some((l) => l.code === code)) return code as LangCode;
  }
  return "en";
}

export function translate(lang: LangCode, text: string): string {
  if (lang === "en") return text;
  const dict = DICTS[lang];
  return (dict && dict[text]) || text;
}

// BCP-47 locale for Intl date/number formatting. Our codes are valid locales
// except English, where "en-GB" gives day-first dates ("6 Jun") over US order.
const INTL_LOCALES: Record<string, string> = { en: "en-GB" };
export function localeFor(lang: LangCode): string {
  return INTL_LOCALES[lang] || lang;
}

// Euro amounts in the guest's language: "€31.50" in English, "31,50 €" in
// Greek, German, French… (AENR-768). Whole amounts drop the cents ("€30")
// unless `cents` asks for them (totals and refunds always show two places).
const MONEY = new Map<string, Intl.NumberFormat>();
export function fmtMoney(n: number, lang: LangCode, cents = false): string {
  const fraction = cents || Math.round(n * 100) % 100 !== 0 ? 2 : 0;
  const key = `${lang}:${fraction}`;
  let f = MONEY.get(key);
  if (!f) {
    f = new Intl.NumberFormat(localeFor(lang), { style: "currency", currency: "EUR", minimumFractionDigits: fraction, maximumFractionDigits: fraction });
    MONEY.set(key, f);
  }
  return f.format(n);
}
