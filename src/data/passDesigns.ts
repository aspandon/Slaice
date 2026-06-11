// Seeded wallet-card designs for the Passes card designer. Each is fully editable
// (text, size, colour, logo, QR, positions) and drives the customer card + its
// Apple / Google Wallet rendition. Positions are a % of the card face.
import type { PassDesign } from "../domain/types";

const baseLogo = { src: "tenant-logo.png", x: 7, y: 13, scale: 32 };
const baseQr = { show: true, x: 67, y: 12, scale: 26 };

export const DEFAULT_PASS_CARDS: PassDesign[] = [
  {
    id: "vip", name: "VIP credit",
    bg: ["#F4DA8A", "#C2912F"], wave: "#D6AF49",
    logo: { ...baseLogo }, qr: { ...baseQr },
    title: { text: "VIP", x: 7, y: 42, size: 40, color: "#241B06", weight: 800, tracking: 1, align: "left" },
    subtitle: { text: "MEMBER · 2026", x: 7, y: 56, size: 11, color: "#4A3A12", weight: 700, tracking: 3, align: "left" },
    holder: { text: "ELENA M.", x: 7, y: 72, size: 16, color: "#241B06", weight: 800, tracking: 0.5, align: "left" },
    number: { text: "NO. 0042", x: 93, y: 72, size: 14, color: "#241B06", weight: 700, tracking: 1, align: "right" },
    validUntil: { text: "VALID UNTIL 30 SEP 2026", x: 7, y: 84, size: 9, color: "#5A4718", weight: 600, tracking: 1, align: "left" },
    published: true,
  },
  {
    id: "season", name: "Season pass",
    bg: ["#D8EFF9", "#6FBBD9"], wave: "#8CCAE6",
    logo: { ...baseLogo }, qr: { ...baseQr },
    title: { text: "SEASON PASS", x: 7, y: 43, size: 24, color: "#082638", weight: 800, tracking: 1, align: "left" },
    subtitle: { text: "SUMMER 2026", x: 7, y: 55, size: 11, color: "#0C3149", weight: 700, tracking: 3, align: "left" },
    holder: { text: "ELENI G.", x: 7, y: 72, size: 16, color: "#082638", weight: 800, tracking: 0.5, align: "left" },
    number: { text: "NO. 0042", x: 93, y: 72, size: 14, color: "#082638", weight: 700, tracking: 1, align: "right" },
    validUntil: { text: "VALID UNTIL 30 SEP 2026", x: 7, y: 84, size: 9, color: "#1C5C7E", weight: 600, tracking: 1, align: "left" },
    published: true,
  },
];
