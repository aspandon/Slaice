// Lightweight i18n layer. Strings are keyed by a stable id with one dictionary
// per language; lookups fall back to English, then to the key/fallback. This
// gives us a real translation pipeline (and a correct <html lang>) without a
// heavy dependency. The customer Home — the first thing a guest sees — is fully
// translated across the four offered languages as the worked example; the same
// t(key, fallback) call extends to any other string.
//
// `lang` codes match the switcher (EN / ΕΛ / DE / FR).

import type { LangCode } from "../domain/types";

export const HTML_LANG: Record<LangCode, string> = { EN: "en", "ΕΛ": "el", DE: "de", FR: "fr" };

const DICT: Record<LangCode, Record<string, string>> = {
  EN: {
    "home.greeting": "Good morning, Elena",
    "home.sunny": "Sunny",
    "home.promo.bold": "20% off",
    "home.promo.text": "front-row sunbeds this weekend",
    "home.promo.hours": "gates open 09:00–20:00",
    "home.promo.claim": "Claim",
    "home.rebook.title": "Rebook your usual",
    "home.rebook.sub": "Central · front row — your favourite zone last season",
    "home.hero.title": "Plan your full beach day",
    "home.hero.title2": "in 60 seconds",
    "home.hero.sub": "Guests, dates, sunbeds, locker, parking — one guided flow with a live total.",
    "home.hero.cta": "Start guided booking",
    "home.tile.book.t": "Sunbed Booking",
    "home.tile.book.d": "Pick your spot on the live beach map",
    "home.tile.book.meta": "Live map",
    "home.tile.ticket.t": "Entry Ticket",
    "home.tile.ticket.d": "Buy entry for your group",
    "home.tile.locker.t": "Day Locker",
    "home.tile.locker.d": "Keep your valuables safe",
    "home.tile.locker.meta": "80 free",
    "home.tile.parking.t": "Parking Spot",
    "home.tile.parking.d": "Reserve a spot",
    "home.tile.parking.meta": "39/50 free",
  },
  "ΕΛ": {
    "home.greeting": "Καλημέρα, Έλενα",
    "home.sunny": "Λιακάδα",
    "home.promo.bold": "20% έκπτωση",
    "home.promo.text": "σε ξαπλώστρες πρώτης σειράς αυτό το Σαββατοκύριακο",
    "home.promo.hours": "είσοδος 09:00–20:00",
    "home.promo.claim": "Εξαργύρωση",
    "home.rebook.title": "Ξανακλείστε τη συνηθισμένη σας",
    "home.rebook.sub": "Central · πρώτη σειρά — η αγαπημένη σας ζώνη πέρσι",
    "home.hero.title": "Σχεδιάστε την τέλεια μέρα στην παραλία",
    "home.hero.title2": "σε 60 δευτερόλεπτα",
    "home.hero.sub": "Άτομα, ημερομηνίες, ξαπλώστρες, ντουλάπι, πάρκινγκ — μία καθοδηγούμενη ροή με ζωντανό σύνολο.",
    "home.hero.cta": "Ξεκινήστε την κράτηση",
    "home.tile.book.t": "Κράτηση ξαπλώστρας",
    "home.tile.book.d": "Διαλέξτε τη θέση σας στον ζωντανό χάρτη",
    "home.tile.book.meta": "Ζωντανός χάρτης",
    "home.tile.ticket.t": "Εισιτήριο εισόδου",
    "home.tile.ticket.d": "Αγορά εισόδου για την παρέα σας",
    "home.tile.locker.t": "Ντουλάπι ημέρας",
    "home.tile.locker.d": "Κρατήστε τα πολύτιμά σας ασφαλή",
    "home.tile.locker.meta": "80 ελεύθερα",
    "home.tile.parking.t": "Θέση πάρκινγκ",
    "home.tile.parking.d": "Κρατήστε μια θέση",
    "home.tile.parking.meta": "39/50 ελεύθερες",
  },
  DE: {
    "home.greeting": "Guten Morgen, Elena",
    "home.sunny": "Sonnig",
    "home.promo.bold": "20% Rabatt",
    "home.promo.text": "auf Liegen in der ersten Reihe an diesem Wochenende",
    "home.promo.hours": "Einlass 09:00–20:00",
    "home.promo.claim": "Einlösen",
    "home.rebook.title": "Erneut wie gewohnt buchen",
    "home.rebook.sub": "Central · erste Reihe — Ihre Lieblingszone letzte Saison",
    "home.hero.title": "Planen Sie Ihren ganzen Strandtag",
    "home.hero.title2": "in 60 Sekunden",
    "home.hero.sub": "Gäste, Daten, Liegen, Schließfach, Parkplatz — ein geführter Ablauf mit Live-Summe.",
    "home.hero.cta": "Geführte Buchung starten",
    "home.tile.book.t": "Liegen-Buchung",
    "home.tile.book.d": "Wählen Sie Ihren Platz auf der Live-Strandkarte",
    "home.tile.book.meta": "Live-Karte",
    "home.tile.ticket.t": "Eintrittsticket",
    "home.tile.ticket.d": "Eintritt für Ihre Gruppe kaufen",
    "home.tile.locker.t": "Tagesschließfach",
    "home.tile.locker.d": "Bewahren Sie Ihre Wertsachen sicher auf",
    "home.tile.locker.meta": "80 frei",
    "home.tile.parking.t": "Parkplatz",
    "home.tile.parking.d": "Platz reservieren",
    "home.tile.parking.meta": "39/50 frei",
  },
  FR: {
    "home.greeting": "Bonjour, Elena",
    "home.sunny": "Ensoleillé",
    "home.promo.bold": "20% de réduction",
    "home.promo.text": "sur les transats de premier rang ce week-end",
    "home.promo.hours": "entrée 09:00–20:00",
    "home.promo.claim": "Profiter",
    "home.rebook.title": "Réserver votre habituel",
    "home.rebook.sub": "Central · premier rang — votre zone préférée la saison dernière",
    "home.hero.title": "Planifiez votre journée à la plage",
    "home.hero.title2": "en 60 secondes",
    "home.hero.sub": "Personnes, dates, transats, casier, parking — un parcours guidé avec total en direct.",
    "home.hero.cta": "Commencer la réservation",
    "home.tile.book.t": "Réservation de transat",
    "home.tile.book.d": "Choisissez votre place sur la carte de plage en direct",
    "home.tile.book.meta": "Carte en direct",
    "home.tile.ticket.t": "Billet d'entrée",
    "home.tile.ticket.d": "Achetez l'entrée pour votre groupe",
    "home.tile.locker.t": "Casier journée",
    "home.tile.locker.d": "Gardez vos objets de valeur en sécurité",
    "home.tile.locker.meta": "80 libres",
    "home.tile.parking.t": "Place de parking",
    "home.tile.parking.d": "Réservez une place",
    "home.tile.parking.meta": "39/50 libres",
  },
};

export function translate(lang: LangCode, key: string, fallback?: string): string {
  return (DICT[lang] && DICT[lang][key]) || DICT.EN[key] || fallback || key;
}
