/**
 * Spot inks a card or era can be pressed in. Flat colours whose type
 * (off-white, or ink-black on the light inks) reaches WCAG AA.
 *
 * The first eight are the classics and have --ink-* tokens in globals.css
 * (keep those in sync). The rest were generated once and frozen: an OKLCH grid
 * (hue every 15°, L 0.34–0.87, chroma 0.15 and a "dusty" 0.07), kept when in
 * sRGB gamut, AA against off-white or ink-black, and at least 0.065 apart in
 * OKLab from every ink before it. They render through inline styles only.
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
  { id: "ink-rust", hex: "#661803" },
  { id: "ink-green", hex: "#124404" },
  { id: "ink-blue", hex: "#013b60" },
  { id: "ink-teal", hex: "#0a413c" },
  { id: "ink-purple-dusty", hex: "#402e55" },
  { id: "ink-gold", hex: "#4b3301" },
  { id: "ink-rose", hex: "#6b022e" },
  { id: "ink-purple", hex: "#4b1674" },
  { id: "ink-pink", hex: "#620156" },
  { id: "ink-violet", hex: "#272783" },
  { id: "deep-sky", hex: "#0a5470" },
  { id: "deep-green", hex: "#185d00" },
  { id: "deep-indigo", hex: "#12479d" },
  { id: "deep-amber", hex: "#6e4108" },
  { id: "deep-rose-dusty", hex: "#6d3c48" },
  { id: "deep-olive", hex: "#505103" },
  { id: "deep-violet-dusty", hex: "#4d4671" },
  { id: "deep-jade", hex: "#095b46" },
  { id: "deep-rose", hex: "#8a1842" },
  { id: "deep-pink", hex: "#7b226d" },
  { id: "deep-rust", hex: "#8b2203" },
  { id: "dark-violet-dusty", hex: "#57608b" },
  { id: "dark-rust", hex: "#9b4805" },
  { id: "dark-rose-dusty", hex: "#85525e" },
  { id: "dark-pink", hex: "#943b84" },
  { id: "dark-blue", hex: "#0268a5" },
  { id: "dark-violet", hex: "#4d57b7" },
  { id: "dark-gold", hex: "#815c0a" },
  { id: "dark-lime", hex: "#536f02" },
  { id: "sky", hex: "#16b3eb" },
  { id: "sky-dusty", hex: "#76adc8" },
  { id: "violet", hex: "#a492fb" },
  { id: "rust", hex: "#f37e61" },
  { id: "jade", hex: "#13c097" },
  { id: "magenta", hex: "#ce83de" },
  { id: "lime-dusty", hex: "#9aad7c" },
  { id: "rose", hex: "#f07998" },
  { id: "bright-green", hex: "#6ebb5d" },
  { id: "indigo", hex: "#6da4ff" },
  { id: "amber-dusty", hex: "#c49c76" },
  { id: "violet-dusty", hex: "#a39ece" },
  { id: "olive", hex: "#abac1d" },
  { id: "rose-dusty", hex: "#cb939f" },
  { id: "cyan", hex: "#14bbc2" },
  { id: "light-sky", hex: "#59ccfe" },
  { id: "light-green-dusty", hex: "#a6c99f" },
  { id: "light-magenta", hex: "#e89cf9" },
  { id: "light-gold-dusty", hex: "#d6b98a" },
  { id: "light-jade", hex: "#2cdcaf" },
  { id: "light-cyan", hex: "#0cd7e0" },
  { id: "light-rust", hex: "#fea572" },
  { id: "light-rose", hex: "#ff9cb3" },
  { id: "light-green", hex: "#87d576" },
  { id: "light-violet", hex: "#abb9fe" },
  { id: "light-magenta-dusty", hex: "#d2b0da" },
  { id: "light-olive", hex: "#c4c642" },
] as const;

export type InkId = (typeof INKS)[number]["id"];
export const CLASSIC_INKS = INKS.slice(0, 8) as unknown as readonly (typeof INKS)[0 | 1 | 2 | 3 | 4 | 5 | 6 | 7][];
export type ClassicInkId = (typeof INKS)[0 | 1 | 2 | 3 | 4 | 5 | 6 | 7]["id"];

/** "deep-rose-dusty" reads "Deep rose dusty"; "redviolet" reads "Red-violet". */
export function inkName(id: InkId): string {
  const words = id === "redviolet" ? "red-violet" : id.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

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

function oklab(rgbValue: [number, number, number]): [number, number, number] {
  const [r, g, b] = rgbValue.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

const LAB = INKS.map((i) => ({ id: i.id, lab: oklab(rgb(i.hex)) }));
const closest = (lab: [number, number, number], pool: typeof LAB) =>
  pool.reduce((best, ink) => (Math.hypot(...ink.lab.map((v, k) => v - lab[k])) < Math.hypot(...best.lab.map((v, k) => v - lab[k])) ? ink : best)).id;

/** The ink closest to a cover's dominant colour (OKLab distance), or null when the colour is too grey, dark or light to say. */
export function nearestInk(color: [number, number, number]): InkId | null {
  const { s, l } = hsl(color);
  if (s < 0.15 || l < 0.12 || l > 0.92) return null;
  return closest(oklab(color), LAB);
}

/** The classic closest to an ink: the visuals pair accent colours by classic. */
export function classicOf(id: InkId): ClassicInkId {
  return closest(LAB.find((i) => i.id === id)!.lab, LAB.slice(0, 8)) as ClassicInkId;
}

/** A stable ink for anything without a usable cover: djb2 over the seed. */
export function hashInk(seed: string): ClassicInkId {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  // Classics only, so fallback colours stay the same as before the palette grew.
  return CLASSIC_INKS[Math.abs(h) % CLASSIC_INKS.length].id;
}
