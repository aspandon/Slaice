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
}

// Offered languages. `en` is the reference; the rest are auto-translated.
export const LANGUAGES: Language[] = [
  { code: "en", label: "English", native: "English",  html: "en" },
  { code: "el", label: "Greek",   native: "Ελληνικά", html: "el" },
  { code: "de", label: "German",  native: "Deutsch",  html: "de" },
  { code: "fr", label: "French",  native: "Français", html: "fr" },
  { code: "es", label: "Spanish", native: "Español",  html: "es" },
  { code: "it", label: "Italian", native: "Italiano", html: "it" },
];

// Bundle every generated dictionary at build time. Missing files (e.g. a language
// added to LANGUAGES before the script has run) simply leave that language
// falling back to English.
const files = import.meta.glob<{ default: Record<string, string> }>("../locales/*.json", { eager: true });
const DICTS: Record<string, Record<string, string>> = {};
for (const path in files) {
  const m = /([a-z-]+)\.json$/.exec(path);
  if (m) DICTS[m[1]] = files[path].default;
}

export const HTML_LANG: Record<string, string> = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.html]));

const ALIASES: Record<string, LangCode> = { EN: "en", "ΕΛ": "el", DE: "de", FR: "fr" };

/** Normalise a stored/legacy code (e.g. "ΕΛ") to an offered language, else "en". */
export function normalizeLang(code: string | undefined): LangCode {
  if (!code) return "en";
  const c = ALIASES[code] || code;
  return LANGUAGES.some((l) => l.code === c) ? c : "en";
}

export function translate(lang: LangCode, text: string): string {
  if (lang === "en") return text;
  const dict = DICTS[lang];
  return (dict && dict[text]) || text;
}
