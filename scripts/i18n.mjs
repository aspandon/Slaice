#!/usr/bin/env node
/**
 * i18n dictionary generator.
 *
 * English is the source of truth. This script:
 *   1. extracts every translatable string — t("…") / tr("…") call arguments
 *      across src/**, plus the label/short/blurb values in data/personas.ts,
 *   2. machine-translates each one (Google Translate's free endpoint) into every
 *      language listed in src/app/i18n.ts (except English),
 *   3. writes one dictionary per language to src/locales/<code>.json.
 *
 * Existing translations are reused (so it only translates new strings and you
 * can hand-edit any entry), and strings no longer present are pruned.
 *
 * Usage:  npm run i18n            # translate missing strings
 *         npm run i18n -- --force # re-translate everything
 *
 * No API key required. For production volumes use the official Google Cloud
 * Translation API instead (swap out `translateOne`).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const LOCALES = path.join(SRC, "locales");
const FORCE = process.argv.includes("--force");

/* ---------- 1. Which languages to generate ---------- */
function targetLangs() {
  const i18n = fs.readFileSync(path.join(SRC, "app", "i18n.ts"), "utf8");
  const codes = [...i18n.matchAll(/code:\s*"([a-z-]+)"/g)].map((m) => m[1]);
  return [...new Set(codes)].filter((c) => c !== "en");
}

/* ---------- 2. Extract English strings ---------- */
function unescape(s) {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\(["'\\])/g, "$1");
}

// Some UI text lives as data literals that are rendered via t(variable) (nav &
// persona labels, ticket categories, wizard steps, consent purposes). Those
// can't be matched as t("…") calls, so pull their string values straight from
// the data modules by key.
const DATA_SOURCES = [
  { file: "data/personas.ts", keys: ["label", "short", "blurb"] },
  { file: "domain/pricing.ts", keys: ["label", "sub"] },
  { file: "data/gdpr.ts", keys: ["label", "desc", "title"] },
  { file: "screens/CustomerWizard.tsx", keys: ["label", "sub"] }, // the STEPS array
];

function collectStrings() {
  const found = new Set();
  // t("…") and tr("…") across all source (single or double quotes).
  const callRe = /(?<![\w.$])tr?\(\s*(['"])((?:\\.|(?!\1).)*?)\1/g;
  const files = fs
    .readdirSync(SRC, { recursive: true })
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith("i18n.ts"));
  for (const rel of files) {
    const text = fs.readFileSync(path.join(SRC, rel), "utf8");
    for (const m of text.matchAll(callRe)) found.add(unescape(m[2]));
  }
  for (const { file, keys } of DATA_SOURCES) {
    const full = path.join(SRC, file);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, "utf8");
    const re = new RegExp(`(?:${keys.join("|")}):\\s*(['"])((?:\\\\.|(?!\\1).)*?)\\1`, "g");
    for (const m of text.matchAll(re)) found.add(unescape(m[2]));
  }
  return [...found].filter((s) => s.trim().length > 0).sort();
}

/* ---------- 3. Translate ---------- */
async function translateOne(text, target, attempt = 0) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const segs = Array.isArray(data?.[0]) ? data[0] : [];
    const out = segs.map((s) => (s && s[0]) || "").join("");
    if (!out) throw new Error("empty translation");
    return out;
  } catch (e) {
    if (attempt < 3) {
      await sleep(400 * (attempt + 1));
      return translateOne(text, target, attempt + 1);
    }
    console.warn(`  ! ${target}: failed "${text.slice(0, 40)}" (${e.message}) — keeping English`);
    return text;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Translate a list with a small concurrency pool to be gentle on the endpoint.
async function translateList(list, target, onProgress) {
  const result = {};
  let i = 0;
  let done = 0;
  const workers = Array.from({ length: 6 }, async () => {
    while (i < list.length) {
      const text = list[i++];
      result[text] = await translateOne(text, target);
      onProgress(++done, list.length);
      await sleep(40);
    }
  });
  await Promise.all(workers);
  return result;
}

/* ---------- main ---------- */
const strings = collectStrings();
const langs = targetLangs();
console.log(`Found ${strings.length} translatable strings · languages: ${langs.join(", ")}`);
fs.mkdirSync(LOCALES, { recursive: true });

for (const lang of langs) {
  const file = path.join(LOCALES, `${lang}.json`);
  const existing = !FORCE && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const todo = strings.filter((s) => !(s in existing));
  process.stdout.write(`\n[${lang}] ${strings.length} strings, ${todo.length} new…`);
  const fresh = todo.length
    ? await translateList(todo, lang, (d, total) => process.stdout.write(`\r[${lang}] translating ${d}/${total}   `))
    : {};
  const merged = {};
  for (const s of strings) merged[s] = existing[s] ?? fresh[s] ?? s;
  fs.writeFileSync(file, JSON.stringify(merged, null, 2) + "\n");
  console.log(`\r[${lang}] wrote ${path.relative(ROOT, file)} (${strings.length} entries)        `);
}
console.log("\nDone.");
