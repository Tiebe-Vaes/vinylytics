/**
 * The eight spot inks an era can be pressed in. Flat colours tuned so the
 * sleeve's type (off-white, or ink-black on the light inks) reaches WCAG AA.
 * Keep in sync with the --ink-* tokens in globals.css.
 */
export const INKS = [
  { id: "cobalt", hex: "#1f4fd8" },
  { id: "vermilion", hex: "#bf3a22" },
  { id: "mustard", hex: "#d9a21b" },
  { id: "green", hex: "#127450" },
  { id: "plum", hex: "#6e3a8c" },
  { id: "teal", hex: "#0b6b78" },
  { id: "orange", hex: "#e0701f" },
  { id: "redviolet", hex: "#b0306a" },
] as const;

export type InkId = (typeof INKS)[number]["id"];

const LIGHT = "#EEEBE4";
const DARK = "#0F0F10";

export const inkHex = (id: InkId) => INKS.find((i) => i.id === id)!.hex;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The type colour for a sleeve in this ink: whichever of off-white and ink-black reads better. */
export function inkText(hex: string): typeof LIGHT | typeof DARK {
  return contrast(hex, LIGHT) >= contrast(hex, DARK) ? LIGHT : DARK;
}

function hsl([r, g, b]: [number, number, number]): { h: number; s: number; l: number } {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === rr ? ((gg - bb) / d + (gg < bb ? 6 : 0)) * 60 : max === gg ? ((bb - rr) / d + 2) * 60 : ((rr - gg) / d + 4) * 60;
  return { h, s, l };
}

const INK_HUES = INKS.map((i) => ({ id: i.id, h: hsl(rgb(i.hex)).h }));

/** The ink closest in hue to a cover's dominant colour, or null when the colour is too grey or too dark to say. */
export function nearestInk(color: [number, number, number]): InkId | null {
  const { h, s, l } = hsl(color);
  if (s < 0.15 || l < 0.12 || l > 0.92) return null;
  let best = INK_HUES[0];
  let bestD = 360;
  for (const ink of INK_HUES) {
    const d = Math.min(Math.abs(ink.h - h), 360 - Math.abs(ink.h - h));
    if (d < bestD) [best, bestD] = [ink, d];
  }
  return best.id;
}

/** A stable ink for anything without a usable cover: djb2 over the seed. */
export function hashInk(seed: string): InkId {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return INKS[Math.abs(h) % INKS.length].id;
}
