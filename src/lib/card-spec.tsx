import { inkHex, inkText, type InkId } from "@/lib/ink";
import { CARD_SIZES, cardOptions } from "@/lib/card-options";
import { cardBackground, cardElement, display, footerBar, type CardContent, type CardOptions, type CardPhoto } from "@/lib/card-layout";
import type { Slide } from "@/lib/spotify/recap-slides";

/**
 * Everything a share card can be, as plain data: a regular card, a combo of
 * recap slides, or the festival poster. Plain data so the route can hand it to
 * the browser (`?as=json`), which draws photo cards on the device.
 */
export type ComboTile = Pick<Slide, "id" | "kicker" | "headline" | "detail" | "ink">;
export type PosterArtist = { name: string; minutes: number };
export type CardSpec =
  | { type: "content"; card: CardContent }
  | { type: "combo"; year: number; ink: InkId; tiles: ComboTile[]; demo?: boolean }
  | { type: "poster"; year: number; ink: InkId; artists: PosterArtist[]; minutes: number; streak: number; demo?: boolean };

/** Marks a spec as demo data, so its footer says "Synthetic demo history". */
export function withDemo(spec: CardSpec, demo: boolean): CardSpec {
  return spec.type === "content" ? { ...spec, card: { ...spec.card, demo } } : { ...spec, demo };
}

/** Combos hold two to four slides. */
export const MAX_COMBO = 4;

const n = (v: number) => Math.round(v).toLocaleString("en-GB");

/** Options for any spec; combos and posters only use format, ink and photo. */
export function specOptions(q: URLSearchParams, spec: CardSpec): CardOptions {
  return spec.type === "content"
    ? cardOptions(q, spec.card.kind, spec.card.ink, spec.card.visual)
    : cardOptions(q, "recap", spec.ink);
}

/** The colour behind a card's content. A combo's tiles carry their own inks, so its frame is the dark
 * record colour: an ink frame would swallow a same-ink tile. */
export function specBackground(spec: CardSpec, options: CardOptions): string {
  return spec.type === "combo" ? "#0f0f10" : inkHex(options.ink);
}

export function specElement(spec: CardSpec, artwork: string | null, options: CardOptions, photo?: CardPhoto | null) {
  if (spec.type === "content") return cardElement(spec.card, artwork, options, photo);
  const size = CARD_SIZES[options.format];
  const story = options.format === "story";
  // A combo's tiles carry their own inks, so its frame is the dark record colour: an ink frame would swallow a same-ink tile.
  const bg = specBackground(spec, options);
  const fg = inkText(bg);
  const frame = (children: React.ReactNode) => (
    // Story: the top 250 px and bottom 340 px sit under Instagram's own buttons, so the content stays between them.
    <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", boxSizing: "border-box", padding: story ? "250px 64px 340px" : 64, ...cardBackground(bg, size, photo), color: fg, fontFamily: "Archivo", gap: 28 }}>
      {children}
      {footerBar(fg, bg, Boolean(spec.demo))}
    </div>
  );
  if (spec.type === "combo") return { size, element: frame(comboTiles(spec, story)) };
  return { size, element: frame(posterBody(spec, story)) };
}

/** 2 = two rows, 3 = one wide tile over two, 4 = a 2 × 2 grid. */
function comboTiles(spec: Extract<CardSpec, { type: "combo" }>, story: boolean) {
  const tiles = spec.tiles.slice(0, MAX_COMBO);
  const tile = (t: ComboTile, big: boolean) => {
    const bg = inkHex(t.ink);
    return (
      <div key={t.id} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", flex: 1, padding: 32, gap: 8, background: bg, color: inkText(bg), overflow: "hidden" }}>
        <span style={{ fontSize: 24, fontWeight: 600 }}>{t.kicker}</span>
        <span style={{ ...display, display: "flex", fontSize: big ? (story ? 104 : 88) : (story ? 72 : 56), lineHeight: 0.95, wordBreak: "break-word" }}>{t.headline}</span>
        {t.detail && <span style={{ fontSize: 22, opacity: 0.85 }}>{t.detail}</span>}
      </div>
    );
  };
  const row = (items: ComboTile[], big: boolean) => (
    <div style={{ display: "flex", flex: 1, gap: 16 }}>{items.map((t) => tile(t, big))}</div>
  );
  const rows = tiles.length === 2 ? [row([tiles[0]], true), row([tiles[1]], true)]
    : tiles.length === 3 ? [row([tiles[0]], true), row(tiles.slice(1), false)]
    : [row(tiles.slice(0, 2), false), row(tiles.slice(2, 4), false)];
  // Satori lays a fragment's children out as a row; a column div keeps them stacked.
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, gap: 28 }}>
      <span style={{ ...display, fontSize: story ? 96 : 72, lineHeight: 1 }}>{`My ${spec.year}`}</span>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>{rows}</div>
    </div>
  );
}

/** A festival lineup: the year's artists sized by rank, headliner on top. */
function posterBody(spec: Extract<CardSpec, { type: "poster" }>, story: boolean) {
  const tiers: [number, number, number][] = [[0, 1, 132], [1, 3, 84], [3, 7, 56], [7, 15, 38]]; // [from, to, font size]
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, gap: 28 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: 6 }}>VINYLYTICS PRESENTS</span>
        <span style={{ ...display, fontSize: story ? 110 : 92, lineHeight: 1 }}>{`Fest ${spec.year}`}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", alignItems: "center", gap: story ? 28 : 18, textAlign: "center" }}>
        {tiers.map(([from, to, size]) => {
          const names = spec.artists.slice(from, to).map((a) => a.name);
          if (!names.length) return null;
          return <span key={from} style={{ ...display, display: "flex", justifyContent: "center", fontSize: story ? Math.round(size * 1.15) : size, lineHeight: 1.05, maxWidth: 952 }}>{names.join("  ·  ")}</span>;
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 40, fontSize: 30, fontWeight: 600 }}>
        <span>{`${n(spec.minutes)} MINUTES`}</span>
        {spec.streak > 1 && <span>{`${n(spec.streak)}-DAY STREAK`}</span>}
      </div>
    </div>
  );
}
