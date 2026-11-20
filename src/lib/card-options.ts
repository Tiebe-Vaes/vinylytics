import { INKS, type InkId } from "./ink";

export const CARD_SIZES = { post: { width: 1080, height: 1350 }, story: { width: 1080, height: 1920 } } as const;
export type CardFormat = keyof typeof CARD_SIZES;
export type CardKind = "era" | "top" | "item" | "recap";
export const DENSITIES = ["minimal", "light", "balanced", "detailed", "maximal"] as const;
export type Density = (typeof DENSITIES)[number];
export const FIELDS = ["period", "lead", "cover", "stat", "rows"] as const;
/** The card's one visual element. "cover" is the plain artwork; the rest draw from the card's own data. */
export const VISUALS = ["sleeve", "grooves", "turntable", "label", "stack", "sticker", "waveform", "dots", "mosaic", "cover"] as const;
export type CardVisual = (typeof VISUALS)[number];
export const VISUAL_LABELS: Record<CardVisual, string> = {
  sleeve: "Sleeve", grooves: "Grooves", turntable: "Turntable", label: "Label", stack: "Stack",
  sticker: "Sticker", waveform: "Waveform", dots: "Dots", mosaic: "Mosaic", cover: "Cover only",
};
const DEFAULT_VISUAL: Record<CardKind, CardVisual> = { era: "sleeve", top: "stack", item: "turntable", recap: "dots" };
export type CardField = (typeof FIELDS)[number];
export const FIELD_LABELS: Record<CardKind, Record<CardField, string>> = {
  era: { period: "Dates", lead: "Leading artist", cover: "Artwork, when available", stat: "Listening time", rows: "Tracklist" },
  top: { period: "Date range", lead: "Number one", cover: "Artwork, when available", stat: "Leader’s total", rows: "Ranking" },
  item: { period: "Date range", lead: "Artist or category", cover: "Artwork, when available", stat: "Listening time", rows: "Listening facts" },
  recap: { period: "Year", lead: "Favourite artist", cover: "Artwork, when available", stat: "Listening time", rows: "Year highlights" },
};

/** Each step adds one fact: art only, then the headline number, dates, lead and the list. Title and site link are always on. */
export function presetFields(_kind: CardKind, density: Density): CardField[] {
  return (["cover", "stat", "period", "lead", "rows"] as const).slice(0, DENSITIES.indexOf(density) + 1);
}

export function cardOptions(q: URLSearchParams, kind: CardKind, defaultInk: InkId) {
  const density = DENSITIES.find((d) => d === q.get("density")) ?? "light";
  const listed = q.get("fields")?.split(",");
  return {
    // A chart shared from its grid view looks like that grid unless a visual was picked.
    visual: VISUALS.find((v) => v === q.get("visual")) ?? (kind === "top" && q.get("view") === "grid" ? "mosaic" : DEFAULT_VISUAL[kind]),
    format: q.get("format") === "story" ? "story" as const : "post" as const,
    ink: INKS.find((i) => i.id === q.get("ink"))?.id ?? defaultInk,
    density,
    fields: listed ? FIELDS.filter((f) => listed.includes(f)) : presetFields(kind, density),
  };
}
